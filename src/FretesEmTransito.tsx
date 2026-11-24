import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, Search } from "lucide-react";
import { supabase } from "./supabase";
import { exportarCsv, formatarDataSegura, formatarMoeda } from "./utils";
import { ErroCarga } from "./Dialogos";
import { BotaoExportar, numCsv, useFiltroSalvo } from "./modulos_lista";
import { mensagemErro } from "./erros";
import {
  confiancaDaLigacao,
  diasDoCte,
  FILTROS_TRANSITO,
  filtrarCtes,
  resumoTransito,
  ROTULO_LIGACAO,
  type CteSefaz,
  type FiltroTransito,
} from "./calculoCteTransito";

// Fretes em transito (2026-11-23): CT-es em que a Kalter e a tomadora do frete, capturados na SEFAZ pelo robo
// (public.fretes_ctes_sefaz) no dia da emissao - antes de o CT-e ser lancado no ERP. So leitura: o robo grava.
// "Sem entrada" = ainda nao ha AD do CT-e no ERP. A obra vem da NF-e transportada (entrada ja lancada, pedido que o
// fornecedor informou na NF-e, ou NF de saida); "sugestao" (pedidos em aberto do fornecedor) precisa de conferencia.

const COLUNAS =
  "chave, numero, serie, emitido_em, sentido, transportadora_cnpj, transportadora_nome, remetente_nome, destinatario_nome, origem_nome, destino_nome, valor, cancelado, nr_ad, data_entrada, ligacao, pedidos, projetos, codigos_obra";
const DIAS_LANCADOS = 30;
const LIMITE = 500;
const SENTIDO: Record<CteSefaz["sentido"], string> = { compra: "Compra", venda: "Venda", outro: "Outro" };

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const diasAtras = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const rota = (c: CteSefaz) => (c.origem_nome || c.destino_nome ? `${c.origem_nome || "?"} → ${c.destino_nome || "?"}` : "-");
const contraparte = (c: CteSefaz) => (c.sentido === "compra" ? c.remetente_nome : c.sentido === "venda" ? c.destinatario_nome : null) || "";

function Obra({ c }: { c: CteSefaz }) {
  const conf = confiancaDaLigacao(c);
  if (conf === "nenhuma")
    return (
      <span className="inline-flex items-center gap-1 text-amber-700" title={ROTULO_LIGACAO[c.ligacao]}>
        <AlertTriangle size={13} aria-hidden="true" /> Sem obra identificada
      </span>
    );
  return (
    <span className={`inline-flex items-center gap-1 ${conf === "sugestao" ? "text-amber-700" : "text-slate-800"}`} title={ROTULO_LIGACAO[c.ligacao]}>
      {conf === "sugestao" ? <HelpCircle size={13} aria-hidden="true" /> : <CheckCircle2 size={13} className="text-emerald-600" aria-hidden="true" />}
      <span className="font-semibold">{c.codigos_obra.join(", ")}</span>
      {conf === "sugestao" && <span className="text-xs">(conferir)</span>}
    </span>
  );
}

function Situacao({ c, dias }: { c: CteSefaz; dias: number }) {
  if (c.nr_ad != null)
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
        Lançado · AD {c.nr_ad}
      </span>
    );
  const atrasado = dias > 7;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${atrasado ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
      Sem entrada · {dias === 0 ? "hoje" : `${dias} ${dias === 1 ? "dia" : "dias"}`}
    </span>
  );
}

