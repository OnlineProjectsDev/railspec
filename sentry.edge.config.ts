// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a30fd479fac0e13f22bbaccc4b75248f@o4509330694406144.ingest.us.sentry.io/4510067234373632",

  tracesSampleRate: 1,
  enableLogs: true,

  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console") return null;
    return breadcrumb;
  },

  debug: false,
});
