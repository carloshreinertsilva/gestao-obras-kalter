import { describe, expect, it } from "vitest";
import { aplicarEstimativas } from "./estimativas";
import {
  aceitarSugestoes,
  aplicarFamilia,
  brutoPorPercentual,
  converterValores,
  definir,
  editarMaterial,
  hojeISO,
  itemDaFamilia,
  itensParaConverter,
  ler,
  mesclarSma,
  pendenciasItem,
  pendenciasMaterial,
  pesosDoPacking,
  pesosPorFamilia,
  processoInicial,
  situacaoMaterial,
  type LinhaErp,
} from "./processo";
import type { ItemInvoice, Material, Processo, TabelaEstimativas } from "./tipos";
import crusJson from "./__fixtures__/materiais_cru_2126.json";
import tabelaJson from "./__fixtures__/estimativas_tabela.json";

const tabela = tabelaJson as unknown as TabelaEstimativas;
const cru = crusJson as unknown as Material[];

const base: Processo = {
  pedido: 2126,
  documento: { numero: "2126", idioma: "en-es", descricao_geral: "INSTALAÇÃO FRIGORÍFICA" },
  exportador: { contato: "", razao: "KALTER (ERP)", cnpj: "33.693.340/0001-02", cep: "89219-600", pais: "BRASIL" },
  importador: { razao: "CLIENTE", pais: "BOLIVIA" },
  consignatario: { igual_importador: true },
  comercial: { moeda: "USD", incoterm: "FCA", banco: "", condicao_pagamento: "44% in advance / anticipado" },
  embarque: { modal: "RODOVIARIO", local_embarque: "", pais_destino: "BOLIVIA" },
  itens: [],
  certificado: { emitir: false },
};
const linha: LinhaErp = { nr_pedido: 2126, pedido: { erp: { pedido: 2126 }, base }, materiais: cru, exportador_erp: base.exportador, lido_em: "2026-10-27T20:10:27Z" };

describe("processo inicial", () => {
  const config = { exportador: { razao: "KALTER REFRIGERACAO LTDA", cep: "89.219-502", email: "", fone: "+55 47" }, banco: "Datos bancarios", local_embarque: "Joinville, SC" };

  it("junta ERP, padroes da Kalter e materiais da SMA com estimativas", () => {
    const p = processoInicial(linha, config, tabela, "2026-10-28");
    expect(p.documento).toEqual({ numero: "2126", idioma: "en-es", descricao_geral: "INSTALAÇÃO FRIGORÍFICA", data: "2026-10-28" });
    // dados fixos da Kalter valem por cima do cadastro da filial, mas so os preenchidos
    expect(p.exportador).toMatchObject({ razao: "KALTER REFRIGERACAO LTDA", cep: "89.219-502", cnpj: "33.693.340/0001-02", fone: "+55 47" });
    expect(p.exportador.email).toBeUndefined();
    expect(p.comercial.banco).toBe("Datos bancarios");
    expect(p.embarque.local_embarque).toBe("Joinville, SC");
    expect(p.packing).toMatchObject({ cc: 2126, lido_em: "2026-10-28" });
    expect(p.packing?.materiais).toEqual(aplicarEstimativas(cru, tabela));
    expect(p.packing?.materiais.some((m) => (m.estimado ?? []).length > 0)).toBe(true);
  });

  it("sem configuracao fica o que veio do ERP; nao altera a linha recebida", () => {
    const antes = structuredClone(linha);
    const p = processoInicial(linha, null, tabela, "2026-10-28");
    expect(p.exportador.razao).toBe("KALTER (ERP)");
    expect(p.comercial.banco).toBe("");
    expect(p.embarque.local_embarque).toBe("");
    expect(linha).toEqual(antes);
  });

  it("hojeISO usa a data local", () => {
    expect(hojeISO(new Date(2026, 9, 7, 23, 59))).toBe("2026-10-07");
  });
});

