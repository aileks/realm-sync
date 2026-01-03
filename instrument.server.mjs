import * as Sentry from '@sentry/tanstackstart-react';
import { readFileSync } from 'node:fs';

function loadEnvFile() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  } catch {
    console.warn('No .env.local file found, please create one.');
  }
}

loadEnvFile();

const sentryDsn = process.env.SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
