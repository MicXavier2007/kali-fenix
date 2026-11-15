const CATALOG_URL = "https://www.kali.org/tools/all-tools/";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff"
};

function response(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTools(html) {
  const tools = new Map();
  const anchorPattern = /<a\b[^>]*href=["'](?:https?:\/\/www\.kali\.org)?\/tools\/([a-z0-9][a-z0-9-]*)\/?(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const slug = match[1].toLowerCase();
    const name = decodeEntities(match[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) || slug;
    if (!tools.has(slug)) {
      tools.set(slug, {
        name,
        slug,
        url: `https://www.kali.org/tools/${slug}/`
      });
    }
  }
  return [...tools.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { ...response(405, { error: "Método não permitido." }), headers: { ...JSON_HEADERS, allow: "GET" } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const upstream = await fetch(CATALOG_URL, {
      method: "GET",
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Kali-Fenix-Catalog/1.0 (+https://kalifenix.netlify.app/)"
      },
      signal: controller.signal,
      redirect: "follow"
    });
    if (!upstream.ok) {
      return response(502, { error: `A fonte oficial respondeu HTTP ${upstream.status}.` });
    }
    const html = await upstream.text();
    const tools = extractTools(html);
    if (!tools.length) {
      return response(502, { error: "Não foi possível interpretar o catálogo oficial do Kali Linux." });
    }
    return response(200, {
      source: "kali.org",
      syncedAt: new Date().toISOString(),
      count: tools.length,
      tools
    });
  } catch (error) {
    const message = error?.name === "AbortError" ? "Tempo limite ao consultar kali.org." : "Não foi possível consultar kali.org neste momento.";
    return response(502, { error: message });
  } finally {
    clearTimeout(timeout);
  }
}
