export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path === '/' || path === '') {
      path = '/index.html';
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
                        path.endsWith('.png') ? 'image/png' :
                        path.endsWith('.jpg') || path.endsWith('.jpeg') ? 'image/jpeg' :
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
