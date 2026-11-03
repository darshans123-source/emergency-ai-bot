// Preferred AI source for agent chats. This stores ONLY the choice
// ('local' or 'freeai') in this browser — never an API key. The Free.ai key
// itself lives only in the server environment (Vercel Settings ->
// Environment Variables, or a local .env file) and is never read from here.
export type AiSource = 'local' | 'freeai' | 'openrouter';

const KEY = 'aegis_ai_source';

export function getAiSource(): AiSource {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'freeai' || v === 'openrouter' ? v : 'local';
  } catch {
    return 'local';
  }
}

// If the user has never picked a source, adopt the server's active provider
// (OpenRouter or Free.ai) once per session, so real AI is used automatically
// when a server key is set, and the local engine stays the default otherwise.
// Never blocks: failures leave the stored choice untouched.
let adopted = false;
export async function adoptServerAiSource(fetchStatus: () => Promise<{ provider: string }>): Promise<void> {
  if (adopted) return;
  adopted = true;
  try {
    if (localStorage.getItem(KEY)) return;
    const st = await fetchStatus();
    if (st.provider === 'openrouter' || st.provider === 'freeai') {
      localStorage.setItem(KEY, st.provider);
    }
  } catch {
    // server unreachable: keep the local engine
  }
}

export function setAiSource(source: AiSource): void {
  try {
    localStorage.setItem(KEY, source);
  } catch {
    // ignore storage failures; chats fall back to the local engine
  }
}
