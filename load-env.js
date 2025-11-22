// Script to load environment variables from .env file
// This runs before Angular build to inject env vars

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env file
const envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.warn('⚠️  Warning: .env file not found. Using default values.');
  console.log('   Copy .env.example to .env and add your Supabase credentials.');
  process.exit(0);
}

const envConfig = dotenv.config({ path: envPath });

if (envConfig.error) {
  console.error('❌ Error loading .env file:', envConfig.error);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

// Validate required variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables in .env:');
  if (!SUPABASE_URL) console.error('   - SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) console.error('   - SUPABASE_ANON_KEY');
  console.log('\n   Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

// Check if using placeholder values
if (SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  console.warn('⚠️  Warning: Using placeholder values in .env');
  console.log('   Replace with actual Supabase credentials for cloud sync to work.');
}

console.log('✅ Environment variables loaded successfully');
console.log(`   SUPABASE_URL: ${SUPABASE_URL.substring(0, 30)}...`);
console.log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
