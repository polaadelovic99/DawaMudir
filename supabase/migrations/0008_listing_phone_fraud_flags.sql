-- DawaMudir — M4 anti-fraud: detect repeated Egyptian mobile numbers in listing notes.

alter table listings
  add column detected_phone text;

create index listings_detected_phone_idx
  on listings(detected_phone)
  where detected_phone is not null;

create or replace function extract_egypt_phone(input text)
returns text
language plpgsql
immutable
as $$
declare
  v_compact text;
  v_match text;
begin
  if input is null then
    return null;
  end if;

  v_compact := translate(input, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  v_compact := regexp_replace(v_compact, '[\s().-]+', '', 'g');
  v_match := substring(v_compact from '(?:\+?20|0)?1[0125][0-9]{8}');

  if v_match is null then
    return null;
  end if;

  v_match := regexp_replace(v_match, '^\+?20', '');
  v_match := regexp_replace(v_match, '^0', '');

  return '0' || v_match;
end;
$$;

create or replace function set_listing_detected_phone()
returns trigger
language plpgsql
as $$
begin
  new.detected_phone := extract_egypt_phone(new.notes);
  return new;
end;
$$;

create trigger listings_set_detected_phone
  before insert or update on listings
  for each row execute function set_listing_detected_phone();

create or replace function flag_listing_phone_reuse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflicting_listing_ids uuid[];
begin
  if new.detected_phone is null then
    return null;
  end if;

  if tg_op = 'UPDATE'
    and old.detected_phone is not distinct from new.detected_phone
    and old.author_id is not distinct from new.author_id then
    return null;
  end if;

  select array_agg(l.id order by l.created_at asc)
  into v_conflicting_listing_ids
  from listings l
  where l.detected_phone = new.detected_phone
    and l.author_id <> new.author_id
    and l.id <> new.id;

  if coalesce(array_length(v_conflicting_listing_ids, 1), 0) = 0 then
    return null;
  end if;

  -- Keep one open triage item per listing so repeated edits do not spam the admin queue.
  if exists (
    select 1
    from fraud_flags f
    where f.kind = 'phone_reuse_in_listing_text'
      and f.target_type = 'listing'
      and f.target_id = new.id
      and f.status = 'open'
  ) then
    return null;
  end if;

  insert into fraud_flags (kind, target_type, target_id, detail)
  values (
    'phone_reuse_in_listing_text',
    'listing',
    new.id,
    jsonb_build_object(
      'phone', new.detected_phone,
      'conflicting_listing_ids', v_conflicting_listing_ids
    )
  );

  return null;
end;
$$;

create trigger listings_flag_phone_reuse
  after insert or update on listings
  for each row execute function flag_listing_phone_reuse();

update listings
set detected_phone = extract_egypt_phone(notes);

revoke all on function extract_egypt_phone(text) from public;
grant execute on function extract_egypt_phone(text) to authenticated;
