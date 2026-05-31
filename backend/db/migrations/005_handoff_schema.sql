create table handoff_snapshots (
  id uuid primary key default gen_random_uuid(),
  allocation_run_id uuid not null unique references allocation_runs(id) on delete restrict,
  shift_id uuid not null references shifts(id) on delete cascade,
  created_by uuid references nurses(id) on delete set null,
  created_at timestamptz not null default now(),
  patient_count int not null default 0,
  nurse_count int not null default 0,
  stat_total int not null default 0,
  avg_load numeric(6, 1) not null default 0,
  max_load int not null default 0,
  unassigned_count int not null default 0,
  total_beds int not null default 0,
  total_nurses int not null default 0,
  nurse_blocks jsonb not null default '[]'::jsonb
);

create table handoff_rows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references handoff_snapshots(id) on delete cascade,
  admission_id uuid not null references admissions(id) on delete restrict,
  sort_order int not null default 0,
  bed_label varchar(40) not null,
  patient_name varchar(120) not null,
  diagnosis text not null,
  sex varchar(4) not null,
  age int not null,
  admitted_at date not null,
  attending_physician varchar(120) not null,
  current_nurse varchar(40) not null,
  next_nurse varchar(40) not null,
  burden_score int not null,
  handoff_diagnosis text not null,
  burden_detail text not null default '',
  unique (snapshot_id, admission_id)
);

create index handoff_snapshots_shift_lookup
  on handoff_snapshots (shift_id, created_at desc);

create index handoff_rows_snapshot_lookup
  on handoff_rows (snapshot_id, sort_order);
