import { describe, expect, it } from "vitest";
import {
  FILTROS_VAZIOS,
  alternarOrdem,
  celulaNumero,
  celulaTexto,
  dataBR,
  filtrarLinhas,
  filtrosAtivos,
  lerPreferencias,
  montarCsv,
  nomeArquivoCsv,
  opcoesFase,
  opcoesGestor,
  ordenarLinhas,
  sanearFiltros,
  type LinhaStatus,
} from "./calculoStatusGeral";

const HOJE = "2026-11-16";

const linha = (id: string, v: Partial<LinhaStatus> = {}): LinhaStatus => ({
  id,
  codigo: id,
  nome: `Obra ${id}`,
  fase: "producao",
  responsavel: "Ana",
  dataEntrega: null,
  areas: { financeiro: "verde", documentos: "verde", cronograma: "verde", tarefas: "verde", alertas: "verde" },
  statusGeral: "em_dia",
  gravidade: 0,
  motivosCriticos: [],
  saldoFaturar: 0,
  saldoReceber: 0,
  valorVencido: 0,
  ...v,
});

const ids = (ls: LinhaStatus[]) => ls.map((l) => l.id);

describe("ordenarLinhas", () => {
  const ls = [linha("10"), linha("2"), linha("33")];
  it("codigo e numerico, nao alfabetico", () => {
    expect(ids(ordenarLinhas(ls, { chave: "codigo", sentido: "asc" }))).toEqual(["2", "10", "33"]);
    expect(ids(ordenarLinhas(ls, { chave: "codigo", sentido: "desc" }))).toEqual(["33", "10", "2"]);
  });
  it("nao altera a lista original", () => {
    ordenarLinhas(ls, { chave: "codigo", sentido: "asc" });
    expect(ids(ls)).toEqual(["10", "2", "33"]);
  });
  it("geral usa gravidade, mais grave primeiro por padrao, e sem dados vai para o fim", () => {
    const a = linha("1", { gravidade: 5, statusGeral: "atencao" });
    const b = linha("2", { gravidade: 215, statusGeral: "critico" });
    const c = linha("3", { gravidade: 0, statusGeral: null });
    const d = linha("4", { gravidade: 0 });
    const ord = alternarOrdem({ chave: "codigo", sentido: "asc" }, "geral");
    expect(ord).toEqual({ chave: "geral", sentido: "desc" });
    expect(ids(ordenarLinhas([c, a, d, b], ord))).toEqual(["2", "1", "4", "3"]);
    expect(ids(ordenarLinhas([c, a, d, b], { chave: "geral", sentido: "asc" }))).toEqual(["4", "1", "2", "3"]);
  });
  it("entrega: data mais antiga primeiro e sem data sempre no fim", () => {
    const a = linha("1", { dataEntrega: "2026-12-01" });
    const b = linha("2", { dataEntrega: null });
    const c = linha("3", { dataEntrega: "2026-10-01" });
    expect(ids(ordenarLinhas([a, b, c], { chave: "entrega", sentido: "asc" }))).toEqual(["3", "1", "2"]);
    expect(ids(ordenarLinhas([a, b, c], { chave: "entrega", sentido: "desc" }))).toEqual(["1", "3", "2"]);
  });
  it("a faturar: sem escopo (null) no fim nos dois sentidos", () => {
    const a = linha("1", { saldoFaturar: 100 });
    const b = linha("2", { saldoFaturar: null });
    const c = linha("3", { saldoFaturar: 500 });
    expect(ids(ordenarLinhas([a, b, c], { chave: "faturar", sentido: "desc" }))).toEqual(["3", "1", "2"]);
    expect(ids(ordenarLinhas([a, b, c], { chave: "faturar", sentido: "asc" }))).toEqual(["1", "3", "2"]);
  });
  it("a receber: sem acesso ao valor de venda (null) no fim e vazio no CSV (nunca 0)", () => {
    const a = linha("1", { saldoReceber: 100 });
    const b = linha("2", { saldoReceber: null });
    const c = linha("3", { saldoReceber: 0 });
    expect(ids(ordenarLinhas([a, b, c], { chave: "receber", sentido: "desc" }))).toEqual(["1", "3", "2"]);
    expect(ids(ordenarLinhas([a, b, c], { chave: "receber", sentido: "asc" }))).toEqual(["3", "1", "2"]);
    const csv = montarCsv([b], { hojeISO: HOJE, labelFase: (f) => f });
    expect(csv.trimEnd().split("\r\n")[1].endsWith(";;0,00")).toBe(true);
  });
  it("fase segue a ordem do fluxo e empate cai no codigo", () => {
    const fluxo = ["projeto", "producao", "entrega"];
    const a = linha("5", { fase: "entrega" });
    const b = linha("9", { fase: "projeto" });
    const c = linha("1", { fase: "entrega" });
    expect(ids(ordenarLinhas([a, b, c], { chave: "fase", sentido: "asc" }, fluxo))).toEqual(["9", "1", "5"]);
  });
  it("clicar de novo na mesma coluna inverte", () => {
    expect(alternarOrdem({ chave: "receber", sentido: "desc" }, "receber")).toEqual({ chave: "receber", sentido: "asc" });
  });
});

