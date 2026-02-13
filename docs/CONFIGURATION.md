# Configuration Guide

Complete guide to configuring and customizing Memoria CLI.

## Table of Contents

- [Configuration File](#configuration-file)
- [API Base URL](#api-base-url)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)

---

## Configuration File

### Location

The CLI stores its configuration in:

```
~/.memoria/credentials.json
```

- `~` refers to your home directory
- Linux/macOS: `/home/username/.memoria/credentials.json`
- Windows: `C:\Users\Username\.memoria\credentials.json`

### File Structure

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "baseUrl": "https://memoria-track.vercel.app"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | JWT authentication token (stored as cookie value) |
| `baseUrl` | string | API server URL |

### Creating the Configuration

The configuration file is **automatically created** when you:

1. Run `memoria login` (creates token)
2. Run `memoria config --set-url <url>` (creates/updates baseUrl)

### Manual Editing

You can manually edit the file, but this is **not recommended**. Use CLI commands instead:

```bash
# View current configuration
memoria config --get-url

# Update base URL
memoria config --set-url http://localhost:3000
```

### Resetting Configuration

To reset your configuration:

```bash
# Method 1: Logout (removes entire file)
memoria logout

# Method 2: Manual deletion
rm ~/.memoria/credentials.json

# Then login again
memoria login
```

---

## API Base URL

### Default URL

The CLI defaults to the production server:

```
https://memoria-track.vercel.app
```

### Changing the URL

Switch to a different server (e.g., local development):

```bash
memoria config --set-url http://localhost:3000
```

### Viewing Current URL

```bash
memoria config --get-url
# or simply
memoria config
```

### Common URLs

| Environment | URL |
|-------------|-----|
| Production | `https://memoria-track.vercel.app` |
| Local Development | `http://localhost:3000` |
| Staging | `https://staging.memoria-track.vercel.app` (if available) |

### URL Format

- Must include protocol (`http://` or `https://`)
- No trailing slash
- Can include port number

**Valid Examples:**
```bash
memoria config --set-url https://memoria-track.vercel.app
memoria config --set-url http://localhost:3000
memoria config --set-url http://192.168.1.100:8080
```

**Invalid Examples:**
```bash
memoria config --set-url memoria-track.vercel.app  # Missing protocol
memoria config --set-url https://memoria-track.vercel.app/  # Trailing slash
```

---

## Authentication

### How Authentication Works

1. **Login:**
   - User provides email and password
   - CLI sends credentials to `POST /api/auth/login`
   - Server responds with `Set-Cookie: token=<jwt>`
   - CLI extracts the JWT token from the cookie header
   - Token is saved to `~/.memoria/credentials.json`

2. **Authenticated Requests:**
   - CLI reads token from config file
   - Token is sent as `Cookie: token=<jwt>` header
   - Server validates the token
   - Request is authorized

3. **Logout:**
   - CLI calls `POST /api/auth/logout`
   - Local credentials file is deleted
   - Token is invalidated on server

### Token Storage

**What is stored:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfMTIzIiwiaWF0IjoxNzA3ODQwMDAwfQ.signature"
}
```

**What is NOT stored:**
- ❌ Password
- ❌ Email
- ❌ Any other credentials

### Token Lifetime

- Token expiration is managed by the server
- When a token expires, the CLI will show:
  ```
  Session expired or unauthorized. Please login again with: memoria login
  ```
- Simply login again to get a new token:
  ```bash
  memoria login
  ```

### Checking Authentication Status

```bash
# View current logged-in user
memoria whoami

# If logged in, displays:
# Current User:
#   Name:    John Doe
#   Email:   john@example.com
#   ...

# If not logged in:
# Not logged in. Run: memoria login
```

---

## Environment Variables

### Supported Variables

Currently, the CLI does not use environment variables for configuration. All configuration is file-based.

### Future Considerations

Potential environment variables that could be added:

- `MEMORIA_API_URL` - Override API base URL
- `MEMORIA_TOKEN` - Override token (for CI/CD)
- `MEMORIA_CONFIG_DIR` - Override config directory

These are **not currently implemented**.

---

## Security Considerations

### Token Security

**Strengths:**
- ✅ Password never stored on disk
- ✅ Token stored in user's home directory (not in project)
- ✅ Token file has restricted permissions (readable only by owner on Unix)

**Limitations:**
- ⚠️ Token stored in plain text
- ⚠️ No encryption at rest
- ⚠️ Accessible to any process running as the user

### Best Practices

1. **Never share your credentials file:**
   ```bash
   # DO NOT commit to git
   ~/.memoria/credentials.json
   ```

2. **Use strong passwords:**
   - The CLI is only as secure as your password
   - Use a unique, strong password for your Memoria account

3. **Logout on shared machines:**
   ```bash
   memoria logout
   ```

4. **Protect your home directory:**
   - Ensure your home directory has proper permissions
   - On Unix: `chmod 700 ~/.memoria`

5. **Rotate tokens regularly:**
   - Logout and login again periodically
   ```bash
   memoria logout
   memoria login
   ```

### File Permissions

On Unix-like systems (Linux, macOS), the config file should have:

```bash
# Check permissions
ls -la ~/.memoria/credentials.json

# Should show: -rw------- (600) or -rw-r--r-- (644)

# Fix if needed
chmod 600 ~/.memoria/credentials.json
```

### Secure Storage Alternatives

For enhanced security, you could modify the CLI to use:

- **Keychain (macOS):** `keytar` package
- **Credential Manager (Windows):** `node-keytar`
- **Secret Service (Linux):** `libsecret`

These are **not currently implemented** but could be added in the future.

---

## Multi-Account Setup

Currently, the CLI supports **only one account at a time** (single credentials file).

### Workaround for Multiple Accounts

1. **Use different config files:**

   ```bash
   # Backup current credentials
   cp ~/.memoria/credentials.json ~/.memoria/credentials-account1.json
   
   # Login with second account
   memoria logout
   memoria login  # Login with account 2
   
   # Swap back to account 1
   cp ~/.memoria/credentials-account1.json ~/.memoria/credentials.json
   ```

2. **Use shell aliases:**

   ```bash
   # In ~/.bashrc or ~/.zshrc
   alias memoria-work="MEMORIA_CONFIG=~/.memoria-work memoria"
   alias memoria-personal="MEMORIA_CONFIG=~/.memoria-personal memoria"
   ```
   
   Note: This requires code modification to support `MEMORIA_CONFIG` env var.

---

## Troubleshooting

### "Not logged in" Error

**Symptom:**
```
Not logged in. Run: memoria login
```

**Causes:**
- No credentials file exists
- Credentials file is empty or malformed
- Token field is missing

**Solution:**
```bash
# Check if file exists
ls -la ~/.memoria/credentials.json

# View contents
cat ~/.memoria/credentials.json

# If corrupt or missing, login again
memoria login
```

---

### "Session expired" Error

**Symptom:**
```
Session expired or unauthorized. Please login again with: memoria login
```

**Causes:**
- JWT token has expired (server-side expiration)
- Token is invalid (tampered or corrupted)

**Solution:**
```bash
memoria login
```

---

### Configuration Not Persisting

**Symptom:**
- Changes to URL don't persist
- Token gets lost

**Causes:**
- Permission issues writing to `~/.memoria/`
- Disk full
- File locked by another process

**Solution:**
```bash
# Check permissions
ls -ld ~/.memoria

# Ensure directory is writable
chmod 755 ~/.memoria

# Check disk space
df -h ~
```

---

### Using Multiple Machines

**Scenario:** You want to use the CLI on multiple machines.

**Solution:**

Each machine needs to authenticate separately:

```bash
# On Machine A
memoria login

# On Machine B (separate login required)
memoria login
```

**Do NOT copy the credentials file between machines.** Each machine should authenticate independently.

---

## Advanced Configuration

### Custom API Client

If you need to customize the HTTP client (e.g., add proxy support, custom headers), modify `src/api.js`:

```javascript
const client = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add custom configuration
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
  },
  timeout: 10000,
});
```

### Custom Config Directory

Currently, the config directory is hardcoded to `~/.memoria`. To change it, modify `src/config.js`:

```javascript
import { homedir } from 'os';
import { join } from 'path';

