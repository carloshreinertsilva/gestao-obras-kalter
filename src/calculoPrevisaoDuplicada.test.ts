import { describe, expect, it } from "vitest";
import {
  acharDuplicada,
  centavos,
  chaveOrigens,
  diaHoraBrasilia,
  mensagemDuplicada,
  mesmoPedido,
  resumoAprovacao,
  resumoDesfazer,
  type SolicitacaoExistente,
} from "./calculoPrevisaoDuplicada";

const base = { id_obra: "o1", tipo: "aumento", familia_destino: "2218.140", valor: 1234.5 };
const existente = (extra: Partial<SolicitacaoExistente> = {}): SolicitacaoExistente => ({
  ...base,
  id: "s1",
  status: "aguardando_aprovacao",
  nome_solicitante: "Fulano de Tal",
  created_at: "2026-11-14T13:32:00Z",
  ...extra,
});

describe("centavos", () => {
  it("normaliza numero e texto do banco", () => {
    expect(centavos(1234.5)).toBe(123450);
    expect(centavos("1234.50")).toBe(123450);
    expect(centavos(0.1 + 0.2)).toBe(30);
  });
  it("vazio ou invalido nunca e igual a nada", () => {
    expect(centavos("")).toBeNaN();
    expect(centavos(null)).toBeNaN();
    expect(centavos("abc")).toBeNaN();
  });
});

describe("mesmoPedido", () => {
  it("mesma obra, familia, tipo e valor", () => {
    expect(mesmoPedido(base, { ...base, valor: "1234.50", familia_destino: " 2218.140 " })).toBe(true);
  });
  it("valor, obra, familia ou tipo diferente nao e igual", () => {
    expect(mesmoPedido(base, { ...base, valor: 1234.51 })).toBe(false);
    expect(mesmoPedido(base, { ...base, id_obra: "o2" })).toBe(false);
    expect(mesmoPedido(base, { ...base, familia_destino: "2218.150" })).toBe(false);
    expect(mesmoPedido(base, { ...base, tipo: "transferencia", origens: [] })).toBe(false);
  });
  it("valor invalido nunca bloqueia", () => {
    expect(mesmoPedido({ ...base, valor: NaN }, { ...base, valor: NaN })).toBe(false);
  });
  it("transferencia compara as origens sem ligar para a ordem", () => {
    const t = { ...base, tipo: "transferencia", valor: 150 };
    const a = [
      { familia: "2218.190", valor: "100.00" },
      { familia: "2218.200", valor: 50 },
    ];
    expect(chaveOrigens(a)).toBe(chaveOrigens([...a].reverse()));
    expect(mesmoPedido({ ...t, origens: a }, { ...t, origens: [...a].reverse() })).toBe(true);
    expect(
      mesmoPedido({ ...t, origens: a }, { ...t, origens: [{ familia: "2218.190", valor: 100 }, { familia: "2218.210", valor: 50 }] }),
    ).toBe(false);
  });
});

describe("acharDuplicada", () => {
  it("acha a igual em aberto (simulando, aguardando ou aprovada)", () => {
    for (const status of ["simulando", "aguardando_aprovacao", "aprovada"])
      expect(acharDuplicada(base, [existente({ status })])?.id).toBe("s1");
  });
  it("ignora concluida, cancelada, recusada, desfeita e com erro", () => {
    for (const status of ["executada", "cancelada", "recusada", "desfeita", "erro"])
      expect(acharDuplicada(base, [existente({ status })])).toBeUndefined();
  });
  it("ignora a propria solicitacao (reenvio) e devolve a mais antiga", () => {
    expect(acharDuplicada({ ...base, id: "s1" }, [existente()])).toBeUndefined();
    const lista = [existente({ id: "b", created_at: "2026-11-15T10:00:00Z" }), existente({ id: "a", created_at: "2026-11-14T10:00:00Z" })];
    expect(acharDuplicada(base, lista)?.id).toBe("a");
  });
});

describe("mensagemDuplicada", () => {
  it("diz quem pediu, quando (horario de Brasilia) e a situacao", () => {
    expect(diaHoraBrasilia("2026-11-14T13:32:00Z")).toBe("14/11 às 10:32");
    const m = mensagemDuplicada(existente());
    expect(m).toContain("Já existe uma solicitação igual em aberto");
    expect(m).toContain("pedida por Fulano de Tal em 14/11 às 10:32");
    expect(m).toContain("situação: aguardando aprovação");
  });
  it("sem nome nem data nao quebra", () => {
    expect(mensagemDuplicada(existente({ nome_solicitante: null, created_at: null }))).toContain("pedida por outra pessoa");
  });
});

describe("resumos das confirmacoes", () => {
  const plano = {
    familias: { destino: { nome: "TROCADORES DE CALOR", proj: "2218.140" }, origens: [{ nome: "SKIDS DIVERSOS", proj: "2218.190" }] },
    operacoes: { nova_parcela: { docto: 2793, vencto: 20261230, previsao_criada: true } },
    totais_antes: { origem: "1112667.00", destino: "0.00" },
    totais_depois_previstos: { origem: "886788.00", destino: "225879.00" },
  };
  it("transferencia: origem, destino com nomes, previsao nova e saldos antes/depois", () => {
    const t = resumoAprovacao({
      tipo: "transferencia",
      codigo_obra: "2218",
      familia_destino: "2218.140",
      valor: 225879,
      origens: [{ familia: "2218.190", valor: "225879.00" }],
      plano,
    });
    expect(t).toContain("Obra 2218");
    expect(t).toContain("De: 2218.190 - SKIDS DIVERSOS");
    expect(t).toContain("Para: 2218.140 - TROCADORES DE CALOR");
    expect(t).toContain("previsão nova nº 2793, vencimento 30/12/2026");
    expect(t).toMatch(/Em aberto no destino: R\$\s0,00 → R\$\s225\.879,00/);
    expect(t).toMatch(/Em aberto na origem: R\$\s1\.112\.667,00 → R\$\s886\.788,00/);
    expect(t).toContain("Para desfazer depois é preciso pedir o desfazimento.");
  });
  it("aumento sem plano mostra so o pedido", () => {
    const t = resumoAprovacao({ tipo: "aumento", codigo_obra: "2098", familia_destino: "2098.470", valor: 465000 });
    expect(t).toContain("Aumento de previsão de");
    expect(t).toContain("Família: 2098.470");
    expect(t).not.toContain("Em aberto");
  });
  it("desfazer lista exclusao e estornos", () => {
    const t = resumoDesfazer({
      tipo: "transferencia",
      codigo_obra: "2218",
      familia_destino: "2218.140",
      valor: 100,
      desfazer_plano: {
        operacoes: {
          excluir_parcela: { docto: 2793, parcela: 1, valor: 100, previsao_criada: true },
          estornos: [{ docto: 2726, parcela: 2, saldo_antes: 0, saldo_depois: 100 }],
        },
      },
    });
    expect(t).toContain("exclui a previsão nº 2793");
    expect(t).toContain("Devolve à previsão nº 2726 parcela 2");
    expect(t).toContain("O robô desfaz no ERP");
  });
});
