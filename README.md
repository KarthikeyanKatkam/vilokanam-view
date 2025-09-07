# Vilokanam

A pay-per-second streaming platform built on Polkadot.

## Backend

The backend is built with Substrate and consists of:

- A custom node implementation
- A runtime with a tick-stream pallet
- An OCW ticker for sending ticks

### Building the backend

```bash
cd backend
cargo build --release
```

### Running the node

```bash
./target/release/vilokanam-node --dev --rpc-port 9944 --ws-port 9944
```

### Running the OCW ticker

```bash
./target/release/ocw-ticker
```

## Frontend

The frontend is built with Next.js and consists of:

- A viewer application
- An SDK for interacting with the blockchain
- A UI component library

### Running the frontend

```bash
cd frontend
pnpm install
pnpm dev
```