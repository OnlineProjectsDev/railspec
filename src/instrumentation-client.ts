// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://a30fd479fac0e13f22bbaccc4b75248f@o4509330694406144.ingest.us.sentry.io/4510067234373632",

  integrations: isProd ? [Sentry.replayIntegration()] : [],

  tracesSampleRate: isProd ? 1 : 0,
  enableLogs: isProd,

  replaysSessionSampleRate: isProd ? 0.1 : 0,
  replaysOnErrorSampleRate: isProd ? 1.0 : 0,

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console") return null;
    return breadcrumb;
  },

  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
