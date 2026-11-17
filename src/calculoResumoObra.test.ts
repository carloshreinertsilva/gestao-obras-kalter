import { describe, expect, it } from "vitest";
import {
  familiasEmAlerta,
  principaisPendencias,
  resumirCompras,
  resumirCronograma,
  resumirFaturamento,
  resumirRecebimento,
  resumirTarefas,
  resumirTexto,
} from "./calculoResumoObra";

const HOJE = "2026-11-16";

describe("resumirFaturamento", () => {
  it("escopo - NFs ligadas a familia, com % para a barra", () => {
    const r = resumirFaturamento(
      [{ valor_total_escopo: 1000 }, { valor_total_escopo: "500.10" }],
      [
        { valor_realizado: 300, id_obra_faturamento_familia: "f1" },
        { valor_realizado: 0.1, id_obra_faturamento_familia: "f2" },
        { valor_realizado: 999, id_obra_faturamento_familia: null },
      ],
    );
    expect(r.escopo).toBe(1500.1);
    expect(r.faturado).toBe(300.1);
    expect(r.aFaturar).toBe(1200);
    expect(r.pct).toBeCloseTo(20.005, 2);
    expect(r.semEscopo).toBe(false);
  });

  it("faturado acima do escopo: a faturar zero e barra em 100%", () => {
    const r = resumirFaturamento([{ valor_total_escopo: 100 }], [{ valor_realizado: 150, id_obra_faturamento_familia: "f" }]);
    expect(r.aFaturar).toBe(0);
    expect(r.pct).toBe(100);
  });

  it("obra sem escopo: nada a faturar", () => {
    const r = resumirFaturamento([], [{ valor_realizado: 10, id_obra_faturamento_familia: "f" }]);
    expect(r.semEscopo).toBe(true);
    expect(r.aFaturar).toBe(0);
    expect(r.pct).toBe(0);
  });
});

describe("resumirRecebimento", () => {
  it("recebido, a receber (venda - recebido), vencido e proxima parcela", () => {
    const r = resumirRecebimento(
      [
        { descricao: "Sinal", data_prevista: "2026-10-01", valor_previsto: 100, valor_realizado: 100 },
        { descricao: "Medição 1", data_prevista: "2026-11-01", valor_previsto: 200, valor_realizado: 50 },
        { descricao: "Medição 3", data_prevista: "2027-01-10", valor_previsto: 300, valor_realizado: 0 },
        { descricao: "Medição 2", data_prevista: "2026-11-16", valor_previsto: 250, valor_realizado: 0 },
        { descricao: "Cancelada", data_prevista: "2026-11-20", valor_previsto: 90, valor_realizado: 0, status: "cancelado" },
      ],
      1000,
      HOJE,
    );
    expect(r.recebido).toBe(150);
    expect(r.aReceber).toBe(850);
    expect(r.vencido).toBe(150);
    expect(r.parcelasVencidas).toBe(1);
    // vence hoje ainda nao e vencida - e a proxima
    expect(r.proxima).toEqual({ descricao: "Medição 2", data: "2026-11-16", valor: 250 });
  });

  it("sem parcelas futuras: sem proxima; recebido acima da venda nao fica negativo", () => {
    const r = resumirRecebimento([{ data_prevista: "2026-01-01", valor_previsto: 100, valor_realizado: 120 }], 100, HOJE);
    expect(r.proxima).toBeNull();
    expect(r.aReceber).toBe(0);
    expect(r.vencido).toBe(0);
  });

  it("sem acesso ao valor de venda: a receber fica null (nao vira a venda inteira nem zero)", () => {
    const r = resumirRecebimento([{ data_prevista: "2026-01-01", valor_previsto: 100, valor_realizado: 40 }], null, HOJE);
    expect(r.aReceber).toBeNull();
    expect(r.recebido).toBe(40);
  });
});

describe("resumirCompras", () => {
  it("mesma regra de atraso da aba Compras", () => {
    const r = resumirCompras(
      [
        { situacao: "sem_pedido", data_entrega: null },
        { situacao: "aguardando", data_entrega: "2026-11-10" },
        { situacao: "nao_liberado", data_entrega: "2026-12-01" },
        { situacao: "recebido", data_entrega: "2026-10-01" },
      ],
      HOJE,
    );
    expect(r).toEqual({ abertas: 3, atrasadas: 1, semPedido: 1, aguardando: 2 });
  });
});

