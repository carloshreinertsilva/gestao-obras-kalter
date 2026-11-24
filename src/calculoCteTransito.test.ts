import { describe, expect, it } from "vitest";
import {
  agruparPedidos,
  confiancaDaLigacao,
  consumoDaVerba,
  situacaoDaVerba,
  transitoPorObra,
  diasDoCte,
  divergenciaDoErp,
  efetivo,
  emTransito,
  filtrarCtes,
  pedidosDoFornecedor,
  precisaIdentificar,
  resumoTransito,
  type CteSefaz,
  type IdentificacaoCte,
} from "./calculoCteTransito";

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

const manual = (p: Partial<IdentificacaoCte>): IdentificacaoCte => ({
  chave: "1".repeat(44),
  sentido: "compra",
  pedido: 7001,
  codigo_obra: "2300",
  fora_de_obra: false,
  observacao: null,
  nome_usuario: "Fulano",
  identificado_em: "2026-11-24T10:00:00Z",
  ...p,
});

describe("identificacao manual", () => {
  const orfao = cte({ ligacao: "sem_ligacao", codigos_obra: [], pedidos: [] });

  it("vale mais que a ligacao do robo", () => {
    const c = cte({ manual: manual({}) });
    expect(confiancaDaLigacao(c)).toBe("manual");
    expect(efetivo(c)).toEqual({ sentido: "compra", pedidos: [7001], codigos_obra: ["2300"] });
    expect(efetivo(cte({}))).toEqual({ sentido: "compra", pedidos: [6148], codigos_obra: ["2208"] });
  });
  it("identificado deixa de precisar de identificacao, inclusive o que nao e de obra", () => {
    expect(precisaIdentificar(orfao)).toBe(true);
    expect(precisaIdentificar(cte({ ligacao: "pedido_aberto" }))).toBe(true);
    expect(precisaIdentificar(cte({}))).toBe(false);
    expect(precisaIdentificar({ ...orfao, manual: manual({}) })).toBe(false);
    const fora = { ...orfao, manual: manual({ fora_de_obra: true, codigo_obra: null, pedido: null, sentido: "outro" }) };
    expect(confiancaDaLigacao(fora)).toBe("fora_de_obra");
    expect(precisaIdentificar(fora)).toBe(false);
    expect(efetivo(fora)).toEqual({ sentido: "outro", pedidos: [], codigos_obra: [] });
  });
  it("sai do filtro e da contagem de sem obra, e a busca usa a obra e o pedido informados", () => {
    const lista = [orfao, { ...orfao, chave: "b", manual: manual({}) }];
    expect(filtrarCtes(lista, "sem_obra", "").map((c) => c.chave)).toEqual([orfao.chave]);
    expect(resumoTransito(lista, "2026-11-23").semObra).toBe(1);
    expect(filtrarCtes(lista, "todos", "2300").map((c) => c.chave)).toEqual(["b"]);
    expect(filtrarCtes(lista, "todos", "7001").map((c) => c.chave)).toEqual(["b"]);
  });
  it("avisa quando o ERP indica outra obra, mas nao por causa de sugestao", () => {
    expect(divergenciaDoErp(cte({ manual: manual({}) }))).toEqual(["2208"]);
    expect(divergenciaDoErp(cte({ manual: manual({ codigo_obra: "2208" }) }))).toEqual([]);
    expect(divergenciaDoErp(cte({ ligacao: "pedido_aberto", manual: manual({}) }))).toEqual([]);
    expect(divergenciaDoErp({ ...orfao, manual: manual({}) })).toEqual([]);
    expect(divergenciaDoErp(cte({ manual: manual({ fora_de_obra: true, codigo_obra: null }) }))).toEqual(["2208"]);
    expect(divergenciaDoErp(cte({}))).toEqual([]);
  });
});

