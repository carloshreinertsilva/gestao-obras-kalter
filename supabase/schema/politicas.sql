-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- RLS de 69 tabelas e 131 politicas do schema public

-- auditoria
alter table public.auditoria enable row level security;
create policy auditoria_select_admin on public.auditoria
    as permissive for select
    to authenticated
    using (public.eh_admin());

-- comentarios_tarefa
alter table public.comentarios_tarefa enable row level security;
create policy comentarios_tarefa_delete_admin_or_responsavel on public.comentarios_tarefa
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = comentarios_tarefa.id_tarefa))));
create policy comentarios_tarefa_insert_admin_ou_atribuido on public.comentarios_tarefa
    as permissive for insert
    to authenticated
    with check ((public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = comentarios_tarefa.id_tarefa))) OR (( SELECT t.id_responsavel
   FROM public.tarefas t
  WHERE (t.id = comentarios_tarefa.id_tarefa)) = public.usuario_atual_id())));
create policy comentarios_tarefa_select_authenticated on public.comentarios_tarefa
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy comentarios_tarefa_update_admin_or_responsavel on public.comentarios_tarefa
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = comentarios_tarefa.id_tarefa))))
    with check (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = comentarios_tarefa.id_tarefa))));

-- cronograma_obra
alter table public.cronograma_obra enable row level security;
create policy cronograma_obra_delete_admin_or_responsavel on public.cronograma_obra
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy cronograma_obra_insert_admin_or_responsavel on public.cronograma_obra
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy cronograma_obra_select_authenticated on public.cronograma_obra
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy cronograma_obra_update_admin_or_responsavel on public.cronograma_obra
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- diario_obra
alter table public.diario_obra enable row level security;
create policy diario_obra_delete_admin_or_responsavel on public.diario_obra
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy diario_obra_insert_admin_or_responsavel on public.diario_obra
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy diario_obra_select_authenticated on public.diario_obra
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy diario_obra_update_admin_or_responsavel on public.diario_obra
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- documentos_projeto
alter table public.documentos_projeto enable row level security;
create policy documentos_projeto_delete_admin_or_responsavel on public.documentos_projeto
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy documentos_projeto_insert_admin_or_responsavel on public.documentos_projeto
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy documentos_projeto_select_authenticated on public.documentos_projeto
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy documentos_projeto_update_admin_or_responsavel on public.documentos_projeto
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- documentos_projeto_arquivos
alter table public.documentos_projeto_arquivos enable row level security;
create policy documentos_arquivos_delete_admin_or_responsavel on public.documentos_projeto_arquivos
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy documentos_arquivos_insert_admin_or_responsavel on public.documentos_projeto_arquivos
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy documentos_arquivos_select_authenticated on public.documentos_projeto_arquivos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy documentos_arquivos_update_admin_or_responsavel on public.documentos_projeto_arquivos
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- exportacao_config
alter table public.exportacao_config enable row level security;
create policy exportacao_config_select on public.exportacao_config
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao());

-- exportacao_documentos
alter table public.exportacao_documentos enable row level security;
create policy exportacao_documentos_select on public.exportacao_documentos
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao(id_obra));

-- exportacao_erp
alter table public.exportacao_erp enable row level security;
create policy exportacao_erp_select on public.exportacao_erp
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao(id_obra));

-- exportacao_estimativas
alter table public.exportacao_estimativas enable row level security;
create policy exportacao_estimativas_select on public.exportacao_estimativas
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao());

-- exportacao_ncm
alter table public.exportacao_ncm enable row level security;
create policy exportacao_ncm_select on public.exportacao_ncm
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao());

-- exportacao_processos
alter table public.exportacao_processos enable row level security;
create policy exportacao_processos_select on public.exportacao_processos
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao(id_obra));

-- exportacao_processos_versoes
alter table public.exportacao_processos_versoes enable row level security;
create policy exportacao_processos_versoes_le on public.exportacao_processos_versoes
    as permissive for select
    to authenticated
    using (public.pode_ver_exportacao(id_obra));

-- familias_faturamento_padrao
alter table public.familias_faturamento_padrao enable row level security;
create policy familias_faturamento_padrao_select_authenticated on public.familias_faturamento_padrao
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- faturamentos
alter table public.faturamentos enable row level security;
create policy faturamentos_delete_admin_or_responsavel on public.faturamentos
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy faturamentos_insert_admin_or_responsavel on public.faturamentos
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy faturamentos_select_authenticated on public.faturamentos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy faturamentos_update_admin_or_responsavel on public.faturamentos
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- fila_email
alter table public.fila_email enable row level security;
create policy fila_email_select_proprios on public.fila_email
    as permissive for select
    to authenticated
    using ((criado_por = public.usuario_atual_id()));

