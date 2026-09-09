/** Cloudflare Pages — OG/canonical/sitemap에 요청 origin을 붙인다. */
export async function onRequest(context) {
  const response = await context.next();
  const origin = new URL(context.request.url).origin;
  const path = new URL(context.request.url).pathname;
  const type = response.headers.get('content-type') || '';
  const rewrite =
    type.includes('text/html') || path === '/sitemap.xml' || path === '/robots.txt';
  if (!rewrite) return response;

  let body = (await response.text()).replaceAll('__SITE_ORIGIN__', origin);
  if (type.includes('text/html')) {
    body = body.replaceAll('content="/og.jpg"', `content="${origin}/og.jpg"`);
  }
  return new Response(body, { status: response.status, headers: response.headers });
}
