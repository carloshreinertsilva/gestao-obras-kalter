-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- Privilegios para anon, authenticated, PUBLIC (outros papeis, como service_role e postgres,
-- ficam de fora). 'revoke all' antes de cada objeto deixa claro o que NAO foi concedido.

-- Tabelas, views e sequencias
grant delete, insert, maintain, references, select, trigger, truncate, update on public.auditoria to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.auditoria to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.comentarios_tarefa to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.comentarios_tarefa to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.cronograma_obra to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.cronograma_obra to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.diario_obra to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.diario_obra to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.documentos_projeto to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.documentos_projeto to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.documentos_projeto_arquivos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.documentos_projeto_arquivos to authenticated;
grant select on public.exportacao_config to authenticated;
-- public.exportacao_documentos: nada para anon, authenticated, PUBLIC
grant select on public.exportacao_erp to authenticated;
grant select on public.exportacao_estimativas to authenticated;
grant select on public.exportacao_ncm to authenticated;
grant select on public.exportacao_processos to authenticated;
grant select on public.exportacao_processos_versoes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.familias_faturamento_padrao to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.familias_faturamento_padrao to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.faturamentos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.faturamentos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fila_email to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fila_email to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fornecedores_erp to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fornecedores_erp to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_ctes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_ctes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_eventos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_eventos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_rotas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_rotas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_historico to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_historico to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_tarifas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_tarifas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_ufs to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.fretes_transp_ufs to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.historico_tarefas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.historico_tarefas to authenticated;
grant maintain, references, select, trigger on public.materiais_erp to authenticated;
grant maintain, references, select, trigger on public.materiais_erp_classes to authenticated;
grant maintain, references, select, trigger on public.materiais_erp_ncm to authenticated;
grant maintain, references, select, trigger on public.materiais_erp_unidades to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.municipios to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.municipios to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.nfs_terceiros to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.nfs_terceiros to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.nfs_terceiros_eventos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.nfs_terceiros_eventos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.notificacoes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.notificacoes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_alertas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_alertas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_anexos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_anexos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_compras_abertas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_compras_abertas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_familia_alerta to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_familia_alerta to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_familias to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_familias to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_grupos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_grupos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_previsoes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_previsoes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_realizados to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_faturamento_realizados to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_pedido_itens to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_pedido_itens to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_rentabilidade_familias to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_rentabilidade_familias to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_rentabilidade_historico to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_rentabilidade_historico to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_servicos_parcelas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_servicos_parcelas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_sma_materiais to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_sma_materiais to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_sma_projecao to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obra_sma_projecao to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obras to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.obras to authenticated;
grant select on public.obras_valores_erp to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.ocorrencias to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.ocorrencias to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.parcelas_cliente to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.parcelas_cliente to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.push_inscricoes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.push_inscricoes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.reunioes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.reunioes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.reunioes_sessoes to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.reunioes_sessoes to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.sistema_alertas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.sistema_alertas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_eventos to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_eventos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_itens to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_itens to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_nfs to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_nfs to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_romaneios to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_faturamento_romaneios to authenticated;
grant maintain, references, select, trigger on public.solicitacoes_material to authenticated;
grant maintain, references, select, trigger on public.solicitacoes_material_eventos to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_previsao to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.solicitacoes_previsao to authenticated;
-- public.sync_impressoes: nada para anon, authenticated, PUBLIC
grant delete, insert, maintain, references, select, trigger, truncate, update on public.sync_status to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.sync_status to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.tarefas to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.tarefas to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.transportadoras to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.transportadoras to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.usuarios to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.usuarios to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.usuarios_erp to anon;
grant delete, insert, maintain, references, select, trigger, truncate, update on public.usuarios_erp to authenticated;
grant select, update, usage on sequence public.auditoria_id_seq to anon;
grant select, update, usage on sequence public.auditoria_id_seq to authenticated;
grant select, update, usage on sequence public.comentarios_tarefa_id_seq to anon;
grant select, update, usage on sequence public.comentarios_tarefa_id_seq to authenticated;
grant select, update, usage on sequence public.diario_obra_id_seq to anon;
grant select, update, usage on sequence public.diario_obra_id_seq to authenticated;
grant select, update, usage on sequence public.exportacao_processos_versoes_id_seq to anon;
grant select, update, usage on sequence public.exportacao_processos_versoes_id_seq to authenticated;
grant select, update, usage on sequence public.faturamentos_id_seq to anon;
grant select, update, usage on sequence public.faturamentos_id_seq to authenticated;
grant select, update, usage on sequence public.fretes_eventos_id_seq to anon;
grant select, update, usage on sequence public.fretes_eventos_id_seq to authenticated;
grant select, update, usage on sequence public.fretes_numero_seq to anon;
grant select, update, usage on sequence public.fretes_numero_seq to authenticated;
grant select, update, usage on sequence public.nfs_terceiros_eventos_id_seq to anon;
grant select, update, usage on sequence public.nfs_terceiros_eventos_id_seq to authenticated;
grant select, update, usage on sequence public.nfs_terceiros_numero_seq to anon;
grant select, update, usage on sequence public.nfs_terceiros_numero_seq to authenticated;
grant select, update, usage on sequence public.obra_servicos_parcelas_id_seq to anon;
grant select, update, usage on sequence public.obra_servicos_parcelas_id_seq to authenticated;
grant select, update, usage on sequence public.solicitacoes_faturamento_eventos_id_seq to anon;
grant select, update, usage on sequence public.solicitacoes_faturamento_eventos_id_seq to authenticated;
grant select, update, usage on sequence public.solicitacoes_faturamento_numero_seq to anon;
grant select, update, usage on sequence public.solicitacoes_faturamento_numero_seq to authenticated;
grant select, update, usage on sequence public.solicitacoes_material_eventos_id_seq to anon;
grant select, update, usage on sequence public.solicitacoes_material_eventos_id_seq to authenticated;
grant select, update, usage on sequence public.solicitacoes_material_numero_seq to anon;
grant select, update, usage on sequence public.solicitacoes_material_numero_seq to authenticated;