-- fornecedores_erp
alter table public.fornecedores_erp enable row level security;
create policy fornecedores_erp_select on public.fornecedores_erp
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- fretes
alter table public.fretes enable row level security;
create policy fretes_select on public.fretes
    as permissive for select
    to authenticated
    using ((public.eh_logistica() OR public.pode_gerenciar_obra(id_obra) OR (id_solicitante = public.usuario_atual_id())));

-- fretes_ctes
alter table public.fretes_ctes enable row level security;
create policy fretes_ctes_select on public.fretes_ctes
    as permissive for select
    to authenticated
    using ((public.eh_logistica() OR public.pode_gerenciar_obra(id_obra)));

-- fretes_eventos
alter table public.fretes_eventos enable row level security;
create policy fretes_eventos_select on public.fretes_eventos
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.fretes f
  WHERE (f.id = fretes_eventos.id_frete))));

-- fretes_rotas
alter table public.fretes_rotas enable row level security;
create policy fretes_rotas_select on public.fretes_rotas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- fretes_transp_historico
alter table public.fretes_transp_historico enable row level security;
create policy fretes_transp_historico_select on public.fretes_transp_historico
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- fretes_transp_tarifas
alter table public.fretes_transp_tarifas enable row level security;
create policy fretes_transp_tarifas_delete on public.fretes_transp_tarifas
    as permissive for delete
    to authenticated
    using ((public.eh_logistica() OR public.eh_admin_ou_coordenador()));
create policy fretes_transp_tarifas_insert on public.fretes_transp_tarifas
    as permissive for insert
    to authenticated
    with check ((public.eh_logistica() OR public.eh_admin_ou_coordenador()));
create policy fretes_transp_tarifas_select on public.fretes_transp_tarifas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy fretes_transp_tarifas_update on public.fretes_transp_tarifas
    as permissive for update
    to authenticated
    using ((public.eh_logistica() OR public.eh_admin_ou_coordenador()));

-- fretes_transp_ufs
alter table public.fretes_transp_ufs enable row level security;
create policy fretes_transp_ufs_delete on public.fretes_transp_ufs
    as permissive for delete
    to authenticated
    using ((public.eh_logistica() OR public.eh_admin_ou_coordenador()));
create policy fretes_transp_ufs_insert on public.fretes_transp_ufs
    as permissive for insert
    to authenticated
    with check ((public.eh_logistica() OR public.eh_admin_ou_coordenador()));
create policy fretes_transp_ufs_select on public.fretes_transp_ufs
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- historico_tarefas
alter table public.historico_tarefas enable row level security;
create policy historico_tarefas_delete_admin_or_responsavel on public.historico_tarefas
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = historico_tarefas.id_tarefa))));
create policy historico_tarefas_insert_admin_or_responsavel on public.historico_tarefas
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = historico_tarefas.id_tarefa))));
create policy historico_tarefas_select_authenticated on public.historico_tarefas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy historico_tarefas_update_admin_or_responsavel on public.historico_tarefas
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = historico_tarefas.id_tarefa))))
    with check (public.pode_gerenciar_obra(( SELECT t.id_obra
   FROM public.tarefas t
  WHERE (t.id = historico_tarefas.id_tarefa))));

-- materiais_erp
alter table public.materiais_erp enable row level security;
create policy materiais_erp_select on public.materiais_erp
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- materiais_erp_classes
alter table public.materiais_erp_classes enable row level security;
create policy materiais_erp_classes_select on public.materiais_erp_classes
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- materiais_erp_ncm
alter table public.materiais_erp_ncm enable row level security;
create policy materiais_erp_ncm_select on public.materiais_erp_ncm
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- materiais_erp_unidades
alter table public.materiais_erp_unidades enable row level security;
create policy materiais_erp_unidades_select on public.materiais_erp_unidades
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- municipios
alter table public.municipios enable row level security;
create policy municipios_select on public.municipios
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- nfs_terceiros
alter table public.nfs_terceiros enable row level security;
create policy nft_select on public.nfs_terceiros
    as permissive for select
    to authenticated
    using (public.pode_ver_nf_terceiros(id_obra));

-- nfs_terceiros_eventos
alter table public.nfs_terceiros_eventos enable row level security;
create policy nfte_select on public.nfs_terceiros_eventos
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.nfs_terceiros n
  WHERE ((n.id = nfs_terceiros_eventos.id_nf) AND public.pode_ver_nf_terceiros(n.id_obra)))));

