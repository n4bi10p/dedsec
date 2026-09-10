import { useMemo } from 'react';
import { CircuitCall } from './components/CircuitCall';
import { WalletConnect } from './components/WalletConnect';
import { useMidnight } from './hooks/useMidnight';
import { callIncrement, type IncrementResult } from './lib/counter';
import { createBrowserProviders, type BrowserProviders } from './lib/midnight';

const COUNTER_ADDRESS = import.meta.env.VITE_COUNTER_ADDRESS ?? 'Configure VITE_COUNTER_ADDRESS';
const isAddressConfigured = COUNTER_ADDRESS !== 'Configure VITE_COUNTER_ADDRESS';

export default function App() {
  const wallet = useMidnight();

  const getProviders = useMemo(() => {
    let cached: Promise<BrowserProviders> | null = null;
    return () => {
      if (!wallet.api) throw new Error('Connect a wallet before calling the circuit.');
      if (!cached) cached = createBrowserProviders(wallet.api);
      return cached;
    };
  }, [wallet.api]);

  async function submitIncrement(publicDelta: bigint, secretCap: bigint): Promise<IncrementResult> {
    const providers = await getProviders();
    return callIncrement(providers, COUNTER_ADDRESS, publicDelta, secretCap);
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">DEDSEC · Midnight Preview</div>
        <h1>Private access, publicly verifiable.</h1>
        <p>
          Prove that an API request fits your private budget without exposing the budget itself.
        </p>
      </header>
      <div className="grid">
        <WalletConnect {...wallet} />
        <CircuitCall
          disabledReason={
            !wallet.api
              ? undefined
              : !isAddressConfigured
                ? 'Set VITE_COUNTER_ADDRESS to a Preview counter contract.'
                : undefined
          }
          enabled={Boolean(wallet.api) && isAddressConfigured}
          onSubmit={submitIncrement}
        />
      </div>
      <footer>
        <span>Counter contract</span>
        <code>{COUNTER_ADDRESS}</code>
      </footer>
    </main>
  );
}
