-- Pacote 4 / D2 - camada 2: verificacao em duas etapas OBRIGATORIA para admin/coordenador/financeiro/fiscal/aprovadores.
-- NAO APLICAR AGORA. Pre-requisitos (nesta ordem):
--   1. p4_mfa.sql aplicado e o app NOVO publicado (o antigo nao sabe pedir o codigo nem ativar).
--   2. Authentication > Multi-Factor no painel do Supabase: "TOTP (App Authenticator)" com Enroll e Verify ligados.
--   3. Avisar as pessoas e dar prazo para cada uma ativar pelo menu do app (consultar quem falta:
--      select u.nome, u.perfil from usuarios u where u.ativo and u.id not in (select id_usuario from mfa_usuarios_com_fator())
--      -- rodar como admin, ou trocar a funcao por join direto em auth.mfa_factors).
--   4. So entao aplicar este arquivo.
-- Risco: quem e obrigado e nao ativou fica preso na tela "Ative a verificação" ate ativar; quem perder o celular fica
-- sem aprovar ate um admin redefinir (Equipe > Redefinir verificação). Se o UNICO admin perder o celular, so pelo painel
-- do Supabase (Authentication > Users > usuario > remover fator) ou SQL: delete from auth.mfa_factors where user_id = '...'.
-- Desligar de volta: rodar so o passo 1 com "select false" (as funcoes de aprovacao continuam com a chamada, que vira no-op).
-- Reexecutavel: o passo 2 pula a funcao que ja tem a chamada.
-- ATENCAO: se depois alguem recriar uma dessas funcoes a partir de supabase/schema/funcoes.sql antigo, a chamada some;
-- regerar o schema versionado depois de aplicar.

-- 1) liga a chave
create or replace function public.mfa_obrigatorio_ligado()
 returns boolean
 language sql
 stable
 set search_path to 'public'
as $function$ select true $function$;

-- 2) protecao do lado do banco: as acoes de aprovacao passam a exigir sessao aal2 de quem e obrigado.
-- Em vez de copiar o corpo de cada funcao (outros pacotes podem te-las alterado), insere
-- "perform public.mfa_exigir_aal2();" logo depois do primeiro BEGIN do corpo atual de cada uma.
-- Grants e dono ficam como estao (create or replace preserva).
do $bloco$
declare
  v_nomes text[] := array[
    'aprovar_solicitacao_previsao', 'recusar_solicitacao_previsao',   -- previsao
    'faturamento_logistica_aprovar',                                   -- faturamento
    'mat_aprovar_cadastro', 'mat_aprovar_fiscal', 'mat_recusar',       -- material
    'nft_encaminhar', 'nft_devolver', 'nft_cancelar',                  -- NF de terceiros
    'exportacao_aprovar'                                               -- exportacao
  ];
  v_f record;
  v_def text;
  v_ini int;
  v_pos int;
  v_qtd int := 0;
begin
  for v_f in
    select p.oid, p.oid::regprocedure as assinatura, l.lanname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
     where n.nspname = 'public' and p.proname = any (v_nomes)
  loop
    if v_f.lanname <> 'plpgsql' then
      raise exception 'mfa: % nao e plpgsql, ajustar a mao', v_f.assinatura;
    end if;
    v_def := pg_get_functiondef(v_f.oid);
    if position('mfa_exigir_aal2' in v_def) > 0 then
      continue;
    end if;
    -- corpo comeca no primeiro "$function$" (pg_get_functiondef sempre usa esse delimitador quando possivel)
    v_ini := position('$function$' in v_def);
    if v_ini = 0 then
      raise exception 'mfa: delimitador do corpo nao encontrado em %', v_f.assinatura;
    end if;
    v_pos := regexp_instr(v_def, '\mbegin\M', v_ini, 1, 1, 'i');  -- posicao logo depois do primeiro "begin"
    if v_pos = 0 then
      raise exception 'mfa: BEGIN nao encontrado em %', v_f.assinatura;
    end if;
    v_def := substr(v_def, 1, v_pos - 1)
             || E'\n  perform public.mfa_exigir_aal2();  -- P4/D2: aprovacao exige o codigo do aplicativo'
             || substr(v_def, v_pos);
    execute v_def;
    v_qtd := v_qtd + 1;
  end loop;
  raise notice 'mfa: % funcao(oes) protegida(s)', v_qtd;
end
$bloco$;
