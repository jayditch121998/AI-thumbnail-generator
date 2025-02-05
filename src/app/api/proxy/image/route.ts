import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    
    // Fetch the image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(arrayBuffer))
      .png()
      .toBuffer();
    
    // Convert to base64
    const base64Image = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    return Response.json({ dataUrl });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy image' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 