#!/usr/bin/env bash
# One-time Garage cluster init: assigns a layout, creates the bucket and an
# access key, then prints the credentials to paste into backend/.env.
#
# Run from the backend/ directory after `docker compose up -d garage`:
#   ./scripts/init-garage.sh
set -euo pipefail

BUCKET="job-tracker-docs"
KEY_NAME="job-tracker-key"

echo "Waiting for Garage to come up..."
sleep 3

# Full node id is "<id>@<addr>"; we want just the id.
NODE=$(docker compose exec -T garage /garage node id -q | cut -d@ -f1)
echo "Node id: $NODE"

docker compose exec -T garage /garage layout assign -z dc1 -c 1G "$NODE"
docker compose exec -T garage /garage layout apply --version 1

docker compose exec -T garage /garage bucket create "$BUCKET"
docker compose exec -T garage /garage key create "$KEY_NAME"
docker compose exec -T garage /garage bucket allow --read --write "$BUCKET" --key "$KEY_NAME"

echo ""
echo "--- Access key details (copy into backend/.env) ---"
docker compose exec -T garage /garage key info --show-secret "$KEY_NAME"
