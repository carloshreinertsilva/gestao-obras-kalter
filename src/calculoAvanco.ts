// Curva de avanco fisico x financeiro da obra (Pacote 4 / B12). Conta pura; CurvaAvanco.tsx so desenha.
//
// Tres series no mesmo eixo de 0 a 100%:
// - fisico: % informado pelo gestor (obra_avancos), em degraus: vale o ultimo informado ate o proximo;
// - faturado: NFs acumuladas (obra_faturamento_realizados.valor_realizado pela data_faturamento) sobre o escopo total
//   (soma de obra_faturamento_familias.valor_total_escopo); escopo zero = serie ausente (sem dividir por zero);
// - recebido: parcelas_cliente.valor_realizado acumulado pela data_realizada (recebimento) sobre o valor de venda
//   (valor_produto + valor_servico da obra; se zerado, soma das parcelas previstas nao canceladas).
//   A parcela so guarda UMA data de recebimento: parcela paga em partes conta o valor todo na ultima data.
// Datas comparadas como texto AAAA-MM-DD (new Date("AAAA-MM-DD") escorrega um dia no fuso do Brasil).
import { lerNumero } from "./numero";

export interface AvancoLinha {
  id?: string;
  data_referencia: string;
  percentual: number | string;
  observacao?: string | null;
  nome_usuario?: string | null;
}

export interface FaturamentoLinha {
  data_faturamento: string | null;
  valor_realizado: number | string | null;
}

export interface FamiliaEscopoLinha {
  valor_total_escopo: number | string | null;
}

export interface ParcelaRecebimentoLinha {
  data_prevista: string | null;
  data_realizada: string | null;
  valor_previsto: number | string | null;
  valor_realizado: number | string | null;
  status?: string | null;
}

export interface PontoCurva {
  data: string;
  fisico: number | null;
  faturado: number | null;
  recebido: number | null;
  /** true na data em que o gestor informou o avanco (ponto marcado na curva) */
  fisicoInformado: boolean;
}

export interface CurvaAvanco {
  pontos: PontoCurva[];
  escopoTotal: number;
  valorVenda: number;
  temFisico: boolean;
  temFaturado: boolean;
  temRecebido: boolean;
  /** maior valor das series (o eixo vai ate 100% ou ate este, se passar) */
  maximo: number;
}

