// Contas do cronograma em barras no tempo (Gantt) - Pacote 4 / B5.
// Conta pura: GraficoGantt.tsx so desenha; AbaCronograma e painel/GanttCarteira montam as linhas daqui.
// Datas sempre como texto AAAA-MM-DD (new Date("AAAA-MM-DD") escorrega um dia no fuso do Brasil).
import { diasAte } from "./saudeObra";

export type SituacaoGantt = "atrasada" | "em_andamento" | "concluida" | "a_iniciar" | "cancelada";

export const ROTULO_SITUACAO: Record<SituacaoGantt, string> = {
  atrasada: "Atrasada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  a_iniciar: "A iniciar",
  cancelada: "Cancelada",
};

// mesmas familias de cor da etiqueta de status da tabela (classeStatusCronograma)
export const COR_SITUACAO: Record<SituacaoGantt, string> = {
  atrasada: "#d03b3b",
  em_andamento: "#d97706",
  concluida: "#0ca30c",
  a_iniciar: "#2563eb",
  cancelada: "#94a3b8",
};

export const ORDEM_SITUACOES: SituacaoGantt[] = ["atrasada", "em_andamento", "concluida", "a_iniciar", "cancelada"];

export interface Intervalo {
  inicio: string;
  fim: string;
}

// fase do cronograma (mesmos campos de cronograma_obra)
export interface FaseCronograma {
  id: string;
  id_obra?: string | null;
  fase?: string | null;
  ordem?: number | null;
  status?: string | null;
  inicio_previsto?: string | null;
  fim_previsto?: string | null;
  inicio_real?: string | null;
  fim_real?: string | null;
}

export interface MarcoGantt {
  iso: string;
  rotulo: string;
  situacao: SituacaoGantt;
}

// uma linha do grafico, ja pronta para desenhar
export interface LinhaGantt {
  id: string;
  rotulo: string;
  subtitulo?: string;
  situacao: SituacaoGantt;
  /** texto ao lado da situacao (ex.: "7 fases vencidas") */
  complemento?: string;
  previsto: Intervalo | null;
  real: Intervalo | null;
  /** realizado sem fim: a barra vai ate hoje */
  realEmAberto: boolean;
  marcos: MarcoGantt[];
  /** trecho destacado sobre a barra prevista (fase atual da obra no cronograma da carteira) */
  destaque: (Intervalo & { rotulo: string; situacao: SituacaoGantt }) | null;
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}/;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dataISO(v: string | null | undefined): string | null {
  return v && RE_ISO.test(v) ? v.slice(0, 10) : null;
}

/** dias de a ate b (b - a) */
export function diasEntre(a: string, b: string): number {
  return diasAte(b, a);
}

