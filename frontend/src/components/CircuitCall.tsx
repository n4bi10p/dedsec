import { useState, type FormEvent } from 'react';
import { explorerTxUrl, type IncrementResult } from '../lib/counter';

type Props = {
  enabled: boolean;
  disabledReason?: string;
  onSubmit: (publicDelta: bigint, secretCap: bigint) => Promise<IncrementResult>;
};

export function CircuitCall({ enabled, disabledReason, onSubmit }: Props) {
  const [publicDelta, setPublicDelta] = useState('1');
  const [isProving, setIsProving] = useState(false);
  const [result, setResult] = useState<IncrementResult>();
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setResult(undefined);
    const trimmed = publicDelta.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError('Public delta must be a whole number from 0 to 65535.');
      return;
    }
    const delta = BigInt(trimmed);
    if (delta > 65535n) {
      setError('Public delta must be a whole number from 0 to 65535.');
      return;
    }

    // The witness is generated locally and is deliberately never rendered,
    // logged, or returned to the UI. The contract proves the bound without
    // disclosing this value.
    const remaining = 65535n - delta;
    const secretCap = delta + (remaining === 0n ? 0n : BigInt(1 + Math.floor(Math.random() * Number(remaining))));

    setIsProving(true);
    try {
      setResult(await onSubmit(delta, secretCap));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Circuit call failed.');
    } finally {
      setIsProving(false);
    }
  }

  return (
    <section aria-busy={isProving} className="card circuit-card">
      <p className="micro">Step 2</p>
      <h2>Prove an increment</h2>
      <p>Generate a local proof that the increment stays within a private budget.</p>
      <form onSubmit={submit}>
        <label htmlFor="public-delta">Public delta</label>
        <input
          id="public-delta"
          inputMode="numeric"
          min="0"
          max="65535"
          disabled={isProving}
          onChange={(event) => setPublicDelta(event.target.value)}
          type="text"
          value={publicDelta}
        />
        <button className="button primary" disabled={!enabled || isProving} type="submit">
          {isProving ? 'Generating proof…' : 'Call increment circuit'}
        </button>
      </form>
      {isProving && (
        <p className="notice" role="status">
          <span className="bar" aria-hidden="true" />
          Proof is being built locally in this browser.
        </p>
      )}
      <p className="privacy-note">Proved without revealing your input</p>
      {!enabled && <p className="notice">{disabledReason ?? 'Connect 1AM before calling the circuit.'}</p>}
      {result && (
        <div className="success">
          <p className="micro">Confirmed</p>
          <p>Increment submitted. {result.message}</p>
          <a className="mono" href={explorerTxUrl(result.txId)} rel="noreferrer" target="_blank">
            {result.txId}
          </a>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
