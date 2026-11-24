-- p21 - Identificacao manual dos CT-es em transito (obra/pedido/tipo do frete). Pedido do Carlos em 24/11/2026.
-- O robo (sync_cte_sefaz) liga o CT-e a pedido/obra pela NF-e; quando nao consegue (ou so sugere), logistica, admin ou
-- coordenador identificam pelo app: tipo do frete, pedido e obra - ou marcam que o frete nao e de obra.
-- A identificacao manual fica em tabela a parte (o robo nunca le nem sobrescreve) e vale mais que a ligacao do robo na
-- tela; se depois o ERP indicar outra obra, o app mostra a divergencia. Nada vai para o ERP.
-- Depende do p20 (fretes_ctes_sefaz). Aditivo: app antigo e robo nao usam. Aplicar ANTES de publicar o app novo
-- (sem a tabela a aba "Em transito" continua funcionando, so sem o botao Identificar).

create table if not exists public.fretes_ctes_identificacao (
    chave           text primary key references public.fretes_ctes_sefaz (chave) on delete cascade,
    sentido         text not null,
    pedido          bigint,
    codigo_obra     text,
    fora_de_obra    boolean not null default false,
    observacao      text,
    id_usuario      uuid not null references public.usuarios (id),
    nome_usuario    text,
    identificado_em timestamp with time zone not null default now(),
    constraint fretes_ctes_identificacao_sentido_check check (sentido in ('compra', 'venda', 'outro')),
    constraint fretes_ctes_identificacao_obra_check check (fora_de_obra = (codigo_obra is null)),
    constraint fretes_ctes_identificacao_pedido_check check (pedido is null or pedido > 0)
);

comment on table public.fretes_ctes_identificacao is
  'Identificacao manual de um CT-e capturado na SEFAZ (fretes_ctes_sefaz): tipo do frete, pedido e obra, ou "nao e de obra". Gravada so pelas funcoes frete_cte_identificar / frete_cte_desfazer_identificacao (logistica, admin, coordenador). O robo nao le nem grava aqui.';
comment on column public.fretes_ctes_identificacao.fora_de_obra is
  'true = frete que nao pertence a nenhuma obra (estoque, administrativo, conserto...): sai da conta por obra. Nesse caso codigo_obra e nulo.';

create index if not exists fretes_ctes_identificacao_obra_idx on public.fretes_ctes_identificacao (codigo_obra);
create index if not exists fretes_ctes_identificacao_usuario_idx on public.fretes_ctes_identificacao (id_usuario);

alter table public.fretes_ctes_identificacao enable row level security;

-- Le quem le o CT-e: logistica, admin e coordenador tudo; quem gerencia a obra indicada (pelo robo ou a mao) o dela.
drop policy if exists fretes_ctes_identificacao_select on public.fretes_ctes_identificacao;
create policy fretes_ctes_identificacao_select on public.fretes_ctes_identificacao
  for select to authenticated
  using (
    public.eh_logistica()
    or public.eh_admin_ou_coordenador()
    or exists (select 1 from public.obras o
                where o.codigo_externo = fretes_ctes_identificacao.codigo_obra
                  and public.pode_gerenciar_obra(o.id))
  );

revoke all on public.fretes_ctes_identificacao from anon, authenticated;
grant select on public.fretes_ctes_identificacao to authenticated;

-- O CT-e identificado a mao para uma obra passa a aparecer para quem gerencia essa obra.
drop policy if exists fretes_ctes_sefaz_select on public.fretes_ctes_sefaz;
create policy fretes_ctes_sefaz_select on public.fretes_ctes_sefaz
  for select to authenticated
  using (
    public.eh_logistica()
    or public.eh_admin_ou_coordenador()
    or exists (select 1 from public.obras o
                where o.codigo_externo = any (fretes_ctes_sefaz.codigos_obra)
                  and public.pode_gerenciar_obra(o.id))
    or exists (select 1 from public.fretes_ctes_identificacao i
                 join public.obras o on o.codigo_externo = i.codigo_obra
                where i.chave = fretes_ctes_sefaz.chave
                  and public.pode_gerenciar_obra(o.id))
  );

create or replace function public.frete_cte_identificar(
    p_chave text, p_sentido text, p_pedido bigint, p_codigo_obra text, p_fora_de_obra boolean, p_observacao text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_usuario uuid := public.usuario_atual_id(); v_obra text := nullif(trim(coalesce(p_codigo_obra, '')), '');
begin
  if v_usuario is null or not (public.eh_logistica() or public.eh_admin_ou_coordenador()) then
    raise exception 'Só logística, administração ou coordenação identificam o frete.';
  end if;
  if p_sentido is null or p_sentido not in ('compra', 'venda', 'outro') then raise exception 'Informe o tipo do frete.'; end if;
  if p_pedido is not null and p_pedido <= 0 then raise exception 'Número de pedido inválido.'; end if;
  if not exists (select 1 from public.fretes_ctes_sefaz where chave = p_chave) then raise exception 'CT-e não encontrado.'; end if;
  if coalesce(p_fora_de_obra, false) then
    v_obra := null;
  elsif v_obra is null then
    raise exception 'Informe a obra ou marque que o frete não é de obra.';
  elsif not exists (select 1 from public.obras where codigo_externo = v_obra) then
    raise exception 'Obra % não encontrada.', v_obra;
  end if;
  insert into public.fretes_ctes_identificacao (chave, sentido, pedido, codigo_obra, fora_de_obra, observacao, id_usuario, nome_usuario)
  values (p_chave, p_sentido, p_pedido, v_obra, coalesce(p_fora_de_obra, false), nullif(trim(coalesce(p_observacao, '')), ''),
          v_usuario, (select nome from public.usuarios where id = v_usuario))
  on conflict (chave) do update
     set sentido = excluded.sentido, pedido = excluded.pedido, codigo_obra = excluded.codigo_obra,
         fora_de_obra = excluded.fora_de_obra, observacao = excluded.observacao, id_usuario = excluded.id_usuario,
         nome_usuario = excluded.nome_usuario, identificado_em = now();
end $function$;

create or replace function public.frete_cte_desfazer_identificacao(p_chave text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if public.usuario_atual_id() is null or not (public.eh_logistica() or public.eh_admin_ou_coordenador()) then
    raise exception 'Só logística, administração ou coordenação identificam o frete.';
  end if;
  delete from public.fretes_ctes_identificacao where chave = p_chave;
end $function$;

revoke all on function public.frete_cte_identificar(text, text, bigint, text, boolean, text) from public, anon;
revoke all on function public.frete_cte_desfazer_identificacao(text) from public, anon;
grant execute on function public.frete_cte_identificar(text, text, bigint, text, boolean, text) to authenticated;
grant execute on function public.frete_cte_desfazer_identificacao(text) to authenticated;
