# DEDSEC — Product and Submission Goal

> A staged implementation plan for taking DEDSEC from the current counter
> prototype to a privacy-preserving API and AI-compute access gateway on
> Midnight Mainnet.

**Plan version:** 1.0

**Last reviewed:** 2026-09-27

**Repository:** `n4bi10p/dedsec`

**Challenge:** New Moon to Full: Monthly Moonshots on Midnight, Rise In

**Current milestone:** Level 2 is code-complete in Preview; Level 3 is the
next implementation milestone. The frontend network must be switched to
Preprod before treating Level 2 as final.

---

## 1. Product goal

DEDSEC is a privacy-preserving access gateway for paid APIs and AI-compute
resources. A user should be able to prove that they hold valid access rights
for a requested resource without revealing their identity, payment history,
credential secret, exact payment amount, or remaining private quota.

The gateway learns only the minimum fact needed to authorize the request:

> This request is valid, belongs to an allowed tier, has not expired, and has
> not already been replayed.

The long-term product statement is:

> DEDSEC lets users prove private entitlement to paid APIs and AI compute
> without revealing their identity, payment history, credential secret, or
> remaining balance.

DEDSEC is one privacy-focused service inside ZEXVRO. Midnight is used for this
service because the access proof and sensitive authorization data need a
privacy boundary that a transparent ledger cannot provide well.

---

## 2. Product feature direction

### 2.1 Core feature: Private API Access Pass

Users receive an access credential for an API or compute resource. The
credential contains or commits to private information such as:

- credential secret;
- entitlement tier;
- private quota or credit balance;
- expiry time;
- issuer and policy version;
- optional resource scope.

The user proves the required conditions locally in the browser. The contract
and gateway verify the proof without putting the credential secret or private
quota on the public ledger.

### 2.2 Feature set, in priority order

#### Must-have for the production MVP

1. **Tiered access**

   Support named access tiers such as `free`, `pro`, `research`, and
   `enterprise`. A request must prove that the credential permits the requested
   tier.

2. **Private quota proof**

   Prove `requestedUnits <= privateRemainingQuota` without revealing the
   quota. This is the direct product evolution of the current
   `publicDelta <= secretCap` circuit.

3. **Credential expiry**

   Prove that a private credential is still valid at the time of the request.
   The gateway must not need to see the private expiry value.

4. **Anti-replay nullifiers**

   Generate a domain-separated nullifier for a credential, resource, and time
   window. Reject a nullifier that has already been used.

5. **HTTP 402 gateway demo**

   A sample API returns `402 Payment Required` or `402 Access Proof Required`
   when no valid DEDSEC proof is present. The client generates the proof and
   retries. A valid proof returns the protected response.

6. **Clear privacy UX**

   Show what is being proved and what stays private. Never render, log, or send
   the credential secret, private quota, or private expiry to the application
   UI or gateway.

#### Strong follow-up features

7. **Credential revocation**

   An issuer can revoke a commitment or policy version. The public ledger
   contains the revocation signal, not the user's identity.

8. **Private usage dashboard**

   Show local proof history, successful requests, expiry status, and public
   transaction references without turning private inputs into public UI data.

9. **Issuer and policy management**

   Allow a trusted issuer to create or revoke access commitments and rotate a
   policy version.

10. **Developer middleware**

    Provide a small server middleware or SDK so an API developer can add
    DEDSEC protection without implementing Midnight transaction plumbing.

#### Deferred features

- multi-provider API marketplace;
- complex subscription billing;
- token issuance;
- mobile clients;
- multi-chain settlement;
- advanced analytics;
- fully automated fiat or stablecoin checkout.

These are intentionally deferred until the core proof, gateway, and user
feedback loop are reliable.

---

## 3. Privacy and trust model

### 3.1 Public data

The public ledger may contain only data required for verification and replay
protection, such as:

- public policy or contract version;
- allowed public resource/tier identifiers where necessary;
- credential commitments, never raw credentials;
- used nullifiers;
- revocation commitments or public status;
- public transaction references;
- deliberately disclosed request metadata.

Public data must not be enough to reconstruct the user identity, payment
amount, private quota, or credential secret.

### 3.2 Private data

The following must remain private witnesses or local application state:

