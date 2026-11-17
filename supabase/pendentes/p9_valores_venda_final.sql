-- p9_valores_venda_final.sql - "fechar valores por obra", PASSO FINAL (NAO aplicar ainda). Reexecutavel. Sem begin/commit.
-- Tira valor_produto/valor_servico de obras: a origem passa a ser obras_valores_venda (leitura restrita).
--
-- PRESSUPOE (conferir antes de aplicar):
--  1. App novo publicado (grava valores so por obra_valores_venda_salvar; nao le nem grava as colunas em obras) e
--     ninguem mais com o app antigo aberto (pedir para recarregar a pagina): o app antigo manda valor_produto no
--     insert/update de obras e passaria a receber erro ao salvar obra.
--  2. Robo do servidor ja gravando os valores em obras_valores_venda (nao em obras) - sync que hoje preenche
--     obras.valor_produto/valor_servico. Conferir com grep no robo publicado: nenhum "valor_produto" em update/insert de obras.
--  3. Nenhuma funcao, visao ou relatorio (nexBI, planilhas, scripts) lendo obras.valor_produto/valor_servico
--     (em 17/11 so trg_obras_espelhar_valores_venda citava as colunas no banco).
--  4. Depois: regenerar supabase/schema e src/database.types.ts do app.

-- ------------------------------------------------------------------ 1. funcao grava direto na tabela restrita
-- Mesmas regras, mensagens e assinatura da fase 3 (p8 + p10, com o faturamento direto: nulo = nao mexe, so admin
-- altera); so muda o destino. O drop da assinatura antiga de 3 parametros e so por seguranca (o p10 ja a removeu).
drop function if exists public.obra_valores_venda_salvar(uuid, numeric, numeric);
create or replace function public.obra_valores_venda_salvar(
  p_id_obra uuid, p_valor_produto numeric, p_valor_servico numeric, p_valor_faturamento_direto numeric default null)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_resp uuid;
  v_produto numeric := coalesce(p_valor_produto, 0);
  v_servico numeric := coalesce(p_valor_servico, 0);
  v_fat_atual numeric;
  v_fat numeric;
begin
  select o.id_responsavel into v_resp from public.obras o where o.id = p_id_obra for update;
  if not found then
    raise exception 'Obra não encontrada.' using errcode = 'P0002';
  end if;
  if not coalesce(public.pode_gerenciar_responsavel(v_resp), false) then
    raise exception 'Você não tem permissão para alterar os valores de venda desta obra.' using errcode = '42501';
  end if;
  if v_produto < 0 or v_servico < 0 then
    raise exception 'Os valores de venda não podem ser negativos.' using errcode = '22023';
  end if;
  if v_produto >= 1e12 or v_servico >= 1e12 then
    raise exception 'Valor de venda inválido.' using errcode = '22023';
  end if;
  if p_valor_faturamento_direto < 0 then
    raise exception 'O valor de faturamento direto não pode ser negativo.' using errcode = '22023';
  end if;
  if p_valor_faturamento_direto >= 1e12 then
    raise exception 'Valor de faturamento direto inválido.' using errcode = '22023';
  end if;

  select v.valor_faturamento_direto into v_fat_atual from public.obras_valores_venda v where v.id_obra = p_id_obra for update;
  v_fat := coalesce(p_valor_faturamento_direto, v_fat_atual, 0);
  if p_valor_faturamento_direto is not null and p_valor_faturamento_direto is distinct from coalesce(v_fat_atual, 0)
     and not coalesce(public.eh_admin(), false) then
    raise exception 'Só administradores alteram o valor de faturamento direto.' using errcode = '42501';
  end if;

  insert into public.obras_valores_venda as v (id_obra, valor_produto, valor_servico, valor_faturamento_direto, atualizado_em)
  values (p_id_obra, v_produto, v_servico, v_fat, now())
  on conflict (id_obra) do update
     set valor_produto = excluded.valor_produto, valor_servico = excluded.valor_servico,
         valor_faturamento_direto = excluded.valor_faturamento_direto, atualizado_em = now()
   where (v.valor_produto, v.valor_servico, v.valor_faturamento_direto)
         is distinct from (excluded.valor_produto, excluded.valor_servico, excluded.valor_faturamento_direto);
end;
$function$;
comment on function public.obra_valores_venda_salvar(uuid, numeric, numeric, numeric) is
  'Grava o valor de venda (material/servico) e o faturamento direto da obra em obras_valores_venda. Quem pode: quem '
  'pode alterar a obra (pode_gerenciar_responsavel); faturamento direto so admin. Nulo em produto/servico = 0; '
  'faturamento direto nulo = nao mexe. Negativo = erro.';
revoke all on function public.obra_valores_venda_salvar(uuid, numeric, numeric, numeric) from public, anon;
grant execute on function public.obra_valores_venda_salvar(uuid, numeric, numeric, numeric) to authenticated;

-- ------------------------------------------------------------------ 2. gatilhos espelho
-- O de update sai. O de insert continua, mas cria a linha com 0: obra sem linha em obras_valores_venda e lida pelo
-- app como "sem acesso" (null), entao toda obra nova precisa nascer com a linha (o app grava os valores logo depois).
-- valor_faturamento_direto nao e citado: nasce com o default 0 e nunca e sobrescrito aqui.
drop trigger if exists trg_obras_valores_venda_upd on public.obras;
drop trigger if exists trg_obras_valores_venda_ins on public.obras;

create or replace function public.trg_obras_espelhar_valores_venda()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.obras_valores_venda (id_obra, valor_produto, valor_servico)
  values (new.id, 0, 0)
  on conflict (id_obra) do nothing;
  return null;
end;
$function$;
revoke all on function public.trg_obras_espelhar_valores_venda() from public, anon, authenticated;
create trigger trg_obras_valores_venda_ins after insert on public.obras
    for each row execute function public.trg_obras_espelhar_valores_venda();

comment on table public.obras_valores_venda is
  'Valor de venda (produto/servico) da obra - ORIGEM do dado (obras nao tem mais as colunas). Linha criada com 0 pelo '
  'gatilho trg_obras_valores_venda_ins; gravada pelo app via obra_valores_venda_salvar e pelo robo. '
  'Leitura: admin/coordenador, gestor da obra e assistente dele. Ninguem do app grava direto.';

-- ------------------------------------------------------------------ 3. auditoria de obras volta ao normal
-- (o 'ignorar=' do p8 so existia por causa das colunas)
drop trigger if exists auditar_obras on public.obras;
create trigger auditar_obras after insert or delete or update on public.obras
    for each row execute function public.auditar();

-- ------------------------------------------------------------------ 4. sai das colunas
-- confere antes que o espelho esta completo (nenhuma obra sem linha) - se faltar, aborta tudo
do $bloco$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'obras' and column_name = 'valor_produto') then
    execute $q$insert into public.obras_valores_venda (id_obra, valor_produto, valor_servico)
               select o.id, coalesce(o.valor_produto, 0), coalesce(o.valor_servico, 0) from public.obras o
               on conflict (id_obra) do nothing$q$;
    if exists (select 1 from public.obras o join public.obras_valores_venda v on v.id_obra = o.id
                where (coalesce(o.valor_produto, 0), coalesce(o.valor_servico, 0))
                      is distinct from (coalesce(v.valor_produto, 0), coalesce(v.valor_servico, 0))) then
      raise exception 'obras_valores_venda diverge de obras: conferir antes de remover as colunas';
    end if;
  end if;
end
$bloco$;
alter table public.obras drop column if exists valor_produto, drop column if exists valor_servico;
