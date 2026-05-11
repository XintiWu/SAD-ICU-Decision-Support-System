create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name varchar(80) not null,
  role varchar(20) not null check (role in ('nurse', 'charge_nurse', 'admin')),
  employee_no varchar(40) unique,
  created_at timestamptz not null default now()
);

create table nurses (
  id uuid primary key references users(id) on delete cascade,
  display_name varchar(80) not null,
  short_name varchar(40) not null,
  seniority_level varchar(20),
  is_active boolean not null default true
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  unit_name varchar(80) not null default 'ICU',
  shift_key varchar(20) not null check (shift_key in ('day', 'evening', 'night')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  charge_nurse_id uuid references nurses(id),
  status varchar(20) not null default 'open' check (status in ('open', 'allocating', 'confirmed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table shift_nurses (
  shift_id uuid not null references shifts(id) on delete cascade,
  nurse_id uuid not null references nurses(id) on delete restrict,
  role varchar(20) not null default 'nurse' check (role in ('nurse', 'charge_nurse')),
  primary key (shift_id, nurse_id)
);

create table beds (
  id uuid primary key default gen_random_uuid(),
  unit_name varchar(80) not null default 'ICU',
  bed_no int not null check (bed_no > 0),
  label varchar(20) not null,
  is_active boolean not null default true,
  unique (unit_name, bed_no),
  unique (unit_name, label)
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  medical_record_no varchar(40) unique,
  name varchar(80) not null,
  sex varchar(10) not null check (sex in ('男', '女')),
  birth_date date,
  created_at timestamptz not null default now()
);

create table admissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete restrict,
  bed_id uuid not null references beds(id) on delete restrict,
  diagnosis text not null,
  admitted_at date not null,
  attending_physician varchar(80) not null,
  status varchar(20) not null default 'active' check (status in ('active', 'transferred', 'discharged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index admissions_one_active_per_bed
  on admissions (bed_id)
  where status = 'active';

create index shifts_current_lookup
  on shifts (unit_name, starts_at, ends_at, status);

create index admissions_status_bed_lookup
  on admissions (status, bed_id);

create index shift_nurses_nurse_lookup
  on shift_nurses (nurse_id, shift_id);

