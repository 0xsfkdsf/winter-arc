// Preload: minimal safe bridge, no nodeIntegration in renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wa', {
  isElectron: true,
  dbLoad: () => ipcRenderer.invoke('wa:db-load'),
  dbSave: (base64) => ipcRenderer.invoke('wa:db-save', base64),
  dbPath: () => ipcRenderer.invoke('wa:db-path'),
  dbDelete: () => ipcRenderer.invoke('wa:db-delete'),
  exportFile: (name, content) => ipcRenderer.invoke('wa:export-file', { name, content }),
  wasm: () => ipcRenderer.invoke('wa:wasm'),
});
