// Preferred AI source for agent chats. This stores ONLY the choice
// ('local' or 'freeai') in this browser — never an API key. The Free.ai key
// itself lives only in the server environment (Vercel Settings ->
// Environment Variables, or a local .env file) and is never read from here.
export type AiSource = 'local' | 'freeai';

const KEY = 'aegis_ai_source';

export function getAiSource(): AiSource {
  try {
    return localStorage.getItem(KEY) === 'freeai' ? 'freeai' : 'local';
  } catch {
    return 'local';
  }
}

export function setAiSource(source: AiSource): void {
  try {
    localStorage.setItem(KEY, source);
  } catch {
    // ignore storage failures; chats fall back to the local engine
  }
}
