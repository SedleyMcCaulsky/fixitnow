-- Add payment / escrow support for milestone releases
alter table milestones
  add column if not exists payment_intent_id text,
  add column if not exists payment_status text default 'UNPAID' check (payment_status in ('UNPAID', 'INTENT_CREATED', 'CAPTURED', 'FAILED')),
  add column if not exists payment_error text;

create index if not exists idx_milestones_payment_status on milestones(payment_status);
