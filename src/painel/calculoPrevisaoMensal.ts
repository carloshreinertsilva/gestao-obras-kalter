// Previsao de faturamento e recebimento por mes, somando as obras do Painel (item B2, pacote 2).
// Conta pura: o componente PrevisaoMensal.tsx so busca as linhas e mostra o resultado.
//
// Definicoes (as mesmas que as abas da obra e o Painel ja usam):
// - A faturar da obra = escopo (soma de obra_faturamento_familias.valor_total_escopo) - NFs emitidas
//   (obra_faturamento_realizados), nunca negativo; obra sem escopo = nada a faturar.
// - Previsao por data = obra_faturamento_previsoes (1 linha por item do pedido no mes de entrega, espelhada do ERP).
//   As NFs de cada grupo (material) abatem as previsoes do mesmo grupo da mais antiga para a mais nova;
//   o que sobra de cada previsao e o "a faturar" daquele mes.
// - O que falta faturar e nao tem previsao com data cai em "Sem data prevista" (nao inventamos data).
// - A receber = saldo (previsto - recebido) de parcelas_cliente; vencido = data prevista antes de hoje (igual ao Painel).
// - Faturamento previsto de mes anterior ao atual e ainda nao faturado tambem vai para "Vencido".
// Datas sempre comparadas como texto AAAA-MM-DD / AAAA-MM (new Date("AAAA-MM-DD") escorrega um dia no fuso do Brasil).

export interface PrevisaoFaturamentoLinha {
  id_obra: string;
  grupo_faturamento: string | null;
  id_obra_faturamento_familia?: string | null;
  competencia: string;
  valor_previsto: number | string | null;
}

export interface RealizadoFaturamentoLinha {
  id_obra: string;
  grupo_faturamento: string | null;
  id_obra_faturamento_familia?: string | null;
  valor_realizado: number | string | null;
}

export interface FamiliaFaturamentoLinha {
  id_obra: string;
  valor_total_escopo: number | string | null;
}

export interface ParcelaClienteLinha {
  id_obra: string;
  data_prevista: string | null;
  valor_previsto: number | string | null;
  valor_realizado: number | string | null;
  status?: string | null;
}

export interface ValorObra {
  idObra: string;
  faturar: number;
  receber: number;
}

export type TipoBalde = "vencido" | "mes" | "depois" | "sem_data";

export interface BaldePrevisao {
  chave: string; // "vencido", "AAAA-MM", "depois", "sem_data"
  tipo: TipoBalde;
  rotulo: string; // "Vencido", "dez/2026", "Depois de abr/2027", "Sem data prevista"
  faturar: number;
  receber: number;
  porObra: ValorObra[]; // so obras com algum valor, maior valor primeiro
}

export interface ResultadoPrevisaoMensal {
  vencido: BaldePrevisao;
  meses: BaldePrevisao[];
  depois: BaldePrevisao;
  semData: BaldePrevisao;
  totalFaturar: number;
  totalReceber: number;
  vazio: boolean;
}

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// soma em centavos para nao acumular erro de ponto flutuante em centenas de linhas
const centavos = (v: unknown) => Math.round(num(v) * 100);

export function somarMeses(anoMes: string, quantos: number): string {
  const ano = Number(anoMes.slice(0, 4));
  const mes = Number(anoMes.slice(5, 7)) - 1 + quantos;
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return `${a}-${String(m + 1).padStart(2, "0")}`;
}

export function rotuloMes(anoMes: string): string {
  return `${NOMES_MES[Number(anoMes.slice(5, 7)) - 1]}/${anoMes.slice(0, 4)}`;
}

// mes atual + (quantidade - 1) seguintes
export function mesesDaJanela(hojeISO: string, quantidade: number): string[] {
  const inicio = hojeISO.slice(0, 7);
  return Array.from({ length: Math.max(quantidade, 1) }, (_, i) => somarMeses(inicio, i));
}

class Acumulador {
  private valores = new Map<string, Map<string, { f: number; r: number }>>();

  somar(chave: string, idObra: string, faturarCent: number, receberCent: number) {
    if (faturarCent === 0 && receberCent === 0) return;
    let porObra = this.valores.get(chave);
    if (!porObra) {
      porObra = new Map();
      this.valores.set(chave, porObra);
    }
    const atual = porObra.get(idObra) || { f: 0, r: 0 };
    atual.f += faturarCent;
    atual.r += receberCent;
    porObra.set(idObra, atual);
  }

  balde(chave: string, tipo: TipoBalde, rotulo: string): BaldePrevisao {
    const porObra = [...(this.valores.get(chave) || new Map()).entries()]
      .map(([idObra, v]) => ({ idObra, faturar: v.f / 100, receber: v.r / 100 }))
      .filter((v) => v.faturar !== 0 || v.receber !== 0)
      .sort((a, b) => b.faturar + b.receber - (a.faturar + a.receber));
    const faturar = porObra.reduce((acc, v) => acc + Math.round(v.faturar * 100), 0) / 100;
    const receber = porObra.reduce((acc, v) => acc + Math.round(v.receber * 100), 0) / 100;
    return { chave, tipo, rotulo, faturar, receber, porObra };
  }
}

// grupo do material; sem grupo, a familia separa (nao misturar NFs de familias diferentes)
const chaveGrupo = (l: { id_obra: string; grupo_faturamento: string | null; id_obra_faturamento_familia?: string | null }) =>
  `${l.id_obra}|${l.grupo_faturamento ?? `familia:${l.id_obra_faturamento_familia ?? ""}`}`;

