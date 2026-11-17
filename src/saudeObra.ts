// Criterio unico de saude da obra (Painel e Minhas Obras usam esta mesma regra).
// Os indicadores vem da funcao do banco obras_saude (contagens por obra); aqui so a regra:
//   area vermelha = tem item vencido; amarela = sem vencido, mas algo vence em ate 7 dias
//   (ou, em Alertas, alerta aberto nao critico); verde = nada disso.
//   Geral: Critico se parcela vencida, alerta critico ou 2+ areas vermelhas;
//          Atencao se alguma area vermelha/amarela; Em dia caso contrario.

export type NivelArea = "verde" | "amarelo" | "vermelho";
export type StatusSaude = "critico" | "atencao" | "em_dia";
export type AreaSaude = "financeiro" | "documentos" | "cronograma" | "tarefas" | "alertas";

// campos opcionais: um indicador que nao veio conta como zero
export interface IndicadoresSaude {
  parcelas_vencidas?: number | null;
  tarefas_atrasadas?: number | null;
  tarefas_7dias?: number | null;
  fases_atrasadas?: number | null;
  fases_7dias?: number | null;
  documentos_atrasados?: number | null;
  documentos_7dias?: number | null;
  alertas_abertos?: number | null;
  alertas_criticos?: number | null;
}

export interface SaudeObra {
  areas: Record<AreaSaude, NivelArea>;
  geral: StatusSaude;
  rotulo: string;
  motivos: string[];
  // para ordenar (mais grave primeiro): geral, depois areas vermelhas, depois amarelas
  gravidade: number;
}

export const AREAS_SAUDE: { campo: AreaSaude; nome: string }[] = [
  { campo: "financeiro", nome: "Financeiro" },
  { campo: "documentos", nome: "Documentos" },
  { campo: "cronograma", nome: "Cronograma" },
  { campo: "tarefas", nome: "Tarefas" },
  { campo: "alertas", nome: "Alertas" },
];

export const ROTULO_SAUDE: Record<StatusSaude, string> = {
  critico: "Crítico",
  atencao: "Atenção",
  em_dia: "Em dia",
};

export const ROTULO_NIVEL: Record<NivelArea, string> = {
  vermelho: "Vencido",
  amarelo: "Vence em até 7 dias",
  verde: "Em dia",
};

// texto curto de ajuda ("como e calculado") mostrado nas duas telas
export const EXPLICACAO_SAUDE =
  "Como é calculado: cada área fica vermelha se tem item vencido (parcela do cliente com saldo, documento, " +
  "fase do cronograma ou tarefa com prazo passado, alerta crítico aberto) e amarela se algo vence nos próximos " +
  "7 dias ou há alerta aberto. Crítico = parcela vencida, alerta crítico ou duas ou mais áreas vermelhas; " +
  "Atenção = alguma área vermelha ou amarela; Em dia = nada disso.";

const n = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);

const nivel = (vencidos: number, proximos: number): NivelArea =>
  vencidos > 0 ? "vermelho" : proximos > 0 ? "amarelo" : "verde";

export function avaliarSaude(ind: IndicadoresSaude): SaudeObra {
  const parcelas = n(ind.parcelas_vencidas);
  const tarefasAtr = n(ind.tarefas_atrasadas);
  const tarefas7 = n(ind.tarefas_7dias);
  const fasesAtr = n(ind.fases_atrasadas);
  const fases7 = n(ind.fases_7dias);
  const docsAtr = n(ind.documentos_atrasados);
  const docs7 = n(ind.documentos_7dias);
  const criticos = n(ind.alertas_criticos);
  // alerta aberto nao critico (o total inclui os criticos)
  const outrosAlertas = Math.max(n(ind.alertas_abertos) - criticos, 0);

  const areas: Record<AreaSaude, NivelArea> = {
    financeiro: nivel(parcelas, 0),
    documentos: nivel(docsAtr, docs7),
    cronograma: nivel(fasesAtr, fases7),
    tarefas: nivel(tarefasAtr, tarefas7),
    alertas: nivel(criticos, outrosAlertas),
  };
  const valores = Object.values(areas);
  const vermelhas = valores.filter((a) => a === "vermelho").length;
  const amarelas = valores.filter((a) => a === "amarelo").length;

  const geral: StatusSaude =
    parcelas > 0 || criticos > 0 || vermelhas >= 2 ? "critico" : vermelhas + amarelas > 0 ? "atencao" : "em_dia";

  // vencidos primeiro, depois o que vence em 7 dias
  const motivos: string[] = [];
  if (criticos) motivos.push(`${criticos} alerta(s) crítico(s)`);
  if (parcelas) motivos.push(`${parcelas} parcela(s) vencida(s)`);
  if (tarefasAtr) motivos.push(`${tarefasAtr} tarefa(s) atrasada(s)`);
  if (fasesAtr) motivos.push(`${fasesAtr} fase(s) atrasada(s)`);
  if (docsAtr) motivos.push(`${docsAtr} documento(s) atrasado(s)`);
  if (outrosAlertas) motivos.push(`${outrosAlertas} alerta(s)`);
  if (fases7) motivos.push(`${fases7} fase(s) vence(m) em 7 dias`);
  if (tarefas7) motivos.push(`${tarefas7} tarefa(s) vence(m) em 7 dias`);
  if (docs7) motivos.push(`${docs7} documento(s) vence(m) em 7 dias`);

  const pesoGeral = geral === "critico" ? 2 : geral === "atencao" ? 1 : 0;
  return {
    areas,
    geral,
    rotulo: ROTULO_SAUDE[geral],
    motivos,
    gravidade: pesoGeral * 100 + vermelhas * 10 + amarelas,
  };
}

// data de hoje (AAAA-MM-DD) no fuso do aparelho - o banco usa o dia de Sao Paulo
export function hojeLocalISO(agora: Date = new Date()): string {
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  const d = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${m}-${d}`;
}

// diferenca em dias entre duas datas AAAA-MM-DD (data - hoje)
export function diasAte(dataISO: string, hojeISO: string): number {
  const a = Date.UTC(+dataISO.slice(0, 4), +dataISO.slice(5, 7) - 1, +dataISO.slice(8, 10));
  const b = Date.UTC(+hojeISO.slice(0, 4), +hojeISO.slice(5, 7) - 1, +hojeISO.slice(8, 10));
  return Math.round((a - b) / 86400000);
}

// prazo de entrega da obra: "em 12 dias", "vence hoje", "atrasada 5 dias"; null sem data
export function prazoEntrega(
  dataISO: string | null | undefined,
  hojeISO: string,
): { texto: string; atrasada: boolean; dias: number } | null {
  if (!dataISO || !/^\d{4}-\d{2}-\d{2}/.test(dataISO)) return null;
  const dias = diasAte(dataISO.slice(0, 10), hojeISO);
  if (dias === 0) return { texto: "vence hoje", atrasada: false, dias };
  if (dias > 0) return { texto: `em ${dias} ${dias === 1 ? "dia" : "dias"}`, atrasada: false, dias };
  const atraso = -dias;
  return { texto: `atrasada ${atraso} ${atraso === 1 ? "dia" : "dias"}`, atrasada: true, dias };
}
