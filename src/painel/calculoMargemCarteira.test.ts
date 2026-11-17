import { describe, expect, it } from "vitest";
import { calcularPanorama } from "../calculoRentabilidade";
import type { ObraRentabilidadeFamilia } from "../types";
import {
  calcularLinha,
  chaveIds,
  formatarPct,
  formatarPp,
  larguraBarra,
  margemErpDe,
  montarLinhas,
  ordenarLinhas,
  resumirCarteira,
  valorVendidoDe,
} from "./calculoMargemCarteira";

const fam = (idObra: string, codigo: string, v: Record<string, unknown> = {}) =>
  ({
    id: `${idObra}-${codigo}`,
    id_obra: idObra,
    codigo_projeto: codigo,
    eh_obra: false,
    custo_previsto: 0,
    custo_realizado: 0,
    previsoes_em_aberto: 0,
    pedidos_em_aberto: 0,
    ...v,
  }) as unknown as ObraRentabilidadeFamilia;

const obra = (id: string, codigo = id) => ({ id, codigo, nome: `Obra ${codigo}` });

describe("calcularLinha", () => {
  const familias = [
    fam("a", "2182", { eh_obra: true, custo_previsto: 999999, custo_realizado: 1000 }),
    fam("a", "2182.230", { custo_previsto: 100000, custo_realizado: 60000, previsoes_em_aberto: 30000 }),
    fam("a", "2182.520", { custo_previsto: 50000, custo_realizado: 45000, previsoes_em_aberto: 20000 }),
  ];

  it("com margem do ERP da exatamente o mesmo numero da aba Rentabilidade", () => {
    const restritos = { id_obra: "a", margem_prevista_erp: "64200.55", venda_sem_impostos_erp: "200000" };
    const l = calcularLinha(obra("a"), familias, 300000, restritos);
    const p = calcularPanorama(familias, 300000, { margem: 64200.55, vendaSemImpostos: 200000 });
    expect(l.semDado).toBeNull();
    expect(l.baseErp).toBe(true);
    expect(l.base).toBe(200000);
    expect(l.margemPrevista).toBe(p.margemOriginal);
    expect(l.margemAtual).toBe(p.margemAtual);
    expect(l.pctPrevista).toBe(p.rentabilidadeOriginal);
    expect(l.pctAtual).toBe(p.rentabilidadeAtual);
    expect(l.variacaoPp).toBe(p.delta);
    expect(l.variacaoValor).toBeCloseTo(p.resultadoProjetado, 6);
  });

  it("sem margem no ERP usa o valor vendido (mesmo fallback da aba)", () => {
    const l = calcularLinha(obra("a"), familias, 300000, { id_obra: "a", margem_prevista_erp: 0, venda_sem_impostos_erp: 200000 });
    const p = calcularPanorama(familias, 300000, null);
    expect(l.baseErp).toBe(false);
    expect(l.base).toBe(300000);
    expect(l.margemPrevista).toBe(p.margemOriginal);
    expect(l.pctAtual).toBe(p.rentabilidadeAtual);
  });

  it("obra sem rentabilidade importada fica sem dado", () => {
    expect(calcularLinha(obra("b"), [], 500000, null).semDado).toBe("sem_rentabilidade");
    // so familias zeradas: a aba mostra "Sem dados"
    expect(calcularLinha(obra("b"), [fam("b", "1.1")], 500000, null).semDado).toBe("sem_rentabilidade");
  });

  it("sem margem do ERP e sem valor vendido nao vira 0% nem NaN", () => {
    const l = calcularLinha(obra("a"), familias, 0, null);
    expect(l.semDado).toBe("sem_base");
    expect(Number.isNaN(l.pctAtual)).toBe(false);
  });
});

