-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- comentarios_tarefa
CREATE TRIGGER auditar_comentarios_tarefa AFTER INSERT OR DELETE OR UPDATE ON public.comentarios_tarefa FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_notif_comentario_tarefa AFTER INSERT ON public.comentarios_tarefa FOR EACH ROW EXECUTE FUNCTION public.trg_notif_comentario_tarefa();

-- cronograma_obra
CREATE TRIGGER auditar_cronograma_obra AFTER INSERT OR DELETE OR UPDATE ON public.cronograma_obra FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- diario_obra
CREATE TRIGGER auditar_diario_obra AFTER INSERT OR DELETE OR UPDATE ON public.diario_obra FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- documentos_projeto
CREATE TRIGGER auditar_documentos_projeto AFTER INSERT OR DELETE OR UPDATE ON public.documentos_projeto FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- documentos_projeto_arquivos
CREATE TRIGGER auditar_documentos_projeto_arquivos AFTER INSERT OR DELETE OR UPDATE ON public.documentos_projeto_arquivos FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- exportacao_processos
CREATE TRIGGER exportacao_processo_hash BEFORE INSERT OR UPDATE OF dados ON public.exportacao_processos FOR EACH ROW EXECUTE FUNCTION public.trg_exportacao_processo_hash();
CREATE TRIGGER exportacao_processo_versao AFTER UPDATE ON public.exportacao_processos FOR EACH ROW EXECUTE FUNCTION public.trg_exportacao_processo_versao();

-- faturamentos
CREATE TRIGGER auditar_faturamentos AFTER INSERT OR DELETE OR UPDATE ON public.faturamentos FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_notif_nf_nova AFTER INSERT ON public.faturamentos FOR EACH ROW EXECUTE FUNCTION public.trg_notif_nf_nova();

-- nfs_terceiros
CREATE TRIGGER auditar_nfs_terceiros AFTER INSERT OR DELETE OR UPDATE ON public.nfs_terceiros FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_nfs_terceiros_avisos AFTER INSERT OR UPDATE ON public.nfs_terceiros FOR EACH ROW EXECUTE FUNCTION public.trg_nfs_terceiros_avisos();

-- notificacoes
CREATE TRIGGER notificacoes_push AFTER INSERT ON public.notificacoes FOR EACH ROW EXECUTE FUNCTION public.trg_notificacao_push();

-- obra_alertas
CREATE TRIGGER trg_obra_alertas_avisar AFTER INSERT OR UPDATE ON public.obra_alertas FOR EACH ROW EXECUTE FUNCTION public.trg_obra_alertas_avisar();

-- obra_anexos
CREATE TRIGGER auditar_obra_anexos AFTER INSERT OR DELETE OR UPDATE ON public.obra_anexos FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- obra_faturamento_familias
CREATE TRIGGER auditar_obra_faturamento_familias AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_familias FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_invalida_impressao AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_familias FOR EACH ROW EXECUTE FUNCTION public.trg_invalida_impressao_obra('espelho_faturamento');
CREATE TRIGGER trg_sincronizar_grupo_faturamento_familia BEFORE INSERT OR UPDATE OF id_grupo_faturamento ON public.obra_faturamento_familias FOR EACH ROW EXECUTE FUNCTION public.sincronizar_grupo_faturamento_familia();

-- obra_faturamento_grupos
CREATE TRIGGER auditar_obra_faturamento_grupos AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_grupos FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_invalida_impressao AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_grupos FOR EACH ROW EXECUTE FUNCTION public.trg_invalida_impressao_obra('espelho_faturamento');

-- obra_faturamento_previsoes
CREATE TRIGGER auditar_obra_faturamento_previsoes AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_previsoes FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_invalida_impressao AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_previsoes FOR EACH ROW EXECUTE FUNCTION public.trg_invalida_impressao_obra('espelho_faturamento');

-- obra_faturamento_realizados
CREATE TRIGGER auditar_obra_faturamento_realizados AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_realizados FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_invalida_impressao AFTER INSERT OR DELETE OR UPDATE ON public.obra_faturamento_realizados FOR EACH ROW EXECUTE FUNCTION public.trg_invalida_impressao_obra('espelho_faturamento');

-- obra_rentabilidade_familias
CREATE TRIGGER frete_verba_mudou AFTER INSERT OR UPDATE ON public.obra_rentabilidade_familias FOR EACH ROW EXECUTE FUNCTION public.trg_frete_verba_mudou();

