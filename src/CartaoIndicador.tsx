import type { ReactNode } from "react";

// Cartao de indicador (Painel, aba Faturamento): todos no mesmo cinza neutro, sem faixa colorida nem icone.
// A cor fica so para o que pede atencao: alerta = borda vermelha (ex.: valor vencido > 0).
export const CLASSE_VALOR = "text-2xl font-semibold text-slate-900 tabular-nums";
export const CLASSE_VALOR_VENCIDO = "text-2xl font-semibold text-red-700 tabular-nums";
export const CLASSE_NUMERO = "text-3xl font-semibold text-slate-900 tabular-nums";

export default function CartaoIndicador({
  rotulo,
  nota,
  alerta = false,
  children,
}: {
  rotulo: string;
  nota?: ReactNode;
  alerta?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`bg-white p-5 rounded-xl border ${alerta ? "border-red-300" : "border-slate-200"}`}>
      <p className="text-sm font-medium text-slate-500 mb-2">{rotulo}</p>
      {children}
      {nota && <p className="text-xs text-slate-500 mt-1">{nota}</p>}
    </div>
  );
}
