import express from 'express';
import fetch from 'node-fetch';
import notificationsRouter from '../routes/notifications.js';
import Driver from '../models/driver.js';
import Investor from '../models/investor.js';
import DeviceToken from '../models/deviceToken.js';

async function startApp() {
  const app = express();
  app.use(express.json());

  // Mount notifications router
  app.use('/api/notifications', notificationsRouter);

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

async function doFetch(base, path, opts = {}) {
  const url = base + path;
  const headers = opts.headers || {};
  const res = await fetch(url, { method: opts.method || 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function run() {
  const { server, port } = await startApp();
  const base = `http://127.0.0.1:${port}`;

  console.log('Testing validation: missing mobile');
  let r = await doFetch(base, '/api/notifications/send-driver-by-mobile', { body: { title: 'Hi' } });
  if (r.status !== 400) throw new Error('Expected 400 when mobile missing');

  console.log('Testing validation: missing title/message');
  r = await doFetch(base, '/api/notifications/send-driver-by-mobile', { body: { mobile: '999' } });
  if (r.status !== 400) throw new Error('Expected 400 when title/message missing');

  // Mock Driver and Investor to return null (respect the .lean() chain)
  Driver.findOne = () => ({ lean: async () => null });
  Investor.findOne = () => ({ lean: async () => null });

  console.log('Testing user not found -> 404 (driver)');
  Driver.findOne = () => ({ lean: async () => null });
  r = await doFetch(base, '/api/notifications/send-driver-by-mobile', { body: { mobile: '999', title: 'Hi' } });
  if (r.status !== 404) throw new Error('Expected 404 when driver not found');

  // Mock driver exist, but no device tokens
  Driver.findOne = () => ({ lean: async () => ({ _id: 'driver123' }) });
  DeviceToken.find = () => ({ distinct: async () => [] });

  console.log('Testing driver exists but no tokens -> tokensFound:0');
  r = await doFetch(base, '/api/notifications/send-driver-by-mobile', { body: { mobile: '999', title: 'Hi' } });
  if (r.status !== 200) throw new Error('Expected 200 when no tokens');
  if (!r.body || r.body.tokensFound !== 0) throw new Error('Expected tokensFound: 0');

  // Now repeat for investor endpoint
  console.log('Testing validation: missing mobile (investor)');
  r = await doFetch(base, '/api/notifications/send-investor-by-mobile', { body: { title: 'Hi' } });
  if (r.status !== 400) throw new Error('Expected 400 when mobile missing');

  console.log('Testing validation: missing title/message (investor)');
  r = await doFetch(base, '/api/notifications/send-investor-by-mobile', { body: { mobile: '999' } });
  if (r.status !== 400) throw new Error('Expected 400 when title/message missing');

  console.log('Testing user not found -> 404 (investor)');
  Investor.findOne = () => ({ lean: async () => null });
  r = await doFetch(base, '/api/notifications/send-investor-by-mobile', { body: { mobile: '999', title: 'Hi' } });
  if (r.status !== 404) throw new Error('Expected 404 when investor not found');

  // Mock investor exist, but no device tokens
  Investor.findOne = () => ({ lean: async () => ({ _id: 'investor123' }) });
  DeviceToken.find = () => ({ distinct: async () => [] });

  console.log('Testing investor exists but no tokens -> tokensFound:0');
  r = await doFetch(base, '/api/notifications/send-investor-by-mobile', { body: { mobile: '999', title: 'Hi' } });
  if (r.status !== 200) throw new Error('Expected 200 when no tokens');
  if (!r.body || r.body.tokensFound !== 0) throw new Error('Expected tokensFound: 0');

  server.close();
  console.log('notifications send-by-mobile tests passed');
}

run().catch(err => {
  console.error('notifications tests failed:', err.message);
  process.exit(1);
});