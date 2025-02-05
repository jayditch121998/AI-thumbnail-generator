import fetch from 'node-fetch';

export async function POST(req: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Replicate API token not configured" }), 
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { imageUrl, prompt } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Make direct API call to create the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "2b017d9b67edd2ee1401238df49d75da53c523f36e363881e057f5dc3ed3c5b2",
        input: {
          prompt: prompt || "enhance this image, make it high quality",
          image: imageUrl,
          negative_prompt: "blurry, low quality, watermark, text, bad anatomy, distorted",
          scheduler: "K_EULER_ANCESTRAL",
          num_inference_steps: 30,
          guidance_scale: 7.5,
          strength: 0.7, // Lower strength to preserve more of original image
          seed: Math.floor(Math.random() * 1000000)
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error Response:', error);
      throw new Error(error.detail || 'Failed to create prediction');
    }

    const prediction = await response.json();
    console.log('Prediction:', prediction);

    // Poll for the result
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        }
      });
      result = await pollResponse.json();
      console.log('Poll result:', result);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Prediction failed');
    }

    return Response.json(result.output);
  } catch (error) {
    console.error("Replicate API error:", error);
    return new Response(
      JSON.stringify({ error: "Error enhancing image" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 