- credential secret;
- private quota or remaining balance;
- exact payment amount and payment history;
- private expiry value when the circuit design permits it;
- private user identity or wallet linkage;
- unspent credential material;
- any API key or provider secret.

API provider keys and gateway secrets must remain server-side. They must never
be placed in a `VITE_*` variable or shipped to the browser.

### 3.3 What the user proves

The proof should establish only the required facts:

```text
credential is valid
requested tier is authorized
requested units <= private quota
credential has not expired
nullifier has not been used
```

The exact credential, quota, expiry, payment amount, and identity remain
undisclosed.

### 3.4 Privacy invariants

Every implementation and review must preserve these invariants:

- no private witness is passed to `disclose()`;
- no private witness is written to a public ledger cell;
- no private witness is rendered in React;
- no private witness is logged to the browser console;
- no private witness is sent to the gateway as plaintext;
- nullifiers are domain-separated by product, resource, and time window;
- rejected proofs do not mutate protected public state;
- public state exposes only the minimum information needed by the product;
- payment and issuer secrets never appear in the frontend bundle.

---

## 4. Architecture evolution

### 4.1 Current prototype

The repository currently contains:

- `contracts/counter.compact` with public `counter` and `lastDelta` state;
- private `secretCap` witness;
- a circuit proving `publicDelta <= secretCap`;
- deliberate `disclose(publicDelta)`;
- seven counter tests;
- a React/Vite frontend;
- 1AM wallet connection;
- browser-side proving;
- indexer-confirmed transaction hash display;
- Vercel configuration;
- Preview and Preprod counter deployments.

The repository currently has 17 commits. The next level targets are cumulative
quality targets, not a reason to create empty commits.

This is a privacy primitive demonstration, not yet the complete paid-access
gateway.

### 4.2 Proposed MVP contract boundary

The Level 4 product contract should evolve conceptually into an
`access-pass.compact` contract. Exact Compact data structures and circuit
names must be validated against the current compiler and Midnight SDK before
implementation.

Candidate public state:

- policy version;
- public resource/tier identifiers where disclosure is intentional;
- credential commitments;
- used nullifiers;
- revoked commitments or policy entries;
- public result/status needed by the gateway.

Candidate circuits:

- issuer registration of a credential commitment;
- private access proof;
- private quota/credit bound proof;
- expiry validation;
- nullifier consumption;
- issuer revocation;
- policy version update.

The contract must not assume that a public ledger entry alone proves payment.
The payment/credential issuance model must be documented explicitly, and the
gateway must verify only the claim it is authorized to verify.

### 4.3 Off-chain gateway boundary

The gateway is responsible for:

- serving a test API or AI-compute endpoint;
- returning the 402 challenge;
- receiving a proof or proof-backed transaction reference;
- asking the Midnight/indexer layer for public verification state;
- rejecting expired, revoked, or replayed access;
- returning a short-lived session or API response;
- keeping provider/API secrets server-side.

The gateway must not become a database of private user credentials.

### 4.4 Frontend boundary

The browser client is responsible for:

- connecting to 1AM;
- generating the proof locally;
- submitting the supported transaction flow;
- displaying public status and the final result;
- never exposing private witness values.

The browser is not a secure place for provider secrets. It may hold local
proof state only for the duration of the user flow.

---

## 5. Network and deployment policy

### 5.1 Canonical networks

| Environment | Purpose | Policy |
|---|---|---|
| Undeployed/local | Compiler, tests, development | Use local devnet and test wallet only |
| Preview | Early frontend/integration experiments | Development-only unless explicitly documented |
| Preprod | Challenge submission and user testing | Canonical network for Levels 2–5 |
| Mainnet | Final launch | Only after Level 5 feedback and launch readiness |

### 5.2 Current address state

The latest local deployment state records:

```text
Preview counter: a106146e4e7fb2615494b1ca18e5941044faf6792ece0afff86254e216e08fd9
Preprod counter: 77641b3184ca1a5f0f84c36802953f3a52830c288fe302b6766b0a7d46e50b07
```

The frontend currently still contains the older Preview configuration:

```text
VITE_NETWORK=preview
VITE_COUNTER_ADDRESS=103ef1adb05ba6ce1391ab40d61e7e756245f4322c300abfa582b4ba5e4467bb
```

This must be resolved before finalizing Level 2 or starting Preprod user
testing:

