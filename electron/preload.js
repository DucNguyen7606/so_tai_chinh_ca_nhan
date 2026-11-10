// Cầu nối cho giao diện: cùng tên hàm với bản pywebview cũ nên so-tai-chinh.html không cần đổi.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("pywebview", {
  api: {
    path: () => ipcRenderer.invoke("stc:path"),
    load: () => ipcRenderer.invoke("stc:load"),
    save: text => ipcRenderer.invoke("stc:save", text),
    export_backup: text => ipcRenderer.invoke("stc:export", text),
    open_folder: () => ipcRenderer.invoke("stc:folder"),
  },
});
