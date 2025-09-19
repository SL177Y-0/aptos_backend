# Aptos Move Deployer (Minimal Backend)

A slim backend that accepts an Aptos Move package archive, compiles it with the Aptos CLI, publishes it to a selected network, and returns the module address and transaction hash.

## Features
- Upload `.zip`, `.tar`, or `.tar.gz` containing `Move.toml` and `sources/`
- Compiles and publishes via Aptos CLI inside the container
- Returns `{ status, network, moduleAddress, txHash, explorerUrl }`
- API key auth via `x-api-key` header (optional but recommended)

## Docs
- See `END_TO_END_GUIDE.md` for full run/test flow
- See `ENV_SOURCING_GUIDE.md` for secure environment sourcing options

## Quickstart (Docker)
1) Create `.env` from `.env.example` and set:
   - `API_TOKEN`
   - `DEPLOYER_PRIVATE_KEY`
2) Build and run:
   - `docker compose up --build`
3) Health check:
   - `GET http://localhost:3001/api/health`
4) Deploy (curl example):
```bash
curl -X POST "http://localhost:3001/api/deploy" \
  -H "x-api-key: $API_TOKEN" \
  -F network=devnet \
  -F named_addresses='{}' \
  -F move_package=@your-move-package.zip
```

## Environment
- Required:
  - `API_TOKEN` – API key for auth (send in `x-api-key`)
  - `DEPLOYER_PRIVATE_KEY` – hex private key used by Aptos CLI
- Optional (defaults in app):
  - `DEPLOYER_ADDRESS`, `APTOS_NODE_URL_DEVNET/TESTNET/MAINNET`, `JOB_TIMEOUT_SECONDS`, `MAX_UPLOAD_MB`, `PORT`

## Security notes
- Do not commit secrets. Use env vars, Docker secrets, or bind mounts (see `ENV_SOURCING_GUIDE.md`).
- Ensure the deployer account is funded on the target network.

## Reference
- Aptos CLI – Install, Setup, and Use the Command-Line Interface: https://aptos.dev/build/cli
