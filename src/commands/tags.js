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

/**
 * memoria tags list — List all tags.
 */
export async function listTags() {
  ensureAuth();
  const client = createClient();

  try {
    const response = await client.get('/api/tags');
    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const tags = response.data;

    if (!tags || tags.length === 0) {
      console.log(chalk.dim('No tags found. Create one with: memoria tags create'));
      return;
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('Name'),
        chalk.bold('Color'),
        chalk.bold('Created'),
      ],
    });

    for (const tag of tags) {
      table.push([
        chalk.dim(tag.id),
        tag.name,
        chalk.hex(tag.color)('██') + ' ' + tag.color,
        new Date(tag.createdAt).toLocaleDateString(),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    console.error(chalk.red(`Failed to list tags: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria tags create — Create a new tag.
 */
export async function createTag(options) {
  ensureAuth();
  let { name, color } = options;

  if (!name || !color) {
    const answers = await inquirer.prompt([
      ...(!name ? [{ type: 'input', name: 'name', message: 'Tag name:' }] : []),
      ...(!color
        ? [{
            type: 'input',
            name: 'color',
            message: 'Tag color (hex, e.g. #ff5733):',
            validate: (v) => /^#[0-9a-fA-F]{6}$/.test(v) || 'Must be a valid hex color (e.g. #ff5733)',
          }]
        : []),
    ]);
    name = name || answers.name;
    color = color || answers.color;
  }

  const client = createClient();

  try {
    const response = await client.post('/api/tags', { name, color });

    if (response.status === 409) {
      console.error(chalk.red(`✗ Tag "${name}" already exists.`));
      process.exit(1);
    }

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const tag = response.data;
    console.log(chalk.green('✓ Tag created!'));
    console.log(`  Name:  ${tag.name}`);
    console.log(`  Color: ${chalk.hex(tag.color)('██')} ${tag.color}`);
    console.log(`  ID:    ${chalk.dim(tag.id)}`);
  } catch (err) {
    console.error(chalk.red(`Failed to create tag: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria tags update — Update a tag.
 */
export async function updateTag(options) {
  ensureAuth();
  let { id, name, color } = options;

  if (!id) {
    // Show a list of existing tags for the user to pick
    const client = createClient();
    const tagsRes = await client.get('/api/tags');
    const tags = tagsRes.status === 200 && Array.isArray(tagsRes.data) ? tagsRes.data : [];

    if (tags.length === 0) {
      console.error(chalk.red('No tags found.'));
      process.exit(1);
    }

    const { selectedId } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedId',
      message: 'Select a tag to update:',
      choices: tags.map((t) => ({ name: `${t.name} (${t.color})`, value: t.id })),
    }]);
    id = selectedId;
  }

  if (!name || !color) {
    const answers = await inquirer.prompt([
      ...(!name ? [{ type: 'input', name: 'name', message: 'New tag name:' }] : []),
      ...(!color
        ? [{
            type: 'input',
            name: 'color',
            message: 'New tag color (hex, e.g. #ff5733):',
            validate: (v) => /^#[0-9a-fA-F]{6}$/.test(v) || 'Must be a valid hex color (e.g. #ff5733)',
          }]
        : []),
    ]);
    name = name || answers.name;
    color = color || answers.color;
  }

  const client = createClient();

  try {
    const response = await client.put(`/api/tags/${id}`, { name, color });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const tag = response.data;
    console.log(chalk.green('✓ Tag updated!'));
    console.log(`  Name:  ${tag.name}`);
    console.log(`  Color: ${chalk.hex(tag.color)('██')} ${tag.color}`);
  } catch (err) {
    console.error(chalk.red(`Failed to update tag: ${err.message}`));
    process.exit(1);
  }
}

/**
 * memoria tags delete — Delete a tag.
 */
export async function deleteTag(options) {
  ensureAuth();
  let { id, yes } = options;

  if (!id) {
    const client = createClient();
    const tagsRes = await client.get('/api/tags');
    const tags = tagsRes.status === 200 && Array.isArray(tagsRes.data) ? tagsRes.data : [];

    if (tags.length === 0) {
      console.error(chalk.red('No tags found.'));
      process.exit(1);
    }

    const { selectedId } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedId',
      message: 'Select a tag to delete:',
      choices: tags.map((t) => ({ name: `${t.name} (${t.color})`, value: t.id })),
    }]);
    id = selectedId;
  }

  if (!yes) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to delete this tag?',
      default: false,
    }]);
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'));
      return;
    }
  }

  const client = createClient();

  try {
    const response = await client.delete(`/api/tags/${id}`);

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    console.log(chalk.green('✓ Tag deleted.'));
  } catch (err) {
    console.error(chalk.red(`Failed to delete tag: ${err.message}`));
    process.exit(1);
  }
}
