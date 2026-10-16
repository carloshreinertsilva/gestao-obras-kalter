import { linhaClicavel } from "../teclado";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { supabase } from "../supabase";
import { formatarDataHora } from "../utils";

// Historico de alteracoes (so admin): tudo o que os usuarios incluiram, alteraram ou
// excluiram pelo app. Gravado no banco pelo gatilho public.auditar() (tabela auditoria);
// o robo do ERP nao entra aqui.
interface Registro {
  id: number;
  em: string;
  nome_usuario: string | null;
  email: string | null;
  tabela: string;
  operacao: "inclusao" | "alteracao" | "exclusao";
  id_registro: string | null;
  id_obra: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}

const TABELAS: Record<string, string> = {
  obras: "Obra",
  usuarios: "Usuário",
  tarefas: "Tarefa",
  comentarios_tarefa: "Comentário de tarefa",
  solicitacoes_previsao: "Solicitação de previsão",
  cronograma_obra: "Cronograma",
  diario_obra: "Diário de obra",
  documentos_projeto: "Documento do projeto",
  documentos_projeto_arquivos: "Arquivo de documento",
  obra_anexos: "Anexo da obra",
  faturamentos: "Faturamento",
  obra_faturamento_familias: "Família de faturamento",
  obra_faturamento_grupos: "Grupo de faturamento",
  obra_faturamento_previsoes: "Previsão de faturamento",
  obra_faturamento_realizados: "Faturamento realizado",
  parcelas_cliente: "Parcela do cliente",
  ocorrencias: "Ocorrência de reunião",
  reunioes: "Reunião",
  reunioes_sessoes: "Sessão de reunião",
};