```text
VITE_NETWORK=preprod
VITE_COUNTER_ADDRESS=77641b3184ca1a5f0f84c36802953f3a52830c288fe302b6766b0a7d46e50b07
```

The 1AM wallet must also be switched to Preprod. Vite variables are compiled
at build time, so changing a Vercel variable requires a new deployment.

### 5.3 Address discipline

Whenever a contract is redeployed:

1. record the network and address in the deployment state;
2. verify the address against the correct indexer;
3. update the frontend environment file;
4. update the README contract table;
5. search for stale addresses across the repository;
6. rebuild the frontend;
7. verify the wallet network and contract state;
8. record the change in a meaningful commit.

---

## 6. Level-by-level roadmap

### Level 1 — New Moon: setup and first contract

### Required submission items

- public GitHub repository;
- root `README.md`;
- local setup instructions;
- successful Compact compile screenshot with circuits listed;
- deployed contract screenshot with address visible;
- README explanation of public state versus private witness;
- initial product idea paragraph;
- at least five meaningful commits.

### Current status

**Complete.** The repository has the counter contract, privacy model, tests,
deployment evidence, README, screenshots, and more than five meaningful
commits.

### Evidence to preserve

- compile output showing the `increment` circuit;
- Preprod/Preview contract address and network;
- passing counter tests;
- privacy model table;
- initial DEDSEC product idea.

### Level 1 definition of done

- [x] public repository and README;
- [x] local setup instructions;
- [x] compile screenshot;
- [x] deployment screenshot;
- [x] public/private explanation;
- [x] initial product idea;
- [x] at least five meaningful commits.

### Level 2 — Waxing Crescent: frontend integration

### Required submission items

- React + Vite or Next.js frontend;
- Midnight.js and DApp Connector integration;
- wallet connect and disconnect;
- connected address shown;
- clear missing-wallet, rejection, and network-mismatch errors;
- circuit called from the frontend;
- proof generated locally in the browser;
- on-chain result displayed;
- loading state during proof generation;
- private input never shown in the UI;
- label: `Proved without revealing your input`;
- contract address in README;
- Live Demo link in README;
- Privacy Claim section;
- demo video under two minutes;
- at least eight meaningful commits.

### Current status

**Implementation is substantially complete, but the canonical submission
network is not finalized.** The current public deployment was built with
Preview. The frontend must be rebuilt for Preprod using the latest Preprod
counter before calling Level 2 final.

### Level 2 completion tasks

- [ ] switch `frontend/.env.production` to `preprod`;
- [ ] use the canonical Preprod counter address;
- [ ] redeploy Vercel after the build-time environment change;
- [ ] connect 1AM while it is also on Preprod;
- [ ] prove the increment on Preprod;
- [ ] verify the transaction and contract state on the Preprod indexer;
- [ ] update the README Live Demo URL;
- [ ] record the final short demo evidence;
- [ ] confirm all README claims match the deployed network.

### Level 3 — First Quarter: production-grade dApp

### Required implementation items

1. **File structure**

   Maintain the contract, managed artifacts, frontend source, tests, CI
   workflow, `PROPOSAL.md`, README, and package files. The existing frontend
   subdirectory is acceptable only if the README and CI commands clearly
   document the monorepo layout.

2. **Tests**

   At least three passing tests covering:

   - circuit logic;
   - state transitions;
   - privacy, including no private input in public output.

3. **CI/CD**

   Create `.github/workflows/ci.yml` triggered by pushes to `main` and pull
   requests. It must:

   - check out the repository;
   - install Node.js 22;
   - install dependencies;
   - compile Compact contracts;
   - run the test suite;
   - report failure clearly.

   Add the green CI badge directly below the README title.

4. **Frontend polish**

   Confirm clear errors, proof loading state, privacy labels, mobile layout,
   production build success, and no avoidable console errors.

5. **Product proposal**

   Create `PROPOSAL.md` with:

   - What is the product, and who uses it?
   - Why Midnight specifically?
   - Data Model table with type and disclosure audience;
   - Mainnet Feasibility.

   Unlike the challenge template's placeholders, the final submission should
   contain the actual DEDSEC proposal rather than leaving the core idea blank.

