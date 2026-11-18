# SQL pendente (NAO aplicado)

Arquivos que so podem entrar depois que o app novo estiver publicado e/ou depois de decisao do Carlos.
Aplicar um por vez, com ensaio em transacao desfeita antes, e regenerar `supabase/schema` depois.

- `p4_d3_email_fase2.sql` - e-mail montado no banco (`email_enviar_tarefa`, `email_enviar_ata`) e fechamento de
  `enfileirar_email` para o app. Parte A pode entrar antes; parte B (revoke) so com o app ja usando as funcoes novas
  (trocar as chamadas em `src/App.tsx` e `src/telas/TelaReunioes.tsx`).
- `p4_mfa_obrigatorio.sql` - liga a obrigatoriedade da verificacao em duas etapas para admin/aprovadores e passa a
  exigi-la nas funcoes de aprovacao. So depois de o Carlos decidir, avisar as pessoas e dar prazo.
- `p11_ligar_faturamento_direto_erp.sql` - liga o envio do Valor de Faturamento Direto ao ERP
  (`CADPROJ.cpj_vlr_hora_proj`, robo `src/sync_faturamento_direto_erp.py`). So na 1a gravacao real acompanhada com o
  Carlos, depois do robo novo no servidor e do app novo publicado. Conferir a fila 'pendente' antes (consulta no arquivo).
- `p14_anexos_material.sql` - anexos (varios arquivos/imagens) na solicitacao de cadastro de material: bucket privado
  `material-anexos`, tabela `solicitacoes_material_anexos`, funcoes `mat_anexo_registrar`/`mat_anexo_excluir` e
  politicas do Storage. So acrescenta (app antigo nao usa). Aplicar ANTES de publicar o app novo (a tela de
  Materiais nova chama as funcoes); `supabase/schema` ja esta com o resultado. Teste:
  `robo-sync-erp/tests/test_anexos_material_banco.py` (so passa depois de aplicado).
- `p17_aviso_material_destinatarios.sql` - e-mail/aviso "Material cadastrado no ERP" (status `concluida`) passa a ir
  tambem para o fiscal de material (ativos com `revisa_fiscal_material`) e para o Carlos (id fixo, so se ativo). Texto e
  demais avisos de material iguais. Independe do app/robo (pode entrar a qualquer hora); `supabase/schema` ja esta com o
  resultado. Teste: `robo-sync-erp/tests/test_aviso_material_banco.py` (so passa depois de aplicado).
- `p18_mat_correcao_erp_ligada.sql` - chave `mat_correcao_erp_ligada()` (com `false`) da etapa "Correcao de materiais
  criados (ERP)" do robo (`src/corrigir_materiais_erp.py`: completa CONVUM/INFISCMT/DPMPPROD2, PIS/COFINS e validade EPI
  dos itens criados pelo robo antes do ajuste de 18/11). Pode entrar a qualquer hora (sem a funcao o robo trata como
  desligada); `supabase/schema` ja esta com o resultado. Ligar (`select true`) so depois do 1o `--apply` acompanhado.
- `p19_romaneio_erp_intencao.sql` - romaneio sem marca do app no ERP: coluna
  `solicitacoes_faturamento_romaneios.erp_intencao` (intencao de gravacao do robo, anotada antes do commit no ERP) e
  `sf_descartar_romaneios` manda para `cancelar` (nao `descartado`) a fila que ja tem intencao. Aditivo; aplicar ANTES
  de publicar o robo novo (`src/sync_romaneios.py` sem a coluna so adia a criacao de romaneios e avisa).
  `supabase/schema` ja esta com o resultado. Teste: `robo-sync-erp/tests/test_romaneio_intencao_banco.py` (so passa
  depois de aplicado).
- `p9_valores_venda_final.sql` - passo final de "fechar valores por obra": `obra_valores_venda_salvar` grava direto
  em `obras_valores_venda`, sai o espelho de update (o de insert passa a criar a linha com 0), auditoria de `obras`
  volta ao normal e saem `obras.valor_produto`/`valor_servico`. So depois de: app novo publicado (grava pela funcao,
  desde 17/11) e ninguem com o app antigo aberto; robo do servidor gravando os valores em `obras_valores_venda`;
  nada mais lendo as colunas em `obras` (lista completa no cabecalho do arquivo). Depois: ajustar no robo os testes de
  `tests/test_valores_obra_fechados_banco.py` que leem/gravam `obras.valor_*` (espelho, carga, app antigo e o helper
  `_valores` da fase 3) e regenerar `database.types.ts`.
