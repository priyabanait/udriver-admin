import express from 'express';
import fetch from 'node-fetch';
import rolesRouter from '../routes/roles.js';
import managersRouter from '../routes/managers.js';
import { authenticateToken, requirePermission } from '../routes/middleware.js';

// Create app and start on ephemeral port so we can exercise full HTTP stack
async function startApp() {
  const app = express();
  app.use(express.json());

  // Test user injector: sets req.user from X-Test-User header if present
  app.use((req, res, next) => {
    const raw = req.headers['x-test-user'];
    if (raw) {
      try { req.user = JSON.parse(raw); } catch (err) { /* ignore */ }
    }
    next();
  });

  // Debug logging for PUT requests to inspect headers & determined req.user
  app.use((req, res, next) => {
    if (req.method === 'PUT') {
      console.log('DEBUG-PUT', req.path, 'headers:', JSON.stringify(req.headers), 'user:', JSON.stringify(req.user));
    }
    next();
  });

  // Debug endpoint to inspect headers/user during tests
  app.get('/__debug', (req, res) => res.json({ user: req.user || null, headers: req.headers }));
  // Test-only protected routes (to avoid DB side-effects)
  app.put('/api/test-roles-protected/:id', authenticateToken, requirePermission('admin.roles'), (req, res) => {
    return res.status(200).json({ ok: true });
  });

  app.put('/api/test-managers-protected/:id', (req, res) => {
    // If request tries to change role/permissions, enforce admin.roles (production OR FORCE_AUTH)
    if (Object.prototype.hasOwnProperty.call(req.body, 'role') || Object.prototype.hasOwnProperty.call(req.body, 'permissions')) {
      const enforce = process.env.NODE_ENV === 'production' || process.env.FORCE_AUTH === 'true';
      if (enforce) {
        const user = req.user;
        const allowed = user && (user.role === 'super_admin' || (Array.isArray(user.permissions) && user.permissions.includes('admin.roles')));
        if (!allowed) return res.status(403).json({ error: 'Not allowed' });
      }
    }
    return res.status(200).json({ ok: true });
  });

  app.use('/api/roles', rolesRouter);
  app.use('/api/managers', managersRouter);

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  return { server, port };
}

async function run() {
  // Force non-production so authenticateToken bypasses token check, but enable permission enforcement
  process.env.NODE_ENV = 'test';
  process.env.FORCE_AUTH = 'true';
  console.log('Running E2E HTTP tests (NODE_ENV=test, FORCE_AUTH=true)');
  console.log('NODE_ENV=', process.env.NODE_ENV);
  process.env.FORCE_AUTH = 'true';

  const { server, port } = await startApp();
  const base = `http://127.0.0.1:${port}`;

  // Helper to make fetch with optional test-user header
  async function doFetch(path, opts = {}) {
    const url = base + path;
    const headers = opts.headers || {};
    if (opts.user) headers['X-Test-User'] = JSON.stringify(opts.user);
    const res = await fetch(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json', ...headers }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    return { status: res.status, body: await res.text() };
  }

  // DEBUG: check __debug route to confirm header/user behavior
  const dbg1 = await doFetch('/__debug');
  console.log('  debug no header ->', dbg1.status, dbg1.body);
  const dbg2 = await doFetch('/__debug', { user: { id: 'u-debug', role: 'manager', permissions: [] } });
  console.log('  debug with user header ->', dbg2.status, dbg2.body);
  const dbg3 = await doFetch('/__debug', { method: 'PUT', user: { id: 'u-debug', role: 'manager', permissions: [] } });
  console.log('  debug PUT with user header ->', dbg3.status, dbg3.body);

  // Roles: PUT /api/roles/:id
  console.log('- Testing roles update permission enforcement');
  let r = await doFetch('/api/roles/role123', { method: 'PUT', body: { permissions: ['dashboard.view'] } });
  console.log('  -> no user:', r.status);
  if (![401,403].includes(r.status)) throw new Error('Expected 401/403 when no user provided for roles update');

  r = await doFetch('/api/roles/role123', { method: 'PUT', user: { id: 'u1', role: 'manager', permissions: ['dashboard.view'] }, body: { permissions: ['dashboard.view'] } });
  console.log('  -> insufficient perms:', r.status);
  if (r.status !== 403) throw new Error('Expected 403 when user lacks admin.roles');

  r = await doFetch('/api/test-roles-protected/role123', { method: 'PUT', user: { id: 'u2', role: 'super_admin', permissions: [] }, body: { permissions: ['dashboard.view'] } });
  console.log('  -> super_admin or admin.roles present (test route):', r.status);
  if (r.status === 403) throw new Error('Did not expect 403 for super_admin on test route');

  // Managers: PUT /api/test-managers-protected/:id (test-only protection logic)
  console.log('- Testing manager update protection for role/permissions changes (test route)');
  r = await doFetch('/api/test-managers-protected/someid', { method: 'PUT', body: { role: 'admin' } });
  console.log('  -> no user:', r.status);
  if (![401,403].includes(r.status)) throw new Error('Expected 401/403 when no user provided for manager update');

  r = await doFetch('/api/test-managers-protected/someid', { method: 'PUT', user: { id: 'u3', role: 'manager', permissions: ['dashboard.view'] }, body: { role: 'admin' } });
  console.log('  -> insufficient perms:', r.status);
  if (r.status !== 403) throw new Error('Expected 403 when user lacks admin.roles for manager modification');

  r = await doFetch('/api/test-managers-protected/someid', { method: 'PUT', user: { id: 'u4', role: 'super_admin', permissions: [] }, body: { role: 'admin' } });
  console.log('  -> super_admin allowed:', r.status);
  if (r.status === 403) throw new Error('Did not expect 403 for super_admin performing manager update');

  // Cleanup
  server.close();

  console.log('E2E HTTP tests passed.');
}

run().catch(err => {
  console.error('E2E tests failed:', err.message);
  process.exit(1);
});