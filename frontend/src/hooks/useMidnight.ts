import { useCallback, useMemo, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

const TARGET_NETWORK = 'preprod';

export type WalletState = {
  address?: string;
  api?: ConnectedAPI;
  wallet?: InitialAPI;
  error?: string;
  isConnecting: boolean;
};

function availableWallets(): InitialAPI[] {
  return Object.values(window.midnight ?? {});
}

export function useMidnight() {
  const [state, setState] = useState<WalletState>({ isConnecting: false });
  const wallets = useMemo(availableWallets, []);

  const connect = useCallback(async (wallet: InitialAPI) => {
    setState({ isConnecting: true, wallet });
    try {
      const api = await wallet.connect(TARGET_NETWORK);
      const configuration = await api.getConfiguration();
      if (configuration.networkId !== TARGET_NETWORK) {
        throw new Error(`Wallet is connected to ${configuration.networkId}, expected ${TARGET_NETWORK}.`);
      }
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setState({ isConnecting: false, wallet, api, address: unshieldedAddress });
    } catch (error) {
      setState({
        isConnecting: false,
        wallet,
        error: error instanceof Error ? error.message : 'Wallet connection failed.',
      });
    }
  }, []);

  const disconnect = useCallback(() => setState({ isConnecting: false }), []);

  return { ...state, wallets, targetNetwork: TARGET_NETWORK, connect, disconnect };
}
