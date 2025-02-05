import Replicate from "replicate";

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
    const body = await req.json();
    
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: body.prompt,
          width: 1280,
          height: 720,
          prompt_upsampling: true,
          negative_prompt: "blurry, low quality, watermark, text, bad anatomy, distorted"
        }
      }
    );

    return Response.json(output);
  } catch (error) {
    console.error("Replicate API error:", error);
    return new Response(
      JSON.stringify({ error: "Error generating image" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
