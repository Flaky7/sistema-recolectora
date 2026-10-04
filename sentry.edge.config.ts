import * as Sentry from "@sentry/nextjs";

import { sentryDataCollection } from "./sentry.privacy";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0.1,
});