6. **README structure**

   Include, in the required order:

   - project title and CI badge;
   - Live Demo;
   - mandatory Preprod contract address;
   - What This Does;
   - Privacy Model;
   - Privacy Claim;
   - Tech Stack;
   - Prerequisites;
   - Setup & Run Locally;
   - Run Tests;
   - CI/CD;
   - Product Proposal link.

7. **Demo evidence**

   Record a one-minute video showing:

   - wallet connection;
   - circuit call and test output;
   - green CI badge;
   - private input never being displayed.

8. **Manual gate**

   Submit the product idea at The Turn and wait for approval before Level 4.

### Level 3 definition of done

- [ ] CI workflow runs on pushes and pull requests;
- [ ] CI badge is green and visible;
- [ ] `PROPOSAL.md` is complete;
- [ ] tests cover circuit logic, transitions, and privacy;
- [ ] frontend build passes cleanly;
- [ ] README matches the required order;
- [ ] Preprod address is canonical and documented;
- [ ] one-minute demo evidence is recorded;
- [ ] at least ten meaningful commits exist;
- [ ] The Turn proposal is submitted and approved.

### Level 4 — Waxing Gibbous: MVP goes live

### Product deliverables

- approved Level 3 proposal;
- privacy-first product contract, not only the counter demonstration;
- public ledger state only where verification requires it;
- private witnesses for sensitive inputs;
- deliberate `disclose()` calls;
- at least three passing contract tests;
- React frontend with wallet, circuit calls, loading and error states;
- CI/CD workflow and README badge;
- contract deployed to Preprod;
- frontend deployed with a working Preprod demo;
- `docs/USAGE.md` for non-technical users;
- README with mandatory Preprod address;
- product X profile;
- three launch posts;
- MVP demo video;
- at least fifteen meaningful commits.

### Recommended Level 4 MVP scope

Implement the smallest useful version of the Private API Access Pass:

- one protected sample API or AI inference endpoint;
- one or two access tiers;
- private quota proof;
- private expiry proof;
- anti-replay nullifier;
- public credential commitment;
- basic revocation or policy version;
- HTTP 402 challenge and successful retry;
- a frontend card showing proof status and the public result.

Do not build a full marketplace at this level.

### Level 4 definition of done

- [ ] approved Level 3 proposal;
- [ ] MVP contract compiled and tested;
- [ ] MVP contract deployed to Preprod;
- [ ] Preprod address in README;
- [ ] live Preprod frontend demo;
- [ ] `docs/USAGE.md` complete;
- [ ] CI badge green;
- [ ] X profile created;
- [ ] three posts prepared/published;
- [ ] demo video recorded;
- [ ] at least fifteen meaningful commits.

### Level 5 — Full Moon: users and feedback

### Required deliverables

- mentor feedback on technical soundness and market fit before onboarding;
- `docs/FEEDBACK.md` with collection method, raw feedback, themes, and changes;
- `USERS.md` tracking 50 verified Preprod wallet addresses;
- Discord/Telegram outreach message;
- X post;
- direct-message template;
- live Preprod demo;
- implementation of the top two or three feedback improvements;
- README Level 5 validation section;
- at least twenty meaningful commits.

### Feedback and measurement plan

Track, without collecting unnecessary personal data:

- wallet address only when a user explicitly consents to verification;
- whether wallet connection succeeded;
- whether proof generation succeeded;
- approximate proof-generation time;
- whether the gateway returned the protected response;
- error category;
- user feedback and requested improvements.

Do not collect credential secrets, private quotas, or payment secrets in
feedback files.

### Level 5 definition of done

- [ ] mentor technical feedback received;
- [ ] mentor market-fit feedback received;
- [ ] feedback collection method documented;
- [ ] 50 verified Preprod users recorded;
- [ ] top two or three improvements implemented;
- [ ] `FEEDBACK.md` updated with evidence;
- [ ] `USERS.md` count is accurate;
- [ ] README reflects validation results;
- [ ] at least twenty meaningful commits.

### Level 6 — Supermoon: Mainnet launch

### Required deliverables

- Level 5 feedback improvements implemented;
- updated `docs/USAGE.md` with Preprod and first-transaction guides;
- contract redeployed and verified for Mainnet readiness;
- final README with Mainnet/live information;
- `LAUNCH_USERS.md` tracking 20 onboarded launch users;
- brand brief;
- logo/banner and brand assets;
- product X profile updated;
- onboarding script for launch users;
- final privacy-preserving demo video;
- Mainnet launch evidence;
- at least thirty meaningful commits.

