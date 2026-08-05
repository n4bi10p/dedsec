# DEDSEC frontend

The Level 2 browser frontend is a Vite + React application. It is kept in its
own directory so the existing Node/TypeScript wallet and deployment scripts in
the repository's `src/` directory remain unchanged.

## Run locally

```bash
npm install
npm run dev
```

The app targets Midnight **Preview** by default and detects wallets that implement the
Midnight DApp Connector API at `window.midnight`. Lace connection and network
validation are implemented in `src/hooks/useMidnight.ts`.

Override the network and deployed counter address at build time when needed:

```bash
VITE_NETWORK=preview VITE_COUNTER_ADDRESS=<preview-counter-address> npm run dev
```

The browser counter transaction adapter is the next integration milestone. The
UI already keeps the generated `secretCap` local and never renders or logs it.

## Deploy

Use `frontend/` as the project root in Vercel or Netlify. `vercel.json` and
`public/_redirects` provide the single-page-app fallback needed for direct
route loads. The app is configured for the Midnight **Preview** network by default;
never point this challenge frontend at a mainnet wallet during development.
