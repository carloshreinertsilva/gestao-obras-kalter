-- p22 - Pedidos de compra a partir do MD da cotacao (Painel BeeStock). Pedido do Carlos em 24/11/2026.
-- Desenho: robo-sync-erp/docs/desenho_importar_pedido_compra.md.
-- Logistica ou admin importam o MD (um fornecedor por arquivo; importar = autorizacao para gerar, a cotacao ja e a
-- melhor avaliada). O robo (robo-sync-erp/src/sync_pedidos_compra.py) simula no ERP com gerar_pedido_compra.py e
-- grava aqui o status: pronto, aguardando_previsao (com as faltas por familia) ou erro. Enquanto faltar previsao, o
-- gestor e os assistentes recebem aviso diario (o aumento continua sendo pedido por eles).
-- NESTA FASE o robo so simula: nada vai para o ERP. As chaves abaixo nascem desligadas:
--   pc_avisos_ligados()   - e-mail/sino de falta de previsao e de pedido gerado (ligar depois de o Carlos aprovar o exemplo)
--   pc_gravacao_ligada()  - o robo gerar o pedido no ERP (ligar so depois do teste desfeito e da 1a gravacao acompanhada)
-- Aditivo (tabela e funcoes novas): app antigo e robo antigo nao usam. Aplicar ANTES de publicar o app novo.

create table if not exists public.pedidos_compra_importados (
    id                      uuid primary key default gen_random_uuid(),
    created_at              timestamp with time zone not null default now(),
    updated_at              timestamp with time zone not null default now(),
    nome_arquivo            text not null,
    conteudo_md             text not null,
    hash_md                 text not null,
    id_importador           uuid not null references public.usuarios (id),
    nome_importador         text,
    status                  text not null default 'simulando',
    mensagem                text,
    -- preenchidos pelo robo na simulacao
    fornecedor              integer,
    nome_fornecedor         text,
    total                   numeric(15, 2),
    scs                     integer[] not null default '{}',
    familias                text[] not null default '{}',
    id_obras                uuid[] not null default '{}',
    faltas                  jsonb,
    plano                   jsonb,
    codigo_plano            text,
    simulado_em             timestamp with time zone,
    ultimo_aviso_previsao   date,
    -- gravacao (fase seguinte)
    pedidos                 jsonb,
    gerado_em               timestamp with time zone,
    tentativas              integer not null default 0,
    resultado               jsonb,
    -- cancelamento
    id_cancelador           uuid references public.usuarios (id),
    motivo_cancelamento     text,
    cancelado_em            timestamp with time zone,
    constraint pedidos_compra_importados_status_check check (status in (
        'simulando', 'aguardando_previsao', 'pronto', 'gerando', 'gerado', 'erro', 'cancelado')),
    constraint pedidos_compra_importados_conteudo_check check (length(conteudo_md) between 1 and 200000)
);

comment on table public.pedidos_compra_importados is
  'MD da cotacao (Painel BeeStock) importado no app para virar pedido de compra no ERP. Insercao so por pc_importar; o robo (sync_pedidos_compra.py) simula e atualiza status/faltas/plano; cancelar/reenviar por RPC.';
comment on column public.pedidos_compra_importados.status is
  'simulando (novo/reenviado) -> pronto (previsao cobre; aguarda a gravacao ligada) | aguardando_previsao (faltas) | erro (recusa do ERP: SC mudou, ja tem pedido...). Fase seguinte: gerando -> gerado. cancelado pelo app.';
comment on column public.pedidos_compra_importados.faltas is
  'Por familia: [{familia, aberto, necessario, falta}] (texto com 2 casas). So em aguardando_previsao.';

create index if not exists pedidos_compra_importados_status_idx on public.pedidos_compra_importados (status);
create index if not exists pedidos_compra_importados_obras_idx on public.pedidos_compra_importados using gin (id_obras);
-- o mesmo arquivo nao entra duas vezes enquanto o anterior estiver vivo
create unique index if not exists pedidos_compra_importados_hash_ativo_idx on public.pedidos_compra_importados (hash_md)
  where status not in ('cancelado', 'erro');

alter table public.pedidos_compra_importados enable row level security;

drop policy if exists pedidos_compra_importados_select on public.pedidos_compra_importados;
create policy pedidos_compra_importados_select on public.pedidos_compra_importados
  for select to authenticated
  using (
    public.eh_logistica()
    or public.eh_admin_ou_coordenador()
    or id_importador = public.usuario_atual_id()
    or exists (select 1 from unnest(id_obras) o(id) where public.pode_gerenciar_obra(o.id))
  );

