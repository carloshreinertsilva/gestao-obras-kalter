import type { ObraRentabilidadeFamilia } from "./types";

// Conta da aba Rentabilidade (separada do componente para ter teste automatico).
// O robo usa a mesma regra na foto mensal (robo-sync-erp/src/historico_rentabilidade.py).

const num = (v: unknown) => Number(v || 0);

// Familia sem nenhum valor (previsto, realizado ou em aberto) nao entra na tela - so ocupa
// espaco e nao altera total nenhum. Familia zerada mas com alerta de verba (ex.: "sem verba",
// material a caminho) aparece.
export function familiasVisiveis(
  familias: ObraRentabilidadeFamilia[],
  nivelAlerta: (codigoProjeto: string) => string = () => "ok",
) {
  return familias.filter(
    (f) =>
      !f.eh_obra &&
      ([f.custo_previsto, f.custo_realizado, f.previsoes_em_aberto, f.pedidos_em_aberto].some((v) => Math.abs(num(v)) >= 0.005) ||
        nivelAlerta(f.codigo_projeto || "") !== "ok"),
  );
}

export interface Panorama {
  custoPrevisto: number;
  custoRealizado: number;
  previsoesEmAberto: number;
  resultadoProjetado: number;
  baseErp: boolean;
  margemOriginal: number;
  margemAtual: number;
  rentabilidadeOriginal: number;
  rentabilidadeAtual: number;
  delta: number;
}

export function calcularPanorama(
  familias: ObraRentabilidadeFamilia[],
  valorVendido: number,
  margemErp: { margem: number; vendaSemImpostos: number } | null,
): Panorama {
  // Custo Previsto vem da SOMA das familias, nao do campo "topo" do ERP (linha da obra):
  // o cadastro no ERP pode ficar dessincronizado, e a soma bate com a tabela da tela.
  const custoPrevisto = familias.filter((f) => !f.eh_obra).reduce((a, f) => a + num(f.custo_previsto), 0);
  const custoRealizado = familias.reduce((a, f) => a + num(f.custo_realizado), 0);
  const previsoesEmAberto = familias.reduce((a, f) => a + num(f.previsoes_em_aberto), 0);
  const resultadoProjetado = custoPrevisto - custoRealizado - previsoesEmAberto;
  // Com a margem do orcamento no ERP: % sobre a venda sem impostos (regra do BI / calculadora).
  // Sem ela (obra sem margem cadastrada ou pedido sem venda sem impostos): venda - custo sobre o vendido.
  const baseErp = margemErp !== null && margemErp.margem !== 0 && margemErp.vendaSemImpostos > 0;
  const margemOriginal = baseErp ? margemErp!.margem : valorVendido - custoPrevisto;
  const margemAtual = margemOriginal + resultadoProjetado;
  const base = baseErp ? margemErp!.vendaSemImpostos : valorVendido;
  const rentabilidadeOriginal = base > 0 ? (margemOriginal / base) * 100 : 0;
  const rentabilidadeAtual = base > 0 ? (margemAtual / base) * 100 : 0;
  return {
    custoPrevisto,
    custoRealizado,
    previsoesEmAberto,
    resultadoProjetado,
    baseErp,
    margemOriginal,
    margemAtual,
    rentabilidadeOriginal,
    rentabilidadeAtual,
    delta: rentabilidadeAtual - rentabilidadeOriginal,
  };
}
