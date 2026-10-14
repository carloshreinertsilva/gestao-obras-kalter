import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "./supabase";
import { formatarMoeda } from "./utils";

// Evolucao mensal da rentabilidade da obra: uma foto por mes (tirada pelo robo no 1o dia,
// tabela obra_rentabilidade_historico) + o ponto "Hoje" com o valor atual da tela.
interface Foto {
  competencia: string;
  rentabilidade_atual_pct: number | null;
  margem_atual: number;
  resultado_projetado: number;
}

interface Ponto {
  rotulo: string;
  pct: number;
  margem: number;
  resultado: number;
}

const COR_LINHA = "#2A6377";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function HistoricoRentabilidade({
  idObra,
  atualPct,
  margemAtual,
  resultadoAtual,
  previstaPct,
}: {
  idObra: string;
  atualPct: number;
  margemAtual: number;
  resultadoAtual: number;
  previstaPct: number;
}) {
  const [fotos, setFotos] = useState<Foto[] | null>(null);

  useEffect(() => {
    let ativo = true;
    setFotos(null);
    supabase
      .from("obra_rentabilidade_historico")
      .select("competencia, rentabilidade_atual_pct, margem_atual, resultado_projetado")
      .eq("id_obra", idObra)
      .order("competencia")
      .then(({ data }) => {
        if (ativo) setFotos((data as Foto[]) || []);
      });
    return () => {
      ativo = false;
    };
  }, [idObra]);

  if (fotos === null) return null;

  const pontos: Ponto[] = [
    ...fotos
      .filter((f) => f.rentabilidade_atual_pct !== null)
      .map((f) => {
        const [a, m] = f.competencia.split("-");
        return {
          rotulo: `${MESES[Number(m) - 1]}/${a.slice(2)}`,
          pct: Number(f.rentabilidade_atual_pct),
          margem: Number(f.margem_atual),
          resultado: Number(f.resultado_projetado),
        };
      }),
    { rotulo: "Hoje", pct: atualPct, margem: margemAtual, resultado: resultadoAtual },
  ];
  const valores = [...pontos.map((p) => p.pct), previstaPct];
  const min = Math.floor(Math.min(...valores) - 2);
  const max = Math.ceil(Math.max(...valores) + 2);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border">
      <p className="text-xs text-slate-400 font-bold uppercase">Evolução da rentabilidade</p>
      <p className="text-[11px] text-slate-400 mb-3">
        Rentabilidade atual no início de cada mês e hoje. A linha tracejada é a prevista no orçamento ({pct(previstaPct)}).
        {fotos.length === 0 && " O histórico começa a ser guardado a partir deste mês."}
      </p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis
              domain={[min, max]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <ReferenceLine
              y={previstaPct}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: "Prevista", position: "insideTopRight", fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ stroke: "#cbd5e1" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Ponto;
                return (
                  <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-xs">
                    <p className="font-bold text-slate-700 mb-1">{p.rotulo}</p>
                    <p className="text-slate-700">
                      Rentabilidade: <b>{pct(p.pct)}</b>
                    </p>
                    <p className="text-slate-500">Margem: {formatarMoeda(p.margem)}</p>
                    <p className="text-slate-500">Resultado projetado: {formatarMoeda(p.resultado)}</p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="pct"
              stroke={COR_LINHA}
              strokeWidth={2}
              dot={{ r: 4, fill: COR_LINHA, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: COR_LINHA, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
