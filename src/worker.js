import { handleApi } from './api.js';
import { renderHtml } from './ui.js';

export default {
  async fetch(request, env) {
    const start = Date.now();
    const url = new URL(request.url);
    let response;
    let errorMsg = null;
    try {
      if (url.pathname.startsWith('/api/')) {
        response = await handleApi(request, env);
      } else {
        response = new Response(renderHtml(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    } catch (e) {
      errorMsg = e && e.message ? e.message : String(e);
      response = new Response('Internal error', { status: 500 });
    }

    const cf = request.cf || {};
    // Single structured JSON log per request — searchable in Workers Logs (3-day free retention).
    console.log(JSON.stringify({
      type: 'request',
      ts: new Date().toISOString(),
      method: request.method,
      path: url.pathname + (url.search || ''),
      status: response.status,
      ms: Date.now() - start,
      ip: request.headers.get('cf-connecting-ip') || null,
      country: cf.country || null,
      city: cf.city || null,
      region: cf.region || null,
      colo: cf.colo || null,
      asn: cf.asn || null,
      asOrg: cf.asOrganization || null,
      ua: (request.headers.get('user-agent') || '').slice(0, 200),
      ref: request.headers.get('referer') || null,
      err: errorMsg,
    }));

    return response;
  },
};
