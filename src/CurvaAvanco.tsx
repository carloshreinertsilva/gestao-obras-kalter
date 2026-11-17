import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarPercentual, type CurvaAvanco as DadosCurva, type PontoCurva } from "./calculoAvanco";

// Curva de avanco fisico x financeiro (Pacote 4 / B12). Carregada de forma preguicosa pela aba Cronograma
// (recharts so baixa quando a curva aparece). As contas ficam em calculoAvanco.ts.
// Cada serie tem cor E traco proprios (cheio / tracejado / pontilhado) - nunca so a cor.

export const SERIES = [
  { chave: "fisico", rotulo: "Avanço físico informado", cor: "#2A6377", traco: undefined, largura: 3 },
  { chave: "faturado", rotulo: "% faturado acumulado", cor: "#c2410c", traco: "6 4", largura: 2 },
  { chave: "recebido", rotulo: "% recebido acumulado", cor: "#7c3aed", traco: "2 3", largura: 2 },
] as const;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// eixo de tempo em milissegundos UTC (so para posicionar; os textos saem do texto AAAA-MM-DD)
const paraTempo = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const mesDoTempo = (t: number) => {
  const d = new Date(t);
  return `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
};

function TooltipCurva({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: PontoCurva = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="text-slate-500 font-semibold mb-1">{dataBR(p.data)}</p>
      {SERIES.map((s) => (
        <p key={s.chave} className="flex items-center gap-1.5 text-slate-700">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.cor }} />
          {s.rotulo}: <strong>{formatarPercentual(p[s.chave])}</strong>
        </p>
      ))}
    </div>
  );
}

export default function CurvaAvanco({ curva }: { curva: DadosCurva }) {
  const dados = curva.pontos.map((p) => ({ ...p, t: paraTempo(p.data) }));
  const series = SERIES.filter(
    (s) => (s.chave === "fisico" && curva.temFisico) || (s.chave === "faturado" && curva.temFaturado) || (s.chave === "recebido" && curva.temRecebido),
  );
  // eixo unico em %: 0 a 100 (ou ate o maior valor, arredondado para cima, quando algo passa de 100%)
  const topo = curva.maximo > 100 ? Math.ceil(curva.maximo / 10) * 10 : 100;
  const unicoPonto = dados.length === 1;

  return (
    <div className="min-w-0">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mb-2" aria-label="Legenda da curva">
        {SERIES.map((s) => {
          const presente = series.includes(s);
          return (
            <li key={s.chave} className={`flex items-center gap-1.5 ${presente ? "" : "opacity-50"}`}>
              <svg width="24" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="24" y2="4" stroke={s.cor} strokeWidth={s.largura} strokeDasharray={s.traco} />
              </svg>
              {s.rotulo}
              {!presente && " (sem dados)"}
            </li>
          );
        })}
      </ul>

      <div className="h-64 md:h-72 w-full min-w-0" aria-hidden="true">
        <ResponsiveContainer>
          <LineChart data={dados} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={unicoPonto ? [dados[0].t - 15 * 86400000, dados[0].t + 15 * 86400000] : ["dataMin", "dataMax"]}
              tickFormatter={mesDoTempo}
              tick={{ fontSize: 11, fill: "#898781" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, topo]}
              ticks={topo === 100 ? [0, 25, 50, 75, 100] : undefined}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#898781" }}
              width={44}
              axisLine={false}
              tickLine={false}
            />
            {topo > 100 && <ReferenceLine y={100} stroke="#c3c2b7" />}
            <Tooltip content={<TooltipCurva />} />
            {series.map((s) => (
              <Line
                key={s.chave}
                dataKey={s.chave}
                name={s.rotulo}
                type="stepAfter"
                stroke={s.cor}
                strokeWidth={s.largura}
                strokeDasharray={s.traco}
                connectNulls={false}
                isAnimationActive={false}
                // fisico: ponto so nas datas informadas pelo gestor
                dot={
                  s.chave === "fisico"
                    ? (p: any) =>
                        p.payload?.fisicoInformado ? (
                          <circle key={`d${p.index}`} cx={p.cx} cy={p.cy} r={4} fill="#fff" stroke={s.cor} strokeWidth={2} />
                        ) : (
                          <g key={`d${p.index}`} />
                        )
                    : unicoPonto
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-[#2A6377] font-semibold text-xs">Ver os valores em tabela</summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <caption className="sr-only">Avanço físico informado, percentual faturado e percentual recebido acumulados por data</caption>
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th scope="col" className="py-1.5 pr-2 font-semibold">Data</th>
                {SERIES.map((s) => (
                  <th key={s.chave} scope="col" className="py-1.5 px-2 font-semibold text-right">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {curva.pontos.map((p) => (
                <tr key={p.data} className="border-b border-slate-100">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-slate-700 whitespace-nowrap">
                    {dataBR(p.data)}
                    {p.fisicoInformado && <span className="sr-only"> (avanço informado nesta data)</span>}
                  </th>
                  {SERIES.map((s) => (
                    <td key={s.chave} className={`py-1.5 px-2 text-right whitespace-nowrap ${s.chave === "fisico" && p.fisicoInformado ? "font-bold" : ""}`}>
                      {formatarPercentual(p[s.chave])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
