// Sổ Thu Chi & Đầu Tư - vỏ Electron. Dữ liệu nằm trong thư mục ghi ở data-dir.txt (cạnh file .exe).
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const EXE_DIR = path.dirname(process.execPath);
function resolveDataDir() {
  try {
    const d = fs.readFileSync(path.join(EXE_DIR, "data-dir.txt"), "utf8").trim();
    if (d && fs.existsSync(d)) return d;
  } catch (e) {}
  const parent = path.dirname(EXE_DIR); // app nằm trong thư mục con "app" của SoTaiChinh
  if (fs.existsSync(path.join(parent, "so-tai-chinh-data.json"))) return parent;
  return app.isPackaged ? EXE_DIR : __dirname;
}
const DATA_DIR = resolveDataDir();
const DATA = path.join(DATA_DIR, "so-tai-chinh-data.json");
const BACKUP_DIR = path.join(DATA_DIR, "sao-luu");
const KEEP_BACKUPS = 30;
const ymd = (sep = "-") => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join(sep); };

let win = null;
app.setAppUserModelId("com.ducnguyen.sothuchi");
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

ipcMain.handle("stc:path", () => DATA);
ipcMain.handle("stc:load", () => (fs.existsSync(DATA) ? fs.readFileSync(DATA, "utf8") : null));
ipcMain.handle("stc:save", (_e, text) => {
  JSON.parse(text); // không ghi nếu dữ liệu hỏng
  const tmp = DATA + ".tmp";
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, DATA);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.copyFileSync(DATA, path.join(BACKUP_DIR, `so-tai-chinh-${ymd()}.json`)); // giữ trạng thái mới nhất của mỗi ngày
  const old = fs.readdirSync(BACKUP_DIR).filter(f => /^so-tai-chinh-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of old.slice(0, -KEEP_BACKUPS)) fs.unlinkSync(path.join(BACKUP_DIR, f));
  return true;
});
ipcMain.handle("stc:export", async (_e, text) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: path.join(DATA_DIR, `so-tai-chinh-sao-luu-${ymd("")}.json`),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, text, "utf8");
  return true;
});
ipcMain.handle("stc:folder", () => { shell.openPath(DATA_DIR); return true; });

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    title: "Sổ Thu Chi & Đầu Tư",
    icon: path.join(__dirname, "meo-icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#fff8f1",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setUserAgent(win.webContents.getUserAgent() + " SoTaiChinhApp");
  // Link ngoài (giá vàng, cổ phiếu...) mở bằng trình duyệt mặc định, không mở trong app
  const openOutside = url => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); openOutside(url); } });
  win.loadFile(path.join(__dirname, "so-tai-chinh.html"));
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
