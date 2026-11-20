import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "../supabase";
import { dataHojeISO, formatarMoeda } from "../utils";
import { linhaClicavel } from "../teclado";
import {
  calcularPrevisaoMensal,
  chaveIdsObras,
  type BaldePrevisao,
  type FamiliaFaturamentoLinha,
  type ParcelaClienteLinha,
  type PrevisaoFaturamentoLinha,
  type RealizadoFaturamentoLinha,
} from "./calculoPrevisaoMensal";

const GraficoPrevisaoMensal = lazy(() => import("./GraficoPrevisaoMensal"));

// Previsao de faturamento e recebimento por mes, somando as obras do Painel (item B2).
// Responde "quanto faturo e recebo em dezembro?". A conta fica em calculoPrevisaoMensal.ts.
export interface ObraPainel {
  id: string;
  codigo: string;
  nome: string;
}

interface Dados {
  previsoes: PrevisaoFaturamentoLinha[];
  realizados: RealizadoFaturamentoLinha[];
  familias: FamiliaFaturamentoLinha[];
  parcelas: ParcelaClienteLinha[];
}

// a API devolve no maximo 1000 linhas por consulta: pagina para nao cortar obra grande
async function buscarTodas(tabela: string, colunas: string, ids: string[]): Promise<any[]> {
  const PAGINA = 1000;
  const todas: any[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await (supabase as any)
      .from(tabela)
      .select(colunas)
      .in("id_obra", ids)
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}

export default function PrevisaoMensal({
  obras,
  onAbrirObra,
}: {
  obras: ObraPainel[];
  onAbrirObra: (idObra: string) => void;
}) {
  const chaveObras = chaveIdsObras(obras);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [quantidadeMeses, setQuantidadeMeses] = useState<6 | 12>(6);
  const [baldeAberto, setBaldeAberto] = useState<string | null>(null);

  // depende da chave (texto), nao do array: o Painel re-renderiza a cada 60 s com um array novo
  useEffect(() => {
    const ids = chaveObras ? chaveObras.split(",") : [];
    if (ids.length === 0) return;
    let cancelado = false;
    setErro(false);
    setDados(null);
    Promise.all([
      buscarTodas("obra_faturamento_previsoes", "id, id_obra, id_obra_faturamento_familia, grupo_faturamento, competencia, valor_previsto", ids),
      buscarTodas("obra_faturamento_realizados", "id, id_obra, id_obra_faturamento_familia, grupo_faturamento, valor_realizado", ids),
      buscarTodas("obra_faturamento_familias", "id, id_obra, valor_total_escopo", ids),
      buscarTodas("parcelas_cliente", "id, id_obra, data_prevista, valor_previsto, valor_realizado, status", ids),
    ])
      .then(([previsoes, realizados, familias, parcelas]) => {
        if (!cancelado) setDados({ previsoes, realizados, familias, parcelas });
      })
      .catch((e) => {
        console.error("Previsão mensal:", e);
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
  }, [chaveObras, tentativa]);

  const resultado = useMemo(() => {
    if (!dados || !chaveObras) return null;
    return calcularPrevisaoMensal({
      idsObras: chaveObras.split(","),
      ...dados,
      hojeISO: dataHojeISO(),
      quantidadeMeses,
    });
  }, [dados, chaveObras, quantidadeMeses]);

  const obraPorId = useMemo(() => new Map(obras.map((o) => [o.id, o])), [obras]);
  const alternarBalde = useCallback((chave: string) => setBaldeAberto((atual) => (atual === chave ? null : chave)), []);

  if (obras.length === 0) return null;

  const cabecalho = (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <CalendarRange size={18} className="text-petroleo" aria-hidden="true" />
        Previsão de faturamento e recebimento
      </h3>
      {resultado && !resultado.vazio && (
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs" role="group" aria-label="Quantidade de meses">
          {([6, 12] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuantidadeMeses(q)}
              aria-pressed={quantidadeMeses === q}
              className={`px-3 py-1.5 font-semibold ${quantidadeMeses === q ? "bg-petroleo text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {q} meses
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (erro) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
        {cabecalho}
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          <span>Não foi possível carregar a previsão.</span>
          <button
            type="button"
            onClick={() => setTentativa((t) => t + 1)}
            className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
          >
            <RefreshCw size={14} aria-hidden="true" /> Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!resultado) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5" aria-busy="true">
        {cabecalho}
        <span className="sr-only">Carregando a previsão...</span>
        <div className="h-56 bg-slate-100 rounded-lg animate-pulse mb-4" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (resultado.vazio) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
        {cabecalho}
        <p className="text-sm text-slate-500">Nenhuma previsão cadastrada.</p>
      </div>
    );
  }

  const linhasTabela: BaldePrevisao[] = [
    ...(resultado.vencido.faturar || resultado.vencido.receber ? [resultado.vencido] : []),
    ...resultado.meses,
    ...(resultado.depois.faturar || resultado.depois.receber ? [resultado.depois] : []),
    ...(resultado.semData.faturar || resultado.semData.receber ? [resultado.semData] : []),
  ];
  const dadosGrafico = resultado.meses.map((m) => ({ chave: m.chave, rotulo: m.rotulo, faturar: m.faturar, receber: m.receber }));

  const corDoTipo = (b: BaldePrevisao) =>
    b.tipo === "vencido" ? "text-red-700" : b.tipo === "mes" ? "text-slate-800" : "text-slate-600";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 min-w-0">
      {cabecalho}

      <div className="h-56 md:h-64 w-full min-w-0" aria-hidden="true">
        <Suspense fallback={<div className="h-full bg-slate-100 rounded-lg animate-pulse" />}>
          <GraficoPrevisaoMensal dados={dadosGrafico} onClicarMes={(chave) => setBaldeAberto(chave)} />
        </Suspense>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Previsão de faturamento e recebimento por mês. Clique num mês para ver as obras.
          </caption>
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
              <th scope="col" className="py-2 pr-2 font-semibold">Mês</th>
              <th scope="col" className="py-2 px-2 font-semibold text-right">A faturar</th>
              <th scope="col" className="py-2 pl-2 font-semibold text-right">A receber</th>
            </tr>
          </thead>
          <tbody>
            {linhasTabela.map((b) => {
              const aberto = baldeAberto === b.chave;
              const temObras = b.porObra.length > 0;
              return (
                <LinhaBalde
                  key={b.chave}
                  balde={b}
                  aberto={aberto}
                  temObras={temObras}
                  cor={corDoTipo(b)}
                  onAlternar={() => alternarBalde(b.chave)}
                  obraPorId={obraPorId}
                  onAbrirObra={onAbrirObra}
                />
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-bold text-slate-800">
              <th scope="row" className="py-2 pr-2 text-left">Total</th>
              <td className="py-2 px-2 text-right whitespace-nowrap">{formatarMoeda(resultado.totalFaturar)}</td>
              <td className="py-2 pl-2 text-right whitespace-nowrap">{formatarMoeda(resultado.totalReceber)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        A faturar: previsão de entrega dos itens do pedido ainda sem nota fiscal. A receber: saldo das parcelas do cliente.
        Vencido: faturamento de meses anteriores ainda não emitido e parcelas com data já passada.
      </p>
    </div>
  );
}

function LinhaBalde({
  balde,
  aberto,
  temObras,
  cor,
  onAlternar,
  obraPorId,
  onAbrirObra,
}: {
  balde: BaldePrevisao;
  aberto: boolean;
  temObras: boolean;
  cor: string;
  onAlternar: () => void;
  obraPorId: Map<string, ObraPainel>;
  onAbrirObra: (idObra: string) => void;
}) {
  return (
    <>
      <tr className={`border-b border-slate-100 ${aberto ? "bg-slate-50" : ""}`}>
        <th scope="row" className={`py-2 pr-2 text-left font-semibold ${cor}`}>
          {temObras ? (
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={aberto}
              className="inline-flex items-center gap-1 hover:underline text-left"
              title={aberto ? "Esconder as obras" : "Ver as obras deste mês"}
            >
              {aberto ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
              {balde.rotulo}
            </button>
          ) : (
            <span className="pl-[18px]">{balde.rotulo}</span>
          )}
        </th>
        <td className={`py-2 px-2 text-right whitespace-nowrap ${cor}`}>{formatarMoeda(balde.faturar)}</td>
        <td className={`py-2 pl-2 text-right whitespace-nowrap ${cor}`}>{formatarMoeda(balde.receber)}</td>
      </tr>
      {aberto &&
        balde.porObra.map((v) => {
          const obra = obraPorId.get(v.idObra);
          return (
            <tr
              key={v.idObra}
              {...linhaClicavel(() => onAbrirObra(v.idObra))}
              className="border-b border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs"
              title="Abrir a obra"
            >
              <td className="py-1.5 pr-2 pl-5 text-slate-700">
                <span className="font-semibold">{obra?.codigo || "—"}</span>
                <span className="block text-slate-500 truncate max-w-[9rem] sm:max-w-xs">{obra?.nome || ""}</span>
              </td>
              <td className="py-1.5 px-2 text-right whitespace-nowrap text-slate-700">{formatarMoeda(v.faturar)}</td>
              <td className="py-1.5 pl-2 text-right whitespace-nowrap text-slate-700">{formatarMoeda(v.receber)}</td>
            </tr>
          );
        })}
    </>
  );
}