### Mainnet launch checklist

- [ ] no stale Preview/Preprod addresses in production configuration;
- [ ] contract source and compiled artifacts are reproducible;
- [ ] security/privacy review completed;
- [ ] feedback improvements documented;
- [ ] Mainnet deployment verified on the correct indexer;
- [ ] production frontend points to Mainnet;
- [ ] Mainnet wallet/network flow tested;
- [ ] launch user consent and address records are accurate;
- [ ] brand assets published;
- [ ] final demo recorded;
- [ ] twenty launch users onboarded;
- [ ] at least thirty meaningful commits.

---

## 7. Implementation phases

### Phase 0 — Stabilize the current baseline

- [ ] choose the canonical Preprod counter deployment;
- [ ] update `frontend/.env.production` to Preprod;
- [ ] update the README contract table;
- [ ] rebuild and redeploy Vercel;
- [ ] verify 1AM and the frontend are both on Preprod;
- [ ] verify a real Preprod increment and indexer-confirmed transaction;
- [ ] remove stale Preview claims from submission-facing docs.

### Phase 1 — Finish Level 3 production foundations

- [ ] create `.github/workflows/ci.yml`;
- [ ] run compile and tests in CI;
- [ ] add the CI badge;
- [ ] complete the responsive/error/privacy polish audit;
- [ ] create and fill `PROPOSAL.md`;
- [ ] restructure README sections to the Level 3 order;
- [ ] record the Level 3 one-minute evidence;
- [ ] submit the proposal at The Turn;
- [ ] wait for approval.

### Phase 2 — Build the Level 4 MVP contract

- [ ] design the public/private data model;
- [ ] design commitment and nullifier domains;
- [ ] implement credential commitment registration;
- [ ] implement private quota proof;
- [ ] implement expiry validation;
- [ ] implement nullifier replay protection;
- [ ] implement revocation or policy versioning;
- [ ] write positive, negative, privacy, expiry, replay, and revocation tests;
- [ ] compile and deploy to Preprod.

### Phase 3 — Build the Level 4 gateway and UX

- [ ] create the sample protected API;
- [ ] implement 402 challenge and retry;
- [ ] connect the browser proof flow to the gateway;
- [ ] display only public authorization results;
- [ ] add clear failure states for invalid, expired, revoked, and replayed proofs;
- [ ] create `docs/USAGE.md`;
- [ ] deploy the frontend and gateway;
- [ ] create the X launch profile and posts;
- [ ] record the MVP demo.

### Phase 4 — Validate with users

- [ ] obtain mentor technical feedback;
- [ ] obtain mentor market-fit feedback;
- [ ] prepare outreach materials;
- [ ] onboard 50 Preprod users;
- [ ] collect privacy-safe feedback;
- [ ] implement the top two or three improvements;
- [ ] update `FEEDBACK.md`, `USERS.md`, README, and usage docs.

### Phase 5 — Prepare and execute Mainnet launch

- [ ] perform security and privacy review;
- [ ] incorporate Level 5 improvements;
- [ ] update usage and onboarding documentation;
- [ ] redeploy and verify Mainnet contract;
- [ ] update all Mainnet addresses and environment values;
- [ ] publish brand assets;
- [ ] onboard 20 launch users;
- [ ] record the final product demo;
- [ ] submit the final level evidence.

---

## 8. Test strategy

### Contract tests

Every contract milestone should test:

- valid proof succeeds;
- invalid quota proof fails;
- invalid tier fails;
- expired credential fails;
- revoked credential fails;
- reused nullifier fails;
- failed calls do not mutate protected state;
- private witnesses do not appear in public state or serialized output;
- public state contains only deliberately disclosed fields.

### Frontend tests

Verify:

- no wallet detected;
- wallet rejected connection;
- wrong network;
- correct network;
- proof generation loading state;
- proof failure;
- transaction submission;
- indexer delay;
- stale or missing contract state;
- long transaction hashes wrap correctly;
- mobile layout;
- no private input appears in DOM, logs, or result messages.

### Gateway tests

Verify:

- request without proof returns 402;
- valid proof returns the protected response;
- invalid proof is rejected;
- expired proof is rejected;
- replayed proof is rejected;
- wrong tier is rejected;
- provider secrets never reach the browser;
- gateway logs contain no private witness values.