describe("reler a lista da SMA", () => {
  it("mantem o que foi digitado, traz as novas e tira as que sairam", () => {
    const atual = aplicarEstimativas(cru.slice(0, 4), tabela);
    atual[0] = editarMaterial(atual[0], "peso_liq", 12.5);
    atual[0] = editarMaterial(atual[0], "tipo_volume", "Caixa");
    atual[1] = { ...atual[1], un_estat: "m" };
    const doErp = [...cru.slice(1, 5)]; // sai a linha 0, entra a linha 4
    const r = mesclarSma(atual, doErp, tabela);
    expect(r.materiais).toHaveLength(4);
    expect(r.entraram).toBe(1);
    expect(r.sairam).toBe(1);
    const m1 = r.materiais.find((m) => m.sma === atual[1].sma && m.seq === atual[1].seq)!;
    expect(m1.un_estat).toBe("m");
    expect(m1.peso_liq).toBe(atual[1].peso_liq);
  });

  it("linha que continua nao perde peso, volume nem aceite digitados", () => {
    const atual = aplicarEstimativas(cru.slice(0, 2), tabela);
    atual[0] = aceitarSugestoes(editarMaterial(atual[0], "tipo_volume", "Caixa de madeira"));
    const r = mesclarSma(atual, cru.slice(0, 2), tabela);
    expect(r.materiais[0]).toMatchObject({ tipo_volume: "Caixa de madeira", estimado: [], peso_liq: atual[0].peso_liq });
    expect(r.materiais[0].aceito?.length).toBeGreaterThan(0);
    expect(r.entraram).toBe(0);
    expect(r.sairam).toBe(0);
  });
});

describe("situacao de cada material na Packing List", () => {
  const completo = { codigo: "1", ncm: "8481.80.95", quantidade: 2, unidade: "UN", un_estat: "un", peso_liq: 3, peso_bruto: 3.1, comp: 100, larg: 100, alt: 100 } as Material;

  it("pronto, conferir (azul), falta e fora (nao embarca)", () => {
    expect(situacaoMaterial(completo)).toBe("pronto");
    expect(situacaoMaterial({ ...completo, estimado: ["peso_liq"] })).toBe("conferir");
    expect(situacaoMaterial({ ...completo, peso_liq: 0 })).toBe("falta");
    expect(situacaoMaterial({ ...completo, quantidade: 0, peso_liq: 0 })).toBe("fora");
  });

  it("lista o que falta com as mesmas condicoes da revisao", () => {
    expect(pendenciasMaterial(completo)).toEqual([]);
    expect(pendenciasMaterial({ ...completo, un_estat: "", peso_liq: 0, peso_bruto: 0, comp: 0 })).toEqual([
      "unidade aduaneira",
      "peso líquido",
      "peso bruto",
      "medidas ou m³",
    ]);
    expect(pendenciasMaterial({ ...completo, peso_liq: 5 })).toEqual(["peso líquido maior que o bruto"]);
    expect(pendenciasMaterial({ ...completo, comp: 0, m3: 0.4 })).toEqual([]); // sem medidas, o m3 digitado basta
    expect(pendenciasMaterial({ ...completo, ncm: "" })).toEqual(["NCM no cadastro do ERP"]);
  });

  it("na 2126 (118 materiais do gabarito), sem estimativas quase tudo falta; com elas, tudo fica para conferir em azul", () => {
    const antes = cru.map(situacaoMaterial);
    expect(antes.filter((s) => s === "falta").length).toBeGreaterThan(cru.length / 2);
    const depois = aplicarEstimativas(structuredClone(cru), tabela).map(situacaoMaterial);
    expect(depois.filter((s) => s === "falta")).toEqual([]);
    expect(depois.filter((s) => s === "conferir").length).toBeGreaterThan(cru.length / 2);
  });
});

