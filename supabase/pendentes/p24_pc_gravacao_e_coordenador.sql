-- p24 - pedidos de compra importados (MD da cotacao), 25/11/2026:
-- (1) liga a gravacao automatica do pedido no ERP pelo robo (sync_pedidos_compra: pronto -> gerando -> gerado).
--     Antes: teste desfeito da cotacao 5 ok e 1a gravacao acompanhada pelo Carlos (pedido 6448).
-- (2) o coordenador (Joao) tambem importa, cancela e reenvia MD (pedido do Carlos). Select ja incluia coordenador.
create or replace function public.pc_gravacao_ligada() returns boolean language sql immutable as $$ select true $$;

create or replace function public.pc_pode_importar()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.eh_logistica() or public.eh_admin_ou_coordenador();
$function$;

create or replace function public.pc_cancelar(p_id uuid, p_motivo text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_usuario uuid := public.usuario_atual_id();
begin
  if v_usuario is null or not public.pc_pode_importar() then
    raise exception 'Só logística, coordenação e administração cancelam.';
  end if;
  update public.pedidos_compra_importados
     set status = 'cancelado', id_cancelador = v_usuario, cancelado_em = now(),
         motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), '')
   where id = p_id and status in ('simulando', 'aguardando_previsao', 'pronto', 'erro');
  if not found then
    raise exception 'Esta importação não pode mais ser cancelada (já está sendo gerada ou foi gerada).';
  end if;
end $function$;
