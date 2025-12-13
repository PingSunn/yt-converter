import { NextRequest, NextResponse } from 'next/server'
import { conversionStore } from '@/lib/conversions'
import path from 'path'
import fs from 'fs'

const downloadsDir = path.join(process.cwd(), 'downloads')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conversion = conversionStore.get(id)

  if (!conversion || conversion.status !== 'completed' || !conversion.filename) {
    return NextResponse.json({ error: 'File not found or conversion not complete' }, { status: 404 })
  }

  const filePath = path.join(downloadsDir, conversion.filename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  const fileName = conversion.filename

  // Clean up file after a delay
  setTimeout(() => {
    try {
      fs.unlinkSync(filePath)
      conversionStore.delete(id)
    } catch (e) {
      console.error('Cleanup error:', e)
    }
  }, 60000) // Delete after 1 minute

  // Determine content type with strict MIME type checking
  const ext = path.extname(fileName).toLowerCase()
  let contentType: string
  
  if (ext === '.mp3') {
    contentType = 'audio/mpeg'
  } else if (ext === '.wav') {
    contentType = 'audio/wav'
  } else {
    // Fallback to octet-stream for unknown types
    contentType = 'application/octet-stream'
  }

  // Return response with proper MIME type headers
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
    },
  })
}
