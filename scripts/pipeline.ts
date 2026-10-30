// Phase 1 spike (docs/SPEC.md): transcribe + diarize, then extract minutes as
// JSON validated against MeetingExtractionSchema. Prints the result and timing.
//
// Usage: npm run spike:pipeline -- <path-to-audio-file> [hotword ...]

import { access, constants } from 'node:fs/promises'
import { z } from 'zod'
import {
  loadModel,
  unloadModel,
  transcribe,
  completion,
  close,
  MOSS_TRANSCRIBE_DIARIZE_Q8_0,
  QWEN3_4B_INST_Q4_K_M,
} from '@qvac/sdk'
import { MeetingExtractionSchema, type TranscriptSegment } from '../src/shared/schemas'
import { buildExtractionMessages, parseExtractionOutput, ExtractionValidationError } from '../src/main/ai/extraction-prompt'

const EXTRACTION_JSON_SCHEMA = z.toJSONSchema(MeetingExtractionSchema) as Record<string, unknown>
const MAX_EXTRACTION_ATTEMPTS = 3 // 1 initial + up to 2 retries, per SPEC.md

function logProgress(label: string) {
  return (progress: { percentage: number; downloaded: number; total: number }) => {
    const mb = (bytes: number) => (bytes / 1e6).toFixed(1)
    const line = `▸ ${label}: ${progress.percentage.toFixed(0)}% (${mb(progress.downloaded)}/${mb(progress.total)} MB)`
    process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
    if (process.stderr.isTTY && progress.percentage >= 100) process.stderr.write('\n')
  }
}

async function transcribeAndDiarize(audioPath: string, hotwords: string[]): Promise<TranscriptSegment[]> {
  const modelId = await loadModel({
    modelType: 'moss-transcribe',
    modelSrc: MOSS_TRANSCRIBE_DIARIZE_Q8_0,
    modelConfig: { maxThreads: 4, useGPU: false },
    onProgress: logProgress('Downloading transcribe+diarize model'),
  })

  try {
    const segments = await transcribe({
      modelId,
      audioChunk: audioPath,
      metadata: true,
      hotwords,
      maxNewTokens: 0,
    })

    return segments.map((s) => ({
      speaker: s.speaker ?? (s.speakerId !== undefined ? `Speaker ${s.speakerId}` : 'Unknown speaker'),
      startMs: s.startMs,
      endMs: s.endMs,
      text: s.text.trim(),
    }))
  } finally {
    await unloadModel({ modelId })
  }
}

async function extractMeeting(segments: TranscriptSegment[]) {
  const modelId = await loadModel({
    modelSrc: QWEN3_4B_INST_Q4_K_M,
    modelConfig: { ctx_size: 8192 },
    onProgress: logProgress('Downloading extraction model'),
  })

  try {
    const messages = buildExtractionMessages(segments)
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt++) {
      const run = completion({
        modelId,
        history: messages,
        stream: false,
        responseFormat: {
          type: 'json_schema',
          json_schema: { name: 'MeetingExtraction', schema: EXTRACTION_JSON_SCHEMA },
        },
      })
      const result = await run.final

      try {
        return parseExtractionOutput(result.contentText)
      } catch (err) {
        lastError = err
        const issue = err instanceof ExtractionValidationError ? err.issues : String(err)
        console.error(`▸ Extraction attempt ${attempt}/${MAX_EXTRACTION_ATTEMPTS} failed validation: ${issue}`)
        messages.push({ role: 'assistant', content: result.contentText })
        messages.push({
          role: 'user',
          content: `That output failed schema validation: ${issue}. Return only the corrected JSON, nothing else.`,
        })
      }
    }

    throw lastError
  } finally {
    await unloadModel({ modelId })
  }
}

async function main() {
  const [audioPath, ...hotwords] = process.argv.slice(2)
  if (!audioPath || audioPath === '--help') {
    console.error('Usage: npm run spike:pipeline -- <path-to-audio-file> [hotword ...]')
    process.exit(audioPath === '--help' ? 0 : 1)
  }
  await access(audioPath, constants.R_OK)

  const t0 = Date.now()
  console.error(`▸ Transcribing + diarizing ${audioPath}...`)
  const segments = await transcribeAndDiarize(audioPath, hotwords)
  const t1 = Date.now()

  console.error(`▸ Got ${segments.length} segment(s). Extracting minutes...`)
  for (const s of segments) {
    console.error(`  [${(s.startMs / 1000).toFixed(2)}s → ${(s.endMs / 1000).toFixed(2)}s] ${s.speaker}: ${s.text}`)
  }

  const extraction = await extractMeeting(segments)
  const t2 = Date.now()

  console.log(JSON.stringify(extraction, null, 2))
  console.error(`▸ Timing — transcribe+diarize: ${((t1 - t0) / 1000).toFixed(1)}s, extract: ${((t2 - t1) / 1000).toFixed(1)}s, total: ${((t2 - t0) / 1000).toFixed(1)}s`)
}

main()
  .catch((error: unknown) => {
    console.error('✖ Pipeline failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await close()
    } catch (error) {
      console.error('✖ Could not close the SDK:', error)
      process.exitCode = 1
    }
  })
