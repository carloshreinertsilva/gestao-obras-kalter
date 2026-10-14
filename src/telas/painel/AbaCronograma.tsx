import { formatarDataSegura, labelFase, classeStatusCronograma, labelStatusCronograma } from "../../utils";
import { Calendar } from "lucide-react";
import type { CronogramaObra, Obra } from "../../types";

// Aba "cronograma" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaCronograma {
  abrirModalCronograma: (fase: any, acao: string) => void;
  cronogramaObra: CronogramaObra[];
  obraEcoSelecionada: Obra;
  podeEditarObraSelecionada: boolean;
  reabrirFaseCronograma: (fase: any) => Promise<void>;
  zerarFaseCronograma: (fase: any) => Promise<void>;
}

export default function AbaCronograma({
  abrirModalCronograma,
  cronogramaObra,
  obraEcoSelecionada,
  podeEditarObraSelecionada,
  reabrirFaseCronograma,
  zerarFaseCronograma,
}: PropsAbaCronograma) {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
      <div className="p-4 border-b">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Calendar size={18} className="text-[#2A6377]" /> Cronograma
          Resumo
        </h3>
      </div>
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Fase</th>
              <th className="p-3">Início Previsto</th>
              <th className="p-3">Prazo Entrega</th>
              <th className="p-3">Início Real</th>
              <th className="p-3">Fim Real</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-left">Observação</th>
              {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {cronogramaObra.length === 0 ? (
              <tr>
                <td
                  colSpan={podeEditarObraSelecionada ? 8 : 7}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhuma fase cadastrada.
                </td>
              </tr>
            ) : (
              cronogramaObra.map((fase) => {
                const inicioPrevisto =
                  fase.inicio_previsto ||
                  obraEcoSelecionada?.data_inicio;
                const fimPrevisto =
                  fase.fim_previsto ||
                  obraEcoSelecionada?.data_previsao_fim;
                return (
                  <tr
                    key={fase.id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold text-[#2A6377]">
                      {labelFase(fase.fase ?? "")}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatarDataSegura(inicioPrevisto)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatarDataSegura(fimPrevisto)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {fase.inicio_real
                        ? formatarDataSegura(fase.inicio_real)
                        : "-"}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {fase.fim_real
                        ? formatarDataSegura(fase.fim_real)
                        : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusCronograma(fase.status ?? "")}`}
                      >
                        {labelStatusCronograma(fase.status ?? "")}
                      </span>
                    </td>
                    <td
                      className="p-3 text-slate-600 max-w-[220px] truncate"
                      title={fase.observacao || ""}
                    >
                      {fase.observacao || "-"}
                    </td>
                    {podeEditarObraSelecionada && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              abrirModalCronograma(
                                fase,
                                "editar_previsto",
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                          >
                            Editar prazos
                          </button>
                          {fase.status === "nao_iniciado" && (
                            <button
                              onClick={() =>
                                abrirModalCronograma(fase, "iniciar")
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition"
                            >
                              Iniciar
                            </button>
                          )}
                          {fase.status === "em_andamento" && (
                            <>
                              <button
                                onClick={() =>
                                  abrirModalCronograma(
                                    fase,
                                    "finalizar",
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
                              >
                                Finalizar
                              </button>
                              <button
                                onClick={() => zerarFaseCronograma(fase)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition"
                              >
                                Voltar para não iniciado
                              </button>
                            </>
                          )}
                          {fase.status === "concluido" && (
                            <>
                              <button
                                onClick={() =>
                                  reabrirFaseCronograma(fase)
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                              >
                                Reabrir
                              </button>
                              <button
                                onClick={() => zerarFaseCronograma(fase)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition"
                              >
                                Zerar
                              </button>
                            </>
                          )}
                          {fase.status === "atrasado" && (
                            <button
                              onClick={() =>
                                abrirModalCronograma(fase, "iniciar")
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition"
                            >
                              Iniciar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-500">
        As datas previstas podem ser ajustadas pelo botão Editar
        prazos. Quando a fase ainda não tiver datas próprias, o
        sistema usa o início e o prazo de entrega cadastrados na obra
        como sugestão. As datas reais são registradas pelos botões
        Iniciar e Finalizar, informando data e observação. Se uma fase foi iniciada por engano, use Voltar para não iniciado.
      </div>
    </div>
  );
}
