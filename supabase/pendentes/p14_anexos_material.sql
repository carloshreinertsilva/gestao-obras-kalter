-- p14 - Anexos na solicitacao de cadastro de material (18/11/2026)
-- Pedido do Carlos: anexar arquivos e imagens (varios) na solicitacao de material, como na NF de terceiros.
--
-- O que cria (so acrescenta; app antigo e robo nao usam nada disto):
--   * bucket privado 'material-anexos' (25 MB por arquivo, mesmos tipos aceitos do 'obra-anexos');
--     arquivo fica em materiais/<id da solicitacao>/<data>_<nome>;
--   * tabela public.solicitacoes_material_anexos (1 linha por arquivo; leitura para usuario ativo; gravacao so
--     pelas funcoes abaixo, como o resto da solicitacao de material);
--   * mat_pode_anexar(id): solicitacao aberta (cadastro/fiscal/erp/devolvida) e quem pede, cadastro, fiscal,
--     admin ou coordenador;
--   * mat_anexo_registrar(...): registra o arquivo ja enviado ao Storage + evento 'anexo_incluido';
--   * mat_anexo_excluir(id do anexo): quem enviou ou admin/coordenador, so com a solicitacao aberta; apaga a
--     linha, grava evento 'anexo_excluido' e devolve o caminho para o app remover o arquivo do Storage;
--   * politicas de storage.objects do bucket novo (ver, enviar, apagar).
-- NAO mexe em solicitacoes_material (o gatilho de aviso/e-mail trg_solicitacoes_material_avisos nao dispara) nem em
-- e-mail. Eventos vao so para solicitacoes_material_eventos (sem gatilho).
-- Reexecutavel. Sem begin/commit.

-- ---------------------------------------------------------------- bucket
-- mesmos tipos aceitos do bucket de anexos da obra (lista do app: src/tiposArquivoAnexo.ts TIPOS_ACEITOS_BUCKET)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'obra-anexos') then
    raise exception 'bucket obra-anexos nao encontrado (fonte da lista de tipos aceitos)';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'material-anexos', 'material-anexos', false, 26214400, b.allowed_mime_types
from storage.buckets b
where b.id = 'obra-anexos'
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 25 MB

-- ---------------------------------------------------------------- tabela
create table if not exists public.solicitacoes_material_anexos (
    id uuid default gen_random_uuid() not null,
    id_solicitacao uuid not null,
    nome_arquivo text not null,
    caminho_storage text not null,
    tipo_arquivo text,
    tamanho_bytes bigint,
    id_usuario uuid,
    nome_usuario text,
    created_at timestamp with time zone default now() not null,
    constraint solicitacoes_material_anexos_pkey primary key (id),
    constraint solicitacoes_material_anexos_caminho_key unique (caminho_storage),
    constraint solicitacoes_material_anexos_caminho_check
        check (caminho_storage like ('materiais/' || id_solicitacao::text || '/%')),
    constraint solicitacoes_material_anexos_id_solicitacao_fkey foreign key (id_solicitacao)
        references public.solicitacoes_material(id) on delete cascade,
    constraint solicitacoes_material_anexos_id_usuario_fkey foreign key (id_usuario)
        references public.usuarios(id) on delete set null
);
create index if not exists solicitacoes_material_anexos_sol on public.solicitacoes_material_anexos (id_solicitacao);

alter table public.solicitacoes_material_anexos enable row level security;
drop policy if exists solicitacoes_material_anexos_select on public.solicitacoes_material_anexos;
-- quem ve a solicitacao (todo usuario ativo, igual a solicitacoes_material) ve os anexos
create policy solicitacoes_material_anexos_select on public.solicitacoes_material_anexos
    as permissive for select
    to authenticated
    using (public.eh_usuario_ativo());

revoke all on public.solicitacoes_material_anexos from public, anon, authenticated;
grant select on public.solicitacoes_material_anexos to authenticated;

-- ---------------------------------------------------------------- quem pode anexar
create or replace function public.mat_pode_anexar(p_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.solicitacoes_material s
    where s.id = p_id
      and s.status in ('cadastro', 'fiscal', 'erp', 'devolvida')
      and (s.id_solicitante = public.usuario_atual_id()
           or public.mat_eh_cadastro() or public.mat_eh_fiscal() or public.eh_admin_ou_coordenador()));
$function$;
revoke all on function public.mat_pode_anexar(uuid) from public, anon;
grant execute on function public.mat_pode_anexar(uuid) to authenticated;

-- id da solicitacao a partir do caminho no Storage (materiais/<uuid>/...); null se o caminho nao seguir o padrao
create or replace function public.mat_anexo_id_do_caminho(p_nome text)
 returns uuid
 language sql
 immutable
 set search_path to 'public'
