import { describe, expect, it } from "vitest";
import { aplicarEstimativas, bruto, tabelaDeLinhas } from "./estimativas";
import { arredondar, comSinal, formatG, kg, milhar, num } from "./numeros";
import { emiteCertificado, m3Material, qtdAduaneira, revisar } from "./regras";
import type { ErpPedido, Material, Processo, Revisao, TabelaEstimativas } from "./tipos";
import estCenariosJson from "./__fixtures__/estimativas_cenarios.json";
import revCenariosJson from "./__fixtures__/revisao_cenarios.json";
import tabelaJson from "./__fixtures__/estimativas_tabela.json";

// Gabarito: entradas e saidas geradas pelo proprio Python do programa local (regras.py / estimativas.py) sobre o pedido 2126.
// O TypeScript do app tem de dar exatamente o mesmo resultado.
const tabela = tabelaJson as unknown as TabelaEstimativas;
const estCenarios = estCenariosJson as unknown as { nome: string; entrada: Material[]; esperado: Material[] }[];
const revCenarios = revCenariosJson as unknown as {
  nome: string;
  proc: Processo;
  erp: ErpPedido;
  ncm_cadastro: string[] | null;
  esperado: Revisao;
}[];

describe("estimativas: mesmo resultado do Python", () => {
  it.each(estCenarios.map((c) => [c.nome, c] as const))("%s", (_nome, c) => {
    expect(aplicarEstimativas(c.entrada, tabela)).toEqual(c.esperado);
  });

  it("nao altera os materiais recebidos", () => {
    const entrada = structuredClone(estCenarios[0].entrada);
    aplicarEstimativas(entrada, tabela);
    expect(entrada).toEqual(estCenarios[0].entrada);
  });

  it("material sem estimativa em capitulo de aco/plastico ganha kg sugerido", () => {
    const [m] = aplicarEstimativas([{ sma: 1, seq: 1, codigo: "99.999.9999", ncm: "7308.90.10", un_estat: "", quantidade: 2 }], tabela);
    expect(m.un_estat).toBe("kg");
    expect(m.estimado).toEqual(["un_estat"]);
  });

  it("monta a tabela a partir das linhas do banco (dimensoes so se as tres existem)", () => {
    const t = tabelaDeLinhas([
      { codigo_material: " 10.1.1 ", peso: 2.5, bruto: null, comp: 10, larg: 20, alt: 30, fonte: "catalogo" },
      { codigo_material: "10.1.2", peso: 1, bruto: 1.2, comp: 10, larg: null, alt: 30, fonte: null },
    ]);
    expect(t["10.1.1"]).toEqual({ peso: 2.5, bruto: null, dim: [10, 20, 30], fonte: "catalogo" });
    expect(t["10.1.2"]).toEqual({ peso: 1, bruto: 1.2, dim: null, fonte: "" });
  });

  it("peso bruto: liquido + 1,5% ou o do fabricante quando maior", () => {
    expect(bruto(100, 1)).toBe(101.5);
    expect(bruto(100, 100, 1.1)).toBe(110);
    expect(bruto(100, 100, 0.5)).toBe(101.5);
  });
});

describe("revisao: mesmo resultado do Python", () => {
  it.each(revCenarios.map((c) => [c.nome, c] as const))("%s", (_nome, c) => {
    const ncm = c.ncm_cadastro === null ? null : new Set(c.ncm_cadastro);
    expect(revisar(c.proc, c.erp, ncm)).toEqual(c.esperado);
  });

  it("nao altera o processo recebido", () => {
    const c = revCenarios[3];
    const antes = structuredClone(c.proc);
    revisar(c.proc, c.erp, null);
    expect(c.proc).toEqual(antes);
  });
});

