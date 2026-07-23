const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "ASTROBOT v2.5",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Disables CORS web security for local fetch requests (important for Deriv PAT REST API calls)
      backgroundThrottling: false // Prevents JS and WebSocket throttling when minimized/hidden
    }
  });

  // Check if development or production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Intercept close event to hide window instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow) {
      overlayWindow.close();
    }
  });
}

function createOverlayWindow() {
  if (overlayWindow) {
    overlayWindow.focus();
    return;
  }

  overlayWindow = new BrowserWindow({
    width: 350,
    height: 240,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      backgroundThrottling: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173/?overlay=true');
  } else {
    overlayWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}?overlay=true`);
  }

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay-status', false);
    }
  });

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay-status', true);
  }
}

function createTray() {
  let iconPath = path.join(__dirname, '../src/assets/newlogo.png');
  if (!fs.existsSync(iconPath)) {
    const distAssetsPath = path.join(__dirname, '../dist/assets');
    if (fs.existsSync(distAssetsPath)) {
      const files = fs.readdirSync(distAssetsPath);
      const logoFile = files.find(f => f.includes('newlogo') && f.endsWith('.png')) || files.find(f => f.includes('logo') && f.endsWith('.png'));
      if (logoFile) {
        iconPath = path.join(distAssetsPath, logoFile);
      }
    }
  }

  let trayIcon = nativeImage.createEmpty();
  if (fs.existsSync(iconPath)) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } catch (e) {
      console.error('Failed to load tray icon:', e);
    }
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir ASTROBOT',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Abrir Overlay HUD',
      click: () => {
        createOverlayWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Sair do ASTROBOT',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('ASTROBOT v2.5 - Operando em Segundo Plano');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// Telegram Config and Background Polling
const telegramConfigPath = path.join(app.getPath('userData'), 'telegram_config.json');
let telegramConfig = { enabled: false, token: '', chatId: '' };

try {
  if (fs.existsSync(telegramConfigPath)) {
    telegramConfig = JSON.parse(fs.readFileSync(telegramConfigPath, 'utf8'));
  }
} catch (e) {
  console.error('Failed to load telegram config:', e);
}

let telegramOffset = 0;
let telegramTimeoutId = null;
let webhookDeleted = false;

async function pollTelegram() {
  if (!telegramConfig || !telegramConfig.enabled || !telegramConfig.token || !telegramConfig.chatId) {
    telegramTimeoutId = setTimeout(pollTelegram, 5000);
    return;
  }

  // Delete webhook if not done yet to ensure getUpdates doesn't return 409 Conflict
  if (!webhookDeleted) {
    try {
      const delUrl = `https://api.telegram.org/bot${telegramConfig.token}/deleteWebhook`;
      await fetch(delUrl);
      webhookDeleted = true;
    } catch (err) {
      // Ignore network errors
    }
  }

  try {
    const url = `https://api.telegram.org/bot${telegramConfig.token}/getUpdates?offset=${telegramOffset + 1}&timeout=5`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.ok && data.result) {
      for (const update of data.result) {
        telegramOffset = update.update_id;
        if (update.message) {
          const msg = update.message;
          const chatIdStr = msg.chat.id.toString();
          const expectedChatId = telegramConfig.chatId.toString();

          if (chatIdStr !== expectedChatId) {
            // Unauthorized chat ID
            const rejectUrl = `https://api.telegram.org/bot${telegramConfig.token}/sendMessage`;
            await fetch(rejectUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id,
                text: `❌ <b>ACESSO NEGADO</b>\nEste bot está vinculado a outra licença do ASTROBOT.`,
                parse_mode: 'HTML'
              })
            });
            continue;
          }

          // Forward authorized command to React Renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('telegram-command', msg.text || '');
          }
        }
      }
    }
  } catch (err) {
    // Silent catch to prevent console flooding on network disconnect
  }

  telegramTimeoutId = setTimeout(pollTelegram, 1000);
}

// IPC Handlers
ipcMain.on('open-overlay', () => {
  createOverlayWindow();
});

ipcMain.on('close-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
  }
});

ipcMain.on('state-update', (event, state) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('state-update', state);
  }
});

ipcMain.on('bot-command', (event, command) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bot-command', command);
  }
});

