import { NextResponse } from 'next/server';

export async function GET() {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  
  try {
    const response = await fetch('https://api.replicate.com/v1/models', {
      headers: {
        'Authorization': `Token ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    const ok = response.ok;

    return NextResponse.json({
      tokenExists: !!apiToken,
      tokenPrefix: apiToken?.substring(0, 4),
      apiStatus: status,
      apiOk: ok
    });
  } catch (error) {
    return NextResponse.json({
      error: 'API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 