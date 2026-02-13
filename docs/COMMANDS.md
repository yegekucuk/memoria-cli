# Command Reference

Complete reference for all Memoria CLI commands.

## Table of Contents

- [Authentication Commands](#authentication-commands)
- [Session Commands](#session-commands)
- [Tag Commands](#tag-commands)
- [Settings Commands](#settings-commands)
- [Configuration Commands](#configuration-commands)

---

## Authentication Commands

### `memoria login`

Login to your Memoria account.

**Usage:**
```bash
memoria login [options]
```

**Options:**
- `-e, --email <email>` - Account email
- `-p, --password <password>` - Account password

**Examples:**
```bash
# Interactive login (prompts for email and password)
memoria login

# Flag-based login
memoria login --email user@example.com --password mypassword
```

**Behavior:**
- Sends credentials to `/api/auth/login`
- Extracts JWT token from `Set-Cookie` response header
- Saves token to `~/.memoria/credentials.json`
- Never stores the password

---

### `memoria register`

Register a new Memoria account.

**Usage:**
```bash
memoria register [options]
```

**Options:**
- `-e, --email <email>` - Account email
- `-p, --password <password>` - Account password
- `-n, --name <name>` - Your name

**Examples:**
```bash
# Interactive registration
memoria register

# Flag-based registration
memoria register --email user@example.com --password mypass --name "John Doe"
```

---

### `memoria logout`

Logout from your Memoria account.

**Usage:**
```bash
memoria logout
```

**Behavior:**
- Calls `/api/auth/logout` endpoint
- Deletes `~/.memoria/credentials.json`
- Clears all stored credentials

---

### `memoria whoami`

Display information about the currently logged-in user.

**Usage:**
```bash
memoria whoami
```

**Example Output:**
```
Current User:
  Name:    John Doe
  Email:   john@example.com
  ID:      usr_abc123def456
  Joined:  1/15/2026
```

---

### `memoria password`

Change your account password.

**Usage:**
```bash
memoria password [options]
```

**Options:**
- `--current-password <password>` - Current password
- `--new-password <password>` - New password

**Examples:**
```bash
# Interactive (prompts for passwords)
memoria password

# Flag-based
memoria password --current-password oldpass --new-password newpass
```

---

## Session Commands

### `memoria start`

Start a new time tracking session.

**Usage:**
```bash
memoria start
```

**Behavior:**
1. Checks for any active session → errors if found
2. Checks for any pending session → errors if found
3. Creates a new active session via `POST /api/sessions/active`
4. Displays session start time and ID

**Restrictions:**
- Cannot start if an active session exists
- Cannot start if a pending (stopped but not saved) session exists
- Must resolve existing sessions with `memoria stop` first

**Example:**
```bash
$ memoria start
✓ Session started!
  ID:      ses_abc123
  Started: 2/13/2026, 2:30:00 PM
```

---

### `memoria stop`

Stop and resolve the current session.

**Usage:**
```bash
memoria stop --save|--discard [options]
```

**Required Flags (exactly one):**
- `-s, --save` - Save the session with notes and tags
- `-d, --discard` - Discard the session

**Optional Flags (with --save):**
- `-n, --notes <notes>` - Session notes
- `-t, --tags <tags>` - Comma-separated tag IDs

**Behavior:**
1. Checks for active or pending session
2. If active → ends it by setting `endTime` to now
3. If `--save` → prompts for notes/tags (or uses provided flags), saves via PATCH
4. If `--discard` → deletes the session via DELETE

**Examples:**
```bash
# Save with interactive prompts
memoria stop --save

# Save with flags
memoria stop --save --notes "Fixed authentication bug" --tags "work,bugfix"

# Discard the session
memoria stop --discard
```

**Error Cases:**
```bash
# Missing flag
$ memoria stop
✗ You must specify either --save or --discard.

# No session to stop
$ memoria stop --save
✗ No active or pending session to stop.
```

---

### `memoria status`

Show the status of the current session.

**Usage:**
```bash
memoria status
```

**Output for Active Session:**
```
● Active Session
  ID:      ses_abc123
  Started: 2/13/2026, 2:30:00 PM
  Elapsed: 1h 23m 45s
```

**Output for Pending Session:**
```
◉ Pending Session (stopped, not saved)
  ID:       ses_abc123
  Started:  2/13/2026, 2:30:00 PM
  Ended:    2/13/2026, 3:53:45 PM
  Duration: 1h 23m 45s
  Run: memoria stop --save  or  memoria stop --discard
```

**Output for No Session:**
```
No active session.
```

---

### `memoria list`

List all your tracked sessions.

**Usage:**
```bash
memoria list
```

**Example Output:**
```
┌──────────────────────┬──────────────────────┬────────────┬──────────────────┬──────────┐
│ Start                │ End                  │ Duration   │ Notes            │ Tags     │
├──────────────────────┼──────────────────────┼────────────┼──────────────────┼──────────┤
│ 2/13/2026, 2:30:00 PM│ 2/13/2026, 3:53:45 PM│ 1h 23m 45s │ Fixed bug #123   │ Work     │
│ 2/13/2026, 9:00:00 AM│ 2/13/2026, 11:00:00 AM│ 2h        │ Morning standup  │ Meeting  │
└──────────────────────┴──────────────────────┴────────────┴──────────────────┴──────────┘

2 session(s) total
```

**Behavior:**
- Fetches all sessions via `GET /api/sessions`
- Sorts by start time (most recent first)
- Displays in a formatted table

---

### `memoria add`

Add a manual session entry.

**Usage:**
```bash
memoria add [options]
```

**Options:**
- `-s, --start <datetime>` - Start time (ISO 8601 format)
- `-d, --duration <minutes>` - Duration in minutes
- `-n, --notes <notes>` - Session notes
- `-t, --tags <tags>` - Comma-separated tag IDs

**Examples:**
```bash
# Interactive
memoria add

# With flags
memoria add --start "2026-02-13T09:00:00Z" --duration 120 --notes "Team meeting"

# With tags
memoria add --start "2026-02-13T14:00:00Z" --duration 90 --tags "work,meeting"
```

**Behavior:**
- Creates a completed session via `POST /api/sessions`
- Calculates `endTime` based on start + duration
- Converts duration from minutes to seconds for API

---

## Tag Commands

### `memoria tags list`

List all your tags.

**Usage:**
```bash
memoria tags list
```

**Example Output:**
```
┌──────────────────┬──────────┬─────────────┬────────────┐
│ ID               │ Name     │ Color       │ Created    │
├──────────────────┼──────────┼─────────────┼────────────┤
│ tag_abc123       │ Work     │ ██ #3498db  │ 2/1/2026   │
│ tag_def456       │ Personal │ ██ #2ecc71  │ 2/1/2026   │
└──────────────────┴──────────┴─────────────┴────────────┘
```

---

### `memoria tags create`

Create a new tag.

**Usage:**
```bash
memoria tags create [options]
```

**Options:**
- `-n, --name <name>` - Tag name
- `-c, --color <color>` - Tag color (hex format, e.g., #ff5733)

**Examples:**
```bash
# Interactive
memoria tags create

# With flags
memoria tags create --name "Work" --color "#3498db"
```

**Validation:**
- Color must be a valid 6-digit hex code (e.g., `#ff5733`)

**Error:**
```bash
✗ Tag "Work" already exists.  # HTTP 409 if tag name exists
```

---

### `memoria tags update`

Update an existing tag.

**Usage:**
```bash
memoria tags update [options]
```

**Options:**
- `--id <id>` - Tag ID to update
- `-n, --name <name>` - New tag name
- `-c, --color <color>` - New tag color (hex)

**Examples:**
```bash
# Interactive selection
memoria tags update

# With flags
memoria tags update --id tag_abc123 --name "Business" --color "#2ecc71"
```

**Behavior:**
- If no `--id`, displays a list of tags to choose from
- Updates via `PUT /api/tags/{id}`

---

### `memoria tags delete`

Delete a tag.

**Usage:**
```bash
memoria tags delete [options]
```

**Options:**
- `--id <id>` - Tag ID to delete
- `-y, --yes` - Skip confirmation prompt

**Examples:**
```bash
# Interactive selection + confirmation
memoria tags delete

# With ID (prompts for confirmation)
memoria tags delete --id tag_abc123

# Skip confirmation
memoria tags delete --id tag_abc123 --yes
```

---

## Settings Commands

### `memoria settings view`

View your current user settings.

**Usage:**
```bash
memoria settings view
```

**Example Output:**
```
Settings:
  Exclude Weekends: Yes
```

---

### `memoria settings update`

Update your user settings.

**Usage:**
```bash
memoria settings update [options]
```

**Options:**
- `--exclude-weekends` - Enable weekend exclusion
- `--no-exclude-weekends` - Disable weekend exclusion

**Examples:**
```bash
# Enable weekend exclusion
memoria settings update --exclude-weekends

# Disable weekend exclusion
memoria settings update --no-exclude-weekends
```

**Behavior:**
- Updates via `PATCH /api/settings`
- Only `excludeWeekends` setting is currently supported

---

## Configuration Commands

### `memoria config`

Manage CLI configuration.

**Usage:**
```bash
memoria config [options]
```

**Options:**
- `--set-url <url>` - Set the API base URL
- `--get-url` - Display the current API base URL

**Examples:**
```bash
# View current URL
memoria config
# or
memoria config --get-url

# Switch to local development server
memoria config --set-url http://localhost:3000

# Switch back to production
memoria config --set-url https://memoria-track.vercel.app
```

**Default URL:** `https://memoria-track.vercel.app`

---

## Global Options

All commands support these global options:

- `-h, --help` - Display help for the command
- `-V, --version` - Display CLI version

**Examples:**
```bash
memoria --help
memoria --version
memoria stop --help
memoria tags --help
```
