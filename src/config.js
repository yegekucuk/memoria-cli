import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.memoria');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

const DEFAULT_BASE_URL = 'https://memoria-track.vercel.app';

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig() {
  ensureConfigDir();
  if (!existsSync(CREDENTIALS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  ensureConfigDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getToken() {
  const config = readConfig();
  return config.token || null;
}

export function saveToken(token) {
  const config = readConfig();
  config.token = token;
  writeConfig(config);
}

export function clearToken() {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}

export function getBaseUrl() {
  const config = readConfig();
  return config.baseUrl || DEFAULT_BASE_URL;
}

export function setBaseUrl(url) {
  const config = readConfig();
  config.baseUrl = url;
  writeConfig(config);
}

/**
 * Parse the JWT token from a Set-Cookie header value.
 * The cookie is named "token".
 */
export function parseTokenFromCookies(setCookieHeader) {
  if (!setCookieHeader) return null;

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  for (const cookie of cookies) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}
