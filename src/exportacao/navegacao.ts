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

/** id na tela de um campo do processo (o mesmo de CampoProcesso em ui.tsx). */
export const idDoCampo = (caminho: string): string => `exp-${caminho.replace(/\./g, "-")}`;

// texto do ajuste (regras.ts) -> campo; as regras sao o porte 1:1 do Python e nao dizem o campo, so o passo
const CAMPOS_POR_TEXTO: [RegExp, string][] = [
  [/número da Invoice/, "documento.numero"],
  [/data dos documentos/, "documento.data"],
  [/^(Exportador|Importador): falta razão social/, "$parte.razao"],
  [/^(Exportador|Importador): falta endereço/, "$parte.endereco"],
  [/^(Exportador|Importador): falta cidade/, "$parte.cidade"],
  [/^(Exportador|Importador): falta país/, "$parte.pais"],
  [/^Exportador: falta o CNPJ/, "exportador.cnpj"],
  [/^Importador sem identificação fiscal/, "importador.id_fiscal"],
  [/^Consignatário/, "consignatario.razao"],
  [/moeda da Invoice/, "comercial.moeda"],
  [/^Escolha o Incoterm/, "comercial.incoterm"],
  [/local do Incoterm/, "comercial.local_incoterm"],
  [/condição de pagamento/, "comercial.condicao_pagamento"],
  [/taxa de câmbio|Invoice em reais/, "comercial.taxa_cambio"],
  [/^Frete e seguro|frete está zerado/, "comercial.frete"],
  [/seguro está zerado/, "comercial.seguro"],
  [/modal de transporte/, "embarque.modal"],
  [/local de embarque/, "embarque.local_embarque"],
  [/país de destino/, "embarque.pais_destino"],
  [/fronteira de saída/, "embarque.fronteira"],
  [/porto\/local de destino/, "embarque.porto_destino"],
  [/nº de volumes/, "embarque.qtd_volumes"],
  [/falta nº da NF/, "embarque.nf"],
  [/falta transportadora/, "embarque.transportadora"],
  [/falta data de saída/, "embarque.data_saida"],
  [/escolha o acordo/, "certificado.acordo"],
  [/critério de origem/, "certificado.criterio_origem"],
];

// "Item 3 (...)": campo do cartao do item (PassoItens.tsx, id item-<indice>-<campo>)
const CAMPOS_DO_ITEM: [RegExp, string][] = [
  [/falta a descrição/, "descricao"],
  [/inglês\/espanhol/, "descricao_en"],
  [/NCM/, "ncm"],
  [/quantidade zerada/, "quantidade"],
  [/valor unitário/, "valor_unit"],
  [/peso líquido/, "peso_liq"],
];

/** Onde corrigir um ajuste da revisao: o passo e, quando da para saber pelo texto, o id do campo na tela. Os campos do
 *  cabecalho do romaneio sao avisos da Packing List, mas se preenchem no passo Embarque. */
export function alvoDoAjuste(a: Ajuste): { passo: PassoId; campo?: string } | null {
  const passo = a.onde === "documento" ? PASSO_DO_CAMPO[a.campo] : undefined;
  if (!passo) return null;
  const item = /^Item (\d+)\b/.exec(a.texto);
  if (item && passo === "itens") {
    const c = CAMPOS_DO_ITEM.find(([r]) => r.test(a.texto));
    return { passo, campo: c ? `item-${Number(item[1]) - 1}-${c[1]}` : undefined };
  }
  for (const [r, caminho] of CAMPOS_POR_TEXTO) {
    const m = r.exec(a.texto);
    if (!m) continue;
    const c = caminho.replace("$parte", (m[1] ?? "").toLowerCase());
    return { passo: c.startsWith("embarque.") ? "embarque" : passo, campo: idDoCampo(c) };
  }
  return { passo };
}

/** Proximo passo com erro depois do atual (dando a volta); null se nao ha erro em passo nenhum. */
export function proximaPendencia(situacoes: Record<PassoId, SituacaoPasso>, atual: PassoId): PassoId | null {
  const ordem = PASSOS_DE_PREENCHER;
  const i = ordem.indexOf(atual);
  const giro = [...ordem.slice(i + 1), ...ordem.slice(0, i + 1)];
  return giro.find((p) => situacoes[p].tipo === "erro") ?? null;
}
