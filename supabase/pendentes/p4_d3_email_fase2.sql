-- Pacote 4 / D3 - fase 2 (SO DEPOIS que o app novo que usa estas funcoes estiver publicado).
--
-- Objetivo: o app para de mandar HTML/destinatario para o banco. Ele passa so o id; o banco monta o e-mail com o
-- texto ja escapado (html_esc) e escolhe os destinatarios. Depois disso enfileirar_email deixa de ser chamavel
-- pelo app (revoke no fim deste arquivo) e uma conta roubada nao consegue mais escrever e-mail livre.
--
-- PARTE A (pode ser aplicada antes do push - so acrescenta funcoes):
--   email_enviar_tarefa(p_id_tarefa uuid) -> uuid       troca o rpc("enfileirar_email", {origem 'tarefa_atribuida'})
--                                                       de src/App.tsx (~1715). Para: responsavel da tarefa.
--   email_enviar_ata(p_id_sessao uuid)    -> jsonb      troca o rpc("enfileirar_email", {origem 'ata'}) de
--                                                       src/telas/TelaReunioes.tsx (~690). Devolve
--                                                       {"id": <fila>, "destinatarios": [...]} (a tela mostra a lista).
--                                                       Para: usuarios ativos admin/coordenador/engenheiro (a mesma
--                                                       regra de destinatariosAta() no app; logistica nao recebe).
-- As duas reaproveitam enfileirar_email por dentro (mesmas travas: destinatario ativo, 40 por hora, HTML filtrado) e
-- gravam criado_por = quem pediu.
--
-- Mudanca no app (outros agentes / arquiteto):
--   App.tsx enviarEmailAtribuicao: trocar o HTML + rpc por
--       supabase.rpc("email_enviar_tarefa", { p_id_tarefa: idTarefa })   (mesmo tratamento de erro de hoje)
--   TelaReunioes.tsx enviarAtaPorEmailResend: trocar por
--       supabase.rpc("email_enviar_ata", { p_id_sessao: <id da sessao da ata> })  e usar data.destinatarios.
--   O PDF/impressao da ata continua montado no app (montarHtmlAta) - so o e-mail passa para o banco.
--   O botao "Ver ata no app" usa /reunioes/AAAA-MM-DD, igual ao app.
--
-- PARTE B (so depois do push e de 1-2 dias sem cache do app antigo): revoke de enfileirar_email para authenticated.
--   Atualizar tambem robo-sync-erp/tests/test_seguranca_pacote1_banco.py: tirar "enfileirar_email" de RPCS_APP e
--   acrescentar "email_enviar_tarefa", "email_enviar_ata".

-- ================================================================== PARTE A
create or replace function public.email_enviar_tarefa(p_id_tarefa uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  t record;
  v_email text;
  v_html text;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
begin
  if not public.eh_usuario_ativo() then raise exception 'Usuário não identificado.'; end if;
  select tf.id, tf.titulo, tf.descricao, tf.data_vencimento, tf.id_obra, tf.id_responsavel, o.nome nome_obra
    into t
    from public.tarefas tf left join public.obras o on o.id = tf.id_obra
   where tf.id = p_id_tarefa;
  if t.id is null then raise exception 'Tarefa não encontrada.'; end if;
  -- quem pode atribuir a tarefa (mesma regra da politica de insert/update de tarefas)
  if not (public.eh_admin_ou_coordenador() or coalesce(public.pode_gerenciar_obra(t.id_obra), false)) then
    raise exception 'Sem permissão para avisar o responsável desta tarefa.';
  end if;
  select u.email into v_email from public.usuarios u where u.id = t.id_responsavel and u.ativo;
  if v_email is null then return null; end if;  -- sem responsavel ativo: nada a enviar (o app ja ignorava)

  -- so o miolo: cabecalho com logo e rodape sao colocados pelo robo (layout_email.py), como no app
  v_html := '<p style="margin:0 0 18px 0; font-size:20px; font-weight:bold; color:#2A6377;">Nova tarefa atribuída a você</p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Tarefa', '<strong>' || public.html_esc(t.titulo) || '</strong>')
    || case when coalesce(t.descricao, '') <> '' then format(v_linha, 'Descrição', replace(public.html_esc(t.descricao), E'\n', '<br/>')) else '' end
    || case when t.nome_obra is not null then format(v_linha, 'Obra', public.html_esc(t.nome_obra)) else '' end
    -- data_vencimento e gravada como meia-noite UTC do dia escolhido (mesma leitura de obras_saude)
    || case when t.data_vencimento is not null then format(v_linha, 'Prazo', '<strong>' || to_char(t.data_vencimento at time zone 'UTC', 'DD/MM/YYYY') || '</strong>') else '' end
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="https://gestaoobraskalter.vercel.app/tarefas?tarefa=' || t.id || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Clique aqui para ver a tarefa</a>'
    || '</td></tr></table>';

  return public.enfileirar_email(array[v_email], 'Nova tarefa: ' || t.titulo, v_html, 'tarefa_atribuida', t.id);
end $function$;

revoke all on function public.email_enviar_tarefa(uuid) from public, anon;
grant execute on function public.email_enviar_tarefa(uuid) to authenticated;


