-- RELICÁRIO v1.3 - FICHA VINCULADA À BOLSA DE PERSONAGEM
-- Execute somente este arquivo no SQL Editor do SEU projeto Supabase existente.
-- Não recria nem apaga bolsas, itens, moedas, grimórios ou mesas.
-- Uma ficha por bolsa individual. A permissão é herdada da bolsa.

create table if not exists public.character_sheets (
  bag_id uuid primary key references public.bags(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  class_name text not null default '' check (char_length(class_name) <= 160),
  subclass text not null default '' check (char_length(subclass) <= 120),
  species text not null default '' check (char_length(species) <= 120),
  background text not null default '' check (char_length(background) <= 120),
  alignment text not null default '' check (char_length(alignment) <= 80),
  level integer not null default 1 check (level between 1 and 20),
  experience integer not null default 0 check (experience between 0 and 100000000),
  proficiency_override integer check (proficiency_override between 0 and 20),
  inspiration boolean not null default false,
  abilities jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb check (jsonb_typeof(abilities) = 'object'),
  save_proficiencies jsonb not null default '{}'::jsonb check (jsonb_typeof(save_proficiencies) = 'object'),
  skill_proficiencies jsonb not null default '{}'::jsonb check (jsonb_typeof(skill_proficiencies) = 'object'),
  armor_class integer not null default 10 check (armor_class between 0 and 99),
  speed integer not null default 9 check (speed between 0 and 999),
  initiative_bonus integer not null default 0 check (initiative_bonus between -99 and 99),
  hp_max integer not null default 10 check (hp_max between 1 and 99999),
  hp_current integer not null default 10 check (hp_current between 0 and 99999),
  hp_temp integer not null default 0 check (hp_temp between 0 and 99999),
  hit_dice text not null default '1d8' check (char_length(hit_dice) <= 60),
  hit_dice_spent integer not null default 0 check (hit_dice_spent between 0 and 999),
  death_successes integer not null default 0 check (death_successes between 0 and 3),
  death_failures integer not null default 0 check (death_failures between 0 and 3),
  conditions text not null default '' check (char_length(conditions) <= 1200),
  attacks text not null default '' check (char_length(attacks) <= 4000),
  proficiencies text not null default '' check (char_length(proficiencies) <= 4000),
  features text not null default '' check (char_length(features) <= 10000),
  appearance text not null default '' check (char_length(appearance) <= 4000),
  backstory text not null default '' check (char_length(backstory) <= 8000),
  notes text not null default '' check (char_length(notes) <= 8000),
  updated_at timestamptz not null default now()
);

alter table public.character_sheets enable row level security;

-- Policies idempotentes: reexecutar o arquivo não causa conflito nem apaga dados.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='character_sheets' and policyname='ficha: consultar membros') then
    create policy "ficha: consultar membros" on public.character_sheets for select to authenticated
    using (exists (select 1 from public.bags b where b.id = character_sheets.bag_id and b.kind='personagem' and public.is_mesa_member(b.mesa_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='character_sheets' and policyname='ficha: criar autorizado') then
    create policy "ficha: criar autorizado" on public.character_sheets for insert to authenticated
    with check (public.can_edit_bag(bag_id) and exists (select 1 from public.bags b where b.id=bag_id and b.kind='personagem'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='character_sheets' and policyname='ficha: editar autorizado') then
    create policy "ficha: editar autorizado" on public.character_sheets for update to authenticated
    using (public.can_edit_bag(bag_id))
    with check (public.can_edit_bag(bag_id) and exists (select 1 from public.bags b where b.id=bag_id and b.kind='personagem'));
  end if;
end $$;

revoke all on public.character_sheets from anon;
grant select, insert, update on public.character_sheets to authenticated;

-- Ajuste rápido e atômico de PV, com limite entre 0 e PV máximo.
create or replace function public.adjust_character_hp(p_bag_id uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_hp integer;
begin
  if auth.uid() is null or not public.can_edit_bag(p_bag_id) then
    raise exception 'Sem permissão para alterar a ficha';
  end if;
  if p_delta is null or abs(p_delta::bigint) > 1000 then
    raise exception 'Ajuste de PV inválido';
  end if;
  update public.character_sheets
    set hp_current = greatest(0, least(hp_max, hp_current + p_delta)), updated_at = now()
    where bag_id = p_bag_id
    returning hp_current into v_hp;
  if not found then raise exception 'Ficha não encontrada'; end if;
  return v_hp;
end;
$$;
revoke all on function public.adjust_character_hp(uuid,integer) from public,anon;
grant execute on function public.adjust_character_hp(uuid,integer) to authenticated;
