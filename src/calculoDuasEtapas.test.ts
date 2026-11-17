import { describe, expect, it } from "vitest";
import {
  codigoCompleto,
  decidirEtapaMfa,
  fatoresPendentes,
  fatoresVerificados,
  formatarChave,
  limparCodigo,
  mensagemErroMfa,
  nivelDaSessao,
  podeDesativar,
  precisaCodigoNoLogin,
} from "./calculoDuasEtapas";

// token falso so com o payload (assinatura nao importa para a leitura)
const token = (payload: object) => {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `cabecalho.${b64}.assinatura`;
};
const totpOk = { factor_type: "totp", status: "verified" };
const totpPendente = { factor_type: "totp", status: "unverified" };

describe("nivelDaSessao", () => {
  it("le o aal do token", () => {
    expect(nivelDaSessao(token({ aal: "aal1" }))).toBe("aal1");
    expect(nivelDaSessao(token({ aal: "aal2", email: "a@kalter.com.br" }))).toBe("aal2");
  });
  it("token ausente ou estragado nao quebra", () => {
    expect(nivelDaSessao(undefined)).toBeNull();
    expect(nivelDaSessao("lixo")).toBeNull();
    expect(nivelDaSessao("a.%%%.c")).toBeNull();
    expect(nivelDaSessao(token({ sub: "x" }))).toBeNull();
  });
  it("aceita payload com caracteres que viram - e _ no base64url", () => {
    expect(nivelDaSessao(token({ aal: "aal2", nome: "João ação ~~~ ???" }))).toBe("aal2");
  });
});

describe("decidirEtapaMfa", () => {
  it("sessao so de senha com aplicativo ativado pede o codigo", () => {
    expect(decidirEtapaMfa({ aal: "aal1", temFator: true, exigido: false })).toBe("codigo");
    expect(decidirEtapaMfa({ aal: "aal1", temFator: true, exigido: true })).toBe("codigo");
  });
  it("ja passou pelo codigo: libera", () => {
    expect(decidirEtapaMfa({ aal: "aal2", temFator: true, exigido: true })).toBe("ok");
    expect(decidirEtapaMfa({ aal: "aal2", temFator: false, exigido: true })).toBe("ok");
  });
  it("obrigado e sem aplicativo: manda ativar", () => {
    expect(decidirEtapaMfa({ aal: "aal1", temFator: false, exigido: true })).toBe("ativar_obrigatorio");
  });
  it("chave desligada e sem aplicativo: nada muda", () => {
    expect(decidirEtapaMfa({ aal: "aal1", temFator: false, exigido: false })).toBe("ok");
    expect(decidirEtapaMfa({ aal: null, temFator: false, exigido: false })).toBe("ok");
  });
});

describe("precisaCodigoNoLogin", () => {
  it("so com fator verificado e sessao aal1", () => {
    expect(precisaCodigoNoLogin({ access_token: token({ aal: "aal1" }), user: { factors: [totpOk] } })).toBe(true);
    expect(precisaCodigoNoLogin({ access_token: token({ aal: "aal2" }), user: { factors: [totpOk] } })).toBe(false);
    expect(precisaCodigoNoLogin({ access_token: token({ aal: "aal1" }), user: { factors: [totpPendente] } })).toBe(false);
    expect(precisaCodigoNoLogin({ access_token: token({ aal: "aal1" }), user: { factors: null } })).toBe(false);
    expect(precisaCodigoNoLogin(null)).toBe(false);
  });
});

describe("fatores", () => {
  it("separa verificados de pendentes (so aplicativo)", () => {
    const lista = [totpOk, totpPendente, { factor_type: "phone", status: "verified" }];
    expect(fatoresVerificados(lista)).toEqual([totpOk]);
    expect(fatoresPendentes(lista)).toEqual([totpPendente]);
    expect(fatoresVerificados(undefined)).toEqual([]);
  });
});

describe("codigo digitado", () => {
  it("limpa espacos e tracos e corta em 6", () => {
    expect(limparCodigo("123 456")).toBe("123456");
    expect(limparCodigo("12-34-56-78")).toBe("123456");
    expect(limparCodigo("")).toBe("");
  });
  it("completo so com 6 digitos", () => {
    expect(codigoCompleto("123 456")).toBe(true);
    expect(codigoCompleto("12345")).toBe(false);
    expect(codigoCompleto("abcdef")).toBe(false);
  });
});

describe("formatarChave", () => {
  it("blocos de 4", () => {
    expect(formatarChave("ABCDEFGHIJKL")).toBe("ABCD EFGH IJKL");
    expect(formatarChave("ABCDE")).toBe("ABCD E");
    expect(formatarChave("")).toBe("");
  });
});

describe("podeDesativar", () => {
  it("quem e obrigado nao desativa", () => {
    expect(podeDesativar({ exigido: true })).toBe(false);
    expect(podeDesativar({ exigido: false })).toBe(true);
  });
});

describe("mensagemErroMfa", () => {
  it("traduz os erros do Supabase", () => {
    expect(mensagemErroMfa({ code: "mfa_verification_failed", message: "Invalid TOTP code entered" })).toMatch(/Código incorreto/);
    expect(mensagemErroMfa({ code: "mfa_challenge_expired", message: "MFA challenge has expired" })).toMatch(/tempo/);
    expect(mensagemErroMfa({ status: 429, message: "Too many requests" })).toMatch(/Muitas tentativas/);
    expect(mensagemErroMfa({ code: "mfa_totp_enroll_not_enabled", message: "MFA enroll is disabled for TOTP" })).toMatch(/não está habilitada/);
    expect(mensagemErroMfa({ code: "insufficient_aal", message: "AAL2 required" })).toMatch(/Saia e entre/);
    expect(mensagemErroMfa(new TypeError("Failed to fetch"))).toMatch(/Sem conexão/);
    expect(mensagemErroMfa(null)).toMatch(/Não foi possível/);
  });
});
