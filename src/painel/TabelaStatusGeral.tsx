import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import { fasesProjeto } from "../constants";
import { formatarDataSegura, formatarMoeda, labelFase } from "../utils";
import { linhaClicavel } from "../teclado";
import { AREAS_SAUDE, EXPLICACAO_SAUDE, ROTULO_SAUDE, prazoEntrega, type AreaSaude, type NivelArea } from "../saudeObra";
import {
  FILTROS_VAZIOS,
  ROTULO_ORDEM,
  alternarOrdem,
  filtrarLinhas,
  filtrosAtivos,
  lerPreferencias,
  montarCsv,
  nomeArquivoCsv,
  opcoesFase,
  opcoesGestor,
  ordenarLinhas,
  sanearFiltros,
  sentidoInicial,
  type ChaveOrdem,
  type Filtros,
  type LinhaStatus,
  type Ordenacao,
} from "./calculoStatusGeral";

// Cartao "Status Geral dos Projetos" do Painel: tabela no computador, lista de cartoes no celular.
// Ordem e filtros sao so desta tabela (os numeros do topo do Painel continuam da carteira inteira) e
// ficam guardados na sessao para o Painel recarregar sem perder o que o usuario escolheu.
interface Props {
  linhas: LinhaStatus[];
  carregando: boolean;
  falhou: boolean;
  // engenheiro so ve as proprias obras: filtrar por gestor nao faria sentido
  mostrarGestor: boolean;
  hojeLocal: string;
  onAbrir: (idObra: string) => void;
}

const CHAVE_SESSAO = "painel.statusGeral.v1";
const ORDEM_FASES = fasesProjeto.map((f) => f.valor);

function carregarPreferencias() {
  try {
    return lerPreferencias(sessionStorage.getItem(CHAVE_SESSAO));
  } catch {
    return lerPreferencias(null);
  }
}

const estiloGeral = (status: string | null) => {
  const mapa: Record<string, string> = {
    em_dia: "bg-green-100 text-green-700 border-green-200",
    atencao: "bg-amber-100 text-amber-700 border-amber-200",
    critico: "bg-red-100 text-red-700 border-red-200",
  };
  return mapa[status || ""] || "bg-slate-100 text-slate-600 border-slate-200";
};
const rotuloGeral = (status: string | null) => (ROTULO_SAUDE as Record<string, string>)[status || ""] || "Sem dados";

const corBolinha = (nivel: string) =>
  ({ verde: "bg-green-500", amarelo: "bg-amber-400", vermelho: "bg-red-500" })[nivel as NivelArea] || "bg-slate-300";

const textoNivel = (area: AreaSaude, nivel: NivelArea | "") => {
  if (!nivel) return "Sem dados";
  if (nivel === "verde") return "Em dia";
  if (area === "alertas") return nivel === "vermelho" ? "Alerta crítico aberto" : "Alerta aberto";
  if (area === "financeiro") return "Parcela vencida";
  return nivel === "vermelho" ? "Item vencido" : "Vence em até 7 dias";
};

