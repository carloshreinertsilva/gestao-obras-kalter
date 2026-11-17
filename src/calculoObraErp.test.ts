import { describe, expect, it } from "vitest";
import {
  anexarValoresProjetos,
  camposDoProjeto,
  localDoCliente,
  normalizarCodigoErp,
  planejarPreenchimento,
  resumoGravacaoErp,
  totalProjetoErp,
  type ProjetoErp,
} from "./calculoObraErp";

const projeto: ProjetoErp = {
  codigo: "2233",
  nome: "METAL MARC - GAO - START UP",
  pedido_venda: 2233,
  situacao_pedido: "P",
  cliente_nome: "METAL MARC INDUSTRIA METALURGICA LTDA",
  cidade: "Guaporé",
  uf: "RS",
  valor_produto: "0.00",
  valor_servico: "14000.00",
  data_pedido: "2026-08-17",
  data_aprovacao: "2026-08-17",
  data_entrega_prevista: "2026-09-16",
};

describe("camposDoProjeto", () => {
  it("monta nome, descricao com cliente e pedido, datas e valores", () => {
    expect(camposDoProjeto(projeto)).toEqual({
      nome: "METAL MARC - GAO - START UP",
      descricao: "Cliente: METAL MARC INDUSTRIA METALURGICA LTDA - Guaporé/RS · Pedido de venda 2233",
      data_inicio: "2026-08-17",
      data_previsao_fim: "2026-09-16",
      valor_produto: "",
      valor_servico: "14000",
    });
  });

  it("sem aprovacao usa a data do pedido; sem cidade fica so a UF", () => {
    const c = camposDoProjeto({ ...projeto, data_aprovacao: null, cidade: null, uf: "EX", pedido_venda: null });
    expect(c.data_inicio).toBe("2026-08-17");
    expect(c.descricao).toBe("Cliente: METAL MARC INDUSTRIA METALURGICA LTDA - EX");
  });
});

describe("planejarPreenchimento", () => {
  it("preenche so os vazios e lista as diferencas dos digitados", () => {
    const { preencher, diferencas } = planejarPreenchimento(
      { nome: "Metal Marc start-up", descricao: "", data_inicio: "", data_previsao_fim: "2026-09-16", valor_produto: "", valor_servico: "14000.00" },
      projeto,
    );
    expect(preencher).toEqual({
      descricao: "Cliente: METAL MARC INDUSTRIA METALURGICA LTDA - Guaporé/RS · Pedido de venda 2233",
      data_inicio: "2026-08-17",
    });
    expect(diferencas).toEqual([{ campo: "nome", rotulo: "Nome", digitado: "Metal Marc start-up", erp: "METAL MARC - GAO - START UP" }]);
  });

  it("valor zero no formulario conta como vazio; valor zero do ERP nao preenche", () => {
    const { preencher, diferencas } = planejarPreenchimento({ valor_produto: 0, valor_servico: "0" }, projeto);
    expect(preencher.valor_servico).toBe("14000");
    expect("valor_produto" in preencher).toBe(false);
    expect(diferencas).toEqual([]);
  });
});

describe("auxiliares", () => {
  it("normaliza codigo e local", () => {
    expect(normalizarCodigoErp(" 2233 ")).toBe("2233");
    expect(normalizarCodigoErp(undefined)).toBe("");
    expect(localDoCliente({ cidade: null, uf: null })).toBe("");
  });
});

describe("resumoGravacaoErp", () => {
  it("mostra atual -> novo e marca o que muda; atual desconhecido = null", () => {
    const linhas = resumoGravacaoErp({ venda: "1000", contribuicao: "", rentabilidade: "50" }, { venda: "1000", contribuicao: "200", rentabilidade: "60.5" });
    expect(linhas).toEqual([
      { chave: "venda", rotulo: "Faturamento sem impostos", atual: 1000, novo: 1000, muda: false },
      { chave: "contribuicao", rotulo: "Margem de contribuição", atual: null, novo: 200, muda: true },
      { chave: "rentabilidade", rotulo: "Rentabilidade", atual: 50, novo: 60.5, muda: true },
    ]);
  });
});

describe("valores do projeto (tabela restrita)", () => {
  it("junta pelo codigo; sem linha = sem acesso = null", () => {
    const [com, sem] = anexarValoresProjetos([{ codigo: "2262" }, { codigo: "2233" }], [{ codigo: "2262", valor_produto: "10.50", valor_servico: "0" }]);
    expect(com).toEqual({ codigo: "2262", valor_produto: "10.50", valor_servico: "0" });
    expect(sem).toEqual({ codigo: "2233", valor_produto: null, valor_servico: null });
    expect(totalProjetoErp(com)).toBe(10.5);
    expect(totalProjetoErp(sem)).toBeNull();
  });

  it("sem acesso aos valores preenche so os outros campos", () => {
    const c = camposDoProjeto({ ...projeto, valor_produto: null, valor_servico: null });
    expect(c.valor_produto).toBe("");
    expect(c.valor_servico).toBe("");
    expect(c.nome).not.toBe("");
    const { preencher, diferencas } = planejarPreenchimento({ valor_produto: "500", valor_servico: "" }, { ...projeto, valor_produto: null, valor_servico: null });
    expect("valor_produto" in preencher || "valor_servico" in preencher).toBe(false);
    expect(diferencas.map((d) => d.campo)).not.toContain("valor_produto");
  });
});