-- notificacoes
alter table public.notificacoes enable row level security;
create policy notificacoes_select_proprias on public.notificacoes
    as permissive for select
    to authenticated
    using ((id_usuario_destino = public.usuario_atual_id()));

-- obra_alertas
alter table public.obra_alertas enable row level security;
create policy obra_alertas_select on public.obra_alertas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- obra_anexos
alter table public.obra_anexos enable row level security;
create policy obra_anexos_delete_admin_or_responsavel on public.obra_anexos
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy obra_anexos_insert_admin_or_responsavel on public.obra_anexos
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy obra_anexos_select_authenticated on public.obra_anexos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obra_anexos_update_admin_or_responsavel on public.obra_anexos
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- obra_compras_abertas
alter table public.obra_compras_abertas enable row level security;
create policy obra_compras_abertas_select on public.obra_compras_abertas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- obra_familia_alerta
alter table public.obra_familia_alerta enable row level security;
create policy obra_familia_alerta_select on public.obra_familia_alerta
    as permissive for select
    to authenticated
    using ((public.eh_admin_ou_coordenador() OR ((public.perfil_atual() = 'engenheiro'::text) AND public.pode_gerenciar_obra(id_obra))));

-- obra_faturamento_familias
alter table public.obra_faturamento_familias enable row level security;
create policy obra_faturamento_familias_delete_admin_or_responsavel on public.obra_faturamento_familias
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_familias_insert_admin_or_responsavel on public.obra_faturamento_familias
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_familias_select_authenticated on public.obra_faturamento_familias
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obra_faturamento_familias_update_admin_or_responsavel on public.obra_faturamento_familias
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- obra_faturamento_grupos
alter table public.obra_faturamento_grupos enable row level security;
create policy obra_faturamento_grupos_delete_admin_or_responsavel on public.obra_faturamento_grupos
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_grupos_insert_admin_or_responsavel on public.obra_faturamento_grupos
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_grupos_select_authenticated on public.obra_faturamento_grupos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obra_faturamento_grupos_update_admin_or_responsavel on public.obra_faturamento_grupos
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- obra_faturamento_previsoes
alter table public.obra_faturamento_previsoes enable row level security;
create policy obra_faturamento_previsoes_delete_admin_or_responsavel on public.obra_faturamento_previsoes
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_previsoes_insert_admin_or_responsavel on public.obra_faturamento_previsoes
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_previsoes_select_authenticated on public.obra_faturamento_previsoes
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obra_faturamento_previsoes_update_admin_or_responsavel on public.obra_faturamento_previsoes
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- obra_faturamento_realizados
alter table public.obra_faturamento_realizados enable row level security;
create policy obra_faturamento_realizados_delete_admin_or_responsavel on public.obra_faturamento_realizados
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_realizados_insert_admin_or_responsavel on public.obra_faturamento_realizados
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy obra_faturamento_realizados_select_authenticated on public.obra_faturamento_realizados
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obra_faturamento_realizados_update_admin_or_responsavel on public.obra_faturamento_realizados
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- obra_pedido_itens
alter table public.obra_pedido_itens enable row level security;
create policy obra_pedido_itens_select on public.obra_pedido_itens
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- obra_rentabilidade_familias
alter table public.obra_rentabilidade_familias enable row level security;
create policy obra_rentabilidade_familias_select_authenticated on public.obra_rentabilidade_familias
    as permissive for select
    to authenticated
    using ((public.eh_admin_ou_coordenador() OR ((public.perfil_atual() = 'engenheiro'::text) AND public.pode_gerenciar_obra(id_obra))));

-- obra_rentabilidade_historico
alter table public.obra_rentabilidade_historico enable row level security;
create policy obra_rentabilidade_historico_select on public.obra_rentabilidade_historico
    as permissive for select
    to authenticated
    using ((public.eh_admin_ou_coordenador() OR ((public.perfil_atual() = 'engenheiro'::text) AND public.pode_gerenciar_obra(id_obra))));

-- obra_servicos_parcelas
alter table public.obra_servicos_parcelas enable row level security;
create policy osp_select on public.obra_servicos_parcelas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- obra_sma_materiais
alter table public.obra_sma_materiais enable row level security;
create policy obra_sma_materiais_select_authenticated on public.obra_sma_materiais
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- obra_sma_projecao
alter table public.obra_sma_projecao enable row level security;
create policy obra_sma_projecao_select on public.obra_sma_projecao
    as permissive for select
    to authenticated
    using ((public.eh_admin_ou_coordenador() OR ((public.perfil_atual() = 'engenheiro'::text) AND public.pode_gerenciar_obra(id_obra))));

