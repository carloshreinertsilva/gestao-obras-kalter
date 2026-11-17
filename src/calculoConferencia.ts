// Sugestao de peso e volumes na conferencia da logistica (solicitacao de faturamento, item C5 do pacote 4).
// As BASES vem do banco (sf_sugestao_conferencia: conferencias aprovadas da mesma obra + packing list da exportacao);
// a regra fica so aqui porque precisa acompanhar a quantidade que a logistica ajusta na tela.
// Regra fisica: peso pode ser proporcional a quantidade; volumes so quando a quantidade e a mesma (embalagem nao escala).
import { formatarNumero, lerNumero } from "./numero";

export interface BaseSfAnterior {
  numero: number;
  aprovado_em: string | null;
  peso_bruto: unknown;
  peso_liquido: unknown;
  volumes: unknown;
  especie?: string | null;
  itens: { codigo_material: string | null; quantidade: unknown; volumes: unknown }[];
}

export interface BaseExportacao {
  atualizado_em: string | null;
  qtd_volumes: unknown;
  itens: { codigo: string | null; quantidade: unknown; peso_bruto: unknown; peso_liq: unknown }[];
}

export interface BasesConferencia {
  sfs: BaseSfAnterior[];
  exportacao: BaseExportacao | null;
}

export interface ItemConferencia {
  sequencia: number;
  codigo_material: string | null;
  quantidade: number;
}

export type Confianca = "identico" | "proporcional";

export interface SugestaoConferencia {
  peso: { bruto: number; liquido: number | null; fonte: string; confianca: Confianca } | null;
  /** volumes por sequencia do item (so quando ha base com a mesma quantidade) */
  volumes: Record<number, { volumes: number; fonte: string }>;
  /** packing list so tem o total do embarque: vira texto, nao e distribuido entre os itens */
  volumesTotalExportacao: { volumes: number; fonte: string } | null;
}

export const SUGESTAO_VAZIA: SugestaoConferencia = { peso: null, volumes: {}, volumesTotalExportacao: null };

// quantidades tem 4 casas no ERP
const TOL_QTD = 0.00005;
// fatores que diferem menos que isso contam como iguais (arredondamento das 4 casas)
const TOL_FATOR = 0.002;

