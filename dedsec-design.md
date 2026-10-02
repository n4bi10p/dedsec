# DEDSEC — Level 3 UI design

Design brief for the screens that come before any frontend rebuild. Source of
product scope is `goal.md`. Visual direction comes from the three references
supplied with this brief: a light editorial landing, a dark cinematic compute
landing, and a dark agency page with oversized type. DEDSEC takes the dark
pair. The light page is used only for its pill navigation, generous type, and
clear single call to action.

The frontend now follows these screens. Level 4 gateway UI is still out of scope.

## Direction

DEDSEC should feel like a privacy instrument, not a generic crypto dashboard.

- Dark, near-monochrome field. One bright surface for the primary action.
- Oversized headlines, short supporting lines, lots of empty space.
- Pill navigation and pill buttons.
- Monospace only for addresses, transaction hashes, and the privacy label.
- No neon gradients, no card clutter, no charts.
- The private witness is never drawn. No field, no placeholder, no masked
  value for `secretCap`.

| Token | Choice |
|---|---|
| Mode | Dark |
| Palette | Monochrome. Near-black field, white primary action |
| Headline | Syne |
| Body | Geist |
| Labels and hashes | Space Mono |
| Corners | Full pills for buttons and the nav; soft cards elsewhere |

## What Level 3 has to show

Level 3 is still the counter dApp, polished into a production-grade client.
The later access-pass gateway stays out of these screens.

The UI must make these states obvious:

- 1AM missing, rejected, or on the wrong network
- wallet connected, with the address visible
- public delta entered by the user
- local proof in progress
- indexer-confirmed transaction
- the line `Proved without revealing your input`

Public facts on screen: network, counter, last delta, public delta, transaction
hash, contract address.

Private facts that stay off screen: secret cap, identity beyond the connected
address the wallet already exposes, payment amount, quota.

## Screens in this pass

Stitch project: `5437930351698654615` (title DEDSEC). Local screenshots live in `.stitch/designs/`.

| Screen | Stitch id | File |
|---|---|---|
| Landing | `28ee8405de4246af833f602fd646aa0b` | `.stitch/designs/landing.png` |
| Console, disconnected | `6745fcca919a46acb42e8e2ef179969a` | `.stitch/designs/console-disconnected.png` |
| Console, ready | `95d6fcf139d14b198071866fe7395400` | `.stitch/designs/console-ready.png` |
| Console, proving | `a7918740c16140699480af3b40490857` | `.stitch/designs/console-proving.png` |
| Console, confirmed | `a90aaa1a31024cc0a56e7ddcc95f898a` | `.stitch/designs/console-confirmed.png` |
| Console, network mismatch | `0aeff0348f0347e49b0b659a2c8d8be4` | `.stitch/designs/console-mismatch.png` |

1. **Landing** — what DEDSEC is, the privacy split, and a path into the console.
2. **Console, disconnected** — install or connect 1AM. Circuit call stays disabled.
3. **Console, ready** — address shown, public delta field, prove action.
4. **Console, proving** — loading state while the proof is generated locally.
5. **Console, confirmed** — transaction hash and public result.
6. **Console, network mismatch** — wallet network versus the app network, with a clear recovery line.

Mobile is a later pass of the same console, not a separate product.

## Later, not in this pass

Level 4 screens (402 challenge, tier, expiry, nullifier) wait until the Level 3
proposal is approved at The Turn. They are listed in `goal.md` and are not
generated here.
