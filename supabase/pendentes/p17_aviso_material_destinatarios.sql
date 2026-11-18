-- p17 (18/11/2026): e-mail "Material cadastrado no ERP" (status concluida) passa a ir tambem para o fiscal de
-- material (usuarios ativos com revisa_fiscal_material) e para o Carlos (id fixo, so se ativo: nao ha flag de copia
-- so para o item concluido). Demais avisos de material sem mudanca. Assinatura, SECURITY DEFINER, search_path e
-- grants (funcao de gatilho: so postgres/service_role) preservados.
CREATE OR REPLACE FUNCTION public.trg_solicitacoes_material_avisos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cad uuid[]; v_fis uuid[]; v_sol uuid[]; v_cop uuid[]; v_ref text := 'Nº ' || new.numero || ' · ' || new.descricao;
  v_urg text := case when new.urgente then 'URGENTE · ' else '' end;
  v_carlos uuid[];
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select coalesce(array_agg(id), '{}') into v_cad from public.usuarios where ativo and cadastra_materiais;
  select coalesce(array_agg(id), '{}') into v_fis from public.usuarios where ativo and revisa_fiscal_material;
  select coalesce(array_agg(id), '{}') into v_cop from public.usuarios where ativo and recebe_copia_material;
  v_sol := case when new.id_solicitante is null then '{}' else array[new.id_solicitante] end;
  if new.status = 'cadastro' then
    if tg_op = 'UPDATE' and old.status = 'fiscal' then
      perform public.mat_avisar(new.id, v_cad, 'Cadastro de material devolvido pelo fiscal · ' || v_ref, 'Solicitação de material devolvida pelo fiscal',
        'DEVOLVIDA PELO FISCAL', '#b91c1c', 'Material devolvido pelo fiscal');
    else
      perform public.mat_avisar(new.id, array(select distinct x from unnest(v_cad || v_cop) x),
        v_urg || 'Novo material para cadastrar · ' || v_ref, 'Solicitação de cadastro de material',
        v_urg || 'AGUARDANDO REVISÃO DO CADASTRO', case when new.urgente then '#b91c1c' else '#1d4ed8' end, 'Material para revisar');
    end if;
  elsif new.status = 'fiscal' then
    perform public.mat_avisar(new.id, array(select distinct x from unnest(v_fis || v_cop) x),
      v_urg || 'Material para revisão fiscal · ' || v_ref, 'Solicitação de material para revisão fiscal',
      v_urg || 'AGUARDANDO REVISÃO FISCAL', case when new.urgente then '#b91c1c' else '#b45309' end, 'Material para revisão fiscal');
  elsif new.status = 'concluida' then
    -- 18/11: pedido do Carlos - item concluido tambem para o fiscal e para ele (Carlos Silva, admin)
    select coalesce(array_agg(id), '{}') into v_carlos from public.usuarios
     where ativo and id = 'c94da647-d35f-4e9f-93e9-ea6f6eed0618'::uuid;
    perform public.mat_avisar(new.id, array(select distinct x from unnest(v_sol || v_cad || v_cop || v_fis || v_carlos) x),
      'Material cadastrado no ERP · ' || v_ref, 'Material cadastrado e disponível no ERP',
      'CÓDIGO ' || coalesce(new.codigo_edit, new.codigo_erp::text), '#047857', 'Material cadastrado: ' || coalesce(new.codigo_edit, new.codigo_erp::text));
  elsif new.status = 'devolvida' then
    perform public.mat_avisar(new.id, v_sol, 'Solicitação de material devolvida · ' || v_ref, 'Solicitação de material devolvida para correção',
      'DEVOLVIDA', '#b91c1c', 'Solicitação de material devolvida');
  elsif new.status = 'recusada' then
    perform public.mat_avisar(new.id, v_sol, 'Solicitação de material recusada · ' || v_ref, 'Solicitação de material recusada',
      case when new.codigo_existente is not null then 'USE O ITEM ' || coalesce(new.codigo_edit, new.codigo_existente::text) else 'RECUSADA' end,
      '#b91c1c', 'Solicitação de material recusada');
  end if;
  return new;
end $function$
;

revoke all on function public.trg_solicitacoes_material_avisos() from public, anon, authenticated;
grant execute on function public.trg_solicitacoes_material_avisos() to service_role;
