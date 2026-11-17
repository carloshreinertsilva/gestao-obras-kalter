// Tabela "Status Geral dos Projetos" do Painel: ordenar, filtrar, lembrar a escolha e montar o CSV.
// So apresentacao: os numeros e a regra de saude vem prontos (saudeObra.ts); aqui nada e recalculado.
import { AREAS_SAUDE, ROTULO_SAUDE, prazoEntrega, type AreaSaude, type NivelArea, type StatusSaude } from "../saudeObra";

export interface LinhaStatus {
  id: string;
  codigo: string | number | null;
  nome: string | null;
  fase: string | null;
  responsavel: string | null;
  dataEntrega: string | null;
  areas: Record<AreaSaude, NivelArea> | null;
  statusGeral: StatusSaude | null;
  gravidade: number;
  motivosCriticos: string[];
  saldoFaturar: number | null;
  // null = sem acesso ao valor de venda da obra (vai para o fim na ordenacao e sai vazio no CSV)
  saldoReceber: number | null;
  valorVencido: number;
}

export type ChaveOrdem = "codigo" | "fase" | "entrega" | "geral" | "faturar" | "receber";
export type Sentido = "asc" | "desc";
export interface Ordenacao {
  chave: ChaveOrdem;
  sentido: Sentido;
}

export interface Filtros {
  busca: string;
  gestor: string;
  fase: string;
  saude: "" | StatusSaude;
  soAtrasadas: boolean;
}

export interface Preferencias {
  ordem: Ordenacao;
  filtros: Filtros;
}

export const ORDEM_PADRAO: Ordenacao = { chave: "codigo", sentido: "asc" };
export const FILTROS_VAZIOS: Filtros = { busca: "", gestor: "", fase: "", saude: "", soAtrasadas: false };

export const ROTULO_ORDEM: Record<ChaveOrdem, string> = {
  codigo: "Obra (código)",
  fase: "Fase",
  entrega: "Entrega",
  geral: "Situação geral",
  faturar: "A faturar",
  receber: "A receber",
};

// primeiro clique numa coluna: gravidade e valores comecam do maior; codigo, fase e entrega do menor
export function sentidoInicial(chave: ChaveOrdem): Sentido {
  return chave === "geral" || chave === "faturar" || chave === "receber" ? "desc" : "asc";
}

// clicar na coluna ja ordenada inverte; em outra coluna comeca pelo sentido inicial
export function alternarOrdem(atual: Ordenacao, chave: ChaveOrdem): Ordenacao {
  if (atual.chave === chave) return { chave, sentido: atual.sentido === "asc" ? "desc" : "asc" };
  return { chave, sentido: sentidoInicial(chave) };
}

const CHAVES: ChaveOrdem[] = ["codigo", "fase", "entrega", "geral", "faturar", "receber"];

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const dataValida = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null);

function compararCodigo(a: LinhaStatus, b: LinhaStatus): number {
  const na = Number(a.codigo);
  const nb = Number(b.codigo);
  if (a.codigo !== null && b.codigo !== null && a.codigo !== "" && b.codigo !== "" && !isNaN(na) && !isNaN(nb) && na !== nb)
    return na - nb;
  return String(a.codigo ?? "").localeCompare(String(b.codigo ?? ""), "pt-BR", { numeric: true });
}

type Valor = number | string | null;

function valorDaChave(l: LinhaStatus, chave: ChaveOrdem, ordemFases: string[]): Valor {
  switch (chave) {
    case "codigo":
      return null; // tratado a parte
    case "fase": {
      const f = String(l.fase ?? "");
      if (!f) return null;
      const i = ordemFases.indexOf(f);
      return i >= 0 ? i : ordemFases.length;
    }
    case "entrega":
      return dataValida(l.dataEntrega);
    case "geral":
      return l.statusGeral ? l.gravidade : null;
    case "faturar":
      return l.saldoFaturar;
    case "receber":
      return l.saldoReceber;
  }
}

// ordena sem mexer na lista original; vazio ("sem data", "sem escopo") vai sempre para o fim;
// empate cai no codigo da obra (crescente), para a ordem ficar estavel
export function ordenarLinhas<T extends LinhaStatus>(linhas: T[], ord: Ordenacao, ordemFases: string[] = []): T[] {
  const mult = ord.sentido === "asc" ? 1 : -1;
  return [...linhas].sort((a, b) => {
    if (ord.chave === "codigo") return compararCodigo(a, b) * mult;
    const va = valorDaChave(a, ord.chave, ordemFases);
    const vb = valorDaChave(b, ord.chave, ordemFases);
    if (va === null && vb === null) return compararCodigo(a, b);
    if (va === null) return 1;
    if (vb === null) return -1;
    const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return c !== 0 ? c * mult : compararCodigo(a, b);
  });
}

export function filtrosAtivos(f: Filtros): boolean {
  return Boolean(f.busca.trim() || f.gestor || f.fase || f.saude || f.soAtrasadas);
}

// gestor ou fase salvos que nao existem mais na lista (obra mudou de mao) nao podem esvaziar a tabela
// sem o usuario ver o porque; com a lista ainda vazia (carregando) nada e ajustado
export function sanearFiltros(f: Filtros, linhas: LinhaStatus[], mostrarGestor: boolean): Filtros {
  let gestor = mostrarGestor ? f.gestor : "";
  let fase = f.fase;
  if (linhas.length > 0) {
    if (gestor && !linhas.some((l) => (l.responsavel ?? "") === gestor)) gestor = "";
    if (fase && !linhas.some((l) => String(l.fase ?? "") === fase)) fase = "";
  }
  return { ...f, gestor, fase };
}

