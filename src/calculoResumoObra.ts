// Contas da aba Resumo da obra e do relatorio de status (itens B6/B9, pacote 4).
// Regra: nenhum numero novo - cada conta repete a da aba de detalhe (ou do Painel), para o Resumo
// nunca contradizer a aba que o gestor abre no "ver detalhes".

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// soma em centavos: evita 0,1 + 0,2 = 0,30000000000000004 nos totais
const centavos = (v: unknown) => Math.round(num(v) * 100);
const reais = (c: number) => c / 100;
const dataDe = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

// ---------- Faturado x escopo ----------
// Mesma conta do "A faturar" do Painel e do "Saldo a faturar" da aba Faturamento:
// escopo = soma de obra_faturamento_familias.valor_total_escopo; faturado = NFs ligadas a familia.
export interface FamiliaEscopo {
  valor_total_escopo: number | string | null;
}
export interface RealizadoFaturamento {
  valor_realizado: number | string | null;
  id_obra_faturamento_familia?: string | null;
}
export interface ResumoFaturamento {
  escopo: number;
  faturado: number;
  aFaturar: number;
  // 0 a 100 (para a barra); obra sem escopo = 0
  pct: number;
  semEscopo: boolean;
}

export function resumirFaturamento(familias: FamiliaEscopo[], realizados: RealizadoFaturamento[]): ResumoFaturamento {
  const escopoC = familias.reduce((a, f) => a + centavos(f.valor_total_escopo), 0);
  // NF sem familia nao entra (o Painel filtra id_obra_faturamento_familia nao nulo)
  const faturadoC = realizados
    .filter((r) => r.id_obra_faturamento_familia !== null && r.id_obra_faturamento_familia !== "")
    .reduce((a, r) => a + centavos(r.valor_realizado), 0);
  const semEscopo = escopoC <= 0;
  return {
    escopo: reais(escopoC),
    faturado: reais(faturadoC),
    aFaturar: semEscopo ? 0 : reais(Math.max(escopoC - faturadoC, 0)),
    pct: semEscopo ? 0 : Math.min(100, Math.max(0, (faturadoC / escopoC) * 100)),
    semEscopo,
  };
}

// ---------- Recebimento ----------
export interface ParcelaResumo {
  descricao?: string | null;
  data_prevista?: string | null;
  valor_previsto?: number | string | null;
  valor_realizado?: number | string | null;
  status?: string | null;
}
export interface ResumoRecebimento {
  recebido: number;
  // venda - recebido (o "Saldo a receber" da aba Financeiro), nunca negativo; null = sem acesso a venda
  aReceber: number | null;
  // saldo das parcelas com data passada (mesma regra do indicador de saude e do Painel)
  vencido: number;
  parcelasVencidas: number;
  proxima: { descricao: string; data: string; valor: number } | null;
}

export function resumirRecebimento(parcelas: ParcelaResumo[], valorVenda: number | null, hojeISO: string): ResumoRecebimento {
  let recebidoC = 0;
  let vencidoC = 0;
  let parcelasVencidas = 0;
  let proxima: ResumoRecebimento["proxima"] = null;
  for (const p of parcelas) {
    recebidoC += centavos(p.valor_realizado);
    const saldoC = centavos(p.valor_previsto) - centavos(p.valor_realizado);
    const data = dataDe(p.data_prevista);
    if (saldoC <= 0 || !data) continue;
    if (data < hojeISO) {
      vencidoC += saldoC;
      parcelasVencidas += 1;
    } else if (p.status !== "cancelado" && (!proxima || data < proxima.data)) {
      // proxima = a de data mais perto a partir de hoje, pelo saldo que falta receber
      proxima = { descricao: p.descricao || "Parcela", data, valor: reais(saldoC) };
    }
  }
  return {
    recebido: reais(recebidoC),
    aReceber: valorVenda === null ? null : reais(Math.max(centavos(valorVenda) - recebidoC, 0)),
    vencido: reais(vencidoC),
    parcelasVencidas,
    proxima,
  };
}

// ---------- Compras (material) ----------
// Mesma definicao da aba Compras: em aberto = situacao diferente de "recebido";
// atrasada = em aberto com previsao de entrega antes de hoje.
export interface CompraResumo {
  situacao: string | null;
  data_entrega?: string | null;
}
export interface ResumoCompras {
  abertas: number;
  atrasadas: number;
  semPedido: number;
  aguardando: number;
}

export function resumirCompras(compras: CompraResumo[], hojeISO: string): ResumoCompras {
  const abertas = compras.filter((c) => c.situacao !== "recebido");
  return {
    abertas: abertas.length,
    atrasadas: abertas.filter((c) => {
      const d = dataDe(c.data_entrega);
      return d !== null && d < hojeISO;
    }).length,
    semPedido: compras.filter((c) => c.situacao === "sem_pedido").length,
    aguardando: compras.filter((c) => c.situacao === "aguardando" || c.situacao === "nao_liberado").length,
  };
}

