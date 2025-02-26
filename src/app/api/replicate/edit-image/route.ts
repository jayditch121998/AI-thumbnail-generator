import Replicate from "replicate";
import sharp from 'sharp';
import fetch from 'node-fetch';
import logger from '../../../lib/logger';

export async function POST(req: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    logger.error('Replicate API token not configured');
    return new Response(
      JSON.stringify({ error: "Replicate API token not configured" }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    const { imageUrl, prompt, maskDataUrl } = await req.json();
    logger.info('Processing image edit request', { prompt });

    // Get original image data
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
    } catch (error: any) {
      logger.error('Error processing input image', { error: error.message });
      throw new Error('Failed to process input image');
    }

    // Get image metadata and resize if needed
    const originalMetadata = await sharp(originalBuffer).metadata();
    const originalWidth = originalMetadata.width;
    const originalHeight = originalMetadata.height;

    let processedBuffer = originalBuffer;
    let width = originalWidth!;
    let height = originalHeight!;

    // Only resize if image is smaller than 256x256
    if (width < 256 || height < 256) {
      const aspectRatio = width / height;
      if (width < height) {
        width = 256;
        height = Math.round(width / aspectRatio);
        if (height < 256) {
          height = 256;
          width = Math.round(height * aspectRatio);
        }
      } else {
        height = 256;
        width = Math.round(height * aspectRatio);
        if (width < 256) {
          width = 256;
          height = Math.round(width / aspectRatio);
        }
      }

      logger.info('Resizing image to meet minimum dimensions', { 
        originalWidth, 
        originalHeight,
        newWidth: width,
        newHeight: height
      });
      processedBuffer = await sharp(originalBuffer)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
    }

    // Process mask data URL and ensure it matches the image dimensions
    let maskBuffer;
    try {
      const maskBase64Data = maskDataUrl.split(',')[1];
      const rawMaskBuffer = Buffer.from(maskBase64Data, 'base64');
      
      // Only resize mask if we had to resize the image
      if (width !== originalWidth || height !== originalHeight) {
        maskBuffer = await sharp(rawMaskBuffer)
          .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .toBuffer();
      } else {
        maskBuffer = rawMaskBuffer;
      }
    } catch (error: any) {
      logger.error('Error processing mask', { error: error.message });
      throw new Error('Failed to process mask');
    }

    // Convert processed image and mask to base64
    const processedBase64 = processedBuffer.toString('base64');
    const processedImageUrl = `data:image/png;base64,${processedBase64}`;
    const processedMaskBase64 = maskBuffer.toString('base64');
    const processedMaskUrl = `data:image/png;base64,${processedMaskBase64}`;

    try {
      logger.info('Starting Replicate API call', { prompt });
      const output = await replicate.run(
        "ideogram-ai/ideogram-v2-turbo",
        {
          input: {
            prompt: prompt,
            image: processedImageUrl,
            mask: processedMaskUrl,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 50,
            safety_checker: true
          }
        }
      );

      logger.info('Replicate API call successful', { output });

      // Get the output URL
      const outputUrl = Array.isArray(output) ? output[0] : output;
      if (!outputUrl) {
        logger.error('No output received from model');
        throw new Error('No output received from model');
      }

      // Fetch the output image but don't resize it
      const outputResponse = await fetch(outputUrl);
      if (!outputResponse.ok) {
        logger.error('Failed to fetch output image', { status: outputResponse.status });
        throw new Error('Failed to fetch output image');
      }
      
      const outputBuffer = Buffer.from(await outputResponse.arrayBuffer());
      
      // Convert directly to base64 without resizing
      const outputBase64 = outputBuffer.toString('base64');
      const finalImageUrl = `data:image/png;base64,${outputBase64}`;

      logger.info('Image edit completed successfully');
      return Response.json({ imageUrl: finalImageUrl });
    } catch (error) {
      if (error instanceof Error && error.message.includes('NSFW')) {
        logger.warn('NSFW content detected', { prompt });
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

  } catch (error: any) {
    logger.error('Image editing failed', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: "Error editing image",
        details: error instanceof Error ? error.message : String(error)
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 