describe("edicao dos materiais da Packing List", () => {
  const exemplo = (): Material =>
    aplicarEstimativas([{ ...cru.find((m) => (tabela[m.codigo ?? ""]?.peso ?? 0) > 0 && !tabela[m.codigo ?? ""].bruto)!, peso_un: 0 }], tabela)[0];

  it("digitar um campo estimado tira o azul so dele", () => {
    const m = exemplo();
    expect(m.estimado).toEqual(expect.arrayContaining(["comp", "larg", "alt", "peso_liq", "peso_bruto"]));
    const n = editarMaterial(m, "comp", 500);
    expect(n.comp).toBe(500);
    expect(n.estimado).not.toContain("comp");
    expect(n.estimado).toContain("larg");
  });

  it("peso liquido digitado refaz o bruto estimado (liquido + 1,5%)", () => {
    const n = editarMaterial(exemplo(), "peso_liq", 100);
    expect(n.estimado).not.toContain("peso_liq");
    expect(n.estimado).toContain("peso_bruto");
    expect(n.peso_bruto).toBe(101.5);
    expect(editarMaterial(exemplo(), "peso_liq", 0).peso_bruto).toBe(0);
  });

  it("quantidade nova refaz o peso estimado e o bruto estimado", () => {
    const m = exemplo();
    const peso = tabela[m.codigo!].peso!;
    const n = editarMaterial(m, "quantidade", 10);
    expect(n.peso_liq).toBeCloseTo(10 * peso, 3);
    expect(n.peso_bruto).toBeCloseTo(10 * peso * 1.015, 3);
  });

  it("com peso do cadastro do ERP, a quantidade refaz o liquido por ele", () => {
    const m: Material = { sma: 1, seq: 1, quantidade: 2, peso_un: 3, peso_liq: 6, peso_bruto: 0, estimado: [] };
    expect(editarMaterial(m, "quantidade", 5).peso_liq).toBe(15);
  });

  it("as tres dimensoes passam a calcular o m3 (o digitado e zerado)", () => {
    const m: Material = { sma: 1, seq: 1, quantidade: 1, comp: 100, larg: 100, alt: 0, m3: 0.5 };
    expect(editarMaterial(m, "alt", 100).m3).toBe(0);
    expect(editarMaterial(m, "comp", 200).m3).toBe(0.5);
  });

  it("aceitar guarda as sugestoes em aceito e nao mexe nos valores", () => {
    const m = exemplo();
    const n = aceitarSugestoes(m);
    expect(n.estimado).toEqual([]);
    expect(n.aceito).toEqual(expect.arrayContaining(m.estimado!));
    expect(n.peso_liq).toBe(m.peso_liq);
    expect(aceitarSugestoes(n)).toBe(n);
  });

  it("aplicar a familia: tipo de volume e peso bruto por percentual", () => {
    const ms: Material[] = [
      { sma: 1, seq: 1, familia: "A", peso_liq: 100, peso_bruto: 0, estimado: ["peso_bruto"] },
      { sma: 1, seq: 2, familia: "B", peso_liq: 100, peso_bruto: 0 },
      { sma: 1, seq: 3, familia: "A", peso_liq: 0, peso_bruto: 0 },
    ];
    const r = aplicarFamilia(ms, "A", " Caixa ", 10);
    expect(r[0]).toMatchObject({ tipo_volume: "Caixa", peso_bruto: 110, estimado: [] });
    expect(r[1]).toBe(ms[1]);
    expect(r[2]).toMatchObject({ tipo_volume: "Caixa", peso_bruto: 0 });
    expect(aplicarFamilia(ms, "A", "", null)[0]).toMatchObject({ peso_bruto: 0 });
  });

  it("bruto = liquido + % em todos: so onde falta bruto ou ele e estimado", () => {
    const ms: Material[] = [
      { sma: 1, seq: 1, peso_liq: 100, peso_bruto: 0 },
      { sma: 1, seq: 2, peso_liq: 100, peso_bruto: 150 },
      { sma: 1, seq: 3, peso_liq: 100, peso_bruto: 101.5, estimado: ["peso_bruto"] },
    ];
    expect(brutoPorPercentual(ms, 3).map((m) => m.peso_bruto)).toEqual([103, 150, 103]);
  });
});

describe("definir e ler por caminho", () => {
  const o = { a: { b: [{ c: 1 }, { c: 2 }] }, x: 1 };
  it("troca so o caminho e mantem a referencia do resto", () => {
    const n = definir(o, "a.b.1.c", 9);
    expect(n.a.b[1].c).toBe(9);
    expect(o.a.b[1].c).toBe(2);
    expect(n.a.b[0]).toBe(o.a.b[0]);
    expect(definir(o, "x", 2).a).toBe(o.a);
  });
  it("cria o que falta e le de volta", () => {
    const n = definir({}, "p.q.0.r", "ok");
    expect(n).toEqual({ p: { q: [{ r: "ok" }] } });
    expect(ler(n, "p.q.0.r")).toBe("ok");
    expect(ler(n, "p.z.0.r")).toBeUndefined();
  });
});

