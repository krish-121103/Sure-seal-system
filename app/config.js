// Sure Seal Production — connection settings.
//
// DEMO MODE:
// Set demo: true to test the entire system offline without a database.
// In Demo Mode, you can test all tabs (Batches, Formulas, Stock, Receiving, Costing, Reports)
// and switch between all roles (Owner, Manager, Production, Warehouse, Office).
//
// WHEN YOU ARE READY TO CONNECT THE REAL DATABASE:
// 1. Set demo: false (or remove it).
// 2. Fill in your project URL and anon key from Supabase (Project Settings → API).
// 3. NEVER put the service_role key here.
window.SS_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT-ID.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-PUBLIC-KEY',
  demo: true
};
