export default {
  async fetch(request, env, ctx) {
    const bust = Date.now();
    const url = `https://raw.githubusercontent.com/AntonucciCooks/website/main/index.html?bust=${bust}`;
    const response = await fetch(url, { cache: 'no-store' });
    const html = await response.text();
    return new Response(html, {
      headers: { 
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
      },
    });
  },
};
