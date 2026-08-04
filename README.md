# dedsec

> A privacy-preserving paid-access gateway on the Midnight Network.
>
> **Level 1** of the Midnight Builder Challenge: a counter contract that
> demonstrates Midnight's core privacy primitive — a public ledger cell
> updated by a circuit whose inputs include a **private witness** that is
> proven but never disclosed.

---

## Contract Addresses

`npm run setup` deploys `hello-world` by default. The deployments captured from
the setup runs are:

| Contract    | Network                 | Address                                                               |
| ----------- | ----------------------- | --------------------------------------------------------------------- |
| `hello-world` | Preview               | `ceb74c06aaead115b2176986a03a5ae02dc5e78b7f3f9fdf5fda755d95786264`    |
| `hello-world` | Preprod               | `1e7ea53d7b0751f3574135605c11b432b003f0b6d846827381365c4caafefa9a`    |
| `hello-world` | Undeployed (local devnet) | `f180b4742bef75fdcd38426b635251469b19b03a4436cc9a33d5d400a7859e9e` |
| `counter`     | Preprod               | `61e6eb487476caa77ad42efaa33fd272d5090d128c592c21efbb4f73a5293260`    |

The `counter` address is the separate Level 1 Preprod deployment. To deploy
that contract again, use `CONTRACT_NAME=counter` with the deploy command.

---

## What This Does

`contracts/counter.compact` is a small on-chain counter with a privacy twist:

- The **counter value** and the **last delta** live in public ledger cells.
- Every increment is a **circuit** that takes two inputs:
  - `publicDelta` — disclosed, written to the ledger;
  - `secretCap` — a **private witness** known only to the caller.
- The circuit proves `publicDelta <= secretCap` — i.e. "this increment stayed
  within the caller's secret budget" — **without ever revealing the cap**.

This is the same shape DEDSEC will use at higher levels as a paid-access
gateway: a caller proves (off-chain) that they hold a valid, unexpired paid
credential for a given tier, and only the minimal fact is verified on-chain.
On the public ledger you learn *that* an increment happened and *how much*
it was; you never learn *who* authorized the budget or *what* their budget is.

---

## Privacy Model

| Data               | Visibility | Notes                                                                |
| ------------------ | ---------- | -------------------------------------------------------------------- |
| `counter`          | **Public** | On-chain ledger cell — anyone can read it via the indexer.            |
| `lastDelta`        | **Public** | On-chain ledger cell — the disclosed portion of the most recent call. |
| `secretCap`        | **Private**| Circuit witness — a local ZK input, proven, never written on-chain.   |
| `publicDelta`      | **Public** | Deliberately `disclose()`d so the ledger grows by an exact amount.    |

The `disclose()` call is deliberate: it is the *only* channel by which input
data reaches the ledger. Everything else in the circuit (the cap, the fact of
knowing a valid cap) is a zero-knowledge proof. Tests assert that the ledger
contains exactly the two public fields and nothing else.

---

## Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Language     | Compact (Midnight's ZK-native smart contract language)            |
| Compiler     | `compact 0.5.1`                                                    |
| SDK          | `@midnight-ntwrk/*` `4.1.1` (`midnight-js-contracts`, `wallet-sdk 1.2.0`, `compact-runtime 0.16.0`) |
| Testing      | Vitest `4.x` + local devnet (node, indexer, proof-server)         |
| Devnet       | Docker Compose (`midnightntwrk/midnight-node:1.0.0`, `indexer-standalone:4.3.3`, `proof-server:8.1.0`) |
| Runtime      | Node.js ≥ 22                                                      |

---

## Prerequisites

- Node.js ≥ 22
- Docker with Docker Compose v2 (for the local devnet)
- The Compact compiler pinned to `0.5.1`
- `npm install`

```bash
npm install
```

---

## Setup

Start the local devnet, compile the contracts, and deploy to it:

```bash
npm run compile                # compiles hello-world + counter to contracts/managed/
docker compose up -d --wait    # node, indexer, proof-server
npm run deploy                 # deploy hello-world to the local devnet
CONTRACT_NAME=counter npm run deploy   # deploy the counter contract
```

To deploy the counter contract to **Preprod**:

```bash
npm run network preprod        # switch the active network (funded wallet required)
CONTRACT_NAME=counter npm run deploy -- --network preprod
```

---

## Run Tests

`npm test` brings up the devnet (if needed), compiles the contracts, and runs
the Level 1 test suite against the local devnet:

```bash
npm test
```

To run only the counter tests against an already-running devnet:

```bash
npx vitest run tests/counter.test.ts
```

The suite covers the three Level 1 requirements:

1. **Circuit logic** — an increment within the secret cap succeeds; an
   increment exceeding the cap is rejected and leaves state untouched.
2. **State transitions** — `counter` and `lastDelta` update correctly across
   sequential increments.
3. **Privacy** — the ledger exposes exactly `counter` and `lastDelta`; the
   private witness (`secretCap`) never appears on-chain.

