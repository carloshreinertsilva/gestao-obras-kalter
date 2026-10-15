import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  Paperclip,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, formatarMoeda, normalizarNomeArquivo } from "./utils";
import type { Usuario } from "./types";

// Solicitacao de faturamento (2026-10-15): gestor pede -> logistica (flag aprova_faturamento)
// confere e informa o transporte -> fiscal (perfil "fiscal") emite a NF no ERP -> o robo liga a NF.
// Toda gravacao passa pelas funcoes do banco (faturamento_salvar, faturamento_logistica_aprovar,
// faturamento_devolver, faturamento_cancelar), que validam saldo, etapa e permissao.

export type StatusSolicitacaoFaturamento =
  | "rascunho"
  | "aguardando_logistica"
  | "devolvida"
  | "aguardando_fiscal"
  | "faturada_parcial"
  | "faturada"
  | "cancelada";

export interface SolicitacaoFaturamento {
  id: string;
  numero: number;
  id_obra: string;
  codigo_obra: string;
  tipo: "produto" | "servico";
  status: StatusSolicitacaoFaturamento;
  data_desejada: string | null;
  observacao: string | null;
  anexos: { nome: string; caminho: string; tamanho: number }[];
  valor_solicitado: number;
  valor_aprovado: number | null;
  id_solicitante: string | null;
  nome_solicitante: string | null;
  enviado_em: string | null;
  nome_aprovador: string | null;
  aprovado_em: string | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  volumes: number | null;
  especie_volumes: string | null;
  codigo_transportadora: number | null;
  transportadora: string | null;
  observacao_logistica: string | null;
  motivo_devolucao: string | null;
  devolvido_em: string | null;
  nome_devolveu: string | null;
  motivo_cancelamento: string | null;
  faturado_em: string | null;
  created_at: string;
  romaneios?: Pick<RomaneioSolicitacao, "numero_romaneio" | "situacao" | "erro">[]; // so nas listas (SELECT_LISTA)
}

interface ItemSolicitacao {
  sequencia: number;
  codigo_material: string | null;
  descricao: string | null;
  codigo_familia: string | null;
  unidade: string | null;
  valor_unitario_ipi: number;
  quantidade_pedido: number;
  quantidade_solicitada: number;
  valor_solicitado: number;
  quantidade_aprovada: number | null;
  valor_aprovado: number | null;
  numero_nf: string | null;
  quantidade_faturada: number | null;
  valor_faturado: number | null;
  volumes: number | null;
}

// romaneio gerado no ERP pelo robo (sync_romaneios.py) quando a logistica aprova um faturamento de produto
interface RomaneioSolicitacao {
  id: string;
  situacao: "pendente" | "criado" | "faturado" | "cancelar" | "cancelado" | "descartado" | "erro";
  numero_romaneio: number | null;
  login_erp: string;
  erro: string | null;
  created_at: string;
}

const textoRomaneio: Record<RomaneioSolicitacao["situacao"], string> = {
  pendente: "sendo gerado no ERP (alguns minutos)",
  criado: "liberado para faturar no ERP",
  faturado: "faturado",
  cancelar: "sendo cancelado no ERP",
  cancelado: "cancelado no ERP",
  descartado: "descartado (não chegou a ser gerado)",
  erro: "erro",
};

interface ItemDisponivel {
  sequencia: number;
  codigo_material: string;
  descricao: string | null;
  codigo_familia: string | null;
  descricao_familia: string | null;
  unidade: string | null;
  quantidade_pedido: number;
  quantidade_faturada: number;
  saldo: number;
  valor_unitario_ipi: number;
  valor_pedido: number;
  valor_saldo: number;
}

