import { CircuitCall } from './components/CircuitCall';
import { WalletConnect } from './components/WalletConnect';
import { useMidnight } from './hooks/useMidnight';

const COUNTER_ADDRESS = '61e6eb487476caa77ad42efaa33fd272d5090d128c592c21efbb4f73a5293260';

export default function App() {
  const wallet = useMidnight();

  async function submitIncrement(publicDelta: bigint, _secretCap: bigint): Promise<string> {
    // The browser transaction/proving adapter is the next integration slice.
    // Keep this boundary typed so no private witness leaks into UI components.
    throw new Error(`Counter adapter is not wired yet for ${COUNTER_ADDRESS} (delta ${publicDelta}).`);
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="eyebrow">DEDSEC · Midnight Preprod</div>
        <h1>Private access, publicly verifiable.</h1>
        <p>
          Prove that an API request fits your private budget without exposing the budget itself.
        </p>
      </header>
      <div className="grid">
        <WalletConnect {...wallet} />
        <CircuitCall enabled={Boolean(wallet.api)} onSubmit={submitIncrement} />
      </div>
      <footer>
        <span>Counter contract</span>
        <code>{COUNTER_ADDRESS}</code>
      </footer>
    </main>
  );
}
