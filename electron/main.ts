import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Paths
process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const PROTOCOL = 'travel-planner'

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true
    },
  })

  win.on('ready-to-show', () => {
    win?.show()
  })

  // Manage external links
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  // Windows & Linux
  app.on('second-instance', (_event, commandLine) => {
    console.log('⚡ EVENTO SECOND-INSTANCE SCATTATO!')

    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()

      const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`))

      if (url) {
        console.log('🔗 URL TROVATO:', url)
        win.webContents.send('deep-link', url)
      }
    }
  })

  // MacOS
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (win) {
      win.webContents.send('deep-link', url)
    }
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.travelplanner.app')

    createWindow()

    ipcMain.handle('open-external-url', async (_, url) => {
      await shell.openExternal(url)
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})