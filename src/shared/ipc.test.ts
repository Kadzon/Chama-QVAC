import { describe, expect, it } from 'vitest'
import { PingResponseSchema } from './ipc'

describe('PingResponseSchema', () => {
  it('accepts a valid ping response', () => {
    const result = PingResponseSchema.safeParse({ message: 'pong', timestamp: Date.now() })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed ping response', () => {
    const result = PingResponseSchema.safeParse({ message: 'pong', timestamp: 'not-a-number' })
    expect(result.success).toBe(false)
  })
})