describe("conversoes", () => {
  it("margemErpDe exige margem e venda sem impostos", () => {
    expect(margemErpDe(null)).toBeNull();
    expect(margemErpDe({ id_obra: "x", margem_prevista_erp: null, venda_sem_impostos_erp: 10 })).toBeNull();
    expect(margemErpDe({ id_obra: "x", margem_prevista_erp: 5, venda_sem_impostos_erp: 0 })).toBeNull();
    expect(margemErpDe({ id_obra: "x", margem_prevista_erp: "5.5", venda_sem_impostos_erp: "10" })).toEqual({
      margem: 5.5,
      vendaSemImpostos: 10,
    });
  });
  it("valorVendidoDe soma produto e servico tolerando nulos", () => {
    expect(valorVendidoDe({ id: "x", valor_produto: "100.5", valor_servico: null })).toBe(100.5);
    expect(valorVendidoDe(undefined)).toBe(0);
  });
});

describe("carteira", () => {
  const obras = [obra("a", "2100"), obra("b", "2050"), obra("c", "2200")];
  const familias = [
    fam("a", "2100.1", { custo_previsto: 100, custo_realizado: 150 }), // estourou 50
    fam("b", "2050.1", { custo_previsto: 100, custo_realizado: 80 }), // sobrou 20
  ];
  const restritos = [
    { id_obra: "a", margem_prevista_erp: 300, venda_sem_impostos_erp: 1000 },
    { id_obra: "b", margem_prevista_erp: 100, venda_sem_impostos_erp: 1000 },
  ];
  const linhas = montarLinhas(obras, familias, [], restritos);

  it("monta uma linha por obra e deixa a sem dado marcada", () => {
    expect(linhas.map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(linhas[2].semDado).toBe("sem_rentabilidade");
    expect(linhas[0].margemAtual).toBe(250);
    expect(linhas[1].margemAtual).toBe(120);
  });

  it("totais ignoram obra sem dado e o % e sobre a soma das vendas", () => {
    const r = resumirCarteira(linhas);
    expect(r.obras).toBe(2);
    expect(r.margemPrevista).toBe(400);
    expect(r.margemAtual).toBe(370);
    expect(r.pctPrevista).toBe(20);
    expect(r.pctAtual).toBeCloseTo(18.5, 10);
    expect(r.variacaoPp).toBeCloseTo(-1.5, 10);
    expect(r.variacaoValor).toBe(-30);
  });

  it("carteira vazia nao divide por zero", () => {
    const r = resumirCarteira([]);
    expect(r.pctAtual).toBe(0);
    expect(r.variacaoPp).toBe(0);
  });

  it("ordena pior variacao primeiro e deixa sem dado no fim", () => {
    expect(ordenarLinhas(linhas, "variacao", "asc").map((l) => l.id)).toEqual(["a", "b", "c"]);
    expect(ordenarLinhas(linhas, "variacao", "desc").map((l) => l.id)).toEqual(["b", "a", "c"]);
    expect(ordenarLinhas(linhas, "codigo", "asc").map((l) => l.codigo)).toEqual(["2050", "2100", "2200"]);
    expect(ordenarLinhas(linhas, "codigo", "desc").map((l) => l.codigo)).toEqual(["2100", "2050", "2200"]);
    expect(ordenarLinhas(linhas, "margemAtual", "desc").map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
});

describe("apoio da tela", () => {
  it("chaveIds nao muda com a ordem nem com array novo", () => {
    expect(chaveIds([{ id: "b" }, { id: "a" }])).toBe(chaveIds([{ id: "a" }, { id: "b" }, { id: "a" }]));
  });
  it("larguraBarra protege divisao por zero", () => {
    expect(larguraBarra(2, 0)).toBe(0);
    expect(larguraBarra(-2, 4)).toBe(50);
    expect(larguraBarra(NaN, 4)).toBe(0);
  });
  it("formata p.p. com sinal em texto", () => {
    expect(formatarPp(-1.54)).toBe("−1,5 p.p.");
    expect(formatarPp(2)).toBe("+2,0 p.p.");
    expect(formatarPp(0.01)).toBe("0,0 p.p.");
    expect(formatarPct(NaN)).toBe("0%");
  });
});
