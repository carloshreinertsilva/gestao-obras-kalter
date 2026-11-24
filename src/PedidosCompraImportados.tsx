import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "./supabase";
import EntradaArquivos from "./EntradaArquivos";
import { useAviso } from "./aviso";
import { useDialogos } from "./Dialogos";
import { mensagemErro } from "./erros";
import { formatarMoeda } from "./utils";
import { lerCotacao, type PreviaCotacao } from "./pedidoCompraMd";

// Pedidos de compra a partir do MD da cotacao (Painel BeeStock). Logistica e admin importam; o robo do servidor
// (robo-sync-erp/src/sync_pedidos_compra.py) simula no ERP e devolve: pronto, aguardando previsao (o gestor e os
// assistentes sao avisados todo dia) ou erro. Tabela pedidos_compra_importados (supabase/pendentes/p22).
// Fase 1: o robo so simula; o pedido ainda nao e gravado no ERP.

interface Falta {
  familia: string;
  aberto: string;
  necessario: string;
  falta: string;
}

interface Importacao {
  id: string;
  created_at: string;
  nome_arquivo: string;
  nome_importador: string | null;
  status: string;
  mensagem: string | null;
  fornecedor: number | null;
  nome_fornecedor: string | null;
  total: number | null;
  scs: number[];
  familias: string[];
  faltas: Falta[] | null;
  simulado_em: string | null;
  pedidos: { numero?: number }[] | null;
  motivo_cancelamento: string | null;
}

const STATUS: Record<string, { rotulo: string; classe: string; Icone: typeof Clock }> = {
  simulando: { rotulo: "Conferindo no ERP", classe: "bg-slate-50 text-slate-600 border-slate-200", Icone: Clock },
  aguardando_previsao: { rotulo: "Aguardando previsão", classe: "bg-amber-50 text-amber-700 border-amber-200", Icone: AlertTriangle },
  pronto: { rotulo: "Pronto para gerar", classe: "bg-blue-50 text-blue-700 border-blue-200", Icone: CheckCircle2 },
  gerando: { rotulo: "Gerando pedido", classe: "bg-blue-50 text-blue-700 border-blue-200", Icone: Loader2 },
  gerado: { rotulo: "Pedido gerado", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", Icone: CheckCircle2 },
  erro: { rotulo: "Erro", classe: "bg-red-50 text-red-700 border-red-200", Icone: XCircle },
  cancelado: { rotulo: "Cancelado", classe: "bg-slate-50 text-slate-500 border-slate-200", Icone: XCircle },
};

const VIVOS = ["simulando", "aguardando_previsao", "pronto", "gerando", "erro"];

function dataHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-";
}

