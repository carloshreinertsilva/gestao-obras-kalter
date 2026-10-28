import { describe, expect, it } from "vitest";
import { ETAPAS, PASSOS, proximaPendencia, situacoesDosPassos } from "./navegacao";
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
});
