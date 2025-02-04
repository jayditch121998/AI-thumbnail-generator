import Replicate from "replicate";
import { createCanvas, loadImage } from 'canvas';

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

    // Create a canvas for the mask
    const maskCanvas = createCanvas(1280, 720); // Using standard YouTube thumbnail dimensions
    const maskCtx = maskCanvas.getContext('2d');

    // Create black background (means "keep this area")
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Fill selection area with white (means "edit this area")
    maskCtx.fillStyle = 'white';
    maskCtx.fillRect(
      selection.x,
      selection.y,
      selection.width,
      selection.height
    );

    // Convert mask to base64
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    // Using the RunwayML inpainting model
    const output = await replicate.run(
      "runwayml/stable-diffusion-inpainting:c28b92a7ecd66eee4aefcd8a94eb9e7f6c3805d5f06038165407fb5cb355ba67",
      {
        input: {
          prompt: prompt,
          image: imageUrl,
          mask: maskDataUrl,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
        }
      }
    );
    
    return Response.json(output);
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