// Change this line
const CONFIG_DIR = join(homedir(), '.memoria');

// To something like
const CONFIG_DIR = process.env.MEMORIA_CONFIG_DIR || join(homedir(), '.memoria');
```

Then use:
```bash
export MEMORIA_CONFIG_DIR=~/custom/path
memoria login
```

---

## Backup and Restore

### Backup

```bash
# Backup configuration
cp ~/.memoria/credentials.json ~/memoria-backup.json

# Or backup entire directory
cp -r ~/.memoria ~/memoria-backup
```

### Restore

```bash
# Restore configuration
cp ~/memoria-backup.json ~/.memoria/credentials.json

# Or restore entire directory
cp -r ~/memoria-backup ~/.memoria
```

---

## Migration

### Migrating to a New Machine

1. **On old machine:**
   ```bash
   # Just note your email/password
   # Do NOT copy credentials.json
   ```

2. **On new machine:**
   ```bash
   # Install CLI
   npm install -g memoria-cli
   
   # Login (don't copy token)
   memoria login
   ```

### Migrating from Another Time Tracker

If you're migrating from another time tracking tool:

1. Export data from old tool (usually CSV)
2. Use `memoria add` to import sessions:

   ```bash
   # For each session in your export
   memoria add \
     --start "2026-02-13T09:00:00Z" \
     --duration 120 \
     --notes "Imported session"
   ```

3. Consider writing a script to automate bulk import

---

## API Specification

For complete API documentation, see [api.yaml](api.yaml) in the `docs/` directory.

The OpenAPI specification includes:
- All available endpoints
- Request/response schemas
- Authentication requirements
- Error responses
