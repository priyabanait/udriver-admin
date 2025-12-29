import { requirePermission } from '../routes/middleware.js';

function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res._json = obj; return res; };
  return res;
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

(async function runTests() {
  console.log('Running permission middleware tests (production mode)...');
  process.env.NODE_ENV = 'production';

  // Case 1: No user
  let req = {}; let res = makeRes(); let called = false;
  await new Promise((resolve) => {
    const mw = requirePermission('admin.roles');
    mw(req, res, () => { called = true; resolve(); });
    setTimeout(resolve, 50);
  });
  assert(!called, 'next should not be called when no user');
  assert(res.statusCode === 401, 'expected 401 when no user');
  console.log('✓ rejects when no user');

  // Case 2: user without permission
  req = { user: { id: 'u1', role: 'manager', permissions: ['dashboard.view'] } }; res = makeRes(); called = false;
  await new Promise((resolve) => {
    const mw = requirePermission('admin.roles');
    mw(req, res, () => { called = true; resolve(); });
    setTimeout(resolve, 50);
  });
  assert(!called, 'next should not be called when user lacks permission');
  assert(res.statusCode === 403, 'expected 403 when user lacks permission');
  console.log('✓ rejects when user lacks permission');

  // Case 3: user with permission
  req = { user: { id: 'u2', role: 'manager', permissions: ['admin.roles'] } }; res = makeRes(); called = false;
  await new Promise((resolve) => {
    const mw = requirePermission('admin.roles');
    mw(req, res, () => { called = true; resolve(); });
    setTimeout(resolve, 50);
  });
  assert(called, 'next should be called when user has permission');
  console.log('✓ allows when user has required permission');

  // Case 4: super_admin role
  req = { user: { id: 'u3', role: 'super_admin', permissions: [] } }; res = makeRes(); called = false;
  await new Promise((resolve) => {
    const mw = requirePermission('admin.roles');
    mw(req, res, () => { called = true; resolve(); });
    setTimeout(resolve, 50);
  });
  assert(called, 'next should be called for super_admin');
  console.log('✓ allows super_admin');

  console.log('All middleware tests passed.');
})().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});