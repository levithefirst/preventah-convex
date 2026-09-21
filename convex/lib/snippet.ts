/**
 * Turns a crawled description into one plain sentence.
 *
 * What comes back from a search index is page furniture as often as
 * prose: markdown headings, link syntax, "Skip to main content", nav
 * crumbs, runs of whitespace. None of that belongs on a health screen,
 * and a card with a title and a link is better than a card with a
 * heading marker in it.
 */
export function cleanSnippet(raw: string): string {
  const text = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/[*_`>|#]+/g, ' ')
    .replace(/\bSkip to (?:main )?content\b/gi, ' ')
    .replace(/\bCookies? on [^.]*\./gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Accept only something that reads like a sentence. A search index
  // returns page furniture as often as prose, and a card with a title
  // and a link is better than a card with a breadcrumb in it.
  for (const candidate of text.split(/(?<=[.!?])\s+/)) {
    const sentence = candidate.trim();
    if (sentence.length < 50 || sentence.length > 240) continue;
    if (!/^[A-Z]/.test(sentence)) continue;
    if (!/[.!?]$/.test(sentence)) continue;
    if (sentence.split(/\s+/).length < 8) continue;
    return sentence;
  }
  return '';
}
