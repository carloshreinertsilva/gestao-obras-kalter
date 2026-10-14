import type { Dispatch } from "react";
import ValorAjustavel from "../../ValorAjustavel";
import { formatarDataSegura, formatarMoeda, selecionarTextoAoFocar, formatarEntradaDataBR, labelStatusParcelaCalculado, classeStatusParcela } from "../../utils";
import { Plus, Save, Trash2 } from "lucide-react";
import type { ParcelaCliente } from "../../types";

// Aba "financeiro" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaFinanceiro {
  abrirLiquidacaoParcela: (parcela: any) => void;
  carregando: boolean;
  deletarRegistroPMIS: (tabela: string, id: any) => Promise<void>;
  novaParcelaCliente: any;
  parcelasCliente: ParcelaCliente[];
  podeEditarObraSelecionada: boolean;
  reabrirParcelaCliente: (parcela: any) => Promise<void>;
  saldoReceberParcelas: number;
  salvarParcelaCliente: () => Promise<void>;
  setNovaParcelaCliente: Dispatch<any>;
  totalPrevistoParcelas: number;
  totalRealizadoParcelas: number;
  totalVendaGeral: number;
  valorDistribuidoExcedente: number;
  valorRestanteDistribuirPositivo: number;
}

export default function AbaFinanceiro({
  abrirLiquidacaoParcela,
  carregando,
  deletarRegistroPMIS,
  novaParcelaCliente,
  parcelasCliente,
  podeEditarObraSelecionada,
  reabrirParcelaCliente,
  saldoReceberParcelas,
  salvarParcelaCliente,
  setNovaParcelaCliente,
  totalPrevistoParcelas,
  totalRealizadoParcelas,
  totalVendaGeral,
  valorDistribuidoExcedente,
  valorRestanteDistribuirPositivo,
}: PropsAbaFinanceiro) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Venda Total Prevista
          </p>
          <ValorAjustavel className="text-2xl font-bold text-slate-800">
            {formatarMoeda(totalVendaGeral)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Total Recebido
          </p>
          <ValorAjustavel className="text-2xl font-bold text-emerald-700">
            {formatarMoeda(totalRealizadoParcelas)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Saldo a Receber
          </p>
          <ValorAjustavel className="text-2xl font-bold text-amber-700">
            {formatarMoeda(Math.max(saldoReceberParcelas, 0))}
          </ValorAjustavel>
        </div>
        <div
          className={`bg-white p-5 rounded-xl shadow-sm border ${valorDistribuidoExcedente > 0 ? "border-red-200 bg-red-50" : ""}`}
        >
          <p className="text-xs text-slate-400 font-bold uppercase">
            Falta Distribuir
          </p>
          <p
            className={`text-2xl font-bold ${valorDistribuidoExcedente > 0 ? "text-red-600" : "text-blue-700"}`}
          >
            {valorDistribuidoExcedente > 0
              ? `-${formatarMoeda(valorDistribuidoExcedente)}`
              : formatarMoeda(valorRestanteDistribuirPositivo)}
          </p>
        </div>
      </div>

      {podeEditarObraSelecionada && (
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Plus size={18} /> Nova Parcela / Recebimento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              placeholder="Descrição"
              value={novaParcelaCliente.descricao}
              onChange={(e) =>
                setNovaParcelaCliente({
                  ...novaParcelaCliente,
                  descricao: e.target.value,
                })
              }
              className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              maxLength={10}
              value={novaParcelaCliente.data_prevista}
              onFocus={selecionarTextoAoFocar}
              onChange={(e) =>
                setNovaParcelaCliente({
                  ...novaParcelaCliente,
                  data_prevista: formatarEntradaDataBR(
                    e.target.value,
                  ),
                })
              }
              className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor previsto"
              value={novaParcelaCliente.valor_previsto}
              onChange={(e) =>
                setNovaParcelaCliente({
                  ...novaParcelaCliente,
                  valor_previsto: e.target.value,
                })
              }
              className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <input
              placeholder="Observação"
              value={novaParcelaCliente.observacao || ""}
              onChange={(e) =>
                setNovaParcelaCliente({
                  ...novaParcelaCliente,
                  observacao: e.target.value,
                })
              }
              className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <button
              onClick={salvarParcelaCliente}
              disabled={carregando}
              className="bg-[#2A6377] text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Save size={16} /> Salvar
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 border rounded-lg p-3">
              <span className="text-slate-400 font-bold uppercase text-xs block">
                Venda total
              </span>
              <span className="font-bold text-slate-700">
                {formatarMoeda(totalVendaGeral)}
              </span>
            </div>
            <div className="bg-slate-50 border rounded-lg p-3">
              <span className="text-slate-400 font-bold uppercase text-xs block">
                Já distribuído
              </span>
              <span className="font-bold text-slate-700">
                {formatarMoeda(totalPrevistoParcelas)}
              </span>
            </div>
            <div
              className={`${valorDistribuidoExcedente > 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"} border rounded-lg p-3`}
            >
              <span className="text-slate-400 font-bold uppercase text-xs block">
                Falta distribuir
              </span>
              <span
                className={`font-bold ${valorDistribuidoExcedente > 0 ? "text-red-600" : "text-blue-700"}`}
              >
                {valorDistribuidoExcedente > 0
                  ? `Excedeu ${formatarMoeda(valorDistribuidoExcedente)}`
                  : formatarMoeda(valorRestanteDistribuirPositivo)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() =>
                setNovaParcelaCliente({
                  ...novaParcelaCliente,
                  valor_previsto: String(
                    valorRestanteDistribuirPositivo.toFixed(2),
                  ),
                })
              }
              className="text-xs font-bold text-[#2A6377] bg-[#2A6377]/10 px-3 py-2 rounded-lg hover:bg-[#2A6377]/20 transition"
            >
              Usar saldo restante
            </button>
            <p className="text-xs text-slate-400">
              A data é digitada no formato dd/mm/aaaa para evitar o
              problema do seletor nativo de data no StackBlitz.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg">Pagamentos Cliente</h3>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm min-w-[780px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3">Data Prevista</th>
                <th className="p-3">Valor Previsto</th>
                <th className="p-3">Data Recebimento</th>
                <th className="p-3">Valor Recebido</th>
                <th className="p-3">Status</th>
                {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {parcelasCliente.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-500"
                  >
                    Nenhuma parcela cadastrada.
                  </td>
                </tr>
              ) : (
                parcelasCliente.map((parcela) => (
                  <tr
                    key={parcela.id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium">
                      <div>{parcela.descricao}</div>
                      {parcela.observacao && (
                        <div className="text-xs text-slate-400 font-normal mt-1">
                          {parcela.observacao}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {formatarDataSegura(parcela.data_prevista)}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {formatarMoeda(parcela.valor_previsto)}
                    </td>
                    <td className="p-3 text-center">
                      {parcela.data_realizada
                        ? formatarDataSegura(parcela.data_realizada)
                        : "-"}
                    </td>
                    <td className="p-3 text-center font-medium">
                      {Number(parcela.valor_realizado || 0) > 0
                        ? formatarMoeda(parcela.valor_realizado)
                        : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusParcela(parcela)}`}
                      >
                        {labelStatusParcelaCalculado(parcela)}
                      </span>
                    </td>
                    {podeEditarObraSelecionada && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              abrirLiquidacaoParcela(parcela)
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-xs font-bold hover:bg-[#1e4857] transition"
                          >
                            {Number(parcela.valor_realizado || 0) > 0
                              ? "Editar"
                              : "Liquidar"}
                          </button>
                          {Number(parcela.valor_realizado || 0) >
                            0 && (
                            <button
                              onClick={() =>
                                reabrirParcelaCliente(parcela)
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                            >
                              Reabrir
                            </button>
                          )}
                          <button
                            onClick={() =>
                              deletarRegistroPMIS(
                                "parcelas_cliente",
                                parcela.id,
                              )
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
