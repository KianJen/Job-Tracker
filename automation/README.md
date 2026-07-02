# Email → Tracker automation (n8n + Ollama)

Watches your Gmail for **job-application confirmation** emails, extracts the company
and role with a **local LLM (Ollama)** — no API fees — and creates a job in the tracker
with status **Applied**.

```
Gmail Trigger ─▶ Extract (Ollama) ─▶ Parse ─▶ IF confirmation ─▶ POST /api/jobs ─▶ label "tracked"
```

Everything runs on your LXC. n8n talks to the tracker at `http://api:8000` and to the
model at `http://ollama:11434` over the shared `backend_default` Docker network — no keys,
no outbound calls, no cost.

## 1. Bring up the stack

The backend stack must be running first (it owns the `backend_default` network):

```bash
# core app (if not already up)
docker compose -f backend/docker-compose.yml up -d

# automation stack
docker compose -f automation/docker-compose.yml up -d
```

Optionally set `HOST_IP` and `TZ` in your shell/env so n8n's URLs and schedule use the
right values (defaults are `localhost` / `UTC`):

```bash
HOST_IP=192.168.1.113 TZ=America/Toronto docker compose -f automation/docker-compose.yml up -d
```

## 2. Pull the extraction model

**`qwen2.5:7b-instruct`** (~5 GB) is a good default — strong at structured extraction and
still runs acceptably on CPU:

```bash
docker exec -it automation-ollama-1 ollama pull qwen2.5:7b-instruct
```

Lighter option if you're RAM-constrained: `llama3.2:3b` (~2 GB, faster but weaker at
extraction). Heavier option if 7b still misses: `qwen2.5:14b-instruct` (~9 GB, slower on CPU,
wants 24 GB+ RAM). First inference after startup is slow (model load); subsequent ones are quick.

Sanity check the model:

```bash
docker exec -it automation-ollama-1 ollama run qwen2.5:7b-instruct "Reply with the word OK"
```

## 3. Open n8n and connect Gmail

1. Visit `http://<lxc-ip>:5678`, create the local owner account (stored only on your box).
2. Connect Gmail with **one** of these — pick IMAP if OAuth is being a pain:

   **Option A — IMAP + app password (simplest).** No Google Cloud project needed.
   - Enable 2-Step Verification, then create an **app password** at
     <https://myaccount.google.com/apppasswords>.
   - **Credentials → New → IMAP:** Host `imap.gmail.com`, Port `993`, SSL on, User = your
     Gmail address, Password = the **app password** (not your normal password).
   - Use the **IMAP workflow variant** in step 4. Dedup is by "mark as read" (the trigger
     fetches only unread mail and marks it read), not Gmail labels.

   **Option B — Gmail OAuth2.** Needs a Google Cloud project with the Gmail API enabled and an
   OAuth client (Desktop/Web); paste the client ID/secret and authorize. Use the OAuth
   workflow variant. Dedup is by the `tracked` Gmail label.

## 4. Import the workflow

Two variants ship here — import the one matching your auth choice
(n8n: **Workflows → Import from File**):

| Auth | File | Dedup |
|---|---|---|
| IMAP (Option A) | [`job-ingest-imap.workflow.json`](job-ingest-imap.workflow.json) | mark-as-read on unread mail |
| OAuth (Option B) | [`job-ingest.workflow.json`](job-ingest.workflow.json) | `tracked` Gmail label |

After importing, open the workflow and:

- Re-select your credential (the **IMAP** credential on the *Email Trigger (IMAP)* node, or the
  **Gmail** credential on the *Gmail Trigger* / *Mark tracked* nodes — credential IDs don't
  survive import).
- Confirm the model name in the *Extract (Ollama)* node matches what you pulled.
- Activate the workflow (toggle top-right).

If anything imports oddly for your n8n version, build it by hand from the node reference below.

### IMAP variant — what differs

The IMAP flow is `Email Trigger (IMAP) → Build prompt → Extract (Ollama) → Parse → IF → Create job`
(no *Mark tracked* node). Configure the trigger:

- **Mailbox:** `INBOX` — or point it at a Gmail-filter label-folder (e.g. `Applications`) to
  pre-filter server-side and avoid marking inbox mail as read. (IMAP search can't do Gmail's
  rich `from:`/`subject:` query, so filtering moves to a Gmail filter or the LLM itself.)
- **Action:** mark messages as **read** after fetching (this is the dedup).
- **Custom email rules:** `["UNSEEN"]` so only unread mail is pulled.
- **Format:** `Resolved`. The *Build prompt* node already maps the IMAP fields
  (`subject`, `from.text`, `text`); verify against the trigger's output panel.

