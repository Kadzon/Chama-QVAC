import { z } from 'zod'

export const IPC_CHANNELS = {
  ping: 'app:ping',
} as const

export const PingResponseSchema = z.object({
  message: z.string(),
  timestamp: z.number(),
})
export type PingResponse = z.infer<typeof PingResponseSchema>

// The renderer never talks to Node/Electron APIs directly — only through this
// surface, exposed by src/main/preload.ts via contextBridge. Add one typed
// method here per IPC channel as phases are built out.
export interface ChamaApi {
  ping: () => Promise<PingResponse>
}
