// Solicitacao de previsao: aviso de pedido igual ja em aberto e textos de confirmacao antes de gravar no ERP
// (Pacote 4, C9). Conta pura, sem React/Supabase, para testar com vitest.
// A trava de verdade esta no banco (gatilho trg_solicitacao_previsao_ins_duplicada, mesma regra): aqui so avisa antes
// de enviar, para a pessoa nao perder o formulario.

// Ainda vai (ou pode ir) ao ERP sem nova acao de alguem. "erro" fica parado ate "Simular de novo" (o banco confere).
export const STATUS_EM_ABERTO = ["simulando", "aguardando_aprovacao", "aprovada"];

const ROTULO_STATUS: Record<string, string> = {
  simulando: "simulando no ERP",
  aguardando_aprovacao: "aguardando aprovação",
  aprovada: "aprovada, gravando no ERP",
};

export interface OrigemPedido {
  familia: string;
  valor: number | string;
}

export interface PedidoPrevisao {
  id?: string;
  id_obra: string;
  tipo: string;
  familia_destino: string;
  valor: number | string;
  origens?: OrigemPedido[] | null;
}

export interface SolicitacaoExistente extends PedidoPrevisao {
  id: string;
  status: string;
  nome_solicitante?: string | null;
  created_at?: string | null;
}

// valor em centavos (numero do banco vem como 1234.5 ou "1234.50"); invalido -> NaN (nunca igual a nada)
export const centavos = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || (typeof v === "string" && !v.trim())) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

// "familia=centavos" ordenado: a ordem em que as origens foram digitadas nao importa
export const chaveOrigens = (origens?: OrigemPedido[] | null): string =>
  (origens || [])
    .map((o) => `${String(o.familia || "").trim()}=${centavos(o.valor)}`)
    .sort()
    .join("|");

export const mesmoPedido = (a: PedidoPrevisao, b: PedidoPrevisao): boolean => {
  if (a.id_obra !== b.id_obra || a.tipo !== b.tipo) return false;
  if (String(a.familia_destino || "").trim() !== String(b.familia_destino || "").trim()) return false;
  const va = centavos(a.valor);
  if (Number.isNaN(va) || va !== centavos(b.valor)) return false;
  return a.tipo !== "transferencia" || chaveOrigens(a.origens) === chaveOrigens(b.origens);
};

// primeira solicitacao aberta igual ao pedido (ignora a propria, no caso de reenvio)
export const acharDuplicada = <T extends SolicitacaoExistente>(pedido: PedidoPrevisao, existentes: T[]): T | undefined =>
  existentes
    .filter((s) => STATUS_EM_ABERTO.includes(s.status) && s.id !== pedido.id && mesmoPedido(pedido, s))
    .sort((x, y) => String(x.created_at || "").localeCompare(String(y.created_at || "")))[0];

// "16/11 às 10:32" no horario de Brasilia (igual a mensagem do banco)
export const diaHoraBrasilia = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month} às ${p.hour}:${p.minute}`;
};

export const mensagemDuplicada = (s: SolicitacaoExistente): string =>
  `Já existe uma solicitação igual em aberto (mesma família, mesmo tipo e mesmo valor), pedida por ${
    String(s.nome_solicitante || "").trim() || "outra pessoa"
  } em ${diaHoraBrasilia(s.created_at)} (situação: ${ROTULO_STATUS[s.status] || s.status}). Acompanhe a que já existe ou cancele-a antes de pedir de novo.`;

// ---------------------------------------------------------------- textos das confirmacoes (gravacao no ERP)

const moeda = (v: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

// 20261230 -> 30/12/2026
const dataErp = (n?: number | string | null) => {
  const s = String(n || "");
  return s.length === 8 ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : s;
};

export interface SolicitacaoParaResumo {
  tipo: string;
  codigo_obra: string;
  familia_destino: string;
  valor: number | string;
  origens?: OrigemPedido[] | null;
  plano?: any;
  desfazer_plano?: any;
}

const comNome = (codigo: string, nome?: string | null) => (nome ? `${codigo} - ${nome}` : codigo);

// Resumo do que o robo grava no ERP ao aprovar. Usa o plano que o robo simulou (nomes das familias e saldos
// em aberto antes/depois); sem plano mostra so o pedido.
export const resumoAprovacao = (s: SolicitacaoParaResumo): string => {
  const plano = s.plano || {};
  const nomes = plano.familias || {};
  const nomeOrigem = (f: string) => (nomes.origens || []).find((o: any) => o?.proj === f)?.nome;
  const antes = plano.totais_antes || {};
  const depois = plano.totais_depois_previstos || {};
  const nova = plano.operacoes?.nova_parcela;
  const destino = comNome(s.familia_destino, nomes.destino?.nome);
  const linhas: string[] = [`Obra ${s.codigo_obra}`];
  if (s.tipo === "transferencia") {
    linhas.push(`Transferência de ${moeda(s.valor)}`);
    for (const o of s.origens || []) linhas.push(`De: ${comNome(o.familia, nomeOrigem(o.familia))} (${moeda(o.valor)})`);
    linhas.push(`Para: ${destino}`);
  } else {
    linhas.push(`Aumento de previsão de ${moeda(s.valor)}`, `Família: ${destino}`);
  }
  if (nova) {
    linhas.push(
      nova.previsao_criada
        ? `No ERP: previsão nova nº ${nova.docto}, vencimento ${dataErp(nova.vencto)}`
        : `No ERP: nova parcela na previsão nº ${nova.docto}, vencimento ${dataErp(nova.vencto)}`,
    );
  }
  if (plano.totais_antes) {
    linhas.push(`Em aberto no destino: ${moeda(antes.destino)} → ${moeda(depois.destino)}`);
    if (s.tipo === "transferencia") linhas.push(`Em aberto na origem: ${moeda(antes.origem)} → ${moeda(depois.origem)}`);
  }
  linhas.push("", "O robô grava no ERP em alguns minutos. Para desfazer depois é preciso pedir o desfazimento.");
  return linhas.join("\n");
};

// Resumo do desfazer (o robo ja simulou: estornos nas origens e exclusao da parcela criada)
export const resumoDesfazer = (s: SolicitacaoParaResumo): string => {
  const p = s.desfazer_plano || {};
  const estornos: any[] = p.operacoes?.estornos || [];
  const exc = p.operacoes?.excluir_parcela;
  const linhas: string[] = [
    `Obra ${s.codigo_obra}`,
    `${s.tipo === "aumento" ? "Aumento" : "Transferência"} de ${moeda(s.valor)} para ${s.familia_destino}`,
  ];
  if (exc) {
    linhas.push(
      exc.previsao_criada
        ? `No ERP: exclui a previsão nº ${exc.docto}, criada por esta solicitação (${moeda(exc.valor)})`
        : `No ERP: exclui a parcela ${exc.parcela} da previsão nº ${exc.docto} (${moeda(exc.valor)})`,
    );
  }
  for (const e of estornos)
    linhas.push(`Devolve à previsão nº ${e.docto} parcela ${e.parcela}: ${moeda(e.saldo_antes)} → ${moeda(e.saldo_depois)}`);
  linhas.push("", "O robô desfaz no ERP em alguns minutos. Depois de desfeita, só uma nova solicitação grava de novo.");
  return linhas.join("\n");
};
