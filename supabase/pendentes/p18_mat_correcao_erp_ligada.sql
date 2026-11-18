-- p18 (18/11/2026) - chave da etapa "Correcao de materiais criados (ERP)" do robo (robo-sync-erp/src/corrigir_materiais_erp.py),
-- mesmo padrao de public.mat_criacao_erp_ligada(). NAO APLICADO.
-- Entra com false: o robo novo so mostra o plano. Ligar (select true) so com OK do Carlos, depois do 1o --apply
-- acompanhado no servidor. Sem a funcao no banco o robo trata como desligada.
CREATE OR REPLACE FUNCTION public.mat_correcao_erp_ligada()
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ select false $function$
;

revoke execute on function public.mat_correcao_erp_ligada() from public, anon;
grant execute on function public.mat_correcao_erp_ligada() to authenticated;
