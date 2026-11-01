/**
 * Local prototype profiles for AegisAI.
 *
 * SECURITY — read this before relying on it:
 * This is a browser-only prototype login. A profile's PIN is never stored
 * in plain text: it is stored only as a salted SHA-256 hash (salt + PIN),
 * computed with Web Crypto. That still does NOT make it secure against
 * someone with access to this device or to browser storage inspection —
 * anyone who can read localStorage can copy the hash/salt and brute-force
 * a 4-digit PIN quickly. Do NOT use this login to protect real emergency
 * or administrative operations. Real operations must use the backend
 * authentication in AuthContext / /api/auth.
 */

export interface LocalProfile {
  id: string;
  name: string;
  pinHash: string;
  salt: string;
  createdAt: string;
}

export interface LocalSession {
  profileId: string;
  name: string;
  rememberMe: boolean;
}

const PROFILES_KEY = 'aegis_local_profiles';
const SESSION_KEY = 'aegis_local_session';

export function readProfiles(): LocalProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.id && p.name && p.pinHash && p.salt) : [];
  } catch {
    return [];
  }
}

function writeProfiles(profiles: LocalProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function readSession(): LocalSession | null {
  try {
    const fromLocal = localStorage.getItem(SESSION_KEY);
    if (fromLocal) return JSON.parse(fromLocal);
    const fromSession = sessionStorage.getItem(SESSION_KEY);
    if (fromSession) return JSON.parse(fromSession);
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export function writeSession(session: LocalSession) {
  // Remember Me -> localStorage (survives refresh / restart).
  // Otherwise -> sessionStorage only (cleared when the tab closes).
  if (session.rememberMe) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(SESSION_KEY);
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function deleteProfile(profileId: string) {
  writeProfiles(readProfiles().filter((p) => p.id !== profileId));
  const session = readSession();
  if (session?.profileId === profileId) clearSession();
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new Error('PIN hashing needs a secure browser context (https or localhost).');
  }
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

function newSalt(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function validatePin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'PIN must be exactly 4 digits.';
  return null;
}

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Full name is required.';
  if (name.trim().length > 80) return 'Full name is too long.';
  return null;
}

export async function createLocalProfile(
  name: string,
  pin: string,
  confirmPin: string
): Promise<LocalProfile> {
  const nameError = validateName(name);
  if (nameError) throw new Error(nameError);
  const pinError = validatePin(pin);
  if (pinError) throw new Error(pinError);
  if (pin !== confirmPin) throw new Error('PINs do not match.');
  const profiles = readProfiles();
  if (profiles.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new Error('A profile with this name already exists. Use login, or choose a different name.');
  }
  const salt = newSalt();
  const profile: LocalProfile = {
    id: `local-${Date.now()}`,
    name: name.trim(),
    pinHash: await hashPin(pin, salt),
    salt,
    createdAt: new Date().toISOString()
  };
  writeProfiles([...profiles, profile]);
  return profile;
}

export async function verifyLocalProfile(name: string, pin: string): Promise<LocalProfile> {
  const nameError = validateName(name);
  if (nameError) throw new Error(nameError);
  const pinError = validatePin(pin);
  if (pinError) throw new Error(pinError);
  const profile = readProfiles().find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  if (!profile) throw new Error('No profile found with this name. Create a profile first.');
  const hash = await hashPin(pin, profile.salt);
  if (hash !== profile.pinHash) throw new Error('Incorrect PIN for this profile.');
  return profile;
}

export async function renameLocalProfile(profileId: string, newName: string): Promise<LocalProfile> {
  const nameError = validateName(newName);
  if (nameError) throw new Error(nameError);
  const profiles = readProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Profile not found.');
  if (profiles.some((p) => p.id !== profileId && p.name.toLowerCase() === newName.trim().toLowerCase())) {
    throw new Error('Another profile already uses this name.');
  }
  profile.name = newName.trim();
  writeProfiles(profiles);
  const session = readSession();
  if (session?.profileId === profileId) {
    writeSession({ ...session, name: profile.name });
  }
  return profile;
}

export async function changeLocalPin(
  profileId: string,
  oldPin: string,
  newPin: string,
  confirmPin: string
): Promise<void> {
  const pinError = validatePin(newPin);
  if (pinError) throw new Error(pinError);
  if (newPin !== confirmPin) throw new Error('New PINs do not match.');
  const profiles = readProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error('Profile not found.');
  const oldHash = await hashPin(oldPin, profile.salt);
  if (oldHash !== profile.pinHash) throw new Error('Current PIN is incorrect.');
  const salt = newSalt();
  profile.salt = salt;
  profile.pinHash = await hashPin(newPin, salt);
  writeProfiles(profiles);
}
