-- DawaMudir — M5 deal confirmation hardening.
--
-- Deals are the gate for reviews, so raw INSERT/UPDATE access is too broad here. The only
-- authenticated write path is the scoped RPC below, which lets each participant confirm only
-- their own side of a conversation's terms.

drop policy if exists deals_insert_participant on deals;
drop policy if exists deals_update_participant on deals;

create unique index if not exists deals_conversation_id_key
  on deals(conversation_id)
  where conversation_id is not null;

create or replace function propose_or_confirm_deal(
  p_conversation_id uuid,
  p_agreed_salary int,
  p_duration_type text,
  p_duration_months int,
  p_start_date date
)
returns deals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation conversations%rowtype;
  v_listing listings%rowtype;
  v_other_participant uuid;
  v_owner_id uuid;
  v_pharmacist_id uuid;
  v_is_owner boolean;
  v_deal deals%rowtype;
begin
  select *
  into v_conversation
  from conversations
  where id = p_conversation_id;

  if not found
    or auth.uid() is null
    or (v_conversation.participant_a <> auth.uid() and v_conversation.participant_b <> auth.uid())
  then
    raise exception 'conversation_not_available';
  end if;

  if v_conversation.listing_id is null then
    raise exception 'deal_requires_listing';
  end if;

  select *
  into v_listing
  from listings
  where id = v_conversation.listing_id;

  if not found then
    raise exception 'deal_requires_listing';
  end if;

  if v_listing.author_id <> v_conversation.participant_a
    and v_listing.author_id <> v_conversation.participant_b
  then
    raise exception 'listing_author_not_participant';
  end if;

  v_other_participant := case
    when v_conversation.participant_a = v_listing.author_id then v_conversation.participant_b
    else v_conversation.participant_a
  end;

  if v_listing.kind = 'manager_wanted' then
    v_owner_id := v_listing.author_id;
    v_pharmacist_id := v_other_participant;
  elsif v_listing.kind = 'manager_available' then
    v_owner_id := v_other_participant;
    v_pharmacist_id := v_listing.author_id;
  else
    raise exception 'unsupported_listing_kind';
  end if;

  v_is_owner := auth.uid() = v_owner_id;

  select *
  into v_deal
  from deals
  where conversation_id = p_conversation_id
  for update;

  if found then
    if v_deal.status <> 'pending' then
      return v_deal;
    end if;

    if v_deal.owner_id <> v_owner_id or v_deal.pharmacist_id <> v_pharmacist_id then
      raise exception 'deal_participants_mismatch';
    end if;

    update deals
    set
      confirmed_by_owner = case when v_is_owner then true else confirmed_by_owner end,
      confirmed_by_pharmacist = case when v_is_owner then confirmed_by_pharmacist else true end,
      status = case
        when (case when v_is_owner then true else confirmed_by_owner end)
          and (case when v_is_owner then confirmed_by_pharmacist else true end)
        then 'confirmed'
        else status
      end
    where id = v_deal.id
    returning * into v_deal;

    return v_deal;
  end if;

  insert into deals (
    conversation_id,
    listing_id,
    owner_id,
    pharmacist_id,
    agreed_salary,
    duration_type,
    duration_months,
    start_date,
    confirmed_by_owner,
    confirmed_by_pharmacist,
    status
  )
  values (
    p_conversation_id,
    v_listing.id,
    v_owner_id,
    v_pharmacist_id,
    p_agreed_salary,
    p_duration_type,
    p_duration_months,
    p_start_date,
    v_is_owner,
    not v_is_owner,
    'pending'
  )
  returning * into v_deal;

  return v_deal;
exception
  when unique_violation then
    select *
    into v_deal
    from deals
    where conversation_id = p_conversation_id
    for update;

    if found then
      if v_deal.status <> 'pending' then
        return v_deal;
      end if;

      update deals
      set
        confirmed_by_owner = case when v_is_owner then true else confirmed_by_owner end,
        confirmed_by_pharmacist = case when v_is_owner then confirmed_by_pharmacist else true end,
        status = case
          when (case when v_is_owner then true else confirmed_by_owner end)
            and (case when v_is_owner then confirmed_by_pharmacist else true end)
          then 'confirmed'
          else status
        end
      where id = v_deal.id
      returning * into v_deal;

      return v_deal;
    end if;

    raise;
end;
$$;

revoke all on function propose_or_confirm_deal(uuid, int, text, int, date) from public;
grant execute on function propose_or_confirm_deal(uuid, int, text, int, date) to authenticated;