describe("filtrarLinhas", () => {
  const ls = [
    linha("1", { nome: "Hospital São José", responsavel: "Ana", fase: "producao", statusGeral: "critico", dataEntrega: "2026-11-10" }),
    linha("2", { nome: "Escola", responsavel: "Bruno", fase: "projeto", statusGeral: "em_dia", dataEntrega: "2026-12-30" }),
    linha("3", { nome: "Galpão", responsavel: "Ana", fase: "projeto", statusGeral: "atencao", dataEntrega: null }),
  ];
  const f = (p: object) => ({ ...FILTROS_VAZIOS, ...p });
  it("busca por codigo e nome sem acento e sem caixa", () => {
    expect(ids(filtrarLinhas(ls, f({ busca: "sao jose" }), HOJE))).toEqual(["1"]);
    expect(ids(filtrarLinhas(ls, f({ busca: "GALPAO" }), HOJE))).toEqual(["3"]);
    expect(ids(filtrarLinhas(ls, f({ busca: "2" }), HOJE))).toEqual(["2"]);
  });
  it("combina gestor, fase, saude e so atrasadas", () => {
    expect(ids(filtrarLinhas(ls, f({ gestor: "Ana" }), HOJE))).toEqual(["1", "3"]);
    expect(ids(filtrarLinhas(ls, f({ gestor: "Ana", fase: "projeto" }), HOJE))).toEqual(["3"]);
    expect(ids(filtrarLinhas(ls, f({ saude: "em_dia" }), HOJE))).toEqual(["2"]);
    expect(ids(filtrarLinhas(ls, f({ soAtrasadas: true }), HOJE))).toEqual(["1"]);
  });
  it("sem filtro devolve tudo; filtrosAtivos enxerga cada campo", () => {
    expect(filtrarLinhas(ls, FILTROS_VAZIOS, HOJE)).toHaveLength(3);
    expect(filtrosAtivos(FILTROS_VAZIOS)).toBe(false);
    expect(filtrosAtivos(f({ busca: "  " }))).toBe(false);
    expect(filtrosAtivos(f({ soAtrasadas: true }))).toBe(true);
  });
  it("opcoes de gestor e fase", () => {
    expect(opcoesGestor(ls)).toEqual(["Ana", "Bruno"]);
    expect(opcoesFase(ls, ["projeto", "producao"])).toEqual(["projeto", "producao"]);
  });
  it("sanearFiltros solta gestor/fase que nao existem mais, mas nao mexe durante o carregamento", () => {
    const salvo = f({ gestor: "Zé", fase: "entrega", busca: "x" });
    expect(sanearFiltros(salvo, ls, true)).toMatchObject({ gestor: "", fase: "", busca: "x" });
    expect(sanearFiltros(salvo, [], true)).toMatchObject({ gestor: "Zé", fase: "entrega" });
    expect(sanearFiltros(f({ gestor: "Ana" }), ls, false).gestor).toBe("");
  });
});

describe("lerPreferencias", () => {
  it("devolve o padrao para texto vazio, quebrado ou estranho", () => {
    for (const t of [null, "", "{", "123", '{"ordem":{"chave":"x","sentido":"asc"}}']) {
      const p = lerPreferencias(t);
      expect(p.ordem).toEqual({ chave: "codigo", sentido: "asc" });
      expect(p.filtros).toEqual(FILTROS_VAZIOS);
    }
  });
  it("le o que foi salvo", () => {
    const salvo = JSON.stringify({
      ordem: { chave: "geral", sentido: "desc" },
      filtros: { busca: "ab", gestor: "Ana", fase: "projeto", saude: "critico", soAtrasadas: true },
    });
    expect(lerPreferencias(salvo)).toEqual({
      ordem: { chave: "geral", sentido: "desc" },
      filtros: { busca: "ab", gestor: "Ana", fase: "projeto", saude: "critico", soAtrasadas: true },
    });
  });
});

