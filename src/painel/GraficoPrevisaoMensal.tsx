import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMoeda } from "../utils";

// Grafico da Previsao de faturamento e recebimento. Arquivo proprio para o recharts
// (a biblioteca mais pesada do app) ser baixado so depois do Painel aparecer.
export const COR_FATURAR = "#2A6377";
export const COR_RECEBER = "#D97706";

const eixoCompacto = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return String(v);
};

export default function GraficoPrevisaoMensal({
  dados,
  onClicarMes,
}: {
  dados: { chave: string; rotulo: string; faturar: number; receber: number }[];
  onClicarMes: (chave: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={dados}
        margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        onClick={(estado: any) => {
          // recharts 3 entrega o indice da coluna sob o mouse (activeIndex), nao mais o activePayload
          const indice = Number(estado?.activeIndex);
          const chave = Number.isInteger(indice) ? dados[indice]?.chave : undefined;
          if (chave) onClicarMes(chave);
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="rotulo" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={48} tickFormatter={eixoCompacto} />
        <Tooltip cursor={{ fill: "#f3f4f6" }} formatter={(valor: any, nome: any) => [formatarMoeda(valor), nome]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="faturar" name="A faturar" fill={COR_FATURAR} radius={[4, 4, 0, 0]} cursor="pointer" />
        <Bar dataKey="receber" name="A receber" fill={COR_RECEBER} radius={[4, 4, 0, 0]} cursor="pointer" />
      </BarChart>
    </ResponsiveContainer>
  );
}
