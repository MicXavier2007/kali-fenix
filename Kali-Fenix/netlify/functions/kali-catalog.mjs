const SOURCE_URL = 'https://www.kali.org/tools/all-tools/';
const CACHE_SECONDS = 3600;

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function cleanText(html) {
  return decodeEntities(String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).trim();
}

function parseKaliTools(html) {
  const found = new Map();
  const anchors = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchors)) {
    const hrefMatch = match[1].match(/\bhref\s*=\s*["'](?:https?:\/\/www\.kali\.org)?\/tools\/([a-z0-9][a-z0-9.+_-]*)\/?(?:[?#][^"']*)?["']/i);
    if (!hrefMatch) continue;
    const slug = hrefMatch[1].toLowerCase();
    if (['all-tools', 'kali-meta', 'categories'].includes(slug)) continue;
    const name = cleanText(match[2]) || slug;
    if (!found.has(slug)) {
      found.set(slug, {
        slug,
        name: name.slice(0, 100),
        url: `https://www.kali.org/tools/${encodeURIComponent(slug)}/`
      });
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Use GET.' }), {
      status: 405, headers: { 'content-type': 'application/json; charset=utf-8', allow: 'GET' }
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(SOURCE_URL, {
      method: 'GET', signal: controller.signal,
      headers: { 'user-agent': 'FenixTools-Kali-Catalog/1.0 (+https://www.kali.org/tools/all-tools/)', accept: 'text/html' }
    });
    if (!upstream.ok) throw new Error(`Kali catalog returned HTTP ${upstream.status}`);
    const html = await upstream.text();
    if (html.length > 12_000_000) throw new Error('Kali catalog response exceeded the size limit.');
    const tools = parseKaliTools(html);
    if (!tools.length) throw new Error('Could not parse the official Kali tool catalog.');
    return new Response(JSON.stringify({
      source: SOURCE_URL,
      syncedAt: new Date().toISOString(),
      count: tools.length,
      tools
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
        'x-content-type-options': 'nosniff'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Não foi possível consultar o catálogo oficial do Kali agora.',
      detail: String(error?.message || 'Upstream unavailable').slice(0, 180)
    }), {
      status: 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
    });
  } finally {
    clearTimeout(timeout);
  }
}
