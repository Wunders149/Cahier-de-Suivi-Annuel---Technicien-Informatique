import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const UPSTREAM_TIMEOUT_MS = 12000;
const TEST_TIMEOUT_MS = 6000;

interface SyncRequestBody {
  baseUrl?: string;
  username?: string;
  password?: string;
  includeAudit?: boolean;
}

function isPrivateLanHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '::1' || h.endsWith('.local')) return true;
  if (h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.')) return true;
  const m = /^172\.(\d+)\./.exec(h);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new Error('Veuillez saisir l’URL du serveur SOGEDIPROMA (ex: http://192.168.100.3:8080 ou https://it.votre-domaine.com).');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL du serveur SOGEDIPROMA invalide. Utilisez un format http:// ou https://.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Protocole non autorisé. Seuls http:// et https:// sont supportés.');
  }
  // Remove trailing slash cleanly
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
}

function extractCookies(headers: Headers): Map<string, string> {
  const jar = new Map<string, string>();
  const rawList: string[] = [];

  const maybeGetSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof maybeGetSetCookie === 'function') {
    rawList.push(...maybeGetSetCookie.call(headers));
  } else {
    const single = headers.get('set-cookie');
    if (single) {
      rawList.push(single);
    }
  }

  for (const cookieHeader of rawList) {
    const firstPair = String(cookieHeader || '').split(';')[0]?.trim();
    if (!firstPair) continue;
    const eqIndex = firstPair.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = firstPair.slice(0, eqIndex).trim();
    const val = firstPair.slice(eqIndex + 1).trim();
    if (name) {
      jar.set(name, val);
    }
  }
  return jar;
}

function mergeCookieJars(target: Map<string, string>, incoming: Map<string, string>): void {
  for (const [k, v] of incoming.entries()) {
    target.set(k, v);
  }
}