## Workflow node reference

### 1) Gmail Trigger
- **Poll:** every 15 minutes.
- **Filters → Search:** narrows to likely confirmations and skips already-processed mail:
  ```
  newer_than:2d -label:tracked (subject:("application received" OR "thanks for applying" OR "we received your application" OR "application has been received") OR from:(greenhouse.io OR lever.co OR myworkday.com OR ashbyhq.com OR smartrecruiters.com))
  ```
- Enable **Simplify** so you get clean `subject` / `from` / `text` fields. (Tweak the senders/phrases to your inbox over time.)

### 2) Extract (Ollama) — HTTP Request
- **Method:** POST  **URL:** `http://ollama:11434/api/chat`
- **Body → JSON** (Ollama forces valid JSON via the `format` schema; `temperature: 0` keeps it deterministic):
  ```json
  {
    "model": "qwen2.5:7b-instruct",
    "stream": false,
    "options": { "temperature": 0 },
    "format": {
      "type": "object",
      "properties": {
        "is_application_confirmation": { "type": "boolean" },
        "company": { "type": "string" },
        "role": { "type": "string" }
      },
      "required": ["is_application_confirmation", "company", "role"]
    },
    "messages": [
      {
        "role": "system",
        "content": "You extract data from job-application emails. Decide if the email confirms that the user SUBMITTED an application (e.g. 'we received your application', 'thanks for applying'). It is NOT a confirmation if it is an interview invite, rejection, job alert, newsletter, or marketing. Extract the hiring company name and the job title. If a field is unknown or it is not a confirmation, use an empty string. Output only JSON."
      },
      {
        "role": "user",
        "content": "=Subject: {{ $json.subject }}\n\nFrom: {{ $json.from }}\n\nBody:\n{{ $json.text }}"
      }
    ]
  }
  ```
  > The `=` prefix on the user content tells n8n it's an expression. Map `subject`/`from`/`text`
  > to whatever the Gmail Trigger actually outputs (check the node's output panel).

### 3) Parse — Code node
Ollama returns the JSON as a string in `message.content`. Parse **every** item (a single
poll can return several emails — iterate `$input.all()` so none are dropped, and set
`pairedItem` to keep item linkage intact):
```js
return $input.all().map((item, i) => ({
  json: JSON.parse(item.json.message.content),
  pairedItem: { item: i },
}));
```
> The same pattern applies to the *Build prompt* node — map over `$input.all()` rather than
> reading `$json` (which is only the first item in "Run Once for All Items" mode).

### 4) IF confirmation — IF node
Continue only on a real confirmation with a company name:
- `{{ $json.is_application_confirmation }}` **is true**
- AND `{{ $json.company }}` **is not empty**

### 5) Create job — HTTP Request (true branch)
- **Method:** POST  **URL:** `http://api:8000/api/jobs`
- **Body → JSON:**
  ```json
  {
    "company": "={{ $json.company }}",
    "role": "={{ $json.role }}",
    "status": "Applied",
    "applied": "={{ $now.format('yyyy-LL-dd') }}",
    "notes": "Auto-added from email"
  }
  ```

### 6) Mark tracked — Gmail node
- **Operation:** Add Label to Message
- **Message ID:** `={{ $('Gmail Trigger').item.json.id }}`
- **Label:** `tracked` (create this label in Gmail once). This is what `-label:tracked` in the
  trigger query keys off, so each email is processed exactly once.

## Deduplication

Two layers, both cheap:

- **Per-email:** the `tracked` label + `-label:tracked` in the search query means an email is
  never reprocessed.
- **Per-application (optional):** to avoid duplicate jobs from multiple confirmation emails,
  add an HTTP Request `GET http://api:8000/api/jobs` before *Create job* and a Code/IF node
  that skips creation if a job with the same company+role already exists. The API has no
  upsert yet, so this guard lives in n8n. Add it once the basic flow works.

## Tuning & troubleshooting

- **Wrong/empty extraction:** try a bigger model (`qwen2.5:14b-instruct`), or add 1–2 example
  emails to the system prompt (few-shot). Keep `temperature: 0`.
- **n8n can't reach Ollama/API:** confirm all three containers are on `backend_default`
  (`docker network inspect backend_default`). n8n uses the service names `ollama` / `api`.
- **Slow first run:** model load on first request; subsequent calls are fast. CPU latency is
  fine for a 15-minute poll.
- **Login loops on n8n:** that's why `N8N_SECURE_COOKIE=false` is set — needed for plain-HTTP
  access on the LAN.
```
