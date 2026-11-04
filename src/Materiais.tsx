import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Plus, RotateCcw, Search, Send, X, XCircle } from "lucide-react";
import { supabase } from "./supabase";
import { linhaClicavel } from "./teclado";
import type { Usuario } from "./types";

// Solicitacao de cadastro de material (04/11/2026, fase 1). Qualquer usuario pede um item novo; o app mostra os
// itens parecidos que ja existem no ERP (espelho materiais_erp, robo sync_materiais_erp.py). O responsavel pelo
// cadastro (usuarios.cadastra_materiais) padroniza descricao/unidade/classe e aprova; o fiscal
// (usuarios.revisa_fiscal_material) define NCM/tipo/IPI e cria o item no ERP pela tela; o robo liga o codigo
// criado (mesma descricao) ou o fiscal informa. Gravacoes so pelas funcoes do banco mat_*.

type Origem = "comprado" | "produzido" | "servico";
export const ORIGENS: [Origem, string][] = [
  ["comprado", "Comprado"],
  ["produzido", "Produzido"],
  ["servico", "Serviço"],
];
const origemTxt = (o?: string | null) => ORIGENS.find(([k]) => k === o)?.[1] || "";
// no ERP fica em MATERPCP.mpcp_tipo_item (FD MATERPCP do Prosyst): 0 normal (produzido), 1 fantasma, 2 comprado,
// 3 servico, 4 revenda, 5 consumo, 6 requisicao (7 aparece desde set/2026 e nao esta na FD de 2024)
export const PCP_DA_ORIGEM: Record<Origem, number> = { comprado: 2, produzido: 0, servico: 3 };
const TIPOS_PCP: Record<number, string> = { 0: "Produzido", 1: "Fantasma", 2: "Comprado", 3: "Serviço", 4: "Revenda", 5: "Consumo", 6: "Requisição" };
const pcpTxt = (t?: number | null) => (t == null ? "" : TIPOS_PCP[t] || `tipo PCP ${t}`);

type StatusMat = "cadastro" | "fiscal" | "erp" | "concluida" | "devolvida" | "recusada" | "cancelada";

interface SolicitacaoMaterial {
  id: string;
  numero: number;
  status: StatusMat;
  urgente: boolean;
  id_solicitante: string | null;
  nome_solicitante: string | null;
  descricao_solicitada: string;
  descricao: string;
  classe_tipo: number;
  unidade: string;
  aplicacao: string | null;
  ncm_sugerido: string | null;
  similares: Similar[] | null;
  origem: Origem | null;
  nome_cadastro: string | null;
  cadastro_em: string | null;
  obs_cadastro: string | null;
  ncm: string | null;
  tipo_item: number | null;
  genero: number | null;
  pct_ipi: number | null;
  obs_fiscal: string | null;
  nome_fiscal: string | null;
  fiscal_em: string | null;
  codigo_erp: number | null;
  codigo_edit: string | null;
  concluida_em: string | null;
  nome_concluiu: string | null;
  motivo: string | null;
  nome_motivo: string | null;
  codigo_existente: number | null;
  created_at: string;
}

interface Similar {
  origem: "erp" | "solicitacao";
  codigo: number | null;
  codigo_edit: string | null;
  descricao: string;
  unidade: string | null;
  ncm: string | null;
  classe: string | null;
  id_solicitacao: string | null;
  numero_solicitacao: number | null;
  situacao: string;
  semelhanca: number;
  tipo_pcp: number | null;
}

interface Classe {
  classe_tipo: number;
  descricao: string;
}
interface Unidade {
  unidade: string;
  descricao: string;
}

