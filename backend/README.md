# Job Tracker — Backend API

FastAPI service backed by **Postgres** (structured data) and **Garage** (S3-compatible
object storage for document file attachments).

## Stack

- **FastAPI** + Uvicorn
- **SQLAlchemy 2.0** (async) + **asyncpg**
- **boto3** talking to Garage over the S3 API
- **Postgres 16**, **Garage v1.0**

## API surface

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/jobs` | List jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/{id}` | Get job |
| PATCH | `/api/jobs/{id}` | Update job (partial) |
| DELETE | `/api/jobs/{id}` | Delete job |
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Create document (JSON metadata) |
| GET | `/api/documents/{id}` | Get document |
| PATCH | `/api/documents/{id}` | Update document (partial) |
| DELETE | `/api/documents/{id}` | Delete document (and its file) |
| POST | `/api/documents/{id}/file` | Upload/replace attachment (multipart, PDF/DOCX) |
| GET | `/api/documents/{id}/file` | Download/open the attachment |
| DELETE | `/api/documents/{id}/file` | Remove the attachment |

Documents return `linkedJobs` (array of job IDs) and `fileUrl` (an absolute link to the
download endpoint) so the response shape matches what the frontend already expects.

### File handling

Uploaded files are streamed into Garage and referenced by an object key stored in Postgres.
Downloads are **proxied through the API** (`GET /documents/{id}/file`) rather than via
presigned URLs, so Garage never needs to be reachable from the browser — keep it on the
private backend network.

## Running with Docker Compose

Brings up Postgres, Garage, and the API together.

```bash
cd backend
cp .env.example .env

# 1. Start storage + database first
docker compose up -d postgres garage

# 2. One-time Garage cluster init — creates the layout, bucket, and an access key.
#    Windows PowerShell:
./scripts/init-garage.ps1
#    macOS/Linux/WSL/git-bash:
./scripts/init-garage.sh

# 3. Copy the printed "Key ID" and "Secret key" into backend/.env
#    (S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY)

# 4. Start the API
docker compose up -d --build api
```

The API is then at http://localhost:8000 — interactive docs at http://localhost:8000/docs.

> Garage generates the access key at runtime, which is why init is a manual one-time step
> rather than baked into the compose file.

## Running the API locally (without Docker)

Point `.env` at a Postgres instance and a running Garage (or any S3-compatible store), then:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Notes / next steps

- **No auth** — single-user, matching the current frontend. Add auth (e.g. JWT or a
  reverse-proxy auth layer) before exposing this publicly.
- **Schema** is created on startup via `Base.metadata.create_all`. For evolving the schema
  over time, switch to **Alembic** migrations.
- The frontend talks to this API via a typed `fetch` wrapper (`src/api/client.ts`); the
  Zustand store loads data on mount and persists edits through the API (optimistic +
  debounced). There is no more `localStorage` persistence.
