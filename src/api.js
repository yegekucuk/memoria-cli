import axios from 'axios';
import chalk from 'chalk';
import { getToken, getBaseUrl } from './config.js';

/**
 * Create an axios instance configured with the stored JWT token
 * and base URL. Attaches the token as a Cookie header.
 */
export function createClient() {
  const token = getToken();
  const baseUrl = getBaseUrl();

  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    // Don't follow redirects for Set-Cookie capture
    maxRedirects: 0,
    validateStatus: (status) => status < 500,
  });

  // Attach token cookie on every request if available
  client.interceptors.request.use((config) => {
    if (token) {
      config.headers['Cookie'] = `token=${token}`;
    }
    return config;
  });

  // Intercept 401 responses
  client.interceptors.response.use((response) => {
    if (response.status === 401) {
      console.error(chalk.red('Session expired or unauthorized. Please login again with: memoria login'));
      process.exit(1);
    }
    return response;
  });

  return client;
}

/**
 * Create an unauthenticated client for login/register.
 */
export function createPublicClient() {
  const baseUrl = getBaseUrl();

  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: (status) => status < 500,
  });
}

/**
 * Handle API error responses uniformly.
 */
export function handleApiError(response) {
  if (response.data && response.data.error) {
    console.error(chalk.red(`Error: ${response.data.error}`));
    if (response.data.details && response.data.details.length > 0) {
      for (const detail of response.data.details) {
        console.error(chalk.yellow(`  - ${JSON.stringify(detail)}`));
      }
    }
  } else {
    console.error(chalk.red(`Request failed with status ${response.status}`));
  }
}
