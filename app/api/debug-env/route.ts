import { NextResponse } from 'next/server';

export async function GET() {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const groqLength = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0;
  const groqPrefix = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 8) : '';
  const nodeEnv = process.env.NODE_ENV;

  return NextResponse.json({
    hasGroq,
    groqLength,
    groqPrefix,
    nodeEnv,
  });
}
