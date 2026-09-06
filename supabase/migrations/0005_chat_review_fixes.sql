-- DawaMudir — fixes from the M3 adversarial review (both my own read and an independent Codex
-- pass caught these before commit):
--
-- 1. BLOCKING: 0003's messages_update_participant policy let any participant rewrite ANY column
--    of ANY message in the conversation via raw REST (body, sender_id — not just read_at). Drop
--    it and replace the "mark as read" path with a SECURITY DEFINER RPC that can only ever touch
--    read_at on the caller's own inbound messages — no generic UPDATE grant on messages at all.
-- 2. Tightens the conversations table so two rows can never share the same participant twice.

drop policy if exists messages_update_participant on messages;

alter table conversations
  add constraint conversations_participants_distinct check (participant_a <> participant_b);

create or replace function mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from conversations c
    where c.id = p_conversation_id
      and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
  ) then
    return;
  end if;

  update messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

revoke all on function mark_conversation_read(uuid) from public;
grant execute on function mark_conversation_read(uuid) to authenticated;
