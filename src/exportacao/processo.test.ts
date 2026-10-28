import { describe, expect, it } from "vitest";
import { aplicarEstimativas } from "./estimativas";
import {
  aceitarSugestoes,
  aplicarFamilia,
  brutoPorPercentual,
  definir,
  editarMaterial,
  hojeISO,
  ler,
  mesclarSma,
  processoInicial,
  type LinhaErp,
} from "./processo";
import type { Material, Processo, TabelaEstimativas } from "./tipos";
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
