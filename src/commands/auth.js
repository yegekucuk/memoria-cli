import chalk from 'chalk';
import inquirer from 'inquirer';
import { createPublicClient, createClient, handleApiError } from '../api.js';
import { saveToken, clearToken, parseTokenFromCookies, getToken } from '../config.js';

export async function login(options) {
  let { email, password } = options;

  if (!email || !password) {
    const answers = await inquirer.prompt([
      ...(!email ? [{ type: 'input', name: 'email', message: 'Email:' }] : []),
      ...(!password ? [{ type: 'password', name: 'password', message: 'Password:', mask: '*' }] : []),
    ]);
    email = email || answers.email;
    password = password || answers.password;
  }

  const client = createPublicClient();

  try {
    const response = await client.post('/api/auth/login', { email, password });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    // Extract token from Set-Cookie header
    const setCookie = response.headers['set-cookie'];
    const token = parseTokenFromCookies(setCookie);

    if (!token) {
      console.error(chalk.red('Failed to extract authentication token from response.'));
      process.exit(1);
    }

    saveToken(token);

    const user = response.data.user;
    console.log(chalk.green('✓ Logged in successfully!'));
    console.log(chalk.dim(`  Welcome, ${user.name || user.email}`));
  } catch (err) {
    console.error(chalk.red(`Login failed: ${err.message}`));
    process.exit(1);
  }
}

export async function register(options) {
  let { email, password, name } = options;

  if (!email || !password || !name) {
    const answers = await inquirer.prompt([
      ...(!name ? [{ type: 'input', name: 'name', message: 'Name:' }] : []),
      ...(!email ? [{ type: 'input', name: 'email', message: 'Email:' }] : []),
      ...(!password ? [{ type: 'password', name: 'password', message: 'Password:', mask: '*' }] : []),
      ...(!password ? [{ type: 'password', name: 'confirmPassword', message: 'Confirm Password:', mask: '*' }] : []),
    ]);
    name = name || answers.name;
    email = email || answers.email;
    password = password || answers.password;

    if (answers.confirmPassword && password !== answers.confirmPassword) {
      console.error(chalk.red('Passwords do not match.'));
      process.exit(1);
    }
  }

  const client = createPublicClient();

  try {
    const response = await client.post('/api/auth/register', {
      name,
      email,
      password,
      confirmPassword: password,
    });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    // Extract token from Set-Cookie header if the server sets it on registration
    const setCookie = response.headers['set-cookie'];
    const token = parseTokenFromCookies(setCookie);
    if (token) {
      saveToken(token);
    }

    const user = response.data.user;
    console.log(chalk.green('✓ Registered successfully!'));
    console.log(chalk.dim(`  Welcome, ${user.name || user.email}`));
    if (!token) {
      console.log(chalk.dim('  Please login with: memoria login'));
    }
  } catch (err) {
    console.error(chalk.red(`Registration failed: ${err.message}`));
    process.exit(1);
  }
}

export async function logout() {
  const token = getToken();
  if (!token) {
    console.log(chalk.yellow('Not logged in.'));
    return;
  }

  const client = createClient();

  try {
    await client.post('/api/auth/logout');
  } catch {
    // Ignore errors on logout request
  }

  clearToken();
  console.log(chalk.green('✓ Logged out successfully.'));
}

export async function whoami() {
  const token = getToken();
  if (!token) {
    console.error(chalk.red('Not logged in. Run: memoria login'));
    process.exit(1);
  }

  const client = createClient();

  try {
    const response = await client.get('/api/auth/me');

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    const user = response.data.user;
    console.log(chalk.bold('Current User:'));
    console.log(`  Name:    ${user.name || chalk.dim('(not set)')}`);
    console.log(`  Email:   ${user.email}`);
    console.log(`  ID:      ${chalk.dim(user.id)}`);
    console.log(`  Joined:  ${new Date(user.createdAt).toLocaleDateString()}`);
  } catch (err) {
    console.error(chalk.red(`Failed to fetch user info: ${err.message}`));
    process.exit(1);
  }
}

export async function changePassword(options) {
  let { currentPassword, newPassword } = options;

  if (!currentPassword || !newPassword) {
    const answers = await inquirer.prompt([
      ...(!currentPassword ? [{ type: 'password', name: 'currentPassword', message: 'Current Password:', mask: '*' }] : []),
      ...(!newPassword ? [{ type: 'password', name: 'newPassword', message: 'New Password:', mask: '*' }] : []),
      ...(!newPassword ? [{ type: 'password', name: 'confirmNewPassword', message: 'Confirm New Password:', mask: '*' }] : []),
    ]);
    currentPassword = currentPassword || answers.currentPassword;
    newPassword = newPassword || answers.newPassword;

    if (answers.confirmNewPassword && newPassword !== answers.confirmNewPassword) {
      console.error(chalk.red('Passwords do not match.'));
      process.exit(1);
    }
  }

  const client = createClient();

  try {
    const response = await client.post('/api/auth/password', {
      currentPassword,
      newPassword,
    });

    if (response.status !== 200) {
      handleApiError(response);
      process.exit(1);
    }

    console.log(chalk.green('✓ Password changed successfully.'));
  } catch (err) {
    console.error(chalk.red(`Failed to change password: ${err.message}`));
    process.exit(1);
  }
}
