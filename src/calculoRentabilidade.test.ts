import { describe, expect, it } from "vitest";
import { calcularPanorama, familiasVisiveis } from "./calculoRentabilidade";
import type { ObraRentabilidadeFamilia } from "./types";

const fam = (codigo: string, v: Record<string, unknown> = {}) =>
  ({
    codigo_projeto: codigo,
    descricao: codigo,
    eh_obra: false,
    custo_previsto: 0,
    custo_realizado: 0,
    previsoes_em_aberto: 0,
    pedidos_em_aberto: 0,
    ...v,
  }) as unknown as ObraRentabilidadeFamilia;

describe("calcularPanorama", () => {
  // linha-topo da obra com previsto "dessincronizado" (nao deve entrar no previsto)
  const familias = [
    fam("2182", { eh_obra: true, custo_previsto: 999999, custo_realizado: 1000 }),
    fam("2182.230", { custo_previsto: 100000, custo_realizado: 60000, previsoes_em_aberto: 30000 }),
    fam("2182.520", { custo_previsto: 50000, custo_realizado: 45000, previsoes_em_aberto: 20000 }),
  ];

  it("soma o previsto so das familias e o realizado/previsoes de todas as linhas", () => {
    const p = calcularPanorama(familias, 300000, null);
    expect(p.custoPrevisto).toBe(150000);
    expect(p.custoRealizado).toBe(106000);
    expect(p.previsoesEmAberto).toBe(50000);
    expect(p.resultadoProjetado).toBe(150000 - 106000 - 50000);
  });

  it("sem margem do ERP: margem = vendido - previsto, % sobre o vendido", () => {
    const p = calcularPanorama(familias, 300000, null);
    expect(p.baseErp).toBe(false);
    expect(p.margemOriginal).toBe(150000);
    expect(p.rentabilidadeOriginal).toBeCloseTo(50, 6);
    expect(p.margemAtual).toBe(150000 - 6000);
    expect(p.rentabilidadeAtual).toBeCloseTo(48, 6);
    expect(p.delta).toBeCloseTo(-2, 6);
  });

  it("com margem do ERP: % sobre a venda sem impostos (igual ao BI; obra 2182 = 32,1%)", () => {
    const p = calcularPanorama([fam("2182.230")], 4950000, { margem: 1531882.37, vendaSemImpostos: 4769325 });
    expect(p.baseErp).toBe(true);
    expect(p.rentabilidadeOriginal.toFixed(1)).toBe("32.1");
  });

  it("margem zerada ou venda sem impostos zerada no ERP volta para a regra antiga", () => {
    expect(calcularPanorama(familias, 300000, { margem: 0, vendaSemImpostos: 100 }).baseErp).toBe(false);
    expect(calcularPanorama(familias, 300000, { margem: 10, vendaSemImpostos: 0 }).baseErp).toBe(false);
  });

  it("obra sem valor vendido nao divide por zero", () => {
    const p = calcularPanorama(familias, 0, null);
    expect(p.rentabilidadeOriginal).toBe(0);
    expect(p.rentabilidadeAtual).toBe(0);
  });

  it("valores vindos como texto ou nulos do banco sao tratados como numero", () => {
    const p = calcularPanorama([fam("1.1", { custo_previsto: "100.50", custo_realizado: null })], 0, null);
    expect(p.custoPrevisto).toBe(100.5);
    expect(p.custoRealizado).toBe(0);
  });
});

describe("familiasVisiveis", () => {
  const familias = [
    fam("2182", { eh_obra: true, custo_previsto: 10 }),
    fam("2182.230", { custo_previsto: 10 }),
    fam("2182.240"),
    fam("2182.250", { pedidos_em_aberto: 0.004 }),
    fam("2182.260"),
  ];

  it("esconde a linha da obra e familias zeradas", () => {
    expect(familiasVisiveis(familias).map((f) => f.codigo_projeto)).toEqual(["2182.230"]);
  });

  it("mostra familia zerada que tem alerta de verba", () => {
    const nivel = (cod: string) => (cod === "2182.260" ? "sem_verba" : "ok");
    expect(familiasVisiveis(familias, nivel).map((f) => f.codigo_projeto)).toEqual(["2182.230", "2182.260"]);
  });
});