describe("celulas do CSV", () => {
  it("texto simples e com acento passam direto", () => {
    expect(celulaTexto("Instalação São José")).toBe("Instalação São José");
    expect(celulaTexto(null)).toBe("");
  });
  it("ponto e virgula, aspas e quebra de linha vao entre aspas", () => {
    expect(celulaTexto("a;b")).toBe('"a;b"');
    expect(celulaTexto('ele disse "oi"')).toBe('"ele disse ""oi"""');
    expect(celulaTexto("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
  it("texto que parece formula ganha apostrofo", () => {
    expect(celulaTexto("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(celulaTexto("+1")).toBe("'+1");
    expect(celulaTexto("-2")).toBe("'-2");
    expect(celulaTexto("@cmd")).toBe("'@cmd");
    expect(celulaTexto('=HYPERLINK("x";"y")')).toBe('"\'=HYPERLINK(""x"";""y"")"');
  });
  it("numero com virgula, sem milhar, negativo sem apostrofo", () => {
    expect(celulaNumero(1234567.5)).toBe("1234567,50");
    expect(celulaNumero(-1234.5)).toBe("-1234,50");
    expect(celulaNumero(-0.001)).toBe("0,00");
    expect(celulaNumero(0)).toBe("0,00");
    expect(celulaNumero(null)).toBe("");
    expect(celulaNumero(-12, 0)).toBe("-12");
  });
  it("data em DD/MM/AAAA sem mexer no fuso", () => {
    expect(dataBR("2026-01-05")).toBe("05/01/2026");
    expect(dataBR("2026-01-05T23:30:00+00:00")).toBe("05/01/2026");
    expect(dataBR(null)).toBe("");
    expect(dataBR("lixo")).toBe("");
  });
});

describe("montarCsv", () => {
  const labelFase = (f: string) => (f === "producao" ? "Produção" : f);
  it("tem BOM, cabecalho, uma linha por obra e numeros sem R$", () => {
    const csv = montarCsv(
      [
        linha("7", {
          nome: "Galpão; fase 2",
          responsavel: "Ana",
          dataEntrega: "2026-11-10",
          statusGeral: "critico",
          areas: { financeiro: "vermelho", documentos: "amarelo", cronograma: "verde", tarefas: "verde", alertas: "verde" },
          motivosCriticos: ["1 parcela(s) vencida(s)", "2 tarefa(s) atrasada(s)"],
          saldoFaturar: 1500.5,
          saldoReceber: -20,
          valorVencido: 300,
        }),
      ],
      { hojeISO: HOJE, labelFase },
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [cab, l1] = csv.slice(1).split("\r\n");
    expect(cab).toBe(
      "Código;Obra;Gestor;Fase;Entrega;Dias para a entrega;Saúde geral;Financeiro;Documentos;Cronograma;Tarefas;Alertas;Motivos;A faturar;A receber;Valor vencido",
    );
    expect(l1).toBe(
      '7;"Galpão; fase 2";Ana;Produção;10/11/2026;-6;Crítico;Crítico;Atenção;Em dia;Em dia;Em dia;1 parcela(s) vencida(s) | 2 tarefa(s) atrasada(s);1500,50;-20,00;300,00',
    );
    expect(csv.includes("R$")).toBe(false);
  });
  it("obra sem indicadores e sem data/escopo sai com 'Sem dados' e celulas vazias", () => {
    const csv = montarCsv(
      [linha("8", { areas: null, statusGeral: null, saldoFaturar: null, dataEntrega: null, fase: null })],
      { hojeISO: HOJE, labelFase },
    );
    expect(csv.split("\r\n")[1]).toBe("8;Obra 8;Ana;;;;Sem dados;Sem dados;Sem dados;Sem dados;Sem dados;Sem dados;;;0,00;0,00");
  });
  it("nome que comeca com formula e protegido", () => {
    const csv = montarCsv([linha("9", { nome: "=cmd|' /C calc'!A0" })], { hojeISO: HOJE, labelFase });
    expect(csv.split("\r\n")[1].startsWith("9;'=cmd")).toBe(true);
  });
  it("nome do arquivo leva a data", () => {
    expect(nomeArquivoCsv("2026-11-16")).toBe("status-obras-2026-11-16.csv");
  });
});