export function calcularPrevisaoMensal(params: {
  idsObras: string[];
  previsoes: PrevisaoFaturamentoLinha[];
  realizados: RealizadoFaturamentoLinha[];
  familias: FamiliaFaturamentoLinha[];
  parcelas: ParcelaClienteLinha[];
  hojeISO: string; // AAAA-MM-DD
  quantidadeMeses: number;
}): ResultadoPrevisaoMensal {
  const { previsoes, realizados, familias, parcelas, hojeISO, quantidadeMeses } = params;
  const obras = new Set(params.idsObras);
  const meses = mesesDaJanela(hojeISO, quantidadeMeses);
  const mesAtual = meses[0];
  const ultimoMes = meses[meses.length - 1];
  const acc = new Acumulador();

  const baldeDoMes = (anoMes: string) => {
    if (anoMes < mesAtual) return "vencido";
    if (anoMes > ultimoMes) return "depois";
    return anoMes;
  };

  // ---- faturamento ----
  const escopoObra = new Map<string, number>();
  for (const f of familias) {
    if (!obras.has(f.id_obra)) continue;
    escopoObra.set(f.id_obra, (escopoObra.get(f.id_obra) || 0) + centavos(f.valor_total_escopo));
  }
  const faturadoObra = new Map<string, number>();
  const faturadoGrupo = new Map<string, number>();
  for (const r of realizados) {
    if (!obras.has(r.id_obra)) continue;
    const v = centavos(r.valor_realizado);
    faturadoObra.set(r.id_obra, (faturadoObra.get(r.id_obra) || 0) + v);
    const g = chaveGrupo(r);
    faturadoGrupo.set(g, (faturadoGrupo.get(g) || 0) + v);
  }

  // NFs do grupo abatem as previsoes mais antigas primeiro
  const previsoesOrdenadas = previsoes
    .filter((p) => obras.has(p.id_obra) && p.competencia)
    .map((p) => ({ ...p, anoMes: String(p.competencia).slice(0, 7), valor: centavos(p.valor_previsto) }))
    .sort((a, b) => (a.anoMes < b.anoMes ? -1 : a.anoMes > b.anoMes ? 1 : 0));
  const abertas = previsoesOrdenadas
    .filter((p) => p.valor > 0)
    .map((p) => {
      const g = chaveGrupo(p);
      const disponivel = faturadoGrupo.get(g) || 0;
      const abatido = Math.min(disponivel, p.valor);
      faturadoGrupo.set(g, disponivel - abatido);
      return { idObra: p.id_obra, anoMes: p.anoMes, aberto: p.valor - abatido };
    });
  // NF acima da previsao do proprio grupo (ex.: centavos de arredondamento do ERP) abate o resto da obra,
  // tambem da mais antiga para a mais nova - assim o total bate com o "A faturar" do Painel
  const sobraObra = new Map<string, number>();
  for (const [g, sobra] of faturadoGrupo) {
    if (sobra <= 0) continue;
    const idObra = g.slice(0, g.indexOf("|"));
    sobraObra.set(idObra, (sobraObra.get(idObra) || 0) + sobra);
  }
  const abertoPrevistoObra = new Map<string, number>();
  for (const p of abertas) {
    const sobra = sobraObra.get(p.idObra) || 0;
    const abatido = Math.min(sobra, p.aberto);
    sobraObra.set(p.idObra, sobra - abatido);
    const aberto = p.aberto - abatido;
    if (aberto <= 0) continue;
    abertoPrevistoObra.set(p.idObra, (abertoPrevistoObra.get(p.idObra) || 0) + aberto);
    acc.somar(baldeDoMes(p.anoMes), p.idObra, aberto, 0);
  }

  // o que falta faturar (conta do Painel) e nao esta em nenhuma previsao com data
  for (const idObra of obras) {
    const escopo = escopoObra.get(idObra) || 0;
    if (escopo <= 0) continue;
    const aFaturar = Math.max(escopo - (faturadoObra.get(idObra) || 0), 0);
    const semData = aFaturar - (abertoPrevistoObra.get(idObra) || 0);
    if (semData > 0) acc.somar("sem_data", idObra, semData, 0);
  }

  // ---- recebimento ----
  for (const p of parcelas) {
    if (!obras.has(p.id_obra) || p.status === "cancelado") continue;
    const saldo = Math.max(centavos(p.valor_previsto) - centavos(p.valor_realizado), 0);
    if (saldo <= 0) continue;
    const data = String(p.data_prevista || "").slice(0, 10);
    // data_prevista e obrigatoria no banco; se faltar, nao ha mes para colocar
    const chave = !data ? "sem_data" : data < hojeISO ? "vencido" : baldeDoMes(data.slice(0, 7));
    acc.somar(chave, p.id_obra, 0, saldo);
  }

  const vencido = acc.balde("vencido", "vencido", "Vencido");
  const baldesMes = meses.map((m) => acc.balde(m, "mes", rotuloMes(m)));
  const depois = acc.balde("depois", "depois", `Depois de ${rotuloMes(ultimoMes)}`);
  const semData = acc.balde("sem_data", "sem_data", "Sem data prevista");
  const todos = [vencido, ...baldesMes, depois, semData];
  const totalFaturar = todos.reduce((s, b) => s + Math.round(b.faturar * 100), 0) / 100;
  const totalReceber = todos.reduce((s, b) => s + Math.round(b.receber * 100), 0) / 100;

  return {
    vencido,
    meses: baldesMes,
    depois,
    semData,
    totalFaturar,
    totalReceber,
    vazio: totalFaturar === 0 && totalReceber === 0,
  };
}

// chave estavel para o efeito de busca (o Painel re-renderiza a cada 60 s com um array novo)
export function chaveIdsObras(obras: { id: string }[]): string {
  return obras
    .map((o) => o.id)
    .sort()
    .join(",");
}
