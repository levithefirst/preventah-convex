/**
 * Who issues the tokens this deployment trusts: itself.
 *
 * CONVEX_SITE_URL is set by Convex, so this needs no configuration of
 * its own and stays correct across dev and production.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
