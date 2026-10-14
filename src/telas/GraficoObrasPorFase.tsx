import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Grafico "Obras por Fase" do Dashboard. Fica num arquivo proprio para o recharts
// (a biblioteca mais pesada do app) ser baixado so depois da tela inicial aparecer.
export default function GraficoObrasPorFase({ dados }: { dados: { nome: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey="total" name="Obras" fill="#2A6377" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
