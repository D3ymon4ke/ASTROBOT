import { Client } from 'ssh2';

if (!process.env.ASTROBOT_VPS_PASSWORD) throw new Error('Defina ASTROBOT_VPS_PASSWORD antes de conectar à VPS.');

const conn = new Client();

conn.on('ready', () => {
  conn.exec('pm2 logs astrobot-backend --lines 40 --raw', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).connect({
  host: '187.127.40.228',
  port: 22,
  username: 'root',
  password: process.env.ASTROBOT_VPS_PASSWORD
});
