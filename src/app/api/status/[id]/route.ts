import { NextRequest, NextResponse } from 'next/server'
import { conversionStore } from '@/lib/conversions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const conversion = conversionStore.get(id)

  if (!conversion) {
    return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })
  }

  return NextResponse.json(conversion)
}
