import { describe, expect, it } from "vitest";
import {
  acumularPorData,
  avancoAnterior,
  avancoNaData,
  formatarPercentual,
  montarCurvaAvanco,
  ultimoAvanco,
  validarAvanco,
  valorVendaObra,
} from "./calculoAvanco";

const HOJE = "2026-11-16";

describe("acumularPorData", () => {
  it("soma datas iguais num ponto so e acumula em ordem", () => {
    expect(
      acumularPorData([
        { data: "2026-03-10", valor: 50 },
        { data: "2026-01-05", valor: 100 },
        { data: "2026-03-10", valor: 25 },
      ]),
    ).toEqual([
      ["2026-01-05", 100],
      ["2026-03-10", 175],
    ]);
  });
  it("vazio", () => {
    expect(acumularPorData([])).toEqual([]);
  });
});

describe("valorVendaObra", () => {
  it("usa produto + servico da obra", () => {
    expect(valorVendaObra({ valor_produto: "1000", valor_servico: 500 }, [])).toBe(1500);
  });
  it("sem valor na obra: soma das parcelas previstas nao canceladas", () => {
    expect(
      valorVendaObra({ valor_produto: 0, valor_servico: null }, [
        { data_prevista: "2026-01-01", data_realizada: null, valor_previsto: 300, valor_realizado: 0 },
        { data_prevista: "2026-02-01", data_realizada: null, valor_previsto: 200, valor_realizado: 0, status: "cancelado" },
      ]),
    ).toBe(300);
  });
  it("sem acesso ao valor de venda (os dois null): 0, sem cair nas parcelas", () => {
    expect(
      valorVendaObra({ valor_produto: null, valor_servico: null }, [
        { data_prevista: "2026-01-01", data_realizada: null, valor_previsto: 300, valor_realizado: 0 },
      ]),
    ).toBe(0);
  });
});

describe("montarCurvaAvanco", () => {
  const base = {
    avancos: [
      { data_referencia: "2026-02-01", percentual: "10" },
      { data_referencia: "2026-04-01", percentual: 35.5 },
    ],
    faturamentos: [
      { data_faturamento: "2026-01-15", valor_realizado: 200 },
      { data_faturamento: "2026-04-01", valor_realizado: "300" },
      { data_faturamento: "2026-04-01", valor_realizado: 100 },
    ],
    familias: [{ valor_total_escopo: 1500 }, { valor_total_escopo: "500" }],
    parcelas: [
      { data_prevista: "2026-03-01", data_realizada: "2026-03-05", valor_previsto: 1000, valor_realizado: 1000, status: "pago" },
      { data_prevista: "2026-06-01", data_realizada: null, valor_previsto: 1000, valor_realizado: 0, status: "a_vencer" },
    ],
    valorVenda: 2000,
    hojeISO: HOJE,
  };

  it("tres series acumuladas nas datas de qualquer uma delas, ate hoje", () => {
    const c = montarCurvaAvanco(base);
    expect(c.escopoTotal).toBe(2000);
    expect(c.pontos).toEqual([
      { data: "2026-01-15", fisico: null, faturado: 10, recebido: 0, fisicoInformado: false },
      { data: "2026-02-01", fisico: 10, faturado: 10, recebido: 0, fisicoInformado: true },
      { data: "2026-03-05", fisico: 10, faturado: 10, recebido: 50, fisicoInformado: false },
      { data: "2026-04-01", fisico: 35.5, faturado: 30, recebido: 50, fisicoInformado: true },
      { data: HOJE, fisico: 35.5, faturado: 30, recebido: 50, fisicoInformado: false },
    ]);
    expect(c.temFisico && c.temFaturado && c.temRecebido).toBe(true);
    expect(c.maximo).toBe(50);
  });

  it("escopo zero: sem serie de faturado e sem dividir por zero", () => {
    const c = montarCurvaAvanco({ ...base, familias: [{ valor_total_escopo: 0 }] });
    expect(c.temFaturado).toBe(false);
    expect(c.pontos.every((p) => p.faturado === null)).toBe(true);
    expect(c.pontos.some((p) => p.data === "2026-01-15")).toBe(false);
    expect(c.pontos.every((p) => [p.fisico, p.recebido].every((v) => v === null || Number.isFinite(v)))).toBe(true);
  });

  it("venda zero: sem serie de recebido", () => {
    const c = montarCurvaAvanco({ ...base, valorVenda: 0 });
    expect(c.temRecebido).toBe(false);
    expect(c.pontos.every((p) => p.recebido === null)).toBe(true);
  });

  it("sem avanco informado: so as curvas financeiras", () => {
    const c = montarCurvaAvanco({ ...base, avancos: [] });
    expect(c.temFisico).toBe(false);
    expect(c.pontos.every((p) => p.fisico === null)).toBe(true);
    expect(c.pontos.length).toBeGreaterThan(0);
  });

  it("nada de nada: sem pontos", () => {
    const c = montarCurvaAvanco({ ...base, avancos: [], faturamentos: [], parcelas: [] });
    expect(c.pontos).toEqual([]);
  });

  it("recebimento sem data realizada cai na data prevista; passa de 100% sem cortar", () => {
    const c = montarCurvaAvanco({
      ...base,
      avancos: [],
      faturamentos: [],
      parcelas: [{ data_prevista: "2026-05-01", data_realizada: null, valor_previsto: 0, valor_realizado: 2100 }],
    });
    expect(c.pontos[0]).toMatchObject({ data: "2026-05-01", recebido: 105 });
    expect(c.maximo).toBe(105);
  });

  it("aceita data com hora", () => {
    const c = montarCurvaAvanco({ ...base, avancos: [{ data_referencia: "2026-02-01T00:00:00", percentual: 5 }], faturamentos: [], parcelas: [] });
    expect(c.pontos[0]).toMatchObject({ data: "2026-02-01", fisico: 5 });
  });
});

