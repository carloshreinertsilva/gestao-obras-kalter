-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- 18 politicas do Storage (storage.objects/buckets)

-- Buckets (configuracao; os arquivos em si sao dados e ficam de fora)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-projeto', 'documentos-projeto', false, 26214400, array['application/acad', 'application/autocad_dwg', 'application/dwg', 'application/dxf', 'application/gzip', 'application/json', 'application/msword', 'application/octet-stream', 'application/pdf', 'application/rtf', 'application/sla', 'application/vnd.google-earth.kml+xml', 'application/vnd.google-earth.kmz', 'application/vnd.ms-excel', 'application/vnd.ms-excel.sheet.binary.macroenabled.12', 'application/vnd.ms-excel.sheet.binary.macroEnabled.12', 'application/vnd.ms-excel.sheet.macroenabled.12', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'application/vnd.ms-outlook', 'application/vnd.ms-pki.stl', 'application/vnd.ms-powerpoint', 'application/vnd.ms-powerpoint.presentation.macroenabled.12', 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', 'application/vnd.ms-project', 'application/vnd.ms-visio.drawing', 'application/vnd.ms-word.document.macroenabled.12', 'application/vnd.ms-word.document.macroEnabled.12', 'application/vnd.ms-xpsdocument', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.text', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.rar', 'application/vnd.sketchup.skp', 'application/vnd.visio', 'application/x-7z-compressed', 'application/x-acad', 'application/x-compressed', 'application/x-dwf', 'application/x-dwg', 'application/x-dxf', 'application/x-rar', 'application/x-rar-compressed', 'application/x-step', 'application/x-tar', 'application/x-zip', 'application/x-zip-compressed', 'application/xml', 'application/zip', 'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a', 'image/avif', 'image/bmp', 'image/gif', 'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/tiff', 'image/vnd.dwg', 'image/vnd.dxf', 'image/webp', 'image/x-dwg', 'image/x-dxf', 'message/rfc822', 'model/ifc', 'model/step', 'model/stl', 'model/vnd.dwf', 'text/csv', 'text/plain', 'text/rtf', 'text/xml', 'video/3gpp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo']::text[])
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 25 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('material-anexos', 'material-anexos', false, 26214400, array['application/acad', 'application/autocad_dwg', 'application/dwg', 'application/dxf', 'application/gzip', 'application/json', 'application/msword', 'application/octet-stream', 'application/pdf', 'application/rtf', 'application/sla', 'application/vnd.google-earth.kml+xml', 'application/vnd.google-earth.kmz', 'application/vnd.ms-excel', 'application/vnd.ms-excel.sheet.binary.macroenabled.12', 'application/vnd.ms-excel.sheet.binary.macroEnabled.12', 'application/vnd.ms-excel.sheet.macroenabled.12', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'application/vnd.ms-outlook', 'application/vnd.ms-pki.stl', 'application/vnd.ms-powerpoint', 'application/vnd.ms-powerpoint.presentation.macroenabled.12', 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', 'application/vnd.ms-project', 'application/vnd.ms-visio.drawing', 'application/vnd.ms-word.document.macroenabled.12', 'application/vnd.ms-word.document.macroEnabled.12', 'application/vnd.ms-xpsdocument', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.text', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.rar', 'application/vnd.sketchup.skp', 'application/vnd.visio', 'application/x-7z-compressed', 'application/x-acad', 'application/x-compressed', 'application/x-dwf', 'application/x-dwg', 'application/x-dxf', 'application/x-rar', 'application/x-rar-compressed', 'application/x-step', 'application/x-tar', 'application/x-zip', 'application/x-zip-compressed', 'application/xml', 'application/zip', 'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a', 'image/avif', 'image/bmp', 'image/gif', 'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/tiff', 'image/vnd.dwg', 'image/vnd.dxf', 'image/webp', 'image/x-dwg', 'image/x-dxf', 'message/rfc822', 'model/ifc', 'model/step', 'model/stl', 'model/vnd.dwf', 'text/csv', 'text/plain', 'text/rtf', 'text/xml', 'video/3gpp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo']::text[])
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 25 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nf-terceiros', 'nf-terceiros', false, 15728640, array['application/pdf', 'application/xml', 'image/heic', 'image/jpeg', 'image/png', 'image/webp', 'text/xml']::text[])
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 15 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('obra-anexos', 'obra-anexos', false, 26214400, array['application/acad', 'application/autocad_dwg', 'application/dwg', 'application/dxf', 'application/gzip', 'application/json', 'application/msword', 'application/octet-stream', 'application/pdf', 'application/rtf', 'application/sla', 'application/vnd.google-earth.kml+xml', 'application/vnd.google-earth.kmz', 'application/vnd.ms-excel', 'application/vnd.ms-excel.sheet.binary.macroenabled.12', 'application/vnd.ms-excel.sheet.binary.macroEnabled.12', 'application/vnd.ms-excel.sheet.macroenabled.12', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'application/vnd.ms-outlook', 'application/vnd.ms-pki.stl', 'application/vnd.ms-powerpoint', 'application/vnd.ms-powerpoint.presentation.macroenabled.12', 'application/vnd.ms-powerpoint.presentation.macroEnabled.12', 'application/vnd.ms-project', 'application/vnd.ms-visio.drawing', 'application/vnd.ms-word.document.macroenabled.12', 'application/vnd.ms-word.document.macroEnabled.12', 'application/vnd.ms-xpsdocument', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.text', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.rar', 'application/vnd.sketchup.skp', 'application/vnd.visio', 'application/x-7z-compressed', 'application/x-acad', 'application/x-compressed', 'application/x-dwf', 'application/x-dwg', 'application/x-dxf', 'application/x-rar', 'application/x-rar-compressed', 'application/x-step', 'application/x-tar', 'application/x-zip', 'application/x-zip-compressed', 'application/xml', 'application/zip', 'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a', 'image/avif', 'image/bmp', 'image/gif', 'image/heic', 'image/heif', 'image/jpeg', 'image/png', 'image/tiff', 'image/vnd.dwg', 'image/vnd.dxf', 'image/webp', 'image/x-dwg', 'image/x-dxf', 'message/rfc822', 'model/ifc', 'model/step', 'model/stl', 'model/vnd.dwf', 'text/csv', 'text/plain', 'text/rtf', 'text/xml', 'video/3gpp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/x-msvideo']::text[])
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 25 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('previsao-anexos', 'previsao-anexos', false, 10485760, array['application/pdf', 'image/heic', 'image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set name = excluded.name, public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;  -- 10 MB

-- storage.buckets
alter table storage.buckets enable row level security;

-- storage.objects
alter table storage.objects enable row level security;
create policy documentos_projeto_storage_delete_authenticated on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'documentos-projeto'::text) AND public.pode_gerenciar_arquivo(name)));
create policy documentos_projeto_storage_insert_authenticated on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'documentos-projeto'::text) AND public.pode_gerenciar_arquivo(name) AND (NOT public.arquivo_extensao_bloqueada(name))));
create policy documentos_projeto_storage_select_authenticated on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'documentos-projeto'::text) AND public.eh_usuario_ativo()));
create policy documentos_projeto_storage_update_authenticated on storage.objects
    as permissive for update
    to authenticated
    using (((bucket_id = 'documentos-projeto'::text) AND public.pode_gerenciar_arquivo(name)))
    with check (((bucket_id = 'documentos-projeto'::text) AND public.pode_gerenciar_arquivo(name) AND (NOT public.arquivo_extensao_bloqueada(name))));
