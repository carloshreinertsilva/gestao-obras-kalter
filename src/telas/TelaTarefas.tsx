import { useMemo, useState, type ReactNode } from "react";
import type { Obra, Tarefa } from "../types";
import { formatarDataSegura, isAtrasada } from "../utils";
import { Clock, CheckCircle2, User, Play, Check, Search, Flag } from "lucide-react";

// Tarefas: quadro A Fazer / Em Andamento / Concluidas, com filtro por obra.
// O filtro de obra e compartilhado com o painel da obra (abrir uma obra filtra por ela).
// 06/11/2026: filtro "Minhas" (ligado por padrao para quem nao ve tudo), busca, ordem por prazo
// (atrasadas primeiro), prioridade no cartao, botoes Iniciar/Concluir sem abrir a tarefa e concluidas
// so dos ultimos 30 dias (as antigas sob demanda).
interface Props {
  obrasLista: Obra[];
  filtroObraKanban: string;
  setFiltroObraKanban: (valor: string) => void;
  tarefasFiltradas: Tarefa[];
  onAbrirTarefa: (tarefa: Tarefa) => void;
  idUsuario?: string | null;
  veTudo?: boolean;
  onMudarStatus?: (tarefa: Tarefa, status: string) => void;
  incluiAntigas?: boolean;
  onCarregarAntigas?: () => void;
}

