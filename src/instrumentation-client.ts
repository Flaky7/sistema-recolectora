import * as Sentry from "@sentry/nextjs";

import { sentryDataCollection } from "../sentry.privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // Session Replay is intentionally not enabled: it would record what clientas type and see.
  dataCollection: sentryDataCollection,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
