import { describe, expect, it } from "vitest";
import {
  chaveObras,
  compraAtrasada,
  diasDeAtraso,
  hojeLocalISO,
  montarAtrasos,
  smaVencida,
  textoDias,
  textoResumo,
  type CompraAberta,
  type SmaMaterial,
} from "./calculoComprasAtrasadas";

const HOJE = "2026-11-16";
const OBRAS = [
  { id: "a", codigo: "2182", nome: "Obra A" },
  { id: "b", codigo: "2098", nome: "Obra B" },
  { id: "c", codigo: "1497", nome: "Obra C" },
];

const compra = (x: Partial<CompraAberta>): CompraAberta => ({
  id_obra: "a",
  nr_solicitacao: 1,
  codigo_material: "M1",
  descricao_material: "Material 1",
  situacao: "aguardando",
  nr_pedido: 100,
  fornecedor: "Fornecedor",
  data_entrega: "2026-11-10",
  nr_sma: null,
  servico: false,
  ...x,
});

const sma = (x: Partial<SmaMaterial>): SmaMaterial => ({
  id_obra: "a",
  nr_sma: 50,
  sequencia: 1,
  codigo_material: "M9",
  descricao_material: "Material 9",
  quantidade_solicitada: 10,
  quantidade_atendida: 0,
  situacao: "A",
  data_necessidade: "2026-11-01",
  ordens_producao: null,
  urgente: false,
  ...x,
});

describe("regras de atraso (iguais as da obra)", () => {
  it("compra: nao recebida, material, entrega antes de hoje", () => {
    expect(compraAtrasada(compra({}), HOJE)).toBe(true);
    expect(compraAtrasada(compra({ data_entrega: HOJE }), HOJE)).toBe(false); // vence hoje: ainda nao
    expect(compraAtrasada(compra({ situacao: "recebido" }), HOJE)).toBe(false);
    expect(compraAtrasada(compra({ servico: true }), HOJE)).toBe(false);
    expect(compraAtrasada(compra({ data_entrega: null }), HOJE)).toBe(false);
    expect(compraAtrasada(compra({ situacao: "sem_pedido", nr_pedido: null }), HOJE)).toBe(true); // a aba conta tambem
  });

  it("SMA: ativa, com saldo, necessidade vencida e nao produzida", () => {
    expect(smaVencida(sma({}), HOJE)).toBe(true);
    expect(smaVencida(sma({ quantidade_atendida: 10 }), HOJE)).toBe(false);
    expect(smaVencida(sma({ situacao: "E" }), HOJE)).toBe(false);
    expect(smaVencida(sma({ situacao: null }), HOJE)).toBe(true); // sem situacao = ativa (como na lista da obra)
    expect(smaVencida(sma({ data_necessidade: HOJE }), HOJE)).toBe(false);
    expect(smaVencida(sma({ ordens_producao: "OP 12" }), HOJE)).toBe(false);
  });

  it("dias corridos de atraso", () => {
    expect(diasDeAtraso("2026-11-10", HOJE)).toBe(6);
    expect(diasDeAtraso("2026-10-31", HOJE)).toBe(16);
    expect(diasDeAtraso(HOJE, HOJE)).toBe(0);
    expect(textoDias(1)).toBe("1 dia de atraso");
    expect(textoDias(6)).toBe("6 dias de atraso");
  });

  it("hoje no fuso do aparelho", () => {
    expect(hojeLocalISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("montar por obra", () => {
  it("agrupa por obra, pior atraso primeiro, e ignora obras fora da lista", () => {
    const r = montarAtrasos(
      OBRAS,
      [
        compra({ id_obra: "a", nr_solicitacao: 1, data_entrega: "2026-11-12" }),
        compra({ id_obra: "a", nr_solicitacao: 2, data_entrega: "2026-11-02" }),
        compra({ id_obra: "b", nr_solicitacao: 3, data_entrega: "2026-10-01" }),
        compra({ id_obra: "zzz", nr_solicitacao: 4, data_entrega: "2026-01-01" }),
        compra({ id_obra: "c", nr_solicitacao: 5, data_entrega: "2026-12-01" }),
      ],
      [],
      HOJE,
    );
    expect(r.obras.map((o) => o.obra.id)).toEqual(["b", "a"]);
    expect(r.obras[1].itens.map((i) => i.nr_solicitacao)).toEqual([2, 1]);
    expect(r.obras[1].piorAtraso).toBe(14);
    expect(r.totalItens).toBe(3);
    expect(textoResumo(r)).toBe("3 itens atrasados em 2 obras");
  });

  it("SMA ja coberta por compra atrasada nao repete; senao mostra o pedido ligado", () => {
    const r = montarAtrasos(
      OBRAS,
      [
        compra({ nr_solicitacao: 1, nr_sma: 50, codigo_material: "M9", data_entrega: "2026-11-10" }), // atrasada
        compra({ nr_solicitacao: 2, nr_sma: 51, codigo_material: "M7", nr_pedido: 222, fornecedor: "Forn X", data_entrega: "2026-12-01" }),
      ],
      [
        sma({ nr_sma: 50, codigo_material: "M9" }), // ja listada pela compra
        sma({ nr_sma: 51, codigo_material: "M7", sequencia: 2, urgente: true }), // compra no prazo, necessidade vencida
        sma({ nr_sma: 52, codigo_material: "M8", sequencia: 3 }), // sem compra
      ],
      HOJE,
    );
    const itens = r.obras[0].itens;
    expect(itens.map((i) => i.tipo)).toEqual(["sma", "sma", "compra"]);
    const comPedido = itens.find((i) => i.nr_sma === 51)!;
    expect(comPedido.nr_pedido).toBe(222);
    expect(comPedido.fornecedor).toBe("Forn X");
    expect(comPedido.situacao).toBe("Necessidade vencida · aguardando entrega");
    expect(comPedido.urgente).toBe(true);
    expect(itens.find((i) => i.nr_sma === 52)!.situacao).toBe("Necessidade vencida · sem compra");
    expect(itens.filter((i) => i.nr_sma === 50)).toHaveLength(1);
  });

  it("sem atraso: lista vazia", () => {
    const r = montarAtrasos(OBRAS, [compra({ data_entrega: "2026-12-01" })], [sma({ quantidade_atendida: 10 })], HOJE);
    expect(r.obras).toEqual([]);
    expect(r.totalItens).toBe(0);
  });

  it("chave das obras nao depende da ordem", () => {
    expect(chaveObras([OBRAS[1], OBRAS[0]])).toBe(chaveObras([OBRAS[0], OBRAS[1]]));
  });
});
