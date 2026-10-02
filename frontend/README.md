# DEDSEC frontend

Vite + React client for the counter contract. It lives in this directory so
the Node deploy scripts at the repository root keep their own `src/`.

## Run locally

From the repository root:

```bash
npm run frontend:dev
npm run frontend:build
```

Or from this directory, after `npm install`:

```bash
npm run dev
npm run build
```

The dev server and the production build read `VITE_NETWORK` and
`VITE_COUNTER_ADDRESS`. Checked-in defaults are Midnight **Preprod** and the
counter address in `.env.development` / `.env.production`. 1AM must be on that
same network. `src/hooks/useMidnight.ts` rejects a mismatch and leaves the
circuit disabled.

`secretCap` is created in `src/components/CircuitCall.tsx` and is never
rendered or logged. Run `npm run sync:zk` after recompiling the contract so
`public/contract/counter` stays current.

## Deploy

Use `frontend/` as the project root, or the root `vercel.json`, which builds
this directory. Redeploy after any `VITE_*` change. Do not point this app at
mainnet until the launch checklist in `goal.md` says to.
