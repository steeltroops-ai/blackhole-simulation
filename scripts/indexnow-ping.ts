import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const HOST = "blackhole-simulation.vercel.app";
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;

const ENDPOINTS = [
  { name: "Bing", url: "https://api.indexnow.org/indexnow" },
  { name: "Yandex", url: "https://yandex.com/indexnow" },
] as const;

interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

interface PingResult {
  ok: boolean;
  status: number;
  body: string;
}

function findIndexNowKey(): string {
  const publicDir = resolve(process.cwd(), "public");
  const files = readdirSync(publicDir);
  const keyFile = files.find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (!keyFile) {
    throw new Error(
      "public/<32-hex>.txt not found. IndexNow ownership-proof file missing.",
    );
  }
  const key = keyFile.replace(/\.txt$/, "");
  const fileContent = readFileSync(resolve(publicDir, keyFile), "utf8").trim();
  if (fileContent !== key) {
    throw new Error(
      `public/${keyFile} content does not match key. Ownership proof corrupt.`,
    );
  }
  return key;
}

async function fetchSitemapUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) ?? [];
  return matches.map((m) => m.replace(/<\/?loc>/g, ""));
}

async function pingEndpoint(
  endpoint: { name: string; url: string },
  payload: IndexNowPayload,
): Promise<PingResult> {
  const res = await fetch(endpoint.url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body };
}

async function main(): Promise<void> {
  let key: string;
  try {
    key = findIndexNowKey();
  } catch (err) {
    console.error("IndexNow ping skipped:", (err as Error).message);
    process.exit(0);
  }

  console.log(`IndexNow key: ${key.slice(0, 6)}...${key.slice(-4)}`);

  let urls: string[];
  try {
    urls = await fetchSitemapUrls();
  } catch (err) {
    console.error("IndexNow ping skipped:", (err as Error).message);
    process.exit(0);
  }

  if (urls.length === 0) {
    console.error("IndexNow ping skipped: sitemap returned 0 URLs");
    process.exit(0);
  }

  console.log(`Submitting ${urls.length} URLs:`);
  for (const u of urls) console.log(`  ${u}`);

  const payload: IndexNowPayload = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList: urls,
  };

  const results = await Promise.all(
    ENDPOINTS.map(async (e) => ({
      name: e.name,
      result: await pingEndpoint(e, payload),
    })),
  );

  for (const { name, result } of results) {
    if (result.ok) {
      console.log(`OK ${name}: ${result.status}`);
    } else {
      console.error(
        `FAIL ${name}: ${result.status} ${result.body.slice(0, 200)}`,
      );
    }
  }

  // Log only. Never fail the deploy.
  process.exit(0);
}

main().catch((err) => {
  console.error("IndexNow ping unexpected error:", err);
  process.exit(0);
});
