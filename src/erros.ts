// Texto de erro que o usuario entende (Pacote 3, C8). Antes cada tela mostrava error.message cru e a pessoa lia
// "duplicate key value violates unique constraint..." ou "Failed to fetch".
// CONTRATO (nao mudar a assinatura; varias telas importam):
//   mensagemErro(erro)                       -> texto pronto para mostrar
//   mensagemErro(erro, "Não foi possível salvar a obra.")  -> texto padrao quando nao da para traduzir
// Mensagens que o proprio banco do app levanta em portugues (raise exception '...') passam como vieram.
// Regras de deteccao de conflito de edicao (ex.: Exportacao.tsx) devem olhar o erro CRU, antes de chamar esta funcao.

export const ERRO_PADRAO = "Não foi possível concluir a ação. Tente de novo.";

// restricao unica (nome em tabelas.sql/indices.sql) -> o que ja existe
const UNICAS: Record<string, string> = {
  exportacao_processos_id_obra_key: "Esta obra já tem um processo de exportação.",
  familias_faturamento_padrao_codigo_key: "Já existe uma família com esse código.",
  faturamentos_obra_nf_tipo_key: "Já existe um faturamento com esse número de nota nesta obra.",
  fretes_transp_tarifas_transportadora_codigo_tipo_veiculo_key: "Já existe uma tarifa para essa transportadora e esse tipo de veículo.",
  nfs_terceiros_numero_key: "Já existe uma nota de terceiros com esse número.",
  nft_nf_unica: "Já existe uma nota com esse número para esse fornecedor.",
  obra_alertas_id_obra_tipo_chave_key: "Esse alerta já existe para a obra.",
  obra_faturamento_grupos_unique: "Já existe um grupo de faturamento com esse código nesta obra.",
  uq_obra_faturamento_familias_grupo_familia: "Essa família já está nesse grupo de faturamento.",
  obra_rentabilidade_familias_id_obra_codigo_projeto_key: "Já existe um registro com esse código de projeto nesta obra.",
  obra_servicos_parcelas_id_obra_nr_pedido_nr_solicitacao_key: "Essa parcela de serviço já está registrada.",
  obra_sma_materiais_id_obra_nr_sma_cod_mater_sequencia_key: "Esse item da solicitação de material já está registrado.",
  obras_codigo_externo_key: "Já existe uma obra com esse código.",
  push_inscricoes_endpoint_key: "Este aparelho já está inscrito nas notificações.",
  solicitacoes_faturamento_numero_key: "Já existe uma solicitação de faturamento com esse número.",
  solicitacoes_faturamento_itens_id_solicitacao_sequencia_key: "Esse item já existe na solicitação.",
  solicitacoes_faturamento_nfs_numero_nf_serie_nf_key: "Já existe uma nota com esse número e essa série.",
  solicitacoes_material_numero_key: "Já existe uma solicitação de material com esse número.",
  usuarios_email_key: "Já existe um usuário com esse e-mail.",
};

const JA_EXISTE = "Já existe um registro igual a este.";

type Lido = { message: string; code: string; details: string; status: number | null };

function ler(erro: unknown): Lido {
  const txt = (v: unknown) => (typeof v === "string" ? v : "");
  if (typeof erro === "string") return { message: erro, code: "", details: "", status: null };
  if (erro && typeof erro === "object") {
    const e = erro as Record<string, unknown>;
    const st = Number(e.status ?? e.statusCode);
    return {
      message: txt(e.message) || txt(e.error_description) || txt(e.error),
      code: txt(e.code),
      details: txt(e.details),
      status: Number.isFinite(st) ? st : null,
    };
  }
  return { message: "", code: "", details: "", status: null };
}

// "Key (codigo_externo)=(123) already exists." -> "codigo_externo"
function colunaDe(details: string): string {
  return /Key \(([^)]+)\)/i.exec(details)?.[1] ?? "";
}

function msgUnica(msg: string, details: string): string {
  const nome = /constraint "([^"]+)"/i.exec(msg)?.[1] ?? /unique index "([^"]+)"/i.exec(msg)?.[1];
  if (nome && UNICAS[nome]) return UNICAS[nome];
  const col = colunaDe(details);
  if (/(^|[^a-z])e?mail/i.test(col)) return UNICAS.usuarios_email_key;
  if (/codigo_externo/.test(col)) return UNICAS.obras_codigo_externo_key;
  return JA_EXISTE;
}

// campo citado pelo Postgres: null value in column "nome" ... / constraint "x_check"
function msgObrigatorio(msg: string, ehCheck: boolean): string {
  const col = /column "([^"]+)"/i.exec(msg)?.[1];
  if (!ehCheck) return col ? `O campo "${col.replace(/_/g, " ")}" é obrigatório. Preencha e tente de novo.` : "Há um campo obrigatório sem preenchimento.";
  return col
    ? `O valor informado em "${col.replace(/_/g, " ")}" não é permitido.`
    : "Algum valor informado não é permitido. Confira os campos.";
}

