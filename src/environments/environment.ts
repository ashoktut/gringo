// Development environment configuration
// Add your Supabase credentials here from: https://supabase.com/dashboard/project/_/settings/api
// Note: The anon key is safe to commit (it's public), but the URL identifies your project
export const environment = {
  production: false,

  // Supabase Configuration (Free Tier)
  // Get these from Supabase Dashboard → Settings → API
  supabase: {
    url: 'https://usfavsmrweagnrcomgvo.supabase.co', // Replace with: https://your-project-id.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZmF2c21yd2VhZ25yY29tZ3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDc4NDcsImV4cCI6MjA3ODEyMzg0N30.Iol-FJnEKcOygVfpoAvGF9BnwSHJW4GtUadoGpBtwoY', // Replace with your anon/public key

    enabled: true, // Toggle cloud sync on/off
  },

  // Sync Settings
  sync: {
    autoSync: true, // Auto sync when online
    syncInterval: 30000, // Sync every 30 seconds when online
    conflictResolution: 'server-wins' as 'server-wins' | 'client-wins' | 'manual',
  },

  // Offline-First Settings
  offlineFirst: true, // Always use IndexedDB first, sync in background

  // Storage Settings
  storage: {
    indexedDbName: 'GringoDB',
    cacheSize: 50 * 1024 * 1024, // 50MB cache limit
  }
};