const PRIORIDADE: Record<string, { rotulo: string; classe: string }> = {
  alta: { rotulo: "Alta", classe: "bg-red-50 text-red-700 border-red-200" },
  urgente: { rotulo: "Urgente", classe: "bg-red-100 text-red-800 border-red-300" },
  baixa: { rotulo: "Baixa", classe: "bg-slate-50 text-slate-600 border-slate-200" },
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function ordemPorPrazo(a: Tarefa, b: Tarefa) {
  const da = a.data_vencimento || "9999-12-31";
  const db = b.data_vencimento || "9999-12-31";
  return da < db ? -1 : da > db ? 1 : 0;
}

function Cartao({
  tarefa,
  onAbrir,
  onMudarStatus,
}: {
  tarefa: Tarefa;
  onAbrir: (t: Tarefa) => void;
  onMudarStatus?: (t: Tarefa, status: string) => void;
}) {
  const atrasada = isAtrasada(tarefa.data_vencimento, tarefa.status);
  const concluida = tarefa.status === "concluida";
  const prioridade = PRIORIDADE[(tarefa as any).prioridade || ""];
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border transition max-w-full ${
        concluida ? "border-gray-200 opacity-75" : atrasada ? "border-red-300" : "border-gray-200 hover:border-[#2A6377]"
      }`}
    >
      <button type="button" onClick={() => onAbrir(tarefa)} className="w-full text-left p-4 pb-2 rounded-lg">
        <div className="flex justify-between items-start gap-2">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded truncate ${concluida ? "text-gray-500 bg-gray-100" : "text-[#2A6377] bg-[#2A6377]/10"}`}
          >
            {tarefa.obras?.codigo_externo || "Geral"}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[140px] shrink-0">
            <User size={12} className="shrink-0" /> {tarefa.usuarios?.nome || "Geral"}
          </span>
        </div>
        <p className={`font-medium text-sm my-2 line-clamp-2 ${concluida ? "text-gray-500 line-through" : "text-slate-800"}`}>
          {tarefa.titulo || "Sem título"}
        </p>
      </button>
      <div className="flex items-center gap-2 border-t px-4 py-2 flex-wrap">
        {concluida ? (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700">
            <CheckCircle2 size={12} /> Feito
          </span>
        ) : (
          <span
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${atrasada ? "bg-red-50 text-red-700 font-semibold" : "bg-gray-50 text-gray-600"}`}
          >
            <Clock size={12} /> {atrasada ? "Atrasada: " : "Prazo: "}
            {formatarDataSegura(tarefa.data_vencimento)}
          </span>
        )}
        {prioridade && !concluida && (
          <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${prioridade.classe}`}>
            <Flag size={12} /> {prioridade.rotulo}
          </span>
        )}
        {onMudarStatus && !concluida && (
          <span className="ml-auto flex gap-1">
            {tarefa.status === "pendente" && (
              <button
                type="button"
                onClick={() => onMudarStatus(tarefa, "em_andamento")}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[#2A6377]/30 text-[#2A6377] hover:bg-[#2A6377]/10 flex items-center gap-1"
                title="Mover para Em andamento"
              >
                <Play size={12} /> Iniciar
              </button>
            )}
            <button
              type="button"
              onClick={() => onMudarStatus(tarefa, "concluida")}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
              title="Marcar como concluída"
            >
              <Check size={12} /> Concluir
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function Coluna({
  titulo,
  tarefas,
  classe,
  rodape,
  onAbrir,
  onMudarStatus,
}: {
  titulo: string;
  tarefas: Tarefa[];
  classe: string;
  rodape?: ReactNode;
  onAbrir: (t: Tarefa) => void;
  onMudarStatus?: (t: Tarefa, status: string) => void;
}) {
  return (
    <section className={`flex-1 min-w-[280px] md:min-w-[300px] rounded-xl p-4 border flex flex-col max-w-full ${classe}`} aria-label={titulo}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-700 truncate">{titulo}</h3>
        <span className="bg-white/70 border text-xs font-semibold px-2 py-1 rounded-full">{tarefas.length}</span>
      </div>
      <div className="space-y-3">
        {tarefas.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nenhuma tarefa.</p>
        ) : (
          tarefas.map((t) => <Cartao key={t.id} tarefa={t} onAbrir={onAbrir} onMudarStatus={onMudarStatus} />)
        )}
        {rodape}
      </div>
    </section>
  );
}

export default function TelaTarefas({
  obrasLista,
  filtroObraKanban,
  setFiltroObraKanban,
  tarefasFiltradas,
  onAbrirTarefa,
  idUsuario,
  veTudo,
  onMudarStatus,
  incluiAntigas,
  onCarregarAntigas,
}: Props) {
  const [soMinhas, setSoMinhas] = useState(!veTudo);
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return tarefasFiltradas.filter((t) => {
      if (soMinhas && idUsuario && t.id_responsavel !== idUsuario) return false;
      if (!termo) return true;
      return semAcento(`${t.titulo || ""} ${t.obras?.codigo_externo || ""} ${t.obras?.nome || ""} ${t.usuarios?.nome || ""}`).includes(termo);
    });
  }, [tarefasFiltradas, soMinhas, idUsuario, busca]);

  const aFazer = visiveis.filter((t) => t.status === "pendente").sort(ordemPorPrazo);
  const andamento = visiveis.filter((t) => t.status === "em_andamento").sort(ordemPorPrazo);
  const concluidas = visiveis
    .filter((t) => t.status === "concluida")
    .sort((a, b) => (((a as any).data_conclusao || "") < ((b as any).data_conclusao || "") ? 1 : -1));

  return (
    <div className="animate-in fade-in h-full flex flex-col dash-main-wrapper max-w-full">
      <header className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 max-w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Tarefas</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm self-start" role="group" aria-label="De quem">
            {(
              [
                [true, "Minhas"],
                [false, "Todas"],
              ] as [boolean, string][]
            ).map(([v, r]) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={soMinhas === v}
                onClick={() => setSoMinhas(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${soMinhas === v ? "bg-[#2A6377] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Buscar tarefa</span>
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tarefa, obra ou pessoa"
              className="border rounded-lg py-2 pl-8 pr-3 w-full sm:w-64 bg-white shadow-sm focus:border-[#2A6377]"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 shrink-0">Obra:</span>
            <select
              className="border rounded-lg p-2 focus:border-[#2A6377] font-medium bg-white shadow-sm w-full sm:w-auto max-w-full"
              value={filtroObraKanban}
              onChange={(e) => setFiltroObraKanban(e.target.value)}
            >
              <option value="todas">Todas as obras</option>
              {obrasLista.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo_externo} - {o.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <div className="flex gap-6 overflow-x-auto pb-4 items-start flex-1 max-w-full">
        <Coluna titulo="A fazer" tarefas={aFazer} classe="bg-gray-100/50" onAbrir={onAbrirTarefa} onMudarStatus={onMudarStatus} />
        <Coluna
          titulo="Em andamento"
          tarefas={andamento}
          classe="bg-[#2A6377]/5 border-[#2A6377]/20"
          onAbrir={onAbrirTarefa}
          onMudarStatus={onMudarStatus}
        />
        <Coluna
          titulo={incluiAntigas ? "Concluídas" : "Concluídas (últimos 30 dias)"}
          tarefas={concluidas}
          classe="bg-green-50/30 border-green-100"
          onAbrir={onAbrirTarefa}
          rodape={
            !incluiAntigas &&
            onCarregarAntigas && (
              <button type="button" onClick={onCarregarAntigas} className="w-full text-sm font-semibold text-[#2A6377] hover:underline py-2">
                Ver concluídas mais antigas
              </button>
            )
          }
        />
      </div>
    </div>
  );
}
