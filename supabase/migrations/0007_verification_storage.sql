-- DawaMudir — M4 verification storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-documents',
  'verification-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has RLS enabled by default on every Supabase project, and the
-- migration role is not its owner, so enabling it here fails on Supabase Cloud - only add policies.

create policy verification_documents_storage_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy verification_documents_storage_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy verification_documents_storage_select_admin
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and is_admin(auth.uid())
  );

-- Admin document approval promotes another user's profile after all required docs are approved.
create policy profiles_admin_update
  on profiles
  for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
