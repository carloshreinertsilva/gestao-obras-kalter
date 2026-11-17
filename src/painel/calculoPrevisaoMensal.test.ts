import { describe, expect, it } from "vitest";
import { calcularPrevisaoMensal, chaveIdsObras, mesesDaJanela, rotuloMes, somarMeses } from "./calculoPrevisaoMensal";

const base = {
  idsObras: ["A", "B"],
  previsoes: [],
  realizados: [],
  familias: [],
  parcelas: [],
  hojeISO: "2026-11-16",
  quantidadeMeses: 6,
};

describe("meses", () => {
  it("soma meses virando o ano", () => {
    expect(somarMeses("2026-11", 2)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(mesesDaJanela("2026-11-16", 6)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]);
    expect(rotuloMes("2026-12")).toBe("dez/2026");
  });

  it("chave das obras nao depende da ordem", () => {
    expect(chaveIdsObras([{ id: "b" }, { id: "a" }])).toBe(chaveIdsObras([{ id: "a" }, { id: "b" }]));
  });
});

describe("faturamento previsto", () => {
  it("NFs do grupo abatem a previsao mais antiga; atrasado vai para Vencido", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      familias: [{ id_obra: "A", valor_total_escopo: 1000 }],
      previsoes: [
        { id_obra: "A", grupo_faturamento: "G1", competencia: "2026-12-01", valor_previsto: 300 },
        { id_obra: "A", grupo_faturamento: "G1", competencia: "2026-10-01", valor_previsto: 400 },
        { id_obra: "A", grupo_faturamento: "G2", competencia: "2026-11-01", valor_previsto: 300 },
      ],
      realizados: [{ id_obra: "A", grupo_faturamento: "G1", valor_realizado: 250 }],
    });
    expect(r.vencido.faturar).toBe(150); // 400 de out - 250 faturado
    expect(r.meses[0].faturar).toBe(300); // nov (G2)
    expect(r.meses[1].faturar).toBe(300); // dez
    expect(r.semData.faturar).toBe(0);
    // total bate com o "A faturar" do Painel: 1000 - 250
    expect(r.totalFaturar).toBe(750);
  });

  it("NF abate primeiro o proprio grupo; a sobra abate o resto da obra (mais antiga primeiro)", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      familias: [{ id_obra: "A", valor_total_escopo: 1000 }],
      previsoes: [
        { id_obra: "A", grupo_faturamento: "G1", competencia: "2027-01-01", valor_previsto: 500 },
        { id_obra: "A", grupo_faturamento: "G2", competencia: "2026-12-01", valor_previsto: 200 },
        { id_obra: "A", grupo_faturamento: "G3", competencia: "2027-02-01", valor_previsto: 300 },
      ],
      realizados: [
        { id_obra: "A", grupo_faturamento: "G1", valor_realizado: 100 },
        { id_obra: "A", grupo_faturamento: "G3", valor_realizado: 300.01 }, // centavo a mais do ERP
        { id_obra: "B", grupo_faturamento: "G2", valor_realizado: 200 }, // outra obra: nao abate a A
      ],
    });
    expect(r.meses[1].faturar).toBe(199.99); // dez: G2 abatido pela sobra de 0,01 da G3
    expect(r.meses[2].faturar).toBe(400); // jan: G1 500 - 100
    expect(r.meses[3].faturar).toBe(0); // fev: G3 todo faturado
    expect(r.totalFaturar).toBe(599.99); // = 1000 - 400,01 (conta do Painel)
  });

  it("escopo sem previsao com data cai em Sem data prevista", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      familias: [
        { id_obra: "A", valor_total_escopo: 800 },
        { id_obra: "B", valor_total_escopo: 200 },
      ],
      previsoes: [{ id_obra: "A", grupo_faturamento: "G1", competencia: "2027-01-01", valor_previsto: 500 }],
      realizados: [{ id_obra: "B", grupo_faturamento: "X", valor_realizado: 50 }],
    });
    expect(r.semData.faturar).toBe(450); // 300 da A + 150 da B
    expect(r.semData.porObra.map((o) => o.idObra)).toEqual(["A", "B"]);
    expect(r.totalFaturar).toBe(950);
  });

  it("previsao depois da janela vai para o balde Depois e obra fora da lista e ignorada", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      familias: [{ id_obra: "A", valor_total_escopo: 100 }],
      previsoes: [
        { id_obra: "A", grupo_faturamento: "G1", competencia: "2027-07-01", valor_previsto: 100 },
        { id_obra: "Z", grupo_faturamento: "G1", competencia: "2026-12-01", valor_previsto: 999 },
      ],
    });
    expect(r.depois.faturar).toBe(100);
    expect(r.depois.rotulo).toBe("Depois de abr/2027");
    expect(r.meses.every((m) => m.faturar === 0)).toBe(true);
  });
});

describe("recebimento previsto", () => {
  it("saldo das parcelas por mes; antes de hoje e Vencido (mesmo no mes atual)", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      parcelas: [
        { id_obra: "A", data_prevista: "2026-11-10", valor_previsto: 100, valor_realizado: 40 },
        { id_obra: "A", data_prevista: "2026-11-16", valor_previsto: 200, valor_realizado: 0 },
        { id_obra: "B", data_prevista: "2026-12-05", valor_previsto: 300, valor_realizado: 0 },
        { id_obra: "B", data_prevista: "2026-12-06", valor_previsto: 300, valor_realizado: 350 },
        { id_obra: "B", data_prevista: "2027-01-06", valor_previsto: 50, valor_realizado: 0, status: "cancelado" },
        { id_obra: "B", data_prevista: "2028-01-06", valor_previsto: 70, valor_realizado: 0 },
      ],
    });
    expect(r.vencido.receber).toBe(60);
    expect(r.meses[0].receber).toBe(200);
    expect(r.meses[1].receber).toBe(300);
    expect(r.meses[2].receber).toBe(0);
    expect(r.depois.receber).toBe(70);
    expect(r.totalReceber).toBe(630);
  });

  it("detalhe por obra junta faturar e receber do mesmo mes", () => {
    const r = calcularPrevisaoMensal({
      ...base,
      familias: [{ id_obra: "A", valor_total_escopo: 100 }],
      previsoes: [{ id_obra: "A", grupo_faturamento: "G1", competencia: "2026-12-01", valor_previsto: 100 }],
      parcelas: [{ id_obra: "A", data_prevista: "2026-12-20", valor_previsto: 80, valor_realizado: 0 }],
    });
    expect(r.meses[1].porObra).toEqual([{ idObra: "A", faturar: 100, receber: 80 }]);
  });

  it("sem nada a faturar nem a receber e vazio; centavos nao acumulam erro", () => {
    expect(calcularPrevisaoMensal(base).vazio).toBe(true);
    const r = calcularPrevisaoMensal({
      ...base,
      parcelas: Array.from({ length: 10 }, () => ({
        id_obra: "A",
        data_prevista: "2026-12-01",
        valor_previsto: "0.10",
        valor_realizado: 0,
      })),
    });
    expect(r.meses[1].receber).toBe(1);
    expect(r.vazio).toBe(false);
  });
});
