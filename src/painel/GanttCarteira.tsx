import { lazy, Suspense, useEffect, useMemo, useState, type JSX } from "react";
import { CalendarRange, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "../supabase";
import { labelFase } from "../utils";
import { hojeLocalISO } from "../saudeObra";
import { linhaDeObra, type FaseCronograma } from "../calculoGantt";
import { chaveIdsObras } from "./calculoPrevisaoMensal";

const GraficoGantt = lazy(() => import("../GraficoGantt"));

// Cronograma da carteira no Painel (Pacote 4 / B5): uma linha por obra, do inicio da primeira fase ate a
// entrega prevista, com o fim previsto de cada fase marcado e a fase atual destacada. Clicar abre a obra.
// Comeca recolhido: so busca os dados quando a pessoa abre (nao pesa o Painel).
export interface ObraPainel {
  id: string;
  codigo: string;
  nome: string;
}

interface ObraDatas {
  id: string;
  data_inicio: string | null;
  data_previsao_fim: string | null;
  fase_atual: string | null;
}

interface Dados {
  obras: ObraDatas[];
  fases: (FaseCronograma & { id_obra: string })[];
}

// a API devolve no maximo 1000 linhas por consulta (16 obras x 8 fases cabe, mas a carteira pode crescer)
async function buscarTodas(tabela: string, colunas: string, campo: string, ids: string[]): Promise<any[]> {
  const PAGINA = 1000;
  const todas: any[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await (supabase as any)
      .from(tabela)
      .select(colunas)
      .in(campo, ids)
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}

export default function GanttCarteira({
  obras,
  onAbrirObra,
}: {
  obras: ObraPainel[];
  onAbrirObra: (idObra: string) => void;
}): JSX.Element | null {
  const chaveObras = chaveIdsObras(obras);
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  // depende da chave (texto), nao do array: o Painel re-renderiza a cada 60 s com um array novo
  useEffect(() => {
    if (!aberto) return;
    const ids = chaveObras ? chaveObras.split(",") : [];
    if (ids.length === 0) return;
    let cancelado = false;
    setErro(false);
    setDados(null);
    Promise.all([
      buscarTodas("obras", "id, data_inicio, data_previsao_fim, fase_atual", "id", ids),
      buscarTodas(
        "cronograma_obra",
        "id, id_obra, fase, ordem, status, inicio_previsto, fim_previsto, inicio_real, fim_real",
        "id_obra",
        ids,
      ),
    ])
      .then(([obrasDatas, fases]) => {
        if (!cancelado) setDados({ obras: obrasDatas, fases });
      })
      .catch((e) => {
        console.error("Cronograma da carteira:", e);
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
  }, [aberto, chaveObras, tentativa]);

  const hojeISO = hojeLocalISO();
  const linhas = useMemo(() => {
    if (!dados) return null;
    const datas = new Map(dados.obras.map((o) => [o.id, o]));
    const fasesPorObra = new Map<string, FaseCronograma[]>();
    for (const f of dados.fases) {
      const lista = fasesPorObra.get(f.id_obra) || [];
      lista.push(f);
      fasesPorObra.set(f.id_obra, lista);
    }
    // mesma ordem do Painel
    return obras.map((o) =>
      linhaDeObra(
        { ...o, ...(datas.get(o.id) || {}), id: o.id },
        fasesPorObra.get(o.id) || [],
        hojeISO,
        labelFase,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, chaveObras, hojeISO]);

  if (obras.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 min-w-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="font-bold text-slate-800 flex items-center gap-2">
          <CalendarRange size={18} className="text-petroleo" aria-hidden="true" />
          Cronograma da carteira
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-petroleo">
          {aberto ? "Esconder" : "Ver cronograma da carteira"}
          {aberto ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </span>
      </button>

      {aberto && (
        <div className="mt-4">
          {erro ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <span>Não foi possível carregar o cronograma da carteira.</span>
              <button
                type="button"
                onClick={() => setTentativa((t) => t + 1)}
                className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
              >
                <RefreshCw size={14} aria-hidden="true" /> Tentar de novo
              </button>
            </div>
          ) : !linhas ? (
            <div aria-busy="true">
              <span className="sr-only">Carregando o cronograma da carteira...</span>
              <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <Suspense fallback={<div className="h-64 bg-slate-100 rounded-lg animate-pulse" />}>
              <GraficoGantt
                linhas={linhas}
                hojeISO={hojeISO}
                titulo="Cronograma da carteira"
                nomePrevisto="obra prevista"
                temRealizado={false}
                onClicarLinha={onAbrirObra}
                rotuloClicar={(l) => `Abrir a obra ${l.rotulo}${l.subtitulo ? ` - ${l.subtitulo}` : ""}`}
                legendaExtra={
                  <>
                    <li className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rotate-45 inline-block bg-slate-500" aria-hidden="true" />
                      Fim previsto de cada fase
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-5 h-2.5 rounded-sm inline-block bg-slate-500 ring-2 ring-white outline outline-1 outline-slate-300" aria-hidden="true" />
                      Fase atual
                    </li>
                  </>
                }
              />
              <p className="text-xs text-slate-500 mt-2">
                Cada barra vai do início previsto da primeira fase até a entrega prevista da obra. A cor mostra a situação:
                atrasada quando a entrega ou alguma fase passou do prazo sem terminar. Clique numa obra para abrir.
              </p>
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
}
