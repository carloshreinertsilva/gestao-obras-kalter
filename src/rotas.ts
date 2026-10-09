// Endereco do navegador <-> tela do app. O app continua controlado por estado
// (telaAtiva, obra aberta, aba...); estas funcoes so traduzem esse estado para um
// caminho (/obras/2182/previsoes) e de volta, para o Voltar do navegador, o F5 e
// os links dos e-mails funcionarem.

export interface Rota {
  tela: string;
  codigoObra?: string;
  abaObra?: string;
  dataReuniao?: string; // AAAA-MM-DD (reunioes sao agrupadas por data)
  novaReuniao?: boolean;
  idSolicitacao?: string;
  idTarefa?: string; // tarefa aberta no modal, em qualquer tela (?tarefa=)
  abrirNotificacoes?: boolean;
}

const TELAS_FIXAS: Record<string, string> = {
  dashboard: "/",
  tarefas: "/tarefas",
  minhas_obras: "/obras",
  reunioes: "/reunioes",
  solicitacoes_previsao: "/previsoes",
  cadastros_obras: "/cadastros/obras",
  cadastros_equipe: "/cadastros/equipe",
};

const paraSlug = (aba: string) => aba.replace(/_/g, "-");
const deSlug = (slug: string) => slug.replace(/-/g, "_");

export function rotaParaCaminho(r: Rota): string {
  let caminho = TELAS_FIXAS[r.tela] ?? "/";
  if (r.tela === "painel_obra" && r.codigoObra) {
    caminho = `/obras/${encodeURIComponent(r.codigoObra)}`;
    if (r.abaObra && r.abaObra !== "resumo") caminho += `/${paraSlug(r.abaObra)}`;
  } else if (r.tela === "reunioes") {
    if (r.novaReuniao) caminho += "/nova";
    else if (r.dataReuniao) caminho += `/${r.dataReuniao}`;
  } else if (r.tela === "solicitacoes_previsao" && r.idSolicitacao) {
    caminho += `/${r.idSolicitacao}`;
  }
  return r.idTarefa ? `${caminho}?tarefa=${r.idTarefa}` : caminho;
}

export function caminhoParaRota(pathname: string, search: string): Rota {
  const params = new URLSearchParams(search);
  const partes = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const extras: Partial<Rota> = {
    idTarefa: params.get("tarefa") || undefined,
    abrirNotificacoes: params.get("abrir") === "notificacoes",
  };
  // links antigos dos e-mails: /?tela=tarefas
  if (params.get("tela") === "tarefas") return { tela: "tarefas", ...extras };

  const [p0, p1, p2] = partes;
  switch (p0) {
    case undefined:
      return { tela: "dashboard", ...extras };
    case "tarefas":
      return { tela: "tarefas", ...extras };
    case "obras":
      if (!p1) return { tela: "minhas_obras", ...extras };
      return { tela: "painel_obra", codigoObra: p1, abaObra: p2 ? deSlug(p2) : "resumo", ...extras };
    case "reunioes":
      if (p1 === "nova") return { tela: "reunioes", novaReuniao: true, ...extras };
      return { tela: "reunioes", dataReuniao: /^\d{4}-\d{2}-\d{2}$/.test(p1 || "") ? p1 : undefined, ...extras };
    case "previsoes":
      return { tela: "solicitacoes_previsao", idSolicitacao: p1, ...extras };
    case "cadastros":
      return { tela: p1 === "equipe" ? "cadastros_equipe" : "cadastros_obras", ...extras };
    default:
      return { tela: "dashboard", ...extras };
  }
}
