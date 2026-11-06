import { afterEach, describe, expect, it } from "vitest";
import { gravarFiltro, lerFiltro } from "./filtroSalvo";

const g = globalThis as any;
const original = g.window;

function armazenamento(falha = false) {
  const dados = new Map<string, string>();
  g.window = {
    localStorage: {
      getItem: (k: string) => {
        if (falha) throw new Error("bloqueado");
        return dados.has(k) ? dados.get(k)! : null;
      },
      setItem: (k: string, v: string) => {
        if (falha) throw new Error("bloqueado");
        dados.set(k, v);
      },
    },
  };
  return dados;
}

afterEach(() => {
  g.window = original;
});

describe("filtros lembrados no navegador", () => {
  it("grava e le de volta", () => {
    armazenamento();
    gravarFiltro("teste.dias", 90);
    expect(lerFiltro("teste.dias", 30)).toBe(90);
  });

  it("sem valor gravado ou com tipo diferente volta ao inicial", () => {
    const dados = armazenamento();
    expect(lerFiltro("teste.obra", "todas")).toBe("todas");
    dados.set("kalter.filtro.teste.obra", "123");
    expect(lerFiltro("teste.obra", "todas")).toBe("todas");
    dados.set("kalter.filtro.teste.obra", "{quebrado");
    expect(lerFiltro("teste.obra", "todas")).toBe("todas");
  });

  it("armazenamento bloqueado nao quebra", () => {
    armazenamento(true);
    expect(() => gravarFiltro("teste.dias", 7)).not.toThrow();
    expect(lerFiltro("teste.dias", 30)).toBe(30);
  });
});
