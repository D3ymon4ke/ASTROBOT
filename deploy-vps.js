import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

const FILES_TO_UPLOAD = [
  { local: 'vps-backend/server.js', remote: '/root/astrobot-backend/server.js' },
  { local: 'vps-backend/UserSession.js', remote: '/root/astrobot-backend/UserSession.js' },
  { local: 'vps-backend/supabase.js', remote: '/root/astrobot-backend/supabase.js' },
  { local: 'vps-backend/deriv/DerivAPI.js', remote: '/root/astrobot-backend/deriv/DerivAPI.js' },
  { local: 'vps-backend/strategies/tradingStrategies.js', remote: '/root/astrobot-backend/strategies/tradingStrategies.js' },
  { local: 'vps-backend/utils/telegram.js', remote: '/root/astrobot-backend/utils/telegram.js' },
  { local: 'admin-panel/index.html', remote: '/root/astrobot-backend/admin-panel/index.html' },
  { local: 'vps-backend/package.json', remote: '/root/astrobot-backend/package.json' }
];

console.log('Connecting to VPS...');
conn.on('ready', () => {
  console.log('SSH Connection Ready. Ensuring directories exist...');
  conn.exec('mkdir -p /root/astrobot-backend/admin-panel /root/astrobot-backend/deriv /root/astrobot-backend/strategies /root/astrobot-backend/utils', (errDir) => {
    if (errDir) throw errDir;
    
    console.log('Directories ensured. Opening SFTP...');
    conn.sftp((err, sftp) => {
      if (err) throw err;
    
    let uploadedCount = 0;
    
    function uploadNext() {
      if (uploadedCount === FILES_TO_UPLOAD.length) {
        console.log('All files uploaded successfully. Running npm install...');
        conn.exec('cd /root/astrobot-backend && npm install', (errInstall, streamInstall) => {
          if (errInstall) throw errInstall;
          streamInstall.on('close', () => {
            console.log('Dependencies installed. Restarting PM2 process...');
            conn.exec('pm2 restart astrobot-backend --update-env', (err2, stream2) => {
              if (err2) throw err2;
              stream2.on('close', () => {
                console.log('PM2 process restarted successfully!');
                conn.end();
              }).on('data', (d) => process.stdout.write(d));
            });
          }).on('data', (d) => process.stdout.write(d));
        });
        return;
      }
      
      const file = FILES_TO_UPLOAD[uploadedCount];
      console.log(`Uploading ${file.local} -> ${file.remote}...`);
      sftp.fastPut(file.local, file.remote, (err3) => {
        if (err3) {
          console.error(`Error uploading ${file.local}:`, err3);
          conn.end();
          return;
        }
        uploadedCount++;
        uploadNext();
      });
    }
    
    uploadNext();
    });
  });
}).connect({
  host: '187.127.40.228',
  port: 22,
  username: 'root',
  password: 'E08059900pe@'
});
