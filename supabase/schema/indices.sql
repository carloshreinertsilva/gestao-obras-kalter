-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- Indices que nao sao de PK/unique/exclusion (esses estao em tabelas.sql)

-- auditoria
CREATE INDEX auditoria_em_idx ON public.auditoria USING btree (em DESC);
CREATE INDEX auditoria_obra_idx ON public.auditoria USING btree (id_obra, em DESC);
CREATE INDEX auditoria_usuario_idx ON public.auditoria USING btree (id_usuario, em DESC);

-- comentarios_tarefa
CREATE INDEX idx_comentarios_tarefa_id_tarefa ON public.comentarios_tarefa USING btree (id_tarefa);
CREATE INDEX idx_comentarios_tarefa_id_usuario ON public.comentarios_tarefa USING btree (id_usuario);

-- cronograma_obra
CREATE INDEX idx_cronograma_obra_fase ON public.cronograma_obra USING btree (fase);
CREATE INDEX idx_cronograma_obra_id_obra ON public.cronograma_obra USING btree (id_obra);

-- diario_obra
CREATE INDEX idx_diario_obra_id_obra ON public.diario_obra USING btree (id_obra);
CREATE INDEX idx_diario_obra_id_usuario ON public.diario_obra USING btree (id_usuario);

-- documentos_projeto
CREATE INDEX idx_documentos_projeto_id_obra ON public.documentos_projeto USING btree (id_obra);

-- documentos_projeto_arquivos
CREATE INDEX idx_documentos_projeto_arquivos_id_documento ON public.documentos_projeto_arquivos USING btree (id_documento);
CREATE INDEX idx_documentos_projeto_arquivos_id_obra ON public.documentos_projeto_arquivos USING btree (id_obra);
CREATE INDEX idx_documentos_projeto_arquivos_id_usuario ON public.documentos_projeto_arquivos USING btree (id_usuario);

-- exportacao_documentos
CREATE INDEX exportacao_documentos_pendentes ON public.exportacao_documentos USING btree (created_at) WHERE (situacao = 'pendente'::text);
CREATE INDEX exportacao_documentos_processo ON public.exportacao_documentos USING btree (id_processo, created_at DESC);

-- exportacao_processos_versoes
CREATE INDEX exportacao_processos_versoes_obra ON public.exportacao_processos_versoes USING btree (id_obra, em DESC);

-- faturamentos
CREATE INDEX idx_faturamentos_id_parcela_cliente ON public.faturamentos USING btree (id_parcela_cliente);
CREATE INDEX idx_faturamentos_id_usuario ON public.faturamentos USING btree (id_usuario);

-- fila_email
CREATE INDEX fila_email_pendentes_idx ON public.fila_email USING btree (created_at) WHERE (status = 'pendente'::text);

-- fornecedores_erp
CREATE INDEX fornecedores_erp_transp_idx ON public.fornecedores_erp USING btree (transportadora) WHERE transportadora;

-- fretes
CREATE INDEX fretes_obra_idx ON public.fretes USING btree (id_obra, status);

-- fretes_ctes
CREATE INDEX fretes_ctes_frete_idx ON public.fretes_ctes USING btree (id_frete);

-- fretes_eventos
CREATE INDEX fretes_eventos_idx ON public.fretes_eventos USING btree (id_frete, id);

-- historico_tarefas
CREATE INDEX idx_historico_tarefas_id_tarefa ON public.historico_tarefas USING btree (id_tarefa);
CREATE INDEX idx_historico_tarefas_id_usuario ON public.historico_tarefas USING btree (id_usuario);

-- materiais_erp
CREATE INDEX materiais_erp_busca_trgm ON public.materiais_erp USING gin (busca extensions.gin_trgm_ops);

-- municipios
CREATE INDEX municipios_busca_idx ON public.municipios USING btree (uf, nome_busca);

