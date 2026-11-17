import { describe, expect, it } from "vitest";
import {
  descreverPrevisto,
  descreverReal,
  geometria,
  intervaloPrevisto,
  intervaloReal,
  linhaDeFase,
  linhaDeObra,
  montarEscala,
  situacaoFase,
  somarDias,
  type FaseCronograma,
} from "./calculoGantt";

const HOJE = "2026-11-16";
const fase = (p: Partial<FaseCronograma>): FaseCronograma => ({ id: "f", status: "nao_iniciado", ...p });

describe("situacaoFase", () => {
  it("concluida por status ou por fim real", () => {
    expect(situacaoFase(fase({ status: "concluido" }), HOJE)).toBe("concluida");
    expect(situacaoFase(fase({ status: "em_andamento", fim_real: "2026-10-01" }), HOJE)).toBe("concluida");
  });
  it("atrasada quando o fim previsto passou e nao terminou (mesmo com status desatualizado)", () => {
    expect(situacaoFase(fase({ fim_previsto: "2026-11-15" }), HOJE)).toBe("atrasada");
    expect(situacaoFase(fase({ status: "em_andamento", fim_previsto: "2026-11-15" }), HOJE)).toBe("atrasada");
    expect(situacaoFase(fase({ status: "atrasado" }), HOJE)).toBe("atrasada");
  });
  it("fim previsto hoje ainda nao e atraso", () => {
    expect(situacaoFase(fase({ fim_previsto: HOJE }), HOJE)).toBe("a_iniciar");
  });
  it("em andamento por status ou inicio real; cancelada", () => {
    expect(situacaoFase(fase({ status: "em_andamento" }), HOJE)).toBe("em_andamento");
    expect(situacaoFase(fase({ inicio_real: "2026-11-01" }), HOJE)).toBe("em_andamento");
    expect(situacaoFase(fase({ status: "cancelado", fim_previsto: "2026-01-01" }), HOJE)).toBe("cancelada");
  });
});

describe("intervalos", () => {
  it("previsto sem datas = sem barra; so uma data = marco de um dia; datas trocadas sao ordenadas", () => {
    expect(intervaloPrevisto(fase({}))).toBeNull();
    expect(intervaloPrevisto(fase({ fim_previsto: "2026-12-01" }))).toEqual({ inicio: "2026-12-01", fim: "2026-12-01" });
    expect(intervaloPrevisto(fase({ inicio_previsto: "2026-12-10", fim_previsto: "2026-12-01" }))).toEqual({
      inicio: "2026-12-01",
      fim: "2026-12-10",
    });
  });
  it("realizado em andamento vai ate hoje", () => {
    expect(intervaloReal(fase({ inicio_real: "2026-11-01" }), HOJE)).toEqual({
      intervalo: { inicio: "2026-11-01", fim: HOJE },
      emAberto: true,
    });
    expect(intervaloReal(fase({ inicio_real: "2026-11-01", fim_real: "2026-11-05" }), HOJE).emAberto).toBe(false);
    expect(intervaloReal(fase({}), HOJE).intervalo).toBeNull();
  });
  it("aceita data com hora (timestamp) sem escorregar o dia", () => {
    expect(intervaloPrevisto(fase({ inicio_previsto: "2026-03-01T00:00:00+00:00", fim_previsto: "2026-03-31" }))).toEqual({
      inicio: "2026-03-01",
      fim: "2026-03-31",
    });
  });
});

describe("montarEscala", () => {
  it("sem nenhuma data: sem escala", () => {
    expect(montarEscala([linhaDeFase(fase({}), "Engenharia", HOJE)], HOJE)).toBeNull();
  });
  it("periodo longo: meses inteiros, sem semanas, inclui hoje", () => {
    const l = linhaDeFase(fase({ inicio_previsto: "2026-01-10", fim_previsto: "2026-06-20" }), "Montagem", HOJE);
    const e = montarEscala([l], HOJE)!;
    expect(e.inicio).toBe("2026-01-01");
    expect(e.fim).toBe("2026-12-01"); // vai ate o mes de hoje
    expect(e.meses.map((m) => m.rotulo)).toEqual(["jan/26", "fev/26", "mar/26", "abr/26", "mai/26", "jun/26", "jul/26", "ago/26", "set/26", "out/26", "nov/26"]);
    expect(e.semanas).toEqual([]);
    expect(e.posicaoHoje).toBeGreaterThan(90);
    expect(e.larguraMinimaPx).toBeGreaterThan(800);
  });
  it("periodo curto: marcas por semana nas segundas-feiras", () => {
    const l = linhaDeFase(fase({ inicio_previsto: "2026-11-03", fim_previsto: "2026-11-28" }), "Montagem", HOJE);
    const e = montarEscala([l], HOJE)!;
    expect(e.semanas.map((s) => s.rotulo)).toEqual(["02/11", "09/11", "16/11", "23/11", "30/11"]);
  });
  it("virada de ano", () => {
    const l = linhaDeFase(fase({ inicio_previsto: "2026-12-15", fim_previsto: "2027-01-20" }), "x", "2026-12-20");
    const e = montarEscala([l], "2026-12-20")!;
    expect(e.inicio).toBe("2026-12-01");
    expect(e.fim).toBe("2027-02-01");
    expect(e.meses.map((m) => m.rotulo)).toEqual(["dez/26", "jan/27"]);
  });
  it("geometria conta o dia final inteiro", () => {
    const l = linhaDeFase(fase({ inicio_previsto: "2026-11-01", fim_previsto: "2026-11-30" }), "x", HOJE);
    const e = montarEscala([l], HOJE)!;
    const g = geometria(l.previsto!, e);
    expect(g.esquerda).toBe(0);
    expect(g.largura).toBeCloseTo(100);
  });
});

