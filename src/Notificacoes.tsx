import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  CheckSquare,
  DollarSign,
  HardHat,
  MessageSquare,
  Receipt,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notificacao } from "./types";
import { ativarPush, desativarPush, estadoPush, type EstadoPush } from "./push";

const iconePorTipo: Record<string, { Icone: any; cor: string }> = {
  tarefa_atribuida: { Icone: CheckSquare, cor: "text-blue-600 bg-blue-50" },
  tarefa_comentario: { Icone: MessageSquare, cor: "text-indigo-600 bg-indigo-50" },
  obra_nova: { Icone: HardHat, cor: "text-emerald-600 bg-emerald-50" },
  fase_alterada: { Icone: Activity, cor: "text-[#2A6377] bg-[#2A6377]/10" },
  ocorrencia_nova: { Icone: AlertTriangle, cor: "text-amber-600 bg-amber-50" },
  nf_nova: { Icone: Receipt, cor: "text-violet-600 bg-violet-50" },
  recebimento_novo: { Icone: DollarSign, cor: "text-green-600 bg-green-50" },
  previsao_aprovacao: { Icone: Wallet, cor: "text-amber-600 bg-amber-50" },
  previsao_resultado: { Icone: Wallet, cor: "text-[#2A6377] bg-[#2A6377]/10" },
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

// Cartao no topo do painel do sininho: liga/desliga os avisos push neste dispositivo.
export function AtivarPush() {
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    estadoPush()
      .then(setEstado)
      .catch(() => setEstado("sem_suporte"));
  }, []);

  const executar = async (acao: () => Promise<EstadoPush>) => {
    setOcupado(true);
    setErro("");
    try {
      setEstado(await acao());
    } catch (e) {
      console.error("Push:", e);
      setErro("Não foi possível alterar os avisos agora. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  };

  if (estado === "carregando") return null;

  if (estado === "ativo") {
    return (
      <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
        <span className="flex items-center gap-1.5">
          <BellRing size={14} /> Avisos ativos neste dispositivo
        </span>
        <button
          disabled={ocupado}
          onClick={() => executar(desativarPush)}
          className="font-semibold hover:underline disabled:opacity-50"
        >
          Desativar
        </button>
      </div>
    );
  }

  if (estado === "inativo") {
    return (
      <div className="mb-4 p-3 rounded-xl bg-[#2A6377]/5 border border-[#2A6377]/20">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <BellRing size={16} className="text-[#2A6377]" /> Receber avisos neste dispositivo
        </p>
        <p className="text-xs text-slate-500 mt-1">
          As novidades aparecem na tela mesmo com o app fechado.
        </p>
        <button
          disabled={ocupado}
          onClick={() => executar(ativarPush)}
          className="mt-2 px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-xs font-semibold hover:bg-[#1e4857] disabled:opacity-50"
        >
          {ocupado ? "Ativando..." : "Ativar avisos"}
        </button>
        {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
      </div>
    );
  }

  const textos: Record<string, string> = {
    bloqueado:
      "Os avisos estão bloqueados neste navegador. Libere em Configurações do site (cadeado ao lado do endereço) e recarregue a página.",
    ios_instalar:
      "No iPhone/iPad: toque em Compartilhar → “Adicionar à Tela de Início”, abra o app pelo ícone criado e ative os avisos aqui.",
    sem_suporte: "Este navegador não permite avisos fora do app.",
  };
  return (
    <div className="flex gap-2 mb-4 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
      <BellOff size={14} className="shrink-0 mt-0.5" />
      <span>{textos[estado]}</span>
    </div>
  );
}

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