export function filtrarLinhas<T extends LinhaStatus>(linhas: T[], f: Filtros, hojeISO: string): T[] {
  const termo = semAcento(f.busca.trim());
  return linhas.filter((l) => {
    if (termo && !semAcento(`${l.codigo ?? ""} ${l.nome ?? ""}`).includes(termo)) return false;
    if (f.gestor && (l.responsavel ?? "") !== f.gestor) return false;
    if (f.fase && String(l.fase ?? "") !== f.fase) return false;
    if (f.saude && l.statusGeral !== f.saude) return false;
    if (f.soAtrasadas && !prazoEntrega(l.dataEntrega, hojeISO)?.atrasada) return false;
    return true;
  });
}

export function opcoesGestor(linhas: LinhaStatus[]): string[] {
  const nomes = new Set(linhas.map((l) => l.responsavel ?? "").filter(Boolean));
  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// fases presentes, na ordem do fluxo da obra (as desconhecidas vao para o fim)
export function opcoesFase(linhas: LinhaStatus[], ordemFases: string[]): string[] {
  const fases = new Set(linhas.map((l) => String(l.fase ?? "")).filter(Boolean));
  const pos = (f: string) => {
    const i = ordemFases.indexOf(f);
    return i >= 0 ? i : ordemFases.length;
  };
  return [...fases].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, "pt-BR"));
}

// ---------------------------------------------------------------------------------------------
// Lembrar a escolha durante a sessao (texto guardado no sessionStorage). Valor estranho = padrao.

export function lerPreferencias(texto: string | null | undefined): Preferencias {
  const padrao: Preferencias = { ordem: { ...ORDEM_PADRAO }, filtros: { ...FILTROS_VAZIOS } };
  if (!texto) return padrao;
  try {
    const bruto = JSON.parse(texto);
    if (!bruto || typeof bruto !== "object") return padrao;
    const o = bruto.ordem;
    const f = bruto.filtros;
    const ordem: Ordenacao =
      o && CHAVES.includes(o.chave) && (o.sentido === "asc" || o.sentido === "desc")
        ? { chave: o.chave, sentido: o.sentido }
        : padrao.ordem;
    const filtros: Filtros = {
      busca: typeof f?.busca === "string" ? f.busca : "",
      gestor: typeof f?.gestor === "string" ? f.gestor : "",
      fase: typeof f?.fase === "string" ? f.fase : "",
      saude: f?.saude === "critico" || f?.saude === "atencao" || f?.saude === "em_dia" ? f.saude : "",
      soAtrasadas: f?.soAtrasadas === true,
    };
    return { ordem, filtros };
  } catch {
    return padrao;
  }
}

// ---------------------------------------------------------------------------------------------
// CSV para o Excel em portugues: separador ";", BOM UTF-8, virgula decimal, datas DD/MM/AAAA.

const INICIO_FORMULA = /^[=+\-@\t\r]/;

// texto: aspas quando tem ; " ou quebra de linha; apostrofo na frente se parece formula
export function celulaTexto(valor: unknown): string {
  let t = valor === null || valor === undefined ? "" : String(valor);
  if (INICIO_FORMULA.test(t)) t = `'${t}`;
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// numero de verdade (nao e texto, entao "-" no comeco e sinal e nao leva apostrofo); sem "R$" e sem milhar
export function celulaNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return "";
  const t = valor.toFixed(casas).replace(".", ",");
  return /^-0(,0+)?$/.test(t) ? t.slice(1) : t; // evita "-0,00"
}

export function dataBR(iso: string | null | undefined): string {
  const d = dataValida(iso);
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "";
}

const NIVEL_CSV: Record<NivelArea, string> = { verde: "Em dia", amarelo: "Atenção", vermelho: "Crítico" };

export const CABECALHO_CSV = [
  "Código",
  "Obra",
  "Gestor",
  "Fase",
  "Entrega",
  "Dias para a entrega",
  "Saúde geral",
  ...AREAS_SAUDE.map((a) => a.nome),
  "Motivos",
  "A faturar",
  "A receber",
  "Valor vencido",
];

export function montarCsv(
  linhas: LinhaStatus[],
  opcoes: { hojeISO: string; labelFase: (fase: string) => string },
): string {
  const corpo = linhas.map((l) => {
    const prazo = prazoEntrega(l.dataEntrega, opcoes.hojeISO);
    const celulas = [
      celulaTexto(l.codigo),
      celulaTexto(l.nome),
      celulaTexto(l.responsavel),
      celulaTexto(l.fase ? opcoes.labelFase(String(l.fase)) : ""),
      dataBR(l.dataEntrega),
      celulaNumero(prazo ? prazo.dias : null, 0),
      celulaTexto(l.statusGeral ? ROTULO_SAUDE[l.statusGeral] : "Sem dados"),
      ...AREAS_SAUDE.map((a) => celulaTexto(l.areas ? NIVEL_CSV[l.areas[a.campo]] : "Sem dados")),
      celulaTexto(l.motivosCriticos.join(" | ")),
      celulaNumero(l.saldoFaturar),
      celulaNumero(l.saldoReceber),
      celulaNumero(l.valorVencido),
    ];
    return celulas.join(";");
  });
  const cab = CABECALHO_CSV.map(celulaTexto).join(";");
  return "﻿" + [cab, ...corpo].join("\r\n") + "\r\n";
}

export const nomeArquivoCsv = (hojeISO: string) => `status-obras-${hojeISO}.csv`;
