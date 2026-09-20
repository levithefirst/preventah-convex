import { useEffect, useState } from 'react';

/**
 * The marks and the two pieces of chrome every signed-in screen carries.
 *
 * Deliberately small. The product is four tabs and a check-in; anything
 * here that grows into a marketing header is working against that.
 */

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      P
    </span>
  );
}

/** The standing disclaimer. Present on every screen, never a modal. */
export function Disclaimer({ onLeave }: { onLeave?: () => void }) {
  return (
    <footer className="foot">
      <p>
        General lifestyle guidance from public-health sources. Not medical advice, not a
        diagnosis, not a prediction. A family history raises the value of prevention and of a
        conversation with a clinician; it does not mean anyone will develop a condition.
      </p>
      <p className="tiny">
        Every action carries the source it came from, and each one links out so you can read it
        yourself rather than take ours for it.
      </p>
      {onLeave && (
        <button className="link" onClick={onLeave}>
          Leave this household on this device
        </button>
      )}
    </footer>
  );
}

/**
 * Copies a join code. Falls back to selecting nothing and simply saying
 * so, because the code is always readable on screen anyway.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      className="btn"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(value)
          .then(() => setState('copied'))
          .catch(() => setState('failed'));
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy it by hand' : label}
    </button>
  );
}
