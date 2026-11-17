import { describe, expect, it } from "vitest";
import {
  PREFIXO_RASCUNHO,
  VALIDADE_RASCUNHO_MS,
  VERSAO_RASCUNHO,
  apagarRascunho,
  chaveRascunho,
  conteudoVazio,
  decidirRestauracao,
  formatarMomentoRascunho,
  gravarRascunho,
  lerRascunho,
  limparRascunhosVencidos,
  listarRascunhosDoUsuario,
  montarConteudo,
  serializarConteudo,
  temAlteracao,
  type Armazenamento,
  type RascunhoAta,
} from "./rascunhoAta";

function armazenamentoFalso(opcoes: { cheio?: boolean; quebrado?: boolean } = {}): Armazenamento & {
  dados: Map<string, string>;
} {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (k) => {
      if (opcoes.quebrado) throw new Error("SecurityError");
      return dados.has(k) ? dados.get(k)! : null;
    },
    setItem: (k, v) => {
      if (opcoes.cheio || opcoes.quebrado) throw new Error("QuotaExceededError");
      dados.set(k, v);
    },
    removeItem: (k) => {
      if (opcoes.quebrado) throw new Error("SecurityError");
      dados.delete(k);
    },
    key: (i) => Array.from(dados.keys())[i] ?? null,
    get length() {
      if (opcoes.quebrado) throw new Error("SecurityError");
      return dados.size;
    },
  };
}

const AGORA = new Date(2026, 10, 16, 14, 5).getTime();
const vazio = (data = "2026-11-16") => montarConteudo({ data_reuniao: data });

function rascunho(parcial: Partial<RascunhoAta> = {}): RascunhoAta {
  return {
    v: VERSAO_RASCUNHO,
    usuario: "u1",
    idObra: "o1",
    nomeObra: "2126 - Obra Teste",
    dataReuniao: "2026-11-16",
    idReuniao: null,
    versaoBase: null,
    salvoEm: AGORA - 60_000,
    conteudo: montarConteudo({ data_reuniao: "2026-11-16", resumo_geral: "texto digitado" }),
    ...parcial,
  };
}

describe("chaveRascunho", () => {
  it("separa usuario, obra e data (obra nova) ou ata (edicao)", () => {
    const a = chaveRascunho({ usuario: "u1", idObra: "o1", dataReuniao: "2026-11-16" });
    expect(a).toBe(`${PREFIXO_RASCUNHO}u1.o1.dia-2026-11-16`);
    expect(chaveRascunho({ usuario: "u2", idObra: "o1", dataReuniao: "2026-11-16" })).not.toBe(a);
    expect(chaveRascunho({ usuario: "u1", idObra: "o2", dataReuniao: "2026-11-16" })).not.toBe(a);
    expect(chaveRascunho({ usuario: "u1", idObra: "o1", dataReuniao: "2026-11-17" })).not.toBe(a);
    expect(chaveRascunho({ usuario: "u1", idObra: "o1", dataReuniao: "2026-11-16", idReuniao: "r9" })).toBe(
      `${PREFIXO_RASCUNHO}u1.o1.ata-r9`,
    );
  });
  it("sem usuario ou sem obra nao tem chave", () => {
    expect(chaveRascunho({ usuario: null, idObra: "o1", dataReuniao: "2026-11-16" })).toBeNull();
    expect(chaveRascunho({ usuario: "u1", idObra: "", dataReuniao: "2026-11-16" })).toBeNull();
  });
});

