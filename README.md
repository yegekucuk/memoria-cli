# Memoria CLI

A command-line interface for the Memoria time tracking application. Track your work sessions, manage tags, and view your productivity metrics directly from your terminal.

## Security Note

This CLI is open source, but the Memoria API server is closed source and proprietary. The API specification (`docs/api.yaml`) is provided for transparency and to assist contributors. Please use the API responsibly and in accordance with our Terms of Service.

## Features

- **Secure Authentication** - JWT-based authentication with cookies
- **Session Tracking** - Start, stop, and manage time tracking sessions
- **Tag Management** - Create and organize sessions with custom tags
- **Session History** - View all your tracked sessions in a formatted table
- **User Settings** - Configure weekend exclusions and other preferences
- **Colorful Output** - Beautiful terminal UI with color-coded information

## Installation

Clone the repository and link it locally:

```bash
git clone <repository-url>
cd memoria-cli
npm install
npm link
```

## Quick Start

1. **Login to your account:**
   ```bash
   memoria login
   ```

2. **Start a tracking session:**
   ```bash
   memoria start
   ```

3. **Check session status:**
   ```bash
   memoria status
   ```

4. **Stop and save your session:**
   ```bash
  memoria stop --save --notes "Worked on feature X" --tags "work"
   ```

5. **View all sessions:**
   ```bash
   memoria list
   ```

## Configuration

### API Base URL

The CLI defaults to the production server (`https://memoria-track.vercel.app`). To use a different server:

```bash
memoria config --set-url http://localhost:3000
```

View the current configuration:

```bash
memoria config --get-url
```

### Credentials Storage

Authentication tokens are stored securely in `~/.memoria/credentials.json`. This file contains only the JWT token—**never your password**.

## Command Overview

### Authentication Commands

- `memoria login` - Login to your account
- `memoria register` - Create a new account
- `memoria logout` - Logout and clear credentials
- `memoria whoami` - Display current user information
- `memoria password` - Change your password

### Session Commands

- `memoria start` - Start a new tracking session
- `memoria stop` - Stop and resolve the current session
- `memoria status` - Show current session status
- `memoria list` - List all sessions
- `memoria add` - Add a manual session entry

### Tag Commands

- `memoria tags list` - List all tags
- `memoria tags create` - Create a new tag
- `memoria tags update` - Update an existing tag
- `memoria tags delete` - Delete a tag

### Settings Commands

- `memoria settings view` - View current user settings
- `memoria settings update` - Update user settings

### Configuration Commands

- `memoria config` - Manage CLI configuration

## Session Lifecycle

The CLI enforces a strict session lifecycle to prevent conflicts:

1. **No Active/Pending Sessions** → You can start a new session
2. **Active Session** → Must stop with `--save` or `--discard` before starting another
3. **Pending Session** → Must resolve with `--save` or `--discard` before starting another

```
┌─────────────┐
│  No Session │
└──────┬──────┘
       │ memoria start
       ▼
┌─────────────────┐
│ Active Session  │ (running, endTime=null)
└──────┬──────────┘
       │ memoria stop
       ▼
┌─────────────────┐
│ Resolved        │ (saved or discarded)
└─────────────────┘
```

## Examples

### Interactive Login

```bash
$ memoria login
? Email: user@example.com
? Password: ********
✓ Logged in successfully!
  Welcome, John Doe
```

### Flag-Based Login

```bash
memoria login --email user@example.com --password mypassword
```

### Start and Stop Session

```bash
# Start tracking
$ memoria start
✓ Session started!
  Started: 2/13/2026, 2:30:00 PM

# Check status
$ memoria status
● Active Session
  Started: 2/13/2026, 2:30:00 PM
  Elapsed: 1h 23m 45s

# Stop and save with interactive prompts
$ memoria stop --save
⏱  Session ended. Duration: 1h 23m 45s
? Notes: Implemented user authentication
? Select tags: [x] Work  [ ] Personal
✓ Session saved!
  Duration: 1h 23m 45s
  Notes:    Implemented user authentication
  Tags:     Work
```

### Stop with Flags

```bash
# Save with inline flags
memoria stop --save --notes "Fixed bug #123" --tags "work,bugfix"

# Discard the session
memoria stop --discard
```

### Add Manual Session

```bash
memoria add --start "2026-02-13T09:00:00Z" --duration 120 --notes "Morning meeting"
```

### Tag Management

```bash
# Create a tag
memoria tags create --name "Work" --color "#3498db"

# List all tags
memoria tags list

# Update a tag
memoria tags update --id abc123 --name "Business" --color "#2ecc71"

# Delete a tag
memoria tags delete --id abc123 --yes
```

### View Session History

```bash
$ memoria list
┌──────────────────────┬──────────────────────┬────────────┬──────────────────────────┬──────────┐
│ Start                │ End                  │ Duration   │ Notes                    │ Tags     │
├──────────────────────┼──────────────────────┼────────────┼──────────────────────────┼──────────┤
│ 2/13/2026, 2:30:00 PM│ 2/13/2026, 3:53:45 PM│ 1h 23m 45s │ Implemented auth         │ Work     │
│ 2/13/2026, 9:00:00 AM│ 2/13/2026, 11:00:00 AM│ 2h        │ Morning meeting          │ Meeting  │
└──────────────────────┴──────────────────────┴────────────┴──────────────────────────┴──────────┘

2 session(s) total
```

## Error Handling

The CLI provides clear error messages:

```bash
# Trying to start when session is active
$ memoria start
✗ An active session is already running.
  Stop it first with: memoria stop --save  or  memoria stop --discard

# Missing required flag
$ memoria stop
✗ You must specify either --save or --discard.
  Usage: memoria stop --save --notes "..." --tags "name1,name2"
         memoria stop --discard

# Unauthorized
$ memoria whoami
Session expired or unauthorized. Please login again with: memoria login
```

## Help

Get help for any command:

```bash
memoria --help
memoria login --help
memoria stop --help
memoria tags --help
```

## API Documentation

For detailed API information, see [api.yaml](api.yaml) in the docs folder.

## License

MIT
