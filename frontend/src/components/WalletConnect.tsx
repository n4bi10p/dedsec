import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { WalletState } from '../hooks/useMidnight';
import { shortId } from '../lib/format';

type Props = WalletState & {
  wallets: InitialAPI[];
  targetNetwork: string;
  connect: (wallet: InitialAPI) => Promise<void>;
  disconnect: () => void;
};

export function WalletConnect({
  address,
  error,
  isConnecting,
  wallets,
  targetNetwork,
  walletNetwork,
  connect,
  disconnect,
}: Props) {
  const mismatch = Boolean(error && walletNetwork && walletNetwork !== targetNetwork);

  if (address) {
    return (
      <section className={`card ${mismatch ? 'card-alert' : ''}`}>
        <div className="card-top">
          <p className="micro">{mismatch ? 'Wrong network' : 'Wallet connected'}</p>
          {mismatch && <span className="pill warn">{walletNetwork}</span>}
        </div>
        <p className="network-name">{mismatch ? walletNetwork : targetNetwork}</p>
        <code className="mono" title={address}>
          {shortId(address)}
        </code>
        {mismatch && (
          <dl className="pair">
            <div>
              <dt>Detected</dt>
              <dd>{walletNetwork}</dd>
            </div>
            <div>
              <dt>Required</dt>
              <dd>{targetNetwork}</dd>
            </div>
          </dl>
        )}
        <button className="button secondary" onClick={disconnect} type="button">
          Disconnect
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <p className="micro">Step 1</p>
      <h2>Connect 1AM</h2>
      <p>Connect a Midnight wallet on {targetNetwork} to prove a private access budget.</p>
      {wallets.length === 0 ? (
        <p className="notice">No Midnight wallet detected. Install 1AM and refresh this page.</p>
      ) : (
        <div className="wallet-list">
          {wallets.map((wallet) => (
            <button
              className="button primary"
              disabled={isConnecting}
              key={`${wallet.rdns}-${wallet.apiVersion}`}
              onClick={() => void connect(wallet)}
              type="button"
            >
              {isConnecting ? 'Waiting for 1AM…' : `Connect ${wallet.name}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