const num = (v: number | string | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const arred = (v: number) => Math.round(v * 100) / 100;
const RE_ISO = /^\d{4}-\d{2}-\d{2}/;
const iso = (v: string | null | undefined) => (v && RE_ISO.test(v) ? v.slice(0, 10) : null);

export function valorVendaObra(
  obra: { valor_produto?: number | string | null; valor_servico?: number | string | null } | null | undefined,
  parcelas: ParcelaRecebimentoLinha[],
): number {
  const venda = num(obra?.valor_produto) + num(obra?.valor_servico);
  if (venda > 0) return venda;
  return parcelas.filter((p) => p.status !== "cancelado").reduce((s, p) => s + num(p.valor_previsto), 0);
}

/** soma por data e acumula em ordem: [[data, acumulado], ...] (datas iguais viram um ponto so) */
export function acumularPorData(eventos: { data: string; valor: number }[]): [string, number][] {
  const porData = new Map<string, number>();
  for (const e of eventos) porData.set(e.data, (porData.get(e.data) || 0) + e.valor);
  let acum = 0;
  return [...porData.keys()].sort().map((d) => {
    acum += porData.get(d)!;
    return [d, acum];
  });
}

export function montarCurvaAvanco(entrada: {
  avancos: AvancoLinha[];
  faturamentos: FaturamentoLinha[];
  familias: FamiliaEscopoLinha[];
  parcelas: ParcelaRecebimentoLinha[];
  valorVenda: number;
  hojeISO: string;
}): CurvaAvanco {
  const escopoTotal = entrada.familias.reduce((s, f) => s + num(f.valor_total_escopo), 0);
  const valorVenda = entrada.valorVenda;

  const fisicoPorData = new Map<string, number>();
  for (const a of entrada.avancos) {
    const d = iso(a.data_referencia);
    if (d) fisicoPorData.set(d, num(a.percentual)); // um por data (o banco garante); se vier repetido, vale o ultimo
  }
  const faturado = acumularPorData(
    entrada.faturamentos
      .map((f) => ({ data: iso(f.data_faturamento) || "", valor: num(f.valor_realizado) }))
      .filter((e) => e.data && e.valor !== 0),
  );
  const recebido = acumularPorData(
    entrada.parcelas
      .map((p) => ({ data: iso(p.data_realizada) || iso(p.data_prevista) || "", valor: num(p.valor_realizado) }))
      .filter((e) => e.data && e.valor !== 0),
  );

  const temFisico = fisicoPorData.size > 0;
  const temFaturado = escopoTotal > 0 && faturado.length > 0;
  const temRecebido = valorVenda > 0 && recebido.length > 0;

  const datas = new Set<string>([
    ...fisicoPorData.keys(),
    ...(temFaturado ? faturado.map(([d]) => d) : []),
    ...(temRecebido ? recebido.map(([d]) => d) : []),
  ]);
  if (!datas.size) return { pontos: [], escopoTotal, valorVenda, temFisico, temFaturado, temRecebido, maximo: 0 };
  const ordenadas = [...datas].sort();
  // a curva vai ate hoje (degrau final), para mostrar ha quanto tempo nada muda
  if (ordenadas[ordenadas.length - 1] < entrada.hojeISO) ordenadas.push(entrada.hojeISO);

  let iFat = 0;
  let iRec = 0;
  let acFat = 0;
  let acRec = 0;
  let ultimoFisico: number | null = null;
  let maximo = 0;
  const pontos: PontoCurva[] = ordenadas.map((d) => {
    while (iFat < faturado.length && faturado[iFat][0] <= d) acFat = faturado[iFat++][1];
    while (iRec < recebido.length && recebido[iRec][0] <= d) acRec = recebido[iRec++][1];
    const informado = fisicoPorData.has(d);
    if (informado) ultimoFisico = fisicoPorData.get(d)!;
    const p: PontoCurva = {
      data: d,
      fisico: ultimoFisico,
      faturado: temFaturado ? arred((acFat / escopoTotal) * 100) : null,
      recebido: temRecebido ? arred((acRec / valorVenda) * 100) : null,
      fisicoInformado: informado,
    };
    maximo = Math.max(maximo, p.fisico ?? 0, p.faturado ?? 0, p.recebido ?? 0);
    return p;
  });

  return { pontos, escopoTotal, valorVenda, temFisico, temFaturado, temRecebido, maximo };
}

// --------------------------------------------------------------------------------------------- formulario

/** ultimo avanco informado ANTES da data (o da mesma data e substituido, nao conta para o aviso de queda) */
export function avancoAnterior<T extends AvancoLinha>(avancos: T[], dataISO: string): T | null {
  let melhor: T | null = null;
  for (const a of avancos) {
    const d = iso(a.data_referencia);
    if (d && d < dataISO && (!melhor || d > melhor.data_referencia.slice(0, 10))) melhor = a;
  }
  return melhor;
}

export function avancoNaData<T extends AvancoLinha>(avancos: T[], dataISO: string): T | null {
  return avancos.find((a) => iso(a.data_referencia) === dataISO) ?? null;
}

/** o mais recente (maior data de referencia) */
export function ultimoAvanco<T extends AvancoLinha>(avancos: T[]): T | null {
  return avancos.reduce<T | null>((m, a) => (!m || a.data_referencia > m.data_referencia ? a : m), null);
}

/** le e valida o formulario "Informar avanço" (as mesmas regras da funcao do banco) */
export function validarAvanco(
  texto: string,
  dataISO: string,
  hojeISO: string,
): { percentual: number; erro: null } | { percentual: null; erro: string } {
  const n = lerNumero(texto, { medida: true });
  if (Number.isNaN(n)) return { percentual: null, erro: "Informe o percentual de avanço." };
  if (n < 0 || n > 100) return { percentual: null, erro: "Informe um avanço entre 0% e 100%." };
  if (!iso(dataISO)) return { percentual: null, erro: "Informe a data de referência." };
  if (dataISO > hojeISO) return { percentual: null, erro: "A data do avanço não pode ser futura." };
  return { percentual: arred(n), erro: null };
}

export function formatarPercentual(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return `${num(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
