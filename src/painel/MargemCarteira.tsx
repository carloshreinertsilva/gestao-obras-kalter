import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { supabase } from "../supabase";
import { formatarMoeda } from "../utils";
import type { ObraRentabilidadeFamilia } from "../types";
import {
  chaveIds,
  formatarPct,
  formatarPp,
  larguraBarra,
  montarLinhas,
  ordenarLinhas,
  resumirCarteira,
  type ColunaOrdem,
  type Direcao,
  type LinhaMargem,
  type ValoresRestritos,
  type ValoresVenda,
} from "./calculoMargemCarteira";

// Painel: margem prevista x atual de todas as obras em andamento (item B1, pacote 2).
// Numeros = mesma conta da aba Rentabilidade (calcularPanorama). Quem pode ver margem e decidido
// pela RLS das tabelas (admin, coordenador e engenheiro gestor da propria obra); aqui so evitamos
// mostrar o cartao para quem nao ve nada.

export interface ObraPainel {
  id: string;
  codigo: string;
  nome: string;
}

const PERFIS_COM_MARGEM = ["admin", "coordenador", "engenheiro"];
const PAGINA = 1000;

type Estado =
  | { fase: "verificando" }
  | { fase: "sem_acesso" }
  | { fase: "carregando" }
  | { fase: "erro" }
  | { fase: "pronto"; linhas: LinhaMargem[] };

const TITULO_SEM_DADO: Record<string, string> = {
  sem_rentabilidade: "O ERP ainda não trouxe a rentabilidade desta obra. Ela não entra nos totais.",
  sem_base:
    "Obra sem margem do orçamento no ERP e sem valor vendido cadastrado: não dá para calcular o %. Ela não entra nos totais.",
};

