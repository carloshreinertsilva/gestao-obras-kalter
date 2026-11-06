import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Info, OctagonAlert } from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura } from "./utils";

// Alertas da obra (06/11/2026, item 39): gravados pelo robo em public.obra_alertas (antes eram texto nas observacoes).
// Mostra os abertos no topo do painel da obra; o responsavel tambem e avisado pelo sino quando um abre.
interface Alerta {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  gravidade: "info" | "atencao" | "critico";
  criado_em: string;
}

const ESTILO = {
  critico: { classe: "bg-red-50 border-red-200 text-red-800", icone: OctagonAlert, rotulo: "Crítico" },
  atencao: { classe: "bg-amber-50 border-amber-200 text-amber-900", icone: AlertTriangle, rotulo: "Atenção" },
  info: { classe: "bg-sky-50 border-sky-200 text-sky-900", icone: Info, rotulo: "Info" },
} as const;

export function AlertasObra({ idObra }: { idObra: string }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("obra_alertas")
      .select("id, tipo, titulo, mensagem, gravidade, criado_em")
      .eq("id_obra", idObra)
      .is("resolvido_em", null)
      .order("criado_em", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (vivo && !error) setAlertas((data as Alerta[]) || []);
      });
    return () => {
      vivo = false;
    };
  }, [idObra]);

  if (!alertas.length) return null;
  const criticos = alertas.filter((a) => a.gravidade === "critico").length;
  return (
    <section aria-label="Alertas da obra" className="mb-4 bg-white border rounded-xl shadow-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-700"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={16} className={criticos ? "text-red-600" : "text-amber-600"} aria-hidden="true" />
          {alertas.length} alerta{alertas.length > 1 ? "s" : ""} do robô nesta obra
          {criticos > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">{criticos} crítico(s)</span>}
        </span>
        <ChevronDown size={16} className={`transition-transform ${aberto ? "" : "-rotate-90"}`} aria-hidden="true" />
      </button>
      {aberto && (
        <ul className="px-4 pb-3 space-y-2">
          {alertas.map((a) => {
            const e = ESTILO[a.gravidade] || ESTILO.atencao;
            const I = e.icone;
            return (
              <li key={a.id} className={`border rounded-lg px-3 py-2 text-sm flex gap-2 ${e.classe}`}>
                <I size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="font-semibold">
                    {e.rotulo}: {a.titulo}
                  </span>
                  <span className="block whitespace-pre-wrap">{a.mensagem}</span>
                  <span className="block text-xs opacity-80 mt-0.5">desde {formatarDataSegura(a.criado_em)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
