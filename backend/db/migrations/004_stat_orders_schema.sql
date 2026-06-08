create table stat_orders (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  admission_id uuid not null references admissions(id) on delete restrict,
  title text not null,
  kind varchar(20) not null check (kind in ('給藥', '檢查', '監測', '治療', '其他')),
  ordered_by varchar(80) not null,
  ordered_at_display varchar(10) not null,
  reason text,
  status varchar(20) not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  severity varchar(10) not null default '中' check (severity in ('高', '中', '低')),
  created_at timestamptz not null default now()
);

create index stat_orders_shift_lookup
  on stat_orders (shift_id, status);

create index stat_orders_admission_lookup
  on stat_orders (admission_id, shift_id);
