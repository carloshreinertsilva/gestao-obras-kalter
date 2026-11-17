# SQL pendente (NAO aplicado)

Arquivos que so podem entrar depois que o app novo estiver publicado e/ou depois de decisao do Carlos.
Aplicar um por vez, com ensaio em transacao desfeita antes, e regenerar `supabase/schema` depois.

- `p4_d3_email_fase2.sql` - e-mail montado no banco (`email_enviar_tarefa`, `email_enviar_ata`) e fechamento de
  `enfileirar_email` para o app. Parte A pode entrar antes; parte B (revoke) so com o app ja usando as funcoes novas
  (trocar as chamadas em `src/App.tsx` e `src/telas/TelaReunioes.tsx`).
- `p4_mfa_obrigatorio.sql` - liga a obrigatoriedade da verificacao em duas etapas para admin/aprovadores e passa a
  exigi-la nas funcoes de aprovacao. So depois de o Carlos decidir, avisar as pessoas e dar prazo.
