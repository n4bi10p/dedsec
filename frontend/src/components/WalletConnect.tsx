import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { WalletState } from '../hooks/useMidnight';

type Props = WalletState & {
  wallets: InitialAPI[];
  targetNetwork: string;
  connect: (wallet: InitialAPI) => Promise<void>;
  disconnect: () => void;
};

export function WalletConnect({
  address,
  api,
  error,
  isConnecting,
  wallets,
  targetNetwork,
  connect,
  disconnect,
}: Props) {
  if (api && address) {
    return (
      <section className="card wallet-card">
        <div className="eyebrow">Wallet connected</div>
        <h2>{targetNetwork} network</h2>
        <code className="address">{address}</code>
        <button className="button secondary" onClick={disconnect} type="button">
          Disconnect
        </button>
      </section>
    );
  }

  return (
    <section className="card wallet-card">
      <div className="eyebrow">Step 1</div>
      <h2>Connect Lace</h2>
      <p>Connect a Midnight wallet on Preprod to prove your private access budget.</p>
      {wallets.length === 0 ? (
        <p className="notice">No Midnight wallet detected. Install Lace and refresh this page.</p>
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
              {isConnecting ? 'Waiting for Lace…' : `Connect ${wallet.name}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
