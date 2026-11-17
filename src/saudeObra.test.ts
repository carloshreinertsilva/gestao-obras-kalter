import { describe, expect, it } from "vitest";
import { avaliarSaude, diasAte, hojeLocalISO, prazoEntrega } from "./saudeObra";

describe("avaliarSaude - areas", () => {
  it("sem nenhum indicador: tudo verde e Em dia", () => {
    const s = avaliarSaude({});
    expect(Object.values(s.areas).every((a) => a === "verde")).toBe(true);
    expect(s.geral).toBe("em_dia");
    expect(s.rotulo).toBe("Em dia");
    expect(s.motivos).toEqual([]);
  });

  it("indicador nulo ou negativo conta como zero", () => {
    const s = avaliarSaude({ parcelas_vencidas: null, tarefas_atrasadas: -1, alertas_abertos: undefined });
    expect(s.geral).toBe("em_dia");
  });

  it("parcela vencida: financeiro vermelho e Critico", () => {
    const s = avaliarSaude({ parcelas_vencidas: 2 });
    expect(s.areas.financeiro).toBe("vermelho");
    expect(s.geral).toBe("critico");
    expect(s.motivos).toEqual(["2 parcela(s) vencida(s)"]);
  });

  it.each([
    ["documentos", { documentos_atrasados: 1 }, { documentos_7dias: 1 }],
    ["cronograma", { fases_atrasadas: 1 }, { fases_7dias: 1 }],
    ["tarefas", { tarefas_atrasadas: 1 }, { tarefas_7dias: 1 }],
  ] as const)("%s: vencido = vermelho, vence em 7 dias = amarelo, vencido ganha", (area, vencido, proximo) => {
    expect(avaliarSaude(vencido).areas[area]).toBe("vermelho");
    expect(avaliarSaude(proximo).areas[area]).toBe("amarelo");
    expect(avaliarSaude({ ...vencido, ...proximo }).areas[area]).toBe("vermelho");
  });

  it("alertas: critico = vermelho e Critico; aberto nao critico = amarelo e Atencao", () => {
    const critico = avaliarSaude({ alertas_abertos: 1, alertas_criticos: 1 });
    expect(critico.areas.alertas).toBe("vermelho");
    expect(critico.geral).toBe("critico");
    expect(critico.motivos).toEqual(["1 alerta(s) crítico(s)"]);

    const atencao = avaliarSaude({ alertas_abertos: 3, alertas_criticos: 0 });
    expect(atencao.areas.alertas).toBe("amarelo");
    expect(atencao.geral).toBe("atencao");
    expect(atencao.motivos).toEqual(["3 alerta(s)"]);

    const ambos = avaliarSaude({ alertas_abertos: 3, alertas_criticos: 1 });
    expect(ambos.motivos).toEqual(["1 alerta(s) crítico(s)", "2 alerta(s)"]);
  });
});

describe("avaliarSaude - geral", () => {
  it("uma area vermelha (sem parcela nem alerta critico) = Atencao", () => {
    expect(avaliarSaude({ tarefas_atrasadas: 4 }).geral).toBe("atencao");
    expect(avaliarSaude({ documentos_atrasados: 1 }).geral).toBe("atencao");
  });

  it("duas areas vermelhas = Critico", () => {
    expect(avaliarSaude({ tarefas_atrasadas: 1, fases_atrasadas: 1 }).geral).toBe("critico");
  });

  it("varias amarelas continuam Atencao", () => {
    const s = avaliarSaude({ tarefas_7dias: 1, fases_7dias: 1, documentos_7dias: 1, alertas_abertos: 1 });
    expect(s.geral).toBe("atencao");
    expect(s.rotulo).toBe("Atenção");
  });

  it("motivos: vencidos antes do que vence em 7 dias", () => {
    const s = avaliarSaude({ fases_7dias: 1, tarefas_atrasadas: 2, documentos_7dias: 3 });
    expect(s.motivos).toEqual([
      "2 tarefa(s) atrasada(s)",
      "1 fase(s) vence(m) em 7 dias",
      "3 documento(s) vence(m) em 7 dias",
    ]);
  });

  it("gravidade ordena Critico > Atencao > Em dia e, dentro, mais areas vermelhas", () => {
    const critico2 = avaliarSaude({ tarefas_atrasadas: 1, fases_atrasadas: 1, documentos_atrasados: 1 });
    const critico1 = avaliarSaude({ parcelas_vencidas: 1 });
    const atencao = avaliarSaude({ tarefas_atrasadas: 1, fases_7dias: 1 });
    const emDia = avaliarSaude({});
    expect(critico2.gravidade).toBeGreaterThan(critico1.gravidade);
    expect(critico1.gravidade).toBeGreaterThan(atencao.gravidade);
    expect(atencao.gravidade).toBeGreaterThan(emDia.gravidade);
    expect(emDia.gravidade).toBe(0);
  });

  it("indicadores do cartao antigo (sem os de 7 dias) tambem funcionam", () => {
    const s = avaliarSaude({ tarefas_atrasadas: 0, parcelas_vencidas: 0, fases_atrasadas: 1, documentos_atrasados: 0, alertas_abertos: 0, alertas_criticos: 0 });
    expect(s.geral).toBe("atencao");
  });
});

describe("prazoEntrega / diasAte", () => {
  const hoje = "2026-11-16";

  it("limites: hoje, amanha, +7, ontem", () => {
    expect(prazoEntrega("2026-11-16", hoje)).toEqual({ texto: "vence hoje", atrasada: false, dias: 0 });
    expect(prazoEntrega("2026-11-17", hoje)?.texto).toBe("em 1 dia");
    expect(prazoEntrega("2026-11-23", hoje)?.texto).toBe("em 7 dias");
    expect(prazoEntrega("2026-11-15", hoje)).toEqual({ texto: "atrasada 1 dia", atrasada: true, dias: -1 });
    expect(prazoEntrega("2026-11-11", hoje)?.texto).toBe("atrasada 5 dias");
  });

  it("sem data ou data invalida: null", () => {
    expect(prazoEntrega(null, hoje)).toBeNull();
    expect(prazoEntrega(undefined, hoje)).toBeNull();
    expect(prazoEntrega("", hoje)).toBeNull();
    expect(prazoEntrega("sem data", hoje)).toBeNull();
  });

  it("aceita data com hora e atravessa virada de mes/ano e horario de verao", () => {
    expect(prazoEntrega("2026-12-28T00:00:00+00:00", hoje)?.dias).toBe(42);
    expect(diasAte("2027-01-01", "2026-12-31")).toBe(1);
    expect(diasAte("2026-03-01", "2026-02-28")).toBe(1);
  });

  it("hojeLocalISO usa a data do aparelho (nao a UTC)", () => {
    expect(hojeLocalISO(new Date(2026, 10, 16, 23, 30))).toBe("2026-11-16");
    expect(hojeLocalISO(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
});
