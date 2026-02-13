import chalk from 'chalk';
import { createClient, handleApiError } from '../api.js';
import { getToken } from '../config.js';

function ensureAuth() {
  if (!getToken()) {
    console.error(chalk.red('Not logged in. Run: memoria login'));
    process.exit(1);
  }
}

/**
 * memoria settings view — Show current user settings.
 */
export async function viewSettings() {
  ensureAuth();
  const client = createClient();

  try {
    const response = await client.get('/api/settings');
    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const settings = response.data;
    console.log(chalk.bold('Settings:'));
    console.log(`  Exclude Weekends: ${settings.excludeWeekends ? chalk.green('Yes') : chalk.red('No')}`);
  } catch (err) {
    console.error(chalk.red(`Failed to fetch settings: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria settings update — Update user settings.
 */
export async function updateSettings(options) {
  ensureAuth();
  const { excludeWeekends } = options;

  if (excludeWeekends === undefined) {
    console.error(chalk.red('✗ No settings to update. Use --exclude-weekends or --no-exclude-weekends.'));
    process.exit(1);
  }

  const client = createClient();

  try {
    const response = await client.patch('/api/settings', {
      excludeWeekends,
    });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const settings = response.data;
    console.log(chalk.green('✓ Settings updated!'));
    console.log(`  Exclude Weekends: ${settings.excludeWeekends ? chalk.green('Yes') : chalk.red('No')}`);
  } catch (err) {
    console.error(chalk.red(`Failed to update settings: ${err.message}`));
    process.exit(1);
  }
}
