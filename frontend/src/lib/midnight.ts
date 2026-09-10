import { ContractState } from '@midnight-ntwrk/compact-runtime';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { CostModel, LedgerParameters, Transaction, ZswapChainState } from '@midnight-ntwrk/ledger-v8';

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) throw new Error('Invalid hex string from wallet.');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

export function createPrivateStateProvider() {
  let scope = '';
  const stateStore = new Map<string, unknown>();
  const signingKeyStore = new Map<string, unknown>();
  const key = (id: string) => `${scope}:${id}`;
  return {
    setContractAddress(address: string) {
      scope = address;
    },
    async set(id: string, state: unknown) {
      stateStore.set(key(id), state);
    },
    async get(id: string) {
      return stateStore.get(key(id)) ?? null;
    },
    async remove(id: string) {
      stateStore.delete(key(id));
    },
    async clear() {
      stateStore.clear();
    },
    async setSigningKey(addr: string, k: unknown) {
      signingKeyStore.set(addr, k);
    },
    async getSigningKey(addr: string) {
      return signingKeyStore.get(addr) ?? null;
    },
    async removeSigningKey(addr: string) {
      signingKeyStore.delete(addr);
    },
    async clearSigningKeys() {
      signingKeyStore.clear();
    },
    async exportPrivateStates(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async importPrivateStates(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async exportSigningKeys(): Promise<never> {
      throw new Error('Not implemented.');
    },
    async importSigningKeys(): Promise<never> {
      throw new Error('Not implemented.');
    },
  };
}

// Preview and Preprod indexers reject latest-state queries without a config
// block, so read through an explicit contractAction query instead.
export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl) as any;

  async function queryLatest(query: string, address: string) {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { address } }),
    });
    if (!res.ok) throw new Error(`Indexer HTTP error: ${res.status}`);
    const payload = await res.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((e: any) => e.message).join('; '));
    return payload.data?.contractAction ?? null;
  }

  return {
    ...base,
    async queryLatestTxInfo(contractAddress: string) {
      const action = await queryLatest(
        `query LATEST_TX_INFO($address: HexEncoded!) {
          contractAction(address: $address) {
            transaction { hash identifiers }
          }
        }`,
        contractAddress,
      );
      return action?.transaction ?? null;
    },
    async queryContractState(contractAddress: string, config?: any) {
      if (config) return base.queryContractState(contractAddress, config);
      const action = await queryLatest(
        `query LATEST_CONTRACT_STATE($address: HexEncoded!) { contractAction(address: $address) { state } }`,
        contractAddress,
      );
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: any) {
      if (config) return base.queryZSwapAndContractState(contractAddress, config);
      const action = await queryLatest(
        `query LATEST_BOTH_STATE($address: HexEncoded!) {
          contractAction(address: $address) {
            state
            zswapState
            transaction { block { ledgerParameters } }
          }
        }`,
        contractAddress,
      );
      if (!action?.zswapState) return null;
      return [
        ZswapChainState.deserialize(fromHex(action.zswapState)),
        ContractState.deserialize(fromHex(action.state)),
        action.transaction?.block?.ledgerParameters
          ? LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))
          : LedgerParameters.initialParameters(),
      ];
    },
  };
}

export type BrowserProviders = {
  privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
  publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
  zkConfigProvider: FetchZkConfigProvider<any>;
  proofProvider: { proveTx: (unprovenTx: any, config?: any) => Promise<any> };
  walletProvider: WalletProvider;
  midnightProvider: MidnightProvider;
};

export async function createBrowserProviders(api: ConnectedAPI): Promise<BrowserProviders> {
  const [config, shieldedAddresses] = await Promise.all([api.getConfiguration(), api.getShieldedAddresses()]);

  setNetworkId(config.networkId);

  const zkConfigProvider = new FetchZkConfigProvider<any>(
    new URL('/contract/counter', window.location.origin).toString(),
    window.fetch.bind(window),
  );

  const provingProvider = await api.getProvingProvider(zkConfigProvider as any);

  const proofProvider = {
    async proveTx(unprovenTx: any) {
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    },
  };

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey as any,
    getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey as any,
    balanceTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const balanced = await api.balanceUnsealedTransaction(txHex);
      if (!balanced?.tx) throw new Error('balanceUnsealedTransaction returned invalid result');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx)) as any;
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx: any) => {
      const txHex = toHex(tx.serialize());
      const result = (await api.submitTransaction(txHex)) as any;
      // 1AM wallet may return the tx id directly in a future API version.
      if (typeof result === 'string' && result.length > 0) return result as any;
      if (result?.transactionId) return result.transactionId as any;
      if (result?.id) return result.id as any;
      // DApp-connector submitTransaction returns void, so derive the hash
      // locally from the balanced transaction. The 1AM explorer indexes by
      // transaction hash, not by intent identifier, so prefer
      // transactionHash() for the displayed link.
      try {
        const hash = tx.transactionHash?.() as string | undefined;
        if (hash) return hash as any;
      } catch {
        // Fall through to identifiers below.
      }
      try {
        const ids = tx.identifiers?.() as string[] | undefined;
        if (ids && ids.length > 0 && ids[0]) return ids[0] as any;
      } catch {
        // Fall through to legacy fallback.
      }
      return txHex.slice(0, 64) as any;
    },
  };

  return {
    privateStateProvider: createPrivateStateProvider(),
    publicDataProvider: createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
