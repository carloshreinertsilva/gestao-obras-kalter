// Historico do processo (public.exportacao_processos_versoes, gravado pelo banco: aprovacoes com copia do conteudo, primeira
// edicao depois de aprovar, final gerado) e, quando houve alteracao depois da aprovacao, o que mudou desde a copia aprovada.
// A copia (jsonb grande) so e lida quando precisa comparar.
import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "../supabase";
import { NOME_EVENTO, diferencas, type EventoHistorico } from "./historico";
import type { Aprovacao, Processo } from "./tipos";
import { Botao, dataBR } from "./ui";

const quando = (iso: string) => `${dataBR(iso)} ${new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
const MOSTRAR = 30;

export function HistoricoProcesso({ idObra, proc, aprovado, aprovacao }: { idObra: string; proc: Processo; aprovado: boolean; aprovacao: Aprovacao | null }) {
  const [eventos, setEventos] = useState<EventoHistorico[] | null>(null);
  const [copia, setCopia] = useState<{ id: number; dados: Processo | null } | null>(null);
  const [todas, setTodas] = useState(false);
  const alteradoDepois = Boolean(aprovacao) && !aprovado;

  useEffect(() => {
    let vivo = true;
    void supabase
      .from("exportacao_processos_versoes")
      .select("id, evento, nome_por, em, obs")
      .eq("id_obra", idObra)
      .order("em", { ascending: false })
      .limit(30)
      .then(({ data }) => vivo && setEventos((data ?? []) as EventoHistorico[]));
    return () => {
      vivo = false;
    };
  }, [idObra, aprovacao?.em, aprovado]);

  const ultimaAprovacao = eventos?.find((e) => e.evento === "aprovado") ?? null;
  useEffect(() => {
    if (!alteradoDepois || !ultimaAprovacao || copia?.id === ultimaAprovacao.id) return;
    let vivo = true;
    void supabase
      .from("exportacao_processos_versoes")
      .select("dados")
      .eq("id", ultimaAprovacao.id)
      .maybeSingle()
      .then(({ data }) => vivo && setCopia({ id: ultimaAprovacao.id, dados: (data?.dados as Processo | null) ?? null }));
    return () => {
      vivo = false;
    };
  }, [alteradoDepois, ultimaAprovacao, copia?.id]);

  const mudancas = useMemo(() => (alteradoDepois && copia?.dados ? diferencas(copia.dados, proc) : null), [alteradoDepois, copia, proc]);

  if (!eventos?.length) return null;
  const lista = mudancas && !todas ? mudancas.slice(0, MOSTRAR) : mudancas;
  return (
    <div className="space-y-3">
      {alteradoDepois && ultimaAprovacao && (
        <section className="rounded-xl border border-amber-200 bg-white p-4" aria-label="O que mudou desde a aprovação">
          <h4 className="text-sm font-bold text-slate-800">O que mudou desde a aprovação</h4>
          <p className="text-xs text-slate-500 mt-0.5 mb-3">
            Comparando com o que {ultimaAprovacao.nome_por || "alguém"} aprovou em {quando(ultimaAprovacao.em)}.
          </p>
          {copia?.id !== ultimaAprovacao.id ? (
            <p className="text-xs text-slate-400">Carregando a cópia aprovada…</p>
          ) : !copia.dados ? (
            <p className="text-sm text-slate-600">Essa aprovação foi registrada antes do histórico existir e não guardou a cópia do conteúdo: não dá para comparar.</p>
          ) : !mudancas?.length ? (
            <p className="text-sm text-slate-600">Nenhuma diferença nos campos dos documentos (só marcações internas mudaram). Aprove de novo para liberar.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-1.5 border-b font-semibold">Onde</th>
                      <th className="px-2 py-1.5 border-b font-semibold">Campo</th>
                      <th className="px-2 py-1.5 border-b font-semibold">Aprovado</th>
                      <th className="px-2 py-1.5 border-b font-semibold">Agora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista!.map((d, i) => (
                      <tr key={i} className="border-b border-slate-100 align-top">
                        <td className="px-2 py-1.5 text-slate-600">{d.grupo}</td>
                        <td className="px-2 py-1.5">{d.campo}</td>
                        <td className="px-2 py-1.5 text-slate-500 line-through decoration-slate-300 break-words">{d.antes}</td>
                        <td className="px-2 py-1.5 font-semibold text-slate-800 break-words">{d.depois}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mudancas.length > MOSTRAR && (
                <div className="mt-2">
                  <Botao tamanho="pequeno" onClick={() => setTodas((t) => !t)}>
                    {todas ? "Mostrar menos" : `Mostrar todas as ${mudancas.length} alterações`}
                  </Botao>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <details className="rounded-xl border border-slate-200 bg-white p-4 group">
        <summary className="cursor-pointer text-sm font-bold text-slate-700 flex items-center gap-2">
          <History size={15} className="text-slate-400" /> Histórico do processo ({eventos.length})
        </summary>
        <ol className="mt-3 space-y-2">
          {eventos.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3 text-sm">
              <span className="text-xs text-slate-500 tabular-nums w-28 shrink-0">{quando(e.em)}</span>
              <span className="flex-1 min-w-0">
                <b className="text-slate-700">{e.nome_por || "—"}</b> · {NOME_EVENTO[e.evento] ?? e.evento}
                {e.obs && <span className="block text-xs text-slate-500">{e.obs}</span>}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
