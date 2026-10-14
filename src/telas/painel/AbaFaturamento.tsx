import FaturamentosRealizados from "../../FaturamentosRealizados";
import ValorAjustavel from "../../ValorAjustavel";
import { formatarMoeda, formatarCompetencia, formatarPercentual } from "../../utils";
import { Activity, Receipt } from "lucide-react";
import type { ObraFaturamentoFamilia, ObraFaturamentoGrupo, ObraFaturamentoPrevisao, ObraFaturamentoRealizado } from "../../types";

// Aba "faturamento" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaFaturamento {
  competenciasFaturamento: string[];
  familiasFaturamento: ObraFaturamentoFamilia[];
  familiasFaturamentoComEscopo: ObraFaturamentoFamilia[];
  gruposFaturamentoObra: ObraFaturamentoGrupo[];
  gruposFaturamentoResumo: { grupo: ObraFaturamentoGrupo; familia: any; valorEscopo: number; valorFaturado: number; }[];
  previsoesFaturamentoDoEscopo: ObraFaturamentoPrevisao[];
  realizadosFaturamentoDoEscopo: ObraFaturamentoRealizado[];
  saldoFaturarFamiliasPositivo: number;
  totalEscopoFaturamento: number;
  totalPrevistoCompetencia: (competencia: string) => number;
  totalPrevistoFaturamento: number;
  totalRealizadoCompetencia: (competencia: string) => number;
  totalRealizadoFaturamento: number;
  valorPrevistoGrupoCompetencia: (grupoCodigo: string, competencia: string) => number;
  valorRealizadoGrupoCompetencia: (grupoCodigo: string, competencia: string) => number;
}

