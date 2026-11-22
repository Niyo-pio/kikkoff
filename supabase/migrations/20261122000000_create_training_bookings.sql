create extension if not exists pgcrypto;

create table if not exists public.training_slots (
  id uuid primary key default gen_random_uuid(),
  session_name text not null,
  training_date date not null,
  starts_at time not null,
  duration_minutes integer not null default 90 check (duration_minutes > 0),
  capacity integer not null default 18 check (capacity > 0),
  location text not null default 'Club Ground',
  created_at timestamptz not null default now(),
  unique (training_date, starts_at, session_name)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.training_slots(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (slot_id, member_id)
);

create index if not exists bookings_member_status_idx
  on public.bookings (member_id, status);

alter table public.training_slots enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Members can view training slots" on public.training_slots;
create policy "Members can view training slots"
  on public.training_slots for select
  to authenticated
  using (true);

drop policy if exists "Members can view their own bookings" on public.bookings;
create policy "Members can view their own bookings"
  on public.bookings for select
  to authenticated
  using (member_id = (select auth.uid()));

create or replace function public.get_available_training_slots()
returns table (
  slot_id uuid,
  session_name text,
  training_date date,
  starts_at time,
  duration_minutes integer,
  capacity integer,
  location text,
  spots_left integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    slot.id,
    slot.session_name,
    slot.training_date,
    slot.starts_at,
    slot.duration_minutes,
    slot.capacity,
    slot.location,
    (slot.capacity - count(booking.id))::integer as spots_left
  from public.training_slots as slot
  left join public.bookings as booking
    on booking.slot_id = slot.id
    and booking.status = 'confirmed'
  where
    slot.training_date > current_date
    or (slot.training_date = current_date and slot.starts_at > localtime)
  group by slot.id
  having count(booking.id) < slot.capacity
  order by slot.training_date, slot.starts_at;
$$;

create or replace function public.book_training_slot(p_slot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_member_id uuid := auth.uid();
  selected_slot public.training_slots%rowtype;
  active_bookings integer;
  new_booking_id uuid;
begin
  if current_member_id is null then
    raise exception using errcode = '28000', message = 'sign_in_required';
  end if;

  select *
    into selected_slot
    from public.training_slots
    where id = p_slot_id
    for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'slot_not_found';
  end if;

  if selected_slot.training_date < current_date
    or (selected_slot.training_date = current_date and selected_slot.starts_at <= localtime) then
    raise exception using errcode = 'P0001', message = 'slot_has_passed';
  end if;

  if exists (
    select 1
      from public.bookings
      where slot_id = p_slot_id
        and member_id = current_member_id
        and status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'booking_exists';
  end if;

  select count(*)::integer
    into active_bookings
    from public.bookings
    where slot_id = p_slot_id
      and status = 'confirmed';

  if active_bookings >= selected_slot.capacity then
    raise exception using errcode = 'P0001', message = 'slot_full';
  end if;

  insert into public.bookings (slot_id, member_id)
    values (p_slot_id, current_member_id)
    returning id into new_booking_id;

  return new_booking_id;
end;
$$;

revoke all on function public.get_available_training_slots() from public;
revoke all on function public.book_training_slot(uuid) from public;
grant execute on function public.get_available_training_slots() to authenticated;
grant execute on function public.book_training_slot(uuid) to authenticated;
grant select on public.training_slots, public.bookings to authenticated;

with upcoming_dates as (
  select generate_series(
    current_date + 1,
    current_date + 56,
    interval '1 day'
  )::date as training_date
),
weekly_sessions as (
  select training_date, time '19:00' as starts_at
    from upcoming_dates
    where extract(isodow from training_date) in (2, 4)
  union all
  select training_date, time '10:00' as starts_at
    from upcoming_dates
    where extract(isodow from training_date) = 6
)
insert into public.training_slots (
  session_name,
  training_date,
  starts_at,
  duration_minutes,
  capacity,
  location
)
select
  'First team training',
  training_date,
  starts_at,
  90,
  18,
  'Club Ground'
from weekly_sessions
on conflict (training_date, starts_at, session_name) do nothing;
