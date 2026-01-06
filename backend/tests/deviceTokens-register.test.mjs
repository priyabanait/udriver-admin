import express from 'express';
import fetch from 'node-fetch';
import deviceTokensRouter from '../routes/deviceTokens.js';
import Driver from '../models/driver.js';
import Investor from '../models/investor.js';
import DeviceToken from '../models/deviceToken.js';

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/deviceTokens', deviceTokensRouter);
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

  console.log('Driver register: missing mobile');
  let r = await doFetch(base, '/api/deviceTokens/register-driver-by-mobile', { body: { token: 't1' } });
  if (r.status !== 400) throw new Error('Expected 400 when mobile missing');

  console.log('Driver register: missing token');
  r = await doFetch(base, '/api/deviceTokens/register-driver-by-mobile', { body: { mobile: '999' } });
  if (r.status !== 400) throw new Error('Expected 400 when token missing');

  console.log('Driver register: driver not found');
  Driver.findOne = () => ({ lean: async () => null });
  r = await doFetch(base, '/api/deviceTokens/register-driver-by-mobile', { body: { mobile: '999', token: 't1' } });
  if (r.status !== 404) throw new Error('Expected 404 when driver not found');

  console.log('Driver register: success');
  Driver.findOne = () => ({ lean: async () => ({ _id: 'driver123' }) });
  DeviceToken.findOneAndUpdate = async (q, update) => ({ _id: 'tok1', token: update.token, userType: update.userType, userId: update.userId });
  r = await doFetch(base, '/api/deviceTokens/register-driver-by-mobile', { body: { mobile: '999', token: 't1', platform: 'android' } });
  if (r.status !== 200) throw new Error('Expected 200 for successful driver register');
  if (!r.body || !r.body.success || r.body.token.userType !== 'driver') throw new Error('Driver token not registered as driver');

  // Investor tests
  console.log('Investor register: missing mobile');
  r = await doFetch(base, '/api/deviceTokens/register-investor-by-mobile', { body: { token: 't2' } });
  if (r.status !== 400) throw new Error('Expected 400 when mobile missing');

  console.log('Investor register: missing token');
  r = await doFetch(base, '/api/deviceTokens/register-investor-by-mobile', { body: { mobile: '777' } });
  if (r.status !== 400) throw new Error('Expected 400 when token missing');

  console.log('Investor register: investor not found');
  Investor.findOne = () => ({ lean: async () => null });
  r = await doFetch(base, '/api/deviceTokens/register-investor-by-mobile', { body: { mobile: '777', token: 't2' } });
  if (r.status !== 404) throw new Error('Expected 404 when investor not found');

  console.log('Investor register: success');
  Investor.findOne = () => ({ lean: async () => ({ _id: 'investor123' }) });
  DeviceToken.findOneAndUpdate = async (q, update) => ({ _id: 'tok2', token: update.token, userType: update.userType, userId: update.userId });
  r = await doFetch(base, '/api/deviceTokens/register-investor-by-mobile', { body: { mobile: '777', token: 't2', platform: 'ios' } });
  if (r.status !== 200) throw new Error('Expected 200 for successful investor register');
  if (!r.body || !r.body.success || r.body.token.userType !== 'investor') throw new Error('Investor token not registered as investor');

  server.close();
  console.log('device token register tests passed');
}

run().catch(err => {
  console.error('device token tests failed:', err.message);
  process.exit(1);
});