---

## 9. CI/CD and release policy

Every pull request and push to `main` should run:

```text
checkout
install Node 22
npm ci
compact compile
npm test
frontend build
```

Before any network deployment:

```text
git status --short
git diff --check
npm run compile
npm test
npm run frontend:build
search for stale contract addresses
verify environment and wallet network
```

Every deployment must record:

- commit SHA;
- target network;
- contract address;
- frontend URL;
- indexer verification result;
- test/build result;
- known limitations.

---

## 10. Documentation and evidence policy

Every level must have evidence that a reviewer can reproduce:

- command output;
- screenshots or rendered README evidence;
- deployed address and network;
- passing test output;
- CI run and badge;
- live URL;
- demo video;
- user/feedback records where required;
- meaningful commit history.

Do not claim a level is complete while a mandatory manual artifact is still a
placeholder. A local implementation and a submitted implementation are
different states.

---

## 11. Commit policy

Commits must represent meaningful, reviewable progress. Suggested milestones:

1. baseline/network configuration;
2. CI workflow;
3. README and badge;
4. proposal;
5. privacy model review;
6. access-pass contract state;
7. access proof circuit;
8. nullifier/replay protection;
9. expiry/revocation;
10. contract tests;
11. gateway challenge;
12. frontend gateway flow;
13. usage documentation;
14. Preprod deployment;
15. MVP evidence;
16. feedback collection;
17. feedback improvements;
18. Mainnet preparation;
19. brand/onboarding assets;
20. launch evidence.

Never create empty commits only to satisfy a count. The challenge counts
meaningful work, and the commit history should tell the product's evolution.

---

## 12. Risk register

| Risk | Mitigation |
|---|---|
| Frontend and wallet use different networks | Compile network and address together; validate `getConfiguration()` before enabling calls |
| Vercel env change is not reflected | Remember Vite variables are build-time; redeploy after every env change |
| Stale contract address in README or bundle | Search all tracked files after deployment and verify through the correct indexer |
| Indexer delay looks like transaction failure | Show a bounded pending state and poll; never display serialized transaction bytes as a hash |
| Private data leaks through UI/logs | Add privacy tests, review console output, and inspect built bundles |
| Nullifier domain collision | Domain-separate by product, contract, resource, tier, and epoch |
| Payment design becomes too large | Start with a test credential/issuer and quota proof; add real payment flow only after MVP works |
| Gateway becomes centralized | Keep authorization proof and replay state verifiable; document what the gateway can and cannot learn |
| User records become over-collective | Store only consented wallet address, date, and validation evidence |
| Mainnet launch before feedback | Enforce the mentor-feedback and Level 5 gates in this plan |

---

## 13. Non-goals

DEDSEC is not currently trying to:

- hide every public fact about an API request;
- make the browser a trusted storage location for provider secrets;
- replace API authentication for every possible provider;
- build a complete payment marketplace before proving the core privacy flow;
- claim that the current counter contract is already a paid-access product;
- onboard users before mentor feedback is received;
- deploy to Mainnet before the staged contract, UX, and feedback work is complete.

---

## 14. Immediate next actions

The next implementation sequence is:

1. switch the current frontend from Preview to the canonical Preprod counter;
2. redeploy and verify the Level 2 flow on Preprod;
3. create the Level 3 CI workflow;
4. complete `PROPOSAL.md` with the Private API Access Pass concept;
5. align README sections and add the CI/CD/Product Proposal sections;
6. run the full test/build verification loop;
7. submit the proposal at The Turn;
8. wait for approval before building Level 4's product contract;
9. design the access-pass privacy model before writing new Compact code;
10. implement the smallest Preprod MVP with quota, expiry, and replay protection.

---

## 15. Overall definition of success

DEDSEC is complete when a real user can request a protected API resource,
generate a proof locally, and receive access while the public transcript
reveals only the minimum verifiable facts.

The project must also have:

- reproducible builds;
- passing contract and frontend tests;
- CI/CD protection on every change;
- a documented public/private data model;
- a working Preprod MVP;
- user feedback and documented iterations;
- a verified Mainnet deployment;
- a clear brand and onboarding path;
- evidence for every challenge requirement at every level.
