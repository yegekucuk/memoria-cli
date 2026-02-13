import chalk from 'chalk';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { createClient, handleApiError } from '../api.js';
import { getToken } from '../config.js';

function ensureAuth() {
  if (!getToken()) {
    console.error(chalk.red('Not logged in. Run: memoria login'));
    process.exit(1);
  }
}

function formatDuration(seconds) {
  if (seconds == null || seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

function formatDateTime(iso) {
  if (!iso) return chalk.dim('—');
  const d = new Date(iso);
  return d.toLocaleString();
}

function computeElapsed(startTime) {
  const start = new Date(startTime);
  const now = new Date();
  return Math.floor((now - start) / 1000);
}

/**
 * memoria start — Start a new session.
 * Blocks if there is an active or pending session.
 */
export async function startSession() {
  ensureAuth();
  const client = createClient();

  try {
    // Check for active session
    const activeRes = await client.get('/api/sessions/active');
    if (activeRes.status !== 200) {
      handleApiError(activeRes);
      process.exit(1);
    }

    if (activeRes.data) {
      console.error(chalk.red('✗ An active session is already running.'));
      console.error(chalk.dim('  Stop it first with: memoria stop --save  or  memoria stop --discard'));
      process.exit(1);
    }

    // Check for pending session
    const pendingRes = await client.get('/api/sessions/pending');
    if (pendingRes.status !== 200) {
      handleApiError(pendingRes);
      process.exit(1);
    }

    if (pendingRes.data) {
      console.error(chalk.red('✗ A pending session exists (stopped but not saved).'));
      console.error(chalk.dim('  Resolve it first with: memoria stop --save  or  memoria stop --discard'));
      process.exit(1);
    }

    // Start new session
    const response = await client.post('/api/sessions/active');
    if (response.status === 409) {
      console.error(chalk.red('✗ A session is already active.'));
      process.exit(1);
    }

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const session = response.data;
    console.log(chalk.green('✓ Session started!'));
    console.log(`  ID:      ${chalk.dim(session.id)}`);
    console.log(`  Started: ${formatDateTime(session.startTime)}`);
  } catch (err) {
    console.error(chalk.red(`Failed to start session: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria stop --save|--discard
 * Requires exactly one of --save or --discard.
 * If --save: accepts --notes and --tags flags, or prompts interactively.
 * If --discard: deletes the session.
 */
export async function stopSession(options) {
  ensureAuth();
  const { save, discard, notes, tags } = options;

  // Enforce exactly one flag
  if (!save && !discard) {
    console.error(chalk.red('✗ You must specify either --save or --discard.'));
    console.error(chalk.dim('  Usage: memoria stop --save [--notes "..."] [--tags "id1,id2"]'));
    console.error(chalk.dim('         memoria stop --discard'));
    process.exit(1);
  }

  if (save && discard) {
    console.error(chalk.red('✗ Cannot use both --save and --discard. Choose one.'));
    process.exit(1);
  }

  const client = createClient();

  try {
    let session = null;
    let isActive = false;

    // Check for active session first
    const activeRes = await client.get('/api/sessions/active');
    if (activeRes.status !== 200) {
      handleApiError(activeRes);
      process.exit(1);
    }

    if (activeRes.data) {
      session = activeRes.data;
      isActive = true;
    } else {
      // Check for pending session
      const pendingRes = await client.get('/api/sessions/pending');
      if (pendingRes.status !== 200) {
        handleApiError(pendingRes);
        process.exit(1);
      }

      if (pendingRes.data) {
        session = pendingRes.data;
        isActive = false;
      }
    }

    if (!session) {
      console.error(chalk.red('✗ No active or pending session to stop.'));
      process.exit(1);
    }

    // If active, end it first
    if (isActive) {
      const endTime = new Date().toISOString();
      const durationSeconds = computeElapsed(session.startTime);

      const endRes = await client.patch(`/api/sessions/${session.id}`, {
        endTime,
        durationSeconds,
      });

      if (endRes.status !== 200) {
        handleApiError(endRes);
        process.exit(1);
      }

      session = endRes.data;
      console.log(chalk.yellow(`⏱  Session ended. Duration: ${formatDuration(durationSeconds)}`));
    }

    // Now handle save or discard
    if (discard) {
      const delRes = await client.delete(`/api/sessions/${session.id}`);
      if (delRes.status !== 200) {
        handleApiError(delRes);
        process.exit(1);
      }
      console.log(chalk.green('✓ Session discarded.'));
      return;
    }

    // --save: collect notes and tags
    let sessionNotes = notes || null;
    let sessionTags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : null;

    // If notes or tags not provided via flags, prompt interactively
    if (!sessionNotes || !sessionTags) {
      // Fetch available tags for selection
      const tagsRes = await client.get('/api/tags');
      const availableTags = tagsRes.status === 200 && Array.isArray(tagsRes.data) ? tagsRes.data : [];

      const prompts = [];

      if (!sessionNotes) {
        prompts.push({
          type: 'input',
          name: 'notes',
          message: 'Notes (optional, press Enter to skip):',
        });
      }

      if (!sessionTags && availableTags.length > 0) {
        prompts.push({
          type: 'checkbox',
          name: 'tags',
          message: 'Select tags:',
          choices: availableTags.map((t) => ({
            name: `${t.name}`,
            value: t.id,
          })),
        });
      }

      if (prompts.length > 0) {
        const answers = await inquirer.prompt(prompts);
        if (!sessionNotes && answers.notes) {
          sessionNotes = answers.notes;
        }
        if (!sessionTags && answers.tags) {
          sessionTags = answers.tags;
        }
      }
    }

    // Build update payload
    const updatePayload = {};
    if (sessionNotes) updatePayload.notes = sessionNotes;
    if (sessionTags && sessionTags.length > 0) updatePayload.tags = sessionTags;

    const saveRes = await client.patch(`/api/sessions/${session.id}`, updatePayload);
    if (saveRes.status !== 200) {
      handleApiError(saveRes);
      process.exit(1);
    }

    const saved = saveRes.data;
    console.log(chalk.green('✓ Session saved!'));
    console.log(`  Duration: ${formatDuration(saved.durationSeconds)}`);
    if (saved.notes) console.log(`  Notes:    ${saved.notes}`);
    if (saved.tags && saved.tags.length > 0) console.log(`  Tags:     ${saved.tags.join(', ')}`);
  } catch (err) {
    console.error(chalk.red(`Failed to stop session: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria status — Show current active or pending session status.
 */
export async function sessionStatus() {
  ensureAuth();
  const client = createClient();

  try {
    // Check active
    const activeRes = await client.get('/api/sessions/active');
    if (activeRes.status === 200 && activeRes.data) {
      const session = activeRes.data;
      const elapsed = computeElapsed(session.startTime);
      console.log(chalk.green.bold('● Active Session'));
      console.log(`  ID:      ${chalk.dim(session.id)}`);
      console.log(`  Started: ${formatDateTime(session.startTime)}`);
      console.log(`  Elapsed: ${chalk.cyan(formatDuration(elapsed))}`);
      return;
    }

    // Check pending
    const pendingRes = await client.get('/api/sessions/pending');
    if (pendingRes.status === 200 && pendingRes.data) {
      const session = pendingRes.data;
      console.log(chalk.yellow.bold('◉ Pending Session') + chalk.dim(' (stopped, not saved)'));
      console.log(`  ID:       ${chalk.dim(session.id)}`);
      console.log(`  Started:  ${formatDateTime(session.startTime)}`);
      console.log(`  Ended:    ${formatDateTime(session.endTime)}`);
      console.log(`  Duration: ${formatDuration(session.durationSeconds)}`);
      console.log(chalk.dim('  Run: memoria stop --save  or  memoria stop --discard'));
      return;
    }

    console.log(chalk.dim('No active session.'));
  } catch (err) {
    console.error(chalk.red(`Failed to get status: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria list — List all sessions.
 */
export async function listSessions() {
  ensureAuth();
  const client = createClient();

  try {
    const response = await client.get('/api/sessions');
    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const sessions = response.data;

    if (!sessions || sessions.length === 0) {
      console.log(chalk.dim('No sessions found.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.bold('Start'),
        chalk.bold('End'),
        chalk.bold('Duration'),
        chalk.bold('Notes'),
        chalk.bold('Tags'),
      ],
      colWidths: [22, 22, 12, 30, 20],
      wordWrap: true,
    });

    // Sort by start time descending (most recent first)
    sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    for (const s of sessions) {
      table.push([
        formatDateTime(s.startTime),
        formatDateTime(s.endTime),
        formatDuration(s.durationSeconds),
        s.notes || chalk.dim('—'),
        s.tags && s.tags.length > 0 ? s.tags.join(', ') : chalk.dim('—'),
      ]);
    }

    console.log(table.toString());
    console.log(chalk.dim(`\n${sessions.length} session(s) total`));
  } catch (err) {
    console.error(chalk.red(`Failed to list sessions: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria add — Add a manual session.
 */
export async function addSession(options) {
  ensureAuth();
  let { start, duration, notes, tags } = options;

  if (!start || !duration) {
    const answers = await inquirer.prompt([
      ...(!start
        ? [{
            type: 'input',
            name: 'start',
            message: 'Start time (ISO 8601, e.g. 2026-02-13T09:00:00Z):',
            validate: (v) => !isNaN(Date.parse(v)) || 'Invalid date format',
          }]
        : []),
      ...(!duration
        ? [{
            type: 'input',
            name: 'duration',
            message: 'Duration in minutes:',
            validate: (v) => (!isNaN(parseInt(v)) && parseInt(v) > 0) || 'Must be a positive number',
          }]
        : []),
    ]);
    start = start || answers.start;
    duration = duration || answers.duration;
  }

  // Convert duration from minutes to seconds
  const durationSeconds = parseInt(duration) * 60;
  const startTime = new Date(start).toISOString();
  const endTime = new Date(new Date(start).getTime() + durationSeconds * 1000).toISOString();

  // Notes and tags
  if (!notes || !tags) {
    const client = createClient();
    const tagsRes = await client.get('/api/tags');
    const availableTags = tagsRes.status === 200 && Array.isArray(tagsRes.data) ? tagsRes.data : [];

    const prompts = [];
    if (!notes) {
      prompts.push({
        type: 'input',
        name: 'notes',
        message: 'Notes (optional, press Enter to skip):',
      });
    }
    if (!tags && availableTags.length > 0) {
      prompts.push({
        type: 'checkbox',
        name: 'tags',
        message: 'Select tags:',
        choices: availableTags.map((t) => ({ name: t.name, value: t.id })),
      });
    }

    if (prompts.length > 0) {
      const answers = await inquirer.prompt(prompts);
      if (!notes && answers.notes) notes = answers.notes;
      if (!tags && answers.tags) tags = answers.tags.join(',');
    }
  }

  const payload = {
    startTime,
    durationSeconds,
    endTime,
  };
  if (notes) payload.notes = notes;
  if (tags) {
    payload.tags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : tags;
  }

  const client = createClient();

  try {
    const response = await client.post('/api/sessions', payload);
    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const session = response.data;
    console.log(chalk.green('✓ Session added!'));
    console.log(`  Start:    ${formatDateTime(session.startTime)}`);
    console.log(`  Duration: ${formatDuration(session.durationSeconds)}`);
    if (session.notes) console.log(`  Notes:    ${session.notes}`);
  } catch (err) {
    console.error(chalk.red(`Failed to add session: ${err.message}`));
    process.exit(1);
  }
}
