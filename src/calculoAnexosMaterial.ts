// Regras dos anexos da solicitacao de material (p14, 18/11/2026). O banco confere tudo de novo
// (mat_pode_anexar / mat_anexo_excluir / politicas do bucket); aqui so decide o que mostrar na tela.
import { normalizarNomeArquivo } from "./utils";

export const BUCKET_MATERIAL = "material-anexos";
// mesmo limite do banco (mat_anexo_registrar)
export const MAX_ANEXOS_MATERIAL = 30;
// solicitacao aberta: ainda anda no fluxo (concluida, recusada e cancelada nao recebem nem perdem anexo)
export const STATUS_ABERTOS_MATERIAL = ["cadastro", "fiscal", "erp", "devolvida"];

export interface PessoaMaterial {
  id?: string | null;
  perfil?: string | null;
  cadastra_materiais?: boolean | null;
  revisa_fiscal_material?: boolean | null;
}

export interface AnexoMaterial {
  id: string;
  id_solicitacao: string;
  nome_arquivo: string;
  caminho_storage: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  id_usuario: string | null;
  nome_usuario: string | null;
  created_at: string;
}

const ehCoordenacao = (u?: PessoaMaterial | null) => u?.perfil === "admin" || u?.perfil === "coordenador";

/** Anexa: solicitacao aberta e quem pediu, cadastro, fiscal, admin ou coordenador. */
export function podeAnexarMaterial(
  s: { status: string; id_solicitante: string | null } | null | undefined,
  u: PessoaMaterial | null | undefined,
): boolean {
  if (!s || !u?.id || !STATUS_ABERTOS_MATERIAL.includes(s.status)) return false;
  return s.id_solicitante === u.id || ehCoordenacao(u) || Boolean(u.cadastra_materiais) || Boolean(u.revisa_fiscal_material);
}

/** Exclui: solicitacao aberta e quem enviou o arquivo, admin ou coordenador. */
export function podeExcluirAnexoMaterial(
  a: { id_usuario: string | null },
  status: string | null | undefined,
  u: PessoaMaterial | null | undefined,
): boolean {
  if (!u?.id || !status || !STATUS_ABERTOS_MATERIAL.includes(status)) return false;
  return a.id_usuario === u.id || ehCoordenacao(u);
}

/** Caminho no bucket: materiais/<id>/<data em ms>[-n]_<nome sem acento/espaco>. O banco exige o prefixo materiais/<id>/. */
export function caminhoAnexoMaterial(idSolicitacao: string, nome: string, agora: Date, indice = 0): string {
  const marca = `${agora.getTime()}${indice > 0 ? `-${indice}` : ""}`;
  return `materiais/${idSolicitacao}/${marca}_${normalizarNomeArquivo(nome || "arquivo")}`;
}

/** Quantos anexos cada solicitacao tem (indicador da lista). */
export function contarAnexosPorSolicitacao(linhas: { id_solicitacao: string }[]): Record<string, number> {
  const conta: Record<string, number> = {};
  for (const l of linhas) conta[l.id_solicitacao] = (conta[l.id_solicitacao] || 0) + 1;
  return conta;
}

/** Quantos dos escolhidos ainda cabem no limite por solicitacao. */
export function cabemNoLimite(jaTem: number, escolhidos: number, limite = MAX_ANEXOS_MATERIAL): number {
  return Math.max(0, Math.min(escolhidos, limite - jaTem));
}
