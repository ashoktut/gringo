// Production environment configuration
// For production, set these values in your deployment platform (Netlify/Railway)
// as environment variables, or create a separate environment.prod.ts with real values
export const environment = {
  production: true,

  // Supabase Configuration (Free Tier)
  // These should match your production Supabase project
  supabase: {
    url: 'YOUR_SUPABASE_URL', // Set this in Netlify/Railway environment variables
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Set this in Netlify/Railway environment variables
    enabled: true,
  },

  // Sync Settings
  sync: {
    autoSync: true,
    syncInterval: 60000, // Sync every 60 seconds in production
    conflictResolution: 'server-wins' as 'server-wins' | 'client-wins' | 'manual',
  },

  // Offline-First Settings
  offlineFirst: true,

  // Storage Settings
  storage: {
    indexedDbName: 'GringoDB',
    cacheSize: 50 * 1024 * 1024, // 50MB cache limit
  }
};
