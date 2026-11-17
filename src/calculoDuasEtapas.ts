// Regras puras da verificacao em duas etapas (Pacote 4 / D2). A tela fica em DuasEtapas.tsx.
// Nada aqui guarda segredo, QR ou codigo: so decide o que mostrar.

export type EtapaMfa = "verificando" | "codigo" | "ativar_obrigatorio" | "ok";

type FatorLido = { factor_type?: string; status?: string };
type SessaoLida = { access_token?: string; user?: { factors?: FatorLido[] | null } | null } | null | undefined;

// nivel da sessao gravado no token de acesso ("aal1" = so senha, "aal2" = senha + codigo)
export function nivelDaSessao(accessToken: string | undefined | null): string | null {
  if (!accessToken) return null;
  try {
    const parte = accessToken.split(".")[1];
    if (!parte) return null;
    const b64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return typeof json?.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

export function fatoresVerificados<T extends FatorLido>(fatores: T[] | null | undefined): T[] {
  return (fatores ?? []).filter((f) => f.factor_type === "totp" && f.status === "verified");
}

export function fatoresPendentes<T extends FatorLido>(fatores: T[] | null | undefined): T[] {
  return (fatores ?? []).filter((f) => f.factor_type === "totp" && f.status !== "verified");
}

export function temFatorVerificado(sessao: SessaoLida): boolean {
  return fatoresVerificados(sessao?.user?.factors).length > 0;
}

/**
 * O que mostrar depois que existe sessao:
 * - tem aplicativo ativado e a sessao ainda e so de senha -> pedir o codigo (antes de carregar qualquer dado);
 * - obrigatoriedade ligada para a pessoa e ela ainda nao ativou -> tela de ativar;
 * - senao -> app normal.
 */
export function decidirEtapaMfa(p: { aal: string | null; temFator: boolean; exigido: boolean }): EtapaMfa {
  if (p.aal === "aal2") return "ok";
  if (p.temFator) return "codigo";
  if (p.exigido) return "ativar_obrigatorio";
  return "ok";
}

// so a parte da sessao (sem ir ao servidor): vale para decidir ja no evento de login
export function precisaCodigoNoLogin(sessao: SessaoLida): boolean {
  return !!sessao && decidirEtapaMfa({ aal: nivelDaSessao(sessao.access_token), temFator: temFatorVerificado(sessao), exigido: false }) === "codigo";
}

// aceita "123 456", "123-456"; devolve so os digitos (no maximo 6)
export function limparCodigo(texto: string): string {
  return (texto || "").replace(/\D/g, "").slice(0, 6);
}

export function codigoCompleto(texto: string): boolean {
  return /^\d{6}$/.test(limparCodigo(texto));
}

// chave para digitar a mao no aplicativo: em blocos de 4 para ler sem errar
export function formatarChave(segredo: string): string {
  return (segredo || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export function podeDesativar(p: { exigido: boolean }): boolean {
  return !p.exigido;
}

// erros do Supabase Auth (em ingles) -> texto para a pessoa
export function mensagemErroMfa(erro: unknown): string {
  const e = (erro ?? {}) as { message?: string; code?: string; status?: number };
  const msg = `${e.code ?? ""} ${e.message ?? (typeof erro === "string" ? erro : "")}`.toLowerCase();
  if (/challenge.*expired|mfa_challenge_expired/.test(msg))
    return "O tempo para digitar o código acabou. Digite o código que está aparecendo agora.";
  if (/invalid.*(totp|code)|mfa_verification_failed|code.*(invalid|expired)/.test(msg))
    return "Código incorreto ou vencido. Confira no aplicativo e digite o código que está aparecendo agora.";
  if (/rate|too many|over_request|429/.test(msg) || e.status === 429)
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/(enroll|verify).*disabled|mfa_totp_(enroll|verify)_not_enabled|not enabled/.test(msg))
    return "A verificação em duas etapas ainda não está habilitada no sistema. Fale com o administrador.";
  if (/aal2|insufficient_aal/.test(msg))
    return "Para isso é preciso ter entrado com o código do aplicativo. Saia e entre de novo.";
  if (/maximum.*factors|too_many_enrolled_mfa_factors/.test(msg))
    return "Há tentativas de ativação pendentes demais. Feche esta janela, abra de novo e tente outra vez.";
  if (/failed to fetch|network/.test(msg)) return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  return "Não foi possível concluir. Tente de novo.";
}
