import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../supabase";
import { fasesProjeto } from "../constants";
import ValorAjustavel from "../ValorAjustavel";
import { formatarDataSegura, formatarDataHora, formatarMoeda, dataHojeISO, labelFase, isAtrasada } from "../utils";
import { Briefcase, CheckSquare, AlertCircle, Clock, AlertTriangle, CheckCircle2, FolderOpen, Activity, DollarSign, CalendarClock, RefreshCw } from "lucide-react";
import type { Usuario } from "../types";
import TabelaStatusGeral from "../painel/TabelaStatusGeral";
import { ROTULO_SAUDE, avaliarSaude, hojeLocalISO, prazoEntrega } from "../saudeObra";
import { anexarValoresVenda, buscarValoresVenda, somarCarteira, totalVendaObra, TITULO_SEM_ACESSO_VALOR } from "../valoresObra";

const GraficoObrasPorFase = lazy(() => import("./GraficoObrasPorFase"));
// cartoes da carteira (Pacote 2): cada um busca os proprios dados para as obras que o Painel ja listou
const MargemCarteira = lazy(() => import("../painel/MargemCarteira"));
const PrevisaoMensal = lazy(() => import("../painel/PrevisaoMensal"));
const GanttCarteira = lazy(() => import("../painel/GanttCarteira"));
const ComprasAtrasadas = lazy(() => import("../painel/ComprasAtrasadas"));

// Painel: visao geral das obras do usuario (admin ve todas), saude de cada obra,
// projetos criticos, minhas tarefas e ultimas anotacoes do diario.
// Quem nao e admin/coordenador ve "Minhas Tarefas Criticas" antes dos numeros financeiros.
interface Props {
  usuarioAtual: Usuario | null;
  isAdmin: boolean;
  tarefasDashboard: any[];
  noEscopoDoUsuario: (query: any) => any;
  falhaAoCarregar: (oque: string, error: unknown) => void;
  onAbrirObra: (obra: any) => void;
  onAbrirTarefa: (tarefa: any) => void;
  onIrPara: (tela: string) => void;
}

