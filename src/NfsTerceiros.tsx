import { linhaClicavel } from "./teclado";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Download, FileText, Loader2, Paperclip, RotateCcw, Search, Send, Trash2, X, XCircle } from "lucide-react";
import { supabase } from "./supabase";
import { exportarCsv, formatarDataSegura, formatarMoeda, normalizarNomeArquivo } from "./utils";
import type { Usuario } from "./types";

// NFs de terceiros (2026-10-15): pedidos de compra de SERVICO da obra espelhados do ERP pelo robo
// (obra_servicos_parcelas, uma linha por parcela, inclusive pedidos encerrados) e as NFs que o gestor
// encaminha pelo app (nfs_terceiros) para o fiscal/financeiro lancar e pagar. O banco avisa (sino/push e
// e-mail com a NF anexada); o robo marca "lancada" (AD no ERP) e "paga" (contas a pagar).
// Gravacoes so pelas funcoes do banco: nft_encaminhar, nft_devolver, nft_cancelar.

export interface ParcelaServico {
  nr_pedido: number;
  nr_solicitacao: number;
  situacao_pedido: "ativo" | "encerrado" | "nao_liberado";
  data_pedido: string | null;
  cod_fornecedor: number | null;
  fornecedor: string | null;
  cnpj: string | null;
  codigo_material: string | null;
  descricao: string | null;
  valor: number | null;
  data_entrega: string | null;
  situacao: "aberta" | "recebida" | "cancelada";
  nr_ad: number | null;
  numero_nf: string | null;
  serie_nf: string | null;
  data_emissao: string | null;
  data_recebimento: string | null;
  vencimento: string | null;
  data_pagamento: string | null;
  valor_nf: number | null;
}

type StatusNf = "encaminhada" | "devolvida" | "lancada" | "paga" | "cancelada";

export interface NfTerceiros {
  id: string;
  numero: number;
  id_obra: string;
  codigo_obra: string;
  nr_pedido: number;
  cod_fornecedor: number;
  fornecedor: string;
  cnpj: string | null;
  numero_nf: string;
  data_emissao: string;
  valor: number;
  vencimento: string;
  observacao: string | null;
  arquivo_caminho: string;
  arquivo_nome: string;
  // NF, boleto, fatura... (o 1o e o arquivo da NF; NFs antigas tem so arquivo_caminho/arquivo_nome)
  anexos?: AnexoNf[] | null;
  status: StatusNf;
  id_encaminhou: string | null;
  nome_encaminhou: string | null;
  encaminhado_em: string;
  motivo_devolucao: string | null;
  nome_devolveu: string | null;
  motivo_cancelamento: string | null;
  nr_ad: number | null;
  data_lancamento: string | null;
  data_pagamento: string | null;
}

