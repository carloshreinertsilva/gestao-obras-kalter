import { X } from "lucide-react";
import { formatarMoeda } from "./utils";

// Alerta de verba da familia (robo: sync_projecao_sma.py): material solicitado na SMA e
// ainda nao comprado ("a caminho") comparado com a verba disponivel (previsoes em aberto).
export type NivelAlertaFamilia = "ok" | "atencao" | "critico" | "zerada" | "sem_verba";

export interface AlertaFamilia {
  codigo_projeto: string;
  nivel: NivelAlertaFamilia;
  disponivel: number;
  a_caminho: number;
  itens_sem_preco: number;
  pct_projetado: number | null;
}

export interface ItemSmaACaminho {
  id: string;
  codigo_projeto: string;
  nr_sma: number;
  codigo_material: string | null;
  descricao_material: string | null;
  quantidade_pendente: number;
  situacao_compra: string;
  preco_unitario: number | null;
  origem_preco: string | null;
  valor: number;
}

const SELO: Record<string, { rotulo: string; classe: string; dica: string }> = {
  atencao: { rotulo: "80%", classe: "bg-amber-50 text-amber-700 border-amber-200", dica: "Material solicitado na SMA usa 80% ou mais da verba disponível" },
  critico: { rotulo: "90%", classe: "bg-orange-50 text-orange-700 border-orange-200", dica: "Material solicitado na SMA usa 90% ou mais da verba disponível" },
  zerada: { rotulo: "Verba zerada", classe: "bg-red-50 text-red-700 border-red-200", dica: "Material solicitado na SMA custa mais que a verba disponível" },
  sem_verba: { rotulo: "Sem verba", classe: "bg-red-50 text-red-700 border-red-200", dica: "Há material solicitado na SMA e a família não tem verba disponível" },
};

export function SeloAlertaFamilia({ nivel }: { nivel?: string | null }) {
  const s = nivel ? SELO[nivel] : undefined;
  if (!s) return null;
  return (
    <span title={s.dica} className={`ml-1.5 inline-block px-1.5 py-0.5 rounded border text-[10px] font-bold align-middle whitespace-nowrap ${s.classe}`}>
      {s.rotulo}
    </span>
  );
}

const ORIGEM: Record<string, string> = { cotacao: "Cotação", custo_medio: "Custo médio", ultima_compra: "Última compra" };

export function ModalItensSma({
  familia,
  descricao,
  alerta,
  itens,
  onFechar,
  onSolicitar,
}: {
  familia: string;
  descricao?: string | null;
  alerta?: AlertaFamilia;
  itens: ItemSmaACaminho[];
  onFechar: () => void;
  onSolicitar?: () => void;
}) {
  const total = itens.reduce((a, i) => a + Number(i.valor || 0), 0);
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Material a caminho · {familia}
              {descricao ? ` - ${descricao}` : ""}
              <SeloAlertaFamilia nivel={alerta?.nivel} />
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Solicitado na SMA e ainda sem pedido de compra, avaliado pelo preço provável. Total{" "}
              <b>{formatarMoeda(total)}</b>
              {alerta ? (
                <>
                  {" "}· verba disponível <b>{formatarMoeda(alerta.disponivel)}</b>
                  {alerta.pct_projetado != null ? ` (${Number(alerta.pct_projetado).toLocaleString("pt-BR")}% usados)` : ""}
                </>
              ) : null}
              .
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Material</th>
                <th className="px-3 py-2 text-center">SMA</th>
                <th className="px-3 py-2 text-right">Qtd. pendente</th>
                <th className="px-3 py-2 text-right">Preço unit.</th>
                <th className="px-3 py-2 text-left">Origem do preço</th>
                <th className="px-3 py-2 text-left">Compra</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-3 py-2">
                    <span className="text-slate-400 text-xs">{i.codigo_material}</span> {i.descricao_material}
                  </td>
                  <td className="px-3 py-2 text-center">{i.nr_sma}</td>
                  <td className="px-3 py-2 text-right">{Number(i.quantidade_pendente).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {i.preco_unitario == null ? <span className="text-red-600 font-semibold">sem preço</span> : formatarMoeda(i.preco_unitario)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{i.origem_preco ? ORIGEM[i.origem_preco] || i.origem_preco : "-"}</td>
                  <td className="px-3 py-2 text-slate-500">{i.situacao_compra === "em_cotacao" ? "Em cotação" : "Não iniciada"}</td>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatarMoeda(i.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t flex justify-between items-center gap-2">
          <p className="text-xs text-slate-400">
            Preço: cotação (quando já cotado), senão último custo médio, senão última compra. Itens sem preço não entram na conta.
          </p>
          {onSolicitar && (
            <button onClick={onSolicitar} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#2A6377] text-white hover:bg-[#1e4857] shrink-0">
              Solicitar previsão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
