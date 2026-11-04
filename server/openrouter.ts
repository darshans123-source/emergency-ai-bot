import { getGeminiConfig } from './gemini';

// OpenRouter provider for AegisAI chats, via the OpenRouter chat-completions
// API (OpenAI-compatible). This module is the ONLY place that talks to
// OpenRouter. The key is read only from the server environment
// (OPENROUTER_API_KEY): never hardcoded, never sent to the frontend, never
// in a VITE_ variable, never committed. Default model is the NVIDIA
// Nemotron 3 Ultra free model, verified against the live OpenRouter models
// list on 2026-11-04 (text chat, $0 pricing); free-model availability
// rotates, so OPENROUTER_MODEL can override it without a code change.
// Gemini (server/gemini.ts) is preserved as the provider used when no
// OpenRouter key is set; routes dispatch between the two in server/routes.ts.
export const OPENROUTER_DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';
export const OPENROUTER_DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export function getOpenRouterConfig(): { key: string; model: string; baseUrl: string } | null {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  return {
    key,
    model: process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL,
    baseUrl: process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE_URL
  };
}

export function openrouterChatUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  if (base.endsWith('/chat/completions')) return base;
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

export type OpenRouterMessage = { role: 'user' | 'assistant'; content: string };

// Emergency-assistance personality applied to every OpenRouter chat call, on
// top of each agent's own instructions: short and clear, practical and safe,
// one follow-up question only when it helps the user get help faster, and
// never an invented contact number, address, availability or response time.
const PERSONALITY_SUFFIX = `\n\nKeep answers clear and short: prefer short sentences and brief lists over long paragraphs. Ask one relevant follow-up question only when it would help the user get help faster. Never invent emergency contact numbers, addresses, service availability, or response times; when immediate help is needed, advise contacting local emergency services right away.`;

function mapOpenRouterError(status: number | null, detail: string): Error & { status?: number } {
  const e: any = new Error('');
  if (status === 429) {
    e.message = 'OpenRouter rate limit reached. Please wait a moment and retry.';
    e.status = 429;
  } else if (status === 401) {
    e.message = 'OpenRouter key is missing or invalid. Check OPENROUTER_API_KEY in the server environment.';
    e.status = 401;
  } else if (status === 402) {
    e.message = 'OpenRouter credits are exhausted. Add credits or switch to a free model.';
    e.status = 402;
  } else if (status === 404) {
    e.message = `OpenRouter model not found. Set OPENROUTER_MODEL to a model from the live OpenRouter models list (default ${OPENROUTER_DEFAULT_MODEL}).`;
    e.status = 502;
  } else if (status === 504) {
    e.message = 'OpenRouter request timed out. Please retry.';
    e.status = 504;
  } else {
    e.message = `OpenRouter request failed${status ? ` (${status})` : ''}. ${detail.slice(0, 200)}`.trim();
    e.status = 502;
  }
  return e;
}

