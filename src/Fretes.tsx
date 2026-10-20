import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Pencil, Plus, Search, Trash2, Truck, X, XCircle } from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, formatarMoeda } from "./utils";
import { linhaClicavel } from "./teclado";
import type { Usuario } from "./types";

// Fretes (2026-10-20): solicitacao de frete com controle da verba da familia <obra>.510.
// Quem pede: logistica, gestor e assistente; a logistica cota.
// Rota origem -> destino por municipio (IBGE): Kalter (Joinville), fornecedor do ERP, cidade da obra ou outra cidade.
// Distancia estimada pelo banco (frete_distancia: ajuste da logistica ou linha reta x 1,25). Transportadora =
// fornecedor do ERP marcado como transportadora (o robo marca quem ja emitiu CT-e); tarifa por tipo de veiculo,
// UFs atendidas e historico real dos CT-es -> frete_sugestoes ordena pelo preco.
// O banco confere o saldo da .510 (previsoes em aberto no ERP - fretes liberados ainda sem CT-e):
//   com saldo -> "liberado" (verba reservada); sem saldo -> "bloqueado" + aviso ao gestor e assistentes.
// Gravacoes so pelas funcoes do banco: frete_salvar, frete_cancelar, frete_marcar_transportadora.

type StatusFrete = "aguardando_cotacao" | "liberado" | "bloqueado" | "realizado" | "cancelado";
type TipoPonto = "kalter" | "fornecedor" | "obra" | "outro";

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
  origem_tipo: TipoPonto | null;
  origem_ibge: number | null;
  origem_nome: string | null;
  destino_tipo: TipoPonto | null;
  destino_ibge: number | null;
  destino_nome: string | null;
  cod_fornecedor: number | null;
  tipo_veiculo: string | null;
  km: number | null;
  km_estimado: number | null;
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

interface Fornecedor {
  codigo: number;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ibge: number | null;
  transportadora: boolean;
}
interface Municipio {
  ibge: number;
  nome: string;
  uf: string;
}
interface ObraOpcao {
  id: string;
  codigo_externo: string;
  nome: string;
  id_responsavel: string | null;
  cidade_ibge: number | null;
}
interface Sugestao {
  transportadora_codigo: number;
  transportadora_nome: string;
  km: number | null;
  valor_km: number;
  valor_minimo: number;
  preco: number;
  historico_rs_km: number | null;
  historico_ctes: number | null;
  atende: boolean;
}
interface Tarifa {
  id: string;
  transportadora_codigo: number;
  tipo_veiculo: string;
  valor_km: number;
  valor_minimo: number;
  ativo: boolean;
}
interface Historico {
  transportadora_codigo: number;
  ctes: number;
  valor_total: number;
  rs_km: number | null;
  ufs: string[];
  ultimo_cte: string | null;
}