async function buscarFamilias(ids: string[]) {
  // paginado: o servidor devolve no maximo 1000 linhas por consulta e a carteira passa disso
  const todas: ObraRentabilidadeFamilia[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from("obra_rentabilidade_familias")
      .select("id, id_obra, codigo_projeto, eh_obra, custo_previsto, custo_realizado, previsoes_em_aberto, pedidos_em_aberto")
      .in("id_obra", ids)
      .order("id", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    todas.push(...((data || []) as unknown as ObraRentabilidadeFamilia[]));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}

export default function MargemCarteira({
  obras,
  onAbrirObra,
}: {
  obras: ObraPainel[];
  onAbrirObra: (idObra: string) => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: "verificando" });
  const [tentativa, setTentativa] = useState(0);
  const [ordem, setOrdem] = useState<{ coluna: ColunaOrdem; direcao: Direcao }>({ coluna: "variacao", direcao: "asc" });

  // o pai re-renderiza a cada 60 s com array novo: o efeito depende so dos ids
  const chave = chaveIds(obras);
  const obrasPorChave = useMemo(() => obras, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const { data: perfil, error: erroPerfil } = await supabase.rpc("perfil_atual");
        if (erroPerfil) throw erroPerfil;
        if (!PERFIS_COM_MARGEM.includes(String(perfil || ""))) {
          if (ativo) setEstado({ fase: "sem_acesso" });
          return;
        }
        if (ativo) setEstado((e) => (e.fase === "pronto" ? e : { fase: "carregando" }));
        const ids = chave ? chave.split(",") : [];
        if (ids.length === 0) {
          if (ativo) setEstado({ fase: "pronto", linhas: [] });
          return;
        }
        const [familias, vendasResp, restritosResp] = await Promise.all([
          buscarFamilias(ids),
          supabase.from("obras").select("id, valor_produto, valor_servico").in("id", ids),
          // cast: tabela fora do database.types.ts gerado (mesmo cast da aba Rentabilidade)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("obras_valores_restritos")
            .select("id_obra, margem_prevista_erp, venda_sem_impostos_erp")
            .in("id_obra", ids),
        ]);
        if (vendasResp.error) throw vendasResp.error;
        if (restritosResp.error) throw restritosResp.error;
        const restritos = (restritosResp.data || []) as ValoresRestritos[];
        // engenheiro: a RLS so devolve as obras que ele gerencia; obra sem nenhuma linha visivel
        // pode ser de outro gestor, entao fica fora da lista (admin/coordenador veem todas)
        const comAcesso =
          perfil === "engenheiro"
            ? new Set([...familias.map((f) => f.id_obra || ""), ...restritos.map((r) => r.id_obra)])
            : null;
        const lista = comAcesso ? obrasPorChave.filter((o) => comAcesso.has(o.id)) : obrasPorChave;
        if (perfil === "engenheiro" && lista.length === 0) {
          if (ativo) setEstado({ fase: "sem_acesso" });
          return;
        }
        const linhas = montarLinhas(lista, familias, (vendasResp.data || []) as ValoresVenda[], restritos);
        if (ativo) setEstado({ fase: "pronto", linhas });
      } catch (erro) {
        console.error("Margem das obras:", erro);
        if (ativo) setEstado({ fase: "erro" });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [chave, tentativa]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas = useMemo(() => (estado.fase === "pronto" ? estado.linhas : []), [estado]);
  const resumo = useMemo(() => resumirCarteira(linhas), [linhas]);
  const ordenadas = useMemo(() => ordenarLinhas(linhas, ordem.coluna, ordem.direcao), [linhas, ordem]);
  const maiorVariacao = useMemo(
    () => linhas.reduce((m, l) => (l.semDado ? m : Math.max(m, Math.abs(l.variacaoPp))), 0),
    [linhas],
  );

  if (estado.fase === "verificando" || estado.fase === "sem_acesso") return null;

  const alternar = (coluna: ColunaOrdem) =>
    setOrdem((o) => ({
      coluna,
      direcao: o.coluna === coluna ? (o.direcao === "asc" ? "desc" : "asc") : coluna === "margemAtual" ? "desc" : "asc",
    }));

  const ariaSort = (coluna: ColunaOrdem) =>
    ordem.coluna === coluna ? (ordem.direcao === "asc" ? "ascending" : "descending") : "none";

  const Cab = ({ rotulo, coluna, alinhar = "right" }: { rotulo: string; coluna: ColunaOrdem; alinhar?: "left" | "right" }) => (
    <th aria-sort={ariaSort(coluna)} className={`px-2 py-2 font-semibold ${alinhar === "left" ? "text-left" : "text-right"}`}>
      <button
        type="button"
        onClick={() => alternar(coluna)}
        className={`hover:text-[#2A6377] transition ${ordem.coluna === coluna ? "text-[#2A6377]" : ""}`}
      >
        {rotulo}
        {ordem.coluna === coluna ? (ordem.direcao === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  const corVariacao = (v: number) => (v < -0.05 ? "text-red-700" : v > 0.05 ? "text-emerald-700" : "text-slate-600");

  const Barra = ({ l }: { l: LinhaMargem }) => {
    const largura = larguraBarra(l.variacaoPp, maiorVariacao) / 2; // metade para cada lado do eixo
    const negativa = l.variacaoPp < 0;
    return (
      <div className="relative h-2.5 w-24 bg-slate-100 rounded" aria-hidden="true">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-400" />
        <div
          className={`absolute top-0 bottom-0 rounded ${negativa ? "bg-red-500" : "bg-emerald-500"}`}
          style={negativa ? { right: "50%", width: `${largura}%` } : { left: "50%", width: `${largura}%` }}
        />
      </div>
    );
  };

  const nomeObra = (l: LinhaMargem) => `${l.codigo} - ${l.nome}`;
  const tituloBase = (l: LinhaMargem) =>
    l.baseErp
      ? "Venda sem impostos do pedido no ERP"
      : "Obra sem margem do orçamento no ERP: % sobre o valor vendido (como na aba Rentabilidade)";

  // sinal em texto (nunca so a cor); centavo de arredondamento nao vira "−R$ 0,00"
  const moedaComSinal = (v: number) => `${v <= -0.005 ? "−" : "+"}${formatarMoeda(Math.abs(v))}`;
  const textoVariacao = (l: LinhaMargem) => `${formatarPp(l.variacaoPp)} (${moedaComSinal(l.variacaoValor)})`;

  return (
    <section className="bg-white rounded-xl shadow-sm border max-w-full overflow-hidden" aria-labelledby="titulo-margem-obras">
      <div className="p-4 border-b">
        <h3 id="titulo-margem-obras" className="font-bold text-lg">
          Margem das obras
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Mesmos valores da aba Rentabilidade de cada obra: margem prevista do orçamento x margem atual (com o realizado e
          o comprometido).
        </p>
      </div>

      {estado.fase === "carregando" && (
        <div className="p-4 space-y-3 animate-pulse" aria-busy="true" aria-label="Carregando margem das obras">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg" />
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      )}

      {estado.fase === "erro" && (
        <div className="p-6 text-center text-sm text-slate-600 space-y-3">
          <p>Não foi possível carregar a margem das obras.</p>
          <button
            type="button"
            onClick={() => setTentativa((t) => t + 1)}
            className="inline-flex items-center gap-2 bg-[#2A6377] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#1e4857]"
          >
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {estado.fase === "pronto" && linhas.length === 0 && (
        <p className="p-6 text-center text-sm text-slate-500">Nenhuma obra em andamento para mostrar.</p>
      )}

      {estado.fase === "pronto" && linhas.length > 0 && (
        <>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b">
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-slate-400 font-bold uppercase">Prevista (carteira)</p>
              <p className="text-xl font-bold text-slate-800">{formatarPct(resumo.pctPrevista)}</p>
              <p className="text-xs text-slate-500">{formatarMoeda(resumo.margemPrevista)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-slate-400 font-bold uppercase">Atual (carteira)</p>
              <p className="text-xl font-bold text-slate-800">{formatarPct(resumo.pctAtual)}</p>
              <p className="text-xs text-slate-500">{formatarMoeda(resumo.margemAtual)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] text-slate-400 font-bold uppercase">Variação</p>
              <p className={`text-xl font-bold flex items-center gap-1.5 ${corVariacao(resumo.variacaoPp)}`}>
                {resumo.variacaoPp < 0 ? <TrendingDown size={18} aria-hidden="true" /> : <TrendingUp size={18} aria-hidden="true" />}
                {formatarPp(resumo.variacaoPp)}
              </p>
              <p className="text-xs text-slate-500">
                {moedaComSinal(resumo.variacaoValor)} · {resumo.obras} {resumo.obras === 1 ? "obra" : "obras"}
              </p>
            </div>
          </div>

          {/* celular: lista de cartoes (a tabela nao cabe em 375px) */}
          <div className="md:hidden">
            <div className="px-4 pt-3 flex flex-wrap gap-2 text-xs" role="group" aria-label="Ordenar obras">
              {(
                [
                  ["variacao", "Variação"],
                  ["margemAtual", "Margem atual"],
                  ["codigo", "Código"],
                ] as const
              ).map(([coluna, rotulo]) => (
                <button
                  key={coluna}
                  type="button"
                  onClick={() => alternar(coluna)}
                  aria-pressed={ordem.coluna === coluna}
                  className={`px-2.5 py-1 rounded-lg border font-semibold ${ordem.coluna === coluna ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-600"}`}
                >
                  {rotulo}
                  {ordem.coluna === coluna ? (ordem.direcao === "asc" ? " ▲" : " ▼") : ""}
                </button>
              ))}
            </div>
            <ul className="divide-y">
              {ordenadas.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirObra(l.id)}
                    className="w-full text-left p-4 hover:bg-slate-50 space-y-1.5"
                    title={l.semDado ? TITULO_SEM_DADO[l.semDado] : `Abrir a obra ${nomeObra(l)}`}
                  >
                    <p className="font-semibold text-slate-800 break-words">{nomeObra(l)}</p>
                    {l.semDado ? (
                      <p className="text-xs text-slate-500">— {TITULO_SEM_DADO[l.semDado]}</p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500">
                          Prevista {formatarPct(l.pctPrevista)} ({formatarMoeda(l.margemPrevista)})
                          {!l.baseErp && <span className="text-amber-700 font-bold"> *</span>} → Atual{" "}
                          <span className="font-semibold text-slate-700">
                            {formatarPct(l.pctAtual)} ({formatarMoeda(l.margemAtual)})
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Barra l={l} />
                          <span className={`text-xs font-bold ${corVariacao(l.variacaoPp)}`}>{textoVariacao(l)}</span>
                        </div>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* tela larga: tabela-ranking (rola dentro do cartao se faltar espaco) */}
          <div className="hidden md:block overflow-x-auto max-w-full">
            <table className="w-full text-[13px] min-w-[860px]">
              <caption className="sr-only">Margem prevista e atual por obra</caption>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <Cab rotulo="Obra" coluna="codigo" alinhar="left" />
                  <th className="px-2 py-2 font-semibold text-right">Venda s/ impostos</th>
                  <th className="px-2 py-2 font-semibold text-right">Margem prevista</th>
                  <Cab rotulo="Margem atual" coluna="margemAtual" />
                  <Cab rotulo="Variação" coluna="variacao" />
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t hover:bg-slate-50 cursor-pointer"
                    onClick={() => onAbrirObra(l.id)}
                    title={l.semDado ? TITULO_SEM_DADO[l.semDado] : undefined}
                  >
                    <td className="px-2 py-2.5 text-slate-700 max-w-[280px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirObra(l.id);
                        }}
                        className="text-left font-semibold hover:text-[#2A6377] hover:underline truncate max-w-full block"
                        title={`Abrir a obra ${nomeObra(l)}`}
                      >
                        {nomeObra(l)}
                      </button>
                    </td>
                    {l.semDado ? (
                      <td colSpan={4} className="px-2 py-2.5 text-right text-slate-400" title={TITULO_SEM_DADO[l.semDado]}>
                        —<span className="sr-only"> {TITULO_SEM_DADO[l.semDado]}</span>
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-slate-700" title={tituloBase(l)}>
                          {formatarMoeda(l.base)}
                          {!l.baseErp && <span className="text-amber-700 font-bold"> *</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{formatarPct(l.pctPrevista)}</span>
                          <span className="block text-[11px] text-slate-500">{formatarMoeda(l.margemPrevista)}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{formatarPct(l.pctAtual)}</span>
                          <span className="block text-[11px] text-slate-500">{formatarMoeda(l.margemAtual)}</span>
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Barra l={l} />
                            <span className={`font-bold text-right min-w-[150px] ${corVariacao(l.variacaoPp)}`}>
                              {formatarPp(l.variacaoPp)}
                              <span className="block text-[11px] font-semibold">
                                {moedaComSinal(l.variacaoValor)}
                              </span>
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {linhas.some((l) => !l.semDado && !l.baseErp) && (
            <p className="px-4 py-2 text-[11px] text-slate-400 border-t">
              * Obra sem margem do orçamento no ERP: o % é calculado sobre o valor vendido, como na aba Rentabilidade.
            </p>
          )}
        </>
      )}
    </section>
  );
}
