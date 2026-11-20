import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatarMoeda, isoParaDataBR, labelFase } from "../../utils";
import {
  Activity,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  HeartPulse,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { CronogramaObra, DocumentoProjeto, Obra, ObraRentabilidadeFamilia } from "../../types";
import { supabase } from "../../supabase";
import {
  AREAS_SAUDE,
  EXPLICACAO_SAUDE,
  ROTULO_NIVEL,
  avaliarSaude,
  hojeLocalISO,
  prazoEntrega,
  type IndicadoresSaude,
  type NivelArea,
  type StatusSaude,
} from "../../saudeObra";
import {
  familiasEmAlerta,
  principaisPendencias,
  resumirCompras,
  resumirCronograma,
  resumirFaturamento,
  resumirRecebimento,
  resumirTarefas,
  resumirTexto,
  type AlertaFamiliaResumo,
  type CompraResumo,
  type ParcelaResumo,
  type ResumoFaturamento,
  type TarefaResumo,
} from "../../calculoResumoObra";
import { calcularLinha, formatarPct, formatarPp, type ValoresRestritos } from "../../painel/calculoMargemCarteira";
import type { ModoRelatorio } from "../../RelatorioStatusObra";
import { TITULO_SEM_ACESSO_VALOR } from "../../valoresObra";

const RelatorioStatusObra = lazy(() => import("../../RelatorioStatusObra"));

// Aba "resumo" do painel da obra: pagina unica com um bloco por assunto (item B6, pacote 4) e o
// relatorio de status em PDF (B9). Os dados que o App.tsx ja tinha vem por props; o resto a aba busca
// pelo id da obra (uma consulta por tabela, em paralelo). Cada bloco carrega e falha sozinho.
// As contas ficam em calculoResumoObra.ts e repetem as das abas de detalhe (nenhum numero novo).
export interface PropsAbaResumo {
  cronogramaObra: CronogramaObra[];
  documentosConcluidos: number;
  documentosProjeto: DocumentoProjeto[];
  fasesConcluidas: number;
  obraEcoSelecionada: Obra;
  parcelasVencidas: number;
  percentualCronograma: number;
  percentualDocumentos: number;
  saldoReceberParcelas: number | null;
  totalRealizadoParcelas: number;
  // null = sem acesso ao valor de venda da obra (valoresObra.ts)
  totalVendaGeral: number | null;
  // troca de aba do painel; sem ela o "ver detalhes" clica no botao da aba (id aba-obra-<aba>)
  irParaAba?: (aba: string) => void;
}

// cast: obras_valores_restritos/obra_familia_alerta e a funcao obras_saude estao fora do database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

async function exigir<T>(consulta: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

// ---------- consultas (fora do componente: referencias estaveis) ----------
const buscarSaude = async (id: string): Promise<IndicadoresSaude | null> => {
  const linhas = await exigir<IndicadoresSaude[] | null>(sb.rpc("obras_saude", { p_ids: [id] }));
  return (linhas || [])[0] ?? null;
};

const buscarFaturamento = async (id: string): Promise<ResumoFaturamento> => {
  const [familias, realizados] = await Promise.all([
    exigir<{ valor_total_escopo: number | null }[] | null>(
      sb.from("obra_faturamento_familias").select("valor_total_escopo").eq("id_obra", id),
    ),
    exigir<{ valor_realizado: number | null; id_obra_faturamento_familia: string | null }[] | null>(
      sb
        .from("obra_faturamento_realizados")
        .select("valor_realizado, id_obra_faturamento_familia")
        .eq("id_obra", id)
        .not("id_obra_faturamento_familia", "is", null),
    ),
  ]);
  return resumirFaturamento(familias || [], realizados || []);
};

const buscarParcelas = async (id: string): Promise<ParcelaResumo[]> =>
  (await exigir<ParcelaResumo[] | null>(
    sb.from("parcelas_cliente").select("descricao, data_prevista, valor_previsto, valor_realizado, status").eq("id_obra", id),
  )) || [];

// margem: o banco decide quem ve (RLS de obra_rentabilidade_familias e obras_valores_restritos);
// sem acesso as consultas voltam vazias e o bloco nao aparece
const buscarRentabilidade = async (id: string) => {
  const [familias, restritos] = await Promise.all([
    exigir<ObraRentabilidadeFamilia[] | null>(
      sb
        .from("obra_rentabilidade_familias")
        .select("id, id_obra, codigo_projeto, eh_obra, custo_previsto, custo_realizado, previsoes_em_aberto, pedidos_em_aberto")
        .eq("id_obra", id),
    ),
    exigir<ValoresRestritos | null>(
      sb.from("obras_valores_restritos").select("id_obra, margem_prevista_erp, venda_sem_impostos_erp").eq("id_obra", id).maybeSingle(),
    ),
  ]);
  return { familias: familias || [], restritos };
};

const buscarCompras = async (id: string): Promise<CompraResumo[]> =>
  (await exigir<CompraResumo[] | null>(
    sb.from("obra_compras_abertas").select("situacao, data_entrega").eq("id_obra", id).eq("servico", false),
  )) || [];

const buscarVerba = async (id: string): Promise<AlertaFamiliaResumo[]> =>
  (await exigir<AlertaFamiliaResumo[] | null>(sb.from("obra_familia_alerta").select("codigo_projeto, nivel").eq("id_obra", id))) || [];

interface Anotacao {
  id: number;
  texto: string | null;
  data_registro: string | null;
  created_at: string | null;
  usuarios: { nome?: string } | null;
}
const buscarDiario = async (id: string): Promise<Anotacao[]> =>
  (await exigir<Anotacao[] | null>(
    sb
      .from("diario_obra")
      .select("id, texto, data_registro, created_at, usuarios(nome)")
      .eq("id_obra", id)
      .order("data_registro", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
  )) || [];

const buscarTarefas = async (id: string): Promise<TarefaResumo[]> =>
  (await exigir<TarefaResumo[] | null>(
    sb.from("tarefas").select("titulo, status, data_vencimento").eq("id_obra", id).in("status", ["pendente", "em_andamento"]),
  )) || [];

// ---------- estado de cada bloco ----------
type Estado<T> = { estado: "carregando" } | { estado: "erro" } | { estado: "ok"; dados: T };

// So recarrega quando muda a obra (ou no "Tentar de novo"): o App re-renderiza a cada 60 s.
// O resultado guarda a chave (obra + tentativa) da busca: chave diferente da atual = carregando.
function useBloco<T>(idObra: string, buscar: (id: string) => Promise<T>) {
  const [tentativa, setTentativa] = useState(0);
  const chave = `${idObra}#${tentativa}`;
  const [res, setRes] = useState<{ chave: string; r: Estado<T> } | null>(null);
  useEffect(() => {
    let vivo = true;
    buscar(idObra).then(
      (dados) => vivo && setRes({ chave, r: { estado: "ok", dados } }),
      (e) => {
        console.error("resumo da obra", e);
        if (vivo) setRes({ chave, r: { estado: "erro" } });
      },
    );
    return () => {
      vivo = false;
    };
  }, [chave, idObra, buscar]);
  const st: Estado<T> = res && res.chave === chave ? res.r : CARREGANDO;
  return [st, () => setTentativa((t) => t + 1)] as const;
}
const CARREGANDO = { estado: "carregando" } as const;

const dadosDe = <T,>(s: Estado<T>): T | null => (s.estado === "ok" ? s.dados : null);

// abas que o usuario tem no painel (os botoes de aba ja estao na tela quando o Resumo monta)
const lerAbas = () =>
  new Set(
    typeof document === "undefined"
      ? []
      : [...document.querySelectorAll<HTMLElement>('[id^="aba-obra-"]')].map((el) => el.id.replace("aba-obra-", "")),
  );

// ---------- visual ----------
const ESTILO_SAUDE: Record<StatusSaude, string> = {
  critico: "bg-red-100 text-red-800 border-red-300",
  atencao: "bg-amber-100 text-amber-900 border-amber-300",
  em_dia: "bg-emerald-100 text-emerald-800 border-emerald-300",
};
const ESTILO_AREA: Record<NivelArea, string> = {
  vermelho: "bg-red-50 text-red-700 border-red-200",
  amarelo: "bg-amber-50 text-amber-800 border-amber-200",
  verde: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function Bloco({
  titulo,
  icone: Icone,
  estado,
  onTentar,
  detalhe,
  className = "",
  children,
}: {
  titulo: string;
  icone: typeof Activity;
  estado: "carregando" | "erro" | "ok";
  onTentar?: () => void;
  detalhe?: { rotulo?: string; onClick: () => void } | null;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={`bg-white p-4 rounded-xl shadow-sm border min-w-0 flex flex-col ${className}`} aria-busy={estado === "carregando"}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 min-w-0">
          <Icone size={17} className="text-petroleo shrink-0" aria-hidden="true" />
          <span className="truncate">{titulo}</span>
        </h3>
        {detalhe && (
          <button
            type="button"
            onClick={detalhe.onClick}
            className="shrink-0 text-xs font-semibold text-petroleo hover:underline flex items-center gap-0.5"
          >
            {detalhe.rotulo || "ver detalhes"} <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {estado === "carregando" ? (
        <div className="space-y-2 animate-pulse" aria-label="Carregando">
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
        </div>
      ) : estado === "erro" ? (
        <div className="text-sm text-red-700">
          <p>Não foi possível carregar este bloco.</p>
          {onTentar && (
            <button
              type="button"
              onClick={onTentar}
              className="mt-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw size={13} aria-hidden="true" /> Tentar de novo
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm flex-1">{children}</div>
      )}
    </section>
  );
}

const Linha = ({ rotulo, children, classe = "" }: { rotulo: string; children: ReactNode; classe?: string }) => (
  <div className="flex justify-between items-baseline gap-3 py-1 border-b last:border-b-0 border-slate-100">
    <span className="text-slate-600">{rotulo}</span>
    <span className={`font-bold text-right ${classe}`}>{children}</span>
  </div>
);

const Vazio = ({ children }: { children: ReactNode }) => <p className="text-slate-500">{children}</p>;

export default function AbaResumo({
  cronogramaObra,
  documentosConcluidos,
  documentosProjeto,
  fasesConcluidas,
  obraEcoSelecionada,
  percentualCronograma,
  percentualDocumentos,
  totalVendaGeral,
  irParaAba,
}: PropsAbaResumo) {
  // parcelasVencidas, saldoReceberParcelas e totalRealizadoParcelas continuam nas props (App.tsx passa),
  // mas o bloco Recebimento usa as parcelas buscadas aqui, para ter tambem o vencido e a proxima parcela
  const idObra = obraEcoSelecionada.id;
  const hoje = hojeLocalISO();

  const [saudeSt, recarregarSaude] = useBloco(idObra, buscarSaude);
  const [fatSt, recarregarFat] = useBloco(idObra, buscarFaturamento);
  const [parcSt, recarregarParc] = useBloco(idObra, buscarParcelas);
  const [rentSt, recarregarRent] = useBloco(idObra, buscarRentabilidade);
  const [compSt, recarregarComp] = useBloco(idObra, buscarCompras);
  const [verbaSt, recarregarVerba] = useBloco(idObra, buscarVerba);
  const [diarioSt, recarregarDiario] = useBloco(idObra, buscarDiario);
  const [tarefasSt, recarregarTarefas] = useBloco(idObra, buscarTarefas);

  const [abas] = useState<Set<string>>(lerAbas);
  const [menuPdf, setMenuPdf] = useState(false);
  const caixaMenu = useRef<HTMLDivElement>(null);
  // menu do relatorio fecha com clique fora ou Esc
  useEffect(() => {
    if (!menuPdf) return;
    const fora = (e: MouseEvent) => {
      if (!caixaMenu.current?.contains(e.target as Node)) setMenuPdf(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuPdf(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [menuPdf]);
  const [relatorio, setRelatorio] = useState<ModoRelatorio | null>(null);

  const detalhe = (...opcoes: string[]) => {
    const aba = opcoes.find((a) => abas.has(a));
    if (!aba) return null;
    return {
      onClick: () => {
        if (irParaAba) irParaAba(aba);
        else document.getElementById(`aba-obra-${aba}`)?.click();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    };
  };

  // ---------- contas ----------
  const indicadores = dadosDe(saudeSt);
  const saude = useMemo(() => (indicadores ? avaliarSaude(indicadores) : null), [indicadores]);
  const prazo = prazoEntrega(obraEcoSelecionada.data_previsao_fim, hoje);
  const faturamento = dadosDe(fatSt);
  const parcelas = dadosDe(parcSt);
  const recebimento = useMemo(
    () => (parcelas ? resumirRecebimento(parcelas, totalVendaGeral, hoje) : null),
    [parcelas, totalVendaGeral, hoje],
  );
  const rent = dadosDe(rentSt);
  // mesma conta da aba Rentabilidade e do Painel (calcularPanorama via calcularLinha)
  const margem = useMemo(() => {
    if (!rent) return null;
    // sem acesso a venda a base e 0: sem margem no ERP a linha sai "sem dado" e o bloco nao aparece
    const l = calcularLinha({ id: idObra, codigo: "", nome: "" }, rent.familias, totalVendaGeral ?? 0, rent.restritos);
    return l.semDado ? null : l;
  }, [rent, idObra, totalVendaGeral]);
  // verba tem a mesma regra de leitura da rentabilidade: sem familias visiveis = sem acesso
  const temAcessoCusto = !!rent && rent.familias.length > 0;
  const compras = useMemo(() => {
    const c = dadosDe(compSt);
    return c ? resumirCompras(c, hoje) : null;
  }, [compSt, hoje]);
  const verba = useMemo(() => {
    const v = dadosDe(verbaSt);
    return v ? familiasEmAlerta(v) : null;
  }, [verbaSt]);
  const cronograma = useMemo(
    () => resumirCronograma(cronogramaObra, obraEcoSelecionada.fase_atual, obraEcoSelecionada.data_previsao_fim, hoje),
    [cronogramaObra, obraEcoSelecionada.fase_atual, obraEcoSelecionada.data_previsao_fim, hoje],
  );
  const tarefas = useMemo(() => {
    const t = dadosDe(tarefasSt);
    return t ? resumirTarefas(t, hoje) : null;
  }, [tarefasSt, hoje]);
  const diario = dadosDe(diarioSt);
  const faseAtual = obraEcoSelecionada.fase_atual || "processo_inicial";

  // bloco de margem so aparece com acesso e numero; erro aparece (para tentar de novo)
  const mostrarMargem = rentSt.estado === "erro" || (rentSt.estado === "ok" && !!margem);
  const mostrarVerba = temAcessoCusto;

  const abrirRelatorio = (modo: ModoRelatorio) => {
    setMenuPdf(false);
    setRelatorio(modo);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800">Resumo da obra</h2>
        <div className="relative ml-auto" ref={caixaMenu}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuPdf}
            onClick={() => setMenuPdf((v) => !v)}
            className="px-3 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50 text-sm font-semibold flex items-center gap-1.5"
          >
            <FileText size={15} aria-hidden="true" /> Relatório de status (PDF)
          </button>
          {menuPdf && (
            <div role="menu" className="absolute right-0 mt-1 z-20 w-60 bg-white border rounded-lg shadow-lg overflow-hidden">
              <button
                type="button"
                role="menuitem"
                onClick={() => abrirRelatorio("interno")}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              >
                <span className="font-semibold block">Interno</span>
                <span className="text-xs text-slate-500">Inclui a margem, se você tem acesso</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => abrirRelatorio("cliente")}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-t"
              >
                <span className="font-semibold block">Para o cliente</span>
                <span className="text-xs text-slate-500">Sem margem, custos, verba ou compras</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Saude */}
        <Bloco titulo="Saúde da obra" icone={HeartPulse} estado={saudeSt.estado} onTentar={recarregarSaude}>
          {saude ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span
                  title={EXPLICACAO_SAUDE}
                  className={`inline-block px-3 py-1 rounded-full border text-sm font-black ${ESTILO_SAUDE[saude.geral]}`}
                >
                  {saude.rotulo}
                </span>
                {prazo && (
                  <span className={`text-xs font-semibold ${prazo.atrasada ? "text-red-700" : "text-slate-600"}`}>
                    Entrega {isoParaDataBR(obraEcoSelecionada.data_previsao_fim)} ({prazo.texto})
                  </span>
                )}
              </p>
              {saude.motivos.length > 0 ? (
                <ul className="mt-2 list-disc pl-5 text-slate-700 space-y-0.5">
                  {saude.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-600">Nada vencido nem vencendo nos próximos 7 dias.</p>
              )}
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Saúde por área">
                {AREAS_SAUDE.map((a) => (
                  <li
                    key={a.campo}
                    title={ROTULO_NIVEL[saude.areas[a.campo]]}
                    className={`text-xs px-2 py-0.5 rounded border font-semibold ${ESTILO_AREA[saude.areas[a.campo]]}`}
                  >
                    {a.nome}: {ROTULO_NIVEL[saude.areas[a.campo]].toLowerCase()}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Vazio>Sem dados de saúde para esta obra.</Vazio>
          )}
          {!saude && prazo && (
            <p className={`mt-2 text-xs font-semibold ${prazo.atrasada ? "text-red-700" : "text-slate-600"}`}>
              Entrega {isoParaDataBR(obraEcoSelecionada.data_previsao_fim)} ({prazo.texto})
            </p>
          )}
        </Bloco>

        {/* 2. Faturado x escopo */}
        <Bloco
          titulo="Faturado x escopo"
          icone={Receipt}
          estado={fatSt.estado}
          onTentar={recarregarFat}
          detalhe={detalhe("faturamento")}
        >
          {faturamento && !faturamento.semEscopo ? (
            <>
              <Linha rotulo="Escopo">
                {formatarMoeda(faturamento.escopo)}
              </Linha>
              <Linha rotulo="Faturado" classe="text-emerald-700">
                {formatarMoeda(faturamento.faturado)}
              </Linha>
              <Linha rotulo="A faturar" classe="text-amber-700">
                {formatarMoeda(faturamento.aFaturar)}
              </Linha>
              <div
                className="mt-3 h-2.5 bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-label="Percentual faturado do escopo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(faturamento.pct)}
              >
                <div className="h-full bg-petroleo" style={{ width: `${faturamento.pct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{formatarPct(faturamento.pct)} do escopo faturado</p>
            </>
          ) : (
            <Vazio>Escopo de faturamento não cadastrado.</Vazio>
          )}
        </Bloco>

        {/* 3. Recebimento */}
        <Bloco
          titulo="Recebimento"
          icone={DollarSign}
          estado={parcSt.estado}
          onTentar={recarregarParc}
          detalhe={detalhe("financeiro")}
        >
          {recebimento && (
            <>
              <Linha rotulo="Venda total">
                {totalVendaGeral === null ? <span title={TITULO_SEM_ACESSO_VALOR}>—</span> : formatarMoeda(totalVendaGeral)}
              </Linha>
              <Linha rotulo="Recebido" classe="text-emerald-700">
                {formatarMoeda(recebimento.recebido)}
              </Linha>
              <Linha rotulo="A receber" classe="text-amber-700">
                {recebimento.aReceber === null ? (
                  <span title={TITULO_SEM_ACESSO_VALOR}>—</span>
                ) : (
                  formatarMoeda(recebimento.aReceber)
                )}
              </Linha>
              <Linha rotulo="Vencido" classe={recebimento.vencido > 0 ? "text-red-700" : "text-slate-500"}>
                {recebimento.vencido > 0
                  ? `${formatarMoeda(recebimento.vencido)} (${recebimento.parcelasVencidas} parcela${recebimento.parcelasVencidas > 1 ? "s" : ""})`
                  : "nada vencido"}
              </Linha>
              <Linha rotulo="Próxima parcela">
                {recebimento.proxima ? (
                  <span title={recebimento.proxima.descricao}>
                    {isoParaDataBR(recebimento.proxima.data)} · {formatarMoeda(recebimento.proxima.valor)}
                  </span>
                ) : (
                  <span className="text-slate-500 font-normal">nenhuma programada</span>
                )}
              </Linha>
            </>
          )}
        </Bloco>

        {/* 4. Margem - so com acesso (o banco decide) */}
        {mostrarMargem && (
          <Bloco
            titulo="Margem prevista x atual"
            icone={TrendingUp}
            estado={rentSt.estado}
            onTentar={recarregarRent}
            detalhe={detalhe("rentabilidade")}
          >
            {margem && (
              <>
                <Linha rotulo="Prevista">
                  {formatarPct(margem.pctPrevista)}{" "}
                  <span className="font-normal text-slate-500">
                    ({formatarMoeda(margem.margemPrevista)})
                  </span>
                </Linha>
                <Linha rotulo="Atual" classe={margem.margemAtual < margem.margemPrevista ? "text-red-700" : "text-emerald-700"}>
                  {formatarPct(margem.pctAtual)}{" "}
                  <span className="font-normal text-slate-500">
                    ({formatarMoeda(margem.margemAtual)})
                  </span>
                </Linha>
                <Linha rotulo="Variação" classe={margem.variacaoPp < 0 ? "text-red-700" : "text-slate-700"}>
                  {formatarPp(margem.variacaoPp)}
                </Linha>
                <p className="text-xs text-slate-500 mt-2">
                  {margem.baseErp ? "Sobre a venda sem impostos (ERP)." : "Sobre o valor vendido (obra sem margem no ERP)."}
                </p>
              </>
            )}
          </Bloco>
        )}

        {/* 5. Compras */}
        <Bloco titulo="Compras de material" icone={ShoppingCart} estado={compSt.estado} onTentar={recarregarComp} detalhe={detalhe("compras")}>
          {compras && compras.abertas > 0 ? (
            <>
              <Linha rotulo="Em aberto">{compras.abertas}</Linha>
              <Linha rotulo="Entrega atrasada" classe={compras.atrasadas > 0 ? "text-red-700" : "text-slate-500"}>
                {compras.atrasadas}
              </Linha>
              <Linha rotulo="Sem pedido (em cotação)">{compras.semPedido}</Linha>
              <Linha rotulo="Aguardando entrega">{compras.aguardando}</Linha>
            </>
          ) : (
            <Vazio>Nenhuma compra de material em aberto.</Vazio>
          )}
        </Bloco>

        {/* 6. Verba - mesma regra de leitura da rentabilidade */}
        {mostrarVerba && (
          <Bloco
            titulo="Verba por família"
            icone={Wallet}
            estado={verbaSt.estado}
            onTentar={recarregarVerba}
            detalhe={detalhe("previsoes", "rentabilidade")}
          >
            {verba && verba.length > 0 ? (
              <>
                <p className="text-slate-700 mb-1.5">
                  {verba.length} família{verba.length > 1 ? "s" : ""} em alerta de verba
                </p>
                <ul className="space-y-1">
                  {verba.slice(0, 5).map((f) => (
                    <li key={f.codigo} className="flex justify-between gap-2">
                      <span className="font-semibold">{f.codigo}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border font-bold ${f.nivel === "atencao" ? "bg-amber-50 text-amber-700 border-amber-200" : f.nivel === "critico" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {f.rotulo}
                      </span>
                    </li>
                  ))}
                </ul>
                {verba.length > 5 && <p className="text-xs text-slate-500 mt-1">e mais {verba.length - 5}</p>}
              </>
            ) : (
              <Vazio>Nenhuma família em alerta de verba.</Vazio>
            )}
          </Bloco>
        )}

        {/* 7. Cronograma (dados do App.tsx, os mesmos da aba Cronograma) */}
        <Bloco titulo="Cronograma" icone={Calendar} estado="ok" detalhe={detalhe("cronograma")}>
          <Linha rotulo="Fase atual" classe="text-petroleo">
            {labelFase(faseAtual)}
          </Linha>
          <Linha rotulo="Próxima fase">
            {cronograma.proxima ? (
              <>
                {labelFase(cronograma.proxima.fase)}
                {cronograma.proxima.fimPrevisto && (
                  <span className="font-normal text-slate-500"> · até {isoParaDataBR(cronograma.proxima.fimPrevisto)}</span>
                )}
              </>
            ) : (
              <span className="text-slate-500 font-normal">—</span>
            )}
          </Linha>
          <Linha rotulo="Fases concluídas">
            {fasesConcluidas}/{cronogramaObra.length} ({percentualCronograma}%)
          </Linha>
          {cronograma.atrasadas.length > 0 ? (
            <div className="mt-2">
              <p className="text-red-700 font-semibold">
                {cronograma.atrasadas.length} fase{cronograma.atrasadas.length > 1 ? "s" : ""} atrasada
                {cronograma.atrasadas.length > 1 ? "s" : ""}:
              </p>
              <ul className="text-slate-700">
                {cronograma.atrasadas.map((f, i) => (
                  <li key={`${f.fase}-${i}`}>
                    {labelFase(f.fase)} - prazo {isoParaDataBR(f.fimPrevisto)} ({f.diasAtraso} {f.diasAtraso === 1 ? "dia" : "dias"})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            cronogramaObra.length > 0 && <p className="mt-2 text-slate-600">Nenhuma fase atrasada.</p>
          )}
        </Bloco>

        {/* 8. Diario e tarefas */}
        <Bloco
          titulo="Diário e tarefas"
          icone={ClipboardList}
          estado={diarioSt.estado === "erro" || tarefasSt.estado === "erro" ? "erro" : diarioSt.estado === "carregando" || tarefasSt.estado === "carregando" ? "carregando" : "ok"}
          onTentar={() => {
            if (diarioSt.estado === "erro") recarregarDiario();
            if (tarefasSt.estado === "erro") recarregarTarefas();
          }}
          detalhe={detalhe("diario_tarefas")}
        >
          {tarefas && (
            <p className="mb-2">
              <span className="font-bold">{tarefas.abertas}</span> tarefa{tarefas.abertas === 1 ? "" : "s"} aberta
              {tarefas.abertas === 1 ? "" : "s"}
              {" · "}
              <span className={tarefas.atrasadas > 0 ? "font-bold text-red-700" : "font-bold text-slate-500"}>
                {tarefas.atrasadas} atrasada{tarefas.atrasadas === 1 ? "" : "s"}
              </span>
            </p>
          )}
          {diario && diario.length > 0 ? (
            <ul className="space-y-2">
              {diario.map((d) => (
                <li key={d.id} className="border-l-2 border-petroleo/40 pl-2">
                  <p className="text-xs text-slate-500">
                    {d.data_registro ? isoParaDataBR(d.data_registro) : isoParaDataBR(d.created_at)}
                    {d.usuarios?.nome ? ` · ${d.usuarios.nome}` : ""}
                  </p>
                  <p className="text-slate-700 break-words">{resumirTexto(d.texto, 160)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio>Nenhuma anotação no diário.</Vazio>
          )}
        </Bloco>

        {/* o que a aba ja mostrava: descricao, observacoes e documentos */}
        <Bloco titulo="Descrição do projeto" icone={BookOpen} estado="ok" detalhe={detalhe("documentos")} className="md:col-span-2 xl:col-span-3">
          <p className="text-slate-700 whitespace-pre-wrap break-words">
            {obraEcoSelecionada.descricao || "Nenhum descritivo cadastrado para esta obra."}
          </p>
          {obraEcoSelecionada.observacoes && (
            <div className="mt-3 bg-slate-50 p-3 rounded-lg border text-slate-600 break-words">
              <strong>Observações:</strong>
              <br />
              {obraEcoSelecionada.observacoes}
            </div>
          )}
          <p className="mt-3 flex items-center gap-2 text-slate-600">
            <Activity size={15} className="text-petroleo" aria-hidden="true" />
            Documentos concluídos:{" "}
            <span className="font-bold text-slate-800">
              {documentosConcluidos}/{documentosProjeto.length} ({percentualDocumentos}%)
            </span>
          </p>
        </Bloco>
      </div>

      {relatorio && (
        <Suspense fallback={null}>
          <RelatorioStatusObra
            modo={relatorio}
            onTrocarModo={setRelatorio}
            onFechar={() => setRelatorio(null)}
            codigo={obraEcoSelecionada.codigo_externo || ""}
            nome={obraEcoSelecionada.nome || ""}
            gestor={obraEcoSelecionada.usuarios?.nome || ""}
            emitidoEm={hoje}
            saude={saude}
            dataEntrega={obraEcoSelecionada.data_previsao_fim ? obraEcoSelecionada.data_previsao_fim.slice(0, 10) : null}
            prazo={prazo}
            faturamento={faturamento}
            recebimento={recebimento}
            faseAtual={faseAtual}
            cronograma={cronograma}
            pendencias={principaisPendencias(saude?.motivos || [], tarefas?.listaAtrasadas || [])}
            diario={
              diario
                ? diario.map((d) => ({
                    id: d.id,
                    data: d.data_registro || (d.created_at ? d.created_at.slice(0, 10) : null),
                    autor: d.usuarios?.nome || "",
                    texto: resumirTexto(d.texto, 300),
                  }))
                : null
            }
            // margem so na versao interna (o componente tambem descarta no modo cliente)
            margem={relatorio === "interno" ? margem : null}
          />
        </Suspense>
      )}
    </div>
  );
}
