#!/usr/bin/env node

/**
 * ChatWii Supabase Configuration Updater
 *
 * This script helps you update all environment files with new Supabase credentials
 * after migrating to a new Supabase project.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better output
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

// Environment files to check and update
const envFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development'
];

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

function readEnvFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return '';
  }
}

function writeEnvFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (err) {
    log(`❌ Failed to write ${filePath}: ${err.message}`, colors.red);
    return false;
  }
}

function updateEnvContent(content, url, anonKey) {
  // Replace existing values or add new ones
  let updatedContent = content;

  const urlPattern = /^VITE_SUPABASE_URL=.*$/m;
  const keyPattern = /^VITE_SUPABASE_ANON_KEY=.*$/m;

  if (urlPattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(urlPattern, `VITE_SUPABASE_URL=${url}`);
  } else {
    updatedContent += `\nVITE_SUPABASE_URL=${url}`;
  }

  if (keyPattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(keyPattern, `VITE_SUPABASE_ANON_KEY=${anonKey}`);
  } else {
    updatedContent += `\nVITE_SUPABASE_ANON_KEY=${anonKey}`;
  }

  // Clean up any extra newlines
  updatedContent = updatedContent.replace(/\n\n\n+/g, '\n\n').trim() + '\n';

  return updatedContent;
}

function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes('supabase.co') || parsedUrl.hostname.includes('localhost');
  } catch {
    return false;
  }
}

function validateAnonKey(key) {
  // Supabase anon keys are typically JWT tokens starting with 'eyJ'
  return typeof key === 'string' && key.length > 100 && key.startsWith('eyJ');
}

async function main() {
  log('🚀 ChatWii Supabase Configuration Updater', colors.bright + colors.cyan);
  log('==========================================', colors.cyan);
  log('');

  log('This script will help you update your Supabase configuration after migration.', colors.yellow);
  log('');

  // Get new Supabase credentials
  log('📝 Enter your NEW Supabase project credentials:', colors.bright);
  log('   (You can find these in: Settings → API in your Supabase dashboard)', colors.blue);
  log('');

  let supabaseUrl;
  do {
    supabaseUrl = await question('🔗 New Supabase URL: ');
    if (!validateUrl(supabaseUrl)) {
      log('❌ Invalid URL format. Please enter a valid Supabase URL (e.g., https://your-project.supabase.co)', colors.red);
    }
  } while (!validateUrl(supabaseUrl));

  let anonKey;
  do {
    anonKey = await question('🔑 New Anon/Public Key: ');
    if (!validateAnonKey(anonKey)) {
      log('❌ Invalid anon key format. Please enter a valid Supabase anon key (should be a long JWT token)', colors.red);
    }
  } while (!validateAnonKey(anonKey));

  log('');
  log('🔍 Scanning for environment files...', colors.yellow);

  // Check which env files exist
  const existingFiles = envFiles.filter(file => fileExists(file));

  if (existingFiles.length === 0) {
    log('⚠️  No environment files found. Creating .env file...', colors.yellow);
    existingFiles.push('.env');
  }

  log(`📁 Found ${existingFiles.length} environment file(s):`, colors.green);
  existingFiles.forEach(file => {
    log(`   - ${file}`, colors.cyan);
  });
  log('');

  // Ask for confirmation
  const confirm = await question('✅ Update these files with the new credentials? (y/N): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    log('❌ Operation cancelled.', colors.red);
    rl.close();
    return;
  }

  log('');
  log('🔄 Updating environment files...', colors.yellow);

  let successCount = 0;

  for (const file of existingFiles) {
    const currentContent = readEnvFile(file);
    const updatedContent = updateEnvContent(currentContent, supabaseUrl, anonKey);

    if (writeEnvFile(file, updatedContent)) {
      log(`✅ Updated ${file}`, colors.green);
      successCount++;
    }
  }

  log('');

  if (successCount === existingFiles.length) {
    log('🎉 All environment files updated successfully!', colors.bright + colors.green);
    log('');
    log('📋 Next steps:', colors.bright);
    log('   1. Restart your development server', colors.cyan);
    log('   2. Test your application with the new database', colors.cyan);
    log('   3. Verify all features are working correctly', colors.cyan);
    log('');
    log('💡 If you encounter issues, check the SUPABASE_MIGRATION_GUIDE.md', colors.blue);
  } else {
    log('⚠️  Some files could not be updated. Please check the error messages above.', colors.yellow);
  }

  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\\n❌ Operation cancelled by user.', colors.red);
  rl.close();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  log(`\\n💥 Unexpected error: ${err.message}`, colors.red);
  rl.close();
  process.exit(1);
});

// Run the script
main().catch(err => {
  log(`\\n💥 Error: ${err.message}`, colors.red);
  rl.close();
  process.exit(1);
});