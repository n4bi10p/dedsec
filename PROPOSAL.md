# DEDSEC product proposal

## What is the product, and who uses it?

DEDSEC is a privacy-preserving access gateway for paid APIs and AI-compute
resources. A caller proves that a request is allowed — the credential is valid,
the tier matches, the request fits a private quota, and the credential has not
expired or been replayed — without revealing who they are, what they paid, the
credential secret, or the remaining balance.

The people who use it:

- **Callers** who buy access and want the gateway to learn only that the
  request is valid.
- **API and compute providers** who need a check they can verify without
  storing a database of private credentials.
- **Developers** who want to put that check in front of an HTTP endpoint.

The current on-chain piece is the counter contract. It is the same shape as the
product proof: a public increment is accepted only when it fits a private cap,
and the cap is never written to the ledger. The product that follows an
approved proposal is a private API access pass with tier, quota, expiry, and
an anti-replay nullifier, plus a sample endpoint that returns HTTP 402 until a
valid proof is presented.

## Why Midnight specifically?

The fact that has to be proved and the facts that must stay hidden are
different. A transparent ledger would either publish the budget or force the
gateway to trust a server that can see it. Midnight keeps the budget as a
private witness. The circuit proves `publicDelta <= secretCap`, and
`disclose()` is the only path from an input onto the public ledger. The same
boundary is what an access pass needs: the gateway verifies a proof, and the
credential secret, payment amount, and remaining quota stay off the public
record.

A conventional chain can store a commitment, but it does not give the caller a
wallet-backed place to generate that proof locally and submit it as the
transaction itself. Midnight's Compact circuits, 1AM connector, and browser
proving path are the reason this product is built here rather than on a
transparent ledger with an off-chain allowlist.

## Data model

| Field | Type | Disclosure | Who can see it |
| --- | --- | --- | --- |
| `counter` | `Uint<64>` ledger cell | Public | Anyone reading the contract |
| `lastDelta` | `Uint<16>` ledger cell | Public | Anyone reading the contract |
| `publicDelta` | `Uint<16>` circuit argument | Public, via `disclose()` | Anyone reading the transaction |
| `secretCap` | `Uint<16>` witness | Private | The caller, inside the local proof only |
| Transaction hash | Indexer identifier | Public | Anyone with the explorer link |
| Wallet address | Unshielded address | Shown only in the caller's own browser session | The connected caller |
| Credential secret (access pass) | Witness | Private | The caller |
| Remaining quota (access pass) | Witness | Private | The caller |
| Expiry (access pass) | Witness, when the circuit allows | Private | The caller |
| Tier identifier | Public, when the gateway must enforce it | Disclosed on purpose | The gateway and the ledger |
| Nullifier | Public ledger entry | Public | Anyone checking replay |
| Provider API key | Server secret | Never in the client | The gateway process only |

The counter rows are what this repository implements. The access-pass rows are
the product model. They are not a second hidden copy of the same values: a
nullifier is public so a proof cannot be replayed, and a tier is public only
when the gateway has to branch on it. The secret, the quota, and the payment
amount are not.

## Mainnet feasibility

The counter circuit is small: one comparison, one disclosed delta, and two
public cells. It already compiles with Compact 0.5.1, has tests for the
accepting path, the rejecting path, and the privacy boundary, and has been
deployed on Preprod. Browser proving through 1AM is the expensive step, and it
runs on the caller's machine rather than in a shared prover.

What has to be true before mainnet:

- The Level 3 proposal is approved, and the access-pass contract replaces the
  counter as the product surface.
- That contract is tested for expired, revoked, and replayed proofs, and a
  failed proof does not change public state.
- The frontend and the wallet both target the network in the production build.
  Vite inlines `VITE_NETWORK` and `VITE_COUNTER_ADDRESS` at build time.
- Provider secrets stay on the server. They are not `VITE_` variables.
- Preprod users and mentor feedback come before a mainnet deployment.

Mainnet is feasible for this shape of product. It is not claimed for the
counter demo alone, and it waits on the approval gate at The Turn.
