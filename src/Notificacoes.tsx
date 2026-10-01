import {
  Activity,
  AlertTriangle,
  Bell,
  CheckSquare,
  DollarSign,
  HardHat,
  MessageSquare,
  Receipt,
} from "lucide-react";
import type { Notificacao } from "./types";

const iconePorTipo: Record<string, { Icone: any; cor: string }> = {
  tarefa_atribuida: { Icone: CheckSquare, cor: "text-blue-600 bg-blue-50" },
  tarefa_comentario: { Icone: MessageSquare, cor: "text-indigo-600 bg-indigo-50" },
  obra_nova: { Icone: HardHat, cor: "text-emerald-600 bg-emerald-50" },
  fase_alterada: { Icone: Activity, cor: "text-[#2A6377] bg-[#2A6377]/10" },
  ocorrencia_nova: { Icone: AlertTriangle, cor: "text-amber-600 bg-amber-50" },
  nf_nova: { Icone: Receipt, cor: "text-violet-600 bg-violet-50" },
  recebimento_novo: { Icone: DollarSign, cor: "text-green-600 bg-green-50" },
};

export const tempoRelativo = (iso: string) => {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const horas = Math.floor(diffMin / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export function ItemNotificacao({
  notificacao,
  onClick,
}: {
  notificacao: Notificacao;
  onClick: () => void;
}) {
  const { Icone, cor } = iconePorTipo[notificacao.tipo] || {
    Icone: Bell,
    cor: "text-slate-500 bg-slate-100",
  };
  const naoLida = !notificacao.lida_em;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex gap-3 p-3 rounded-xl border transition hover:border-[#2A6377]/40 ${naoLida ? "bg-white border-[#2A6377]/30" : "bg-white/60 border-slate-200"}`}
    >
      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cor}`}>
        <Icone size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm leading-snug ${naoLida ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}
        >
          {notificacao.titulo}
        </span>
        {notificacao.detalhe && (
          <span className="block text-xs text-slate-500 mt-0.5 break-words line-clamp-2">
            {notificacao.detalhe}
          </span>
        )}
        <span className="block text-[11px] text-slate-400 mt-1">
          {tempoRelativo(notificacao.created_at)}
        </span>
      </span>
      {naoLida && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#2A6377]" />}
    </button>
  );
}