const STATUS_NF: Record<StatusNf, { rotulo: string; classe: string }> = {
  encaminhada: { rotulo: "Encaminhada", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  devolvida: { rotulo: "Devolvida", classe: "bg-red-50 text-red-700 border-red-200" },
  lancada: { rotulo: "Lançada no ERP", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  paga: { rotulo: "Paga", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelada: { rotulo: "Cancelada", classe: "bg-slate-100 text-slate-500 border-slate-200" },
};

const SITUACAO_PEDIDO: Record<ParcelaServico["situacao_pedido"], { rotulo: string; classe: string }> = {
  ativo: { rotulo: "Ativo", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  nao_liberado: { rotulo: "Não liberado", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  encerrado: { rotulo: "Encerrado", classe: "bg-slate-100 text-slate-500 border-slate-200" },
};

const BUCKET = "nf-terceiros";
const num = (v: unknown) => Number(v || 0);
const data = (v?: string | null) => (v ? formatarDataSegura(v) : "-");
const fmtDataHora = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const msgErro = (e: any) => String(e?.message || e || "Erro desconhecido.").replace(/^.*?ERROR:\s*/, "");
const hojeISO = () => new Date().toLocaleDateString("sv-SE");

export const BadgeStatusNf = ({ status }: { status: StatusNf }) => (
  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_NF[status]?.classe}`}>
    {STATUS_NF[status]?.rotulo || status}
  </span>
);

export interface AnexoNf {
  caminho: string;
  nome: string;
  url?: string | null;
  tamanho?: number | null;
}

const MAX_ANEXOS = 10;
const MAX_ARQUIVO = 15 * 1048576;
const MAX_TOTAL = 20 * 1048576; // limite para caber no e-mail ao fiscal/financeiro

const anexosDa = (nf: NfTerceiros): AnexoNf[] =>
  nf.anexos?.length ? nf.anexos : nf.arquivo_caminho ? [{ caminho: nf.arquivo_caminho, nome: nf.arquivo_nome }] : [];

const tamanhoTxt = (bytes?: number | null) =>
  !bytes ? "" : bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;

const abrirArquivo = async (caminho: string) => {
  const { data: d, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 300);
  if (error || !d?.signedUrl) return alert("Não foi possível abrir o arquivo.");
  window.open(d.signedUrl, "_blank");
};

// resumo de um pedido de servico (soma das parcelas)
export interface PedidoServico {
  nr_pedido: number;
  cod_fornecedor: number | null;
  fornecedor: string | null;
  cnpj: string | null;
  situacao_pedido: ParcelaServico["situacao_pedido"];
  data_pedido: string | null;
  parcelas: ParcelaServico[];
  valor: number;
  lancado: number;
  pago: number;
  saldo: number;
}

export function agruparPedidos(parcelas: ParcelaServico[]): PedidoServico[] {
  const mapa = new Map<number, PedidoServico>();
  for (const p of parcelas) {
    let ped = mapa.get(p.nr_pedido);
    if (!ped) {
      ped = { nr_pedido: p.nr_pedido, cod_fornecedor: p.cod_fornecedor, fornecedor: p.fornecedor, cnpj: p.cnpj, situacao_pedido: p.situacao_pedido,
        data_pedido: p.data_pedido, parcelas: [], valor: 0, lancado: 0, pago: 0, saldo: 0 };
      mapa.set(p.nr_pedido, ped);
    }
    ped.parcelas.push(p);
    if (p.situacao !== "cancelada") ped.valor += num(p.valor);
    if (p.situacao === "recebida") ped.lancado += num(p.valor_nf ?? p.valor);
    if (p.data_pagamento) ped.pago += num(p.valor_nf ?? p.valor);
  }
  for (const ped of mapa.values()) ped.saldo = Math.max(ped.valor - ped.lancado, 0);
  return [...mapa.values()].sort((a, b) => b.nr_pedido - a.nr_pedido);
}

// ------------------------------------------------------------------------------------------------
// Secao "Servicos (terceiros)" da aba Compras da obra
// ------------------------------------------------------------------------------------------------
export function ServicosTerceirosObra({
  idObra,
  codigoObra,
  usuario,
  podeEncaminhar,
}: {
  idObra: string;
  codigoObra: string;
  usuario: Usuario | null;
  podeEncaminhar: boolean;
}) {
  const [parcelas, setParcelas] = useState<ParcelaServico[] | null>(null);
  const [nfs, setNfs] = useState<NfTerceiros[]>([]);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"abertos" | "encerrado" | "todos">("abertos");
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [encaminhar, setEncaminhar] = useState<{ pedido: PedidoServico; devolvida?: NfTerceiros } | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);

  const carregar = async () => {
    const [p, n] = await Promise.all([
      supabase.from("obra_servicos_parcelas").select("*").eq("id_obra", idObra).order("nr_pedido", { ascending: false }).order("nr_solicitacao"),
      supabase.from("nfs_terceiros").select("*").eq("id_obra", idObra).order("encaminhado_em", { ascending: false }),
    ]);
    if (p.error) setErro("Não foi possível carregar os pedidos de serviço.");
    setParcelas((p.data as ParcelaServico[]) || []);
    setNfs((n.data as NfTerceiros[]) || []);
  };
  useEffect(() => {
    setParcelas(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idObra]);

  const pedidos = useMemo(() => agruparPedidos(parcelas || []), [parcelas]);
  if (parcelas === null)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando os pedidos de serviço…
      </p>
    );

  const termo = busca.trim().toLowerCase();
  const filtrados = pedidos.filter((p) => {
    if (filtro === "abertos" && p.situacao_pedido === "encerrado") return false;
    if (filtro === "encerrado" && p.situacao_pedido !== "encerrado") return false;
    if (termo && ![p.nr_pedido, p.fornecedor, p.cnpj, ...p.parcelas.map((x) => `${x.descricao} ${x.numero_nf || ""}`)].join(" ").toLowerCase().includes(termo))
      return false;
    return true;
  });
  const nfsDoPedido = (nr: number) => nfs.filter((n) => n.nr_pedido === nr);
  const pendentesApp = nfs.filter((n) => n.status === "encaminhada" || n.status === "devolvida");
  const ativos = pedidos.filter((p) => p.situacao_pedido !== "encerrado");
  const indicadores: [string, string, string, string][] = [
    ["Pedidos de serviço ativos", String(ativos.length), formatarMoeda(ativos.reduce((a, p) => a + p.valor, 0)), "text-blue-700"],
    ["Saldo a receber em NF", formatarMoeda(ativos.reduce((a, p) => a + p.saldo, 0)), "pedidos ativos", "text-slate-700"],
    ["NFs aguardando lançamento", String(pendentesApp.length), "encaminhadas pelo app", pendentesApp.length ? "text-amber-700" : "text-slate-600"],
    ["Pedidos encerrados", String(pedidos.length - ativos.length), "histórico", "text-slate-500"],
  ];
  const alternar = (nr: number) =>
    setAbertos((s) => {
      const novo = new Set(s);
      if (novo.has(nr)) novo.delete(nr);
      else novo.add(nr);
      return novo;
    });

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(([rotulo, valor, sub, cor]) => (
          <div key={rotulo} className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-[11px] text-slate-400 font-bold uppercase">{rotulo}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div>
            <h3 className="font-bold text-lg">Serviços de terceiros</h3>
            <p className="text-[11px] text-slate-400">
              Pedidos de compra de serviço da obra no ERP, com as NFs recebidas, vencimento e pagamento. Use "Encaminhar NF" para mandar a NF do prestador ao fiscal e ao financeiro.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as any)} className="border rounded-lg px-2 py-1.5 bg-white">
              <option value="abertos">Ativos</option>
              <option value="encerrado">Encerrados</option>
              <option value="todos">Todos</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pedido, fornecedor, NF…" className="border rounded-lg pl-7 pr-2 py-1.5 w-52" />
            </div>
            <button
              onClick={() =>
                exportarCsv(
                  `servicos_obra_${codigoObra}`,
                  ["Pedido", "Situação pedido", "Data pedido", "Fornecedor", "CNPJ", "Solicitação", "Serviço", "Valor", "Entrega prevista", "Situação parcela",
                    "NF", "Emissão", "Recebimento", "Vencimento", "Pagamento", "Valor NF"],
                  filtrados.flatMap((p) =>
                    p.parcelas.map((x) => [
                      p.nr_pedido, SITUACAO_PEDIDO[p.situacao_pedido].rotulo, data(p.data_pedido), p.fornecedor || "", p.cnpj || "", x.nr_solicitacao,
                      x.descricao || "", String(num(x.valor)).replace(".", ","), data(x.data_entrega), x.situacao, x.numero_nf || "", data(x.data_emissao),
                      data(x.data_recebimento), data(x.vencimento), data(x.data_pagamento), x.valor_nf != null ? String(x.valor_nf).replace(".", ",") : "",
                    ]),
                  ),
                )
              }
              className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
        </div>
        {erro && <p className="px-4 py-3 text-sm text-red-600">{erro}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Pedido</th>
                <th className="px-3 py-2 text-left">Fornecedor</th>
                <th className="px-3 py-2 text-right">Valor do pedido</th>
                <th className="px-3 py-2 text-right">NFs lançadas</th>
                <th className="px-3 py-2 text-right">Pago</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2 text-center">Situação</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    {pedidos.length === 0 ? "Nenhum pedido de serviço para esta obra no ERP." : "Nenhum pedido com esses filtros."}
                  </td>
                </tr>
              )}
              {filtrados.map((p) => {
                const doApp = nfsDoPedido(p.nr_pedido);
                return (
                  <FragmentoPedido
                    key={p.nr_pedido}
                    pedido={p}
                    aberto={abertos.has(p.nr_pedido)}
                    nfsApp={doApp}
                    pendentes={doApp.filter((n) => n.status === "encaminhada" || n.status === "devolvida").length}
                    podeEncaminhar={podeEncaminhar && p.situacao_pedido !== "encerrado"}
                    onAlternar={() => alternar(p.nr_pedido)}
                    onEncaminhar={() => setEncaminhar({ pedido: p })}
                    onAbrirNf={setDetalhe}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[11px] text-slate-400 border-t">
          {filtrados.length} de {pedidos.length} pedido(s) de serviço · atualizado pelo ERP a cada 5 minutos.
        </p>
      </div>

      {encaminhar && (
        <ModalEncaminharNf
          idObra={idObra}
          pedido={encaminhar.pedido}
          devolvida={encaminhar.devolvida}
          onFechar={() => setEncaminhar(null)}
          onFeito={() => {
            setEncaminhar(null);
            carregar();
          }}
        />
      )}
      {detalhe && (
        <DetalheNfTerceiros
          id={detalhe}
          usuario={usuario}
          onFechar={() => setDetalhe(null)}
          onAlterada={carregar}
          onReenviar={(nf) => {
            const ped = pedidos.find((x) => x.nr_pedido === nf.nr_pedido);
            setDetalhe(null);
            if (ped) setEncaminhar({ pedido: ped, devolvida: nf });
          }}
        />
      )}
    </div>
  );
}

function FragmentoPedido({
  pedido: p,
  aberto,
  nfsApp,
  pendentes,
  podeEncaminhar,
  onAlternar,
  onEncaminhar,
  onAbrirNf,
}: {
  pedido: PedidoServico;
  aberto: boolean;
  nfsApp: NfTerceiros[];
  pendentes: number;
  podeEncaminhar: boolean;
  onAlternar: () => void;
  onEncaminhar: () => void;
  onAbrirNf: (id: string) => void;
}) {
  const hoje = hojeISO();
  return (
    <>
      <tr className="border-t hover:bg-slate-50 align-top cursor-pointer" {...linhaClicavel(onAlternar)}>
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="font-semibold flex items-center gap-1">
            {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {p.nr_pedido}
          </span>
          <span className="block text-[11px] text-slate-400 ml-5">cadastro {data(p.data_pedido)}</span>
        </td>
        <td className="px-3 py-2">
          <b>{p.fornecedor || "-"}</b>
          <span className="block text-[11px] text-slate-500">
            {p.cnpj ? `CNPJ ${p.cnpj} · ` : ""}
            {p.parcelas[0]?.descricao}
          </span>
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          {formatarMoeda(p.valor)}
          <span className="block text-[11px] text-slate-400">{p.parcelas.length} parcela(s)</span>
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap">{formatarMoeda(p.lancado)}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">{formatarMoeda(p.pago)}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{formatarMoeda(p.saldo)}</td>
        <td className="px-3 py-2 text-center">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${SITUACAO_PEDIDO[p.situacao_pedido].classe}`}>
            {SITUACAO_PEDIDO[p.situacao_pedido].rotulo}
          </span>
          {pendentes > 0 && <span className="block text-[11px] text-amber-700 mt-1">{pendentes} NF(s) aguardando lançamento</span>}
        </td>
        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
          {podeEncaminhar && (
            <button onClick={onEncaminhar} className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap">
              <Send size={13} /> Encaminhar NF
            </button>
          )}
        </td>
      </tr>
      {aberto && (
        <tr className="bg-slate-50/60">
          <td colSpan={8} className="px-4 py-3">
            <table className="w-full text-[12px] bg-white border rounded-lg">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 text-left">Solicitação / serviço</th>
                  <th className="px-2 py-1.5 text-right">Valor</th>
                  <th className="px-2 py-1.5 text-center">Entrega prevista</th>
                  <th className="px-2 py-1.5 text-left">NF</th>
                  <th className="px-2 py-1.5 text-center">Emissão</th>
                  <th className="px-2 py-1.5 text-center">Recebimento</th>
                  <th className="px-2 py-1.5 text-center">Vencimento</th>
                  <th className="px-2 py-1.5 text-center">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {p.parcelas.map((x) => {
                  const vencida = x.situacao === "recebida" && !x.data_pagamento && x.vencimento && x.vencimento < hoje;
                  return (
                    <tr key={x.nr_solicitacao} className={`border-t ${x.situacao === "cancelada" ? "text-slate-400 line-through" : ""}`}>
                      <td className="px-2 py-1.5">
                        {x.nr_solicitacao} <span className="text-slate-500">{x.descricao}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">{formatarMoeda(x.valor)}</td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">{data(x.data_entrega)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {x.numero_nf ? (
                          <>
                            NF {x.numero_nf} <span className="text-slate-400">{x.serie_nf}</span>
                            {x.valor_nf != null && num(x.valor_nf) !== num(x.valor) && <span className="block text-[11px] text-slate-500">{formatarMoeda(x.valor_nf)}</span>}
                          </>
                        ) : (
                          <span className="text-slate-400">{x.situacao === "cancelada" ? "cancelada" : "aguardando NF"}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">{data(x.data_emissao)}</td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">{data(x.data_recebimento)}</td>
                      <td className={`px-2 py-1.5 text-center whitespace-nowrap ${vencida ? "text-red-600 font-semibold" : ""}`}>
                        {data(x.vencimento)}
                        {vencida && <AlertTriangle size={11} className="inline ml-1 -mt-0.5" />}
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                        {x.data_pagamento ? <span className="text-emerald-700 font-semibold">{data(x.data_pagamento)}</span> : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {nfsApp.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">NFs encaminhadas pelo app</p>
                <div className="flex flex-wrap gap-2">
                  {nfsApp.map((n) => (
                    <button key={n.id} onClick={() => onAbrirNf(n.id)} className="text-left border rounded-lg px-3 py-2 bg-white hover:border-[#2A6377] text-[12px]">
                      <span className="font-semibold">NF {n.numero_nf}</span> · {formatarMoeda(n.valor)} · vence {data(n.vencimento)} <BadgeStatusNf status={n.status} />
                      <span className="block text-[11px] text-slate-400">
                        por {n.nome_encaminhou} em {fmtDataHora(n.encaminhado_em)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Encaminhar NF (nova ou reenvio de devolvida)
// ------------------------------------------------------------------------------------------------
function ModalEncaminharNf({
  idObra,
  pedido,
  devolvida,
  onFechar,
  onFeito,
}: {
  idObra: string;
  pedido: PedidoServico;
  devolvida?: NfTerceiros;
  onFechar: () => void;
  onFeito: () => void;
}) {
  const [numero, setNumero] = useState(devolvida?.numero_nf || "");
  const [emissao, setEmissao] = useState(devolvida?.data_emissao || "");
  const [valor, setValor] = useState(devolvida ? String(devolvida.valor).replace(".", ",") : "");
  const [vencimento, setVencimento] = useState(devolvida?.vencimento || "");
  const [obs, setObs] = useState(devolvida?.observacao || "");
  // anexos ja enviados (reenvio de NF devolvida) que o gestor mantem + arquivos novos escolhidos agora
  const [mantidos, setMantidos] = useState<AnexoNf[]>(devolvida ? anexosDa(devolvida) : []);
  const [novos, setNovos] = useState<File[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const listaAnexos = [
    ...mantidos.map((a) => ({ chave: a.caminho, nome: a.nome, tamanho: a.tamanho, remover: () => setMantidos((l) => l.filter((x) => x !== a)) })),
    ...novos.map((f, i) => ({ chave: `novo-${i}-${f.name}`, nome: f.name, tamanho: f.size, remover: () => setNovos((l) => l.filter((x) => x !== f)) })),
  ];
  const valorNum = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const acimaDoSaldo = valorNum > pedido.saldo + 0.005;
  const hoje = hojeISO();
  const vencePerto = Boolean(vencimento) && vencimento <= new Date(Date.now() + 3 * 86400000).toLocaleDateString("sv-SE");

  const enviar = async () => {
    setErro("");
    if (!numero.trim()) return setErro("Informe o número da NF.");
    if (!emissao) return setErro("Informe a data de emissão.");
    if (valorNum <= 0) return setErro("Informe o valor da NF.");
    if (!vencimento) return setErro("Informe o vencimento.");
    if (!mantidos.length && !novos.length) return setErro("Anexe a NF (PDF ou imagem).");
    if (mantidos.length + novos.length > MAX_ANEXOS) return setErro(`No máximo ${MAX_ANEXOS} anexos.`);
    const grande = novos.find((f) => f.size > MAX_ARQUIVO);
    if (grande) return setErro(`${grande.name} passa de 15 MB.`);
    if (novos.reduce((t, f) => t + f.size, 0) + mantidos.reduce((t, a) => t + (a.tamanho || 0), 0) > MAX_TOTAL)
      return setErro("Os anexos passam de 20 MB no total (limite do e-mail). Reduza ou compacte os arquivos.");
    if (acimaDoSaldo && !window.confirm(`O valor (${formatarMoeda(valorNum)}) passa do saldo do pedido (${formatarMoeda(pedido.saldo)}). Encaminhar assim mesmo?`))
      return;
    setEnviando(true);
    const enviados: string[] = [];
    try {
      const lista: AnexoNf[] = mantidos.map((a) => ({ ...a }));
      for (const [i, arq] of novos.entries()) {
        const caminho = `nf/${idObra}/${Date.now()}_${i}_${normalizarNomeArquivo(arq.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(caminho, arq);
        if (error) throw new Error(`Não foi possível enviar ${arq.name}: ${error.message}`);
        enviados.push(caminho);
        lista.push({ caminho, nome: arq.name, tamanho: arq.size });
      }
      // links temporarios que o robo usa para anexar os arquivos no e-mail (ele nao tem acesso direto ao Storage)
      for (const a of lista) {
        const { data: assinado, error: errUrl } = await supabase.storage.from(BUCKET).createSignedUrl(a.caminho, 7 * 86400);
        if (errUrl || !assinado?.signedUrl) throw new Error(`Não foi possível preparar ${a.nome} para o e-mail.`);
        a.url = assinado.signedUrl;
      }
      const { error } = await supabase.rpc("nft_encaminhar", {
        p_id: devolvida?.id || null,
        p_id_obra: idObra,
        p_nr_pedido: pedido.nr_pedido,
        p_numero_nf: numero.trim(),
        p_data_emissao: emissao,
        p_valor: valorNum,
        p_vencimento: vencimento,
        p_observacao: obs,
        p_arquivo_caminho: lista[0].caminho,
        p_arquivo_nome: lista[0].nome,
        p_arquivo_url: lista[0].url,
        p_anexos: lista,
      });
      if (error) throw error;
      onFeito();
    } catch (e) {
      if (enviados.length) await supabase.storage.from(BUCKET).remove(enviados);
      setErro(msgErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between">
          <div>
            <h3 className="font-bold text-lg">{devolvida ? "Reenviar NF devolvida" : "Encaminhar NF de terceiros"}</h3>
            <p className="text-xs text-slate-400">Vai para o fiscal e o financeiro lançarem e pagarem, com os anexos no e-mail.</p>
          </div>
          <button onClick={onFechar} className="text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {devolvida?.motivo_devolucao && (
            <p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <b>Devolvida por {devolvida.nome_devolveu}:</b> {devolvida.motivo_devolucao}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 border rounded-lg p-3">
            <p>
              <span className="block text-[11px] text-slate-400">Fornecedor</span>
              <b>{pedido.fornecedor}</b>
            </p>
            <p>
              <span className="block text-[11px] text-slate-400">CNPJ</span>
              {pedido.cnpj || "-"}
            </p>
            <p>
              <span className="block text-[11px] text-slate-400">Pedido de compra</span>
              <b>{pedido.nr_pedido}</b> · {formatarMoeda(pedido.valor)}
            </p>
            <p>
              <span className="block text-[11px] text-slate-400">Saldo do pedido (sem NF lançada)</span>
              <b>{formatarMoeda(pedido.saldo)}</b>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Número da NF *" valor={numero} onChange={setNumero} />
            <Campo rotulo="Valor da NF (R$) *" valor={valor} onChange={setValor} placeholder="0,00" decimal />
            <Campo rotulo="Data de emissão *" valor={emissao} onChange={setEmissao} tipo="date" max={hoje} />
            <Campo rotulo="Vencimento *" valor={vencimento} onChange={setVencimento} tipo="date" min={emissao || undefined} />
          </div>
          {acimaDoSaldo && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle size={13} /> Valor acima do saldo do pedido.
            </p>
          )}
          {vencePerto && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle size={13} /> Vencimento em até 3 dias: o fiscal e o financeiro recebem lembrete diário até a NF ser lançada.
            </p>
          )}
          <div>
            <p className="text-xs font-semibold mb-1">Anexos *</p>
            <p className="text-[11px] text-slate-400 mb-2">
              A NF e, se houver, boleto, fatura, relatório de medição… (PDF, XML ou imagem · até {MAX_ANEXOS} arquivos, 20&nbsp;MB no
              total). O primeiro é o arquivo da NF.
            </p>
            {listaAnexos.length > 0 && (
              <ul className="border rounded-lg divide-y mb-2">
                {listaAnexos.map((a, i) => (
                  <li key={a.chave} className="flex items-center gap-2 px-3 py-2 text-sm min-w-0">
                    <FileText size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate flex-1 min-w-0">{a.nome}</span>
                    {i === 0 && (
                      <span className="shrink-0 text-[10px] font-bold uppercase text-[#2A6377] bg-[#2A6377]/10 rounded px-1.5 py-0.5">NF</span>
                    )}
                    {a.tamanho ? <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">{tamanhoTxt(a.tamanho)}</span> : null}
                    <button
                      type="button"
                      onClick={a.remover}
                      title="Remover anexo"
                      aria-label={`Remover ${a.nome}`}
                      className="shrink-0 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="border border-dashed rounded-lg px-3 py-3 flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 focus-within:border-[#2A6377]">
              <Paperclip size={15} aria-hidden="true" />
              {listaAnexos.length ? "Adicionar mais arquivos…" : "Escolher arquivos…"}
              <input
                type="file"
                multiple
                accept=".pdf,.xml,image/*"
                className="sr-only"
                onChange={(e) => {
                  const escolhidos = [...(e.target.files || [])];
                  setNovos((l) => [...l, ...escolhidos.filter((f) => !l.some((x) => x.name === f.name && x.size === f.size))]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Observação</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-between gap-3 bg-slate-50/60 rounded-b-xl">
          <p className="text-sm text-red-600">{erro}</p>
          <button disabled={enviando} onClick={enviar} className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-2 disabled:opacity-60">
            {enviando ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {devolvida ? "Reenviar" : "Encaminhar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Campo = ({
  rotulo,
  valor,
  onChange,
  placeholder,
  tipo = "text",
  min,
  max,
  decimal,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: string;
  min?: string;
  max?: string;
  decimal?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold mb-1">{rotulo}</label>
    <input
      type={tipo}
      value={valor}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={decimal ? "decimal" : undefined}
      className="border rounded-lg px-2 py-2 w-full text-sm"
    />
  </div>
);

// ------------------------------------------------------------------------------------------------
// Detalhe da NF: dados, arquivo, historico e acoes
// ------------------------------------------------------------------------------------------------
const EVENTO: Record<string, string> = {
  encaminhada: "Encaminhou",
  reenviada: "Reenviou",
  devolvida: "Devolveu",
  cancelada: "Cancelou",
  lancada: "Lançada no ERP",
  paga: "Paga",
  lembrete: "Lembrete enviado",
};

export function DetalheNfTerceiros({
  id,
  usuario,
  onFechar,
  onAlterada,
  onReenviar,
}: {
  id: string;
  usuario: Usuario | null;
  onFechar: () => void;
  onAlterada: () => void;
  onReenviar?: (nf: NfTerceiros) => void;
}) {
  const [nf, setNf] = useState<NfTerceiros | null>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    const [n, e] = await Promise.all([
      supabase.from("nfs_terceiros").select("*").eq("id", id).maybeSingle(),
      supabase.from("nfs_terceiros_eventos").select("*").eq("id_nf", id).order("id"),
    ]);
    if (n.error || !n.data) setErro("NF não encontrada ou sem acesso.");
    setNf(n.data as NfTerceiros);
    setEventos(e.data || []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const acao = async (fn: string, pergunta: string) => {
    const motivo = window.prompt(pergunta);
    if (!motivo || !motivo.trim()) return;
    setOcupado(true);
    setErro("");
    const { error } = await supabase.rpc(fn, { p_id: id, p_motivo: motivo.trim() });
    setOcupado(false);
    if (error) return setErro(msgErro(error));
    await carregar();
    onAlterada();
  };

  const perfil = usuario?.perfil || "";
  const podeDevolver = nf?.status === "encaminhada" && ["fiscal", "financeiro", "admin", "coordenador"].includes(perfil);
  const podeCancelar = Boolean(nf && ["encaminhada", "devolvida"].includes(nf.status) && !["fiscal", "financeiro", "logistica", "cliente"].includes(perfil));
  const vencida = Boolean(nf && !["paga", "cancelada"].includes(nf.status) && nf.vencimento < hojeISO());

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onFechar} className="absolute right-3 top-3 text-slate-400">
          <X size={20} />
        </button>
        {!nf ? (
          <p className="p-6 text-sm text-slate-400">{erro || "Carregando…"}</p>
        ) : (
          <>
            <div className="p-4 border-b pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">NF {nf.numero_nf}</h3>
                <BadgeStatusNf status={nf.status} />
              </div>
              <p className="text-sm text-slate-500">
                {nf.fornecedor} · obra{" "}
                <a href={`/obras/${nf.codigo_obra}/compras`} className="text-[#2A6377] font-semibold hover:underline">
                  {nf.codigo_obra}
                </a>{" "}
                · pedido {nf.nr_pedido}
              </p>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 text-sm">
              {nf.status === "devolvida" && (
                <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
                  <b>Devolvida por {nf.nome_devolveu}:</b> {nf.motivo_devolucao}
                </p>
              )}
              {nf.status === "cancelada" && (
                <p className="bg-slate-100 border rounded-lg px-3 py-2 text-slate-600">
                  <b>Cancelada:</b> {nf.motivo_cancelamento}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Info rotulo="Valor" valor={<b>{formatarMoeda(nf.valor)}</b>} />
                <Info rotulo="Emissão" valor={data(nf.data_emissao)} />
                <Info
                  rotulo="Vencimento"
                  valor={
                    <span className={vencida ? "text-red-600 font-semibold" : ""}>
                      {data(nf.vencimento)} {vencida && <AlertTriangle size={12} className="inline -mt-0.5" />}
                    </span>
                  }
                />
                <Info rotulo="CNPJ" valor={nf.cnpj || "-"} />
                <Info rotulo="Lançada no ERP" valor={nf.data_lancamento ? `${data(nf.data_lancamento)} (AD ${nf.nr_ad})` : "-"} />
                <Info rotulo="Paga em" valor={nf.data_pagamento ? <span className="text-emerald-700 font-semibold">{data(nf.data_pagamento)}</span> : "-"} />
              </div>
              <p className="text-slate-500">
                Encaminhada por {nf.nome_encaminhou} em {fmtDataHora(nf.encaminhado_em)} (NT {nf.numero})
              </p>
              {nf.observacao && <p className="whitespace-pre-wrap border rounded-lg p-3">{nf.observacao}</p>}
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Anexos ({anexosDa(nf).length})</p>
                <ul className="space-y-1">
                  {anexosDa(nf).map((a) => (
                    <li key={a.caminho}>
                      <button onClick={() => abrirArquivo(a.caminho)} className="flex items-center gap-2 text-[#2A6377] font-semibold hover:underline text-left">
                        <FileText size={15} className="shrink-0" aria-hidden="true" /> <span className="break-all">{a.nome}</span>
                        {a.tamanho ? <span className="text-[11px] font-normal text-slate-400">{tamanhoTxt(a.tamanho)}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Histórico</p>
                <ul className="space-y-1">
                  {eventos.map((e) => (
                    <li key={e.id} className="text-[12px] text-slate-600">
                      <span className="text-slate-400">{fmtDataHora(e.created_at)}</span> · <b>{EVENTO[e.evento] || e.evento}</b>
                      {e.nome_usuario && e.nome_usuario !== "Sistema" ? ` (${e.nome_usuario})` : ""}
                      {e.detalhe ? ` — ${e.detalhe}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              {erro && <p className="text-red-600">{erro}</p>}
            </div>
            {(podeDevolver || podeCancelar) && (
              <div className="p-4 border-t flex flex-wrap justify-end gap-2 bg-slate-50/60 rounded-b-xl">
                {podeDevolver && (
                  <button
                    disabled={ocupado}
                    onClick={() => acao("nft_devolver", "Motivo da devolução (o gestor corrige e reenvia):")}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-700 font-semibold flex items-center gap-1 text-sm"
                  >
                    <RotateCcw size={14} /> Devolver ao gestor
                  </button>
                )}
                {podeCancelar && (
                  <button
                    disabled={ocupado}
                    onClick={() => acao("nft_cancelar", "Motivo do cancelamento:")}
                    className="px-3 py-2 rounded-lg border text-slate-600 font-semibold flex items-center gap-1 text-sm"
                  >
                    <XCircle size={14} /> Cancelar
                  </button>
                )}
                {nf.status === "devolvida" && onReenviar && podeCancelar && (
                  <button onClick={() => onReenviar(nf)} className="px-3 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-1 text-sm">
                    <Send size={14} /> Corrigir e reenviar
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const Info = ({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) => (
  <div>
    <p className="text-[11px] text-slate-400">{rotulo}</p>
    <p>{valor}</p>
  </div>
);

// ------------------------------------------------------------------------------------------------
// Tela geral "NFs de terceiros" (fiscal, financeiro, coordenacao; gestor ve as das suas obras)
// ------------------------------------------------------------------------------------------------
export function TelaNfsTerceiros({ usuario, idAberto, onAbrir }: { usuario: Usuario | null; idAberto: string | null; onAbrir: (id: string | null) => void }) {
  const [nfs, setNfs] = useState<NfTerceiros[] | null>(null);
  const [filtro, setFiltro] = useState("pendentes");
  const [busca, setBusca] = useState("");

  const carregar = async () => {
    const { data: d } = await supabase.from("nfs_terceiros").select("*").order("vencimento");
    setNfs((d as NfTerceiros[]) || []);
  };
  useEffect(() => {
    carregar();
  }, []);

  const hoje = hojeISO();
  if (nfs === null)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando as NFs de terceiros…
      </p>
    );
  const termo = busca.trim().toLowerCase();
  const filtradas = nfs.filter((n) => {
    if (filtro === "pendentes" && !["encaminhada", "devolvida"].includes(n.status)) return false;
    if (filtro === "a_pagar" && n.status !== "lancada") return false;
    if (!["pendentes", "a_pagar", "todas"].includes(filtro) && n.status !== filtro) return false;
    if (termo && ![n.numero_nf, n.fornecedor, n.cnpj, n.codigo_obra, n.nr_pedido, n.nome_encaminhou].join(" ").toLowerCase().includes(termo)) return false;
    return true;
  });
  const conta = (s: StatusNf[]) => nfs.filter((n) => s.includes(n.status));
  const indicadores: [string, NfTerceiros[], string][] = [
    ["A lançar", conta(["encaminhada"]), "text-blue-700"],
    ["Devolvidas ao gestor", conta(["devolvida"]), "text-red-600"],
    ["Lançadas, a pagar", conta(["lancada"]), "text-amber-700"],
    ["Vencidas sem pagamento", nfs.filter((n) => ["encaminhada", "lancada"].includes(n.status) && n.vencimento < hoje), "text-red-600"],
  ];

  return (
    <div className="animate-in fade-in dash-main-wrapper space-y-4">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">NFs de terceiros</h2>
        <p className="text-sm text-slate-500">NFs de prestadores de serviço encaminhadas pelos gestores para lançamento e pagamento.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(([rotulo, lista, cor]) => (
          <div key={rotulo} className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-[11px] text-slate-400 font-bold uppercase">{rotulo}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{lista.length}</p>
            <p className="text-[11px] text-slate-400">{formatarMoeda(lista.reduce((a, n) => a + num(n.valor), 0))}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-end text-sm">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value="pendentes">A lançar / devolvidas</option>
            <option value="a_pagar">Lançadas, a pagar</option>
            <option value="paga">Pagas</option>
            <option value="cancelada">Canceladas</option>
            <option value="todas">Todas</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="NF, fornecedor, obra, pedido…" className="border rounded-lg pl-7 pr-2 py-1.5 w-56" />
          </div>
          <button
            onClick={() =>
              exportarCsv(
                "nfs_terceiros",
                ["NT", "Obra", "Pedido", "Fornecedor", "CNPJ", "NF", "Emissão", "Valor", "Vencimento", "Situação", "Encaminhada por", "Encaminhada em", "Lançada", "Paga"],
                filtradas.map((n) => [
                  n.numero, n.codigo_obra, n.nr_pedido, n.fornecedor, n.cnpj || "", n.numero_nf, data(n.data_emissao), String(n.valor).replace(".", ","),
                  data(n.vencimento), STATUS_NF[n.status].rotulo, n.nome_encaminhou || "", fmtDataHora(n.encaminhado_em), data(n.data_lancamento), data(n.data_pagamento),
                ]),
              )
            }
            className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 flex items-center gap-1"
          >
            <Download size={13} /> Exportar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Fornecedor / NF</th>
                <th className="px-3 py-2 text-left">Obra / pedido</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-center">Emissão</th>
                <th className="px-3 py-2 text-center">Vencimento</th>
                <th className="px-3 py-2 text-center">Situação</th>
                <th className="px-3 py-2 text-left">Encaminhada por</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    Nenhuma NF {filtro === "todas" ? "encaminhada ainda" : "com esse filtro"}.
                  </td>
                </tr>
              )}
              {filtradas.map((n) => {
                const vencida = !["paga", "cancelada"].includes(n.status) && n.vencimento < hoje;
                return (
                  <tr key={n.id} className="border-t hover:bg-slate-50 cursor-pointer" {...linhaClicavel(() => onAbrir(n.id))}>
                    <td className="px-3 py-2">
                      <b>{n.fornecedor}</b>
                      <span className="block text-[11px] text-slate-500">
                        NF {n.numero_nf}
                        {n.cnpj ? ` · CNPJ ${n.cnpj}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {n.codigo_obra} <span className="text-slate-400">· pedido {n.nr_pedido}</span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{formatarMoeda(n.valor)}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">{data(n.data_emissao)}</td>
                    <td className={`px-3 py-2 text-center whitespace-nowrap ${vencida ? "text-red-600 font-semibold" : ""}`}>
                      {data(n.vencimento)}
                      {vencida && <AlertTriangle size={12} className="inline ml-1 -mt-0.5" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <BadgeStatusNf status={n.status} />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-500">
                      {n.nome_encaminhou}
                      <span className="block text-[11px] text-slate-400">{fmtDataHora(n.encaminhado_em)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {idAberto && <DetalheNfTerceiros id={idAberto} usuario={usuario} onFechar={() => onAbrir(null)} onAlterada={carregar} />}
    </div>
  );
}