const OPERACAO = {
  inclusao: { rotulo: "Incluiu", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  alteracao: { rotulo: "Alterou", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  exclusao: { rotulo: "Excluiu", classe: "bg-red-50 text-red-700 border-red-200" },
};

// campos que identificam o registro na linha da lista (o primeiro que existir)
const CAMPOS_NOME = ["titulo", "nome", "item", "descricao", "descricao_familia", "familia_destino", "numero_nf", "texto", "fase", "email"];
const LIMITE = 200;

const valorTexto = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default function TelaAuditoria({ falhaAoCarregar }: { falhaAoCarregar: (oque: string, error: unknown) => void }) {
  const [dias, setDias] = useState(30);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [obras, setObras] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroTabela, setFiltroTabela] = useState("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    supabase
      .from("obras")
      .select("id, codigo_externo, nome")
      .then(({ data }) =>
        setObras(Object.fromEntries((data || []).map((o: any) => [o.id, `${o.codigo_externo || ""} - ${o.nome}`]))),
      );
  }, []);

  useEffect(() => {
    setCarregando(true);
    let consulta = supabase
      .from("auditoria")
      .select("*")
      .gte("em", new Date(Date.now() - dias * 86400000).toISOString())
      .order("em", { ascending: false })
      .limit(LIMITE);
    if (filtroObra !== "todas") consulta = consulta.eq("id_obra", filtroObra);
    if (filtroUsuario !== "todos") consulta = consulta.eq("email", filtroUsuario);
    if (filtroTabela !== "todas") consulta = consulta.eq("tabela", filtroTabela);
    Promise.resolve(consulta)
      .then(({ data, error }) => {
        if (error) throw error;
        setRegistros((data as Registro[]) || []);
      })
      .catch((e: unknown) => falhaAoCarregar("o histórico de alterações", e))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, filtroObra, filtroUsuario, filtroTabela]);

  // pessoas que aparecem no periodo (para o filtro), mantendo a selecionada
  const [pessoas, setPessoas] = useState<[string, string][]>([]);
  useEffect(() => {
    if (filtroUsuario !== "todos") return;
    const mapa = new Map<string, string>();
    registros.forEach((r) => r.email && mapa.set(r.email, r.nome_usuario || r.email));
    setPessoas([...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR")));
  }, [registros, filtroUsuario]);

  const termo = busca.trim().toLowerCase();
  const visiveis = useMemo(
    () =>
      registros.filter(
        (r) => !termo || JSON.stringify([r.antes, r.depois, r.nome_usuario, obras[r.id_obra || ""]]).toLowerCase().includes(termo),
      ),
    [registros, termo, obras],
  );

  const nomeDoRegistro = (r: Registro) => {
    const dados = { ...(r.antes || {}), ...(r.depois || {}) };
    const campo = CAMPOS_NOME.find((c) => dados[c] !== undefined && dados[c] !== null && dados[c] !== "");
    return campo ? String(dados[campo]).slice(0, 80) : "";
  };

  const resumo = (r: Registro) =>
    r.operacao === "alteracao" ? `Campos: ${Object.keys(r.depois || {}).join(", ")}` : nomeDoRegistro(r);

  return (
    <div className="animate-in fade-in space-y-6 max-w-full">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Histórico de alterações</h2>
        <p className="text-sm text-slate-400 mt-1">
          Tudo o que os usuários incluíram, alteraram ou excluíram pelo app. Atualizações automáticas do ERP não aparecem aqui.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-2 text-sm">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
          <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white max-w-[240px]">
            <option value="todas">Todas as obras</option>
            {Object.entries(obras)
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR", { numeric: true }))
              .map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
          </select>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value="todos">Todas as pessoas</option>
            {pessoas.map(([email, nome]) => (
              <option key={email} value={email}>
                {nome}
              </option>
            ))}
          </select>
          <select value={filtroTabela} onChange={(e) => setFiltroTabela(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
            <option value="todas">Tudo</option>
            {Object.entries(TABELAS)
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
              .map(([t, rotulo]) => (
                <option key={t} value={t}>
                  {rotulo}
                </option>
              ))}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="border rounded-lg pl-7 pr-2 py-1.5 w-40" />
          </div>
        </div>

        {carregando ? (
          <p className="p-6 text-sm text-slate-400 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Carregando…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[760px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 w-6" />
                  <th className="px-3 py-2 text-left">Quando</th>
                  <th className="px-3 py-2 text-left">Quem</th>
                  <th className="px-3 py-2 text-left">O quê</th>
                  <th className="px-3 py-2 text-left">Obra</th>
                  <th className="px-3 py-2 text-left">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Nenhuma alteração no período.
                    </td>
                  </tr>
                ) : (
                  visiveis.map((r) => {
                    const op = OPERACAO[r.operacao];
                    const campos = Array.from(new Set([...Object.keys(r.antes || {}), ...Object.keys(r.depois || {})]));
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-t hover:bg-slate-50 cursor-pointer" {...linhaClicavel(() => setAberto(aberto === r.id ? null : r.id))}>
                          <td className="px-3 py-2 text-slate-400">{aberto === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatarDataHora(r.em)}</td>
                          <td className="px-3 py-2">{r.nome_usuario || r.email}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border mr-1.5 ${op.classe}`}>{op.rotulo}</span>
                            {TABELAS[r.tabela] || r.tabela}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{r.id_obra ? obras[r.id_obra] || "—" : "—"}</td>
                          <td className="px-3 py-2 text-slate-500 max-w-[320px] truncate">{resumo(r)}</td>
                        </tr>
                        {aberto === r.id && (
                          <tr className="bg-slate-50/60">
                            <td />
                            <td colSpan={5} className="px-3 py-3">
                              <table className="text-xs w-full">
                                <thead className="text-slate-500">
                                  <tr>
                                    <th className="text-left pr-4 py-1 w-48">Campo</th>
                                    {r.operacao !== "inclusao" && <th className="text-left pr-4 py-1">Antes</th>}
                                    {r.operacao !== "exclusao" && <th className="text-left py-1">{r.operacao === "inclusao" ? "Valor" : "Depois"}</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {campos.map((c) => (
                                    <tr key={c} className="border-t border-slate-200 align-top">
                                      <td className="pr-4 py-1 font-semibold text-slate-600">{c}</td>
                                      {r.operacao !== "inclusao" && (
                                        <td className="pr-4 py-1 text-red-700 break-all">{valorTexto(r.antes?.[c])}</td>
                                      )}
                                      {r.operacao !== "exclusao" && (
                                        <td className="py-1 text-emerald-700 break-all">{valorTexto(r.depois?.[c])}</td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-2 text-[11px] text-slate-400 border-t">
          {visiveis.length} registro(s){registros.length === LIMITE ? ` — mostrando os ${LIMITE} mais recentes; use os filtros para ver mais antigos` : ""}.
        </p>
      </div>
    </div>
  );
}
