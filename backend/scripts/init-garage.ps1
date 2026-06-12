# One-time Garage cluster init: assigns a layout, creates the bucket and an
# access key, then prints the credentials to paste into backend/.env.
#
# Run from the backend/ directory after `docker compose up -d garage`:
#   ./scripts/init-garage.ps1

$ErrorActionPreference = "Stop"
$bucket = "job-tracker-docs"
$keyName = "job-tracker-key"

Write-Host "Waiting for Garage to come up..."
Start-Sleep -Seconds 3

# Full node id is "<id>@<addr>"; we want just the id.
$nodeFull = docker compose exec -T garage /garage node id -q
$node = ($nodeFull -split "@")[0]
Write-Host "Node id: $node"

docker compose exec -T garage /garage layout assign -z dc1 -c 1G $node
docker compose exec -T garage /garage layout apply --version 1

docker compose exec -T garage /garage bucket create $bucket

# Create the key (idempotent-ish: ignore error if it already exists)
docker compose exec -T garage /garage key create $keyName

docker compose exec -T garage /garage bucket allow --read --write $bucket --key $keyName

Write-Host "`n--- Access key details (copy into backend/.env) ---"
docker compose exec -T garage /garage key info --show-secret $keyName
