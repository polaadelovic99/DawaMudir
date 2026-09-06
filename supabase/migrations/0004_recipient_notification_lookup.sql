-- Fixed per M3 review before ever being applied: the original version had no relationship check,
-- so any authenticated user could harvest another user's notification_email by guessing/reading
-- their profile id (author_id is already publicly visible on listing detail pages) and calling
-- this RPC directly — no shared conversation required. Now it only returns data when the caller
-- shares a conversation with p_profile_id.
create or replace function get_notification_recipient(p_profile_id uuid)
returns table(notification_email text, email_notifications_enabled boolean, full_name text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from conversations c
    where (c.participant_a = auth.uid() and c.participant_b = p_profile_id)
       or (c.participant_b = auth.uid() and c.participant_a = p_profile_id)
  ) then
    return;
  end if;

  return query
    select profiles.notification_email, profiles.email_notifications_enabled, profiles.full_name
    from profiles
    where profiles.id = p_profile_id;
end;
$$;

revoke all on function get_notification_recipient(uuid) from public;
grant execute on function get_notification_recipient(uuid) to authenticated;