-- nfs_terceiros
CREATE UNIQUE INDEX nft_nf_unica ON public.nfs_terceiros USING btree (cod_fornecedor, upper(TRIM(BOTH FROM numero_nf))) WHERE (status <> 'cancelada'::text);
CREATE INDEX nft_obra_idx ON public.nfs_terceiros USING btree (id_obra);
CREATE INDEX nft_status_idx ON public.nfs_terceiros USING btree (status) WHERE (status = ANY (ARRAY['encaminhada'::text, 'devolvida'::text, 'lancada'::text]));

-- nfs_terceiros_eventos
CREATE INDEX nfte_nf_idx ON public.nfs_terceiros_eventos USING btree (id_nf);

-- notificacoes
CREATE INDEX notificacoes_chave_idx ON public.notificacoes USING btree (id_usuario_destino, chave) WHERE (chave IS NOT NULL);
CREATE INDEX notificacoes_destino_idx ON public.notificacoes USING btree (id_usuario_destino, created_at DESC);

-- obra_alertas
CREATE INDEX obra_alertas_abertos_idx ON public.obra_alertas USING btree (id_obra) WHERE (resolvido_em IS NULL);

-- obra_anexos
CREATE INDEX idx_obra_anexos_id_obra ON public.obra_anexos USING btree (id_obra);
CREATE INDEX idx_obra_anexos_id_ocorrencia ON public.obra_anexos USING btree (id_ocorrencia);

-- obra_faturamento_familias
CREATE INDEX idx_obra_faturamento_familias_codigo_familia ON public.obra_faturamento_familias USING btree (codigo_familia);
CREATE INDEX idx_obra_faturamento_familias_id_familia_padrao ON public.obra_faturamento_familias USING btree (id_familia_padrao);
CREATE INDEX idx_obra_faturamento_familias_id_grupo ON public.obra_faturamento_familias USING btree (id_grupo_faturamento);
CREATE INDEX idx_obra_faturamento_familias_id_obra_grupo ON public.obra_faturamento_familias USING btree (id_obra, id_grupo_faturamento);
CREATE UNIQUE INDEX uq_obra_faturamento_familias_grupo_familia ON public.obra_faturamento_familias USING btree (id_obra, id_grupo_faturamento, codigo_familia) WHERE (id_grupo_faturamento IS NOT NULL);

-- obra_faturamento_grupos
CREATE INDEX idx_obra_faturamento_grupos_id_obra ON public.obra_faturamento_grupos USING btree (id_obra);

-- obra_faturamento_previsoes
CREATE INDEX idx_obra_faturamento_previsoes_id_obra ON public.obra_faturamento_previsoes USING btree (id_obra);
CREATE INDEX idx_obra_faturamento_previsoes_id_obra_faturamento_familia ON public.obra_faturamento_previsoes USING btree (id_obra_faturamento_familia);

-- obra_faturamento_realizados
CREATE INDEX idx_obra_faturamento_realizados_id_obra ON public.obra_faturamento_realizados USING btree (id_obra);
CREATE INDEX idx_obra_faturamento_realizados_id_obra_faturamento_familia ON public.obra_faturamento_realizados USING btree (id_obra_faturamento_familia);
CREATE INDEX idx_obra_faturamento_realizados_id_previsao ON public.obra_faturamento_realizados USING btree (id_previsao);

-- obra_rentabilidade_familias
CREATE INDEX obra_rentabilidade_familias_id_obra_idx ON public.obra_rentabilidade_familias USING btree (id_obra);

-- obra_servicos_parcelas
CREATE INDEX osp_obra_idx ON public.obra_servicos_parcelas USING btree (id_obra, nr_pedido);

-- obra_sma_materiais
CREATE INDEX obra_sma_materiais_id_obra_idx ON public.obra_sma_materiais USING btree (id_obra);

-- obra_sma_projecao
CREATE INDEX obra_sma_projecao_obra_idx ON public.obra_sma_projecao USING btree (id_obra, codigo_projeto);

