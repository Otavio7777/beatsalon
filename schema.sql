-- BeatSalon Schema
create extension if not exists "pgcrypto";
create table if not exists salons (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), name text not null, owner_id uuid references auth.users(id) on delete cascade, phone text, address text, plan text default 'trial');
create table if not exists clients (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), salon_id uuid references salons(id) on delete cascade not null, name text not null, phone text, email text, canal text default 'indicacao', status text default 'ativo', first_visit date, last_visit date, visit_count integer default 0, ltv numeric(10,2) default 0, main_service text, strategy text, notes text, avatar_color text default '#534AB7');
create table if not exists microdates (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), client_id uuid references clients(id) on delete cascade not null, salon_id uuid references salons(id) on delete cascade not null, title text not null, description text, date date not null, type text default 'outro');
alter table salons enable row level security; alter table clients enable row level security; alter table microdates enable row level security;
create policy "Salons owner" on salons for all using (owner_id = auth.uid());
create policy "Clients owner" on clients for all using (salon_id in (select id from salons where owner_id = auth.uid()));
create policy "Microdates owner" on microdates for all using (salon_id in (select id from salons where owner_id = auth.uid()));