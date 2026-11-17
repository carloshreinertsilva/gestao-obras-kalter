import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { formatarDataSegura, labelFase, classeStatusCronograma, labelStatusCronograma } from "../../utils";
import { Activity, Calendar, ChartGantt, Plus, RefreshCw, Table2 } from "lucide-react";
import type { CronogramaObra, Obra } from "../../types";
import { supabase } from "../../supabase";
import { Modal } from "../../Modal";
import { CampoNumero } from "../../CampoNumero";
import { useDialogos } from "../../Dialogos";
import { useAviso } from "../../aviso";
import { mensagemErro } from "../../erros";
import { hojeLocalISO } from "../../saudeObra";
import GraficoGantt from "../../GraficoGantt";
import { formatarDataBR, linhaDeFase } from "../../calculoGantt";
import {
  avancoAnterior,
  avancoNaData,
  formatarPercentual,
  montarCurvaAvanco,
  ultimoAvanco,
  validarAvanco,
  valorVendaObra,
  type AvancoLinha,
  type FamiliaEscopoLinha,
  type FaturamentoLinha,
  type ParcelaRecebimentoLinha,
} from "../../calculoAvanco";

const CurvaAvanco = lazy(() => import("../../CurvaAvanco"));

// escolha "Tabela | Gráfico" lembrada no aparelho (so conveniencia: sem acesso ao armazenamento, abre na tabela)
const CHAVE_VISAO = "cronograma_visao";
type Visao = "tabela" | "grafico";
function lerVisao(): Visao {
  try {
    return localStorage.getItem(CHAVE_VISAO) === "grafico" ? "grafico" : "tabela";
  } catch {
    return "tabela";
  }
}
function gravarVisao(v: Visao) {
  try {
    localStorage.setItem(CHAVE_VISAO, v);
  } catch {
    /* sem armazenamento: so nao lembra */
  }
}

// Aba "cronograma" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaCronograma {
  abrirModalCronograma: (fase: any, acao: string) => void;
  cronogramaObra: CronogramaObra[];
  obraEcoSelecionada: Obra;
  podeEditarObraSelecionada: boolean;
  reabrirFaseCronograma: (fase: any) => Promise<void>;
  zerarFaseCronograma: (fase: any) => Promise<void>;
}