const STATUS: Record<StatusSolicitacaoFaturamento, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-slate-100 text-slate-600 border-slate-200" },
  aguardando_logistica: { rotulo: "Aguardando logística", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  devolvida: { rotulo: "Devolvida para ajuste", classe: "bg-red-50 text-red-700 border-red-200" },
  aguardando_fiscal: { rotulo: "Aguardando fiscal", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  faturada_parcial: { rotulo: "Faturada em parte", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  faturada: { rotulo: "Faturada", classe: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  cancelada: { rotulo: "Cancelada", classe: "bg-slate-100 text-slate-500 border-slate-200" },
};

const EVENTO: Record<string, string> = {
  criada: "Criou a solicitação",
  enviada: "Enviou para a logística",
  aprovada: "Logística aprovou",
  devolvida: "Devolveu ao solicitante",
  devolvida_logistica: "Devolveu à logística",
  cancelada: "Cancelou",
  nf_vinculada: "NF emitida e ligada",
  lembrete: "Lembrete enviado",
  romaneio_criado: "Romaneio gerado no ERP",
  romaneio_cancelado: "Romaneio cancelado no ERP",
  romaneio_erro: "Erro no romaneio",
};

const num = (v: unknown) => Number(v || 0);
const fmtQtd = (v: unknown) => num(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const fmtPct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const fmtDataHora = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const arred4 = (v: number) => Math.round(v * 10000) / 10000;
const tipoTexto = (t: string) => (t === "produto" ? "Produto" : "Serviço");
const msgErro = (e: any) => String(e?.message || e || "Erro desconhecido.").replace(/^.*?ERROR:\s*/, "");

export const BadgeStatusFaturamento = ({ status }: { status: StatusSolicitacaoFaturamento }) => (
  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS[status]?.classe}`}>
    {STATUS[status]?.rotulo || status}
  </span>
);

// ------------------------------------------------------------------------------------------------
// Modal do gestor: escolhe itens do pedido com saldo (por % ou R$) e envia para a logistica
// ------------------------------------------------------------------------------------------------
function ModalSolicitarFaturamento({
  idObra,
  codigoObra,
  tipo,
  existente,
  onFechar,
  onSalvo,
}: {
  idObra: string;
  codigoObra: string;
  tipo: "produto" | "servico";
  existente?: { solicitacao: SolicitacaoFaturamento; itens: ItemSolicitacao[] } | null;
  onFechar: () => void;
  onSalvo: (id: string) => void;
}) {
  const [itens, setItens] = useState<ItemDisponivel[] | null>(null);
  const [qtd, setQtd] = useState<Record<number, number>>({});
  const [entrada, setEntrada] = useState<Record<number, { pct?: string; valor?: string }>>({});
  const [dataDesejada, setDataDesejada] = useState(existente?.solicitacao.data_desejada || "");
  const [observacao, setObservacao] = useState(existente?.solicitacao.observacao || "");
  const [anexos, setAnexos] = useState(existente?.solicitacao.anexos || []);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [pctTodos, setPctTodos] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase
      .rpc("sf_itens_disponiveis", { p_id_obra: idObra, p_tipo: tipo, p_ignorar: existente?.solicitacao.id ?? null })
      .then(({ data, error }) => {
        if (error) setErro(msgErro(error));
        setItens((data as ItemDisponivel[]) || []);
        if (existente) {
          const q: Record<number, number> = {};
          existente.itens.forEach((i) => (q[i.sequencia] = num(i.quantidade_solicitada)));
          setQtd(q);
        }
      });
  }, [idObra, tipo, existente]);

  const porFamilia = useMemo(() => {
    const mapa = new Map<string, ItemDisponivel[]>();
    (itens || []).forEach((i) => {
      const k = i.codigo_familia || "-";
      mapa.set(k, [...(mapa.get(k) || []), i]);
    });
    return [...mapa.entries()];
  }, [itens]);

  const valorDe = (i: ItemDisponivel) => Math.round(num(qtd[i.sequencia]) * num(i.valor_unitario_ipi) * 100) / 100;
  const total = (itens || []).reduce((a, i) => a + valorDe(i), 0);
  const nItens = (itens || []).filter((i) => num(qtd[i.sequencia]) > 0).length;

  const definirQtd = (i: ItemDisponivel, q: number) => {
    const limitado = Math.max(0, Math.min(arred4(q), num(i.saldo)));
    setQtd((p) => ({ ...p, [i.sequencia]: limitado }));
    return limitado;
  };
  const porPct = (i: ItemDisponivel, txt: string) => {
    setEntrada((p) => ({ ...p, [i.sequencia]: { pct: txt } }));
    const v = parseFloat(txt.replace(",", "."));
    definirQtd(i, Number.isFinite(v) ? (v / 100) * num(i.quantidade_pedido) : 0);
  };
  const porValor = (i: ItemDisponivel, txt: string) => {
    setEntrada((p) => ({ ...p, [i.sequencia]: { valor: txt } }));
    const v = parseFloat(txt.replace(/\./g, "").replace(",", "."));
    definirQtd(i, Number.isFinite(v) && num(i.valor_unitario_ipi) > 0 ? v / num(i.valor_unitario_ipi) : 0);
  };
  const saldoTotal = (lista: ItemDisponivel[]) => {
    const q: Record<number, number> = {};
    lista.forEach((i) => (q[i.sequencia] = num(i.saldo)));
    setQtd((p) => ({ ...p, ...q }));
    setEntrada((p) => {
      const n = { ...p };
      lista.forEach((i) => delete n[i.sequencia]);
      return n;
    });
  };
  const aplicarPctTodos = () => {
    const v = parseFloat(pctTodos.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    const q: Record<number, number> = {};
    (itens || []).forEach((i) => (q[i.sequencia] = Math.min(arred4((v / 100) * num(i.quantidade_pedido)), num(i.saldo))));
    setQtd(q);
    setEntrada({});
  };

  const escolherArquivos = (lista: FileList | null) => {
    const novos = [...arquivos, ...Array.from(lista || [])];
    const grande = novos.find((f) => f.size > 10 * 1024 * 1024);
    if (grande) return setErro(`O arquivo ${grande.name} passa de 10 MB.`);
    if (novos.length + anexos.length > 5) return setErro("Anexe no máximo 5 arquivos.");
    setErro("");
    setArquivos(novos);
  };

  const salvar = async (enviar: boolean) => {
    setErro("");
    if (nItens === 0) return setErro("Informe o % ou o valor de ao menos um item.");
    if (enviar && !dataDesejada) return setErro("Informe a data desejada de faturamento.");
    setEnviando(true);
    const enviados: string[] = [];
    try {
      const novosAnexos = [...anexos];
      for (const arq of arquivos) {
        const caminho = `obras/${idObra}/faturamento/${Date.now()}_${normalizarNomeArquivo(arq.name)}`;
        const { error } = await supabase.storage.from("previsao-anexos").upload(caminho, arq);
        if (error) throw new Error(`Não foi possível enviar o anexo ${arq.name}: ${error.message}`);
        enviados.push(caminho);
        novosAnexos.push({ nome: arq.name, caminho, tamanho: arq.size });
      }
      const { data, error } = await supabase.rpc("faturamento_salvar", {
        p_id: existente?.solicitacao.id ?? null,
        p_id_obra: idObra,
        p_tipo: tipo,
        p_data_desejada: dataDesejada || null,
        p_observacao: observacao,
        p_itens: (itens || []).filter((i) => num(qtd[i.sequencia]) > 0).map((i) => ({ sequencia: i.sequencia, quantidade: qtd[i.sequencia] })),
        p_enviar: enviar,
        p_anexos: novosAnexos,
      });
      if (error) throw error;
      onSalvo(data as string);
    } catch (e) {
      if (enviados.length) await supabase.storage.from("previsao-anexos").remove(enviados);
      setErro(msgErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              {existente ? `Editar solicitação SF ${existente.solicitacao.numero}` : "Solicitar faturamento"} · {tipoTexto(tipo)}
            </h3>
            <p className="text-xs text-slate-400">
              Obra {codigoObra} · itens do pedido de {tipo === "produto" ? "produto" : "serviço"} com saldo a faturar. Informe o % (do total do item) ou o valor.
            </p>
            {existente?.solicitacao.status === "devolvida" && existente.solicitacao.motivo_devolucao && (
              <p className="mt-2 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                <b>Devolvida por {existente.solicitacao.nome_devolveu}:</b> {existente.solicitacao.motivo_devolucao}
              </p>
            )}
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {itens === null ? (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Carregando itens do pedido...
            </p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 border rounded-lg p-4">
              Nenhum item de {tipo === "produto" ? "produto" : "serviço"} com saldo a faturar nesta obra (ou o saldo já está em outras solicitações abertas).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-500">Aplicar em todos:</span>
                <input
                  value={pctTodos}
                  onChange={(e) => setPctTodos(e.target.value)}
                  placeholder="%"
                  className="border rounded-lg px-2 py-1 w-20 text-right"
                />
                <button onClick={aplicarPctTodos} className="px-3 py-1 rounded-lg border hover:bg-slate-50 font-semibold text-slate-600">
                  Aplicar %
                </button>
                <button onClick={() => saldoTotal(itens)} className="px-3 py-1 rounded-lg border hover:bg-slate-50 font-semibold text-slate-600">
                  Saldo total de tudo
                </button>
                <button
                  onClick={() => {
                    setQtd({});
                    setEntrada({});
                  }}
                  className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  Limpar
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-[13px] min-w-[820px]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Seq.</th>
                      <th className="px-3 py-2 text-left">Item do pedido</th>
                      <th className="px-3 py-2 text-right">Pedido</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-center w-24">%</th>
                      <th className="px-3 py-2 text-center w-36">Valor (R$)</th>
                      <th className="px-3 py-2 text-right">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porFamilia.map(([fam, lista]) => (
                      <FragmentoFamilia key={fam} familia={fam} descricao={lista[0]?.descricao_familia} onSaldo={() => saldoTotal(lista)}>
                        {lista.map((i) => {
                          const q = num(qtd[i.sequencia]);
                          const pct = num(i.quantidade_pedido) > 0 ? (q / num(i.quantidade_pedido)) * 100 : 0;
                          const ent = entrada[i.sequencia] || {};
                          return (
                            <tr key={i.sequencia} className={`border-t ${q > 0 ? "bg-blue-50/40" : ""}`}>
                              <td className="px-3 py-2 text-slate-500">{i.sequencia}</td>
                              <td className="px-3 py-2">
                                <span className="font-semibold">{i.codigo_material}</span>
                                <span className="block text-[11px] text-slate-500">{i.descricao}</span>
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {formatarMoeda(i.valor_pedido)}
                                <span className="block text-[11px] text-slate-400">
                                  {fmtQtd(i.quantidade_pedido)} {i.unidade}
                                  {num(i.quantidade_faturada) > 0 && ` · faturado ${fmtQtd(i.quantidade_faturada)}`}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap text-amber-700 font-semibold">
                                {formatarMoeda(i.valor_saldo)}
                                <span className="block text-[11px] text-slate-400 font-normal">{fmtPct((num(i.saldo) / num(i.quantidade_pedido)) * 100)}</span>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={ent.pct ?? (q > 0 ? String(Math.round(pct * 100) / 100).replace(".", ",") : "")}
                                  onChange={(e) => porPct(i, e.target.value)}
                                  className="border rounded px-2 py-1 w-full text-right"
                                  inputMode="decimal"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <input
                                    value={ent.valor ?? (q > 0 ? valorDe(i).toFixed(2).replace(".", ",") : "")}
                                    onChange={(e) => porValor(i, e.target.value)}
                                    className="border rounded px-2 py-1 w-full text-right"
                                    inputMode="decimal"
                                  />
                                  <button
                                    title="Faturar o saldo todo deste item"
                                    onClick={() => saldoTotal([i])}
                                    className="text-[10px] font-bold px-1.5 rounded border text-slate-500 hover:bg-slate-50"
                                  >
                                    tudo
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {q > 0 ? (
                                  <>
                                    {fmtQtd(q)} {i.unidade}
                                    <span className="block text-[11px] text-slate-400">{formatarMoeda(valorDe(i))}</span>
                                    {ent.valor !== undefined &&
                                      Math.abs(valorDe(i) - parseFloat(ent.valor.replace(/\./g, "").replace(",", ".") || "0")) >= 0.01 && (
                                        <span
                                          className="block text-[10px] text-amber-700"
                                          title="O ERP trabalha com 4 casas decimais na quantidade; o valor é o mais próximo possível do digitado"
                                        >
                                          ajustado (qtd. com 4 casas)
                                        </span>
                                      )}
                                  </>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </FragmentoFamilia>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Faturar até *</label>
              <input type="date" value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} className="border rounded-lg px-3 py-2 w-full" />
              <p className="text-[11px] text-slate-400 mt-1">Lembretes diários começam 3 dias antes.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Observação para logística e fiscal</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={2}
                className="border rounded-lg px-3 py-2 w-full text-sm"
                placeholder="Ex.: entrega parcial do skid, faturar junto com..."
              />
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
              <Paperclip size={15} /> Anexar romaneio, fotos, aceite...
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  escolherArquivos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <ul className="mt-2 space-y-1">
              {anexos.map((a, k) => (
                <li key={a.caminho} className="text-xs text-slate-600 flex items-center gap-2">
                  <Paperclip size={12} /> {a.nome}
                  <button onClick={() => setAnexos((p) => p.filter((_, j) => j !== k))} className="text-red-500">
                    <X size={13} />
                  </button>
                </li>
              ))}
              {arquivos.map((a, k) => (
                <li key={k} className="text-xs text-slate-600 flex items-center gap-2">
                  <Paperclip size={12} /> {a.name} <span className="text-slate-400">(novo)</span>
                  <button onClick={() => setArquivos((p) => p.filter((_, j) => j !== k))} className="text-red-500">
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex flex-col md:flex-row md:items-center gap-3 justify-between bg-slate-50/60 rounded-b-xl">
          <div>
            <p className="text-xs text-slate-500">{nItens} item(ns) · {tipoTexto(tipo)} · valor com IPI</p>
            <p className="text-2xl font-bold text-slate-800">{formatarMoeda(total)}</p>
            {erro && <p className="text-sm text-red-600 mt-1">{erro}</p>}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button disabled={enviando} onClick={() => salvar(false)} className="px-4 py-2 rounded-lg border font-semibold text-slate-600 hover:bg-white disabled:opacity-60">
              Salvar rascunho
            </button>
            <button
              disabled={enviando}
              onClick={() => salvar(true)}
              className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {enviando ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Enviar para a logística
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FragmentoFamilia({
  familia,
  descricao,
  onSaldo,
  children,
}: {
  familia: string;
  descricao?: string | null;
  onSaldo: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="bg-slate-100/70 border-t">
        <td colSpan={7} className="px-3 py-1.5 text-[12px] font-bold text-slate-600">
          Família {familia}
          {descricao ? ` – ${descricao}` : ""}
          <button onClick={onSaldo} className="ml-3 text-[11px] font-bold text-[#2A6377] hover:underline">
            faturar saldo da família
          </button>
        </td>
      </tr>
      {children}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Conferencia da logistica: quantidades aprovadas + transporte
// ------------------------------------------------------------------------------------------------
function ModalConferencia({
  solicitacao,
  itens,
  onFechar,
  onFeito,
}: {
  solicitacao: SolicitacaoFaturamento;
  itens: ItemSolicitacao[];
  onFechar: () => void;
  onFeito: () => void;
}) {
  const produto = solicitacao.tipo === "produto";
  const [qtd, setQtd] = useState<Record<number, string>>(() =>
    Object.fromEntries(itens.map((i) => [i.sequencia, String(num(i.quantidade_solicitada)).replace(".", ",")])),
  );
  const [transportadoras, setTransportadoras] = useState<{ codigo: number; nome: string; cidade: string | null; uf: string | null }[]>([]);
  const [codTransp, setCodTransp] = useState<string>("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [pesoLiquido, setPesoLiquido] = useState("");
  // volumes por item, como no romaneio do ERP; o total do romaneio e a soma
  const [volumes, setVolumes] = useState<Record<number, string>>({});
  const [especie, setEspecie] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (produto)
      supabase
        .from("transportadoras")
        .select("codigo, nome, cidade, uf")
        .order("nome")
        .then(({ data }) => setTransportadoras((data as any[]) || []));
  }, [produto]);

  const n = (t: string) => parseFloat((t || "").replace(/\./g, "").replace(",", "."));
  const qtdNum = (i: ItemSolicitacao) => {
    const v = parseFloat((qtd[i.sequencia] || "0").replace(",", "."));
    return Number.isFinite(v) ? arred4(v) : 0;
  };
  const total = itens.reduce((a, i) => a + Math.round(qtdNum(i) * num(i.valor_unitario_ipi) * 100) / 100, 0);
  const volNum = (i: ItemSolicitacao) => {
    const t = (volumes[i.sequencia] ?? "").trim();
    return t === "" ? null : parseInt(t, 10);
  };
  const totalVolumes = itens.reduce((a, i) => a + (qtdNum(i) > 0 ? volNum(i) || 0 : 0), 0);

  const aprovar = async () => {
    setErro("");
    let transportadora = "";
    let codigo: number | null = null;
    if (produto) {
      codigo = codTransp ? Number(codTransp) : null;
      transportadora = transportadoras.find((t) => t.codigo === codigo)?.nome || "";
      if (!transportadora) return setErro("Escolha a transportadora.");
      const semVolume = itens.find((i) => qtdNum(i) > 0 && (volNum(i) === null || !Number.isInteger(volNum(i)) || (volNum(i) as number) < 0));
      if (semVolume) return setErro(`Informe os volumes do item ${semVolume.sequencia} (0 se vai junto com outro item).`);
      if (totalVolumes <= 0) return setErro("Informe ao menos 1 volume.");
    }
    if (
      !window.confirm(
        `Aprovar o faturamento SF ${solicitacao.numero} (${formatarMoeda(total)}) e enviar para o fiscal?` +
          (produto ? "\n\nO romaneio será gerado no ERP automaticamente em alguns minutos." : ""),
      )
    )
      return;
    setEnviando(true);
    const { error } = await supabase.rpc("faturamento_logistica_aprovar", {
      p_id: solicitacao.id,
      p_itens: itens.map((i) => ({ sequencia: i.sequencia, quantidade: qtdNum(i), volumes: produto ? volNum(i) : null })),
      p_peso_bruto: produto ? n(pesoBruto) || null : null,
      p_peso_liquido: produto ? n(pesoLiquido) || null : null,
      p_volumes: produto ? totalVolumes : null,
      p_especie: produto ? especie : null,
      p_codigo_transportadora: codigo,
      p_transportadora: produto ? transportadora : null,
      p_observacao: obs,
    });
    setEnviando(false);
    if (error) return setErro(msgErro(error));
    onFeito();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between">
          <div>
            <h3 className="font-bold text-lg">Conferir SF {solicitacao.numero} · obra {solicitacao.codigo_obra}</h3>
            <p className="text-xs text-slate-400">Ajuste as quantidades se precisar (0 tira o item) e informe os dados do transporte.</p>
          </div>
          <button onClick={onFechar} className="text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          <table className="w-full text-[13px] border rounded-lg">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Seq.</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Solicitado</th>
                <th className="px-3 py-2 text-center w-32">Qtd. aprovada</th>
                {produto && <th className="px-3 py-2 text-center w-24">Volumes *</th>}
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.sequencia} className="border-t">
                  <td className="px-3 py-2 text-slate-500">{i.sequencia}</td>
                  <td className="px-3 py-2">
                    <b>{i.codigo_material}</b> <span className="text-[11px] text-slate-500">{i.descricao}</span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {fmtQtd(i.quantidade_solicitada)} {i.unidade}
                    <span className="block text-[11px] text-slate-400">{formatarMoeda(i.valor_solicitado)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={qtd[i.sequencia] ?? ""}
                      onChange={(e) => setQtd((p) => ({ ...p, [i.sequencia]: e.target.value }))}
                      className="border rounded px-2 py-1 w-full text-right"
                      inputMode="decimal"
                    />
                  </td>
                  {produto && (
                    <td className="px-3 py-2">
                      <input
                        value={volumes[i.sequencia] ?? ""}
                        onChange={(e) => setVolumes((p) => ({ ...p, [i.sequencia]: e.target.value.replace(/\D/g, "") }))}
                        disabled={qtdNum(i) <= 0}
                        className="border rounded px-2 py-1 w-full text-right disabled:bg-slate-50"
                        inputMode="numeric"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">
                    {formatarMoeda(Math.round(qtdNum(i) * num(i.valor_unitario_ipi) * 100) / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {produto ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Campo rotulo="Peso bruto (kg) *" valor={pesoBruto} onChange={setPesoBruto} />
              <Campo rotulo="Peso líquido (kg) *" valor={pesoLiquido} onChange={setPesoLiquido} />
              <div>
                <label className="block text-xs font-semibold mb-1">Volumes (soma dos itens)</label>
                <p className="border rounded-lg px-2 py-2 w-full text-sm bg-slate-50 font-semibold">{totalVolumes}</p>
              </div>
              <Campo rotulo="Espécie" valor={especie} onChange={setEspecie} placeholder="caixa, palete..." />
              <div className="col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold mb-1">Transportadora *</label>
                <select value={codTransp} onChange={(e) => setCodTransp(e.target.value)} className="border rounded-lg px-2 py-2 w-full bg-white text-sm">
                  <option value="">Selecione...</option>
                  {transportadoras.map((t) => (
                    <option key={t.codigo} value={t.codigo}>
                      {t.nome}
                      {t.cidade ? ` (${t.cidade}/${t.uf})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lista do cadastro do ERP (o romaneio exige o código). Não achou? Cadastre no ERP; aparece aqui na próxima sincronização.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3">Faturamento de serviço: sem dados de transporte.</p>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Observação da logística</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
        </div>
        <div className="p-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60 rounded-b-xl">
          <div>
            <p className="text-xs text-slate-500">Total aprovado (com IPI)</p>
            <p className="text-2xl font-bold">{formatarMoeda(total)}</p>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
          </div>
          <button
            disabled={enviando}
            onClick={aprovar}
            className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {enviando ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Aprovar e enviar ao fiscal
          </button>
        </div>
      </div>
    </div>
  );
}

const Campo = ({ rotulo, valor, onChange, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="block text-xs font-semibold mb-1">{rotulo}</label>
    <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="border rounded-lg px-2 py-2 w-full text-sm" />
  </div>
);

// ------------------------------------------------------------------------------------------------
// Detalhe: itens (solicitado x aprovado x faturado), transporte, NFs, historico e acoes
// ------------------------------------------------------------------------------------------------
export function DetalheSolicitacaoFaturamento({
  id,
  usuario,
  podeSolicitar,
  onFechar,
  onAlterada,
}: {
  id: string;
  usuario: Usuario | null;
  podeSolicitar: boolean;
  onFechar: () => void;
  onAlterada: () => void;
}) {
  const [sol, setSol] = useState<SolicitacaoFaturamento | null>(null);
  const [itens, setItens] = useState<ItemSolicitacao[]>([]);
  const [nfs, setNfs] = useState<any[]>([]);
  const [romaneios, setRomaneios] = useState<RomaneioSolicitacao[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    const [s, i, n, e, r] = await Promise.all([
      supabase.from("solicitacoes_faturamento").select("*").eq("id", id).maybeSingle(),
      supabase.from("solicitacoes_faturamento_itens").select("*").eq("id_solicitacao", id).order("sequencia"),
      supabase.from("solicitacoes_faturamento_nfs").select("*").eq("id_solicitacao", id).order("data_emissao"),
      supabase.from("solicitacoes_faturamento_eventos").select("*").eq("id_solicitacao", id).order("id"),
      supabase.from("solicitacoes_faturamento_romaneios").select("*").eq("id_solicitacao", id).order("created_at"),
    ]);
    if (s.error || !s.data) setErro("Solicitação não encontrada ou sem acesso.");
    setSol(s.data as SolicitacaoFaturamento);
    setItens((i.data as ItemSolicitacao[]) || []);
    setNfs(n.data || []);
    setEventos(e.data || []);
    setRomaneios((r.data as RomaneioSolicitacao[]) || []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const acao = async (fn: string, args: Record<string, unknown>) => {
    setOcupado(true);
    setErro("");
    const { error } = await supabase.rpc(fn, args);
    setOcupado(false);
    if (error) return setErro(msgErro(error));
    await carregar();
    onAlterada();
  };
  const comMotivo = (fn: string, pergunta: string) => {
    const motivo = window.prompt(pergunta);
    if (motivo && motivo.trim()) acao(fn, { p_id: id, p_motivo: motivo.trim() });
  };
  const abrirAnexo = async (caminho: string) => {
    const { data, error } = await supabase.storage.from("previsao-anexos").createSignedUrl(caminho, 300);
    if (error || !data?.signedUrl) return setErro("Não foi possível abrir o anexo.");
    window.open(data.signedUrl, "_blank");
  };

  if (!sol)
    return (
      <Moldura onFechar={onFechar}>
        <p className="p-6 text-sm text-slate-400">{erro || "Carregando..."}</p>
      </Moldura>
    );

  const aprovou = sol.aprovado_em !== null;
  const ehAprovador = Boolean(usuario?.aprova_faturamento);
  const ehFiscal = usuario?.perfil === "fiscal";
  const souSolicitante = sol.id_solicitante === usuario?.id;
  const podeEditar = (souSolicitante || podeSolicitar) && ["rascunho", "devolvida"].includes(sol.status);
  const podeCancelar = (souSolicitante || podeSolicitar) && ["rascunho", "devolvida", "aguardando_logistica", "aguardando_fiscal"].includes(sol.status);
  const atrasada =
    ["aguardando_logistica", "aguardando_fiscal"].includes(sol.status) && sol.data_desejada && sol.data_desejada < new Date().toISOString().slice(0, 10);

  return (
    <Moldura onFechar={onFechar}>
      <div className="p-4 border-b flex flex-wrap items-start justify-between gap-3 pr-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-slate-800">SF {sol.numero}</h3>
            <BadgeStatusFaturamento status={sol.status} />
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{tipoTexto(sol.tipo)}</span>
            <RomaneioResumo romaneios={romaneios} grande />
          </div>
          <p className="text-sm text-slate-500">
            Obra{" "}
            <a href={`/obras/${sol.codigo_obra}/faturamento`} className="text-[#2A6377] font-semibold hover:underline">
              {sol.codigo_obra}
            </a>{" "}
            · solicitado por {sol.nome_solicitante} {sol.enviado_em ? `em ${fmtDataHora(sol.enviado_em)}` : "(rascunho)"}
          </p>
          <p className={`text-sm ${atrasada ? "text-red-600 font-semibold" : "text-slate-500"}`}>
            Faturar até {sol.data_desejada ? formatarDataSegura(sol.data_desejada) : "-"}
            {atrasada && <AlertTriangle size={13} className="inline ml-1 -mt-0.5" />}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{aprovou ? "Valor aprovado" : "Valor solicitado"} (com IPI)</p>
          <p className="text-2xl font-bold">{formatarMoeda(num(sol.valor_aprovado ?? sol.valor_solicitado))}</p>
          {aprovou && num(sol.valor_aprovado) !== num(sol.valor_solicitado) && (
            <p className="text-[11px] text-slate-400">solicitado {formatarMoeda(sol.valor_solicitado)}</p>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-4 space-y-4">
        {sol.motivo_devolucao && ["devolvida", "aguardando_logistica"].includes(sol.status) && (
          <p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
            <b>Devolvida por {sol.nome_devolveu}:</b> {sol.motivo_devolucao}
          </p>
        )}
        {sol.status === "cancelada" && (
          <p className="text-sm bg-slate-100 border rounded-lg px-3 py-2 text-slate-600">
            <b>Cancelada:</b> {sol.motivo_cancelamento}
          </p>
        )}

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Seq.</th>
                <th className="px-3 py-2 text-left">Item do pedido</th>
                <th className="px-3 py-2 text-right">Solicitado</th>
                <th className="px-3 py-2 text-right">Aprovado</th>
                <th className="px-3 py-2 text-right">Faturado</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => {
                const pctSol = num(i.quantidade_pedido) > 0 ? (num(i.quantidade_solicitada) / num(i.quantidade_pedido)) * 100 : 0;
                const diferente =
                  i.quantidade_aprovada !== null && Math.abs(num(i.quantidade_aprovada) - num(i.quantidade_solicitada)) > 0.00005;
                return (
                  <tr key={i.sequencia} className="border-t align-top">
                    <td className="px-3 py-2 text-slate-500">{i.sequencia}</td>
                    <td className="px-3 py-2">
                      <b>{i.codigo_material}</b>
                      <span className="block text-[11px] text-slate-500">
                        {i.descricao} · família {i.codigo_familia}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {num(i.quantidade_solicitada) > 0 ? (
                        <>
                          {fmtQtd(i.quantidade_solicitada)} {i.unidade} <span className="text-slate-400">({fmtPct(pctSol)})</span>
                          <span className="block text-[11px] text-slate-500">{formatarMoeda(i.valor_solicitado)}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 text-[11px]">incluído pela logística</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right whitespace-nowrap ${diferente ? "text-amber-700 font-semibold" : ""}`}>
                      {i.quantidade_aprovada === null ? (
                        <span className="text-slate-300">-</span>
                      ) : (
                        <>
                          {fmtQtd(i.quantidade_aprovada)} {i.unidade}
                          <span className="block text-[11px]">
                            {formatarMoeda(num(i.valor_aprovado))}
                            {i.volumes !== null && num(i.quantidade_aprovada) > 0 && ` · ${i.volumes} vol.`}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {i.numero_nf ? (
                        <span className="text-emerald-700">
                          NF {i.numero_nf}
                          <span className="block text-[11px]">
                            {fmtQtd(i.quantidade_faturada)} · {formatarMoeda(num(i.valor_faturado))}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {sol.observacao && (
            <Bloco titulo="Observação do solicitante">
              <p className="whitespace-pre-wrap">{sol.observacao}</p>
            </Bloco>
          )}
          {aprovou && (
            <Bloco titulo={`Logística · ${sol.nome_aprovador} · ${fmtDataHora(sol.aprovado_em)}`} icone={<Truck size={14} />}>
              {sol.tipo === "produto" ? (
                <p>
                  <b>{sol.transportadora}</b>
                  <br />
                  Peso bruto {fmtQtd(sol.peso_bruto)} kg · líquido {fmtQtd(sol.peso_liquido)} kg · {sol.volumes} volume(s)
                  {sol.especie_volumes ? ` (${sol.especie_volumes})` : ""}
                </p>
              ) : (
                <p className="text-slate-500">Serviço: sem transporte.</p>
              )}
              {sol.observacao_logistica && <p className="mt-1 whitespace-pre-wrap text-slate-600">{sol.observacao_logistica}</p>}
            </Bloco>
          )}
          {romaneios.length > 0 && (
            <Bloco titulo="Romaneio no ERP" icone={<Package size={14} />}>
              {romaneios.map((r) => (
                <p
                  key={r.id}
                  className={
                    r.situacao === "erro"
                      ? "text-red-700"
                      : ["cancelado", "descartado"].includes(r.situacao)
                        ? "text-slate-400"
                        : r.situacao === "pendente" || r.situacao === "cancelar"
                          ? "text-amber-700"
                          : "text-emerald-700"
                  }
                >
                  <b>{r.numero_romaneio ? `Romaneio ${r.numero_romaneio}` : "Romaneio"}</b> · {textoRomaneio[r.situacao]}
                  {r.situacao !== "descartado" && <span className="text-slate-400"> · usuário ERP {r.login_erp}</span>}
                  {r.erro && <span className="block text-[11px]">{r.erro}</span>}
                </p>
              ))}
            </Bloco>
          )}
          {nfs.length > 0 && (
            <Bloco titulo="Notas fiscais" icone={<Receipt size={14} />}>
              {nfs.map((n) => (
                <p key={n.id} className={n.divergente ? "text-amber-700" : "text-emerald-700"}>
                  <b>NF {n.numero_nf}</b> (série {n.serie_nf}) · {formatarDataSegura(n.data_emissao)} · {formatarMoeda(n.valor)}
                  {n.divergente && (
                    <span className="block text-[11px]">Diferente do aprovado: {(n.detalhe?.divergencias || []).join("; ")}</span>
                  )}
                </p>
              ))}
            </Bloco>
          )}
          {sol.anexos?.length > 0 && (
            <Bloco titulo="Anexos" icone={<Paperclip size={14} />}>
              <div className="flex flex-wrap gap-2">
                {sol.anexos.map((a) => (
                  <button key={a.caminho} onClick={() => abrirAnexo(a.caminho)} className="text-xs px-2 py-1 rounded border bg-slate-50 text-[#2A6377] font-semibold">
                    {a.nome}
                  </button>
                ))}
              </div>
            </Bloco>
          )}
        </div>

        <Bloco titulo="Histórico" icone={<Clock size={14} />}>
          <ol className="space-y-1">
            {eventos.map((e) => (
              <li key={e.id} className="text-[13px]">
                <span className="text-slate-400">{fmtDataHora(e.em)}</span> · <b>{e.nome_usuario}</b> · {EVENTO[e.evento] || e.evento}
                {e.detalhe ? <span className="text-slate-500"> — {e.detalhe}</span> : null}
              </li>
            ))}
          </ol>
        </Bloco>
      </div>

      <div className="p-4 border-t bg-slate-50/60 rounded-b-xl space-y-2">
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 sm:justify-end">
          <button onClick={() => window.print()} className="px-3 py-2 rounded-lg border text-slate-600 flex items-center justify-center gap-1.5 text-sm">
            <Printer size={15} /> Imprimir
          </button>
          {podeCancelar && (
            <button
              disabled={ocupado}
              onClick={() => comMotivo("faturamento_cancelar", "Motivo do cancelamento:")}
              className="px-3 py-2 rounded-lg border border-red-200 text-red-700 flex items-center justify-center gap-1.5 text-sm"
            >
              <XCircle size={15} /> Cancelar solicitação
            </button>
          )}
          {podeEditar && (
            <button onClick={() => setEditando(true)} className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold text-sm flex items-center justify-center gap-1.5">
              <FileText size={15} /> {sol.status === "devolvida" ? "Corrigir e reenviar" : "Editar e enviar"}
            </button>
          )}
          {sol.status === "aguardando_logistica" && ehAprovador && (
            <>
              <button
                disabled={ocupado}
                onClick={() => comMotivo("faturamento_devolver", "Motivo da devolução ao solicitante:")}
                className="px-3 py-2 rounded-lg border text-slate-700 flex items-center justify-center gap-1.5 text-sm"
              >
                <RotateCcw size={15} /> Devolver ao solicitante
              </button>
              <button onClick={() => setConferindo(true)} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <CheckCircle2 size={15} /> Conferir e aprovar
              </button>
            </>
          )}
          {sol.status === "aguardando_fiscal" && (ehFiscal || ehAprovador) && (
            <button
              disabled={ocupado}
              onClick={() => comMotivo("faturamento_devolver", "Motivo da devolução à logística:")}
              className="px-3 py-2 rounded-lg border text-slate-700 flex items-center justify-center gap-1.5 text-sm"
            >
              <RotateCcw size={15} /> Devolver à logística
            </button>
          )}
        </div>
        {sol.status === "aguardando_fiscal" && (
          <p className="text-[11px] text-slate-400 text-right">
            Depois de emitir a NF no Prosyst, não precisa fazer nada aqui: o sistema liga a nota a esta solicitação em até 5 minutos.
          </p>
        )}
      </div>

      {editando && (
        <ModalSolicitarFaturamento
          idObra={sol.id_obra}
          codigoObra={sol.codigo_obra}
          tipo={sol.tipo}
          existente={{ solicitacao: sol, itens }}
          onFechar={() => setEditando(false)}
          onSalvo={() => {
            setEditando(false);
            carregar();
            onAlterada();
          }}
        />
      )}
      {conferindo && (
        <ModalConferencia
          solicitacao={sol}
          itens={itens}
          onFechar={() => setConferindo(false)}
          onFeito={() => {
            setConferindo(false);
            carregar();
            onAlterada();
          }}
        />
      )}
    </Moldura>
  );
}

const Moldura = ({ onFechar, children }: { onFechar: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={onFechar} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 z-10">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

const Bloco = ({ titulo, icone, children }: { titulo: string; icone?: React.ReactNode; children: React.ReactNode }) => (
  <div className="border rounded-lg p-3">
    <p className="text-[11px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1">
      {icone} {titulo}
    </p>
    <div className="text-sm text-slate-700">{children}</div>
  </div>
);

// romaneio ativo da solicitacao (o gerado no ERP; pendente = robo ainda vai gerar)
const SELECT_LISTA = "*, romaneios:solicitacoes_faturamento_romaneios(numero_romaneio, situacao, erro, created_at)";
function RomaneioResumo({ romaneios, grande = false }: { romaneios?: Pick<RomaneioSolicitacao, "numero_romaneio" | "situacao" | "erro">[]; grande?: boolean }) {
  const ativo = (romaneios || []).find((r) => ["criado", "faturado", "pendente", "erro"].includes(r.situacao));
  if (!ativo) return grande ? null : <span className="text-slate-300">-</span>;
  const tam = grande ? "text-xs px-2 py-0.5" : "text-[11px] px-2 py-0.5";
  if (ativo.situacao === "pendente")
    return <span className={`${tam} font-bold rounded-full border bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap`}>Romaneio: gerando...</span>;
  if (ativo.situacao === "erro")
    return (
      <span title={ativo.erro || ""} className={`${tam} font-bold rounded-full border bg-red-50 text-red-700 border-red-200 whitespace-nowrap`}>
        Romaneio: erro
      </span>
    );
  return (
    <span className={`${tam} font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap`}>
      Romaneio {ativo.numero_romaneio}
    </span>
  );
}

// ------------------------------------------------------------------------------------------------
// Lista (usada na aba Faturamento da obra e na tela geral)
// ------------------------------------------------------------------------------------------------
function TabelaSolicitacoes({
  lista,
  mostrarObra,
  onAbrir,
}: {
  lista: SolicitacaoFaturamento[];
  mostrarObra: boolean;
  onAbrir: (id: string) => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[720px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 text-left">SF</th>
            {mostrarObra && <th className="px-3 py-2 text-left">Obra</th>}
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Solicitante</th>
            <th className="px-3 py-2 text-center">Faturar até</th>
            <th className="px-3 py-2 text-right">Valor</th>
            <th className="px-3 py-2 text-center">Romaneio</th>
            <th className="px-3 py-2 text-center">Situação</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((s) => {
            const atrasada = ["aguardando_logistica", "aguardando_fiscal"].includes(s.status) && s.data_desejada && s.data_desejada < hoje;
            return (
              <tr key={s.id} onClick={() => onAbrir(s.id)} className="border-t hover:bg-slate-50 cursor-pointer">
                <td className="px-3 py-2 font-bold text-[#2A6377]">SF {s.numero}</td>
                {mostrarObra && <td className="px-3 py-2">{s.codigo_obra}</td>}
                <td className="px-3 py-2">{tipoTexto(s.tipo)}</td>
                <td className="px-3 py-2 text-slate-600">{s.nome_solicitante}</td>
                <td className={`px-3 py-2 text-center whitespace-nowrap ${atrasada ? "text-red-600 font-semibold" : ""}`}>
                  {s.data_desejada ? formatarDataSegura(s.data_desejada) : "-"}
                  {atrasada && <AlertTriangle size={12} className="inline ml-1 -mt-0.5" />}
                </td>
                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatarMoeda(num(s.valor_aprovado ?? s.valor_solicitado))}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  <RomaneioResumo romaneios={s.romaneios} />
                </td>
                <td className="px-3 py-2 text-center">
                  <BadgeStatusFaturamento status={s.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bloco no topo da aba Faturamento da obra: botoes de solicitar + historico da obra
export function SolicitacoesFaturamentoObra({
  idObra,
  codigoObra,
  usuario,
  podeSolicitar,
}: {
  idObra: string;
  codigoObra: string;
  usuario: Usuario | null;
  podeSolicitar: boolean;
}) {
  const [lista, setLista] = useState<SolicitacaoFaturamento[] | null>(null);
  const [novo, setNovo] = useState<"produto" | "servico" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [verTodas, setVerTodas] = useState(false);

  const carregar = () =>
    supabase
      .from("solicitacoes_faturamento")
      .select(SELECT_LISTA)
      .eq("id_obra", idObra)
      .order("created_at", { ascending: false })
      .then(({ data }) => setLista((data as SolicitacaoFaturamento[]) || []));
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idObra]);

  const ativas = (lista || []).filter((s) => !["faturada", "cancelada"].includes(s.status));
  const mostradas = verTodas ? lista || [] : ativas;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Receipt size={18} className="text-[#2A6377]" /> Solicitações de faturamento
          </h3>
          <p className="text-[11px] text-slate-400">Pedido do gestor → conferência da logística → emissão da NF pelo fiscal → NF ligada automaticamente.</p>
        </div>
        {podeSolicitar && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setNovo("produto")} className="px-3 py-2 rounded-lg bg-[#2A6377] text-white text-sm font-bold flex items-center gap-1.5">
              <Plus size={15} /> Faturar produto
            </button>
            <button onClick={() => setNovo("servico")} className="px-3 py-2 rounded-lg border border-[#2A6377] text-[#2A6377] text-sm font-bold flex items-center gap-1.5">
              <Plus size={15} /> Faturar serviço
            </button>
          </div>
        )}
      </div>
      {lista === null ? (
        <p className="p-4 text-sm text-slate-400">Carregando...</p>
      ) : mostradas.length === 0 ? (
        <p className="p-4 text-sm text-slate-400">
          {lista.length === 0 ? "Nenhuma solicitação de faturamento nesta obra." : "Nenhuma solicitação em andamento."}
        </p>
      ) : (
        <TabelaSolicitacoes lista={mostradas} mostrarObra={false} onAbrir={setAberto} />
      )}
      {lista && lista.length > ativas.length && (
        <button onClick={() => setVerTodas((v) => !v)} className="w-full text-xs font-bold text-[#2A6377] py-2 border-t hover:bg-slate-50">
          {verTodas ? "Mostrar só as em andamento" : `Ver histórico completo (${lista.length})`}
        </button>
      )}

      {novo && (
        <ModalSolicitarFaturamento
          idObra={idObra}
          codigoObra={codigoObra}
          tipo={novo}
          onFechar={() => setNovo(null)}
          onSalvo={(id) => {
            setNovo(null);
            carregar();
            setAberto(id);
          }}
        />
      )}
      {aberto && (
        <DetalheSolicitacaoFaturamento
          id={aberto}
          usuario={usuario}
          podeSolicitar={podeSolicitar}
          onFechar={() => setAberto(null)}
          onAlterada={carregar}
        />
      )}
    </div>
  );
}

// Tela geral (menu "Faturamento"): fila da logistica e do fiscal + historico de todas as obras
const FILTROS: [string, string, StatusSolicitacaoFaturamento[] | null][] = [
  ["andamento", "Em andamento", ["aguardando_logistica", "aguardando_fiscal", "devolvida", "faturada_parcial"]],
  ["logistica", "Aguardando logística", ["aguardando_logistica"]],
  ["fiscal", "Aguardando fiscal", ["aguardando_fiscal"]],
  ["faturadas", "Faturadas", ["faturada", "faturada_parcial"]],
  ["todas", "Todas", null],
];

export function TelaFaturamento({
  usuario,
  idAberto,
  onAbrir,
  podeGerenciar = false,
}: {
  usuario: Usuario | null;
  idAberto: string | null;
  onAbrir: (id: string | null) => void;
  podeGerenciar?: boolean; // admin/coordenador: edita e cancela como o gestor
}) {
  const padrao = usuario?.perfil === "fiscal" ? "fiscal" : usuario?.aprova_faturamento ? "logistica" : "andamento";
  const [filtro, setFiltro] = useState(padrao);
  const [obra, setObra] = useState("todas");
  const [lista, setLista] = useState<SolicitacaoFaturamento[] | null>(null);

  const carregar = () =>
    supabase
      .from("solicitacoes_faturamento")
      .select(SELECT_LISTA)
      .neq("status", "rascunho")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setLista((data as SolicitacaoFaturamento[]) || []));
  useEffect(() => {
    carregar();
  }, []);

  const statusFiltro = FILTROS.find((f) => f[0] === filtro)?.[2];
  const obras = [...new Set((lista || []).map((s) => s.codigo_obra))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const filtradas = (lista || []).filter(
    (s) => (!statusFiltro || statusFiltro.includes(s.status)) && (obra === "todas" || s.codigo_obra === obra),
  );
  const conta = (st: StatusSolicitacaoFaturamento[]) => (lista || []).filter((s) => st.includes(s.status)).length;

  return (
    <div className="animate-in fade-in space-y-4 max-w-full">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Faturamento</h2>
        <p className="text-sm text-slate-400 mt-1">
          Solicitações de faturamento das obras: conferência da logística, emissão da NF pelo fiscal e histórico. Para pedir um novo faturamento, abra
          a obra na aba Faturamento.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            ["Aguardando logística", conta(["aguardando_logistica"]), "text-amber-700", "logistica"],
            ["Aguardando fiscal", conta(["aguardando_fiscal"]), "text-blue-700", "fiscal"],
            ["Devolvidas", conta(["devolvida"]), "text-red-600", "andamento"],
            ["Faturadas em parte", conta(["faturada_parcial"]), "text-emerald-700", "faturadas"],
          ] as [string, number, string, string][]
        ).map(([rot, n, cor, f]) => (
          <button key={rot} onClick={() => setFiltro(f)} className="bg-white p-4 rounded-xl shadow-sm border text-left hover:bg-slate-50">
            <p className="text-[11px] text-slate-400 font-bold uppercase">{rot}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{n}</p>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex flex-wrap items-center gap-2 text-sm">
          <div className="inline-flex rounded-lg border overflow-hidden flex-wrap">
            {FILTROS.map(([v, rot]) => (
              <button
                key={v}
                onClick={() => setFiltro(v)}
                className={`px-3 py-1.5 font-semibold ${filtro === v ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {rot}
              </button>
            ))}
          </div>
          <select value={obra} onChange={(e) => setObra(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value="todas">Todas as obras</option>
            {obras.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {lista === null ? (
          <p className="p-4 text-sm text-slate-400">Carregando...</p>
        ) : filtradas.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">Nenhuma solicitação com esse filtro.</p>
        ) : (
          <TabelaSolicitacoes lista={filtradas} mostrarObra onAbrir={(id) => onAbrir(id)} />
        )}
      </div>
      {idAberto && (
        <DetalheSolicitacaoFaturamento id={idAberto} usuario={usuario} podeSolicitar={podeGerenciar} onFechar={() => onAbrir(null)} onAlterada={carregar} />
      )}
    </div>
  );
}
