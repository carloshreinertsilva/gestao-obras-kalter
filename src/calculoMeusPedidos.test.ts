import { describe, expect, it } from "vitest";
import {
  COM_VOCE,
  agruparPedidos,
  diasParado,
  estaParado,
  limitarGrupos,
  telaDoModulo,
  textoHa,
  type PedidoAndamento,
} from "./calculoMeusPedidos";

const p = (x: Partial<PedidoAndamento>): PedidoAndamento => ({
  modulo: "faturamento",
  id: Math.random().toString(36),
  id_obra: null,
  codigo_obra: "2182",
  titulo: "t",
  status: "aguardando_logistica",
  status_rotulo: "Aguardando logística",
  com_quem: "Logística",
  desde: "2026-11-16T10:00:00-03:00",
  aberto_em: null,
  prazo: null,
  ...x,
});

// segunda-feira, 16/11/2026
const HOJE = new Date(2026, 10, 16, 15, 0);

describe("dias parado", () => {
  it("conta dias uteis desde a entrada na etapa", () => {
    expect(diasParado(p({ desde: "2026-11-13T09:00:00-03:00" }), HOJE)).toBe(1); // sexta -> segunda
    expect(diasParado(p({ desde: "2026-11-06T09:00:00-03:00" }), HOJE)).toBe(6);
    expect(diasParado(p({ desde: null }), HOJE)).toBeNull();
  });

  it("destaca so acima de 5 dias uteis", () => {
    expect(estaParado(p({ desde: "2026-11-09T09:00:00-03:00" }), HOJE)).toBe(false); // 5 dias uteis
    expect(estaParado(p({ desde: "2026-11-06T09:00:00-03:00" }), HOJE)).toBe(true); // 6 dias uteis
    expect(estaParado(p({ desde: null }), HOJE)).toBe(false);
  });

  it("dentro do prazo normal (NF a pagar antes do vencimento) nao e parado", () => {
    const nf = { modulo: "nfs_terceiros", status: "lancada", desde: "2026-10-27T12:00:00-03:00" };
    expect(estaParado(p({ ...nf, prazo: "2026-11-20" }), HOJE)).toBe(false);
    expect(estaParado(p({ ...nf, prazo: "2026-11-16" }), HOJE)).toBe(false); // vence hoje
    expect(estaParado(p({ ...nf, prazo: "2026-11-13" }), HOJE)).toBe(true); // venceu e nao foi paga
  });

  it("texto", () => {
    expect(textoHa(0)).toBe("desde hoje");
    expect(textoHa(1)).toBe("há 1 dia útil");
    expect(textoHa(3)).toBe("há 3 dias úteis");
    expect(textoHa(null)).toBe("");
  });
});

describe("agrupar", () => {
  const lista = [
    p({ id: "f1", modulo: "fretes", com_quem: "Logística", desde: "2026-11-10T10:00:00Z" }),
    p({ id: "s2", modulo: "faturamento", desde: "2026-11-12T10:00:00Z" }),
    p({ id: "s1", modulo: "faturamento", desde: "2026-11-05T10:00:00Z" }),
    p({ id: "d1", modulo: "nfs_terceiros", com_quem: COM_VOCE, desde: "2026-11-11T10:00:00Z" }),
    p({ id: "pv", modulo: "solicitacoes_previsao", com_quem: "Aprovador" }),
    p({ id: "x", modulo: "modulo_novo" }),
  ];

  it("devolvidos no topo, depois por modulo na ordem fixa, mais antigo primeiro", () => {
    const g = agruparPedidos(lista);
    expect(g.map((x) => x.chave)).toEqual(["com_voce", "solicitacoes_previsao", "faturamento", "fretes", "outros"]);
    expect(g[0].itens.map((x) => x.id)).toEqual(["d1"]);
    expect(g[2].itens.map((x) => x.id)).toEqual(["s1", "s2"]);
  });

  it("limita as primeiras linhas sem grupo vazio", () => {
    const g = limitarGrupos(agruparPedidos(lista), 3);
    expect(g.map((x) => x.chave)).toEqual(["com_voce", "solicitacoes_previsao", "faturamento"]);
    expect(g[2].itens.map((x) => x.id)).toEqual(["s1"]);
    expect(limitarGrupos(agruparPedidos(lista), 100).flatMap((x) => x.itens)).toHaveLength(lista.length);
    expect(limitarGrupos([], 5)).toEqual([]);
  });

  it("tela de cada modulo", () => {
    expect(telaDoModulo("nfs_terceiros")).toBe("nfs_terceiros");
    expect(telaDoModulo("materiais")).toBe("materiais");
    expect(telaDoModulo("qualquer")).toBe("dashboard");
  });
});
