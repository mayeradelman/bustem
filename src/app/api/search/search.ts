const API_KEY = process.env.SCRAPERAPI_KEY as string;
if (!API_KEY) throw new Error('SCRAPERAPI_KEY not set');
const MAX_PAGES = 20;

export async function runSearch(query: string, pages: number = 1, tld: string = 'com'): Promise<any[]> {
  if (pages === -1) {
    pages = MAX_PAGES;
  }

  if (pages < 1 || pages > MAX_PAGES) {
    throw new Error(`'pages' parameter must be between 1 and ${MAX_PAGES}, or -1 for all pages.`);
  }

  const requests = Array.from({ length: pages }, (_, idx) => {
    const endpoint = new URL('https://api.scraperapi.com/structured/amazon/search/v1');
    endpoint.searchParams.set('api_key', API_KEY);
    endpoint.searchParams.set('query', query);
    endpoint.searchParams.set('tld', tld);
    endpoint.searchParams.set('page', String(idx + 1));

    return fetch(endpoint.toString()).then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        throw new Error(`ScraperAPI error: ${JSON.stringify(parsed)}`);
      }
      return JSON.parse(text);
    });
  });

  const pagesData = await Promise.all(requests);
  const merged = pagesData.flatMap((p) => p.results ?? []);

  return merged;
}
