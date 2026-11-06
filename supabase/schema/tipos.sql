-- GERADO AUTOMATICAMENTE por robo-sync-erp/src/exportar_schema_app.py — NAO EDITAR A MAO.
-- Copia do esquema do banco Supabase do app (somente estrutura, sem dados).
-- Mudancas no banco continuam sendo feitas por migracao; depois, regenerar este arquivo.

create type public.clima_tipo as enum (
    'ensolarado',
    'chuvoso',
    'misto'
);

create type public.perfil_usuario as enum (
    'admin',
    'gestor',
    'engenheiro',
    'cliente',
    'assistente',
    'logistica',
    'coordenador',
    'fiscal',
    'financeiro'
);

create type public.status_obra as enum (
    'em_andamento',
    'concluida',
    'paralisada',
    'finalizada',
    'cancelada',
    'pausada'
);

create type public.status_tarefa as enum (
    'pendente',
    'em_andamento',
    'concluida',
    'cancelada'
);

create type public.tipo_historico as enum (
    'comentario',
    'alteracao_status',
    'alteracao_prazo',
    'alteracao_responsavel'
);

create type public.tipo_ocorrencia as enum (
    'avanco',
    'atraso',
    'fornecedor',
    'financeiro',
    'acidente',
    'outros'
);
