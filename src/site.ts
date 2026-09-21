/**
 * Site constants: the routes, and the metadata each public one carries.
 *
 * Every path here is registered as an exact GET in convex/http.ts. That
 * is deliberate and slightly laborious: the router never gets a
 * `pathPrefix: "/"` catch-all, which is what broke the site the first
 * time it was deployed.
 */

export const ORIGIN = 'https://qualified-hummingbird-614.convex.site';
export const REPO = 'https://github.com/levithefirst/preventah-convex';

export const PURPOSE = 'Three prevention actions a day, for a household.';

/**
 * No public inbox exists yet, so none is published. The Contact page is
 * static until this holds a real address: an invented one would bounce,
 * which is worse than saying there isn't one.
 */
export const CONTACT_EMAIL = 'TODO_SET_CONTACT_EMAIL';
export const hasContactEmail = () => !CONTACT_EMAIL.startsWith('TODO_');

export const APP_ROUTES = ['/today', '/conditions', '/board', '/mail', '/profile'] as const;

/**
 * The app's front door and its onboarding, kept out of APP_ROUTES so the
 * tab row never shows them. `/app` lands on Today; `/start` is the four
 * step wizard someone sees instead of an empty Today.
 */
export const FLOW_ROUTES = ['/app', '/start'] as const;
export const PUBLIC_ROUTES = ['/about', '/faq', '/privacy', '/terms', '/contact'] as const;

/** Account routes. Public, but not part of the site footer. */
export const AUTH_ROUTES = ['/signin', '/signup'] as const;

export type AppRoute = (typeof APP_ROUTES)[number];
export type PublicRoute = (typeof PUBLIC_ROUTES)[number];
export type AuthRoute = (typeof AUTH_ROUTES)[number];
export type FlowRoute = (typeof FLOW_ROUTES)[number];
export type Route = '/' | AppRoute | PublicRoute | AuthRoute | FlowRoute | '/404';

export const ALL_ROUTES: Route[] = [
  '/',
  ...APP_ROUTES,
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  ...FLOW_ROUTES,
  '/404',
];

export function isRoute(path: string): path is Route {
  return (ALL_ROUTES as string[]).includes(path);
}

interface Meta {
  title: string;
  description: string;
}

/** Unique title and description per public route. No duplicates. */
export const META: Record<Route, Meta> = {
  '/': {
    title: 'Preventah — three prevention actions a day, for a household',
    description:
      'Pick the conditions that run in your family. Get one thing to eat, one to move and one to keep, every day. Check one off and your household sees it.',
  },
  '/today': {
    title: "Today — Preventah",
    description: "Today's three prevention actions, drawn from public-health guidance.",
  },
  '/conditions': {
    title: 'Conditions — Preventah',
    description: 'Choose the conditions a family history is relevant to, from a curated catalog.',
  },
  '/board': {
    title: 'Household board — Preventah',
    description: "Who in the household has checked in today, updating live.",
  },
  '/mail': {
    title: 'Morning plan — Preventah',
    description: 'Have the day’s three actions emailed each morning, and a nudge after a quiet day.',
  },
  '/profile': {
    title: 'Profile — Preventah',
    description: 'Your name, your household, and how to leave it.',
  },
  '/about': {
    title: 'About Preventah — what it is, and what it is not',
    description:
      'Preventah turns a family health history into three small prevention actions a day. It does not diagnose, predict, or replace a clinician.',
  },
  '/faq': {
    title: 'Questions about Preventah — consent, join codes, sources, data',
    description:
      'How consent works, what a join code is for, where the guidance comes from, what happens to your data, and how solo use differs from a family.',
  },
  '/privacy': {
    title: 'Privacy — what Preventah stores and why',
    description:
      'Exactly what Preventah collects: a name, a household, catalog condition ids, check-ins, and an optional email address. No wearables, no ads, no trackers.',
  },
  '/terms': {
    title: 'Terms — Preventah',
    description:
      'Preventah is a hackathon project offering general lifestyle guidance. Not medical advice, provided without warranty.',
  },
  '/contact': {
    title: 'Contact Preventah',
    description:
      'Preventah has no office and no phone line. How to reach the project, and what the in-app mail tab does instead.',
  },
  '/signin': {
    title: 'Sign in — Preventah',
    description: 'Sign in to Preventah with Google or with an email address and password.',
  },
  '/signup': {
    title: 'Create an account — Preventah',
    description:
      'Create a Preventah account with Google or an email address, and start a household or join one.',
  },
  '/app': {
    title: "Today — Preventah",
    description: "Today's three prevention actions for your household.",
  },
  '/start': {
    title: 'Set up Preventah',
    description:
      'Start a household or join one, agree to what is stored, and pick the conditions that run in your family.',
  },
  '/404': {
    title: 'Page not found — Preventah',
    description: 'That page does not exist. Here is the way back.',
  },
};
