import { describe, expect, it } from "vitest";
import { erroPagamento, limparPagamento, resumoPagamento } from "./nfPagamento";

describe("forma de pagamento da NF de terceiros", () => {
  it("exige a forma e os dados de cada uma", () => {
    expect(erroPagamento("", {})).toMatch(/forma de pagamento/);
    expect(erroPagamento("boleto", {})).toBe("");
    expect(erroPagamento("pix", { chave: "x" })).toMatch(/tipo da chave/);
    expect(erroPagamento("pix", { tipo_chave: "CNPJ", chave: " " })).toMatch(/chave PIX/);
    expect(erroPagamento("pix", { tipo_chave: "CNPJ", chave: "12.345.678/0001-90" })).toBe("");
    expect(erroPagamento("deposito", { banco: "Itaú", agencia: "1234", conta: "5678" })).toMatch(/dígito/);
    expect(erroPagamento("deposito", { banco: "Itaú", agencia: "1234", conta: "5678", digito: "9" })).toBe("");
    expect(erroPagamento("cartao", {})).toMatch(/qual cartão/);
    expect(erroPagamento("cartao", { cartao: "Itaú final 1234" })).toBe("");
    expect(erroPagamento("cartao", { cartao: "4111 1111 1111 1111" })).toMatch(/Não digite o número/);
  });

  it("guarda so os campos da forma escolhida", () => {
    expect(limparPagamento("pix", { tipo_chave: "CPF", chave: " 123 ", banco: "Itaú", cartao: "x" })).toEqual({ tipo_chave: "CPF", chave: "123" });
    expect(limparPagamento("boleto", { chave: "123" })).toEqual({});
  });

  it("resumo para a tela", () => {
    expect(resumoPagamento("deposito", { banco: "Itaú", agencia: "1234", conta: "5678", digito: "9", tipo_conta: "Corrente", favorecido: "ACME" })).toEqual([
      "Depósito em conta",
      "Banco Itaú · Agência 1234 · Conta corrente 5678-9",
      "ACME",
    ]);
    expect(resumoPagamento(null, null)).toEqual([]);
  });
});
