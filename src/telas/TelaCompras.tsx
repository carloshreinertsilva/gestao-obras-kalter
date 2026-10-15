import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, Search } from "lucide-react";
import { supabase } from "../supabase";
import { exportarCsv, formatarDataSegura, formatarMoeda } from "../utils";
import { SeloAlertaFamilia } from "../AlertaFamilia";

// Compras (logistica e admin): material da SMA pendente em todas as obras, previsoes
// liberadas (gravadas no ERP) recentes e saldo de previsoes por familia. So consulta:
// a situacao real das compras vem do ERP (RPCs compras_sma_pendentes / compras_previsoes_abertas).
interface ItemSma {
  id_obra: string;
  codigo_obra: string;
  nome_obra: string;
  gestor: string | null;
  nr_sma: number;
  sequencia: number;
  codigo_material: string | null;
  descricao_material: string | null;
  projeto_sma: string | null;
  quantidade_pendente: number;
  urgente: boolean;
  data_cadastro: string | null;
  data_necessidade: string | null;
  solicitante: string | null;
  situacao_compra: "sem_compra" | "em_cotacao" | "com_pedido";
}

interface PrevisaoFamilia {
  id_obra: string;
  codigo_obra: string;
  nome_obra: string;
  gestor: string | null;
  codigo_projeto: string;
  descricao: string | null;
  previsoes_em_aberto: number;
  previsoes_numeros: string | null;
  nivel_alerta: string | null;
}

interface PrevisaoLiberada {
  id: string;
  codigo_obra: string;
  tipo: string;
  valor: number;
  familia_destino: string;
  nome_solicitante: string | null;
  executado_em: string | null;
  resultado: { nova_parcela?: { docto?: string } } | null;
}

