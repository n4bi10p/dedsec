// Level 1 tests for the `counter` contract.
//
// Covers the three required areas:
//   1. Circuit logic   — the disclosed delta must respect the secret cap.
//   2. State transition — counter/lastDelta update correctly on-chain.
//   3. Privacy         — private witness (secretCap) never lands on the ledger.
//
// Runs against the local devnet (docker compose) — see README.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deployCounter } from './helpers/contract-deploy';

const LONG_TIMEOUT = 180_000;

let deployed: Awaited<ReturnType<typeof deployCounter>>;

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 60_000, label = 'condition'): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

beforeAll(async () => {
  deployed = await deployCounter();
}, LONG_TIMEOUT);

afterAll(async () => {
  if (deployed) await deployed.walletCtx.wallet.stop();
});

describe('counter contract — circuit logic', () => {
  it(
    'accepts an increment whose disclosed delta is within the secret cap',
    async () => {
      await expect(deployed.callTx.increment(2n, 5n)).resolves.toBeDefined();
      await waitFor(async () => (await deployed.queryLedger()).counter === 2n, 60_000, 'counter === 2');
    },
    LONG_TIMEOUT,
  );

  it(
    'rejects an increment whose disclosed delta exceeds the secret cap',
    async () => {
      const before = await deployed.queryLedger();
      await expect(deployed.callTx.increment(10n, 3n)).rejects.toThrow();
      // State must be untouched by the rejected call.
      const after = await deployed.queryLedger();
      expect(after.counter).toBe(before.counter);
      expect(after.lastDelta).toBe(before.lastDelta);
    },
    LONG_TIMEOUT,
  );
});

describe('counter contract — state transitions', () => {
  it(
    'tracks the cumulative count across sequential increments',
    async () => {
      const { counter: before } = await deployed.queryLedger();
      const delta = 3n;
      await expect(deployed.callTx.increment(delta, delta + 1n)).resolves.toBeDefined();
      await waitFor(
        async () => {
          const s = await deployed.queryLedger();
          return s.counter === before + delta && s.lastDelta === delta;
        },
        60_000,
        'counter/lastDelta updated',
      );
      const s = await deployed.queryLedger();
      expect(s.counter).toBe(before + delta);
      expect(s.lastDelta).toBe(delta);
    },
    LONG_TIMEOUT,
  );
});

describe('counter contract — private inputs are never exposed', () => {
  it(
    'ledger only exposes public fields (counter, lastDelta) — no secretCap, no witness data',
    async () => {
      const s = await deployed.queryLedger();
      const fields = Object.keys(s as unknown as Record<string, unknown>).sort();
      expect(fields).toEqual(['counter', 'lastDelta']);
    },
    LONG_TIMEOUT,
  );

  it(
    'the disclosed delta equals the public input and the secret cap stays hidden',
    async () => {
      // A call with a cap strictly greater than the delta proves the delta was
      // disclosed while the cap value itself is never persisted.
      const { counter: counterBefore } = await deployed.queryLedger();
      const publicDelta = 1n;
      const secretCap = 9999n;
      await expect(deployed.callTx.increment(publicDelta, secretCap)).resolves.toBeDefined();
      await waitFor(
        async () => (await deployed.queryLedger()).lastDelta === publicDelta,
        60_000,
        'lastDelta === publicDelta',
      );
      const after = await deployed.queryLedger();
      expect(after.lastDelta).toBe(publicDelta);
      // The previous transition's delta is still tracked (count grew by 1), and
      // nothing but the two public ledger cells exists on-chain.
      expect(after.counter).toBe(counterBefore + publicDelta);
      expect(Object.keys(after as unknown as Record<string, unknown>)).not.toContain('secretCap');
    },
    LONG_TIMEOUT,
  );
});
