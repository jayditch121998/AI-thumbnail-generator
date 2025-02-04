import { NextResponse } from 'next/server';

export async function GET() {
  const apiToken = process.env.REPLICATE_API_TOKEN;

  if (!apiToken) {
    return NextResponse.json({ error: 'No API token found' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: "7b1af9516d857b5b5444b8c751e88c941c0d535f31831e3041b7ed13b59fbbed",
        input: {
          prompt: "test prompt",
          num_inference_steps: 1  // Minimum steps for a quick test
        }
      })
    });

    const data = await response.json();

    return NextResponse.json({
      status: response.status,
      ok: response.ok,
      data: data
    });

  } catch (error) {
    return NextResponse.json({
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 