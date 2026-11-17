// Compras e entregas atrasadas das obras do Painel (Pacote 4 / B8).
// Mesmas regras de atraso que o gestor ja ve dentro da obra (copiadas daqui; unificar depois):
// - compra: AbaComprasObra.tsx `atrasada` -> item de material (servico = false) nao recebido com entrega prevista
//   (data_entrega) antes de hoje;
// - SMA: ListaMateriaisSMA.tsx `necessidadeVencida` -> SMA ativa (situacao A) com saldo a atender e data de
//   necessidade antes de hoje; aqui sem os itens que vao ser produzidos (ordens_producao), que nao sao compra
//   (mesmo corte da tela Compras da logistica, compras_sma_pendentes).
// Um item da SMA cuja compra ja aparece atrasada (mesma SMA e material) nao entra de novo.

export interface ObraPainel {
  id: string;
  codigo: string;
  nome: string;
}

export interface CompraAberta {
  id_obra: string;
  nr_solicitacao: number;
  codigo_material: string | null;
  descricao_material: string | null;
  situacao: "sem_pedido" | "nao_liberado" | "aguardando" | "recebido";
  nr_pedido: number | null;
  fornecedor: string | null;
  data_entrega: string | null;
  nr_sma: number | null;
  servico: boolean;
}

export interface SmaMaterial {
  id_obra: string;
  nr_sma: number;
  sequencia: number;
  codigo_material: string | null;
  descricao_material: string | null;
  quantidade_solicitada: number | null;
  quantidade_atendida: number | null;
  situacao: string | null;
  data_necessidade: string | null;
  ordens_producao: string | null;
  urgente: boolean | null;
}

export interface ItemAtrasado {
  chave: string;
  tipo: "compra" | "sma";
  codigo_material: string | null;
  descricao: string | null;
  fornecedor: string | null;
  nr_pedido: number | null;
  nr_solicitacao: number | null;
  nr_sma: number | null;
  data: string; // entrega prevista (compra) ou necessidade (SMA), AAAA-MM-DD
  dias: number; // dias corridos de atraso
  situacao: string; // texto para a tela
  urgente: boolean;
}

export interface AtrasosObra {
  obra: ObraPainel;
  itens: ItemAtrasado[];
  piorAtraso: number;
}

export interface ResumoAtrasos {
  obras: AtrasosObra[];
  totalItens: number;
}

const SITUACAO_COMPRA: Record<CompraAberta["situacao"], string> = {
  sem_pedido: "Sem pedido",
  nao_liberado: "Pedido não liberado",
  aguardando: "Aguardando entrega",
  recebido: "Recebido",
};

const DIA = 86400000;
const dia10 = (d: string | null | undefined) => (d ? String(d).slice(0, 10) : "");

/** Data de hoje no fuso do aparelho, AAAA-MM-DD. */
export const hojeLocalISO = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const compraAtrasada = (c: CompraAberta, hoje: string) =>
  !c.servico && c.situacao !== "recebido" && Boolean(c.data_entrega && dia10(c.data_entrega) < hoje);

const saldoSma = (m: SmaMaterial) =>
  (m.situacao || "A") !== "A" ? 0 : Math.max((Number(m.quantidade_solicitada) || 0) - (Number(m.quantidade_atendida) || 0), 0);

export const smaVencida = (m: SmaMaterial, hoje: string) =>
  !m.ordens_producao && Boolean(m.data_necessidade && dia10(m.data_necessidade) < hoje && saldoSma(m) > 0);

/** Dias corridos entre a data (AAAA-MM-DD) e hoje. */
export function diasDeAtraso(data: string, hoje: string): number {
  const a = Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10));
  const b = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  return Math.max(Math.round((b - a) / DIA), 0);
}

const chaveSmaMaterial = (idObra: string, nrSma: number | null, codigo: string | null) => `${idObra}|${nrSma ?? ""}|${codigo ?? ""}`;

