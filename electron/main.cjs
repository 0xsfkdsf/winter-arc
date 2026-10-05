// Electron main process (CommonJS to keep builder + dev simple).
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let win = null;

function dbPath() {
  return path.join(app.getPath('userData'), 'winter-arc.sqlite');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#070B14',
    title: 'Winter Arc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  win.webContents.on('render-process-gone', () => { /* crash: window will close */ });
  win.on('closed', () => { win = null; });
}

const gotLock = app.requestSingleInstanceLock();
// One window owns the database. A second launch focuses the running app
// instead of opening a rival writer (last-writer-wins would eat data).
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---- SQLite persistence bridge (renderer owns sql.js, main owns the file) ----
ipcMain.handle('wa:db-load', async () => {
  try {
    const p = dbPath();
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    return buf.toString('base64');
  } catch (e) { return { error: String(e) }; }
});

ipcMain.handle('wa:db-save', async (_e, base64) => {
  try {
    const p = dbPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    // atomic-ish: write tmp then rename
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(base64, 'base64'));
    fs.renameSync(tmp, p);
    return { ok: true, path: p };
  } catch (e) { return { error: String(e) }; }
});

ipcMain.handle('wa:db-path', async () => dbPath());

// True wipe for Settings → Reset (renderer cannot delete files itself).
ipcMain.handle('wa:db-delete', async () => {
  try {
    const p = dbPath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return { ok: true };
  } catch (e) { return { error: String(e) }; }
});

// Serve the sql.js WASM bytes over IPC so the packaged file:// build never
// depends on fetch() of a file:// URL (blocked by Chromium).
ipcMain.handle('wa:wasm', async () => {
  try {
    const candidates = [];
    if (isDev) {
      candidates.push(path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
      candidates.push(path.join(__dirname, '..', 'dist', 'assets'));
    } else {
      candidates.push(path.join(__dirname, '..', 'dist', 'assets'));
      candidates.push(path.join(process.resourcesPath, 'app.asar', 'dist', 'assets'));
    }
    for (const c of candidates) {
      if (c.endsWith('.wasm') && fs.existsSync(c)) return fs.readFileSync(c).toString('base64');
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
        const hit = fs.readdirSync(c).find((f) => f.startsWith('sql-wasm') && f.endsWith('.wasm'));
        if (hit) return fs.readFileSync(path.join(c, hit)).toString('base64');
      }
    }
    return null;
  } catch (e) { return { error: String(e) }; }
});

ipcMain.handle('wa:export-file', async (_e, { name, content }) => {
  const r = await dialog.showSaveDialog({ defaultPath: name });
  if (r.canceled || !r.filePath) return { canceled: true };
  fs.writeFileSync(r.filePath, content, 'utf8');
  return { ok: true, path: r.filePath };
});
