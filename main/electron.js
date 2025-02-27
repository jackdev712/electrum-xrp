const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu } = require('electron');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 910,
    height: 555,
    minWidth: 910,
    minHeight: 575,
    resizable: true,
    fullscreenable: true,
    icon: path.join(__dirname, '../../public/images/electrum_logo.ico'),
    title: 'XRP Wallet',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  Menu.setApplicationMenu(null);
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'build', 'index.html'));
  }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('Electrum XRP');
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const exeDir = path.dirname(process.execPath);
const walletsFolder = path.join(exeDir, 'wallets');
try {
  fs.mkdirSync(walletsFolder, { recursive: true });
} catch (e) {}

function getWalletAbsolutePath(userFilePath) {
  const baseName = path.basename(userFilePath);
  return path.join(walletsFolder, baseName);
}

ipcMain.handle('toggle-fullscreen', () => {
  if (!mainWindow) return;
  const isFull = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFull);
});

ipcMain.handle('app-quit', () => {
  app.quit();
});

ipcMain.handle('open-url', (event, urlToOpen) => {
  if (urlToOpen) shell.openExternal(urlToOpen);
});

ipcMain.handle('open-wallet-file-dialog', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select your wallet file',
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (res.canceled || !res.filePaths.length) {
    return null;
  }
  return path.basename(res.filePaths[0]);
});

ipcMain.handle('check-wallet-file-encryption', async (event, filePath) => {
  try {
    if (!filePath) return null;
    const finalPath = getWalletAbsolutePath(filePath);
    if (!fs.existsSync(finalPath)) {
      return null;
    }
    const raw = fs.readFileSync(finalPath, 'utf-8');
    const json = JSON.parse(raw);
    return { exists: true, encrypted: !!json.encrypted };
  } catch {
    return null;
  }
});

ipcMain.handle('decrypt-wallet-file', async (event, filePath, userPassword) => {
  try {
    if (!filePath) {
      return { ok: false, error: 'No file path' };
    }
    const finalPath = getWalletAbsolutePath(filePath);
    if (!fs.existsSync(finalPath)) {
      return { ok: false, error: 'File not found' };
    }
    const raw = fs.readFileSync(finalPath, 'utf-8');
    const json = JSON.parse(raw);
    if (!json.encrypted || !json.cipherText) {
      return { ok: true, wallet: json };
    }
    const decrypted = decryptWithPassword(json.cipherText, userPassword);
    if (!decrypted) {
      return { ok: false, error: 'Wrong password or decrypt error' };
    }
    const combined = { ...json, ...decrypted, encrypted: false, cipherText: undefined };
    return { ok: true, wallet: combined };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('decrypt-wallet-raw', async (event, encryptedJsonString, userPassword) => {
  try {
    const jdata = JSON.parse(encryptedJsonString);
    if (!jdata.encrypted || !jdata.cipherText) {
      return { ok: true, wallet: jdata };
    }
    const dec = decryptWithPassword(jdata.cipherText, userPassword);
    if (!dec) {
      return { ok: false, error: 'Decrypt error' };
    }
    const merged = { ...jdata, ...dec, encrypted: false, cipherText: undefined };
    return { ok: true, wallet: merged };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('save-wallet-file', async (event, walletObject, password, userFilePath) => {
  try {
    if (!userFilePath) {
      return { success: false, error: 'No file path' };
    }
    const dataToSave = {
      version: 1,
      encrypted: false,
      seed: walletObject.seed || null,
      address: walletObject.address || null,
      mnemonic: walletObject.mnemonic || null
    };
    if (password && password.trim()) {
      const plain = JSON.stringify({
        seed: dataToSave.seed,
        address: dataToSave.address,
        mnemonic: dataToSave.mnemonic
      });
      const cipherText = encryptWithPassword(plain, password.trim());
      dataToSave.encrypted = true;
      dataToSave.cipherText = cipherText;
      dataToSave.seed = null;
      dataToSave.address = null;
      dataToSave.mnemonic = null;
    }
    const finalPath = getWalletAbsolutePath(userFilePath);
    fs.writeFileSync(finalPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    return { success: true, finalPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('openFileByPath', async (event, userFilePath) => {
  try {
    if (!userFilePath) {
      return { error: 'No file path provided' };
    }
    const finalPath = getWalletAbsolutePath(userFilePath);
    if (!fs.existsSync(finalPath)) {
      return { error: 'File not found: ' + finalPath };
    }
    const raw = fs.readFileSync(finalPath, 'utf-8');
    return { fileData: raw };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('notify-incoming-transaction', (event, { address, txid, amount }) => {
  try {
    const notif = new Notification({
      title: 'Incoming Transaction',
      body: `Received ${amount} XRP on ${address}`,
      icon: path.join(__dirname, '../../public/images/electrum_logo.ico')
    });
    notif.show();
  } catch {}
});

ipcMain.handle('notify-outgoing-transaction', (event, { txid, amountXrp, to }) => {
  try {
    const amtStr = amountXrp ? String(amountXrp) : '0.0';
    const notif = new Notification({
      title: 'Transaction Sent',
      body: `Sent ${amtStr} XRP to ${to}`,
      icon: path.join(__dirname, '../../public/images/electrum_logo.ico')
    });
    notif.show();
  } catch {}
});

function encryptWithPassword(plainText, password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(plainText, 'utf8', 'base64');
  enc += cipher.final('base64');
  const packed = { s: salt.toString('base64'), i: iv.toString('base64'), d: enc };
  return Buffer.from(JSON.stringify(packed)).toString('base64');
}

function decryptWithPassword(cipherBase64, password) {
  try {
    const raw = Buffer.from(cipherBase64, 'base64').toString('utf8');
    const { s, i, d } = JSON.parse(raw);
    const salt = Buffer.from(s, 'base64');
    const iv = Buffer.from(i, 'base64');
    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec = decipher.update(d, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return JSON.parse(dec);
  } catch {
    return null;
  }
}
