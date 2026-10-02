type Props = {
  onOpenConsole: () => void;
};

export function Landing({ onOpenConsole }: Props) {
  return (
    <div className="landing">
      <section className="hero-block">
        <p className="micro">Zero-knowledge access gateway</p>
        <h1>
          Prove access.
          <br />
          Keep the budget private.
        </h1>
        <p className="lede">
          A caller proves an increment stays within a private budget, and the budget never leaves the browser.
        </p>
        <div className="hero-actions">
          <button className="button primary" onClick={onOpenConsole} type="button">
            Open console
          </button>
          <a className="text-link" href="#privacy">
            Read the privacy claim
          </a>
        </div>
      </section>

      <section className="proof-strip" aria-label="What the proof establishes">
        <p>The ledger shows the delta</p>
        <p>The witness stays in the browser</p>
        <p>Proved without revealing your input</p>
      </section>

      <section className="section" id="product">
        <p className="micro">How it works</p>
        <h2>Local execution, verified state.</h2>
        <ol className="steps">
          <li>
            <span>01</span>
            <strong>Connect 1AM</strong>
            <p>Use a Midnight wallet on the same network as this app.</p>
          </li>
          <li>
            <span>02</span>
            <strong>Enter the public delta</strong>
            <p>The only number you type is the increment the ledger will see.</p>
          </li>
          <li>
            <span>03</span>
            <strong>Generate the proof locally</strong>
            <p>The private budget is a witness. It is never rendered or sent as text.</p>
          </li>
          <li>
            <span>04</span>
            <strong>Read the confirmed transaction</strong>
            <p>The indexer hash links to the 1AM explorer.</p>
          </li>
        </ol>
      </section>

      <section className="section" id="privacy">
        <p className="micro">Privacy split</p>
        <h2>Public verification. Private budget.</h2>
        <div className="split">
          <article>
            <h3>What the ledger sees</h3>
            <ul>
              <li>Counter</li>
              <li>Last delta</li>
              <li>Transaction hash</li>
            </ul>
          </article>
          <article>
            <h3>What stays in the browser</h3>
            <ul>
              <li>Secret cap — never shown</li>
              <li>Payment amount — never shown</li>
              <li>Private quota — never shown</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="closer">
        <h2>Prove your request directly in the browser.</h2>
        <button className="button primary" onClick={onOpenConsole} type="button">
          Open console
        </button>
      </section>
    </div>
  );
}
