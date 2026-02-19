import pg from 'pg';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForHealth(checkFn, { timeoutMs = 30000, intervalMs = 300, label = 'service' } = {}) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const isHealthy = await checkFn();
      if (isHealthy) {
        return true;
      }
    } catch (err) {
      lastError = err;
    }

    await wait(intervalMs);
  }

  const elapsed = Date.now() - startedAt;
  const reason = lastError instanceof Error ? lastError.message : String(lastError || 'unknown');
  throw new Error(`${label} was not healthy after ${elapsed}ms. Last error: ${reason}`);
}

const toArgMap = (argv) => {
  const map = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      map.set(key, 'true');
      continue;
    }
    map.set(key, next);
    i += 1;
  }
  return map;
};

const asInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const checkHttpHealth = async (url) => {
  const response = await fetch(url);
  return response.ok;
};

const checkPostgresHealth = async ({
  host,
  port,
  database,
  user,
  password,
  ssl,
  sslRejectUnauthorized,
}) => {
  const client = new pg.Client({
    host,
    port,
    database,
    user,
    password,
    ssl: ssl ? { rejectUnauthorized: sslRejectUnauthorized } : undefined,
    connectionTimeoutMillis: 2000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } finally {
    try {
      await client.end();
    } catch {
      // noop
    }
  }
};

async function main() {
  const args = toArgMap(process.argv.slice(2));
  const mode = String(args.get('mode') || 'http').trim().toLowerCase();
  const timeoutMs = asInt(args.get('timeout'), 30000);
  const intervalMs = asInt(args.get('interval'), 300);

  if (mode === 'http') {
    const url = String(args.get('url') || '').trim();
    if (!url) {
      throw new Error('Missing required --url for http mode');
    }

    await waitForHealth(
      () => checkHttpHealth(url),
      { timeoutMs, intervalMs, label: `http ${url}` }
    );
    console.log(`OK: http health reachable at ${url}`);
    return;
  }

  if (mode === 'pg') {
    const host = String(args.get('host') || process.env.DB_HOST || '127.0.0.1');
    const port = asInt(args.get('port') || process.env.DB_PORT, 5432);
    const database = String(args.get('database') || process.env.DB_NAME || '');
    const user = String(args.get('user') || process.env.DB_USER || '');
    const password = String(args.get('password') || process.env.DB_PASSWORD || '');
    const ssl = String(args.get('ssl') || process.env.DB_SSL || 'false').toLowerCase() === 'true';
    const sslRejectUnauthorized =
      String(args.get('ssl-reject-unauthorized') || process.env.DB_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

    if (!database || !user) {
      throw new Error('Missing postgres connection args. Required: --database, --user');
    }

    await waitForHealth(
      () =>
        checkPostgresHealth({
          host,
          port,
          database,
          user,
          password,
          ssl,
          sslRejectUnauthorized,
        }),
      { timeoutMs, intervalMs, label: `postgres ${host}:${port}/${database}` }
    );
    console.log(`OK: postgres healthy at ${host}:${port}/${database}`);
    return;
  }

  throw new Error(`Unsupported mode: ${mode}. Use --mode http or --mode pg`);
}

const isDirectRun = process.argv[1] && process.argv[1].includes('wait-for-health.mjs');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}