const STATUS: Record<StatusMat, { rotulo: string; classe: string }> = {
  cadastro: { rotulo: "Com o cadastro", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  fiscal: { rotulo: "Com o fiscal", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  erp: { rotulo: "Criar no ERP", classe: "bg-violet-50 text-violet-700 border-violet-200" },
  concluida: { rotulo: "Cadastrado", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  devolvida: { rotulo: "Devolvida", classe: "bg-red-50 text-red-700 border-red-200" },
  recusada: { rotulo: "Recusada", classe: "bg-slate-100 text-slate-600 border-slate-300" },
  cancelada: { rotulo: "Cancelada", classe: "bg-slate-100 text-slate-500 border-slate-200" },
};

// Tipo do item (registro 0200 do SPED)
export const TIPOS_ITEM: [number, string][] = [
  [0, "00 - Mercadoria para revenda"],
  [1, "01 - Matéria-prima"],
  [2, "02 - Embalagem"],
  [3, "03 - Produto em processo"],
  [4, "04 - Produto acabado"],
  [5, "05 - Subproduto"],
  [6, "06 - Produto intermediário"],
  [7, "07 - Material de uso e consumo"],
  [8, "08 - Ativo imobilizado"],
  [9, "09 - Serviços"],
  [10, "10 - Outros insumos"],
  [99, "99 - Outras"],
];

const EVENTO: Record<string, string> = {
  solicitada: "Solicitou",
  reenviada: "Corrigiu e reenviou",
  aprovada_cadastro: "Aprovou o cadastro",
  aprovada_fiscal: "Aprovou a parte fiscal",
  concluida: "Cadastrado no ERP",
  devolvida: "Devolveu ao solicitante",
  devolvida_cadastro: "Devolveu ao cadastro",
  reaberta_fiscal: "Voltou para a revisão fiscal",
  recusada: "Recusou",
  cancelada: "Cancelou",
};

// 100230 -> "10/230"; rotulo "10/230 · MATERIA PRIMA / TUBULACOES E CONEXOES" (a classe-mae e a linha xx0000 do CLASTIP)
export const codigoClasse = (c: number) => `${Math.floor(c / 10000)}/${String(c % 10000).padStart(3, "0")}`;
export function rotuloClasse(c: number | null | undefined, classes: { classe_tipo: number; descricao: string }[]) {
  if (c == null) return "";
  const mae = classes.find((x) => x.classe_tipo === Math.floor(c / 10000) * 10000)?.descricao;
  const tipo = c % 10000 ? classes.find((x) => x.classe_tipo === c)?.descricao : undefined;
  const nome = [mae, tipo].filter(Boolean).join(" / ");
  return nome ? `${codigoClasse(c)} · ${nome}` : codigoClasse(c);
}
export const formatarNcm = (n?: string | null) => (n && n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n || "");
const fmtDataHora = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const msgErro = (e: any) => String(e?.message || e || "Erro desconhecido.").replace(/^.*?ERROR:\s*/, "");
const pct = (v: number) => `${Math.round(v * 100)}%`;

const Badge = ({ status, urgente }: { status: StatusMat; urgente?: boolean }) => (
  <span className="inline-flex items-center gap-1 flex-wrap">
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS[status]?.classe}`}>{STATUS[status]?.rotulo || status}</span>
    {urgente && ["cadastro", "fiscal", "erp"].includes(status) && (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">URGENTE</span>
    )}
  </span>
);

// listas do ERP (classes 114, unidades 36): carregadas uma vez por sessao
let cacheListas: { classes: Classe[]; unidades: Unidade[] } | null = null;
function useListas() {
  const [listas, setListas] = useState(cacheListas);
  useEffect(() => {
    if (cacheListas) return;
    Promise.all([
      supabase.from("materiais_erp_classes").select("classe_tipo, descricao").order("classe_tipo"),
      supabase.from("materiais_erp_unidades").select("unidade, descricao").order("unidade"),
    ]).then(([c, u]) => {
      const l = { classes: (c.data as Classe[]) || [], unidades: (u.data as Unidade[]) || [] };
      if (l.classes.length) cacheListas = l;
      setListas(l);
    });
  }, []);
  return listas || { classes: [], unidades: [] };
}

// itens parecidos (ERP e solicitacoes em andamento) enquanto digita
function useSimilares(texto: string, excluir?: string) {
  const [lista, setLista] = useState<Similar[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  useEffect(() => {
    const t = texto.trim();
    if (t.length < 4) {
      setLista(null);
      setBuscando(false);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const h = setTimeout(async () => {
      const { data } = await supabase.rpc("mat_similares", { p_texto: t, p_limite: 10, p_excluir: excluir || null });
      if (!vivo) return;
      setLista((data as Similar[]) || []);
      setBuscando(false);
    }, 450);
    return () => {
      vivo = false;
      clearTimeout(h);
    };
  }, [texto, excluir]);
  return { lista, buscando };
}

function ListaSimilares({
  lista,
  buscando,
  titulo,
  onUsar,
}: {
  lista: Similar[] | null;
  buscando?: boolean;
  titulo: string;
  onUsar?: (s: Similar) => void;
}) {
  if (lista === null && !buscando) return null;
  const forte = (lista || []).some((s) => s.semelhanca >= 0.6);
  return (
    <div className={`border rounded-lg ${forte ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <p className="px-3 py-2 text-[12px] font-bold text-slate-600 flex items-center gap-2 border-b">
        {buscando ? <Loader2 size={13} className="animate-spin" /> : forte ? <AlertTriangle size={13} className="text-amber-600" /> : <Search size={13} />}
        {titulo}
        {!buscando && lista && <span className="font-normal text-slate-400">({lista.length === 0 ? "nenhum parecido" : lista.length})</span>}
      </p>
      {forte && (
        <p className="px-3 pt-2 text-[12px] text-amber-800">Confira se um destes itens não serve antes de pedir um novo, para não duplicar o cadastro.</p>
      )}
      {lista && lista.length > 0 && (
        <ul className="divide-y max-h-60 overflow-y-auto text-[12px]">
          {lista.map((s, i) => (
            <li key={i} className="px-3 py-1.5 flex items-start gap-2">
              <span className="font-mono text-slate-500 whitespace-nowrap w-24 shrink-0">
                {s.origem === "erp" ? s.codigo_edit || s.codigo : `Pedido nº ${s.numero_solicitacao}`}
              </span>
              <span className="flex-1">
                <b className="text-slate-700">{s.descricao}</b>
                <span className="block text-[11px] text-slate-400">
                  {[s.unidade, pcpTxt(s.tipo_pcp), s.classe, s.ncm ? `NCM ${formatarNcm(s.ncm)}` : "", s.origem === "solicitacao" ? `solicitação ${STATUS[s.situacao as StatusMat]?.rotulo.toLowerCase() || s.situacao}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{pct(s.semelhanca)}</span>
              {onUsar && s.origem === "erp" && (
                <button onClick={() => onUsar(s)} className="text-[11px] font-bold text-[#2A6377] hover:underline whitespace-nowrap">
                  Usar este
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Rotulo = ({ children }: { children: React.ReactNode }) => <label className="block text-xs font-semibold mb-1">{children}</label>;
const entrada = "border rounded-lg px-2 py-2 w-full text-sm";

function SelecaoClasse({ valor, onChange, classes }: { valor: string; onChange: (v: string) => void; classes: Classe[] }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={`${entrada} bg-white`}>
      <option value="">Escolha…</option>
      {classes
        .filter((m) => m.classe_tipo % 10000 === 0)
        .map((m) => (
          <optgroup key={m.classe_tipo} label={`${Math.floor(m.classe_tipo / 10000)} · ${m.descricao}`}>
            {classes
              .filter((c) => c.classe_tipo % 10000 !== 0 && Math.floor(c.classe_tipo / 10000) === Math.floor(m.classe_tipo / 10000))
              .map((c) => (
                <option key={c.classe_tipo} value={c.classe_tipo}>
                  {codigoClasse(c.classe_tipo)} · {c.descricao}
                </option>
              ))}
          </optgroup>
        ))}
    </select>
  );
}

function SelecaoUnidade({ valor, onChange, unidades }: { valor: string; onChange: (v: string) => void; unidades: Unidade[] }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={`${entrada} bg-white`}>
      <option value="">Escolha…</option>
      {unidades.map((u) => (
        <option key={u.unidade} value={u.unidade}>
          {u.unidade} - {u.descricao}
        </option>
      ))}
    </select>
  );
}

function SelecaoOrigem({ valor, onChange }: { valor: string; onChange: (v: Origem) => void }) {
  return (
    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Origem do item">
      {ORIGENS.map(([k, t]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={valor === k}
          onClick={() => onChange(k)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${valor === k ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Nova solicitacao (ou correcao de uma devolvida)
// ------------------------------------------------------------------------------------------------
function ModalSolicitar({ devolvida, onFechar, onFeito }: { devolvida?: SolicitacaoMaterial | null; onFechar: () => void; onFeito: (id: string) => void }) {
  const { classes, unidades } = useListas();
  const [descricao, setDescricao] = useState(devolvida?.descricao || "");
  const [classe, setClasse] = useState(devolvida ? String(devolvida.classe_tipo) : "");
  const [unidade, setUnidade] = useState(devolvida?.unidade || "");
  const [aplicacao, setAplicacao] = useState(devolvida?.aplicacao || "");
  const [ncm, setNcm] = useState(devolvida?.ncm_sugerido || "");
  const [urgente, setUrgente] = useState(Boolean(devolvida?.urgente));
  const [origem, setOrigem] = useState<string>(devolvida?.origem || "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { lista, buscando } = useSimilares(descricao, devolvida?.id);

  const enviar = async () => {
    setErro("");
    if (descricao.trim().length < 5) return setErro("Descreva o item.");
    if (!origem) return setErro("Marque se o item é comprado, produzido ou serviço.");
    if (!classe) return setErro("Escolha a classe/tipo.");
    if (!unidade) return setErro("Escolha a unidade de medida.");
    const n = ncm.replace(/\D/g, "");
    if (n && n.length !== 8) return setErro("O NCM tem 8 dígitos (ou deixe em branco).");
    setEnviando(true);
    const { data, error } = await supabase.rpc("mat_solicitar", {
      p_id: devolvida?.id || null,
      p_descricao: descricao,
      p_classe_tipo: Number(classe),
      p_unidade: unidade,
      p_aplicacao: aplicacao || null,
      p_ncm: n || null,
      p_urgente: urgente,
      p_origem: origem,
    });
    setEnviando(false);
    if (error) return setErro(msgErro(error));
    onFeito(data as string);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onFechar} className="absolute right-3 top-3 text-slate-400" aria-label="Fechar">
          <X size={20} />
        </button>
        <div className="p-4 border-b pr-10">
          <h3 className="font-bold text-lg">{devolvida ? `Corrigir solicitação nº ${devolvida.numero}` : "Solicitar cadastro de material"}</h3>
          <p className="text-sm text-slate-500">O responsável pelo cadastro revisa, o fiscal completa as informações fiscais e o item é criado no ERP.</p>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 text-sm">
          {devolvida?.motivo && (
            <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
              <b>Devolvida por {devolvida.nome_motivo}:</b> {devolvida.motivo}
            </p>
          )}
          <div>
            <Rotulo>Descrição do item *</Rotulo>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={120}
              placeholder="Ex.: VÁLVULA ESFERA INOX 316 1/2 POL ROSCA NPT"
              className={entrada}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">Nome técnico: tipo do item, material, medidas, norma/padrão e acabamento. {descricao.length}/120</p>
          </div>
          <ListaSimilares lista={lista} buscando={buscando} titulo="Itens parecidos já cadastrados ou pedidos" />
          <div>
            <Rotulo>O item é *</Rotulo>
            <SelecaoOrigem valor={origem} onChange={setOrigem} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Rotulo>Classe / tipo *</Rotulo>
              <SelecaoClasse valor={classe} onChange={setClasse} classes={classes} />
            </div>
            <div>
              <Rotulo>Unidade de medida *</Rotulo>
              <SelecaoUnidade valor={unidade} onChange={setUnidade} unidades={unidades} />
            </div>
          </div>
          <div>
            <Rotulo>Aplicação (opcional)</Rotulo>
            <textarea
              value={aplicacao}
              onChange={(e) => setAplicacao(e.target.value)}
              rows={3}
              placeholder="Para que serve e onde vai ser usado - ajuda o fiscal a classificar o item."
              className={entrada}
            />
          </div>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <Rotulo>NCM (opcional)</Rotulo>
              <input value={ncm} onChange={(e) => setNcm(e.target.value)} inputMode="numeric" placeholder="0000.00.00" className={entrada} />
            </div>
            <label className="md:col-span-2 flex items-start gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} className="mt-0.5 accent-red-600" />
              <span>
                <b>Urgente</b>
                <span className="block text-[11px] text-slate-400">Compra parada esperando o código - o cadastro e o fiscal veem destacado.</span>
              </span>
            </label>
          </div>
          {erro && <p className="text-red-600">{erro}</p>}
        </div>
        <div className="p-4 border-t flex justify-end gap-2 bg-slate-50/60 rounded-b-xl">
          <button onClick={onFechar} className="px-3 py-2 rounded-lg border text-slate-600 font-semibold text-sm">
            Cancelar
          </button>
          <button disabled={enviando} onClick={enviar} className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-1 text-sm disabled:opacity-60">
            {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {devolvida ? "Reenviar" : "Enviar para o cadastro"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Detalhe: dados, parecidos, revisao do cadastro, revisao fiscal, codigo do ERP, historico
// ------------------------------------------------------------------------------------------------
const Info = ({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) => (
  <div>
    <p className="text-[11px] text-slate-400">{rotulo}</p>
    <div>{valor ?? "-"}</div>
  </div>
);

function DetalheMaterial({
  id,
  usuario,
  onFechar,
  onAlterada,
  onCorrigir,
}: {
  id: string;
  usuario: Usuario | null;
  onFechar: () => void;
  onAlterada: () => void;
  onCorrigir: (s: SolicitacaoMaterial) => void;
}) {
  const { classes, unidades } = useListas();
  const [s, setS] = useState<SolicitacaoMaterial | null>(null);
  const [eventos, setEventos] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // revisao do cadastro
  const [descricao, setDescricao] = useState("");
  const [classe, setClasse] = useState("");
  const [unidade, setUnidade] = useState("");
  const [obs, setObs] = useState("");
  const [origem, setOrigem] = useState<string>("");
  // revisao fiscal
  const [ncm, setNcm] = useState("");
  const [ncmDesc, setNcmDesc] = useState<string | null>(null);
  const [tipoItem, setTipoItem] = useState("");
  const [ipi, setIpi] = useState("");
  const [obsFiscal, setObsFiscal] = useState("");
  const [codigo, setCodigo] = useState("");

  const admin = usuario?.perfil === "admin";
  const ehCadastro = admin || Boolean(usuario?.cadastra_materiais);
  const ehFiscal = admin || Boolean(usuario?.revisa_fiscal_material);
  const ehSolicitante = Boolean(s && s.id_solicitante && s.id_solicitante === usuario?.id);
  const revisandoCadastro = s?.status === "cadastro" && ehCadastro;
  const revisandoFiscal = s?.status === "fiscal" && ehFiscal;
  const { lista, buscando } = useSimilares(revisandoCadastro ? descricao : "", id);

  const carregar = async () => {
    const [r, e] = await Promise.all([
      supabase.from("solicitacoes_material").select("*").eq("id", id).maybeSingle(),
      supabase.from("solicitacoes_material_eventos").select("*").eq("id_solicitacao", id).order("id"),
    ]);
    if (r.error || !r.data) return setErro("Solicitação não encontrada ou sem acesso.");
    const d = r.data as SolicitacaoMaterial;
    setS(d);
    setEventos(e.data || []);
    setDescricao(d.descricao);
    setClasse(String(d.classe_tipo));
    setUnidade(d.unidade);
    setObs(d.obs_cadastro || "");
    setOrigem(d.origem || "");
    setNcm(d.ncm || d.ncm_sugerido || "");
    setTipoItem(d.tipo_item != null ? String(d.tipo_item) : d.status === "fiscal" && d.origem === "servico" ? "9" : "");
    setIpi(d.pct_ipi != null ? String(d.pct_ipi).replace(".", ",") : "");
    setObsFiscal(d.obs_fiscal || "");
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // descricao do NCM digitado (tabela do ERP)
  useEffect(() => {
    const n = ncm.replace(/\D/g, "");
    if (n.length !== 8) {
      setNcmDesc(null);
      return;
    }
    supabase
      .from("materiais_erp_ncm")
      .select("descricao")
      .eq("ncm", n)
      .maybeSingle()
      .then(({ data }) => setNcmDesc(data ? (data as { descricao: string }).descricao : ""));
  }, [ncm]);

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    setOcupado(true);
    setErro("");
    const { error } = await supabase.rpc(fn, { p_id: id, ...args });
    setOcupado(false);
    if (error) {
      setErro(msgErro(error));
      return false;
    }
    await carregar();
    onAlterada();
    return true;
  };
  const comMotivo = (fn: string, pergunta: string) => {
    const motivo = window.prompt(pergunta);
    if (motivo && motivo.trim()) rpc(fn, { p_motivo: motivo.trim() });
  };
  const recusar = (codigoExistente?: string) => {
    const motivo = window.prompt(
      codigoExistente
        ? `Recusar e indicar o item ${codigoExistente} ao solicitante. Motivo:`
        : 'Motivo da recusa (se o item já existe, use "Usar este" na lista de parecidos):',
      codigoExistente ? "Item já cadastrado no ERP" : "",
    );
    if (motivo && motivo.trim()) rpc("mat_recusar", { p_motivo: motivo.trim(), p_codigo_existente: codigoExistente || null });
  };

  const nomeClasse = (c?: number | null) => rotuloClasse(c, classes);
  const nomeUnidade = (u?: string | null) => {
    const k = unidades.find((x) => x.unidade === u);
    return u ? `${u}${k ? ` - ${k.descricao}` : ""}` : "";
  };
  const tipoTxt = (t?: number | null) => TIPOS_ITEM.find(([k]) => k === t)?.[1] || "";

  const resumoErp = s
    ? [
        `Descrição: ${s.descricao}`,
        `Tipo do item no PCP (MATERPCP): ${s.origem ? `${PCP_DA_ORIGEM[s.origem]} - ${origemTxt(s.origem)}` : ""}`,
        `Unidade: ${s.unidade}`,
        `Classe/tipo: ${nomeClasse(s.classe_tipo)}`,
        `NCM: ${formatarNcm(s.ncm)}`,
        `Gênero: ${s.genero ?? ""}`,
        `Tipo do item: ${tipoTxt(s.tipo_item)}`,
        `IPI: ${String(s.pct_ipi ?? "").replace(".", ",")}%`,
      ].join("\n")
    : "";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-2 md:p-6" onClick={onFechar}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onFechar} className="absolute right-3 top-3 text-slate-400" aria-label="Fechar">
          <X size={20} />
        </button>
        {!s ? (
          <p className="p-6 text-sm text-slate-400">{erro || "Carregando…"}</p>
        ) : (
          <>
            <div className="p-4 border-b pr-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">Material nº {s.numero}</h3>
                <Badge status={s.status} urgente={s.urgente} />
              </div>
              <p className="text-sm text-slate-700 font-semibold">{s.descricao}</p>
              <p className="text-[12px] text-slate-500">
                Solicitado por {s.nome_solicitante} em {fmtDataHora(s.created_at)}
              </p>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 text-sm">
              {s.motivo && ["devolvida", "recusada", "cancelada", "cadastro", "fiscal"].includes(s.status) && (
                <p className={`rounded-lg px-3 py-2 border ${s.status === "cancelada" ? "bg-slate-100 text-slate-600" : "bg-red-50 border-red-200 text-red-700"}`}>
                  <b>
                    {s.status === "recusada" ? "Recusada" : s.status === "cancelada" ? "Cancelada" : "Devolvida"} por {s.nome_motivo}:
                  </b>{" "}
                  {s.motivo}
                </p>
              )}
              {s.status === "recusada" && s.codigo_existente && (
                <p className="rounded-lg px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800">
                  Use o item já cadastrado <b className="font-mono">{s.codigo_edit || s.codigo_existente}</b>.
                </p>
              )}
              {s.status === "concluida" && (
                <p className="rounded-lg px-3 py-2 border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center gap-2 flex-wrap">
                  <CheckCircle2 size={16} /> Cadastrado no ERP com o código <b className="font-mono">{s.codigo_edit || s.codigo_erp}</b>
                  <span className="text-[12px] text-emerald-700">
                    ({s.nome_concluiu}, {fmtDataHora(s.concluida_em)})
                  </span>
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Info rotulo="Origem" valor={origemTxt(s.origem) || "-"} />
                <Info rotulo="Classe / tipo" valor={nomeClasse(s.classe_tipo)} />
                <Info rotulo="Unidade" valor={nomeUnidade(s.unidade)} />
                <Info rotulo="NCM sugerido" valor={s.ncm_sugerido ? formatarNcm(s.ncm_sugerido) : "-"} />
                {s.descricao !== s.descricao_solicitada && <Info rotulo="Pedido como" valor={s.descricao_solicitada} />}
                {s.nome_cadastro && <Info rotulo="Cadastro" valor={`${s.nome_cadastro} · ${fmtDataHora(s.cadastro_em)}`} />}
                {s.nome_fiscal && <Info rotulo="Fiscal" valor={`${s.nome_fiscal} · ${fmtDataHora(s.fiscal_em)}`} />}
              </div>
              {s.aplicacao && (
                <div>
                  <p className="text-[11px] text-slate-400">Aplicação</p>
                  <p className="whitespace-pre-wrap border rounded-lg p-3">{s.aplicacao}</p>
                </div>
              )}
              {s.obs_cadastro && <Info rotulo="Observação do cadastro" valor={s.obs_cadastro} />}
              {s.ncm && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border rounded-lg p-3">
                  <Info rotulo="NCM" valor={<b>{formatarNcm(s.ncm)}</b>} />
                  <Info rotulo="Gênero" valor={s.genero} />
                  <Info rotulo="Tipo do item" valor={tipoTxt(s.tipo_item)} />
                  <Info rotulo="IPI" valor={`${String(s.pct_ipi ?? 0).replace(".", ",")}%`} />
                  {s.obs_fiscal && (
                    <div className="col-span-2 md:col-span-4">
                      <Info rotulo="Observação fiscal" valor={s.obs_fiscal} />
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- revisao do cadastro ---------------- */}
              {revisandoCadastro && (
                <div className="border-2 border-blue-200 rounded-xl p-3 space-y-3 bg-blue-50/30">
                  <p className="font-bold text-blue-800">Revisão do cadastro</p>
                  <div>
                    <Rotulo>Descrição padronizada *</Rotulo>
                    <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={120} className={entrada} />
                  </div>
                  <div>
                    <Rotulo>O item é *</Rotulo>
                    <SelecaoOrigem valor={origem} onChange={setOrigem} />
                  </div>
                  <ListaSimilares
                    lista={lista}
                    buscando={buscando}
                    titulo="Parecidos no ERP e pedidos em andamento"
                    onUsar={(x) => recusar(x.codigo_edit || String(x.codigo))}
                  />
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <Rotulo>Classe / tipo *</Rotulo>
                      <SelecaoClasse valor={classe} onChange={setClasse} classes={classes} />
                    </div>
                    <div>
                      <Rotulo>Unidade *</Rotulo>
                      <SelecaoUnidade valor={unidade} onChange={setUnidade} unidades={unidades} />
                    </div>
                  </div>
                  <div>
                    <Rotulo>Observação para o fiscal (opcional)</Rotulo>
                    <input value={obs} onChange={(e) => setObs(e.target.value)} className={entrada} />
                  </div>
                </div>
              )}

              {/* ---------------- revisao fiscal ---------------- */}
              {revisandoFiscal && (
                <div className="border-2 border-amber-200 rounded-xl p-3 space-y-3 bg-amber-50/30">
                  <p className="font-bold text-amber-800">Revisão fiscal</p>
                  {(s.similares || []).length > 0 && <ListaSimilares lista={s.similares} titulo="Parecidos no ERP no momento do pedido (veja o NCM usado)" />}
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Rotulo>NCM *</Rotulo>
                      <input value={ncm} onChange={(e) => setNcm(e.target.value)} inputMode="numeric" placeholder="0000.00.00" className={entrada} />
                      {ncmDesc !== null && (
                        <p className={`text-[11px] mt-1 ${ncmDesc ? "text-slate-500" : "text-red-600"}`}>{ncmDesc || "NCM não está na tabela do ERP"}</p>
                      )}
                    </div>
                    <div>
                      <Rotulo>Tipo do item (SPED) *</Rotulo>
                      <select value={tipoItem} onChange={(e) => setTipoItem(e.target.value)} className={`${entrada} bg-white`}>
                        <option value="">Escolha…</option>
                        {TIPOS_ITEM.map(([k, t]) => (
                          <option key={k} value={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Rotulo>% IPI *</Rotulo>
                      <input value={ipi} onChange={(e) => setIpi(e.target.value)} inputMode="decimal" placeholder="0" className={entrada} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    O gênero é o capítulo do NCM (2 primeiros dígitos) e é preenchido sozinho. Item de serviço usa sempre o tipo 09 (e o tipo 09 só serve
                    para serviço) - é ele que faz o pedido aparecer na seção de serviços do app.
                  </p>
                  <div>
                    <Rotulo>Observação fiscal (opcional)</Rotulo>
                    <input value={obsFiscal} onChange={(e) => setObsFiscal(e.target.value)} placeholder="Ex.: CEST, origem, benefício…" className={entrada} />
                  </div>
                </div>
              )}

              {/* ---------------- criar no ERP ---------------- */}
              {s.status === "erp" && (
                <div className="border-2 border-violet-200 rounded-xl p-3 space-y-3 bg-violet-50/30">
                  <p className="font-bold text-violet-800">Aprovado - falta criar o item no ERP</p>
                  <pre className="text-[12px] bg-white border rounded-lg p-2 whitespace-pre-wrap">{resumoErp}</pre>
                  <button
                    onClick={() => navigator.clipboard?.writeText(resumoErp)}
                    className="text-[12px] font-semibold text-violet-700 flex items-center gap-1 hover:underline"
                  >
                    <Copy size={12} /> Copiar os dados
                  </button>
                  <p className="text-[12px] text-slate-600">
                    Crie o item na tela de materiais do ERP com <b>exatamente esta descrição</b>: o robô liga o código sozinho em até 5 minutos. Se a
                    descrição ficou diferente, informe o código abaixo.
                  </p>
                  {(ehFiscal || ehCadastro) && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Rotulo>Código criado no ERP</Rotulo>
                        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="10.230.0001" className={entrada} />
                      </div>
                      <button
                        disabled={ocupado || !codigo.trim()}
                        onClick={() => rpc("mat_informar_codigo", { p_codigo: codigo.trim() })}
                        className="px-3 py-2 rounded-lg bg-violet-700 text-white font-bold text-sm disabled:opacity-50"
                      >
                        Informar código
                      </button>
                    </div>
                  )}
                </div>
              )}

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

            <div className="p-4 border-t flex flex-wrap justify-end gap-2 bg-slate-50/60 rounded-b-xl">
              {["cadastro", "fiscal", "devolvida"].includes(s.status) && (ehSolicitante || admin) && (
                <button
                  disabled={ocupado}
                  onClick={() => comMotivo("mat_cancelar", "Motivo do cancelamento:")}
                  className="px-3 py-2 rounded-lg border text-slate-600 font-semibold flex items-center gap-1 text-sm"
                >
                  <XCircle size={14} /> Cancelar pedido
                </button>
              )}
              {s.status === "devolvida" && (ehSolicitante || admin) && (
                <button onClick={() => onCorrigir(s)} className="px-3 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-1 text-sm">
                  <Send size={14} /> Corrigir e reenviar
                </button>
              )}
              {(revisandoCadastro || revisandoFiscal) && (
                <>
                  <button
                    disabled={ocupado}
                    onClick={() => recusar()}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold flex items-center gap-1 text-sm"
                  >
                    <XCircle size={14} /> Recusar
                  </button>
                  <button
                    disabled={ocupado}
                    onClick={() => comMotivo("mat_devolver", revisandoCadastro ? "O que o solicitante precisa corrigir?" : "Motivo da devolução ao cadastro:")}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-700 font-semibold flex items-center gap-1 text-sm"
                  >
                    <RotateCcw size={14} /> {revisandoCadastro ? "Devolver ao solicitante" : "Devolver ao cadastro"}
                  </button>
                </>
              )}
              {s.status === "erp" && ehFiscal && (
                <button
                  disabled={ocupado}
                  onClick={() => comMotivo("mat_devolver", "Por que voltar para a revisão fiscal?")}
                  className="px-3 py-2 rounded-lg border text-slate-600 font-semibold flex items-center gap-1 text-sm"
                >
                  <RotateCcw size={14} /> Voltar para revisão fiscal
                </button>
              )}
              {revisandoCadastro && (
                <button
                  disabled={ocupado}
                  onClick={() => rpc("mat_aprovar_cadastro", { p_descricao: descricao, p_classe_tipo: Number(classe), p_unidade: unidade, p_obs: obs || null, p_origem: origem || null })}
                  className="px-4 py-2 rounded-lg bg-blue-700 text-white font-bold flex items-center gap-1 text-sm disabled:opacity-60"
                >
                  <CheckCircle2 size={14} /> Aprovar e enviar ao fiscal
                </button>
              )}
              {revisandoFiscal && (
                <button
                  disabled={ocupado}
                  onClick={() =>
                    rpc("mat_aprovar_fiscal", {
                      p_ncm: ncm,
                      p_tipo_item: tipoItem === "" ? null : Number(tipoItem),
                      p_pct_ipi: ipi.trim() === "" ? null : Number(ipi.replace(",", ".")),
                      p_obs: obsFiscal || null,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-bold flex items-center gap-1 text-sm disabled:opacity-60"
                >
                  <CheckCircle2 size={14} /> Aprovar (criar no ERP)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tela "Materiais": solicitacoes de cadastro (todos veem; cada um ve destacado o que e com ele)
// ------------------------------------------------------------------------------------------------
export function TelaMateriais({ usuario, idAberto, onAbrir }: { usuario: Usuario | null; idAberto: string | null; onAbrir: (id: string | null) => void }) {
  const { classes } = useListas();
  const [lista, setLista] = useState<SolicitacaoMaterial[] | null>(null);
  const [filtro, setFiltro] = useState("comigo");
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState(false);
  const [corrigir, setCorrigir] = useState<SolicitacaoMaterial | null>(null);

  const admin = usuario?.perfil === "admin";
  const ehCadastro = admin || Boolean(usuario?.cadastra_materiais);
  const ehFiscal = admin || Boolean(usuario?.revisa_fiscal_material);

  const carregar = async () => {
    const { data } = await supabase
      .from("solicitacoes_material")
      .select(
        "id, numero, status, urgente, id_solicitante, nome_solicitante, descricao, descricao_solicitada, classe_tipo, unidade, origem, codigo_erp, codigo_edit, codigo_existente, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setLista((data as SolicitacaoMaterial[]) || []);
  };
  useEffect(() => {
    carregar();
  }, []);

  const comigo = (s: SolicitacaoMaterial) =>
    (s.status === "cadastro" && ehCadastro) ||
    ((s.status === "fiscal" || s.status === "erp") && ehFiscal) ||
    (s.status === "devolvida" && s.id_solicitante === usuario?.id);

  const nomeClasse = useMemo(() => (c: number) => rotuloClasse(c, classes), [classes]);

  // quem nao tem nada pendente comeca vendo as proprias solicitacoes
  useEffect(() => {
    if (lista && filtro === "comigo" && !lista.some(comigo)) setFiltro("minhas");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista === null]);

  if (lista === null)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando as solicitações de material…
      </p>
    );

  const termo = busca.trim().toLowerCase();
  const andamento: StatusMat[] = ["cadastro", "fiscal", "erp", "devolvida"];
  const filtradas = lista
    .filter((s) => {
      if (filtro === "comigo" && !comigo(s)) return false;
      if (filtro === "minhas" && s.id_solicitante !== usuario?.id) return false;
      if (filtro === "andamento" && !andamento.includes(s.status)) return false;
      if (filtro === "concluida" && s.status !== "concluida") return false;
      if (filtro === "encerradas" && !["recusada", "cancelada"].includes(s.status)) return false;
      if (termo && ![s.numero, s.descricao, s.descricao_solicitada, s.nome_solicitante, s.codigo_edit].join(" ").toLowerCase().includes(termo)) return false;
      return true;
    })
    .sort((a, b) => Number(b.urgente && andamento.includes(b.status)) - Number(a.urgente && andamento.includes(a.status)));
  const conta = (st: StatusMat) => lista.filter((s) => s.status === st).length;
  const indicadores: [string, number, string][] = [
    ["Com o cadastro", conta("cadastro"), "text-blue-700"],
    ["Com o fiscal", conta("fiscal"), "text-amber-700"],
    ["Aguardando criar no ERP", conta("erp"), "text-violet-700"],
    ["Devolvidas ao solicitante", conta("devolvida"), "text-red-600"],
  ];
  const qtdComigo = lista.filter(comigo).length;

  return (
    <div className="animate-in fade-in dash-main-wrapper space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Materiais</h2>
          <p className="text-sm text-slate-500">Solicitações de cadastro de material novo no ERP: o cadastro revisa, o fiscal completa e o item é criado.</p>
        </div>
        <button onClick={() => setNova(true)} className="px-4 py-2 rounded-lg bg-[#2A6377] text-white font-bold flex items-center gap-1 text-sm">
          <Plus size={16} /> Solicitar material novo
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(([rotulo, n, cor]) => (
          <div key={rotulo} className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-[11px] text-slate-400 font-bold uppercase">{rotulo}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{n}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-2 justify-end text-sm">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value="comigo">Comigo ({qtdComigo})</option>
            <option value="minhas">Minhas solicitações</option>
            <option value="andamento">Em andamento</option>
            <option value="concluida">Cadastradas</option>
            <option value="encerradas">Recusadas / canceladas</option>
            <option value="todas">Todas</option>
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Item, nº, solicitante, código…" className="border rounded-lg pl-7 pr-2 py-1.5 w-56" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left w-14">Nº</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-center">Un.</th>
                <th className="px-3 py-2 text-left">Solicitante</th>
                <th className="px-3 py-2 text-center">Situação</th>
                <th className="px-3 py-2 text-left">Código ERP</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    {filtro === "comigo" ? "Nada esperando por você." : "Nenhuma solicitação com esse filtro."}
                  </td>
                </tr>
              )}
              {filtradas.map((s) => (
                <tr key={s.id} className={`border-t hover:bg-slate-50 cursor-pointer ${comigo(s) ? "bg-blue-50/30" : ""}`} {...linhaClicavel(() => onAbrir(s.id))}>
                  <td className="px-3 py-2 text-slate-500">{s.numero}</td>
                  <td className="px-3 py-2">
                    <b>{s.descricao}</b>
                    <span className="block text-[11px] text-slate-500">{[origemTxt(s.origem), nomeClasse(s.classe_tipo)].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-3 py-2 text-center">{s.unidade}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-500">
                    {s.nome_solicitante}
                    <span className="block text-[11px] text-slate-400">{fmtDataHora(s.created_at)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge status={s.status} urgente={s.urgente} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px]">
                    {s.status === "concluida"
                      ? s.codigo_edit || s.codigo_erp
                      : s.status === "recusada" && s.codigo_existente
                        ? `usar ${s.codigo_edit || s.codigo_existente}`
                        : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {idAberto && (
        <DetalheMaterial
          id={idAberto}
          usuario={usuario}
          onFechar={() => onAbrir(null)}
          onAlterada={carregar}
          onCorrigir={(s) => {
            onAbrir(null);
            setCorrigir(s);
          }}
        />
      )}
      {(nova || corrigir) && (
        <ModalSolicitar
          devolvida={corrigir}
          onFechar={() => {
            setNova(false);
            setCorrigir(null);
          }}
          onFeito={(id) => {
            setNova(false);
            setCorrigir(null);
            carregar();
            onAbrir(id);
          }}
        />
      )}
    </div>
  );
}
