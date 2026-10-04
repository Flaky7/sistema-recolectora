import type { init } from "@sentry/nextjs";

type DataCollection = NonNullable<Parameters<typeof init>[0]>["dataCollection"];

/**
 * Constitution II: errors may reach Sentry, personal data may not. Sentry 11 collects user info,
 * cookies, headers, request bodies, query params, DB query data and local variables by default;
 * every category is turned off here and shared by the server, edge and browser configs.
 */
export const sentryDataCollection: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