as $function$
  select case when split_part(p_nome, '/', 1) = 'materiais'
               and split_part(p_nome, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               and split_part(p_nome, '/', 3) <> ''
              then split_part(p_nome, '/', 2)::uuid end;
$function$;
revoke all on function public.mat_anexo_id_do_caminho(text) from public, anon;
grant execute on function public.mat_anexo_id_do_caminho(text) to authenticated;

-- apagar arquivo do bucket: se ainda esta registrado, so quem enviou ou admin/coordenador com a solicitacao aberta;
-- se nao esta registrado (o app apaga depois de mat_anexo_excluir, ou limpa um envio cujo registro falhou),
-- so quem subiu o arquivo ou admin/coordenador
create or replace function public.mat_pode_apagar_arquivo(p_nome text, p_dono text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case
    when exists (select 1 from public.solicitacoes_material_anexos a where a.caminho_storage = p_nome) then
      exists (select 1 from public.solicitacoes_material_anexos a
              join public.solicitacoes_material s on s.id = a.id_solicitacao
              where a.caminho_storage = p_nome
                and s.status in ('cadastro', 'fiscal', 'erp', 'devolvida')
                and (a.id_usuario = public.usuario_atual_id() or public.eh_admin_ou_coordenador()))
    else public.eh_usuario_ativo()
         and (public.eh_admin_ou_coordenador() or (p_dono is not null and p_dono = auth.uid()::text))
  end;
$function$;
revoke all on function public.mat_pode_apagar_arquivo(text, text) from public, anon;
grant execute on function public.mat_pode_apagar_arquivo(text, text) to authenticated;

-- ---------------------------------------------------------------- registrar / excluir
create or replace function public.mat_anexo_registrar(p_id uuid, p_caminho text, p_nome text,
                                                      p_tipo text default null, p_tamanho bigint default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_s public.solicitacoes_material;
  v_obj storage.objects;
  v_nome text := trim(coalesce(p_nome, ''));
  v_id uuid;
begin
  if v_nome = '' then raise exception 'Informe o nome do arquivo.'; end if;
  if public.arquivo_extensao_bloqueada(v_nome) or public.arquivo_extensao_bloqueada(coalesce(p_caminho, '')) then
    raise exception 'Tipo de arquivo não permitido.';
  end if;
  if public.mat_anexo_id_do_caminho(p_caminho) is distinct from p_id then
    raise exception 'Caminho do arquivo inválido.';
  end if;
  -- trava a solicitacao contra troca de etapa no meio (ex.: concluida enquanto anexa)
  select * into v_s from public.solicitacoes_material where id = p_id for share;
  if v_s.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if v_s.status not in ('cadastro', 'fiscal', 'erp', 'devolvida') then
    raise exception 'Esta solicitação já foi encerrada: não dá mais para anexar arquivos.';
  end if;
  if not public.mat_pode_anexar(p_id) then
    raise exception 'Só quem pediu, o cadastro, o fiscal ou a coordenação anexam arquivos nesta solicitação.';
  end if;
  -- o arquivo tem que ter sido enviado ao bucket (tamanho e tipo vem do Storage, nao do navegador)
  select * into v_obj from storage.objects o where o.bucket_id = 'material-anexos' and o.name = p_caminho;
  if v_obj.id is null then raise exception 'Arquivo não encontrado no armazenamento. Envie de novo.'; end if;
  if (select count(*) from public.solicitacoes_material_anexos a where a.id_solicitacao = p_id) >= 30 then
    raise exception 'Esta solicitação já tem 30 anexos (limite). Exclua algum antes de anexar outro.';
  end if;
  insert into public.solicitacoes_material_anexos
    (id_solicitacao, nome_arquivo, caminho_storage, tipo_arquivo, tamanho_bytes, id_usuario, nome_usuario)
  values (p_id, left(v_nome, 255), p_caminho,
          coalesce(nullif(v_obj.metadata ->> 'mimetype', ''), nullif(trim(p_tipo), '')),
          coalesce((v_obj.metadata ->> 'size')::bigint, p_tamanho),
          public.usuario_atual_id(), public.mat_nome_atual())
  on conflict (caminho_storage) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'Este arquivo já está anexado.'; end if;
  perform public.mat_evento(p_id, 'anexo_incluido', left(v_nome, 255));
  return v_id;
end $function$;
revoke all on function public.mat_anexo_registrar(uuid, text, text, text, bigint) from public, anon;
grant execute on function public.mat_anexo_registrar(uuid, text, text, text, bigint) to authenticated;

create or replace function public.mat_anexo_excluir(p_id_anexo uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_a public.solicitacoes_material_anexos;
  v_status text;
begin
  select * into v_a from public.solicitacoes_material_anexos where id = p_id_anexo for update;
  if v_a.id is null then raise exception 'Anexo não encontrado.'; end if;
  select status into v_status from public.solicitacoes_material where id = v_a.id_solicitacao for share;
  if v_status not in ('cadastro', 'fiscal', 'erp', 'devolvida') then
    raise exception 'Esta solicitação já foi encerrada: os anexos não podem mais ser excluídos.';
  end if;
  if not public.eh_usuario_ativo()
     or not (v_a.id_usuario = public.usuario_atual_id() or public.eh_admin_ou_coordenador()) then
    raise exception 'Só quem enviou o arquivo ou a coordenação exclui este anexo.';
  end if;
  delete from public.solicitacoes_material_anexos where id = p_id_anexo;
  perform public.mat_evento(v_a.id_solicitacao, 'anexo_excluido', v_a.nome_arquivo);
  return v_a.caminho_storage;  -- o app remove o arquivo do Storage com este caminho
end $function$;
revoke all on function public.mat_anexo_excluir(uuid) from public, anon;
grant execute on function public.mat_anexo_excluir(uuid) to authenticated;

-- ---------------------------------------------------------------- Storage (storage.objects)
drop policy if exists material_anexos_select on storage.objects;
create policy material_anexos_select on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'material-anexos'::text) AND public.eh_usuario_ativo()));

drop policy if exists material_anexos_insert on storage.objects;
create policy material_anexos_insert on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'material-anexos'::text)
                 AND (NOT public.arquivo_extensao_bloqueada(name))
                 AND public.mat_pode_anexar(public.mat_anexo_id_do_caminho(name))));

drop policy if exists material_anexos_delete on storage.objects;
create policy material_anexos_delete on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'material-anexos'::text) AND public.mat_pode_apagar_arquivo(name, owner_id)));
-- sem politica de update: o app envia sempre arquivo novo (upsert desligado)