export default function PedidosCompraImportados() {
  const aviso = useAviso();
  const { confirmar, pedirMotivo } = useDialogos();
  const [disponivel, setDisponivel] = useState(true);
  const [podeImportar, setPodeImportar] = useState(false);
  const [lista, setLista] = useState<Importacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [verTodas, setVerTodas] = useState(false);
  const [arquivo, setArquivo] = useState<{ nome: string; texto: string; previa: PreviaCotacao } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    let q = supabase
      .from("pedidos_compra_importados")
      .select("id, created_at, nome_arquivo, nome_importador, status, mensagem, fornecedor, nome_fornecedor, total, scs, familias, faltas, simulado_em, pedidos, motivo_cancelamento")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!verTodas) q = q.in("status", VIVOS);
    return q.then(({ data, error }) => {
      // erro = tabela ainda nao criada no banco (p22 pendente): o bloco simplesmente nao aparece
      if (error) setDisponivel(false);
      else setLista((data as Importacao[]) || []);
      setCarregando(false);
    });
  }, [verTodas]);

  useEffect(() => {
    carregar();
    supabase.rpc("pc_pode_importar").then(({ data }) => setPodeImportar(Boolean(data)));
    // o robo atualiza a cada rodada (5 min); recarrega sozinho enquanto a tela esta aberta
    const t = window.setInterval(carregar, 60000);
    return () => window.clearInterval(t);
  }, [carregar]);

  async function escolher(arquivos: File[]) {
    const f = arquivos[0];
    const texto = await f.text();
    setArquivo({ nome: f.name, texto, previa: lerCotacao(texto) });
  }

  async function enviar() {
    if (!arquivo) return;
    setEnviando(true);
    const { error } = await supabase.rpc("pc_importar", { p_nome_arquivo: arquivo.nome, p_conteudo: arquivo.texto });
    setEnviando(false);
    if (error) {
      aviso.erro(mensagemErro(error, "Não foi possível importar a cotação."));
      return;
    }
    aviso.sucesso("Cotação enviada. O robô confere no ERP em até 5 minutos.");
    setArquivo(null);
    carregar();
  }

  async function cancelar(i: Importacao) {
    const motivo = await pedirMotivo({ titulo: "Cancelar esta importação?", rotuloConfirmar: "Cancelar importação", perigo: true, obrigatorio: false });
    if (motivo === null) return;
    const { error } = await supabase.rpc("pc_cancelar", { p_id: i.id, p_motivo: motivo });
    if (error) aviso.erro(mensagemErro(error));
    else carregar();
  }

  async function reenviar(i: Importacao) {
    const ok = await confirmar({
      titulo: "Conferir de novo no ERP?",
      texto: "Use depois de corrigir no ERP o que causou o erro (ex.: a SC foi reaberta). Se a cotação mudou, importe o arquivo novo.",
      rotuloConfirmar: "Conferir de novo",
    });
    if (!ok) return;
    const { error } = await supabase.rpc("pc_reenviar", { p_id: i.id });
    if (error) aviso.erro(mensagemErro(error));
    else carregar();
  }

  if (!disponivel) return null;
  const previa = arquivo?.previa;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h3 className="font-bold text-lg">Pedidos de compra (cotações aprovadas)</h3>
          <p className="text-xs text-slate-500">
            Importe o arquivo .md da cotação do Painel. O robô confere no ERP: se a previsão da família cobrir, o pedido fica pronto; se faltar,
            o gestor e os assistentes da obra são avisados todo dia.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <label className="flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={verTodas} onChange={(e) => setVerTodas(e.target.checked)} /> Ver concluídas
          </label>
          {podeImportar && !arquivo && <EntradaArquivos onArquivos={escolher} accept=".md,.txt,text/markdown,text/plain" multiplo={false} camera={false} colar={false} maxMb={1} rotulo="Importar cotação (.md)…" />}
        </div>
      </div>

      {arquivo && previa && (
        <div className="p-4 border-b bg-slate-50 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <FileText size={16} className="text-slate-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 break-words">{previa.titulo || arquivo.nome}</p>
              <p className="text-xs text-slate-500">
                Fornecedor {previa.fornecedores.join(", ") || "-"} · {previa.itens.length} SC(s) · frete {previa.frete === "2" ? "CIF" : previa.frete === "1" ? "FOB" : "-"} · previsão{" "}
                {previa.previsao ? "sim" : "não"} · total <strong>{formatarMoeda(previa.total)}</strong>
              </p>
            </div>
          </div>
          {previa.problemas.length > 0 && (
            <ul className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 list-disc pl-6">
              {previa.problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto max-h-[40vh] border rounded-lg bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left">SC</th>
                  <th className="px-3 py-1.5 text-left">Material</th>
                  <th className="px-3 py-1.5 text-right">Qtd</th>
                  <th className="px-3 py-1.5 text-right">Preço</th>
                  <th className="px-3 py-1.5 text-right">IPI</th>
                  <th className="px-3 py-1.5 text-center">Entrega</th>
                  <th className="px-3 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {previa.itens.map((i) => (
                  <tr key={i.sc} className="border-t">
                    <td className="px-3 py-1.5">{i.sc}</td>
                    <td className="px-3 py-1.5">{i.material}</td>
                    <td className="px-3 py-1.5 text-right">
                      {i.qtde.toLocaleString("pt-BR")} {i.un}
                    </td>
                    <td className="px-3 py-1.5 text-right">{i.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                    <td className="px-3 py-1.5 text-right">{i.ipi.toLocaleString("pt-BR")}%</td>
                    <td className="px-3 py-1.5 text-center">{i.entrega.split("-").reverse().join("/")}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{formatarMoeda(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={() => setArquivo(null)} className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-white">
              Descartar
            </button>
            <button
              onClick={enviar}
              disabled={enviando || previa.problemas.length > 0}
              className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white font-semibold disabled:opacity-50 flex items-center gap-1"
              title={previa.problemas.length ? "Corrija o arquivo antes de enviar" : "A cotação já é a aprovada: enviar autoriza gerar o pedido"}
            >
              {enviando && <Loader2 size={14} className="animate-spin" />} Enviar para gerar
            </button>
          </div>
        </div>
      )}

      {carregando ? (
        <p className="p-4 text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Carregando…
        </p>
      ) : lista.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">{verTodas ? "Nenhuma cotação importada." : "Nenhuma cotação em andamento."}</p>
      ) : (
        <ul className="divide-y">
          {lista.map((i) => {
            const st = STATUS[i.status] || STATUS.simulando;
            return (
              <li key={i.id} className="p-3 text-sm space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 break-words">
                      {i.nome_fornecedor ? `${i.fornecedor} - ${i.nome_fornecedor}` : i.nome_arquivo}
                    </p>
                    <p className="text-xs text-slate-500">
                      {i.familias.length ? i.familias.join(", ") + " · " : ""}
                      {i.scs.length ? `${i.scs.length} SC(s) · ` : ""}
                      {i.total != null ? formatarMoeda(i.total) + " · " : ""}importado por {i.nome_importador || "-"} em {dataHora(i.created_at)}
                      {i.simulado_em && ` · conferido no ERP em ${dataHora(i.simulado_em)}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap flex items-center gap-1 ${st.classe}`}>
                    <st.Icone size={12} className={i.status === "gerando" ? "animate-spin" : ""} /> {st.rotulo}
                  </span>
                </div>
                {i.status === "aguardando_previsao" && i.faltas && (
                  <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-0.5">
                    {i.faltas.map((f) => (
                      <li key={f.familia}>
                        <strong>{f.familia}</strong>: aberto {formatarMoeda(Number(f.aberto))}, pedido {formatarMoeda(Number(f.necessario))} —{" "}
                        <strong>faltam {formatarMoeda(Number(f.falta))}</strong>. O gestor da obra decide o aumento ou a transferência.
                      </li>
                    ))}
                  </ul>
                )}
                {i.status === "pronto" && (
                  <p className="text-xs text-blue-700">A previsão cobre. A geração automática do pedido no ERP ainda não está ligada.</p>
                )}
                {i.status === "erro" && i.mensagem && <p className="text-xs text-red-700 break-words">{i.mensagem}</p>}
                {i.status === "cancelado" && i.motivo_cancelamento && <p className="text-xs text-slate-500">Motivo: {i.motivo_cancelamento}</p>}
                {podeImportar && ["simulando", "aguardando_previsao", "pronto", "erro"].includes(i.status) && (
                  <div className="flex gap-3 text-xs">
                    {i.status === "erro" && (
                      <button onClick={() => reenviar(i)} className="text-[#2A6377] font-semibold hover:underline flex items-center gap-1">
                        <RefreshCw size={12} /> Conferir de novo
                      </button>
                    )}
                    <button onClick={() => cancelar(i)} className="text-red-600 font-semibold hover:underline">
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
