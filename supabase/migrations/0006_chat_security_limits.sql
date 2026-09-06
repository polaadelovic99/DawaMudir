-- Tighten direct API conversation creation so it matches the app's startConversation checks:
-- a conversation can only be created for an active listing with the caller and that listing's author.
drop policy if exists conversations_insert_participant on conversations;

create policy conversations_insert_participant on conversations
  for insert with check (
    auth.uid() in (participant_a, participant_b)
    and listing_id is not null
    and exists (
      select 1
      from listings l
      where l.id = listing_id
        and l.status = 'active'
        and (
          (participant_a = auth.uid() and participant_b = l.author_id)
          or (participant_b = auth.uid() and participant_a = l.author_id)
        )
    )
  );

-- Chat bodies are capped at 4000 characters to keep threads usable and payloads bounded.
alter table messages
  add constraint messages_body_length_check check (char_length(body) <= 4000);
