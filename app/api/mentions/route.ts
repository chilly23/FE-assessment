import { NextResponse } from 'next/server';

const mockNames = Array.from({ length: 1000000 }, (_, i) => `User${i + 1}`);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  
  if (!query) {
    return NextResponse.json([]);
  }
  
  const results = mockNames
    .filter(name => name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
  
  return NextResponse.json(results);
}