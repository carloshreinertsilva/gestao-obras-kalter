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
  /** Identificacao feita a mao no app (fretes_ctes_identificacao); vale mais que a ligacao do robo. */
  manual?: IdentificacaoCte | null;
}

export interface IdentificacaoCte {
  chave: string;
  sentido: CteSefaz["sentido"];
  pedido: number | null;
  codigo_obra: string | null;
  fora_de_obra: boolean;
  observacao: string | null;
  nome_usuario: string | null;
  identificado_em: string;
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

export type ConfiancaCte = "confiavel" | "sugestao" | "nenhuma" | "manual" | "fora_de_obra";
type Ligado = Pick<CteSefaz, "ligacao" | "codigos_obra" | "manual">;

/** A obra/pedido indicado pode ser usado sem conferir? "pedido_aberto" e so palpite (errou 14 de 18 na conferencia).
 *  Identificado a mao: "manual" (tem obra) ou "fora_de_obra" (nao pertence a obra nenhuma). */
export function confiancaDaLigacao(c: Ligado): ConfiancaCte {
  if (c.manual) return c.manual.fora_de_obra ? "fora_de_obra" : "manual";
  if (!c.codigos_obra.length) return "nenhuma";
  return c.ligacao === "pedido_aberto" ? "sugestao" : c.ligacao === "sem_ligacao" ? "nenhuma" : "confiavel";
}

/** Falta alguem dizer de que obra e o frete (sem obra ou so sugestao, e ninguem identificou a mao). */
export const precisaIdentificar = (c: Ligado) => ["nenhuma", "sugestao"].includes(confiancaDaLigacao(c));

/** O que vale na tela: a identificacao manual, se houver; senao o que o robo ligou. */
export function efetivo(c: CteSefaz): { sentido: CteSefaz["sentido"]; pedidos: number[]; codigos_obra: string[] } {
  if (!c.manual) return { sentido: c.sentido, pedidos: c.pedidos, codigos_obra: c.codigos_obra };
  return {
    sentido: c.manual.sentido,
    pedidos: c.manual.pedido != null ? [c.manual.pedido] : [],
    codigos_obra: c.manual.codigo_obra ? [c.manual.codigo_obra] : [],
  };
}

/** Obras que o ERP indica (ligacao confiavel do robo) quando diferem da identificacao manual; [] = sem divergencia. */
export function divergenciaDoErp(c: CteSefaz): string[] {
  if (!c.manual || !c.codigos_obra.length || c.ligacao === "pedido_aberto" || c.ligacao === "sem_ligacao") return [];
  if (c.manual.codigo_obra && c.codigos_obra.includes(c.manual.codigo_obra)) return [];
  return c.codigos_obra;
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
    if (filtro === "sem_obra" && !(emTransito(c) && precisaIdentificar(c))) return false;
    if (filtro === "lancados" && c.nr_ad == null) return false;
    if (!t) return true;
    const e = efetivo(c);
    return [c.numero, c.transportadora_nome, c.remetente_nome, c.destinatario_nome, c.origem_nome, c.destino_nome, c.nr_ad, ...e.codigos_obra, ...e.pedidos]
      .map((x) => String(x ?? "").toLowerCase())
      .some((x) => x.includes(t));
  });
}

export function resumoTransito(lista: CteSefaz[], hoje: string) {
  const abertos = lista.filter(emTransito);
  return {
    quantidade: abertos.length,
    valor: abertos.reduce((s, c) => s + Number(c.valor || 0), 0),
    semObra: abertos.filter(precisaIdentificar).length,
    maisDe7Dias: abertos.filter((c) => diasDoCte(c, hoje) > 7).length,
  };
}

// ------------------------------------------------------------------------------------------------
// Identificacao manual: pedidos de compra em aberto (obra_compras_abertas) para conferir o numero digitado e sugerir

export interface PedidoAberto {
  pedido: number;
  fornecedor: string;
  codigos_obra: string[];
  valor: number;
}

/** Junta as linhas de obra_compras_abertas (uma por item) em um registro por pedido, com as obras e o valor em aberto. */
export function agruparPedidos(
  linhas: { nr_pedido: number | null; fornecedor: string | null; id_obra: string; valor: number | string | null }[],
  codigoDaObra: Map<string, string>,
): PedidoAberto[] {
  const mapa = new Map<number, PedidoAberto>();
  for (const l of linhas) {
    if (l.nr_pedido == null) continue;
    const p = mapa.get(l.nr_pedido) || { pedido: l.nr_pedido, fornecedor: l.fornecedor || "", codigos_obra: [], valor: 0 };
    const codigo = codigoDaObra.get(l.id_obra);
    if (codigo && !p.codigos_obra.includes(codigo)) p.codigos_obra.push(codigo);
    p.valor += Number(l.valor || 0);
    if (!p.fornecedor && l.fornecedor) p.fornecedor = l.fornecedor;
    mapa.set(l.nr_pedido, p);
  }
  return [...mapa.values()].sort((a, b) => b.pedido - a.pedido);
}

const palavras = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

/** Pedidos em aberto cujo fornecedor parece ser a empresa informada (mesma primeira palavra do nome, com 3+ letras;
 *  se a primeira for curta, as duas primeiras). E so sugestao: o nome no CT-e e no ERP nem sempre e escrito igual. */
export function pedidosDoFornecedor(nome: string | null | undefined, pedidos: PedidoAberto[]): PedidoAberto[] {
  const alvo = palavras(nome || "");
  if (!alvo.length) return [];
  const n = alvo[0].length >= 3 ? 1 : 2;
  if (alvo.length < n) return [];
  const chave = alvo.slice(0, n).join(" ");
  return pedidos.filter((p) => palavras(p.fornecedor).slice(0, n).join(" ") === chave);
}
