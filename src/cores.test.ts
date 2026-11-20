import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COR_PETROLEO, COR_PETROLEO_ESCURO } from "./cores";

// tailwind.config.js e JS fora do projeto TS: confere o texto em vez de importar
const config = readFileSync(new URL("../tailwind.config.js", import.meta.url), "utf8");

describe("cores da marca", () => {
  it("tailwind e cores.ts usam o mesmo petroleo", () => {
    expect(config).toContain(`DEFAULT: "${COR_PETROLEO}"`);
    expect(config).toContain(`escuro: "${COR_PETROLEO_ESCURO}"`);
  });

  it("nenhum hex do petroleo escrito a mao nas telas", () => {
    // so cores.ts guarda o valor; o resto usa as classes petroleo/petroleo-escuro ou COR_PETROLEO
    const arquivos = import.meta.glob("./**/*.{ts,tsx,css}", { query: "?raw", import: "default", eager: true });
    const comHex = Object.entries(arquivos)
      .filter(([caminho]) => !caminho.endsWith("cores.ts") && !caminho.endsWith("cores.test.ts"))
      .filter(([, texto]) => /#(2a6377|1e4857)\b/i.test(texto as string))
      .map(([caminho]) => caminho);
    expect(Object.keys(arquivos).length).toBeGreaterThan(100);
    expect(comHex).toEqual([]);
  });
});
