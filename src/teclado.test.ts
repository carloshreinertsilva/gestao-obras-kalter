import { describe, it, expect } from "vitest";
import { contaComoRascunho } from "./teclado";

const campo = (gravaNaHora: boolean) => ({ closest: (sel: string) => (gravaNaHora && sel === "[data-sem-rascunho]" ? {} : null) });

describe("contaComoRascunho", () => {
  it("campo comum conta como digitado", () => expect(contaComoRascunho(campo(false))).toBe(true));
  it("campo que grava na hora nao conta", () => expect(contaComoRascunho(campo(true))).toBe(false));
});
