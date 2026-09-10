import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { findDeployedContract, submitCallTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract } from '../managed/counter/contract/index.js';
import type { BrowserProviders } from './midnight';

export const COUNTER_PRIVATE_STATE_ID = 'counterPrivateState';
export const EXPLORER_TX_BASE = 'https://explorer.1am.xyz/tx/';

export function explorerTxUrl(txId: string): string {
  return `${EXPLORER_TX_BASE}${txId}`;
}

export type IncrementResult = {
  txId: string;
  message: string;
};

let cachedCompiledContract: any | null = null;

export function getCompiledContract() {
  if (!cachedCompiledContract) {
    const make = CompiledContract.make as any;
    const withVacant = CompiledContract.withVacantWitnesses as any;
    const withAssets = CompiledContract.withCompiledFileAssets as any;
    // withVacantWitnesses takes the contract directly, withCompiledFileAssets is dual.
    cachedCompiledContract = make('counter', Contract).pipe(withVacant, withAssets('/contract/counter'));
  }
  return cachedCompiledContract;
}

export async function queryCounterState(providers: BrowserProviders, contractAddress: string) {
  const state = await (providers.publicDataProvider as any).queryContractState(contractAddress);
  if (!state?.data) throw new Error('Contract state not found in indexer.');
  return (Contract as any).ledger(state.data) as { counter: bigint; lastDelta: bigint };
}

export async function callIncrement(
  providers: BrowserProviders,
  contractAddress: string,
  publicDelta: bigint,
  secretCap: bigint,
): Promise<IncrementResult> {
  const compiledContract = getCompiledContract();

  const found = await findDeployedContract(providers as any, {
    contractAddress,
    compiledContract,
    privateStateId: COUNTER_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);

  // Submit without waiting for indexer finalization. The blocking variant
  // hangs the UI for minutes when the indexer lags.
  const submitted = (await submitCallTxAsync(providers as any, {
    compiledContract,
    contractAddress: (found as any).deployTxData.public.contractAddress,
    circuitId: 'increment',
    args: [publicDelta, secretCap],
    privateStateId: COUNTER_PRIVATE_STATE_ID,
  } as any)) as any;

  const localTxId = String(submitted?.txId ?? submitted?.public?.txId ?? 'submitted');

  try {
    const nextPrivateState = submitted?.callTxData?.private?.nextPrivateState;
    if (nextPrivateState !== undefined) {
      await (providers.privateStateProvider as any).set(COUNTER_PRIVATE_STATE_ID, nextPrivateState);
    }
  } catch {
    // Private state is empty for this contract; ignore persistence failures.
  }

  async function readOnChainTxHash(): Promise<string | null> {
    try {
      const info = await (providers.publicDataProvider as any).queryLatestTxInfo?.(contractAddress);
      return typeof info?.hash === 'string' && info.hash.length > 0 ? info.hash : null;
    } catch {
      return null;
    }
  }

  async function readCounter(): Promise<bigint | null> {
    try {
      const state = await queryCounterState(providers, contractAddress);
      return state.counter;
    } catch {
      return null;
    }
  }

  // Snapshot before submit is already gone, so treat the first successful
  // read after submit as potentially stale. Poll until the indexer reports
  // a different hash than it did right after submit, or the counter moves.
  const firstHash = await readOnChainTxHash();
  const firstCounter = await readCounter();

  // Best-effort read-back with a short timeout so the UI never sticks.
  // Prefer the indexer-confirmed transaction hash so the explorer link
  // matches what 1AM shows. The local hash is only a fallback because
  // 1AM dust-sponsorship can change the final hash after balancing.
  const deadline = Date.now() + 25_000;
  let latestHash: string | null = firstHash;
  let latestCounter: bigint | null = firstCounter;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const [counter, onChainHash] = await Promise.all([readCounter(), readOnChainTxHash()]);
    if (counter !== null) latestCounter = counter;
    if (onChainHash !== null) latestHash = onChainHash;
    const hashAdvanced = firstHash && latestHash && latestHash !== firstHash;
    const counterAdvanced = firstCounter !== null && latestCounter !== null && latestCounter !== firstCounter;
    if (hashAdvanced || counterAdvanced) {
      return {
        txId: latestHash ?? localTxId,
        message:
          latestCounter !== null
            ? `Counter is now ${latestCounter.toString()}.`
            : 'Refresh in a few seconds to see the new value.',
      };
    }
  }
  // Indexer did not advance in time. Return the confirmed hash when we have
  // one, otherwise the locally computed hash.
  const finalHash = latestHash ?? (await readOnChainTxHash());
  const finalCounter = latestCounter ?? (await readCounter());
  return {
    txId: finalHash ?? localTxId,
    message:
      finalCounter !== null && firstCounter !== null && finalCounter !== firstCounter
        ? `Counter is now ${finalCounter.toString()}.`
        : 'Refresh in a few seconds to see the new value.',
  };
}
