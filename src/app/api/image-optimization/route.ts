import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    const width = parseInt(searchParams.get('w') || '800');
    const quality = parseInt(searchParams.get('q') || '75');

    if (!imageUrl) {
      return new NextResponse('Missing image URL', { status: 400 });
    }

    // Fetch the original image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Optimize with Sharp
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality })
      .toBuffer();

    return new NextResponse(optimizedBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': optimizedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Image optimization error:', error);
    return new NextResponse('Image optimization failed', { status: 500 });
  }
}
