// Test helper: deploy the counter contract to the local `undeployed` devnet
// and return handles for running circuit calls and reading ledger state.
//
// Requires the local devnet to be running (`npm run setup` or the `test`
// script brings it up) and the counter contract compiled (`npm run compile`).
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';

import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import { NETWORK_CONFIGS, type NetworkConfig } from '../../src/network';
import { createWallet, unshieldedToken, type WalletContext } from '../../src/wallet';

// @ts-expect-error wallet sync requires a WebSocket global
globalThis.WebSocket = WebSocket;

export interface DeployedCounter {
  address: string;
  callTx: {
    increment(publicDelta: bigint, secretCap: bigint): Promise<unknown>;
  };
  queryLedger(): Promise<{ counter: bigint; lastDelta: bigint }>;
  walletCtx: WalletContext;
  providers: ReturnType<typeof createCounterProviders>;
}

function createCounterProviders(walletCtx: WalletContext, zkConfigPath: string) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: unknown, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: unknown) => walletCtx.wallet.submitTransaction(tx) as unknown,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'counter-state',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(
      NETWORK_CONFIGS.undeployed.indexer,
      NETWORK_CONFIGS.undeployed.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(NETWORK_CONFIGS.undeployed.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

const PRIVATE_STATE_ID = 'counterPrivateState';

export async function deployCounter(seed = '0000000000000000000000000000000000000000000000000000000000000001'): Promise<DeployedCounter> {
  const network: NetworkConfig = NETWORK_CONFIGS.undeployed;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', '..', 'contracts', 'managed', 'counter');
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

  if (!fs.existsSync(contractPath)) {
    throw new Error('Counter contract not compiled — run `npm run compile` first.');
  }

  const CounterContract = await import(pathToFileURL(contractPath).href);
  const compiledContract = CompiledContract.make('counter', CounterContract.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  const walletCtx = await createWallet({ network: 'undeployed', networkConfig: network, seed });
  await walletCtx.wallet.waitForSyncedState();
  console.error('[deploy-counter] wallet synced');

  // Register NIGHT for DUST generation if needed (mirrors src/deploy.ts).
  const dustState = await Rx.firstValueFrom(walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  const unregisteredUtxos = dustState.unshielded.availableCoins.filter(
    (c: unknown) => !(c as { meta?: { registeredForDustGeneration?: boolean } }).meta?.registeredForDustGeneration,
  );
  if (unregisteredUtxos.length > 0) {
    const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
      unregisteredUtxos,
      walletCtx.unshieldedKeystore.getPublicKey(),
      (payload: Uint8Array) => walletCtx.unshieldedKeystore.signData(payload),
    );
    await walletCtx.wallet.submitTransaction(await walletCtx.wallet.finalizeRecipe(recipe));
  }
  if (dustState.dust.balance(new Date()) === 0n) {
    console.error('[deploy-counter] waiting for dust...');
    await Rx.firstValueFrom(
      walletCtx.wallet.state().pipe(
        Rx.throttleTime(5000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    );
  }
  console.error('[deploy-counter] dust ready');

  const providers = createCounterProviders(walletCtx, zkConfigPath);

  let deployed: Awaited<ReturnType<typeof deployContract>> | undefined;
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      deployed = await deployContract(providers as never, {
        compiledContract: compiledContract as never,
        args: [],
        privateStateId: PRIVATE_STATE_ID,
        initialPrivateState: {},
      } as never);
      break;
    } catch (err) {
      const msg = `${err instanceof Error ? err.message : String(err)}`;
      const dustShort = msg.includes('Not enough Dust') || msg.includes('Insufficient Funds') || msg.includes('could not balance dust');
      if (!dustShort) throw err;
      console.error(`[deploy-counter] dust-short on attempt ${attempt}: ${msg.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  if (!deployed) throw new Error('Failed to deploy counter contract');

  const address = deployed.deployTxData.public.contractAddress;

  return {
    address,
    callTx: {
      increment: (publicDelta: bigint, secretCap: bigint) =>
        (deployed as unknown as { callTx: { increment: (a: bigint, b: bigint) => Promise<unknown> } }).callTx.increment(publicDelta, secretCap),
    },
    queryLedger: async () => {
      const contractState = await providers.publicDataProvider.queryContractState(address);
      if (!contractState) throw new Error('No on-chain state for counter contract');
      return CounterContract.ledger(contractState.data) as { counter: bigint; lastDelta: bigint };
    },
    walletCtx,
    providers,
  };
}
