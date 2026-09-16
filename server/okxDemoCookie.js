import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const COOKIE_NAME = 'astrobot_okx_demo';

function keyFromEnv() {
  const hex = process.env.OKX_DEMO_COOKIE_KEY;
  return /^[a-f0-9]{64}$/i.test(hex || '') ? Buffer.from(hex, 'hex') : null;
}

export function demoCookieReady() { return !!keyFromEnv(); }

export function sealDemoCredentials(credentials, expiresAt = Date.now() + 60 * 60 * 1000) {
  const key = keyFromEnv();
  if (!key) throw new Error('Chave do cofre demo não configurada');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ ...credentials, expiresAt }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}

export function openDemoCredentials(raw) {
  const key = keyFromEnv();
  if (!key || typeof raw !== 'string' || raw.length > 4096) return null;
  try {
    const bytes = Buffer.from(raw, 'base64url');
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    return data.expiresAt > Date.now() && data.demo === true ? data : null;
  } catch { return null; }
}

export function readDemoCookie(req) {
  const cookie = req.headers?.cookie || '';
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return openDemoCredentials(value?.slice(COOKIE_NAME.length + 1));
}

export function setDemoCookie(req, res, sealed) {
  const secure = req.headers?.['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${sealed}; HttpOnly; SameSite=Strict; Path=/api/okx; Max-Age=3600${secure ? '; Secure' : ''}`);
}

export function clearDemoCookie(req, res) {
  const secure = req.headers?.['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api/okx; Max-Age=0${secure ? '; Secure' : ''}`);
}
