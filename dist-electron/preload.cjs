"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    send: (channel, data) => {
      electron.ipcRenderer.send(channel, data);
    },
    invoke: (channel, data) => {
      return electron.ipcRenderer.invoke(channel, data);
    },
    on: (channel, func) => {
      const subscription = (_event, ...args) => func(_event, ...args);
      electron.ipcRenderer.on(channel, subscription);
      return () => electron.ipcRenderer.removeListener(channel, subscription);
    }
  }
});
