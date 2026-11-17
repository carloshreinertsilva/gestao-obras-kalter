import { calcularPanorama, familiasVisiveis } from "../calculoRentabilidade";
import type { ObraRentabilidadeFamilia } from "../types";

// Margem prevista x atual de todas as obras do Painel (item B1, pacote 2).
// A conta por obra e a MESMA da aba Rentabilidade (calcularPanorama): o numero do Painel tem que
// bater com o da obra centavo a centavo. Aqui so junta as obras, totaliza a carteira e ordena.

const num = (v: unknown) => Number(v || 0);

export interface ObraBase {
  id: string;
  codigo: string;
  nome: string;
}

// Linha de obras_valores_restritos (so o que a conta usa)
export interface ValoresRestritos {
  id_obra: string;
  margem_prevista_erp: number | string | null;
  venda_sem_impostos_erp: number | string | null;
}

// Valor vendido da obra (produto + servico, igual ao painel da obra), lido de obras_valores_venda
export interface ValoresVenda {
  id: string;
  valor_produto: number | string | null;
  valor_servico: number | string | null;
}

export type MotivoSemDado = "sem_rentabilidade" | "sem_base";

export interface LinhaMargem {
  id: string;
  codigo: string;
  nome: string;
  semDado: MotivoSemDado | null;
  baseErp: boolean;
  // base do % (venda sem impostos do ERP; sem margem no ERP, o valor vendido - como na aba Rentabilidade)
  base: number;
  margemPrevista: number;
  margemAtual: number;
  pctPrevista: number;
  pctAtual: number;
  variacaoPp: number;
  variacaoValor: number;
}

export interface ResumoCarteira {
  obras: number;
  base: number;
  margemPrevista: number;
  margemAtual: number;
  pctPrevista: number;
  pctAtual: number;
  variacaoPp: number;
  variacaoValor: number;
}

// Mesma conversao da aba Rentabilidade (RentabilidadeProjeto.tsx): so vale com margem e venda sem impostos.
export function margemErpDe(v: ValoresRestritos | undefined | null) {
  if (!v) return null;
  const margem = num(v.margem_prevista_erp);
  const vendaSemImpostos = num(v.venda_sem_impostos_erp);
  return margem !== 0 && vendaSemImpostos > 0 ? { margem, vendaSemImpostos } : null;
}

export function valorVendidoDe(v: ValoresVenda | undefined | null) {
  if (!v) return 0;
  return (Number(v.valor_produto) || 0) + (Number(v.valor_servico) || 0);
}

export function calcularLinha(
  obra: ObraBase,
  familias: ObraRentabilidadeFamilia[],
  valorVendido: number,
  restritos: ValoresRestritos | undefined | null,
): LinhaMargem {
  const vazia = (semDado: MotivoSemDado): LinhaMargem => ({
    ...obra,
    semDado,
    baseErp: false,
    base: 0,
    margemPrevista: 0,
    margemAtual: 0,
    pctPrevista: 0,
    pctAtual: 0,
    variacaoPp: 0,
    variacaoValor: 0,
  });
  // Mesmo criterio da aba: sem linha da obra e sem familia com valor = "Sem dados de rentabilidade"
  if (!familias.some((f) => f.eh_obra) && familiasVisiveis(familias).length === 0) return vazia("sem_rentabilidade");
  const margemErp = margemErpDe(restritos);
  const p = calcularPanorama(familias, valorVendido, margemErp);
  const base = p.baseErp ? margemErp!.vendaSemImpostos : valorVendido;
  // sem margem no ERP e sem valor vendido o % sairia 0 e a margem = -custo: nao e numero util para ranking
  if (!(base > 0)) return vazia("sem_base");
  return {
    ...obra,
    semDado: null,
    baseErp: p.baseErp,
    base,
    margemPrevista: p.margemOriginal,
    margemAtual: p.margemAtual,
    pctPrevista: p.rentabilidadeOriginal,
    pctAtual: p.rentabilidadeAtual,
    variacaoPp: p.delta,
    variacaoValor: p.margemAtual - p.margemOriginal,
  };
}