describe("familiasEmAlerta", () => {
  it("ignora ok e ordena do mais grave", () => {
    const r = familiasEmAlerta([
      { codigo_projeto: "2100.300", nivel: "atencao" },
      { codigo_projeto: "2100.200", nivel: "ok" },
      { codigo_projeto: "2100.510", nivel: "sem_verba" },
      { codigo_projeto: "2100.100", nivel: "critico" },
    ]);
    expect(r.map((x) => x.codigo)).toEqual(["2100.510", "2100.100", "2100.300"]);
    expect(r[0].rotulo).toBe("Sem verba");
  });
});

describe("resumirCronograma", () => {
  const fases = [
    { fase: "compras", ordem: 3, status: "nao_iniciado", fim_previsto: "2026-12-01" },
    { fase: "processo_inicial", ordem: 1, status: "concluido", fim_previsto: "2026-09-01", fim_real: "2026-09-02" },
    { fase: "engenharia", ordem: 2, status: "em_andamento", fim_previsto: "2026-11-10" },
    { fase: "fabricacao", ordem: 4, status: "nao_iniciado", fim_previsto: null },
  ];

  it("proxima fase depois da atual, fases atrasadas e contagem", () => {
    const r = resumirCronograma(fases, "engenharia", "2027-03-01", HOJE);
    expect(r.proxima).toEqual({ fase: "compras", fimPrevisto: "2026-12-01" });
    expect(r.atrasadas).toEqual([{ fase: "engenharia", fimPrevisto: "2026-11-10", diasAtraso: 6 }]);
    expect(r.concluidas).toBe(1);
    expect(r.total).toBe(4);
  });

  it("fase sem fim previsto usa o fim da obra; ultima fase nao tem proxima", () => {
    expect(resumirCronograma(fases, "compras", "2027-03-01", HOJE).proxima).toEqual({
      fase: "fabricacao",
      fimPrevisto: "2027-03-01",
    });
    expect(resumirCronograma(fases, "fabricacao", null, HOJE).proxima).toBeNull();
  });

  it("fase atual fora do cronograma: primeira em aberto", () => {
    expect(resumirCronograma(fases, "garantia", null, HOJE).proxima?.fase).toBe("engenharia");
  });
});

describe("resumirTarefas e principaisPendencias", () => {
  const tarefas = [
    { titulo: "Enviar ART", status: "pendente", data_vencimento: "2026-11-01T00:00:00+00:00" },
    { titulo: "Visita", status: "em_andamento", data_vencimento: "2026-11-20T00:00:00+00:00" },
    { titulo: "Velha", status: "pendente", data_vencimento: "2026-10-01T00:00:00+00:00" },
    { titulo: "Feita", status: "concluida", data_vencimento: "2026-10-01T00:00:00+00:00" },
    { titulo: "Hoje", status: "pendente", data_vencimento: "2026-11-16T00:00:00+00:00" },
  ];

  it("conta abertas e atrasadas (hoje nao atrasa), mais antigas primeiro", () => {
    const r = resumirTarefas(tarefas, HOJE);
    expect(r.abertas).toBe(4);
    expect(r.atrasadas).toBe(2);
    expect(r.listaAtrasadas.map((t) => t.titulo)).toEqual(["Velha", "Enviar ART"]);
  });

  it("ate 5, motivos primeiro, sem repetir", () => {
    const r = resumirTarefas(tarefas, HOJE);
    const p = principaisPendencias(["1 parcela(s) vencida(s)", "2 tarefa(s) atrasada(s)", "a", "b"], r.listaAtrasadas);
    expect(p).toEqual(["1 parcela(s) vencida(s)", "2 tarefa(s) atrasada(s)", "a", "b", "Tarefa atrasada: Velha"]);
  });
});

describe("resumirTexto", () => {
  it("junta linhas e corta no espaco", () => {
    expect(resumirTexto("a\n\nb")).toBe("a b");
    expect(resumirTexto("palavra ".repeat(10), 20)).toBe("palavra palavra…");
  });
});
