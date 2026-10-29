import { describe, expect, it } from "vitest";
import { ETAPAS, PASSOS, alvoDoAjuste, proximaPendencia, situacoesDosPassos } from "./navegacao";
import { revisar } from "./regras";
import type { Processo } from "./tipos";
import type { Ajuste } from "./tipos";

const aj = (nivel: Ajuste["nivel"], campo: string, onde: Ajuste["onde"] = "documento"): Ajuste => ({ nivel, campo, onde, texto: "" });
const base = { certificado: false, aprovado: false, finalGerado: false };

describe("navegacao em etapas", () => {
  it("as 4 etapas cobrem os 11 passos, cada um uma vez e na ordem", () => {
    expect(ETAPAS.flatMap((e) => e.passos)).toEqual(PASSOS.map((p) => p.id));
  });

  it("situacao de cada passo: erros, avisos, ok; ajustes so do ERP nao contam", () => {
    const s = situacoesDosPassos([aj("erro", "importador"), aj("erro", "importador"), aj("aviso", "embarque"), aj("erro", "erp", "erp")], base);
    expect(s.importador).toEqual({ tipo: "erro", n: 2 });
    expect(s.embarque).toEqual({ tipo: "aviso", n: 1 });
    expect(s.exportador).toEqual({ tipo: "ok" });
    expect(s.erp).toEqual({ tipo: "ok" });
    expect(s.revisao).toEqual({ tipo: "erro", n: 2 });
  });

  it("certificado desmarcado e opcional; previa e documentos mostram aprovado e gerado", () => {
    expect(situacoesDosPassos([], base).certificado.tipo).toBe("opcional");
    expect(situacoesDosPassos([], { ...base, certificado: true }).certificado.tipo).toBe("ok");
    const s = situacoesDosPassos([], { certificado: false, aprovado: true, finalGerado: true });
    expect([s.previa.texto, s.documentos.texto]).toEqual(["aprovado", "gerado"]);
    expect(situacoesDosPassos([], base).previa.tipo).toBe("neutro");
  });

  it("proxima pendencia: o passo com erro seguinte, dando a volta; nenhuma quando nao ha erro", () => {
    const s = situacoesDosPassos([aj("erro", "importador"), aj("erro", "volumes")], base);
    expect(proximaPendencia(s, "erp")).toBe("importador");
    expect(proximaPendencia(s, "importador")).toBe("volumes");
    expect(proximaPendencia(s, "volumes")).toBe("importador");
    expect(proximaPendencia(s, "revisao")).toBe("importador");
    expect(proximaPendencia(situacoesDosPassos([aj("aviso", "itens")], base), "erp")).toBeNull();
  });

  it("corrigir vai ao campo: o texto da revisao aponta o campo; cabecalho do romaneio vai para Embarque", () => {
    const proc = {
      pedido: 1,
      documento: {},
      exportador: { razao: "KALTER", endereco: "R", cidade: "JOINVILLE", pais: "BRASIL" },
      importador: { razao: "C", endereco: "E" },
      consignatario: { igual_importador: true },
      comercial: { moeda: "USD", incoterm: "FCA" },
      embarque: {},
      itens: [{ descricao: "A", ncm: "84818099", quantidade: 1, valor_unit: 1 }, { descricao: "", ncm: "12", quantidade: 1, valor_unit: 1 }],
      packing: { materiais: [] },
    } as unknown as Processo;
    const alvos = Object.fromEntries(revisar(proc, {}).ajustes.map((a) => [a.texto, alvoDoAjuste(a)]));
    expect(alvos["Informe o número da Invoice/Proforma."]).toEqual({ passo: "erp", campo: "exp-documento-numero" });
    expect(alvos["Exportador: falta o CNPJ."]).toEqual({ passo: "exportador", campo: "exp-exportador-cnpj" });
    expect(alvos["Importador: falta cidade."]).toEqual({ passo: "importador", campo: "exp-importador-cidade" });
    expect(alvos["Informe a condição de pagamento."]).toEqual({ passo: "comercial", campo: "exp-comercial-condicao_pagamento" });
    expect(alvos["Embarque: falta modal de transporte."]).toEqual({ passo: "embarque", campo: "exp-embarque-modal" });
    expect(alvos["Item 2: falta a descrição."]).toEqual({ passo: "itens", campo: "item-1-descricao" });
    expect(alvos["Item 2 (): NCM precisa ter 8 dígitos."]).toEqual({ passo: "itens", campo: "item-1-ncm" });
    expect(alvos["Packing List: falta nº da NF no cabeçalho do romaneio."]).toEqual({ passo: "embarque", campo: "exp-embarque-nf" });
    expect(alvoDoAjuste(aj("erro", "erp", "erp"))).toBeNull();
    expect(alvoDoAjuste({ nivel: "aviso", onde: "documento", campo: "volumes", texto: "Packing List: 3 de 9 materiais sem peso líquido (X)." })).toEqual({ passo: "volumes" });
  });
});
