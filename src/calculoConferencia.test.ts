import { describe, expect, it } from "vitest";
import {
  aplicarSugestao,
  calcularSugestao,
  compararItens,
  pesoMuitoDiferente,
  temSugestao,
  valorBase,
  type BaseExportacao,
  type BaseSfAnterior,
} from "./calculoConferencia";

const sf = (numero: number, peso: [number, number] | null, itens: [string, number, number | null][], aprovado = "2026-11-12T15:00:00Z"): BaseSfAnterior => ({
  numero,
  aprovado_em: aprovado,
  peso_bruto: peso?.[0] ?? null,
  peso_liquido: peso?.[1] ?? null,
  volumes: null,
  itens: itens.map(([codigo_material, quantidade, volumes]) => ({ codigo_material, quantidade, volumes })),
});
const item = (sequencia: number, codigo_material: string, quantidade: number) => ({ sequencia, codigo_material, quantidade });

describe("valorBase", () => {
  it("numero do banco nao passa pelo texto (1.234 nao vira 1234)", () => {
    expect(valorBase(1.234)).toBe(1.234);
    expect(valorBase("347,7")).toBe(347.7);
    expect(valorBase(null)).toBeNull();
    expect(valorBase("")).toBeNull();
    expect(valorBase("abc")).toBeNull();
  });
});

describe("compararItens", () => {
  const m = (...p: [string, number][]) => new Map(p);
  it("identico, proporcional ou nada", () => {
    expect(compararItens(m(["A", 1], ["B", 0.5]), m(["A", 1], ["B", 0.5]))).toEqual({ tipo: "identico", fator: 1 });
    expect(compararItens(m(["A", 0.5], ["B", 0.25]), m(["A", 1], ["B", 0.5]))).toEqual({ tipo: "proporcional", fator: 0.5 });
    expect(compararItens(m(["A", 0.5], ["B", 0.5]), m(["A", 1], ["B", 0.5]))).toBeNull(); // razoes diferentes
    expect(compararItens(m(["A", 1]), m(["A", 1], ["B", 1]))).toBeNull(); // conjunto diferente
    expect(compararItens(m(), m())).toBeNull();
  });
});

describe("calcularSugestao", () => {
  it("sem base: vazio", () => {
    const s = calcularSugestao([item(1, "A", 1)], { sfs: [], exportacao: null });
    expect(temSugestao(s)).toBe(false);
    expect(temSugestao(calcularSugestao([item(1, "A", 1)], null))).toBe(false);
  });

  it("conferencia anterior com os mesmos itens e quantidades: copia peso e volumes", () => {
    const s = calcularSugestao([item(1, "A", 1), item(2, "B", 0.5)], { sfs: [sf(939, [500, 480], [["A", 1, 3], ["B", 0.5, 2]])], exportacao: null });
    expect(s.peso).toMatchObject({ bruto: 500, liquido: 480, confianca: "identico" });
    expect(s.peso?.fonte).toBe("conferência da SF 939 de 12/11/2026, mesmos itens e quantidades");
    expect(s.volumes).toEqual({ 1: { volumes: 3, fonte: "SF 939" }, 2: { volumes: 2, fonte: "SF 939" } });
  });

  it("mesmos itens em outra quantidade: peso proporcional, volumes nao", () => {
    const s = calcularSugestao([item(1, "A", 0.5), item(2, "B", 0.25)], { sfs: [sf(939, [500, 480], [["A", 1, 3], ["B", 0.5, 2]])], exportacao: null });
    expect(s.peso).toMatchObject({ bruto: 250, liquido: 240, confianca: "proporcional" });
    expect(s.peso?.fonte).toContain("proporcional à quantidade (0,5×)");
    expect(s.volumes).toEqual({});
  });

  it("quantidades em razoes diferentes: sem peso, mas volume do item que repete a quantidade", () => {
    const s = calcularSugestao([item(1, "A", 1), item(2, "B", 0.2)], { sfs: [sf(939, [500, 480], [["A", 1, 3], ["B", 0.5, 2]])], exportacao: null });
    expect(s.peso).toBeNull();
    expect(s.volumes).toEqual({ 1: { volumes: 3, fonte: "SF 939" } });
  });

  it("prefere conferencia identica, mesmo mais antiga, a uma proporcional mais recente", () => {
    const recente = sf(1016, [6000, 5800], [["A", 2, null]], "2026-11-16T12:00:00Z");
    const antiga = sf(939, [500, 480], [["A", 1, 4]], "2026-11-01T12:00:00Z");
    const s = calcularSugestao([item(1, "A", 1)], { sfs: [recente, antiga], exportacao: null });
    expect(s.peso).toMatchObject({ bruto: 500, confianca: "identico" });
    expect(s.volumes[1]).toEqual({ volumes: 4, fonte: "SF 939" });
  });

  it("o mesmo material em duas sequencias soma as quantidades", () => {
    const s = calcularSugestao([item(1, "A", 0.4), item(9, "A", 0.6)], { sfs: [sf(498, [1000, 1000], [["A", 1, 9]])], exportacao: null });
    expect(s.peso).toMatchObject({ bruto: 1000, confianca: "identico" });
  });

  const exp: BaseExportacao = {
    atualizado_em: "2026-11-13T13:11:32Z",
    qtd_volumes: 33,
    itens: [
      { codigo: "A", quantidade: 1, peso_bruto: 414.36, peso_liq: 347.7 },
      { codigo: "B", quantidade: 1, peso_bruto: 3494.96, peso_liq: 3428.3 },
    ],
  };

  it("packing list da exportacao: pedido inteiro = pesos somados e total de volumes", () => {
    const s = calcularSugestao([item(2, "A", 1), item(3, "B", 1)], { sfs: [], exportacao: exp });
    expect(s.peso).toMatchObject({ bruto: 3909.32, liquido: 3776, confianca: "identico" });
    expect(s.peso?.fonte).toBe("packing list da exportação (atualizada em 13/11/2026), mesmas quantidades");
    expect(s.volumesTotalExportacao).toEqual({ volumes: 33, fonte: "packing list da exportação (atualizada em 13/11/2026)" });
    expect(s.volumes).toEqual({});
  });

  it("packing list com parte do pedido: peso proporcional e sem total de volumes", () => {
    const s = calcularSugestao([item(2, "A", 0.5)], { sfs: [], exportacao: exp });
    expect(s.peso).toMatchObject({ bruto: 207.18, liquido: 173.85, confianca: "proporcional" });
    expect(s.volumesTotalExportacao).toBeNull();
  });

  it("item sem peso na packing list: nao sugere peso pela exportacao", () => {
    const s = calcularSugestao([item(2, "A", 1), item(4, "C", 1)], { sfs: [], exportacao: exp });
    expect(s.peso).toBeNull();
  });

  it("conferencia identica ganha da packing list; packing identica ganha de conferencia proporcional", () => {
    const base = { exportacao: exp };
    const igual = calcularSugestao([item(2, "A", 1), item(3, "B", 1)], { ...base, sfs: [sf(531, [4591, 4502], [["A", 1, 42], ["B", 1, 0]])] });
    expect(igual.peso).toMatchObject({ bruto: 4591, confianca: "identico" });
    const prop = calcularSugestao([item(2, "A", 1), item(3, "B", 1)], { ...base, sfs: [sf(531, [4591, 4502], [["A", 0.5, 42], ["B", 0.5, 0]])] });
    expect(prop.peso?.fonte).toContain("packing list");
  });

  it("item com quantidade zero (tirado na conferencia) nao conta", () => {
    const s = calcularSugestao([item(1, "A", 1), item(2, "B", 0)], { sfs: [sf(939, [500, 480], [["A", 1, 3]])], exportacao: null });
    expect(s.peso).toMatchObject({ bruto: 500, confianca: "identico" });
    expect(Object.keys(s.volumes)).toEqual(["1"]);
  });
});