ipcMain.on('restore-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('update-telegram-config', (event, config) => {
  telegramConfig = config;
  webhookDeleted = false;
  try {
    fs.writeFileSync(telegramConfigPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save telegram config:', err);
  }

  if (telegramTimeoutId) {
    clearTimeout(telegramTimeoutId);
  }
  pollTelegram();
});

// IPC Handlers for Auto-Update Manual Trigger
ipcMain.on('install-update-now', () => {
  const tempPath = app.getPath('temp');
  const installerPath = path.join(tempPath, 'ASTROBOT_Setup.exe');
  if (fs.existsSync(installerPath)) {
    console.log('[Update] User clicked install-update-now. Executing:', installerPath);
    executeInstaller(installerPath);
  }
});

ipcMain.on('open-installer-folder', () => {
  const tempPath = app.getPath('temp');
  const installerPath = path.join(tempPath, 'ASTROBOT_Setup.exe');
  if (fs.existsSync(installerPath)) {
    const { shell } = require('electron');
    shell.showItemInFolder(installerPath);
  }
});

function executeInstaller(installerPath) {
  const { exec } = require('child_process');
  const { shell } = require('electron');

  console.log('[Update] Executing installer via ShellExecute & cmd:', installerPath);

  // Method A: cmd.exe start
  exec(`cmd.exe /c start "" "${installerPath}"`, (err) => {
    if (err) console.error('[Update] Error in cmd exec:', err);
  });

  // Method B: shell.openPath
  shell.openPath(installerPath).catch((err) => {
    console.error('[Update] shell.openPath error:', err);
  });

  // Wait 4 seconds for Windows UAC prompt to appear before quitting app
  setTimeout(() => {
    isQuitting = true;
    app.quit();
  }, 4000);
}

// Auto-Update Checker and Downloader
async function checkForUpdates() {
  if (!app.isPackaged) {
    console.log('[Update] Dev mode detected (!app.isPackaged). Skipping auto-update.');
    return;
  }

  const pjson = require('../package.json');
  const currentVersion = app.getVersion() || pjson.version || '2.5.0';
  const checkUrl = `https://187-127-40-228.sslip.io/api/check-update?version=${encodeURIComponent(currentVersion)}`;

  console.log(`[Update] Checking version. Current: ${currentVersion}`);

  try {
    const response = await fetch(checkUrl);
    const data = await response.json();

    if (data.updateAvailable && data.url) {
      console.log(`[Update] Update available: ${data.version}`);

      // Notify renderer that update exists
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', data.version);
      }

      // Helper function to download file with redirect support and proper finish event handling
      const tempPath = app.getPath('temp');
      const installerPath = path.join(tempPath, 'ASTROBOT_Setup.exe');

      const downloadFileWithRedirects = (url, destPath, redirectCount = 0) => {
        if (redirectCount > 5) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-error', 'Muitos redirecionamentos ao baixar atualização.');
          }
          return;
        }

        const httpModule = url.startsWith('https') ? require('https') : require('http');
        httpModule.get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            console.log(`[Update] Redirecting to: ${res.headers.location}`);
            return downloadFileWithRedirects(res.headers.location, destPath, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            console.error(`[Update] Failed download with status code: ${res.statusCode}`);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-error', `Erro ao baixar arquivo (HTTP ${res.statusCode})`);
            }
            return;
          }

          const totalSize = parseInt(res.headers['content-length'], 10) || 0;
          let downloadedSize = 0;
          const fileStream = fs.createWriteStream(destPath);

          res.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize > 0 && mainWindow && !mainWindow.isDestroyed()) {
              const percent = Math.round((downloadedSize / totalSize) * 100);
              mainWindow.webContents.send('update-download-progress', percent);
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => {
              console.log('[Update] Download complete and file stream closed.');
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('update-downloaded');
              }

              // Auto execute installer after 4s fallback if user doesn't click
              setTimeout(() => {
                executeInstaller(installerPath);
              }, 4000);
            });
          });

          fileStream.on('error', (err) => {
            console.error('[Update] File stream error:', err);
            fs.unlink(destPath, () => {});
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('update-error', err.message);
            }
          });
        }).on('error', (err) => {
          console.error('[Update] Download error:', err);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-error', err.message);
          }
        });
      };

      downloadFileWithRedirects(data.url, installerPath);
    } else {
      console.log('[Update] App is up to date.');
    }
  } catch (err) {
    console.error('[Update] Check failed:', err);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  pollTelegram(); // Start polling immediately

  // Run update check 5 seconds after window ready
  setTimeout(checkForUpdates, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