// saude por area: bolinha colorida (resumo); o texto fica no title e para leitor de tela
function SeloSaude({ status, area, campo, comRotulo }: { status: NivelArea | ""; area: string; campo: AreaSaude; comRotulo?: boolean }) {
  const texto = textoNivel(campo, status);
  return (
    <span className="inline-flex items-center gap-1.5" title={`${area}: ${texto}`}>
      <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${corBolinha(status)}`} aria-hidden="true" />
      {comRotulo ? (
        <span className="text-xs text-slate-600">{area}</span>
      ) : (
        <span className="sr-only">
          {area}: {texto}
        </span>
      )}
      {comRotulo && <span className="sr-only">: {texto}</span>}
    </span>
  );
}

function baixarCsv(conteudo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const campoCls =
  "h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]";

export default function TabelaStatusGeral({ linhas, carregando, falhou, mostrarGestor, hojeLocal, onAbrir }: Props) {
  const [inicial] = useState(carregarPreferencias);
  const [ordem, setOrdem] = useState<Ordenacao>(inicial.ordem);
  const [filtrosBrutos, setFiltros] = useState<Filtros>(inicial.filtros);

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ ordem, filtros: filtrosBrutos }));
    } catch {
      // sem sessionStorage (modo privado etc.): a escolha so vale ate sair da tela
    }
  }, [ordem, filtrosBrutos]);

  const filtros = useMemo(() => sanearFiltros(filtrosBrutos, linhas, mostrarGestor), [filtrosBrutos, linhas, mostrarGestor]);
  const gestores = useMemo(() => opcoesGestor(linhas), [linhas]);
  const fases = useMemo(() => opcoesFase(linhas, ORDEM_FASES), [linhas]);
  const visiveis = useMemo(
    () => ordenarLinhas(filtrarLinhas(linhas, filtros, hojeLocal), ordem, ORDEM_FASES),
    [linhas, filtros, ordem, hojeLocal],
  );

  const comFiltro = filtrosAtivos(filtros);
  const semObras = !carregando && !falhou && linhas.length === 0;
  const semResultado = !carregando && !falhou && linhas.length > 0 && visiveis.length === 0;
  const limpar = () => setFiltros({ ...FILTROS_VAZIOS });
  const mudar = (parte: Partial<Filtros>) => setFiltros({ ...filtros, ...parte });

  const exportar = () => {
    try {
      baixarCsv(montarCsv(visiveis, { hojeISO: hojeLocal, labelFase }), nomeArquivoCsv(hojeLocal));
    } catch (err) {
      console.error("exportar status das obras", err);
    }
  };

  const cabecalhoOrdenavel = (chave: ChaveOrdem, texto: string, alinhamento: "left" | "center" | "right", titulo?: string) => {
    const ativa = ordem.chave === chave;
    const Seta = !ativa ? ArrowUpDown : ordem.sentido === "asc" ? ArrowUp : ArrowDown;
    const justify = alinhamento === "left" ? "justify-start" : alinhamento === "right" ? "justify-end" : "justify-center";
    return (
      <th
        className={`px-4 py-3 text-${alinhamento}`}
        title={titulo}
        aria-sort={ativa ? (ordem.sentido === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => setOrdem(alternarOrdem(ordem, chave))}
          className={`inline-flex w-full items-center gap-1 uppercase hover:text-[#2A6377] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377] rounded ${justify} ${ativa ? "text-[#2A6377] font-bold" : ""}`}
        >
          {texto}
          <Seta size={12} aria-hidden="true" className={ativa ? "" : "opacity-40"} />
        </button>
      </th>
    );
  };

  const textoEntrega = (l: LinhaStatus) => {
    const prazo = prazoEntrega(l.dataEntrega, hojeLocal);
    return { prazo, data: prazo ? formatarDataSegura(l.dataEntrega) : "" };
  };

  const mensagemVazia = carregando
    ? "Carregando..."
    : falhou
      ? "Não foi possível carregar."
      : semObras
        ? "Nenhuma obra ativa encontrada."
        : "";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity size={20} className="text-[#2A6377]" /> Status Geral dos Projetos
        </h3>
        <div className="text-xs text-slate-500 md:text-right">
          <p>Toque (ou Enter) em uma obra para abrir o painel da obra.</p>
          <details className="mt-1">
            <summary className="cursor-pointer text-[#2A6377] font-semibold">Como é calculado?</summary>
            <p className="mt-1 max-w-md text-left">{EXPLICACAO_SAUDE}</p>
          </details>
        </div>
      </div>

      {/* filtros: uma linha no computador, quebra no celular */}
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={filtrosBrutos.busca}
            onChange={(e) => setFiltros({ ...filtrosBrutos, busca: e.target.value })}
            placeholder="Buscar código ou nome"
            aria-label="Buscar obra por código ou nome"
            className={`${campoCls} w-full pl-8`}
          />
        </div>
        {mostrarGestor && (
          <select
            value={filtros.gestor}
            onChange={(e) => mudar({ gestor: e.target.value })}
            aria-label="Filtrar por gestor"
            className={`${campoCls} max-w-full`}
          >
            <option value="">Todos os gestores</option>
            {gestores.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
        <select
          value={filtros.fase}
          onChange={(e) => mudar({ fase: e.target.value })}
          aria-label="Filtrar por fase"
          className={`${campoCls} max-w-full`}
        >
          <option value="">Todas as fases</option>
          {fases.map((f) => (
            <option key={f} value={f}>
              {labelFase(f)}
            </option>
          ))}
        </select>
        <select
          value={filtros.saude}
          onChange={(e) => mudar({ saude: e.target.value as Filtros["saude"] })}
          aria-label="Filtrar por situação geral"
          className={`${campoCls} max-w-full`}
        >
          <option value="">Toda situação</option>
          <option value="critico">{ROTULO_SAUDE.critico}</option>
          <option value="atencao">{ROTULO_SAUDE.atencao}</option>
          <option value="em_dia">{ROTULO_SAUDE.em_dia}</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 h-9 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.soAtrasadas}
            onChange={(e) => mudar({ soAtrasadas: e.target.checked })}
            className="h-4 w-4 accent-[#2A6377]"
          />
          Só atrasadas na entrega
        </label>
        {/* ordenar no celular (no computador se ordena pelo cabecalho da tabela) */}
        <div className="flex w-full items-center gap-2 md:hidden">
          <label className="text-sm text-slate-600 shrink-0" htmlFor="ordenar-status-obras">
            Ordenar por
          </label>
          <select
            id="ordenar-status-obras"
            value={ordem.chave}
            onChange={(e) => setOrdem({ chave: e.target.value as ChaveOrdem, sentido: sentidoInicial(e.target.value as ChaveOrdem) })}
            className={`${campoCls} min-w-0 flex-1`}
          >
            {(Object.keys(ROTULO_ORDEM) as ChaveOrdem[]).map((k) => (
              <option key={k} value={k}>
                {ROTULO_ORDEM[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOrdem({ chave: ordem.chave, sentido: ordem.sentido === "asc" ? "desc" : "asc" })}
            className={`${campoCls} inline-flex items-center gap-1 shrink-0 font-semibold hover:border-[#2A6377]`}
            aria-label={`Inverter a ordem (agora ${ordem.sentido === "asc" ? "crescente" : "decrescente"})`}
          >
            {ordem.sentido === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
            {ordem.sentido === "asc" ? "Crescente" : "Decrescente"}
          </button>
        </div>
      </div>

      <div className="px-5 py-2 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span aria-live="polite" className="font-semibold text-slate-600">
          {carregando || falhou ? "" : `${visiveis.length} de ${linhas.length} ${linhas.length === 1 ? "obra" : "obras"}`}
        </span>
        {comFiltro && (
          <button type="button" onClick={limpar} className="font-semibold text-[#2A6377] hover:underline">
            Limpar filtros
          </button>
        )}
        <span className="flex-1 min-w-[12rem]">Filtros e ordem valem só para esta tabela; os números do topo são da carteira inteira.</span>
        <button
          type="button"
          onClick={exportar}
          disabled={carregando || falhou || visiveis.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#2A6377] hover:text-[#2A6377] transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Baixa as obras que estão na tabela, na ordem atual, em um arquivo para abrir no Excel"
        >
          <Download size={14} aria-hidden="true" /> Exportar (Excel)
        </button>
      </div>

      {/* computador: tabela */}
      <div className="hidden md:block overflow-x-auto max-w-full">
        <table className="w-full text-sm min-w-[940px] [&_th]:px-2 [&_td]:px-2 2xl:[&_th]:px-4 2xl:[&_td]:px-4">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              {cabecalhoOrdenavel("codigo", "Obra", "left")}
              {cabecalhoOrdenavel("fase", "Fase", "left")}
              {cabecalhoOrdenavel("entrega", "Entrega", "left")}
              {AREAS_SAUDE.map((a) => (
                <th key={a.campo} className="px-4 py-3 text-center">
                  {a.nome}
                </th>
              ))}
              {cabecalhoOrdenavel("geral", "Geral", "center", `${EXPLICACAO_SAUDE} Ordena da situação mais grave para a menos grave.`)}
              {cabecalhoOrdenavel("faturar", "A faturar", "right", "Escopo de faturamento − NFs já emitidas")}
              {cabecalhoOrdenavel("receber", "A receber", "right", "Valor de venda − recebido do cliente (NF emitida e não paga continua aqui)")}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mensagemVazia || semResultado ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                  {semResultado ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>Nenhuma obra com esses filtros.</span>
                      <button type="button" onClick={limpar} className="font-semibold text-[#2A6377] hover:underline">
                        Limpar filtros
                      </button>
                    </div>
                  ) : (
                    mensagemVazia
                  )}
                </td>
              </tr>
            ) : (
              visiveis.map((projeto) => {
                const { prazo, data } = textoEntrega(projeto);
                return (
                  <tr
                    key={projeto.id}
                    {...linhaClicavel(() => onAbrir(projeto.id))}
                    aria-label={`Abrir obra ${projeto.codigo} - ${projeto.nome}`}
                    className="hover:bg-slate-50 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2A6377]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#2A6377]">
                        {projeto.codigo} - {projeto.nome}
                      </p>
                      <p className="text-xs text-slate-500">Resp.: {projeto.responsavel}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{labelFase(String(projeto.fase ?? ""))}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {!prazo ? (
                        <span className="text-slate-500">Sem data</span>
                      ) : (
                        <>
                          <p className="text-slate-700">{data}</p>
                          <p className={`text-xs ${prazo.atrasada ? "text-red-700 font-bold" : "text-slate-500"}`}>{prazo.texto}</p>
                        </>
                      )}
                    </td>
                    {AREAS_SAUDE.map((a) => (
                      <td key={a.campo} className="px-4 py-3 text-center">
                        <SeloSaude status={projeto.areas?.[a.campo] || ""} area={a.nome} campo={a.campo} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${estiloGeral(projeto.statusGeral)}`}>
                        {rotuloGeral(projeto.statusGeral)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700 whitespace-nowrap">
                      {projeto.saldoFaturar === null ? (
                        <span className="font-normal text-slate-500" title="Escopo de faturamento não cadastrado">
                          —
                        </span>
                      ) : (
                        formatarMoeda(projeto.saldoFaturar)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700 whitespace-nowrap">{formatarMoeda(projeto.saldoReceber)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* celular: um cartao por obra */}
      <div className="md:hidden p-3 grid gap-3">
        {mensagemVazia || semResultado ? (
          <div className="px-4 py-8 text-center text-slate-500 flex flex-col items-center gap-2">
            {semResultado ? (
              <>
                <span>Nenhuma obra com esses filtros.</span>
                <button type="button" onClick={limpar} className="font-semibold text-[#2A6377] hover:underline">
                  Limpar filtros
                </button>
              </>
            ) : (
              mensagemVazia
            )}
          </div>
        ) : (
          visiveis.map((projeto) => {
            const { prazo, data } = textoEntrega(projeto);
            return (
              <button
                type="button"
                key={projeto.id}
                onClick={() => onAbrir(projeto.id)}
                aria-label={`Abrir obra ${projeto.codigo} - ${projeto.nome}`}
                className="w-full text-left border rounded-xl p-4 hover:border-[#2A6377] hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[#2A6377] text-sm break-words min-w-0">
                    {projeto.codigo} - {projeto.nome}
                  </p>
                  <span className={`shrink-0 px-2 py-1 rounded-full border text-[11px] font-bold ${estiloGeral(projeto.statusGeral)}`}>
                    {rotuloGeral(projeto.statusGeral)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Resp.: {projeto.responsavel} · {labelFase(String(projeto.fase ?? ""))}
                </p>
                <p className="text-xs mt-1">
                  <span className="text-slate-500">Entrega: </span>
                  {!prazo ? (
                    <span className="text-slate-500">sem data</span>
                  ) : (
                    <>
                      <span className="text-slate-700">{data}</span>{" "}
                      <span className={prazo.atrasada ? "text-red-700 font-bold" : "text-slate-500"}>({prazo.texto})</span>
                    </>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {AREAS_SAUDE.map((a) => (
                    <SeloSaude key={a.campo} status={projeto.areas?.[a.campo] || ""} area={a.nome} campo={a.campo} comRotulo />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <p className="text-slate-500">A faturar</p>
                    <p className="font-bold text-slate-700">
                      {projeto.saldoFaturar === null ? "—" : formatarMoeda(projeto.saldoFaturar)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">A receber</p>
                    <p className="font-bold text-slate-700">{formatarMoeda(projeto.saldoReceber)}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