const Resumo = ({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) => (
  <div className="bg-white border rounded-xl p-3">
    <p className="text-xs uppercase font-bold text-slate-500">{rotulo}</p>
    <p className={`text-xl font-bold tabular-nums ${cor}`}>{valor}</p>
  </div>
);

// tudo que ainda nao tem entrada + os lancados dos ultimos dias (para conferir o que acabou de entrar)
async function buscarCtes(): Promise<{ ctes: CteSefaz[]; erro: string; semTabela: boolean }> {
  const { data, error } = await supabase
    .from("fretes_ctes_sefaz")
    .select(COLUNAS)
    .eq("cancelado", false)
    .or(`nr_ad.is.null,emitido_em.gte.${diasAtras(DIAS_LANCADOS)}`)
    .order("emitido_em", { ascending: false })
    .limit(LIMITE);
  if (error)
    return { ctes: [], erro: mensagemErro(error, "Tente de novo em instantes."), semTabela: error.code === "PGRST205" || error.code === "42P01" };
  const ctes = ((data as unknown as CteSefaz[]) || []).map((c) => ({
    ...c,
    valor: Number(c.valor || 0),
    pedidos: c.pedidos || [],
    projetos: c.projetos || [],
    codigos_obra: c.codigos_obra || [],
  }));
  return { ctes, erro: "", semTabela: false };
}

export function FretesEmTransito() {
  const [ctes, setCtes] = useState<CteSefaz[] | null>(null);
  const [erro, setErro] = useState("");
  const [indisponivel, setIndisponivel] = useState(false);
  const [filtro, setFiltro] = useFiltroSalvo<string>("fretes.transito.filtro", "sem_entrada", (v) => FILTROS_TRANSITO.includes(v as FiltroTransito));
  const [busca, setBusca] = useFiltroSalvo<string>("fretes.transito.busca", "", (v) => typeof v === "string" && v.length <= 100);
  const hoje = hojeIso();

  const aplicar = (r: Awaited<ReturnType<typeof buscarCtes>>) => {
    if (r.erro) {
      // tabela ainda nao criada no banco (p20 pendente): mostra o aviso em vez de erro tecnico
      if (r.semTabela) setIndisponivel(true);
      else setErro(r.erro);
      setCtes((ant) => ant ?? []);
      return;
    }
    setErro("");
    setIndisponivel(false);
    setCtes(r.ctes);
  };
  const carregar = () => buscarCtes().then(aplicar);

  useEffect(() => {
    let vivo = true;
    buscarCtes().then((r) => vivo && aplicar(r));
    return () => {
      vivo = false;
    };
  }, []);

  const lista = useMemo(() => filtrarCtes(ctes || [], filtro as FiltroTransito, busca), [ctes, filtro, busca]);
  const resumo = useMemo(() => resumoTransito(ctes || [], hoje), [ctes, hoje]);

  if (ctes === null)
    return (
      <p className="text-sm text-slate-500 flex items-center gap-2 p-6">
        <Loader2 className="animate-spin" size={16} /> Carregando os CT-es…
      </p>
    );

  if (indisponivel)
    return (
      <div className="bg-white border rounded-xl p-6 text-sm text-slate-600">
        A captura de CT-es na SEFAZ ainda não está ligada. Quando o robô começar a gravar, os fretes em trânsito aparecem aqui.
      </div>
    );

  const filtros: { id: FiltroTransito; rotulo: string }[] = [
    { id: "sem_entrada", rotulo: `Sem entrada no ERP (${resumo.quantidade})` },
    { id: "sem_obra", rotulo: `Sem obra confirmada (${resumo.semObra})` },
    { id: "lancados", rotulo: `Lançados (${DIAS_LANCADOS} dias)` },
    { id: "todos", rotulo: "Todos" },
  ];

  const exportar = () =>
    exportarCsv(
      "fretes_em_transito",
      ["Emissão", "Dias", "CT-e", "Série", "Transportadora", "Operação", "Remetente", "Destinatário", "Origem", "Destino", "Valor", "Obra(s)",
        "Pedido(s)", "Projeto(s)", "Como foi ligado", "AD do CT-e", "Entrada no ERP", "Chave"],
      lista.map((c) => [
        formatarDataSegura(c.emitido_em), diasDoCte(c, hoje), c.numero, c.serie || "", c.transportadora_nome || "", SENTIDO[c.sentido],
        c.remetente_nome || "", c.destinatario_nome || "", c.origem_nome || "", c.destino_nome || "", numCsv(c.valor), c.codigos_obra.join(", "),
        c.pedidos.join(", "), c.projetos.join(", "), ROTULO_LIGACAO[c.ligacao], c.nr_ad ?? "", c.data_entrada ? formatarDataSegura(c.data_entrada) : "",
        `'${c.chave}`,
      ]),
    );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Resumo rotulo="CT-es sem entrada no ERP" valor={String(resumo.quantidade)} cor="text-blue-700" />
        <Resumo rotulo="Valor ainda fora do ERP" valor={formatarMoeda(resumo.valor)} cor="text-slate-800" />
        <Resumo rotulo="Sem obra confirmada" valor={String(resumo.semObra)} cor="text-amber-700" />
        <Resumo rotulo="Há mais de 7 dias" valor={String(resumo.maisDe7Dias)} cor="text-red-600" />
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
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
            <div className="relative flex-1 md:flex-none">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" aria-hidden="true" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Obra, pedido, transportadora…"
                aria-label="Buscar CT-es"
                className="border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[#2A6377] w-full md:w-64"
              />
            </div>
            <BotaoExportar onClick={exportar} disabled={!lista.length} />
          </div>
        </div>

        {erro && (
          <ErroCarga
            mensagem={ctes.length ? "Não foi possível atualizar a lista (mostrando a última carregada)." : "Não foi possível carregar os CT-es."}
            detalhe={erro}
            compacto={ctes.length > 0}
            onTentar={carregar}
          />
        )}

        {/* celular: cartoes */}
        <ul className="md:hidden divide-y">
          {lista.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-500">{erro && !ctes.length ? "" : "Nenhum CT-e neste filtro."}</li>
          ) : (
            lista.map((c) => (
              <li key={c.chave} className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[#2A6377]">
                    CT-e {c.numero} <span className="text-slate-700 font-semibold">· {SENTIDO[c.sentido]}</span>
                  </p>
                  <span className="font-bold tabular-nums whitespace-nowrap">{formatarMoeda(c.valor)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{rota(c)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatarDataSegura(c.emitido_em)} · {c.transportadora_nome || c.transportadora_cnpj}
                  {contraparte(c) ? ` · ${contraparte(c)}` : ""}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-sm">
                  <Obra c={c} />
                  <Situacao c={c} dias={diasDoCte(c, hoje)} />
                </div>
                {c.pedidos.length > 0 && <p className="text-xs text-slate-500 mt-1">Pedido {c.pedidos.join(", ")}</p>}
              </li>
            ))
          )}
        </ul>

        {/* computador: tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Emissão</th>
                <th className="px-3 py-2 text-left">CT-e</th>
                <th className="px-3 py-2 text-left">Transportadora</th>
                <th className="px-3 py-2 text-left">Frete</th>
                <th className="px-3 py-2 text-left">Rota</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-left">Obra</th>
                <th className="px-3 py-2 text-left">Pedido</th>
                <th className="px-3 py-2 text-left">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    {erro && !ctes.length ? "" : "Nenhum CT-e neste filtro."}
                  </td>
                </tr>
              ) : (
                lista.map((c) => (
                  <tr key={c.chave} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{formatarDataSegura(c.emitido_em)}</td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{c.numero}</td>
                    <td className="px-3 py-2">{c.transportadora_nome || c.transportadora_cnpj}</td>
                    <td className="px-3 py-2">
                      {SENTIDO[c.sentido]}
                      {contraparte(c) && <span className="block text-xs text-slate-500">{contraparte(c)}</span>}
                    </td>
                    <td className="px-3 py-2">{rota(c)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{formatarMoeda(c.valor)}</td>
                    <td className="px-3 py-2">
                      <Obra c={c} />
                    </td>
                    <td className="px-3 py-2">{c.pedidos.length ? c.pedidos.join(", ") : "-"}</td>
                    <td className="px-3 py-2">
                      <Situacao c={c} dias={diasDoCte(c, hoje)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ctes.length >= LIMITE && <p className="px-3 py-2 text-xs text-slate-500 border-t">Mostrando os {LIMITE} CT-es mais recentes.</p>}
      </div>
      <p className="text-xs text-slate-500">
        CT-es em que a Kalter paga o frete, capturados na SEFAZ no dia da emissão. A obra vem da NF-e transportada; quando aparece “conferir”, é só
        uma sugestão pelos pedidos em aberto do fornecedor.
      </p>
    </>
  );
}
