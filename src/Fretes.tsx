import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MapPin, Pencil, Plus, Search, Truck, X, XCircle } from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, formatarMoeda } from "./utils";
import { linhaClicavel } from "./teclado";
import type { Usuario } from "./types";

// Fretes (2026-10-20): solicitacao de frete com controle da verba da familia <obra>.510.
// Quem pede: logistica, gestor e assistente; a logistica cota (local/KM x tarifa, transportadora).
// O banco confere o saldo da .510 (previsoes em aberto no ERP - fretes liberados ainda sem CT-e):
//   com saldo -> "liberado" (verba reservada); sem saldo -> "bloqueado" + aviso ao gestor e assistentes.
// Previsao da .510 aumentou (robo traz do ERP) -> os bloqueados sao liberados sozinhos.
// Gravacoes so pelas funcoes do banco: frete_salvar, frete_cancelar.

type StatusFrete = "aguardando_cotacao" | "liberado" | "bloqueado" | "realizado" | "cancelado";

export interface Frete {
  id: string;
  numero: number;
  id_obra: string;
  codigo_obra: string;
  familia: string;
  data_frete: string;
  operacao: "compra" | "venda";
  tipo_documento: string | null;
  numero_documento: string | null;
  id_local: string | null;
  local_nome: string | null;
  km: number | null;
  id_tarifa: string | null;
  valor_km: number | null;
  valor_cotado: number | null;
  transportadora_codigo: number | null;
  transportadora_nome: string | null;
  observacao: string | null;
  status: StatusFrete;
  saldo_verificado: number | null;
  id_solicitante: string | null;
  nome_solicitante: string | null;
  cotado_por: string | null;
  motivo_cancelamento: string | null;
  nr_ad: number | null;
  valor_realizado: number | null;
  created_at: string;
}

interface Local {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  km: number | null;
  ativo: boolean;
}
interface Tarifa {
  id: string;
  nome: string;
  valor_km: number;
  ativo: boolean;
}
interface Transportadora {
  codigo: number;
  nome: string;
  cidade: string | null;
  uf: string | null;
}
interface ObraOpcao {
  id: string;
  codigo_externo: string;
  nome: string;
  id_responsavel: string | null;
}