export function somarDias(iso: string, dias: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function diaDaSemana(iso: string): number {
  return new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay();
}

function primeiroDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function proximoMes(iso: string): string {
  let a = +iso.slice(0, 4);
  let m = +iso.slice(5, 7) + 1;
  if (m > 12) {
    m = 1;
    a += 1;
  }
  return `${a}-${String(m).padStart(2, "0")}-01`;
}

export function formatarDataBR(iso: string | null | undefined): string {
  const d = dataISO(iso);
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "";
}

export function rotuloMes(iso: string): string {
  return `${MESES[+iso.slice(5, 7) - 1]}/${iso.slice(2, 4)}`;
}

function ordenar(a: string, b: string): Intervalo {
  return a <= b ? { inicio: a, fim: b } : { inicio: b, fim: a };
}

// --------------------------------------------------------------------------------------------- situacao

export function situacaoFase(f: FaseCronograma, hojeISO: string): SituacaoGantt {
  const status = f.status || "";
  if (status === "cancelado") return "cancelada";
  if (status === "concluido" || dataISO(f.fim_real)) return "concluida";
  const fim = dataISO(f.fim_previsto);
  if (status === "atrasado" || (fim && fim < hojeISO)) return "atrasada";
  if (status === "em_andamento" || dataISO(f.inicio_real)) return "em_andamento";
  return "a_iniciar";
}

// --------------------------------------------------------------------------------------------- intervalos

/** previsto: so uma das datas vira um marco de um dia; nenhuma = sem barra */
export function intervaloPrevisto(f: FaseCronograma): Intervalo | null {
  const i = dataISO(f.inicio_previsto);
  const fim = dataISO(f.fim_previsto);
  if (!i && !fim) return null;
  return ordenar(i ?? fim!, fim ?? i!);
}

/** realizado: do inicio real ate o fim real, ou ate hoje se ainda em andamento */
export function intervaloReal(f: FaseCronograma, hojeISO: string): { intervalo: Intervalo | null; emAberto: boolean } {
  const i = dataISO(f.inicio_real);
  const fim = dataISO(f.fim_real);
  if (!i && !fim) return { intervalo: null, emAberto: false };
  if (!i) return { intervalo: { inicio: fim!, fim: fim! }, emAberto: false };
  if (fim) return { intervalo: ordenar(i, fim), emAberto: false };
  return { intervalo: ordenar(i, hojeISO > i ? hojeISO : i), emAberto: true };
}

export function linhaDeFase(f: FaseCronograma, rotulo: string, hojeISO: string): LinhaGantt {
  const real = intervaloReal(f, hojeISO);
  return {
    id: f.id,
    rotulo,
    situacao: situacaoFase(f, hojeISO),
    previsto: intervaloPrevisto(f),
    real: real.intervalo,
    realEmAberto: real.emAberto,
    marcos: [],
    destaque: null,
  };
}

// --------------------------------------------------------------------------------------------- escala

export interface MarcaEscala {
  iso: string;
  rotulo: string;
  /** 0 a 100 (% da largura do eixo) */
  posicao: number;
}

export interface EscalaGantt {
  inicio: string;
  /** exclusivo: primeiro dia depois do fim do eixo */
  fim: string;
  totalDias: number;
  meses: MarcaEscala[];
  semanas: MarcaEscala[];
  /** largura minima do eixo em px: abaixo disso o grafico rola de lado dentro dele mesmo */
  larguraMinimaPx: number;
  posicaoHoje: number | null;
}

// periodo curto (ate ~4 meses) ganha marcas por semana
const LIMITE_SEMANAS_DIAS = 125;

export function montarEscala(linhas: LinhaGantt[], hojeISO: string): EscalaGantt | null {
  const datas: string[] = [];
  for (const l of linhas) {
    for (const iv of [l.previsto, l.real, l.destaque]) if (iv) datas.push(iv.inicio, iv.fim);
    for (const m of l.marcos) datas.push(m.iso);
  }
  if (!datas.length) return null;
  datas.push(hojeISO);
  datas.sort();
  const inicio = primeiroDoMes(datas[0]);
  const fim = proximoMes(datas[datas.length - 1]);
  const totalDias = diasEntre(inicio, fim);
  const pos = (iso: string) => (diasEntre(inicio, iso) / totalDias) * 100;

  const meses: MarcaEscala[] = [];
  for (let m = inicio; m < fim; m = proximoMes(m)) meses.push({ iso: m, rotulo: rotuloMes(m), posicao: pos(m) });

  const semanas: MarcaEscala[] = [];
  if (totalDias <= LIMITE_SEMANAS_DIAS) {
    // segundas-feiras
    let s = somarDias(inicio, (8 - diaDaSemana(inicio)) % 7);
    for (; s < fim; s = somarDias(s, 7)) semanas.push({ iso: s, rotulo: `${s.slice(8, 10)}/${s.slice(5, 7)}`, posicao: pos(s) });
  }

  // ~80 px por mes (ou ~42 px por semana): rotulos de mes nunca se sobrepoem
  const pxPorDia = semanas.length ? 6 : 2.7;
  return {
    inicio,
    fim,
    totalDias,
    meses,
    semanas,
    larguraMinimaPx: Math.max(360, Math.round(totalDias * pxPorDia)),
    posicaoHoje: hojeISO >= inicio && hojeISO < fim ? pos(hojeISO) : null,
  };
}

/** posicao (% a esquerda) e largura (%) de um intervalo, contando o dia final inteiro */
export function geometria(iv: Intervalo, escala: EscalaGantt): { esquerda: number; largura: number } {
  const esquerda = Math.min(Math.max((diasEntre(escala.inicio, iv.inicio) / escala.totalDias) * 100, 0), 100);
  const direita = Math.min(Math.max(((diasEntre(escala.inicio, iv.fim) + 1) / escala.totalDias) * 100, 0), 100);
  return { esquerda, largura: Math.max(direita - esquerda, 0) };
}

export function posicaoData(iso: string, escala: EscalaGantt): number {
  return Math.min(Math.max((diasEntre(escala.inicio, iso) / escala.totalDias) * 100, 0), 100);
}

// --------------------------------------------------------------------------------------------- textos acessiveis

export function textoIntervalo(iv: Intervalo): string {
  return iv.inicio === iv.fim ? `em ${formatarDataBR(iv.inicio)}` : `de ${formatarDataBR(iv.inicio)} a ${formatarDataBR(iv.fim)}`;
}

export function descreverPrevisto(l: LinhaGantt, nomePrevisto = "previsto"): string {
  return l.previsto ? `${l.rotulo}: ${nomePrevisto} ${textoIntervalo(l.previsto)}. Situação: ${ROTULO_SITUACAO[l.situacao]}` : "";
}

export function descreverReal(l: LinhaGantt): string {
  if (!l.real) return "";
  const t = l.realEmAberto
    ? `iniciado em ${formatarDataBR(l.real.inicio)}, em andamento até hoje`
    : textoIntervalo(l.real);
  return `${l.rotulo}: realizado ${t}`;
}

// --------------------------------------------------------------------------------------------- carteira

export interface ObraCarteira {
  id: string;
  codigo: string;
  nome: string;
  data_inicio?: string | null;
  data_previsao_fim?: string | null;
  fase_atual?: string | null;
}

/**
 * Uma linha por obra: do inicio previsto da primeira fase (ou o inicio da obra) ate a entrega prevista da obra
 * (ou o fim previsto da ultima fase), com um marco no fim previsto de cada fase e a fase atual destacada.
 * Cronograma desatualizado (fases vencidas) vira texto ("7 fases vencidas") e marcos vermelhos, sem poluir a barra.
 */
export function linhaDeObra(
  obra: ObraCarteira,
  fases: FaseCronograma[],
  hojeISO: string,
  nomeFase: (fase: string) => string,
): LinhaGantt {
  const ordenadas = [...fases].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const inicios = ordenadas.map((f) => dataISO(f.inicio_previsto)).filter((d): d is string => !!d).sort();
  const fins = ordenadas.map((f) => dataISO(f.fim_previsto)).filter((d): d is string => !!d).sort();
  const inicio = inicios[0] ?? dataISO(obra.data_inicio) ?? null;
  const fim = dataISO(obra.data_previsao_fim) ?? fins[fins.length - 1] ?? null;
  const previsto = inicio || fim ? ordenar(inicio ?? fim!, fim ?? inicio!) : null;

  const situacoes = ordenadas.map((f) => situacaoFase(f, hojeISO));
  const vencidas = situacoes.filter((s) => s === "atrasada").length;
  const entregaVencida = !!fim && fim < hojeISO;

  const marcos: MarcoGantt[] = [];
  ordenadas.forEach((f, i) => {
    const d = dataISO(f.fim_previsto);
    if (d) marcos.push({ iso: d, rotulo: `Fim previsto de ${nomeFase(f.fase || "")}`, situacao: situacoes[i] });
  });

  const idxAtual = ordenadas.findIndex((f) => f.fase === obra.fase_atual);
  let destaque: LinhaGantt["destaque"] = null;
  if (idxAtual >= 0) {
    const iv = intervaloPrevisto(ordenadas[idxAtual]);
    if (iv) destaque = { ...iv, rotulo: `Fase atual: ${nomeFase(obra.fase_atual || "")}`, situacao: situacoes[idxAtual] };
  }

  const partes: string[] = [];
  if (obra.fase_atual) partes.push(`Fase atual: ${nomeFase(obra.fase_atual)}`);
  if (vencidas) partes.push(`${vencidas} ${vencidas === 1 ? "fase vencida" : "fases vencidas"}`);
  if (fim) partes.push(entregaVencida ? `entrega vencida em ${formatarDataBR(fim)}` : `entrega ${formatarDataBR(fim)}`);

  const situacao: SituacaoGantt =
    entregaVencida || vencidas > 0
      ? "atrasada"
      : situacoes.length && situacoes.every((s) => s === "concluida" || s === "cancelada")
        ? "concluida"
        : situacoes.some((s) => s === "em_andamento" || s === "concluida")
          ? "em_andamento"
          : "a_iniciar";

  return {
    id: obra.id,
    rotulo: obra.codigo || "—",
    subtitulo: obra.nome,
    situacao,
    complemento: partes.join(" · "),
    previsto,
    real: null,
    realEmAberto: false,
    marcos,
    destaque,
  };
}
