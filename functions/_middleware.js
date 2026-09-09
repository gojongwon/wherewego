/** Cloudflare Pages — 카톡/노션 크롤러는 og:image 절대 URL이 필요하다. */
export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  const origin = new URL(context.request.url).origin;
  const html = (await response.text()).replaceAll('content="/og.jpg"', `content="${origin}/og.jpg"`);
  return new Response(html, { status: response.status, headers: response.headers });
}
