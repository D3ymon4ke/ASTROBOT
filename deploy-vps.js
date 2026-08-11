import { Client } from 'ssh2';

const conn = new Client();

const FILES_TO_UPLOAD = [
  { local: 'vps-backend/server.js', remote: '/root/astrobot-backend/server.js' },
  { local: 'vps-backend/UserSession.js', remote: '/root/astrobot-backend/UserSession.js' },
  { local: 'vps-backend/supabase.js', remote: '/root/astrobot-backend/supabase.js' },
  { local: 'vps-backend/deriv/DerivAPI.js', remote: '/root/astrobot-backend/deriv/DerivAPI.js' },
  { local: 'vps-backend/strategies/tradingStrategies.js', remote: '/root/astrobot-backend/strategies/tradingStrategies.js' },
  { local: 'vps-backend/utils/telegram.js', remote: '/root/astrobot-backend/utils/telegram.js' },
  { local: 'vps-backend/utils/marketIntelligence.js', remote: '/root/astrobot-backend/utils/marketIntelligence.js' },
  { local: 'admin-panel/index.html', remote: '/root/astrobot-backend/admin-panel/index.html' },
  { local: 'vps-backend/package.json', remote: '/root/astrobot-backend/package.json' }
];

console.log('Connecting to VPS...');
conn.on('ready', () => {
  console.log('SSH Connection Ready. Creating backup directory...');
  conn.exec('mkdir -p /root/backups && cp /root/astrobot-backend/UserSession.js /root/backups/UserSession.js.bak', (errBackup, streamBackup) => {
    if (errBackup) console.error('Backup error:', errBackup);
    if (streamBackup) {
      streamBackup.resume();
      streamBackup.on('close', () => {
        console.log('VPS Backup step complete.');
        console.log('Ensuring remote directories exist...');
        conn.exec('mkdir -p /root/astrobot-backend/admin-panel /root/astrobot-backend/deriv /root/astrobot-backend/strategies /root/astrobot-backend/utils', (errDir, streamDir) => {
          if (errDir) throw errDir;
          if (streamDir) {
            streamDir.resume();
            streamDir.on('close', () => {
              console.log('Remote directories ensured. Starting SFTP upload...');
              conn.sftp((err, sftp) => {
                if (err) throw err;

                let uploadedCount = 0;

                function uploadNext() {
                  if (uploadedCount === FILES_TO_UPLOAD.length) {
                    console.log('All files uploaded successfully via SFTP. Restarting PM2 process...');
                    conn.exec('pm2 restart astrobot-backend --update-env', (err2, stream2) => {
                      if (err2) throw err2;
                      if (stream2) {
                        stream2.on('data', (d) => process.stdout.write(d));
                        stream2.on('close', () => {
                          console.log('PM2 process restarted successfully!');
                          conn.end();
                          process.exit(0);
                        });
                      }
                    });
                    return;
                  }

                  const file = FILES_TO_UPLOAD[uploadedCount];
                  console.log(`Uploading [${uploadedCount + 1}/${FILES_TO_UPLOAD.length}] ${file.local} -> ${file.remote}...`);
                  sftp.fastPut(file.local, file.remote, (err3) => {
                    if (err3) {
                      console.error(`Error uploading ${file.local}:`, err3);
                      conn.end();
                      process.exit(1);
                      return;
                    }
                    uploadedCount++;
                    uploadNext();
                  });
                }

                uploadNext();
              });
            });
          }
        });
      });
    }
  });
}).connect({
  host: '187.127.40.228',
  port: 22,
  username: 'root',
  password: 'E08059900pe@'
});
