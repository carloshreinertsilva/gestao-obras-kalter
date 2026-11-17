import { describe, expect, it, vi } from "vitest";
import { ERRO_PADRAO, mensagemErro, pareceTecnico } from "./erros";

const PAD = "Não foi possível salvar.";

describe("mensagemErro", () => {
  it("23505 com nome da restricao diz o que ja existe", () => {
    const e = { code: "23505", message: 'duplicate key value violates unique constraint "obras_codigo_externo_key"' };
    expect(mensagemErro(e, PAD)).toBe("Já existe uma obra com esse código.");
  });
  it("23505 de e-mail do usuario", () => {
    const e = { code: "23505", message: 'duplicate key value violates unique constraint "usuarios_email_key"' };
    expect(mensagemErro(e, PAD)).toContain("e-mail");
  });
  it("23505 desconhecida cai no generico, sem texto cru", () => {
    const m = mensagemErro({ code: "23505", message: 'duplicate key value violates unique constraint "xpto"' }, PAD);
    expect(m).toMatch(/Já existe/);
    expect(m).not.toMatch(/duplicate/);
  });
  it("23503", () => {
    expect(mensagemErro({ code: "23503", message: "update or delete on table x violates foreign key constraint" })).toMatch(/dependem/);
  });
  it("23502 diz o campo", () => {
    const m = mensagemErro({ code: "23502", message: 'null value in column "id_obra" of relation "tarefas" violates not-null constraint' });
    expect(m).toContain("id obra");
    expect(m).toMatch(/obrigatório/);
  });
  it("23514", () => {
    expect(mensagemErro({ code: "23514", message: 'new row for relation "t" violates check constraint "t_check"' })).toMatch(/não é permitido/);
  });
  it("22P02 e 22003", () => {
    expect(mensagemErro({ code: "22P02", message: 'invalid input syntax for type numeric: "abc"' })).toMatch(/formato inválido/);
    expect(mensagemErro({ code: "22003", message: "numeric field overflow" })).toMatch(/grande demais/);
  });
  it("42501 e row-level security", () => {
    expect(mensagemErro({ code: "42501", message: "permission denied for table x" })).toMatch(/permissão/);
    expect(mensagemErro(new Error('new row violates row-level security policy for table "tarefas"'))).toMatch(/permissão/);
  });
  it("sessao expirada", () => {
    expect(mensagemErro({ code: "PGRST301", message: "JWT expired" })).toMatch(/sessão expirou/);
    expect(mensagemErro({ message: "JWT expired" })).toMatch(/sessão expirou/);
  });
  it("PGRST116", () => {
    expect(mensagemErro({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" })).toMatch(/não encontrado/);
  });
  it("57014, 40001 e 40P01", () => {
    expect(mensagemErro({ code: "57014", message: "canceling statement due to statement timeout" })).toMatch(/demorou demais/);
    expect(mensagemErro({ code: "40001", message: "x" })).toMatch(/ao mesmo tempo/);
    expect(mensagemErro({ code: "40P01", message: "deadlock detected" })).toMatch(/ao mesmo tempo/);
  });
  it("rede", () => {
    for (const t of ["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed"])
      expect(mensagemErro(new TypeError(t))).toMatch(/Sem conexão/);
  });
  it("storage", () => {
    expect(mensagemErro({ message: "The object exceeded the maximum allowed size", status: 413 })).toMatch(/grande demais/);
    expect(mensagemErro({ message: "Payload too large" })).toMatch(/grande demais/);
    expect(mensagemErro({ message: "mime type application/x-msdownload is not supported" })).toMatch(/tipo de arquivo/);
    expect(mensagemErro({ message: "The resource already exists", status: 409 })).toMatch(/Já existe um arquivo/);
  });
  it("429", () => {
    expect(mensagemErro({ message: "Too many requests", status: 429 })).toMatch(/Aguarde/);
  });
  it("mensagem em portugues do banco passa intacta (sem prefixo ERROR:)", () => {
    expect(mensagemErro({ code: "P0001", message: "Somente aprovadores podem aprovar." })).toBe("Somente aprovadores podem aprovar.");
    expect(mensagemErro("ERROR: A solicitacao mudou. Atualize a tela e confira de novo.")).toBe(
      "A solicitacao mudou. Atualize a tela e confira de novo.",
    );
    expect(mensagemErro({ code: "42501", message: "Sem permissão para editar a ata desta obra." })).toBe(
      "Sem permissão para editar a ata desta obra.",
    );
  });
  it("texto conflito de edicao continua legivel", () => {
    const t = "A exportação foi alterado em outra janela. Recarregue.";
    expect(mensagemErro({ message: t })).toBe(t);
  });
  it("tecnico desconhecido devolve o padrao e registra o original", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(mensagemErro(new Error("relation \"foo\" does not exist"), PAD)).toBe(PAD);
    expect(mensagemErro(new TypeError("undefined is not a function"), PAD)).toBe(PAD);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
  it("null, undefined, objeto sem message, string vazia", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(mensagemErro(null, PAD)).toBe(PAD);
    expect(mensagemErro(undefined)).toBe(ERRO_PADRAO);
    expect(mensagemErro({}, PAD)).toBe(PAD);
    expect(mensagemErro({ foo: 1 })).toBe(ERRO_PADRAO);
    expect(mensagemErro("", PAD)).toBe(PAD);
    expect(mensagemErro(42, "")).toBe(ERRO_PADRAO);
    spy.mockRestore();
  });
  it("nunca lanca excecao", () => {
    const ruim = { get message(): string { throw new Error("x"); } };
    expect(() => mensagemErro(ruim, PAD)).not.toThrow();
    expect(mensagemErro(ruim, PAD)).toBe(PAD);
  });
});

describe("pareceTecnico", () => {
  it("detecta tecnico e libera portugues", () => {
    expect(pareceTecnico("violates foreign key constraint")).toBe(true);
    expect(pareceTecnico("Something went wrong")).toBe(true);
    expect(pareceTecnico("Nada para cancelar.")).toBe(false);
    expect(pareceTecnico("Usuario nao identificado")).toBe(false);
  });
});
