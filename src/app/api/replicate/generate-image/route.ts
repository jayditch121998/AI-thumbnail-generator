import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      "The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it."
    );
  }

  try {
    const body = await request.json();
    const { prompt, image, mask } = body;

    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt is required");
    }

    let output;

    // If image and mask are provided, use inpainting
    if (image && mask) {
      output = await replicate.run(
        "stability-ai/stable-diffusion-inpainting:c28b92a7ecd66eee4aefcd8a94eb9e7f6c3805d5f06038165407fb5cb355ba67",
        {
          input: {
            prompt,
            image,
            mask,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            scheduler: "K_EULER_ANCESTRAL"
          }
        }
      );
    } else {
      // Use SDXL for initial image generation
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt,
            negative_prompt: "low quality, blurry, distorted",
            width: 1024,
            height: 1024,
            num_inference_steps: 30,
            guidance_scale: 7.5,
          }
        }
      );
    }

    if (!output || (Array.isArray(output) && output.length === 0)) {
      throw new Error("No output received from Replicate API");
    }

    const resultImageUrl = Array.isArray(output) ? output[0] : output;
    return NextResponse.json({ imageUrl: resultImageUrl });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to generate or edit image", details: (error as Error).message },
      { status: 500 }
    );
  }
}