---

## Initial Idea

> Placeholder — the full DEDSEC pitch is developed in **Level 3 (PROPOSAL.md)**.

DEDSEC is a privacy-preserving paid-access gateway (x402-style): customers buy
paid API / compute access with shielded tNIGHT, and prove local "paid
credential for tier X, valid until T" in zero-knowledge so the gateway can
verify payment without exposing who paid, how much, or which tier.

---

## Screenshots

> Placeholder — added as the frontend ships (Level 2) and deployments land on
> the public networks.

---

## Local devnet

| Service        | Port | Purpose                                         |
| -------------- | ---- | ----------------------------------------------- |
| `node`         | 9944 | Midnight node, `dev` chain preset               |
| `indexer`      | 8088 | GraphQL indexer for chain state                 |
| `proof-server` | 6300 | Generates ZK proofs for contract transactions   |

Tear everything down with:

```bash
docker compose down -v
```

## ⚠️ LOCAL DEVNET ONLY

The deploy script uses a well-known genesis seed (`0000…0001`) so the
pre-minted NIGHT in the `dev` chain preset is immediately available. **Do
not use this seed against Preprod, mainnet, or any environment that
handles real value.**

## Networks

| Network | When to use | Default? |
|---|---|---|
| `undeployed` | Local devnet bundled in `docker-compose.yml`. Genesis seed is hardcoded; no funding needed. | yes |
| `preview` | Public preview testnet. Faucet at `https://midnight-tmnight-preview.nethermind.dev`. |  |
| `preprod` | Public preprod testnet. Faucet at `https://midnight-tmnight-preprod.nethermind.dev`. |  |

The active network is **sticky**. Switch with `npm run network <name>` or
`--network <name>` on any command. Switch back to local devnet with
`npm run network undeployed`.

### Environment overrides

| Variable | Effect |
|---|---|
| `MIDNIGHT_WALLET_SEED` | Use this seed instead of generating/persisting one. |
| `MIDNIGHT_INDEXER_URL` | Override the indexer GraphQL URL. |
| `MIDNIGHT_INDEXER_WS_URL` | Override the indexer WS URL. |
| `MIDNIGHT_NODE_URL` | Override the node RPC URL. |
| `MIDNIGHT_FAUCET_URL` | Override the faucet URL printed during setup. |
| `MIDNIGHT_PROOF_SERVER_URL` | Override the proof server URL. |
| `MIDNIGHT_FAUCET_TIMEOUT_MS` | Faucet poll budget in milliseconds (default 600000). |

### Wallet sync cache

After each `deploy`, `cli`, or `check-balance` run, the scripts serialize the
wallet's synced state to `.midnight-wallet-state/<network>/` (gitignored).
The next run on the same network restores from that snapshot and only catches
up instead of replaying from genesis.

## Available scripts

| Script                  | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `npm run setup`         | One-shot: start devnet, compile, deploy.                       |
| `npm run compile`       | Compile the Compact contracts (`hello-world`, `counter`).      |
| `npm run deploy`        | Deploy the compiled contract (requires devnet up + compiled).  |
| `npm run deploy:counter`| Deploy the `counter` contract.                                 |
| `npm run cli`           | Interactive CLI to call circuits on the deployed contract.     |
| `npm run check-balance` | Print the genesis-seed wallet's NIGHT and DUST balances.       |
| `npm test`              | Compile + start devnet + run Vitest suite.                     |
| `npm run test:e2e`      | Smoke + read-back check against the deployed contract.         |
| `npm run clean`         | Remove `contracts/managed/`, `.midnight-state.json`, and `.midnight-wallet-state/`. |
| `npm run proof-server:start` / `:stop` | Compose lifecycle for just the proof-server service. |

## Project structure

```
dedsec/
├── contracts/
│   ├── counter.compact        # Level 1 contract (public ledger + private witness + disclose)
│   └── hello-world.compact    # scaffold contract
├── contracts/managed/         # compiled artifacts (gitignored outputs)
├── tests/
│   ├── counter.test.ts        # Level 1 test suite
│   └── helpers/contract-deploy.ts
├── scripts/
│   └── e2e-check.ts           # smoke + read-back
├── src/
│   ├── network.ts             # network selection + state file management
│   ├── wallet.ts              # wallet construction + sync-state cache
│   ├── setup.ts               # orchestrator for `npm run setup`
│   ├── deploy.ts              # deploy a contract (CONTRACT_NAME selects which)
│   ├── cli.ts                 # interact with deployed contract
│   └── check-balance.ts       # NIGHT / DUST balance
├── docker-compose.yml         # node + indexer + proof-server
├── .midnight-state.json       # written by deploy (gitignored)
├── .midnight-wallet-state/    # serialized sync state per network (gitignored)
├── package.json
└── tsconfig.json
```

## Compact compiler version

The compiler is pinned to `0.5.1`. To change versions:

```bash
compact update <version>
compact use <version>
```