-- Grants por coluna
grant select (created_at) on public.exportacao_documentos to authenticated;
grant select (erro) on public.exportacao_documentos to authenticated;
grant select (gerado_em) on public.exportacao_documentos to authenticated;
grant select (hash_dados) on public.exportacao_documentos to authenticated;
grant select (id) on public.exportacao_documentos to authenticated;
grant select (id_obra) on public.exportacao_documentos to authenticated;
grant select (id_processo) on public.exportacao_documentos to authenticated;
grant select (nome_arquivo) on public.exportacao_documentos to authenticated;
grant select (nome_pedido_por) on public.exportacao_documentos to authenticated;
grant select (pedido_por) on public.exportacao_documentos to authenticated;
grant select (situacao) on public.exportacao_documentos to authenticated;
grant select (tamanho) on public.exportacao_documentos to authenticated;
grant select (tipo) on public.exportacao_documentos to authenticated;

-- Execucao de funcoes (acl nula = padrao do Postgres: PUBLIC pode executar)
grant execute on function public.after_insert_obras_criar_pmis_padrao() to anon, authenticated, public;
-- function public.alerta_sistema_avisar(p_titulo text, p_detalhe text, p_problema boolean): sem execute para anon, authenticated, PUBLIC
grant execute on function public.aprovar_solicitacao_previsao(p_id uuid, p_codigo text) to authenticated;
-- function public.auditar(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.cancelar_desfazer_previsao(p_id uuid) to authenticated;
grant execute on function public.cancelar_obra_pmis(p_id_obra uuid, p_data_cancelamento date, p_motivo_cancelamento text, p_observacao_cancelamento text, p_cancelar_tarefas boolean, p_cancelar_cronograma boolean) to authenticated;
grant execute on function public.cancelar_solicitacao_previsao(p_id uuid) to authenticated;
grant execute on function public.compras_previsoes_abertas() to authenticated;
grant execute on function public.compras_sma_pendentes() to authenticated;
grant execute on function public.confirmar_desfazer_previsao(p_id uuid, p_codigo text) to authenticated;
grant execute on function public.criar_cronograma_padrao_obra(p_id_obra uuid) to anon, authenticated, public;
grant execute on function public.criar_documentos_padrao_obra(p_id_obra uuid) to anon, authenticated, public;
grant execute on function public.criar_familias_faturamento_obra(p_id_obra uuid) to anon, authenticated, public;
-- function public.despertar_app(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_admin_ou_coordenador() to authenticated;
grant execute on function public.eh_aprovador_faturamento() to authenticated;
grant execute on function public.eh_aprovador_previsao() to authenticated;
grant execute on function public.eh_financeiro() to authenticated;
grant execute on function public.eh_fiscal() to authenticated;
grant execute on function public.eh_logistica() to authenticated;
grant execute on function public.eh_usuario_ativo() to authenticated;
-- function public.email_frete(f public.fretes, p_titulo text, p_aviso text, p_cor text, p_url text, p_saldo numeric): sem execute para anon, authenticated, PUBLIC
-- function public.email_frete_sem_verba(p_obra public.obras, p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb): sem execute para anon, authenticated, PUBLIC
grant execute on function public.email_nf_terceiros(n public.nfs_terceiros, p_titulo text, p_aviso text, p_cor text, p_url text) to anon, authenticated, public;
grant execute on function public.email_solicitacao_faturamento(s public.solicitacoes_faturamento, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text) to anon, authenticated, public;
-- function public.email_solicitacao_material(s public.solicitacoes_material, p_titulo text, p_aviso text, p_cor text, p_url text): sem execute para anon, authenticated, PUBLIC
-- function public.email_solicitacao_previsao(s public.solicitacoes_previsao, p_titulo text, p_aviso text, p_cor text, p_botao text, p_url text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.enfileirar_email(p_para text[], p_assunto text, p_html text, p_origem text, p_id_tarefa uuid) to authenticated;
grant execute on function public.exportacao_aprovar(p_id_obra uuid, p_hash text) to authenticated;
grant execute on function public.exportacao_baixar(p_id uuid) to authenticated;
grant execute on function public.exportacao_config_salvar(p_exportador jsonb, p_banco text, p_local text) to authenticated;
grant execute on function public.exportacao_estimativa_salvar(p_codigo text, p_peso numeric, p_bruto numeric, p_comp numeric, p_larg numeric, p_alt numeric, p_fonte text) to authenticated;
grant execute on function public.exportacao_marcar_obra(p_id_obra uuid, p_exportacao boolean) to authenticated;
grant execute on function public.exportacao_pedir_documento(p_id_obra uuid, p_tipo text) to authenticated;
grant execute on function public.exportacao_salvar(p_id_obra uuid, p_dados jsonb) to authenticated;
-- function public.familia_com_nome(p_id_obra uuid, p_familia text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.faturamento_cancelar(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.faturamento_devolver(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.faturamento_logistica_aprovar(p_id uuid, p_itens jsonb, p_peso_bruto numeric, p_peso_liquido numeric, p_volumes integer, p_especie text, p_codigo_transportadora integer, p_transportadora text, p_observacao text) to authenticated;
grant execute on function public.faturamento_salvar(p_id uuid, p_id_obra uuid, p_tipo text, p_data_desejada date, p_observacao text, p_itens jsonb, p_enviar boolean, p_anexos jsonb) to authenticated;
grant execute on function public.finalizar_obra_pmis(p_id_obra uuid, p_data_finalizacao date, p_observacao text) to anon, authenticated, public;
-- function public.formatar_brl(p_valor numeric): sem execute para anon, authenticated, PUBLIC
-- function public.frete_avaliar(p_id uuid): sem execute para anon, authenticated, PUBLIC
-- function public.frete_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text): sem execute para anon, authenticated, PUBLIC
-- function public.frete_avisar_sem_verba(p_familia text, p_disponivel numeric, p_faltante numeric, p_ctes jsonb): sem execute para anon, authenticated, PUBLIC
grant execute on function public.frete_cancelar(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.frete_carga_normalizar(p_carga jsonb, OUT itens jsonb, OUT peso numeric, OUT volumes integer, OUT cubagem numeric) to authenticated;
grant execute on function public.frete_distancia(p_origem integer, p_destino integer) to authenticated;
-- function public.frete_email_ligado(): sem execute para anon, authenticated, PUBLIC
-- function public.frete_evento(p_id uuid, p_evento text, p_detalhe text): sem execute para anon, authenticated, PUBLIC
-- function public.frete_gestores(p_id_obra uuid): sem execute para anon, authenticated, PUBLIC
-- function public.frete_logistica(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.frete_marcar_transportadora(p_codigo integer, p_sim boolean) to authenticated;
-- function public.frete_reavaliar_obra(p_id_obra uuid): sem execute para anon, authenticated, PUBLIC
-- function public.frete_registrar_cte(p_nr_ad bigint, p_projeto text, p_codigo_obra text, p_numero_cte text, p_data_entrada date, p_cod_fornecedor integer, p_valor numeric, p_status text, p_baixas jsonb, p_mensagem text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.frete_saldo(p_id_obra uuid, p_excluir uuid) to authenticated;
grant execute on function public.frete_salvar(p_id uuid, p_id_obra uuid, p_data date, p_operacao text, p_tipo_documento text, p_numero_documento text, p_origem_tipo text, p_origem_ibge integer, p_origem_nome text, p_destino_tipo text, p_destino_ibge integer, p_destino_nome text, p_cod_fornecedor integer, p_tipo_veiculo text, p_km numeric, p_valor_km numeric, p_valor_cotado numeric, p_transportadora_codigo integer, p_observacao text, p_carga jsonb, p_peso_kg numeric, p_volumes integer, p_altura_m numeric, p_largura_m numeric, p_comprimento_m numeric, p_cubagem_m3 numeric) to authenticated;
grant execute on function public.frete_sem_verba_email_ligado() to authenticated, public;
grant execute on function public.frete_sugestoes(p_origem integer, p_destino integer, p_tipo_veiculo text) to authenticated;
grant execute on function public.html_esc(p text) to anon, authenticated, public;
-- function public.limpeza_diaria(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.marcar_notificacoes_lidas(p_ids uuid[]) to authenticated;
grant execute on function public.mat_alterar_codigo_proposto(p_id uuid, p_codigo_edit text) to authenticated, public;
grant execute on function public.mat_aprovar_cadastro(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_obs text, p_origem text) to authenticated;
grant execute on function public.mat_aprovar_fiscal(p_id uuid, p_ncm text, p_tipo_item integer, p_pct_ipi numeric, p_obs text, p_codigo_edit text) to authenticated, public;
-- function public.mat_avisar(p_id uuid, p_para uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.mat_cancelar(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.mat_classe_rotulo(p integer) to authenticated, public;
grant execute on function public.mat_criacao_erp_ligada() to authenticated, public;
grant execute on function public.mat_devolver(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.mat_eh_cadastro() to authenticated;
grant execute on function public.mat_eh_fiscal() to authenticated;
grant execute on function public.mat_email_ligado() to authenticated, public;
-- function public.mat_evento(p_id uuid, p_evento text, p_detalhe text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.mat_informar_codigo(p_id uuid, p_codigo text) to authenticated;
-- function public.mat_lembretes(): sem execute para anon, authenticated, PUBLIC
-- function public.mat_ligar_criados(): sem execute para anon, authenticated, PUBLIC
-- function public.mat_nome_atual(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.mat_normalizar(p text) to authenticated, public;
grant execute on function public.mat_origem_pcp(p_origem text) to authenticated, public;
grant execute on function public.mat_prefixo_codigo(p_classe_tipo integer) to authenticated, public;
grant execute on function public.mat_proximo_codigo_edit(p_classe_tipo integer, p_excluir uuid) to authenticated, public;
grant execute on function public.mat_recusar(p_id uuid, p_motivo text, p_codigo_existente text) to authenticated;
-- function public.mat_registrar_criado_erp(p_id uuid, p_codigo integer, p_codigo_edit text): sem execute para anon, authenticated, PUBLIC
-- function public.mat_registrar_erro_erp(p_id uuid, p_erro text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.mat_similares(p_texto text, p_limite integer, p_excluir uuid) to authenticated;
grant execute on function public.mat_solicitar(p_id uuid, p_descricao text, p_classe_tipo integer, p_unidade text, p_aplicacao text, p_ncm text, p_urgente boolean, p_origem text) to authenticated;
-- function public.mat_validar_basico(p_descricao text, p_classe_tipo integer, p_unidade text): sem execute para anon, authenticated, PUBLIC
-- function public.mat_validar_codigo_edit(p_s public.solicitacoes_material, p_codigo text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.minhas_pendencias() to authenticated;
-- function public.nft_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text, p_anexar boolean): sem execute para anon, authenticated, PUBLIC
grant execute on function public.nft_cancelar(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.nft_devolver(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.nft_email_ligado() to anon, authenticated, public;
grant execute on function public.nft_encaminhar(p_id uuid, p_id_obra uuid, p_nr_pedido bigint, p_numero_nf text, p_data_emissao date, p_valor numeric, p_vencimento date, p_observacao text, p_arquivo_caminho text, p_arquivo_nome text, p_arquivo_url text, p_anexos jsonb, p_forma_pagamento text, p_dados_pagamento jsonb) to authenticated;
-- function public.nft_evento(p_id uuid, p_evento text, p_detalhe text): sem execute para anon, authenticated, PUBLIC
-- function public.nft_lembretes(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.nft_pagamento_html(p_forma text, p_dados jsonb) to authenticated;
grant execute on function public.nft_validar_pagamento(p_forma text, p_dados jsonb) to authenticated;
-- function public.notificar_equipe_obra(p_id_obra uuid, p_tipo text, p_titulo text, p_detalhe text, p_financeira boolean, p_chave text): sem execute para anon, authenticated, PUBLIC
-- function public.notificar_recebimento_obra(p_id_obra uuid, p_valor numeric): sem execute para anon, authenticated, PUBLIC
-- function public.notificar_usuario(p_destino uuid, p_tipo text, p_titulo text, p_detalhe text, p_id_obra uuid, p_id_tarefa uuid, p_financeira boolean, p_chave text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.obra_valores_erp_solicitar(p_id_obra uuid, p_margem_contribuicao numeric, p_rentabilidade numeric, p_venda_sem_impostos numeric) to authenticated;
grant execute on function public.obras_resumo_cartao(p_ids uuid[]) to authenticated;
grant execute on function public.pedir_desfazer_previsao(p_id uuid) to authenticated;
grant execute on function public.perfil_atual() to authenticated;
grant execute on function public.pode_aprovar_exportacao(p_id_obra uuid) to authenticated;
grant execute on function public.pode_editar_exportacao(p_id_obra uuid) to authenticated;
grant execute on function public.pode_gerenciar_arquivo(p_nome text) to authenticated;
grant execute on function public.pode_gerenciar_obra(p_id_obra uuid) to authenticated;
grant execute on function public.pode_gerenciar_responsavel(p_id_responsavel uuid) to authenticated;
grant execute on function public.pode_ver_exportacao(p_id_obra uuid) to authenticated;
grant execute on function public.pode_ver_nf_terceiros(p_id_obra uuid) to authenticated;
grant execute on function public.pode_ver_solicitacao_faturamento(p_id_obra uuid, p_id_solicitante uuid) to authenticated;
grant execute on function public.previsoes_familias_obra(p_id_obra uuid) to authenticated;
grant execute on function public.push_lote(p_segredo text, p_id uuid) to anon;
grant execute on function public.push_resultado(p_segredo text, p_enviadas uuid[], p_expiradas uuid[]) to anon;
-- function public.push_segredo_ok(p_segredo text): sem execute para anon, authenticated, PUBLIC
grant execute on function public.reabrir_ata(p_id_reuniao uuid) to authenticated;
grant execute on function public.recusar_solicitacao_previsao(p_id uuid, p_motivo text) to authenticated;
grant execute on function public.reenviar_solicitacao_previsao(p_id uuid) to authenticated;
grant execute on function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text) to authenticated;
grant execute on function public.regularizar_familias_faturamento_obras_existentes() to anon, authenticated, public;
grant execute on function public.regularizar_grupos_faturamento_obra(p_id_obra uuid) to authenticated;
grant execute on function public.regularizar_pmis_obras_existentes() to anon, authenticated, public;
grant execute on function public.religar_tarefas_ata(p_id_reuniao uuid, p_ids_tarefas uuid[]) to authenticated;
grant execute on function public.remover_push(p_endpoint text) to authenticated;
-- function public.rls_auto_enable(): sem execute para anon, authenticated, PUBLIC
-- function public.sf_avisar(p_id uuid, p_para uuid[], p_cc uuid[], p_assunto text, p_titulo text, p_aviso text, p_cor text, p_titulo_push text): sem execute para anon, authenticated, PUBLIC
-- function public.sf_descartar_romaneios(p_id uuid): sem execute para anon, authenticated, PUBLIC
grant execute on function public.sf_email_ligado() to anon, authenticated, public;
-- function public.sf_emails(p_ids uuid[], p_excluir text[]): sem execute para anon, authenticated, PUBLIC
-- function public.sf_evento(p_id uuid, p_evento text, p_detalhe text): sem execute para anon, authenticated, PUBLIC
-- function public.sf_gravar_itens(p_id uuid, p_id_obra uuid, p_tipo text, p_itens jsonb, p_logistica boolean): sem execute para anon, authenticated, PUBLIC
grant execute on function public.sf_itens_disponiveis(p_id_obra uuid, p_tipo text, p_ignorar uuid) to authenticated;
-- function public.sf_lembretes(): sem execute para anon, authenticated, PUBLIC
-- function public.sf_saldo_item(p_id_obra uuid, p_sequencia integer, p_ignorar uuid): sem execute para anon, authenticated, PUBLIC
grant execute on function public.sincronizar_grupo_faturamento_familia() to anon, authenticated, public;
-- function public.trg_auth_dominio_kalter(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.trg_exportacao_processo_hash() to authenticated, public;
-- function public.trg_exportacao_processo_versao(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_frete_verba_mudou(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.trg_invalida_impressao_obra() to authenticated, public;
-- function public.trg_nfs_terceiros_avisos(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_comentario_tarefa(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_fase_obra(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_nf_nova(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_obra_nova(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_ocorrencia_nova(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notif_tarefa_atribuida(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_notificacao_push(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.trg_obra_alertas_avisar() to authenticated, public;
-- function public.trg_sf_romaneio_avisos(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_solicitacao_faturamento_avisos(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_solicitacao_previsao_email(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_solicitacao_previsao_ins(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_solicitacao_previsao_logistica(): sem execute para anon, authenticated, PUBLIC
-- function public.trg_solicitacao_previsao_notif(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.trg_solicitacao_previsao_upd() to anon, authenticated, public;
grant execute on function public.trg_solicitacoes_material_avisos() to authenticated, public;
grant execute on function public.trg_usuarios_avisa_cadastro_novo() to authenticated, public;
-- function public.trg_usuarios_indicadores_previsao(): sem execute para anon, authenticated, PUBLIC
grant execute on function public.update_updated_at_column() to anon, authenticated, public;
-- function public.url_da_notificacao(n public.notificacoes): sem execute para anon, authenticated, PUBLIC
grant execute on function public.usuario_atual_id() to authenticated;
grant execute on function public.validar_escopo_grupos_faturamento(p_id_obra uuid) to anon, authenticated, public;
grant execute on function public.validar_faturamento_obra_para_finalizar(p_id_obra uuid) to anon, authenticated, public;
-- function public.validar_responsavel_obra_e_engenheiro(): sem execute para anon, authenticated, PUBLIC
-- function public.verificar_saude_robo(): sem execute para anon, authenticated, PUBLIC
