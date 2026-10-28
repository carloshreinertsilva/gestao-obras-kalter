// Passos do assistente de exportacao (guia, secao 3) e a que passo pertence cada ajuste da revisao.
import type { Ajuste } from "./tipos";

export type PassoId =
  | "erp"
  | "exportador"
  | "importador"
  | "comercial"
  | "embarque"
  | "itens"
  | "volumes"
  | "certificado"
  | "revisao"
  | "previa"
  | "documentos";

export const PASSOS: { id: PassoId; nome: string }[] = [
  { id: "erp", nome: "Dados do ERP" },
  { id: "exportador", nome: "Exportador" },
  { id: "importador", nome: "Importador" },
  { id: "comercial", nome: "Condições comerciais" },
  { id: "embarque", nome: "Embarque" },
  { id: "itens", nome: "Itens" },
  { id: "volumes", nome: "Packing List" },
  { id: "certificado", nome: "Certificado de origem" },
  { id: "revisao", nome: "Revisão e ajustes" },
  { id: "previa", nome: "Pré-visualização" },
  { id: "documentos", nome: "Documentos" },
];

/** "campo" dos ajustes de regras.revisar -> passo onde se corrige ("documento" = numero e data, no passo dos dados do ERP). */
export const PASSO_DO_CAMPO: Record<string, PassoId> = {
  documento: "erp",
  exportador: "exportador",
  importador: "importador",
  comercial: "comercial",
  embarque: "embarque",
  itens: "itens",
  volumes: "volumes",
  certificado: "certificado",
};

export const nomeDoPasso = (id: PassoId): string => PASSOS.find((p) => p.id === id)?.nome ?? id;

/** Os 11 passos agrupados em 4 etapas na navegacao (29/10/2026, revisao de usabilidade aprovada pelo Carlos). */
export const ETAPAS: { nome: string; passos: PassoId[] }[] = [
  { nome: "Pedido e partes", passos: ["erp", "exportador", "importador"] },
  { nome: "Venda e embarque", passos: ["comercial", "embarque"] },
  { nome: "Mercadoria", passos: ["itens", "volumes", "certificado"] },
  { nome: "Conferir e gerar", passos: ["revisao", "previa", "documentos"] },
];

/** Passos que se preenchem (os da etapa "Conferir e gerar" so mostram o resultado). */
export const PASSOS_DE_PREENCHER: PassoId[] = ["erp", "exportador", "importador", "comercial", "embarque", "itens", "volumes", "certificado"];

export type SituacaoPasso = { tipo: "erro" | "aviso" | "ok" | "opcional" | "neutro"; n?: number; texto?: string };

/** Situacao de cada passo pela revisao: erros (bloqueiam o final), avisos, ok; certificado desmarcado = opcional;
 *  pre-visualizacao = aprovado ou nao; documentos = final gerado ou nao. Ajustes so do ERP nao contam em passo nenhum. */
export function situacoesDosPassos(
  ajustes: Ajuste[],
  { certificado, aprovado, finalGerado }: { certificado: boolean; aprovado: boolean; finalGerado: boolean },
): Record<PassoId, SituacaoPasso> {
  const erros: Partial<Record<PassoId, number>> = {};
  const avisos: Partial<Record<PassoId, number>> = {};
  for (const a of ajustes) {
    const p = a.onde === "documento" ? PASSO_DO_CAMPO[a.campo] : undefined;
    if (!p) continue;
    const alvo = a.nivel === "erro" ? erros : avisos;
    alvo[p] = (alvo[p] ?? 0) + 1;
  }
  const r = {} as Record<PassoId, SituacaoPasso>;
  for (const p of PASSOS_DE_PREENCHER) {
    r[p] = erros[p] ? { tipo: "erro", n: erros[p] } : avisos[p] ? { tipo: "aviso", n: avisos[p] } : { tipo: "ok" };
  }
  if (!certificado && r.certificado.tipo !== "erro") r.certificado = { tipo: "opcional", texto: "opcional" };
  const totalErros = PASSOS_DE_PREENCHER.reduce((s, p) => s + (erros[p] ?? 0), 0);
  const totalAvisos = PASSOS_DE_PREENCHER.reduce((s, p) => s + (avisos[p] ?? 0), 0);
  r.revisao = totalErros ? { tipo: "erro", n: totalErros } : totalAvisos ? { tipo: "aviso", n: totalAvisos } : { tipo: "ok" };
  r.previa = aprovado ? { tipo: "ok", texto: "aprovado" } : { tipo: "neutro" };
  r.documentos = finalGerado ? { tipo: "ok", texto: "gerado" } : { tipo: "neutro" };
  return r;
}

/** Proximo passo com erro depois do atual (dando a volta); null se nao ha erro em passo nenhum. */
export function proximaPendencia(situacoes: Record<PassoId, SituacaoPasso>, atual: PassoId): PassoId | null {
  const ordem = PASSOS_DE_PREENCHER;
  const i = ordem.indexOf(atual);
  const giro = [...ordem.slice(i + 1), ...ordem.slice(0, i + 1)];
  return giro.find((p) => situacoes[p].tipo === "erro") ?? null;
}
