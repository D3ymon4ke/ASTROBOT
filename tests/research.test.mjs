import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { breakoutSignal } from '../vps-backend/automation/breakout.js';
import { replayTicks } from '../vps-backend/automation/tickReplay.js';
import { ResearchRecorder } from '../vps-backend/automation/ResearchRecorder.js';
import { validateConfig } from '../vps-backend/automation/signals.js';

function bars() {
  return Array.from({ length: 30 }, (_, i) => ({ epoch: 1800000000 + i * 60, open: 100, high: i < 23 ? 102 : 100.5, low: i < 23 ? 98 : 99.5, close: 100 })).map((c, i) => i === 29 ? { ...c, high: 102, close: 101.5 } : c);
}
const quote = { kind: 'proposal', signalId: 'signal', symbol: 'R_100', strategy: 'breakout', version: 'breakout-v1', direction: 'CALL', receivedAt: 100000, stake: .35, payout: .70, durationMinutes: 1, eligible: true };
function ticks() { return Array.from({ length: 90 }, (_, i) => ({ kind: 'tick', symbol: 'R_100', epoch: 100 + i, price: 100 + i / 10 })); }
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astrobot-research-'));
  t.after(() => { const resolved = path.resolve(dir); assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(resolved, { recursive: true }); });
  const session = { activeMode: 'demo', modeStates: { demo: {}, real: {} }, saveToFile: () => true, syncToClients() {}, accountCurrency: 'USD', derivAPI: { connected: true, authorized: true } };
  return { recorder: new ResearchRecorder(session, dir), session, dir };
}
test('breakout requires compression, a closed breakout and contiguous history; never allowed in live config', () => {
  const data = bars(); assert.equal(breakoutSignal(data).direction, 'CALL');
  assert.equal(breakoutSignal(data).version, 'breakout-v1');
  const noBreak = structuredClone(data); noBreak[29].close = 100; assert.equal(breakoutSignal(noBreak), null);
  const gap = structuredClone(data); gap[5].epoch++; assert.equal(breakoutSignal(gap), null);
  assert.throws(() => validateConfig({ strategies: ['breakout'], execution: 'live' }));
});
test('tick replay uses recorded payout, latency and directional outcome; future ticks do not affect prior trade', () => {
  const r = replayTicks([quote, ...ticks()], { latencyMs: 2000 });
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].entryEpoch, 102); assert.equal(r.rows[0].exitEpoch, 162); assert.equal(r.rows[0].profit, .35);
  const altered = ticks().map(t => t.epoch > 162 ? { ...t, price: -1000 } : t);
  assert.deepEqual(replayTicks([quote, ...altered], { latencyMs: 2000 }).rows, r.rows);
});
test('entry, exit and internal gaps are excluded without inventing prices', () => {
  assert.equal(replayTicks([quote]).excluded.missingEntry, 1);
  assert.equal(replayTicks([quote, ...ticks().slice(0, 30)]).excluded.missingExit, 1);
  assert.equal(replayTicks([quote, ...ticks().filter(t => t.epoch < 120 || t.epoch > 140)]).excluded.gap, 1);
});
test('rejected proposals and overlapping same-strategy signals are excluded; ties lose', () => {
  assert.equal(replayTicks([{ ...quote, eligible: false }, ...ticks()]).excluded.rejected, 1);
  const r = replayTicks([quote, { ...quote, signalId: 'second', receivedAt: 110000 }, ...ticks()]);
  assert.equal(r.excluded.overlap, 1);
  assert.equal(replayTicks([quote, ...ticks().map(t => ({ ...t, price: 100 }))]).rows[0].profit, -.35);
  assert.throws(() => replayTicks([], { latencyMs: Infinity }));
});
test('recorder is off by default, projects safe fields, isolates accounts and reads its captured day', async t => {
  const { recorder, session, dir } = fixture(t);
  recorder.decision({ message: 'ignored' }); assert.equal(fs.readdirSync(dir).length, 0);
  recorder.configure(true, ['R_100']);
  recorder.decision({ time: Date.now(), symbol: 'R_100', kind: 'filtered', message: 'score', token: 'never-save-this', config: { token: 'secret' } });
  recorder.append([quote, ...ticks()]);
  const date = new Date().toISOString().slice(0, 10), file = path.join(dir, `demo-${date}.jsonl`);
  assert.ok(!fs.readFileSync(file, 'utf8').includes('secret'));
  assert.ok(!fs.readFileSync(file, 'utf8').includes('never-save'));
  assert.equal((await recorder.replay(date, 'R_100', {})).rows.length, 1);
  session.activeMode = 'real'; assert.equal(recorder.state.enabled, false);
  await assert.rejects(recorder.replay(date, 'R_100', {}), /Nenhuma captura/);
  await assert.rejects(recorder.replay('../../etc', 'R_100', {}), /inválido/);
});
test('recorder collects and quotes breakout without buying, deduplicating subsequent captures', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1800001805000 });
  const { recorder, session } = fixture(t); const calls = [];
  session.derivAPI.sendRequest = async req => { calls.push(req); return req.proposal ? { proposal: { id: 'q', ask_price: .35, payout: .7 } } : { history: { times: [1800001801, 1800001802], prices: [100, 101] } }; };
  session.derivAPI.fetchCandleHistory = async () => bars();
  recorder.configure(true, ['R_100']); await recorder.tick();
  assert.equal(recorder.state.ticks, 2); assert.equal(recorder.state.proposals, 1);
  t.mock.timers.tick(15000); await recorder.tick();
  assert.equal(recorder.state.ticks, 2); assert.equal(recorder.state.proposals, 1);
  assert.ok(calls.every(r => !r.buy));
});
test('pausing during I/O prevents capture and proposal requests', async t => {
  const { recorder, session, dir } = fixture(t);
  session.derivAPI.sendRequest = async () => { recorder.configure(false, []); return { history: { times: [Date.now() / 1000], prices: [100] } }; };
  session.derivAPI.fetchCandleHistory = () => assert.fail('must stop after pause');
  recorder.configure(true); await recorder.tick();
  assert.equal(recorder.state.ticks, 0); assert.equal(fs.readdirSync(dir).length, 0);
});
test('retention removes only expired files owned by the recorder', t => {
  const { recorder, dir } = fixture(t);
  fs.writeFileSync(path.join(dir, 'demo-2000-01-01.jsonl'), ''); fs.writeFileSync(path.join(dir, 'notes.txt'), 'preserve');
  recorder.configure(true); recorder.append([{ kind: 'decision' }]);
  assert.ok(!fs.existsSync(path.join(dir, 'demo-2000-01-01.jsonl'))); assert.ok(fs.existsSync(path.join(dir, 'notes.txt')));
});
test('replay resolves a capture across UTC midnight using next-day ticks, without next-day proposals', async t => {
  const { recorder, dir } = fixture(t);
  const date = '2026-09-09', nextDate = '2026-09-10', midnight = Date.parse(nextDate) / 1000;
  const q = { ...quote, receivedAt: (midnight - 30) * 1000 };
  fs.writeFileSync(path.join(dir, `demo-${date}.jsonl`), JSON.stringify(q) + '\n' + Array.from({ length: 30 }, (_, i) => JSON.stringify({ kind: 'tick', symbol: 'R_100', epoch: midnight - 30 + i, price: 100 })).join('\n'));
  fs.writeFileSync(path.join(dir, `demo-${nextDate}.jsonl`), Array.from({ length: 70 }, (_, i) => JSON.stringify({ kind: 'tick', symbol: 'R_100', epoch: midnight + i, price: 101 })).join('\n') + '\n' + JSON.stringify({ ...q, signalId: 'next-day', receivedAt: midnight * 1000 }));
  const r = await recorder.replay(date, 'R_100', {});
  assert.equal(r.quoteCount, 1); assert.equal(r.rows.length, 1); assert.equal(r.rows[0].profit, .35);
});
test('storage cap pauses collection and preserves the existing file', t => {
  const { recorder, dir } = fixture(t);
  recorder.configure(true);
  const file = path.join(dir, `demo-${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.closeSync(fs.openSync(file, 'w')); fs.truncateSync(file, 32 * 1024 * 1024);
  recorder.decision({ message: 'test' });
  assert.equal(recorder.state.enabled, false); assert.match(recorder.state.status, /32 MB/);
  assert.equal(fs.statSync(file).size, 32 * 1024 * 1024);
});
