-- Ensure failure_code/failure_message columns exist on payments. Code paths
-- (pawapay callbacks, subscribe/request initiators) write to them; without
-- the columns the values are silently dropped and the admin "Raison échec"
-- column stays empty.

alter table public.payments
  add column if not exists failure_code text,
  add column if not exists failure_message text;

create index if not exists payments_failure_code_idx
  on public.payments (failure_code)
  where failure_code is not null;
