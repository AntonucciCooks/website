export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Serve the sitemap before any path rewriting
    if (path === "/sitemap.xml") {
      return buildSitemap(ctx);
    }

    if (path === "/" || path === "") {
      path = "/index.html";
    } else if (path.endsWith("/")) {
      path = path + "index.html";
    } else if (!path.includes(".")) {
      path = path + "/index.html";
    }

    const bust = Date.now();
    const githubUrl = `https://raw.githubusercontent.com/AntonucciCooks/website/main${path}?bust=${bust}`;
    const response = await fetch(githubUrl, { cache: 'no-store' });
    if (!response.ok) {
      return new Response('Not found', { status: 404 });
    }

    const contentType = path.endsWith('.html') ? 'text/html' :
                        path.endsWith('.css') ? 'text/css' :
                        path.endsWith('.js') ? 'application/javascript' :
                        path.endsWith('.json') ? 'application/json' :
                        path.endsWith('.xml') ? 'application/xml' :
                        path.endsWith('.png') ? 'image/png' :
                        path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' :
                        path.endsWith('.webp') ? 'image/webp' :
                        path.endsWith('.svg') ? 'image/svg+xml' :
                        'application/octet-stream';

    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  },
};

async function buildSitemap(ctx) {
  const site = "https://antonucci-cooks.com";

  // Serve a cached copy if we have one (protects the GitHub API rate limit)
  const cacheKey = new Request(site + "/sitemap.xml");
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  // Ask GitHub for the full repo file tree in one call
  const treeUrl = "https://api.github.com/repos/AntonucciCooks/website/git/trees/main?recursive=1";
  const res = await fetch(treeUrl, {
    headers: {
      "User-Agent": "antonucci-cooks-sitemap",
      "Accept": "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    return new Response("Sitemap unavailable", { status: 502 });
  }
  const data = await res.json();

  // Optional: paths to keep OUT of the sitemap (leave empty for none)
  const exclude = new Set([
    // "/404",
  ]);

  // Every folder page is an index.html. Map each to a clean URL.
  const paths = (data.tree || [])
    .filter((item) =>
      item.type === "blob" &&
      (item.path === "index.html" || item.path.endsWith("/index.html"))
    )
    .map((item) =>
      item.path === "index.html"
        ? "/"
        : "/" + item.path.slice(0, -"/index.html".length)
    )
    .filter((p) => !exclude.has(p));

  const pages = [...new Set(paths)].sort();

  const body = pages
    .map((p) => `  <url><loc>${site}${p}</loc></url>`)
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n` +
    `</urlset>`;

  const out = new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "max-age=3600",
    },
  });

  // Cache for an hour, non-blocking
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
