-- DawaMudir — M3 addendum: optional notification email (PRD §6 wants email + Web Push chat
-- notifications; auth is phone-only, so there is no email anywhere in the schema yet — this
-- column is opt-in and separate from auth, never required).

alter table profiles
  add column notification_email text,
  add column email_notifications_enabled boolean not null default true;

-- Same owner-only visibility as the rest of profiles — no new RLS policy needed, the existing
-- profiles_select_own_or_admin / profiles_update_own policies already cover these columns.
