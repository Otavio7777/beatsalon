-- ============================================================
--  BeatSalon — Schema Supabase
--  Cole este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão de UUID
create extension if not exists "pgcrypto";

-- ─── SALÕES (multi-tenant) ───────────────────────────────────
create table if not exists salons (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name       text not null,
  owner_id   uuid references auth.users(id) on delete cascade,
  phone      text,
  address    text,
  plan       text default 'trial' -- trial, basic, pro
);

-- ─── CLIENTES ────────────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  salon_id      uuid references salons(id) on delete cascade not null,
  name          text not null,
  phone         text,
  email         text,
  canal         text default 'indicacao', -- instagram | google | indicacao | whatsapp | outro
  status        text default 'ativo',     -- ativo | em_risco | inativo
  first_visit   date,
  last_visit    date,
  visit_count   integer default 0,
  ltv           numeric(10,2) default 0,
  main_service  text,
  strategy      text,  -- upsell | retencao | reconquista
  notes         text,
  avatar_color  text default '#534AB7'
);

-- ─── MICRODATAS ──────────────────────────────────────────────
create table if not exists microdates (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  client_id   uuid references clients(id) on delete cascade not null,
  salon_id    uuid references salons(id) on delete cascade not null,
  title       text not null,       -- ex: "Aniversário da esposa"
  description text,                -- ex: "Antecipar corte, enviar mensagem"
  date        date not null,
  type        text default 'outro' -- aniversario | evento | reuniao | outro
);

-- ─── SERVIÇOS ────────────────────────────────────────────────
create table if not exists services (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid references salons(id) on delete cascade not null,
  name       text not null,
  price      numeric(10,2) default 0,
  duration   integer default 60, -- minutos
  color      text default '#534AB7',
  active     boolean default true
);

-- ─── AGENDAMENTOS ────────────────────────────────────────────
create table if not exists appointments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  salon_id    uuid references salons(id) on delete cascade not null,
  client_id   uuid references clients(id) on delete set null,
  service_id  uuid references services(id) on delete set null,
  client_name text,   -- fallback se client_id for nulo
  service_name text,  -- fallback
  date        timestamptz not null,
  value       numeric(10,2) default 0,
  status      text default 'agendado', -- agendado | concluido | cancelado | faltou
  notes       text
);

-- ─── PRODUTOS ────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  salon_id    uuid references salons(id) on delete cascade not null,
  name        text not null,
  category    text default 'capilar', -- capilar | barba | coloracao | skincare | outro
  price       numeric(10,2) default 0,
  cost        numeric(10,2) default 0,
  stock       integer default 0,
  min_stock   integer default 5,
  code        text,
  active      boolean default true
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table salons      enable row level security;
alter table clients     enable row level security;
alter table microdates  enable row level security;
alter table services    enable row level security;
alter table appointments enable row level security;
alter table products    enable row level security;

-- Salões: dono acessa apenas o próprio
create policy "Salão do próprio usuário"
  on salons for all
  using (owner_id = auth.uid());

-- Clientes: usuário acessa clientes do próprio salão
create policy "Clientes do salão"
  on clients for all
  using (
    salon_id in (
      select id from salons where owner_id = auth.uid()
    )
  );

-- Microdatas
create policy "Microdatas do salão"
  on microdates for all
  using (
    salon_id in (
      select id from salons where owner_id = auth.uid()
    )
  );

-- Serviços
create policy "Serviços do salão"
  on services for all
  using (
    salon_id in (
      select id from salons where owner_id = auth.uid()
    )
  );

-- Agendamentos
create policy "Agendamentos do salão"
  on appointments for all
  using (
    salon_id in (
      select id from salons where owner_id = auth.uid()
    )
  );

-- Produtos
create policy "Produtos do salão"
  on products for all
  using (
    salon_id in (
      select id from salons where owner_id = auth.uid()
    )
  );

-- ─── DADOS DE EXEMPLO ────────────────────────────────────────
-- (Rode isso após criar sua conta no Supabase e logar)
-- Substitua 'SEU-USER-ID' pelo seu ID de usuário (Dashboard > Auth > Users)

-- insert into salons (name, owner_id, phone) values
--   ('Meu Salão', 'SEU-USER-ID', '(31) 99999-9999');

-- ─── VIEWS ÚTEIS ────────────────────────────────────────────
-- View de clientes em risco (sem visita há mais de 30 dias)
create or replace view clients_at_risk as
  select *, 
    current_date - last_visit as days_since_visit
  from clients
  where last_visit < current_date - interval '30 days'
    and status != 'inativo';

-- View de microdatas dos próximos 30 dias
create or replace view upcoming_microdates as
  select m.*, c.name as client_name, c.phone as client_phone
  from microdates m
  join clients c on c.id = m.client_id
  where m.date between current_date and current_date + interval '30 days'
  order by m.date asc;
