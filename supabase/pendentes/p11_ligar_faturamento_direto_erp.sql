-- p11_ligar_faturamento_direto_erp.sql - LIGA o envio do Valor de Faturamento Direto ao ERP (CADPROJ.cpj_vlr_hora_proj).
-- NAO aplicar sozinho: so na 1a gravacao real acompanhada com o Carlos. Reexecutavel. Sem begin/commit.
--
-- PRESSUPOE:
--  1. p11_faturamento_direto_erp.sql aplicado (colunas de controle, gatilho, chave desligada) - aplicado em 17/11/2026.
--  2. Robo do servidor atualizado com src/sync_faturamento_direto_erp.py e a etapa "Faturamento direto no ERP" no run_all
--     (conferir no log da rodada: "Faturamento direto no ERP (cpj_vlr_hora_proj): fila ... (chave desligada: só o plano)").
--  3. App publicado com a situacao do envio ao lado do campo.
--  4. Antes de ligar: conferir a fila (o que vai ser gravado na proxima rodada do robo, a cada 5 min):
--       select o.codigo_externo, v.valor_faturamento_direto, v.faturamento_direto_alterado_em, u.nome, u.login_erp
--         from public.obras_valores_venda v join public.obras o on o.id = v.id_obra
--         left join public.usuarios u on u.id = v.faturamento_direto_alterado_por
--        where v.faturamento_direto_erp_situacao = 'pendente';
--     Tudo que estiver 'pendente' sera gravado. Se houver algo inesperado, resolver antes (o admin volta o valor no app).
--
-- DESLIGAR de novo: o mesmo create or replace com "select false".
create or replace function public.faturamento_direto_erp_ligado()
 returns boolean
 language sql
 immutable
 set search_path to 'public'
as $function$ select true $function$;
revoke all on function public.faturamento_direto_erp_ligado() from public, anon;
grant execute on function public.faturamento_direto_erp_ligado() to authenticated;
