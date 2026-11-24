alter table public.training_slots
  alter column location set default 'Nyagisenyi';

with venue_order as (
  select array[
    'Nyagisenyi',
    'Umuganda',
    'Mumena',
    'Mironko',
    'Gatwaro',
    'Nzove'
  ]::text[] as locations
),
eligible_slots as (
  select
    slot.id,
    row_number() over (order by slot.training_date, slot.starts_at, slot.id) as sequence
  from public.training_slots as slot
  where (
      slot.training_date > current_date
      or (slot.training_date = current_date and slot.starts_at > localtime)
    )
    and not exists (
      select 1
      from public.bookings as booking
      where booking.slot_id = slot.id
        and booking.status = 'confirmed'
    )
),
rotating_locations as (
  select
    eligible_slots.id,
    venue_order.locations[((eligible_slots.sequence - 1) % array_length(venue_order.locations, 1) + 1)::integer] as location
  from eligible_slots
  cross join venue_order
)
update public.training_slots as slot
set location = rotating_locations.location
from rotating_locations
where slot.id = rotating_locations.id;
