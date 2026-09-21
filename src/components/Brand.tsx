import { useEffect, useState } from 'react';

/**
 * The marks and the two pieces of chrome every signed-in screen carries.
 *
 * Deliberately small. The product is four tabs and a check-in; anything
 * here that grows into a marketing header is working against that.
 */

/**
 * The Preventah mark: a cream window with a mint calendar stripe, an
 * offset blush plate and a bold ink P. Decorative rather than labelled,
 * because the wordmark beside it already says the name and the control
 * wrapping both carries its own label.
 */
export function Mark({ size = 44 }: { size?: number }) {
  return (
    <img
      className="mark"
      src="/brand/preventah-mark.svg"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
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
 * Copies a value to the clipboard, saying so for two seconds. When the
 * clipboard is unavailable it says that instead of failing silently.
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
