-- Pacote 1 / MARGEM - FASE 2 (aplicar DEPOIS que o app e o robo novos estiverem no ar e o robo tiver rodado ao menos
-- um ciclo com sucesso). Remove o espelho e as 4 colunas confidenciais de obras: so aqui o vazamento fecha.
-- Pre-requisito: margem_fase1.sql aplicada (obras_valores_restritos existe e obra_valores_erp_solicitar ja le dela).
-- Reexecutavel.

-- ultima copia antes de apagar (pega qualquer gravacao do robo antigo feita depois da fase 1 que o espelho nao viu)
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'obras' and column_name = 'margem_prevista_erp') then
    insert into public.obras_valores_restritos (id_obra, margem_prevista_erp, venda_sem_impostos_erp, margem_contribuicao_erp, rentabilidade_erp)
    select o.id, o.margem_prevista_erp, o.venda_sem_impostos_erp, o.margem_contribuicao_erp, o.rentabilidade_erp
      from public.obras o
     where num_nonnulls(o.margem_prevista_erp, o.venda_sem_impostos_erp, o.margem_contribuicao_erp, o.rentabilidade_erp) > 0
    on conflict (id_obra) do nothing;  -- linha ja existente e mantida pelo robo novo vale mais que a coluna antiga
  end if;
end $$;

drop trigger if exists trg_obras_espelha_valores_restritos on public.obras;
drop function if exists public.trg_obras_espelha_valores_restritos();

alter table public.obras
  drop column if exists margem_prevista_erp,
  drop column if exists venda_sem_impostos_erp,
  drop column if exists margem_contribuicao_erp,
  drop column if exists rentabilidade_erp;
