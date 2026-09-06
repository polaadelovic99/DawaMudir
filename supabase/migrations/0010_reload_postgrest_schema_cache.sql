-- Force PostgREST to reload its schema cache. Migrations 0005-0009 applied cleanly via
-- `supabase db push` (a direct Postgres connection) but their new functions/bucket were not
-- visible through the REST/RPC API afterward - PostgREST's cache did not pick them up on its own.
notify pgrst, 'reload schema';
