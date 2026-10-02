import { useEffect, useMemo, useState } from 'react';
import { CircuitCall } from './components/CircuitCall';
import { Landing } from './components/Landing';
import { WalletConnect } from './components/WalletConnect';
import { useMidnight } from './hooks/useMidnight';
import { callIncrement, queryCounterState, type IncrementResult } from './lib/counter';
import { shortId } from './lib/format';
import { createBrowserProviders, type BrowserProviders } from './lib/midnight';

const COUNTER_ADDRESS = import.meta.env.VITE_COUNTER_ADDRESS ?? 'Configure VITE_COUNTER_ADDRESS';
const isAddressConfigured = COUNTER_ADDRESS !== 'Configure VITE_COUNTER_ADDRESS';

type View = 'landing' | 'console';
type Ledger = { counter: string; lastDelta: string };

function viewFromLocation(): View {
  return window.location.hash === '#console' ? 'console' : 'landing';
}

export default function App() {
  const wallet = useMidnight();
  const [view, setView] = useState<View>(viewFromLocation);
  const [ledger, setLedger] = useState<Ledger>();
  const [ledgerError, setLedgerError] = useState<string>();

  const getProviders = useMemo(() => {
    let cached: Promise<BrowserProviders> | null = null;
    return () => {
      if (!wallet.api) throw new Error('Connect a wallet before calling the circuit.');
      if (!cached) cached = createBrowserProviders(wallet.api);
      return cached;
    };
  }, [wallet.api]);

  useEffect(() => {
    const onHash = () => setView(viewFromLocation());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);

  useEffect(() => {
    if (!wallet.api || !isAddressConfigured) {
      setLedger(undefined);
      setLedgerError(undefined);
      return;
    }
    let cancelled = false;
    getProviders()
      .then((providers) => queryCounterState(providers, COUNTER_ADDRESS))
      .then((state) => {
        if (!cancelled) {
          setLedger({ counter: state.counter.toString(), lastDelta: state.lastDelta.toString() });
          setLedgerError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLedger(undefined);
          setLedgerError(error instanceof Error ? error.message : 'Could not read the contract.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wallet.api, getProviders]);

  function showLanding(sectionId?: string) {
    if (window.location.hash !== '' && window.location.hash !== `#${sectionId ?? ''}`) {
      history.pushState(null, '', sectionId ? `#${sectionId}` : window.location.pathname);
    } else if (sectionId) {
      history.pushState(null, '', `#${sectionId}`);
    }
    setView('landing');
    window.setTimeout(() => {
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function showConsole() {
    if (window.location.hash !== '#console') history.pushState(null, '', '#console');
    setView('console');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitIncrement(publicDelta: bigint, secretCap: bigint): Promise<IncrementResult> {
    const providers = await getProviders();
    const result = await callIncrement(providers, COUNTER_ADDRESS, publicDelta, secretCap);
    try {
      const state = await queryCounterState(providers, COUNTER_ADDRESS);
      setLedger({ counter: state.counter.toString(), lastDelta: state.lastDelta.toString() });
      setLedgerError(undefined);
    } catch (error: unknown) {
      setLedgerError(error instanceof Error ? error.message : 'Could not read the contract.');
    }
    return result;
  }

  const mismatch = Boolean(wallet.error && wallet.walletNetwork && wallet.walletNetwork !== wallet.targetNetwork);
  const proveEnabled = Boolean(wallet.api) && isAddressConfigured && !mismatch;

  return (
    <>
      <header className="nav">
        <button className="wordmark" onClick={() => showLanding()} type="button">
          DEDSEC
        </button>
        <nav aria-label="Primary">
          <button onClick={() => showLanding('product')} type="button">
            Product
          </button>
          <button onClick={() => showLanding('privacy')} type="button">
            Privacy
          </button>
          <button className={view === 'console' ? 'current' : ''} onClick={showConsole} type="button">
            Console
          </button>
        </nav>
        <div className="nav-actions">
          {view === 'console' && <span className="pill">{wallet.targetNetwork}</span>}
          {view === 'landing' && (
            <button className="button primary" onClick={showConsole} type="button">
              Open console
            </button>
          )}
        </div>
      </header>

      <main>
        {view === 'landing' ? (
          <Landing onOpenConsole={showConsole} />
        ) : (
          <section className="console">
            <h1>Console</h1>
            <p className="lede">
              {wallet.address
                ? 'Prove that this increment stays inside a private budget.'
                : 'Connect a Midnight wallet before proving anything.'}
            </p>
            {mismatch && wallet.error && (
              <div className="banner" role="alert">
                <p>{wallet.error}</p>
                <p>Switch 1AM to {wallet.targetNetwork}, then reconnect.</p>
              </div>
            )}
            <div className="console-grid">
              <div className="stack">
                <WalletConnect {...wallet} />
                <CircuitCall
                  disabledReason={
                    mismatch
                      ? 'Fix the network before proving.'
                      : !wallet.api
                        ? undefined
                        : !isAddressConfigured
                          ? 'Set VITE_COUNTER_ADDRESS to the counter contract for this network.'
                          : undefined
                  }
                  enabled={proveEnabled}
                  onSubmit={submitIncrement}
                />
              </div>
              <aside className="stack" aria-label="Public state">
                <p className="micro">Public state</p>
                <div className="metric">
                  <span>Counter</span>
                  <strong>{ledger?.counter ?? '—'}</strong>
                </div>
                <div className="metric">
                  <span>Last delta</span>
                  <strong>{ledger?.lastDelta ?? '—'}</strong>
                </div>
                <div className="metric">
                  <span>Contract address</span>
                  <code className="mono" title={isAddressConfigured ? COUNTER_ADDRESS : undefined}>
                    {isAddressConfigured ? shortId(COUNTER_ADDRESS) : 'Not configured'}
                  </code>
                </div>
                {ledgerError && <p className="error">{ledgerError}</p>}
              </aside>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span>Proofs are generated in this browser.</span>
        <code className="mono" title={isAddressConfigured ? COUNTER_ADDRESS : undefined}>
          {isAddressConfigured ? shortId(COUNTER_ADDRESS) : 'Contract address not set'}
        </code>
      </footer>
    </>
  );
}
