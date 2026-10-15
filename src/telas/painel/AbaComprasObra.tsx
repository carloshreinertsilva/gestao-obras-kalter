import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, Search } from "lucide-react";
import { supabase } from "../../supabase";
import { exportarCsv, formatarDataSegura, formatarMoeda } from "../../utils";

// Aba "Compras" da obra: solicitacoes de compra em aberto no ERP (tabela obra_compras_abertas,
// espelhada pelo robo). E a mesma regra que deixa a fase Compras do cronograma "em andamento":
// solicitacao ativa sem pedido de compra encerrado. So consulta.
interface CompraAberta {
  nr_solicitacao: number;
  codigo_material: string | null;
  descricao_material: string | null;
  codigo_projeto: string | null;
  quantidade: number;
  quantidade_recebida: number;
  preco_unitario: number | null;
  valor: number | null;
  situacao: "sem_pedido" | "nao_liberado" | "aguardando" | "recebido";
  nr_pedido: number | null;
  data_pedido: string | null;
  fornecedor: string | null;
  data_solicitacao: string | null;
  data_entrega: string | null;
  nr_sma: number | null;
}

const SITUACAO: Record<CompraAberta["situacao"], { rotulo: string; classe: string; dica: string }> = {
  sem_pedido: { rotulo: "Sem pedido", classe: "bg-red-50 text-red-700 border-red-200", dica: "Solicitação ainda sem pedido de compra (em cotação)" },
  nao_liberado: { rotulo: "Pedido não liberado", classe: "bg-amber-50 text-amber-700 border-amber-200", dica: "Pedido emitido, aguardando liberação no ERP" },
  aguardando: { rotulo: "Aguardando entrega", classe: "bg-blue-50 text-blue-700 border-blue-200", dica: "Pedido de compra ativo, material ainda não recebido (ou recebido em parte)" },
  recebido: { rotulo: "Recebido", classe: "bg-emerald-50 text-emerald-700 border-emerald-200", dica: "Item recebido, mas o pedido ainda não foi encerrado no ERP (outros itens dele pendentes)" },
};