-- obras
CREATE TRIGGER auditar_obras AFTER INSERT OR DELETE OR UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_after_insert_obras_criar_pmis_padrao AFTER INSERT ON public.obras FOR EACH ROW EXECUTE FUNCTION public.after_insert_obras_criar_pmis_padrao();
CREATE TRIGGER trg_notif_fase_obra AFTER UPDATE OF fase_atual ON public.obras FOR EACH ROW EXECUTE FUNCTION public.trg_notif_fase_obra();
CREATE TRIGGER trg_notif_obra_nova AFTER INSERT ON public.obras FOR EACH ROW EXECUTE FUNCTION public.trg_notif_obra_nova();
CREATE TRIGGER trg_validar_responsavel_obra BEFORE INSERT OR UPDATE OF id_responsavel ON public.obras FOR EACH ROW EXECUTE FUNCTION public.validar_responsavel_obra_e_engenheiro();
CREATE TRIGGER update_obras_modtime BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ocorrencias
CREATE TRIGGER auditar_ocorrencias AFTER INSERT OR DELETE OR UPDATE ON public.ocorrencias FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_notif_ocorrencia_nova AFTER INSERT ON public.ocorrencias FOR EACH ROW EXECUTE FUNCTION public.trg_notif_ocorrencia_nova();

-- parcelas_cliente
CREATE TRIGGER auditar_parcelas_cliente AFTER INSERT OR DELETE OR UPDATE ON public.parcelas_cliente FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_invalida_impressao AFTER INSERT OR DELETE OR UPDATE ON public.parcelas_cliente FOR EACH ROW EXECUTE FUNCTION public.trg_invalida_impressao_obra('parcelas_cliente');

-- reunioes
CREATE TRIGGER auditar_reunioes AFTER INSERT OR DELETE OR UPDATE ON public.reunioes FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- reunioes_sessoes
CREATE TRIGGER auditar_reunioes_sessoes AFTER INSERT OR DELETE OR UPDATE ON public.reunioes_sessoes FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- solicitacoes_faturamento
CREATE TRIGGER auditar_solicitacoes_faturamento AFTER INSERT OR DELETE OR UPDATE ON public.solicitacoes_faturamento FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_solicitacao_faturamento_avisos AFTER UPDATE ON public.solicitacoes_faturamento FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_faturamento_avisos();

-- solicitacoes_faturamento_itens
CREATE TRIGGER auditar_solicitacoes_faturamento_itens AFTER INSERT OR DELETE OR UPDATE ON public.solicitacoes_faturamento_itens FOR EACH ROW EXECUTE FUNCTION public.auditar();

-- solicitacoes_faturamento_romaneios
CREATE TRIGGER trg_sf_romaneio_avisos AFTER UPDATE ON public.solicitacoes_faturamento_romaneios FOR EACH ROW EXECUTE FUNCTION public.trg_sf_romaneio_avisos();

-- solicitacoes_material
CREATE TRIGGER auditar_solicitacoes_material AFTER INSERT OR DELETE OR UPDATE ON public.solicitacoes_material FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_solicitacoes_material_avisos AFTER INSERT OR UPDATE ON public.solicitacoes_material FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacoes_material_avisos();

-- solicitacoes_previsao
CREATE TRIGGER auditar_solicitacoes_previsao AFTER INSERT OR DELETE OR UPDATE ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_solicitacao_previsao_email AFTER UPDATE ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_previsao_email();
CREATE TRIGGER trg_solicitacao_previsao_ins BEFORE INSERT ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_previsao_ins();
CREATE TRIGGER trg_solicitacao_previsao_logistica AFTER UPDATE ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_previsao_logistica();
CREATE TRIGGER trg_solicitacao_previsao_notif AFTER UPDATE ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_previsao_notif();
CREATE TRIGGER trg_solicitacao_previsao_upd BEFORE UPDATE ON public.solicitacoes_previsao FOR EACH ROW EXECUTE FUNCTION public.trg_solicitacao_previsao_upd();

-- tarefas
CREATE TRIGGER auditar_tarefas AFTER INSERT OR DELETE OR UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_notif_tarefa_atribuida AFTER INSERT OR UPDATE OF id_responsavel ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.trg_notif_tarefa_atribuida();
CREATE TRIGGER update_tarefas_modtime BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- usuarios
CREATE TRIGGER auditar_usuarios AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.auditar();
CREATE TRIGGER trg_usuarios_avisa_cadastro_novo AFTER INSERT ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trg_usuarios_avisa_cadastro_novo();
CREATE TRIGGER trg_usuarios_indicadores_previsao BEFORE INSERT OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trg_usuarios_indicadores_previsao();
