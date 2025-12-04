import { runSearch } from "../search/search";
import { jsonResponse, compareImages } from "../utils";
import { NextRequest } from "next/server";

const IMAGE_FETCH_CONCURRENCY = 6;

async function compareResults(imageUrl: string, results: any[]) {
  const output: any[] = [];
  const batches: any[][] = [];

  // split into batches for concurrency control
  for (let i = 0; i < results.length; i += IMAGE_FETCH_CONCURRENCY) {
    batches.push(results.slice(i, i + IMAGE_FETCH_CONCURRENCY));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        if (!r.image) return { ...r, similarity: null };
        try {
          const similarity = await compareImages(imageUrl, r.image);
          return { ...r, similarity };
        } catch (err: any) {
          return { ...r, similarity: null, error: String(err) };
        }
      })
    );
    output.push(...batchResults);
  }

  return output;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("imageUrl");
    const q = url.searchParams.get("q");
    const pages = Number(url.searchParams.get("pages") || 1); // default to 1 page

    if (!q) return jsonResponse({ error: 'Missing query "q"' }, 400);
    if (!imageUrl) return jsonResponse({ error: 'Missing imageUrl' }, 400);

    const results = await runSearch(q, pages);
    const compared = await compareResults(imageUrl, results);

    return jsonResponse({ results: compared });
  } catch (err: any) {
    return jsonResponse({ error: String(err) }, 500);
  }
}