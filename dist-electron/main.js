import { app as o, ipcMain as R, shell as c, BrowserWindow as p } from "electron";
import { fileURLToPath as T } from "node:url";
import n from "node:path";
const d = n.dirname(T(import.meta.url));
process.env.APP_ROOT = n.join(d, "..");
const l = process.env.VITE_DEV_SERVER_URL, _ = n.join(process.env.APP_ROOT, "dist-electron"), f = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? n.join(process.env.APP_ROOT, "public") : f;
const i = "travel-planner";
process.defaultApp ? process.argv.length >= 2 && o.setAsDefaultProtocolClient(i, process.execPath, [n.resolve(process.argv[1])]) : o.setAsDefaultProtocolClient(i);
let e;
function a() {
  e = new p({
    width: 1200,
    height: 800,
    show: !1,
    autoHideMenuBar: !0,
    webPreferences: {
      preload: n.join(d, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0
    }
  }), e.on("ready-to-show", () => {
    e == null || e.show();
  }), e.webContents.setWindowOpenHandler((t) => (c.openExternal(t.url), { action: "deny" })), l ? e.loadURL(l) : e.loadFile(n.join(f, "index.html"));
}
const h = o.requestSingleInstanceLock();
h ? (o.on("second-instance", (t, s) => {
  if (console.log("⚡ EVENTO SECOND-INSTANCE SCATTATO!"), e) {
    e.isMinimized() && e.restore(), e.focus();
    const r = s.find((u) => u.startsWith(`${i}://`));
    r && (console.log("🔗 URL TROVATO:", r), e.webContents.send("deep-link", r));
  }
}), o.on("open-url", (t, s) => {
  t.preventDefault(), e && e.webContents.send("deep-link", s);
}), o.whenReady().then(() => {
  o.setAppUserModelId("com.travelplanner.app"), a(), R.handle("open-external-url", async (t, s) => {
    await c.openExternal(s);
  });
}), o.on("activate", () => {
  p.getAllWindows().length === 0 && a();
})) : o.quit();
o.on("window-all-closed", () => {
  process.platform !== "darwin" && (o.quit(), e = null);
});
export {
  _ as MAIN_DIST,
  f as RENDERER_DIST,
  l as VITE_DEV_SERVER_URL
};