export function montarAtrasos(obras: ObraPainel[], compras: CompraAberta[], smas: SmaMaterial[], hoje: string): ResumoAtrasos {
  const porObra = new Map<string, ItemAtrasado[]>(obras.map((o) => [o.id, []]));
  // compra (atrasada ou nao) de cada material da SMA: mostra pedido/fornecedor no item da SMA
  const compraDaSma = new Map<string, CompraAberta>();
  const smaJaListada = new Set<string>();

  for (const c of compras) {
    if (c.servico || c.situacao === "recebido") continue;
    if (c.nr_sma != null) {
      const k = chaveSmaMaterial(c.id_obra, c.nr_sma, c.codigo_material);
      if (!compraDaSma.has(k) || c.nr_pedido) compraDaSma.set(k, c);
    }
    const lista = porObra.get(c.id_obra);
    if (!lista || !compraAtrasada(c, hoje)) continue;
    if (c.nr_sma != null) smaJaListada.add(chaveSmaMaterial(c.id_obra, c.nr_sma, c.codigo_material));
    lista.push({
      chave: `c:${c.nr_solicitacao}`,
      tipo: "compra",
      codigo_material: c.codigo_material,
      descricao: c.descricao_material,
      fornecedor: c.fornecedor,
      nr_pedido: c.nr_pedido,
      nr_solicitacao: c.nr_solicitacao,
      nr_sma: c.nr_sma,
      data: dia10(c.data_entrega),
      dias: diasDeAtraso(dia10(c.data_entrega), hoje),
      situacao: SITUACAO_COMPRA[c.situacao] || c.situacao,
      urgente: false,
    });
  }

  for (const m of smas) {
    const lista = porObra.get(m.id_obra);
    if (!lista || !smaVencida(m, hoje)) continue;
    const k = chaveSmaMaterial(m.id_obra, m.nr_sma, m.codigo_material);
    if (smaJaListada.has(k)) continue;
    const compra = compraDaSma.get(k);
    lista.push({
      chave: `s:${m.nr_sma}:${m.sequencia}:${m.codigo_material ?? ""}`,
      tipo: "sma",
      codigo_material: m.codigo_material,
      descricao: m.descricao_material,
      fornecedor: compra?.fornecedor ?? null,
      nr_pedido: compra?.nr_pedido ?? null,
      nr_solicitacao: compra?.nr_solicitacao ?? null,
      nr_sma: m.nr_sma,
      data: dia10(m.data_necessidade),
      dias: diasDeAtraso(dia10(m.data_necessidade), hoje),
      situacao: compra ? `Necessidade vencida · ${SITUACAO_COMPRA[compra.situacao].toLowerCase()}` : "Necessidade vencida · sem compra",
      urgente: Boolean(m.urgente),
    });
  }

  const resultado: AtrasosObra[] = [];
  for (const o of obras) {
    const itens = (porObra.get(o.id) || []).sort((a, b) => b.dias - a.dias || a.chave.localeCompare(b.chave));
    if (itens.length) resultado.push({ obra: o, itens, piorAtraso: itens[0].dias });
  }
  resultado.sort((a, b) => b.piorAtraso - a.piorAtraso || b.itens.length - a.itens.length || a.obra.codigo.localeCompare(b.obra.codigo, "pt-BR", { numeric: true }));
  return { obras: resultado, totalItens: resultado.reduce((s, o) => s + o.itens.length, 0) };
}

/** Chave estavel da lista de obras (o Painel recria o array a cada render). */
export const chaveObras = (obras: ObraPainel[]) => obras.map((o) => o.id).sort().join(",");

export const textoResumo = (r: ResumoAtrasos) =>
  `${r.totalItens} ${r.totalItens === 1 ? "item atrasado" : "itens atrasados"} em ${r.obras.length} ${r.obras.length === 1 ? "obra" : "obras"}`;

export const textoDias = (dias: number) => (dias === 1 ? "1 dia de atraso" : `${dias} dias de atraso`);
