-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

create extension if not exists pg_cron with schema pg_catalog;  -- versao 1.6.4
create extension if not exists pg_net with schema public;  -- versao 0.20.0
create extension if not exists pg_stat_statements with schema extensions;  -- versao 1.11
create extension if not exists pg_trgm with schema extensions;  -- versao 1.6
create extension if not exists pgcrypto with schema extensions;  -- versao 1.3
create extension if not exists plpgsql with schema pg_catalog;  -- versao 1.0
create extension if not exists supabase_vault with schema vault;  -- versao 0.3.1
create extension if not exists unaccent with schema extensions;  -- versao 1.1
create extension if not exists "uuid-ossp" with schema extensions;  -- versao 1.1