describe("conteudo", () => {
  it("vazio ignora tipo, prioridade e data padrao", () => {
    expect(conteudoVazio(vazio())).toBe(true);
    expect(conteudoVazio(montarConteudo({ novaOcorrencia: { tipo: "atraso", descricao: " " } }))).toBe(true);
    expect(conteudoVazio(montarConteudo({ novaTarefa: { titulo: "Ligar" } }))).toBe(false);
    expect(conteudoVazio(montarConteudo({ ocorrencias: [{ tipo: "avanco", descricao: "x" }] }))).toBe(false);
  });
  it("mesma ata em ordens de campos diferentes serializa igual", () => {
    const a = montarConteudo({ resumo_geral: "r", tarefas: [{ titulo: "t", id: "1", prioridade: "alta" }] });
    const b = montarConteudo({ tarefas: [{ prioridade: "alta", id: "1", titulo: "t" }], resumo_geral: "r" });
    expect(serializarConteudo(a)).toBe(serializarConteudo(b));
  });
  it("nao guarda campos fora da ata", () => {
    const c = montarConteudo({ tarefas: [{ titulo: "t", token: "segredo", usuarios: { email: "x@y" } }] });
    expect(JSON.stringify(c)).not.toContain("segredo");
    expect(JSON.stringify(c)).not.toContain("x@y");
  });
  it("temAlteracao: obra nova compara com vazio, edicao com a versao gravada", () => {
    const gravada = montarConteudo({ resumo_geral: "gravado" });
    const base = serializarConteudo(gravada);
    expect(temAlteracao(gravada, base)).toBe(false);
    expect(temAlteracao(montarConteudo({ resumo_geral: "gravado mais" }), base)).toBe(true);
    expect(temAlteracao(vazio(), null)).toBe(false);
    expect(temAlteracao(montarConteudo({ resumo_geral: "a" }), null)).toBe(true);
  });
});

describe("gravar / ler", () => {
  it("ida e volta", () => {
    const arm = armazenamentoFalso();
    const r = rascunho();
    expect(gravarRascunho(arm, "k", r)).toBe(true);
    expect(lerRascunho(arm, "k", AGORA)).toEqual(r);
  });
  it("JSON invalido ou versao desconhecida: ignora e apaga", () => {
    const arm = armazenamentoFalso();
    arm.dados.set("a", "{nao e json");
    arm.dados.set("b", JSON.stringify({ ...rascunho(), v: 99 }));
    arm.dados.set("c", JSON.stringify({ v: VERSAO_RASCUNHO }));
    expect(lerRascunho(arm, "a", AGORA)).toBeNull();
    expect(lerRascunho(arm, "b", AGORA)).toBeNull();
    expect(lerRascunho(arm, "c", AGORA)).toBeNull();
    expect(arm.dados.size).toBe(0);
  });
  it("mais de 14 dias: vencido", () => {
    const arm = armazenamentoFalso();
    gravarRascunho(arm, "k", rascunho({ salvoEm: AGORA - VALIDADE_RASCUNHO_MS - 1 }));
    expect(lerRascunho(arm, "k", AGORA)).toBeNull();
    expect(arm.dados.has("k")).toBe(false);
  });
  it("navegador sem armazenamento, cota cheia ou bloqueado nunca lanca", () => {
    expect(lerRascunho(null, "k", AGORA)).toBeNull();
    expect(gravarRascunho(null, "k", rascunho())).toBe(false);
    expect(gravarRascunho(armazenamentoFalso({ cheio: true }), "k", rascunho())).toBe(false);
    const quebrado = armazenamentoFalso({ quebrado: true });
    expect(() => lerRascunho(quebrado, "k", AGORA)).not.toThrow();
    expect(() => apagarRascunho(quebrado, "k")).not.toThrow();
    expect(limparRascunhosVencidos(quebrado, AGORA)).toBe(0);
    expect(listarRascunhosDoUsuario(quebrado, "u1", AGORA)).toEqual([]);
  });
});

