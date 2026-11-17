import { describe, expect, it } from "vitest";
import {
  arquivoBloqueado,
  extensaoArquivo,
  separarPorTipo,
  textoTipoNaoPermitido,
  tipoParaEnvio,
} from "./tiposArquivoAnexo";

describe("extensaoArquivo", () => {
  it("pega a ultima extensao em minusculas", () => {
    expect(extensaoArquivo("Planta Baixa.REV2.DWG")).toBe("dwg");
    expect(extensaoArquivo("sem_extensao")).toBe("");
    expect(extensaoArquivo("pasta.v2/arquivo")).toBe("");
  });
});

describe("arquivoBloqueado", () => {
  it("barra executavel, script, atalho, pagina e SVG", () => {
    for (const n of ["setup.exe", "a.BAT", "x.ps1", "y.js", "pagina.html", "logo.svg", "atalho.lnk", "inst.msi"]) {
      expect(arquivoBloqueado(n)).toBe(true);
    }
  });
  it("deixa passar o que ja foi enviado e o uso normal de engenharia", () => {
    for (const n of ["orcamento.xlsm", "projeto.pdf", "foto.HEIC", "planta.dwg", "corte.dxf", "fotos.rar", "a.7z",
      "email.msg", "email.eml", "dados.csv", "nf.xml", "video.mp4", "modelo.ifc", "sem_extensao"]) {
      expect(arquivoBloqueado(n)).toBe(false);
    }
  });
});

describe("separarPorTipo / textoTipoNaoPermitido", () => {
  it("separa e avisa com a extensao", () => {
    const r = separarPorTipo([{ name: "a.pdf" }, { name: "setup.exe" }]);
    expect(r.permitidos.map((a) => a.name)).toEqual(["a.pdf"]);
    expect(r.aviso).toBe("Tipo de arquivo não permitido: .exe (setup.exe).");
  });
  it("varias extensoes", () => {
    expect(textoTipoNaoPermitido([{ name: "a.exe" }, { name: "b.bat" }])).toBe(
      "Tipos de arquivo não permitidos: .exe, .bat (a.exe, b.bat).",
    );
    expect(textoTipoNaoPermitido([])).toBe("");
  });
});

describe("tipoParaEnvio", () => {
  it("mantem o tipo aceito pelo bucket", () => {
    expect(tipoParaEnvio({ type: "application/pdf" })).toBe("application/pdf");
    expect(tipoParaEnvio({ type: "application/vnd.ms-excel.sheet.macroEnabled.12" })).toBe(
      "application/vnd.ms-excel.sheet.macroenabled.12",
    );
  });
  it("tipo vazio ou desconhecido vai como octet-stream", () => {
    expect(tipoParaEnvio({ type: "" })).toBe("application/octet-stream");
    expect(tipoParaEnvio({ type: "application/x-revit" })).toBe("application/octet-stream");
  });
});