-- obras
alter table public.obras enable row level security;
create policy obras_delete_admin on public.obras
    as permissive for delete
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.usuarios u
  WHERE ((lower((u.email)::text) = lower(auth.email())) AND ((u.perfil)::text = 'admin'::text)))));
create policy obras_insert_admin_or_responsavel on public.obras
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_responsavel(id_responsavel));
create policy obras_select_authenticated on public.obras
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy obras_update_admin_or_responsavel on public.obras
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_responsavel(id_responsavel))
    with check (public.pode_gerenciar_responsavel(id_responsavel));

-- obras_valores_erp
alter table public.obras_valores_erp enable row level security;
create policy obras_valores_erp_admin_le on public.obras_valores_erp
    as permissive for select
    to authenticated
    using (public.eh_admin());

-- ocorrencias
alter table public.ocorrencias enable row level security;
create policy ocorrencias_delete_admin_or_responsavel on public.ocorrencias
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy ocorrencias_insert_admin_or_responsavel on public.ocorrencias
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy ocorrencias_select_authenticated on public.ocorrencias
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy ocorrencias_update_admin_or_responsavel on public.ocorrencias
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- parcelas_cliente
alter table public.parcelas_cliente enable row level security;
create policy parcelas_cliente_delete_admin_or_responsavel on public.parcelas_cliente
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy parcelas_cliente_insert_admin_or_responsavel on public.parcelas_cliente
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy parcelas_cliente_select_authenticated on public.parcelas_cliente
    as permissive for select
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy parcelas_cliente_update_admin_or_responsavel on public.parcelas_cliente
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- push_inscricoes
alter table public.push_inscricoes enable row level security;
create policy push_inscricoes_select_propria on public.push_inscricoes
    as permissive for select
    to authenticated
    using ((id_usuario = public.usuario_atual_id()));

-- reunioes
alter table public.reunioes enable row level security;
create policy reunioes_delete_admin_or_responsavel on public.reunioes
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy reunioes_insert_admin_or_responsavel on public.reunioes
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy reunioes_select_authenticated on public.reunioes
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy reunioes_update_admin_or_responsavel on public.reunioes
    as permissive for update
    to authenticated
    using (public.pode_gerenciar_obra(id_obra))
    with check (public.pode_gerenciar_obra(id_obra));

-- reunioes_sessoes
alter table public.reunioes_sessoes enable row level security;
create policy reunioes_sessoes_delete_criador_or_admin on public.reunioes_sessoes
    as permissive for delete
    to authenticated
    using (((id_criador = public.usuario_atual_id()) OR public.eh_admin_ou_coordenador()));
create policy reunioes_sessoes_insert_authenticated on public.reunioes_sessoes
    as permissive for insert
    to authenticated
    with check ((id_criador = public.usuario_atual_id()));
create policy reunioes_sessoes_select_authenticated on public.reunioes_sessoes
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy reunioes_sessoes_update_criador_or_admin on public.reunioes_sessoes
    as permissive for update
    to authenticated
    using (((id_criador = public.usuario_atual_id()) OR public.eh_admin_ou_coordenador()))
    with check (((id_criador = public.usuario_atual_id()) OR public.eh_admin_ou_coordenador()));

-- sistema_alertas
alter table public.sistema_alertas enable row level security;
create policy sistema_alertas_select on public.sistema_alertas
    as permissive for select
    to authenticated
    using (public.eh_admin_ou_coordenador());

-- solicitacoes_faturamento
alter table public.solicitacoes_faturamento enable row level security;
create policy sf_select on public.solicitacoes_faturamento
    as permissive for select
    to authenticated
    using (public.pode_ver_solicitacao_faturamento(id_obra, id_solicitante));

-- solicitacoes_faturamento_eventos
alter table public.solicitacoes_faturamento_eventos enable row level security;
create policy sfe_select on public.solicitacoes_faturamento_eventos
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.solicitacoes_faturamento s
  WHERE ((s.id = solicitacoes_faturamento_eventos.id_solicitacao) AND public.pode_ver_solicitacao_faturamento(s.id_obra, s.id_solicitante)))));

-- solicitacoes_faturamento_itens
alter table public.solicitacoes_faturamento_itens enable row level security;
create policy sfi_select on public.solicitacoes_faturamento_itens
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.solicitacoes_faturamento s
  WHERE ((s.id = solicitacoes_faturamento_itens.id_solicitacao) AND public.pode_ver_solicitacao_faturamento(s.id_obra, s.id_solicitante)))));

