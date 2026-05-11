create table burden_factors (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) unique not null,
  label varchar(120) not null,
  category varchar(20) not null check (category in ('objective', 'subjective')),
  value_type varchar(20) not null check (value_type in ('number', 'boolean', 'level')),
  is_active boolean not null default true,
  sort_order int not null
);

create table burden_assessments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  admission_id uuid not null references admissions(id) on delete restrict,
  submitted_by uuid references nurses(id) on delete set null,
  status varchar(20) not null default 'draft' check (status in ('draft', 'submitted')),
  objective_total int not null default 0,
  subjective_total int not null default 0,
  total_score int not null default 0,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (shift_id, admission_id)
);

create table burden_values (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references burden_assessments(id) on delete cascade,
  factor_id uuid not null references burden_factors(id) on delete restrict,
  number_value numeric,
  boolean_value boolean,
  level_value int check (level_value in (0, 1, 2)),
  points int not null default 0,
  unique (assessment_id, factor_id),
  check (
    number_value is not null
    or boolean_value is not null
    or level_value is not null
  )
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  admission_id uuid not null references admissions(id) on delete restrict,
  assigned_nurse_id uuid references nurses(id) on delete set null,
  title text not null,
  kind varchar(20) not null check (kind in ('給藥', '檢查', '監測', '家屬', '紀錄')),
  urgent boolean not null default false,
  source varchar(20) not null default 'manual' check (source in ('order_import', 'manual', 'system')),
  status varchar(20) not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  completed_at timestamptz,
  completed_by uuid references nurses(id) on delete set null,
  created_at timestamptz not null default now()
);

create index burden_assessments_shift_lookup
  on burden_assessments (shift_id, status);

create index burden_assessments_submitter_lookup
  on burden_assessments (submitted_by, shift_id);

create index tasks_assignee_shift_lookup
  on tasks (assigned_nurse_id, shift_id, status);

create index tasks_admission_lookup
  on tasks (admission_id, shift_id);

