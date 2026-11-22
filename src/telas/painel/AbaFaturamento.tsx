import FaturamentosRealizados from "../../FaturamentosRealizados";
import ValorAjustavel from "../../ValorAjustavel";
import CartaoIndicador, { CLASSE_VALOR } from "../../CartaoIndicador";
import { formatarMoeda, formatarCompetencia, formatarPercentual } from "../../utils";
import { Activity, Lock, Receipt } from "lucide-react";
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
  // 17/11 (decisao do Carlos): o espelho (escopo, previsoes, NFs da obra) so e lido por quem gerencia a obra;
  // para os demais o banco devolve lista vazia, que aqui nao pode parecer "obra sem faturamento"
  semAcesso?: boolean;
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
  semAcesso = false,
}: PropsAbaFaturamento) {
  if (semAcesso)
    return (
      <div className="bg-white rounded-xl shadow-sm border p-5 flex items-start gap-3">
        <Lock size={18} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold text-slate-800">Sem acesso ao espelho de faturamento desta obra</p>
          <p className="text-sm text-slate-500 mt-1">
            Escopo, previsões e notas emitidas da obra são vistos só pelo gestor da obra, pelo assistente dele e pela
            coordenação. As solicitações de faturamento continuam acima.
          </p>
        </div>
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-5 gap-4">
        <CartaoIndicador rotulo="Escopo total">
          <ValorAjustavel className={CLASSE_VALOR}>{formatarMoeda(totalEscopoFaturamento)}</ValorAjustavel>
        </CartaoIndicador>
        <CartaoIndicador rotulo="Previsto">
          <ValorAjustavel className={CLASSE_VALOR}>{formatarMoeda(totalPrevistoFaturamento)}</ValorAjustavel>
        </CartaoIndicador>
        <CartaoIndicador rotulo="Faturado">
          <ValorAjustavel className={CLASSE_VALOR}>{formatarMoeda(totalRealizadoFaturamento)}</ValorAjustavel>
        </CartaoIndicador>
        <CartaoIndicador rotulo="A faturar">
          <ValorAjustavel className={CLASSE_VALOR}>{formatarMoeda(saldoFaturarFamiliasPositivo)}</ValorAjustavel>
        </CartaoIndicador>
        <CartaoIndicador rotulo="Itens no escopo">
          <p className={CLASSE_VALOR}>{familiasFaturamentoComEscopo.length}</p>
        </CartaoIndicador>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Receipt size={18} className="text-petroleo" /> Escopo
            por grupo/família
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cada linha representa uma combinação de grupo de faturamento, família e valor de escopo.
            A mesma família pode aparecer em mais de um grupo. O escopo vem direto do pedido de
            venda no ERP — ajustes são feitos lá, não neste sistema.
          </p>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">
                  Grupo de faturamento
                </th>
                <th className="p-3 text-right">Valor total escopo</th>
                <th className="p-3 text-right">Faturado</th>
                <th className="p-3 text-right">% Faturado</th>
                <th className="p-3 text-right">A Faturar</th>
                <th className="p-3 text-right">% A Faturar</th>
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
                      <td className="p-3 font-medium text-slate-800">
                        <div>
                          {linha.grupo.codigo}
                          {linha.grupo.descricao
                            ? ` - ${linha.grupo.descricao}`
                            : ""}
                        </div>
                        {linha.familia?.observacao && (
                          <div className="text-xs text-slate-500 font-normal mt-1">
                            {linha.familia.observacao}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-900 whitespace-nowrap">
                        {formatarMoeda(linha.valorEscopo)}
                      </td>
                      <td className="p-3 text-right text-slate-700 whitespace-nowrap">
                        {formatarMoeda(linha.valorFaturado)}
                      </td>
                      <td className="p-3 text-right text-slate-500 whitespace-nowrap">
                        {formatarPercentual(
                          linha.valorFaturado,
                          linha.valorEscopo,
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-700 whitespace-nowrap">
                        {formatarMoeda(saldoGrupo)}
                      </td>
                      <td className="p-3 text-right text-slate-500 whitespace-nowrap">
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
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Activity size={18} className="text-petroleo" />
            Previsão x realizado por grupo de faturamento
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Uma linha por material do pedido (grupo de faturamento),
            exatamente como no ERP.
          </p>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table
            className="text-xs tabular-nums"
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
                  Grupo de faturamento
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
                      <div className="bg-slate-100 text-slate-700 p-2 font-semibold border-b">
                        {formatarCompetencia(comp)}
                      </div>
                    </th>
                  ))
                )}
              </tr>
              <tr>
                {competenciasFaturamento.length === 0 ? (
                  <th className="p-3 text-center text-slate-500">
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
                    <td className="p-3 font-medium text-slate-800 sticky left-0 bg-white z-10 border-r min-w-[260px]">
                      <div>
                        {linha.grupo.codigo}
                        {linha.grupo.descricao ? ` - ${linha.grupo.descricao}` : ""}
                      </div>
                      <div className="text-xs text-slate-500 font-normal mt-1">
                        Escopo: {formatarMoeda(linha.valorEscopo)} • Faturado: {formatarMoeda(linha.valorFaturado)}
                      </div>
                    </td>
                    {competenciasFaturamento.length === 0 ? (
                      <td className="p-3 text-center text-slate-500">
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
                                className={`p-3 text-right border-r whitespace-nowrap ${previsto > 0 ? "text-slate-600" : "text-slate-400"}`}
                              >
                                {previsto > 0
                                  ? formatarMoeda(previsto)
                                  : "-"}
                              </span>
                              <span
                                className={`p-3 text-right whitespace-nowrap ${realizado > 0 ? "font-medium text-slate-900" : "text-slate-400"}`}
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
              <tfoot className="bg-slate-100 border-t-2 border-petroleo text-slate-800">
                <tr>
                  <td className="p-3 font-semibold text-slate-800 sticky left-0 bg-slate-100 z-20 border-r min-w-[260px]">
                    Total por competência
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
                          <span className="p-3 text-right border-r whitespace-nowrap font-semibold text-slate-700">
                            {totalPrevisto > 0 ? formatarMoeda(totalPrevisto) : "-"}
                          </span>
                          <span className="p-3 text-right whitespace-nowrap font-semibold text-slate-900">
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
