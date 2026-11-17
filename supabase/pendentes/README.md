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
- `p9_valores_venda_final.sql` - passo final de "fechar valores por obra": `obra_valores_venda_salvar` grava direto
  em `obras_valores_venda`, sai o espelho de update (o de insert passa a criar a linha com 0), auditoria de `obras`
  volta ao normal e saem `obras.valor_produto`/`valor_servico`. So depois de: app novo publicado (grava pela funcao,
  desde 17/11) e ninguem com o app antigo aberto; robo do servidor gravando os valores em `obras_valores_venda`;
  nada mais lendo as colunas em `obras` (lista completa no cabecalho do arquivo). Depois: ajustar no robo os testes de
  `tests/test_valores_obra_fechados_banco.py` que leem/gravam `obras.valor_*` (espelho, carga, app antigo e o helper
  `_valores` da fase 3) e regenerar `database.types.ts`.
