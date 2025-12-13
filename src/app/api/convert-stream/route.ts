import { NextRequest } from 'next/server'
import { spawn } from 'child_process'

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
  ]
  return patterns.some(pattern => pattern.test(url))
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-_().]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200)
}

async function getVideoTitle(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--get-title',
      '--no-warnings',
      '--no-playlist',
      url
    ])

    let title = ''
    let errorOutput = ''

    ytdlp.stdout.on('data', (data) => {
      title += data.toString()
    })

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ytdlp.on('close', (code) => {
      if (code === 0 && title.trim()) {
        resolve(title.trim())
      } else {
        reject(new Error(errorOutput || 'Failed to get video title'))
      }
    })

    ytdlp.on('error', (err) => {
      reject(err)
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const { url, format } = await request.json()

    // Validate inputs
    if (!url || !isValidYouTubeUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube URL' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!['mp3', 'wav'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Use mp3 or wav.' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get video title for filename
    let videoTitle: string
    try {
      videoTitle = await getVideoTitle(url)
    } catch (error) {
      console.error('Error getting video title:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch video. Please check the URL and try again.' 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    const sanitizedTitle = sanitizeFilename(videoTitle)
    const filename = `${sanitizedTitle}.${format}`

    // Set proper MIME type based on format
    const contentType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav'

    // Set up streaming response headers with strict MIME type
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
      'Transfer-Encoding': 'chunked',
    })

    // Create a ReadableStream for the response
    const stream = new ReadableStream({
      start(controller) {
        // Spawn yt-dlp to download audio
        const ytdlp = spawn('yt-dlp', [
          '--format', 'bestaudio',
          '--no-warnings',
          '--no-playlist',
          '--output', '-',
          url
        ])

        // Spawn ffmpeg to convert audio
        const ffmpegArgs = [
          '-i', 'pipe:0', // Read from stdin
          '-vn', // No video
          '-acodec', format === 'mp3' ? 'libmp3lame' : 'pcm_s16le',
        ]

        if (format === 'mp3') {
          ffmpegArgs.push('-q:a', '2') // High quality MP3
          ffmpegArgs.push('-id3v2_version', '3') // ID3v2.3 tags
        } else {
          ffmpegArgs.push('-ar', '44100') // Sample rate for WAV
          ffmpegArgs.push('-ac', '2') // Stereo
        }

        ffmpegArgs.push('-f', format, 'pipe:1') // Output to stdout

        const ffmpeg = spawn('ffmpeg', ffmpegArgs)

        // Pipe yt-dlp output to ffmpeg input
        ytdlp.stdout.pipe(ffmpeg.stdin)

        // Stream ffmpeg output to client
        ffmpeg.stdout.on('data', (chunk) => {
          controller.enqueue(chunk)
        })

        // Error handling
        let ytdlpError = ''
        let ffmpegError = ''

        ytdlp.stderr.on('data', (data) => {
          ytdlpError += data.toString()
        })

        ffmpeg.stderr.on('data', (data) => {
          ffmpegError += data.toString()
          // FFmpeg logs to stderr even for normal operation
        })

        ytdlp.on('error', (err) => {
          console.error('yt-dlp spawn error:', err)
          controller.error(new Error('Failed to start download process'))
        })

        ffmpeg.on('error', (err) => {
          console.error('ffmpeg spawn error:', err)
          controller.error(new Error('Failed to start conversion process'))
        })

        ytdlp.on('close', (code) => {
          if (code !== 0) {
            console.error('yt-dlp error:', ytdlpError)
            ffmpeg.stdin.end()
            controller.error(new Error('Download failed'))
          }
        })

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            controller.close()
          } else {
            console.error('ffmpeg error:', ffmpegError)
            controller.error(new Error('Conversion failed'))
          }
        })

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          ytdlp.kill()
          ffmpeg.kill()
          controller.close()
        })
      },
    })

    return new Response(stream, { headers })

  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

