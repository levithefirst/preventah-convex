import { useCallback, useEffect, useState } from 'react';
import { ALL_ROUTES, META, ORIGIN, isRoute, type Route } from './site';

/**
 * A router small enough to read in one sitting.
 *
 * The History API, one listener, and a helper for links. No dependency,
 * no nested route tree: there are twelve paths and they are all in
 * src/site.ts. Every one is registered server-side too, so a reload or a
 * shared link lands on the same screen rather than a 404.
 */

function currentPath(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return isRoute(path) ? path : '/404';
}

export function useRoute(): [Route, (to: Route) => void] {
  const [route, setRoute] = useState<Route>(() => currentPath());

  useEffect(() => {
    const onPop = () => setRoute(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: Route) => {
    if (to === currentPath()) return;
    window.history.pushState(null, '', to);
    setRoute(to);
    window.scrollTo(0, 0);
  }, []);

  return [route, navigate];
}

function setTag(selector: string, attr: string, value: string, create: () => Element) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * Title, description, canonical and the Open Graph pair, refreshed on
 * every route change so a shared link previews as the page it points at
 * rather than as the app shell.
 */
export function useDocumentMeta(route: Route): void {
  useEffect(() => {
    const meta = META[route] ?? META['/404'];
    const url = `${ORIGIN}${route === '/404' ? '/' : route}`;

    document.title = meta.title;

    const named = (name: string, content: string) =>
      setTag(`meta[name="${name}"]`, 'content', content, () => {
        const el = document.createElement('meta');
        el.setAttribute('name', name);
        return el;
      });
    const prop = (property: string, content: string) =>
      setTag(`meta[property="${property}"]`, 'content', content, () => {
        const el = document.createElement('meta');
        el.setAttribute('property', property);
        return el;
      });

    named('description', meta.description);
    prop('og:title', meta.title);
    prop('og:description', meta.description);
    prop('og:url', url);
    named('twitter:title', meta.title);
    named('twitter:description', meta.description);

    setTag('link[rel="canonical"]', 'href', url, () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    });
  }, [route]);
}

export { ALL_ROUTES };
export type { Route };