revoke all on public.pedidos_compra_importados from anon, authenticated;
grant select on public.pedidos_compra_importados to authenticated;

create or replace function public.trg_pedidos_compra_importados_upd()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  new.updated_at := now();
  return new;
end $function$;

drop trigger if exists trg_pedidos_compra_importados_upd on public.pedidos_compra_importados;
create trigger trg_pedidos_compra_importados_upd before update on public.pedidos_compra_importados
  for each row execute function public.trg_pedidos_compra_importados_upd();
drop trigger if exists auditar_pedidos_compra_importados on public.pedidos_compra_importados;
create trigger auditar_pedidos_compra_importados after insert or delete or update on public.pedidos_compra_importados
  for each row execute function public.auditar();

-- chaves (nascem desligadas)
create or replace function public.pc_avisos_ligados() returns boolean language sql immutable as $$ select false $$;
create or replace function public.pc_gravacao_ligada() returns boolean language sql immutable as $$ select false $$;

create or replace function public.pc_pode_importar()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.eh_logistica() or public.eh_admin();
$function$;

create or replace function public.pc_importar(p_nome_arquivo text, p_conteudo text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_usuario uuid := public.usuario_atual_id();
  v_hash text;
  v_existente record;
  v_id uuid;
begin
  if v_usuario is null or not public.pc_pode_importar() then
    raise exception 'Só logística e administração importam cotações.';
  end if;
  if p_conteudo is null or length(p_conteudo) = 0 or length(p_conteudo) > 200000 then
    raise exception 'Arquivo vazio ou grande demais.';
  end if;
  if position('## pedidos para processar' in lower(p_conteudo)) = 0 then
    raise exception 'O arquivo não tem a seção "Pedidos para processar".';
  end if;
  v_hash := md5(p_conteudo);
  select id, status into v_existente from public.pedidos_compra_importados
   where hash_md = v_hash and status not in ('cancelado', 'erro') limit 1;
  if found then
    raise exception 'Este arquivo já foi importado (situação: %).', v_existente.status;
  end if;
  insert into public.pedidos_compra_importados (nome_arquivo, conteudo_md, hash_md, id_importador, nome_importador)
  values (left(coalesce(nullif(trim(p_nome_arquivo), ''), 'cotacao.md'), 200), p_conteudo, v_hash, v_usuario,
          (select nome from public.usuarios where id = v_usuario))
  returning id into v_id;
  return v_id;
end $function$;

create or replace function public.pc_cancelar(p_id uuid, p_motivo text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_usuario uuid := public.usuario_atual_id();
begin
  if v_usuario is null or not public.pc_pode_importar() then
    raise exception 'Só logística e administração cancelam.';
  end if;
  update public.pedidos_compra_importados
     set status = 'cancelado', id_cancelador = v_usuario, cancelado_em = now(),
         motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), '')
   where id = p_id and status in ('simulando', 'aguardando_previsao', 'pronto', 'erro');
  if not found then
    raise exception 'Esta importação não pode mais ser cancelada (já está sendo gerada ou foi gerada).';
  end if;
end $function$;

