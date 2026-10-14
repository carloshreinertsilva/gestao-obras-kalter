import type { Dispatch, SetStateAction } from "react";
import TimelineObra from "../../TimelineObra";
import AnexosObra from "../../AnexosObra";
import { formatarDataSegura, isAtrasada } from "../../utils";
import { CheckSquare, Plus, Clock, User } from "lucide-react";
import type { Obra, Tarefa, Usuario } from "../../types";

// Aba "diario_tarefas" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaDiarioTarefas {
  abrirModalNovaTarefaObra: () => void;
  filtroTarefasObra: string;
  mostrarAviso: (mensagem: string, tipo?: string) => void;
  obraEcoSelecionada: Obra;
  podeEditarObraSelecionada: boolean;
  setFiltroTarefasObra: Dispatch<SetStateAction<string>>;
  setSubAbaDiario: Dispatch<SetStateAction<"historico" | "anexos" | "tarefas">>;
  setTarefaSelecionada: Dispatch<SetStateAction<Tarefa | null>>;
  subAbaDiario: "historico" | "anexos" | "tarefas";
  tarefasPainelObra: Tarefa[];
  usuarioAtual: Usuario | null;
}

export default function AbaDiarioTarefas({
  abrirModalNovaTarefaObra,
  filtroTarefasObra,
  mostrarAviso,
  obraEcoSelecionada,
  podeEditarObraSelecionada,
  setFiltroTarefasObra,
  setSubAbaDiario,
  setTarefaSelecionada,
  subAbaDiario,
  tarefasPainelObra,
  usuarioAtual,
}: PropsAbaDiarioTarefas) {
  return (
    <div className="flex flex-col gap-6 flex-1 items-start w-full">
      <div className="flex gap-2 border-b w-full">
        {[
          { id: "historico", label: "Histórico" },
          { id: "anexos", label: "Anexos" },
          { id: "tarefas", label: "Tarefas" },
        ].map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSubAbaDiario(sub.id as any)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${subAbaDiario === sub.id ? "border-[#2A6377] text-[#2A6377]" : "border-transparent text-slate-500 hover:text-[#2A6377]"}`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {subAbaDiario === "historico" && (
        <TimelineObra
          idObra={obraEcoSelecionada.id}
          usuarioAtualId={usuarioAtual?.id}
          podeGerenciar={podeEditarObraSelecionada}
          onAviso={mostrarAviso}
        />
      )}

      {subAbaDiario === "anexos" && (
        <AnexosObra
          idObra={obraEcoSelecionada.id}
          usuarioAtualId={usuarioAtual?.id}
          podeGerenciar={podeEditarObraSelecionada}
          onAviso={mostrarAviso}
        />
      )}

      {subAbaDiario === "tarefas" && (
      <div className="flex flex-col bg-white p-5 rounded-xl shadow-sm border w-full">
        <div className="border-b pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckSquare size={20} className="text-[#2A6377]" /> Tarefas da Obra
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Crie e acompanhe tarefas avulsas da obra. Tarefas de reunião também aparecem aqui.
            </p>
          </div>
          {podeEditarObraSelecionada && !["finalizada", "cancelada"].includes(obraEcoSelecionada.status ?? "") && (
            <button
              onClick={abrirModalNovaTarefaObra}
              className="bg-[#2A6377] hover:bg-[#1e4857] text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Nova Tarefa
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: "abertas", label: "Abertas" },
            { id: "atrasadas", label: "Atrasadas" },
            { id: "pendente", label: "A Fazer" },
            { id: "em_andamento", label: "Em Andamento" },
            { id: "concluida", label: "Concluídas" },
            { id: "cancelada", label: "Canceladas" },
            { id: "todas", label: "Todas" },
          ].map((filtro) => (
            <button
              key={filtro.id}
              onClick={() => setFiltroTarefasObra(filtro.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filtroTarefasObra === filtro.id ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
            >
              {filtro.label}
            </button>
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 items-start flex-1">
          <div className="flex-1 min-w-[260px] bg-gray-50 rounded-xl p-3 border">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm">A Fazer</h4>
              <span className="bg-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {
                  tarefasPainelObra.filter(
                    (t) => t?.status === "pendente",
                  ).length
                }
              </span>
            </div>
            <div className="space-y-2">
              {tarefasPainelObra
                .filter((t) => t?.status === "pendente")
                .map((tarefa) => (
                  <div
                    key={tarefa?.id}
                    onClick={() => setTarefaSelecionada(tarefa)}
                    className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer"
                  >
                    <p className="font-medium text-sm leading-tight mb-2">
                      {tarefa?.titulo}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {tarefa?.origem === "reuniao" ? "Reunião" : "Avulsa"}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${tarefa?.prioridade === "critica" ? "bg-red-100 text-red-700" : tarefa?.prioridade === "alta" ? "bg-amber-100 text-amber-700" : tarefa?.prioridade === "baixa" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                        {tarefa?.prioridade || "normal"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        <User size={10} className="inline mr-1" />
                        {tarefa?.usuarios?.nome}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        <Clock size={10} />{" "}
                        {formatarDataSegura(tarefa?.data_vencimento)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-1 min-w-[260px] bg-[#2A6377]/5 rounded-xl p-3 border border-[#2A6377]/20">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-[#2A6377]">
                Em Andamento
              </h4>
              <span className="bg-[#2A6377]/20 text-[#2A6377] text-[10px] px-2 py-0.5 rounded-full font-bold">
                {
                  tarefasPainelObra.filter(
                    (t) => t?.status === "em_andamento",
                  ).length
                }
              </span>
            </div>
            <div className="space-y-2">
              {tarefasPainelObra
                .filter((t) => t?.status === "em_andamento")
                .map((tarefa) => (
                  <div
                    key={tarefa?.id}
                    onClick={() => setTarefaSelecionada(tarefa)}
                    className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer"
                  >
                    <p className="font-medium text-sm leading-tight mb-2">
                      {tarefa?.titulo}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        {tarefa?.origem === "reuniao" ? "Reunião" : "Avulsa"}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${tarefa?.prioridade === "critica" ? "bg-red-100 text-red-700" : tarefa?.prioridade === "alta" ? "bg-amber-100 text-amber-700" : tarefa?.prioridade === "baixa" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                        {tarefa?.prioridade || "normal"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        <User size={10} className="inline mr-1" />
                        {tarefa?.usuarios?.nome}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        <Clock size={10} />{" "}
                        {formatarDataSegura(tarefa?.data_vencimento)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-1 min-w-[260px] bg-green-50/50 rounded-xl p-3 border border-green-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-green-700">
                Concluídas
              </h4>
            </div>
            <div className="space-y-2">
              {tarefasPainelObra
                .filter((t) => t?.status === "concluida")
                .map((tarefa) => (
                  <div
                    key={tarefa?.id}
                    onClick={() => setTarefaSelecionada(tarefa)}
                    className="bg-white p-3 rounded shadow-sm border opacity-70 cursor-pointer hover:opacity-100"
                  >
                    <p className="font-medium text-sm leading-tight mb-2 line-through text-slate-500">
                      {tarefa?.titulo}
                    </p>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex-1 min-w-[260px] bg-red-50/40 rounded-xl p-3 border border-red-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm text-red-700">
                Canceladas
              </h4>
              <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {tarefasPainelObra.filter((t) => t?.status === "cancelada").length}
              </span>
            </div>
            <div className="space-y-2">
              {tarefasPainelObra
                .filter((t) => t?.status === "cancelada")
                .map((tarefa) => (
                  <div
                    key={tarefa?.id}
                    onClick={() => setTarefaSelecionada(tarefa)}
                    className="bg-white p-3 rounded shadow-sm border opacity-70 cursor-pointer hover:opacity-100"
                  >
                    <p className="font-medium text-sm leading-tight mb-2 line-through text-slate-500">
                      {tarefa?.titulo}
                    </p>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      Cancelada
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