/** Valor vindo do banco (numero, texto "347,7" ou nulo) -> numero ou null. Numero nao passa pelo texto: 1.234 nao vira 1234. */
export function valorBase(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = lerNumero(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const arred = (v: number, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

const dataBR = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

// quantidade por material (o mesmo material pode aparecer em mais de uma sequencia do pedido)
function porMaterial(lista: { codigo: string | null; quantidade: number }[]) {
  const m = new Map<string, number>();
  for (const i of lista) {
    if (!i.codigo || !(i.quantidade > TOL_QTD)) continue;
    m.set(i.codigo, (m.get(i.codigo) || 0) + i.quantidade);
  }
  return m;
}

/** Mesmos materiais: "identico" (mesmas quantidades), "proporcional" (todas na mesma razao) ou null. */
export function compararItens(atual: Map<string, number>, base: Map<string, number>): { tipo: Confianca; fator: number } | null {
  if (atual.size === 0 || atual.size !== base.size) return null;
  let fator: number | null = null;
  let iguais = true;
  for (const [cod, q] of atual) {
    const b = base.get(cod);
    if (b === undefined || !(b > TOL_QTD)) return null;
    if (Math.abs(q - b) > TOL_QTD) iguais = false;
    const r = q / b;
    if (fator === null) fator = r;
    else if (Math.abs(r - fator) > TOL_FATOR * fator) return null;
  }
  if (iguais) return { tipo: "identico", fator: 1 };
  return { tipo: "proporcional", fator: fator as number };
}

type CandidatoPeso = NonNullable<SugestaoConferencia["peso"]>;

function pesoDasSfs(atual: Map<string, number>, sfs: BaseSfAnterior[]): CandidatoPeso[] {
  const out: CandidatoPeso[] = [];
  for (const sf of sfs) {
    const bruto = valorBase(sf.peso_bruto);
    if (!bruto || bruto <= 0) continue;
    const base = porMaterial(sf.itens.map((i) => ({ codigo: i.codigo_material, quantidade: valorBase(i.quantidade) || 0 })));
    const c = compararItens(atual, base);
    if (!c) continue;
    const liq = valorBase(sf.peso_liquido);
    const data = dataBR(sf.aprovado_em);
    out.push({
      bruto: arred(bruto * c.fator),
      liquido: liq && liq > 0 ? arred(liq * c.fator) : null,
      confianca: c.tipo,
      fonte:
        `conferência da SF ${sf.numero}${data ? ` de ${data}` : ""}, ` +
        (c.tipo === "identico" ? "mesmos itens e quantidades" : `mesmos itens; peso proporcional à quantidade (${formatarNumero(c.fator, 0, 2)}×)`),
    });
  }
  return out;
}

function pesoDaExportacao(atual: Map<string, number>, exp: BaseExportacao | null): CandidatoPeso | null {
  if (!exp || atual.size === 0) return null;
  const qtd = new Map<string, number>();
  const bruto = new Map<string, number>();
  const liq = new Map<string, number>();
  for (const i of exp.itens || []) {
    if (!i.codigo) continue;
    qtd.set(i.codigo, (qtd.get(i.codigo) || 0) + (valorBase(i.quantidade) || 0));
    bruto.set(i.codigo, (bruto.get(i.codigo) || 0) + (valorBase(i.peso_bruto) || 0));
    liq.set(i.codigo, (liq.get(i.codigo) || 0) + (valorBase(i.peso_liq) || 0));
  }
  let totalBruto = 0;
  let totalLiq: number | null = 0;
  let iguais = true;
  for (const [cod, q] of atual) {
    const qb = qtd.get(cod) || 0;
    const b = bruto.get(cod) || 0;
    // todo item da solicitacao precisa ter peso na packing list; senao o total sairia faltando peso
    if (qb <= TOL_QTD || b <= 0) return null;
    if (Math.abs(q - qb) > TOL_QTD) iguais = false;
    totalBruto += (b * q) / qb;
    const l = liq.get(cod) || 0;
    totalLiq = totalLiq !== null && l > 0 ? totalLiq + (l * q) / qb : null;
  }
  const data = dataBR(exp.atualizado_em);
  return {
    bruto: arred(totalBruto),
    liquido: totalLiq !== null ? arred(totalLiq) : null,
    confianca: iguais ? "identico" : "proporcional",
    fonte:
      `packing list da exportação${data ? ` (atualizada em ${data})` : ""}, ` +
      (iguais ? "mesmas quantidades" : "peso proporcional à quantidade"),
  };
}

export function calcularSugestao(itens: ItemConferencia[], bases: BasesConferencia | null): SugestaoConferencia {
  if (!bases) return SUGESTAO_VAZIA;
  const ativos = itens.filter((i) => i.codigo_material && i.quantidade > TOL_QTD);
  const atual = porMaterial(ativos.map((i) => ({ codigo: i.codigo_material, quantidade: i.quantidade })));
  const sfs = bases.sfs || [];

  // ordem: conferencia anterior identica > packing list > conferencia proporcional (SFs da mais recente para a mais antiga)
  const dasSfs = pesoDasSfs(atual, sfs);
  const exp = pesoDaExportacao(atual, bases.exportacao);
  const peso =
    dasSfs.find((c) => c.confianca === "identico") ??
    (exp?.confianca === "identico" ? exp : null) ??
    dasSfs.find((c) => c.confianca === "proporcional") ??
    exp ??
    null;

  // volumes: item a item, so de conferencia anterior com o mesmo material na MESMA quantidade
  const volumes: SugestaoConferencia["volumes"] = {};
  for (const i of ativos) {
    for (const sf of sfs) {
      const igual = sf.itens.find(
        (b) => b.codigo_material === i.codigo_material && Math.abs((valorBase(b.quantidade) || 0) - i.quantidade) <= TOL_QTD,
      );
      const v = igual ? valorBase(igual.volumes) : null;
      if (v !== null && Number.isInteger(v) && v >= 0) {
        volumes[i.sequencia] = { volumes: v, fonte: `SF ${sf.numero}` };
        break;
      }
    }
  }

  // packing list: total de volumes do embarque so vale se a solicitacao e o pedido inteiro, nas mesmas quantidades
  let volumesTotalExportacao: SugestaoConferencia["volumesTotalExportacao"] = null;
  const ex = bases.exportacao;
  const totalVol = ex ? valorBase(ex.qtd_volumes) : null;
  if (ex && totalVol && totalVol > 0 && Number.isInteger(totalVol)) {
    const doPedido = porMaterial((ex.itens || []).map((i) => ({ codigo: i.codigo, quantidade: valorBase(i.quantidade) || 0 })));
    if (compararItens(atual, doPedido)?.tipo === "identico")
      volumesTotalExportacao = { volumes: totalVol, fonte: `packing list da exportação${dataBR(ex.atualizado_em) ? ` (atualizada em ${dataBR(ex.atualizado_em)})` : ""}` };
  }

  return { peso, volumes, volumesTotalExportacao };
}

export const temSugestao = (s: SugestaoConferencia) =>
  Boolean(s.peso || Object.keys(s.volumes).length || s.volumesTotalExportacao);

export const textoConfianca = (c: Confianca) => (c === "identico" ? "itens idênticos" : "proporcional à quantidade");

// ------------------------------------------------------------------------------------------------
// Botao "Usar sugestao": preenche campos vazios; campo ja digitado (e diferente) so com confirmacao
// ------------------------------------------------------------------------------------------------
export interface CamposConferencia {
  pesoBruto: string;
  pesoLiquido: string;
  volumes: Record<number, string>;
}

export interface ResultadoAplicar {
  campos: CamposConferencia;
  preenchidos: number;
  /** campos ja digitados com valor diferente da sugestao (texto para a pergunta) */
  conflitos: string[];
}

const vazio = (t: string | undefined) => (t ?? "").trim() === "";

export function aplicarSugestao(
  campos: CamposConferencia,
  sug: SugestaoConferencia,
  sobrescrever: boolean,
  rotuloItem: (sequencia: number) => string = (s) => `item ${s}`,
): ResultadoAplicar {
  const novo: CamposConferencia = { ...campos, volumes: { ...campos.volumes } };
  const conflitos: string[] = [];
  let preenchidos = 0;

  const usar = (atual: string | undefined, valor: number, texto: string, rotulo: string, casas: number, set: (t: string) => void) => {
    if (vazio(atual)) {
      set(texto);
      preenchidos++;
      return;
    }
    const lido = lerNumero(atual as string);
    if (Number.isFinite(lido) && Math.abs(lido - valor) < 0.5 * 10 ** -casas) return; // ja esta igual
    conflitos.push(rotulo);
    if (sobrescrever) {
      set(texto);
      preenchidos++;
    }
  };

  if (sug.peso) {
    usar(campos.pesoBruto, sug.peso.bruto, formatarNumero(sug.peso.bruto, 2), "peso bruto", 2, (t) => (novo.pesoBruto = t));
    if (sug.peso.liquido !== null)
      usar(campos.pesoLiquido, sug.peso.liquido, formatarNumero(sug.peso.liquido, 2), "peso líquido", 2, (t) => (novo.pesoLiquido = t));
  }
  for (const [seq, v] of Object.entries(sug.volumes)) {
    const s = Number(seq);
    usar(campos.volumes[s], v.volumes, String(v.volumes), `volumes do ${rotuloItem(s)}`, 0, (t) => (novo.volumes[s] = t));
  }
  return { campos: novo, preenchidos, conflitos };
}

// ------------------------------------------------------------------------------------------------
// Aprovacao com peso muito diferente da sugestao: pergunta antes
// ------------------------------------------------------------------------------------------------
export const LIMITE_DIVERGENCIA_PESO = 0.3;

export function pesoMuitoDiferente(informado: number, sugerido: number | null | undefined, limite = LIMITE_DIVERGENCIA_PESO): boolean {
  if (!sugerido || sugerido <= 0 || !Number.isFinite(informado) || informado <= 0) return false;
  return Math.abs(informado - sugerido) / sugerido > limite;
}
