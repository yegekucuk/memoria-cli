# Development Guide

Guide for developing and contributing to Memoria CLI.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Architecture](#architecture)
- [Adding New Commands](#adding-new-commands)
- [Testing](#testing)
- [Code Style](#code-style)
- [Building and Publishing](#building-and-publishing)

---

## Project Structure

```
memoria-cli/
├── docs/
│   ├── api.yaml              # OpenAPI specification
│   ├── README.md             # User documentation
│   ├── COMMANDS.md           # Command reference
│   ├── CONFIGURATION.md      # Configuration guide
│   └── DEVELOPMENT.md        # This file
├── src/
│   ├── commands/
│   │   ├── auth.js           # Authentication commands
│   │   ├── sessions.js       # Session management commands
│   │   ├── tags.js           # Tag management commands
│   │   └── settings.js       # Settings commands
│   ├── api.js                # HTTP client wrapper
│   ├── config.js             # Configuration management
│   └── index.js              # CLI entry point (commander setup)
├── package.json
└── README.md
```

---

## Development Setup

### Prerequisites

- Node.js 18+ (for native `fetch` support, though we use `axios`)
- npm 8+

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd memoria-cli
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Link the CLI for local testing:**
   ```bash
   npm link
   ```
   
   This creates a global symlink to your local development version. Now `memoria` will run your local code.

4. **Point to local development server:**
   ```bash
   memoria config --set-url http://localhost:3000
   ```

### Running Locally

After linking, run any command:

```bash
memoria login
memoria start
memoria --help
```

Changes to source files are reflected immediately (no rebuild needed for JavaScript).

### Unlinking

To remove the global link:

```bash
npm unlink -g memoria-cli
```

---

## Architecture

### Core Components

#### 1. **CLI Entry Point (`src/index.js`)**

- Uses `commander` for command-line parsing
- Registers all commands and subcommands
- Sets up global options (`--help`, `--version`)
- Delegates to command modules in `src/commands/`

**Example:**
```javascript
program
  .command('login')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .action(login);
```

#### 2. **Configuration Manager (`src/config.js`)**

- Reads/writes `~/.memoria/credentials.json`
- Stores JWT token and API base URL
- Never stores passwords
- Provides helpers: `getToken()`, `saveToken()`, `clearToken()`, `getBaseUrl()`

**Storage Format:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "baseUrl": "https://memoria.yegekucuk.me"
}
```

#### 3. **API Client (`src/api.js`)**

- Wraps `axios` with JWT cookie authentication
- Two client types:
  - `createClient()` - Authenticated (attaches `Cookie: token=<jwt>`)
  - `createPublicClient()` - Unauthenticated (for login/register)
- Intercepts 401 responses → prints error and exits
- Provides `handleApiError()` helper for consistent error handling

**Example:**
```javascript
const client = createClient();
const response = await client.get('/api/sessions/active');
```

#### 4. **Command Modules (`src/commands/*.js`)**

Each module exports async functions that implement command logic:

- `auth.js` - Login, register, logout, whoami, password
- `sessions.js` - Start, stop, status, list, add
- `tags.js` - List, create, update, delete tags
- `settings.js` - View, update settings

**Pattern:**
```javascript
export async function commandName(options) {
  ensureAuth(); // Check if logged in
  const client = createClient();
  
  // Gather input (flags or prompts)
  let { flag1, flag2 } = options;
  if (!flag1) {
    const answers = await inquirer.prompt([...]);
    flag1 = answers.flag1;
  }
  
  // Make API call
  const response = await client.post('/api/endpoint', payload);
  
  // Handle response
  if (response.status !== 200) {
    handleApiError(response);
    process.exit(1);
  }
  
  // Display result
  console.log(chalk.green('✓ Success!'));
}
```

---

## Adding New Commands

### Step 1: Define the Command in `src/index.js`

```javascript
import { newCommand } from './commands/example.js';

program
  .command('example')
  .description('Example command description')
  .option('-f, --flag <value>', 'Flag description')
  .action(newCommand);
```

### Step 2: Implement the Command

Create `src/commands/example.js`:

```javascript
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createClient, handleApiError } from '../api.js';
import { getToken } from '../config.js';

function ensureAuth() {
  if (!getToken()) {
    console.error(chalk.red('Not logged in. Run: memoria login'));
    process.exit(1);
  }
}

export async function newCommand(options) {
  ensureAuth();
  let { flag } = options;

  // Interactive prompt if flag not provided
  if (!flag) {
    const { value } = await inquirer.prompt([
      { type: 'input', name: 'value', message: 'Enter value:' }
    ]);
    flag = value;
  }

  const client = createClient();

  try {
    const response = await client.post('/api/example', { data: flag });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    console.log(chalk.green('✓ Success!'));
    console.log(`Result: ${response.data.result}`);
  } catch (err) {
    console.error(chalk.red(`Failed: ${err.message}`));
    process.exit(1);
  }
}
```

### Step 3: Update Documentation

Add the command to `docs/COMMANDS.md` and `docs/README.md`.

---

## Testing

### Manual Testing

Test commands manually during development:

```bash
# Test login flow
memoria login --email test@example.com --password testpass

# Test session lifecycle
memoria start
memoria status
memoria stop --save --notes "Test session"

# Test error cases
memoria start  # Should error if session active
memoria stop   # Should error without --save or --discard
```

### Test Against Local Server

1. Start the Memoria API server locally on port 3000
2. Configure CLI:
   ```bash
   memoria config --set-url http://localhost:3000
   ```
3. Run through all command flows

### Test Checklist

- [ ] Authentication (login, register, logout, whoami)
- [ ] Session lifecycle (start, stop --save, stop --discard)
- [ ] Session restrictions (can't start when active/pending)
- [ ] Tag CRUD operations
- [ ] Settings view/update
- [ ] Interactive prompts work
- [ ] Flag-based inputs work
- [ ] Error messages are clear
- [ ] Token persistence across commands
- [ ] 401 handling (session expiry)

---

## Code Style

### Guidelines

- **ES Modules:** Use `import`/`export`, not `require`
- **Async/Await:** Prefer over callbacks/promises
- **Error Handling:** Always wrap API calls in try-catch
- **User Feedback:** Use `chalk` for colored output
  - Green (✓) for success
  - Red (✗) for errors
  - Yellow (⏱) for warnings/info
  - Dim for secondary info
- **Prompts:** Use `inquirer` for interactive input
- **Tables:** Use `cli-table3` for tabular data
- **Exit Codes:** Use `process.exit(1)` on errors, `0` on success

### Example Patterns

**Success Message:**
```javascript
console.log(chalk.green('✓ Session started!'));
console.log(`  ID:      ${chalk.dim(session.id)}`);
console.log(`  Started: ${formatDateTime(session.startTime)}`);
```

**Error Message:**
```javascript
console.error(chalk.red('✗ An active session is already running.'));
console.error(chalk.dim('  Stop it first with: memoria stop --save'));
process.exit(1);
```

**Interactive Prompt:**
```javascript
const { notes } = await inquirer.prompt([{
  type: 'input',
  name: 'notes',
  message: 'Session notes (optional):',
}]);
```

**Checkbox Selection:**
```javascript
const { tags } = await inquirer.prompt([{
  type: 'checkbox',
  name: 'tags',
  message: 'Select tags:',
  choices: availableTags.map(t => ({ name: t.name, value: t.id })),
}]);
```

---

## Building and Publishing

### Version Bump

Update version in `package.json`:

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### Publishing to npm

1. **Login to npm:**
   ```bash
   npm login
   ```

2. **Publish:**
   ```bash
   npm publish
   ```

3. **Verify:**
   ```bash
   npm info memoria-cli
   ```

### Pre-publish Checklist

- [ ] All tests pass
- [ ] Version bumped appropriately
- [ ] CHANGELOG updated
- [ ] Documentation up to date
- [ ] No debug logs in code
- [ ] `package.json` metadata correct (author, license, repository)

---

## Dependencies

### Production Dependencies

- **axios** (^1.7.0) - HTTP client for API calls
- **chalk** (^5.3.0) - Terminal string styling (colors)
- **cli-table3** (^0.6.5) - ASCII table rendering
- **commander** (^12.1.0) - CLI framework and argument parsing
- **inquirer** (^9.3.0) - Interactive command-line prompts

### Dependency Notes

- All dependencies are ESM-compatible
- `chalk` v5+ is ESM-only (requires `"type": "module"` in package.json)
- `inquirer` v9+ is ESM-only

---

## API Client Design

### Authentication Flow

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
POST /api/auth/login { email, password }
       │
       ▼
Response: Set-Cookie: token=<jwt>
       │
       ▼
Extract token from header
       │
       ▼
Save to ~/.memoria/credentials.json
       │
       ▼
Subsequent requests include:
Cookie: token=<jwt>
```

### Request Lifecycle

1. **Create Client:**
   ```javascript
   const client = createClient(); // Authenticated
   ```

2. **Client adds Cookie header:**
   ```javascript
   headers: { 'Cookie': 'token=<jwt>' }
   ```

3. **Send Request:**
   ```javascript
   const response = await client.get('/api/sessions/active');
   ```

4. **Intercept 401:**
   ```javascript
   if (response.status === 401) {
     // Auto-handled by interceptor
     console.error('Session expired...');
     process.exit(1);
   }
   ```

---

## Debugging Tips

### Enable Axios Debug Logging

Add to `src/api.js`:

```javascript
client.interceptors.request.use((config) => {
  console.log('[Request]', config.method.toUpperCase(), config.url);
  return config;
});

client.interceptors.response.use((response) => {
  console.log('[Response]', response.status, response.statusText);
  return response;
});
```

### View Stored Token

```bash
cat ~/.memoria/credentials.json
```

### Test API Directly with curl

```bash
# Get token from config
TOKEN=$(cat ~/.memoria/credentials.json | grep token | cut -d'"' -f4)

# Make authenticated request
curl -H "Cookie: token=$TOKEN" https://memoria.yegekucuk.me/api/auth/me
```

### Clear Credentials

```bash
rm ~/.memoria/credentials.json
```

---

## Common Issues

### "Not logged in" Error

**Cause:** Token file missing or invalid

**Solution:**
```bash
rm ~/.memoria/credentials.json
memoria login
```

### "Session expired" Error (401)

**Cause:** JWT token expired on server

**Solution:**
```bash
memoria login
```

### Permission Denied on `npm link`

**Cause:** Need elevated permissions

**Solution:**
```bash
sudo npm link
```

### Changes Not Reflected

**Cause:** Multiple versions linked

**Solution:**
```bash
npm unlink -g memoria-cli
cd /path/to/memoria-cli
npm link
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature X"`
5. Push to your fork: `git push origin feature/my-feature`
6. Open a pull request

---

## License

MIT
