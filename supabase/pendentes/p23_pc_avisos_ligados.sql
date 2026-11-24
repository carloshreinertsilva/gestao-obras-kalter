-- p23 - liga o aviso diario de pedido de compra aguardando previsao (e-mail + sino ao gestor e assistentes).
-- Exemplo aprovado pelo Carlos em 24/11/2026. APLICADO em 24/11/2026 (migracao p23_pc_avisos_ligados).
-- A gravacao do pedido no ERP (pc_gravacao_ligada) continua false.
create or replace function public.pc_avisos_ligados() returns boolean language sql immutable as $$ select true $$;
