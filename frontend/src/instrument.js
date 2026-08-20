import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://4d9a8453ed9e09ce79603032a9d1d8b4@o4511943155187712.ingest.de.sentry.io/4511943162921040",
  integrations: [
    Sentry.browserTracingIntegration()
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/okepdydyxgsfywoknhqq\.supabase\.co/],
  enableLogs: true
});
