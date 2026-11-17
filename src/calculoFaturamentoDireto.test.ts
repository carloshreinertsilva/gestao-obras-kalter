import { describe, expect, it } from "vitest";
import { ajudaFaturamentoDireto, situacaoEnvioFaturamentoDireto } from "./calculoFaturamentoDireto";

describe("ajudaFaturamentoDireto", () => {
  it("desligado (ou ainda sem resposta) avisa que nao vai ao ERP", () => {
    expect(ajudaFaturamentoDireto(false)).toContain("O envio ao ERP ainda está desligado.");
    expect(ajudaFaturamentoDireto(null)).toContain("O envio ao ERP ainda está desligado.");
  });
  it("ligado diz que o robo envia", () => {
    expect(ajudaFaturamentoDireto(true)).toContain("o robô envia o valor ao ERP");
  });
});

describe("situacaoEnvioFaturamentoDireto", () => {
  it("sem situacao (nunca alterado no app) nao mostra nada", () => {
    expect(situacaoEnvioFaturamentoDireto(null, true)).toBeNull();
    expect(situacaoEnvioFaturamentoDireto({ faturamento_direto_erp_situacao: null }, true)).toBeNull();
  });
  it("gravado mostra a data no horario de Brasilia", () => {
    const r = situacaoEnvioFaturamentoDireto(
      { faturamento_direto_erp_situacao: "gravado", faturamento_direto_erp_em: "2026-11-18T13:05:00+00:00" },
      true,
    );
    expect(r).toEqual({ texto: "Envio ao ERP: gravado em 18/11/2026, 10:05.", tom: "ok" });
  });
  it("erro mostra a mensagem do robo", () => {
    const r = situacaoEnvioFaturamentoDireto(
      { faturamento_direto_erp_situacao: "erro", faturamento_direto_erp_erro: "Obra 9 não encontrada no cadastro de projetos do ERP (CADPROJ)." },
      true,
    );
    expect(r?.tom).toBe("erro");
    expect(r?.texto).toBe("Envio ao ERP: não gravado - Obra 9 não encontrada no cadastro de projetos do ERP (CADPROJ).");
  });
  it("pendente depende da chave e mostra a tentativa que falhou", () => {
    expect(situacaoEnvioFaturamentoDireto({ faturamento_direto_erp_situacao: "pendente" }, false)?.texto).toContain("desligado");
    expect(situacaoEnvioFaturamentoDireto({ faturamento_direto_erp_situacao: "pendente" }, true)?.texto).toContain("alguns minutos");
    expect(
      situacaoEnvioFaturamentoDireto({ faturamento_direto_erp_situacao: "pendente", faturamento_direto_erp_erro: "ERP ocupado" }, true)?.texto,
    ).toContain("nova tentativa em breve - ERP ocupado");
  });
});
