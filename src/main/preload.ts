import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ChamaApi } from '../shared/ipc'

const api: ChamaApi = {
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.ping),
}

contextBridge.exposeInMainWorld('chama', api)
