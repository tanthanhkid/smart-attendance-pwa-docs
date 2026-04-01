import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import net from 'node:net';

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Update .env to point to your local PostgreSQL instance.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error(`DATABASE_URL is invalid: ${databaseUrl}`);
  }

  const host = parsedUrl.hostname || '127.0.0.1';
  const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;
  const databaseName = parsedUrl.pathname.replace(/^\//, '') || '(default database)';

  return { host, port, databaseName };
}

function waitForPort(host, port, timeoutMs = 3000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const socket = new net.Socket();

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      cleanup();
      resolvePromise();
    });
    socket.once('timeout', () => {
      cleanup();
      rejectPromise(new Error(`Timed out connecting to ${host}:${port}`));
    });
    socket.once('error', (error) => {
      cleanup();
      rejectPromise(error);
    });

    socket.connect(port, host);
  });
}

async function main() {
  loadEnvFile(resolve('.env'));
  loadEnvFile(resolve('.env.example'));

  const { host, port, databaseName } = getDatabaseTarget();
  await waitForPort(host, port);

  console.log(`PostgreSQL is reachable at ${host}:${port} (${databaseName}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
