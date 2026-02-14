#!/usr/bin/env node

import { Command } from 'commander';
import { login, register, logout, whoami, changePassword } from './commands/auth.js';
import { startSession, stopSession, sessionStatus, listSessions, addSession } from './commands/sessions.js';
import { listTags, createTag, updateTag, deleteTag } from './commands/tags.js';
import { viewSettings, updateSettings } from './commands/settings.js';
import { setBaseUrl, getBaseUrl } from './config.js';

const program = new Command();

program
  .name('memoria')
  .description('CLI tool for Memoria time tracking')
  .version('1.0.0');

// ─── Auth Commands ────────────────────────────────────────────────

program
  .command('login')
  .description('Login to your Memoria account')
  .option('-e, --email <email>', 'Account email')
  .option('-p, --password <password>', 'Account password')
  .action(login);

program
  .command('register')
  .description('Register a new Memoria account')
  .option('-e, --email <email>', 'Account email')
  .option('-p, --password <password>', 'Account password')
  .option('-n, --name <name>', 'Your name')
  .action(register);

program
  .command('logout')
  .description('Logout from your Memoria account')
  .action(logout);

program
  .command('whoami')
  .description('Show current logged-in user')
  .action(whoami);

program
  .command('password')
  .description('Change your password')
  .option('--current-password <password>', 'Current password')
  .option('--new-password <password>', 'New password')
  .action(changePassword);

// ─── Session Commands ─────────────────────────────────────────────

program
  .command('start')
  .description('Start a new tracking session')
  .action(startSession);

program
  .command('stop')
  .description('Stop and resolve the current session')
  .option('-s, --save', 'Save the session with notes and tags')
  .option('-d, --discard', 'Discard the session')
  .option('-n, --notes <notes>', 'Required session notes (used with --save)')
  .option('-t, --tags <tags>', 'Required comma-separated tag names (used with --save)')
  .action(stopSession);

program
  .command('status')
  .description('Show current session status')
  .action(sessionStatus);

program
  .command('list')
  .description('List all sessions')
  .action(listSessions);

program
  .command('add')
  .description('Add a manual session')
  .option('-s, --start <datetime>', 'Start time (ISO 8601)')
  .option('-d, --duration <minutes>', 'Duration in minutes')
  .option('-n, --notes <notes>', 'Session notes')
  .option('-t, --tags <tags>', 'Comma-separated tag IDs')
  .action(addSession);

// ─── Tags Commands ────────────────────────────────────────────────

const tagsCmd = program
  .command('tags')
  .description('Manage tags');

tagsCmd
  .command('list')
  .description('List all tags')
  .action(listTags);

tagsCmd
  .command('create')
  .description('Create a new tag')
  .option('-n, --name <name>', 'Tag name')
  .option('-c, --color <color>', 'Tag color (hex, e.g. #ff5733)')
  .action(createTag);

tagsCmd
  .command('update')
  .description('Update a tag')
  .option('--id <id>', 'Tag ID')
  .option('-n, --name <name>', 'New tag name')
  .option('-c, --color <color>', 'New tag color (hex)')
  .action(updateTag);

tagsCmd
  .command('delete')
  .description('Delete a tag')
  .option('--id <id>', 'Tag ID')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(deleteTag);

// ─── Settings Commands ────────────────────────────────────────────

const settingsCmd = program
  .command('settings')
  .description('Manage user settings');

settingsCmd
  .command('view')
  .description('View current settings')
  .action(viewSettings);

settingsCmd
  .command('update')
  .description('Update settings')
  .option('--exclude-weekends', 'Exclude weekends from tracking')
  .option('--no-exclude-weekends', 'Include weekends in tracking')
  .action(updateSettings);

// ─── Config Command ───────────────────────────────────────────────

program
  .command('config')
  .description('Configure CLI settings')
  .option('--set-url <url>', 'Set the API base URL')
  .option('--get-url', 'Show the current API base URL')
  .action((options) => {
    if (options.setUrl) {
      setBaseUrl(options.setUrl);
      console.log(`API base URL set to: ${options.setUrl}`);
    } else if (options.getUrl) {
      console.log(`API base URL: ${getBaseUrl()}`);
    } else {
      console.log(`API base URL: ${getBaseUrl()}`);
    }
  });

program.parse();
