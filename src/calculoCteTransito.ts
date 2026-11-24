// Fretes em transito (2026-11-23): CT-es em que a Kalter e a tomadora, capturados na SEFAZ pelo robo
// (robo-sync-erp/src/sync_cte_sefaz.py -> public.fretes_ctes_sefaz). Regras puras da aba "Em trânsito".

export type LigacaoCte = "nf_lancada" | "pedido_nfe" | "nf_saida" | "pedido_aberto" | "sem_ligacao";

export interface CteSefaz {
  chave: string;
  numero: string;
  serie: string | null;
  emitido_em: string;
  sentido: "compra" | "venda" | "outro";
  transportadora_cnpj: string;
  transportadora_nome: string | null;
  remetente_nome: string | null;
  destinatario_nome: string | null;
  origem_nome: string | null;
  destino_nome: string | null;
  valor: number;
  cancelado: boolean;
  nr_ad: number | null;
  data_entrada: string | null;
  ligacao: LigacaoCte;
  pedidos: number[];
  projetos: string[];
  codigos_obra: string[];
}

export type FiltroTransito = "sem_entrada" | "sem_obra" | "lancados" | "todos";
export const FILTROS_TRANSITO: FiltroTransito[] = ["sem_entrada", "sem_obra", "lancados", "todos"];

/** Dias corridos entre a emissao do CT-e e hoje (ou a data de entrada, se ja lancado). Nunca negativo. */
export function diasDoCte(c: Pick<CteSefaz, "emitido_em" | "data_entrada">, hoje: string): number {
  const fim = c.data_entrada || hoje;
  const d = Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${c.emitido_em}T00:00:00Z`)) / 86400000);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

export const emTransito = (c: Pick<CteSefaz, "nr_ad" | "cancelado">) => c.nr_ad == null && !c.cancelado;

/** A obra/pedido indicado pode ser usado sem conferir? "pedido_aberto" e so palpite (errou 14 de 18 na conferencia). */
export function confiancaDaLigacao(c: Pick<CteSefaz, "ligacao" | "codigos_obra">): "confiavel" | "sugestao" | "nenhuma" {
  if (!c.codigos_obra.length) return "nenhuma";
  return c.ligacao === "pedido_aberto" ? "sugestao" : c.ligacao === "sem_ligacao" ? "nenhuma" : "confiavel";
}

export const ROTULO_LIGACAO: Record<LigacaoCte, string> = {
  nf_lancada: "NF-e já lançada no ERP",
  pedido_nfe: "Pedido informado na NF-e",
  nf_saida: "NF de saída",
  pedido_aberto: "Sugestão: pedidos em aberto do fornecedor",
  sem_ligacao: "Sem ligação",
};

export function filtrarCtes(lista: CteSefaz[], filtro: FiltroTransito, busca: string): CteSefaz[] {
  const t = busca.trim().toLowerCase();
  return lista.filter((c) => {
    if (c.cancelado) return false;
    if (filtro === "sem_entrada" && !emTransito(c)) return false;
    if (filtro === "sem_obra" && !(emTransito(c) && confiancaDaLigacao(c) !== "confiavel")) return false;
    if (filtro === "lancados" && c.nr_ad == null) return false;
    if (!t) return true;
    return [c.numero, c.transportadora_nome, c.remetente_nome, c.destinatario_nome, c.origem_nome, c.destino_nome, c.nr_ad, ...c.codigos_obra, ...c.pedidos]
      .map((x) => String(x ?? "").toLowerCase())
      .some((x) => x.includes(t));
  });
}

export function resumoTransito(lista: CteSefaz[], hoje: string) {
  const abertos = lista.filter(emTransito);
  return {
    quantidade: abertos.length,
    valor: abertos.reduce((s, c) => s + Number(c.valor || 0), 0),
    semObra: abertos.filter((c) => confiancaDaLigacao(c) !== "confiavel").length,
    maisDe7Dias: abertos.filter((c) => diasDoCte(c, hoje) > 7).length,
  };
}
