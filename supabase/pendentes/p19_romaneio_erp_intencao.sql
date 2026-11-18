-- p19 - Romaneio sem marca do app no ERP (regra do Carlos 17/11/2026). Robo: robo-sync-erp/src/sync_romaneios.py.
-- A idempotencia do romaneio deixa de ser a marca "APP-SF n id" na ROMANEIOBS e passa a ser a INTENCAO de gravacao,
-- anotada pelo robo na fila do app (e no diario local) ANTES do commit no ERP.
-- Aditivo: coluna nova (nula) + sf_descartar_romaneios manda para 'cancelar' (e nao 'descartado') a fila que ja tem
-- intencao, para o robo conferir no ERP e cancelar o romaneio se ele chegou a ser gravado.
-- Ordem: aplicar ANTES de publicar o robo novo (sem a coluna o robo novo so adia a criacao de romaneios e avisa).
-- Teste: robo-sync-erp/tests/test_romaneio_intencao_banco.py (so passa depois de aplicado).

alter table public.solicitacoes_faturamento_romaneios
  add column if not exists erp_intencao jsonb;

comment on column public.solicitacoes_faturamento_romaneios.erp_intencao is
  'Intencao de gravacao do robo (numero, cliente, transportadora, usuario, data/hora, itens), anotada antes do commit no ERP. Idempotencia sem marca no ERP: a rodada seguinte confere o romaneio exato. Uso interno do robo.';

CREATE OR REPLACE FUNCTION public.sf_descartar_romaneios(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.solicitacoes_faturamento_romaneios
     set situacao = case when numero_romaneio is null and erp_intencao is null then 'descartado' else 'cancelar' end
   where id_solicitacao = p_id and situacao in ('pendente', 'erro', 'criado');
$function$;

-- Sem mudanca de grants/RLS: a coluna fica coberta pela politica sfr_select existente; so o robo (conexao direta)
-- escreve. O gatilho trg_sf_romaneio_avisos so reage a mudanca de situacao: gravar a intencao nao gera aviso/e-mail.