-- obras
CREATE INDEX idx_obras_id_responsavel ON public.obras USING btree (id_responsavel);

-- obras_valores_erp
CREATE INDEX obras_valores_erp_obra ON public.obras_valores_erp USING btree (id_obra, created_at DESC);
CREATE INDEX obras_valores_erp_pendentes ON public.obras_valores_erp USING btree (created_at) WHERE (situacao = 'pendente'::text);

-- ocorrencias
CREATE INDEX idx_ocorrencias_id_obra ON public.ocorrencias USING btree (id_obra);
CREATE INDEX idx_ocorrencias_id_reuniao ON public.ocorrencias USING btree (id_reuniao);

-- parcelas_cliente
CREATE INDEX idx_parcelas_cliente_data_prevista ON public.parcelas_cliente USING btree (data_prevista);
CREATE INDEX idx_parcelas_cliente_id_obra ON public.parcelas_cliente USING btree (id_obra);
CREATE INDEX idx_parcelas_cliente_status ON public.parcelas_cliente USING btree (status);

-- push_inscricoes
CREATE INDEX push_inscricoes_usuario_idx ON public.push_inscricoes USING btree (id_usuario);

-- reunioes
CREATE INDEX idx_reunioes_id_criador ON public.reunioes USING btree (id_criador);
CREATE INDEX idx_reunioes_id_obra ON public.reunioes USING btree (id_obra);
CREATE INDEX idx_reunioes_id_sessao ON public.reunioes USING btree (id_sessao);

-- solicitacoes_faturamento
CREATE INDEX solicitacoes_faturamento_obra_idx ON public.solicitacoes_faturamento USING btree (id_obra, created_at DESC);
CREATE INDEX solicitacoes_faturamento_status_idx ON public.solicitacoes_faturamento USING btree (status);

-- solicitacoes_faturamento_eventos
CREATE INDEX solicitacoes_faturamento_eventos_idx ON public.solicitacoes_faturamento_eventos USING btree (id_solicitacao, em);

-- solicitacoes_faturamento_romaneios
CREATE INDEX sfr_situacao_idx ON public.solicitacoes_faturamento_romaneios USING btree (situacao) WHERE (situacao = ANY (ARRAY['pendente'::text, 'cancelar'::text, 'criado'::text]));
CREATE INDEX sfr_solicitacao_idx ON public.solicitacoes_faturamento_romaneios USING btree (id_solicitacao);

-- solicitacoes_material
CREATE INDEX solicitacoes_material_status ON public.solicitacoes_material USING btree (status);

-- solicitacoes_material_eventos
CREATE INDEX solicitacoes_material_eventos_sol ON public.solicitacoes_material_eventos USING btree (id_solicitacao);

-- solicitacoes_previsao
CREATE INDEX solicitacoes_previsao_obra_idx ON public.solicitacoes_previsao USING btree (id_obra, created_at DESC);
CREATE INDEX solicitacoes_previsao_status_idx ON public.solicitacoes_previsao USING btree (status);

-- tarefas
CREATE INDEX idx_tarefas_id_obra ON public.tarefas USING btree (id_obra);
CREATE INDEX idx_tarefas_id_responsavel ON public.tarefas USING btree (id_responsavel);
CREATE INDEX idx_tarefas_id_reuniao_origem ON public.tarefas USING btree (id_reuniao_origem);
CREATE INDEX tarefas_id_reuniao_reaberta_idx ON public.tarefas USING btree (id_reuniao_reaberta) WHERE (id_reuniao_reaberta IS NOT NULL);

-- usuarios
CREATE INDEX idx_usuarios_id_engenheiro_vinculado ON public.usuarios USING btree (id_engenheiro_vinculado);
CREATE INDEX usuarios_email_lower_idx ON public.usuarios USING btree (lower((email)::text));