describe("aplicarSugestao", () => {
  const sug = calcularSugestao([item(1, "A", 1), item(2, "B", 0.5)], { sfs: [sf(939, [500, 480.5], [["A", 1, 3], ["B", 0.5, 2]])], exportacao: null });

  it("preenche so os campos vazios e aponta os que ja tem outro valor", () => {
    const r = aplicarSugestao({ pesoBruto: "", pesoLiquido: "300", volumes: { 1: "3" } }, sug, false);
    expect(r.campos).toEqual({ pesoBruto: "500,00", pesoLiquido: "300", volumes: { 1: "3", 2: "2" } });
    expect(r.preenchidos).toBe(2);
    expect(r.conflitos).toEqual(["peso líquido"]);
  });

  it("com confirmacao substitui o que estava digitado", () => {
    const r = aplicarSugestao({ pesoBruto: "1", pesoLiquido: "300", volumes: { 1: "9" } }, sug, true, (s) => `item ${s} (A)`);
    expect(r.campos).toEqual({ pesoBruto: "500,00", pesoLiquido: "480,50", volumes: { 1: "3", 2: "2" } });
    expect(r.conflitos).toEqual(["peso bruto", "peso líquido", "volumes do item 1 (A)"]);
  });

  it("valor igual ao sugerido (escrito de outro jeito) nao e conflito", () => {
    const r = aplicarSugestao({ pesoBruto: "500", pesoLiquido: "480,5", volumes: { 1: "3", 2: "2" } }, sug, false);
    expect(r.conflitos).toEqual([]);
    expect(r.preenchidos).toBe(0);
  });
});

describe("pesoMuitoDiferente", () => {
  it("mais de 30% de diferenca pergunta; sem sugestao nao", () => {
    expect(pesoMuitoDiferente(850, 120)).toBe(true);
    expect(pesoMuitoDiferente(60, 120)).toBe(true);
    expect(pesoMuitoDiferente(150, 120)).toBe(false); // 25%
    expect(pesoMuitoDiferente(156, 120)).toBe(false); // exatamente 30%
    expect(pesoMuitoDiferente(850, null)).toBe(false);
    expect(pesoMuitoDiferente(Number.NaN, 120)).toBe(false);
  });
});
