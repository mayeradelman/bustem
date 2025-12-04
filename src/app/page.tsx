"use client";

import { useState } from "react";

interface Similarity {
  aSimilarity: number;
  dSimilarity: number;
  pSimilarity: number;
  averageSimilarity: number;
}

interface Result {
  name: string;
  url: string;
  price?: string;
  image?: string;
  similarity?: Similarity;
  error?: string;
}

const imagesToCompare = [
  "https://comfrt.com/fast-image/c_limit,w_1200,fl_progressive:steep/comfrt/files/3_63.jpg?v=1763420231",
  "https://comfrt.com/fast-image/c_limit,w_1200,fl_progressive:steep/comfrt/files/1_3e45474c-813e-4bc3-b1b6-4842c8697ad4.jpg?v=1740692532g",
  "https://comfrt.com/fast-image/c_limit,w_1200,fl_progressive:steep/comfrt/files/1_55.jpg?v=1762181934",
];

type SortMetric = keyof Similarity;

export default function ComparePage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortMetric, setSortMetric] = useState<SortMetric>("averageSimilarity");
  const [sortAsc, setSortAsc] = useState(false);
  const query = "comfrt"; // or make it dynamic

  const handleClick = async (imgUrl: string) => {
    setSelectedImage(imgUrl);
    setLoading(true);
    setResults([]);
    setError(null);

    try {
      const res = await fetch(
        `/api/compare?q=${encodeURIComponent(query)}&imageUrl=${encodeURIComponent(imgUrl)}&pages=2`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unknown error");
      } else {
        setResults(data.results || []);
      }
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!a.similarity || !b.similarity) return 0;
    const diff = a.similarity[sortMetric] - b.similarity[sortMetric];
    return sortAsc ? diff : -diff;
  });

  function formatPrice(price?: string | number) {
    if (price === undefined) return "";
    if (typeof price === "number") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
    }
    // ensure string starts with $
    return price.startsWith("$") ? price : `$${price}`;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Select an item to run counterfeit detection on:</h1>

      {/* Image selection */}
      <div className="flex gap-4 mb-6">
        {imagesToCompare.map((url) => (
          <img
            key={url}
            src={url}
            alt="compare"
            className={`w-32 h-32 object-cover cursor-pointer border-2 ${
              selectedImage === url ? "border-blue-500" : "border-gray-300"
            }`}
            onClick={() => handleClick(url)}
          />
        ))}
      </div>

      {/* Sorting controls */}
      {results.length > 0 && (
        <div className="flex gap-4 items-center mb-4">
          <label>
            Sort by:{" "}
            <select
              value={sortMetric}
              onChange={(e) => setSortMetric(e.target.value as SortMetric)}
              className="border px-2 py-1 rounded"
            >
              <option value="aSimilarity">aHash</option>
              <option value="dSimilarity">dHash</option>
              <option value="pSimilarity">pHash</option>
              <option value="averageSimilarity">Average</option>
            </select>
          </label>
          <button
            onClick={() => setSortAsc((prev) => !prev)}
            className="border px-2 py-1 rounded"
          >
            {sortAsc ? "Ascending" : "Descending"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && <p>Loading comparisons...</p>}

      {/* Error */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Results */}
      {!loading && sortedResults.length > 0 && (
        <div className="grid gap-4">
          {sortedResults.map((r, i) => (
            <div key={i} className="flex items-center gap-4 border p-2 rounded">
              {r.image && <img src={r.image} alt={r.name} className="w-24 h-24 object-cover" />}
              <div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 underline"
                >
                  {r.name}
                </a>
                {r.price && <p>Price: {formatPrice(r.price)}</p>}
                {r.similarity && (
                  <ul>
                    <li>aHash: {r.similarity.aSimilarity}</li>
                    <li>dHash: {r.similarity.dSimilarity}</li>
                    <li>pHash: {r.similarity.pSimilarity}</li>
                    <li>Average: {r.similarity.averageSimilarity}</li>
                  </ul>
                )}
                {r.error && <p className="text-red-500">Error: {r.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
