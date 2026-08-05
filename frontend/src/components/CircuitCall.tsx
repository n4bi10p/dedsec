import { useState, type FormEvent } from 'react';

type Props = {
  enabled: boolean;
  disabledReason?: string;
  onSubmit: (publicDelta: bigint, secretCap: bigint) => Promise<string>;
};

export function CircuitCall({ enabled, disabledReason, onSubmit }: Props) {
  const [publicDelta, setPublicDelta] = useState('1');
  const [isProving, setIsProving] = useState(false);
  const [result, setResult] = useState<string>();
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setResult(undefined);
    const delta = BigInt(publicDelta);
    if (delta < 0n || delta > 65535n) {
      setError('Public delta must be between 0 and 65535.');
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
    <section className="card circuit-card">
      <div className="eyebrow">Step 2</div>
      <h2>Prove an increment</h2>
      <p>Generate a local proof that your increment stays within a private budget.</p>
      <form onSubmit={submit}>
        <label htmlFor="public-delta">Public delta</label>
        <input
          id="public-delta"
          inputMode="numeric"
          min="0"
          max="65535"
          onChange={(event) => setPublicDelta(event.target.value)}
          type="number"
          value={publicDelta}
        />
        <button className="button primary" disabled={!enabled || isProving} type="submit">
          {isProving ? 'Generating proof…' : 'Call increment circuit'}
        </button>
      </form>
      <div className="privacy-note">Proved without revealing your input.</div>
      {!enabled && <p className="notice">{disabledReason ?? 'Connect Lace before calling the circuit.'}</p>}
      {result && <p className="success">{result}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
