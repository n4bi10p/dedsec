# DEDSEC frontend

The Level 2 browser frontend is a Vite + React application. It is kept in its
own directory so the existing Node/TypeScript wallet and deployment scripts in
the repository's `src/` directory remain unchanged.

## Run locally

```bash
npm install
npm run dev
```

The app targets Midnight **Preprod** and detects wallets that implement the
Midnight DApp Connector API at `window.midnight`. Lace connection and network
validation are implemented in `src/hooks/useMidnight.ts`.

The browser counter transaction adapter is the next integration milestone. The
UI already keeps the generated `secretCap` local and never renders or logs it.
