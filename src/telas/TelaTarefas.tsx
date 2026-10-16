import type { Obra, Tarefa } from "../types";
import { formatarDataSegura, isAtrasada } from "../utils";
import { Clock, CheckCircle2, User } from "lucide-react";

// Tarefas: quadro A Fazer / Em Andamento / Concluidas, com filtro por obra.
// O filtro e compartilhado com o painel da obra (abrir uma obra filtra por ela).
interface Props {
  obrasLista: Obra[];
  filtroObraKanban: string;
  setFiltroObraKanban: (valor: string) => void;
  tarefasFiltradas: Tarefa[];
  onAbrirTarefa: (tarefa: Tarefa) => void;
}

export default function TelaTarefas({
  obrasLista,
  filtroObraKanban,
  setFiltroObraKanban,
  tarefasFiltradas,
  onAbrirTarefa,
}: Props) {
  return (
    <div className="animate-in fade-in h-full flex flex-col dash-main-wrapper max-w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 max-w-full">
        <div className="max-w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 max-w-full truncate">
            Tarefas
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-sm font-medium text-gray-500 shrink-0">
            Filtrar:
          </label>
          <select
            className="border rounded-lg p-2 outline-none focus:border-[#2A6377] font-medium bg-white shadow-sm w-full sm:w-auto shrinking-0 max-w-full"
            value={filtroObraKanban}
            onChange={(e) => setFiltroObraKanban(e.target.value)}
          >
            <option value="todas">Todas as Obras</option>
            {obrasLista.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo_externo} - {o.nome}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="flex gap-6 overflow-x-auto pb-4 items-start flex-1 max-w-full">
        <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-gray-100/50 rounded-xl p-4 border flex flex-col max-w-full">
          <div className="flex justify-between items-center mb-4 max-w-full">
            <h3 className="font-bold max-w-full truncate">A Fazer</h3>
            <span className="bg-gray-200 text-xs px-2 py-1 rounded-full shrink-0">
              {
                tarefasFiltradas.filter((t) => t?.status === "pendente")
                  .length
              }
            </span>
          </div>
          <div className="space-y-3 max-w-full">
            {tarefasFiltradas
              .filter((t) => t?.status === "pendente")
              .map((tarefa) => (
                <div
                  key={tarefa.id}
                  onClick={() => onAbrirTarefa(tarefa)}
                  className="bg-white p-4 rounded-lg shadow-sm border hover:border-[#2A6377] transition group max-w-full cursor-pointer relative"
                >
                  <div className="flex justify-between items-start mb-2 max-w-full">
                    <span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded max-w-full truncate">
                      {tarefa.obras?.codigo_externo || "Geral"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                      <User size={10} className="shrink-0" />{" "}
                      {tarefa.usuarios?.nome || "Geral"}
                    </span>
                  </div>
                  <p className="font-medium text-sm my-3 max-w-full truncate">
                    {tarefa.titulo || "Sem Título"}
                  </p>
                  <div className="flex justify-between items-center border-t pt-3 mt-3 max-w-full flex-wrap gap-2">
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <div
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"}`}
                      >
                        <Clock size={12} className="shrink-0" /> Prazo:{" "}
                        {formatarDataSegura(tarefa.data_vencimento)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-[#2A6377]/5 rounded-xl p-4 border border-[#2A6377]/20 flex flex-col max-w-full">
          <div className="flex justify-between items-center mb-4 max-w-full">
            <h3 className="font-bold text-gray-700 max-w-full truncate">
              Em Andamento
            </h3>
            <span className="bg-[#2A6377]/20 text-[#2A6377] text-xs px-2 py-1 rounded-full shrink-0">
              {
                tarefasFiltradas.filter(
                  (t) => t?.status === "em_andamento",
                ).length
              }
            </span>
          </div>
          <div className="space-y-3 max-w-full">
            {tarefasFiltradas
              .filter((t) => t?.status === "em_andamento")
              .map((tarefa) => (
                <div
                  key={tarefa.id}
                  onClick={() => onAbrirTarefa(tarefa)}
                  className={`bg-white p-4 rounded-lg shadow-sm border max-w-full cursor-pointer relative ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "border-red-300" : "border-gray-200 hover:border-[#2A6377]"}`}
                >
                  <div className="flex justify-between items-start mb-2 max-w-full">
                    <span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded max-w-full truncate">
                      {tarefa.obras?.codigo_externo || "Geral"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                      <User size={10} className="shrink-0" />{" "}
                      {tarefa.usuarios?.nome || "Geral"}
                    </span>
                  </div>
                  <p className="font-medium text-sm my-3 max-w-full truncate">
                    {tarefa.titulo || "Sem Título"}
                  </p>
                  <div className="flex justify-between items-center border-t pt-3 mt-3 max-w-full flex-wrap gap-2">
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <div
                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"}`}
                      >
                        <Clock size={12} className="shrink-0" /> Prazo:{" "}
                        {formatarDataSegura(tarefa.data_vencimento)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-green-50/30 rounded-xl p-4 border border-green-100 flex flex-col max-w-full">
          <div className="flex justify-between items-center mb-4 max-w-full">
            <h3 className="font-bold text-gray-700 max-w-full truncate">
              Concluídas
            </h3>
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full shrink-0">
              {
                tarefasFiltradas.filter((t) => t?.status === "concluida")
                  .length
              }
            </span>
          </div>
          <div className="space-y-3 max-w-full">
            {tarefasFiltradas
              .filter((t) => t?.status === "concluida")
              .map((tarefa) => (
                <div
                  key={tarefa.id}
                  onClick={() => onAbrirTarefa(tarefa)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-70 max-w-full cursor-pointer relative hover:border-[#2A6377]"
                >
                  <div className="flex justify-between items-start mb-2 max-w-full">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-full truncate">
                      {tarefa.obras?.codigo_externo || "Geral"}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                      <User size={10} className="shrink-0" />{" "}
                      {tarefa.usuarios?.nome || "Geral"}
                    </span>
                  </div>
                  <p className="font-medium text-gray-500 line-through text-sm my-3 max-w-full truncate">
                    {tarefa.titulo || "Sem Título"}
                  </p>
                  <div className="flex justify-end border-t pt-3 mt-3 max-w-full">
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-600 shrink-0 ml-auto">
                      <CheckCircle2 size={12} className="shrink-0" />{" "}
                      Feito
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
