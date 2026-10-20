import { describe, expect, it } from "vitest";
import { caminhoParaRota, rotaParaCaminho, type Rota } from "./rotas";

// Os enderecos sao usados nos e-mails e nas notificacoes push: se mudarem, links antigos quebram.
describe("rotas do app", () => {
  const casos: [string, Rota][] = [
    ["/", { tela: "dashboard" }],
    ["/tarefas", { tela: "tarefas" }],
    ["/obras", { tela: "minhas_obras" }],
    ["/obras/2182", { tela: "painel_obra", codigoObra: "2182", abaObra: "resumo" }],
    ["/obras/2182/lista-materiais", { tela: "painel_obra", codigoObra: "2182", abaObra: "lista_materiais" }],
    ["/obras/2182/previsoes", { tela: "painel_obra", codigoObra: "2182", abaObra: "previsoes" }],
    ["/reunioes/nova", { tela: "reunioes", novaReuniao: true }],
    ["/reunioes/2026-10-09", { tela: "reunioes", dataReuniao: "2026-10-09" }],
    ["/previsoes/abc-123", { tela: "solicitacoes_previsao", idSolicitacao: "abc-123" }],
    ["/compras", { tela: "compras" }],
    ["/faturamento/abc-123", { tela: "faturamento", idSolicitacao: "abc-123" }],
    ["/nfs-terceiros", { tela: "nfs_terceiros" }],
    ["/nfs-terceiros/abc-123", { tela: "nfs_terceiros", idSolicitacao: "abc-123" }],
    ["/fretes", { tela: "fretes" }],
    ["/fretes/abc-123", { tela: "fretes", idSolicitacao: "abc-123" }],
    ["/obras/2098/compras", { tela: "painel_obra", codigoObra: "2098", abaObra: "compras" }],
    ["/historico", { tela: "historico" }],
    ["/cadastros/obras", { tela: "cadastros_obras" }],
    ["/cadastros/equipe", { tela: "cadastros_equipe" }],
  ];

  it.each(casos)("%s abre a tela certa e volta para o mesmo endereco", (caminho, rota) => {
    expect(caminhoParaRota(caminho, "")).toMatchObject(rota);
    expect(rotaParaCaminho(rota)).toBe(caminho);
  });

  it("tarefa aberta vai no endereco (?tarefa=) em qualquer tela", () => {
    expect(caminhoParaRota("/tarefas", "?tarefa=t1").idTarefa).toBe("t1");
    expect(rotaParaCaminho({ tela: "painel_obra", codigoObra: "2182", abaObra: "financeiro", idTarefa: "t1" })).toBe(
      "/obras/2182/financeiro?tarefa=t1",
    );
  });

  it("link das notificacoes push (?abrir=notificacoes) abre o painel de avisos", () => {
    expect(caminhoParaRota("/", "?abrir=notificacoes").abrirNotificacoes).toBe(true);
  });

  it("links antigos dos e-mails (/?tela=tarefas) continuam funcionando", () => {
    expect(caminhoParaRota("/", "?tela=tarefas").tela).toBe("tarefas");
  });

  it("endereco desconhecido ou data invalida nao quebra", () => {
    expect(caminhoParaRota("/qualquer-coisa", "").tela).toBe("dashboard");
    expect(caminhoParaRota("/reunioes/ontem", "").dataReuniao).toBeUndefined();
  });

  it("codigo de obra com caracteres especiais e codificado", () => {
    const caminho = rotaParaCaminho({ tela: "painel_obra", codigoObra: "A 1/2" });
    expect(caminhoParaRota(caminho, "").codigoObra).toBe("A 1/2");
  });
});