-- solicitacoes_faturamento_nfs
alter table public.solicitacoes_faturamento_nfs enable row level security;
create policy sfn_select on public.solicitacoes_faturamento_nfs
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.solicitacoes_faturamento s
  WHERE ((s.id = solicitacoes_faturamento_nfs.id_solicitacao) AND public.pode_ver_solicitacao_faturamento(s.id_obra, s.id_solicitante)))));

-- solicitacoes_faturamento_romaneios
alter table public.solicitacoes_faturamento_romaneios enable row level security;
create policy sfr_select on public.solicitacoes_faturamento_romaneios
    as permissive for select
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.solicitacoes_faturamento s
  WHERE ((s.id = solicitacoes_faturamento_romaneios.id_solicitacao) AND public.pode_ver_solicitacao_faturamento(s.id_obra, s.id_solicitante)))));

-- solicitacoes_material
alter table public.solicitacoes_material enable row level security;
create policy solicitacoes_material_select on public.solicitacoes_material
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- solicitacoes_material_eventos
alter table public.solicitacoes_material_eventos enable row level security;
create policy solicitacoes_material_eventos_select on public.solicitacoes_material_eventos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- solicitacoes_previsao
alter table public.solicitacoes_previsao enable row level security;
create policy solicitacoes_previsao_insert on public.solicitacoes_previsao
    as permissive for insert
    to authenticated
    with check ((public.pode_gerenciar_obra(id_obra) OR public.eh_logistica()));
create policy solicitacoes_previsao_select on public.solicitacoes_previsao
    as permissive for select
    to authenticated
    using (((id_solicitante = public.usuario_atual_id()) OR public.pode_gerenciar_obra(id_obra) OR public.eh_aprovador_previsao() OR public.eh_logistica()));

-- sync_impressoes
alter table public.sync_impressoes enable row level security;

-- sync_status
alter table public.sync_status enable row level security;
create policy sync_status_select_authenticated on public.sync_status
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- tarefas
alter table public.tarefas enable row level security;
create policy tarefas_delete_admin_or_responsavel on public.tarefas
    as permissive for delete
    to authenticated
    using (public.pode_gerenciar_obra(id_obra));
create policy tarefas_insert_admin_or_responsavel on public.tarefas
    as permissive for insert
    to authenticated
    with check (public.pode_gerenciar_obra(id_obra));
create policy tarefas_select_authenticated on public.tarefas
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
create policy tarefas_update_admin_ou_atribuido on public.tarefas
    as permissive for update
    to authenticated
    using ((public.pode_gerenciar_obra(id_obra) OR (id_responsavel = public.usuario_atual_id())))
    with check ((public.pode_gerenciar_obra(id_obra) OR (id_responsavel = public.usuario_atual_id())));

-- transportadoras
alter table public.transportadoras enable row level security;
create policy transportadoras_select on public.transportadoras
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

-- usuarios
alter table public.usuarios enable row level security;
create policy usuarios_delete_admin on public.usuarios
    as permissive for delete
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.usuarios u
  WHERE ((lower((u.email)::text) = lower(auth.email())) AND (u.perfil = 'admin'::public.perfil_usuario)))));
create policy usuarios_insert_admin_or_self on public.usuarios
    as permissive for insert
    to authenticated
    with check (((lower((email)::text) = lower(auth.email())) OR (EXISTS ( SELECT 1
   FROM public.usuarios u
  WHERE ((lower((u.email)::text) = lower(auth.email())) AND (u.perfil = 'admin'::public.perfil_usuario))))));
create policy usuarios_select_authenticated on public.usuarios
    as permissive for select
    to authenticated
    using ((public.eh_usuario_ativo() OR (lower((email)::text) = lower(auth.email()))));
create policy usuarios_update_admin on public.usuarios
    as permissive for update
    to authenticated
    using ((EXISTS ( SELECT 1
   FROM public.usuarios u
  WHERE ((lower((u.email)::text) = lower(auth.email())) AND (u.perfil = 'admin'::public.perfil_usuario)))))
    with check ((EXISTS ( SELECT 1
   FROM public.usuarios u
  WHERE ((lower((u.email)::text) = lower(auth.email())) AND (u.perfil = 'admin'::public.perfil_usuario)))));

-- usuarios_erp
alter table public.usuarios_erp enable row level security;
create policy usuarios_erp_select on public.usuarios_erp
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());