export function montarLinhas(
  obras: ObraBase[],
  familias: ObraRentabilidadeFamilia[],
  vendas: ValoresVenda[],
  restritos: ValoresRestritos[],
): LinhaMargem[] {
  const famPorObra = new Map<string, ObraRentabilidadeFamilia[]>();
  for (const f of familias) {
    const id = f.id_obra || "";
    if (!famPorObra.has(id)) famPorObra.set(id, []);
    famPorObra.get(id)!.push(f);
  }
  const vendaPorObra = new Map(vendas.map((v) => [v.id, v]));
  const restPorObra = new Map(restritos.map((r) => [r.id_obra, r]));
  return obras.map((o) =>
    calcularLinha(o, famPorObra.get(o.id) || [], valorVendidoDe(vendaPorObra.get(o.id)), restPorObra.get(o.id)),
  );
}

// Totais da carteira: soma dos R$ e % sobre a soma das bases (media ponderada pela venda, nao media dos %).
export function resumirCarteira(linhas: LinhaMargem[]): ResumoCarteira {
  const validas = linhas.filter((l) => !l.semDado);
  const base = validas.reduce((a, l) => a + l.base, 0);
  const margemPrevista = validas.reduce((a, l) => a + l.margemPrevista, 0);
  const margemAtual = validas.reduce((a, l) => a + l.margemAtual, 0);
  const pctPrevista = base > 0 ? (margemPrevista / base) * 100 : 0;
  const pctAtual = base > 0 ? (margemAtual / base) * 100 : 0;
  return {
    obras: validas.length,
    base,
    margemPrevista,
    margemAtual,
    pctPrevista,
    pctAtual,
    variacaoPp: pctAtual - pctPrevista,
    variacaoValor: margemAtual - margemPrevista,
  };
}

export type ColunaOrdem = "codigo" | "margemAtual" | "variacao";
export type Direcao = "asc" | "desc";

const porCodigo = (a: LinhaMargem, b: LinhaMargem) =>
  a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true });

// Obra sem dado vai sempre para o fim, qualquer que seja a ordem escolhida.
export function ordenarLinhas(linhas: LinhaMargem[], coluna: ColunaOrdem, direcao: Direcao): LinhaMargem[] {
  const sinal = direcao === "asc" ? 1 : -1;
  return [...linhas].sort((a, b) => {
    if (!!a.semDado !== !!b.semDado) return a.semDado ? 1 : -1;
    if (a.semDado && b.semDado) return porCodigo(a, b);
    let cmp = 0;
    if (coluna === "codigo") cmp = porCodigo(a, b);
    else if (coluna === "margemAtual") cmp = a.pctAtual - b.pctAtual;
    else cmp = a.variacaoPp - b.variacaoPp;
    return cmp * sinal || porCodigo(a, b);
  });
}

// Chave estavel para o efeito de busca: o pai re-renderiza a cada 60 s com um array novo.
export function chaveIds(obras: { id: string }[]) {
  return [...new Set(obras.map((o) => o.id))].sort().join(",");
}

// Largura da barrinha (0 a 100) proporcional a maior variacao da lista; protege divisao por zero.
export function larguraBarra(variacaoPp: number, maiorVariacao: number) {
  if (!(maiorVariacao > 0) || !Number.isFinite(variacaoPp)) return 0;
  return Math.min(100, (Math.abs(variacaoPp) / maiorVariacao) * 100);
}

export function formatarPp(v: number) {
  const x = Number.isFinite(v) ? v : 0;
  const txt = Math.abs(x).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (txt === "0,0") return "0,0 p.p.";
  return `${x < 0 ? "−" : "+"}${txt} p.p.`;
}

export function formatarPct(v: number) {
  const x = Number.isFinite(v) ? v : 0;
  return `${x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
