create table allocation_runs (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  target_shift_id uuid references shifts(id) on delete set null,
  created_by uuid references nurses(id) on delete set null,
  status varchar(20) not null default 'draft' check (status in ('draft', 'confirmed', 'cancelled')),
  algorithm_version varchar(40),
  suggested_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table allocation_items (
  id uuid primary key default gen_random_uuid(),
  allocation_run_id uuid not null references allocation_runs(id) on delete cascade,
  admission_id uuid not null references admissions(id) on delete restrict,
  nurse_id uuid not null references nurses(id) on delete restrict,
  score int not null,
  sort_order int not null default 0,
  is_manual_override boolean not null default false,
  unique (allocation_run_id, admission_id)
);

create index allocation_runs_shift_lookup
  on allocation_runs (shift_id, status, suggested_at desc);

create index allocation_items_nurse_lookup
  on allocation_items (allocation_run_id, nurse_id, sort_order);