create policy material_anexos_delete on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'material-anexos'::text) AND public.mat_pode_apagar_arquivo(name, owner_id)));
create policy material_anexos_insert on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'material-anexos'::text) AND (NOT public.arquivo_extensao_bloqueada(name)) AND public.mat_pode_anexar(public.mat_anexo_id_do_caminho(name))));
create policy material_anexos_select on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'material-anexos'::text) AND public.eh_usuario_ativo()));
create policy nf_terceiros_delete on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'nf-terceiros'::text) AND public.pode_gerenciar_arquivo(name)));
create policy nf_terceiros_insert on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'nf-terceiros'::text) AND public.pode_gerenciar_arquivo(name)));
create policy nf_terceiros_select on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'nf-terceiros'::text) AND (split_part(name, '/'::text, 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND public.pode_ver_nf_terceiros((split_part(name, '/'::text, 2))::uuid)));
create policy obra_anexos_storage_delete_authenticated on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'obra-anexos'::text) AND public.pode_gerenciar_arquivo(name)));
create policy obra_anexos_storage_insert_authenticated on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'obra-anexos'::text) AND public.pode_gerenciar_arquivo(name) AND (NOT public.arquivo_extensao_bloqueada(name))));
create policy obra_anexos_storage_select_authenticated on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'obra-anexos'::text) AND public.eh_usuario_ativo()));
create policy obra_anexos_storage_update_authenticated on storage.objects
    as permissive for update
    to authenticated
    using (((bucket_id = 'obra-anexos'::text) AND public.pode_gerenciar_arquivo(name)))
    with check (((bucket_id = 'obra-anexos'::text) AND public.pode_gerenciar_arquivo(name) AND (NOT public.arquivo_extensao_bloqueada(name))));
create policy previsao_anexos_delete on storage.objects
    as permissive for delete
    to authenticated
    using (((bucket_id = 'previsao-anexos'::text) AND public.pode_gerenciar_arquivo(name)));
create policy previsao_anexos_insert on storage.objects
    as permissive for insert
    to authenticated
    with check (((bucket_id = 'previsao-anexos'::text) AND public.eh_usuario_ativo()));
create policy previsao_anexos_select on storage.objects
    as permissive for select
    to authenticated
    using (((bucket_id = 'previsao-anexos'::text) AND public.eh_usuario_ativo()));
create policy previsao_anexos_update on storage.objects
    as permissive for update
    to authenticated
    using (((bucket_id = 'previsao-anexos'::text) AND public.pode_gerenciar_arquivo(name)))
    with check (((bucket_id = 'previsao-anexos'::text) AND public.pode_gerenciar_arquivo(name)));
