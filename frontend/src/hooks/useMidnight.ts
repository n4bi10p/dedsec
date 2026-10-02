import { useCallback, useMemo, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

export const TARGET_NETWORK = import.meta.env.VITE_NETWORK ?? 'preview';

export type WalletState = {
  address?: string;
  api?: ConnectedAPI;
  wallet?: InitialAPI;
  error?: string;
  isConnecting: boolean;
  walletNetwork?: string;
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
      await api.hintUsage([
        'getConfiguration',
        'getUnshieldedAddress',
        'getProvingProvider',
        'balanceUnsealedTransaction',
        'submitTransaction',
      ]);
      const configuration = await api.getConfiguration();
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      if (configuration.networkId !== TARGET_NETWORK) {
        setState({
          isConnecting: false,
          wallet,
          address: unshieldedAddress,
          walletNetwork: configuration.networkId,
          error: `Wallet is connected to ${configuration.networkId}, expected ${TARGET_NETWORK}.`,
        });
        return;
      }
      setState({
        isConnecting: false,
        wallet,
        api,
        address: unshieldedAddress,
        walletNetwork: configuration.networkId,
      });
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
