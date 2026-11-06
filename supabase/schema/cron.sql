-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

-- job: despertar-app | agenda: */5 9-23 * * * | ativo: nao | banco: postgres | usuario: postgres
select cron.schedule('despertar-app', '*/5 9-23 * * *', $cron$select public.despertar_app()$cron$);
select cron.alter_job((select jobid from cron.job where jobname = 'despertar-app'), active := false);

-- job: limpeza-diaria | agenda: 30 6 * * * | ativo: sim | banco: postgres | usuario: postgres
select cron.schedule('limpeza-diaria', '30 6 * * *', $cron$select public.limpeza_diaria()$cron$);

-- job: mat-lembretes | agenda: 0 11 * * 1-5 | ativo: sim | banco: postgres | usuario: postgres
select cron.schedule('mat-lembretes', '0 11 * * 1-5', $cron$select public.mat_lembretes()$cron$);

-- job: verificar-saude-robo | agenda: */10 * * * * | ativo: sim | banco: postgres | usuario: postgres
select cron.schedule('verificar-saude-robo', '*/10 * * * *', $cron$select public.verificar_saude_robo()$cron$);
