-- DawaMudir — M3 addendum: mark-as-read + auto-bump conversations.last_message_at.
-- 0001 gave messages select+insert policies only; chat needs a way for a participant to mark
-- the other side's messages read, and the conversation list needs last_message_at kept current
-- without every call site remembering to update it by hand.

create policy messages_update_participant on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- SECURITY DEFINER: this is internal bookkeeping (same pattern as enforce_active_listing_cap in
-- 0001) — the sender has an insert policy on messages but no update policy on conversations, so
-- the trigger needs to bypass RLS to touch the conversation row.
create or replace function bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation_last_message();