// Heuristica "parece tecnico": termos de banco/JS/rede ou texto sem cara de portugues.
const TECNICO =
  /violates|constraint|relation\b|syntax|undefined|\bfunction\b|\bcolumn\b|\bschema\b|\btable\b|\bnull\b|\bstack\b|\bexception\b|\btimeout\b|\btoken\b|\bfetch\b|\bjson\b|\bunexpected\b|\bcannot\b|\bcan't\b|\bnot found\b|\bfailed\b|\binvalid\b|\bpermission denied\b|\bdoes not exist\b|\bnetwork\b|\bpgrst\d+|\bpg_|\bpublic\./i;
const PALAVRAS_PT =
  /\b(não|nao|para|uma?|de|do|da|dos|das|na|com|sem|já|ja|esta|este|obra|erro|tente|favor|informe|preencha|somente|apenas|nenhum|nenhuma|pode|podem|precisa|mais|ou|por|que|valor|data|solicita[cç][aã]o|usu[aá]rio|aprovador|aprovadores|atualize|confira|nada|identificado)\b/i;
const ACENTO = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/;

export function pareceTecnico(texto: string): boolean {
  if (!texto.trim()) return true;
  if (TECNICO.test(texto)) return true;
  if (ACENTO.test(texto)) return false;
  return !PALAVRAS_PT.test(texto);
}

function traduzir(l: Lido): string | null {
  const { code, details } = l;
  const msg = l.message;
  const baixo = msg.toLowerCase();

  // sessao / permissao
  if (code === "PGRST301" || code === "PGRST303" || /jwt expired|jwt is expired|invalid jwt|refresh token/i.test(msg))
    return "Sua sessão expirou. Entre de novo.";
  if (code === "42501" || /row-level security|permission denied|insufficient[_ ]privilege|not authorized|unauthorized/i.test(msg) || l.status === 401 || l.status === 403)
    return "Você não tem permissão para fazer isso.";

  // restricoes
  if (code === "23505" || /duplicate key|unique constraint/i.test(msg))
    return msgUnica(msg, details);
  if (code === "23503" || /foreign key/i.test(msg))
    return /is not present/i.test(details + msg)
      ? "Um dos dados informados não existe mais. Atualize a tela e tente de novo."
      : "Não é possível excluir ou alterar, pois há outros registros que dependem disso.";
  if (code === "23502" || /violates not-null|null value in column/i.test(msg)) return msgObrigatorio(msg, false);
  if (code === "23514" || /violates check constraint/i.test(msg)) return msgObrigatorio(msg, true);
  if (code === "22P02" || /invalid input syntax/i.test(msg)) return "Há um valor em formato inválido. Confira os campos.";
  if (code === "22003" || /out of range|numeric field overflow/i.test(msg)) return "Há um número grande demais. Confira os valores.";
  if (code === "22001" || /value too long/i.test(msg)) return "Um dos textos está longo demais. Reduza e tente de novo.";

  // concorrencia / tempo
  if (code === "40001" || code === "40P01" || /deadlock|could not serialize/i.test(msg))
    return "Outra pessoa alterou isso ao mesmo tempo. Tente de novo.";
  if (code === "57014" || /statement timeout|canceling statement/i.test(msg))
    return "A operação demorou demais. Tente de novo.";
  if (code === "PGRST116" || /0 rows|no rows|multiple \(or no\) rows/i.test(msg))
    return "Registro não encontrado ou sem permissão para acessá-lo.";

  // storage
  if (l.status === 413 || /payload too large|exceeded the maximum allowed size|entity too large/i.test(msg))
    return "O arquivo é grande demais.";
  if (/mime type .* (is )?not (supported|allowed)|not supported/i.test(msg) && /mime/i.test(msg))
    return "Este tipo de arquivo não é permitido.";
  if (/resource already exists|duplicate\b.*object/i.test(msg) || (l.status === 409 && /exists/i.test(baixo)))
    return "Já existe um arquivo com esse nome.";

  // limite e rede
  if (l.status === 429 || /too many requests|rate limit/i.test(msg))
    return "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.";
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|network error/i.test(msg))
    return "Sem conexão com o servidor. Confira a internet e tente de novo.";

  return null;
}

export function mensagemErro(erro: unknown, padrao: string = ERRO_PADRAO): string {
  const fallback = (typeof padrao === "string" && padrao.trim()) || ERRO_PADRAO;
  try {
    if (erro === null || erro === undefined) return fallback;
    const l = ler(erro);

    // mensagem do proprio banco do app (raise exception em portugues): passa so sem o prefixo
    const limpa = l.message.replace(/^.*?ERROR:\s*/, "").trim();
    if (limpa && !pareceTecnico(limpa)) return limpa;

    const traduzida = traduzir(l);
    if (traduzida) return traduzida;

    // sem traducao: guarda o original para o suporte e mostra o texto padrao
    console.error("[erro]", erro);
    return fallback;
  } catch {
    return fallback;
  }
}
