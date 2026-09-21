import { PUBLIC_ROUTES, type Route } from '../site';

const LABEL: Record<string, string> = {
  '/about': 'About',
  '/faq': 'FAQ',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
  '/contact': 'Contact',
};

/** The public footer. Five real pages, a disclaimer, and no dummy icons. */
export default function SiteFooter({ go }: { go: (to: Route) => void }) {
  return (
    <footer className="foot">
      <nav className="footLinks" aria-label="Site">
        {PUBLIC_ROUTES.map((path) => (
          <button key={path} className="link" onClick={() => go(path)}>
            {LABEL[path]}
          </button>
        ))}
      </nav>
      <p>
        General lifestyle guidance from public-health sources. Not medical advice, not a
        diagnosis, not a prediction. A family history raises the value of prevention and of a
        conversation with a clinician; it does not mean anyone will develop a condition.
      </p>
      <p className="tiny">&copy; 2026 Preventah</p>
    </footer>
  );
}