describe("quantidade na unidade aduaneira (guia 6.2)", () => {
  const m = (extra: Partial<Material>): Material => ({ sma: 1, seq: 1, quantidade: 4, peso_liq: 10, ...extra });
  const casos: [Partial<Material>, [number | null, boolean]][] = [
    [{ un_estat: "kg" }, [10, true]],
    [{ un_estat: "kg", peso_liq: 0 }, [null, false]],
    [{ un_estat: "ton" }, [0.01, true]],
    [{ un_estat: "g" }, [10000, true]],
    ...["UN", "PC", "PÇ", "PCA", "CJ", "PEC"].map((u): [Partial<Material>, [number | null, boolean]] => [{ un_estat: "un", unidade: u }, [4, true]]),
    [{ un_estat: "un", unidade: "CT" }, [400, true]],
    [{ un_estat: "un", unidade: "DZ" }, [48, true]],
    [{ un_estat: "ct", unidade: "CT" }, [4, true]],
    [{ un_estat: "mil", unidade: "PC" }, [0.004, true]],
    [{ un_estat: "m", unidade: "MT" }, [4, true]],
    [{ un_estat: "m", unidade: "M" }, [4, true]],
    [{ un_estat: "m2", unidade: "M2" }, [4, true]],
    [{ un_estat: "m3", unidade: "M3" }, [4, true]],
    [{ un_estat: "l", unidade: "LT" }, [4, true]],
    [{ un_estat: "par", unidade: "PR" }, [4, true]],
    [{ un_estat: "dz", unidade: "DZ" }, [4, true]],
    [{ un_estat: "m", unidade: "KG" }, [null, false]],
    [{ un_estat: "un", unidade: "KG" }, [null, false]],
    [{ un_estat: "", unidade: "UN" }, [null, false]],
    [{ un_estat: "kg", qtd_estat: 7.5 }, [7.5, false]],
    [{ un_estat: "m", unidade: "KG", qtd_estat: "12" }, [12, false]],
  ];
  it.each(casos)("%j -> %j", (extra, esperado) => {
    expect(qtdAduaneira(m(extra))).toEqual(esperado);
  });
});

describe("volume e certificado", () => {
  it("m3 pelas dimensoes em mm x quantidade; sem as tres dimensoes vale o m3 digitado", () => {
    expect(m3Material({ sma: 1, seq: 1, comp: 1000, larg: 500, alt: 200, quantidade: 2 })).toBeCloseTo(0.2, 12);
    expect(m3Material({ sma: 1, seq: 1, comp: 1000, larg: 500, alt: 0, quantidade: 2, m3: 1.5 })).toBe(1.5);
    expect(m3Material({ sma: 1, seq: 1 })).toBe(0);
  });
  it("certificado: so quando marcado (rascunhos antigos: quando ja tinham acordo)", () => {
    const base: Processo = { pedido: 1, documento: {}, exportador: {}, importador: {}, consignatario: {}, comercial: {}, embarque: {}, itens: [] };
    expect(emiteCertificado({ ...base, certificado: { emitir: true } })).toBe(true);
    expect(emiteCertificado({ ...base, certificado: { emitir: false, acordo: "ACE 36" } })).toBe(false);
    expect(emiteCertificado({ ...base, certificado: { acordo: "ACE 36" } })).toBe(true);
    expect(emiteCertificado({ ...base, certificado: {} })).toBe(false);
    expect(emiteCertificado(base)).toBe(false);
  });
});

describe("numeros como no Python", () => {
  it("num: vazio, nulo e texto invalido valem zero", () => {
    expect([num(null), num(undefined), num(""), num("  "), num("abc"), num("1,5"), num(0)]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect([num("2.5"), num(" 7 "), num(3), num("1e3"), num(".5")]).toEqual([2.5, 7, 3, 1000, 0.5]);
  });
  it("arredondar: empate exato vai para o par (round do Python)", () => {
    expect([arredondar(0.125, 2), arredondar(0.375, 2), arredondar(2.5), arredondar(3.5), arredondar(1.005, 2)]).toEqual([0.12, 0.38, 2, 4, 1]);
    expect(arredondar(2.6389999, 3)).toBe(2.639);
  });
  it("milhar e sinal", () => {
    expect([milhar(1234.5, 2), milhar(0.125, 2), milhar(1234567.891, 2), milhar(-1234.5, 2)]).toEqual(["1,234.50", "0.12", "1,234,567.89", "-1,234.50"]);
    expect([comSinal(5.04, 1), comSinal(-3.26, 1), comSinal(12, 1)]).toEqual(["+5.0", "-3.3", "+12.0"]);
  });
  it("formatG como o :g do Python", () => {
    expect([formatG(2.1), formatG(5.89), formatG(100), formatG(0.0001), formatG(123456.7), formatG(-2.5), formatG(0), formatG(1 / 3)]).toEqual([
      "2.1", "5.89", "100", "0.0001", "123457", "-2.5", "0", "0.333333",
    ]);
    expect([formatG(1234567), formatG(0.00001)]).toEqual(["1.23457e+06", "1e-05"]);
    expect(kg(2.1)).toBe("2,1");
  });
});