export default function AbaFaturamento({
  competenciasFaturamento,
  familiasFaturamento,
  familiasFaturamentoComEscopo,
  gruposFaturamentoObra,
  gruposFaturamentoResumo,
  previsoesFaturamentoDoEscopo,
  realizadosFaturamentoDoEscopo,
  saldoFaturarFamiliasPositivo,
  totalEscopoFaturamento,
  totalPrevistoCompetencia,
  totalPrevistoFaturamento,
  totalRealizadoCompetencia,
  totalRealizadoFaturamento,
  valorPrevistoGrupoCompetencia,
  valorRealizadoGrupoCompetencia,
}: PropsAbaFaturamento) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Escopo Total
          </p>
          <ValorAjustavel className="text-2xl font-bold text-slate-800">
            {formatarMoeda(totalEscopoFaturamento)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Previsto
          </p>
          <ValorAjustavel className="text-2xl font-bold text-blue-700">
            {formatarMoeda(totalPrevistoFaturamento)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Faturado
          </p>
          <ValorAjustavel className="text-2xl font-bold text-emerald-700">
            {formatarMoeda(totalRealizadoFaturamento)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            À Faturar
          </p>
          <ValorAjustavel className="text-2xl font-bold text-amber-700">
            {formatarMoeda(saldoFaturarFamiliasPositivo)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Itens no Escopo
          </p>
          <p className="text-2xl font-bold text-[#2A6377]">
            {familiasFaturamentoComEscopo.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Receipt size={18} className="text-[#2A6377]" /> Escopo
            por Grupo/Família
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cada linha representa uma combinação de grupo de faturamento, família e valor de escopo.
            A mesma família pode aparecer em mais de um grupo. O escopo vem direto do pedido de
            venda no ERP — ajustes são feitos lá, não neste sistema.
          </p>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">
                  Grupo de Faturamento
                </th>
                <th className="p-3 text-right">Valor Total Escopo</th>
                <th className="p-3 text-right">Faturado</th>
                <th className="p-3 text-right">% Faturado</th>
                <th className="p-3 text-right">À Faturar</th>
                <th className="p-3 text-right">% À Faturar</th>
              </tr>
            </thead>
            <tbody>
              {familiasFaturamento.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhuma família criada para esta obra. Verifique
                    se a função de regularização foi executada.
                  </td>
                </tr>
              ) : gruposFaturamentoResumo.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhum item de escopo informado. O escopo é
                    importado automaticamente do pedido de venda no ERP.
                  </td>
                </tr>
              ) : (
                gruposFaturamentoResumo.map((linha) => {
                  const saldoGrupo = Math.max(
                    0,
                    Math.round(
                      (linha.valorEscopo - linha.valorFaturado) * 100,
                    ) / 100 || 0,
                  );
                  return (
                    <tr
                      key={linha.grupo.id}
                      className="border-t hover:bg-slate-50"
                    >
                      <td className="p-3 font-bold text-[#2A6377]">
                        <div>
                          {linha.grupo.codigo}
                          {linha.grupo.descricao
                            ? ` - ${linha.grupo.descricao}`
                            : ""}
                        </div>
                        {linha.familia?.observacao && (
                          <div className="text-[10px] text-slate-400 font-normal mt-1">
                            {linha.familia.observacao}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">
                        {formatarMoeda(linha.valorEscopo)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatarMoeda(linha.valorFaturado)}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        {formatarPercentual(
                          linha.valorFaturado,
                          linha.valorEscopo,
                        )}
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap text-amber-700">
                        {formatarMoeda(saldoGrupo)}
                      </td>
                      <td className="p-3 text-right font-semibold whitespace-nowrap text-amber-700">
                        {formatarPercentual(saldoGrupo, linha.valorEscopo)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Activity size={18} className="text-[#2A6377]" />
            Previsão x Realizado por Grupo de Faturamento
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Uma linha por material do pedido (grupo de faturamento),
            exatamente como no ERP.
          </p>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table
            className="text-xs"
            style={{
              minWidth: `${360 + Math.max(competenciasFaturamento.length, 1) * 260}px`,
            }}
          >
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th
                  rowSpan={2}
                  className="p-3 text-left min-w-[260px] sticky left-0 bg-slate-50 z-20 border-r"
                >
                  Grupo de Faturamento
                </th>
                {competenciasFaturamento.length === 0 ? (
                  <th className="p-3 text-center min-w-[260px]">
                    Competências
                  </th>
                ) : (
                  competenciasFaturamento.map((comp) => (
                    <th
                      key={`grupo-${comp}`}
                      className="p-0 text-center min-w-[260px] border-r"
                      colSpan={2}
                    >
                      <div className="bg-[#2A6377] text-white p-2 font-bold">
                        {formatarCompetencia(comp)}
                      </div>
                    </th>
                  ))
                )}
              </tr>
              <tr>
                {competenciasFaturamento.length === 0 ? (
                  <th className="p-3 text-center text-slate-400">
                    Sem previsão cadastrada
                  </th>
                ) : (
                  competenciasFaturamento.map((comp) => (
                    <th key={`grupo-${comp}-sub`} className="p-0" colSpan={2}>
                      <div className="grid grid-cols-2 min-w-[260px]">
                        <span className="p-2 border-r bg-slate-50">
                          Previsto
                        </span>
                        <span className="p-2 bg-slate-50">
                          Realizado
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {gruposFaturamentoResumo.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(competenciasFaturamento.length * 2 + 1, 2)}
                    className="p-6 text-center text-slate-500"
                  >
                    Nenhum grupo de faturamento com escopo informado.
                  </td>
                </tr>
              ) : (
                gruposFaturamentoResumo.map((linha: any) => (
                  <tr
                    key={`grupo-matriz-${linha.grupo.codigo}`}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold text-[#2A6377] sticky left-0 bg-white z-10 border-r min-w-[260px]">
                      <div>
                        {linha.grupo.codigo}
                        {linha.grupo.descricao ? ` - ${linha.grupo.descricao}` : ""}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-1">
                        Escopo: {formatarMoeda(linha.valorEscopo)} • Faturado: {formatarMoeda(linha.valorFaturado)}
                      </div>
                    </td>
                    {competenciasFaturamento.length === 0 ? (
                      <td className="p-3 text-center text-slate-400">
                        Sem previsão
                      </td>
                    ) : (
                      competenciasFaturamento.map((comp) => {
                        const previsto = valorPrevistoGrupoCompetencia(
                          linha.grupo.codigo,
                          comp,
                        );
                        const realizado = valorRealizadoGrupoCompetencia(
                          linha.grupo.codigo,
                          comp,
                        );
                        return (
                          <td
                            key={`${linha.grupo.codigo}-${comp}-grupo-matriz`}
                            className="p-0 border-r"
                            colSpan={2}
                          >
                            <div className="grid grid-cols-2 min-w-[260px]">
                              <span
                                className={`p-3 text-right border-r whitespace-nowrap ${previsto > 0 ? "font-bold text-blue-700" : "text-slate-300"}`}
                              >
                                {previsto > 0
                                  ? formatarMoeda(previsto)
                                  : "-"}
                              </span>
                              <span
                                className={`p-3 text-right whitespace-nowrap ${realizado > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}
                              >
                                {realizado > 0
                                  ? formatarMoeda(realizado)
                                  : "-"}
                              </span>
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {competenciasFaturamento.length > 0 && gruposFaturamentoResumo.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-[#2A6377] text-slate-800">
                <tr>
                  <td className="p-3 font-black text-[#2A6377] sticky left-0 bg-slate-100 z-20 border-r min-w-[260px]">
                    TOTAL POR COMPETÊNCIA
                  </td>
                  {competenciasFaturamento.map((comp) => {
                    const totalPrevisto = totalPrevistoCompetencia(comp);
                    const totalRealizado = totalRealizadoCompetencia(comp);

                    return (
                      <td
                        key={`${comp}-total-grupo-matriz`}
                        className="p-0 border-r"
                        colSpan={2}
                      >
                        <div className="grid grid-cols-2 min-w-[260px]">
                          <span className="p-3 text-right border-r whitespace-nowrap font-black text-blue-700">
                            {totalPrevisto > 0 ? formatarMoeda(totalPrevisto) : "-"}
                          </span>
                          <span className="p-3 text-right whitespace-nowrap font-black text-emerald-700">
                            {totalRealizado > 0 ? formatarMoeda(totalRealizado) : "-"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <FaturamentosRealizados
        realizados={realizadosFaturamentoDoEscopo}
        previsoes={previsoesFaturamentoDoEscopo}
        familias={familiasFaturamento}
        grupos={gruposFaturamentoObra}
      />
    </div>
  );
}
