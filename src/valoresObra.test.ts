import { describe, expect, it } from "vitest";
import { anexarValoresCompras, anexarValoresVenda, somarCarteira, totalVendaObra, valoresVendaMudaram } from "./valoresObra";

describe("valoresVendaMudaram", () => {
  it("obra nova: so muda se digitou valor diferente de zero", () => {
    expect(valoresVendaMudaram({ valor_produto: "", valor_servico: "" }, null)).toBe(false);
    expect(valoresVendaMudaram({ valor_produto: "0", valor_servico: 0 }, undefined)).toBe(false);
    expect(valoresVendaMudaram({ valor_produto: "1500.5", valor_servico: "" }, null)).toBe(true);
  });
  it("edicao: compara como numero (texto do campo x numero do banco; vazio = 0)", () => {
    expect(valoresVendaMudaram({ valor_produto: "1000", valor_servico: "" }, { valor_produto: 1000, valor_servico: 0 })).toBe(false);
    expect(valoresVendaMudaram({ valor_produto: "1000.1", valor_servico: "" }, { valor_produto: 1000, valor_servico: 0 })).toBe(true);
    expect(valoresVendaMudaram({ valor_produto: 1000, valor_servico: "5" }, { valor_produto: 1000, valor_servico: null })).toBe(true);
  });
  it("faturamento direto tambem conta (vazio = 0)", () => {
    const banco = { valor_produto: 1000, valor_servico: 0, valor_faturamento_direto: 300 };
    expect(valoresVendaMudaram({ valor_produto: "1000", valor_servico: "", valor_faturamento_direto: "300" }, banco)).toBe(false);
    expect(valoresVendaMudaram({ valor_produto: "1000", valor_servico: "", valor_faturamento_direto: "350.5" }, banco)).toBe(true);
    expect(valoresVendaMudaram({ valor_produto: "", valor_servico: "", valor_faturamento_direto: "" }, null)).toBe(false);
    expect(valoresVendaMudaram({ valor_produto: "", valor_servico: "", valor_faturamento_direto: "10" }, null)).toBe(true);
  });
});

describe("anexarValoresVenda", () => {
  it("junta pelo id da obra; sem linha (sem acesso) fica null", () => {
    const obras = [
      { id: "a", nome: "A" },
      { id: "b", nome: "B" },
    ];
    const r = anexarValoresVenda(obras, [{ id_obra: "a", valor_produto: "1000.50", valor_servico: 200, valor_faturamento_direto: "75.25" }]);
    expect(r[0]).toEqual({ id: "a", nome: "A", valor_produto: 1000.5, valor_servico: 200, valor_faturamento_direto: 75.25 });
    expect(r[1]).toEqual({ id: "b", nome: "B", valor_produto: null, valor_servico: null, valor_faturamento_direto: null });
  });
  it("com linha, nulo no banco vira 0 (obra sem valor cadastrado, como sempre foi)", () => {
    const r = anexarValoresVenda([{ id: "a" }], [{ id_obra: "a", valor_produto: null, valor_servico: 50 }]);
    expect(r[0].valor_produto).toBe(0);
    expect(r[0].valor_servico).toBe(50);
  });
  it("nao muda a lista original", () => {
    const obras = [{ id: "a" }];
    anexarValoresVenda(obras, []);
    expect(obras[0]).toEqual({ id: "a" });
  });
});

describe("totalVendaObra", () => {
  it("soma produto + servico", () => {
    expect(totalVendaObra({ valor_produto: "100.25", valor_servico: 50 })).toBe(150.25);
    expect(totalVendaObra({ valor_produto: 0, valor_servico: 0 })).toBe(0);
  });
  it("null = sem acesso (nunca 0)", () => {
    expect(totalVendaObra({ valor_produto: null, valor_servico: null })).toBeNull();
    expect(totalVendaObra({})).toBeNull();
    expect(totalVendaObra(null)).toBeNull();
  });
});

describe("somarCarteira", () => {
  it("obra sem acesso fica fora da soma e marca parcial", () => {
    const r = somarCarteira([
      { valor_produto: 100, valor_servico: 10 },
      { valor_produto: null, valor_servico: null },
      { valor_produto: 0, valor_servico: 5 },
    ]);
    expect(r).toEqual({ total: 115, semAcesso: 1, parcial: true });
  });
  it("todas visiveis: total igual a soma antiga, nao parcial", () => {
    const obras = [
      { valor_produto: 1234.56, valor_servico: 0.1 },
      { valor_produto: 0.2, valor_servico: 99.99 },
    ];
    const antiga = obras.reduce((a, o) => a + Number(o.valor_produto || 0) + Number(o.valor_servico || 0), 0);
    expect(somarCarteira(obras)).toEqual({ total: antiga, semAcesso: 0, parcial: false });
  });
});

describe("anexarValoresCompras", () => {
  it("junta pela solicitacao (numero ou texto)", () => {
    const r = anexarValoresCompras(
      [{ nr_solicitacao: 10 }, { nr_solicitacao: 11 }],
      [
        { id_obra: "a", nr_solicitacao: "10", preco_unitario: 2.5, valor: 25 },
        { id_obra: "a", nr_solicitacao: 11, preco_unitario: null, valor: null },
      ],
    );
    expect(r.valoresVisiveis).toBe(true);
    expect(r.compras[0]).toEqual({ nr_solicitacao: 10, preco_unitario: 2.5, valor: 25 });
    expect(r.compras[1]).toEqual({ nr_solicitacao: 11, preco_unitario: null, valor: null });
  });
  it("compras sem nenhuma linha de valor = sem acesso", () => {
    const r = anexarValoresCompras([{ nr_solicitacao: 10 }], []);
    expect(r.valoresVisiveis).toBe(false);
    expect(r.compras[0].valor).toBeNull();
  });
  it("sem compras nao ha o que esconder", () => {
    expect(anexarValoresCompras([], []).valoresVisiveis).toBe(true);
  });
});
