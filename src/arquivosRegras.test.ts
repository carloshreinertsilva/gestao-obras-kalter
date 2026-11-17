import { describe, expect, it } from "vitest";
import {
  aceitaArquivo,
  acceptPermiteImagem,
  descreverAccept,
  nomePrint,
  precisaNomeDePrint,
  semDuplicados,
  separarArquivos,
  textoProgresso,
  textoRecusa,
} from "./arquivosRegras";

const arq = (name: string, type: string, size = 1000, lastModified = 1) => ({ name, type, size, lastModified });
const MB = 1024 * 1024;

describe("aceitaArquivo", () => {
  it("sem accept aceita tudo", () => {
    expect(aceitaArquivo(arq("a.exe", "application/x-msdownload"))).toBe(true);
  });
  it("extensao e curinga de tipo", () => {
    const accept = ".pdf,image/*";
    expect(aceitaArquivo(arq("cotacao.PDF", "application/pdf"), accept)).toBe(true);
    expect(aceitaArquivo(arq("foto.jpg", "image/jpeg"), accept)).toBe(true);
    expect(aceitaArquivo(arq("planilha.xlsx", "application/vnd.ms-excel"), accept)).toBe(false);
  });
  it("tipo exato", () => {
    expect(aceitaArquivo(arq("nf.pdf", "application/pdf"), "application/pdf")).toBe(true);
    expect(aceitaArquivo(arq("nf.xml", "text/xml"), "application/pdf")).toBe(false);
  });
  it("foto do celular sem tipo e deduzida pela extensao", () => {
    expect(aceitaArquivo(arq("IMG_0001.HEIC", ""), "image/*")).toBe(true);
    expect(aceitaArquivo(arq("sem-extensao", ""), "image/*")).toBe(false);
  });
  it("accept so com extensoes de imagem aceita png colado", () => {
    expect(aceitaArquivo(arq("print.png", "image/png"), ".pdf,.png,.jpg,.jpeg")).toBe(true);
  });
});

describe("acceptPermiteImagem", () => {
  it("decide camera e colar", () => {
    expect(acceptPermiteImagem(undefined)).toBe(true);
    expect(acceptPermiteImagem(".pdf,image/*")).toBe(true);
    expect(acceptPermiteImagem(".pdf,.doc,.png")).toBe(true);
    expect(acceptPermiteImagem(".pdf,.xml")).toBe(false);
  });
});

describe("nomePrint", () => {
  it("formato print-AAAAMMDD-HHMMSS.png na hora local", () => {
    expect(nomePrint(new Date(2026, 10, 16, 9, 5, 7))).toBe("print-20261116-090507.png");
  });
  it("sufixo para varios no mesmo segundo e extensao pelo tipo", () => {
    expect(nomePrint(new Date(2026, 0, 2, 3, 4, 5), "image/jpeg", 1)).toBe("print-20260102-030405-2.jpg");
  });
  it("nome generico de area de transferencia vira print", () => {
    expect(precisaNomeDePrint("image.png")).toBe(true);
    expect(precisaNomeDePrint("")).toBe(true);
    expect(precisaNomeDePrint("foto obra.png")).toBe(false);
  });
});

describe("semDuplicados / separarArquivos", () => {
  it("tira o mesmo arquivo repetido", () => {
    const a = arq("a.png", "image/png");
    expect(semDuplicados([a, { ...a }, arq("b.png", "image/png")])).toHaveLength(2);
  });
  it("mesmo nome com tamanho diferente nao e repetido", () => {
    expect(semDuplicados([arq("a.png", "image/png", 10), arq("a.png", "image/png", 20)])).toHaveLength(2);
  });
  it("recusa por tipo e por tamanho e entrega os demais", () => {
    const r = separarArquivos(
      [arq("ok.pdf", "application/pdf", 2 * MB), arq("grande.pdf", "application/pdf", 11 * MB), arq("x.zip", "application/zip")],
      { accept: ".pdf,image/*", maxMb: 10 },
    );
    expect(r.aceitos.map((a) => a.name)).toEqual(["ok.pdf"]);
    expect(r.recusados.map((x) => [x.arquivo.name, x.motivo])).toEqual([
      ["grande.pdf", "tamanho"],
      ["x.zip", "tipo"],
    ]);
  });
  it("sem maxMb nao limita tamanho", () => {
    expect(separarArquivos([arq("a.pdf", "application/pdf", 500 * MB)], {}).aceitos).toHaveLength(1);
  });
});

describe("textos", () => {
  it("descreve o accept", () => {
    expect(descreverAccept(".pdf,image/*")).toBe("PDF ou imagem");
    expect(descreverAccept(".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg")).toBe("PDF, Word, Excel ou imagem");
  });
  it("aviso de recusa diz quais e por que", () => {
    const t = textoRecusa(
      [
        { arquivo: arq("x.zip", "application/zip"), motivo: "tipo" },
        { arquivo: arq("grande.pdf", "application/pdf"), motivo: "tamanho" },
      ],
      { accept: ".pdf,image/*", maxMb: 10 },
    );
    expect(t).toBe("Arquivo não aceito: x.zip (aqui só PDF ou imagem). Arquivo maior que 10 MB: grande.pdf.");
  });
  it("progresso", () => {
    expect(textoProgresso(2, 5)).toBe("Enviando 2 de 5…");
    expect(textoProgresso(1, 1)).toBe("Enviando…");
  });
});
