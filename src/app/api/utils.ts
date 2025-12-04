import { NextResponse } from "next/server";
import sharp from "sharp";

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function getGrayMatrix(buf: Buffer, width: number, height: number): Promise<number[][]> {
  const raw = await sharp(buf)
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = raw;
  const channels = info.channels;
  const mat: number[][] = [];
  for (let y = 0; y < info.height; y++) {
    const row: number[] = [];
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * channels;
      row.push(data[idx]);
    }
    mat.push(row);
  }
  return mat;
}

// converts image to a hash where each bit represents whether the pixel is >= (1) or < (0) the average value of all pixels
async function aHash(buf: Buffer): Promise<string> {
  const matrix = await getGrayMatrix(buf, 8, 8);

  // Flatten the matrix to compute average pixel value
  const flatPixels = matrix.flat();
  const avg = flatPixels.reduce((sum, v) => sum + v, 0) / flatPixels.length;

  // Compute bits as a string
  const bits = flatPixels.map((v) => (v >= avg ? "1" : "0")).join("");

  return bits;
}

// converts image to a hash where each bit represents whether the pixel is >= (1) or < (0) its right neighbor
async function dHash(buf: Buffer): Promise<string> {
  const matrix = await getGrayMatrix(buf, 9, 8);

  // Compare each pixel to its right neighbor
  const bits = matrix
    .map((row) =>
      row.slice(0, -1) // exclude last column, since comparing x vs x+1
        .map((v, x) => (v > row[x + 1] ? "1" : "0"))
        .join("")
    )
    .join("");

  return bits;
}

function dct2D(matrix: number[][]): number[][] {
  const N = matrix.length;
  const out: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const PI = Math.PI;
  const c = (u: number) => (u === 0 ? 1 / Math.sqrt(2) : 1);
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum += matrix[x][y] *
            Math.cos(((2 * x + 1) * u * PI) / (2 * N)) *
            Math.cos(((2 * y + 1) * v * PI) / (2 * N));
        }
      }
      out[u][v] = (2 / N) * c(u) * c(v) * sum;
    }
  }
  return out;
}

async function pHash(buf: Buffer): Promise<string> {
  const N = 32;      // Resize to NxN for DCT
  const mat = await getGrayMatrix(buf, N, N);

  // Normalize by subtracting mean
  const flat = mat.flat();
  const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
  const norm = mat.map((row) => row.map((v) => v - mean));

  // Compute 2D DCT
  const dct = dct2D(norm);

  // Take top-left 8x8 DCT coefficients
  const size = 8;
  const vals = dct.slice(0, size).flatMap((row) => row.slice(0, size));

  // Compute median
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Generate hash bits
  return vals.map((v) => (v > median ? "1" : "0")).join("");
}

// counts the number of differing bits between two hash strings
function hammingDistance(a: string, b: string): number {
  return [...a].reduce((acc, c, i) => acc + (c !== b[i] ? 1 : 0), 0);
}

async function fetchImageBuffer(url: string, timeoutMs = 15000): Promise<Buffer> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Image fetch failed ${res.status}`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } finally {
    clearTimeout(t);
  }
}

export async function compareImages(url1: string, url2: string): Promise<{
  aSimilarity: number;
  dSimilarity: number;
  pSimilarity: number;
  averageSimilarity: number;
}> {
  const buf1 = await fetchImageBuffer(url1);
  const buf2 = await fetchImageBuffer(url2);

  const [a1, d1, p1] = await Promise.all([aHash(buf1), dHash(buf1), pHash(buf1)]);
  const [a2, d2, p2] = await Promise.all([aHash(buf2), dHash(buf2), pHash(buf2)]);

  const da = hammingDistance(a1, a2);
  const dd = hammingDistance(d1, d2);
  const dp = hammingDistance(p1, p2);
  const sa = +(1 - da / 64).toFixed(4);
  const sd = +(1 - dd / 64).toFixed(4);
  const sp = +(1 - dp / 64).toFixed(4);
  const avg_similarity = +((sa + sd + sp) / 3).toFixed(4);

  return {
    aSimilarity: sa,
    dSimilarity: sd,
    pSimilarity: sp,
    averageSimilarity: avg_similarity,
  };
}