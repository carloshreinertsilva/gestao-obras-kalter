# supabase/schema — cópia do esquema do banco (gerada)

**Não editar à mão.** Estes arquivos são gerados a partir do banco Supabase do app
(projeto `pnnhyzdbknzhsyyhhgbk`) pelo script `src/exportar_schema_app.py` do repositório `robo-sync-erp`.
Servem para ter histórico no git e ver em `git diff` o que mudou em tabelas, funções, RLS etc.
Só estrutura: nenhum dado, nenhum segredo do Vault, senha ou chave (textos com cara de segredo saem como
`<SEGREDO REMOVIDO>`).

| Arquivo | Conteúdo |
|---|---|
| `extensoes.sql` | extensões instaladas (e versão) |
| `tipos.sql` | enums / tipos do schema `public` |
| `tabelas.sql` | `create table` com colunas, defaults, not null, PK/unique/FK/check e comentários |
| `indices.sql` | índices que não vêm de PK/unique |
| `views.sql` | views |
| `funcoes.sql` | `pg_get_functiondef` de todas as funções do `public` (ordem: nome + argumentos) |
| `triggers.sql` | triggers |
| `politicas.sql` | RLS ligado/desligado por tabela + `create policy` |
| `grants.sql` | privilégios de tabela e de execução de função para `anon`, `authenticated` e `PUBLIC` |
| `cron.sql` | jobs do `pg_cron` (nome, agenda, comando) |

## Como regenerar

A partir da pasta `robo-sync-erp` (usa a conexão do `.env` dele, somente leitura):

```
C:\Users\carlos\Desktop\Kalter\robo-sync-erp\.venv\Scripts\python.exe src\exportar_schema_app.py
```

Por padrão grava em `../gestao-obras-kalter/supabase/schema`; outra pasta: `--saida <pasta>`.
A ordem é estável: rodar de novo sem mudança no banco não gera diff.

## Mudanças no banco

Continuam sendo feitas **por migração** (como hoje). Esta pasta é só o retrato: depois de aplicar uma
migração, regenerar e commitar junto.