const KALTER = { ibge: 4209102, nome: "Kalter - Joinville/SC" };
export const VEICULOS = ["Carga fracionada", "Utilitário/Fiorino", "VUC", "3/4", "Toco", "Truck", "Carreta"];
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

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
const rota = (f: Pick<Frete, "origem_nome" | "destino_nome">) =>
  f.origem_nome || f.destino_nome ? `${f.origem_nome || "?"} → ${f.destino_nome || "?"}` : "-";

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
  const [aba, setAba] = useState<"fretes" | "transportadoras">("fretes");
  const [fretes, setFretes] = useState<Frete[] | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [obras, setObras] = useState<ObraOpcao[]>([]);
  const [filtro, setFiltro] = useState<StatusFrete | "abertos" | "todos">("abertos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Frete | "novo" | null>(null);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const [f, fo, o] = await Promise.all([
      supabase.from("fretes").select("*").order("created_at", { ascending: false }),
      supabase.from("fornecedores_erp").select("codigo, nome, cidade, uf, ibge, transportadora").order("nome"),
      supabase.from("obras").select("id, codigo_externo, nome, id_responsavel, cidade_ibge").eq("status", "em_andamento").order("codigo_externo"),
    ]);
    if (f.error) setErro("Não foi possível carregar os fretes.");
    setFretes((f.data as Frete[]) || []);
    setFornecedores((fo.data as Fornecedor[]) || []);
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
      return [f.numero, f.codigo_obra, f.origem_nome, f.destino_nome, f.transportadora_nome, f.numero_documento, f.nome_solicitante]
        .map((x) => String(x ?? "").toLowerCase())
        .some((x) => x.includes(t));
    });
  }, [fretes, filtro, busca]);

  const aberto = idAberto ? (fretes || []).find((f) => f.id === idAberto) || null : null;
  const totalReservado = (fretes || [])
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
              {(["fretes", "transportadoras"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAba(a)}
                  className={`px-3 py-2 font-semibold ${aba === a ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {a === "fretes" ? "Fretes" : "Transportadoras"}
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

      {aba === "transportadoras" ? (
        <CadastroTransportadoras fornecedores={fornecedores} onMudou={carregar} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Resumo rotulo="Aguardando cotação" valor={String(contagem.aguardando_cotacao || 0)} cor="text-blue-700" />
            <Resumo rotulo="Bloqueados sem verba" valor={String(contagem.bloqueado || 0)} cor="text-red-600" />
            <Resumo rotulo="Liberados (aguardando CT-e)" valor={String(contagem.liberado || 0)} cor="text-emerald-700" />
            <Resumo rotulo="Verba reservada" valor={formatarMoeda(totalReservado)} cor="text-slate-800" />
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
                  placeholder="Obra, cidade, transportadora…"
                  aria-label="Buscar fretes"
                  className="border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[#2A6377] w-64 max-w-full"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº</th>
                    <th className="px-3 py-2 text-left">Obra</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Frete</th>
                    <th className="px-3 py-2 text-left">Rota</th>
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
                          {f.tipo_veiculo && <span className="text-slate-400"> · {f.tipo_veiculo}</span>}
                        </td>
                        <td className="px-3 py-2 max-w-[260px]">
                          <span className="line-clamp-2">{rota(f)}</span>
                          {f.km != null && <span className="text-[11px] text-slate-400">{txtNum(f.km, 0)} km</span>}
                        </td>
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
          fornecedores={fornecedores}
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
      {idAberto && !aberto && fretes && <p className="text-sm text-slate-400">Frete não encontrado ou sem acesso.</p>}
    </div>
  );
}

const Resumo = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) => (
  <div className="bg-white border rounded-xl p-3">
    <p className="text-[10px] uppercase font-bold text-slate-400">{rotulo}</p>
    <p className={`text-xl font-bold tabular-nums ${cor}`}>{valor}</p>
  </div>
);

const Rotulo = ({ texto }: { texto: string }) => <p className="block text-xs font-semibold mb-1">{texto}</p>;

// ------------------------------------------------------------------------------------------------
// Origem / destino: Kalter, fornecedor do ERP, cidade da obra ou outra cidade

interface Ponto {
  tipo: TipoPonto;
  ibge: number | null;
  nome: string;
  codFornecedor: number | null;
}

const pontoKalter = (): Ponto => ({ tipo: "kalter", ibge: KALTER.ibge, nome: KALTER.nome, codFornecedor: null });

function EscolhaPonto({
  titulo,
  ponto,
  onChange,
  fornecedores,
  obra,
  cidadeObra,
}: {
  titulo: string;
  ponto: Ponto;
  onChange: (p: Ponto) => void;
  fornecedores: Fornecedor[];
  obra: ObraOpcao | null;
  cidadeObra: Municipio | null;
}) {
  const [busca, setBusca] = useState("");
  const [cidades, setCidades] = useState<Municipio[]>([]);

  // busca de cidade (tipo "outro"): municipios por nome
  useEffect(() => {
    if (ponto.tipo !== "outro" || busca.trim().length < 3) return setCidades([]);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("municipios").select("ibge, nome, uf").ilike("nome", `%${busca.trim()}%`).order("nome").limit(20);
      setCidades((data as Municipio[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [busca, ponto.tipo]);

  const fornecedoresFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (ponto.tipo !== "fornecedor" || t.length < 2) return [];
    return fornecedores
      .filter((f) => f.ibge && (f.nome.toLowerCase().includes(t) || String(f.codigo) === t || (f.cidade || "").toLowerCase().includes(t)))
      .slice(0, 20);
  }, [busca, fornecedores, ponto.tipo]);

  const trocarTipo = (tipo: TipoPonto) => {
    setBusca("");
    if (tipo === "kalter") onChange(pontoKalter());
    else if (tipo === "obra")
      onChange({
        tipo,
        ibge: obra?.cidade_ibge || null,
        nome: cidadeObra ? `Obra ${obra?.codigo_externo} - ${cidadeObra.nome}/${cidadeObra.uf}` : `Obra ${obra?.codigo_externo || ""} (cidade não cadastrada)`,
        codFornecedor: null,
      });
    else onChange({ tipo, ibge: null, nome: "", codFornecedor: null });
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-white">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase text-slate-500">{titulo}</p>
        <select
          value={ponto.tipo}
          onChange={(e) => trocarTipo(e.target.value as TipoPonto)}
          aria-label={`Tipo de ${titulo.toLowerCase()}`}
          className="border rounded-lg px-2 py-1 text-xs bg-white"
        >
          <option value="kalter">Kalter (Joinville)</option>
          <option value="fornecedor">Fornecedor</option>
          <option value="obra">Obra</option>
          <option value="outro">Outra cidade</option>
        </select>
      </div>
      {(ponto.tipo === "fornecedor" || ponto.tipo === "outro") && (
        <div className="relative">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={ponto.tipo === "fornecedor" ? "Buscar fornecedor (nome, código ou cidade)…" : "Buscar cidade…"}
            aria-label={ponto.tipo === "fornecedor" ? "Buscar fornecedor" : "Buscar cidade"}
            autoComplete="off"
            className="border rounded-lg px-2 py-1.5 w-full text-sm"
          />
          {(fornecedoresFiltrados.length > 0 || cidades.length > 0) && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
              {fornecedoresFiltrados.map((f) => (
                <li key={f.codigo}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
                    onClick={() => {
                      onChange({ tipo: "fornecedor", ibge: f.ibge, nome: `${f.nome} - ${f.cidade}/${f.uf}`, codFornecedor: f.codigo });
                      setBusca("");
                    }}
                  >
                    <b>{f.nome}</b> <span className="text-slate-400">· {f.cidade}/{f.uf} · cód. {f.codigo}</span>
                  </button>
                </li>
              ))}
              {cidades.map((c) => (
                <li key={c.ibge}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
                    onClick={() => {
                      onChange({ tipo: "outro", ibge: c.ibge, nome: `${c.nome}/${c.uf}`, codFornecedor: null });
                      setBusca("");
                    }}
                  >
                    {c.nome}/{c.uf}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className={`text-sm ${ponto.ibge ? "text-slate-800 font-semibold" : "text-amber-700"}`}>
        {ponto.nome || (ponto.tipo === "fornecedor" ? "Escolha o fornecedor" : "Escolha a cidade")}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Novo frete / editar / cotar

function ModalFrete({
  frete,
  usuario,
  obras,
  fornecedores,
  onFechar,
  onSalvo,
}: {
  frete: Frete | null;
  usuario: Usuario | null;
  obras: ObraOpcao[];
  fornecedores: Fornecedor[];
  onFechar: () => void;
  onSalvo: (id: string) => void;
}) {
  // quem cota: logistica (e admin/coordenador)
  const ehLogistica = ["logistica", "admin", "coordenador"].includes(usuario?.perfil || "");
  const transportadoras = useMemo(() => fornecedores.filter((f) => f.transportadora), [fornecedores]);
  const [idObra, setIdObra] = useState(frete?.id_obra || (obras.length === 1 ? obras[0].id : ""));
  const [data, setData] = useState(frete?.data_frete || hojeISO());
  const [operacao, setOperacao] = useState<"compra" | "venda">(frete?.operacao || "compra");
  const [tipoDoc, setTipoDoc] = useState(frete?.tipo_documento || "");
  const [numDoc, setNumDoc] = useState(frete?.numero_documento || "");
  const [origem, setOrigem] = useState<Ponto>(
    frete
      ? { tipo: frete.origem_tipo || "outro", ibge: frete.origem_ibge, nome: frete.origem_nome || "", codFornecedor: frete.origem_tipo === "fornecedor" ? frete.cod_fornecedor : null }
      : { tipo: "fornecedor", ibge: null, nome: "", codFornecedor: null },
  );
  const [destino, setDestino] = useState<Ponto>(
    frete
      ? { tipo: frete.destino_tipo || "outro", ibge: frete.destino_ibge, nome: frete.destino_nome || "", codFornecedor: frete.destino_tipo === "fornecedor" ? frete.cod_fornecedor : null }
      : pontoKalter(),
  );
  const [veiculo, setVeiculo] = useState(frete?.tipo_veiculo || "");
  const [km, setKm] = useState(frete?.km != null ? txtNum(frete.km, 0) : "");
  const [kmEstimado, setKmEstimado] = useState<number | null>(frete?.km_estimado ?? null);
  const [valorKm, setValorKm] = useState(txtNum(frete?.valor_km));
  const [valor, setValor] = useState(txtNum(frete?.valor_cotado));
  const [transp, setTransp] = useState(frete?.transportadora_codigo ? String(frete.transportadora_codigo) : "");
  const [obs, setObs] = useState(frete?.observacao || "");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null);
  const [cidadeObra, setCidadeObra] = useState<Municipio | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const obra = obras.find((o) => o.id === idObra) || null;

  // cidade da obra (destino padrao da venda)
  useEffect(() => {
    setCidadeObra(null);
    if (!obra?.cidade_ibge) return;
    supabase
      .from("municipios")
      .select("ibge, nome, uf")
      .eq("ibge", obra.cidade_ibge)
      .maybeSingle()
      .then(({ data: m }) => setCidadeObra((m as Municipio) || null));
  }, [obra?.cidade_ibge]);

  // padrao da rota pela operacao (so em frete novo): compra = fornecedor -> Kalter; venda = Kalter -> obra
  const aplicarPadrao = (op: "compra" | "venda") => {
    setOperacao(op);
    if (frete) return;
    if (op === "compra") {
      setOrigem({ tipo: "fornecedor", ibge: null, nome: "", codFornecedor: null });
      setDestino(pontoKalter());
    } else {
      setOrigem(pontoKalter());
      setDestino({
        tipo: "obra",
        ibge: obra?.cidade_ibge || null,
        nome: cidadeObra ? `Obra ${obra?.codigo_externo} - ${cidadeObra.nome}/${cidadeObra.uf}` : "",
        codFornecedor: null,
      });
    }
  };
  // destino "obra" acompanha a obra escolhida
  useEffect(() => {
    if (destino.tipo === "obra" && obra)
      setDestino({
        tipo: "obra",
        ibge: obra.cidade_ibge,
        nome: cidadeObra ? `Obra ${obra.codigo_externo} - ${cidadeObra.nome}/${cidadeObra.uf}` : `Obra ${obra.codigo_externo} (cidade não cadastrada)`,
        codFornecedor: null,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra?.id, cidadeObra?.ibge]);

  // verba disponivel da .510 (sem contar a reserva deste proprio frete)
  useEffect(() => {
    setSaldo(null);
    if (!idObra) return;
    supabase.rpc("frete_saldo", { p_id_obra: idObra, p_excluir: frete?.id || null }).then(({ data: s }) => setSaldo(s === null ? null : Number(s)));
  }, [idObra, frete?.id]);

  // distancia estimada quando a rota muda
  useEffect(() => {
    if (!origem.ibge || !destino.ibge) return setKmEstimado(null);
    supabase.rpc("frete_distancia", { p_origem: origem.ibge, p_destino: destino.ibge }).then(({ data: d }) => {
      const v = d === null ? null : Number(d);
      setKmEstimado(v);
      if (v !== null) setKm(txtNum(v, 0));
    });
  }, [origem.ibge, destino.ibge]);

  // transportadoras sugeridas para a rota + veiculo
  useEffect(() => {
    setSugestoes(null);
    if (!origem.ibge || !destino.ibge || !veiculo) return;
    supabase
      .rpc("frete_sugestoes", { p_origem: origem.ibge, p_destino: destino.ibge, p_tipo_veiculo: veiculo })
      .then(({ data: s }) => setSugestoes((s as Sugestao[]) || []));
  }, [origem.ibge, destino.ibge, veiculo]);

  const escolherSugestao = (s: Sugestao) => {
    setTransp(String(s.transportadora_codigo));
    setValorKm(txtNum(s.valor_km));
    setValor(txtNum(s.preco));
  };

  const valorNum = num(valor);
  const ficaBloqueado = valorNum > 0 && saldo !== null && valorNum > saldo + 0.005;
  const kmNum = km ? num(km) : null;

  const salvar = async () => {
    setErro("");
    if (!idObra) return setErro("Escolha a obra.");
    if (!data) return setErro("Informe a data do frete.");
    if (!origem.ibge || !destino.ibge) return setErro("Escolha a origem e o destino do frete.");
    setSalvando(true);
    const { data: id, error } = await supabase.rpc("frete_salvar", {
      p_id: frete?.id || null,
      p_id_obra: idObra,
      p_data: data,
      p_operacao: operacao,
      p_tipo_documento: tipoDoc || null,
      p_numero_documento: numDoc,
      p_origem_tipo: origem.tipo,
      p_origem_ibge: origem.ibge,
      p_origem_nome: origem.nome,
      p_destino_tipo: destino.tipo,
      p_destino_ibge: destino.ibge,
      p_destino_nome: destino.nome,
      p_cod_fornecedor: origem.codFornecedor || destino.codFornecedor || null,
      p_tipo_veiculo: veiculo || null,
      p_km: kmNum,
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
                ? "Informe a rota e a cotação: o app sugere a transportadora e confere a verba da família de fretes."
                : "Peça o frete; a logística completa a cotação (transportadora e valor)."}
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
              <select value={operacao} onChange={(e) => aplicarPadrao(e.target.value as any)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="compra">Compra (retirada)</option>
                <option value="venda">Venda / envio para obra</option>
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
              <input value={numDoc} onChange={(e) => setNumDoc(e.target.value)} placeholder="ex.: 5392…" className="border rounded-lg px-2 py-2 w-full text-sm" autoComplete="off" />
            </div>
            <div className="col-span-2">
              <Rotulo texto="Tipo de veículo" />
              <select value={veiculo} onChange={(e) => setVeiculo(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">— a definir —</option>
                {VEICULOS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <EscolhaPonto titulo="Origem" ponto={origem} onChange={setOrigem} fornecedores={fornecedores} obra={obra} cidadeObra={cidadeObra} />
            <ArrowRight className="text-slate-400 hidden md:block" aria-hidden="true" />
            <EscolhaPonto titulo="Destino" ponto={destino} onChange={setDestino} fornecedores={fornecedores} obra={obra} cidadeObra={cidadeObra} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 border rounded-lg p-3">
            <div>
              <Rotulo texto="Distância (km)" />
              <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" className="border rounded-lg px-2 py-2 w-full text-sm bg-white" />
              <p className="text-[11px] text-slate-400 mt-1">
                {kmEstimado != null ? `Estimada: ${txtNum(kmEstimado, 0)} km.` : "Escolha origem e destino."}
                {ehLogistica && " Corrigindo, vale para as próximas vezes."}
              </p>
            </div>
            <div>
              <Rotulo texto="Transportadora" />
              <select value={transp} onChange={(e) => setTransp(e.target.value)} className="border rounded-lg px-2 py-2 w-full text-sm bg-white">
                <option value="">— a definir —</option>
                {transportadoras.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Rotulo texto="R$/km" />
              <input
                value={valorKm}
                onChange={(e) => {
                  setValorKm(e.target.value);
                  const v = num(e.target.value) * (kmNum || 0);
                  if (v > 0) setValor(txtNum(v));
                }}
                inputMode="decimal"
                className="border rounded-lg px-2 py-2 w-full text-sm bg-white"
              />
            </div>
            <div>
              <Rotulo texto={ehLogistica ? "Valor cotado (R$) *" : "Valor cotado (R$)"} />
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="0,00" className="border rounded-lg px-2 py-2 w-full text-sm bg-white font-semibold" />
            </div>
          </div>

          {veiculo && origem.ibge && destino.ibge && (
            <div className="border rounded-lg">
              <p className="px-3 py-2 text-xs font-bold uppercase text-slate-500 border-b">
                Transportadoras para esta rota ({veiculo})
              </p>
              {sugestoes === null ? (
                <p className="px-3 py-3 text-sm text-slate-400">Calculando…</p>
              ) : sugestoes.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-400">
                  Nenhuma transportadora com tarifa de “{veiculo}” cadastrada. A logística cadastra em “Transportadoras”.
                </p>
              ) : (
                <ul className="divide-y">
                  {sugestoes.map((s, i) => (
                    <li key={s.transportadora_codigo} className={`px-3 py-2 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 ${s.atende ? "" : "opacity-60"}`}>
                      <span className="flex-1 min-w-[200px]">
                        <b>{s.transportadora_nome}</b>
                        {i === 0 && s.atende && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                            menor preço
                          </span>
                        )}
                        {!s.atende && <span className="ml-2 text-[11px] text-amber-700">não atende origem/destino (UF)</span>}
                        <span className="block text-[11px] text-slate-400">
                          {formatarMoeda(s.valor_km)}/km · mínimo {formatarMoeda(s.valor_minimo)}
                          {s.historico_ctes ? ` · histórico ${formatarMoeda(s.historico_rs_km)}/km em ${s.historico_ctes} CT-e(s)` : ""}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums">{formatarMoeda(s.preco)}</span>
                      {ehLogistica && (
                        <button type="button" onClick={() => escolherSugestao(s)} className="text-xs px-2 py-1 rounded border text-[#2A6377] font-semibold hover:bg-slate-50">
                          Usar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <Rotulo texto="Observação" />
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="border rounded-lg px-3 py-2 w-full text-sm" />
          </div>

          {obra && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${ficaBloqueado ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}
              aria-live="polite"
            >
              Verba disponível em {obra.codigo_externo}.510: <b>{saldo === null ? "…" : formatarMoeda(Math.max(saldo, 0))}</b>
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
          <button disabled={salvando} onClick={salvar} className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-2 disabled:opacity-60">
            {salvando ? <Loader2 className="animate-spin" size={16} /> : <Truck size={16} />} {frete ? "Salvar" : "Pedir frete"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const gestorDaObra = ["engenheiro", "assistente", "admin", "coordenador"].includes(usuario?.perfil || "");

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
                <button onClick={() => onPedirVerba(frete.codigo_obra)} className="mt-2 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold text-xs">
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
            <div className="col-span-2">
              <Info rotulo="Rota" valor={`${rota(frete)}${frete.km != null ? ` · ${txtNum(frete.km, 0)} km` : ""}`} />
            </div>
            <Info rotulo="Veículo" valor={frete.tipo_veiculo || "a definir"} />
            <Info rotulo="Transportadora" valor={frete.transportadora_nome || "a definir"} />
            <Info rotulo="Valor cotado" valor={frete.valor_cotado != null ? <b>{formatarMoeda(frete.valor_cotado)}</b> : "aguardando cotação"} />
            <Info rotulo="Realizado (CT-e)" valor={frete.nr_ad ? `${formatarMoeda(frete.valor_realizado)} · AD ${frete.nr_ad}` : "-"} />
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
              <button disabled={ocupado} onClick={cancelar} className="px-3 py-2 rounded-lg border text-slate-600 font-semibold flex items-center gap-1 text-sm">
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
// Transportadoras: UFs atendidas, tarifa por tipo de veiculo e historico real dos CT-es (logistica/admin)

function CadastroTransportadoras({ fornecedores, onMudou }: { fornecedores: Fornecedor[]; onMudou: () => void }) {
  const [ufs, setUfs] = useState<{ transportadora_codigo: number; uf: string; origem: string }[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [aberta, setAberta] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [novaBusca, setNovaBusca] = useState("");
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const [u, t, h] = await Promise.all([
      supabase.from("fretes_transp_ufs").select("*"),
      supabase.from("fretes_transp_tarifas").select("*"),
      supabase.from("fretes_transp_historico").select("*"),
    ]);
    setUfs(u.data || []);
    setTarifas((t.data as Tarifa[]) || []);
    setHistorico((h.data as Historico[]) || []);
  };
  useEffect(() => {
    carregar();
  }, []);

  const gravar = async (p: PromiseLike<{ error: any }>) => {
    setErro("");
    const { error } = await p;
    if (error) return setErro(msgErro(error));
    carregar();
  };

  const transportadoras = fornecedores
    .filter((f) => f.transportadora)
    .filter((f) => !busca.trim() || f.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .map((f) => ({ ...f, hist: historico.find((h) => h.transportadora_codigo === f.codigo) }))
    .sort((a, b) => (b.hist?.ctes || 0) - (a.hist?.ctes || 0));

  const candidatas = novaBusca.trim().length >= 3
    ? fornecedores.filter((f) => !f.transportadora && f.nome.toLowerCase().includes(novaBusca.trim().toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-xl p-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600 flex-1 min-w-[260px]">
          Transportadoras são fornecedores do ERP. Quem já emitiu CT-e entra sozinho, com as UFs e o R$/km dos últimos 12 meses. Cadastre a
          tarifa por tipo de veículo para o app sugerir a melhor opção em cada frete.
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar…" aria-label="Filtrar transportadoras" className="border rounded-lg pl-8 pr-3 py-1.5 text-sm w-48" />
        </div>
        <div className="relative">
          <input
            value={novaBusca}
            onChange={(e) => setNovaBusca(e.target.value)}
            placeholder="Adicionar transportadora (fornecedor)…"
            aria-label="Adicionar transportadora"
            className="border rounded-lg px-3 py-1.5 text-sm w-72"
          />
          {candidatas.length > 0 && (
            <ul className="absolute z-10 right-0 mt-1 w-96 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto text-sm">
              {candidatas.map((f) => (
                <li key={f.codigo}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
                    onClick={async () => {
                      setNovaBusca("");
                      const { error } = await supabase.rpc("frete_marcar_transportadora", { p_codigo: f.codigo, p_sim: true });
                      if (error) setErro(msgErro(error));
                      else {
                        onMudou();
                        setAberta(f.codigo);
                      }
                    }}
                  >
                    <b>{f.nome}</b> <span className="text-slate-400">· {f.cidade}/{f.uf} · cód. {f.codigo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="bg-white border rounded-xl divide-y">
        {transportadoras.length === 0 && <p className="p-4 text-sm text-slate-400">Nenhuma transportadora.</p>}
        {transportadoras.map((t) => {
          const ufsT = ufs.filter((u) => u.transportadora_codigo === t.codigo);
          const tarT = tarifas.filter((x) => x.transportadora_codigo === t.codigo);
          const expandida = aberta === t.codigo;
          return (
            <div key={t.codigo}>
              <button type="button" onClick={() => setAberta(expandida ? null : t.codigo)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex-1 min-w-[240px]">
                  <b>{t.nome}</b> <span className="text-xs text-slate-400">cód. {t.codigo} · {t.cidade}/{t.uf}</span>
                </span>
                <span className="text-xs text-slate-500 tabular-nums">
                  {t.hist ? `${t.hist.ctes} CT-e(s) · ${formatarMoeda(t.hist.rs_km)}/km` : "sem CT-e em 12 meses"}
                </span>
                <span className="text-xs text-slate-500">{ufsT.length ? ufsT.map((u) => u.uf).sort().join(" ") : "sem UF"}</span>
                <span className={`text-xs font-semibold ${tarT.length ? "text-emerald-700" : "text-amber-700"}`}>
                  {tarT.length ? `${tarT.length} tarifa(s)` : "sem tarifa"}
                </span>
              </button>
              {expandida && (
                <div className="px-4 pb-4 grid lg:grid-cols-2 gap-4 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 mb-2">UFs atendidas</p>
                    <div className="flex flex-wrap gap-1">
                      {UFS.map((uf) => {
                        const tem = ufsT.find((u) => u.uf === uf);
                        return (
                          <button
                            key={uf}
                            type="button"
                            aria-pressed={Boolean(tem)}
                            title={tem?.origem === "historico" ? "Veio do histórico de CT-e" : undefined}
                            onClick={() =>
                              gravar(
                                tem
                                  ? supabase.from("fretes_transp_ufs").delete().eq("transportadora_codigo", t.codigo).eq("uf", uf)
                                  : supabase.from("fretes_transp_ufs").insert({ transportadora_codigo: t.codigo, uf, origem: "manual" }),
                              )
                            }
                            className={`text-xs w-10 py-1 rounded border font-semibold ${tem ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-500 hover:border-[#2A6377]"}`}
                          >
                            {uf}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <TarifasTransportadora codigo={t.codigo} tarifas={tarT} rsKmHistorico={t.hist?.rs_km ?? null} gravar={gravar} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TarifasTransportadora({
  codigo,
  tarifas,
  rsKmHistorico,
  gravar,
}: {
  codigo: number;
  tarifas: Tarifa[];
  rsKmHistorico: number | null;
  gravar: (p: PromiseLike<{ error: any }>) => void;
}) {
  const [veiculo, setVeiculo] = useState("");
  const [rsKm, setRsKm] = useState(rsKmHistorico ? txtNum(rsKmHistorico) : "");
  const [minimo, setMinimo] = useState("");
  const livres = VEICULOS.filter((v) => !tarifas.some((t) => t.tipo_veiculo === v));
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500 mb-2">Tarifa por tipo de veículo</p>
      <ul className="border rounded-lg divide-y bg-white mb-2">
        {tarifas.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Nenhuma tarifa.</li>}
        {tarifas.map((t) => (
          <li key={t.id} className="px-3 py-2 text-sm flex items-center gap-2">
            <span className="flex-1 font-semibold">{t.tipo_veiculo}</span>
            <input
              defaultValue={txtNum(t.valor_km)}
              aria-label={`R$/km ${t.tipo_veiculo}`}
              inputMode="decimal"
              className="border rounded px-2 py-1 w-20 text-right text-sm tabular-nums"
              onBlur={(e) => {
                const v = num(e.target.value);
                if (v > 0 && v !== Number(t.valor_km)) gravar(supabase.from("fretes_transp_tarifas").update({ valor_km: v, atualizado_em: new Date().toISOString() }).eq("id", t.id));
              }}
            />
            <span className="text-xs text-slate-400">R$/km · mín.</span>
            <input
              defaultValue={txtNum(t.valor_minimo)}
              aria-label={`Valor mínimo ${t.tipo_veiculo}`}
              inputMode="decimal"
              className="border rounded px-2 py-1 w-24 text-right text-sm tabular-nums"
              onBlur={(e) => {
                const v = num(e.target.value);
                if (v !== Number(t.valor_minimo)) gravar(supabase.from("fretes_transp_tarifas").update({ valor_minimo: v, atualizado_em: new Date().toISOString() }).eq("id", t.id));
              }}
            />
            <button
              type="button"
              onClick={() => gravar(supabase.from("fretes_transp_tarifas").delete().eq("id", t.id))}
              className="p-1 text-slate-400 hover:text-red-600"
              aria-label={`Remover tarifa ${t.tipo_veiculo}`}
              title="Remover tarifa"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      {livres.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={veiculo} onChange={(e) => setVeiculo(e.target.value)} aria-label="Tipo de veículo" className="border rounded-lg px-2 py-1.5 text-sm bg-white">
            <option value="">Veículo…</option>
            {livres.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <input value={rsKm} onChange={(e) => setRsKm(e.target.value)} placeholder="R$/km" aria-label="R$ por km" inputMode="decimal" className="border rounded-lg px-2 py-1.5 text-sm w-20" />
          <input value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="Mínimo R$" aria-label="Valor mínimo" inputMode="decimal" className="border rounded-lg px-2 py-1.5 text-sm w-28" />
          <button
            type="button"
            disabled={!veiculo || num(rsKm) <= 0}
            onClick={() => {
              gravar(
                supabase.from("fretes_transp_tarifas").insert({ transportadora_codigo: codigo, tipo_veiculo: veiculo, valor_km: num(rsKm), valor_minimo: num(minimo) }),
              );
              setVeiculo("");
              setMinimo("");
            }}
            className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={14} /> Tarifa
          </button>
          {rsKmHistorico != null && <span className="text-[11px] text-slate-400">histórico: {formatarMoeda(rsKmHistorico)}/km</span>}
        </div>
      )}
    </div>
  );
}
