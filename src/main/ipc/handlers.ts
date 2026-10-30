import { ipcMain } from 'electron'
import { IPC_CHANNELS, PingResponseSchema, type PingResponse } from '../../shared/ipc'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ping, (): PingResponse => {
    return PingResponseSchema.parse({
      message: 'pong from main process',
      timestamp: Date.now(),
    })
  })
}
