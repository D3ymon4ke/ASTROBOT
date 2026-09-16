import { Client } from 'ssh2';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const password = process.env.ASTROBOT_VPS_PASSWORD;
if (!password) throw new Error('Defina ASTROBOT_VPS_PASSWORD para publicar');
const host = '187.127.40.228';
const keys = execFileSync('ssh-keygen', ['-F', host, '-f', path.join(os.homedir(), '.ssh', 'known_hosts')], { encoding: 'utf8' })
  .split('\n').filter(line => line && !line.startsWith('#')).map(line => Buffer.from(line.trim().split(/\s+/)[2], 'base64'));
if (!keys.length) throw new Error('Host SSH precisa estar previamente validado no known_hosts');
const client = new Client();
await new Promise((resolve, reject) => client.once('ready', resolve).once('error', reject)
  .connect({ host, username: 'root', password, hostVerifier: key => keys.some(known => known.equals(key)), readyTimeout: 15000 }));
function command(cmd) {
  return new Promise((resolve, reject) => client.exec(cmd, (error, stream) => {
    if (error) return reject(error);
    let output = '';
    stream.on('data', data => { output += data; });
    stream.stderr.on('data', data => { output += data; });
    stream.on('close', code => code === 0 ? resolve(output) : reject(new Error(`Comando remoto falhou (${code}): ${output}`)));
  }));
}
try {
  // Serviço independente; nunca altera processos, estado ou sessões Deriv.
  await command('test -d /root/astrobot-backend/downloads && mkdir -p /root/astrobot-crypto-scalp/src/platform /root/astrobot-crypto-scalp/vps-backend/crypto /root/astrobot-crypto-scalp/data');
  const sftp = await new Promise((resolve, reject) => client.sftp((e, value) => e ? reject(e) : resolve(value)));
  const put = (remote, text) => new Promise((resolve, reject) => {
    const stream = sftp.createWriteStream(remote, { mode: 0o600 });
    stream.on('error', reject).on('close', resolve); stream.end(text);
  });
  for (const file of ['src/platform/spotResearch.js', 'vps-backend/crypto/paperEngine.js', 'vps-backend/crypto/scalpEngine.js', 'vps-backend/crypto/scalpDaemon.js']) {
    await put(`/root/astrobot-crypto-scalp/${file}`, await fs.readFile(path.join(root, file)));
  }
  await put('/root/astrobot-crypto-scalp/package.json', JSON.stringify({ private: true, type: 'module' }));
  await put('/root/astrobot-crypto-scalp/ecosystem.config.cjs', `module.exports={apps:[{name:'astrobot-crypto-scalp',cwd:'/root/astrobot-crypto-scalp',script:'vps-backend/crypto/scalpDaemon.js',instances:1,exec_mode:'fork',restart_delay:10000,max_memory_restart:'150M',env:{CRYPTO_LAB_DATA_DIR:'/root/astrobot-crypto-scalp/data',CRYPTO_LAB_PUBLIC_FILE:'/root/astrobot-backend/downloads/crypto-scalp.json'}}]};`);
  console.log(await command('cd /root/astrobot-crypto-scalp && node --check vps-backend/crypto/scalpDaemon.js && pm2 startOrRestart ecosystem.config.cjs --only astrobot-crypto-scalp --update-env && pm2 save'));
} finally { client.end(); }
