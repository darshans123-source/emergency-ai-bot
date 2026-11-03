import { GoogleGenAI } from '@google/genai';

// Single AI provider for AegisAI: Google Gemini, via the official
// Google Gen AI SDK for TypeScript (@google/genai, already a dependency).
// This is the ONLY place that talks to an AI provider. There is no
// OpenRouter, Free.ai, Cohere, DashScope/Qwen or OpenAI provider left in
// the app, and no provider-switching logic anywhere else.
// The key is read only from the server environment (GEMINI_API_KEY):
// never hardcoded, never sent to the frontend, never in a VITE_ variable,
// never committed. The model default is a currently supported Flash model
// and can be overridden with GEMINI_MODEL without a code change.
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';

export function getGeminiConfig(): { key: string; model: string } | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return { key, model: process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL };
}

export type GeminiMessage = { role: 'user' | 'assistant'; content: string };

function mapGeminiError(err: any, timeout: boolean): Error & { status?: number } {
  const e: any = new Error('');
  const status = typeof err?.status === 'number' ? err.status : typeof err?.code === 'number' ? err.code : null;
  const raw = String(err?.message || err || '');
  if (timeout || err?.name === 'AbortError') {
    e.message = 'Gemini request timed out. Please retry.';
    e.status = 504;
    return e;
  }
  if (status === 429 || /429|quota|rate limit|resource exhausted/i.test(raw)) {
    e.message = 'Gemini rate limit or quota reached. Please wait a moment and retry.';
    e.status = 429;
  } else if (status === 404 || /not found|not supported/i.test(raw)) {
    e.message = `Gemini model not found. Set GEMINI_MODEL to a currently supported Flash model (default ${GEMINI_DEFAULT_MODEL}).`;
    e.status = 502;
  } else if (status === 400 || /api key not valid|invalid.*key|api_key_invalid/i.test(raw)) {
    e.message = 'Gemini key is invalid. Check GEMINI_API_KEY in the server environment.';
    e.status = 502;
  } else if (status === 503 || /overloaded|high demand|unavailable/i.test(raw)) {
    e.message = 'Gemini is temporarily overloaded. Please retry shortly.';
    e.status = 503;
  } else {
    e.message = `Gemini request failed${status ? ` (${status})` : ''}. ${raw.slice(0, 200)}`.trim();
    e.status = 502;
  }
  return e;
}

// One Gemini chat call. System prompt + recent history + new message.
// Throws a clear, user-facing error on any failure — callers must surface
// it, never substitute a local/demo reply for it.
export async function callGemini(
  system: string,
  messages: GeminiMessage[],
  timeoutMs = 15000
): Promise<string> {
  const config = getGeminiConfig();
  if (!config) {
    const err: any = new Error('Gemini is not configured on the server. Set GEMINI_API_KEY in the server environment (Vercel Settings -> Environment Variables, or a local .env file) and redeploy.');
    err.status = 503;
    throw err;
  }
  const ai = new GoogleGenAI({ apiKey: config.key });
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: m.content }]
  }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      ai.models.generateContent({
        model: config.model,
        contents,
        config: { systemInstruction: system, temperature: 0.3 }
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), timeoutMs);
      })
    ]);
    const text = (result as any)?.text;
    const reply = typeof text === 'string' ? text.trim() : '';
    if (!reply) throw new Error('Gemini returned an empty response.');
    return reply;
  } catch (err: any) {
    throw mapGeminiError(err, err?.message === 'GEMINI_TIMEOUT');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Connection test: one Gemini call with an env key, or with a caller-supplied
// key used for this call only (never stored, logged or returned).
export async function testGeminiConnection(keyOverride?: string): Promise<{ ok: boolean; model: string; configured: boolean; testedWithProvidedKey: boolean; error?: string; status?: number }> {
  const config = getGeminiConfig();
  const key = keyOverride?.trim() || config?.key || '';
  const model = config?.model || GEMINI_DEFAULT_MODEL;
  if (!key) {
    return { ok: false, model, configured: false, testedWithProvidedKey: false, error: 'Gemini is not configured on the server. Set GEMINI_API_KEY in the server environment (Vercel Settings -> Environment Variables, or a local .env file) and redeploy.', status: 503 };
  }
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const result = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [{ role: 'user' as const, parts: [{ text: 'Reply with exactly: OK' }] }],
        config: { systemInstruction: 'You are a connection test. Reply with exactly: OK', temperature: 0 }
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 15000))
    ]);
    const text = typeof (result as any)?.text === 'string' ? (result as any).text.trim() : '';
    if (!text) return { ok: false, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride), error: 'Gemini returned an empty response.', status: 502 };
    return { ok: true, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride) };
  } catch (err: any) {
    const mapped = mapGeminiError(err, err?.message === 'GEMINI_TIMEOUT');
    return { ok: false, model, configured: Boolean(config), testedWithProvidedKey: Boolean(keyOverride), error: mapped.message, status: mapped.status };
  }
}
