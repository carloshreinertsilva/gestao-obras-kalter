import { describe, expect, it } from "vitest";
import { formatarNumero, lerNumero, normalizarTexto } from "./numero";

describe("lerNumero", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["15.000,5", 15000.5],
    ["1,5", 1.5],
    [",5", 0.5],
    ["1.234.567", 1234567],
    ["1.234.567,89", 1234567.89],
    ["15.000", 15000],
    ["1.500", 1500],
    ["999.999", 999999],
    ["4.50", 4.5],
    ["850.5", 850.5],
    ["850.00", 850],
    ["1234.567", 1234.567], // 4 digitos antes do ponto: decimal
    ["0.500", 0.5], // zero a esquerda nao e grupo de milhar
    ["1234", 1234],
    ["0", 0],
    ["0,00", 0],
    ["R$ 1.234,56", 1234.56],
    ["R$1.234,56", 1234.56],
    ["  12,5  ", 12.5],
    ["1 234,56", 1234.56],
    ["120 km", 120],
    ["850,5 kg", 850.5],
    ["2,5 m³", 2.5],
    ["10%", 10],
  ])("%s -> %s", (texto, esperado) => {
    expect(lerNumero(texto)).toBe(esperado);
  });

  it("negativos", () => {
    expect(lerNumero("-1.234,56")).toBe(-1234.56);
    expect(lerNumero("-15.000")).toBe(-15000);
    expect(lerNumero("-4.50")).toBe(-4.5);
    expect(lerNumero("R$ -10,00")).toBe(-10);
    expect(Object.is(lerNumero("-0"), 0)).toBe(true);
  });

  it("vazio ou invalido -> NaN (nunca 0 em silencio)", () => {
    for (const t of ["", "   ", "R$", "abc", "-", ".", ",", "1,2,3", "1-2", "--5", null, undefined]) {
      expect(lerNumero(t as string)).toBeNaN();
    }
  });

  it("modo medida: ponto unico e sempre decimal", () => {
    const m = { medida: true };
    expect(lerNumero("1.200", m)).toBe(1.2);
    expect(lerNumero("1.20", m)).toBe(1.2);
    expect(lerNumero("15.000", m)).toBe(15);
    expect(lerNumero("1,20", m)).toBe(1.2);
    expect(lerNumero("1.234,5", m)).toBe(1234.5); // com virgula vale a regra geral
    expect(lerNumero("1.234.567", m)).toBe(1234567); // varios pontos: milhar
    expect(lerNumero("2 m", m)).toBe(2);
    expect(lerNumero("", m)).toBeNaN();
  });
});

describe("formatarNumero", () => {
  it("pt-BR com casas configuraveis", () => {
    expect(formatarNumero(15000)).toBe("15.000,00");
    expect(formatarNumero(4.5)).toBe("4,50");
    expect(formatarNumero(1234.5678, 2)).toBe("1.234,57");
    expect(formatarNumero(1234.5678, 2, 4)).toBe("1.234,5678");
    expect(formatarNumero(120, 0)).toBe("120");
    expect(formatarNumero(-1.5, 1)).toBe("-1,5");
    expect(formatarNumero(NaN)).toBe("");
    expect(formatarNumero(null)).toBe("");
  });
});

describe("normalizarTexto (o que o campo mostra ao sair)", () => {
  it("reescreve como foi entendido", () => {
    expect(normalizarTexto("4.50")).toBe("4,50");
    expect(normalizarTexto("15.000")).toBe("15.000,00");
    expect(normalizarTexto("850.5")).toBe("850,50");
    expect(normalizarTexto("4,567")).toBe("4,567"); // nao arredonda o que a pessoa digitou
    expect(normalizarTexto("1.200", 2, { medida: true })).toBe("1,20");
    expect(normalizarTexto("1500", 0, { medida: true })).toBe("1500");
  });

  it("invalido ou vazio fica como esta", () => {
    expect(normalizarTexto("abc")).toBe("abc");
    expect(normalizarTexto("")).toBe("");
  });

  it("o texto reescrito, lido de novo, da o mesmo numero", () => {
    const casos: [string, number, boolean][] = [
      ["4.50", 2, false],
      ["15.000", 2, false],
      ["15.000", 0, false],
      ["1.234.567", 0, false],
      ["1500", 0, true],
      ["1.2", 2, true],
      ["0,3333333", 2, false],
      ["-4.567", 2, false],
    ];
    for (const [t, casas, medida] of casos) {
      const n = lerNumero(t, { medida });
      const texto = normalizarTexto(t, casas, { medida });
      expect(lerNumero(texto, { medida })).toBeCloseTo(n, 6);
      expect(lerNumero(normalizarTexto(texto, casas, { medida }), { medida })).toBe(lerNumero(texto, { medida })); // estavel
    }
  });
});
