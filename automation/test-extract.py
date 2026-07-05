#!/usr/bin/env python3
"""Test the extraction prompt against sample emails using the SAME Ollama
/api/chat call the n8n workflow makes (structured JSON output included).

It reads the live system prompt and model straight out of
job-ingest-imap.workflow.json, so the test always matches what's deployed.

Run on the LXC via a throwaway Python container on the automation network
(so it can reach the ollama service by name — no host port needed):

    docker run --rm --network backend_default \
      -v /opt/job-tracker/automation:/w python:3.12-slim \
      python /w/test-extract.py

To test your own email, drop a plain-text file (subject / from / body) next to
this script and pass it:

    docker run --rm --network backend_default \
      -v /opt/job-tracker/automation:/w python:3.12-slim \
      python /w/test-extract.py /w/email.txt

Only the Python standard library is used, so python:3.12-slim needs no pip installs.
"""
import json
import re
import sys
import urllib.request

OLLAMA_URL = "http://ollama:11434/api/chat"
HERE = __file__.rsplit("/", 1)[0]
WORKFLOW = f"{HERE}/job-ingest-imap.workflow.json"

FORMAT = {
    "type": "object",
    "properties": {
        "is_application_confirmation": {"type": "boolean"},
        "company": {"type": "string"},
        "role": {"type": "string"},
    },
    "required": ["is_application_confirmation", "company", "role"],
}

# Known cases with their expected outcome, so you can eyeball pass/fail.
SAMPLES = {
    "indeed-gifthealth  (expect TRUE, company=Gifthealth Inc, role=IT Support Specialist I)":
        "Subject: Indeed Application: IT Support Specialist I\n"
        "From: Indeed Apply <indeedapply@indeed.com>\n"
        "Body: Application submitted. IT Support Specialist I. Gifthealth Inc - Columbus OH 43228. "
        "The following items were sent to Gifthealth Inc.",
    "cvs  (expect TRUE, company=CVS Health, role=IT Operations Analyst (OhioRISE))":
        "Subject: Your application with CVS Health has been received!\n"
        "From: Colleague Zone <cvshealth@myworkday.com>\n"
        "Body: Thank you for your interest in joining CVS Health! We have successfully received "
        "your application for: R0954602 IT Operations Analyst (OhioRISE) (Open)",
    "indeed-nudge  (expect FALSE)":
        "Subject: You are almost there! Complete your application\n"
        "From: Indeed <no-reply@indeed.com>\n"
        "Body: You are so close to finishing your application! Take a moment to review and submit "
        "your interest for this opportunity.",
}


def load_prompt_and_model():
    """Pull the system prompt and model name out of the deployed workflow."""
    with open(WORKFLOW, encoding="utf-8") as f:
        wf = json.load(f)
    code = next(n["parameters"]["jsCode"] for n in wf["nodes"] if n["name"] == "Build prompt")
    system = re.search(r'const system = "(.*?)";', code, re.S)
    model = re.search(r"model: '(.*?)'", code)
    if not (system and model):
        sys.exit("Could not find the system prompt / model in the workflow file.")
    return system.group(1), model.group(1)


def classify(system, model, email):
    payload = json.dumps({
        "model": model,
        "stream": False,
        "options": {"temperature": 0},
        "format": FORMAT,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": email},
        ],
    }).encode()
    req = urllib.request.Request(
        OLLAMA_URL, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read())["message"]["content"]


def main():
    system, model = load_prompt_and_model()
    print(f"model: {model}\n")
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            cases = {sys.argv[1]: f.read()}
    else:
        cases = SAMPLES
    for label, email in cases.items():
        print(f"=== {label} ===")
        try:
            print(classify(system, model, email))
        except Exception as exc:  # noqa: BLE001 — this is a debug tool
            print(f"ERROR: {exc}")
        print()


if __name__ == "__main__":
    main()
