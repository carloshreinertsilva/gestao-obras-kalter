// Rascunho automatico da ata de reuniao (Pacote 3, C3). O que a pessoa digita e ainda nao salvou fica no
// localStorage do navegador para nao se perder ao recarregar, fechar a aba, cair a internet ou o celular trocar
// de app. So logica pura aqui (chave, formato, validade, decisao de restaurar); a tela so chama.
// Regras:
// - chave por usuario + obra + (id da ata se for edicao, senao data da reuniao): rascunho nunca aparece em outra
//   obra nem para outro usuario no mesmo computador;
// - formato com versao (VERSAO_RASCUNHO): versao desconhecida ou JSON invalido = ignora e apaga;
// - rascunho com mais de 14 dias e apagado;
// - edicao: guarda a versao da ata gravada (versao_ata do banco) em que o rascunho se baseou; se o banco mudou
//   depois, a tela pergunta em vez de restaurar por cima;
// - qualquer falha do navegador (sem localStorage, cota cheia) vira "sem rascunho", nunca erro na tela.

export const VERSAO_RASCUNHO = 1;
export const PREFIXO_RASCUNHO = "gestaoObras.rascunhoAta.";
export const VALIDADE_RASCUNHO_MS = 14 * 24 * 60 * 60 * 1000;

export interface ItemOcorrencia {
  id: string | null;
  tipo: string;
  descricao: string;
}

export interface ItemTarefa {
  id: string | null;
  titulo: string;
  descricao: string;
  data_vencimento: string;
  id_responsavel: string;
  prioridade: string;
  nome_responsavel: string;
}

// so o que a pessoa digitou/escolheu na tela
export interface ConteudoAta {
  data_reuniao: string;
  resumo_geral: string;
  ocorrencias: ItemOcorrencia[];
  tarefas: ItemTarefa[];
  novaOcorrencia: { tipo: string; descricao: string };
  novaTarefa: {
    titulo: string;
    descricao: string;
    data_vencimento: string;
    id_responsavel: string;
    prioridade: string;
  };
}

export interface RascunhoAta {
  v: number;
  usuario: string;
  idObra: string;
  nomeObra: string;
  dataReuniao: string;
  idReuniao: string | null;
  versaoBase: string | null;
  salvoEm: number;
  conteudo: ConteudoAta;
}

// armazenamento minimo (localStorage ou um falso nos testes)
export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
  key(indice: number): string | null;
  readonly length: number;
}

// acessar window.localStorage pode lancar (modo privado, cookies bloqueados): sem armazenamento = sem rascunho
export function obterArmazenamento(): Armazenamento | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

const txt = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
type Obj = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const idOuNulo = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

export function chaveRascunho(p: {
  usuario: string | null | undefined;
  idObra: string | null | undefined;
  dataReuniao: string | null | undefined;
  idReuniao?: string | null;
}): string | null {
  if (!p.usuario || !p.idObra) return null;
  if (p.idReuniao) return `${PREFIXO_RASCUNHO}${p.usuario}.${p.idObra}.ata-${p.idReuniao}`;
  if (!p.dataReuniao) return null;
  return `${PREFIXO_RASCUNHO}${p.usuario}.${p.idObra}.dia-${String(p.dataReuniao).slice(0, 10)}`;
}

// ordem fixa das chaves: o mesmo conteudo vira sempre o mesmo texto (comparacao com a versao gravada)
export function montarConteudo(p: {
  data_reuniao?: unknown;
  resumo_geral?: unknown;
  ocorrencias?: unknown;
  tarefas?: unknown;
  novaOcorrencia?: unknown;
  novaTarefa?: unknown;
}): ConteudoAta {
  const objetos = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(ehObjeto) : []);
  const ocorrencias = objetos(p.ocorrencias);
  const tarefas = objetos(p.tarefas);
  const no: Obj = ehObjeto(p.novaOcorrencia) ? p.novaOcorrencia : {};
  const nt: Obj = ehObjeto(p.novaTarefa) ? p.novaTarefa : {};
  return {
    data_reuniao: txt(p.data_reuniao),
    resumo_geral: txt(p.resumo_geral),
    ocorrencias: ocorrencias.map((o) => ({ id: idOuNulo(o.id), tipo: txt(o.tipo) || "outros", descricao: txt(o.descricao) })),
    tarefas: tarefas.map((t) => ({
        id: idOuNulo(t.id),
        titulo: txt(t.titulo),
        descricao: txt(t.descricao),
        data_vencimento: txt(t.data_vencimento),
        id_responsavel: txt(t.id_responsavel),
        prioridade: txt(t.prioridade) || "normal",
        nome_responsavel: txt(t.nome_responsavel),
      })),
    novaOcorrencia: { tipo: txt(no.tipo) || "avanco", descricao: txt(no.descricao) },
    novaTarefa: {
      titulo: txt(nt.titulo),
      descricao: txt(nt.descricao),
      data_vencimento: txt(nt.data_vencimento),
      id_responsavel: txt(nt.id_responsavel),
      prioridade: txt(nt.prioridade) || "normal",
    },
  };
}

export function serializarConteudo(c: ConteudoAta): string {
  return JSON.stringify(montarConteudo(c));
}

// nada digitado (tipo/prioridade/data padrao nao contam)
export function conteudoVazio(c: ConteudoAta): boolean {
  return (
    !c.resumo_geral.trim() &&
    c.ocorrencias.length === 0 &&
    c.tarefas.length === 0 &&
    !c.novaOcorrencia.descricao.trim() &&
    !c.novaTarefa.titulo.trim() &&
    !c.novaTarefa.descricao.trim()
  );
}