const STATUS: Record<StatusFrete, { rotulo: string; classe: string }> = {
  aguardando_cotacao: { rotulo: "Aguardando cotação", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  liberado: { rotulo: "Liberado", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  bloqueado: { rotulo: "Bloqueado – sem verba", classe: "bg-red-50 text-red-700 border-red-200" },
  realizado: { rotulo: "Realizado", classe: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelado: { rotulo: "Cancelado", classe: "bg-slate-50 text-slate-400 border-slate-200" },
};

const DOCUMENTOS: Record<string, string> = {
  op: "OP",
  sma: "SMA",
  pedido_compra: "Pedido de compra",
  pedido_venda: "Pedido de venda",
  outro: "Outro",
};

const EVENTO: Record<string, string> = {
  criado: "Pedido criado",
  alterado: "Alterado",
  cotado: "Cotação",
  aguardando_cotacao: "Aguardando cotação",
  liberado: "Liberado",
  bloqueado: "Bloqueado por falta de verba",
  cancelado: "Cancelado",
  realizado: "Realizado (CT-e)",
};

const hojeISO = () => new Date().toLocaleDateString("sv-SE");
const num = (v: string) => parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
const txtNum = (v: number | null | undefined, casas = 2) =>
  v === null || v === undefined
    ? ""
    : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const msgErro = (e: any) => String(e?.message || e || "Erro").replace(/^.*?ERROR:\s*/, "");

export const BadgeStatusFrete = ({ status }: { status: StatusFrete }) => (
  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS[status]?.classe}`}>
    {STATUS[status]?.rotulo || status}
  </span>
);

// ------------------------------------------------------------------------------------------------
// Tela principal

export function TelaFretes({
  usuario,
  idAberto,
  onAbrir,
  verTodasObras,
  idResponsavelEscopo,
  onPedirVerba,
}: {
  usuario: Usuario | null;
  idAberto: string | null;
  onAbrir: (id: string | null) => void;
  verTodasObras: boolean;
  idResponsavelEscopo: string | null | undefined;
  onPedirVerba: (codigoObra: string) => void;
}) {
  const ehLogistica = usuario?.perfil === "logistica";
  const mantemCadastros = ehLogistica || usuario?.perfil === "admin" || usuario?.perfil === "coordenador";
  const [aba, setAba] = useState<"fretes" | "cadastros">("fretes");
  const [fretes, setFretes] = useState<Frete[] | null>(null);
  const [locais, setLocais] = useState<Local[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [obras, setObras] = useState<ObraOpcao[]>([]);
  const [filtro, setFiltro] = useState<StatusFrete | "abertos" | "todos">("abertos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Frete | "novo" | null>(null);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const [f, l, t, tr, o] = await Promise.all([
      supabase.from("fretes").select("*").order("created_at", { ascending: false }),
      supabase.from("fretes_locais").select("*").order("nome"),
      supabase.from("fretes_tarifas").select("*").order("nome"),
      supabase.from("transportadoras").select("codigo, nome, cidade, uf").order("nome"),
      supabase.from("obras").select("id, codigo_externo, nome, id_responsavel").eq("status", "em_andamento").order("codigo_externo"),
    ]);
    if (f.error) setErro("Não foi possível carregar os fretes.");
    setFretes((f.data as Frete[]) || []);
    setLocais((l.data as Local[]) || []);
    setTarifas((t.data as Tarifa[]) || []);
    setTransportadoras((tr.data as Transportadora[]) || []);
    const todas = (o.data as ObraOpcao[]) || [];
    setObras(verTodasObras || ehLogistica ? todas : todas.filter((x) => x.id_responsavel === idResponsavelEscopo));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    (fretes || []).forEach((f) => (c[f.status] = (c[f.status] || 0) + 1));
    return c;
  }, [fretes]);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (fretes || []).filter((f) => {
      if (filtro === "abertos" && !["aguardando_cotacao", "bloqueado", "liberado"].includes(f.status)) return false;
      if (filtro !== "abertos" && filtro !== "todos" && f.status !== filtro) return false;
      if (!t) return true;
      return [f.numero, f.codigo_obra, f.local_nome, f.transportadora_nome, f.numero_documento, f.nome_solicitante]
        .map((x) => String(x ?? "").toLowerCase())
        .some((x) => x.includes(t));
    });
  }, [fretes, filtro, busca]);

  const aberto = idAberto ? (fretes || []).find((f) => f.id === idAberto) || null : null;
  const totalAberto = (fretes || [])
    .filter((f) => f.status === "liberado" && !f.nr_ad)
    .reduce((s, f) => s + Number(f.valor_cotado || 0), 0);

  if (fretes === null)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando os fretes…
      </p>
    );

  const filtros: { id: typeof filtro; rotulo: string }[] = [
    { id: "abertos", rotulo: "Em aberto" },
    { id: "aguardando_cotacao", rotulo: `Aguardando cotação (${contagem.aguardando_cotacao || 0})` },
    { id: "bloqueado", rotulo: `Bloqueados (${contagem.bloqueado || 0})` },
    { id: "liberado", rotulo: `Liberados (${contagem.liberado || 0})` },
    { id: "realizado", rotulo: "Realizados" },
    { id: "cancelado", rotulo: "Cancelados" },
    { id: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-[#2A6377]" /> Fretes
          </h2>
          <p className="text-sm text-slate-500">
            Pedidos de frete das obras com controle da verba da família de fretes (.510). Sem verba, o frete fica bloqueado e o
            gestor é avisado.
          </p>
        </div>
        <div className="flex gap-2">
          {mantemCadastros && (
            <div className="flex rounded-lg border overflow-hidden text-sm">
              {(["fretes", "cadastros"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  className={`px-3 py-2 font-semibold ${aba === a ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {a === "fretes" ? "Fretes" : "Locais e tarifas"}
                </button>
              ))}
            </div>
          )}
          {aba === "fretes" && (
            <button
              onClick={() => setEditando("novo")}
              className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Novo frete
            </button>
          )}
        </div>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {aba === "cadastros" ? (
        <CadastrosFrete locais={locais} tarifas={tarifas} onMudou={carregar} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Resumo rotulo="Aguardando cotação" valor={String(contagem.aguardando_cotacao || 0)} cor="text-blue-700" />
            <Resumo rotulo="Bloqueados sem verba" valor={String(contagem.bloqueado || 0)} cor="text-red-600" />
            <Resumo rotulo="Liberados (aguardando CT-e)" valor={String(contagem.liberado || 0)} cor="text-emerald-700" />
            <Resumo rotulo="Verba reservada" valor={formatarMoeda(totalAberto)} cor="text-slate-800" />
          </div>

          <div className="bg-white border rounded-xl">
            <div className="p-3 border-b flex flex-wrap items-center gap-2">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${filtro === f.id ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {f.rotulo}
                </button>
              ))}
              <div className="relative ml-auto">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Obra, local, transportadora…"
                  aria-label="Buscar fretes"
                  className="border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[#2A6377] w-64 max-w-full"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº</th>
                    <th className="px-3 py-2 text-left">Obra</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Frete</th>
                    <th className="px-3 py-2 text-left">Local</th>
                    <th className="px-3 py-2 text-left">Transportadora</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                        Nenhum frete neste filtro.
                      </td>
                    </tr>
                  ) : (
                    lista.map((f) => (
                      <tr key={f.id} className="border-t hover:bg-slate-50 cursor-pointer" {...linhaClicavel(() => onAbrir(f.id))}>
                        <td className="px-3 py-2 font-bold text-[#2A6377]">{f.numero}</td>
                        <td className="px-3 py-2">{f.codigo_obra}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatarDataSegura(f.data_frete)}</td>
                        <td className="px-3 py-2">
                          {f.operacao === "compra" ? "Compra" : "Venda"}
                          {f.tipo_documento && (
                            <span className="text-slate-400">
                              {" "}
                              · {DOCUMENTOS[f.tipo_documento] || f.tipo_documento} {f.numero_documento || ""}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">{f.local_nome || "-"}</td>
                        <td className="px-3 py-2">{f.transportadora_nome || "-"}</td>
                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                          {f.valor_realizado != null ? formatarMoeda(f.valor_realizado) : f.valor_cotado != null ? formatarMoeda(f.valor_cotado) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <BadgeStatusFrete status={f.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editando && (
        <ModalFrete
          frete={editando === "novo" ? null : editando}
          usuario={usuario}
          obras={obras}
          locais={locais.filter((l) => l.ativo)}
          tarifas={tarifas.filter((t) => t.ativo)}
          transportadoras={transportadoras}
          fretes={fretes}
          onFechar={() => setEditando(null)}
          onSalvo={async (id) => {
            setEditando(null);
            await carregar();
            onAbrir(id);
          }}
        />
      )}

      {aberto && !editando && (
        <DetalheFrete
          frete={aberto}
          usuario={usuario}
          podeGerir={ehLogistica || verTodasObras || aberto.id_solicitante === usuario?.id || obras.some((o) => o.id === aberto.id_obra)}
          onFechar={() => onAbrir(null)}
          onEditar={() => setEditando(aberto)}
          onMudou={carregar}
          onPedirVerba={onPedirVerba}
        />
      )}
      {idAberto && !aberto && fretes && (
        <p className="text-sm text-slate-400">Frete não encontrado ou sem acesso.</p>
      )}
    </div>
  );
}

const Resumo = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) => (
  <div className="bg-white border rounded-xl p-3">
    <p className="text-[10px] uppercase font-bold text-slate-400">{rotulo}</p>
    <p className={`text-xl font-bold tabular-nums ${cor}`}>{valor}</p>
  </div>
);

// ------------------------------------------------------------------------------------------------
// Novo frete / editar / cotar

function ModalFrete({
  frete,
  usuario,
  obras,
  locais,
  tarifas,
  transportadoras,
  fretes,
  onFechar,
  onSalvo,
}: {
  frete: Frete | null;
  usuario: Usuario | null;
  obras: ObraOpcao[];
  locais: Local[];
  tarifas: Tarifa[];
  transportadoras: Transportadora[];
  fretes: Frete[];
  onFechar: () => void;
  onSalvo: (id: string) => void;
}) {
  const ehLogistica = usuario?.perfil === "logistica";
  const [idObra, setIdObra] = useState(frete?.id_obra || (obras.length === 1 ? obras[0].id : ""));
  const [data, setData] = useState(frete?.data_frete || hojeISO());
  const [operacao, setOperacao] = useState<"compra" | "venda">(frete?.operacao || "compra");
  const [tipoDoc, setTipoDoc] = useState(frete?.tipo_documento || "");
  const [numDoc, setNumDoc] = useState(frete?.numero_documento || "");
  const [idLocal, setIdLocal] = useState(frete?.id_local || "");
  const [km, setKm] = useState(txtNum(frete?.km, 1).replace(/,0$/, ""));
  const [idTarifa, setIdTarifa] = useState(frete?.id_tarifa || "");
  const [valorKm, setValorKm] = useState(txtNum(frete?.valor_km));
  const [valor, setValor] = useState(txtNum(frete?.valor_cotado));
  const [valorEditado, setValorEditado] = useState(Boolean(frete?.valor_cotado));
  const [transp, setTransp] = useState(frete?.transportadora_codigo ? String(frete.transportadora_codigo) : "");
  const [obs, setObs] = useState(frete?.observacao || "");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const obra = obras.find((o) => o.id === idObra) || (frete ? { id: frete.id_obra, codigo_externo: frete.codigo_obra, nome: "", id_responsavel: null } : null);

  // verba disponivel da .510 (sem contar a reserva deste proprio frete)
  useEffect(() => {
    setSaldo(null);
    if (!idObra) return;
    supabase.rpc("frete_saldo", { p_id_obra: idObra, p_excluir: frete?.id || null }).then(({ data: s }) => setSaldo(s === null ? null : Number(s)));
  }, [idObra, frete?.id]);

  // valor sugerido = KM x R$/km (enquanto ninguem digitou o valor a mao)
  useEffect(() => {
    if (valorEditado) return;
    const v = num(km) * num(valorKm);
    setValor(v > 0 ? txtNum(v) : "");
  }, [km, valorKm, valorEditado]);

  const escolherLocal = (id: string) => {
    setIdLocal(id);
    const l = locais.find((x) => x.id === id);
    if (l?.km != null) setKm(txtNum(l.km, 1).replace(/,0$/, ""));
  };
  const escolherTarifa = (id: string) => {
    setIdTarifa(id);
    const t = tarifas.find((x) => x.id === id);
    if (t) setValorKm(txtNum(t.valor_km));
  };

  // historico de fretes para o mesmo local (realizado, se houver; senao o cotado)
  const historicoLocal = useMemo(() => {
    if (!idLocal) return null;
    const vals = fretes
      .filter((f) => f.id_local === idLocal && f.id !== frete?.id && ["liberado", "realizado"].includes(f.status))
      .map((f) => Number(f.valor_realizado ?? f.valor_cotado ?? 0))
      .filter((v) => v > 0);
    if (!vals.length) return null;
    return { n: vals.length, media: vals.reduce((a, b) => a + b, 0) / vals.length, ultimo: vals[0] };
  }, [idLocal, fretes, frete?.id]);

  const valorNum = num(valor);
  const ficaBloqueado = valorNum > 0 && saldo !== null && valorNum > saldo + 0.005;

  const salvar = async () => {
    setErro("");
    if (!idObra) return setErro("Escolha a obra.");
    if (!data) return setErro("Informe a data do frete.");
    setSalvando(true);
    const { data: id, error } = await supabase.rpc("frete_salvar", {
      p_id: frete?.id || null,
      p_id_obra: idObra,
      p_data: data,
      p_operacao: operacao,
      p_tipo_documento: tipoDoc || null,
      p_numero_documento: numDoc,
      p_id_local: idLocal || null,
      p_km: km ? num(km) : null,
      p_id_tarifa: idTarifa || null,
      p_valor_km: valorKm ? num(valorKm) : null,
      p_valor_cotado: valorNum > 0 ? valorNum : null,
      p_transportadora_codigo: transp ? Number(transp) : null,
      p_observacao: obs,
    });
    setSalvando(false);
    if (error) return setErro(msgErro(error));
    onSalvo(String(id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between">
          <div>
            <h3 className="font-bold text-lg">{frete ? `Frete ${frete.numero}` : "Novo frete"}</h3>
            <p className="text-xs text-slate-400">
              {ehLogistica
                ? "Informe a cotação: o app confere a verba da família de fretes da obra."
                : "Peça o frete; a logística completa a cotação (valor e transportadora)."}
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <Rotulo texto="Obra *" />
              <select
                value={idObra}
                onChange={(e) => setIdObra(e.target.value)}
                disabled={Boolean(frete)}
                className="border rounded-lg px-2 py-2 w-full text-sm bg-white disabled:bg-slate-50"
              >
                <option value="">— selecione —</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codigo_externo} - {o.nome}
                  </option>
                ))}
              </select>
              {obra && <p className="text-[11px] text-slate-400 mt-1">Família de fretes: {obra.codigo_externo}.510</p>}
            </div>
            <div>
              <Rotulo texto="Data *" />
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm" />
            </div>
            <div>
              <Rotulo texto="Operação *" />
              <select value={operacao} onChange={(e) => setOperacao(e.target.value as any)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="compra">Compra</option>
                <option value="venda">Venda</option>
              </select>
            </div>
            <div>
              <Rotulo texto="Tipo de documento" />
              <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">—</option>
                {Object.entries(DOCUMENTOS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Rotulo texto="Nº do documento" />
              <input
                value={numDoc}
                onChange={(e) => setNumDoc(e.target.value)}
                placeholder="ex.: 5392…"
                className="border rounded-lg px-2 py-2 w-full text-sm"
                autoComplete="off"
              />
            </div>
            <div className="col-span-2">
              <Rotulo texto="Local de coleta/entrega" />
              <select value={idLocal} onChange={(e) => escolherLocal(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">— selecione —</option>
                {locais.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                    {l.cidade ? ` · ${l.cidade}${l.uf ? "/" + l.uf : ""}` : ""}
                    {l.km != null ? ` · ${txtNum(l.km, 0)} km` : ""}
                  </option>
                ))}
              </select>
              {!locais.length && <p className="text-[11px] text-slate-400 mt-1">Nenhum local cadastrado ainda (aba “Locais e tarifas”).</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border rounded-lg p-3">
            <div>
              <Rotulo texto="KM" />
              <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" className="border rounded-lg px-2 py-2 w-full text-sm bg-white" />
            </div>
            <div>
              <Rotulo texto="Tarifa de referência" />
              <select value={idTarifa} onChange={(e) => escolherTarifa(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">— nenhuma —</option>
                {tarifas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} · {formatarMoeda(t.valor_km)}/km
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Rotulo texto="R$/km" />
              <input value={valorKm} onChange={(e) => setValorKm(e.target.value)} inputMode="decimal" className="border rounded-lg px-2 py-2 w-full text-sm bg-white" />
            </div>
            <div>
              <Rotulo texto={ehLogistica ? "Valor cotado (R$) *" : "Valor cotado (R$)"} />
              <input
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setValorEditado(true);
                }}
                inputMode="decimal"
                placeholder="0,00"
                className="border rounded-lg px-2 py-2 w-full text-sm bg-white font-semibold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {valorEditado ? (
                  <button type="button" className="underline" onClick={() => setValorEditado(false)}>
                    recalcular por KM × R$/km
                  </button>
                ) : (
                  "Calculado: KM × R$/km. Pode ajustar."
                )}
              </p>
            </div>
            <div className="col-span-2 md:col-span-4 text-xs text-slate-500 flex flex-wrap gap-x-4">
              <span>
                <MapPin size={12} className="inline -mt-0.5" aria-hidden="true" /> Histórico deste local:{" "}
                {historicoLocal ? (
                  <b>
                    média {formatarMoeda(historicoLocal.media)} em {historicoLocal.n} frete(s) · último {formatarMoeda(historicoLocal.ultimo)}
                  </b>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Rotulo texto="Transportadora" />
              <select value={transp} onChange={(e) => setTransp(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">— a definir —</option>
                {transportadoras.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                    {t.cidade ? ` · ${t.cidade}${t.uf ? "/" + t.uf : ""}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Cadastro do ERP. Não está na lista? Cadastre no ERP; aparece aqui na próxima sincronização.</p>
            </div>
            <div>
              <Rotulo texto="Observação" />
              <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="border rounded-lg px-3 py-2 w-full text-sm" />
            </div>
          </div>

          {obra && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                ficaBloqueado ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
              aria-live="polite"
            >
              Verba disponível em {obra.codigo_externo}.510:{" "}
              <b>{saldo === null ? "…" : formatarMoeda(Math.max(saldo, 0))}</b>
              {valorNum > 0 && saldo !== null && (
                <>
                  {" · "}
                  {ficaBloqueado ? (
                    <>
                      <AlertTriangle size={14} className="inline -mt-0.5" aria-hidden="true" /> vai ficar <b>BLOQUEADO</b> (faltam{" "}
                      {formatarMoeda(valorNum - Math.max(saldo, 0))}); o gestor e o assistente da obra serão avisados para pedir verba.
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} className="inline -mt-0.5" aria-hidden="true" /> vai ficar <b>liberado</b>.
                    </>
                  )}
                </>
              )}
              {!valorNum && <> · sem valor: fica aguardando a cotação da logística.</>}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex items-center justify-between gap-3 bg-slate-50/60 rounded-b-xl">
          <p className="text-sm text-red-600">{erro}</p>
          <button
            disabled={salvando}
            onClick={salvar}
            className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-2 disabled:opacity-60"
          >
            {salvando ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />} {frete ? "Salvar" : "Pedir frete"}
          </button>
        </div>
      </div>
    </div>
  );
}

const Rotulo = ({ texto }: { texto: string }) => <p className="block text-xs font-semibold mb-1">{texto}</p>;

// ------------------------------------------------------------------------------------------------
// Detalhe

function DetalheFrete({
  frete,
  usuario,
  podeGerir,
  onFechar,
  onEditar,
  onMudou,
  onPedirVerba,
}: {
  frete: Frete;
  usuario: Usuario | null;
  podeGerir: boolean;
  onFechar: () => void;
  onEditar: () => void;
  onMudou: () => void;
  onPedirVerba: (codigoObra: string) => void;
}) {
  const [eventos, setEventos] = useState<any[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const aberto = ["aguardando_cotacao", "liberado", "bloqueado"].includes(frete.status);
  const gestorDaObra = usuario?.perfil === "engenheiro" || usuario?.perfil === "assistente" || usuario?.perfil === "admin" || usuario?.perfil === "coordenador";

  useEffect(() => {
    supabase
      .from("fretes_eventos")
      .select("*")
      .eq("id_frete", frete.id)
      .order("id")
      .then(({ data }) => setEventos(data || []));
  }, [frete.id, frete.status]);

  const cancelar = async () => {
    const motivo = window.prompt("Motivo do cancelamento:");
    if (!motivo?.trim()) return;
    setOcupado(true);
    const { error } = await supabase.rpc("frete_cancelar", { p_id: frete.id, p_motivo: motivo });
    setOcupado(false);
    if (error) return setErro(msgErro(error));
    onMudou();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-lg flex items-center gap-2 flex-wrap">
              Frete {frete.numero} <BadgeStatusFrete status={frete.status} />
            </h3>
            <p className="text-xs text-slate-500">
              Obra {frete.codigo_obra} · família {frete.familia} · pedido por {frete.nome_solicitante}
            </p>
          </div>
          <button onClick={onFechar} className="text-slate-400" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 text-sm">
          {frete.status === "bloqueado" && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
              <p>
                <b>Sem verba na família de fretes.</b> Cotado {formatarMoeda(frete.valor_cotado)} · disponível{" "}
                {formatarMoeda(Math.max(Number(frete.saldo_verificado || 0), 0))}. Assim que a previsão da {frete.familia} aumentar, o frete é
                liberado automaticamente.
              </p>
              {gestorDaObra && (
                <button
                  onClick={() => onPedirVerba(frete.codigo_obra)}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs"
                >
                  Pedir aumento ou transferência de verba
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Info rotulo="Data" valor={formatarDataSegura(frete.data_frete)} />
            <Info
              rotulo="Frete"
              valor={`${frete.operacao === "compra" ? "Compra" : "Venda"}${frete.tipo_documento ? ` · ${DOCUMENTOS[frete.tipo_documento] || frete.tipo_documento} ${frete.numero_documento || ""}` : ""}`}
            />
            <Info rotulo="Local" valor={`${frete.local_nome || "-"}${frete.km != null ? ` · ${txtNum(frete.km, 0)} km` : ""}`} />
            <Info rotulo="Transportadora" valor={frete.transportadora_nome || "a definir"} />
            <Info rotulo="Valor cotado" valor={frete.valor_cotado != null ? <b>{formatarMoeda(frete.valor_cotado)}</b> : "aguardando cotação"} />
            <Info
              rotulo="Realizado (CT-e)"
              valor={frete.nr_ad ? `${formatarMoeda(frete.valor_realizado)} · AD ${frete.nr_ad}` : "-"}
            />
          </div>
          {frete.observacao && <p className="whitespace-pre-wrap border rounded-lg p-3">{frete.observacao}</p>}
          {frete.motivo_cancelamento && (
            <p className="text-slate-500">
              <b>Motivo do cancelamento:</b> {frete.motivo_cancelamento}
            </p>
          )}
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Histórico</p>
            <ul className="space-y-1">
              {eventos.map((e) => (
                <li key={e.id} className="text-[12px] text-slate-600">
                  <span className="text-slate-400">{new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span> ·{" "}
                  <b>{EVENTO[e.evento] || e.evento}</b>
                  {e.nome_usuario && e.nome_usuario !== "Sistema" ? ` (${e.nome_usuario})` : ""}
                  {e.detalhe ? ` — ${e.detalhe}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {aberto && podeGerir && (
          <div className="p-4 border-t flex items-center justify-between gap-2 bg-slate-50/60 rounded-b-xl">
            <p className="text-sm text-red-600">{erro}</p>
            <div className="flex gap-2">
              <button
                disabled={ocupado}
                onClick={cancelar}
                className="px-3 py-2 rounded-lg border text-slate-600 font-semibold flex items-center gap-1 text-sm"
              >
                <XCircle size={14} /> Cancelar frete
              </button>
              <button onClick={onEditar} className="px-3 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-1 text-sm">
                <Pencil size={14} /> {frete.status === "aguardando_cotacao" ? "Cotar" : "Editar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Info = ({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) => (
  <div>
    <p className="text-[11px] text-slate-400">{rotulo}</p>
    <p className="text-slate-800">{valor}</p>
  </div>
);

// ------------------------------------------------------------------------------------------------
// Cadastros: locais (KM) e tarifas (R$/km) - logistica/admin

function CadastrosFrete({ locais, tarifas, onMudou }: { locais: Local[]; tarifas: Tarifa[]; onMudou: () => void }) {
  const [erro, setErro] = useState("");
  const [novoLocal, setNovoLocal] = useState({ nome: "", cidade: "", uf: "", km: "" });
  const [novaTarifa, setNovaTarifa] = useState({ nome: "", valor_km: "" });

  const gravar = async (p: PromiseLike<{ error: any }>) => {
    setErro("");
    const { error } = await p;
    if (error) {
      setErro(msgErro(error));
      return false;
    }
    onMudou();
    return true;
  };

  const addLocal = async () => {
    if (!novoLocal.nome.trim()) return setErro("Informe o nome do local.");
    const ok = await gravar(
      supabase.from("fretes_locais").insert({
        nome: novoLocal.nome.trim(),
        cidade: novoLocal.cidade.trim() || null,
        uf: novoLocal.uf.trim().toUpperCase() || null,
        km: novoLocal.km ? num(novoLocal.km) : null,
      }),
    );
    if (ok) setNovoLocal({ nome: "", cidade: "", uf: "", km: "" });
  };
  const addTarifa = async () => {
    if (!novaTarifa.nome.trim() || num(novaTarifa.valor_km) <= 0) return setErro("Informe o nome e o R$/km da tarifa.");
    const ok = await gravar(supabase.from("fretes_tarifas").insert({ nome: novaTarifa.nome.trim(), valor_km: num(novaTarifa.valor_km) }));
    if (ok) setNovaTarifa({ nome: "", valor_km: "" });
  };

  const inp = "border rounded-lg px-2 py-1.5 text-sm w-full";
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {erro && <p className="text-sm text-red-600 lg:col-span-2">{erro}</p>}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-slate-800">Locais de coleta/entrega</h3>
        <p className="text-xs text-slate-500">KM a partir da Kalter. Usado para sugerir o valor do frete (KM × R$/km).</p>
        <div className="grid grid-cols-12 gap-2 items-end">
          <input className={`${inp} col-span-12 md:col-span-5`} placeholder="Nome (fornecedor/cliente/obra)" value={novoLocal.nome} onChange={(e) => setNovoLocal({ ...novoLocal, nome: e.target.value })} aria-label="Nome do local" />
          <input className={`${inp} col-span-6 md:col-span-3`} placeholder="Cidade" value={novoLocal.cidade} onChange={(e) => setNovoLocal({ ...novoLocal, cidade: e.target.value })} aria-label="Cidade" />
          <input className={`${inp} col-span-2 md:col-span-1`} placeholder="UF" maxLength={2} value={novoLocal.uf} onChange={(e) => setNovoLocal({ ...novoLocal, uf: e.target.value })} aria-label="UF" />
          <input className={`${inp} col-span-4 md:col-span-2`} placeholder="KM" inputMode="decimal" value={novoLocal.km} onChange={(e) => setNovoLocal({ ...novoLocal, km: e.target.value })} aria-label="KM" />
          <button onClick={addLocal} className="col-span-12 md:col-span-1 h-[34px] rounded-lg bg-[#2A6377] text-white flex items-center justify-center" aria-label="Adicionar local" title="Adicionar local">
            <Plus size={16} />
          </button>
        </div>
        <ul className="divide-y border rounded-lg">
          {locais.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">Nenhum local cadastrado.</li>}
          {locais.map((l) => (
            <li key={l.id} className={`px-3 py-2 text-sm flex items-center gap-2 ${l.ativo ? "" : "opacity-50"}`}>
              <span className="flex-1 min-w-0 truncate">
                <b>{l.nome}</b>
                {l.cidade ? ` · ${l.cidade}${l.uf ? "/" + l.uf : ""}` : ""}
              </span>
              <input
                defaultValue={l.km ?? ""}
                inputMode="decimal"
                aria-label={`KM de ${l.nome}`}
                className="border rounded px-2 py-1 w-20 text-right text-sm tabular-nums"
                onBlur={(e) => {
                  const v = e.target.value ? num(e.target.value) : null;
                  if (v !== (l.km == null ? null : Number(l.km))) gravar(supabase.from("fretes_locais").update({ km: v }).eq("id", l.id));
                }}
              />
              <span className="text-xs text-slate-400">km</span>
              <button
                onClick={() => gravar(supabase.from("fretes_locais").update({ ativo: !l.ativo }).eq("id", l.id))}
                className="text-xs text-slate-500 hover:text-[#2A6377] underline"
              >
                {l.ativo ? "desativar" : "ativar"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-slate-800">Tarifas de referência</h3>
        <p className="text-xs text-slate-500">Valor por km por tipo de veículo ou transportadora (ex.: Truck, Carreta, Fiorino).</p>
        <div className="grid grid-cols-12 gap-2 items-end">
          <input className={`${inp} col-span-7`} placeholder="Nome da tarifa" value={novaTarifa.nome} onChange={(e) => setNovaTarifa({ ...novaTarifa, nome: e.target.value })} aria-label="Nome da tarifa" />
          <input className={`${inp} col-span-3`} placeholder="R$/km" inputMode="decimal" value={novaTarifa.valor_km} onChange={(e) => setNovaTarifa({ ...novaTarifa, valor_km: e.target.value })} aria-label="R$ por km" />
          <button onClick={addTarifa} className="col-span-2 h-[34px] rounded-lg bg-[#2A6377] text-white flex items-center justify-center" aria-label="Adicionar tarifa" title="Adicionar tarifa">
            <Plus size={16} />
          </button>
        </div>
        <ul className="divide-y border rounded-lg">
          {tarifas.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">Nenhuma tarifa cadastrada.</li>}
          {tarifas.map((t) => (
            <li key={t.id} className={`px-3 py-2 text-sm flex items-center gap-2 ${t.ativo ? "" : "opacity-50"}`}>
              <span className="flex-1 min-w-0 truncate font-semibold">{t.nome}</span>
              <input
                defaultValue={txtNum(t.valor_km)}
                inputMode="decimal"
                aria-label={`R$/km de ${t.nome}`}
                className="border rounded px-2 py-1 w-24 text-right text-sm tabular-nums"
                onBlur={(e) => {
                  const v = num(e.target.value);
                  if (v > 0 && v !== Number(t.valor_km)) gravar(supabase.from("fretes_tarifas").update({ valor_km: v }).eq("id", t.id));
                }}
              />
              <span className="text-xs text-slate-400">R$/km</span>
              <button
                onClick={() => gravar(supabase.from("fretes_tarifas").update({ ativo: !t.ativo }).eq("id", t.id))}
                className="text-xs text-slate-500 hover:text-[#2A6377] underline"
              >
                {t.ativo ? "desativar" : "ativar"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
