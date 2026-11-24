-- p20 - CT-es capturados na SEFAZ ("fretes em transito"). Pedido do Carlos em 23/11/2026.
-- Robo: robo-sync-erp/src/sync_cte_sefaz.py (consulta o servico nacional CTeDistribuicaoDFe com o certificado A1 e
-- grava aqui os CT-es em que a Kalter e a TOMADORA do frete). App: aba "Em transito" da tela Fretes.
-- Objetivo: saber do frete no dia da emissao do CT-e, e nao so quando ele e lancado no ERP (mediana de 6 dias depois).
-- So leitura para o app: quem grava e o robo (conexao direta). Nao mexe em fretes, fretes_ctes nem em previsao.
-- Aditivo (tabela nova): pode entrar a qualquer hora; o app antigo e o robo antigo nao usam.
-- Teste: robo-sync-erp/tests/test_cte_sefaz_banco.py (so passa depois de aplicado).

create table if not exists public.fretes_ctes_sefaz (
    chave               text primary key,
    nsu                 bigint,
    numero              text not null,
    serie               text,
    emitido_em          date not null,
    sentido             text not null,
    transportadora_cnpj text not null,
    transportadora_nome text,
    cod_fornecedor      integer,
    remetente_cnpj      text,
    remetente_nome      text,
    destinatario_cnpj   text,
    destinatario_nome   text,
    tomador_papel       text,
    origem_nome         text,
    destino_nome        text,
    valor               numeric(14,2) not null default 0,
    nfes                text[] not null default '{}',
    cancelado           boolean not null default false,
    nr_ad               bigint,
    data_entrada        date,
    ligacao             text not null default 'sem_ligacao',
    pedidos             bigint[] not null default '{}',
    projetos            text[] not null default '{}',
    codigos_obra        text[] not null default '{}',
    created_at          timestamp with time zone not null default now(),
    updated_at          timestamp with time zone not null default now(),
    constraint fretes_ctes_sefaz_chave_check check (chave ~ '^[0-9]{44}$'),
    constraint fretes_ctes_sefaz_sentido_check check (sentido in ('compra', 'venda', 'outro')),
    constraint fretes_ctes_sefaz_ligacao_check
        check (ligacao in ('nf_lancada', 'pedido_nfe', 'nf_saida', 'pedido_aberto', 'sem_ligacao'))
);

comment on table public.fretes_ctes_sefaz is
  'CT-es em que a Kalter e a tomadora do frete, capturados na SEFAZ pelo robo (sync_cte_sefaz). nr_ad nulo = ainda sem entrada no ERP (frete em transito). Gravado so pelo robo.';
comment on column public.fretes_ctes_sefaz.sentido is
  'compra = a Kalter e a destinataria; venda = a Kalter e a remetente; outro = nenhum dos dois.';
comment on column public.fretes_ctes_sefaz.ligacao is
  'Como o robo chegou ao pedido/projeto: nf_lancada (NF-e ja com entrada no ERP), pedido_nfe (pedido de compra informado pelo fornecedor no XML da NF-e), nf_saida (NF de saida -> pedido de venda), pedido_aberto (so sugestao: pedidos em aberto do fornecedor; erra muito), sem_ligacao.';
comment on column public.fretes_ctes_sefaz.codigos_obra is
  'Codigos (obras.codigo_externo ou centro de custo) dos projetos ligados - o que vem antes do ponto em projetos.';

create index if not exists fretes_ctes_sefaz_emitido_idx on public.fretes_ctes_sefaz (emitido_em desc);
create index if not exists fretes_ctes_sefaz_pendentes_idx on public.fretes_ctes_sefaz (emitido_em desc)
  where nr_ad is null and not cancelado;

alter table public.fretes_ctes_sefaz enable row level security;

-- Logistica, admin e coordenador veem tudo; gestor/assistente so os CT-es ligados a obra que gerenciam
-- (CT-e sem ligacao aparece so para logistica/admin/coordenador).
drop policy if exists fretes_ctes_sefaz_select on public.fretes_ctes_sefaz;
create policy fretes_ctes_sefaz_select on public.fretes_ctes_sefaz
  for select to authenticated
  using (
    public.eh_logistica()
    or public.eh_admin_ou_coordenador()
    or exists (select 1 from public.obras o
                where o.codigo_externo = any (fretes_ctes_sefaz.codigos_obra)
                  and public.pode_gerenciar_obra(o.id))
  );

revoke all on public.fretes_ctes_sefaz from anon, authenticated;
grant select on public.fretes_ctes_sefaz to authenticated;