// baseJson: conteudo da ata gravada (edicao) ou null (obra nova: base = formulario vazio)
export function temAlteracao(c: ConteudoAta, baseJson: string | null): boolean {
  if (baseJson === null) return !conteudoVazio(c);
  return serializarConteudo(c) !== baseJson;
}

function rascunhoValido(bruto: unknown): RascunhoAta | null {
  if (!ehObjeto(bruto)) return null;
  const r = bruto;
  if (r.v !== VERSAO_RASCUNHO) return null;
  if (typeof r.usuario !== "string" || !r.usuario || typeof r.idObra !== "string" || !r.idObra) return null;
  if (typeof r.salvoEm !== "number" || !Number.isFinite(r.salvoEm)) return null;
  if (!r.conteudo || typeof r.conteudo !== "object") return null;
  return {
    v: VERSAO_RASCUNHO,
    usuario: r.usuario,
    idObra: r.idObra,
    nomeObra: txt(r.nomeObra),
    dataReuniao: txt(r.dataReuniao),
    idReuniao: idOuNulo(r.idReuniao),
    versaoBase: idOuNulo(r.versaoBase),
    salvoEm: r.salvoEm,
    conteudo: montarConteudo(r.conteudo),
  };
}

export function apagarRascunho(arm: Armazenamento | null, chave: string | null): void {
  if (!arm || !chave) return;
  try {
    arm.removeItem(chave);
  } catch {
    /* sem armazenamento: nada a apagar */
  }
}

// devolve null (e apaga) se nao existe, esta corrompido, e de versao desconhecida ou venceu
export function lerRascunho(arm: Armazenamento | null, chave: string | null, agora: number): RascunhoAta | null {
  if (!arm || !chave) return null;
  let texto: string | null = null;
  try {
    texto = arm.getItem(chave);
  } catch {
    return null;
  }
  if (!texto) return null;
  let r: RascunhoAta | null = null;
  try {
    r = rascunhoValido(JSON.parse(texto));
  } catch {
    r = null;
  }
  if (!r || agora - r.salvoEm > VALIDADE_RASCUNHO_MS) {
    apagarRascunho(arm, chave);
    return null;
  }
  return r;
}

export function gravarRascunho(arm: Armazenamento | null, chave: string | null, r: RascunhoAta): boolean {
  if (!arm || !chave) return false;
  try {
    arm.setItem(chave, JSON.stringify(r));
    return true;
  } catch {
    // cota cheia ou bloqueado: fica sem rascunho
    return false;
  }
}

function chavesComPrefixo(arm: Armazenamento): string[] {
  const chaves: string[] = [];
  try {
    for (let i = 0; i < arm.length; i++) {
      const k = arm.key(i);
      if (k && k.startsWith(PREFIXO_RASCUNHO)) chaves.push(k);
    }
  } catch {
    return [];
  }
  return chaves;
}

// apaga rascunhos vencidos/invalidos de qualquer usuario deste navegador; devolve quantos apagou
export function limparRascunhosVencidos(arm: Armazenamento | null, agora: number): number {
  if (!arm) return 0;
  let apagados = 0;
  for (const k of chavesComPrefixo(arm)) if (!lerRascunho(arm, k, agora)) apagados++;
  return apagados;
}

export function listarRascunhosDoUsuario(
  arm: Armazenamento | null,
  usuario: string | null | undefined,
  agora: number,
): { chave: string; rascunho: RascunhoAta }[] {
  if (!arm || !usuario) return [];
  const prefixo = `${PREFIXO_RASCUNHO}${usuario}.`;
  return chavesComPrefixo(arm)
    .filter((k) => k.startsWith(prefixo))
    .map((k) => ({ chave: k, rascunho: lerRascunho(arm, k, agora) }))
    .filter((x): x is { chave: string; rascunho: RascunhoAta } => !!x.rascunho && x.rascunho.usuario === usuario)
    .sort((a, b) => b.rascunho.salvoEm - a.rascunho.salvoEm);
}

export type DecisaoRascunho =
  | { acao: "nenhuma" }
  | { acao: "restaurar" }
  | { acao: "perguntar"; motivo: "alterada_no_banco" | "formulario_com_conteudo" };

// Ao abrir uma obra/ata: o que fazer com o rascunho encontrado.
// - igual ao que esta na tela: nada a fazer;
// - edicao e a ata no banco mudou depois do rascunho (versao diferente): pergunta;
// - a pessoa ja digitou algo na tela (diferente da base): pergunta (nao sobrescreve o que ela esta digitando);
// - senao restaura.
export function decidirRestauracao(p: {
  rascunho: RascunhoAta | null;
  conteudoAtual: ConteudoAta;
  baseJson: string | null;
  versaoBanco: string | null;
}): DecisaoRascunho {
  const r = p.rascunho;
  if (!r) return { acao: "nenhuma" };
  if (serializarConteudo(r.conteudo) === serializarConteudo(p.conteudoAtual)) return { acao: "nenhuma" };
  // rascunho sem nada digitado alem da base nao vale a pena oferecer
  if (!temAlteracao(r.conteudo, p.baseJson)) return { acao: "nenhuma" };
  if (r.idReuniao && (r.versaoBase ?? null) !== (p.versaoBanco ?? null))
    return { acao: "perguntar", motivo: "alterada_no_banco" };
  if (temAlteracao(p.conteudoAtual, p.baseJson)) return { acao: "perguntar", motivo: "formulario_com_conteudo" };
  return { acao: "restaurar" };
}

const dois = (n: number) => String(n).padStart(2, "0");

// "16/11" e "14:05" no horario local do navegador
export function formatarMomentoRascunho(ms: number): { dia: string; hora: string } {
  const d = new Date(ms);
  return {
    dia: `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`,
    hora: `${dois(d.getHours())}:${dois(d.getMinutes())}`,
  };
}