describe("transitoPorObra", () => {
  const r = transitoPorObra(
    [
      cte({ chave: "a", valor: 100, emitido_em: "2026-11-10" }), // 2208, confiavel
      cte({ chave: "b", valor: 90, codigos_obra: ["2208", "2300", "2208"] }), // rateado em 2 (codigo repetido conta uma vez)
      cte({ chave: "c", valor: 40, ligacao: "pedido_aberto" }), // sugestao: nao entra na obra
      cte({ chave: "d", valor: 60, ligacao: "sem_ligacao", codigos_obra: [] }),
      cte({ chave: "e", valor: 25, ligacao: "sem_ligacao", codigos_obra: [], manual: manual({ codigo_obra: "2300" }) }),
      cte({ chave: "f", valor: 15, manual: manual({ fora_de_obra: true, codigo_obra: null }) }),
      cte({ chave: "g", valor: 999, nr_ad: 1 }), // ja lancado
      cte({ chave: "h", valor: 999, cancelado: true }),
    ],
    "2026-11-23",
  );

  it("soma so o que esta sem entrada, rateando em partes iguais", () => {
    expect(r.obras).toEqual([
      { codigo: "2208", quantidade: 2, valor: 145, rateados: 1, diasMaisAntigo: 13 },
      { codigo: "2300", quantidade: 2, valor: 70, rateados: 1, diasMaisAntigo: 5 },
    ]);
  });
  it("sugestao e sem ligacao ficam sem obra; nao e de obra fica a parte; tudo fecha com o total", () => {
    expect(r.semObra).toEqual({ quantidade: 2, valor: 100 });
    expect(r.foraDeObra).toEqual({ quantidade: 1, valor: 15 });
    expect(r.total).toBe(330);
    expect(r.obras.reduce((s, o) => s + o.valor, 0) + r.semObra.valor + r.foraDeObra.valor).toBeCloseTo(r.total);
  });
});

describe("situacaoDaVerba", () => {
  it("compara o transito com a verba disponivel", () => {
    expect(situacaoDaVerba(100, 1000)).toBe("cabe");
    expect(situacaoDaVerba(850, 1000)).toBe("atencao");
    expect(situacaoDaVerba(1000, 1000)).toBe("atencao");
    expect(situacaoDaVerba(1000.01, 1000)).toBe("estoura");
    expect(situacaoDaVerba(10, 0)).toBe("estoura");
    expect(situacaoDaVerba(10, -50)).toBe("estoura");
    expect(situacaoDaVerba(10, null)).toBe("sem_dado");
  });
  it("consumo para a barra fica entre 0 e 1", () => {
    expect(consumoDaVerba(250, 1000)).toBe(0.25);
    expect(consumoDaVerba(5000, 1000)).toBe(1);
    expect(consumoDaVerba(10, 0)).toBe(1);
    expect(consumoDaVerba(0, 0)).toBe(0);
    expect(consumoDaVerba(10, null)).toBe(0);
  });
});

describe("pedidos em aberto", () => {
  const obras = new Map([
    ["o1", "2208"],
    ["o2", "2300"],
  ]);
  const pedidos = agruparPedidos(
    [
      { nr_pedido: 6148, fornecedor: "DELTA ENGENHARIA TERMICA LTDA", id_obra: "o1", valor: "100.50" },
      { nr_pedido: 6148, fornecedor: "DELTA ENGENHARIA TERMICA LTDA", id_obra: "o2", valor: 50 },
      { nr_pedido: 6148, fornecedor: "DELTA ENGENHARIA TERMICA LTDA", id_obra: "o1", valor: null },
      { nr_pedido: 6200, fornecedor: "S&P BRASIL VENTILACAO LTDA", id_obra: "o2", valor: 10 },
      { nr_pedido: null, fornecedor: "SEM PEDIDO", id_obra: "o1", valor: 999 },
      { nr_pedido: 6300, fornecedor: "DELTA FRIO LTDA", id_obra: "desconhecida", valor: 1 },
    ],
    obras,
  );

  it("agrupa por pedido somando o valor e juntando as obras", () => {
    expect(pedidos.map((p) => p.pedido)).toEqual([6300, 6200, 6148]);
    expect(pedidos[2]).toEqual({ pedido: 6148, fornecedor: "DELTA ENGENHARIA TERMICA LTDA", codigos_obra: ["2208", "2300"], valor: 150.5 });
    expect(pedidos[0].codigos_obra).toEqual([]);
  });
  it("sugere pelo comeco do nome, ignorando acento e pontuacao", () => {
    expect(pedidosDoFornecedor("Delta Engenharia Térmica Ltda", pedidos).map((p) => p.pedido)).toEqual([6300, 6148]);
    expect(pedidosDoFornecedor("S&P BRASIL VENTILAÇÃO LTDA", pedidos).map((p) => p.pedido)).toEqual([6200]);
    expect(pedidosDoFornecedor("S", pedidos)).toEqual([]);
    expect(pedidosDoFornecedor("YOKOGAWA", pedidos)).toEqual([]);
    expect(pedidosDoFornecedor(null, pedidos)).toEqual([]);
  });
});
