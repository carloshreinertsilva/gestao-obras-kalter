import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { fasesProjeto } from "../constants";
import ValorAjustavel from "../ValorAjustavel";
import { formatarDataSegura, formatarDataHora, formatarMoeda, dataHojeISO, labelFase, isAtrasada } from "../utils";
import { Briefcase, CheckSquare, AlertCircle, Clock, AlertTriangle, CheckCircle2, FolderOpen, Activity, DollarSign } from "lucide-react";
import type { Usuario } from "../types";

const GraficoObrasPorFase = lazy(() => import("./GraficoObrasPorFase"));

// Dashboard: visao geral das obras do usuario (admin ve todas), status PMIS,
// projetos criticos, minhas tarefas e ultimas anotacoes do diario.
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

  const estiloStatusPMIS = (status: string) => {
    const mapa: any = {
      verde: "bg-green-100 text-green-700 border-green-200",
      amarelo: "bg-amber-100 text-amber-700 border-amber-200",
      vermelho: "bg-red-100 text-red-700 border-red-200",
    };
    return mapa[status] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const labelStatusPMIS = (status: string) => {
    const mapa: any = { verde: "OK", amarelo: "Atenção", vermelho: "Crítico" };
    return mapa[status] || status;
  };

  const bolinhaStatusPMIS = (status: string) => {
    const mapa: any = {
      verde: "bg-green-500",
      amarelo: "bg-amber-400",
      vermelho: "bg-red-500",
    };
    return mapa[status] || "bg-slate-300";
  };

  const abrirProjetoDashboard = (projeto: any) => {
    if (projeto?.obraOriginal) onAbrirObra(projeto.obraOriginal);
  };

  useEffect(() => {
    async function buscarDadosDashboard() {
      if (!usuarioAtual) return;
      try {
        const hoje = dataHojeISO();
        const em7Dias = new Date();
        em7Dias.setDate(em7Dias.getDate() + 7);
        const em7DiasISO = em7Dias.toISOString().split("T")[0];
        const isDocumentoEntregaTecnica = (item: any) =>
          String(item || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes("termo de entrega tecnica");

        let queryObras = supabase
          .from("obras")
          .select(
            "id, codigo_externo, nome, fase_atual, data_previsao_fim, id_responsavel, valor_produto, valor_servico, usuarios(nome)",
          )
          .eq("status", "em_andamento")
          .order("created_at", { ascending: false });

        queryObras = noEscopoDoUsuario(queryObras);

        const { data: obrasDashboard, error: obrasErro } = await queryObras;
        if (obrasErro) throw obrasErro;

        const obras = obrasDashboard || [];
        const idsObras = obras.map((o: any) => o.id);

        let parcelasData: any[] = [];
        let documentosData: any[] = [];
        let cronogramaData: any[] = [];
        let tarefasData: any[] = [];

        if (idsObras.length > 0) {
          const [parcelasResp, documentosResp, cronogramaResp, tarefasResp] =
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
            ]);

          if (parcelasResp.error) throw parcelasResp.error;
          if (documentosResp.error) throw documentosResp.error;
          if (cronogramaResp.error) throw cronogramaResp.error;
          if (tarefasResp.error) throw tarefasResp.error;

          parcelasData = parcelasResp.data || [];
          documentosData = documentosResp.data || [];
          cronogramaData = cronogramaResp.data || [];
          tarefasData = tarefasResp.data || [];
        }

        const carteiraTotal = obras.reduce(
          (acc: number, obra: any) =>
            acc +
            Number(obra.valor_produto || 0) +
            Number(obra.valor_servico || 0),
          0,
        );
        const recebidoTotal = parcelasData.reduce(
          (acc: number, parcela: any) =>
            acc + Number(parcela.valor_realizado || 0),
          0,
        );
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
          recebidoTotal,
          saldoReceber: Math.max(carteiraTotal - recebidoTotal, 0),
          valorVencido,
          documentosPendentes,
          fasesAtrasadas,
          tarefasAtrasadas,
          tarefasHoje,
        });

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
          const totalVenda =
            Number(obra.valor_produto || 0) + Number(obra.valor_servico || 0);
          const totalRecebido = parcelasObra.reduce(
            (acc: number, p: any) => acc + Number(p.valor_realizado || 0),
            0,
          );
          const saldoReceber = Math.max(totalVenda - totalRecebido, 0);
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
          const docsNaoElaborados = documentosAvaliaveis.filter(
            (d: any) => d.status === "nao_elaborado",
          ).length;
          const docsEmAndamento = documentosAvaliaveis.filter(
            (d: any) => d.status === "em_andamento",
          ).length;
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
          const fasesEmAndamento = cronogramaObraDashboard.filter(
            (c: any) => c.status === "em_andamento",
          ).length;
          const fasesProximas = cronogramaObraDashboard.filter(
            (c: any) =>
              c.status !== "concluido" &&
              c.status !== "cancelado" &&
              c.fim_previsto &&
              c.fim_previsto >= hoje &&
              c.fim_previsto <= em7DiasISO,
          ).length;
          void fasesEmAndamento;
          void fasesProximas;
          const tarefasAtrasadasObra = tarefasObra.filter(
            (t: any) =>
              t.status !== "concluida" &&
              t.data_vencimento &&
              String(t.data_vencimento).split("T")[0] < hoje,
          ).length;
          const tarefasProximas = tarefasObra.filter(
            (t: any) =>
              t.status !== "concluida" &&
              t.data_vencimento &&
              String(t.data_vencimento).split("T")[0] >= hoje &&
              String(t.data_vencimento).split("T")[0] <= em7DiasISO,
          ).length;

          const financeiroStatus = valorVencidoObra > 0 ? "vermelho" : "verde";
          const documentosStatus =
            docsNaoElaborados > 0
              ? "vermelho"
              : docsEmAndamento > 0 || docsPendentes > 0
                ? "amarelo"
                : "verde";
          const cronogramaStatus = fasesAtrasadasObra > 0 ? "vermelho" : "verde";
          const tarefasStatus =
            tarefasAtrasadasObra > 0
              ? "vermelho"
              : tarefasProximas > 0
                ? "amarelo"
                : "verde";
          const score = [
            financeiroStatus,
            documentosStatus,
            cronogramaStatus,
            tarefasStatus,
          ].reduce(
            (acc, status) =>
              acc + (status === "vermelho" ? 2 : status === "amarelo" ? 1 : 0),
            0,
          );
          const statusGeral =
            score >= 4 ? "vermelho" : score >= 2 ? "amarelo" : "verde";

          const motivosCriticos = [
            valorVencidoObra > 0
              ? `Financeiro vencido: ${formatarMoeda(valorVencidoObra)}`
              : "",
            docsPendentes > 0
              ? `${docsPendentes} documento(s) pendente(s)`
              : "",
            fasesAtrasadasObra > 0
              ? `${fasesAtrasadasObra} fase(s) atrasada(s)`
              : "",
            tarefasAtrasadasObra > 0
              ? `${tarefasAtrasadasObra} tarefa(s) atrasada(s)`
              : "",
          ].filter(Boolean);

          return {
            id: obra.id,
            codigo: obra.codigo_externo,
            nome: obra.nome,
            fase: obra.fase_atual,
            responsavel: obra.usuarios?.nome || "Sem responsável",
            totalVenda,
            totalRecebido,
            saldoReceber,
            valorVencido: valorVencidoObra,
            documentosPendentes: docsPendentes,
            fasesAtrasadas: fasesAtrasadasObra,
            tarefasAtrasadas: tarefasAtrasadasObra,
            financeiroStatus,
            documentosStatus,
            cronogramaStatus,
            tarefasStatus,
            statusGeral,
            score,
            motivosCriticos,
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
            .filter((p: any) => p.score > 0)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 6),
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
      } catch (error) {
        falhaAoCarregar("o dashboard", error);
      }
    }

    buscarDadosDashboard();
  }, [usuarioAtual?.id]);

  return (
    <div className="animate-in fade-in h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
            Dashboard PMIS {isAdmin ? "Global" : "Pessoal"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Resumo executivo da saúde dos projetos, com foco em
            financeiro, documentação, cronograma e tarefas.
          </p>
        </div>
        <button
          onClick={() => onIrPara("minhas_obras")}
          className="bg-[#2A6377] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e4857] transition"
        >
          <FolderOpen size={16} /> Ver Obras
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Obras Ativas
            </p>
            <Briefcase className="text-blue-500" size={22} />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {resumoPMIS.obrasAtivas}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Carteira Total
            </p>
            <DollarSign className="text-slate-500" size={22} />
          </div>
          <ValorAjustavel className="text-2xl font-bold text-slate-800">
            {formatarMoeda(resumoPMIS.carteiraTotal)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Recebido
            </p>
            <CheckCircle2 className="text-green-500" size={22} />
          </div>
          <ValorAjustavel className="text-2xl font-bold text-green-700">
            {formatarMoeda(resumoPMIS.recebidoTotal)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Saldo a Receber
            </p>
            <Clock className="text-orange-500" size={22} />
          </div>
          <ValorAjustavel className="text-2xl font-bold text-orange-700">
            {formatarMoeda(resumoPMIS.saldoReceber)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Valor Vencido
            </p>
            <AlertCircle className="text-red-500" size={22} />
          </div>
          <ValorAjustavel className="text-2xl font-bold text-red-600">
            {formatarMoeda(resumoPMIS.valorVencido)}
          </ValorAjustavel>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Alertas
            </p>
            <AlertTriangle className="text-amber-500" size={22} />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {resumoPMIS.documentosPendentes +
              resumoPMIS.fasesAtrasadas +
              resumoPMIS.tarefasAtrasadas}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Docs, fases e tarefas
          </p>
        </div>
      </div>

      {/* Status geral ocupa o espaco que sobra; Projetos Criticos fica numa coluna
          estreita (os motivos sao textos curtos) so em tela grande (>= 1700px, onde a
          tabela inteira cabe). Abaixo disso empilha: a tabela pega a largura toda e os
          criticos viram uma grade de cartoes - antes eram 2/3 x 1/3 e a coluna Saldo
          ficava cortada. */}
      <div className="grid grid-cols-1 min-[1700px]:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start min-[1700px]:items-stretch">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity size={20} className="text-[#2A6377]" /> Status
              Geral dos Projetos
            </h3>
            <p className="text-xs text-slate-400">
              Clique em uma obra para abrir o painel PMIS.
            </p>
          </div>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-sm min-w-[720px] [&_th]:px-2 [&_td]:px-2 2xl:[&_th]:px-4 2xl:[&_td]:px-4">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Obra</th>
                  <th className="px-4 py-3 text-left">Fase</th>
                  <th className="px-4 py-3 text-center">Financeiro</th>
                  <th className="px-4 py-3 text-center">Documentos</th>
                  <th className="px-4 py-3 text-center">Cronograma</th>
                  <th className="px-4 py-3 text-center">Tarefas</th>
                  <th className="px-4 py-3 text-center">Geral</th>
                  <th className="px-4 py-3 text-center">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {statusProjetosPMIS.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Nenhuma obra ativa encontrada.
                    </td>
                  </tr>
                ) : (
                  statusProjetosPMIS.map((projeto) => (
                    <tr
                      key={projeto.id}
                      onClick={() => abrirProjetoDashboard(projeto)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#2A6377]">
                          {projeto.codigo} - {projeto.nome}
                        </p>
                        <p className="text-xs text-slate-400">
                          Resp.: {projeto.responsavel}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {labelFase(projeto.fase)}
                      </td>
                      {[
                        "financeiroStatus",
                        "documentosStatus",
                        "cronogramaStatus",
                        "tarefasStatus",
                      ].map((campo) => (
                        <td key={campo} className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex w-3 h-3 rounded-full ${bolinhaStatusPMIS(projeto[campo])}`}
                            title={labelStatusPMIS(projeto[campo])}
                          ></span>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold ${estiloStatusPMIS(projeto.statusGeral)}`}
                        >
                          {labelStatusPMIS(projeto.statusGeral)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                        {formatarMoeda(projeto.saldoReceber)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
            {projetosCriticosPMIS.length === 0 ? (
              <div className="col-span-full text-center p-8 text-slate-400">
                <CheckCircle2
                  size={42}
                  className="mx-auto mb-2 text-green-200"
                />{" "}
                Nenhum alerta crítico no momento.
              </div>
            ) : (
              projetosCriticosPMIS.map((projeto) => (
                <div
                  key={projeto.id}
                  onClick={() => abrirProjetoDashboard(projeto)}
                  className="border rounded-xl p-4 hover:border-[#2A6377] hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#2A6377] text-sm break-words">
                        {projeto.codigo} - {projeto.nome}
                      </p>
                      <p className="text-xs text-slate-400">
                        {labelFase(projeto.fase)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-1 rounded-full border text-[10px] font-bold ${estiloStatusPMIS(projeto.statusGeral)}`}
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
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Activity size={20} className="text-[#2A6377]" /> Obras por
            Fase
          </h3>
          <div className="h-72 w-full">
            {dadosGrafico.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Sem dados.
              </div>
            ) : (
              <Suspense fallback={<div className="h-full" />}>
                <GraficoObrasPorFase dados={dadosGrafico} />
              </Suspense>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <CheckSquare size={20} className="text-[#2A6377]" /> Minhas
            Tarefas Críticas
          </h3>
          {tarefasDashboard.length === 0 ? (
            <div className="text-center p-8 text-slate-400 flex flex-col items-center">
              <CheckCircle2 size={40} className="mb-2 text-green-200" />{" "}
              Tudo em dia! Nenhuma tarefa pendente.
            </div>
          ) : (
            <div className="space-y-3">
              {tarefasDashboard.map((tarefa) => (
                <div
                  key={tarefa.id}
                  onClick={() => onAbrirTarefa(tarefa)}
                  className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border hover:border-[#2A6377] transition cursor-pointer group"
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
                    className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 flex items-center gap-1 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-100 text-red-700" : "bg-white border text-slate-500"}`}
                  >
                    <Clock size={12} />{" "}
                    {formatarDataSegura(tarefa.data_vencimento)}
                  </div>
                </div>
              ))}
              <button
                onClick={() => onIrPara("tarefas")}
                className="w-full mt-2 text-xs font-bold text-center text-slate-400 hover:text-[#2A6377] p-2 transition"
              >
                Ver Kanban Completo &rarr;
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[410px]">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Activity size={20} className="text-blue-500" /> Últimas
            Atualizações
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {feedGlobal.length === 0 ? (
              <div className="text-center p-8 text-slate-400 italic">
                O feed está silencioso.
              </div>
            ) : (
              feedGlobal.map((item) => (
                <div
                  key={item.id}
                  className="relative pl-4 border-l border-slate-200"
                >
                  <div className="absolute w-2 h-2 bg-blue-400 rounded-full -left-[4.5px] top-1.5"></div>
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5">
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
