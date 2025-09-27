#!/usr/bin/env node

/**
 * ChatWii Migration Helper
 *
 * This script helps you manage your migration to new Supabase + ImageKit setup
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

function log(message, color = colors.reset) {
  console.log(colorize(message, color));
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function readEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      return fs.readFileSync(envPath, 'utf8');
    }
    return '';
  } catch (error) {
    return '';
  }
}

function writeEnvFile(content) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, content);
    return true;
  } catch (error) {
    log(`❌ Failed to write .env file: ${error.message}`, colors.red);
    return false;
  }
}

function parseEnvContent(content) {
  const env = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  return env;
}

function updateEnvVar(content, key, value) {
  const lines = content.split('\n');
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(`${key}=`) || line.startsWith(`# ${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }

  if (!found) {
    lines.push(`${key}=${value}`);
  }

  return lines.join('\n');
}

function getEnvironmentStatus() {
  const envContent = readEnvFile();
  const env = parseEnvContent(envContent);

  const status = {
    currentMode: env.VITE_SUPABASE_MODE || 'old',
    oldSupabase: {
      url: env.VITE_SUPABASE_URL,
      key: env.VITE_SUPABASE_ANON_KEY
    },
    newSupabase: {
      url: env.VITE_NEW_SUPABASE_URL,
      key: env.VITE_NEW_SUPABASE_ANON_KEY
    },
    imagekit: {
      endpoint: env.VITE_IMAGEKIT_URL_ENDPOINT,
      publicKey: env.VITE_IMAGEKIT_PUBLIC_KEY
    }
  };

  return status;
}

function displayStatus() {
  const status = getEnvironmentStatus();

  log('\n🔍 Current Environment Status', colors.bright + colors.cyan);
  log('=====================================', colors.cyan);

  log(`\n📊 Current Mode: ${status.currentMode}`, colors.bright);

  log('\n🗄️ Supabase Configuration:', colors.blue);
  log(`  OLD Supabase: ${status.oldSupabase.url ? '✅ Configured' : '❌ Not configured'}`,
      status.oldSupabase.url ? colors.green : colors.red);
  log(`  NEW Supabase: ${status.newSupabase.url ? '✅ Configured' : '❌ Not configured'}`,
      status.newSupabase.url ? colors.green : colors.red);

  log('\n🖼️ Image Storage:', colors.magenta);
  log(`  ImageKit: ${status.imagekit.endpoint ? '✅ Configured' : '❌ Not configured'}`,
      status.imagekit.endpoint ? colors.green : colors.red);
  log(`  Storage Mode: ${status.imagekit.endpoint ? 'ImageKit' : 'Supabase Storage'}`,
      status.imagekit.endpoint ? colors.green : colors.yellow);
}

async function setupNewSupabase() {
  log('\n🚀 Setting up NEW Supabase configuration', colors.bright + colors.green);
  log('========================================', colors.green);

  const url = await question('\n🔗 Enter your NEW Supabase URL: ');
  const key = await question('🔑 Enter your NEW Supabase Anon Key: ');

  if (!url || !key) {
    log('❌ Both URL and key are required', colors.red);
    return false;
  }

  let envContent = readEnvFile();
  envContent = updateEnvVar(envContent, 'VITE_NEW_SUPABASE_URL', url);
  envContent = updateEnvVar(envContent, 'VITE_NEW_SUPABASE_ANON_KEY', key);

  if (writeEnvFile(envContent)) {
    log('✅ New Supabase configuration saved!', colors.green);
    return true;
  }

  return false;
}

async function setupImageKit() {
  log('\n🖼️ Setting up ImageKit configuration', colors.bright + colors.magenta);
  log('===================================', colors.magenta);

  const endpoint = await question('\n🔗 Enter your ImageKit URL Endpoint: ');
  const publicKey = await question('🔑 Enter your ImageKit Public Key: ');

  if (!endpoint || !publicKey) {
    log('❌ Both endpoint and public key are required', colors.red);
    return false;
  }

  let envContent = readEnvFile();
  envContent = updateEnvVar(envContent, 'VITE_IMAGEKIT_URL_ENDPOINT', endpoint);
  envContent = updateEnvVar(envContent, 'VITE_IMAGEKIT_PUBLIC_KEY', publicKey);

  if (writeEnvFile(envContent)) {
    log('✅ ImageKit configuration saved!', colors.green);
    return true;
  }

  return false;
}

async function switchEnvironment() {
  const status = getEnvironmentStatus();

  log('\n🔄 Switch Supabase Environment', colors.bright + colors.yellow);
  log('==============================', colors.yellow);
  log(`Current mode: ${status.currentMode}`, colors.blue);

  const newMode = status.currentMode === 'old' ? 'new' : 'old';
  const confirm = await question(`\nSwitch to '${newMode}' Supabase? (y/N): `);

  if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
    let envContent = readEnvFile();
    envContent = updateEnvVar(envContent, 'VITE_SUPABASE_MODE', newMode);

    if (writeEnvFile(envContent)) {
      log(`✅ Switched to ${newMode} Supabase!`, colors.green);
      log('🔄 Please restart your development server: npm run dev', colors.cyan);
      return true;
    }
  }

  return false;
}

async function showMigrationPlan() {
  log('\n📋 Migration Plan', colors.bright + colors.cyan);
  log('================', colors.cyan);

  log(`
🎯 Recommended Migration Steps:

1️⃣ Setup New Supabase Project
   • Create new project at supabase.com
   • Run your COMPLETE_SUPABASE_SETUP.sql
   • Configure new credentials here

2️⃣ Setup ImageKit (Optional but Recommended)
   • Create account at imagekit.io
   • Get your URL endpoint and public key
   • Configure ImageKit credentials here

3️⃣ Test with Current Environment
   • Keep using old Supabase with new ImageKit
   • Test image uploads work with ImageKit

4️⃣ Switch to New Environment
   • Switch mode to 'new' when ready
   • All new data goes to new Supabase
   • Images still use ImageKit

5️⃣ Clean Up
   • Once satisfied, keep new setup
   • Remove old Supabase configuration
`, colors.blue);
}

async function main() {
  log('🚀 ChatWii Migration Helper', colors.bright + colors.cyan);
  log('============================', colors.cyan);

  while (true) {
    displayStatus();

    log('\n🛠️ What would you like to do?', colors.bright);
    log('1. Setup NEW Supabase configuration');
    log('2. Setup ImageKit configuration');
    log('3. Switch between OLD/NEW Supabase');
    log('4. Show migration plan');
    log('5. Exit');

    const choice = await question('\nEnter your choice (1-5): ');

    switch (choice) {
      case '1':
        await setupNewSupabase();
        break;
      case '2':
        await setupImageKit();
        break;
      case '3':
        await switchEnvironment();
        break;
      case '4':
        await showMigrationPlan();
        break;
      case '5':
        log('\n👋 Migration helper closed. Good luck with your migration!', colors.green);
        rl.close();
        return;
      default:
        log('\n❌ Invalid choice. Please try again.', colors.red);
    }

    log('\n' + '='.repeat(50));
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n👋 Migration helper closed.', colors.yellow);
  rl.close();
  process.exit(0);
});

// Run the script
main().catch(err => {
  log(`\n💥 Error: ${err.message}`, colors.red);
  rl.close();
  process.exit(1);
});