describe("limpeza e lista", () => {
  it("limpa so os vencidos/invalidos do app e deixa o resto do navegador", () => {
    const arm = armazenamentoFalso();
    arm.dados.set("outra.coisa", "x");
    gravarRascunho(arm, `${PREFIXO_RASCUNHO}u1.o1.dia-2026-11-16`, rascunho());
    gravarRascunho(arm, `${PREFIXO_RASCUNHO}u1.o2.dia-2026-10-01`, rascunho({ salvoEm: AGORA - 20 * 86400000 }));
    arm.dados.set(`${PREFIXO_RASCUNHO}u1.o3.dia-2026-11-16`, "lixo");
    expect(limparRascunhosVencidos(arm, AGORA)).toBe(2);
    expect(Array.from(arm.dados.keys()).sort()).toEqual(
      ["outra.coisa", `${PREFIXO_RASCUNHO}u1.o1.dia-2026-11-16`].sort(),
    );
  });
  it("lista so do usuario, mais novo primeiro", () => {
    const arm = armazenamentoFalso();
    gravarRascunho(arm, `${PREFIXO_RASCUNHO}u1.o1.dia-2026-11-16`, rascunho({ salvoEm: AGORA - 1000 }));
    gravarRascunho(arm, `${PREFIXO_RASCUNHO}u1.o2.dia-2026-11-16`, rascunho({ idObra: "o2", salvoEm: AGORA }));
    gravarRascunho(arm, `${PREFIXO_RASCUNHO}u2.o1.dia-2026-11-16`, rascunho({ usuario: "u2" }));
    const lista = listarRascunhosDoUsuario(arm, "u1", AGORA);
    expect(lista.map((x) => x.rascunho.idObra)).toEqual(["o2", "o1"]);
    expect(listarRascunhosDoUsuario(arm, "u1x", AGORA)).toEqual([]);
  });
});

describe("decidirRestauracao", () => {
  it("sem rascunho: nada", () => {
    expect(decidirRestauracao({ rascunho: null, conteudoAtual: vazio(), baseJson: null, versaoBanco: null })).toEqual({
      acao: "nenhuma",
    });
  });
  it("obra nova com formulario vazio: restaura", () => {
    expect(
      decidirRestauracao({ rascunho: rascunho(), conteudoAtual: vazio(), baseJson: null, versaoBanco: null }),
    ).toEqual({ acao: "restaurar" });
  });
  it("rascunho igual ao que esta na tela: nada (ex.: re-render do App a cada 60 s)", () => {
    const r = rascunho();
    expect(
      decidirRestauracao({ rascunho: r, conteudoAtual: r.conteudo, baseJson: null, versaoBanco: null }),
    ).toEqual({ acao: "nenhuma" });
  });
  it("pessoa ja digitou outra coisa na tela: pergunta, nao sobrescreve", () => {
    expect(
      decidirRestauracao({
        rascunho: rascunho(),
        conteudoAtual: montarConteudo({ data_reuniao: "2026-11-16", resumo_geral: "digitando agora" }),
        baseJson: null,
        versaoBanco: null,
      }),
    ).toEqual({ acao: "perguntar", motivo: "formulario_com_conteudo" });
  });
  it("edicao com a mesma versao do banco: restaura", () => {
    const gravada = montarConteudo({ resumo_geral: "gravado" });
    expect(
      decidirRestauracao({
        rascunho: rascunho({ idReuniao: "r1", versaoBase: "v1" }),
        conteudoAtual: gravada,
        baseJson: serializarConteudo(gravada),
        versaoBanco: "v1",
      }),
    ).toEqual({ acao: "restaurar" });
  });
  it("edicao e outra pessoa alterou a ata depois do rascunho: pergunta", () => {
    const gravada = montarConteudo({ resumo_geral: "alterado por outra pessoa" });
    expect(
      decidirRestauracao({
        rascunho: rascunho({ idReuniao: "r1", versaoBase: "v1" }),
        conteudoAtual: gravada,
        baseJson: serializarConteudo(gravada),
        versaoBanco: "v2",
      }),
    ).toEqual({ acao: "perguntar", motivo: "alterada_no_banco" });
  });
  it("rascunho sem alteracao em relacao a base: nada", () => {
    expect(
      decidirRestauracao({
        rascunho: rascunho({ conteudo: vazio() }),
        conteudoAtual: montarConteudo({ data_reuniao: "2026-11-17" }),
        baseJson: null,
        versaoBanco: null,
      }),
    ).toEqual({ acao: "nenhuma" });
  });
});

it("formatarMomentoRascunho", () => {
  expect(formatarMomentoRascunho(AGORA)).toEqual({ dia: "16/11", hora: "14:05" });
});
