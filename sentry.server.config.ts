// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
