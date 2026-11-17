import { describe, expect, it } from "vitest";
import { dadosDaCopia, dividirCelulas, fretesParaCopiar, lerCargaColada, LIMITE_LINHAS, nomeColuna, type FreteCopiavel } from "./calculoCargaFrete";

const T = "\t";

describe("dividirCelulas", () => {
  it("separa por TAB e por quebra de linha (Windows ou Unix)", () => {
    expect(dividirCelulas("a\tb\r\nc\td\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("aceita ponto e virgula quando nao ha TAB", () => {
    expect(dividirCelulas("a;b\nc;d")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("celula com aspas guarda quebra de linha, separador e aspas duplas", () => {
    expect(dividirCelulas('"Caixa\nde peças"\t2\t"mede ""grande"""')).toEqual([["Caixa\nde peças", "2", 'mede "grande"']]);
  });
  it("virgula nao e separador (e decimal)", () => {
    expect(dividirCelulas("Bomba\t1,5")).toEqual([["Bomba", "1,5"]]);
  });
});

describe("nomeColuna", () => {
  it("tira acento, caixa, parenteses e pontuacao", () => {
    expect(nomeColuna("Descrição")).toBe("descricao");
    expect(nomeColuna("Peso un. (kg)")).toBe("pesoun");
    expect(nomeColuna(" Comp. ")).toBe("comp");
  });
});

describe("lerCargaColada com cabecalho", () => {
  it("mapeia colunas por nome, em qualquer ordem, com acento e abreviacao", () => {
    const r = lerCargaColada(["Peso (kg)", "Descrição", "Qtd.", "Alt.", "Larg.", "Comp."].join(T) + "\n" + ["850 kg", "Evaporador", "2", "1,20", "0,80", "2,5m"].join(T));
    expect(r.temCabecalho).toBe(true);
    expect(r.problemas).toEqual([]);
    expect(r.itens).toEqual([{ descricao: "Evaporador", quantidade: 2, peso_kg: 850, altura_m: 1.2, largura_m: 0.8, comprimento_m: 2.5 }]);
    expect(r.colunas.map((c) => c.campo)).toEqual(["peso", "descricao", "quantidade", "altura", "largura", "comprimento"]);
  });
  it("volumes vale como quantidade so se nao ha coluna de quantidade", () => {
    const so = lerCargaColada(["Item", "Volumes"].join(T) + "\n" + ["Painel", "4"].join(T));
    expect(so.itens[0].quantidade).toBe(4);
    const ambos = lerCargaColada(["Item", "Qtd", "Volumes"].join(T) + "\n" + ["Painel", "2", "9"].join(T));
    expect(ambos.itens[0].quantidade).toBe(2);
    expect(ambos.colunas[2].campo).toBeNull();
  });
  it("coluna de valor e reconhecida mas nao usada; coluna desconhecida e ignorada", () => {
    const r = lerCargaColada(["Material", "Valor", "Cor"].join(T) + "\n" + ["Tubo", "1.234,56", "azul"].join(T));
    expect(r.itens).toEqual([{ descricao: "Tubo", quantidade: 1, peso_kg: null, altura_m: null, largura_m: null, comprimento_m: null }]);
    expect(r.colunas.map((c) => c.campo)).toEqual(["descricao", null, null]);
    expect(r.colunas[1].obs).toMatch(/não guarda/);
  });
  it("numeros no formato brasileiro e peso com milhar", () => {
    const r = lerCargaColada(["Descrição", "Peso"].join(T) + "\n" + ["Motor", "1.234,56"].join(T));
    expect(r.itens[0].peso_kg).toBe(1234.56);
  });
  it("coluna de peso total nao vira peso unitario", () => {
    const r = lerCargaColada(["Item", "Peso total"].join(T) + "\n" + ["Motor", "900"].join(T));
    expect(r.itens[0].peso_kg).toBeNull();
  });
});

describe("lerCargaColada sem cabecalho", () => {
  it("usa a ordem das colunas da tela: descricao, qtd, peso, alt, larg, comp", () => {
    const r = lerCargaColada(["Caixa de peças", "3", "12,5", "0,4", "0,5", "0,6"].join(T));
    expect(r.temCabecalho).toBe(false);
    expect(r.itens).toEqual([{ descricao: "Caixa de peças", quantidade: 3, peso_kg: 12.5, altura_m: 0.4, largura_m: 0.5, comprimento_m: 0.6 }]);
  });
  it("colunas alem das seis ficam ignoradas e linhas com so descricao valem 1 volume", () => {
    const r = lerCargaColada(["Tubo", "", "", "", "", "", "extra"].join(T) + "\nBomba");
    expect(r.itens.map((i) => [i.descricao, i.quantidade])).toEqual([["Tubo", 1], ["Bomba", 1]]);
  });
  it("aceita CSV com ponto e virgula", () => {
    const r = lerCargaColada("Descrição;Qtd;Peso\nMotor;2;1.500,5");
    expect(r.itens).toEqual([{ descricao: "Motor", quantidade: 2, peso_kg: 1500.5, altura_m: null, largura_m: null, comprimento_m: null }]);
  });
});

describe("lerCargaColada: linhas ignoradas e problemas", () => {
  it("ignora linhas vazias e linha de total", () => {
    const r = lerCargaColada(["Item", "Qtd", "Peso"].join(T) + "\n\n" + ["Motor", "1", "100"].join(T) + "\n" + [" ", "", ""].join(T) + "\n" + ["Total", "1", "100"].join(T));
    expect(r.itens).toHaveLength(1);
    expect(r.problemas).toEqual([]);
    expect(r.linhasLidas).toBe(1);
  });
  it("aponta o problema por linha (numero da linha do texto colado) e segue com as boas", () => {
    const r = lerCargaColada(
      ["Item", "Qtd", "Peso", "Alt", "Larg", "Comp"].join(T) + "\n" +
        ["A", "1", "10", "", "", ""].join(T) + "\n" +
        ["B", "dois", "10", "", "", ""].join(T) + "\n" +
        ["C", "1", "abc", "", "", ""].join(T) + "\n" +
        ["D", "1", "10", "1,2", "", ""].join(T) + "\n" +
        ["E", "0", "10", "", "", ""].join(T) + "\n" +
        ["F", "1,5", "10", "", "", ""].join(T) + "\n" +
        ["G", "1", "-3", "", "", ""].join(T) + "\n" +
        ["H", "1", "10", "1200", "800", "2500"].join(T),
    );
    expect(r.itens.map((i) => i.descricao)).toEqual(["A"]);
    const msgs = Object.fromEntries(r.problemas.map((p) => [p.linha, p.mensagem]));
    expect(msgs[3]).toBe("linha 3: quantidade não é número");
    expect(msgs[4]).toBe("linha 4: peso não é número");
    expect(msgs[5]).toMatch(/^linha 5: informe as três dimensões/);
    expect(msgs[6]).toMatch(/quantidade precisa ser maior que zero/);
    expect(msgs[7]).toMatch(/quantidade precisa ser um número inteiro/);
    expect(msgs[8]).toMatch(/peso precisa ser maior que zero/);
    expect(msgs[9]).toMatch(/altura em metros, confira/);
    expect(r.problemas).toHaveLength(7);
  });
  it("texto colado dentro de aspas com quebra de linha conta como uma linha so (a linha do Excel)", () => {
    const r = lerCargaColada('Item\tQtd\n"Caixa\ngrande"\t2\nBomba\tx');
    expect(r.itens[0]).toMatchObject({ descricao: "Caixa\ngrande", quantidade: 2 });
    expect(r.problemas.map((p) => p.linha)).toEqual([3]);
  });
  it("texto vazio nao gera nada", () => {
    const r = lerCargaColada("  \n\t\n");
    expect(r.itens).toEqual([]);
    expect(r.problemas).toEqual([]);
  });
  it("limite de linhas: le as primeiras e avisa do excesso", () => {
    const texto = Array.from({ length: LIMITE_LINHAS + 5 }, (_, i) => `Item ${i + 1}${T}1`).join("\n");
    const r = lerCargaColada(texto);
    expect(r.itens).toHaveLength(LIMITE_LINHAS);
    expect(r.limiteExcedido).toBe(true);
    expect(lerCargaColada("A\t1\nB\t2").limiteExcedido).toBe(false);
  });
});

const frete = (v: Partial<FreteCopiavel> & { id: string }): FreteCopiavel => ({
  numero: 1, id_obra: "o1", codigo_obra: "2182", operacao: "compra", origem_tipo: "fornecedor", origem_ibge: 4106902, origem_nome: "Forn X - Curitiba/PR",
  destino_tipo: "kalter", destino_ibge: 4209102, destino_nome: "Kalter - Joinville/SC", cod_fornecedor: 77, observacao: null, carga: null,
  created_at: "2026-10-01T10:00:00Z", ...v,
});

describe("dadosDaCopia", () => {
  it("leva rota, carga e observacao; o fornecedor so no ponto que e fornecedor", () => {
    const d = dadosDaCopia(frete({ id: "a", observacao: "Descarregar cedo", carga: [{ descricao: "Motor", quantidade: 2, peso_kg: 10, altura_m: null, largura_m: null, comprimento_m: null }] }));
    expect(d.origem).toMatchObject({ tipo: "fornecedor", ibge: 4106902, codFornecedor: 77 });
    expect(d.destino).toMatchObject({ tipo: "kalter", codFornecedor: null });
    expect(d.observacao).toBe("Descarregar cedo");
    expect(d.carga).toHaveLength(1);
  });
  it("nao leva nada de cotacao, status, CT-e, datas nem versao", () => {
    const d = dadosDaCopia({ ...frete({ id: "a" }), status: "realizado", valor_cotado: 900, transportadora_codigo: 5, nr_ad: 123, data_frete: "2026-10-02", updated_at: "x" } as any);
    expect(Object.keys(d).sort()).toEqual(["carga", "destino", "idObra", "observacao", "operacao", "origem"]);
  });
  it("a carga copiada e independente da original", () => {
    const f = frete({ id: "a", carga: [{ descricao: "Motor", quantidade: 2, peso_kg: null, altura_m: null, largura_m: null, comprimento_m: null }] });
    const d = dadosDaCopia(f);
    d.carga[0].quantidade = 9;
    expect(f.carga![0].quantidade).toBe(2);
  });
});

describe("fretesParaCopiar", () => {
  const lista = [
    frete({ id: "a", numero: 10, id_obra: "o1", codigo_obra: "2182", created_at: "2026-10-01T00:00:00Z" }),
    frete({ id: "b", numero: 11, id_obra: "o2", codigo_obra: "2200", destino_nome: "Obra 2200 - Videira/SC", created_at: "2026-10-05T00:00:00Z" }),
    frete({ id: "c", numero: 12, id_obra: "o1", codigo_obra: "2182", created_at: "2026-10-03T00:00:00Z" }),
    frete({ id: "d", numero: 13, id_obra: "o3", codigo_obra: "2300", created_at: "2026-10-09T00:00:00Z" }),
  ];
  it("da mesma obra primeiro, depois os mais recentes", () => {
    expect(fretesParaCopiar(lista, "o1", "").map((f) => f.id)).toEqual(["c", "a", "d", "b"]);
  });
  it("sem obra escolhida so ordena por data", () => {
    expect(fretesParaCopiar(lista, "", "").map((f) => f.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("busca por obra, destino, numero e ignora acento e caixa", () => {
    expect(fretesParaCopiar(lista, "", "videira").map((f) => f.id)).toEqual(["b"]);
    expect(fretesParaCopiar(lista, "", "2182").map((f) => f.id)).toEqual(["c", "a"]);
    expect(fretesParaCopiar(lista, "", "13").map((f) => f.id)).toEqual(["d"]);
    expect(fretesParaCopiar(lista, "", "CURITIBA 2300").map((f) => f.id)).toEqual(["d"]);
    expect(fretesParaCopiar(lista, "", "nada")).toEqual([]);
  });
});