function isTransient(status: number | null, networkError: boolean): boolean {
  return networkError || status === 429 || status === 502 || status === 503 || status === 504;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One OpenRouter chat call, with a timeout per attempt and ONE retry for
// transient failures only (rate limit, gateway/overload, timeout, network).
// Auth, validation and model errors fail immediately with a clear message.
// Throws a user-facing error on failure — callers must surface it, never
// substitute another provider's reply or a local/demo reply for it.
export async function callOpenRouter(
  system: string,
  messages: OpenRouterMessage[],
  timeoutMs = 15000
): Promise<string> {
  const config = getOpenRouterConfig();
  if (!config) {
    const err: any = new Error('OpenRouter is not configured on the server. Set OPENROUTER_API_KEY in the server environment (Vercel Settings -> Environment Variables, or a local .env file) and redeploy.');
    err.status = 503;
    throw err;
  }
  const url = openrouterChatUrl(config.baseUrl);
  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: 'system', content: system + PERSONALITY_SUFFIX },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ],
    temperature: 0.3,
    max_tokens: 800
  });
  let lastError: Error & { status?: number } = new Error('OpenRouter request failed.');
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.key}`,
          'HTTP-Referer': 'https://emergency-ai-bot.vercel.app/',
          'X-Title': 'AegisAI',
          'X-OpenRouter-Title': 'AegisAI'
        },
        body
      });
      clearTimeout(timer);
      if (!response.ok) {
        let detail = '';
        try { const j: any = await response.json(); detail = j?.error?.message || ''; } catch { /* ignore */ }
        if (!detail) { try { detail = (await response.text()).slice(0, 200); } catch { /* ignore */ } }
        const err = mapOpenRouterError(response.status, detail);
        if (!isTransient(response.status, false) || attempt === 1) throw err;
        lastError = err;
        await sleep(1000);
        continue;
      }
      const data: any = await response.json();
      const msg = data.choices?.[0]?.message?.content;
      const content = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((c: any) => c.text || '').join('') : '';
      if (!content || !content.trim()) throw new Error('OpenRouter returned an empty response.');
      return content.trim();
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.status) {
        if (!isTransient(err.status, false) || attempt === 1) throw err;
        lastError = err;
        await sleep(1000);
        continue;
      }
      const timedOut = err?.name === 'AbortError';
      const mapped = mapOpenRouterError(timedOut ? 504 : null, timedOut ? '' : String(err?.message || ''));
      if (!isTransient(mapped.status ?? null, true) || attempt === 1) throw mapped;
      lastError = mapped;
      await sleep(1000);
    }
  }
  throw lastError;
}

// Connection test: one OpenRouter call with an env key, or with a
// caller-supplied key used for this call only (never stored, logged or
// returned).
export async function testOpenRouterConnection(keyOverride?: string): Promise<{ ok: boolean; model: string; configured: boolean; testedWithProvidedKey: boolean; error?: string; status?: number }> {
  const config = getOpenRouterConfig();
  const key = keyOverride?.trim() || config?.key || '';
  const model = config?.model || OPENROUTER_DEFAULT_MODEL;
  if (!key) {
    return { ok: false, model, configured: false, testedWithProvidedKey: false, error: 'OpenRouter is not configured on the server. Set OPENROUTER_API_KEY in the server environment (Vercel Settings -> Environment Variables, or a local .env file) and redeploy.', status: 503 };
  }
  const url = openrouterChatUrl(config?.baseUrl || OPENROUTER_DEFAULT_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://emergency-ai-bot.vercel.app/',
        'X-Title': 'AegisAI',
        'X-OpenRouter-Title': 'AegisAI'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a connection test. Reply with exactly: OK' },
          { role: 'user', content: 'Reply with exactly: OK' }
        ],
        temperature: 0
      })
    });
    clearTimeout(timer);
    if (!response.ok) {
      let detail = '';
      try { const j: any = await response.json(); detail = j?.error?.message || ''; } catch { /* ignore */ }
      if (!detail) { try { detail = (await response.text()).slice(0, 200); } catch { /* ignore */ } }
      const mapped = mapOpenRouterError(response.status, detail);
      return { ok: false, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride), error: mapped.message, status: mapped.status };
    }
    const data: any = await response.json();
    const msg = data.choices?.[0]?.message?.content;
    const text = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((c: any) => c.text || '').join('') : '';
    if (!text.trim()) return { ok: false, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride), error: 'OpenRouter returned an empty response.', status: 502 };
    return { ok: true, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride) };
  } catch (err: any) {
    clearTimeout(timer);
    const mapped = mapOpenRouterError(err?.name === 'AbortError' ? 504 : null, err?.name === 'AbortError' ? '' : String(err?.message || ''));
    return { ok: false, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride), error: mapped.message, status: mapped.status };
  }
}

// Active chat provider for the app: OpenRouter when its key is set, else
// Gemini when its key is set, else none. Used by routes and status so the
// frontend never has to pick a provider.
export type ActiveProvider = 'openrouter' | 'gemini' | null;
export function getActiveProvider(): ActiveProvider {
  if (getOpenRouterConfig()) return 'openrouter';
  if (getGeminiConfig()) return 'gemini';
  return null;
}
