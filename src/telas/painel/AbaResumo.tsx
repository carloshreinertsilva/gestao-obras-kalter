import ValorAjustavel from "../../ValorAjustavel";
import { formatarMoeda, labelFase } from "../../utils";
import { BookOpen, Activity } from "lucide-react";
import type { CronogramaObra, DocumentoProjeto, Obra } from "../../types";

// Aba "resumo" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaResumo {
  cronogramaObra: CronogramaObra[];
  documentosConcluidos: number;
  documentosProjeto: DocumentoProjeto[];
  fasesConcluidas: number;
  obraEcoSelecionada: Obra;
  parcelasVencidas: number;
  percentualCronograma: number;
  percentualDocumentos: number;
  saldoReceberParcelas: number;
  totalRealizadoParcelas: number;
  totalVendaGeral: number;
}

export default function AbaResumo({
  cronogramaObra,
  documentosConcluidos,
  documentosProjeto,
  fasesConcluidas,
  obraEcoSelecionada,
  parcelasVencidas,
  percentualCronograma,
  percentualDocumentos,
  saldoReceberParcelas,
  totalRealizadoParcelas,
  totalVendaGeral,
}: PropsAbaResumo) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Venda Total
          </p>
          <ValorAjustavel className="text-2xl font-bold text-slate-800 mt-1">
            {formatarMoeda(totalVendaGeral)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Recebido
          </p>
          <ValorAjustavel className="text-2xl font-bold text-emerald-700 mt-1">
            {formatarMoeda(totalRealizadoParcelas)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Cronograma
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {percentualCronograma}%
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-red-500">
          <p className="text-xs text-slate-400 font-bold uppercase">
            Parcelas Vencidas
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {parcelasVencidas}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-[#2A6377]" />{" "}
            Descrição do Projeto
          </h3>
          <p className="text-slate-700 whitespace-pre-wrap min-h-[80px]">
            {obraEcoSelecionada.descricao ||
              "Nenhum descritivo cadastrado para esta obra."}
          </p>
          {obraEcoSelecionada.observacoes && (
            <div className="mt-4 bg-slate-50 p-3 rounded-lg border text-sm text-slate-600">
              <strong>Observações:</strong>
              <br />
              {obraEcoSelecionada.observacoes}
            </div>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Activity size={18} className="text-[#2A6377]" />{" "}
            Indicadores Gerais
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center border-b pb-2">
              <span>Documentos concluídos</span>
              <span className="font-bold">
                {documentosConcluidos}/{documentosProjeto.length} (
                {percentualDocumentos}%)
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Fases concluídas</span>
              <span className="font-bold">
                {fasesConcluidas}/{cronogramaObra.length} (
                {percentualCronograma}%)
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span>Saldo a receber</span>
              <span className="font-bold text-amber-700">
                {formatarMoeda(Math.max(saldoReceberParcelas, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Fase atual</span>
              <span className="font-bold text-[#2A6377]">
                {labelFase(
                  obraEcoSelecionada.fase_atual || "processo_inicial",
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
