-- RELICÁRIO • Banco de dados para mesas e inventários de RPG
-- Execute o arquivo completo UMA VEZ no SQL Editor de um projeto Supabase novo.
-- Auth > Providers > Email deve estar habilitado.

create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  system text not null default 'RPG' check (char_length(system) between 1 and 60),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_at timestamptz not null default now()
);

create table public.mesa_members (
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'jogador' check (role in ('mestre', 'jogador')),
  joined_at timestamptz not null default now(),
  primary key (mesa_id, user_id)
);

create table public.bags (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('grupo', 'personagem')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint bags_owner_kind check (
    (kind = 'grupo' and owner_id is null) or (kind = 'personagem' and owner_id is not null)
  )
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category text not null check (category in (
    'Armas','Armaduras','Equipamentos','Consumíveis','Magia','Componentes','Tesouros','Outros'
  )),
  quantity integer not null default 1 check (quantity between 1 and 1000000),
  value_po numeric(12,2) not null default 0 check (value_po >= 0),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bag_coins (
  bag_id uuid primary key references public.bags(id) on delete cascade,
  pc integer not null default 0 check (pc >= 0),
  pp integer not null default 0 check (pp >= 0),
  pe integer not null default 0 check (pe >= 0),
  po integer not null default 0 check (po >= 0),
  pl integer not null default 0 check (pl >= 0),
  updated_at timestamptz not null default now()
);

create table public.coin_moves (
  id uuid primary key default gen_random_uuid(),
  bag_id uuid not null references public.bags(id) on delete cascade,
  coin text not null check (coin in ('pc','pp','pe','po','pl')),
  delta integer not null check (delta <> 0),
  note text not null default '' check (char_length(note) <= 250),
  actor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_members_user on public.mesa_members(user_id);
create index idx_bags_mesa on public.bags(mesa_id);
create index idx_items_bag on public.items(bag_id);
create index idx_moves_bag_time on public.coin_moves(bag_id, created_at desc);

-- Funções de autorização. SECURITY DEFINER evita recursões em políticas RLS.
create or replace function public.is_mesa_member(p_mesa_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.mesa_members m
    where m.mesa_id = p_mesa_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_edit_bag(p_bag_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.bags b
    join public.mesa_members m on m.mesa_id = b.mesa_id
    where b.id = p_bag_id and m.user_id = (select auth.uid())
      and (m.role = 'mestre' or b.kind = 'grupo' or b.owner_id = (select auth.uid()))
  );
$$;

-- Cria carteira com saldo zero automaticamente para cada bolsa.
create or replace function public.init_bag_coins()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.bag_coins(bag_id) values (new.id);
  return new;
end;
$$;
create trigger trigger_init_bag_coins
  after insert on public.bags for each row execute function public.init_bag_coins();

-- SQL transacional: cria a mesa, inscreve o mestre e adiciona o baú compartilhado.
create or replace function public.create_mesa(p_name text, p_system text default 'RPG')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Entre na conta primeiro'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Nome da mesa deve ter entre 2 e 80 caracteres';
  end if;
  if char_length(btrim(coalesce(p_system, ''))) not between 1 and 60 then
    raise exception 'Informe um sistema de RPG';
  end if;
  insert into public.mesas(name, system, owner_id)
    values (btrim(p_name), btrim(p_system), v_user) returning id into v_id;
  insert into public.mesa_members(mesa_id, user_id, role)
    values (v_id, v_user, 'mestre');
  insert into public.bags(mesa_id, name, kind)
    values (v_id, 'Baú do grupo', 'grupo');
  return v_id;
end;
$$;

-- Código de convite: 12 caracteres hexadecimais aleatórios (48 bits).
create or replace function public.join_mesa(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Entre na conta primeiro'; end if;
  select id into v_id from public.mesas
    where invite_code = upper(btrim(coalesce(p_code, '')));
  if v_id is null then raise exception 'Código de convite inválido'; end if;
  insert into public.mesa_members(mesa_id, user_id, role)
    values (v_id, v_user, 'jogador') on conflict (mesa_id, user_id) do nothing;
  return v_id;
end;
$$;

-- Adição/subtração atômica de moedas: nunca permite saldo negativo.
create or replace function public.adjust_coins(
  p_bag_id uuid, p_coin text, p_delta integer, p_note text default ''
)
returns public.bag_coins language plpgsql security definer set search_path = ''
as $$
declare v_result public.bag_coins; v_note text := btrim(coalesce(p_note, ''));
begin
  if auth.uid() is null or not public.can_edit_bag(p_bag_id) then
    raise exception 'Sem permissão para alterar esta carteira';
  end if;
  if p_coin not in ('pc','pp','pe','po','pl') then
    raise exception 'Moeda inválida';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta::bigint) > 100000000 then
    raise exception 'Quantidade inválida';
  end if;
  if char_length(v_note) > 250 then raise exception 'Descrição muito longa'; end if;
  update public.bag_coins
  set pc = pc + case when p_coin = 'pc' then p_delta else 0 end,
      pp = pp + case when p_coin = 'pp' then p_delta else 0 end,
      pe = pe + case when p_coin = 'pe' then p_delta else 0 end,
      po = po + case when p_coin = 'po' then p_delta else 0 end,
      pl = pl + case when p_coin = 'pl' then p_delta else 0 end,
      updated_at = now()
  where bag_id = p_bag_id
    and (case p_coin
      when 'pc' then pc when 'pp' then pp when 'pe' then pe
      when 'po' then po when 'pl' then pl else 0 end)::bigint + p_delta >= 0
  returning * into v_result;
  if not found then raise exception 'Saldo insuficiente ou carteira não encontrada'; end if;
  insert into public.coin_moves(bag_id, coin, delta, note, actor_id)
    values (p_bag_id, p_coin, p_delta, v_note, auth.uid());
  return v_result;
end;
$$;

-- Row Level Security para todas as tabelas acessíveis no navegador.
alter table public.mesas enable row level security;
alter table public.mesa_members enable row level security;
alter table public.bags enable row level security;
alter table public.items enable row level security;
alter table public.bag_coins enable row level security;
alter table public.coin_moves enable row level security;

create policy "mesas: consultar participantes" on public.mesas
for select to authenticated using (public.is_mesa_member(id));
create policy "mesas: editar como mestre" on public.mesas
for update to authenticated using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
create policy "mesas: excluir como mestre" on public.mesas
for delete to authenticated using (owner_id = (select auth.uid()));

create policy "membros: consultar participantes" on public.mesa_members
for select to authenticated using (public.is_mesa_member(mesa_id));

create policy "bolsas: consultar participantes" on public.bags
for select to authenticated using (public.is_mesa_member(mesa_id));
create policy "bolsas: adicionar" on public.bags
for insert to authenticated with check (
  public.is_mesa_member(mesa_id)
  and ((kind = 'grupo' and owner_id is null) or
       (kind = 'personagem' and owner_id = (select auth.uid())))
);
create policy "bolsas: editar autorizado" on public.bags
for update to authenticated using (public.can_edit_bag(id))
with check (public.is_mesa_member(mesa_id) and (
  (kind = 'grupo' and owner_id is null) or
  (kind = 'personagem' and owner_id = (select auth.uid())) or
  (kind = 'personagem' and exists (
    select 1 from public.mesa_members m where m.mesa_id = bags.mesa_id
      and m.user_id = (select auth.uid()) and m.role = 'mestre'
  ))
));
create policy "bolsas: excluir autorizado" on public.bags
for delete to authenticated using (public.can_edit_bag(id));

create policy "itens: consultar membros" on public.items
for select to authenticated using (
  exists (select 1 from public.bags b where b.id = items.bag_id
    and public.is_mesa_member(b.mesa_id))
);
create policy "itens: incluir autorizado" on public.items
for insert to authenticated with check (public.can_edit_bag(bag_id));
create policy "itens: editar autorizado" on public.items
for update to authenticated using (public.can_edit_bag(bag_id))
with check (public.can_edit_bag(bag_id));
create policy "itens: excluir autorizado" on public.items
for delete to authenticated using (public.can_edit_bag(bag_id));

create policy "moedas: consultar membros" on public.bag_coins
for select to authenticated using (
  exists (select 1 from public.bags b where b.id = bag_coins.bag_id
    and public.is_mesa_member(b.mesa_id))
);
create policy "histórico: consultar membros" on public.coin_moves
for select to authenticated using (
  exists (select 1 from public.bags b where b.id = coin_moves.bag_id
    and public.is_mesa_member(b.mesa_id))
);

-- Permissões adicionais de segurança: carteira só é modificável via adjust_coins.
revoke all on public.mesas, public.mesa_members, public.bags, public.items,
  public.bag_coins, public.coin_moves from anon;
grant select, update, delete on public.mesas to authenticated;
grant select on public.mesa_members to authenticated;
grant select, insert, update, delete on public.bags to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select on public.bag_coins, public.coin_moves to authenticated;

revoke all on function public.create_mesa(text, text) from public, anon;
revoke all on function public.join_mesa(text) from public, anon;
revoke all on function public.adjust_coins(uuid, text, integer, text) from public, anon;
revoke all on function public.is_mesa_member(uuid) from public, anon;
revoke all on function public.can_edit_bag(uuid) from public, anon;
revoke all on function public.init_bag_coins() from public, anon;
grant execute on function public.create_mesa(text, text) to authenticated;
grant execute on function public.join_mesa(text) to authenticated;
grant execute on function public.adjust_coins(uuid, text, integer, text) to authenticated;
grant execute on function public.is_mesa_member(uuid) to authenticated;
grant execute on function public.can_edit_bag(uuid) to authenticated;