create or replace function public.email_enviar_ata(p_id_sessao uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  s record;
  v_para text[];
  v_html text;
  v_obras text;
  v_data text;
  v_id uuid;
begin
  if not public.eh_usuario_ativo() then raise exception 'Usuário não identificado.'; end if;
  select rs.id, rs.data_reuniao, rs.id_criador, rs.resumo_gravacao into s
    from public.reunioes_sessoes rs where rs.id = p_id_sessao;
  if s.id is null then raise exception 'Reunião não encontrada.'; end if;
  if not (public.eh_admin_ou_coordenador() or s.id_criador = public.usuario_atual_id()) then
    raise exception 'Só quem conduziu a reunião (ou administrador/coordenador) envia a ata.';
  end if;

  select array_agg(distinct lower(u.email)) into v_para
    from public.usuarios u
   where u.ativo and u.perfil::text in ('admin', 'coordenador', 'engenheiro') and coalesce(u.email, '') <> '';
  if v_para is null then raise exception 'Nenhum destinatário com e-mail cadastrado.'; end if;

  v_data := to_char(s.data_reuniao, 'DD/MM/YYYY');
  -- por gestor (nome em maiusculas) e por obra, como a ata impressa
  select string_agg(bloco, '' order by gestor, obra) into v_obras from (
    select upper(coalesce(g.nome, 'Sem gestor definido')) gestor, upper(o.nome) obra,
      '<p style="margin:22px 0 8px 0; color:#2A6377; font-size:16px; font-weight:bold; border-bottom:2px solid #2A6377; padding-bottom:4px;">GESTOR: '
        || public.html_esc(upper(coalesce(g.nome, 'Sem gestor definido'))) || ' · OBRA: ' || public.html_esc(upper(o.nome)) || '</p>'
      || '<p style="margin:0 0 10px 0; font-size:14px; color:#1e293b;"><strong>Resumo da reunião:</strong><br/>'
      || coalesce(nullif(replace(public.html_esc(r.resumo_geral), E'\n', '<br/>'), ''), 'Nenhum resumo registrado.') || '</p>'
      || coalesce((select '<p style="margin:10px 0 4px 0; font-weight:bold; font-size:13px;">Ocorrências registradas</p><table role="presentation" cellspacing="0" cellpadding="6" border="1" width="100%" style="border-collapse:collapse; border-color:#cbd5e1; font-size:13px;">'
                     || string_agg('<tr><td width="20%"><strong>' || public.html_esc(upper(oc.tipo::text)) || '</strong></td><td style="white-space:pre-wrap">'
                                   || public.html_esc(oc.descricao) || '</td></tr>', '' order by oc.created_at) || '</table>'
                    from public.ocorrencias oc where oc.id_reuniao = r.id), '')
      || coalesce((select '<p style="margin:10px 0 4px 0; font-weight:bold; font-size:13px;">Tarefas e prazos definidos</p><table role="presentation" cellspacing="0" cellpadding="6" border="1" width="100%" style="border-collapse:collapse; border-color:#cbd5e1; font-size:13px;">'
                     || string_agg('<tr><td width="45%">' || public.html_esc(tf.titulo) || '</td><td width="30%">'
                                   || public.html_esc(coalesce(ur.nome, 'Geral')) || '</td><td width="25%">'
                                   || coalesce(to_char(tf.data_vencimento at time zone 'UTC', 'DD/MM/YYYY'), '') || '</td></tr>', '' order by tf.created_at) || '</table>'
                    from public.tarefas tf left join public.usuarios ur on ur.id = tf.id_responsavel
                   where tf.id_reuniao_origem = r.id), '') as bloco
      from public.reunioes r
      join public.obras o on o.id = r.id_obra
      left join public.usuarios g on g.id = o.id_responsavel
     where r.id_sessao = s.id
  ) x;
  if v_obras is null then raise exception 'Esta reunião ainda não tem obras salvas na ata.'; end if;

  v_html := '<p style="margin:0 0 6px 0; font-size:20px; font-weight:bold; color:#2A6377;">Ata de Reunião de Obras</p>'
    || '<p style="margin:0 0 16px 0; font-size:13px; color:#64748b; font-weight:bold;">' || v_data || '</p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="https://gestaoobraskalter.vercel.app/reunioes/' || to_char(s.data_reuniao, 'YYYY-MM-DD') || '" target="_blank" style="display:inline-block; padding:10px 20px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Ver ata no app</a>'
    || '</td></tr></table>'
    || v_obras
    || case when coalesce(s.resumo_gravacao, '') <> '' then
         '<p style="margin:22px 0 8px 0; color:#2A6377; font-size:16px; font-weight:bold;">RESUMO DA GRAVAÇÃO DA REUNIÃO</p><p style="font-size:14px; color:#1e293b;">'
         || replace(public.html_esc(s.resumo_gravacao), E'\n', '<br/>') || '</p>' else '' end;

  v_id := public.enfileirar_email(v_para, 'Ata de Reunião de Obras - ' || v_data, v_html, 'ata', null);
  return jsonb_build_object('id', v_id, 'destinatarios', to_jsonb(v_para));
end $function$;

revoke all on function public.email_enviar_ata(uuid) from public, anon;
grant execute on function public.email_enviar_ata(uuid) to authenticated;


-- ================================================================== PARTE B (so depois do push + alguns dias)
-- As duas funcoes acima continuam chamando enfileirar_email por dentro (SECURITY DEFINER: roda como dono).
revoke execute on function public.enfileirar_email(text[], text, text, text, uuid) from authenticated;
