import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import { conversionStore } from '@/lib/conversions'

// Create downloads directory
const downloadsDir = path.join(process.cwd(), 'downloads')
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true })
}

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
  ]
  return patterns.some(pattern => pattern.test(url))
}

export async function POST(request: NextRequest) {
  try {
    const { url, format } = await request.json()

    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    if (!['mp3', 'wav'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use mp3 or wav.' }, { status: 400 })
    }

    const conversionId = uuidv4()
    const outputTemplate = path.join(downloadsDir, `${conversionId}.%(ext)s`)

    conversionStore.set(conversionId, { status: 'processing', progress: 0 })

    // Start conversion in background
    const args = [
      '-x',
      '--audio-format', format,
      '--audio-quality', '0',
      '-o', outputTemplate,
      '--no-playlist',
      '--progress',
      '--newline',
      url
    ]

    const ytdlp = spawn('yt-dlp', args)

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString()
      const progressMatch = output.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        conversionStore.set(conversionId, {
          status: 'processing',
          progress: parseFloat(progressMatch[1])
        })
      }
    })

    ytdlp.stderr.on('data', (data) => {
      const output = data.toString()
      const progressMatch = output.match(/(\d+\.?\d*)%/)
      if (progressMatch) {
        conversionStore.set(conversionId, {
          status: 'processing',
          progress: parseFloat(progressMatch[1])
        })
      }
    })

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        conversionStore.set(conversionId, { status: 'error', progress: 0, error: 'Conversion failed' })
        return
      }

      // Find the actual output file
      const files = fs.readdirSync(downloadsDir)
      const outputFile = files.find(f => f.startsWith(conversionId))

      if (outputFile) {
        conversionStore.set(conversionId, {
          status: 'completed',
          progress: 100,
          filename: outputFile
        })
      } else {
        conversionStore.set(conversionId, { status: 'error', progress: 0, error: 'Output file not found' })
      }
    })

    ytdlp.on('error', () => {
      conversionStore.set(conversionId, { 
        status: 'error', 
        progress: 0, 
        error: 'yt-dlp not found. Please install yt-dlp first.' 
      })
    })

    return NextResponse.json({ conversionId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