// ---------- Verba (alerta por familia) ----------
export interface AlertaFamiliaResumo {
  codigo_projeto: string;
  nivel: string | null;
}
// mesmos rotulos do selo da aba Rentabilidade (AlertaFamilia.tsx), em texto por extenso
export const ROTULO_ALERTA_FAMILIA: Record<string, string> = {
  sem_verba: "Sem verba",
  zerada: "Verba zerada",
  critico: "90% da verba",
  atencao: "80% da verba",
};
const PESO_ALERTA: Record<string, number> = { sem_verba: 4, zerada: 3, critico: 2, atencao: 1 };

export function familiasEmAlerta(alertas: AlertaFamiliaResumo[]) {
  return alertas
    .filter((a) => a.nivel && PESO_ALERTA[a.nivel])
    .map((a) => ({ codigo: a.codigo_projeto, nivel: a.nivel as string, rotulo: ROTULO_ALERTA_FAMILIA[a.nivel as string] }))
    .sort((a, b) => PESO_ALERTA[b.nivel] - PESO_ALERTA[a.nivel] || a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
}

// ---------- Cronograma ----------
export interface FaseResumo {
  fase?: string | null;
  ordem?: number | null;
  status?: string | null;
  fim_previsto?: string | null;
  fim_real?: string | null;
}
export interface ResumoCronograma {
  proxima: { fase: string; fimPrevisto: string | null } | null;
  // mesma regra de obras_saude: sem fim real, nao concluida/cancelada, fim previsto antes de hoje
  atrasadas: { fase: string; fimPrevisto: string; diasAtraso: number }[];
  concluidas: number;
  total: number;
}

const encerrada = (f: FaseResumo) => f.status === "concluido" || f.status === "cancelado";
const diasEntre = (de: string, ate: string) =>
  Math.round(
    (Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) -
      Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) /
      86400000,
  );

export function resumirCronograma(
  fases: FaseResumo[],
  faseAtual: string | null | undefined,
  fimObraISO: string | null | undefined,
  hojeISO: string,
): ResumoCronograma {
  const ordenadas = fases
    .map((f, i) => ({ f, i }))
    .sort((a, b) => num(a.f.ordem) - num(b.f.ordem) || a.i - b.i)
    .map((x) => x.f);
  const atrasadas = ordenadas
    .filter((f) => !f.fim_real && !encerrada(f) && dataDe(f.fim_previsto) !== null && dataDe(f.fim_previsto)! < hojeISO)
    .map((f) => {
      const fim = dataDe(f.fim_previsto)!;
      return { fase: f.fase || "", fimPrevisto: fim, diasAtraso: diasEntre(fim, hojeISO) };
    });
  // proxima = primeira fase em aberto depois da fase atual da obra (pela ordem do cronograma);
  // fase atual fora do cronograma: primeira fase em aberto que nao seja a atual
  const idxAtual = ordenadas.findIndex((f) => f.fase === faseAtual);
  const candidata = ordenadas.find((f, i) => (idxAtual >= 0 ? i > idxAtual : f.fase !== faseAtual) && !encerrada(f) && !f.fim_real);
  // sem fim previsto na fase, o cronograma mostra o fim da obra (AbaCronograma faz o mesmo)
  const proxima = candidata
    ? { fase: candidata.fase || "", fimPrevisto: dataDe(candidata.fim_previsto) || dataDe(fimObraISO) }
    : null;
  return {
    proxima,
    atrasadas,
    concluidas: ordenadas.filter((f) => f.status === "concluido").length,
    total: ordenadas.length,
  };
}

// ---------- Tarefas e pendencias ----------
export interface TarefaResumo {
  titulo?: string | null;
  status?: string | null;
  data_vencimento?: string | null;
}

// aberta = pendente ou em andamento; atrasada = prazo antes de hoje (mesma regra de obras_saude,
// que compara a data em UTC - o Supabase devolve o timestamp em UTC, entao basta a data do texto)
export function resumirTarefas(tarefas: TarefaResumo[], hojeISO: string) {
  const abertas = tarefas.filter((t) => t.status === "pendente" || t.status === "em_andamento");
  const atrasadas = abertas
    .filter((t) => {
      const d = dataDe(t.data_vencimento);
      return d !== null && d < hojeISO;
    })
    .sort((a, b) => String(a.data_vencimento).localeCompare(String(b.data_vencimento)));
  return { abertas: abertas.length, atrasadas: atrasadas.length, listaAtrasadas: atrasadas };
}

// Ate `limite` pendencias para o relatorio: motivos da saude primeiro, depois tarefas atrasadas pelo titulo
// (as mais antigas primeiro). Sem repetir.
export function principaisPendencias(motivos: string[], tarefasAtrasadas: TarefaResumo[], limite = 5): string[] {
  const lista: string[] = [];
  for (const m of motivos) if (!lista.includes(m)) lista.push(m);
  for (const t of tarefasAtrasadas) {
    const txt = `Tarefa atrasada: ${(t.titulo || "sem título").trim()}`;
    if (!lista.includes(txt)) lista.push(txt);
  }
  return lista.slice(0, limite);
}

// ---------- Diario ----------
// texto curto para o resumo/relatorio (uma linha, sem quebrar palavra no meio quando possivel)
export function resumirTexto(texto: string | null | undefined, max = 220): string {
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}
