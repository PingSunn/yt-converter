import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

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
    const { url } = await request.json()

    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    return new Promise<NextResponse>((resolve) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        url
      ])

      let output = ''
      let errorOutput = ''

      ytdlp.stdout.on('data', (data) => {
        output += data.toString()
      })

      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          console.error('yt-dlp error:', errorOutput)
          resolve(NextResponse.json(
            { error: 'Failed to fetch video info. Make sure yt-dlp is installed.' },
            { status: 500 }
          ))
          return
        }

        try {
          const info = JSON.parse(output)
          resolve(NextResponse.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration,
            channel: info.channel,
            views: info.view_count
          }))
        } catch {
          resolve(NextResponse.json(
            { error: 'Failed to parse video info' },
            { status: 500 }
          ))
        }
      })

      ytdlp.on('error', () => {
        resolve(NextResponse.json(
          { error: 'yt-dlp not found. Please install yt-dlp first.' },
          { status: 500 }
        ))
      })
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

