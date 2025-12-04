// app/api/search/route.ts
import { NextRequest } from 'next/server';
import { runSearch } from './search';
import { jsonResponse } from '../utils';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q');
  const pages = Number(url.searchParams.get('pages') || 1); // default to 1 page

  if (!query) {
    return jsonResponse({ error: 'Missing query "q"' }, 400);
  }

  try {
    const result = await runSearch(query, pages);
    return jsonResponse(result);
  } catch (err: any) {
    return jsonResponse({ error: err.message || String(err) }, 500);
  }
}