export default function AbaCronograma({
  abrirModalCronograma,
  cronogramaObra,
  obraEcoSelecionada,
  podeEditarObraSelecionada,
  reabrirFaseCronograma,
  zerarFaseCronograma,
}: PropsAbaCronograma) {
  const [visao, setVisao] = useState<Visao>(lerVisao);
  const escolherVisao = (v: Visao) => {
    setVisao(v);
    gravarVisao(v);
  };
  const hojeISO = hojeLocalISO();
  // mesmas datas que a tabela mostra: sem data propria, a fase usa o inicio/prazo da obra como sugestao
  const linhasGantt = useMemo(
    () =>
      cronogramaObra.map((fase) =>
        linhaDeFase(
          {
            ...fase,
            inicio_previsto: fase.inicio_previsto || obraEcoSelecionada?.data_inicio,
            fim_previsto: fase.fim_previsto || obraEcoSelecionada?.data_previsao_fim,
          },
          labelFase(fase.fase ?? ""),
          hojeISO,
        ),
      ),
    [cronogramaObra, obraEcoSelecionada?.data_inicio, obraEcoSelecionada?.data_previsao_fim, hojeISO],
  );

  return (
    <div className="space-y-4 max-w-full min-w-0">
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Calendar size={18} className="text-[#2A6377]" /> Cronograma
          Resumo
        </h3>
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs" role="group" aria-label="Forma de ver o cronograma">
          {(
            [
              ["tabela", "Tabela", Table2],
              ["grafico", "Gráfico", ChartGantt],
            ] as const
          ).map(([v, rotulo, Icone]) => (
            <button
              key={v}
              type="button"
              onClick={() => escolherVisao(v)}
              aria-pressed={visao === v}
              className={`px-3 py-1.5 font-semibold inline-flex items-center gap-1.5 ${visao === v ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              <Icone size={14} aria-hidden="true" /> {rotulo}
            </button>
          ))}
        </div>
      </div>
      {visao === "grafico" ? (
        <div className="p-4">
          {linhasGantt.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhuma fase cadastrada.</p>
          ) : (
            <GraficoGantt
              linhas={linhasGantt}
              hojeISO={hojeISO}
              titulo={`Cronograma da obra ${obraEcoSelecionada?.codigo_externo || ""}`.trim()}
            />
          )}
          {podeEditarObraSelecionada && cronogramaObra.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Para editar prazos, iniciar ou finalizar uma fase, use a visão{" "}
              <button type="button" onClick={() => escolherVisao("tabela")} className="font-semibold text-[#2A6377] hover:underline">
                Tabela
              </button>
              .
            </p>
          )}
        </div>
      ) : (
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Fase</th>
              <th className="p-3">Início Previsto</th>
              <th className="p-3">Prazo Entrega</th>
              <th className="p-3">Início Real</th>
              <th className="p-3">Fim Real</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-left">Observação</th>
              {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {cronogramaObra.length === 0 ? (
              <tr>
                <td
                  colSpan={podeEditarObraSelecionada ? 8 : 7}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhuma fase cadastrada.
                </td>
              </tr>
            ) : (
              cronogramaObra.map((fase) => {
                const inicioPrevisto =
                  fase.inicio_previsto ||
                  obraEcoSelecionada?.data_inicio;
                const fimPrevisto =
                  fase.fim_previsto ||
                  obraEcoSelecionada?.data_previsao_fim;
                return (
                  <tr
                    key={fase.id}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold text-[#2A6377]">
                      {labelFase(fase.fase ?? "")}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatarDataSegura(inicioPrevisto)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {formatarDataSegura(fimPrevisto)}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {fase.inicio_real
                        ? formatarDataSegura(fase.inicio_real)
                        : "-"}
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {fase.fim_real
                        ? formatarDataSegura(fase.fim_real)
                        : "-"}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusCronograma(fase.status ?? "")}`}
                      >
                        {labelStatusCronograma(fase.status ?? "")}
                      </span>
                    </td>
                    <td
                      className="p-3 text-slate-600 max-w-[220px] truncate"
                      title={fase.observacao || ""}
                    >
                      {fase.observacao || "-"}
                    </td>
                    {podeEditarObraSelecionada && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              abrirModalCronograma(
                                fase,
                                "editar_previsto",
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-white border text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                          >
                            Editar prazos
                          </button>
                          {fase.status === "nao_iniciado" && (
                            <button
                              onClick={() =>
                                abrirModalCronograma(fase, "iniciar")
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition"
                            >
                              Iniciar
                            </button>
                          )}
                          {fase.status === "em_andamento" && (
                            <>
                              <button
                                onClick={() =>
                                  abrirModalCronograma(
                                    fase,
                                    "finalizar",
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
                              >
                                Finalizar
                              </button>
                              <button
                                onClick={() => zerarFaseCronograma(fase)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition"
                              >
                                Voltar para não iniciado
                              </button>
                            </>
                          )}
                          {fase.status === "concluido" && (
                            <>
                              <button
                                onClick={() =>
                                  reabrirFaseCronograma(fase)
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                              >
                                Reabrir
                              </button>
                              <button
                                onClick={() => zerarFaseCronograma(fase)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-bold hover:bg-red-100 transition"
                              >
                                Zerar
                              </button>
                            </>
                          )}
                          {fase.status === "atrasado" && (
                            <button
                              onClick={() =>
                                abrirModalCronograma(fase, "iniciar")
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition"
                            >
                              Iniciar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}
      <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-500">
        As datas previstas podem ser ajustadas pelo botão Editar
        prazos. Quando a fase ainda não tiver datas próprias, o
        sistema usa o início e o prazo de entrega cadastrados na obra
        como sugestão. As datas reais são registradas pelos botões
        Iniciar e Finalizar, informando data e observação. Se uma fase foi iniciada por engano, use Voltar para não iniciado.
      </div>
    </div>
    {obraEcoSelecionada?.id && (
      <BlocoAvanco key={obraEcoSelecionada.id} obra={obraEcoSelecionada} podeEditar={podeEditarObraSelecionada} />
    )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Avanco fisico (Pacote 4 / B12): o gestor informa o % da obra; a curva compara com o faturado e o recebido.
// Busca os proprios dados pelo id da obra (nada novo vem do App.tsx). Gravacao pela funcao do banco
// obra_avanco_registrar, que confere permissao, 0-100, data nao futura e obra em andamento.

type AvancoTela = AvancoLinha & { id: string; created_at?: string | null; updated_at?: string | null };

interface DadosAvanco {
  avancos: AvancoTela[];
  faturamentos: FaturamentoLinha[];
  familias: FamiliaEscopoLinha[];
  parcelas: ParcelaRecebimentoLinha[];
}

function BlocoAvanco({ obra, podeEditar }: { obra: Obra; podeEditar: boolean }) {
  const { confirmar } = useDialogos();
  const aviso = useAviso();
  const [dados, setDados] = useState<DadosAvanco | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const hojeISO = hojeLocalISO();

  useEffect(() => {
    let cancelado = false;
    setErro(false);
    const sb = supabase as any; // obra_avancos ainda nao esta nos tipos gerados
    Promise.all([
      sb
        .from("obra_avancos")
        .select("id, data_referencia, percentual, observacao, created_at, updated_at, usuario:usuarios(nome)")
        .eq("id_obra", obra.id)
        .order("data_referencia", { ascending: true }),
      sb.from("obra_faturamento_realizados").select("data_faturamento, valor_realizado").eq("id_obra", obra.id),
      sb.from("obra_faturamento_familias").select("valor_total_escopo").eq("id_obra", obra.id),
      // parcelas: so quem gerencia a obra (ou financeiro) enxerga; sem linhas, a curva de recebido nao aparece
      sb.from("parcelas_cliente").select("data_prevista, data_realizada, valor_previsto, valor_realizado, status").eq("id_obra", obra.id),
    ])
      .then((res: any[]) => {
        const falha = res.find((r) => r.error);
        if (falha) throw falha.error;
        if (cancelado) return;
        setDados({
          avancos: (res[0].data || []).map((a: any) => ({ ...a, nome_usuario: a.usuario?.nome ?? null })),
          faturamentos: res[1].data || [],
          familias: res[2].data || [],
          parcelas: res[3].data || [],
        });
      })
      .catch((e: unknown) => {
        console.error("Avanço físico:", e);
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
  }, [obra.id, tentativa]);

  const curva = useMemo(
    () =>
      dados
        ? montarCurvaAvanco({
            ...dados,
            valorVenda: valorVendaObra(obra, dados.parcelas),
            hojeISO,
          })
        : null,
    [dados, obra, hojeISO],
  );
  const ultimo = dados ? ultimoAvanco(dados.avancos) : null;
  const emAndamento = obra.status === "em_andamento";

  const salvar = useCallback(
    async (texto: string, data: string, observacao: string): Promise<boolean> => {
      const lido = validarAvanco(texto, data, hojeISO);
      if (lido.erro !== null) {
        aviso.erro(lido.erro);
        return false;
      }
      const anterior = avancoAnterior(dados?.avancos || [], data);
      if (anterior && lido.percentual < Number(anterior.percentual)) {
        const ok = await confirmar({
          titulo: "O avanço caiu?",
          texto:
            `O avanço anterior foi ${formatarPercentual(anterior.percentual)} em ${formatarDataBR(anterior.data_referencia)}.\n` +
            `Você está informando ${formatarPercentual(lido.percentual)}. Confirma o valor menor?`,
          rotuloConfirmar: "Gravar mesmo assim",
          rotuloCancelar: "Revisar",
        });
        if (!ok) return false;
      }
      const { error } = await (supabase as any).rpc("obra_avanco_registrar", {
        p_id_obra: obra.id,
        p_percentual: lido.percentual,
        p_data: data,
        p_observacao: observacao.trim() || null,
      });
      if (error) {
        aviso.erro(mensagemErro(error, "Não foi possível gravar o avanço."));
        return false;
      }
      aviso.sucesso(`Avanço de ${formatarPercentual(lido.percentual)} gravado para ${formatarDataBR(data)}.`);
      setTentativa((t) => t + 1);
      return true;
    },
    [aviso, confirmar, dados, hojeISO, obra.id],
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 max-w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Activity size={18} className="text-[#2A6377]" aria-hidden="true" /> Avanço físico
          </h3>
          {dados && (
            <p className="text-sm text-slate-600 mt-1">
              {ultimo ? (
                <>
                  Último informado: <strong className="text-slate-800">{formatarPercentual(ultimo.percentual)}</strong> em{" "}
                  {formatarDataBR(ultimo.data_referencia)}
                  {ultimo.nome_usuario ? ` por ${ultimo.nome_usuario}` : ""}
                </>
              ) : (
                "Nenhum avanço informado ainda."
              )}
            </p>
          )}
        </div>
        {podeEditar && emAndamento && (
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            disabled={!dados}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A6377] text-white text-sm font-bold hover:bg-[#1f4b5a] transition disabled:opacity-50"
          >
            <Plus size={16} aria-hidden="true" /> Informar avanço
          </button>
        )}
      </div>

      {erro ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
          <span>Não foi possível carregar o avanço da obra.</span>
          <button
            type="button"
            onClick={() => setTentativa((t) => t + 1)}
            className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
          >
            <RefreshCw size={14} aria-hidden="true" /> Tentar de novo
          </button>
        </div>
      ) : !dados || !curva ? (
        <div aria-busy="true">
          <span className="sr-only">Carregando o avanço...</span>
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          {!curva.temFisico && (
            <p className="text-sm text-[#2A6377] bg-[#2A6377]/5 border border-[#2A6377]/20 rounded-lg px-3 py-2 mb-3">
              Informe o avanço físico para comparar com o faturado e o recebido.
            </p>
          )}
          {curva.pontos.length === 0 ? (
            <p className="text-sm text-slate-500">Ainda não há faturamento, recebimento nem avanço informado nesta obra.</p>
          ) : (
            <Suspense fallback={<div className="h-64 bg-slate-100 rounded-lg animate-pulse" />}>
              <CurvaAvanco curva={curva} />
            </Suspense>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Faturado: notas fiscais emitidas sobre o escopo total da obra. Recebido: parcelas recebidas do cliente (pela data
            do recebimento) sobre o valor de venda. Avanço físico: percentual informado pelo gestor, válido até o próximo.
          </p>

          {dados.avancos.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setVerHistorico((v) => !v)}
                aria-expanded={verHistorico}
                className="text-xs font-semibold text-[#2A6377] hover:underline"
              >
                {verHistorico ? "Esconder histórico" : `Ver histórico (${dados.avancos.length})`}
              </button>
              {verHistorico && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Histórico do avanço físico informado</caption>
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                        <th scope="col" className="py-2 pr-2 font-semibold">Data</th>
                        <th scope="col" className="py-2 px-2 font-semibold text-right">Avanço</th>
                        <th scope="col" className="py-2 px-2 font-semibold">Informado por</th>
                        <th scope="col" className="py-2 pl-2 font-semibold">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...dados.avancos].reverse().map((a) => (
                        <tr key={a.id} className="border-b border-slate-100">
                          <td className="py-2 pr-2 whitespace-nowrap">{formatarDataBR(a.data_referencia)}</td>
                          <td className="py-2 px-2 text-right font-semibold whitespace-nowrap">{formatarPercentual(a.percentual)}</td>
                          <td className="py-2 px-2 text-slate-600">{a.nome_usuario || "—"}</td>
                          <td className="py-2 pl-2 text-slate-600 max-w-[240px] truncate" title={a.observacao || ""}>
                            {a.observacao || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {podeEditar && !emAndamento && (
            <p className="text-xs text-slate-500 mt-2">O avanço só pode ser informado em obra em andamento.</p>
          )}
        </>
      )}

      {modalAberto && dados && (
        <ModalAvanco
          avancos={dados.avancos}
          hojeISO={hojeISO}
          onFechar={() => setModalAberto(false)}
          onSalvar={async (texto, data, obs) => {
            if (await salvar(texto, data, obs)) setModalAberto(false);
          }}
        />
      )}
    </div>
  );
}

function ModalAvanco({
  avancos,
  hojeISO,
  onFechar,
  onSalvar,
}: {
  avancos: AvancoTela[];
  hojeISO: string;
  onFechar: () => void;
  onSalvar: (texto: string, data: string, observacao: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [data, setData] = useState(hojeISO);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const mesmaData = avancoNaData(avancos, data);
  const anterior = avancoAnterior(avancos, data);
  const lido = texto.trim() ? validarAvanco(texto, data, hojeISO) : null;

  const enviar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      await onSalvar(texto, data, obs);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      titulo="Informar avanço físico"
      subtitulo="Percentual da obra concluído até a data de referência."
      onFechar={onFechar}
      largura="md"
      sujo={Boolean(texto.trim() || obs.trim())}
      rodape={
        <>
          <button
            type="button"
            onClick={onFechar}
            className="px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={salvando || !texto.trim()}
            className="px-4 py-2.5 md:py-2 rounded-lg text-sm font-bold text-white bg-[#2A6377] hover:bg-[#1f4b5a] transition disabled:opacity-50"
          >
            {salvando ? "Gravando..." : "Gravar avanço"}
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <div>
          <label htmlFor="avanco-percentual" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Avanço (%)
          </label>
          <CampoNumero
            id="avanco-percentual"
            valor={texto}
            onChange={setTexto}
            casas={0}
            casasMax={2}
            medida
            placeholder="Ex.: 45"
            aria-describedby="avanco-ajuda"
            aria-invalid={lido?.erro ? true : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6377]/40 focus:border-[#2A6377]"
          />
          <p id="avanco-ajuda" className="text-xs text-slate-500 mt-1">
            {anterior
              ? `Anterior: ${formatarPercentual(anterior.percentual)} em ${formatarDataBR(anterior.data_referencia)}.`
              : "Primeiro avanço antes desta data."}
          </p>
          {lido?.erro && <p className="text-xs text-red-600 mt-1">{lido.erro}</p>}
        </div>
        <div>
          <label htmlFor="avanco-data" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Data de referência
          </label>
          <input
            id="avanco-data"
            type="date"
            value={data}
            max={hojeISO}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6377]/40 focus:border-[#2A6377]"
          />
          {mesmaData && (
            <p className="text-xs text-amber-700 mt-1">
              Já há um avanço de {formatarPercentual(mesmaData.percentual)} nesta data: ao gravar, ele será substituído.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="avanco-obs" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Observação (opcional)
          </label>
          <textarea
            id="avanco-obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            placeholder="Ex.: medição com o cliente"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6377]/40 focus:border-[#2A6377]"
          />
        </div>
      </form>
    </Modal>
  );
}
