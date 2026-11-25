-- p25 - aviso de PEDIDO DE COMPRA GERADO (25/11/2026): quando o robo grava o pedido no ERP (status gerado), e-mail + sino
-- para quem importou o MD e para o gestor da obra e os assistentes dele (frete_gestores). Atras da chave
-- pc_aviso_gerado_ligado() = false ate o Carlos aprovar o exemplo. Um aviso por importacao (aviso_gerado_em).
-- O robo (sync_pedidos_compra) chama pc_avisar_gerado(id) depois de marcar gerado.

alter table public.pedidos_compra_importados add column if not exists aviso_gerado_em timestamptz;

create or replace function public.pc_aviso_gerado_ligado() returns boolean language sql immutable as $$ select false $$;

-- assunto e HTML (sem a moldura: o enviar_fila_email.py aplica o layout padrao)
create or replace function public.pc_conteudo_gerado(p_id uuid)
 returns table (assunto text, html text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  p public.pedidos_compra_importados;
  o public.obras;
  v_numeros text; v_pendente boolean; v_url text;
  v_linha text := '<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">%s</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">%s</td></tr>';
begin
  select * into p from public.pedidos_compra_importados where id = p_id;
  if p.id is null then return; end if;
  select * into o from public.obras where id = p.id_obras[1];
  select string_agg(x->>'numero', ', '),
         bool_or(coalesce(x->>'liberacao', '') not in ('', 'FAIXA LIVRE'))
    into v_numeros, v_pendente
    from jsonb_array_elements(coalesce(p.pedidos, '[]'::jsonb)) x;
  v_url := 'https://gestaoobraskalter.vercel.app/obras/' || coalesce(o.codigo_externo, '') || '/compras';
  assunto := 'Pedido de compra ' || coalesce(v_numeros, '') || ' gerado · ' || coalesce(p.nome_fornecedor, 'fornecedor ' || p.fornecedor)
             || ' · ' || formatar_brl(p.total);
  html := '<p style="margin:0 0 4px 0; font-size:20px; font-weight:bold; color:#2A6377;">Pedido de compra gerado</p>'
    || '<p style="margin:0 0 18px 0;"><span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:bold; color:#047857; background:#d1fae5;">PEDIDO '
    || html_esc(coalesce(v_numeros, '')) || '</span></p>'
    || '<p style="margin:0 0 14px 0; font-size:15px; color:#1e293b;">A cotação importada no app virou <strong>pedido de compra no ERP</strong>, '
    || 'com a baixa da previsão da família feita junto.'
    || case when v_pendente
            then ' Como o valor é de R$ 5.000,00 ou mais, o pedido ainda precisa ser <strong>liberado na tela do ERP</strong> (Getúlio, João ou Carlos) antes de ir ao fornecedor.'
            else ' O pedido já está liberado.' end
    || '</p>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">'
    || format(v_linha, 'Pedido', '<strong>' || html_esc(coalesce(v_numeros, '')) || '</strong>')
    || format(v_linha, 'Fornecedor', html_esc(coalesce(p.fornecedor::text || ' - ', '') || coalesce(p.nome_fornecedor, '')))
    || format(v_linha, 'Valor', formatar_brl(p.total))
    || format(v_linha, 'Obra', html_esc(coalesce(o.codigo_externo || ' - ' || o.nome, '')))
    || format(v_linha, 'Família', html_esc(array_to_string(p.familias, ', ')))
    || format(v_linha, 'SCs', cardinality(p.scs) || ' (' || html_esc(array_to_string(p.scs, ', ')) || ')')
    || format(v_linha, 'Importado por', html_esc(coalesce(p.nome_importador, '')) || ' em '
              || to_char(p.created_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'))
    || format(v_linha, 'Gerado em', to_char(coalesce(p.gerado_em, now()) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'))
    || '</table>'
    || '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;"><tr><td style="border-radius:8px; background:#2A6377;">'
    || '<a href="' || v_url || '" target="_blank" style="display:inline-block; padding:12px 22px; font-family:''Segoe UI'',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Abrir as compras da obra</a>'
    || '</td></tr></table>';
  return next;
end $function$;

create or replace function public.pc_avisar_gerado(p_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  p public.pedidos_compra_importados;
  c record;
  v_para uuid[] := '{}'; v_uid uuid; v_emails text[];
begin
  select * into p from public.pedidos_compra_importados where id = p_id for update;
  if p.id is null or p.status <> 'gerado' or p.aviso_gerado_em is not null or not public.pc_aviso_gerado_ligado() then
    return false;
  end if;
  if p.id_importador is not null then v_para := v_para || p.id_importador; end if;
  foreach v_uid in array coalesce(p.id_obras, '{}') loop
    v_para := v_para || public.frete_gestores(v_uid);
  end loop;
  select array_agg(distinct x) into v_para from unnest(v_para) x where x is not null;
  update public.pedidos_compra_importados set aviso_gerado_em = now() where id = p_id;
  select * into c from public.pc_conteudo_gerado(p_id);
  v_emails := public.sf_emails(coalesce(v_para, '{}'));
  if cardinality(v_emails) > 0 then
    insert into public.fila_email (para, assunto, html, origem) values (v_emails, c.assunto, c.html, 'pc_gerado');
  end if;
  foreach v_uid in array coalesce(v_para, '{}') loop
    perform public.notificar_usuario(v_uid, 'pedido_compra', 'Pedido de compra gerado',
      c.assunto, p.id_obras[1], null, false, 'pc_gerado_' || p.id);
  end loop;
  return true;
end $function$;

revoke all on function public.pc_conteudo_gerado(uuid) from public, anon, authenticated;
revoke all on function public.pc_avisar_gerado(uuid) from public, anon, authenticated;
