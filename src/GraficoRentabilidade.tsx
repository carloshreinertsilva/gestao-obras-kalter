import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarMoeda } from "./utils";
import type { ObraRentabilidadeFamilia } from "./types";

interface Props {
  familias: ObraRentabilidadeFamilia[];
}

// Paleta de status do design system (nunca reaproveitada de series categoricas):
// positivo = bom (verde), negativo = critico (vermelho).
const COR_POSITIVO = "#0ca30c";
const COR_NEGATIVO = "#d03b3b";
const RAIO = 4;

const formatarCompacto = (valor: number) => {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(valor / 1_000).toFixed(0)}K`;
  return String(Math.round(valor));
};

// Barra com canto arredondado so na ponta longe da linha de base (0) - reta
// encostando no zero, seguindo a especificacao de marca do design system.
const BarraDivergente = (props: any) => {
  const { x, width, positivo, fill } = props;
  // O recharts pode entregar height negativo pra barras abaixo da base (y ja fica no
  // topo do retangulo em ambos os casos) - normaliza antes de desenhar.
  let { y, height } = props;
  if (height < 0) {
    y += height;
    height = -height;
  }
  if (height <= 0) return null;
  const r = Math.min(RAIO, height, width / 2);
  const d = positivo
    ? `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`
    : `M${x},${y} L${x},${y + height - r} Q${x},${y + height} ${x + r},${y + height} L${x + width - r},${y + height} Q${x + width},${y + height} ${x + width},${y + height - r} L${x + width},${y} Z`;
  return <path d={d} fill={fill} />;
};

const TooltipPersonalizado = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  const positivo = item.valor >= 0;
  return (
    <div className="bg-white border rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-slate-500 font-semibold mb-1">{item.nomeCompleto}</p>
      <p className="flex items-center gap-1.5 font-bold text-slate-800">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: positivo ? COR_POSITIVO : COR_NEGATIVO }}
        />
        {formatarMoeda(item.valor)}
      </p>
    </div>
  );
};

export default function GraficoRentabilidade({ familias }: Props) {
  // A barra "GERAL" (resultado projetado da obra inteira) fica numa escala muito maior
  // que qualquer familia isolada - misturar no mesmo eixo linear esmaga a leitura das
  // familias. O valor geral ja aparece no card "Resultado Projetado" acima; aqui o
  // grafico fica so com as familias, na escala delas.
  const dados = familias.map((f) => ({
    nome: f.codigo_projeto || "",
    nomeCompleto: `${f.codigo_projeto} - ${f.descricao || ""}`,
    valor: Number(f.saldo_projetado || 0),
    geral: false,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Saldo Projetado por Família
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COR_POSITIVO }} />
              Dentro do orçamento
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COR_NEGATIVO }} />
              Acima do orçamento
            </span>
          </div>
        </div>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={dados} margin={{ top: 10, right: 10, left: 10, bottom: 10 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
              <XAxis
                dataKey="nome"
                tick={(props) => {
                  const { x, y, payload } = props;
                  // So a familia (depois do ultimo ponto) - "2098.100" -> "100" - senao
                  // o codigo completo nao cabe com ~37 familias na tela. O nome inteiro
                  // continua disponivel no tooltip ao passar o mouse.
                  const rotuloCurto = String(payload.value).split(".").pop();
                  return (
                    <text x={x} y={y} dy={10} textAnchor="middle" fontSize={11} fill="#898781">
                      {rotuloCurto}
                    </text>
                  );
                }}
                interval={0}
                height={28}
              />
              <YAxis
                tickFormatter={(v) => formatarCompacto(v)}
                tick={{ fontSize: 11, fill: "#898781" }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="#c3c2b7" />
              <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: "#f0efec" }} />
              <Bar dataKey="valor" maxBarSize={28} shape={(p: any) => <BarraDivergente {...p} positivo={p.payload.valor >= 0} />}>
                {dados.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.valor >= 0 ? COR_POSITIVO : COR_NEGATIVO}
                    fillOpacity={d.geral ? 1 : 0.85}
                    stroke={d.geral ? (d.valor >= 0 ? COR_POSITIVO : COR_NEGATIVO) : "none"}
                    strokeWidth={d.geral ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
