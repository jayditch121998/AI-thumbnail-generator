import { NextResponse } from 'next/server';

export async function GET() {
  // Don't do this in production - this is just for testing!
  return NextResponse.json({ 
    token: process.env.REPLICATE_API_TOKEN ? 'Token exists' : 'Token missing',
    tokenFirstChars: process.env.REPLICATE_API_TOKEN?.substring(0, 4) || 'none'
  });
} 