describe("formulario", () => {
  const lista = [
    { data_referencia: "2026-10-01", percentual: 40 },
    { data_referencia: "2026-11-16", percentual: 55 },
    { data_referencia: "2026-09-01", percentual: 20 },
  ];
  it("anterior ignora a mesma data (substituida) e pega a mais recente antes", () => {
    expect(avancoAnterior(lista, "2026-11-16")?.percentual).toBe(40);
    expect(avancoAnterior(lista, "2026-09-01")).toBeNull();
    expect(avancoNaData(lista, "2026-11-16")?.percentual).toBe(55);
    expect(ultimoAvanco(lista)?.percentual).toBe(55);
    expect(ultimoAvanco([])).toBeNull();
  });
  it("valida percentual e data", () => {
    expect(validarAvanco("45,5", HOJE, HOJE)).toEqual({ percentual: 45.5, erro: null });
    expect(validarAvanco("45.5", HOJE, HOJE)).toEqual({ percentual: 45.5, erro: null });
    expect(validarAvanco("100", HOJE, HOJE).erro).toBeNull();
    expect(validarAvanco("0", HOJE, HOJE).erro).toBeNull();
    expect(validarAvanco("100,01", HOJE, HOJE).erro).toMatch(/entre 0% e 100%/);
    expect(validarAvanco("-1", HOJE, HOJE).erro).toMatch(/entre 0% e 100%/);
    expect(validarAvanco("", HOJE, HOJE).erro).toMatch(/Informe o percentual/);
    expect(validarAvanco("30", "2026-11-17", HOJE).erro).toMatch(/futura/);
    expect(validarAvanco("30", "", HOJE).erro).toMatch(/data/);
  });
  it("formata percentual", () => {
    expect(formatarPercentual(35.5)).toBe("35,5%");
    expect(formatarPercentual("100.00")).toBe("100%");
    expect(formatarPercentual(null)).toBe("—");
  });
});