const SITUACAO: Record<string, { rotulo: string; classe: string }> = {
  sem_compra: { rotulo: "Não iniciada", classe: "bg-red-50 text-red-700 border-red-200" },
  em_cotacao: { rotulo: "Em cotação", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  com_pedido: { rotulo: "Com pedido", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function TelaCompras({ falhaAoCarregar }: { falhaAoCarregar: (oque: string, error: unknown) => void }) {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<ItemSma[]>([]);
  const [familias, setFamilias] = useState<PrevisaoFamilia[]>([]);
  const [liberadas, setLiberadas] = useState<PrevisaoLiberada[]>([]);
  // filtro do topo: vale para as tres tabelas e para os indicadores
  const [obra, setObra] = useState("todas");
  const [gestor, setGestor] = useState("todos");
  const [situacao, setSituacao] = useState("pendentes"); // pendentes = ainda sem pedido
  const [soUrgentes, setSoUrgentes] = useState(false);
  const [soAtrasados, setSoAtrasados] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const desde = new Date(Date.now() - 30 * 86400000).toISOString();
    Promise.all([
      supabase.rpc("compras_sma_pendentes"),
      supabase.rpc("compras_previsoes_abertas"),
      supabase
        .from("solicitacoes_previsao")
        .select("id, codigo_obra, tipo, valor, familia_destino, nome_solicitante, executado_em, resultado")
        .eq("status", "executada")
        .gte("executado_em", desde)
        .order("executado_em", { ascending: false }),
    ])
      .then(([s, f, l]) => {
        const erro = s.error || f.error || l.error;
        if (erro) throw erro;
        setItens((s.data as ItemSma[]) || []);
        setFamilias((f.data as PrevisaoFamilia[]) || []);
        setLiberadas((l.data as PrevisaoLiberada[]) || []);
      })
      .catch((e) => falhaAoCarregar("o painel de compras", e))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // obra -> nome e gestor, a partir das SMAs e do saldo por familia (as previsoes liberadas so trazem o codigo)
  const infoObras = useMemo(() => {
    const mapa = new Map<string, { nome: string; gestor: string }>();
    [...familias, ...itens].forEach((o) => mapa.set(o.codigo_obra, { nome: o.nome_obra, gestor: o.gestor || "Sem gestor" }));
    return mapa;
  }, [itens, familias]);
  const gestores = useMemo(() => [...new Set([...infoObras.values()].map((o) => o.gestor))].sort((a, b) => a.localeCompare(b, "pt-BR")), [infoObras]);
  const obras = useMemo(
    () =>
      [...infoObras.entries()]
        .filter(([, o]) => gestor === "todos" || o.gestor === gestor)
        .map(([cod, o]) => [cod, `${cod} - ${o.nome}`] as [string, string])
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR", { numeric: true })),
    [infoObras, gestor],
  );
  const noFiltro = (codigoObra: string) =>
    (obra === "todas" || codigoObra === obra) && (gestor === "todos" || infoObras.get(codigoObra)?.gestor === gestor);

  const hoje = hojeISO();
  const atrasado = (i: ItemSma) => Boolean(i.data_necessidade && i.data_necessidade < hoje);
  const termo = busca.trim().toLowerCase();
  const itensFiltro = itens.filter((i) => noFiltro(i.codigo_obra));
  const liberadasFiltro = liberadas.filter((p) => noFiltro(p.codigo_obra));
  const filtrados = itensFiltro.filter((i) => {
    if (situacao === "pendentes" && i.situacao_compra === "com_pedido") return false;
    if (situacao !== "pendentes" && situacao !== "todas" && i.situacao_compra !== situacao) return false;
    if (soUrgentes && !i.urgente) return false;
    if (soAtrasados && !atrasado(i)) return false;
    if (termo && ![i.codigo_material, i.descricao_material, i.solicitante, String(i.nr_sma)].join(" ").toLowerCase().includes(termo)) return false;
    return true;
  });
  const semPedido = itensFiltro.filter((i) => i.situacao_compra !== "com_pedido");
  const familiasVisiveis = familias.filter((f) => noFiltro(f.codigo_obra));

  if (carregando)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando o painel de compras...
      </p>
    );

  const indicadores: [string, number, string][] = [
    ["Itens sem pedido", semPedido.length, "text-slate-800"],
    ["Ainda não iniciados", itensFiltro.filter((i) => i.situacao_compra === "sem_compra").length, "text-red-600"],
    ["Urgentes sem pedido", semPedido.filter((i) => i.urgente).length, "text-orange-600"],
    ["Atrasados (necessidade vencida)", semPedido.filter(atrasado).length, "text-red-600"],
  ];

  return (
    <div className="animate-in fade-in space-y-6 max-w-full">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Compras</h2>
        <p className="text-sm text-slate-400 mt-1">
          Material solicitado nas SMAs das obras em andamento, previsões liberadas e saldo por família. Atualizado pelo ERP.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase text-slate-400 mr-1">Filtrar</span>
        <select
          value={gestor}
          onChange={(e) => {
            setGestor(e.target.value);
            setObra("todas");
          }}
          className="border rounded-lg px-2 py-1.5 bg-white"
        >
          <option value="todos">Todos os gestores</option>
          {gestores.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select value={obra} onChange={(e) => setObra(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white max-w-[280px]">
          <option value="todas">Todas as obras</option>
          {obras.map(([cod, rot]) => (
            <option key={cod} value={cod}>
              {rot}
            </option>
          ))}
        </select>
        {(gestor !== "todos" || obra !== "todas") && (
          <button
            onClick={() => {
              setGestor("todos");
              setObra("todas");
            }}
            className="px-2 py-1.5 text-[#2A6377] font-semibold hover:underline"
          >
            Limpar filtro
          </button>
        )}
        <span className="text-[11px] text-slate-400 ml-auto">Vale para SMAs, previsões liberadas e saldo por família.</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map(([rotulo, valor, cor]) => (
          <div key={rotulo} className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-[11px] text-slate-400 font-bold uppercase">{rotulo}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <h3 className="font-bold text-lg">Material da SMA pendente</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
              <option value="pendentes">Sem pedido</option>
              <option value="sem_compra">Não iniciada</option>
              <option value="em_cotacao">Em cotação</option>
              <option value="com_pedido">Com pedido</option>
              <option value="todas">Todas</option>
            </select>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={soUrgentes} onChange={(e) => setSoUrgentes(e.target.checked)} /> Urgentes
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={soAtrasados} onChange={(e) => setSoAtrasados(e.target.checked)} /> Atrasados
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Material, SMA..." className="border rounded-lg pl-7 pr-2 py-1.5 w-40" />
            </div>
            <button
              onClick={() =>
                exportarCsv(
                  "compras_sma_pendente",
                  ["Obra", "Gestor", "SMA", "Material", "Descrição", "Família", "Qtd. pendente", "Urgente", "Necessidade", "Solicitante", "Situação"],
                  filtrados.map((i) => [
                    `${i.codigo_obra} - ${i.nome_obra}`, i.gestor || "", i.nr_sma, i.codigo_material || "", i.descricao_material || "",
                    i.projeto_sma || "", String(i.quantidade_pendente).replace(".", ","), i.urgente ? "Sim" : "",
                    i.data_necessidade ? formatarDataSegura(i.data_necessidade) : "", i.solicitante || "", SITUACAO[i.situacao_compra]?.rotulo || "",
                  ]),
                )
              }
              className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              title="Exportar a lista filtrada para Excel"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-[13px] min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Obra</th>
                <th className="px-3 py-2 text-center">SMA</th>
                <th className="px-3 py-2 text-left">Material</th>
                <th className="px-3 py-2 text-left">Família</th>
                <th className="px-3 py-2 text-right">Qtd. pendente</th>
                <th className="px-3 py-2 text-center">Necessidade</th>
                <th className="px-3 py-2 text-left">Solicitante</th>
                <th className="px-3 py-2 text-center">Compra</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    Nenhum material com esses filtros.
                  </td>
                </tr>
              ) : (
                filtrados.map((i) => (
                  <tr key={`${i.id_obra}-${i.nr_sma}-${i.sequencia}`} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <a href={`/obras/${i.codigo_obra}/lista-materiais`} className="text-[#2A6377] font-semibold hover:underline">
                        {i.codigo_obra}
                      </a>
                      <span className="block text-[11px] text-slate-400">{i.gestor}</span>
                    </td>
                    <td className="px-3 py-2 text-center">{i.nr_sma}</td>
                    <td className="px-3 py-2">
                      {i.urgente && (
                        <span className="mr-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                          URGENTE
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">{i.codigo_material}</span> {i.descricao_material}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{i.projeto_sma}</td>
                    <td className="px-3 py-2 text-right">{Number(i.quantidade_pendente).toLocaleString("pt-BR")}</td>
                    <td className={`px-3 py-2 text-center whitespace-nowrap ${atrasado(i) ? "text-red-600 font-semibold" : ""}`}>
                      {i.data_necessidade ? formatarDataSegura(i.data_necessidade) : "-"}
                      {atrasado(i) && <AlertTriangle size={12} className="inline ml-1 -mt-0.5" />}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{i.solicitante}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${SITUACAO[i.situacao_compra]?.classe}`}>
                        {SITUACAO[i.situacao_compra]?.rotulo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[11px] text-slate-400 border-t">
          {filtrados.length} item(ns). "Com pedido": a SMA já virou pedido de compra no ERP (ligação pelo número da SMA na solicitação de compra).
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold text-lg">Previsões liberadas (últimos 30 dias)</h3>
          </div>
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Gravada em</th>
                  <th className="px-3 py-2 text-left">Obra / família</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Previsão</th>
                </tr>
              </thead>
              <tbody>
                {liberadasFiltro.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Nenhuma previsão gravada nos últimos 30 dias.
                    </td>
                  </tr>
                ) : (
                  liberadasFiltro.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap">{p.executado_em ? formatarDataSegura(p.executado_em) : "-"}</td>
                      <td className="px-3 py-2">
                        <a href={`/obras/${p.codigo_obra}/previsoes`} className="text-[#2A6377] font-semibold hover:underline">
                          {p.codigo_obra}
                        </a>{" "}
                        · {p.familia_destino}
                        <span className="block text-[11px] text-slate-400">
                          {p.tipo === "aumento" ? "Aumento" : "Transferência"} · {p.nome_solicitante}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatarMoeda(p.valor)}</td>
                      <td className="px-3 py-2 text-center">{p.resultado?.nova_parcela?.docto || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <h3 className="font-bold text-lg">Saldo de previsões por família</h3>
            <button
              onClick={() =>
                exportarCsv(
                  "compras_previsoes_abertas",
                  ["Obra", "Gestor", "Família", "Descrição", "Em aberto", "Nº Previsão", "Alerta"],
                  familiasVisiveis.map((f) => [
                    `${f.codigo_obra} - ${f.nome_obra}`, f.gestor || "", f.codigo_projeto, f.descricao || "",
                    String(f.previsoes_em_aberto).replace(".", ","), f.previsoes_numeros || "", f.nivel_alerta || "",
                  ]),
                )
              }
              className="px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-[13px]">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Obra / família</th>
                  <th className="px-3 py-2 text-right">Em aberto</th>
                  <th className="px-3 py-2 text-center">Nº Previsão</th>
                </tr>
              </thead>
              <tbody>
                {familiasVisiveis.map((f) => (
                  <tr key={`${f.id_obra}-${f.codigo_projeto}`} className="border-t">
                    <td className="px-3 py-2">
                      {f.codigo_projeto} - {f.descricao}
                      <SeloAlertaFamilia nivel={f.nivel_alerta} />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap text-blue-700 font-semibold">{formatarMoeda(f.previsoes_em_aberto)}</td>
                    <td className="px-3 py-2 text-center">{f.previsoes_numeros || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
