-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- 170 funcoes/procedures do schema public, ordenadas por nome + argumentos

-- public.after_insert_obras_criar_pmis_padrao()
CREATE OR REPLACE FUNCTION public.after_insert_obras_criar_pmis_padrao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  perform public.criar_documentos_padrao_obra(new.id);
  perform public.criar_cronograma_padrao_obra(new.id);
  perform public.criar_familias_faturamento_obra(new.id);

  return new;
end;
$function$
;

-- public.alerta_sistema_avisar(p_titulo text, p_detalhe text, p_problema boolean)
CREATE OR REPLACE FUNCTION public.alerta_sistema_avisar(p_titulo text, p_detalhe text, p_problema boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u record; v_emails text[];
begin
  for u in select id from public.usuarios where ativo and recebe_alerta_sistema loop
    perform public.notificar_usuario(u.id, 'alerta_sistema', p_titulo, p_detalhe, null, null, false,
      'sis:' || md5(p_titulo || p_detalhe) || ':' || extract(epoch from now())::bigint);
  end loop;
  select array_agg(lower(email)) into v_emails from public.usuarios where ativo and recebe_alerta_sistema and coalesce(email, '') <> '';
  if v_emails is null then return; end if;
  insert into public.fila_email (para, cc, assunto, html, origem)
  values (v_emails, '{}', case when p_problema then '[ALERTA] ' else '[OK] ' end || p_titulo,
    '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:' || case when p_problema then '#b91c1c' else '#047857' end || ';">'
      || html_esc(p_titulo) || '</p><p style="margin:12px 0; font-size:15px; color:#1e293b;">' || replace(html_esc(p_detalhe), E'\n', '<br/>') || '</p>'
      || '<p style="margin:12px 0 0 0; font-size:12px; color:#64748b;">Verificação automática do Gestão de Obras (a cada 10 minutos, dias úteis das 7h40 às 19h).</p>',
    'alerta_sistema');
end $function$
;

-- public.aprovar_solicitacao_previsao(p_id uuid, p_codigo text)
CREATE OR REPLACE FUNCTION public.aprovar_solicitacao_previsao(p_id uuid, p_codigo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nome text;
begin
  if not public.eh_aprovador_previsao() then raise exception 'Somente aprovadores podem aprovar.'; end if;
  select nome into v_nome from public.usuarios where id = public.usuario_atual_id();
  update public.solicitacoes_previsao
     set status = 'aprovada', id_aprovador = public.usuario_atual_id(), nome_aprovador = v_nome,
         decidido_em = now(), mensagem = null, tentativas = 0
   where id = p_id and status = 'aguardando_aprovacao' and codigo_plano = p_codigo;
  if not found then
    raise exception 'A solicitacao mudou (nova simulacao ou ja decidida). Atualize a tela e confira de novo.';
  end if;
end;
$function$
;

-- public.auditar()
CREATE OR REPLACE FUNCTION public.auditar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_reg jsonb := coalesce(v_new, v_old);
  v_antes jsonb;
  v_depois jsonb;
  v_ignorar text[] := array['updated_at', 'created_at'];
  k text;
  v_usuario record;
begin
  if auth.uid() is null then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    v_antes := '{}'::jsonb;
    v_depois := '{}'::jsonb;
    for k in select jsonb_object_keys(v_new) loop
      if not (k = any(v_ignorar)) and (v_old -> k) is distinct from (v_new -> k) then
        v_antes := v_antes || jsonb_build_object(k, v_old -> k);
        v_depois := v_depois || jsonb_build_object(k, v_new -> k);
      end if;
    end loop;
    if v_depois = '{}'::jsonb then
      return null; -- nada mudou de fato
    end if;
  elsif tg_op = 'INSERT' then
    v_depois := v_new;
  else
    v_antes := v_old;
  end if;

  select u.id, u.nome into v_usuario
  from public.usuarios u where lower(u.email) = lower(auth.email()) limit 1;

  insert into public.auditoria (id_usuario, email, nome_usuario, tabela, operacao, id_registro, id_obra, antes, depois)
  values (
    v_usuario.id, auth.email(), v_usuario.nome, tg_table_name,
    case tg_op when 'INSERT' then 'inclusao' when 'UPDATE' then 'alteracao' else 'exclusao' end,
    v_reg ->> 'id',
    case when tg_table_name = 'obras' then (v_reg ->> 'id')::uuid else nullif(v_reg ->> 'id_obra', '')::uuid end,
    v_antes, v_depois
  );
  return null;
end;
$function$
;

-- public.cancelar_desfazer_previsao(p_id uuid)
CREATE OR REPLACE FUNCTION public.cancelar_desfazer_previsao(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_aprovador_previsao() then raise exception 'Somente aprovadores.'; end if;
  update public.solicitacoes_previsao
     set desfazer_status = null, desfazer_plano = null, desfazer_codigo = null, desfazer_mensagem = null
   where id = p_id and desfazer_status in ('aguardando_confirmacao', 'erro');
  if not found then raise exception 'Nada para cancelar.'; end if;
end;
$function$
;

-- public.cancelar_obra_pmis(p_id_obra uuid, p_data_cancelamento date, p_motivo_cancelamento text, p_observacao_cancelamento text, p_cancelar_tarefas boolean, p_cancelar_cronograma boolean)
CREATE OR REPLACE FUNCTION public.cancelar_obra_pmis(p_id_obra uuid, p_data_cancelamento date, p_motivo_cancelamento text, p_observacao_cancelamento text, p_cancelar_tarefas boolean DEFAULT true, p_cancelar_cronograma boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_usuario record;
  v_obra record;
begin
  select *
  into v_usuario
  from public.usuarios
  where lower(email) = lower(auth.email())
  limit 1;

  if v_usuario.id is null then
    return jsonb_build_object('ok', false, 'mensagem', 'Usuário não encontrado.');
  end if;

  select *
  into v_obra
  from public.obras
  where id = p_id_obra;

  if v_obra.id is null then
    return jsonb_build_object('ok', false, 'mensagem', 'Obra não encontrada.');
  end if;

  if not (
    v_usuario.perfil::text in ('admin', 'coordenador')
    or v_obra.id_responsavel = v_usuario.id
    or (v_usuario.perfil::text = 'assistente' and v_obra.id_responsavel = v_usuario.id_engenheiro_vinculado)
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Você não tem permissão para cancelar esta obra.');
  end if;

  if v_obra.status::text = 'finalizada' then
    return jsonb_build_object('ok', false, 'mensagem', 'Não é possível cancelar uma obra já finalizada.');
  end if;

  if v_obra.status::text = 'cancelada' then
    return jsonb_build_object('ok', false, 'mensagem', 'Esta obra já está cancelada.');
  end if;

  if p_data_cancelamento is null then
    return jsonb_build_object('ok', false, 'mensagem', 'Informe a data de cancelamento.');
  end if;

  if coalesce(trim(p_motivo_cancelamento), '') = '' then
    return jsonb_build_object('ok', false, 'mensagem', 'Informe o motivo do cancelamento.');
  end if;

  update public.obras
  set
    status = 'cancelada'::status_obra,
    data_cancelamento = p_data_cancelamento,
    motivo_cancelamento = p_motivo_cancelamento,
    observacao_cancelamento = p_observacao_cancelamento,
    updated_at = now()
  where id = p_id_obra;

  if p_cancelar_tarefas then
    update public.tarefas
    set status = 'cancelada'::status_tarefa, updated_at = now()
    where id_obra = p_id_obra and status::text <> 'concluida';
  end if;

  if p_cancelar_cronograma then
    update public.cronograma_obra
    set status = 'cancelado', updated_at = now()
    where id_obra = p_id_obra and status <> 'concluido';
  end if;

  return jsonb_build_object('ok', true, 'mensagem', 'Obra cancelada com sucesso.');
end;
$function$
;

-- public.cancelar_solicitacao_previsao(p_id uuid)
CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_previsao(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.solicitacoes_previsao
     set status = 'cancelada'
   where id = p_id and status in ('simulando', 'aguardando_aprovacao', 'erro')
     and (id_solicitante = public.usuario_atual_id() or public.eh_aprovador_previsao());
  if not found then raise exception 'A solicitacao nao pode mais ser cancelada.'; end if;
end;
$function$
;

-- public.compras_previsoes_abertas()
CREATE OR REPLACE FUNCTION public.compras_previsoes_abertas()
 RETURNS TABLE(id_obra uuid, codigo_obra text, nome_obra text, gestor text, codigo_projeto text, descricao text, previsoes_em_aberto numeric, previsoes_numeros text, nivel_alerta text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id, o.codigo_externo, o.nome, u.nome, f.codigo_projeto, f.descricao, f.previsoes_em_aberto,
         f.previsoes_numeros, a.nivel
    from public.obra_rentabilidade_familias f
    join public.obras o on o.id = f.id_obra and o.status = 'em_andamento'
    left join public.usuarios u on u.id = o.id_responsavel
    left join public.obra_familia_alerta a on a.id_obra = f.id_obra and a.codigo_projeto = f.codigo_projeto
   where not f.eh_obra
     and (f.previsoes_em_aberto > 0.005 or coalesce(a.nivel, 'ok') <> 'ok')
     and split_part(f.codigo_projeto, '.', 2) not in ('970', '980', '990', '1000')
     and public.perfil_atual() in ('admin', 'coordenador', 'logistica')
   order by o.codigo_externo, f.codigo_projeto;
$function$
;

-- public.compras_sma_pendentes()
CREATE OR REPLACE FUNCTION public.compras_sma_pendentes()
 RETURNS TABLE(id_obra uuid, codigo_obra text, nome_obra text, gestor text, nr_sma bigint, sequencia integer, codigo_material text, descricao_material text, projeto_sma text, quantidade_pendente numeric, urgente boolean, data_cadastro date, data_necessidade date, solicitante text, situacao_compra text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id, o.codigo_externo, o.nome, u.nome, s.nr_sma, s.sequencia, s.codigo_material, s.descricao_material,
         s.projeto_sma, (s.quantidade_solicitada - s.quantidade_atendida), coalesce(s.urgente, false),
         s.data_cadastro, s.data_necessidade, s.solicitante,
         coalesce(p.situacao_compra, 'com_pedido')
    from public.obra_sma_materiais s
    join public.obras o on o.id = s.id_obra and o.status = 'em_andamento'
    left join public.usuarios u on u.id = o.id_responsavel
    left join public.obra_sma_projecao p
      on p.id_obra = s.id_obra and p.nr_sma = s.nr_sma and p.sequencia = s.sequencia and p.cod_mater = s.cod_mater
   where s.situacao = 'A' and s.quantidade_solicitada > s.quantidade_atendida
     and s.ordens_producao is null -- vai ser produzido, nao comprado
     and public.perfil_atual() in ('admin', 'coordenador', 'logistica')
   order by s.urgente desc, s.data_necessidade nulls last, o.codigo_externo, s.nr_sma, s.sequencia;
$function$
;

-- public.confirmar_desfazer_previsao(p_id uuid, p_codigo text)
CREATE OR REPLACE FUNCTION public.confirmar_desfazer_previsao(p_id uuid, p_codigo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_aprovador_previsao() then raise exception 'Somente aprovadores podem desfazer.'; end if;
  update public.solicitacoes_previsao
     set desfazer_status = 'confirmado', desfazer_mensagem = null, tentativas = 0
   where id = p_id and status = 'executada' and desfazer_status = 'aguardando_confirmacao'
     and desfazer_codigo = p_codigo;
  if not found then raise exception 'O plano do desfazer mudou. Atualize a tela e confira de novo.'; end if;
end;
$function$
;

-- public.criar_cronograma_padrao_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.criar_cronograma_padrao_obra(p_id_obra uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_data_base date;
begin
  select coalesce(created_at::date, current_date)
  into v_data_base
  from public.obras
  where id = p_id_obra;

  insert into public.cronograma_obra (
    id_obra,
    fase,
    ordem,
    inicio_previsto,
    fim_previsto,
    status
  )
  select
    p_id_obra,
    v.fase,
    v.ordem,
    v_data_base,
    v_data_base + 30,
    case
      when v.ordem = 1 then 'em_andamento'
      else 'nao_iniciado'
    end
  from (
    values
      ('processo_inicial', 1),
      ('engenharia', 2),
      ('compras', 3),
      ('fabricacao', 4),
      ('montagem', 5),
      ('comissionamento', 6),
      ('start_up', 7),
      ('garantia', 8)
  ) as v(fase, ordem)
  where not exists (
    select 1
    from public.cronograma_obra c
    where c.id_obra = p_id_obra
      and c.fase = v.fase
  );
end;
$function$
;

-- public.criar_documentos_padrao_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.criar_documentos_padrao_obra(p_id_obra uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_data_prevista date;
begin
  select coalesce(created_at::date, current_date) + 30
  into v_data_prevista
  from public.obras
  where id = p_id_obra;

  insert into public.documentos_projeto (
    id_obra,
    item,
    detalhes,
    status,
    indicador,
    data_prevista
  )
  select
    p_id_obra,
    v.item,
    v.detalhes,
    'nao_elaborado',
    'vermelho',
    v_data_prevista
  from (
    values
      ('Pedido de Compra', 'Pedido de compra emitido pelo cliente'),
      ('Handover Comercial e Pré-Cálculo', 'Documento de handover e pré-cálculo detalhado de custos'),
      ('Ata Reunião de Handover', 'Ata da reunião de handover de abertura do projeto'),
      ('Contrato', 'Contrato de compra e venda assinado junto ao cliente'),
      ('Cronograma', 'Cronograma completo da obra'),
      ('Manual da Obra', 'Manual da obra a ser entregue ao cliente'),
      ('Termo de Entrega Técnica', 'Termo definitivo de entrega técnica da obra')
  ) as v(item, detalhes)
  where not exists (
    select 1
    from public.documentos_projeto d
    where d.id_obra = p_id_obra
      and d.item = v.item
  );
end;
$function$
;

-- public.criar_familias_faturamento_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.criar_familias_faturamento_obra(p_id_obra uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  insert into public.obra_faturamento_familias (
    id_obra,
    id_familia_padrao,
    codigo_familia,
    descricao_familia,
    ordem
  )
  select
    p_id_obra,
    f.id,
    f.codigo,
    f.descricao,
    f.ordem
  from public.familias_faturamento_padrao f
  where f.ativo = true
    and not exists (
      select 1
      from public.obra_faturamento_familias of
      where of.id_obra = p_id_obra
        and of.codigo_familia = f.codigo
    );
end;
$function$
;

-- public.despertar_app()
CREATE OR REPLACE FUNCTION public.despertar_app()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  chave text;
  base text := 'https://pnnhyzdbknzhsyyhhgbk.supabase.co';
begin
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'chave_publica_app';
  if chave is not null then
    perform net.http_get(url := base || '/rest/v1/obras?select=id&limit=1',
                         headers := jsonb_build_object('apikey', chave), timeout_milliseconds := 15000);
    perform net.http_get(url := base || '/auth/v1/health',
                         headers := jsonb_build_object('apikey', chave), timeout_milliseconds := 15000);
  end if;
  -- mantem no cache as paginas das tabelas pequenas que as telas abrem primeiro
  perform count(*) from public.obras;
  perform count(*) from public.usuarios;
  perform count(*) from public.tarefas;
  perform count(*) from public.notificacoes;
  perform count(*) from public.cronograma_obra;
end;
$function$
;

-- public.eh_admin()
CREATE OR REPLACE FUNCTION public.eh_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u where lower(u.email) = lower(auth.email()) and u.ativo and u.perfil = 'admin');
$function$
;

-- public.eh_admin_ou_coordenador()
CREATE OR REPLACE FUNCTION public.eh_admin_ou_coordenador()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u
                 where lower(u.email) = lower(auth.email()) and u.ativo and u.perfil in ('admin', 'coordenador'));
$function$
;

-- public.eh_aprovador_faturamento()
CREATE OR REPLACE FUNCTION public.eh_aprovador_faturamento()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u where lower(u.email) = lower(auth.email()) and u.ativo and u.aprova_faturamento);
$function$
;

-- public.eh_aprovador_previsao()
CREATE OR REPLACE FUNCTION public.eh_aprovador_previsao()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.usuarios u
    where u.id = public.usuario_atual_id() and u.ativo and u.aprova_previsao
  );
$function$
;

-- public.eh_financeiro()
CREATE OR REPLACE FUNCTION public.eh_financeiro()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios where id = public.usuario_atual_id() and ativo and perfil = 'financeiro');
$function$
;

-- public.eh_fiscal()
CREATE OR REPLACE FUNCTION public.eh_fiscal()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u where lower(u.email) = lower(auth.email()) and u.ativo and u.perfil = 'fiscal');
$function$
;

-- public.eh_logistica()
CREATE OR REPLACE FUNCTION public.eh_logistica()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u
                  where u.id = public.usuario_atual_id() and u.ativo and u.perfil = 'logistica');
$function$
;

-- public.eh_usuario_ativo()
CREATE OR REPLACE FUNCTION public.eh_usuario_ativo()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.usuarios u where lower(u.email) = lower(auth.email()) and u.ativo);
$function$
;

-- public.email_frete(f public.fretes, p_titulo text, p_aviso text, p_cor text, p_url text, p_saldo numeric)
CREATE OR REPLACE FUNCTION public.email_frete(f public.fretes, p_titulo text, p_aviso text, p_cor text, p_url text, p_saldo numeric)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_obra text;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
  v_doc text;
begin
  select coalesce(ob.codigo_externo || ' - ' || ob.nome, f.codigo_obra) into v_obra from public.obras ob where ob.id = f.id_obra;
  v_doc := case f.tipo_documento when 'op' then 'OP' when 'sma' then 'SMA' when 'pedido_compra' then 'Pedido de compra'
                                 when 'pedido_venda' then 'Pedido de venda' else 'Documento' end
           || coalesce(' ' || nullif(trim(f.numero_documento), ''), '');
  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">' || html_esc(p_titulo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:' || p_cor || '; background:'
    || case p_cor when '#b45309' then '#fef3c7' when '#047857' then '#d1fae5' when '#b91c1c' then '#fee2e2' when '#1d4ed8' then '#dbeafe' else '#f1f5f9' end || ';">' || html_esc(p_aviso) || '</span></p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Obra', html_esc(coalesce(v_obra, f.codigo_obra)) || ' · família ' || html_esc(f.familia))
    || format(v_linha, 'Frete', '<strong>' || case f.operacao when 'compra' then 'Compra' else 'Venda' end || '</strong> · ' || html_esc(v_doc)
                                  || ' · ' || to_char(f.data_frete, 'DD/MM/YYYY'))
    || case when coalesce(f.origem_nome, f.destino_nome, '') <> '' then format(v_linha, 'Rota', html_esc(coalesce(f.origem_nome, '?')) || ' → ' || html_esc(coalesce(f.destino_nome, '?')) || coalesce(' · ' || f.km::text || ' km', '') || coalesce(' · ' || html_esc(f.tipo_veiculo), '')) else '' end
    || case when f.valor_cotado is not null then format(v_linha, 'Valor cotado', '<strong>' || formatar_brl(f.valor_cotado) || '</strong>') else '' end
    || case when p_saldo is not null then format(v_linha, 'Verba disponível (.510)', '<strong>' || formatar_brl(greatest(p_saldo, 0)) || '</strong>'
         || case when f.valor_cotado is not null and p_saldo < f.valor_cotado
                 then ' <span style="color:#b91c1c;">(faltam ' || formatar_brl(f.valor_cotado - greatest(p_saldo, 0)) || ')</span>' else '' end) else '' end
    || case when coalesce(f.transportadora_nome, '') <> '' then format(v_linha, 'Transportadora', html_esc(f.transportadora_nome)) else '' end
    || format(v_linha, 'Solicitado por', html_esc(coalesce(f.nome_solicitante, '')))
    || case when coalesce(f.observacao, '') <> '' then format(v_linha, 'Observação', replace(html_esc(f.observacao), E'\n', '<br/>')) else '' end
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || p_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir o frete no app</a>'
    || '</td></tr></table>';
end $function$
;

-- public.email_frete_sem_verba(p_obra public.obras, p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb)
CREATE OR REPLACE FUNCTION public.email_frete_sem_verba(p_obra public.obras, p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
  v_ctes text := '';
  c jsonb;
  v_url text := 'https://gestaoobraskalter.vercel.app/obras/' || p_obra.codigo_externo || '/previsoes';
begin
  for c in select * from jsonb_array_elements(coalesce(p_ctes, '[]'::jsonb)) loop
    v_ctes := v_ctes || '<li style="margin:2px 0;">AD ' || html_esc(c->>'ad') || coalesce(' · ' || html_esc(nullif(c->>'transportadora', '')), '')
              || ' · <strong>' || formatar_brl((c->>'valor')::numeric) || '</strong></li>';
  end loop;
  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">Falta verba para fretes na obra ' || html_esc(p_obra.codigo_externo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:#b91c1c; background:#fee2e2;">FALTAM '
    || formatar_brl(p_faltante) || ' NA ' || html_esc(p_familia) || '</span></p>'
    || '<p style="margin:0 0 14px 0; font-size:15px; color:#1e293b;">Há fretes (CT-e) lançados no ERP para esta obra que não puderam baixar a previsão da família de fretes, porque a verba acabou. '
    || 'Para regularizar, abra no app uma <strong>solicitação de aumento</strong> ou uma <strong>transferência</strong> de outra família para a <strong>' || html_esc(p_familia) || '</strong>. '
    || 'Assim que a verba entrar, o robô baixa os CT-es sozinho.</p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Obra', html_esc(p_obra.codigo_externo || ' - ' || p_obra.nome))
    || format(v_linha, 'Família', html_esc(p_familia))
    || format(v_linha, 'Verba disponível', formatar_brl(greatest(p_disponivel, 0)))
    || format(v_linha, 'Valor que falta', '<strong style="color:#b91c1c;">' || formatar_brl(p_faltante) || '</strong>')
    || format(v_linha, 'CT-es sem verba', '<ul style="margin:0; padding-left:18px;">' || v_ctes || '</ul>')
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || v_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir as previsões da obra</a>'
    || '</td></tr></table>';
end $function$
;

-- public.email_nf_terceiros(n public.nfs_terceiros, p_titulo text, p_aviso text, p_cor text, p_url text)
CREATE OR REPLACE FUNCTION public.email_nf_terceiros(n public.nfs_terceiros, p_titulo text, p_aviso text, p_cor text, p_url text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_obra text; v_ped record; v_anexos text; v_pedido text; v_saldo_apos numeric;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
  v_sub text := '<br/><span style="font-size:13px; color:#475569;">%s</span>';
begin
  select coalesce(ob.codigo_externo || ' - ' || ob.nome, n.codigo_obra) into v_obra from public.obras ob where ob.id = n.id_obra;
  select sum(valor) as total,
         coalesce(sum(case when situacao = 'recebida' and nr_ad is distinct from n.nr_ad then coalesce(valor_nf, valor) end), 0) as recebido
    into v_ped from public.obra_servicos_parcelas where id_obra = n.id_obra and nr_pedido = n.nr_pedido;
  select string_agg(html_esc(a->>'nome'), '<br/>') into v_anexos from jsonb_array_elements(n.anexos) a;

  v_pedido := '<strong>' || n.nr_pedido::text || '</strong>';
  if v_ped.total is not null then
    v_pedido := v_pedido
      || format(v_sub, 'Valor do pedido ' || formatar_brl(v_ped.total))
      || format(v_sub, 'Antes desta NF: Recebido ' || formatar_brl(v_ped.recebido) || ' · Saldo ' || formatar_brl(v_ped.total - v_ped.recebido));
    if n.status not in ('cancelada', 'devolvida') then
      v_saldo_apos := v_ped.total - v_ped.recebido - n.valor;
      v_pedido := v_pedido || format(v_sub, 'Após esta NF: Recebido ' || formatar_brl(v_ped.recebido + n.valor) || ' · Saldo '
        || case when v_saldo_apos < 0
                then '<strong style="color:#b91c1c;">' || formatar_brl(v_saldo_apos) || ' (ultrapassa o pedido)</strong>'
                else '<strong style="color:#1e293b;">' || formatar_brl(v_saldo_apos) || '</strong>' end);
    end if;
  end if;

  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">' || html_esc(p_titulo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:' || p_cor || '; background:'
    || case p_cor when '#b45309' then '#fef3c7' when '#047857' then '#d1fae5' when '#b91c1c' then '#fee2e2' when '#1d4ed8' then '#dbeafe' else '#f1f5f9' end || ';">' || html_esc(p_aviso) || '</span></p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Fornecedor', '<strong>' || html_esc(n.fornecedor) || '</strong>' || coalesce('<br/>CNPJ ' || html_esc(n.cnpj), ''))
    || format(v_linha, 'Nota fiscal', '<strong>' || html_esc(n.numero_nf) || '</strong> · emitida em ' || to_char(n.data_emissao, 'DD/MM/YYYY'))
    || format(v_linha, 'Valor', '<strong>' || formatar_brl(n.valor) || '</strong>')
    || format(v_linha, 'Vencimento', '<strong>' || to_char(n.vencimento, 'DD/MM/YYYY') || '</strong>')
    || case when n.forma_pagamento is not null then format(v_linha, 'Forma de pagamento', public.nft_pagamento_html(n.forma_pagamento, n.dados_pagamento)) else '' end
    || format(v_linha, 'Pedido de compra', v_pedido)
    || format(v_linha, 'Obra', html_esc(coalesce(v_obra, n.codigo_obra)))
    || format(v_linha, 'Encaminhada por', html_esc(coalesce(n.nome_encaminhou, '')) || ' · ' || to_char(n.encaminhado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'))
    || case when coalesce(v_anexos, '') <> '' then format(v_linha, 'Anexos', v_anexos) else '' end
    || case when coalesce(n.observacao, '') <> '' then format(v_linha, 'Observação', replace(html_esc(n.observacao), E'\n', '<br/>')) else '' end
    || case when n.status = 'devolvida' then format(v_linha, 'Devolvida por', html_esc(coalesce(n.nome_devolveu, '')) || ': ' || html_esc(coalesce(n.motivo_devolucao, ''))) else '' end
    || case when n.status = 'cancelada' then format(v_linha, 'Motivo', html_esc(coalesce(n.motivo_cancelamento, ''))) else '' end
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || p_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir no app</a>'
    || '</td></tr></table>';
end $function$
;

-- public.email_solicitacao_faturamento(s public.solicitacoes_faturamento, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text)
CREATE OR REPLACE FUNCTION public.email_solicitacao_faturamento(s public.solicitacoes_faturamento, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_obra text;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
  v_linhas text;
  v_itens text;
  v_aprov boolean := s.aprovado_em is not null;
  v_nfs text;
  v_rom text;
begin
  select coalesce(ob.codigo_externo || ' - ' || ob.nome, s.codigo_obra) into v_obra from public.obras ob where ob.id = s.id_obra;
  select string_agg(
      '<tr><td style="padding:5px 8px 5px 0; font-size:13px; color:#475569; vertical-align:top;">' || i.sequencia || '</td>'
    || '<td style="padding:5px 8px; font-size:13px; color:#1e293b;">' || html_esc(coalesce(i.codigo_material, '')) || ' – ' || html_esc(left(coalesce(i.descricao, ''), 60)) || '</td>'
    || '<td style="padding:5px 8px; font-size:13px; text-align:right; white-space:nowrap;">'
    || trim(to_char(coalesce(case when v_aprov then i.quantidade_aprovada end, i.quantidade_solicitada), 'FM999G990D0000')) || ' ' || coalesce(i.unidade, '')
    || ' <span style="color:#64748b;">(' || trim(to_char(coalesce(case when v_aprov then i.quantidade_aprovada end, i.quantidade_solicitada) / nullif(i.quantidade_pedido, 0) * 100, 'FM990D0')) || '%)</span></td>'
    || '<td style="padding:5px 0 5px 8px; font-size:13px; text-align:right; white-space:nowrap;">' || formatar_brl(coalesce(case when v_aprov then i.valor_aprovado end, i.valor_solicitado)) || '</td></tr>',
      '' order by i.sequencia)
    into v_itens
    from public.solicitacoes_faturamento_itens i
   where i.id_solicitacao = s.id and coalesce(case when v_aprov then i.quantidade_aprovada end, i.quantidade_solicitada) > 0;
  select string_agg('NF ' || html_esc(n.numero_nf) || ' (série ' || html_esc(n.serie_nf) || ') · ' || to_char(n.data_emissao, 'DD/MM/YYYY')
           || ' · ' || formatar_brl(n.valor) || case when n.divergente then ' <span style="color:#b91c1c;">· diferente do solicitado</span>' else '' end, '<br/>')
    into v_nfs from public.solicitacoes_faturamento_nfs n where n.id_solicitacao = s.id;

  select string_agg('<strong>' || r.numero_romaneio || '</strong>' || case r.situacao when 'faturado' then ' (faturado)' else ' (liberado para faturar)' end, '<br/>' order by r.created_at)
    into v_rom from public.solicitacoes_faturamento_romaneios r where r.id_solicitacao = s.id and r.situacao in ('criado', 'faturado');
  v_linhas :=
       format(v_linha, 'Solicitação', '<strong>SF ' || s.numero || '</strong> · ' || case s.tipo when 'produto' then 'Produto' else 'Serviço' end)
    || format(v_linha, 'Obra', html_esc(coalesce(v_obra, s.codigo_obra)))
    || format(v_linha, 'Valor', '<strong>' || formatar_brl(coalesce(s.valor_aprovado, s.valor_solicitado)) || '</strong>'
         || case when s.valor_aprovado is not null and s.valor_aprovado <> s.valor_solicitado
                 then ' <span style="color:#64748b;">(solicitado ' || formatar_brl(s.valor_solicitado) || ')</span>' else '' end)
    || format(v_linha, 'Faturar até', coalesce(to_char(s.data_desejada, 'DD/MM/YYYY'), '-'))
    || format(v_linha, 'Solicitante', html_esc(coalesce(s.nome_solicitante, '')) || coalesce(' · ' || to_char(s.enviado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'), ''))
    || case when coalesce(s.observacao, '') <> '' then format(v_linha, 'Observação', replace(html_esc(s.observacao), E'\n', '<br/>')) else '' end
    || case when v_aprov then format(v_linha, 'Logística', html_esc(coalesce(s.nome_aprovador, '')) || ' · ' || to_char(s.aprovado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')) else '' end
    || case when v_aprov and s.tipo = 'produto' then format(v_linha, 'Transporte',
           html_esc(coalesce(s.transportadora, '-')) || '<br/>Peso bruto ' || coalesce(trim(to_char(s.peso_bruto, 'FM999G999G990D000')), '-') || ' kg · líquido '
           || coalesce(trim(to_char(s.peso_liquido, 'FM999G999G990D000')), '-') || ' kg · ' || coalesce(s.volumes::text, '-') || ' volume(s)'
           || coalesce(' (' || html_esc(s.especie_volumes) || ')', '')) else '' end
    || case when v_rom is not null then format(v_linha, 'Romaneio no ERP', v_rom) else '' end
    || case when coalesce(s.observacao_logistica, '') <> '' then format(v_linha, 'Obs. logística', replace(html_esc(s.observacao_logistica), E'\n', '<br/>')) else '' end
    || case when s.status in ('devolvida', 'aguardando_logistica') and coalesce(s.motivo_devolucao, '') <> ''
         then format(v_linha, 'Devolvida por', html_esc(coalesce(s.nome_devolveu, '')) || ': ' || html_esc(s.motivo_devolucao)) else '' end
    || case when s.status = 'cancelada' then format(v_linha, 'Motivo', html_esc(coalesce(s.motivo_cancelamento, ''))) else '' end
    || case when v_nfs is not null then format(v_linha, 'Nota fiscal', v_nfs) else '' end;

  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">' || html_esc(p_titulo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:' || p_cor || '; background:'
    || case p_cor when '#b45309' then '#fef3c7' when '#047857' then '#d1fae5' when '#b91c1c' then '#fee2e2' when '#1d4ed8' then '#dbeafe' else '#f1f5f9' end || ';">' || html_esc(p_aviso) || '</span></p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">' || v_linhas || '</table>'
    || case when v_itens is null then '' else
         '<p style="margin:18px 0 6px 0; font-size:13px; font-weight:bold; color:#475569;">Itens do pedido</p>'
      || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">'
      || '<tr><td style="font-size:11px; color:#64748b; padding-bottom:4px;">Seq.</td><td style="font-size:11px; color:#64748b; padding:0 8px 4px 8px;">Material</td>'
      || '<td style="font-size:11px; color:#64748b; text-align:right; padding:0 8px 4px 8px;">Quantidade</td><td style="font-size:11px; color:#64748b; text-align:right; padding-bottom:4px;">Valor c/ IPI</td></tr>'
      || v_itens || '</table>' end
    || case when p_url is null then '' else '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
      || '<a href="' || p_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">' || html_esc(p_botao) || '</a>'
      || '</td></tr></table>' end;
end $function$
;

-- public.email_solicitacao_material(s public.solicitacoes_material, p_titulo text, p_aviso text, p_cor text, p_url text)
CREATE OR REPLACE FUNCTION public.email_solicitacao_material(s public.solicitacoes_material, p_titulo text, p_aviso text, p_cor text, p_url text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
begin
  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">' || html_esc(p_titulo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:' || p_cor || '; background:'
    || case p_cor when '#b45309' then '#fef3c7' when '#047857' then '#d1fae5' when '#b91c1c' then '#fee2e2' when '#1d4ed8' then '#dbeafe' else '#f1f5f9' end || ';">' || html_esc(p_aviso) || '</span></p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Item', '<strong>' || html_esc(s.descricao) || '</strong>'
         || case when s.descricao <> s.descricao_solicitada then '<br/><span style="font-size:13px; color:#475569;">Pedido como: ' || html_esc(s.descricao_solicitada) || '</span>' else '' end)
    || case when s.origem is not null then format(v_linha, 'Origem', (case s.origem when 'comprado' then 'Comprado' when 'produzido' then 'Produzido' else 'Serviço' end)) else '' end
    || format(v_linha, 'Classe / tipo', html_esc(public.mat_classe_rotulo(s.classe_tipo)))
    || format(v_linha, 'Unidade', html_esc(s.unidade))
    || case when s.aplicacao is not null then format(v_linha, 'Aplicação', replace(html_esc(s.aplicacao), E'\n', '<br/>')) else '' end
    || case when coalesce(s.ncm, s.ncm_sugerido) is not null then format(v_linha, 'NCM', html_esc(coalesce(s.ncm, s.ncm_sugerido || ' (sugerido)'))) else '' end
    || case when s.codigo_erp is not null then format(v_linha, 'Código no ERP', '<strong>' || html_esc(coalesce(s.codigo_edit, s.codigo_erp::text)) || '</strong>') else '' end
    || case when s.status = 'recusada' and s.codigo_existente is not null then format(v_linha, 'Usar o item', '<strong>' || html_esc(coalesce(s.codigo_edit, s.codigo_existente::text)) || '</strong>') else '' end
    || case when s.motivo is not null and s.status in ('devolvida', 'recusada', 'cadastro', 'fiscal') then format(v_linha, 'Motivo', html_esc(coalesce(s.nome_motivo || ': ', '')) || html_esc(s.motivo)) else '' end
    || format(v_linha, 'Solicitado por', html_esc(coalesce(s.nome_solicitante, '')) || ' · ' || to_char(s.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
         || case when s.urgente then ' · <strong style="color:#b91c1c;">URGENTE</strong>' else '' end)
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || p_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir no app</a>'
    || '</td></tr></table>';
end $function$
;

-- public.email_solicitacao_previsao(s public.solicitacoes_previsao, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text)
CREATE OR REPLACE FUNCTION public.email_solicitacao_previsao(s public.solicitacoes_previsao, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_obra text;
  v_origens text := '';
  o jsonb;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
  v_linhas text;
begin
  select coalesce(ob.codigo_externo || ' - ' || ob.nome, s.codigo_obra) into v_obra from public.obras ob where ob.id = s.id_obra;
  if s.tipo = 'transferencia' then
    for o in select * from jsonb_array_elements(s.origens) loop
      v_origens := v_origens || familia_com_nome(s.id_obra, o->>'familia') || ' (' || formatar_brl((o->>'valor')::numeric) || ')<br/>';
    end loop;
  end if;
  v_linhas :=
       format(v_linha, 'Obra', html_esc(coalesce(v_obra, s.codigo_obra)))
    || format(v_linha, 'Tipo', case s.tipo when 'aumento' then 'Aumento de previsão' else 'Transferência entre previsões' end)
    || format(v_linha, 'Valor', '<strong>' || formatar_brl(s.valor) || '</strong>')
    || case when s.tipo = 'transferencia' then format(v_linha, 'De', v_origens) else '' end
    || format(v_linha, case when s.tipo = 'transferencia' then 'Para' else 'Família' end, '<strong>' || familia_com_nome(s.id_obra, s.familia_destino) || '</strong>')
    || case when s.tipo = 'aumento' and (s.disponivel_informado is not null or s.necessario_informado is not null)
         then format(v_linha, 'Disponível / necessário', formatar_brl(s.disponivel_informado) || ' / ' || formatar_brl(s.necessario_informado)) else '' end
    || format(v_linha, 'Solicitante', html_esc(s.nome_solicitante) || ' · ' || to_char(s.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'))
    || format(v_linha, 'Justificativa', replace(html_esc(s.justificativa), E'\n', '<br/>'))
    || case when jsonb_array_length(coalesce(s.anexos, '[]'::jsonb)) > 0
         then format(v_linha, 'Anexos', (select string_agg('📎 ' || html_esc(a->>'nome'), '<br/>') from jsonb_array_elements(s.anexos) a)
              || '<br/><span style="font-size:12px;color:#64748b;">Abra a solicitação no app para ver os arquivos.</span>')
         else '' end
    || case when s.status = 'executada' and s.resultado ? 'nova_parcela'
         then format(v_linha, 'Gravado no ERP', 'previsão ' || html_esc(s.resultado->'nova_parcela'->>'docto') || ', parcela ' || html_esc(s.resultado->'nova_parcela'->>'parcela')) else '' end
    || case when s.status = 'recusada' and coalesce(s.motivo_recusa, '') <> ''
         then format(v_linha, 'Motivo', html_esc(s.motivo_recusa)) else '' end
    || case when s.status = 'erro' and coalesce(s.mensagem, '') <> ''
         then format(v_linha, 'Detalhe', html_esc(left(s.mensagem, 300))) else '' end;

  return '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">' || html_esc(p_titulo) || '</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; letter-spacing:0.4px; color:' || p_cor || '; background:' || case p_cor when '#b45309' then '#fef3c7' when '#047857' then '#d1fae5' when '#b91c1c' then '#fee2e2' else '#f1f5f9' end || ';">' || html_esc(p_aviso) || '</span></p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">' || v_linhas || '</table>'
    || case when p_url is null then '' else '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || p_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">' || html_esc(p_botao) || '</a>'
    || '</td></tr></table>' end;
end $function$
;

-- public.enfileirar_email(p_para text[], p_assunto text, p_html text, p_origem text, p_id_tarefa uuid)
CREATE OR REPLACE FUNCTION public.enfileirar_email(p_para text[], p_assunto text, p_html text, p_origem text DEFAULT 'app'::text, p_id_tarefa uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_usuario uuid := public.usuario_atual_id(); v_para text[]; v_invalidos text[]; v_id uuid;
begin
  if v_usuario is null then raise exception 'Usuario nao identificado'; end if;
  select array_agg(distinct lower(trim(e))) into v_para from unnest(p_para) e where coalesce(trim(e), '') <> '';
  if v_para is null then raise exception 'Nenhum destinatario informado'; end if;
  if array_length(v_para, 1) > 50 then raise exception 'Destinatarios demais'; end if;
  select array_agg(e) into v_invalidos from unnest(v_para) e
   where not exists (select 1 from public.usuarios u where lower(u.email) = e and u.ativo);
  if v_invalidos is not null then
    raise exception 'Destinatario fora do cadastro de usuarios: %', array_to_string(v_invalidos, ', ');
  end if;
  if coalesce(trim(p_assunto), '') = '' or coalesce(p_html, '') = '' then raise exception 'Assunto e corpo sao obrigatorios'; end if;
  if length(p_html) > 500000 then raise exception 'E-mail grande demais'; end if;
  insert into public.fila_email (para, assunto, html, origem, id_tarefa, criado_por)
  values (v_para, left(p_assunto, 250), p_html, left(coalesce(p_origem, 'app'), 40), p_id_tarefa, v_usuario)
  returning id into v_id;
  return v_id;
end $function$
;

-- public.exportacao_aprovar(p_id_obra uuid, p_hash text)
CREATE OR REPLACE FUNCTION public.exportacao_aprovar(p_id_obra uuid, p_hash text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_u record; v_p record;
begin
  if not public.pode_aprovar_exportacao(p_id_obra) then raise exception 'Só administrador, coordenador ou fiscal aprova os documentos de exportação.'; end if;
  select * into v_u from public.usuarios u where u.id = public.usuario_atual_id();
  select * into v_p from public.exportacao_processos p where p.id_obra = p_id_obra for update;
  if v_p.id is null then raise exception 'Não há processo de exportação nesta obra.'; end if;
  if p_hash is distinct from v_p.hash_dados then raise exception 'Houve alteração depois que você abriu; revise de novo.'; end if;
  update public.exportacao_processos p
     set aprovacao = jsonb_build_object('hash', v_p.hash_dados, 'em', to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS'),
                                        'por', v_u.nome, 'id_usuario', v_u.id),
         situacao = case when p.situacao = 'gerado' then 'gerado' else 'aprovado' end
   where p.id = v_p.id;
end $function$
;

-- public.exportacao_baixar(p_id uuid)
CREATE OR REPLACE FUNCTION public.exportacao_baixar(p_id uuid)
 RETURNS TABLE(nome_arquivo text, conteudo_base64 text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare v_d record;
begin
  select d.id_obra, d.situacao, d.nome_arquivo, d.arquivo into v_d from public.exportacao_documentos d where d.id = p_id;
  if v_d.id_obra is null then raise exception 'Documento não encontrado.'; end if;
  if not public.pode_ver_exportacao(v_d.id_obra) then raise exception 'Você não tem acesso à exportação desta obra.'; end if;
  if v_d.situacao <> 'gerado' or v_d.arquivo is null then raise exception 'Este documento ainda não foi gerado.'; end if;
  return query select v_d.nome_arquivo, translate(encode(v_d.arquivo, 'base64'), E'\n', '');
end $function$
;

-- public.exportacao_config_salvar(p_exportador jsonb, p_banco text, p_local text)
CREATE OR REPLACE FUNCTION public.exportacao_config_salvar(p_exportador jsonb, p_banco text, p_local text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_u record;
begin
  if not public.eh_admin_ou_coordenador() then raise exception 'Só administrador ou coordenador altera os dados da exportação.'; end if;
  if p_exportador is null or jsonb_typeof(p_exportador) <> 'object' then raise exception 'Dados do exportador inválidos.'; end if;
  select * into v_u from public.usuarios u where u.id = public.usuario_atual_id();
  insert into public.exportacao_config as c (id, exportador, banco, local_embarque, atualizado_por)
  values (1, p_exportador, p_banco, coalesce(nullif(trim(coalesce(p_local, '')), ''), 'Joinville, SC'), v_u.nome)
  on conflict (id) do update set exportador = excluded.exportador, banco = excluded.banco, local_embarque = excluded.local_embarque,
    atualizado_por = excluded.atualizado_por, atualizado_em = now();
end $function$
;

-- public.exportacao_estimativa_salvar(p_codigo text, p_peso numeric, p_bruto numeric, p_comp numeric, p_larg numeric, p_alt numeric, p_fonte text)
CREATE OR REPLACE FUNCTION public.exportacao_estimativa_salvar(p_codigo text, p_peso numeric, p_bruto numeric, p_comp numeric, p_larg numeric, p_alt numeric, p_fonte text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_u record;
begin
  if not public.eh_admin_ou_coordenador() then raise exception 'Só administrador ou coordenador altera as estimativas.'; end if;
  if coalesce(trim(p_codigo), '') = '' then raise exception 'Informe o código do material.'; end if;
  if (p_peso is not null and p_peso < 0) or (p_bruto is not null and p_bruto < 0) or (p_comp is not null and p_comp < 0)
     or (p_larg is not null and p_larg < 0) or (p_alt is not null and p_alt < 0) then raise exception 'Valores não podem ser negativos.'; end if;
  select * into v_u from public.usuarios u where u.id = public.usuario_atual_id();
  insert into public.exportacao_estimativas as e (codigo_material, peso, bruto, comp, larg, alt, fonte, atualizado_por)
  values (trim(p_codigo), p_peso, p_bruto, p_comp, p_larg, p_alt, nullif(trim(coalesce(p_fonte, '')), ''), v_u.nome)
  on conflict (codigo_material) do update set peso = excluded.peso, bruto = excluded.bruto, comp = excluded.comp, larg = excluded.larg,
    alt = excluded.alt, fonte = excluded.fonte, atualizado_por = excluded.atualizado_por, atualizado_em = now();
end $function$
;

-- public.exportacao_marcar_obra(p_id_obra uuid, p_exportacao boolean)
CREATE OR REPLACE FUNCTION public.exportacao_marcar_obra(p_id_obra uuid, p_exportacao boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_admin() then raise exception 'Só administradores marcam uma obra como obra de exportação.'; end if;
  update public.obras o set exportacao = coalesce(p_exportacao, false) where o.id = p_id_obra;
  if not found then raise exception 'Obra não encontrada.'; end if;
end $function$
;

-- public.exportacao_pedir_documento(p_id_obra uuid, p_tipo text)
CREATE OR REPLACE FUNCTION public.exportacao_pedir_documento(p_id_obra uuid, p_tipo text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_u record; v_p record; v_id uuid;
begin
  if not public.pode_editar_exportacao(p_id_obra) then raise exception 'Você não tem acesso à exportação desta obra.'; end if;
  if p_tipo not in ('rascunho', 'final') then raise exception 'Tipo de documento inválido.'; end if;
  select * into v_u from public.usuarios u where u.id = public.usuario_atual_id();
  select * into v_p from public.exportacao_processos p where p.id_obra = p_id_obra for update;
  if v_p.id is null then raise exception 'Não há processo de exportação nesta obra.'; end if;
  if p_tipo = 'final' and (v_p.aprovacao ->> 'hash') is distinct from v_p.hash_dados then
    raise exception 'Aprove os documentos antes de gerar os finais (houve alteração depois da aprovação).';
  end if;
  select d.id into v_id from public.exportacao_documentos d where d.id_processo = v_p.id and d.tipo = p_tipo and d.situacao = 'pendente' limit 1;
  if v_id is not null then
    -- ja ha um pedido na fila: vale o estado atual do processo, sem duplicar
    update public.exportacao_documentos d set hash_dados = v_p.hash_dados where d.id = v_id and d.hash_dados <> v_p.hash_dados;
    return v_id;
  end if;
  insert into public.exportacao_documentos (id_processo, id_obra, tipo, hash_dados, pedido_por, nome_pedido_por)
  values (v_p.id, p_id_obra, p_tipo, v_p.hash_dados, v_u.id, v_u.nome) returning id into v_id;
  return v_id;
end $function$
;

-- public.exportacao_salvar(p_id_obra uuid, p_dados jsonb)
CREATE OR REPLACE FUNCTION public.exportacao_salvar(p_id_obra uuid, p_dados jsonb)
 RETURNS TABLE(hash_dados text, situacao text, atualizado_em timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare v_u record; v_obra record; v_p record; v_dados jsonb := p_dados - 'aprovacao';
begin
  if not public.pode_editar_exportacao(p_id_obra) then raise exception 'Você não tem acesso à exportação desta obra.'; end if;
  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then raise exception 'Dados do processo inválidos.'; end if;
  if octet_length(p_dados::text) > 2000000 then raise exception 'Processo grande demais para salvar.'; end if;
  select * into v_u from public.usuarios u where u.id = public.usuario_atual_id();
  select * into v_obra from public.obras o where o.id = p_id_obra;
  if v_obra.id is null then raise exception 'Obra não encontrada.'; end if;
  if not v_obra.exportacao then raise exception 'Esta obra não está marcada como obra de exportação.'; end if;

  select * into v_p from public.exportacao_processos p where p.id_obra = p_id_obra for update;
  if v_p.id is null then
    insert into public.exportacao_processos (id_obra, dados, criado_por, atualizado_por, nome_atualizou)
    values (p_id_obra, v_dados, v_u.id, v_u.id, v_u.nome);
  elsif v_p.dados is distinct from v_dados then   -- igual ao que ja esta: nao grava (Disk IO)
    update public.exportacao_processos p set dados = v_dados, atualizado_por = v_u.id, nome_atualizou = v_u.nome, atualizado_em = now()
     where p.id = v_p.id;
  end if;
  return query select p.hash_dados, p.situacao, p.atualizado_em from public.exportacao_processos p where p.id_obra = p_id_obra;
end $function$
;

-- public.familia_com_nome(p_id_obra uuid, p_familia text)
CREATE OR REPLACE FUNCTION public.familia_com_nome(p_id_obra uuid, p_familia text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select html_esc(p_familia) || coalesce(' · ' || html_esc(nullif(trim(
    (select f.descricao from public.obra_rentabilidade_familias f
      where f.id_obra = p_id_obra and f.codigo_projeto = p_familia limit 1)), '')), '');
$function$
;

-- public.faturamento_cancelar(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.faturamento_cancelar(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sol record;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  select * into v_sol from public.solicitacoes_faturamento where id = p_id for update;
  if v_sol.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_sol.status not in ('rascunho', 'devolvida', 'aguardando_logistica', 'aguardando_fiscal') then
    raise exception 'Esta solicitação não pode mais ser cancelada.';
  end if;
  if not (v_sol.id_solicitante = public.usuario_atual_id() or coalesce(public.pode_gerenciar_obra(v_sol.id_obra), false)
          or public.eh_admin_ou_coordenador()) then
    raise exception 'Você não pode cancelar esta solicitação.';
  end if;
  update public.solicitacoes_faturamento set status = 'cancelada', motivo_cancelamento = trim(p_motivo), cancelado_em = now(),
    updated_at = now() where id = p_id;
  perform public.sf_descartar_romaneios(p_id);
  perform public.sf_evento(p_id, 'cancelada', trim(p_motivo));
end $function$
;

-- public.faturamento_devolver(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.faturamento_devolver(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sol record; v_nome text;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da devolução.'; end if;
  select nome into v_nome from public.usuarios where id = public.usuario_atual_id();
  select * into v_sol from public.solicitacoes_faturamento where id = p_id for update;
  if v_sol.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_sol.status = 'aguardando_logistica' and public.eh_aprovador_faturamento() then
    update public.solicitacoes_faturamento set status = 'devolvida', motivo_devolucao = trim(p_motivo), devolvido_em = now(),
      nome_devolveu = v_nome, updated_at = now() where id = p_id;
    perform public.sf_evento(p_id, 'devolvida', 'Devolvida ao solicitante: ' || trim(p_motivo));
  elsif v_sol.status = 'aguardando_fiscal' and (public.eh_fiscal() or public.eh_aprovador_faturamento()) then
    update public.solicitacoes_faturamento set status = 'aguardando_logistica', motivo_devolucao = trim(p_motivo),
      devolvido_em = now(), nome_devolveu = v_nome, aprovado_em = null, valor_aprovado = null, updated_at = now() where id = p_id;
    update public.solicitacoes_faturamento_itens set quantidade_aprovada = null, valor_aprovado = null, volumes = null where id_solicitacao = p_id;
    perform public.sf_descartar_romaneios(p_id);
    perform public.sf_evento(p_id, 'devolvida_logistica', 'Devolvida à logística: ' || trim(p_motivo));
  else
    raise exception 'Você não pode devolver esta solicitação agora.';
  end if;
end $function$
;

-- public.faturamento_logistica_aprovar(p_id uuid, p_itens jsonb, p_peso_bruto numeric, p_peso_liquido numeric, p_volumes integer, p_especie text, p_codigo_transportadora integer, p_transportadora text, p_observacao text)
CREATE OR REPLACE FUNCTION public.faturamento_logistica_aprovar(p_id uuid, p_itens jsonb, p_peso_bruto numeric, p_peso_liquido numeric, p_volumes integer, p_especie text, p_codigo_transportadora integer, p_transportadora text, p_observacao text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sol record; v_usuario record; v_total numeric; v_volumes int := p_volumes;
begin
  if not public.eh_aprovador_faturamento() then raise exception 'Você não tem permissão para aprovar faturamento.'; end if;
  select * into v_usuario from public.usuarios where id = public.usuario_atual_id();
  select * into v_sol from public.solicitacoes_faturamento where id = p_id for update;
  if v_sol.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_sol.status <> 'aguardando_logistica' then raise exception 'A solicitação não está aguardando a logística.'; end if;
  if v_sol.tipo = 'produto' then
    if coalesce(v_usuario.login_erp, '') = '' then
      raise exception 'Seu usuário não está vinculado a um usuário do ERP (necessário para gerar o romaneio). Peça ao administrador para vincular na tela Equipe.';
    end if;
    if coalesce(p_peso_bruto, 0) <= 0 or coalesce(p_peso_liquido, 0) <= 0 then raise exception 'Informe o peso bruto e o peso líquido.'; end if;
    if p_peso_liquido > p_peso_bruto then raise exception 'O peso líquido não pode ser maior que o bruto.'; end if;
    if coalesce(p_codigo_transportadora, 0) <= 0 then raise exception 'Escolha a transportadora da lista.'; end if;
  end if;
  v_total := public.sf_gravar_itens(p_id, v_sol.id_obra, v_sol.tipo, p_itens, true);
  if v_sol.tipo = 'produto' then
    select coalesce(sum(volumes), 0) into v_volumes from public.solicitacoes_faturamento_itens
     where id_solicitacao = p_id and quantidade_aprovada > 0;
    if exists (select 1 from public.solicitacoes_faturamento_itens where id_solicitacao = p_id and quantidade_aprovada > 0 and volumes is null) then
      raise exception 'Informe os volumes de cada item (0 se for junto com outro item).';
    end if;
    if v_volumes <= 0 then raise exception 'Informe a quantidade de volumes.'; end if;
  end if;
  update public.solicitacoes_faturamento
     set status = 'aguardando_fiscal', valor_aprovado = v_total, id_aprovador = v_usuario.id, nome_aprovador = v_usuario.nome,
         aprovado_em = now(), peso_bruto = p_peso_bruto, peso_liquido = p_peso_liquido, volumes = v_volumes,
         especie_volumes = nullif(trim(coalesce(p_especie, '')), ''), codigo_transportadora = p_codigo_transportadora,
         transportadora = nullif(trim(coalesce(p_transportadora, '')), ''),
         observacao_logistica = nullif(trim(coalesce(p_observacao, '')), ''), updated_at = now()
   where id = p_id;
  if v_sol.tipo = 'produto' then
    perform public.sf_descartar_romaneios(p_id);
    insert into public.solicitacoes_faturamento_romaneios (id_solicitacao, login_erp) values (p_id, v_usuario.login_erp);
  end if;
  perform public.sf_evento(p_id, 'aprovada', 'Aprovada pela logística: ' || formatar_brl(v_total)
    || case when v_total <> v_sol.valor_solicitado then ' (solicitado ' || formatar_brl(v_sol.valor_solicitado) || ')' else '' end);
end $function$
;

-- public.faturamento_salvar(p_id uuid, p_id_obra uuid, p_tipo text, p_data_desejada date, p_observacao text, p_itens jsonb, p_enviar boolean, p_anexos jsonb)
CREATE OR REPLACE FUNCTION public.faturamento_salvar(p_id uuid, p_id_obra uuid, p_tipo text, p_data_desejada date, p_observacao text, p_itens jsonb, p_enviar boolean, p_anexos jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_usuario record; v_obra record; v_sol record; v_id uuid := p_id; v_total numeric;
begin
  select * into v_usuario from public.usuarios where id = public.usuario_atual_id();
  if v_usuario.id is null then raise exception 'Usuário não identificado.'; end if;
  select * into v_obra from public.obras where id = p_id_obra;
  if v_obra.id is null then raise exception 'Obra não encontrada.'; end if;
  if not coalesce(public.pode_gerenciar_obra(p_id_obra), false) then
    raise exception 'Você não pode solicitar faturamento desta obra.';
  end if;
  if p_tipo not in ('produto', 'servico') then raise exception 'Tipo inválido.'; end if;

  if v_id is null then
    insert into public.solicitacoes_faturamento (id_obra, codigo_obra, tipo, id_solicitante, nome_solicitante)
    values (p_id_obra, v_obra.codigo_externo, p_tipo, v_usuario.id, v_usuario.nome)
    returning id into v_id;
    perform public.sf_evento(v_id, 'criada');
  else
    select * into v_sol from public.solicitacoes_faturamento where id = v_id for update;
    if v_sol.id is null or v_sol.id_obra <> p_id_obra then raise exception 'Solicitação não encontrada.'; end if;
    if v_sol.status not in ('rascunho', 'devolvida') then raise exception 'Esta solicitação não pode mais ser alterada.'; end if;
    if v_sol.tipo <> p_tipo then raise exception 'O tipo da solicitação não pode ser trocado.'; end if;
  end if;

  v_total := public.sf_gravar_itens(v_id, p_id_obra, p_tipo, p_itens, false);
  update public.solicitacoes_faturamento
     set data_desejada = p_data_desejada, observacao = nullif(trim(coalesce(p_observacao, '')), ''),
         anexos = coalesce(p_anexos, '[]'), valor_solicitado = v_total, updated_at = now(),
         status = case when p_enviar then 'aguardando_logistica' else status end,
         enviado_em = case when p_enviar then now() else enviado_em end,
         motivo_devolucao = case when p_enviar then null else motivo_devolucao end
   where id = v_id;
  if p_enviar then
    if p_data_desejada is null then raise exception 'Informe a data desejada de faturamento.'; end if;
    perform public.sf_evento(v_id, 'enviada', 'Enviada para a logística: ' || formatar_brl(v_total));
  end if;
  return v_id;
end $function$
;

-- public.finalizar_obra_pmis(p_id_obra uuid, p_data_finalizacao date, p_observacao text)
CREATE OR REPLACE FUNCTION public.finalizar_obra_pmis(p_id_obra uuid, p_data_finalizacao date, p_observacao text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_validacao record;
begin
  select *
  into v_validacao
  from public.validar_faturamento_obra_para_finalizar(p_id_obra);

  if not v_validacao.pode_finalizar then
    return jsonb_build_object(
      'ok', false,
      'mensagem', 'Não é possível finalizar a obra. Ainda existe faturamento pendente.',
      'escopo_total', v_validacao.escopo_total,
      'faturado_total', v_validacao.faturado_total,
      'saldo_a_faturar', v_validacao.saldo_a_faturar
    );
  end if;

  update public.obras
  set
    status = 'finalizada'::status_obra,
    data_finalizacao = p_data_finalizacao,
    observacao_finalizacao = p_observacao,
    updated_at = now()
  where id = p_id_obra;

  return jsonb_build_object(
    'ok', true,
    'mensagem', 'Obra finalizada com sucesso.',
    'escopo_total', v_validacao.escopo_total,
    'faturado_total', v_validacao.faturado_total,
    'saldo_a_faturar', v_validacao.saldo_a_faturar
  );
end;
$function$
;

-- public.formatar_brl(p_valor numeric)
CREATE OR REPLACE FUNCTION public.formatar_brl(p_valor numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select 'R$ ' || translate(to_char(coalesce(p_valor, 0), 'FM999,999,999,990.00'), ',.', '.,');
$function$
;

-- public.frete_avaliar(p_id uuid)
CREATE OR REPLACE FUNCTION public.frete_avaliar(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f public.fretes; v_saldo numeric; v_novo text;
begin
  select * into f from public.fretes where id = p_id for update;
  if f.id is null or f.status in ('realizado', 'cancelado') then return f.status; end if;
  if f.valor_cotado is null then
    v_novo := 'aguardando_cotacao';
  else
    v_saldo := public.frete_saldo(f.id_obra, f.id);
    v_novo := case when f.valor_cotado <= v_saldo + 0.005 then 'liberado' else 'bloqueado' end;
  end if;
  update public.fretes set status = v_novo, saldo_verificado = v_saldo, updated_at = now(),
         liberado_em = case when v_novo = 'liberado' and f.status <> 'liberado' then now() else liberado_em end,
         bloqueado_em = case when v_novo = 'bloqueado' and f.status <> 'bloqueado' then now() else bloqueado_em end
   where id = p_id;
  if v_novo = f.status and exists (select 1 from public.fretes_eventos e where e.id_frete = p_id and e.evento = v_novo) then
    return v_novo;
  end if;

  if v_novo = 'aguardando_cotacao' then
    perform public.frete_evento(p_id, 'aguardando_cotacao');
    perform public.frete_avisar(p_id, public.frete_logistica(), array[f.id_solicitante],
      'Frete para cotar · obra ' || f.codigo_obra || ' · frete ' || f.numero,
      'Novo pedido de frete para cotar', 'AGUARDANDO COTAÇÃO', '#1d4ed8', 'Frete para cotar');
  elsif v_novo = 'liberado' then
    perform public.frete_evento(p_id, 'liberado', 'Verba disponível ' || formatar_brl(v_saldo));
    perform public.frete_avisar(p_id, array_remove(public.frete_logistica() || array[f.id_solicitante], null), '{}',
      'Frete liberado · obra ' || f.codigo_obra || ' · frete ' || f.numero || ' · ' || formatar_brl(f.valor_cotado),
      'Frete liberado: há verba na família de fretes', 'LIBERADO', '#047857', 'Frete liberado');
  else
    perform public.frete_evento(p_id, 'bloqueado', 'Verba disponível ' || formatar_brl(greatest(v_saldo, 0)) || ' · cotado ' || formatar_brl(f.valor_cotado));
    perform public.frete_avisar(p_id, public.frete_gestores(f.id_obra), array_remove(public.frete_logistica() || array[f.id_solicitante], null),
      'Frete BLOQUEADO por falta de verba · obra ' || f.codigo_obra || ' · ' || f.familia || ' · ' || formatar_brl(f.valor_cotado),
      'Frete bloqueado: falta verba na família de fretes', 'SEM VERBA · PEÇA AUMENTO OU TRANSFERÊNCIA', '#b91c1c', 'Frete sem verba (' || f.familia || ')');
  end if;
  return v_novo;
end $function$
;

-- public.frete_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
CREATE OR REPLACE FUNCTION public.frete_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f public.fretes; d uuid; v_para text[]; v_cc text[]; v_saldo numeric;
begin
  select * into f from public.fretes where id = p_id;
  v_saldo := public.frete_saldo(f.id_obra, f.id);
  foreach d in array coalesce(p_para, '{}') loop
    if d is distinct from public.usuario_atual_id() then
      perform public.notificar_usuario(d, 'frete', p_titulo_push,
        'Frete ' || f.numero || ' · obra ' || f.codigo_obra || coalesce(' · ' || formatar_brl(f.valor_cotado), ''),
        f.id_obra, null, false, 'frete:' || f.id || ':' || f.status || ':' || extract(epoch from now())::bigint);
    end if;
  end loop;
  if not public.frete_email_ligado() then return; end if;
  v_para := public.sf_emails(p_para);
  v_cc := public.sf_emails(p_cc, v_para);
  if cardinality(v_para) = 0 then v_para := v_cc; v_cc := '{}'; end if;
  if cardinality(v_para) = 0 then return; end if;
  insert into public.fila_email (para, cc, assunto, html, origem)
  values (v_para, v_cc, p_assunto,
          public.email_frete(f, p_titulo, p_aviso, p_cor, 'https://gestaoobraskalter.vercel.app/fretes/' || f.id, v_saldo), 'frete');
end $function$
;

-- public.frete_avisar_sem_verba(p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb)
CREATE OR REPLACE FUNCTION public.frete_avisar_sem_verba(p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.obras;
  v_para uuid[]; v_cc uuid[]; v_emails text[]; v_cc_emails text[];
  v_assunto text := 'Falta verba para fretes · ' || p_familia || ' · faltam ' || formatar_brl(p_faltante);
begin
  if p_faltante is null or p_faltante <= 0 or not public.frete_sem_verba_email_ligado() then return false; end if;
  select * into o from public.obras where codigo_externo = split_part(p_familia, '.', 1) order by created_at desc limit 1;
  if o.id is null then return false; end if;
  if exists (select 1 from public.solicitacoes_previsao s where s.familia_destino = p_familia
              and s.status in ('simulando', 'aguardando_aprovacao', 'aprovada')) then return false; end if;
  -- 1 e-mail por dia por familia
  if exists (select 1 from public.fila_email f where f.origem = 'frete_sem_verba' and f.assunto like '%· ' || p_familia || ' ·%'
              and (f.created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date) then
    return false;
  end if;
  v_para := public.frete_gestores(o.id);
  select coalesce(array_agg(id), '{}') into v_cc from public.usuarios where ativo and recebe_copia_previsao;
  v_emails := public.sf_emails(v_para);
  v_cc_emails := public.sf_emails(v_cc, v_emails);
  if cardinality(v_emails) = 0 then return false; end if;
  insert into public.fila_email (para, cc, assunto, html, origem)
  values (v_emails, v_cc_emails, v_assunto, public.email_frete_sem_verba(o, p_familia, p_disponivel, p_faltante, p_ctes), 'frete_sem_verba');
  return true;
end $function$
;

-- public.frete_cancelar(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.frete_cancelar(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_f record;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  select * into v_f from public.fretes where id = p_id for update;
  if v_f.id is null then raise exception 'Frete não encontrado.'; end if;
  if v_f.status in ('realizado', 'cancelado') then raise exception 'Frete já realizado ou cancelado.'; end if;
  if not (public.eh_logistica() or v_f.id_solicitante = public.usuario_atual_id() or coalesce(public.pode_gerenciar_obra(v_f.id_obra), false)) then
    raise exception 'Você não pode cancelar este frete.';
  end if;
  update public.fretes set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = trim(p_motivo), updated_at = now() where id = p_id;
  perform public.frete_evento(p_id, 'cancelado', trim(p_motivo));
  -- a reserva voltou para o saldo: bloqueados da obra podem ser liberados
  perform public.frete_reavaliar_obra(v_f.id_obra);
end $function$
;

-- public.frete_carga_normalizar(p_carga jsonb, OUT itens jsonb, OUT peso numeric, OUT volumes integer, OUT cubagem numeric)
CREATE OR REPLACE FUNCTION public.frete_carga_normalizar(p_carga jsonb, OUT itens jsonb, OUT peso numeric, OUT volumes integer, OUT cubagem numeric)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare it jsonb; n int := 0; q int; p numeric; a numeric; l numeric; c numeric; d text;
begin
  itens := '[]'::jsonb;
  if p_carga is null or jsonb_typeof(p_carga) <> 'array' then return; end if;
  for it in select * from jsonb_array_elements(p_carga) loop
    n := n + 1;
    d := nullif(trim(coalesce(it->>'descricao', '')), '');
    q := coalesce(nullif(it->>'quantidade', '')::numeric, 1)::int;
    p := nullif(it->>'peso_kg', '')::numeric;
    a := nullif(it->>'altura_m', '')::numeric; l := nullif(it->>'largura_m', '')::numeric; c := nullif(it->>'comprimento_m', '')::numeric;
    if d is null and p is null and a is null and l is null and c is null then continue; end if;  -- linha vazia
    if q <= 0 then raise exception 'Item % da carga: a quantidade precisa ser maior que zero.', n; end if;
    if p is not null and p <= 0 then raise exception 'Item % da carga: o peso precisa ser maior que zero.', n; end if;
    if num_nonnulls(a, l, c) not in (0, 3) then raise exception 'Item % da carga: informe as três dimensões (A × L × C) ou nenhuma.', n; end if;
    if a <= 0 or l <= 0 or c <= 0 then raise exception 'Item % da carga: as dimensões precisam ser maiores que zero.', n; end if;
    itens := itens || jsonb_build_object('descricao', d, 'quantidade', q, 'peso_kg', p, 'altura_m', a, 'largura_m', l, 'comprimento_m', c);
    volumes := coalesce(volumes, 0) + q;
    if p is not null then peso := coalesce(peso, 0) + q * p; end if;
    if a is not null then cubagem := coalesce(cubagem, 0) + q * a * l * c; end if;
  end loop;
  peso := round(peso, 2); cubagem := round(cubagem, 3);
end $function$
;

-- public.frete_distancia(p_origem integer, p_destino integer)
CREATE OR REPLACE FUNCTION public.frete_distancia(p_origem integer, p_destino integer)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select km from public.fretes_rotas where origem_ibge = p_origem and destino_ibge = p_destino),
    (select km from public.fretes_rotas where origem_ibge = p_destino and destino_ibge = p_origem),
    (select case when p_origem = p_destino then 30
                 else round((2 * 6371 * asin(sqrt(power(sin(radians(b.lat - a.lat) / 2), 2)
                        + cos(radians(a.lat)) * cos(radians(b.lat)) * power(sin(radians(b.lon - a.lon) / 2), 2))) * 1.25)::numeric, 0) end
       from public.municipios a, public.municipios b where a.ibge = p_origem and b.ibge = p_destino));
$function$
;

-- public.frete_email_ligado()
CREATE OR REPLACE FUNCTION public.frete_email_ligado()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ select false $function$
;

-- public.frete_evento(p_id uuid, p_evento text, p_detalhe text)
CREATE OR REPLACE FUNCTION public.frete_evento(p_id uuid, p_evento text, p_detalhe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.fretes_eventos (id_frete, id_usuario, nome_usuario, evento, detalhe)
  select p_id, u.id, coalesce(u.nome, 'Sistema'), p_evento, p_detalhe
  from (select 1) x left join public.usuarios u on u.id = public.usuario_atual_id();
$function$
;

-- public.frete_gestores(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.frete_gestores(p_id_obra uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(distinct u.id), '{}') from public.obras o
    join public.usuarios u on u.ativo and (u.id = o.id_responsavel
                                           or (u.perfil = 'assistente' and u.id_engenheiro_vinculado = o.id_responsavel))
   where o.id = p_id_obra;
$function$
;

-- public.frete_logistica()
CREATE OR REPLACE FUNCTION public.frete_logistica()
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(id), '{}') from public.usuarios where ativo and perfil = 'logistica';
$function$
;

-- public.frete_marcar_transportadora(p_codigo integer, p_sim boolean)
CREATE OR REPLACE FUNCTION public.frete_marcar_transportadora(p_codigo integer, p_sim boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.eh_logistica() or public.eh_admin_ou_coordenador()) then raise exception 'Só a logística mantém as transportadoras.'; end if;
  update public.fornecedores_erp set transportadora = p_sim where codigo = p_codigo;
  if not found then raise exception 'Fornecedor % não encontrado.', p_codigo; end if;
end $function$
;

-- public.frete_reavaliar_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.frete_reavaliar_obra(p_id_obra uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; c integer := 0;
begin
  for r in select id from public.fretes where id_obra = p_id_obra and status = 'bloqueado' order by created_at loop
    if public.frete_avaliar(r.id) = 'liberado' then c := c + 1; end if;
  end loop;
  return c;
end $function$
;

-- public.frete_registrar_cte(p_nr_ad bigint, p_projeto text, p_codigo_obra text, p_numero_cte text, p_data_entrada date, p_cod_fornecedor integer, p_valor numeric, p_status text, p_baixas jsonb, p_mensagem text)
CREATE OR REPLACE FUNCTION public.frete_registrar_cte(p_nr_ad bigint, p_projeto text, p_codigo_obra text, p_numero_cte text, p_data_entrada date, p_cod_fornecedor integer, p_valor numeric, p_status text, p_baixas jsonb, p_mensagem text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_obra record; v_ant record; v_frete uuid; v_forn text; d uuid;
begin
  select id, codigo_externo into v_obra from public.obras where codigo_externo = p_codigo_obra;
  select nome into v_forn from public.fornecedores_erp where codigo = p_cod_fornecedor;
  select * into v_ant from public.fretes_ctes where nr_ad = p_nr_ad and projeto = p_projeto for update;

  insert into public.fretes_ctes (nr_ad, projeto, id_obra, codigo_obra, numero_cte, data_entrada, cod_fornecedor, fornecedor_nome,
                                  valor, status, baixas, mensagem)
  values (p_nr_ad, p_projeto, v_obra.id, p_codigo_obra, p_numero_cte, p_data_entrada, p_cod_fornecedor, v_forn, p_valor, p_status,
          coalesce(p_baixas, '[]'), p_mensagem)
  on conflict (nr_ad, projeto) do update set status = excluded.status, baixas = excluded.baixas, mensagem = excluded.mensagem,
    valor = excluded.valor, updated_at = now();

  if p_status in ('baixado', 'baixado_manual') and v_ant.id_frete is null and v_obra.id is not null then
    select f.id into v_frete from public.fretes f
     where f.id_obra = v_obra.id and f.transportadora_codigo = p_cod_fornecedor and f.nr_ad is null
       and f.status in ('liberado', 'bloqueado', 'aguardando_cotacao')
     order by abs(coalesce(f.valor_cotado, p_valor) - p_valor), f.created_at
     limit 1 for update;
    if v_frete is not null then
      update public.fretes set status = 'realizado', nr_ad = p_nr_ad, valor_realizado = p_valor, realizado_em = now(), updated_at = now()
       where id = v_frete;
      update public.fretes_ctes set id_frete = v_frete where nr_ad = p_nr_ad and projeto = p_projeto;
      perform public.frete_evento(v_frete, 'realizado',
        'CT-e ' || coalesce(p_numero_cte, '?') || ' · AD ' || p_nr_ad || ' · ' || formatar_brl(p_valor)
        || case when p_status = 'baixado' then ' · previsão baixada no ERP' else '' end);
    end if;
  end if;

  if p_status = 'sem_verba' and (v_ant.status is distinct from 'sem_verba') and v_obra.id is not null then
    foreach d in array (public.frete_gestores(v_obra.id) || public.frete_logistica()) loop
      perform public.notificar_usuario(d, 'frete', 'CT-e de frete sem verba (' || p_projeto || ')',
        'AD ' || p_nr_ad || ' · ' || coalesce(v_forn, 'transportadora') || ' · ' || formatar_brl(p_valor)
        || ' · peça aumento ou transferência para a ' || p_projeto,
        v_obra.id, null, false, 'frete-cte:' || p_nr_ad || ':' || p_projeto);
    end loop;
  end if;
  return v_frete;
end $function$
;

-- public.frete_saldo(p_id_obra uuid, p_excluir uuid)
CREATE OR REPLACE FUNCTION public.frete_saldo(p_id_obra uuid, p_excluir uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select sum(f.previsoes_em_aberto) from public.obra_rentabilidade_familias f
                     join public.obras o on o.id = f.id_obra
                    where f.id_obra = p_id_obra and f.codigo_projeto = o.codigo_externo || '.510'), 0)
       - coalesce((select sum(fr.valor_cotado) from public.fretes fr
                    where fr.id_obra = p_id_obra and fr.status = 'liberado' and fr.nr_ad is null
                      and fr.id is distinct from p_excluir), 0);
$function$
;

-- public.frete_salvar(p_id uuid, p_id_obra uuid, p_data date, p_operacao text, p_tipo_documento text, p_numero_documento text, p_origem_tipo text, p_origem_ibge integer, p_origem_nome text, p_destino_tipo text, p_destino_ibge integer, p_destino_nome text, p_cod_fornecedor integer, p_tipo_veiculo text, p_km numeric, p_valor_km numeric, p_valor_cotado numeric, p_transportadora_codigo integer, p_observacao text, p_carga jsonb, p_peso_kg numeric, p_volumes integer, p_altura_m numeric, p_largura_m numeric, p_comprimento_m numeric, p_cubagem_m3 numeric)
CREATE OR REPLACE FUNCTION public.frete_salvar(p_id uuid, p_id_obra uuid, p_data date, p_operacao text, p_tipo_documento text, p_numero_documento text, p_origem_tipo text, p_origem_ibge integer, p_origem_nome text, p_destino_tipo text, p_destino_ibge integer, p_destino_nome text, p_cod_fornecedor integer, p_tipo_veiculo text, p_km numeric, p_valor_km numeric, p_valor_cotado numeric, p_transportadora_codigo integer, p_observacao text, p_carga jsonb DEFAULT NULL::jsonb, p_peso_kg numeric DEFAULT NULL::numeric, p_volumes integer DEFAULT NULL::integer, p_altura_m numeric DEFAULT NULL::numeric, p_largura_m numeric DEFAULT NULL::numeric, p_comprimento_m numeric DEFAULT NULL::numeric, p_cubagem_m3 numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_usuario record; v_obra record; v_id uuid := p_id; v_f record; v_transp text; v_logistica boolean := public.eh_logistica();
        v_est numeric; v_c record; v_carga jsonb := p_carga;
begin
  select * into v_usuario from public.usuarios where id = public.usuario_atual_id();
  if v_usuario.id is null then raise exception 'Usuário não identificado.'; end if;
  select * into v_obra from public.obras where id = p_id_obra;
  if v_obra.id is null then raise exception 'Obra não encontrada.'; end if;
  if not (v_logistica or coalesce(public.pode_gerenciar_obra(p_id_obra), false)) then raise exception 'Você não pode pedir frete para esta obra.'; end if;
  if p_data is null then raise exception 'Informe a data do frete.'; end if;
  if p_operacao not in ('compra', 'venda') then raise exception 'Informe se o frete é de compra ou de venda.'; end if;
  if p_valor_cotado is not null and p_valor_cotado <= 0 then raise exception 'O valor cotado precisa ser maior que zero.'; end if;
  if v_carga is null and num_nonnulls(p_peso_kg, p_volumes, p_altura_m, p_largura_m, p_comprimento_m) > 0 then
    v_carga := jsonb_build_array(jsonb_build_object('quantidade', coalesce(p_volumes, 1),
      'peso_kg', p_peso_kg / coalesce(p_volumes, 1), 'altura_m', p_altura_m, 'largura_m', p_largura_m, 'comprimento_m', p_comprimento_m));
  end if;
  select * into v_c from public.frete_carga_normalizar(v_carga);
  select nome into v_transp from public.fornecedores_erp where codigo = p_transportadora_codigo;
  v_est := case when p_origem_ibge is not null and p_destino_ibge is not null then public.frete_distancia(p_origem_ibge, p_destino_ibge) end;

  -- km corrigido pela logistica vira o km da rota para as proximas vezes
  if v_logistica and p_km is not null and v_est is not null and abs(p_km - v_est) >= 1 and p_origem_ibge <> p_destino_ibge then
    insert into public.fretes_rotas (origem_ibge, destino_ibge, km, ajustado_por)
    values (least(p_origem_ibge, p_destino_ibge), greatest(p_origem_ibge, p_destino_ibge), p_km, v_usuario.nome)
    on conflict (origem_ibge, destino_ibge) do update set km = excluded.km, ajustado_por = excluded.ajustado_por, ajustado_em = now();
  end if;

  if v_id is null then
    insert into public.fretes (id_obra, codigo_obra, familia, data_frete, operacao, tipo_documento, numero_documento,
      origem_tipo, origem_ibge, origem_nome, destino_tipo, destino_ibge, destino_nome, cod_fornecedor, tipo_veiculo,
      km, km_estimado, valor_km, valor_cotado, transportadora_codigo, transportadora_nome, observacao, id_solicitante, nome_solicitante,
      cotado_por, cotado_em, carga, peso_kg, volumes, cubagem_m3)
    values (p_id_obra, v_obra.codigo_externo, v_obra.codigo_externo || '.510', p_data, p_operacao, p_tipo_documento,
      nullif(trim(coalesce(p_numero_documento, '')), ''), p_origem_tipo, p_origem_ibge, p_origem_nome, p_destino_tipo, p_destino_ibge,
      p_destino_nome, p_cod_fornecedor, p_tipo_veiculo, p_km, v_est, p_valor_km, round(p_valor_cotado, 2),
      p_transportadora_codigo, v_transp, nullif(trim(coalesce(p_observacao, '')), ''), v_usuario.id, v_usuario.nome,
      case when p_valor_cotado is not null then v_usuario.nome end, case when p_valor_cotado is not null then now() end,
      v_c.itens, v_c.peso, v_c.volumes, coalesce(v_c.cubagem, case when p_carga is null and p_cubagem_m3 > 0 then round(p_cubagem_m3, 3) end))
    returning id into v_id;
    perform public.frete_evento(v_id, 'criado', coalesce('Cotado ' || formatar_brl(round(p_valor_cotado, 2)), 'Sem cotação'));
  else
    select * into v_f from public.fretes where id = v_id for update;
    if v_f.id is null or v_f.id_obra <> p_id_obra then raise exception 'Frete não encontrado.'; end if;
    if v_f.status in ('realizado', 'cancelado') then raise exception 'Frete já realizado ou cancelado não pode ser alterado.'; end if;
    if not (v_logistica or v_f.id_solicitante = v_usuario.id or coalesce(public.pode_gerenciar_obra(p_id_obra), false)) then
      raise exception 'Você não pode alterar este frete.';
    end if;
    update public.fretes set data_frete = p_data, operacao = p_operacao, tipo_documento = p_tipo_documento,
        numero_documento = nullif(trim(coalesce(p_numero_documento, '')), ''), origem_tipo = p_origem_tipo, origem_ibge = p_origem_ibge,
        origem_nome = p_origem_nome, destino_tipo = p_destino_tipo, destino_ibge = p_destino_ibge, destino_nome = p_destino_nome,
        cod_fornecedor = p_cod_fornecedor, tipo_veiculo = p_tipo_veiculo, km = p_km, km_estimado = v_est, valor_km = p_valor_km,
        valor_cotado = round(p_valor_cotado, 2), transportadora_codigo = p_transportadora_codigo, transportadora_nome = v_transp,
        observacao = nullif(trim(coalesce(p_observacao, '')), ''),
        carga = v_c.itens, peso_kg = v_c.peso, volumes = v_c.volumes,
        cubagem_m3 = coalesce(v_c.cubagem, case when p_carga is null and p_cubagem_m3 > 0 then round(p_cubagem_m3, 3) end),
        cotado_por = case when p_valor_cotado is distinct from v_f.valor_cotado then v_usuario.nome else cotado_por end,
        cotado_em = case when p_valor_cotado is distinct from v_f.valor_cotado then now() else cotado_em end,
        updated_at = now()
     where id = v_id;
    if p_valor_cotado is distinct from v_f.valor_cotado then
      perform public.frete_evento(v_id, 'cotado', coalesce(formatar_brl(round(p_valor_cotado, 2)), 'cotação removida')
        || coalesce(' (antes ' || formatar_brl(v_f.valor_cotado) || ')', ''));
    else
      perform public.frete_evento(v_id, 'alterado');
    end if;
  end if;
  perform public.frete_avaliar(v_id);
  return v_id;
end $function$
;

-- public.frete_sem_verba_email_ligado()
CREATE OR REPLACE FUNCTION public.frete_sem_verba_email_ligado()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select false $function$
;

-- public.frete_sugestoes(p_origem integer, p_destino integer, p_tipo_veiculo text)
CREATE OR REPLACE FUNCTION public.frete_sugestoes(p_origem integer, p_destino integer, p_tipo_veiculo text)
 RETURNS TABLE(transportadora_codigo integer, transportadora_nome text, km numeric, valor_km numeric, valor_minimo numeric, preco numeric, historico_rs_km numeric, historico_ctes integer, atende boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with r as (
    select public.frete_distancia(p_origem, p_destino) as km,
           (select uf from public.municipios where ibge = p_origem) as uf_o,
           (select uf from public.municipios where ibge = p_destino) as uf_d)
  select f.codigo, f.nome, r.km, tf.valor_km, tf.valor_minimo,
         round(greatest(tf.valor_minimo, coalesce(r.km, 0) * tf.valor_km), 2) as preco,
         h.rs_km, h.ctes,
         exists (select 1 from public.fretes_transp_ufs u where u.transportadora_codigo = f.codigo and u.uf = r.uf_o)
         and exists (select 1 from public.fretes_transp_ufs u where u.transportadora_codigo = f.codigo and u.uf = r.uf_d) as atende
    from r
    join public.fretes_transp_tarifas tf on tf.ativo and tf.tipo_veiculo = p_tipo_veiculo
    join public.fornecedores_erp f on f.codigo = tf.transportadora_codigo
    left join public.fretes_transp_historico h on h.transportadora_codigo = f.codigo
   order by atende desc, preco;
$function$
;

-- public.html_esc(p text)
CREATE OR REPLACE FUNCTION public.html_esc(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$function$
;

-- public.limpeza_diaria()
CREATE OR REPLACE FUNCTION public.limpeza_diaria()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_html integer; v_notif integer;
begin
  update public.fila_email set html = '' where status = 'enviado' and enviado_em < now() - interval '30 days' and html <> '';
  get diagnostics v_html = row_count;
  delete from public.notificacoes where lida_em is not null and lida_em < now() - interval '90 days';
  get diagnostics v_notif = row_count;
  return jsonb_build_object('emails_html_limpo', v_html, 'notificacoes_apagadas', v_notif);
end $function$
;

-- public.marcar_notificacoes_lidas(p_ids uuid[])
CREATE OR REPLACE FUNCTION public.marcar_notificacoes_lidas(p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.notificacoes
     set lida_em = now()
   where id_usuario_destino = public.usuario_atual_id()
     and lida_em is null
     and (p_ids is null or id = any(p_ids));
$function$
;

-- public.mat_alterar_codigo_proposto(p_id uuid, p_codigo_edit text)
CREATE OR REPLACE FUNCTION public.mat_alterar_codigo_proposto(p_id uuid, p_codigo_edit text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; v_cod text; v_auto boolean;
begin
  if not public.mat_eh_fiscal() then raise exception 'Só o fiscal altera o código.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status <> 'erp' then raise exception 'A solicitação não está aguardando a criação no ERP.'; end if;
  v_cod := public.mat_proximo_codigo_edit(v_s.classe_tipo, v_s.id);
  v_auto := nullif(trim(coalesce(p_codigo_edit, '')), '') is null or upper(trim(p_codigo_edit)) = v_cod;
  if not v_auto then v_cod := public.mat_validar_codigo_edit(v_s, p_codigo_edit); end if;
  update public.solicitacoes_material set codigo_edit_proposto = v_cod, codigo_edit_automatico = v_auto, erp_erro = null, erp_tentativas = 0,
         updated_at = now() where id = p_id;
  perform public.mat_evento(p_id, 'codigo_alterado', 'Código ' || v_cod || case when v_auto then ' (sugerido)' else '' end);
end $function$
;

-- public.mat_aprovar_cadastro(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_obs text, p_origem text)
CREATE OR REPLACE FUNCTION public.mat_aprovar_cadastro(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_obs text DEFAULT NULL::text, p_origem text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; v_desc text := upper(regexp_replace(trim(coalesce(p_descricao, '')), '\s+', ' ', 'g'));
begin
  if not public.mat_eh_cadastro() then raise exception 'Só o responsável pelo cadastro aprova esta etapa.'; end if;
  perform public.mat_validar_basico(v_desc, p_classe_tipo, p_unidade);
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status <> 'cadastro' then raise exception 'A solicitação não está com o cadastro.'; end if;
  if coalesce(p_origem, v_s.origem) is null or coalesce(p_origem, v_s.origem) not in ('comprado', 'produzido', 'servico') then
    raise exception 'Marque se o item é comprado, produzido ou serviço.';
  end if;
  if exists (select 1 from public.materiais_erp where ativo and busca = public.mat_normalizar(v_desc)) then
    raise exception 'Já existe no ERP um item ativo com essa mesma descrição. Use Recusar e aponte o código existente.';
  end if;
  update public.solicitacoes_material set status = 'fiscal', descricao = v_desc, classe_tipo = p_classe_tipo, unidade = upper(trim(p_unidade)),
         origem = coalesce(p_origem, v_s.origem), obs_cadastro = nullif(trim(coalesce(p_obs, '')), ''), nome_cadastro = public.mat_nome_atual(),
         cadastro_em = now(), motivo = null, nome_motivo = null, updated_at = now()
   where id = p_id;
  perform public.mat_evento(p_id, 'aprovada_cadastro',
    nullif(concat_ws(' · ',
      case when v_desc <> v_s.descricao then 'Descrição: ' || v_s.descricao || ' → ' || v_desc end,
      case when p_origem is distinct from v_s.origem and p_origem is not null then 'Origem: ' || coalesce(v_s.origem, '-') || ' → ' || p_origem end), ''));
end $function$
;

-- public.mat_aprovar_fiscal(p_id uuid, p_ncm text, p_tipo_item integer, p_pct_ipi numeric, p_obs text, p_codigo_edit text)
CREATE OR REPLACE FUNCTION public.mat_aprovar_fiscal(p_id uuid, p_ncm text, p_tipo_item integer, p_pct_ipi numeric, p_obs text DEFAULT NULL::text, p_codigo_edit text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; v_ncm text := regexp_replace(coalesce(p_ncm, ''), '\D', '', 'g'); v_cod text; v_auto boolean;
begin
  if not public.mat_eh_fiscal() then raise exception 'Só o fiscal aprova esta etapa.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status <> 'fiscal' then raise exception 'A solicitação não está com o fiscal.'; end if;
  if length(v_ncm) <> 8 then raise exception 'Informe o NCM com 8 dígitos.'; end if;
  if not exists (select 1 from public.materiais_erp_ncm where ncm = v_ncm) then raise exception 'NCM % não está na tabela de NCM do ERP.', v_ncm; end if;
  if p_tipo_item is null or p_tipo_item not in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 99) then raise exception 'Escolha o tipo do item (SPED).'; end if;
  if v_s.origem = 'servico' and p_tipo_item <> 9 then raise exception 'Item de serviço usa o tipo 09 - Serviços (senão não aparece como serviço no app).'; end if;
  if p_tipo_item = 9 and v_s.origem is distinct from 'servico' then raise exception 'Tipo 09 - Serviços só para item marcado como serviço (devolva ao cadastro para corrigir a origem).'; end if;
  if p_pct_ipi is null or p_pct_ipi < 0 or p_pct_ipi > 100 then raise exception 'Informe o %% de IPI (0 a 100).'; end if;
  v_cod := public.mat_proximo_codigo_edit(v_s.classe_tipo, v_s.id);
  v_auto := nullif(trim(coalesce(p_codigo_edit, '')), '') is null or upper(trim(p_codigo_edit)) = v_cod;
  if not v_auto then v_cod := public.mat_validar_codigo_edit(v_s, p_codigo_edit); end if;
  update public.solicitacoes_material set status = 'erp', ncm = v_ncm, tipo_item = p_tipo_item, genero = left(v_ncm, 2)::integer,
         pct_ipi = p_pct_ipi, obs_fiscal = nullif(trim(coalesce(p_obs, '')), ''), nome_fiscal = public.mat_nome_atual(), fiscal_em = now(),
         codigo_max_aprovacao = (select coalesce(max(codigo), 0) from public.materiais_erp), motivo = null, nome_motivo = null,
         codigo_edit_proposto = v_cod, codigo_edit_automatico = v_auto, erp_erro = null, erp_tentativas = 0, updated_at = now()
   where id = p_id;
  perform public.mat_evento(p_id, 'aprovada_fiscal', 'NCM ' || v_ncm || ' · tipo ' || p_tipo_item || ' · IPI ' || p_pct_ipi || '% · código ' || v_cod);
end $function$
;

-- public.mat_avisar(p_id uuid, p_para uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
CREATE OR REPLACE FUNCTION public.mat_avisar(p_id uuid, p_para uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.solicitacoes_material; d uuid; v_para text[];
begin
  select * into s from public.solicitacoes_material where id = p_id;
  foreach d in array coalesce(p_para, '{}') loop
    if d is distinct from public.usuario_atual_id() then
      perform public.notificar_usuario(d, 'material', p_titulo_push, 'Nº ' || s.numero || ' · ' || s.descricao,
        null, null, false, 'mat:' || s.id || ':' || s.status || ':' || extract(epoch from now())::bigint);
    end if;
  end loop;
  if not public.mat_email_ligado() then return; end if;
  v_para := public.sf_emails(array(select x from unnest(p_para) x where x is distinct from public.usuario_atual_id()));
  if cardinality(v_para) = 0 then return; end if;
  insert into public.fila_email (para, assunto, html, origem)
  values (v_para, p_assunto, public.email_solicitacao_material(s, p_titulo, p_aviso, p_cor,
          'https://gestaoobraskalter.vercel.app/materiais/' || s.id), 'material');
end $function$
;

-- public.mat_cancelar(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.mat_cancelar(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status not in ('cadastro', 'fiscal', 'devolvida') then raise exception 'Esta solicitação não pode mais ser cancelada.'; end if;
  if not (v_s.id_solicitante = public.usuario_atual_id() or public.eh_admin()) then raise exception 'Só quem pediu cancela a solicitação.'; end if;
  update public.solicitacoes_material set status = 'cancelada', motivo = trim(p_motivo), nome_motivo = public.mat_nome_atual(), updated_at = now() where id = p_id;
  perform public.mat_evento(p_id, 'cancelada', trim(p_motivo));
end $function$
;

-- public.mat_classe_rotulo(p integer)
CREATE OR REPLACE FUNCTION public.mat_classe_rotulo(p integer)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (p / 10000)::text || '/' || lpad((p % 10000)::text, greatest(3, length((p % 10000)::text)), '0')
    || coalesce(' · ' || (select descricao from public.materiais_erp_classes where classe_tipo = (p / 10000) * 10000)
                || coalesce(' / ' || (select descricao from public.materiais_erp_classes where classe_tipo = p and p % 10000 <> 0), ''),
                ' · ' || (select descricao from public.materiais_erp_classes where classe_tipo = p), '')
$function$
;

-- public.mat_criacao_erp_ligada()
CREATE OR REPLACE FUNCTION public.mat_criacao_erp_ligada()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select false $function$
;

-- public.mat_devolver(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.mat_devolver(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da devolução.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status = 'cadastro' and public.mat_eh_cadastro() then
    update public.solicitacoes_material set status = 'devolvida', motivo = trim(p_motivo), nome_motivo = public.mat_nome_atual(), updated_at = now() where id = p_id;
    perform public.mat_evento(p_id, 'devolvida', trim(p_motivo));
  elsif v_s.status = 'fiscal' and public.mat_eh_fiscal() then
    update public.solicitacoes_material set status = 'cadastro', motivo = trim(p_motivo), nome_motivo = public.mat_nome_atual(), updated_at = now() where id = p_id;
    perform public.mat_evento(p_id, 'devolvida_cadastro', trim(p_motivo));
  elsif v_s.status = 'erp' and public.mat_eh_fiscal() then
    update public.solicitacoes_material set status = 'fiscal', motivo = trim(p_motivo), nome_motivo = public.mat_nome_atual(), updated_at = now() where id = p_id;
    perform public.mat_evento(p_id, 'reaberta_fiscal', trim(p_motivo));
  else
    raise exception 'Você não pode devolver esta solicitação nesta etapa.';
  end if;
end $function$
;

-- public.mat_eh_cadastro()
CREATE OR REPLACE FUNCTION public.mat_eh_cadastro()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin() or exists (select 1 from public.usuarios u where u.id = public.usuario_atual_id() and u.ativo and u.cadastra_materiais);
$function$
;

-- public.mat_eh_fiscal()
CREATE OR REPLACE FUNCTION public.mat_eh_fiscal()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin() or exists (select 1 from public.usuarios u where u.id = public.usuario_atual_id() and u.ativo and u.revisa_fiscal_material);
$function$
;

-- public.mat_email_ligado()
CREATE OR REPLACE FUNCTION public.mat_email_ligado()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ select true $function$
;

-- public.mat_evento(p_id uuid, p_evento text, p_detalhe text)
CREATE OR REPLACE FUNCTION public.mat_evento(p_id uuid, p_evento text, p_detalhe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.solicitacoes_material_eventos (id_solicitacao, id_usuario, nome_usuario, evento, detalhe)
  select p_id, u.id, coalesce(u.nome, 'Sistema'), p_evento, p_detalhe
  from (select 1) x left join public.usuarios u on u.id = public.usuario_atual_id();
$function$
;

-- public.mat_informar_codigo(p_id uuid, p_codigo text)
CREATE OR REPLACE FUNCTION public.mat_informar_codigo(p_id uuid, p_codigo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; v_m public.materiais_erp;
begin
  if not (public.mat_eh_fiscal() or public.mat_eh_cadastro()) then raise exception 'Só o fiscal ou o cadastro informam o código.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status <> 'erp' then raise exception 'A solicitação não está aguardando o código do ERP.'; end if;
  select * into v_m from public.materiais_erp
   where codigo_edit = trim(p_codigo) or (trim(p_codigo) ~ '^\d+$' and codigo = trim(p_codigo)::bigint) limit 1;
  if v_m.codigo is null then
    raise exception 'Código % não encontrado no espelho do ERP. Se acabou de criar, aguarde até 5 minutos (o robô atualiza a cada rodada).', trim(p_codigo);
  end if;
  update public.solicitacoes_material set status = 'concluida', codigo_erp = v_m.codigo, codigo_edit = v_m.codigo_edit, concluida_em = now(),
         nome_concluiu = public.mat_nome_atual(), updated_at = now() where id = p_id;
  perform public.mat_evento(p_id, 'concluida', 'Código ' || coalesce(v_m.codigo_edit, v_m.codigo::text) || ' · ' || v_m.descricao);
end $function$
;

-- public.mat_lembretes()
CREATE OR REPLACE FUNCTION public.mat_lembretes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; d uuid; n integer := 0; v_hoje text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYYMMDD');
begin
  for r in
    select s.*, floor(extract(epoch from now() - coalesce(case s.status when 'fiscal' then s.cadastro_em end, s.updated_at)) / 86400)::int as dias
      from public.solicitacoes_material s
     where s.status in ('cadastro', 'fiscal')
       and coalesce(case s.status when 'fiscal' then s.cadastro_em end, s.updated_at) < now() - interval '2 days'
  loop
    for d in select id from public.usuarios where ativo and
               ((r.status = 'cadastro' and cadastra_materiais) or (r.status = 'fiscal' and revisa_fiscal_material)) loop
      perform public.notificar_usuario(d, 'material', 'Material parado há ' || r.dias || ' dias',
        'Nº ' || r.numero || ' · ' || r.descricao, null, null, false, 'mat:' || r.id || ':lembrete:' || v_hoje);
      n := n + 1;
    end loop;
  end loop;
  return n;
end $function$
;

-- public.mat_ligar_criados()
CREATE OR REPLACE FUNCTION public.mat_ligar_criados()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; n integer := 0;
begin
  for r in
    select s.id, m.codigo, m.codigo_edit, m.descricao
      from public.solicitacoes_material s
      join lateral (select * from public.materiais_erp m where m.codigo > coalesce(s.codigo_max_aprovacao, 0)
                     and m.busca = public.mat_normalizar(s.descricao) order by m.codigo limit 1) m on true
     where s.status = 'erp'
  loop
    update public.solicitacoes_material set status = 'concluida', codigo_erp = r.codigo, codigo_edit = r.codigo_edit, concluida_em = now(),
           nome_concluiu = 'Robô', updated_at = now() where id = r.id;
    perform public.mat_evento(r.id, 'concluida', 'Código ' || coalesce(r.codigo_edit, r.codigo::text) || ' criado no ERP · ' || r.descricao);
    n := n + 1;
  end loop;
  return n;
end $function$
;

-- public.mat_nome_atual()
CREATE OR REPLACE FUNCTION public.mat_nome_atual()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select nome from public.usuarios where id = public.usuario_atual_id()), 'Sistema');
$function$
;

-- public.mat_normalizar(p text)
CREATE OR REPLACE FUNCTION public.mat_normalizar(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public', 'extensions'
AS $function$
  select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
           upper(extensions.unaccent('extensions.unaccent'::regdictionary, replace(coalesce(p, ''), '"', ' POL '))),
           '\mPOLEGADAS?\M', 'POL', 'g'),
           '\mCONJUNTO\M', 'CJ', 'g'),
           '\mACO INOX(IDAVEL)?\M', 'INOX', 'g'),
           '[^A-Z0-9/,.]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$function$
;

-- public.mat_origem_pcp(p_origem text)
CREATE OR REPLACE FUNCTION public.mat_origem_pcp(p_origem text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_origem when 'comprado' then 2 when 'produzido' then 0 when 'servico' then 3 end
$function$
;

-- public.mat_prefixo_codigo(p_classe_tipo integer)
CREATE OR REPLACE FUNCTION public.mat_prefixo_codigo(p_classe_tipo integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (p_classe_tipo / 10000)::text || '.' || lpad((p_classe_tipo % 10000)::text, greatest(3, length((p_classe_tipo % 10000)::text)), '0') || '.'
$function$
;

-- public.mat_proximo_codigo_edit(p_classe_tipo integer, p_excluir uuid)
CREATE OR REPLACE FUNCTION public.mat_proximo_codigo_edit(p_classe_tipo integer, p_excluir uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_pre text := public.mat_prefixo_codigo(p_classe_tipo); v_re text; v_n integer; v_cod text;
begin
  if not (public.eh_usuario_ativo() or public.usuario_atual_id() is null) then raise exception 'Sem acesso.'; end if;
  v_re := '^' || replace(v_pre, '.', '\.') || '\d{4}$';
  select substr(trim(codigo_edit), length(v_pre) + 1)::integer into v_n from public.materiais_erp
   where left(codigo_edit, length(v_pre)) = v_pre and trim(codigo_edit) ~ v_re order by codigo desc limit 1;
  v_n := coalesce(v_n, 0);
  loop
    v_n := v_n + 1;
    if v_n > 9999 then raise exception 'Sem código livre na sequência da classe/tipo %; informe o código.', v_pre; end if;
    v_cod := v_pre || lpad(v_n::text, 4, '0');
    exit when not exists (select 1 from public.materiais_erp where trim(codigo_edit) = v_cod)
          and not exists (select 1 from public.solicitacoes_material where status = 'erp' and id is distinct from p_excluir
                           and codigo_edit_proposto = v_cod);
  end loop;
  return v_cod;
end $function$
;

-- public.mat_recusar(p_id uuid, p_motivo text, p_codigo_existente text)
CREATE OR REPLACE FUNCTION public.mat_recusar(p_id uuid, p_motivo text, p_codigo_existente text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; v_m public.materiais_erp;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da recusa.'; end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if not ((v_s.status = 'cadastro' and public.mat_eh_cadastro()) or (v_s.status = 'fiscal' and public.mat_eh_fiscal())) then
    raise exception 'Você não pode recusar esta solicitação nesta etapa.';
  end if;
  if coalesce(trim(p_codigo_existente), '') <> '' then
    select * into v_m from public.materiais_erp where codigo_edit = trim(p_codigo_existente)
       or (trim(p_codigo_existente) ~ '^\d+$' and codigo = trim(p_codigo_existente)::bigint) limit 1;
    if v_m.codigo is null then raise exception 'Código % não encontrado no cadastro do ERP.', trim(p_codigo_existente); end if;
  end if;
  update public.solicitacoes_material set status = 'recusada', motivo = trim(p_motivo), nome_motivo = public.mat_nome_atual(),
         codigo_existente = v_m.codigo, codigo_edit = v_m.codigo_edit, updated_at = now() where id = p_id;
  perform public.mat_evento(p_id, 'recusada', trim(p_motivo) || coalesce(' · usar o item ' || coalesce(v_m.codigo_edit, v_m.codigo::text) || ' ' || v_m.descricao, ''));
end $function$
;

-- public.mat_registrar_criado_erp(p_id uuid, p_codigo integer, p_codigo_edit text)
CREATE OR REPLACE FUNCTION public.mat_registrar_criado_erp(p_id uuid, p_codigo integer, p_codigo_edit text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material;
begin
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null or v_s.status <> 'erp' then return false; end if;
  update public.solicitacoes_material set status = 'concluida', codigo_erp = p_codigo, codigo_edit = trim(p_codigo_edit), concluida_em = now(),
         nome_concluiu = 'Robô (criado no ERP)', erp_erro = null, updated_at = now() where id = p_id;
  perform public.mat_evento(p_id, 'concluida', 'Item ' || p_codigo || ' · código ' || trim(p_codigo_edit) || ' criado no ERP pelo robô');
  return true;
end $function$
;

-- public.mat_registrar_erro_erp(p_id uuid, p_erro text)
CREATE OR REPLACE FUNCTION public.mat_registrar_erro_erp(p_id uuid, p_erro text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_s public.solicitacoes_material; d uuid;
begin
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null or v_s.status <> 'erp' then return; end if;
  update public.solicitacoes_material set erp_erro = p_erro, erp_tentativas = erp_tentativas + 1, updated_at = now() where id = p_id;
  if v_s.erp_erro is distinct from p_erro then
    perform public.mat_evento(p_id, 'erro_erp', p_erro);
    for d in select id from public.usuarios where ativo and revisa_fiscal_material loop
      perform public.notificar_usuario(d, 'material', 'Material não foi criado no ERP', 'Nº ' || v_s.numero || ' · ' || p_erro,
        null, null, false, 'mat:' || v_s.id || ':erro:' || extract(epoch from now())::bigint);
    end loop;
  end if;
end $function$
;

-- public.mat_similares(p_texto text, p_limite integer, p_excluir uuid)
CREATE OR REPLACE FUNCTION public.mat_similares(p_texto text, p_limite integer DEFAULT 10, p_excluir uuid DEFAULT NULL::uuid)
 RETURNS TABLE(origem text, codigo integer, codigo_edit text, descricao text, unidade text, ncm text, classe text, id_solicitacao uuid, numero_solicitacao integer, situacao text, semelhanca numeric, tipo_pcp integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v text := public.mat_normalizar(p_texto);
begin
  if not (public.eh_usuario_ativo() or public.usuario_atual_id() is null) then raise exception 'Sem acesso.'; end if;
  if length(v) < 3 then return; end if;
  return query
  select x.o, x.cod, x.ced, x.d, x.u, x.n, public.mat_classe_rotulo(x.ct), x.ids, x.nums, x.sit, x.s, x.tp from (
    select 'erp'::text as o, m.codigo as cod, m.codigo_edit as ced, m.descricao as d, m.unidade as u, m.ncm as n, m.classe_tipo as ct,
           null::uuid as ids, null::integer as nums, 'ativo'::text as sit,
           round(greatest(similarity(v, m.busca), word_similarity(v, m.busca))::numeric, 2) as s, m.tipo_pcp as tp
      from public.materiais_erp m
     where m.ativo and (m.busca % v or v <% m.busca or m.codigo_edit = trim(p_texto))
    union all
    select 'solicitacao', s.codigo_erp, s.codigo_edit, s.descricao, s.unidade, s.ncm, s.classe_tipo, s.id, s.numero, s.status,
           round(greatest(similarity(v, public.mat_normalizar(s.descricao)), word_similarity(v, public.mat_normalizar(s.descricao)))::numeric, 2),
           public.mat_origem_pcp(s.origem)
      from public.solicitacoes_material s
     where s.status in ('cadastro', 'fiscal', 'erp', 'devolvida') and s.id is distinct from p_excluir
       and (public.mat_normalizar(s.descricao) % v or v <% public.mat_normalizar(s.descricao))
  ) x
  order by x.s desc, x.d
  limit greatest(1, least(p_limite, 30));
end $function$
;

-- public.mat_solicitar(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_aplicacao text, p_ncm text, p_urgente boolean, p_origem text)
CREATE OR REPLACE FUNCTION public.mat_solicitar(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_aplicacao text DEFAULT NULL::text, p_ncm text DEFAULT NULL::text, p_urgente boolean DEFAULT false, p_origem text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_s public.solicitacoes_material; v_desc text := upper(regexp_replace(trim(coalesce(p_descricao, '')), '\s+', ' ', 'g'));
  v_ncm text := nullif(regexp_replace(coalesce(p_ncm, ''), '\D', '', 'g'), ''); v_sim jsonb;
begin
  if not public.eh_usuario_ativo() then raise exception 'Sem acesso.'; end if;
  perform public.mat_validar_basico(v_desc, p_classe_tipo, p_unidade);
  if p_origem is null or p_origem not in ('comprado', 'produzido', 'servico') then raise exception 'Marque se o item é comprado, produzido ou serviço.'; end if;
  if v_ncm is not null and length(v_ncm) <> 8 then raise exception 'O NCM tem 8 dígitos (ou deixe em branco).'; end if;
  select coalesce(jsonb_agg(to_jsonb(x)), '[]') into v_sim
    from public.mat_similares(v_desc, 8, p_id) x where x.origem = 'erp' and x.semelhanca >= 0.35;
  if p_id is null then
    insert into public.solicitacoes_material (id_solicitante, nome_solicitante, descricao_solicitada, descricao, classe_tipo, unidade,
                                              aplicacao, ncm_sugerido, urgente, similares, origem)
    values (public.usuario_atual_id(), public.mat_nome_atual(), v_desc, v_desc, p_classe_tipo, upper(trim(p_unidade)),
            nullif(trim(coalesce(p_aplicacao, '')), ''), v_ncm, coalesce(p_urgente, false), v_sim, p_origem)
    returning id into v_id;
    perform public.mat_evento(v_id, 'solicitada', v_desc);
    return v_id;
  end if;
  select * into v_s from public.solicitacoes_material where id = p_id for update;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status <> 'devolvida' then raise exception 'Só uma solicitação devolvida pode ser corrigida e reenviada.'; end if;
  if not (v_s.id_solicitante = public.usuario_atual_id() or public.eh_admin()) then raise exception 'Só quem pediu corrige a solicitação.'; end if;
  update public.solicitacoes_material set status = 'cadastro', descricao_solicitada = v_desc, descricao = v_desc, classe_tipo = p_classe_tipo,
         unidade = upper(trim(p_unidade)), aplicacao = nullif(trim(coalesce(p_aplicacao, '')), ''), ncm_sugerido = v_ncm,
         urgente = coalesce(p_urgente, false), similares = v_sim, origem = p_origem, updated_at = now()
   where id = p_id;
  perform public.mat_evento(p_id, 'reenviada', v_desc);
  return p_id;
end $function$
;

-- public.mat_validar_basico(p_descricao text, p_classe_tipo integer, p_unidade text)
CREATE OR REPLACE FUNCTION public.mat_validar_basico(p_descricao text, p_classe_tipo integer, p_unidade text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if length(trim(coalesce(p_descricao, ''))) < 5 then raise exception 'Informe a descrição do item.'; end if;
  if length(trim(p_descricao)) > 120 then raise exception 'A descrição tem no máximo 120 caracteres.'; end if;
  if p_classe_tipo is null or p_classe_tipo % 10000 = 0
     or not exists (select 1 from public.materiais_erp_classes where classe_tipo = p_classe_tipo) then
    raise exception 'Escolha a classe/tipo do item.';
  end if;
  if not exists (select 1 from public.materiais_erp_unidades where unidade = upper(trim(coalesce(p_unidade, '')))) then raise exception 'Escolha a unidade de medida.'; end if;
end $function$
;

-- public.mat_validar_codigo_edit(p_s public.solicitacoes_material, p_codigo text)
CREATE OR REPLACE FUNCTION public.mat_validar_codigo_edit(p_s public.solicitacoes_material, p_codigo text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v text := upper(trim(coalesce(p_codigo, ''))); v_pre text := public.mat_prefixo_codigo(p_s.classe_tipo);
begin
  if v !~ '^\d{1,2}\.\d{3,4}\.\d{4,7}$' then raise exception 'Código % inválido: use o formato %0001.', v, v_pre; end if;
  if left(v, length(v_pre)) <> v_pre then raise exception 'O código precisa começar com % (classe/tipo do item).', v_pre; end if;
  if exists (select 1 from public.materiais_erp where trim(codigo_edit) = v) then raise exception 'O código % já existe no ERP.', v; end if;
  if exists (select 1 from public.solicitacoes_material where status = 'erp' and id <> p_s.id and codigo_edit_proposto = v) then
    raise exception 'O código % já está reservado para outra solicitação aprovada.', v;
  end if;
  return v;
end $function$
;

-- public.minhas_pendencias()
CREATE OR REPLACE FUNCTION public.minhas_pendencias()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u public.usuarios; r jsonb;
begin
  select * into u from public.usuarios where id = public.usuario_atual_id() and ativo;
  if u.id is null then return '{}'::jsonb; end if;
  select jsonb_build_object(
    'tarefas', (select count(*) from public.tarefas where id_responsavel = u.id and status in ('pendente', 'em_andamento')),
    'tarefas_atrasadas', (select count(*) from public.tarefas where id_responsavel = u.id and status in ('pendente', 'em_andamento')
                           and data_vencimento < (now() at time zone 'America/Sao_Paulo')::date),
    'materiais', (select count(*) from public.solicitacoes_material s where
                     (s.status = 'cadastro' and (u.cadastra_materiais or u.perfil = 'admin'))
                  or (s.status in ('fiscal') and (u.revisa_fiscal_material or u.perfil = 'admin'))
                  or (s.status = 'erp' and s.erp_erro is not null and (u.revisa_fiscal_material or u.perfil = 'admin'))
                  or (s.status = 'devolvida' and s.id_solicitante = u.id)),
    'faturamento', (select count(*) from public.solicitacoes_faturamento s where
                     (s.status = 'aguardando_logistica' and u.aprova_faturamento)
                  or (s.status = 'aguardando_fiscal' and (u.perfil = 'fiscal' or u.aprova_faturamento))
                  or (s.status = 'devolvida' and s.id_solicitante = u.id)),
    'nfs_terceiros', (select count(*) from public.nfs_terceiros n where
                     (n.status = 'encaminhada' and u.recebe_nf_terceiros)
                  or (n.status = 'devolvida' and n.id_encaminhou = u.id)),
    'previsoes', (select count(*) from public.solicitacoes_previsao p where p.status = 'aguardando_aprovacao' and u.aprova_previsao),
    'fretes', (select count(*) from public.fretes f where f.status = 'aguardando_cotacao' and u.perfil in ('logistica'))
  ) into r;
  return r;
end $function$
;

-- public.nft_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text, p_anexar boolean)
CREATE OR REPLACE FUNCTION public.nft_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text, p_anexar boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n public.nfs_terceiros; d uuid; v_para text[]; v_cc text[]; v_url text; v_anexos jsonb;
begin
  select * into n from public.nfs_terceiros where id = p_id;
  v_url := 'https://gestaoobraskalter.vercel.app/nfs-terceiros/' || n.id;
  foreach d in array coalesce(p_para, '{}') loop
    if d is distinct from public.usuario_atual_id() then
      perform public.notificar_usuario(d, 'nf_terceiros', p_titulo_push,
        'NF ' || n.numero_nf || ' · ' || n.fornecedor || ' · obra ' || n.codigo_obra || ' · ' || formatar_brl(n.valor),
        n.id_obra, null, false, 'nft:' || n.id || ':' || n.status || ':' || extract(epoch from now())::bigint);
    end if;
  end loop;
  if not public.nft_email_ligado() then return; end if;
  v_para := public.sf_emails(p_para);
  v_cc := public.sf_emails(p_cc, v_para);
  if cardinality(v_para) = 0 then v_para := v_cc; v_cc := '{}'; end if;
  if cardinality(v_para) = 0 then return; end if;
  v_anexos := '[]'::jsonb;
  if p_anexar then
    select coalesce(jsonb_agg(jsonb_build_object('nome', a->>'nome', 'url', a->>'url')), '[]'::jsonb) into v_anexos
      from jsonb_array_elements(n.anexos) a where coalesce(a->>'url', '') <> '';
    if v_anexos = '[]'::jsonb and n.arquivo_url_email is not null then
      v_anexos := jsonb_build_array(jsonb_build_object('nome', n.arquivo_nome, 'url', n.arquivo_url_email));
    end if;
  end if;
  insert into public.fila_email (para, cc, assunto, html, origem, anexos)
  values (v_para, v_cc, p_assunto, public.email_nf_terceiros(n, p_titulo, p_aviso, p_cor, v_url), 'nf_terceiros', v_anexos);
end $function$
;

-- public.nft_cancelar(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.nft_cancelar(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nf record;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo do cancelamento.'; end if;
  select * into v_nf from public.nfs_terceiros where id = p_id for update;
  if v_nf.id is null then raise exception 'NF não encontrada.'; end if;
  if v_nf.status not in ('encaminhada', 'devolvida') then raise exception 'NF já lançada no ERP não pode ser cancelada pelo app.'; end if;
  if not (v_nf.id_encaminhou = public.usuario_atual_id() or coalesce(public.pode_gerenciar_obra(v_nf.id_obra), false)) then
    raise exception 'Você não pode cancelar esta NF.';
  end if;
  update public.nfs_terceiros set status = 'cancelada', motivo_cancelamento = trim(p_motivo), cancelado_em = now(), updated_at = now() where id = p_id;
  perform public.nft_evento(p_id, 'cancelada', trim(p_motivo));
end $function$
;

-- public.nft_devolver(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.nft_devolver(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nf record;
begin
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da devolução.'; end if;
  if not (public.eh_fiscal() or public.eh_financeiro() or public.eh_admin_ou_coordenador()) then
    raise exception 'Só o fiscal ou o financeiro devolvem a NF.';
  end if;
  select * into v_nf from public.nfs_terceiros where id = p_id for update;
  if v_nf.id is null then raise exception 'NF não encontrada.'; end if;
  if v_nf.status <> 'encaminhada' then raise exception 'Só uma NF encaminhada (ainda não lançada) pode ser devolvida.'; end if;
  update public.nfs_terceiros set status = 'devolvida', motivo_devolucao = trim(p_motivo), devolvido_em = now(),
    nome_devolveu = (select nome from public.usuarios where id = public.usuario_atual_id()), updated_at = now() where id = p_id;
  perform public.nft_evento(p_id, 'devolvida', trim(p_motivo));
end $function$
;

-- public.nft_email_ligado()
CREATE OR REPLACE FUNCTION public.nft_email_ligado()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ select true $function$
;

-- public.nft_encaminhar(p_id uuid, p_id_obra uuid, p_nr_pedido bigint, p_numero_nf text, p_data_emissao date, p_valor numeric, p_vencimento date, p_observacao text, p_arquivo_caminho text, p_arquivo_nome text, p_arquivo_url text, p_anexos jsonb, p_forma_pagamento text, p_dados_pagamento jsonb)
CREATE OR REPLACE FUNCTION public.nft_encaminhar(p_id uuid, p_id_obra uuid, p_nr_pedido bigint, p_numero_nf text, p_data_emissao date, p_valor numeric, p_vencimento date, p_observacao text, p_arquivo_caminho text, p_arquivo_nome text, p_arquivo_url text, p_anexos jsonb DEFAULT NULL::jsonb, p_forma_pagamento text DEFAULT NULL::text, p_dados_pagamento jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_usuario record; v_obra record; v_ped record; v_nf record; v_id uuid := p_id; v_num text := upper(trim(coalesce(p_numero_nf, '')));
        v_anexos jsonb; v_primeiro jsonb; v_forma text := nullif(trim(coalesce(p_forma_pagamento, '')), ''); v_dados jsonb;
begin
  select * into v_usuario from public.usuarios where id = public.usuario_atual_id();
  if v_usuario.id is null then raise exception 'Usuário não identificado.'; end if;
  select * into v_obra from public.obras where id = p_id_obra;
  if v_obra.id is null then raise exception 'Obra não encontrada.'; end if;
  if not coalesce(public.pode_gerenciar_obra(p_id_obra), false) then raise exception 'Você não pode encaminhar NF desta obra.'; end if;
  select cod_fornecedor, fornecedor, cnpj into v_ped from public.obra_servicos_parcelas
   where id_obra = p_id_obra and nr_pedido = p_nr_pedido limit 1;
  if v_ped.cod_fornecedor is null then raise exception 'Pedido % não é um pedido de serviço desta obra.', p_nr_pedido; end if;
  if v_num = '' then raise exception 'Informe o número da NF.'; end if;
  if p_data_emissao is null then raise exception 'Informe a data de emissão.'; end if;
  if p_data_emissao > (now() at time zone 'America/Sao_Paulo')::date then raise exception 'A data de emissão não pode ser futura.'; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Informe o valor da NF.'; end if;
  if p_vencimento is null then raise exception 'Informe o vencimento.'; end if;
  if p_vencimento < p_data_emissao then raise exception 'O vencimento não pode ser antes da emissão.'; end if;
  v_dados := public.nft_validar_pagamento(v_forma, p_dados_pagamento);

  -- anexos: lista nova (p_anexos) ou, no formato antigo, o arquivo unico
  if p_anexos is not null and jsonb_typeof(p_anexos) = 'array' and jsonb_array_length(p_anexos) > 0 then
    if jsonb_array_length(p_anexos) > 10 then raise exception 'No máximo 10 anexos por NF.'; end if;
    if exists (select 1 from jsonb_array_elements(p_anexos) a
                where coalesce(trim(a->>'caminho'), '') = '' or coalesce(trim(a->>'nome'), '') = '') then
      raise exception 'Anexo inválido.';
    end if;
    v_anexos := p_anexos;
  elsif coalesce(trim(p_arquivo_caminho), '') <> '' then
    v_anexos := jsonb_build_array(jsonb_build_object('caminho', p_arquivo_caminho, 'nome', p_arquivo_nome, 'url', p_arquivo_url));
  else
    raise exception 'Anexe a NF.';
  end if;
  v_primeiro := v_anexos->0;

  if exists (select 1 from public.nfs_terceiros where cod_fornecedor = v_ped.cod_fornecedor and upper(trim(numero_nf)) = v_num
               and status <> 'cancelada' and id is distinct from v_id) then
    raise exception 'A NF % deste fornecedor já foi encaminhada.', v_num;
  end if;

  if v_id is null then
    insert into public.nfs_terceiros (id_obra, codigo_obra, nr_pedido, cod_fornecedor, fornecedor, cnpj, numero_nf, data_emissao, valor,
      vencimento, observacao, arquivo_caminho, arquivo_nome, arquivo_url_email, anexos, id_encaminhou, nome_encaminhou,
      forma_pagamento, dados_pagamento)
    values (p_id_obra, v_obra.codigo_externo, p_nr_pedido, v_ped.cod_fornecedor, v_ped.fornecedor, v_ped.cnpj, v_num, p_data_emissao,
      round(p_valor, 2), p_vencimento, nullif(trim(coalesce(p_observacao, '')), ''), v_primeiro->>'caminho', v_primeiro->>'nome',
      v_primeiro->>'url', v_anexos, v_usuario.id, v_usuario.nome, v_forma, v_dados)
    returning id into v_id;
    perform public.nft_evento(v_id, 'encaminhada', 'NF ' || v_num || ' · ' || formatar_brl(round(p_valor, 2))
      || case when jsonb_array_length(v_anexos) > 1 then ' · ' || jsonb_array_length(v_anexos) || ' anexos' else '' end);
  else
    select * into v_nf from public.nfs_terceiros where id = v_id for update;
    if v_nf.id is null or v_nf.id_obra <> p_id_obra then raise exception 'NF não encontrada.'; end if;
    if v_nf.status <> 'devolvida' then raise exception 'Só uma NF devolvida pode ser reenviada.'; end if;
    update public.nfs_terceiros set nr_pedido = p_nr_pedido, cod_fornecedor = v_ped.cod_fornecedor, fornecedor = v_ped.fornecedor,
        cnpj = v_ped.cnpj, numero_nf = v_num, data_emissao = p_data_emissao, valor = round(p_valor, 2), vencimento = p_vencimento,
        observacao = nullif(trim(coalesce(p_observacao, '')), ''), arquivo_caminho = v_primeiro->>'caminho', arquivo_nome = v_primeiro->>'nome',
        arquivo_url_email = v_primeiro->>'url', anexos = v_anexos, forma_pagamento = coalesce(v_forma, forma_pagamento),
        dados_pagamento = case when v_forma is null then dados_pagamento else v_dados end,
        status = 'encaminhada', encaminhado_em = now(), updated_at = now()
     where id = v_id;
    perform public.nft_evento(v_id, 'reenviada', 'NF ' || v_num || ' · ' || formatar_brl(round(p_valor, 2))
      || case when jsonb_array_length(v_anexos) > 1 then ' · ' || jsonb_array_length(v_anexos) || ' anexos' else '' end);
  end if;
  return v_id;
end $function$
;

-- public.nft_evento(p_id uuid, p_evento text, p_detalhe text)
CREATE OR REPLACE FUNCTION public.nft_evento(p_id uuid, p_evento text, p_detalhe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.nfs_terceiros_eventos (id_nf, id_usuario, nome_usuario, evento, detalhe)
  select p_id, u.id, coalesce(u.nome, 'Sistema'), p_evento, p_detalhe
  from (select 1) x left join public.usuarios u on u.id = public.usuario_atual_id();
$function$
;

-- public.nft_lembretes()
CREATE OR REPLACE FUNCTION public.nft_lembretes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n record; c integer := 0; v_dest uuid[]; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date; v_quando text;
begin
  select coalesce(array_agg(id), '{}') into v_dest from public.usuarios where ativo and recebe_nf_terceiros;
  for n in select * from public.nfs_terceiros
            where status = 'encaminhada' and vencimento - 3 <= v_hoje and (ultimo_lembrete_em is null or ultimo_lembrete_em < v_hoje)
            for update loop
    v_quando := case when n.vencimento < v_hoje then 'VENCIDA desde ' || to_char(n.vencimento, 'DD/MM')
                     when n.vencimento = v_hoje then 'vence HOJE' else 'vence ' || to_char(n.vencimento, 'DD/MM') end;
    perform public.nft_avisar(n.id, v_dest, case when n.id_encaminhou is null then '{}'::uuid[] else array[n.id_encaminhou] end,
      'Lembrete: NF de terceiros ainda não lançada (' || v_quando || ') · NF ' || n.numero_nf || ' · ' || n.fornecedor,
      'Lembrete: NF de terceiros ainda não lançada no ERP', upper(v_quando), '#b45309', 'Lembrete: NF a lançar (' || v_quando || ')', false);
    update public.nfs_terceiros set ultimo_lembrete_em = v_hoje where id = n.id;
    perform public.nft_evento(n.id, 'lembrete', v_quando);
    c := c + 1;
  end loop;
  return c;
end $function$
;

-- public.nft_pagamento_html(p_forma text, p_dados jsonb)
CREATE OR REPLACE FUNCTION public.nft_pagamento_html(p_forma text, p_dados jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_forma
    when 'boleto' then '<strong>Boleto</strong><br/><span style="font-size:13px; color:#475569;">O boleto deve estar nos anexos, junto com a NF.</span>'
    when 'pix' then '<strong>PIX</strong><br/><span style="font-size:13px; color:#475569;">Chave (' || html_esc(p_dados->>'tipo_chave') || '): <strong style="color:#1e293b;">'
      || html_esc(p_dados->>'chave') || '</strong>'
      || coalesce('<br/>Favorecido: ' || nullif(html_esc(p_dados->>'favorecido'), ''), '') || '</span>'
    when 'deposito' then '<strong>Depósito em conta</strong><br/><span style="font-size:13px; color:#475569;">Banco: <strong style="color:#1e293b;">'
      || html_esc(p_dados->>'banco') || '</strong> · Agência: <strong style="color:#1e293b;">' || html_esc(p_dados->>'agencia')
      || '</strong> · Conta' || coalesce(' ' || nullif(html_esc(lower(p_dados->>'tipo_conta')), ''), '') || ': <strong style="color:#1e293b;">'
      || html_esc(p_dados->>'conta') || '-' || html_esc(p_dados->>'digito') || '</strong>'
      || coalesce('<br/>Favorecido: ' || nullif(html_esc(p_dados->>'favorecido'), ''), '')
      || coalesce(case when coalesce(p_dados->>'favorecido', '') = '' then '<br/>' else ' · ' end || 'CPF/CNPJ ' || nullif(html_esc(p_dados->>'documento'), ''), '') || '</span>'
    when 'cartao' then '<strong>Cartão</strong><br/><span style="font-size:13px; color:#475569;">Cartão usado: <strong style="color:#1e293b;">'
      || html_esc(p_dados->>'cartao') || '</strong></span>'
  end
$function$
;

-- public.nft_validar_pagamento(p_forma text, p_dados jsonb)
CREATE OR REPLACE FUNCTION public.nft_validar_pagamento(p_forma text, p_dados jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare d jsonb := coalesce(p_dados, '{}'::jsonb); r jsonb := '{}'::jsonb; k text;
  v text;
begin
  if p_forma is null then return null; end if;
  if p_forma not in ('boleto', 'pix', 'deposito', 'cartao') then raise exception 'Forma de pagamento inválida.'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'Dados de pagamento inválidos.'; end if;
  foreach k in array case p_forma
      when 'pix' then array['tipo_chave', 'chave', 'favorecido']
      when 'deposito' then array['banco', 'agencia', 'conta', 'digito', 'tipo_conta', 'favorecido', 'documento']
      when 'cartao' then array['cartao']
      else array[]::text[] end loop
    v := nullif(trim(coalesce(d->>k, '')), '');
    if v is not null then r := r || jsonb_build_object(k, left(v, 120)); end if;
  end loop;
  if p_forma = 'pix' then
    if r->>'tipo_chave' is null or r->>'tipo_chave' not in ('CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória') then
      raise exception 'Informe o tipo da chave PIX.';
    end if;
    if r->>'chave' is null then raise exception 'Informe a chave PIX.'; end if;
  elsif p_forma = 'deposito' then
    if r->>'banco' is null then raise exception 'Informe o banco do depósito.'; end if;
    if r->>'agencia' is null then raise exception 'Informe a agência do depósito.'; end if;
    if r->>'conta' is null then raise exception 'Informe a conta do depósito.'; end if;
    if r->>'digito' is null then raise exception 'Informe o dígito da conta.'; end if;
  elsif p_forma = 'cartao' then
    if r->>'cartao' is null then raise exception 'Informe qual cartão foi usado.'; end if;
    -- nunca guardar o numero do cartao: so nome/final
    if regexp_replace(r->>'cartao', '[^0-9]', '', 'g') ~ '[0-9]{9,}' then
      raise exception 'Não digite o número do cartão: informe só o nome e o final (ex.: Itaú final 1234).';
    end if;
  end if;
  return r;
end $function$
;

-- public.notificar_equipe_obra(p_id_obra uuid, p_tipo text, p_titulo text, p_detalhe text, p_financeira boolean, p_chave text)
CREATE OR REPLACE FUNCTION public.notificar_equipe_obra(p_id_obra uuid, p_tipo text, p_titulo text, p_detalhe text, p_financeira boolean DEFAULT false, p_chave text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_autor uuid := public.usuario_atual_id();
  v_resp uuid;
  r record;
begin
  select o.id_responsavel into v_resp from public.obras o where o.id = p_id_obra;

  for r in
    select u.id from public.usuarios u
    where u.ativo
      and u.id is distinct from v_autor
      and (
        u.perfil in ('admin', 'coordenador')
        or (v_resp is not null and (
              u.id = v_resp
              or (u.perfil = 'assistente' and u.id_engenheiro_vinculado = v_resp)
        ))
      )
      and not (p_financeira and u.perfil not in ('admin', 'coordenador', 'engenheiro'))
  loop
    perform public.notificar_usuario(
      r.id, p_tipo, p_titulo, p_detalhe, p_id_obra, null, p_financeira, p_chave);
  end loop;
end;
$function$
;

-- public.notificar_recebimento_obra(p_id_obra uuid, p_valor numeric)
CREATE OR REPLACE FUNCTION public.notificar_recebimento_obra(p_id_obra uuid, p_valor numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_obra text;
begin
  select o.codigo_externo || ' - ' || o.nome into v_obra from public.obras o where o.id = p_id_obra;
  perform public.notificar_equipe_obra(
    p_id_obra, 'recebimento_novo',
    'Novo recebimento: ' || public.formatar_brl(p_valor),
    v_obra, true);
end;
$function$
;

-- public.notificar_usuario(p_destino uuid, p_tipo text, p_titulo text, p_detalhe text, p_id_obra uuid, p_id_tarefa uuid, p_financeira boolean, p_chave text)
CREATE OR REPLACE FUNCTION public.notificar_usuario(p_destino uuid, p_tipo text, p_titulo text, p_detalhe text, p_id_obra uuid DEFAULT NULL::uuid, p_id_tarefa uuid DEFAULT NULL::uuid, p_financeira boolean DEFAULT false, p_chave text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.notificacoes where created_at < now() - interval '30 days';

  if p_destino is null
     or not exists (select 1 from public.usuarios u where u.id = p_destino and u.ativo) then
    return;
  end if;

  -- mesma chave: atualiza o texto da notificacao que ja existe (sem reavisar)
  if p_chave is not null then
    update public.notificacoes n
       set titulo = p_titulo, detalhe = p_detalhe
     where n.id_usuario_destino = p_destino and n.chave = p_chave;
    if found then return; end if;
  end if;

  if exists (
    select 1 from public.notificacoes n
    where n.id_usuario_destino = p_destino
      and n.tipo = p_tipo
      and n.titulo = p_titulo
      and n.detalhe is not distinct from p_detalhe
      and n.id_obra is not distinct from p_id_obra
      and n.created_at > now() - interval '12 hours'
  ) then
    return;
  end if;

  insert into public.notificacoes
    (id_usuario_destino, tipo, titulo, detalhe, id_obra, id_tarefa, financeira, chave)
  values (p_destino, p_tipo, p_titulo, p_detalhe, p_id_obra, p_id_tarefa, p_financeira, p_chave);
end;
$function$
;

-- public.obra_valores_erp_solicitar(p_id_obra uuid, p_margem_contribuicao numeric, p_rentabilidade numeric, p_venda_sem_impostos numeric)
CREATE OR REPLACE FUNCTION public.obra_valores_erp_solicitar(p_id_obra uuid, p_margem_contribuicao numeric, p_rentabilidade numeric, p_venda_sem_impostos numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_usuario record; v_obra record; v_id uuid;
begin
  if not public.eh_admin() then raise exception 'Só administradores alteram margem, rentabilidade e faturamento no ERP.'; end if;
  select * into v_usuario from public.usuarios where id = public.usuario_atual_id();
  select * into v_obra from public.obras where id = p_id_obra;
  if v_obra.id is null then raise exception 'Obra não encontrada.'; end if;
  if coalesce(trim(v_obra.codigo_externo), '') = '' then raise exception 'A obra não tem código do ERP.'; end if;
  if p_margem_contribuicao is null or p_rentabilidade is null or p_venda_sem_impostos is null then
    raise exception 'Informe a margem de contribuição, a rentabilidade e o faturamento sem impostos.';
  end if;
  if p_margem_contribuicao < 0 or p_venda_sem_impostos < 0 then raise exception 'Margem de contribuição e faturamento não podem ser negativos.'; end if;
  if p_margem_contribuicao + greatest(p_rentabilidade, 0) > p_venda_sem_impostos and p_venda_sem_impostos > 0 then
    raise exception 'Margem de contribuição + rentabilidade não podem passar do faturamento sem impostos.';
  end if;
  -- pedido anterior ainda nao gravado vale menos que este
  update public.obras_valores_erp set situacao = 'substituido' where id_obra = p_id_obra and situacao in ('pendente', 'erro');
  -- igual ao que ja esta no ERP: nada a gravar
  if round(p_margem_contribuicao, 2) = round(v_obra.margem_contribuicao_erp, 2) and round(p_rentabilidade, 2) = round(v_obra.rentabilidade_erp, 2)
     and round(p_venda_sem_impostos, 2) = round(v_obra.venda_sem_impostos_erp, 2) then
    return null;
  end if;
  insert into public.obras_valores_erp (id_obra, codigo_obra, margem_contribuicao, rentabilidade, venda_sem_impostos,
                                        id_solicitante, nome_solicitante, login_erp)
  values (p_id_obra, trim(v_obra.codigo_externo), round(p_margem_contribuicao, 2), round(p_rentabilidade, 2), round(p_venda_sem_impostos, 2),
          v_usuario.id, v_usuario.nome, nullif(trim(coalesce(v_usuario.login_erp, '')), ''))
  returning id into v_id;
  return v_id;
end $function$
;

-- public.obras_resumo_cartao(p_ids uuid[])
CREATE OR REPLACE FUNCTION public.obras_resumo_cartao(p_ids uuid[])
 RETURNS TABLE(id_obra uuid, tarefas_atrasadas integer, parcelas_vencidas integer, fases_atrasadas integer, documentos_atrasados integer, alertas_abertos integer, alertas_criticos integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date d)
  select o.id,
    (select count(*)::int from public.tarefas t, hoje where t.id_obra = o.id and t.status in ('pendente', 'em_andamento') and t.data_vencimento < hoje.d),
    (select count(*)::int from public.parcelas_cliente p, hoje where p.id_obra = o.id and p.data_realizada is null and p.data_prevista < hoje.d),
    (select count(*)::int from public.cronograma_obra c, hoje where c.id_obra = o.id and c.fim_real is null and c.fim_previsto < hoje.d),
    (select count(*)::int from public.documentos_projeto dp, hoje where dp.id_obra = o.id and dp.data_conclusao is null and dp.data_prevista < hoje.d),
    (select count(*)::int from public.obra_alertas a where a.id_obra = o.id and a.resolvido_em is null),
    (select count(*)::int from public.obra_alertas a where a.id_obra = o.id and a.resolvido_em is null and a.gravidade = 'critico')
  from public.obras o
  where o.id = any(p_ids) and public.eh_usuario_ativo();
$function$
;

-- public.pedir_desfazer_previsao(p_id uuid)
CREATE OR REPLACE FUNCTION public.pedir_desfazer_previsao(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.eh_aprovador_previsao() then raise exception 'Somente aprovadores podem desfazer.'; end if;
  update public.solicitacoes_previsao
     set desfazer_status = 'simulando', desfazer_plano = null, desfazer_codigo = null, desfazer_mensagem = null
   where id = p_id and status = 'executada' and (desfazer_status is null or desfazer_status = 'erro');
  if not found then raise exception 'Esta solicitacao nao pode ser desfeita agora.'; end if;
end;
$function$
;

-- public.perfil_atual()
CREATE OR REPLACE FUNCTION public.perfil_atual()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select u.perfil::text from public.usuarios u where lower(u.email) = lower(auth.email()) and u.ativo limit 1;
$function$
;

-- public.pode_aprovar_exportacao(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.pode_aprovar_exportacao(p_id_obra uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin_ou_coordenador() or public.eh_fiscal();
$function$
;

-- public.pode_editar_exportacao(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.pode_editar_exportacao(p_id_obra uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin_ou_coordenador() or public.eh_fiscal();
$function$
;

-- public.pode_gerenciar_arquivo(p_nome text)
CREATE OR REPLACE FUNCTION public.pode_gerenciar_arquivo(p_nome text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin_ou_coordenador()
      or (split_part(p_nome, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and coalesce(public.pode_gerenciar_obra(split_part(p_nome, '/', 2)::uuid), false));
$function$
;

-- public.pode_gerenciar_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.pode_gerenciar_obra(p_id_obra uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.pode_gerenciar_responsavel(o.id_responsavel)
  FROM public.obras o
  WHERE o.id = p_id_obra;
$function$
;

-- public.pode_gerenciar_responsavel(p_id_responsavel uuid)
CREATE OR REPLACE FUNCTION public.pode_gerenciar_responsavel(p_id_responsavel uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.usuarios u
    where lower(u.email) = lower(auth.email()) and u.ativo
      and (u.perfil in ('admin', 'coordenador') or u.id = p_id_responsavel
           or (u.perfil = 'assistente' and u.id_engenheiro_vinculado = p_id_responsavel)));
$function$
;

-- public.pode_ver_exportacao(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.pode_ver_exportacao(p_id_obra uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin_ou_coordenador() or public.eh_fiscal();
$function$
;

-- public.pode_ver_nf_terceiros(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.pode_ver_nf_terceiros(p_id_obra uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_admin_ou_coordenador() or public.eh_fiscal() or public.eh_financeiro()
      or coalesce(public.pode_gerenciar_obra(p_id_obra), false);
$function$
;

-- public.pode_ver_solicitacao_faturamento(p_id_obra uuid, p_id_solicitante uuid)
CREATE OR REPLACE FUNCTION public.pode_ver_solicitacao_faturamento(p_id_obra uuid, p_id_solicitante uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.eh_usuario_ativo() and (
       p_id_solicitante = public.usuario_atual_id()
    or coalesce(public.pode_gerenciar_obra(p_id_obra), false)
    or public.eh_aprovador_faturamento()
    or public.eh_fiscal()
    or public.eh_logistica()
    or public.eh_admin_ou_coordenador());
$function$
;

-- public.previsoes_familias_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.previsoes_familias_obra(p_id_obra uuid)
 RETURNS TABLE(codigo_projeto text, descricao text, previsoes_em_aberto numeric, previsoes_numeros text, eh_obra boolean, nivel_alerta text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select f.codigo_projeto::text, f.descricao::text, f.previsoes_em_aberto::numeric, f.previsoes_numeros::text, f.eh_obra,
         a.nivel
    from public.obra_rentabilidade_familias f
    left join public.obra_familia_alerta a on a.id_obra = f.id_obra and a.codigo_projeto = f.codigo_projeto
   where f.id_obra = p_id_obra
     and public.perfil_atual() in ('admin', 'coordenador', 'engenheiro', 'assistente', 'logistica');
$function$
;

-- public.push_lote(p_segredo text, p_id uuid)
CREATE OR REPLACE FUNCTION public.push_lote(p_segredo text, p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare v_notif public.notificacoes; v_insc jsonb;
begin
  if not public.push_segredo_ok(p_segredo) then raise exception 'Nao autorizado'; end if;
  select * into v_notif from public.notificacoes where id = p_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into v_insc from public.push_inscricoes where id_usuario = v_notif.id_usuario_destino;
  return jsonb_build_object(
    'vapid_publica', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_publica'),
    'vapid_privada', (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_privada'),
    'payload', jsonb_build_object(
      'titulo', v_notif.titulo,
      'corpo', coalesce(v_notif.detalhe, ''),
      'tag', coalesce(v_notif.chave, v_notif.id::text),
      'url', public.url_da_notificacao(v_notif)),
    'inscricoes', v_insc);
end $function$
;

-- public.push_resultado(p_segredo text, p_enviadas uuid[], p_expiradas uuid[])
CREATE OR REPLACE FUNCTION public.push_resultado(p_segredo text, p_enviadas uuid[], p_expiradas uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
begin
  if not public.push_segredo_ok(p_segredo) then raise exception 'Nao autorizado'; end if;
  update public.push_inscricoes set ultimo_envio_em = now() where id = any(coalesce(p_enviadas, '{}'));
  delete from public.push_inscricoes where id = any(coalesce(p_expiradas, '{}'));
end $function$
;

-- public.push_segredo_ok(p_segredo text)
CREATE OR REPLACE FUNCTION public.push_segredo_ok(p_segredo text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
  select coalesce(length(p_segredo) >= 32 and p_segredo = (
    select decrypted_secret from vault.decrypted_secrets where name = 'push_segredo'), false);
$function$
;

-- public.reabrir_ata(p_id_reuniao uuid)
CREATE OR REPLACE FUNCTION public.reabrir_ata(p_id_reuniao uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_obra uuid;
  v_tarefas uuid[];
  v_ocorrencias int;
begin
  select r.id_obra into v_obra from public.reunioes r where r.id = p_id_reuniao for update;
  if not found then
    raise exception 'Reunião não encontrada (ela pode já ter sido reaberta).' using errcode = 'P0002';
  end if;
  -- mesma regra de antes (apagar ocorrencias/tarefas/reuniao exigia pode_gerenciar_obra)
  if not coalesce(public.pode_gerenciar_obra(v_obra), false) then
    raise exception 'Sem permissão para reabrir a ata desta obra.' using errcode = '42501';
  end if;

  with t as (
    update public.tarefas
       set id_reuniao_origem = null, id_reuniao_reaberta = p_id_reuniao
     where id_reuniao_origem = p_id_reuniao
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into v_tarefas from t;

  delete from public.ocorrencias where id_reuniao = p_id_reuniao;
  get diagnostics v_ocorrencias = row_count;
  delete from public.reunioes where id = p_id_reuniao;

  return jsonb_build_object('tarefas', to_jsonb(v_tarefas), 'ocorrencias_removidas', v_ocorrencias);
end;
$function$
;

-- public.recusar_solicitacao_previsao(p_id uuid, p_motivo text)
CREATE OR REPLACE FUNCTION public.recusar_solicitacao_previsao(p_id uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nome text;
begin
  if not public.eh_aprovador_previsao() then raise exception 'Somente aprovadores podem recusar.'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Informe o motivo da recusa.'; end if;
  select nome into v_nome from public.usuarios where id = public.usuario_atual_id();
  update public.solicitacoes_previsao
     set status = 'recusada', id_aprovador = public.usuario_atual_id(), nome_aprovador = v_nome,
         decidido_em = now(), motivo_recusa = trim(p_motivo)
   where id = p_id and status in ('simulando', 'aguardando_aprovacao', 'erro');
  if not found then raise exception 'A solicitacao nao pode mais ser recusada.'; end if;
end;
$function$
;

-- public.reenviar_solicitacao_previsao(p_id uuid)
CREATE OR REPLACE FUNCTION public.reenviar_solicitacao_previsao(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.solicitacoes_previsao
     set status = 'simulando', mensagem = null, tentativas = 0
   where id = p_id and status = 'erro'
     and (id_solicitante = public.usuario_atual_id() or public.eh_aprovador_previsao());
  if not found then raise exception 'A solicitacao nao pode ser reenviada.'; end if;
end;
$function$
;

-- public.registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
CREATE OR REPLACE FUNCTION public.registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_usuario uuid := public.usuario_atual_id();
begin
  if v_usuario is null then raise exception 'Usuario nao identificado'; end if;
  if coalesce(p_endpoint,'') !~ '^https://' then raise exception 'Endpoint invalido'; end if;
  insert into public.push_inscricoes (id_usuario, endpoint, p256dh, auth, user_agent)
  values (v_usuario, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set id_usuario = excluded.id_usuario, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent;
end $function$
;

-- public.regularizar_familias_faturamento_obras_existentes()
CREATE OR REPLACE FUNCTION public.regularizar_familias_faturamento_obras_existentes()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  obra record;
begin
  for obra in
    select id
    from public.obras
    where status = 'em_andamento'
  loop
    perform public.criar_familias_faturamento_obra(obra.id);
  end loop;
end;
$function$
;

-- public.regularizar_grupos_faturamento_obra(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.regularizar_grupos_faturamento_obra(p_id_obra uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  insert into public.obra_faturamento_grupos (
    id_obra,
    codigo,
    descricao,
    valor_total_grupo,
    ativo
  )
  select
    f.id_obra,
    trim(f.grupo_faturamento) as codigo,
    trim(f.grupo_faturamento) as descricao,
    sum(coalesce(f.valor_total_escopo, 0)) as valor_total_grupo,
    true as ativo
  from public.obra_faturamento_familias f
  where f.id_obra = p_id_obra
    and coalesce(trim(f.grupo_faturamento), '') <> ''
    and coalesce(f.valor_total_escopo, 0) > 0
  group by
    f.id_obra,
    trim(f.grupo_faturamento)
  on conflict (id_obra, codigo)
  do update set
    ativo = true,
    valor_total_grupo = greatest(
      coalesce(public.obra_faturamento_grupos.valor_total_grupo, 0),
      excluded.valor_total_grupo
    ),
    updated_at = now();

  update public.obra_faturamento_familias f
  set id_grupo_faturamento = g.id
  from public.obra_faturamento_grupos g
  where g.id_obra = f.id_obra
    and trim(g.codigo) = trim(f.grupo_faturamento)
    and f.id_obra = p_id_obra
    and coalesce(trim(f.grupo_faturamento), '') <> ''
    and f.id_grupo_faturamento is null;
end;
$function$
;

-- public.regularizar_pmis_obras_existentes()
CREATE OR REPLACE FUNCTION public.regularizar_pmis_obras_existentes()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  obra record;
begin
  for obra in
    select id
    from public.obras
    where status = 'em_andamento'
  loop
    perform public.criar_documentos_padrao_obra(obra.id);
    perform public.criar_cronograma_padrao_obra(obra.id);
  end loop;
end;
$function$
;

-- public.religar_tarefas_ata(p_id_reuniao uuid, p_ids_tarefas uuid[])
CREATE OR REPLACE FUNCTION public.religar_tarefas_ata(p_id_reuniao uuid, p_ids_tarefas uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_obra uuid;
  v_n int;
begin
  select r.id_obra into v_obra from public.reunioes r where r.id = p_id_reuniao;
  if not found then
    raise exception 'Reunião não encontrada.' using errcode = 'P0002';
  end if;
  if not coalesce(public.pode_gerenciar_obra(v_obra), false) then
    raise exception 'Sem permissão para gravar a ata desta obra.' using errcode = '42501';
  end if;

  -- so tarefas desvinculadas por reabrir_ata, da mesma obra
  update public.tarefas
     set id_reuniao_origem = p_id_reuniao, id_reuniao_reaberta = null
   where id = any(coalesce(p_ids_tarefas, '{}'::uuid[]))
     and id_obra = v_obra
     and id_reuniao_origem is null
     and id_reuniao_reaberta is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$
;

-- public.remover_push(p_endpoint text)
CREATE OR REPLACE FUNCTION public.remover_push(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.push_inscricoes
   where endpoint = p_endpoint and id_usuario = public.usuario_atual_id();
end $function$
;

-- public.rls_auto_enable()
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

-- public.sf_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
CREATE OR REPLACE FUNCTION public.sf_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s public.solicitacoes_faturamento;
  v_para text[]; v_cc text[]; d uuid;
  v_url text;
begin
  select * into s from public.solicitacoes_faturamento where id = p_id;
  v_url := 'https://gestaoobraskalter.vercel.app/faturamento/' || s.id;
  -- sino/push: so para quem precisa agir (para), nunca para quem fez a acao
  foreach d in array coalesce(p_para, '{}') loop
    if d is distinct from public.usuario_atual_id() then
      perform public.notificar_usuario(d, 'faturamento', p_titulo_push,
        'SF ' || s.numero || ' · obra ' || s.codigo_obra || ' · ' || formatar_brl(coalesce(s.valor_aprovado, s.valor_solicitado)),
        s.id_obra, null, false, 'fat:' || s.id || ':' || s.status || ':' || extract(epoch from now())::bigint);
    end if;
  end loop;
  if not public.sf_email_ligado() then return; end if;
  v_para := public.sf_emails(p_para);
  v_cc := public.sf_emails(p_cc, v_para);
  if cardinality(v_para) = 0 then v_para := v_cc; v_cc := '{}'; end if;
  if cardinality(v_para) = 0 then return; end if;
  insert into public.fila_email (para, cc, assunto, html, origem)
  values (v_para, v_cc, p_assunto, public.email_solicitacao_faturamento(s, p_titulo, p_aviso, p_cor, 'Abrir a solicitação no app', v_url),
          'faturamento');
end $function$
;

-- public.sf_descartar_romaneios(p_id uuid)
CREATE OR REPLACE FUNCTION public.sf_descartar_romaneios(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.solicitacoes_faturamento_romaneios
     set situacao = case when numero_romaneio is null then 'descartado' else 'cancelar' end
   where id_solicitacao = p_id and situacao in ('pendente', 'erro', 'criado');
$function$
;

-- public.sf_email_ligado()
CREATE OR REPLACE FUNCTION public.sf_email_ligado()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ select true $function$
;

-- public.sf_emails(p_ids uuid[], p_excluir text[])
CREATE OR REPLACE FUNCTION public.sf_emails(p_ids uuid[], p_excluir text[] DEFAULT '{}'::text[])
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(distinct lower(u.email)), '{}') from public.usuarios u
   where u.id = any(p_ids) and u.ativo and coalesce(u.email, '') <> '' and not (lower(u.email) = any(p_excluir));
$function$
;

-- public.sf_evento(p_id uuid, p_evento text, p_detalhe text)
CREATE OR REPLACE FUNCTION public.sf_evento(p_id uuid, p_evento text, p_detalhe text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.solicitacoes_faturamento_eventos (id_solicitacao, id_usuario, nome_usuario, evento, detalhe)
  select p_id, u.id, coalesce(u.nome, 'Sistema'), p_evento, p_detalhe
  from (select 1) x left join public.usuarios u on u.id = public.usuario_atual_id();
$function$
;

-- public.sf_gravar_itens(p_id uuid, p_id_obra uuid, p_tipo text, p_itens jsonb, p_logistica boolean)
CREATE OR REPLACE FUNCTION public.sf_gravar_itens(p_id uuid, p_id_obra uuid, p_tipo text, p_itens jsonb, p_logistica boolean)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  it jsonb; p record; v_qtd numeric; v_saldo numeric; v_total numeric := 0; v_valor numeric; v_unit numeric; v_n int := 0;
  v_vol int;
begin
  if jsonb_typeof(p_itens) <> 'array' then raise exception 'Itens inválidos.'; end if;
  if not p_logistica then
    delete from public.solicitacoes_faturamento_itens where id_solicitacao = p_id;
  else
    update public.solicitacoes_faturamento_itens set quantidade_aprovada = 0, valor_aprovado = 0, volumes = null where id_solicitacao = p_id;
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    v_qtd := round((it->>'quantidade')::numeric, 4);
    if v_qtd is null or v_qtd < 0 then raise exception 'Quantidade inválida.'; end if;
    if v_qtd = 0 then continue; end if;
    select * into p from public.obra_pedido_itens where id_obra = p_id_obra and sequencia = (it->>'sequencia')::int;
    if p.sequencia is null then raise exception 'Item % não existe no pedido da obra.', it->>'sequencia'; end if;
    if p.tipo <> p_tipo then raise exception 'Item % não é de %.', p.sequencia, p_tipo; end if;
    v_saldo := public.sf_saldo_item(p_id_obra, p.sequencia, p_id);
    if v_qtd > v_saldo + 0.00005 then
      raise exception 'Item % (%): quantidade % acima do saldo a faturar (%).', p.sequencia, p.codigo_material, v_qtd, round(v_saldo, 4);
    end if;
    v_vol := nullif(it->>'volumes', '')::int;
    if v_vol is not null and v_vol < 0 then raise exception 'Item %: volumes inválidos.', p.sequencia; end if;
    v_unit := round(p.valor_unitario * (1 + p.pct_ipi / 100), 6);
    v_valor := round(v_qtd * p.valor_unitario * (1 + p.pct_ipi / 100), 2);
    if not p_logistica then
      insert into public.solicitacoes_faturamento_itens (id_solicitacao, sequencia, codigo_material, descricao, codigo_familia,
        unidade, valor_unitario_ipi, quantidade_pedido, quantidade_solicitada, valor_solicitado)
      values (p_id, p.sequencia, p.codigo_material, p.descricao, p.codigo_familia, p.unidade, v_unit,
        p.quantidade_pedida - p.quantidade_cancelada, v_qtd, v_valor);
    else
      insert into public.solicitacoes_faturamento_itens (id_solicitacao, sequencia, codigo_material, descricao, codigo_familia,
        unidade, valor_unitario_ipi, quantidade_pedido, quantidade_solicitada, valor_solicitado, quantidade_aprovada, valor_aprovado, volumes)
      values (p_id, p.sequencia, p.codigo_material, p.descricao, p.codigo_familia, p.unidade, v_unit,
        p.quantidade_pedida - p.quantidade_cancelada, 0, 0, v_qtd, v_valor, v_vol)
      on conflict (id_solicitacao, sequencia) do update set quantidade_aprovada = excluded.quantidade_aprovada,
        valor_aprovado = excluded.valor_aprovado, volumes = excluded.volumes;
    end if;
    v_total := v_total + v_valor; v_n := v_n + 1;
  end loop;
  if v_n = 0 then raise exception 'Informe ao menos um item com quantidade.'; end if;
  return v_total;
end $function$
;

-- public.sf_itens_disponiveis(p_id_obra uuid, p_tipo text, p_ignorar uuid)
CREATE OR REPLACE FUNCTION public.sf_itens_disponiveis(p_id_obra uuid, p_tipo text, p_ignorar uuid DEFAULT NULL::uuid)
 RETURNS TABLE(sequencia integer, codigo_material text, descricao text, codigo_familia text, descricao_familia text, unidade text, quantidade_pedido numeric, quantidade_faturada numeric, saldo numeric, valor_unitario_ipi numeric, valor_pedido numeric, valor_saldo numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.sequencia, p.codigo_material, p.descricao, p.codigo_familia,
         (select f.descricao_familia from public.obra_faturamento_familias f
           where f.id_obra = p.id_obra and f.codigo_familia = p.codigo_familia limit 1),
         p.unidade,
         p.quantidade_pedida - p.quantidade_cancelada,
         p.quantidade_entregue,
         s.saldo,
         round(p.valor_unitario * (1 + p.pct_ipi / 100), 6),
         round((p.quantidade_pedida - p.quantidade_cancelada) * p.valor_unitario * (1 + p.pct_ipi / 100), 2),
         round(s.saldo * p.valor_unitario * (1 + p.pct_ipi / 100), 2)
    from public.obra_pedido_itens p
    cross join lateral (select public.sf_saldo_item(p.id_obra, p.sequencia, p_ignorar) as saldo) s
   where p.id_obra = p_id_obra and p.tipo = p_tipo
     and public.pode_ver_solicitacao_faturamento(p_id_obra, null)
     and s.saldo > 0.00005
   order by p.codigo_familia, p.sequencia;
$function$
;

-- public.sf_lembretes()
CREATE OR REPLACE FUNCTION public.sf_lembretes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s record; n integer := 0;
  v_aprov uuid[]; v_fisc uuid[]; v_copia uuid[]; v_sol uuid[]; v_quando text;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select coalesce(array_agg(id), '{}') into v_aprov from public.usuarios where ativo and aprova_faturamento;
  select coalesce(array_agg(id), '{}') into v_fisc from public.usuarios where ativo and perfil = 'fiscal';
  select coalesce(array_agg(id), '{}') into v_copia from public.usuarios where ativo and recebe_copia_faturamento;
  for s in
    select * from public.solicitacoes_faturamento
     where status in ('aguardando_logistica', 'aguardando_fiscal')
       and data_desejada is not null and data_desejada - 3 <= v_hoje
       and (ultimo_lembrete_em is null or ultimo_lembrete_em < v_hoje)
     for update
  loop
    v_sol := case when s.id_solicitante is null then '{}' else array[s.id_solicitante] end;
    v_quando := case when s.data_desejada < v_hoje then 'ATRASADA desde ' || to_char(s.data_desejada, 'DD/MM')
                     when s.data_desejada = v_hoje then 'faturar HOJE'
                     else 'faturar até ' || to_char(s.data_desejada, 'DD/MM') end;
    if s.status = 'aguardando_logistica' then
      perform public.sf_avisar(s.id, v_aprov, v_sol || v_copia,
        'Lembrete: faturamento para conferir (' || v_quando || ') · SF ' || s.numero || ' · obra ' || s.codigo_obra,
        'Lembrete: solicitação de faturamento aguardando a logística', upper(v_quando), '#b45309',
        'Lembrete: faturamento para conferir (' || v_quando || ')');
    else
      perform public.sf_avisar(s.id, v_fisc, v_sol || v_aprov || v_copia,
        'Lembrete: NF a emitir (' || v_quando || ') · SF ' || s.numero || ' · obra ' || s.codigo_obra,
        'Lembrete: faturamento aguardando emissão da NF', upper(v_quando), '#1d4ed8',
        'Lembrete: NF a emitir (' || v_quando || ')');
    end if;
    update public.solicitacoes_faturamento set ultimo_lembrete_em = v_hoje where id = s.id;
    perform public.sf_evento(s.id, 'lembrete', v_quando);
    n := n + 1;
  end loop;
  return n;
end $function$
;

-- public.sf_saldo_item(p_id_obra uuid, p_sequencia integer, p_ignorar uuid)
CREATE OR REPLACE FUNCTION public.sf_saldo_item(p_id_obra uuid, p_sequencia integer, p_ignorar uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select greatest(
    (select p.quantidade_pedida - p.quantidade_entregue - p.quantidade_cancelada
       from public.obra_pedido_itens p where p.id_obra = p_id_obra and p.sequencia = p_sequencia)
    - coalesce((select sum(coalesce(i.quantidade_aprovada, i.quantidade_solicitada))
                  from public.solicitacoes_faturamento_itens i
                  join public.solicitacoes_faturamento s on s.id = i.id_solicitacao
                 where s.id_obra = p_id_obra and i.sequencia = p_sequencia and i.numero_nf is null
                   and s.status in ('aguardando_logistica', 'aguardando_fiscal', 'faturada_parcial')
                   and s.id is distinct from p_ignorar), 0),
    0);
$function$
;

-- public.sincronizar_grupo_faturamento_familia()
CREATE OR REPLACE FUNCTION public.sincronizar_grupo_faturamento_familia()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_codigo text;
begin
  if new.id_grupo_faturamento is not null then
    select codigo
    into v_codigo
    from public.obra_faturamento_grupos
    where id = new.id_grupo_faturamento;

    new.grupo_faturamento = v_codigo;
  end if;

  return new;
end;
$function$
;

-- public.trg_auth_dominio_kalter()
CREATE OR REPLACE FUNCTION public.trg_auth_dominio_kalter()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if lower(coalesce(new.email, '')) not like '%@kalter.com.br' then
    raise exception 'Cadastro permitido somente com e-mail @kalter.com.br.';
  end if;
  return new;
end $function$
;

-- public.trg_exportacao_processo_hash()
CREATE OR REPLACE FUNCTION public.trg_exportacao_processo_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.hash_dados := encode(sha256(convert_to(new.dados::text, 'UTF8')), 'hex');
  if tg_op = 'UPDATE' and new.hash_dados is distinct from old.hash_dados then
    new.situacao := case when (new.aprovacao ->> 'hash') = new.hash_dados
                         then (case when old.situacao = 'gerado' then 'gerado' else 'aprovado' end)
                         else 'rascunho' end;
  end if;
  return new;
end $function$
;

-- public.trg_exportacao_processo_versao()
CREATE OR REPLACE FUNCTION public.trg_exportacao_processo_versao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.aprovacao is distinct from old.aprovacao and (new.aprovacao ->> 'hash') = new.hash_dados then
    insert into public.exportacao_processos_versoes (id_processo, id_obra, evento, hash_dados, dados, por, nome_por)
    values (new.id, new.id_obra, 'aprovado', new.hash_dados, new.dados, nullif(new.aprovacao ->> 'id_usuario', '')::uuid, new.aprovacao ->> 'por');
  end if;
  if new.hash_dados is distinct from old.hash_dados and (old.aprovacao ->> 'hash') = old.hash_dados then
    insert into public.exportacao_processos_versoes (id_processo, id_obra, evento, hash_dados, por, nome_por)
    values (new.id, new.id_obra, 'editado_apos_aprovacao', new.hash_dados, new.atualizado_por, new.nome_atualizou);
  end if;
  if new.situacao = 'gerado' and old.situacao is distinct from 'gerado' then
    insert into public.exportacao_processos_versoes (id_processo, id_obra, evento, hash_dados)
    values (new.id, new.id_obra, 'final_gerado', new.hash_dados);
  end if;
  return null;
end $function$
;

-- public.trg_frete_verba_mudou()
CREATE OR REPLACE FUNCTION public.trg_frete_verba_mudou()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.codigo_projeto like '%.510'
     and (tg_op = 'INSERT' or new.previsoes_em_aberto is distinct from old.previsoes_em_aberto)
     and exists (select 1 from public.fretes where id_obra = new.id_obra and status = 'bloqueado') then
    perform public.frete_reavaliar_obra(new.id_obra);
  end if;
  return null;
end $function$
;

-- public.trg_invalida_impressao_obra()
CREATE OR REPLACE FUNCTION public.trg_invalida_impressao_obra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_obra uuid := coalesce(new.id_obra, old.id_obra);
begin
  if coalesce(auth.role(), '') = 'authenticated' and v_obra is not null then
    delete from public.sync_impressoes where etapa = tg_argv[0] and chave = v_obra::text;
  end if;
  return null;
end $function$
;

-- public.trg_nfs_terceiros_avisos()
CREATE OR REPLACE FUNCTION public.trg_nfs_terceiros_avisos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dest uuid[]; v_coord uuid[]; v_gestor uuid[]; v_enc uuid[];
  v_ref text := 'NF ' || new.numero_nf || ' · ' || new.fornecedor || ' · obra ' || new.codigo_obra;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status and new.encaminhado_em is not distinct from old.encaminhado_em then
    return new;
  end if;
  select coalesce(array_agg(id), '{}') into v_dest from public.usuarios where ativo and recebe_nf_terceiros;
  select coalesce(array_agg(id), '{}') into v_coord from public.usuarios where ativo and perfil = 'coordenador';
  select coalesce(array_agg(o.id_responsavel), '{}') into v_gestor from public.obras o where o.id = new.id_obra and o.id_responsavel is not null;
  v_enc := case when new.id_encaminhou is null then '{}' else array[new.id_encaminhou] end;
  if new.status = 'encaminhada' then
    perform public.nft_avisar(new.id, v_dest, v_enc || v_gestor || v_coord,
      'Lançamento / pagamento de NF de terceiros · ' || v_ref, 'NF de terceiros para lançamento e pagamento',
      'VENCE EM ' || to_char(new.vencimento, 'DD/MM/YYYY'), '#1d4ed8', 'NF de terceiros para lançar', true);
  elsif new.status = 'devolvida' then
    perform public.nft_avisar(new.id, v_enc || v_gestor, v_dest, 'NF de terceiros devolvida · ' || v_ref,
      'NF de terceiros devolvida pelo fiscal/financeiro', 'DEVOLVIDA', '#b91c1c', 'NF de terceiros devolvida', false);
  elsif new.status = 'cancelada' then
    perform public.nft_avisar(new.id, v_dest, v_enc || v_gestor, 'NF de terceiros cancelada (não lançar) · ' || v_ref,
      'NF de terceiros cancelada pelo gestor', 'CANCELADA - NÃO LANÇAR', '#b91c1c', 'NF de terceiros cancelada', false);
  end if;
  return new;
end $function$
;

-- public.trg_notif_comentario_tarefa()
CREATE OR REPLACE FUNCTION public.trg_notif_comentario_tarefa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t record;
  v_autor text;
  d uuid;
begin
  select ta.id, ta.titulo, ta.id_obra, ta.id_responsavel, o.id_responsavel as resp_obra,
         o.codigo_externo || ' - ' || o.nome as obra
    into t
    from public.tarefas ta left join public.obras o on o.id = ta.id_obra
   where ta.id = new.id_tarefa;
  if not found then return new; end if;

  select u.nome into v_autor from public.usuarios u where u.id = new.id_usuario;

  for d in
    select distinct x from unnest(array[t.id_responsavel, t.resp_obra]) x
    where x is not null and x is distinct from new.id_usuario
  loop
    perform public.notificar_usuario(
      d, 'tarefa_comentario',
      'Novo comentário na tarefa: ' || t.titulo,
      concat_ws(' · ', t.obra, coalesce(v_autor, 'Alguém') || ': ' || left(new.texto, 120)),
      t.id_obra, t.id);
  end loop;
  return new;
end;
$function$
;

-- public.trg_notif_fase_obra()
CREATE OR REPLACE FUNCTION public.trg_notif_fase_obra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  function_label text[] := array[
    'processo_inicial=Processo Inicial', 'engenharia=Engenharia', 'compras=Compras',
    'fabricacao=Fabricação', 'montagem=Montagem', 'comissionamento=Comissionamento',
    'start_up=Start-up', 'garantia=Garantia'];
  v_de text; v_para text; x text;
begin
  if new.fase_atual is not distinct from old.fase_atual then return new; end if;

  v_de := old.fase_atual; v_para := new.fase_atual;
  foreach x in array function_label loop
    if split_part(x, '=', 1) = old.fase_atual then v_de := split_part(x, '=', 2); end if;
    if split_part(x, '=', 1) = new.fase_atual then v_para := split_part(x, '=', 2); end if;
  end loop;

  perform public.notificar_equipe_obra(
    new.id, 'fase_alterada',
    'Obra ' || new.codigo_externo || ' mudou de fase',
    coalesce(new.nome, '') || ' · de ' || coalesce(v_de, '-') || ' para ' || coalesce(v_para, '-'));
  return new;
end;
$function$
;

-- public.trg_notif_nf_nova()
CREATE OR REPLACE FUNCTION public.trg_notif_nf_nova()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_obra text;
  v_total numeric;
begin
  if new.id_obra is null or new.created_at < (current_date - 7) then
    return new;
  end if;

  select o.codigo_externo || ' - ' || o.nome into v_obra from public.obras o where o.id = new.id_obra;
  select coalesce(sum(f.valor), 0) into v_total
    from public.faturamentos f
   where f.id_obra = new.id_obra and f.numero_nf = new.numero_nf;

  perform public.notificar_equipe_obra(
    new.id_obra, 'nf_nova',
    'Nova NF emitida: ' || new.numero_nf,
    v_obra || ' · ' || public.formatar_brl(v_total),
    true,
    'nf:' || new.id_obra || ':' || new.numero_nf);
  return new;
end;
$function$
;

-- public.trg_notif_obra_nova()
CREATE OR REPLACE FUNCTION public.trg_notif_obra_nova()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.notificar_equipe_obra(
    new.id, 'obra_nova',
    'Nova obra: ' || new.codigo_externo || ' - ' || new.nome,
    null);
  return new;
end;
$function$
;

-- public.trg_notif_ocorrencia_nova()
CREATE OR REPLACE FUNCTION public.trg_notif_ocorrencia_nova()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_obra text;
  v_tipo text;
begin
  if new.id_obra is null then return new; end if;

  select o.codigo_externo || ' - ' || o.nome into v_obra from public.obras o where o.id = new.id_obra;
  v_tipo := case new.tipo::text
    when 'avanco' then 'Avanço' when 'atraso' then 'Atraso' when 'fornecedor' then 'Fornecedor'
    when 'financeiro' then 'Financeiro' when 'acidente' then 'Acidente' else 'Outros' end;

  perform public.notificar_equipe_obra(
    new.id_obra, 'ocorrencia_nova',
    'Nova ocorrência (' || v_tipo || ')' || case when new.impacta_prazo then ' · impacta o prazo' else '' end,
    concat_ws(' · ', v_obra, left(new.descricao, 140)));
  return new;
end;
$function$
;

-- public.trg_notif_tarefa_atribuida()
CREATE OR REPLACE FUNCTION public.trg_notif_tarefa_atribuida()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_obra text;
begin
  if new.id_responsavel is null
     or new.id_responsavel is not distinct from public.usuario_atual_id()
     or new.status::text in ('concluida', 'cancelada') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.id_responsavel is not distinct from new.id_responsavel then
    return new;
  end if;

  select o.codigo_externo || ' - ' || o.nome into v_obra from public.obras o where o.id = new.id_obra;

  perform public.notificar_usuario(
    new.id_responsavel, 'tarefa_atribuida',
    'Nova tarefa para você: ' || new.titulo,
    concat_ws(' · ', v_obra,
      case when new.data_vencimento is not null
        then 'Prazo ' || to_char(new.data_vencimento at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') end),
    new.id_obra, new.id);
  return new;
end;
$function$
;

-- public.trg_notificacao_push()
CREATE OR REPLACE FUNCTION public.trg_notificacao_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
declare v_segredo text;
begin
  if not exists (select 1 from public.push_inscricoes where id_usuario = new.id_usuario_destino) then
    return new;
  end if;
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'push_segredo';
  if v_segredo is null then return new; end if;
  perform net.http_post(
    url := 'https://gestaoobraskalter.vercel.app/api/enviar-push',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', v_segredo),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  raise warning 'push: %', sqlerrm;
  return new;
end $function$
;

-- public.trg_obra_alertas_avisar()
CREATE OR REPLACE FUNCTION public.trg_obra_alertas_avisar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_resp uuid; v_cod text;
begin
  if new.resolvido_em is not null then return new; end if;
  if tg_op = 'UPDATE' and old.resolvido_em is null then return new; end if; -- ja estava aberto: nao avisa de novo
  select id_responsavel, codigo_externo into v_resp, v_cod from public.obras where id = new.id_obra;
  if v_resp is not null then
    perform public.notificar_usuario(v_resp, 'alerta_obra', 'Obra ' || coalesce(v_cod, '') || ': ' || new.titulo, new.mensagem,
      new.id_obra, null, false, 'alerta:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return new;
end $function$
;

-- public.trg_sf_romaneio_avisos()
CREATE OR REPLACE FUNCTION public.trg_sf_romaneio_avisos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.solicitacoes_faturamento; v_aprov uuid[]; v_fisc uuid[]; v_copia uuid[]; v_sol uuid[]; v_ref text;
begin
  if new.situacao is not distinct from old.situacao or new.situacao not in ('criado', 'erro') then return new; end if;
  select * into s from public.solicitacoes_faturamento where id = new.id_solicitacao;
  if s.status <> 'aguardando_fiscal' then return new; end if;
  select coalesce(array_agg(id), '{}') into v_aprov from public.usuarios where ativo and aprova_faturamento;
  select coalesce(array_agg(id), '{}') into v_fisc from public.usuarios where ativo and perfil = 'fiscal';
  select coalesce(array_agg(id), '{}') into v_copia from public.usuarios where ativo and recebe_copia_faturamento;
  v_sol := case when s.id_solicitante is null then '{}' else array[s.id_solicitante] end;
  v_ref := 'SF ' || s.numero || ' · obra ' || s.codigo_obra || ' · produto · ' || formatar_brl(coalesce(s.valor_aprovado, s.valor_solicitado));
  if new.situacao = 'criado' then
    perform public.sf_avisar(s.id, v_fisc, v_sol || v_aprov || v_copia,
      'Faturamento liberado para emitir NF (romaneio ' || new.numero_romaneio || '): ' || v_ref,
      'Faturamento liberado para emissão da NF', 'ROMANEIO ' || new.numero_romaneio || ' LIBERADO NO ERP', '#1d4ed8',
      'NF a emitir: romaneio ' || new.numero_romaneio);
  else
    perform public.sf_avisar(s.id, v_aprov, v_sol || v_copia,
      'Erro ao gerar o romaneio no ERP: ' || v_ref, 'O romaneio não pôde ser gerado no ERP: ' || coalesce(new.erro, ''),
      'ERRO NO ROMANEIO', '#b91c1c', 'Erro no romaneio');
  end if;
  return new;
exception when others then
  raise warning 'avisos romaneio: %', sqlerrm;
  return new;
end $function$
;

-- public.trg_solicitacao_faturamento_avisos()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_faturamento_avisos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_aprov uuid[]; v_fisc uuid[]; v_copia uuid[];
  v_sol uuid[] := case when new.id_solicitante is null then '{}' else array[new.id_solicitante] end;
  v_ref text := 'SF ' || new.numero || ' · obra ' || new.codigo_obra || ' · ' || case new.tipo when 'produto' then 'produto' else 'serviço' end
                || ' · ' || formatar_brl(coalesce(new.valor_aprovado, new.valor_solicitado));
begin
  if new.status is not distinct from old.status then return new; end if;
  select coalesce(array_agg(id), '{}') into v_aprov from public.usuarios where ativo and aprova_faturamento;
  select coalesce(array_agg(id), '{}') into v_fisc from public.usuarios where ativo and perfil = 'fiscal';
  select coalesce(array_agg(id), '{}') into v_copia from public.usuarios where ativo and recebe_copia_faturamento;

  if new.status = 'aguardando_logistica' then
    perform public.sf_avisar(new.id, v_aprov, v_sol || v_copia,
      case when old.status = 'aguardando_fiscal' then 'Faturamento devolvido pelo fiscal: ' else 'Faturamento para conferir: ' end || v_ref,
      case when old.status = 'aguardando_fiscal' then 'Solicitação de faturamento devolvida pelo fiscal' else 'Solicitação de faturamento para conferir' end,
      'AGUARDANDO A LOGÍSTICA', '#b45309',
      case when old.status = 'aguardando_fiscal' then 'Faturamento devolvido pelo fiscal' else 'Faturamento para conferir' end);
  elsif new.status = 'aguardando_fiscal' and new.tipo = 'produto' then
    null; -- aviso ao fiscal sai com o numero do romaneio (trg_sf_romaneio_avisos)
  elsif new.status = 'aguardando_fiscal' then
    perform public.sf_avisar(new.id, v_fisc, v_sol || v_aprov || v_copia, 'Faturamento liberado para emitir NF: ' || v_ref,
      'Faturamento liberado para emissão da NF', 'AGUARDANDO O FISCAL', '#1d4ed8', 'Faturamento liberado para emitir NF');
  elsif new.status = 'devolvida' then
    perform public.sf_avisar(new.id, v_sol, v_aprov || v_copia, 'Solicitação de faturamento devolvida: ' || v_ref,
      'Solicitação de faturamento devolvida', 'DEVOLVIDA PARA AJUSTE', '#b91c1c', 'Faturamento devolvido para ajuste');
  elsif new.status in ('faturada', 'faturada_parcial') then
    perform public.sf_avisar(new.id, v_sol, v_aprov || v_fisc || v_copia,
      case new.status when 'faturada' then 'Faturamento emitido: ' else 'Faturamento emitido em parte: ' end || v_ref,
      case new.status when 'faturada' then 'Nota fiscal emitida' else 'Nota fiscal emitida para parte dos itens' end,
      case new.status when 'faturada' then 'FATURADA' else 'FATURADA EM PARTE' end, '#047857',
      case new.status when 'faturada' then 'NF emitida' else 'NF emitida em parte' end);
  elsif new.status = 'cancelada' and old.status in ('aguardando_logistica', 'aguardando_fiscal') then
    perform public.sf_avisar(new.id, v_aprov || case when old.status = 'aguardando_fiscal' then v_fisc else '{}' end, v_sol || v_copia,
      'Solicitação de faturamento cancelada: ' || v_ref, 'Solicitação de faturamento cancelada', 'CANCELADA', '#475569',
      'Faturamento cancelado');
  end if;
  return new;
exception when others then
  raise warning 'avisos faturamento: %', sqlerrm;
  return new;
end $function$
;

-- public.trg_solicitacao_previsao_email()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_previsao_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_app text := 'https://gestaoobraskalter.vercel.app';
  v_tipo text := case new.tipo when 'aumento' then 'Aumento' else 'Transferência' end;
  v_para text[];
  v_copia text[];
begin
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'aguardando_aprovacao' then
    select array_agg(lower(u.email)) into v_para from public.usuarios u
     where u.ativo and u.aprova_previsao and coalesce(u.email, '') <> '';
    if v_para is not null then
      insert into public.fila_email (para, assunto, html, origem)
      values (v_para,
              'Previsão para aprovar: obra ' || new.codigo_obra || ' · ' || v_tipo || ' de ' || formatar_brl(new.valor),
              public.email_solicitacao_previsao(new, 'Solicitação de previsão para aprovar', 'AGUARDANDO SUA APROVAÇÃO', '#b45309',
                'Abrir a solicitação no app', v_app || '/previsoes/' || new.id)
              || '<p style="margin:14px 0 0 0; font-size:13px; color:#64748b;">A aprovação ou recusa é feita no app, onde você confere o que será gravado no ERP antes de confirmar.</p>',
              'previsao_aprovacao');
    end if;
    -- copia informativa, sem botao (quem recebe copia nao aprova)
    select array_agg(lower(u.email)) into v_copia from public.usuarios u
     where u.ativo and u.recebe_copia_previsao and not u.aprova_previsao
       and u.id is distinct from new.id_solicitante and coalesce(u.email, '') <> '';
    if v_copia is not null then
      insert into public.fila_email (para, assunto, html, origem)
      values (v_copia,
              'Nova solicitação de previsão: obra ' || new.codigo_obra || ' · ' || v_tipo || ' de ' || formatar_brl(new.valor),
              public.email_solicitacao_previsao(new, 'Nova solicitação de previsão', 'AGUARDANDO APROVAÇÃO', '#b45309', null, null)
              || '<p style="margin:14px 0 0 0; font-size:13px; color:#64748b;">Cópia informativa: a solicitação foi enviada para aprovação.</p>',
              'previsao_copia');
    end if;

  elsif new.status in ('executada', 'recusada', 'erro', 'desfeita') then
    select array[lower(u.email)] into v_para from public.usuarios u
     where u.id = new.id_solicitante and u.ativo and coalesce(u.email, '') <> '';
    -- copia: gestor da obra (sempre) + quem acompanha as previsoes (aprovacao e recusa); sem repetir o solicitante
    select coalesce(array_agg(distinct lower(u.email)), '{}') into v_copia from public.usuarios u
     where u.ativo and coalesce(u.email, '') <> '' and u.id is distinct from new.id_solicitante
       and (u.id = (select o.id_responsavel from public.obras o where o.id = new.id_obra)
            or (u.recebe_copia_previsao and new.status in ('executada', 'recusada')));
    if v_para is null and cardinality(v_copia) > 0 then
      v_para := v_copia; v_copia := '{}';
    end if;
    if v_para is not null then
      insert into public.fila_email (para, cc, assunto, html, origem)
      values (v_para, v_copia,
              case new.status
                when 'executada' then 'Previsão aprovada e gravada no ERP: obra '
                when 'recusada' then 'Solicitação de previsão recusada: obra '
                when 'erro' then 'Solicitação de previsão não pôde ser feita: obra '
                else 'Previsão desfeita no ERP: obra ' end
              || new.codigo_obra || ' · ' || formatar_brl(new.valor),
              public.email_solicitacao_previsao(new,
                case new.status
                  when 'executada' then 'Solicitação de previsão aprovada'
                  when 'recusada' then 'Solicitação de previsão recusada'
                  when 'erro' then 'Solicitação de previsão não pôde ser feita'
                  else 'A transferência foi desfeita' end,
                case new.status
                  when 'executada' then 'APROVADA E GRAVADA NO ERP'
                  when 'recusada' then 'RECUSADA'
                  when 'erro' then 'NÃO REALIZADA'
                  else 'DESFEITA NO ERP' end,
                case new.status when 'executada' then '#047857' when 'desfeita' then '#475569' else '#b91c1c' end,
                'Ver as previsões da obra', v_app || '/obras/' || new.codigo_obra || '/previsoes'),
              'previsao_resultado');
    end if;
  end if;
  return new;
exception when others then
  raise warning 'email previsao: %', sqlerrm;
  return new;
end $function$
;

-- public.trg_solicitacao_previsao_ins()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_previsao_ins()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_usuario uuid := public.usuario_atual_id();
  v_nome text;
  v_soma numeric := 0;
  o jsonb;
  v_fam text;
  v_fams text[] := '{}';
  v_restritas text[] := array['970', '980', '990', '1000'];
begin
  if v_usuario is null then
    raise exception 'Usuario nao identificado.';
  end if;
  select left(trim(u.nome), 50) into v_nome from public.usuarios u where u.id = v_usuario;
  select o2.codigo_externo into new.codigo_obra from public.obras o2 where o2.id = new.id_obra;
  if new.codigo_obra is null then
    raise exception 'Obra nao encontrada.';
  end if;

  new.familia_destino := trim(new.familia_destino);
  if new.familia_destino not like new.codigo_obra || '.%' then
    raise exception 'A familia de destino precisa ser da obra %.', new.codigo_obra;
  end if;
  if split_part(new.familia_destino, '.', 2) = any(v_restritas) then
    raise exception 'A familia % (impostos, despesas comerciais, seguros ou garantia) nao pode ser movimentada por solicitacao.', new.familia_destino;
  end if;
  if coalesce(trim(new.justificativa), '') = '' then
    raise exception 'Informe a justificativa.';
  end if;

  if new.tipo = 'aumento' then
    new.origens := '[]'::jsonb;
  else
    if jsonb_typeof(new.origens) <> 'array' or jsonb_array_length(new.origens) = 0 then
      raise exception 'Informe ao menos uma familia de origem.';
    end if;
    for o in select * from jsonb_array_elements(new.origens) loop
      v_fam := trim(o->>'familia');
      if v_fam not like new.codigo_obra || '.%' then
        raise exception 'A familia de origem % nao e da obra %.', v_fam, new.codigo_obra;
      end if;
      if split_part(v_fam, '.', 2) = any(v_restritas) then
        raise exception 'A familia % (impostos, despesas comerciais, seguros ou garantia) nao pode ser movimentada por solicitacao.', v_fam;
      end if;
      if v_fam = new.familia_destino then
        raise exception 'Origem e destino iguais (%).', v_fam;
      end if;
      if v_fam = any(v_fams) then
        raise exception 'Familia de origem repetida (%).', v_fam;
      end if;
      if (o->>'valor')::numeric <= 0 then
        raise exception 'Valor da origem % precisa ser maior que zero.', v_fam;
      end if;
      v_fams := v_fams || v_fam;
      v_soma := v_soma + round((o->>'valor')::numeric, 2);
    end loop;
    new.valor := v_soma;
  end if;

  new.id_solicitante := v_usuario;
  new.nome_solicitante := coalesce(v_nome, 'Usuario');
  new.solicitante_erp := upper(split_part(coalesce(v_nome, 'Usuario'), ' ', 1));
  new.status := 'simulando';
  new.mensagem := null;
  new.plano := null; new.codigo_plano := null; new.vencimento := null; new.simulado_em := null;
  new.id_aprovador := null; new.nome_aprovador := null; new.decidido_em := null; new.motivo_recusa := null;
  new.resultado := null; new.log_transferencia := null; new.executado_em := null;
  new.desfazer_status := null; new.desfazer_plano := null; new.desfazer_codigo := null;
  new.desfazer_mensagem := null; new.desfeito_em := null;
  new.tentativas := 0;
  new.created_at := now(); new.updated_at := now();
  return new;
end;
$function$
;

-- public.trg_solicitacao_previsao_logistica()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_previsao_logistica()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tipo text := case new.tipo when 'aumento' then 'Aumento' else 'Transferência' end;
  v_para text[];
  r record;
begin
  if new.status is not distinct from old.status or new.status <> 'executada' then return new; end if;

  for r in select u.id from public.usuarios u
            where u.ativo and u.perfil in ('logistica', 'coordenador') and u.id is distinct from new.id_solicitante loop
    perform public.notificar_usuario(
      r.id, 'previsao_resultado',
      'Previsão liberada para compra: ' || v_tipo || ' de ' || public.formatar_brl(new.valor),
      new.codigo_obra || ' · ' || new.familia_destino || ' · pedido de ' || new.nome_solicitante,
      new.id_obra, null, false, 'prevlog:' || new.id);
  end loop;

  select array_agg(lower(u.email)) into v_para from public.usuarios u
   where u.ativo and u.perfil in ('logistica', 'coordenador') and coalesce(u.email, '') <> ''
     and u.id is distinct from new.id_solicitante;
  if v_para is not null then
    insert into public.fila_email (para, assunto, html, origem)
    values (v_para,
            'Previsão liberada para compra: obra ' || new.codigo_obra || ' · ' || v_tipo || ' de ' || public.formatar_brl(new.valor),
            public.email_solicitacao_previsao(new, 'Nova previsão gravada no ERP', 'PREVISÃO LIBERADA PARA COMPRA', '#047857',
              'Ver as previsões da obra', 'https://gestaoobraskalter.vercel.app/obras/' || new.codigo_obra || '/previsoes')
            || '<p style="margin:14px 0 0 0; font-size:13px; color:#64748b;">Você recebe este aviso por ser da Logística/Suprimentos ou da Coordenação: a previsão já está no ERP e a compra pode seguir.</p>',
            'previsao_logistica');
  end if;
  return new;
exception when others then
  raise warning 'aviso logistica previsao: %', sqlerrm;
  return new;
end $function$
;

-- public.trg_solicitacao_previsao_notif()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_previsao_notif()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tipo text := case new.tipo when 'aumento' then 'Aumento' else 'Transferência' end;
  v_valor text := public.formatar_brl(new.valor);
  r record;
begin
  if new.status is distinct from old.status then
    if new.status = 'aguardando_aprovacao' then
      for r in select u.id from public.usuarios u where u.ativo and u.aprova_previsao loop
        perform public.notificar_usuario(
          r.id, 'previsao_aprovacao',
          'Previsão para aprovar: ' || v_tipo || ' de ' || v_valor,
          new.codigo_obra || ' · ' || new.familia_destino || ' · pedido de ' || new.nome_solicitante,
          new.id_obra, null, true, 'prev:' || new.id || ':' || coalesce(new.codigo_plano, ''));
      end loop;
    elsif new.status in ('executada', 'recusada', 'erro', 'desfeita') then
      perform public.notificar_usuario(
        new.id_solicitante, 'previsao_resultado',
        case new.status
          when 'executada' then 'Previsão gravada no ERP: ' || v_tipo || ' de ' || v_valor
          when 'recusada' then 'Solicitação de previsão recusada: ' || v_valor
          when 'erro' then 'Solicitação de previsão não pôde ser feita: ' || v_valor
          else 'Previsão desfeita no ERP: ' || v_tipo || ' de ' || v_valor
        end,
        new.codigo_obra || ' · ' || new.familia_destino || coalesce(' · ' || case new.status
          when 'executada' then 'previsão ' || (new.resultado->'nova_parcela'->>'docto') || ' parcela ' || (new.resultado->'nova_parcela'->>'parcela')
          when 'recusada' then new.motivo_recusa
          when 'erro' then left(new.mensagem, 140)
        end, ''),
        new.id_obra, null, false, null);
    end if;
  end if;

  if new.desfazer_status is distinct from old.desfazer_status and new.desfazer_status = 'aguardando_confirmacao' then
    for r in select u.id from public.usuarios u where u.ativo and u.aprova_previsao loop
      perform public.notificar_usuario(
        r.id, 'previsao_aprovacao',
        'Desfazer pronto para confirmar: ' || v_tipo || ' de ' || v_valor,
        new.codigo_obra || ' · ' || new.familia_destino,
        new.id_obra, null, true, 'desf:' || new.id || ':' || coalesce(new.desfazer_codigo, ''));
    end loop;
  end if;
  return new;
end;
$function$
;

-- public.trg_solicitacao_previsao_upd()
CREATE OR REPLACE FUNCTION public.trg_solicitacao_previsao_upd()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

-- public.trg_solicitacoes_material_avisos()
CREATE OR REPLACE FUNCTION public.trg_solicitacoes_material_avisos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cad uuid[]; v_fis uuid[]; v_sol uuid[]; v_cop uuid[]; v_ref text := 'Nº ' || new.numero || ' · ' || new.descricao;
  v_urg text := case when new.urgente then 'URGENTE · ' else '' end;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select coalesce(array_agg(id), '{}') into v_cad from public.usuarios where ativo and cadastra_materiais;
  select coalesce(array_agg(id), '{}') into v_fis from public.usuarios where ativo and revisa_fiscal_material;
  select coalesce(array_agg(id), '{}') into v_cop from public.usuarios where ativo and recebe_copia_material;
  v_sol := case when new.id_solicitante is null then '{}' else array[new.id_solicitante] end;
  if new.status = 'cadastro' then
    if tg_op = 'UPDATE' and old.status = 'fiscal' then
      perform public.mat_avisar(new.id, v_cad, 'Cadastro de material devolvido pelo fiscal · ' || v_ref, 'Solicitação de material devolvida pelo fiscal',
        'DEVOLVIDA PELO FISCAL', '#b91c1c', 'Material devolvido pelo fiscal');
    else
      perform public.mat_avisar(new.id, array(select distinct x from unnest(v_cad || v_cop) x),
        v_urg || 'Novo material para cadastrar · ' || v_ref, 'Solicitação de cadastro de material',
        v_urg || 'AGUARDANDO REVISÃO DO CADASTRO', case when new.urgente then '#b91c1c' else '#1d4ed8' end, 'Material para revisar');
    end if;
  elsif new.status = 'fiscal' then
    perform public.mat_avisar(new.id, array(select distinct x from unnest(v_fis || v_cop) x),
      v_urg || 'Material para revisão fiscal · ' || v_ref, 'Solicitação de material para revisão fiscal',
      v_urg || 'AGUARDANDO REVISÃO FISCAL', case when new.urgente then '#b91c1c' else '#b45309' end, 'Material para revisão fiscal');
  elsif new.status = 'concluida' then
    perform public.mat_avisar(new.id, array(select distinct x from unnest(v_sol || v_cad || v_cop) x),
      'Material cadastrado no ERP · ' || v_ref, 'Material cadastrado e disponível no ERP',
      'CÓDIGO ' || coalesce(new.codigo_edit, new.codigo_erp::text), '#047857', 'Material cadastrado: ' || coalesce(new.codigo_edit, new.codigo_erp::text));
  elsif new.status = 'devolvida' then
    perform public.mat_avisar(new.id, v_sol, 'Solicitação de material devolvida · ' || v_ref, 'Solicitação de material devolvida para correção',
      'DEVOLVIDA', '#b91c1c', 'Solicitação de material devolvida');
  elsif new.status = 'recusada' then
    perform public.mat_avisar(new.id, v_sol, 'Solicitação de material recusada · ' || v_ref, 'Solicitação de material recusada',
      case when new.codigo_existente is not null then 'USE O ITEM ' || coalesce(new.codigo_edit, new.codigo_existente::text) else 'RECUSADA' end,
      '#b91c1c', 'Solicitação de material recusada');
  end if;
  return new;
end $function$
;

-- public.trg_usuarios_avisa_cadastro_novo()
CREATE OR REPLACE FUNCTION public.trg_usuarios_avisa_cadastro_novo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d uuid;
begin
  if new.ativo then return new; end if;
  for d in select id from public.usuarios where ativo and perfil = 'admin' loop
    perform public.notificar_usuario(d, 'cadastro', 'Novo cadastro aguardando liberação',
      new.nome || ' (' || new.email || ') criou uma conta. Libere em Cadastros > Equipe.', null, null, false, 'cadastro:' || new.id);
  end loop;
  return new;
end $function$
;

-- public.trg_usuarios_indicadores_previsao()
CREATE OR REPLACE FUNCTION public.trg_usuarios_indicadores_previsao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_admin boolean;
begin
  if coalesce(auth.role(), '') <> 'authenticated' then return new; end if; -- robo/service_role
  v_admin := public.eh_admin();
  if tg_op = 'INSERT' and not v_admin then
    if lower(new.email) not like '%@kalter.com.br' then
      raise exception 'Cadastro permitido somente com e-mail @kalter.com.br.';
    end if;
    new.email := lower(new.email);
    new.perfil := 'engenheiro';
    new.id_engenheiro_vinculado := null;
    new.aprova_previsao := false;
    new.recebe_copia_previsao := false;
    new.aprova_faturamento := false;
    new.recebe_copia_faturamento := false;
    new.cadastra_materiais := false;
    new.revisa_fiscal_material := false;
    new.recebe_copia_material := false;
    new.ativo := false;  -- 06/11: aguarda o admin liberar
    return new;
  end if;
  if tg_op = 'UPDATE' and not v_admin and (
       new.aprova_previsao is distinct from old.aprova_previsao
    or new.recebe_copia_previsao is distinct from old.recebe_copia_previsao
    or new.aprova_faturamento is distinct from old.aprova_faturamento
    or new.recebe_copia_faturamento is distinct from old.recebe_copia_faturamento
    or new.cadastra_materiais is distinct from old.cadastra_materiais
    or new.revisa_fiscal_material is distinct from old.revisa_fiscal_material
    or new.recebe_copia_material is distinct from old.recebe_copia_material
    or new.perfil is distinct from old.perfil
    or new.ativo is distinct from old.ativo) then
    raise exception 'Somente administradores podem alterar perfil, situação ou permissões.';
  end if;
  return new;
end $function$
;

-- public.update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

-- public.url_da_notificacao(n public.notificacoes)
CREATE OR REPLACE FUNCTION public.url_da_notificacao(n public.notificacoes)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when n.tipo = 'faturamento' and n.chave ~ '^fat:[0-9a-f-]{36}'
      then '/faturamento/' || substring(n.chave from 5 for 36)
    when n.tipo = 'nf_terceiros' and n.chave ~ '^nft:[0-9a-f-]{36}'
      then '/nfs-terceiros/' || substring(n.chave from 5 for 36)
    when n.tipo = 'frete' and n.chave ~ '^frete:[0-9a-f-]{36}'
      then '/fretes/' || substring(n.chave from 7 for 36)
    when n.tipo = 'previsao_aprovacao' and n.chave ~ '^(prev|desf):[0-9a-f-]{36}'
      then '/previsoes/' || substring(n.chave from 6 for 36)
    when o.codigo_externo is not null and n.tipo in ('previsao_resultado', 'familia_alerta')
      then '/obras/' || o.codigo_externo || '/previsoes'
    when o.codigo_externo is not null and n.tipo = 'nf_nova'
      then '/obras/' || o.codigo_externo || '/faturamento'
    when o.codigo_externo is not null and n.tipo = 'recebimento_novo'
      then '/obras/' || o.codigo_externo || '/financeiro'
    when n.tipo in ('tarefa_atribuida', 'tarefa_comentario')
      then '/tarefas' || coalesce('?tarefa=' || n.id_tarefa::text, '')
    when o.codigo_externo is not null
      then '/obras/' || o.codigo_externo
    else '/?abrir=notificacoes'
  end
  from (select 1) x left join public.obras o on o.id = n.id_obra;
$function$
;

-- public.usuario_atual_id()
CREATE OR REPLACE FUNCTION public.usuario_atual_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from public.usuarios where lower(email) = lower(auth.email()) and ativo limit 1;
$function$
;

-- public.validar_escopo_grupos_faturamento(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.validar_escopo_grupos_faturamento(p_id_obra uuid)
 RETURNS TABLE(id_grupo_faturamento uuid, codigo_grupo text, descricao_grupo text, valor_total_grupo numeric, valor_total_familias numeric, diferenca numeric, esta_batendo boolean)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select
    g.id as id_grupo_faturamento,
    g.codigo as codigo_grupo,
    g.descricao as descricao_grupo,
    coalesce(g.valor_total_grupo, 0) as valor_total_grupo,
    coalesce(sum(f.valor_total_escopo), 0) as valor_total_familias,
    coalesce(g.valor_total_grupo, 0) - coalesce(sum(f.valor_total_escopo), 0) as diferenca,
    abs(coalesce(g.valor_total_grupo, 0) - coalesce(sum(f.valor_total_escopo), 0)) < 0.01 as esta_batendo
  from public.obra_faturamento_grupos g
  left join public.obra_faturamento_familias f
    on f.id_grupo_faturamento = g.id
   and f.id_obra = g.id_obra
   and coalesce(f.valor_total_escopo, 0) > 0
  where g.id_obra = p_id_obra
    and g.ativo = true
  group by
    g.id,
    g.codigo,
    g.descricao,
    g.valor_total_grupo
  order by
    g.codigo;
$function$
;

-- public.validar_faturamento_obra_para_finalizar(p_id_obra uuid)
CREATE OR REPLACE FUNCTION public.validar_faturamento_obra_para_finalizar(p_id_obra uuid)
 RETURNS TABLE(pode_finalizar boolean, escopo_total numeric, faturado_total numeric, saldo_a_faturar numeric)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  with escopo as (
    select coalesce(sum(valor_total_escopo), 0) as total
    from public.obra_faturamento_familias
    where id_obra = p_id_obra
      and coalesce(valor_total_escopo, 0) > 0
  ),
  faturado as (
    select coalesce(sum(valor_realizado), 0) as total
    from public.obra_faturamento_realizados
    where id_obra = p_id_obra
  )
  select
    case
      when coalesce(f.total, 0) >= coalesce(e.total, 0)
       and coalesce(e.total, 0) > 0
      then true
      else false
    end as pode_finalizar,
    coalesce(e.total, 0) as escopo_total,
    coalesce(f.total, 0) as faturado_total,
    greatest(coalesce(e.total, 0) - coalesce(f.total, 0), 0) as saldo_a_faturar
  from escopo e
  cross join faturado f;
$function$
;

-- public.validar_responsavel_obra_e_engenheiro()
CREATE OR REPLACE FUNCTION public.validar_responsavel_obra_e_engenheiro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_perfil text;
BEGIN
  IF NEW.id_responsavel IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT perfil::text INTO v_perfil FROM public.usuarios WHERE id = NEW.id_responsavel;

  IF v_perfil IS DISTINCT FROM 'engenheiro' THEN
    RAISE EXCEPTION 'O responsável pela obra deve ser um usuário com perfil Engenheiro.';
  END IF;

  RETURN NEW;
END;
$function$
;

-- public.verificar_saude_robo()
CREATE OR REPLACE FUNCTION public.verificar_saude_robo()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_agora timestamp := now() at time zone 'America/Sao_Paulo';
  v_janela boolean := extract(isodow from v_agora) between 1 and 5 and v_agora::time between '07:40' and '19:00';
  v_robo record; v_prev record; v_bkp record; v_mail record; v_fc record; v_fila timestamptz; v_erros integer;
  v_problemas jsonb := '{}'; v_esperas jsonb := '{"robo_erro": 15}';
  c text; v_det text; a record; n integer := 0;
  v_titulos jsonb := '{"robo_parado": "Robô de sincronização parado", "robo_erro": "Robô com etapa falhando",
     "previsoes_parado": "Robô de previsões parado", "email_parado": "Envio de e-mails do app parado", "backup": "Backup diário do app não foi feito",
     "email_erro": "E-mails do app não enviados", "email_tarefa": "Tarefa de e-mail do servidor parada", "fluxo_caixa": "Snapshot do fluxo de caixa não rodou"}';
begin
  select * into v_robo from public.sync_status where id = 'robo';
  select * into v_prev from public.sync_status where id = 'previsoes';
  select * into v_bkp from public.sync_status where id = 'backup';
  select * into v_mail from public.sync_status where id = 'email';
  select * into v_fc from public.sync_status where id = 'fluxo_caixa';
  select min(created_at) into v_fila from public.fila_email where status = 'pendente';
  select count(*) into v_erros from public.fila_email where status = 'erro' and created_at > now() - interval '24 hours';

  if v_janela then
    if v_robo.terminou_em is null or v_robo.terminou_em < now() - interval '30 minutes' then
      v_problemas := v_problemas || jsonb_build_object('robo_parado', 'Última rodada terminou em '
        || coalesce(to_char(v_robo.terminou_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), 'nunca')
        || '. Verifique o servidor 192.168.1.252 (tarefa RoboSyncERP-GestaoObras).');
    elsif not v_robo.ok then
      v_problemas := v_problemas || jsonb_build_object('robo_erro', 'Etapa(s) com erro: ' || array_to_string(v_robo.etapas_com_erro, ', ')
        || '. Veja o log em C:\RoboSyncERP\logs no servidor.');
    end if;
    if v_prev.terminou_em is not null and v_prev.terminou_em < now() - interval '30 minutes' then
      v_problemas := v_problemas || jsonb_build_object('previsoes_parado', 'Última rodada terminou em '
        || to_char(v_prev.terminou_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ' (tarefa RoboSyncERP-Previsoes).');
    end if;
    if v_fila is not null and v_fila < now() - interval '15 minutes' then
      v_problemas := v_problemas || jsonb_build_object('email_parado', 'Há e-mails na fila desde '
        || to_char(v_fila at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ' (tarefa RoboSyncERP-Email no servidor).');
    end if;
    if v_mail.terminou_em is not null and (v_mail.terminou_em < now() - interval '20 minutes' or not v_mail.ok) then
      v_problemas := v_problemas || jsonb_build_object('email_tarefa', case when not v_mail.ok then 'A última execução falhou: '
        || array_to_string(v_mail.etapas_com_erro, ', ') else 'Última execução em '
        || to_char(v_mail.terminou_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') end || ' (tarefa RoboSyncERP-Email no servidor).');
    end if;
    if v_erros > 0 then
      v_problemas := v_problemas || jsonb_build_object('email_erro', v_erros || ' e-mail(s) não puderam ser enviados nas últimas 24 h '
        || '(ver fila_email com status erro; senha do Gmail ou destinatário inválido).');
    end if;
    if v_fc.terminou_em is not null and (v_fc.terminou_em < now() - interval '26 hours' or not v_fc.ok) then
      v_problemas := v_problemas || jsonb_build_object('fluxo_caixa', case when not v_fc.ok then 'A última execução falhou: '
        || array_to_string(v_fc.etapas_com_erro, ', ') else 'Última execução em '
        || to_char(v_fc.terminou_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') end || ' (tarefa FluxoCaixa-Snapshot no servidor).');
    end if;
    if v_agora::time >= '09:00' and (v_bkp.terminou_em is null or (v_bkp.terminou_em at time zone 'America/Sao_Paulo')::date < v_agora::date or not v_bkp.ok) then
      v_problemas := v_problemas || jsonb_build_object('backup', case when v_bkp.ok is false
        then 'O backup falhou: ' || array_to_string(v_bkp.etapas_com_erro, ', ')
        else 'Último backup: ' || coalesce(to_char(v_bkp.terminou_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), 'nunca') end
        || ' (pasta C:\RoboSyncERP\backups no servidor).');
    end if;
  end if;

  for c in select jsonb_object_keys(v_titulos) loop
    v_det := v_problemas ->> c;
    select * into a from public.sistema_alertas where chave = c;
    if v_det is not null then
      if a.chave is null or not a.ativo then
        insert into public.sistema_alertas (chave, ativo, detalhe, desde, avisado, atualizado_em) values (c, true, v_det, now(), false, now())
          on conflict (chave) do update set ativo = true, detalhe = excluded.detalhe, desde = now(), avisado = false, atualizado_em = now();
        a.desde := now(); a.avisado := false;
      else
        update public.sistema_alertas set detalhe = v_det, atualizado_em = now() where chave = c;
      end if;
      if not a.avisado and now() - a.desde >= make_interval(mins => coalesce((v_esperas ->> c)::int, 0)) then
        perform public.alerta_sistema_avisar(v_titulos ->> c, v_det, true);
        update public.sistema_alertas set avisado = true where chave = c;
        n := n + 1;
      end if;
    elsif a.ativo then
      update public.sistema_alertas set ativo = false, atualizado_em = now() where chave = c;
      if a.avisado then
        perform public.alerta_sistema_avisar((v_titulos ->> c) || ': normalizado', 'Voltou a funcionar. O problema começou em '
          || to_char(a.desde at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.', false);
        n := n + 1;
      end if;
    end if;
  end loop;
  return n;
end $function$
;
