// Passos do assistente de exportacao (guia, secao 3) e a que passo pertence cada ajuste da revisao.
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