function serializeCookies(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function fetchUpstreamJson(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    jar: Map<string, string>;
    timeoutMs?: number;
  }
): Promise<{ status: number; ok: boolean; payload: Record<string, unknown> }> {
  const timeoutMs = options.timeoutMs || UPSTREAM_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const parsedUrl = new URL(url);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': '1',
    };
    const cookieHeader = serializeCookies(options.jar);
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    mergeCookieJars(options.jar, extractCookies(res.headers));

    const text = await res.text();
    let payload: Record<string, unknown> = {};
    if (text) {
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        payload = { raw: text.slice(0, 300) };
      }
    }

    return { status: res.status, ok: res.ok, payload };
  } catch (err) {
    const errObj = err as Error & { cause?: { code?: string; message?: string } };
    const causeCode = errObj?.cause?.code || '';
    const message = errObj?.message || String(err);
    const isPrivate = isPrivateLanHostname(parsedUrl.hostname);

    if (isPrivate) {
      throw new Error(
        `Serveur privé local (${parsedUrl.origin}) injoignable depuis cet environnement Cloud (${causeCode || 'réseau LAN isolé'}). Solutions : importez un export JSON (/api/backup) via l’Option B, exposez ${parsedUrl.host} via un tunnel HTTPS (Cloudflare Tunnel / ngrok), ou exécutez le cahier en local sur votre réseau.`
      );
    }
    if (message.includes('aborted') || message.includes('AbortError')) {
      throw new Error(`Délai dépassé (${timeoutMs / 1000}s) lors de la connexion au serveur SOGEDIPROMA.`);
    }
    throw new Error(
      `Serveur SOGEDIPROMA inaccessible (${causeCode ? `${causeCode} · ` : ''}${message}).`
    );
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeSogedipromaDataForWorkbook(rawData: Record<string, unknown>): Record<string, unknown> {
  const data = { ...rawData };

  // Supprimer les blobs base64 volumineux (logos et photos matériel) pour préserver la limite 1 Mo Firestore
  if (data.settings && typeof data.settings === 'object') {
    const settingsCopy = { ...(data.settings as Record<string, unknown>) };
    if (typeof settingsCopy.profileImage === 'string' && settingsCopy.profileImage.length > 256) {
      settingsCopy.profileImage = '';
    }
    data.settings = settingsCopy;
  }

  if (Array.isArray(data.assets)) {
    data.assets = data.assets.map((asset) => {
      if (!asset || typeof asset !== 'object') return asset;
      const a = { ...(asset as Record<string, unknown>) };
      if (typeof a.photo === 'string' && a.photo.length > 0) {
        a.hasPhoto = true;
        delete a.photo;
      }
      return a;
    });
  }

  // Exclure les secrets chiffrés du coffre lors de la synchro applicative
  if (Array.isArray(data.passwords)) {
    data.passwords = [];
  }

  return data;
}

function maskUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Indique au frontend si des variables serveur SOGEDIPROMA sont préconfigurées (sans exposer les secrets)
  app.get('/api/sogediproma/config', (_req: Request, res: Response) => {
    const envUrl = process.env.SOGEDIPROMA_BASE_URL || '';
    const hasDefaultCredentials = Boolean(
      process.env.SOGEDIPROMA_USERNAME && process.env.SOGEDIPROMA_PASSWORD
    );
    let isPrivateLan = false;
    if (envUrl) {
      try {
        isPrivateLan = isPrivateLanHostname(new URL(envUrl).hostname);
      } catch {
        isPrivateLan = false;
      }
    }
    res.json({
      hasDefaultUrl: Boolean(envUrl),
      defaultUrl: envUrl ? maskUrl(envUrl) : '',
      isDefaultUrlPrivateLan: isPrivateLan,
      hasDefaultCredentials,
      defaultUsername: process.env.SOGEDIPROMA_USERNAME || '',
    });
  });

  // Vérifie la joignabilité (/api/status) et optionnellement l'authentification (/api/login)
  app.post('/api/sogediproma/test', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as SyncRequestBody;
      const baseUrl = normalizeBaseUrl(body.baseUrl || process.env.SOGEDIPROMA_BASE_URL || '');
      const username = String(body.username || process.env.SOGEDIPROMA_USERNAME || '').trim();
      const password = String(body.password || process.env.SOGEDIPROMA_PASSWORD || '');

      const jar = new Map<string, string>();
      const statusRes = await fetchUpstreamJson(`${baseUrl}/api/status`, {
        jar,
        timeoutMs: TEST_TIMEOUT_MS,
      });
      if (!statusRes.ok) {
        res.status(502).json({
          error:
            (typeof statusRes.payload.error === 'string' && statusRes.payload.error) ||
            `Le serveur SOGEDIPROMA a répondu HTTP ${statusRes.status} sur /api/status.`,
        });
        return;
      }

      let authenticated = Boolean(statusRes.payload.authenticated);
      let user: unknown = null;

      if (username && password) {
        const loginRes = await fetchUpstreamJson(`${baseUrl}/api/login`, {
          method: 'POST',
          body: { username, password },
          jar,
        });
        if (!loginRes.ok) {
          res.status(401).json({
            error:
              (typeof loginRes.payload.error === 'string' && loginRes.payload.error) ||
              'Identifiants SOGEDIPROMA refusés par le serveur distant.',
          });
          return;
        }
        authenticated = true;
        user = loginRes.payload.user || null;

        // Fermer proprement la session distante après le test
        await fetchUpstreamJson(`${baseUrl}/api/logout`, { method: 'POST', body: {}, jar }).catch(
          () => {}
        );
      }

      res.json({
        reachable: true,
        authenticated,
        needsSetup: Boolean(statusRes.payload.needsSetup),
        settings: statusRes.payload.settings || {},
        user,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur lors du test SOGEDIPROMA.',
      });
    }
  });

  // Synchronisation complète : /api/status -> /api/login -> /api/state (+ /api/audit optionnel) -> /api/logout
  app.post('/api/sogediproma/sync', async (req: Request, res: Response) => {
    const jar = new Map<string, string>();
    let normalizedBaseUrl = '';

    try {
      const body = (req.body || {}) as SyncRequestBody;
      normalizedBaseUrl = normalizeBaseUrl(body.baseUrl || process.env.SOGEDIPROMA_BASE_URL || '');
      const username = String(body.username || process.env.SOGEDIPROMA_USERNAME || '').trim();
      const password = String(body.password || process.env.SOGEDIPROMA_PASSWORD || '');

      // 1. Vérifier /api/status
      const statusRes = await fetchUpstreamJson(`${normalizedBaseUrl}/api/status`, { jar });
      if (!statusRes.ok) {
        res.status(502).json({
          error:
            (typeof statusRes.payload.error === 'string' && statusRes.payload.error) ||
            `Impossible d'interroger /api/status (HTTP ${statusRes.status}).`,
        });
        return;
      }

      if (statusRes.payload.needsSetup) {
        res.status(409).json({
          error: 'Le serveur SOGEDIPROMA nécessite une initialisation administrateur (/api/setup-admin) avant la synchronisation.',
        });
        return;
      }

      // 2. Authentification /api/login
      let loginPayload: Record<string, unknown> | null = null;
      if (!statusRes.payload.authenticated) {
        if (!username || !password) {
          res.status(401).json({
            error: 'Identifiant et mot de passe SOGEDIPROMA requis pour accéder à /api/state.',
          });
          return;
        }
        const loginRes = await fetchUpstreamJson(`${normalizedBaseUrl}/api/login`, {
          method: 'POST',
          body: { username, password },
          jar,
        });
        if (!loginRes.ok) {
          res.status(401).json({
            error:
              (typeof loginRes.payload.error === 'string' && loginRes.payload.error) ||
              'Authentification refusée par le serveur SOGEDIPROMA.',
          });
          return;
        }
        loginPayload = loginRes.payload;
      }

      // 3. Récupération complète via GET /api/state (contient inventory, purchases, assets, employees, departments, suppliers, tickets, workLogs, maintenance, subscriptions, budgets, itTracking, accesses)
      let statePayload: Record<string, unknown>;
      if (loginPayload && loginPayload.data && typeof loginPayload.data === 'object') {
        statePayload = loginPayload;
      } else {
        const stateRes = await fetchUpstreamJson(`${normalizedBaseUrl}/api/state`, { jar });
        if (!stateRes.ok) {
          res.status(stateRes.status === 401 ? 401 : 502).json({
            error:
              (typeof stateRes.payload.error === 'string' && stateRes.payload.error) ||
              `Erreur lors de la lecture de /api/state (HTTP ${stateRes.status}).`,
          });
          return;
        }
        statePayload = stateRes.payload;
      }

      const rawData =
        statePayload.data && typeof statePayload.data === 'object'
          ? (statePayload.data as Record<string, unknown>)
          : {};
      const cleanData = sanitizeSogedipromaDataForWorkbook(rawData);

      // 4. Optionnel : Récupérer /api/audit si administrateur et demandé
      let auditEntries: unknown[] = [];
      if (body.includeAudit) {
        const auditRes = await fetchUpstreamJson(`${normalizedBaseUrl}/api/audit`, { jar });
        if (auditRes.ok && Array.isArray(auditRes.payload.entries)) {
          auditEntries = auditRes.payload.entries.slice(0, 200);
        }
      }

      res.json({
        status: {
          mailConfigured: Boolean(statusRes.payload.mailConfigured),
          settings: statusRes.payload.settings || {},
        },
        revision: Number(statePayload.revision) || 0,
        user: statePayload.user || null,
        data: cleanData,
        auditEntries,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Erreur lors de la synchronisation SOGEDIPROMA.',
      });
    } finally {
      if (normalizedBaseUrl && jar.size > 0) {
        await fetchUpstreamJson(`${normalizedBaseUrl}/api/logout`, {
          method: 'POST',
          body: {},
          jar,
        }).catch(() => {});
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Application non compilée (dist/index.html manquant).');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Cahier de Suivi IT démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Échec démarrage serveur :', err);
  process.exit(1);
});
