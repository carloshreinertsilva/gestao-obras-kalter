import { describe, expect, it } from "vitest";
import { diferencas, mostrar } from "./historico";
import type { Processo } from "./tipos";

const base: Processo = {
  pedido: 2126,
  documento: { numero: "237150", data: "2026-10-28" },
  exportador: { razao: "KALTER" },
  importador: { razao: "CLIENTE", cidade: "COCHABAMBA" },
  consignatario: { igual_importador: true },
  comercial: { moeda: "USD", taxa_cambio: 5.5, frete: 0 },
  embarque: { modal: "RODOVIARIO" },
  itens: [{ codigo: "40.250.2126", descricao: "Acessórios", quantidade: 1, valor_unit: 100, peso_liq: 10 }],
  packing: {
    materiais: [
      { sma: 1, seq: 1, codigo: "10.250.0167", quantidade: 2, peso_liq: 4, estimado: ["peso_bruto"], peso_bruto: 4.4 },
      { sma: 1, seq: 2, codigo: "10.250.0172", quantidade: 1, peso_liq: 1 },
    ],
  },
};

describe("historico: o que mudou desde a aprovacao", () => {
  it("nada mudou: lista vazia (numero como texto, zero e vazio valem o mesmo; marcas internas nao contam)", () => {
    const igual = structuredClone(base);
    igual.comercial.taxa_cambio = "5.5";
    igual.comercial.frete = "";
    igual.packing!.materiais[0].estimado = [];
    igual.packing!.materiais[0].aceito = ["peso_bruto"];
    expect(diferencas(base, igual)).toEqual([]);
  });

  it("campos, itens e materiais em linguagem de tela", () => {
    const novo = structuredClone(base);
    novo.importador.cidade = "SANTA CRUZ";
    novo.consignatario.igual_importador = false;
    novo.itens[0].valor_unit = 120;
    novo.itens.push({ descricao: "Frete interno", quantidade: 1, valor_unit: 5 });
    novo.packing!.materiais[0].peso_liq = 4.5;
    novo.packing!.materiais = [novo.packing!.materiais[0], { sma: 2, seq: 1, codigo: "10.310.0285", quantidade: 1 }];
    expect(diferencas(base, novo)).toEqual([
      { grupo: "Importador", campo: "Cidade", antes: "COCHABAMBA", depois: "SANTA CRUZ" },
      { grupo: "Consignatário", campo: "Mesmo que o importador", antes: "sim", depois: "não" },
      { grupo: "Item 1 da Invoice", campo: "Valor unitário", antes: "100", depois: "120" },
      { grupo: "Item 2 da Invoice", campo: "Item", antes: "—", depois: "incluído: Frete interno" },
      { grupo: "Packing List · 10.250.0167", campo: "Peso líquido", antes: "4", depois: "4,5" },
      { grupo: "Packing List · 10.310.0285", campo: "Material", antes: "—", depois: "entrou na lista da SMA" },
      { grupo: "Packing List · 10.250.0172", campo: "Material", antes: "na lista", depois: "saiu da lista da SMA" },
    ]);
  });

  it("mostrar: vazio, numero brasileiro, sim/nao", () => {
    expect([mostrar(""), mostrar(null), mostrar(1234.5), mostrar("2.5"), mostrar(true), mostrar("ABC")]).toEqual(["—", "—", "1.234,5", "2,5", "sim", "ABC"]);
  });
});
