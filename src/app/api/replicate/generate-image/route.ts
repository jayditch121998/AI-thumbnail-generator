import Replicate from "replicate";

export async function POST(req: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Replicate API token not configured" }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
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
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: body.prompt,
          width: 1280,
          height: 720,
        }
      }
    );
    
    return Response.json(output);
  } catch (error) {
    console.error("Replicate API error:", error);
    return new Response(
      JSON.stringify({ error: "Error generating image" }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