export default function TelaDashboard({
  usuarioAtual,
  isAdmin,
  tarefasDashboard,
  noEscopoDoUsuario,
  falhaAoCarregar,
  onAbrirObra,
  onAbrirTarefa,
  onIrPara,
}: Props) {
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [feedGlobal, setFeedGlobal] = useState<any[]>([]);
  const [resumoPMIS, setResumoPMIS] = useState<any>({
    obrasAtivas: 0,
    carteiraTotal: 0,
    // obras sem acesso ao valor de venda ficam fora da carteira e do saldo a receber
    carteiraObrasSemValor: 0,
    recebidoTotal: 0,
    saldoReceber: 0,
    valorVencido: 0,
    documentosPendentes: 0,
    fasesAtrasadas: 0,
    tarefasAtrasadas: 0,
    tarefasHoje: 0,
  });
  const [statusProjetosPMIS, setStatusProjetosPMIS] = useState<any[]>([]);
  const [projetosCriticosPMIS, setProjetosCriticosPMIS] = useState<any[]>([]);
  const [fasesSemana, setFasesSemana] = useState<any[]>([]);
  const [semSaude, setSemSaude] = useState(false);
  // ate a primeira resposta nao mostra zeros como se fossem dado real; "tentativa" refaz a carga
  const [estadoCarga, setEstadoCarga] = useState<"carregando" | "erro" | "ok">("carregando");
  const [tentativa, setTentativa] = useState(0);
  const carregando = estadoCarga === "carregando";
  const falhou = estadoCarga === "erro";

  // statusGeral: critico / atencao / em_dia (saudeObra.ts); null = indicadores nao vieram
  const estiloStatusPMIS = (status: string | null) => {
    const mapa: any = {
      em_dia: "bg-green-100 text-green-700 border-green-200",
      atencao: "bg-amber-100 text-amber-700 border-amber-200",
      critico: "bg-red-100 text-red-700 border-red-200",
    };
    return mapa[status || ""] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const labelStatusPMIS = (status: string | null) =>
    (ROTULO_SAUDE as Record<string, string>)[status || ""] || "Sem dados";

  // lista estavel para os cartoes da carteira (so muda quando o Painel recarrega)
  const obrasCarteira = useMemo(
    () =>
      statusProjetosPMIS
        .filter((p: any) => p.obraOriginal)
        .map((p: any) => ({ id: String(p.id), codigo: String(p.codigo ?? ""), nome: String(p.nome ?? "") })),
    [statusProjetosPMIS],
  );
  const abrirObraPorId = (idObra: string) => {
    const p = statusProjetosPMIS.find((x: any) => x.id === idObra);
    if (p?.obraOriginal) onAbrirObra(p.obraOriginal);
  };

  const abrirProjetoDashboard = (projeto: any) => {
    if (projeto?.obraOriginal) onAbrirObra(projeto.obraOriginal);
  };

  useEffect(() => {
    async function buscarDadosDashboard() {
      if (!usuarioAtual) return;
      setEstadoCarga("carregando");
      try {
        const hoje = dataHojeISO();
        const isDocumentoEntregaTecnica = (item: any) =>
          String(item || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes("termo de entrega tecnica");

        let queryObras = supabase
          .from("obras")
          .select(
            "id, codigo_externo, nome, fase_atual, data_previsao_fim, id_responsavel, usuarios(nome)",
          )
          .eq("status", "em_andamento")
          .order("created_at", { ascending: false });

        queryObras = noEscopoDoUsuario(queryObras);

        const { data: obrasDashboard, error: obrasErro } = await queryObras;
        if (obrasErro) throw obrasErro;

        // valor de venda vem da tabela restrita (anexado abaixo); sem acesso fica null
        let obras: any[] = obrasDashboard || [];
        const idsObras = obras.map((o: any) => o.id);

        let parcelasData: any[] = [];
        let documentosData: any[] = [];
        let cronogramaData: any[] = [];
        let tarefasData: any[] = [];
        let escopoData: any[] = [];
        let faturadoData: any[] = [];
        // indicadores de saude por obra (mesma funcao de Minhas Obras); null = nao vieram
        let saudePorObra: Record<string, any> | null = {};

        if (idsObras.length > 0) {
          const [parcelasResp, documentosResp, cronogramaResp, tarefasResp, escopoResp, faturadoResp, saudeResp, valoresVenda] =
            await Promise.all([
              supabase
                .from("parcelas_cliente")
                .select(
                  "id_obra, data_prevista, valor_previsto, valor_realizado",
                )
                .in("id_obra", idsObras),
              supabase
                .from("documentos_projeto")
                .select("id_obra, item, status")
                .in("id_obra", idsObras),
              supabase
                .from("cronograma_obra")
                .select(
                  "id_obra, fase, status, inicio_previsto, fim_previsto, inicio_real, fim_real",
                )
                .in("id_obra", idsObras),
              supabase
                .from("tarefas")
                .select(
                  "id, id_obra, titulo, status, data_vencimento, id_responsavel, obras(codigo_externo, nome)",
                )
                .in("id_obra", idsObras)
                .not("status", "in", "(concluida,cancelada)"),
              // escopo de faturamento x NFs emitidas - mesma conta do "Saldo a faturar" do painel da obra
              supabase
                .from("obra_faturamento_familias")
                .select("id_obra, valor_total_escopo")
                .in("id_obra", idsObras),
              supabase
                .from("obra_faturamento_realizados")
                .select("id_obra, valor_realizado")
                .in("id_obra", idsObras)
                .not("id_obra_faturamento_familia", "is", null),
              (supabase as any).rpc("obras_saude", { p_ids: idsObras }),
              buscarValoresVenda(idsObras),
            ]);
          obras = anexarValoresVenda(obras, valoresVenda);

          // sem os indicadores o resto do painel ainda serve: a saude fica "Sem dados"
          if (saudeResp.error) {
            console.error("obras_saude", saudeResp.error);
            saudePorObra = null;
          } else {
            saudePorObra = Object.fromEntries((saudeResp.data || []).map((r: any) => [r.id_obra, r]));
          }

          if (parcelasResp.error) throw parcelasResp.error;
          if (escopoResp.error) throw escopoResp.error;
          if (faturadoResp.error) throw faturadoResp.error;
          escopoData = escopoResp.data || [];
          faturadoData = faturadoResp.data || [];
          if (documentosResp.error) throw documentosResp.error;
          if (cronogramaResp.error) throw cronogramaResp.error;
          if (tarefasResp.error) throw tarefasResp.error;

          parcelasData = parcelasResp.data || [];
          documentosData = documentosResp.data || [];
          cronogramaData = cronogramaResp.data || [];
          tarefasData = tarefasResp.data || [];
        }

        const carteira = somarCarteira(obras);
        const carteiraTotal = carteira.total;
        const recebidoTotal = parcelasData.reduce(
          (acc: number, parcela: any) =>
            acc + Number(parcela.valor_realizado || 0),
          0,
        );
        // saldo a receber so das obras com valor de venda visivel (sem acesso = fora da conta)
        const idsSemValor = new Set(obras.filter((o: any) => totalVendaObra(o) === null).map((o: any) => o.id));
        const recebidoComValor = carteira.parcial
          ? parcelasData
              .filter((p: any) => !idsSemValor.has(p.id_obra))
              .reduce((acc: number, p: any) => acc + Number(p.valor_realizado || 0), 0)
          : recebidoTotal;
        const valorVencido = parcelasData.reduce(
          (acc: number, parcela: any) => {
            const previsto = Number(parcela.valor_previsto || 0);
            const recebido = Number(parcela.valor_realizado || 0);
            const saldo = Math.max(previsto - recebido, 0);
            if (
              saldo > 0 &&
              parcela.data_prevista &&
              parcela.data_prevista < hoje
            )
              return acc + saldo;
            return acc;
          },
          0,
        );

        const documentosPendentes = documentosData.filter(
          (doc: any) =>
            !isDocumentoEntregaTecnica(doc.item) &&
            doc.status !== "concluido" &&
            doc.status !== "nao_aplicavel",
        ).length;
        const fasesAtrasadas = cronogramaData.filter(
          (fase: any) =>
            fase.status !== "concluido" &&
            fase.status !== "cancelado" &&
            fase.fim_previsto &&
            fase.fim_previsto < hoje,
        ).length;
        const tarefasAtrasadas = tarefasData.filter(
          (tarefa: any) =>
            tarefa.status !== "concluida" &&
            tarefa.data_vencimento &&
            String(tarefa.data_vencimento).split("T")[0] < hoje,
        ).length;
        const tarefasHoje = tarefasData.filter(
          (tarefa: any) =>
            tarefa.status !== "concluida" &&
            tarefa.data_vencimento &&
            String(tarefa.data_vencimento).split("T")[0] === hoje,
        ).length;
        setResumoPMIS({
          obrasAtivas: obras.length,
          carteiraTotal,
          carteiraObrasSemValor: carteira.semAcesso,
          recebidoTotal,
          saldoReceber: Math.max(carteiraTotal - recebidoComValor, 0),
          valorVencido,
          documentosPendentes,
          fasesAtrasadas,
          tarefasAtrasadas,
          tarefasHoje,
        });

        const fasesProximasTodas: any[] = [];
        const projetos = obras.map((obra: any) => {
          const parcelasObra = parcelasData.filter(
            (p: any) => p.id_obra === obra.id,
          );
          const documentosObra = documentosData.filter(
            (d: any) => d.id_obra === obra.id,
          );
          const cronogramaObraDashboard = cronogramaData.filter(
            (c: any) => c.id_obra === obra.id,
          );
          const tarefasObra = tarefasData.filter(
            (t: any) => t.id_obra === obra.id,
          );
          // null = sem acesso ao valor de venda desta obra
          const totalVenda = totalVendaObra(obra);
          const totalRecebido = parcelasObra.reduce(
            (acc: number, p: any) => acc + Number(p.valor_realizado || 0),
            0,
          );
          const saldoReceber = totalVenda === null ? null : Math.max(totalVenda - totalRecebido, 0);
          // a faturar = escopo de faturamento - NFs emitidas (null: obra sem escopo cadastrado)
          const escopoObra = escopoData
            .filter((f: any) => f.id_obra === obra.id)
            .reduce((acc: number, f: any) => acc + Number(f.valor_total_escopo || 0), 0);
          const faturadoObra = faturadoData
            .filter((r: any) => r.id_obra === obra.id)
            .reduce((acc: number, r: any) => acc + Number(r.valor_realizado || 0), 0);
          const saldoFaturar = escopoObra > 0 ? Math.max(escopoObra - faturadoObra, 0) : null;
          const valorVencidoObra = parcelasObra.reduce(
            (acc: number, p: any) => {
              const saldo = Math.max(
                Number(p.valor_previsto || 0) - Number(p.valor_realizado || 0),
                0,
              );
              if (saldo > 0 && p.data_prevista && p.data_prevista < hoje)
                return acc + saldo;
              return acc;
            },
            0,
          );

          const documentosAvaliaveis = documentosObra.filter(
            (d: any) => !isDocumentoEntregaTecnica(d.item),
          );
          const docsPendentes = documentosAvaliaveis.filter(
            (d: any) =>
              d.status !== "concluido" && d.status !== "nao_aplicavel",
          ).length;
          const fasesAtrasadasObra = cronogramaObraDashboard.filter(
            (c: any) =>
              c.status !== "concluido" &&
              c.status !== "cancelado" &&
              c.fim_previsto &&
              c.fim_previsto < hoje,
          ).length;
          const tarefasAtrasadasObra = tarefasObra.filter(
            (t: any) =>
              t.status !== "concluida" &&
              t.data_vencimento &&
              String(t.data_vencimento).split("T")[0] < hoje,
          ).length;

          // saude: criterio unico (saudeObra.ts), o mesmo do selo de Minhas Obras
          const indicadores = saudePorObra ? saudePorObra[obra.id] : null;
          const saude = indicadores ? avaliarSaude(indicadores) : null;
          (indicadores?.fases_proximas || []).forEach((f: any) =>
            fasesProximasTodas.push({ ...f, idObra: obra.id, codigo: obra.codigo_externo, nome: obra.nome, obraOriginal: obra }),
          );

          return {
            id: obra.id,
            codigo: obra.codigo_externo,
            nome: obra.nome,
            fase: obra.fase_atual,
            responsavel: obra.usuarios?.nome || "Sem responsável",
            totalVenda,
            totalRecebido,
            saldoReceber,
            saldoFaturar,
            valorVencido: valorVencidoObra,
            documentosPendentes: docsPendentes,
            fasesAtrasadas: fasesAtrasadasObra,
            tarefasAtrasadas: tarefasAtrasadasObra,
            dataEntrega: obra.data_previsao_fim,
            areas: saude?.areas || null,
            statusGeral: saude?.geral || null,
            gravidade: saude?.gravidade || 0,
            motivosCriticos: saude?.motivos || [],
            obraOriginal: obra,
          };
        });

        // Ordem pelo numero da obra (igual a tela Minhas Obras); no empate de gravidade, os
        // Projetos Criticos tambem seguem essa ordem (sort estavel).
        const projetosPorCodigo = [...projetos].sort((a: any, b: any) => {
          const codigoA = Number(a.codigo);
          const codigoB = Number(b.codigo);
          if (!isNaN(codigoA) && !isNaN(codigoB)) return codigoA - codigoB;
          return String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", {
            numeric: true,
          });
        });
        setStatusProjetosPMIS(projetosPorCodigo);
        setProjetosCriticosPMIS(
          projetosPorCodigo
            .filter((p: any) => p.statusGeral === "critico" || p.statusGeral === "atencao")
            .sort((a: any, b: any) => b.gravidade - a.gravidade)
            .slice(0, 6),
        );
        setSemSaude(saudePorObra === null);
        setFasesSemana(
          [...fasesProximasTodas].sort((a, b) =>
            String(a.fim_previsto).localeCompare(String(b.fim_previsto)) ||
            String(a.codigo || "").localeCompare(String(b.codigo || ""), "pt-BR", { numeric: true }),
          ),
        );

        const mapaFases: any = {};
        fasesProjeto.forEach((fase) => {
          mapaFases[fase.valor] = { nome: fase.label, total: 0 };
        });
        obras.forEach((obra: any) => {
          const fase = obra.fase_atual || "processo_inicial";
          if (!mapaFases[fase])
            mapaFases[fase] = { nome: labelFase(fase), total: 0 };
          mapaFases[fase].total++;
        });
        setDadosGrafico(
          Object.values(mapaFases).filter((item: any) => item.total > 0),
        );

        try {
          let queryFeed = supabase
            .from("diario_obra")
            .select(
              "id, texto, created_at, usuarios(nome), obras!inner(codigo_externo, nome)",
            )
            .order("created_at", { ascending: false })
            .limit(6);
          if (!isAdmin && idsObras.length > 0)
            queryFeed = queryFeed.in("id_obra", idsObras);
          const { data: feedData } = await queryFeed;
          if (feedData) setFeedGlobal(feedData);
        } catch (err) {
          console.log("Tabela diario_obra ausente para o Feed");
        }
        setEstadoCarga("ok");
      } catch (error) {
        setEstadoCarga("erro");
        falhaAoCarregar("o painel", error);
      }
    }

    buscarDadosDashboard();
    // so o usuario e o "Tentar de novo" recarregam (App re-renderiza a cada minuto)
  }, [usuarioAtual?.id, tentativa]);

  const blocoTarefas = (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <CheckSquare size={20} className="text-[#2A6377]" /> Minhas
            Tarefas Críticas
          </h3>
          {tarefasDashboard.length === 0 ? (
            <div className="text-center p-8 text-slate-500 flex flex-col items-center">
              <CheckCircle2 size={40} className="mb-2 text-green-200" />{" "}
              Tudo em dia! Nenhuma tarefa pendente.
            </div>
          ) : (
            <div className="space-y-3">
              {tarefasDashboard.map((tarefa) => (
                <button
                  type="button"
                  key={tarefa.id}
                  onClick={() => onAbrirTarefa(tarefa)}
                  className="w-full text-left flex justify-between items-center bg-slate-50 p-3 rounded-lg border hover:border-[#2A6377] transition cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-2 h-2 rounded-full bg-[#2A6377] shrink-0"></div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#2A6377] uppercase">
                        {tarefa.obras?.codigo_externo}
                      </p>
                      <p className="font-semibold text-slate-700 truncate">
                        {tarefa.titulo}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-xs font-bold px-2 py-1 rounded shrink-0 flex items-center gap-1 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-100 text-red-700" : "bg-white border text-slate-500"}`}
                  >
                    <Clock size={12} />{" "}
                    {formatarDataSegura(tarefa.data_vencimento)}
                  </div>
                </button>
              ))}
              <button
                onClick={() => onIrPara("tarefas")}
                className="w-full mt-2 text-xs font-bold text-center text-slate-500 hover:text-[#2A6377] p-2 transition"
              >
                Ver Kanban Completo &rarr;
              </button>
            </div>
          )}
        </div>
  );

  // enquanto carrega: barra cinza no lugar do numero (nao mostrar "0" / "R$ 0,00" como se fosse dado)
  const valorOu = (no: ReactNode) =>
    carregando ? (
      <span className="block h-8 w-24 max-w-full rounded bg-slate-100 animate-pulse mt-1">
        <span className="sr-only">Carregando...</span>
      </span>
    ) : (
      no
    );
  const avisoFalha = (
    <div className="h-full flex items-center justify-center p-8 text-center text-slate-500">
      Não foi possível carregar.
    </div>
  );
  const hojeLocal = hojeLocalISO();

  return (
    <div className="animate-in fade-in h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
            Painel
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-semibold text-slate-600">
              Visão geral das obras{isAdmin ? "" : " sob sua responsabilidade"}.
            </span>{" "}
            Resumo executivo da saúde dos projetos, com foco em
            financeiro, documentação, cronograma, tarefas e alertas.
          </p>
        </div>
        <button
          onClick={() => onIrPara("minhas_obras")}
          className="bg-[#2A6377] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e4857] transition"
        >
          <FolderOpen size={16} /> Ver Obras
        </button>
      </div>

      {!isAdmin && blocoTarefas}

      {falhou && (
        <div role="alert" className="bg-white p-5 rounded-xl shadow-sm border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle size={18} /> Não foi possível carregar o painel.
          </p>
          <button
            type="button"
            onClick={() => setTentativa((t) => t + 1)}
            className="bg-[#2A6377] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e4857] transition"
          >
            <RefreshCw size={16} /> Tentar de novo
          </button>
        </div>
      )}

      {!falhou && (
      <div aria-busy={carregando} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Obras Ativas
            </p>
            <Briefcase className="text-blue-500" size={22} />
          </div>
          {valorOu(
          <p className="text-3xl font-bold text-slate-800">
            {resumoPMIS.obrasAtivas}
          </p>,
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Carteira Total
            </p>
            <DollarSign className="text-slate-500" size={22} />
          </div>
          {valorOu(
          <ValorAjustavel className="text-2xl font-bold text-slate-800">
            {formatarMoeda(resumoPMIS.carteiraTotal)}
          </ValorAjustavel>,
          )}
          {!carregando && resumoPMIS.carteiraObrasSemValor > 0 && (
            <p className="text-xs text-slate-500 mt-1" title={TITULO_SEM_ACESSO_VALOR}>
              Parcial: sem {resumoPMIS.carteiraObrasSemValor} obra{resumoPMIS.carteiraObrasSemValor > 1 ? "s" : ""} (sem acesso ao valor)
            </p>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Recebido
            </p>
            <CheckCircle2 className="text-green-500" size={22} />
          </div>
          {valorOu(
          <ValorAjustavel className="text-2xl font-bold text-green-700">
            {formatarMoeda(resumoPMIS.recebidoTotal)}
          </ValorAjustavel>,
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Saldo a Receber
            </p>
            <Clock className="text-orange-500" size={22} />
          </div>
          {valorOu(
          <ValorAjustavel className="text-2xl font-bold text-orange-700">
            {formatarMoeda(resumoPMIS.saldoReceber)}
          </ValorAjustavel>,
          )}
          {!carregando && resumoPMIS.carteiraObrasSemValor > 0 && (
            <p className="text-xs text-slate-500 mt-1" title={TITULO_SEM_ACESSO_VALOR}>
              Parcial: só obras com valor de venda visível
            </p>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Valor Vencido
            </p>
            <AlertCircle className="text-red-500" size={22} />
          </div>
          {valorOu(
          <ValorAjustavel className="text-2xl font-bold text-red-600">
            {formatarMoeda(resumoPMIS.valorVencido)}
          </ValorAjustavel>,
          )}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Alertas
            </p>
            <AlertTriangle className="text-amber-500" size={22} />
          </div>
          {valorOu(
          <p className="text-3xl font-bold text-slate-800">
            {resumoPMIS.documentosPendentes +
              resumoPMIS.fasesAtrasadas +
              resumoPMIS.tarefasAtrasadas}
          </p>,
          )}
          <p className="text-xs text-slate-500 mt-1">
            Docs, fases e tarefas
          </p>
        </div>
      </div>
      )}

      {/* carteira: previsao de faturamento/recebimento por mes e margem prevista x atual (a margem so aparece
          para quem o banco deixa ver: admin, coordenador e o gestor da obra) */}
      {estadoCarga === "ok" && obrasCarteira.length > 0 && (
        <Suspense fallback={null}>
          <PrevisaoMensal obras={obrasCarteira} onAbrirObra={abrirObraPorId} />
          <MargemCarteira obras={obrasCarteira} onAbrirObra={abrirObraPorId} />
        </Suspense>
      )}

      {/* carteira (Pacote 4): compras/entregas atrasadas das obras e cronograma em barras (comeca recolhido) */}
      {estadoCarga === "ok" && obrasCarteira.length > 0 && (
        <Suspense fallback={null}>
          <ComprasAtrasadas obras={obrasCarteira} onAbrirObra={abrirObraPorId} />
          <GanttCarteira obras={obrasCarteira} onAbrirObra={abrirObraPorId} />
        </Suspense>
      )}

      {/* Status geral ocupa o espaco que sobra; Projetos Criticos fica numa coluna
          estreita (os motivos sao textos curtos) so em tela grande (>= 1700px, onde a
          tabela inteira cabe). Abaixo disso empilha: a tabela pega a largura toda e os
          criticos viram uma grade de cartoes - antes eram 2/3 x 1/3 e a coluna Saldo
          ficava cortada. */}
      <div className="grid grid-cols-1 min-[1700px]:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start min-[1700px]:items-stretch">
        <TabelaStatusGeral
          linhas={statusProjetosPMIS}
          carregando={carregando}
          falhou={falhou}
          mostrarGestor={isAdmin}
          hojeLocal={hojeLocal}
          onAbrir={abrirObraPorId}
        />

        {/* Em tela grande o cartao acompanha a altura do Status Geral (absolute inset-0
            dentro do wrapper, cuja altura vem da linha do grid) e rola por dentro; abaixo
            de 1700px fica no fluxo normal, com altura maxima. */}
        <div className="relative min-[1700px]:min-h-[320px]">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-[1700px]:absolute min-[1700px]:inset-0">
          <div className="p-5 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />{" "}
              Projetos Críticos
            </h3>
          </div>
          <div className="p-5 grid gap-4 content-start md:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-1 max-h-[480px] min-[1700px]:max-h-none min-[1700px]:flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {carregando || falhou ? (
              <div className="col-span-full text-center p-8 text-slate-500">
                {carregando ? "Carregando..." : "Não foi possível carregar."}
              </div>
            ) : semSaude ? (
              <div className="col-span-full text-center p-8 text-slate-500">
                Não foi possível carregar a saúde das obras.
              </div>
            ) : projetosCriticosPMIS.length === 0 ? (
              <div className="col-span-full text-center p-8 text-slate-500">
                <CheckCircle2
                  size={42}
                  className="mx-auto mb-2 text-green-200"
                />{" "}
                Nenhum alerta crítico no momento.
              </div>
            ) : (
              projetosCriticosPMIS.map((projeto) => (
                <button
                  type="button"
                  key={projeto.id}
                  onClick={() => abrirProjetoDashboard(projeto)}
                  className="text-left w-full border rounded-xl p-4 hover:border-[#2A6377] hover:bg-slate-50 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#2A6377] text-sm break-words">
                        {projeto.codigo} - {projeto.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {labelFase(projeto.fase)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 rounded-full border text-[11px] font-semibold ${estiloStatusPMIS(projeto.statusGeral)}`}
                    >
                      {labelStatusPMIS(projeto.statusGeral)}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {projeto.motivosCriticos
                      .slice(0, 3)
                      .map((motivo: string, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-amber-500">•</span>
                          {motivo}
                        </li>
                      ))}
                  </ul>
                </button>
              ))
            )}
          </div>
        </div>
        </div>
      </div>

      {/* fases do cronograma que vencem de hoje ate +7 dias (mesma conta da saude da obra) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
          <CalendarClock size={20} className="text-amber-500" /> Fases que vencem em 7 dias
        </h3>
        {carregando ? (
          <p className="text-sm text-slate-500 p-2">Carregando...</p>
        ) : falhou ? (
          <p className="text-sm text-slate-500 p-2">Não foi possível carregar.</p>
        ) : semSaude ? (
          <p className="text-sm text-slate-500 p-2">Não foi possível carregar.</p>
        ) : fasesSemana.length === 0 ? (
          <p className="text-sm text-slate-500 p-2">Nenhuma fase vence nos próximos 7 dias.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {fasesSemana.map((f, idx) => {
              const prazo = prazoEntrega(f.fim_previsto, hojeLocal);
              return (
                <li key={`${f.idObra}-${f.fase}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onAbrirObra(f.obraOriginal)}
                    className="w-full text-left border rounded-lg p-3 hover:border-[#2A6377] hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]"
                  >
                    <p className="font-bold text-[#2A6377] text-sm break-words">
                      {f.codigo} - {f.nome}
                    </p>
                    <p className="text-sm text-slate-700">{labelFase(f.fase)}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock size={12} /> {formatarDataSegura(f.fim_previsto)}
                      {prazo && <span>· {prazo.texto.replace("vence hoje", "hoje")}</span>}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? "xl:grid-cols-3" : "xl:grid-cols-2"} gap-6 items-start`}>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Activity size={20} className="text-[#2A6377]" /> Obras por
            Fase
          </h3>
          <div className="h-72 w-full">
            {carregando ? (
              <div className="h-full rounded-lg bg-slate-50 animate-pulse flex items-center justify-center text-slate-500">
                Carregando...
              </div>
            ) : falhou ? (
              avisoFalha
            ) : dadosGrafico.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Sem dados.
              </div>
            ) : (
              <Suspense fallback={<div className="h-full" />}>
                <GraficoObrasPorFase dados={dadosGrafico} />
              </Suspense>
            )}
          </div>
        </div>

        {isAdmin && blocoTarefas}

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[410px]">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Activity size={20} className="text-blue-500" /> Últimas
            Atualizações
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {carregando ? (
              <div className="text-center p-8 text-slate-500">Carregando...</div>
            ) : falhou ? (
              avisoFalha
            ) : feedGlobal.length === 0 ? (
              <div className="text-center p-8 text-slate-500 italic">
                O feed está silencioso.
              </div>
            ) : (
              feedGlobal.map((item) => (
                <div
                  key={item.id}
                  className="relative pl-4 border-l border-slate-200"
                >
                  <div className="absolute w-2 h-2 bg-blue-400 rounded-full -left-[4.5px] top-1.5"></div>
                  <p className="text-xs font-bold text-slate-500 mb-0.5">
                    {formatarDataHora(item.created_at)}
                  </p>
                  <p className="text-xs font-bold text-[#2A6377] uppercase mb-1">
                    {item.obras?.codigo_externo} - {item.usuarios?.nome}
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 leading-snug line-clamp-3">
                    {item.texto}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
