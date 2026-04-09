import { handleApi } from './api.js';
import { renderHtml } from './ui.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    return new Response(renderHtml(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
