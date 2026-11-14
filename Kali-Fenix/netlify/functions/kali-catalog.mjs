
const SOURCE_URL = 'https://www.kali.org/tools/all-tools/';
const CACHE_SECONDS = 3600;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 12_000_000;

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const point = Number(code);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : '';
    })
    .replace(/&#x([\da-f]+);/gi, (_, code) => {
      const point = Number.parseInt(code, 16);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : '';
    });
}

function cleanText(value) {
  return decodeEntities(String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u00a0\s]+/g, ' ')
  ).trim();
}

function slugifyToolName(value) {
  return cleanText(value)
    .replace(/\s*\$\s*$/, '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.+_-]/g, '')
    .replace(/-+/g, '-');
}

function extractTopLevelToolNames(html) {
  const names = [];
  const tokens = String(html || '').match(/<!--[\s\S]*?-->|<\/?[a-z][^>]*>|[^<]+/gi) || [];

  let listDepth = 0;
  let catalogActive = false;
  let headingOpen = false;
  let headingText = '';
  let sectionListDepth = null;
  let awaitingSectionList = false;
  let currentItem = null;

  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;

    if (token.startsWith('<')) {
      const tagMatch = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b[^>]*>/i);
      if (!tagMatch) continue;

      const isClosing = tagMatch[1] === '/';
      const tagName = tagMatch[2].toLowerCase();

      if (/^h[1-6]$/.test(tagName)) {
        if (!isClosing) {
          headingOpen = true;
          headingText = '';
        } else {
          const heading = cleanText(headingText).toUpperCase();
          if (/^(?:[0-9]|[A-Z])$/.test(heading)) {
            catalogActive = true;
            sectionListDepth = null;
            awaitingSectionList = true;
          }
          headingOpen = false;
        }
        continue;
      }

      if (tagName === 'ul' || tagName === 'ol') {
        if (isClosing) {
          listDepth = Math.max(0, listDepth - 1);
          if (sectionListDepth !== null && listDepth < sectionListDepth) {
            sectionListDepth = null;
          }
        } else {
          listDepth += 1;
          if (catalogActive && awaitingSectionList) {
            sectionListDepth = listDepth;
            awaitingSectionList = false;
          }
        }
        continue;
      }

      if (tagName === 'li') {
        if (!isClosing) {
          if (
            catalogActive &&
            sectionListDepth !== null &&
            listDepth === sectionListDepth &&
            currentItem === null
          ) {
            currentItem = '';
          }
        } else if (
          catalogActive &&
          sectionListDepth !== null &&
          listDepth === sectionListDepth &&
          currentItem !== null
        ) {
          const name = cleanText(currentItem)
            .replace(/\s*\$\s*$/, '')
            .trim();

          if (name) names.push(name);
          currentItem = null;
        }
        continue;
      }

      if (
        !isClosing &&
        catalogActive &&
        ['footer', 'nav'].includes(tagName) &&
        listDepth === 0
      ) {
        catalogActive = false;
      }

      continue;
    }

    if (headingOpen) headingText += token;

    if (
      catalogActive &&
      currentItem !== null &&
      sectionListDepth !== null &&
      listDepth === sectionListDepth
    ) {
      currentItem += token;
    }
  }

  return names;
}

function parseKaliTools(html) {
  const found = new Map();

  const excluded = new Set([
    'all-tools',
    'all-kali-tools',
    'kali-meta',
    'categories',
    'top-100',
    'source',
    'package',
    'command',
    'kali-tools-top-100'
  ]);

  for (const name of extractTopLevelToolNames(html)) {
    const slug = slugifyToolName(name);

    if (!slug || excluded.has(slug) || found.has(slug)) continue;
    if (!/^[a-z0-9][a-z0-9.+_-]*$/.test(slug)) continue;

    found.set(slug, {
      slug,
      name: name.slice(0, 100),
      url: `https://www.kali.org/tools/${encodeURIComponent(slug)}/`
    });
  }

  return [...found.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Use GET.' }), {
      status: 405,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        allow: 'GET'
      }
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const upstream = await fetch(SOURCE_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'user-agent': 'Kali-Fenix-Catalog/1.1 (+https://www.kali.org/tools/all-tools/)',
        accept: 'text/html,application/xhtml+xml'
      }
    });

    if (!upstream.ok) {
      throw new Error(`Kali catalog returned HTTP ${upstream.status}`);
    }

    const html = await upstream.text();

    if (!html || html.length > MAX_HTML_BYTES) {
      throw new Error('Kali catalog response was empty or exceeded the size limit.');
    }

    const tools = parseKaliTools(html);

    if (!tools.length) {
      throw new Error(
        'The official page structure changed or the top-level tool list could not be found.'
      );
    }

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
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export { parseKaliTools };
