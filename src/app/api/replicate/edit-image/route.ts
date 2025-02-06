import Replicate from "replicate";
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import fetch from 'node-fetch';

export async function POST(req: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Replicate API token not configured" }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    const { imageUrl, prompt, selection } = await req.json();
    console.log('Received request:', { prompt, selection });

    // Get original image dimensions and data
    let originalBuffer;
    try {
      if (imageUrl.startsWith('data:image/')) {
        // Handle base64 image
        const originalBase64Data = imageUrl.split(',')[1];
        originalBuffer = Buffer.from(originalBase64Data, 'base64');
      } else {
        // Handle URL image
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image');
        const arrayBuffer = await response.arrayBuffer();
        originalBuffer = Buffer.from(arrayBuffer);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process input image');
    }

    // Get image metadata and resize if needed
    const originalMetadata = await sharp(originalBuffer).metadata();
    const originalWidth = originalMetadata.width;
    const originalHeight = originalMetadata.height;

    // Resize if dimensions are too large
    let processedBuffer = originalBuffer;
    if (originalWidth! > 1024 || originalHeight! > 1024) {
      processedBuffer = await sharp(originalBuffer)
        .resize(1024, 1024, { fit: 'inside' })
        .toBuffer();
    }

    // Convert to base64
    const base64 = processedBuffer.toString('base64');
    const processedImageUrl = `data:image/png;base64,${base64}`;

    // Create mask with processed dimensions
    const processedMetadata = await sharp(processedBuffer).metadata();
    const maskCanvas = createCanvas(processedMetadata.width!, processedMetadata.height!);
    const maskCtx = maskCanvas.getContext('2d');

    // Scale selection to match processed dimensions
    const scaleX = processedMetadata.width! / originalWidth!;
    const scaleY = processedMetadata.height! / originalHeight!;
    const scaledSelection = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      width: Math.round(selection.width * scaleX),
      height: Math.round(selection.height * scaleY)
    };

    // Create black background (means "keep this area")
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Fill selection area with white (means "edit this area")
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(
      scaledSelection.x,
      scaledSelection.y,
      scaledSelection.width,
      scaledSelection.height
    );

    // Convert mask to base64
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    console.log('Processing with dimensions:', {
      originalWidth,
      originalHeight,
      processedWidth: processedMetadata.width,
      processedHeight: processedMetadata.height,
      selection: scaledSelection
    });

    try {
      const output = await replicate.run(
        "stability-ai/stable-diffusion-inpainting:c28b92a7ecd66eee4aefcd8a94eb9e7f6c3805d5f06038165407fb5cb355ba67",
        {
          input: {
            prompt: prompt,
            image: processedImageUrl,
            mask: maskDataUrl,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 50,
            negative_prompt: "nsfw, nude, naked, sex, porn, explicit, offensive",
            safety_checker: true
          }
        }
      );

      console.log('Replicate response:', output);

      // Get the output URL
      const outputUrl = Array.isArray(output) ? output[0] : output;
      if (!outputUrl) throw new Error('No output received from model');

      // Fetch and resize the output image to match original dimensions
      const outputResponse = await fetch(outputUrl);
      if (!outputResponse.ok) throw new Error('Failed to fetch output image');
      
      const outputBuffer = Buffer.from(await outputResponse.arrayBuffer());
      const resizedOutputBuffer = await sharp(outputBuffer)
        .resize(originalWidth, originalHeight, {
          fit: 'fill'
        })
        .toBuffer();

      // Convert back to base64
      const resizedOutputBase64 = resizedOutputBuffer.toString('base64');
      const finalImageUrl = `data:image/png;base64,${resizedOutputBase64}`;

      return Response.json({ imageUrl: finalImageUrl });
    } catch (error) {
      if (error.message?.includes('NSFW')) {
        return new Response(
          JSON.stringify({ 
            error: "NSFW content detected",
            details: "Please try a different prompt or image region"
          }), 
          { status: 422, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error("Replicate API error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error editing image",
        details: error instanceof Error ? error.message : String(error)
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 