describe("textos acessiveis", () => {
  it("descreve previsto e realizado com datas no formato brasileiro", () => {
    const l = linhaDeFase(
      fase({ inicio_previsto: "2026-10-01", fim_previsto: "2026-11-10", inicio_real: "2026-10-05", status: "em_andamento" }),
      "Fabricação",
      HOJE,
    );
    expect(descreverPrevisto(l)).toBe("Fabricação: previsto de 01/10/2026 a 10/11/2026. Situação: Atrasada");
    expect(descreverReal(l)).toBe("Fabricação: realizado iniciado em 05/10/2026, em andamento até hoje");
  });
});

describe("linhaDeObra (carteira)", () => {
  const nome = (f: string) => f.toUpperCase();
  const obra = { id: "o1", codigo: "1497", nome: "Obra X", data_inicio: "2025-10-06", data_previsao_fim: "2027-03-31", fase_atual: "montagem" };
  const fases: FaseCronograma[] = [
    fase({ id: "a", fase: "engenharia", ordem: 2, inicio_previsto: "2025-11-01", fim_previsto: "2026-01-31", status: "concluido" }),
    fase({ id: "b", fase: "processo_inicial", ordem: 1, inicio_previsto: "2025-10-10", fim_previsto: "2025-10-31", status: "concluido" }),
    fase({ id: "c", fase: "montagem", ordem: 5, inicio_previsto: "2026-06-01", fim_previsto: "2026-10-31", status: "em_andamento" }),
    fase({ id: "d", fase: "garantia", ordem: 8, inicio_previsto: "2027-01-01", fim_previsto: "2027-03-31" }),
  ];

  it("do inicio da primeira fase ate a entrega prevista, com marcos e fase atual destacada", () => {
    const l = linhaDeObra(obra, fases, HOJE, nome);
    expect(l.previsto).toEqual({ inicio: "2025-10-10", fim: "2027-03-31" });
    expect(l.marcos.map((m) => m.iso)).toEqual(["2025-10-31", "2026-01-31", "2026-10-31", "2027-03-31"]);
    expect(l.destaque).toMatchObject({ inicio: "2026-06-01", fim: "2026-10-31", situacao: "atrasada" });
    expect(l.situacao).toBe("atrasada");
    expect(l.complemento).toBe("Fase atual: MONTAGEM · 1 fase vencida · entrega 31/03/2027");
  });

  it("cronograma desatualizado: conta as fases vencidas no texto", () => {
    const velhas = Array.from({ length: 8 }, (_, i) =>
      fase({ id: String(i), fase: "compras", ordem: i, inicio_previsto: "2026-01-01", fim_previsto: somarDias("2026-02-01", i) }),
    );
    const l = linhaDeObra({ ...obra, data_previsao_fim: "2026-10-30" }, velhas, HOJE, nome);
    expect(l.complemento).toContain("8 fases vencidas");
    expect(l.complemento).toContain("entrega vencida em 30/10/2026");
    expect(l.marcos.every((m) => m.situacao === "atrasada")).toBe(true);
  });

  it("sem fases e sem datas: linha sem barra", () => {
    const l = linhaDeObra({ id: "x", codigo: "1", nome: "n" }, [], HOJE, nome);
    expect(l.previsto).toBeNull();
    expect(l.situacao).toBe("a_iniciar");
  });

  it("sem fases usa inicio e entrega da obra", () => {
    const l = linhaDeObra(obra, [], HOJE, nome);
    expect(l.previsto).toEqual({ inicio: "2025-10-06", fim: "2027-03-31" });
    expect(l.destaque).toBeNull();
  });
});