describe("itens da Invoice", () => {
  // como no pedido 2126: itens das familias 180, 250 e 310; materiais em SMA de outras familias tambem
  const itens: ItemInvoice[] = [
    { codigo: "40.180.2126", descricao: "Purgador", ncm: "8481.80.99", quantidade: 1, valor_unit: 0, valor_unit_brl: 5500 },
    { codigo: "40.250.2126", descricao: "Acessórios", ncm: "84818099", quantidade: 1, valor_unit: 2000, valor_unit_brl: 11000 },
    { codigo: "40.310.2126", descricao: "", ncm: "123", quantidade: 0, valor_unit: 10, peso_liq: 5, peso_bruto: 4 },
  ];
  const mats: Material[] = [
    { sma: 1, seq: 1, familia: "2126.250", familia_desc: "ACESSORIOS", quantidade: 2, peso_liq: 10, peso_bruto: 11 },
    { sma: 1, seq: 2, familia: "2126.250", quantidade: 1, peso_liq: 0.5, peso_bruto: 0.6 },
    { sma: 1, seq: 3, familia: "2126.310", quantidade: 1, peso_liq: 3, peso_bruto: 3.5 },
    { sma: 1, seq: 4, familia: "2126.230", quantidade: 1, peso_liq: 7, peso_bruto: 8 },
    { sma: 1, seq: 5, familia: "2126.230", quantidade: 0, peso_liq: 100, peso_bruto: 100 },
  ];

  it("pendencias do item: as mesmas condicoes de erro da revisao", () => {
    expect(pendenciasItem(itens[1])).toEqual([]);
    expect(pendenciasItem(itens[0])).toEqual(["valor unitário"]);
    expect(pendenciasItem(itens[2])).toEqual(["descrição", "NCM com 8 dígitos", "quantidade", "peso líquido maior que o bruto"]);
  });

  it("converter pelo cambio: R$ do pedido / taxa; conta so os itens que nao batem", () => {
    expect(converterValores(itens, "USD", 5.5).map((i) => i.valor_unit)).toEqual([1000, 2000, 10]);
    expect(itensParaConverter(itens, "USD", 5.5)).toBe(1);
    expect(itensParaConverter(itens, "USD", 0)).toBe(0);
    expect(itensParaConverter(converterValores(itens, "USD", 5.5), "USD", 5.5)).toBe(0);
    expect(converterValores(itens, "BRL", 0)[1].valor_unit).toBe(11000);
  });

  it("pesos por familia (so o que embarca) e o item da mesma familia pelo codigo do pedido", () => {
    const f = pesosPorFamilia(mats);
    expect(f.map((x) => [x.familia, x.materiais, x.peso_liq, x.peso_bruto])).toEqual([
      ["2126.230", 1, 7, 8],
      ["2126.250", 2, 10.5, 11.6],
      ["2126.310", 1, 3, 3.5],
    ]);
    expect(f[1].descricao).toBe("ACESSORIOS");
    expect(itemDaFamilia(itens, "2126.250")).toBe(1);
    expect(itemDaFamilia(itens, "2126.230")).toBe(-1);
    expect(itemDaFamilia(itens, "9999.250")).toBe(-1);
  });

  it("usar os pesos do Packing: soma das familias apontadas; item sem familia fica zerado; soma bate com a Packing", () => {
    const f = pesosPorFamilia(mats);
    const r = pesosDoPacking(itens, f, { "2126.230": 1, "2126.250": 1, "2126.310": 2 });
    expect(r.map((i) => [i.peso_liq, i.peso_bruto])).toEqual([
      [0, 0],
      [17.5, 19.6],
      [3, 3.5],
    ]);
    expect(r[1].descricao).toBe("Acessórios");
    const sem = pesosDoPacking(itens, f, { "2126.250": 1 });
    expect(sem.map((i) => i.peso_liq)).toEqual([0, 10.5, 0]);
  });
});
