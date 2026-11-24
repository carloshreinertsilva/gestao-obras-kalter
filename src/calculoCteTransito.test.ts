import { describe, expect, it } from "vitest";
import { confiancaDaLigacao, diasDoCte, emTransito, filtrarCtes, resumoTransito, type CteSefaz } from "./calculoCteTransito";

const cte = (p: Partial<CteSefaz>): CteSefaz => ({
  chave: "1".repeat(44),
  numero: "1234",
  serie: "1",
  emitido_em: "2026-11-18",
  sentido: "compra",
  transportadora_cnpj: "99999999000191",
  transportadora_nome: "Transligue",
  remetente_nome: "Fornecedor SA",
  destinatario_nome: "Kalter",
  origem_nome: "OSASCO/SP",
  destino_nome: "JOINVILLE/SC",
  valor: 100,
  cancelado: false,
  nr_ad: null,
  data_entrada: null,
  ligacao: "pedido_nfe",
  pedidos: [6148],
  projetos: ["2208.480"],
  codigos_obra: ["2208"],
  ...p,
});

describe("diasDoCte", () => {
  it("conta ate hoje enquanto nao ha entrada e ate a entrada depois", () => {
    expect(diasDoCte(cte({}), "2026-11-23")).toBe(5);
    expect(diasDoCte(cte({ data_entrada: "2026-11-20" }), "2026-11-23")).toBe(2);
  });
  it("nunca fica negativo nem quebra com data invalida", () => {
    expect(diasDoCte(cte({ data_entrada: "2026-11-10" }), "2026-11-23")).toBe(0);
    expect(diasDoCte(cte({ emitido_em: "" }), "2026-11-23")).toBe(0);
  });
});

describe("confiancaDaLigacao", () => {
  it("pedido em aberto do fornecedor e so sugestao", () => {
    expect(confiancaDaLigacao(cte({ ligacao: "pedido_aberto" }))).toBe("sugestao");
  });
  it("NF-e lancada, pedido da NF-e e NF de saida sao confiaveis", () => {
    for (const ligacao of ["nf_lancada", "pedido_nfe", "nf_saida"] as const) expect(confiancaDaLigacao(cte({ ligacao }))).toBe("confiavel");
  });
  it("sem obra nao ha o que confiar, mesmo com metodo bom", () => {
    expect(confiancaDaLigacao(cte({ ligacao: "nf_saida", codigos_obra: [] }))).toBe("nenhuma");
    expect(confiancaDaLigacao(cte({ ligacao: "sem_ligacao", codigos_obra: [] }))).toBe("nenhuma");
  });
});

describe("filtrarCtes", () => {
  const lista = [
    cte({ chave: "a", numero: "10" }),
    cte({ chave: "b", numero: "20", ligacao: "pedido_aberto" }),
    cte({ chave: "c", numero: "30", nr_ad: 24010, data_entrada: "2026-11-21" }),
    cte({ chave: "d", numero: "40", cancelado: true }),
    cte({ chave: "e", numero: "50", ligacao: "sem_ligacao", codigos_obra: [], pedidos: [], transportadora_nome: "XTSUL" }),
  ];
  const chaves = (f: Parameters<typeof filtrarCtes>[1], b = "") => filtrarCtes(lista, f, b).map((c) => c.chave);

  it("cancelado nunca aparece", () => {
    expect(chaves("todos")).toEqual(["a", "b", "c", "e"]);
  });
  it("separa sem entrada, sem obra confiavel e lancados", () => {
    expect(chaves("sem_entrada")).toEqual(["a", "b", "e"]);
    expect(chaves("sem_obra")).toEqual(["b", "e"]);
    expect(chaves("lancados")).toEqual(["c"]);
  });
  it("busca por transportadora, obra, pedido e AD", () => {
    expect(chaves("todos", "xtsul")).toEqual(["e"]);
    expect(chaves("todos", "2208")).toEqual(["a", "b", "c"]);
    expect(chaves("todos", "24010")).toEqual(["c"]);
    expect(chaves("todos", " 6148 ")).toEqual(["a", "b", "c"]);
  });
});

describe("resumoTransito", () => {
  it("so conta o que esta sem entrada e nao cancelado", () => {
    const r = resumoTransito(
      [
        cte({ valor: 100, emitido_em: "2026-11-10" }),
        cte({ valor: 50, ligacao: "sem_ligacao", codigos_obra: [] }),
        cte({ valor: 999, nr_ad: 1 }),
        cte({ valor: 999, cancelado: true }),
      ],
      "2026-11-23",
    );
    expect(r).toEqual({ quantidade: 2, valor: 150, semObra: 1, maisDe7Dias: 1 });
    expect(emTransito(cte({ nr_ad: 1 }))).toBe(false);
  });
});