create or replace function public.pc_reenviar(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if public.usuario_atual_id() is null or not public.pc_pode_importar() then
    raise exception 'Só logística e administração reenviam.';
  end if;
  if exists (select 1 from public.pedidos_compra_importados a join public.pedidos_compra_importados b
                on b.hash_md = a.hash_md and b.id <> a.id and b.status not in ('cancelado', 'erro')
              where a.id = p_id) then
    raise exception 'Este arquivo já foi importado de novo; use a importação mais recente.';
  end if;
  update public.pedidos_compra_importados
     set status = 'simulando', mensagem = null, tentativas = 0
   where id = p_id and status = 'erro';
  if not found then
    raise exception 'Só uma importação com erro pode ser reenviada.';
  end if;
end $function$;

-- Aviso de falta de previsao (chamado pelo robo a cada rodada; manda no maximo 1 por dia por importacao).
-- Destino: gestor da obra e assistentes vinculados (frete_gestores), copia para recebe_copia_previsao.
create or replace function public.pc_avisar_sem_previsao(p_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  p public.pedidos_compra_importados;
  o public.obras;
  f jsonb;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_para uuid[] := '{}'; v_cc uuid[]; v_emails text[]; v_cc_emails text[];
  v_linhas text := ''; v_total_falta numeric := 0; v_aberta text; v_url text; v_html text; v_uid uuid;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
begin
  select * into p from public.pedidos_compra_importados where id = p_id;
  if p.id is null or p.status <> 'aguardando_previsao' or not public.pc_avisos_ligados() then return false; end if;
  if p.ultimo_aviso_previsao is not distinct from v_hoje then return false; end if;
  for f in select * from jsonb_array_elements(coalesce(p.faltas, '[]'::jsonb)) loop
    v_total_falta := v_total_falta + (f->>'falta')::numeric;
    select string_agg(s.tipo || ' de ' || formatar_brl(s.valor) || ' (' || replace(s.status, '_', ' ') || ')', ', ')
      into v_aberta from public.solicitacoes_previsao s
     where s.familia_destino = f->>'familia' and s.status in ('simulando', 'aguardando_aprovacao', 'aprovada');
    v_linhas := v_linhas || '<li style="margin:4px 0;"><strong>' || html_esc(f->>'familia') || '</strong>: aberto '
      || formatar_brl((f->>'aberto')::numeric) || ', pedido ' || formatar_brl((f->>'necessario')::numeric)
      || ', <strong style="color:#b91c1c;">faltam ' || formatar_brl((f->>'falta')::numeric) || '</strong>'
      || coalesce(' — já há solicitação aguardando: ' || html_esc(v_aberta), '') || '</li>';
  end loop;
  foreach v_uid in array p.id_obras loop
    v_para := v_para || public.frete_gestores(v_uid);
  end loop;
  select * into o from public.obras where id = p.id_obras[1];
  v_url := 'https://gestaoobraskalter.vercel.app/obras/' || coalesce(o.codigo_externo, '') || '/previsoes';
  select coalesce(array_agg(id), '{}') into v_cc from public.usuarios where ativo and recebe_copia_previsao;
  v_emails := public.sf_emails(v_para);
  v_cc_emails := public.sf_emails(v_cc, v_emails);
  update public.pedidos_compra_importados set ultimo_aviso_previsao = v_hoje where id = p_id;
  if cardinality(v_emails) = 0 then return false; end if;
  v_html := '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">Pedido de compra aguardando previsão</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; color:#b91c1c; background:#fee2e2;">FALTAM '
    || formatar_brl(v_total_falta) || '</span></p>'
    || '<p style="margin:0 0 14px 0; font-size:15px; color:#1e293b;">A cotação aprovada abaixo não virou pedido de compra porque a previsão da família não cobre o valor. '
    || 'Se a compra deve seguir, abra no app uma <strong>solicitação de aumento</strong> ou uma <strong>transferência</strong> de outra família. '
    || 'Assim que a previsão entrar, o pedido é gerado sozinho. Este aviso se repete todo dia enquanto faltar previsão.</p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Fornecedor', html_esc(coalesce(p.fornecedor::text || ' - ', '') || coalesce(p.nome_fornecedor, '')))
    || format(v_linha, 'Valor do pedido', formatar_brl(p.total))
    || format(v_linha, 'Importado por', html_esc(coalesce(p.nome_importador, '')) || ' em ' || to_char(p.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'))
    || format(v_linha, 'Famílias', '<ul style="margin:0; padding-left:18px;">' || v_linhas || '</ul>')
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || v_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir as previsões da obra</a>'
    || '</td></tr></table>';
  insert into public.fila_email (para, cc, assunto, html, origem)
  values (v_emails, v_cc_emails,
          'Pedido de compra aguardando previsão · ' || array_to_string(p.familias, ', ') || ' · faltam ' || formatar_brl(v_total_falta),
          v_html, 'pc_sem_previsao');
  foreach v_uid in array (select array_agg(distinct x) from unnest(v_para) x) loop
    perform public.notificar_usuario(v_uid, 'pedido_compra', 'Pedido de compra aguardando previsão',
      coalesce(p.nome_fornecedor, 'Fornecedor ' || p.fornecedor) || ' · ' || array_to_string(p.familias, ', ')
        || ' · faltam ' || formatar_brl(v_total_falta),
      p.id_obras[1], null, false, 'pc_sem_previsao_' || p.id);
  end loop;
  return true;
end $function$;

revoke all on function public.pc_importar(text, text) from public, anon;
revoke all on function public.pc_cancelar(uuid, text) from public, anon;
revoke all on function public.pc_reenviar(uuid) from public, anon;
revoke all on function public.pc_pode_importar() from public, anon;
revoke all on function public.pc_avisar_sem_previsao(uuid) from public, anon, authenticated;
grant execute on function public.pc_importar(text, text) to authenticated;
grant execute on function public.pc_cancelar(uuid, text) to authenticated;
grant execute on function public.pc_reenviar(uuid) to authenticated;
grant execute on function public.pc_pode_importar() to authenticated;
