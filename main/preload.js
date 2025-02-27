const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  async appQuit() {
    return ipcRenderer.invoke('app-quit');
  },
  async openWalletFileDialog() {
    return ipcRenderer.invoke('open-wallet-file-dialog');
  },
  async checkWalletFileEncryption(filePath) {
    return ipcRenderer.invoke('check-wallet-file-encryption', filePath);
  },
  async decryptWalletFile(filePath, userPassword) {
    return ipcRenderer.invoke('decrypt-wallet-file', filePath, userPassword);
  },
  async decryptWalletRaw(encryptedJsonString, userPassword) {
    return ipcRenderer.invoke('decrypt-wallet-raw', encryptedJsonString, userPassword);
  },
  async saveWalletFile(walletObject, password, filePath) {
    return ipcRenderer.invoke('save-wallet-file', walletObject, password, filePath);
  },
  async toggleFullscreen() {
    return ipcRenderer.invoke('toggle-fullscreen');
  },
  async openUrl(urlToOpen) {
    return ipcRenderer.invoke('open-url', urlToOpen);
  },
  async openFileByPath(filePath) {
    return ipcRenderer.invoke('openFileByPath', filePath);
  },
  async notifyIncomingTransaction(data) {
    return ipcRenderer.invoke('notify-incoming-transaction', data);
  },
  async notifyOutgoingTransaction(data) {
    return ipcRenderer.invoke('notify-outgoing-transaction', data);
  }
});