const num = (v: unknown) => Number(v || 0);
const fmtQtd = (v: number) => num(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export default function AbaComprasObra({ idObra, codigoObra }: { idObra: string; codigoObra: string }) {
  const [compras, setCompras] = useState<CompraAberta[] | null>(null);
  const [erro, setErro] = useState("");
  const [situacao, setSituacao] = useState("pendentes"); // pendentes = tudo menos "recebido"
  const [familia, setFamilia] = useState("todas");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;
    setCompras(null);
    setErro("");
    supabase
      .from("obra_compras_abertas")
      .select("*")
      .eq("id_obra", idObra)
      .order("data_entrega", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro("Não foi possível carregar as compras da obra.");
        setCompras((data as CompraAberta[]) || []);
      });
    return () => {
      ativo = false;
    };
  }, [idObra]);

  const hoje = new Date().toISOString().slice(0, 10);
  const atrasada = (c: CompraAberta) => c.situacao !== "recebido" && Boolean(c.data_entrega && c.data_entrega < hoje);

  const familias = useMemo(
    () => [...new Set((compras || []).map((c) => c.codigo_projeto || "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [compras],
  );

  if (compras === null)
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando as compras da obra...
      </p>
    );

  const termo = busca.trim().toLowerCase();
  const filtradas = compras.filter((c) => {
    if (situacao === "pendentes" && c.situacao === "recebido") return false;
    if (situacao === "atrasadas" && !atrasada(c)) return false;
    if (!["pendentes", "todas", "atrasadas"].includes(situacao) && c.situacao !== situacao) return false;
    if (familia !== "todas" && c.codigo_projeto !== familia) return false;
    if (
      termo &&
      ![c.codigo_material, c.descricao_material, c.fornecedor, c.nr_solicitacao, c.nr_pedido, c.nr_sma]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    )
      return false;
    return true;
  });
  const pendentes = compras.filter((c) => c.situacao !== "recebido");
  const soma = (l: CompraAberta[]) => l.reduce((a, c) => a + num(c.valor), 0);
  const aguardando = compras.filter((c) => c.situacao === "aguardando" || c.situacao === "nao_liberado");

  const indicadores: [string, string, string, string][] = [
    ["Sem pedido", String(compras.filter((c) => c.situacao === "sem_pedido").length), "em cotação", "text-red-600"],
    ["Aguardando entrega", String(aguardando.length), formatarMoeda(soma(aguardando)), "text-blue-700"],
    ["Entrega atrasada", String(compras.filter(atrasada).length), "previsão de entrega vencida", "text-red-600"],
    ["Recebidos, pedido aberto", String(compras.filter((c) => c.situacao === "recebido").length), "aguardam encerramento no ERP", "text-slate-600"],
  ];

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
            <h3 className="font-bold text-lg">Compras em aberto</h3>
            <p className="text-[11px] text-slate-400">
              Solicitações de compra ativas no ERP sem pedido encerrado — são elas que mantêm a fase Compras do cronograma em andamento.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
              <option value="pendentes">Pendentes</option>
              <option value="sem_pedido">Sem pedido</option>
              <option value="nao_liberado">Pedido não liberado</option>
              <option value="aguardando">Aguardando entrega</option>
              <option value="atrasadas">Entrega atrasada</option>
              <option value="recebido">Recebidos (pedido aberto)</option>
              <option value="todas">Todas</option>
            </select>
            <select value={familia} onChange={(e) => setFamilia(e.target.value)} className="border rounded-lg px-2 py-1.5 bg-white">
              <option value="todas">Todas as famílias</option>
              {familias.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Material, fornecedor, pedido..."
                className="border rounded-lg pl-7 pr-2 py-1.5 w-52"
              />
            </div>
            <button
              onClick={() =>
                exportarCsv(
                  `compras_obra_${codigoObra}`,
                  ["Solicitação", "Data", "Material", "Descrição", "Família", "Qtd.", "Qtd. recebida", "Preço unit.", "Valor", "Situação", "Pedido", "Data pedido", "Fornecedor", "Entrega prevista", "SMA"],
                  filtradas.map((c) => [
                    c.nr_solicitacao, c.data_solicitacao ? formatarDataSegura(c.data_solicitacao) : "", c.codigo_material || "",
                    c.descricao_material || "", c.codigo_projeto || "", fmtQtd(c.quantidade), fmtQtd(c.quantidade_recebida),
                    c.preco_unitario != null ? String(c.preco_unitario).replace(".", ",") : "", c.valor != null ? String(c.valor).replace(".", ",") : "",
                    SITUACAO[c.situacao].rotulo, c.nr_pedido || "", c.data_pedido ? formatarDataSegura(c.data_pedido) : "", c.fornecedor || "",
                    c.data_entrega ? formatarDataSegura(c.data_entrega) : "", c.nr_sma || "",
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

        {erro && <p className="px-4 py-3 text-sm text-red-600">{erro}</p>}
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-[13px] min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Solicitação</th>
                <th className="px-3 py-2 text-left">Material</th>
                <th className="px-3 py-2 text-left">Família</th>
                <th className="px-3 py-2 text-right">Qtd.</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Pedido / fornecedor</th>
                <th className="px-3 py-2 text-center">Entrega prevista</th>
                <th className="px-3 py-2 text-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    {compras.length === 0 ? "Nenhuma compra em aberto para esta obra no ERP." : "Nenhuma compra com esses filtros."}
                  </td>
                </tr>
              ) : (
                filtradas.map((c) => (
                  <tr key={c.nr_solicitacao} className="border-t hover:bg-slate-50 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-semibold">{c.nr_solicitacao}</span>
                      <span className="block text-[11px] text-slate-400">{c.data_solicitacao ? formatarDataSegura(c.data_solicitacao) : ""}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-slate-400 text-[11px]">{c.codigo_material}</span> {c.descricao_material}
                      {c.nr_sma && <span className="block text-[11px] text-slate-400">SMA {c.nr_sma}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{c.codigo_projeto || "-"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {num(c.quantidade_recebida) > 0 && c.situacao !== "recebido" ? (
                        <span title="recebido / solicitado">
                          {fmtQtd(c.quantidade_recebida)} / {fmtQtd(c.quantidade)}
                        </span>
                      ) : (
                        fmtQtd(c.quantidade)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">
                      {c.valor != null ? formatarMoeda(c.valor) : <span className="text-slate-400 font-normal">a cotar</span>}
                    </td>
                    <td className="px-3 py-2">
                      {c.nr_pedido ? (
                        <span className="font-semibold">
                          Pedido {c.nr_pedido}
                          <span className="font-normal text-[11px] text-slate-400"> {c.data_pedido ? formatarDataSegura(c.data_pedido) : ""}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {c.fornecedor && <span className="block text-[11px] text-slate-500">{c.fornecedor}</span>}
                    </td>
                    <td className={`px-3 py-2 text-center whitespace-nowrap ${atrasada(c) ? "text-red-600 font-semibold" : ""}`}>
                      {c.data_entrega ? formatarDataSegura(c.data_entrega) : "-"}
                      {atrasada(c) && <AlertTriangle size={12} className="inline ml-1 -mt-0.5" />}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span title={SITUACAO[c.situacao].dica} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${SITUACAO[c.situacao].classe}`}>
                        {SITUACAO[c.situacao].rotulo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[11px] text-slate-400 border-t">
          {filtradas.length} de {compras.length} solicitação(ões) · pendentes somam {formatarMoeda(soma(pendentes))} (itens com preço) · atualizado pelo ERP a cada 5 minutos.
        </p>
      </div>
    </div>
  );
}
