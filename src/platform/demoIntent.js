const PREFIX = 'astrobot_okx_demo_intent_v1_';
const TERMINAL = new Set(['filled', 'canceled', 'mmp_canceled', 'rejected', 'not_submitted']);

export function demoIntentKey(accountRef) {
  if (!/^[0-9a-f]{16}$/.test(accountRef || '')) throw new Error('Conta Demo inválida');
  return PREFIX + accountRef;
}

export function newDemoClientId(cryptoApi = globalThis.crypto) {
  const bytes = new Uint8Array(10);
  cryptoApi.getRandomValues(bytes);
  return `AstroD${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function unresolvedDemoIntent(intent) {
  return !!intent?.clientId && !TERMINAL.has(intent.status);
}

export function readDemoIntent(storage, accountRef) {
  try {
    const saved = JSON.parse(storage.getItem(demoIntentKey(accountRef)));
    return /^AstroD[0-9a-f]{20}$/.test(saved?.clientId || '')
      && ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].includes(saved?.symbol)
      && typeof saved.status === 'string' ? saved : null;
  } catch { return null; }
}

export function writeDemoIntent(storage, accountRef, intent) {
  if (!/^AstroD[0-9a-f]{20}$/.test(intent?.clientId || '')) throw new Error('Intenção Demo inválida');
  storage.setItem(demoIntentKey(accountRef), JSON.stringify({
    clientId: intent.clientId, symbol: intent.symbol, status: intent.status,
    side: intent.side, price: intent.price, quantity: intent.quantity,
    brokerId: intent.brokerId, createdAt: intent.createdAt
  }));
}
