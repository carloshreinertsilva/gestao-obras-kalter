import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fasesProjeto, perfisUsuario } from "./constants";
import TimelineObra from "./TimelineObra";
import FaturamentosRealizados from "./FaturamentosRealizados";
import ReunioesHistorico from "./ReunioesHistorico";
import AnexosObra from "./AnexosObra";
import type {
  Usuario,
  Obra,
  Tarefa,
  ComentarioTarefa,
  Faturamento,
  ParcelaCliente,
  DocumentoProjeto,
  CronogramaObra,
  ObraFaturamentoFamilia,
  ObraFaturamentoGrupo,
  ObraFaturamentoPrevisao,
  ObraFaturamentoRealizado,
} from "./types";
import {
  formatarDataSegura,
  formatarDataHora,
  formatarMoeda,
  dataHojeISO,
  formatarCompetencia,
  selecionarTextoAoFocar,
  isoParaDataBR,
  formatarEntradaDataBR,
  dataBRParaISO,
  calcularStatusParcela,
  labelStatusParcelaCalculado,
  classeStatusParcela,
  labelFase,
  labelPerfilUsuario,
  labelStatusParcela,
  labelStatusDocumento,
  corIndicador,
  indicadorPorStatusDocumento,
  corIndicadorDocumento,
  classeStatusDocumento,
  classeStatusCronograma,
  labelStatusCronograma,
  labelStatusObra,
  classeStatusObra,
  formatarTamanhoArquivo,
  normalizarNomeArquivo,
  labelOcorrencia,
  compararCodigoFamilia,
  formatarPercentual,
} from "./utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Briefcase,
  Calendar,
  CheckSquare,
  AlertCircle,
  HardHat,
  Plus,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Loader2,
  Play,
  Check,
  Trash2,
  Users,
  Edit2,
  X,
  LogOut,
  Mail,
  KeyRound,
  CheckCheck,
  Bell,
  Send,
  CalendarPlus,
  Menu,
  MessageSquare,
  BookOpen,
  ChevronRight,
  FolderOpen,
  FileText,
  LayoutDashboard,
  Activity,
  Settings,
  ClipboardList,
  DollarSign,
  Receipt,
  Mic,
} from "lucide-react";

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);
  const [erroLogin, setErroLogin] = useState<string>("");
  const [mensagemSucesso, setMensagemSucesso] = useState<string>("");
  const [modoAuth, setModoAuth] = useState<string>("login");
  const [emailAuth, setEmailAuth] = useState<string>("");
  const [senhaAuth, setSenhaAuth] = useState<string>("");
  const [nomeAuth, setNomeAuth] = useState<string>("");

  const [telaAtiva, setTelaAtiva] = useState<string>("dashboard");
  const [carregando, setCarregando] = useState<boolean>(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const [resumoReal, setResumoReal] = useState<any>({
    obrasAtivas: 0,
    tarefasAtrasadas: 0,
    tarefasHoje: 0,
  });
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

  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);

  // Obras com os valores de venda
  const [novoUsuario, setNovoUsuario] = useState<any>({
    id: null,
    nome: "",
    email: "",
    perfil: "engenheiro",
    id_engenheiro_vinculado: "",
  });
  const [novaObra, setNovaObra] = useState<any>({
    id: null,
    codigo_externo: "",
    nome: "",
    descricao: "",
    fase_atual: "processo_inicial",
    data_inicio: "",
    data_previsao_fim: "",
    id_responsavel: "",
    valor_produto: "",
    valor_servico: "",
    observacoes: "",
  });
  const [erroObra, setErroObra] = useState<string>("");
  const [obrasLista, setObrasLista] = useState<Obra[]>([]);
  const [ordenacaoMinhasObras, setOrdenacaoMinhasObras] = useState<
    "codigo" | "nome"
  >("codigo");
  const [obrasCadastroLista, setObrasCadastroLista] = useState<Obra[]>([]);
  const [filtroStatusCadastroObras, setFiltroStatusCadastroObras] = useState<
    "em_andamento" | "finalizada" | "cancelada" | "todas"
  >("em_andamento");

  const [reuniaoForm, setReuniaoForm] = useState<any>({
    id_obra: "",
    data_reuniao: new Date().toISOString().split("T")[0],
    resumo_geral: "",
  });
  const [novaOcorrencia, setNovaOcorrencia] = useState<any>({
    tipo: "avanco",
    descricao: "",
  });
  const [listaOcorrencias, setListaOcorrencias] = useState<any[]>([]);
  const [novaTarefa, setNovaTarefa] = useState<any>({
    titulo: "",
    descricao: "",
    data_vencimento: "",
    id_responsavel: "",
    prioridade: "normal",
  });
  const [listaTarefas, setListaTarefas] = useState<any[]>([]);

  const [modalNovaTarefaObraAberto, setModalNovaTarefaObraAberto] =
    useState<boolean>(false);
  const [filtroTarefasObra, setFiltroTarefasObra] = useState<string>("abertas");
  const [novaTarefaObra, setNovaTarefaObra] = useState<any>({
    titulo: "",
    descricao: "",
    data_vencimento: "",
    id_responsavel: "",
    prioridade: "normal",
  });

  const [ataGerada, setAtaGerada] = useState<string>("");
  const [modalAtaAberto, setModalAtaAberto] = useState<boolean>(false);
  const [obrasNaAtaAtual, setObrasNaAtaAtual] = useState<any[]>([]);
  const [idSessaoAtaAtual, setIdSessaoAtaAtual] = useState<string | null>(
    null,
  );
  const [gestorSelecionadoAta, setGestorSelecionadoAta] =
    useState<string>("");
  const [abaReunioes, setAbaReunioes] = useState<"historico" | "nova">(
    "historico",
  );
  const [versaoHistoricoReunioes, setVersaoHistoricoReunioes] =
    useState<number>(0);
  const [gravacaoAta, setGravacaoAta] = useState<{
    resumo: string;
    duracaoSeg: number | null;
  } | null>(null);
  const [resumoGravacaoAberto, setResumoGravacaoAberto] =
    useState<boolean>(false);
  const [contextoObraAta, setContextoObraAta] = useState<any>(null);
  const [carregandoContextoAta, setCarregandoContextoAta] =
    useState<boolean>(false);
  const [enviandoEmailAta, setEnviandoEmailAta] = useState<boolean>(false);
  const [statusEnvioEmailAta, setStatusEnvioEmailAta] = useState<{
    ok: boolean;
    erro?: string;
    destinatarios?: string[];
  } | null>(null);

  const [tarefasKanban, setTarefasKanban] = useState<Tarefa[]>([]);
  const [filtroObraKanban, setFiltroObraKanban] = useState<string>("todas");
  const [minhasNotificacoes, setMinhasNotificacoes] = useState<Tarefa[]>([]);
  const [painelNotificacaoAberto, setPainelNotificacaoAberto] =
    useState<boolean>(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);

  const [obraEcoSelecionada, setObraEcoSelecionada] = useState<Obra | null>(null);
  const [comentariosTarefaAtual, setComentariosTarefaAtual] = useState<
    ComentarioTarefa[]
  >([]);
  const [novoComentarioTexto, setNovoComentarioTexto] = useState<string>("");

  const [reuniaoEmEdicao, setReuniaoEmEdicao] = useState<any>(null);

  // ESTADOS DO FINANCEIRO
  const [faturamentosObra, setFaturamentosObra] = useState<Faturamento[]>([]);
  const [novoFaturamento, setNovoFaturamento] = useState<any>({
    numero_nf: "",
    tipo: "produto",
    valor: "",
  });

  // ESTADOS DO PMIS
  const [abaPainelObra, setAbaPainelObra] = useState<string>("resumo");
  const [subAbaDiario, setSubAbaDiario] = useState<
    "historico" | "anexos" | "tarefas"
  >("historico");
  const [parcelasCliente, setParcelasCliente] = useState<ParcelaCliente[]>([]);
  const [documentosProjeto, setDocumentosProjeto] = useState<DocumentoProjeto[]>([]);
  const [cronogramaObra, setCronogramaObra] = useState<CronogramaObra[]>([]);
  const [novaParcelaCliente, setNovaParcelaCliente] = useState<any>({
    descricao: "",
    data_prevista: "",
    valor_previsto: "",
    observacao: "",
  });
  const [parcelaParaLiquidar, setParcelaParaLiquidar] = useState<any>(null);
  const [liquidacaoParcela, setLiquidacaoParcela] = useState<any>({
    data_recebimento: "",
    valor_recebido: "",
  });
  const [novoDocumentoProjeto, setNovoDocumentoProjeto] = useState<any>({
    item: "",
    detalhes: "",
    status: "nao_elaborado",
    indicador: "vermelho",
    data_prevista: "",
    data_conclusao: "",
    observacao: "",
  });
  const [arquivosDocumentos, setArquivosDocumentos] = useState<any>({});
  const [uploadDocumentoId, setUploadDocumentoId] = useState<string>("");
  const [faseCronogramaModal, setFaseCronogramaModal] = useState<any>(null);
  const [acaoCronogramaModal, setAcaoCronogramaModal] = useState<string>("");
  const [formCronogramaModal, setFormCronogramaModal] = useState<any>({
    data: "",
    observacao: "",
  });

  // ESTADOS DO CONTROLE DE FATURAMENTO POR FAMÍLIA
  const [familiasFaturamento, setFamiliasFaturamento] = useState<
    ObraFaturamentoFamilia[]
  >([]);
  const [gruposFaturamentoObra, setGruposFaturamentoObra] = useState<
    ObraFaturamentoGrupo[]
  >([]);
  const [previsoesFaturamento, setPrevisoesFaturamento] = useState<
    ObraFaturamentoPrevisao[]
  >([]);
  const [realizadosFaturamento, setRealizadosFaturamento] = useState<
    ObraFaturamentoRealizado[]
  >([]);
  // ESTADOS DE ENCERRAMENTO DA OBRA
  const [modalFinalizarObraAberto, setModalFinalizarObraAberto] =
    useState<boolean>(false);
  const [formFinalizarObra, setFormFinalizarObra] = useState<any>({
    data_finalizacao: new Date().toISOString().split("T")[0],
    observacao_finalizacao: "",
  });
  const [modalCancelarObraAberto, setModalCancelarObraAberto] =
    useState<boolean>(false);
  const [formCancelarObra, setFormCancelarObra] = useState<any>({
    data_cancelamento: new Date().toISOString().split("T")[0],
    motivo_cancelamento: "",
    observacao_cancelamento: "",
    cancelar_tarefas: true,
    cancelar_cronograma: true,
  });

  const gruposFaturamentoAtivos = () =>
    gruposFaturamentoObra
      .filter((g) => g.ativo !== false)
      .sort((a, b) => String(a.codigo || "").localeCompare(String(b.codigo || "")));

  const grupoFaturamentoPorId = (idGrupo: any) =>
    gruposFaturamentoObra.find((g) => String(g.id) === String(idGrupo));

  const nomeUsuarioPorId = (id: any) =>
    listaUsuarios.find((u) => u.id === id)?.nome || "";

  const mostrarAviso = (mensagem: string, tipo: string = "sucesso") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  const agendarNoOutlookWeb = (tarefa: any) => {
    if (!tarefa.data_vencimento) {
      mostrarAviso("Esta tarefa não tem prazo definido.", "erro");
      return;
    }
    const emailResponsavel =
      listaUsuarios.find((u: any) => u.id === tarefa.id_responsavel)?.email ||
      "";
    const nomeObra = tarefa.obras?.nome || "Geral";
    const codigoObra = tarefa.obras?.codigo_externo || "";
    const dataVenc = tarefa.data_vencimento.split("T")[0];
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      startdt: `${dataVenc}T11:00:00Z`,
      enddt: `${dataVenc}T12:00:00Z`,
      subject: `Kalter: ${tarefa.titulo}`,
      body: `Obra: ${codigoObra} - ${nomeObra}\n\nGerado pelo Sistema Kalter`,
      to: emailResponsavel,
    });
    window.open(
      `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`,
      "_blank",
    );
  };

  const montarHtmlAta = (
    listaObrasParaAta: any[],
    dataAta: string,
    resumoGravacao?: string | null,
  ) => {
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ata de Reunião Kalter - ${dataAta}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #2A6377; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2A6377; margin: 0 0 10px 0; font-size: 24px; letter-spacing: 1px; }
            .data { font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .gestor-title { color: #2A6377; font-size: 19px; font-weight: bold; margin: 35px 0 15px 0; border-bottom: 3px solid #2A6377; padding-bottom: 8px; }
            .gestor-title:first-of-type { margin-top: 0; }
            .obra-section { margin-bottom: 40px; page-break-inside: avoid; }
            .obra-title { background: #2A6377; color: white; padding: 12px 15px; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-radius: 4px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .info-box p { margin: 5px 0; }
            h4 { color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; color: #334155; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="header">
             <h1>KALTER - REFRIGERAÇÃO INDUSTRIAL</h1>
             <div class="data">Gestão de Obras • Ata de Reunião • ${dataAta}</div>
          </div>
    `;

    agruparObrasPorGestor(listaObrasParaAta).forEach(({ nomeGestor, obras }) => {
      html += `<div class="gestor-title">GESTOR: ${nomeGestor.toUpperCase()}</div>`;
      obras.forEach((obra: any) => {
        html += `
          <div class="obra-section">
            <div class="obra-title">OBRA: ${obra.nome_obra.toUpperCase()}</div>
            <div class="info-box">
              <p><strong>Resumo da Reunião:</strong><br/>${obra.resumo ? obra.resumo.replace(/\n/g, "<br/>") : "Nenhum resumo registrado."}</p>
            </div>
        `;

        if (obra.ocorrencias && obra.ocorrencias.length > 0) {
          html += `
            <h4>Ocorrências Registradas</h4>
            <table>
              <tr><th width="20%">Tipo</th><th>Descrição</th></tr>
              ${obra.ocorrencias.map((o: any) => `<tr><td><strong>${labelOcorrencia(o.tipo).toUpperCase()}</strong></td><td style="white-space:pre-wrap">${o.descricao}</td></tr>`).join("")}
            </table>
          `;
        }

        if (obra.tarefas && obra.tarefas.length > 0) {
          html += `
            <h4>Tarefas e Prazos Definidos</h4>
            <table>
              <tr><th width="45%">Tarefa</th><th width="30%">Responsável</th><th width="25%">Prazo</th></tr>
              ${obra.tarefas.map((t: any) => `<tr><td>${t.titulo}</td><td>${t.nome_responsavel || t.usuarios?.nome || "Geral"}</td><td>${formatarDataSegura(t.data_vencimento)}</td></tr>`).join("")}
            </table>
          `;
        }
        html += `</div>`;
      });
    });

    if (resumoGravacao) {
      const textoSeguro = resumoGravacao
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      html += `
          <div class="obra-section">
            <div class="obra-title">RESUMO DA GRAVAÇÃO DA REUNIÃO</div>
            <div class="info-box">${textoSeguro}</div>
          </div>
      `;
    }

    html += `
          <div class="footer">Gerado via Kalter Sistema de Gestão de Obras</div>
        </body>
      </html>
    `;
    return html;
  };

  const gerarVisualPDF = (
    listaObrasParaPDF: any[],
    dataAta: string,
    resumoGravacao?: string | null,
  ) => {
    const janela = window.open("", "", "width=900,height=900");
    if (!janela)
      return mostrarAviso(
        "Seu navegador bloqueou o PDF. Permita os pop-ups!",
        "erro",
      );

    const html = montarHtmlAta(
      listaObrasParaPDF,
      dataAta,
      resumoGravacao,
    ).replace(
      "</body>",
      `<script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 300); }
          </script>
        </body>`,
    );

    janela.document.write(html);
    janela.document.close();
  };

  const baixarPDFDiaEspecifico = (historicoDia: any) => {
    const idObraAtual = reuniaoForm.id_obra || obraEcoSelecionada?.id;
    const obraInfo = obrasLista.find((o) => o.id === idObraAtual);
    const nomeObra = obraInfo
      ? `${obraInfo.codigo_externo} - ${obraInfo.nome}`
      : "Obra Não Identificada";
    const resumoText =
      historicoDia.resumos.map((r: any) => r.texto).join("\n\n") ||
      "Sem resumo registrado.";

    const fakeObraParaAta = {
      nome_obra: nomeObra,
      resumo: resumoText,
      ocorrencias: historicoDia.ocorrencias || [],
      tarefas: historicoDia.tarefas || [],
    };
    gerarVisualPDF([fakeObraParaAta], historicoDia.dataFormatada);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) buscarPerfilUsuario(session.user.email);
      else setCarregandoAuth(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      if (session) buscarPerfilUsuario(session.user?.email);
      else {
        setUsuarioAtual(null);
        setCarregandoAuth(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const buscarPerfilUsuario = async (email: any) => {
    try {
      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("email", email)
        .single();
      if (data) setUsuarioAtual(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregandoAuth(false);
    }
  };

  const processarAuth = async (e: any) => {
    e.preventDefault();
    setCarregandoAuth(true);
    setErroLogin("");
    setMensagemSucesso("");
    try {
      if (modoAuth === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailAuth,
          password: senhaAuth,
        });
        if (error) throw error;
      } else if (modoAuth === "cadastro") {
        if (!nomeAuth) throw new Error("Preencha o seu nome.");
        const { data, error } = await supabase.auth.signUp({
          email: emailAuth,
          password: senhaAuth,
        });
        if (error) throw error;
        if (data.user)
          await supabase
            .from("usuarios")
            .insert([
              { nome: nomeAuth, email: emailAuth, perfil: "engenheiro" },
            ]);
        setMensagemSucesso("Conta criada! Pode entrar.");
        setModoAuth("login");
        setSenhaAuth("");
      } else if (modoAuth === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailAuth, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMensagemSucesso("Instruções enviadas.");
        setModoAuth("login");
      }
    } catch (error: any) {
      setErroLogin(
        error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : error.message,
      );
    } finally {
      setCarregandoAuth(false);
    }
  };

  const fazerLogout = async () => {
    await supabase.auth.signOut();
    setTelaAtiva("dashboard");
    setEmailAuth("");
    setSenhaAuth("");
    setObraEcoSelecionada(null);
  };
  const isAdmin = usuarioAtual?.perfil === "admin";
  // Assistente herda o escopo de obras do engenheiro ao qual está vinculado.
  const idResponsavelEscopo =
    usuarioAtual?.perfil === "assistente"
      ? usuarioAtual?.id_engenheiro_vinculado || usuarioAtual?.id
      : usuarioAtual?.id;
  const podeEditarObra = (obra: any) =>
    Boolean(isAdmin || (obra && usuarioAtual && obra.id_responsavel === idResponsavelEscopo));
  const podeEditarObraSelecionada = Boolean(
    isAdmin ||
      (obraEcoSelecionada &&
        usuarioAtual &&
        obraEcoSelecionada.id_responsavel === idResponsavelEscopo),
  );

  useEffect(() => {
    async function buscarNotificacoes() {
      if (!usuarioAtual) return;
      try {
        const { data } = await supabase
          .from("tarefas")
          .select("id, titulo, data_vencimento, obras(nome, codigo_externo)")
          .eq("id_responsavel", usuarioAtual.id)
          .eq("status", "pendente")
          .order("created_at", { ascending: false });
        if (data) setMinhasNotificacoes(data);
      } catch (error) {
        console.error(error);
      }
    }
    buscarNotificacoes();
  }, [usuarioAtual, telaAtiva]);

  const buscarUsuarios = async () => {
    try {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil, id_engenheiro_vinculado")
        .eq("ativo", true);
      setListaUsuarios(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const buscarObras = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("obras")
        .select(
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, valor_produto, valor_servico, status, data_finalizacao, observacao_finalizacao, data_cancelamento, motivo_cancelamento, observacao_cancelamento, usuarios(nome)",
        )
        .eq("status", "em_andamento")
        .order("created_at", { ascending: false });
      if (!isAdmin) query = query.eq("id_responsavel", idResponsavelEscopo);
      const { data } = await query;
      if (data) {
        setObrasLista(data);
        if (data.length > 0 && !reuniaoForm.id_obra)
          setReuniaoForm((prev: any) => ({ ...prev, id_obra: data[0].id }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (sessao && usuarioAtual) {
      buscarUsuarios();
      buscarObras();
    }
  }, [telaAtiva, sessao, usuarioAtual]);

  const buscarObrasCadastro = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("obras")
        .select(
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, valor_produto, valor_servico, status, data_finalizacao, observacao_finalizacao, data_cancelamento, motivo_cancelamento, observacao_cancelamento, usuarios(nome)",
        )
        .order("created_at", { ascending: false });
      if (filtroStatusCadastroObras !== "todas")
        query = query.eq("status", filtroStatusCadastroObras);
      if (!isAdmin) query = query.eq("id_responsavel", idResponsavelEscopo);
      const { data } = await query;
      setObrasCadastroLista(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (sessao && usuarioAtual && telaAtiva === "cadastros_obras")
      buscarObrasCadastro();
  }, [telaAtiva, sessao, usuarioAtual, filtroStatusCadastroObras]);

  useEffect(() => {
    async function buscarDadosDashboard() {
      if (telaAtiva !== "dashboard" || !usuarioAtual) return;
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

        if (!isAdmin)
          queryObras = queryObras.eq("id_responsavel", idResponsavelEscopo);

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
                .in("id_obra", idsObras),
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

        setResumoReal({
          obrasAtivas: obras.length,
          tarefasAtrasadas,
          tarefasHoje,
        });
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

        setStatusProjetosPMIS(projetos);
        setProjetosCriticosPMIS(
          projetos
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
        console.error(error);
      }
    }

    buscarDadosDashboard();
  }, [telaAtiva, usuarioAtual]);

  const buscarContextoObraAta = async (idDaObra: any) => {
    if (!idDaObra) return setContextoObraAta(null);
    setCarregandoContextoAta(true);
    try {
      const hoje = dataHojeISO();
      const [tarefasResp, parcelasResp, cronogramaResp] = await Promise.all([
        supabase
          .from("tarefas")
          .select("id, titulo, data_vencimento, status")
          .eq("id_obra", idDaObra)
          .not("status", "in", "(concluida,cancelada)"),
        supabase
          .from("parcelas_cliente")
          .select("valor_previsto, valor_realizado, data_prevista")
          .eq("id_obra", idDaObra),
        supabase
          .from("cronograma_obra")
          .select("fase, status, fim_previsto")
          .eq("id_obra", idDaObra),
      ]);

      const tarefasAtrasadas = (tarefasResp.data || []).filter(
        (t: any) =>
          t.data_vencimento &&
          String(t.data_vencimento).split("T")[0] < hoje,
      );
      const valorVencido = (parcelasResp.data || []).reduce(
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
      const fasesAtrasadas = (cronogramaResp.data || []).filter(
        (f: any) =>
          f.status !== "concluido" &&
          f.status !== "cancelado" &&
          f.fim_previsto &&
          f.fim_previsto < hoje,
      );

      setContextoObraAta({
        tarefasAtrasadas,
        valorVencido,
        fasesAtrasadas,
      });
    } catch (error) {
      console.error(error);
      setContextoObraAta(null);
    } finally {
      setCarregandoContextoAta(false);
    }
  };

  const iniciarOuRetomarSessaoAta = async () => {
    try {
      const { data: sessaoAberta } = await supabase
        .from("reunioes_sessoes")
        .select("id, data_reuniao")
        .eq("status", "em_andamento")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sessaoAberta) return;
      if (String(sessaoAberta.data_reuniao).slice(0, 10) === new Date().toLocaleDateString("sv-SE"))
        setAbaReunioes("nova");

      const { data: reunioesDaSessao } = await supabase
        .from("reunioes")
        .select(
          `id, id_obra, data_reuniao, resumo_geral, obras(codigo_externo, nome, id_responsavel, usuarios(nome)), ocorrencias(id, tipo, descricao), tarefas(id, titulo, descricao, data_vencimento, id_responsavel, prioridade, usuarios(nome))`,
        )
        .eq("id_sessao", sessaoAberta.id);

      if (!reunioesDaSessao || reunioesDaSessao.length === 0) {
        setIdSessaoAtaAtual(sessaoAberta.id);
        setReuniaoForm((prev: any) => ({
          ...prev,
          data_reuniao: sessaoAberta.data_reuniao,
        }));
        return;
      }

      const obrasRecuperadas = reunioesDaSessao.map((r: any) => ({
        id_reuniao: r.id,
        id_obra: r.id_obra,
        id_gestor: r.obras?.id_responsavel || null,
        nome_gestor: r.obras?.usuarios?.nome || "Sem gestor definido",
        data_reuniao: r.data_reuniao,
        nome_obra: r.obras
          ? `${r.obras.codigo_externo} - ${r.obras.nome}`
          : "Obra Não Identificada",
        resumo: r.resumo_geral,
        ocorrencias: r.ocorrencias || [],
        tarefas: (r.tarefas || []).map((t: any) => ({
          ...t,
          nome_responsavel: t.usuarios?.nome || "Geral",
        })),
      }));

      setIdSessaoAtaAtual(sessaoAberta.id);
      setReuniaoForm((prev: any) => ({
        ...prev,
        data_reuniao: sessaoAberta.data_reuniao,
      }));
      setObrasNaAtaAtual(obrasRecuperadas);
      mostrarAviso(
        `Retomando ata em andamento (${obrasRecuperadas.length} obra(s) já registrada(s)).`,
      );
    } catch (error) {
      console.error(error);
    }
  };

  const buscarFaturamentosDaObra = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data } = await supabase
        .from("faturamentos")
        .select("id, numero_nf, tipo, valor, created_at, usuarios(nome)")
        .eq("id_obra", idDaObra)
        .order("created_at", { ascending: false });
      setFaturamentosObra(data || []);
    } catch (error) {
      console.log("Tabela de faturamentos ausente.");
    }
  };

  const buscarParcelasCliente = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("parcelas_cliente")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      setParcelasCliente(data || []);
    } catch (error) {
      console.error("Erro ao buscar parcelas do cliente:", error);
    }
  };

  const buscarDocumentosProjeto = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("documentos_projeto")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDocumentosProjeto(data || []);
    } catch (error) {
      console.error("Erro ao buscar documentos do projeto:", error);
    }
  };

  const buscarArquivosDocumentos = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("documentos_projeto_arquivos")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const agrupado = (data || []).reduce((acc: any, arquivo: any) => {
        if (!acc[arquivo.id_documento]) acc[arquivo.id_documento] = [];
        acc[arquivo.id_documento].push(arquivo);
        return acc;
      }, {});

      setArquivosDocumentos(agrupado);
    } catch (error) {
      console.error("Erro ao buscar anexos dos documentos:", error);
    }
  };

  const anexarArquivoDocumento = async (doc: any, arquivo: File | null) => {
    if (!obraEcoSelecionada || !doc?.id || !arquivo) return;

    const tamanhoMaximoMb = 25;
    if (arquivo.size > tamanhoMaximoMb * 1024 * 1024) {
      return mostrarAviso(`Arquivo maior que ${tamanhoMaximoMb} MB.`, "erro");
    }

    setUploadDocumentoId(doc.id);
    try {
      const nomeNormalizado = normalizarNomeArquivo(arquivo.name);
      const caminhoStorage = `obras/${obraEcoSelecionada.id}/documentos/${doc.id}/${Date.now()}_${nomeNormalizado}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-projeto")
        .upload(caminhoStorage, arquivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("documentos_projeto_arquivos")
        .insert([
          {
            id_documento: doc.id,
            id_obra: obraEcoSelecionada.id,
            id_usuario: usuarioAtual?.id || null,
            nome_arquivo: arquivo.name,
            caminho_storage: caminhoStorage,
            tipo_arquivo: arquivo.type || null,
            tamanho_bytes: arquivo.size,
          },
        ]);

      if (insertError) throw insertError;

      if (doc.status !== "concluido") {
        const hoje = new Date().toISOString().split("T")[0];
        await supabase
          .from("documentos_projeto")
          .update({
            status: "concluido",
            indicador: "verde",
            data_conclusao: doc.data_conclusao || hoje,
          })
          .eq("id", doc.id);
      }

      mostrarAviso("Arquivo anexado ao documento!");
      buscarDocumentosProjeto(obraEcoSelecionada.id);
      buscarArquivosDocumentos(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao anexar arquivo.", "erro");
    } finally {
      setUploadDocumentoId("");
    }
  };

  const abrirArquivoDocumento = async (arquivo: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documentos-projeto")
        .createSignedUrl(arquivo.caminho_storage, 60 * 10);

      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      mostrarAviso(
        error.message || "Não foi possível abrir o arquivo.",
        "erro",
      );
    }
  };

  const excluirArquivoDocumento = async (arquivo: any) => {
    if (!window.confirm(`Deseja excluir o anexo ${arquivo.nome_arquivo}?`))
      return;

    try {
      const { error: storageError } = await supabase.storage
        .from("documentos-projeto")
        .remove([arquivo.caminho_storage]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("documentos_projeto_arquivos")
        .delete()
        .eq("id", arquivo.id);

      if (dbError) throw dbError;

      mostrarAviso("Anexo excluído!");
      if (obraEcoSelecionada) buscarArquivosDocumentos(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao excluir anexo.", "erro");
    }
  };

  const buscarCronogramaObra = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("cronograma_obra")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("ordem", { ascending: true });
      if (error) throw error;
      setCronogramaObra(data || []);
    } catch (error) {
      console.error("Erro ao buscar cronograma da obra:", error);
    }
  };

  const buscarFamiliasFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_familias")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("ordem", { ascending: true });
      if (error) throw error;
      setFamiliasFaturamento(
        (data || []).sort((a, b) =>
          compararCodigoFamilia(a.codigo_familia, b.codigo_familia),
        ),
      );
    } catch (error) {
      console.error("Erro ao buscar famílias de faturamento:", error);
    }
  };

  const buscarGruposFaturamentoObra = async (idDaObra: any) => {
    if (!idDaObra) return;

    try {
      const { data, error } = await supabase
        .from("obra_faturamento_grupos")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("codigo", { ascending: true });

      if (error) throw error;

      setGruposFaturamentoObra(data || []);
    } catch (error) {
      console.error("Erro ao buscar grupos de faturamento:", error);
      setGruposFaturamentoObra([]);
    }
  };

  const buscarPrevisoesFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_previsoes")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("competencia", { ascending: true });
      if (error) throw error;
      setPrevisoesFaturamento(data || []);
    } catch (error) {
      console.error("Erro ao buscar previsões de faturamento:", error);
    }
  };

  const buscarRealizadosFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_realizados")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("competencia", { ascending: true });
      if (error) throw error;
      setRealizadosFaturamento(data || []);
    } catch (error) {
      console.error("Erro ao buscar faturamentos realizados:", error);
    }
  };


  const salvarParcelaCliente = async () => {
    const dataPrevistaISO = dataBRParaISO(
      novaParcelaCliente.data_prevista || "",
    );

    if (
      !obraEcoSelecionada ||
      !novaParcelaCliente.descricao ||
      !dataPrevistaISO ||
      !novaParcelaCliente.valor_previsto
    ) {
      return mostrarAviso(
        "Preencha descrição, data prevista válida e valor previsto da parcela.",
        "erro",
      );
    }

    setCarregando(true);
    try {
      const payload = {
        id_obra: obraEcoSelecionada.id,
        descricao: novaParcelaCliente.descricao,
        data_prevista: dataPrevistaISO,
        valor_previsto: Number(novaParcelaCliente.valor_previsto) || 0,
        data_realizada: null,
        valor_realizado: 0,
        status: "a_vencer",
        observacao: novaParcelaCliente.observacao || null,
      };

      const { error } = await supabase
        .from("parcelas_cliente")
        .insert([payload]);
      if (error) throw error;

      setNovaParcelaCliente({
        descricao: "",
        data_prevista: "",
        valor_previsto: "",
        observacao: "",
      });
      mostrarAviso("Parcela adicionada!");
      buscarParcelasCliente(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const abrirLiquidacaoParcela = (parcela: any) => {
    setParcelaParaLiquidar(parcela);
    setLiquidacaoParcela({
      data_recebimento:
        isoParaDataBR(parcela.data_realizada) || isoParaDataBR(dataHojeISO()),
      valor_recebido:
        parcela.valor_realizado && Number(parcela.valor_realizado) > 0
          ? String(parcela.valor_realizado)
          : String(parcela.valor_previsto || ""),
    });
  };

  const fecharLiquidacaoParcela = () => {
    setParcelaParaLiquidar(null);
    setLiquidacaoParcela({ data_recebimento: "", valor_recebido: "" });
  };

  const confirmarLiquidacaoParcela = async () => {
    if (!parcelaParaLiquidar || !obraEcoSelecionada) return;

    const dataRealizadaISO = dataBRParaISO(
      liquidacaoParcela.data_recebimento || "",
    );
    const valorRecebido = Number(liquidacaoParcela.valor_recebido) || 0;
    const valorPrevisto = Number(parcelaParaLiquidar.valor_previsto) || 0;

    if (!dataRealizadaISO)
      return mostrarAviso("Informe uma data de recebimento válida.", "erro");
    if (valorRecebido <= 0)
      return mostrarAviso("Informe um valor recebido maior que zero.", "erro");

    const novoStatus = valorRecebido >= valorPrevisto ? "pago" : "pago_parcial";

    setCarregando(true);
    try {
      const payload = {
        data_realizada: dataRealizadaISO,
        valor_realizado: valorRecebido,
        status: novoStatus,
      };

      const { error } = await supabase
        .from("parcelas_cliente")
        .update(payload)
        .eq("id", parcelaParaLiquidar.id);

      if (error) throw error;

      mostrarAviso(
        novoStatus === "pago"
          ? "Parcela liquidada!"
          : "Recebimento parcial registrado!",
      );
      fecharLiquidacaoParcela();
      buscarParcelasCliente(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const reabrirParcelaCliente = async (parcela: any) => {
    if (!parcela || !obraEcoSelecionada) return;
    if (
      !window.confirm(
        `Deseja reabrir a parcela "${parcela.descricao}"? A data de recebimento e o valor recebido serão zerados.`,
      )
    )
      return;

    setCarregando(true);
    try {
      const statusBase =
        parcela.data_prevista && parcela.data_prevista < dataHojeISO()
          ? "vencido"
          : "a_vencer";

      const { error } = await supabase
        .from("parcelas_cliente")
        .update({
          data_realizada: null,
          valor_realizado: 0,
          status: statusBase,
        })
        .eq("id", parcela.id);

      if (error) throw error;

      mostrarAviso("Parcela reaberta com sucesso!");
      buscarParcelasCliente(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const atualizarParcelaCliente = async (
    id: any,
    campo: string,
    valor: any,
  ) => {
    try {
      const payload: any = {
        [campo]: campo.includes("valor") ? Number(valor) || 0 : valor || null,
      };
      const { error } = await supabase
        .from("parcelas_cliente")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      setParcelasCliente((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [campo]: payload[campo] } : p)),
      );
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const salvarDocumentoProjeto = async () => {
    if (!obraEcoSelecionada || !novoDocumentoProjeto.item)
      return mostrarAviso("Informe o item do documento.", "erro");
    setCarregando(true);
    try {
      const payload = {
        id_obra: obraEcoSelecionada.id,
        item: novoDocumentoProjeto.item,
        detalhes: novoDocumentoProjeto.detalhes || null,
        status: "nao_elaborado",
        indicador: "vermelho",
        data_prevista: novoDocumentoProjeto.data_prevista || null,
        data_conclusao: novoDocumentoProjeto.data_conclusao || null,
        observacao: novoDocumentoProjeto.observacao || null,
      };
      const { error } = await supabase
        .from("documentos_projeto")
        .insert([payload]);
      if (error) throw error;
      setNovoDocumentoProjeto({
        item: "",
        detalhes: "",
        status: "nao_elaborado",
        indicador: "vermelho",
        data_prevista: "",
        data_conclusao: "",
        observacao: "",
      });
      mostrarAviso("Documento adicionado!");
      buscarDocumentosProjeto(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const atualizarDocumentoProjeto = async (
    id: any,
    campo: string,
    valor: any,
  ) => {
    try {
      const payload: any = { [campo]: valor || null };

      if (campo === "status") {
        payload.indicador = indicadorPorStatusDocumento(valor);
        if (valor === "concluido") payload.data_conclusao = dataHojeISO();
        if (valor !== "concluido") payload.data_conclusao = null;
      }

      const { error } = await supabase
        .from("documentos_projeto")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      setDocumentosProjeto((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...payload } : d)),
      );
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const iniciarDocumentoProjeto = async (doc: any) => {
    await atualizarDocumentoProjeto(doc.id, "status", "em_andamento");
    mostrarAviso("Documento marcado como em andamento.");
  };

  const concluirDocumentoProjeto = async (doc: any) => {
    await atualizarDocumentoProjeto(doc.id, "status", "concluido");
    mostrarAviso("Documento concluído.");
  };

  const reabrirDocumentoProjeto = async (doc: any) => {
    await atualizarDocumentoProjeto(doc.id, "status", "em_andamento");
    mostrarAviso("Documento reaberto.");
  };

  const atualizarCronogramaObra = async (
    id: any,
    campo: string,
    valor: any,
  ) => {
    try {
      const payload: any = { [campo]: valor || null };
      const { error } = await supabase
        .from("cronograma_obra")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
      setCronogramaObra((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [campo]: payload[campo] } : c)),
      );
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const abrirModalCronograma = (fase: any, acao: string) => {
    setFaseCronogramaModal(fase);
    setAcaoCronogramaModal(acao);

    if (acao === "editar_previsto") {
      setFormCronogramaModal({
        inicio_previsto: isoParaDataBR(
          fase.inicio_previsto || obraEcoSelecionada?.data_inicio || "",
        ),
        fim_previsto: isoParaDataBR(
          fase.fim_previsto || obraEcoSelecionada?.data_previsao_fim || "",
        ),
        observacao: fase.observacao || "",
      });
      return;
    }

    setFormCronogramaModal({
      data: isoParaDataBR(
        acao === "finalizar"
          ? fase.fim_real || dataHojeISO()
          : fase.inicio_real || dataHojeISO(),
      ),
      observacao: fase.observacao || "",
    });
  };

  const fecharModalCronograma = () => {
    setFaseCronogramaModal(null);
    setAcaoCronogramaModal("");
    setFormCronogramaModal({ data: "", observacao: "" });
  };

  const salvarAcaoCronograma = async () => {
    if (!faseCronogramaModal) return;

    try {
      const payload: any = {
        observacao: formCronogramaModal.observacao || null,
      };

      if (acaoCronogramaModal === "editar_previsto") {
        const inicioPrevistoISO = dataBRParaISO(
          formCronogramaModal.inicio_previsto || "",
        );
        const fimPrevistoISO = dataBRParaISO(
          formCronogramaModal.fim_previsto || "",
        );

        if (!inicioPrevistoISO || !fimPrevistoISO) {
          mostrarAviso(
            "Informe início previsto e prazo de entrega no formato dd/mm/aaaa.",
            "erro",
          );
          return;
        }

        if (inicioPrevistoISO > fimPrevistoISO) {
          mostrarAviso(
            "O início previsto não pode ser maior que o prazo de entrega.",
            "erro",
          );
          return;
        }

        payload.inicio_previsto = inicioPrevistoISO;
        payload.fim_previsto = fimPrevistoISO;
      } else {
        const dataISO = dataBRParaISO(formCronogramaModal.data || "");
        if (!dataISO) {
          mostrarAviso(
            "Informe uma data válida no formato dd/mm/aaaa.",
            "erro",
          );
          return;
        }

        if (acaoCronogramaModal === "iniciar") {
          payload.inicio_real = dataISO;
          payload.fim_real = null;
          payload.status = "em_andamento";
        }

        if (acaoCronogramaModal === "finalizar") {
          payload.inicio_real = faseCronogramaModal.inicio_real || dataISO;
          payload.fim_real = dataISO;
          payload.status = "concluido";
        }
      }

      const { error } = await supabase
        .from("cronograma_obra")
        .update(payload)
        .eq("id", faseCronogramaModal.id);

      if (error) throw error;

      setCronogramaObra((prev) =>
        prev.map((c) =>
          c.id === faseCronogramaModal.id ? { ...c, ...payload } : c,
        ),
      );
      mostrarAviso(
        acaoCronogramaModal === "editar_previsto"
          ? "Prazos previstos atualizados."
          : acaoCronogramaModal === "finalizar"
            ? "Fase finalizada."
            : "Fase iniciada.",
      );
      fecharModalCronograma();
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const reabrirFaseCronograma = async (fase: any) => {
    try {
      const payload: any = { fim_real: null, status: "em_andamento" };
      const { error } = await supabase
        .from("cronograma_obra")
        .update(payload)
        .eq("id", fase.id);
      if (error) throw error;
      setCronogramaObra((prev) =>
        prev.map((c) => (c.id === fase.id ? { ...c, ...payload } : c)),
      );
      mostrarAviso("Fase reaberta.");
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const zerarFaseCronograma = async (fase: any) => {
    if (
      !window.confirm(
        `Deseja zerar a fase ${labelFase(fase.fase)} e voltar para Não iniciado?`,
      )
    )
      return;

    try {
      const payload: any = {
        inicio_real: null,
        fim_real: null,
        status: "nao_iniciado",
        observacao: null,
      };
      const { error } = await supabase
        .from("cronograma_obra")
        .update(payload)
        .eq("id", fase.id);
      if (error) throw error;
      setCronogramaObra((prev) =>
        prev.map((c) => (c.id === fase.id ? { ...c, ...payload } : c)),
      );
      mostrarAviso("Fase voltou para Não iniciado.");
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const deletarRegistroPMIS = async (tabela: string, id: any) => {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;
      mostrarAviso("Registro excluído!");
      if (obraEcoSelecionada) {
        if (tabela === "parcelas_cliente")
          buscarParcelasCliente(obraEcoSelecionada.id);
        if (tabela === "documentos_projeto") {
          buscarDocumentosProjeto(obraEcoSelecionada.id);
          buscarArquivosDocumentos(obraEcoSelecionada.id);
        }
      }
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  useEffect(() => {
    if (telaAtiva === "reunioes" && reuniaoForm.id_obra) {
      buscarContextoObraAta(reuniaoForm.id_obra);
    }
    if (telaAtiva === "painel_obra" && obraEcoSelecionada) {
      buscarFaturamentosDaObra(obraEcoSelecionada.id);
      buscarParcelasCliente(obraEcoSelecionada.id);
      buscarDocumentosProjeto(obraEcoSelecionada.id);
      buscarArquivosDocumentos(obraEcoSelecionada.id);
      buscarCronogramaObra(obraEcoSelecionada.id);
      buscarFamiliasFaturamento(obraEcoSelecionada.id);
      buscarGruposFaturamentoObra(obraEcoSelecionada.id);
      buscarPrevisoesFaturamento(obraEcoSelecionada.id);
      buscarRealizadosFaturamento(obraEcoSelecionada.id);
    }
  }, [reuniaoForm.id_obra, telaAtiva, obraEcoSelecionada]);

  useEffect(() => {
    if (
      telaAtiva === "reunioes" &&
      usuarioAtual &&
      !idSessaoAtaAtual &&
      obrasNaAtaAtual.length === 0
    )
      iniciarOuRetomarSessaoAta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telaAtiva, usuarioAtual]);

  useEffect(() => {
    if (telaAtiva !== "reunioes" || !reuniaoForm.data_reuniao) return;
    let cancelado = false;
    supabase
      .from("reunioes_sessoes")
      .select("resumo_gravacao, gravacao_duracao_seg")
      .eq("data_reuniao", reuniaoForm.data_reuniao)
      .not("resumo_gravacao", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        setGravacaoAta(
          data?.resumo_gravacao
            ? {
                resumo: data.resumo_gravacao,
                duracaoSeg: data.gravacao_duracao_seg ?? null,
              }
            : null,
        );
      });
    return () => {
      cancelado = true;
    };
  }, [telaAtiva, reuniaoForm.data_reuniao]);

  const buscarTarefasKanban = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("tarefas")
        .select(
          `id, id_obra, titulo, descricao, status, data_vencimento, id_responsavel, created_at, origem, prioridade, data_conclusao, observacao_conclusao, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`,
        )
        .order("created_at", { ascending: false });
      if (!isAdmin) {
        const { data: obrasUsuario } = await supabase
          .from("obras")
          .select("id")
          .eq("id_responsavel", idResponsavelEscopo);
        const idsMinhasObras = obrasUsuario?.map((o) => o.id) || [];
        if (idsMinhasObras.length > 0)
          query = query.or(
            `id_responsavel.eq.${usuarioAtual.id},id_obra.in.(${idsMinhasObras.join(",")})`,
          );
        else query = query.eq("id_responsavel", usuarioAtual.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setTarefasKanban(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (
      telaAtiva === "tarefas" ||
      telaAtiva === "painel_obra" ||
      telaAtiva === "dashboard"
    )
      buscarTarefasKanban();
  }, [telaAtiva, usuarioAtual]);

  useEffect(() => {
    const buscarComentarios = async () => {
      if (!tarefaSelecionada) return;
      try {
        const { data } = await supabase
          .from("comentarios_tarefa")
          .select("id, texto, created_at, usuarios(nome)")
          .eq("id_tarefa", tarefaSelecionada.id)
          .order("created_at", { ascending: true });
        setComentariosTarefaAtual(data || []);
      } catch (error) {
        console.log("Tabela de comentários ausente.");
      }
    };
    buscarComentarios();
  }, [tarefaSelecionada]);

  const adicionarComentario = async () => {
    if (!novoComentarioTexto.trim() || !tarefaSelecionada) return;
    try {
      const { error } = await supabase.from("comentarios_tarefa").insert([
        {
          id_tarefa: tarefaSelecionada.id,
          id_usuario: usuarioAtual?.id,
          texto: novoComentarioTexto,
        },
      ]);
      if (error) throw error;
      setNovoComentarioTexto("");
      const { data } = await supabase
        .from("comentarios_tarefa")
        .select("id, texto, created_at, usuarios(nome)")
        .eq("id_tarefa", tarefaSelecionada.id)
        .order("created_at", { ascending: true });
      setComentariosTarefaAtual(data || []);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const salvarEdicaoReuniao = async () => {
    setCarregando(true);
    try {
      const { error } = await supabase
        .from("reunioes")
        .update({
          resumo_geral: reuniaoEmEdicao.resumo_geral,
        })
        .eq("id", reuniaoEmEdicao.id);
      if (error) throw error;
      mostrarAviso("Resumo atualizado com sucesso!");
      setReuniaoEmEdicao(null);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const adicionarFaturamento = async () => {
    if (
      !novoFaturamento.numero_nf ||
      !novoFaturamento.valor ||
      !obraEcoSelecionada
    )
      return mostrarAviso("Preencha o Número da NF e o Valor", "erro");
    setCarregando(true);
    try {
      const { error } = await supabase.from("faturamentos").insert([
        {
          id_obra: obraEcoSelecionada.id,
          id_usuario: usuarioAtual?.id,
          numero_nf: novoFaturamento.numero_nf,
          tipo: novoFaturamento.tipo,
          valor: novoFaturamento.valor,
        },
      ]);
      if (error) throw error;
      setNovoFaturamento({ numero_nf: "", tipo: "produto", valor: "" });
      mostrarAviso("Faturamento registrado com sucesso!");
      buscarFaturamentosDaObra(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  const deletarItemHistorico = async (
    tabela: string,
    id: any,
    descricao: string,
  ) => {
    if (
      !window.confirm(
        `Tem a certeza que deseja excluir ${descricao}? Esta ação é irreversível.`,
      )
    )
      return;
    setCarregando(true);
    try {
      if (tabela === "reunioes") {
        await supabase.from("ocorrencias").delete().eq("id_reuniao", id);
        await supabase.from("tarefas").delete().eq("id_reuniao_origem", id);
      }
      const { error } = await supabase.from(tabela).delete().eq("id", id);
      if (error) throw error;

      mostrarAviso(`Excluído com sucesso!`);
      if (tabela === "tarefas") buscarTarefasKanban();
      if (tabela === "faturamentos")
        buscarFaturamentosDaObra(obraEcoSelecionada?.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  async function salvarUsuario(e: any) {
    e.preventDefault();
    setCarregando(true);
    try {
      const dadosUsuario = {
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        perfil: novoUsuario.perfil,
        id_engenheiro_vinculado:
          novoUsuario.perfil === "assistente"
            ? novoUsuario.id_engenheiro_vinculado || null
            : null,
      };

      if (novoUsuario.id) {
        const { error } = await supabase
          .from("usuarios")
          .update(dadosUsuario)
          .eq("id", novoUsuario.id);
        if (error) throw error;
        mostrarAviso("Colaborador atualizado!");
      } else {
        const { error } = await supabase.from("usuarios").insert([dadosUsuario]);
        if (error) throw error;
        mostrarAviso("Registado com sucesso!");
      }
      setNovoUsuario({
        id: null,
        nome: "",
        email: "",
        perfil: "engenheiro",
        id_engenheiro_vinculado: "",
      });
      buscarUsuarios();
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  }

  const editarUsuario = (usuario: any) => {
    setNovoUsuario({
      id: usuario.id,
      nome: usuario.nome || "",
      email: usuario.email || "",
      perfil: usuario.perfil || "engenheiro",
      id_engenheiro_vinculado: usuario.id_engenheiro_vinculado || "",
    });
    setTimeout(() => {
      document
        .getElementById("form-cadastro-colaborador")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const cancelarEdicaoUsuario = () => {
    setNovoUsuario({
      id: null,
      nome: "",
      email: "",
      perfil: "engenheiro",
      id_engenheiro_vinculado: "",
    });
  };

  async function salvarObra(e: any) {
    e.preventDefault();
    setErroObra("");

    if (
      !isAdmin &&
      usuarioAtual?.perfil !== "engenheiro" &&
      usuarioAtual?.perfil !== "assistente"
    ) {
      setErroObra(
        "O responsável por uma obra deve ser sempre um Engenheiro. Seu perfil não pode cadastrar obras.",
      );
      return;
    }

    const responsavelObra = isAdmin
      ? novaObra.id_responsavel
      : idResponsavelEscopo;

    if (
      !novaObra.codigo_externo ||
      !novaObra.nome ||
      !novaObra.data_inicio ||
      !novaObra.data_previsao_fim ||
      !responsavelObra
    ) {
      setErroObra("Todos os campos obrigatórios.");
      return;
    }
    setCarregando(true);
    try {
      const dadosObra = {
        codigo_externo: novaObra.codigo_externo,
        nome: novaObra.nome,
        descricao: novaObra.descricao || null,
        fase_atual: novaObra.fase_atual || "processo_inicial",
        observacoes: novaObra.observacoes || null,
        data_inicio: novaObra.data_inicio,
        data_previsao_fim: novaObra.data_previsao_fim,
        id_responsavel: responsavelObra,
        valor_produto: novaObra.valor_produto || 0,
        valor_servico: novaObra.valor_servico || 0,
        status: "em_andamento",
      };

      if (novaObra.id) {
        const { error } = await supabase
          .from("obras")
          .update(dadosObra)
          .eq("id", novaObra.id);
        if (error) throw error;
        mostrarAviso("Obra atualizada!");
      } else {
        const { data: obraCriada, error } = await supabase
          .from("obras")
          .insert([dadosObra])
          .select()
          .single();
        if (error) throw error;

        if (obraCriada?.id) {
          const { error: erroCronograma } = await supabase.rpc(
            "criar_cronograma_padrao_obra",
            { p_id_obra: obraCriada.id },
          );
          if (erroCronograma)
            console.warn("Cronograma padrão não criado:", erroCronograma);

          const { error: erroDocumentos } = await supabase.rpc(
            "criar_documentos_padrao_obra",
            { p_id_obra: obraCriada.id },
          );
          if (erroDocumentos)
            console.warn("Documentos padrão não criados:", erroDocumentos);
        }

        mostrarAviso("Obra salva com cronograma e documentos padrão!");
      }

      setNovaObra({
        id: null,
        codigo_externo: "",
        nome: "",
        descricao: "",
        fase_atual: "processo_inicial",
        data_inicio: "",
        data_previsao_fim: "",
        id_responsavel: "",
        valor_produto: "",
        valor_servico: "",
        observacoes: "",
      });
      buscarObras();
      buscarObrasCadastro();
      setTelaAtiva("cadastros_obras");
    } catch (error: any) {
      setErroObra("Erro: " + error.message);
    } finally {
      setCarregando(false);
    }
  }

  const abrirPainelObra = async (obra: any) => {
    // Mostra o card clicado na hora (alguns lugares, ex: cards do Dashboard PMIS,
    // trazem so um subconjunto de colunas), depois busca a linha completa da obra -
    // sem isso, campos como "observacoes" (ex: alertas do robo) ficavam sempre vazios
    // quando o painel era aberto a partir do Dashboard.
    setObraEcoSelecionada(obra);
    setFiltroObraKanban(obra.id);
    setAbaPainelObra("resumo");
    setTelaAtiva("painel_obra");
    try {
      const { data } = await supabase
        .from("obras")
        .select(
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, valor_produto, valor_servico, status, data_finalizacao, observacao_finalizacao, data_cancelamento, motivo_cancelamento, observacao_cancelamento, usuarios(nome)",
        )
        .eq("id", obra.id)
        .single();
      if (data) setObraEcoSelecionada(data);
    } catch (error) {
      console.error(error);
    }
  };

  const editarObra = (obra: any) => {
    setNovaObra({
      id: obra.id,
      codigo_externo: obra.codigo_externo || "",
      nome: obra.nome || "",
      descricao: obra.descricao || "",
      fase_atual: obra.fase_atual || "processo_inicial",
      data_inicio: obra.data_inicio || "",
      data_previsao_fim: obra.data_previsao_fim || "",
      id_responsavel: obra.id_responsavel || "",
      valor_produto: obra.valor_produto ?? "",
      valor_servico: obra.valor_servico ?? "",
      observacoes: obra.observacoes || "",
    });
    setTelaAtiva("cadastros_obras");
    setTimeout(() => {
      document
        .getElementById("form-cadastro-obra")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const cancelarEdicaoObra = () => {
    setNovaObra({
      id: null,
      codigo_externo: "",
      nome: "",
      descricao: "",
      fase_atual: "processo_inicial",
      data_inicio: "",
      data_previsao_fim: "",
      id_responsavel: "",
      valor_produto: "",
      valor_servico: "",
      observacoes: "",
    });
    setErroObra("");
  };

  const atualizarStatusTarefa = async (idTarefa: any, novoStatus: any) => {
    try {
      const payload: any = { status: novoStatus, updated_at: new Date().toISOString() };
      if (novoStatus === "concluida") payload.data_conclusao = new Date().toISOString();
      if (["pendente", "em_andamento"].includes(novoStatus)) payload.data_conclusao = null;

      await supabase
        .from("tarefas")
        .update(payload)
        .eq("id", idTarefa);
      buscarTarefasKanban();
      mostrarAviso("Status atualizado!");
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const cancelarTarefa = async (tarefa: any) => {
    if (!tarefa?.id) return;
    if (!window.confirm(`Deseja cancelar a tarefa "${tarefa.titulo}"? Ela sairá das tarefas abertas, mas continuará disponível no histórico.`)) return;

    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          status: "cancelada",
          updated_at: new Date().toISOString(),
          data_conclusao: null,
        })
        .eq("id", tarefa.id);

      if (error) throw error;

      setTarefaSelecionada(null);
      buscarTarefasKanban();
      mostrarAviso("Tarefa cancelada com sucesso!");
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const atualizarDataTarefa = async (idTarefa: any, novaData: any) => {
    try {
      await supabase
        .from("tarefas")
        .update({ data_vencimento: novaData || null })
        .eq("id", idTarefa);
      if (tarefaSelecionada)
        setTarefaSelecionada({ ...tarefaSelecionada, data_vencimento: novaData });
      buscarTarefasKanban();
      mostrarAviso("Prazo atualizado!");
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    }
  };

  const adicionarOcorrencia = () => {
    if (!novaOcorrencia.descricao) return;
    setListaOcorrencias([...listaOcorrencias, novaOcorrencia]);
    setNovaOcorrencia({ tipo: "avanco", descricao: "" });
  };
  const adicionarTarefa = () => {
    if (!novaTarefa.titulo || !novaTarefa.id_responsavel)
      return mostrarAviso("Preencha título e responsável.", "erro");
    const nomeResp =
      listaUsuarios.find((u) => u.id === novaTarefa.id_responsavel)?.nome || "";
    setListaTarefas([
      ...listaTarefas,
      { ...novaTarefa, nome_responsavel: nomeResp },
    ]);
    setNovaTarefa({
      titulo: "",
      descricao: "",
      data_vencimento: "",
      id_responsavel: "",
      prioridade: "normal",
    });
  };

  const abrirModalNovaTarefaObra = () => {
    setNovaTarefaObra({
      titulo: "",
      descricao: "",
      data_vencimento: "",
      id_responsavel: usuarioAtual?.id || "",
      prioridade: "normal",
    });
    setModalNovaTarefaObraAberto(true);
  };

  const salvarTarefaObra = async () => {
    if (!obraEcoSelecionada) return;
    if (!novaTarefaObra.titulo || !novaTarefaObra.id_responsavel) {
      return mostrarAviso("Preencha título e responsável.", "erro");
    }

    setCarregando(true);
    try {
      const { data: tarefaCriada, error } = await supabase
        .from("tarefas")
        .insert([
          {
            id_obra: obraEcoSelecionada.id,
            id_reuniao_origem: null,
            titulo: novaTarefaObra.titulo,
            descricao: novaTarefaObra.descricao || null,
            data_vencimento: novaTarefaObra.data_vencimento || null,
            id_responsavel: novaTarefaObra.id_responsavel,
            prioridade: novaTarefaObra.prioridade || "normal",
            origem: "avulsa",
            status: "pendente",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (tarefaCriada) {
        enviarEmailAtribuicaoTarefa(tarefaCriada.id, {
          titulo: novaTarefaObra.titulo,
          descricao: novaTarefaObra.descricao,
          data_vencimento: novaTarefaObra.data_vencimento || null,
          id_responsavel: novaTarefaObra.id_responsavel,
          nome_obra: `${obraEcoSelecionada.codigo_externo} - ${obraEcoSelecionada.nome}`,
        });
      }

      mostrarAviso("Tarefa criada na obra!");
      setModalNovaTarefaObraAberto(false);
      setNovaTarefaObra({
        titulo: "",
        descricao: "",
        data_vencimento: "",
        id_responsavel: "",
        prioridade: "normal",
      });
      buscarTarefasKanban();
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  };

  async function salvarReuniaoObra() {
    if (!reuniaoForm.id_obra)
      return mostrarAviso("Selecione uma obra.", "erro");
    setCarregando(true);
    try {
      const obraSelecionada = obrasLista.find(
        (o) => o.id === reuniaoForm.id_obra,
      );

      let idSessao = idSessaoAtaAtual;
      if (!idSessao) {
        const { data: sessaoCriada, error: errSessao } = await supabase
          .from("reunioes_sessoes")
          .insert([
            {
              data_reuniao: reuniaoForm.data_reuniao,
              id_criador: usuarioAtual?.id,
            },
          ])
          .select()
          .single();
        if (errSessao) throw errSessao;
        idSessao = sessaoCriada.id;
        setIdSessaoAtaAtual(sessaoCriada.id);
      }

      const { data: reuniaoSalva, error: errReuniao } = await supabase
        .from("reunioes")
        .insert([
          {
            id_obra: reuniaoForm.id_obra,
            id_sessao: idSessao,
            data_reuniao: reuniaoForm.data_reuniao,
            resumo_geral: reuniaoForm.resumo_geral,
          },
        ])
        .select()
        .single();
      if (errReuniao) throw errReuniao;

      if (listaOcorrencias.length > 0)
        await supabase.from("ocorrencias").insert(
          listaOcorrencias.map((o) => ({
            id_reuniao: reuniaoSalva.id,
            id_obra: reuniaoForm.id_obra,
            tipo: o.tipo,
            descricao: o.descricao,
          })),
        );
      if (listaTarefas.length > 0) {
        const { data: tarefasCriadas } = await supabase
          .from("tarefas")
          .insert(
            listaTarefas.map((t) => ({
              id_obra: reuniaoForm.id_obra,
              id_reuniao_origem: reuniaoSalva.id,
              titulo: t.titulo,
              descricao: t.descricao || null,
              data_vencimento: t.data_vencimento || null,
              id_responsavel: t.id_responsavel,
              prioridade: t.prioridade || "normal",
              origem: "reuniao",
              status: "pendente",
            })),
          )
          .select();

        (tarefasCriadas || []).forEach((tarefaCriada: any) => {
          enviarEmailAtribuicaoTarefa(tarefaCriada.id, {
            titulo: tarefaCriada.titulo,
            descricao: tarefaCriada.descricao,
            data_vencimento: tarefaCriada.data_vencimento,
            id_responsavel: tarefaCriada.id_responsavel,
            nome_obra: obraSelecionada
              ? `${obraSelecionada.codigo_externo} - ${obraSelecionada.nome}`
              : undefined,
          });
        });
      }

      const registroObraAta = {
        id_reuniao: reuniaoSalva.id,
        id_obra: obraSelecionada?.id,
        id_gestor: obraSelecionada?.id_responsavel || null,
        nome_gestor: obraSelecionada?.usuarios?.nome || "Sem gestor definido",
        data_reuniao: reuniaoForm.data_reuniao,
        nome_obra: obraSelecionada
          ? `${obraSelecionada.codigo_externo} - ${obraSelecionada.nome}`
          : "Obra Não Identificada",
        resumo: reuniaoForm.resumo_geral,
        ocorrencias: [...listaOcorrencias],
        tarefas: [...listaTarefas],
      };
      setObrasNaAtaAtual((prev: any) => [...prev, registroObraAta]);

      mostrarAviso(
        `${obraSelecionada?.nome || "Obra"} salva! Vá para a próxima.`,
      );
      setReuniaoForm((prev: any) => ({
        ...prev,
        id_obra: "",
        resumo_geral: "",
      }));
      setListaOcorrencias([]);
      setListaTarefas([]);
      setContextoObraAta(null);
      setTelaAtiva("reunioes");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      mostrarAviso("Erro: " + error.message, "erro");
    } finally {
      setCarregando(false);
    }
  }

  const editarRegistroAta = async (registro: any, index: number) => {
    if (
      !window.confirm(
        `Deseja reabrir ${registro.nome_obra} para edição? O registo atual será removido até que você salve novamente.`,
      )
    )
      return;
    setCarregando(true);
    try {
      await supabase
        .from("ocorrencias")
        .delete()
        .eq("id_reuniao", registro.id_reuniao);
      await supabase
        .from("tarefas")
        .delete()
        .eq("id_reuniao_origem", registro.id_reuniao);
      await supabase.from("reunioes").delete().eq("id", registro.id_reuniao);

      setObrasNaAtaAtual((prev: any) =>
        prev.filter((_: any, i: number) => i !== index),
      );

      setGestorSelecionadoAta(registro.id_gestor || "");
      setReuniaoForm({
        id_obra: registro.id_obra,
        data_reuniao:
          registro.data_reuniao || new Date().toISOString().split("T")[0],
        resumo_geral: registro.resumo,
      });
      setListaOcorrencias(registro.ocorrencias || []);
      setListaTarefas(registro.tarefas || []);
      mostrarAviso(
        "Rascunho recuperado! Faça as alterações e salve novamente.",
      );
    } catch (error: any) {
      mostrarAviso("Erro ao recuperar rascunho: " + error.message, "erro");
    } finally {
      setCarregando(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const agruparObrasPorGestor = (lista: any[]) => {
    const grupos = new Map<string, any[]>();
    lista.forEach((obra) => {
      const chave = obra.nome_gestor || "Sem gestor definido";
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(obra);
    });
    return Array.from(grupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([nomeGestor, obras]) => ({ nomeGestor, obras }));
  };

  const enviarEmailAtribuicaoTarefa = async (
    idTarefa: string,
    dados: {
      titulo: string;
      descricao?: string | null;
      data_vencimento?: string | null;
      id_responsavel: string;
      nome_obra?: string;
    },
  ) => {
    try {
      const responsavel = listaUsuarios.find(
        (u) => u.id === dados.id_responsavel,
      );
      if (!responsavel?.email) return;

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #2A6377;">Nova tarefa atribuída a você</h2>
          <p><strong>${dados.titulo}</strong></p>
          ${dados.descricao ? `<p style="color:#475569;">${dados.descricao}</p>` : ""}
          ${dados.nome_obra ? `<p><strong>Obra:</strong> ${dados.nome_obra}</p>` : ""}
          ${dados.data_vencimento ? `<p><strong>Prazo:</strong> ${formatarDataSegura(dados.data_vencimento)}</p>` : ""}
          <p style="margin-top:24px; font-size:12px; color:#94a3b8;">Gerado via Kalter Sistema de Gestão de Obras</p>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke("enviar-email", {
        body: {
          to: [responsavel.email],
          subject: `Nova tarefa: ${dados.titulo}`,
          html,
        },
      });
      if (!error && !data?.error) {
        await supabase
          .from("tarefas")
          .update({ email_atribuicao_enviado: true })
          .eq("id", idTarefa);
      }
    } catch (error) {
      console.error("Erro ao enviar e-mail de atribuição de tarefa:", error);
    }
  };

  const destinatariosAta = () => {
    const emails = listaUsuarios
      .filter((u) =>
        ["admin", "engenheiro", "gestor", "logistica"].includes(
          u.perfil || "",
        ),
      )
      .map((u) => u.email)
      .filter(Boolean);
    return [...new Set(emails)] as string[];
  };

  const enviarAtaPorEmailResend = async (
    listaObras: any[],
    dataAta: string,
    resumoGravacao?: string | null,
  ) => {
    const destinatarios = destinatariosAta();
    if (destinatarios.length === 0)
      return { ok: false, erro: "Nenhum destinatário com e-mail cadastrado." };
    try {
      const html = montarHtmlAta(
        listaObras,
        dataAta,
        resumoGravacao === undefined ? gravacaoAta?.resumo : resumoGravacao,
      );
      const { data, error } = await supabase.functions.invoke(
        "enviar-email",
        {
          body: {
            to: destinatarios,
            subject: `Ata de Reunião de Obras - ${dataAta}`,
            html,
          },
        },
      );
      if (error) throw error;
      if (data?.error)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error),
        );
      return { ok: true, destinatarios };
    } catch (error: any) {
      return {
        ok: false,
        erro: error.message || "Erro ao enviar e-mail.",
        destinatarios,
      };
    }
  };

  const gerarAtaFinal = async () => {
    if (obrasNaAtaAtual.length === 0)
      return mostrarAviso("Você não salvou obras.", "erro");
    const dataHj = formatarDataSegura(reuniaoForm.data_reuniao);
    let textoAta = `ATA DE REUNIÃO DE OBRAS - KALTER\nData: ${dataHj}\n\n`;
    agruparObrasPorGestor(obrasNaAtaAtual).forEach(({ nomeGestor, obras }) => {
      textoAta += `\n##########################################\nGESTOR: ${nomeGestor.toUpperCase()}\n##########################################\n`;
      obras.forEach((obra) => {
        textoAta += `\n==========================================\nOBRA: ${obra.nome_obra.toUpperCase()}\n==========================================\n`;
        if (obra.resumo) textoAta += `Resumo: ${obra.resumo}\n\n`;
        if (obra.ocorrencias.length > 0) {
          textoAta += `[ Ocorrências ]\n`;
          obra.ocorrencias.forEach(
            (oc: any) =>
              (textoAta += `- (${labelOcorrencia(oc.tipo).toUpperCase()}): ${oc.descricao}\n`),
          );
          textoAta += `\n`;
        }
        if (obra.tarefas.length > 0) {
          textoAta += `[ Tarefas ]\n`;
          obra.tarefas.forEach(
            (t: any) =>
              (textoAta += `- ${t.titulo} (Resp: ${t.nome_responsavel} | Prazo: ${formatarDataSegura(t.data_vencimento)})\n`),
          );
          textoAta += `\n`;
        }
      });
    });
    setAtaGerada(textoAta);
    setModalAtaAberto(true);
    setStatusEnvioEmailAta(null);

    if (idSessaoAtaAtual) {
      await supabase
        .from("reunioes_sessoes")
        .update({ status: "fechada", fechada_at: new Date().toISOString() })
        .eq("id", idSessaoAtaAtual);
    }

    setEnviandoEmailAta(true);
    const resultado = await enviarAtaPorEmailResend(obrasNaAtaAtual, dataHj);
    setEnviandoEmailAta(false);
    setStatusEnvioEmailAta(resultado);
    if (resultado.ok) {
      mostrarAviso("Ata enviada por e-mail automaticamente!");
    } else {
      mostrarAviso(
        `Ata gerada, mas o envio automático falhou: ${resultado.erro}`,
        "erro",
      );
    }
  };

  const reenviarAtaPorEmail = async () => {
    setEnviandoEmailAta(true);
    const dataHj = formatarDataSegura(reuniaoForm.data_reuniao);
    const resultado = await enviarAtaPorEmailResend(obrasNaAtaAtual, dataHj);
    setEnviandoEmailAta(false);
    setStatusEnvioEmailAta(resultado);
    mostrarAviso(
      resultado.ok ? "Ata reenviada!" : `Falha ao reenviar: ${resultado.erro}`,
      resultado.ok ? "sucesso" : "erro",
    );
  };

  const fecharModalAta = () => {
    setModalAtaAberto(false);
    setObrasNaAtaAtual([]);
    setIdSessaoAtaAtual(null);
    setGestorSelecionadoAta("");
    setStatusEnvioEmailAta(null);
    setAbaReunioes("historico");
    setVersaoHistoricoReunioes((v) => v + 1);
  };

  const isAtrasada = (dataVencimento: any, status: any) => {
    if (!dataVencimento || status === "concluida" || status === "cancelada") return false;
    return dataVencimento < new Date().toISOString().split("T")[0];
  };
  const tarefasFiltradas =
    filtroObraKanban === "todas"
      ? tarefasKanban || []
      : (tarefasKanban || []).filter((t) => t?.id_obra === filtroObraKanban);
  const tarefasPainelObra = tarefasFiltradas.filter((t) => {
    if (filtroTarefasObra === "todas") return true;
    if (filtroTarefasObra === "abertas") return !["concluida", "cancelada"].includes(t.status ?? "");
    if (filtroTarefasObra === "atrasadas")
      return isAtrasada(t.data_vencimento, t.status);
    return t.status === filtroTarefasObra;
  });
  const tarefasDashboard = tarefasKanban
    .filter(
      (t) => !["concluida", "cancelada"].includes(t.status ?? "") && t.id_responsavel === usuarioAtual?.id,
    )
    .slice(0, 6);

  const obrasListaOrdenada = [...obrasLista].sort((a, b) => {
    if (ordenacaoMinhasObras === "nome") {
      return (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
        sensitivity: "base",
      });
    }
    const codigoA = Number(a.codigo_externo);
    const codigoB = Number(b.codigo_externo);
    if (!isNaN(codigoA) && !isNaN(codigoB)) return codigoA - codigoB;
    return String(a.codigo_externo || "").localeCompare(
      String(b.codigo_externo || ""),
      "pt-BR",
      { sensitivity: "base" },
    );
  });

  const gestoresComObrasAta: [string, string][] = Array.from(
    new Map(
      obrasLista
        .filter((o: any) => o.id_responsavel)
        .map((o: any) => [
          o.id_responsavel as string,
          (o.usuarios?.nome || "Sem nome") as string,
        ]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

  // CÁLCULOS DO FINANCEIRO
  const totalVendaProduto = Number(obraEcoSelecionada?.valor_produto) || 0;
  const totalVendaServico = Number(obraEcoSelecionada?.valor_servico) || 0;
  const totalVendaGeral = totalVendaProduto + totalVendaServico;

  const totalFaturadoProduto = faturamentosObra
    .filter((f) => f.tipo === "produto")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalFaturadoServico = faturamentosObra
    .filter((f) => f.tipo === "servico")
    .reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalFaturadoGeral = totalFaturadoProduto + totalFaturadoServico;

  const saldoProduto = totalVendaProduto - totalFaturadoProduto;
  const saldoServico = totalVendaServico - totalFaturadoServico;
  const saldoGeral = totalVendaGeral - totalFaturadoGeral;

  const percentualGeral =
    totalVendaGeral > 0
      ? Math.min(Math.round((totalFaturadoGeral / totalVendaGeral) * 100), 100)
      : 0;

  // Mantém funções/variáveis legadas disponíveis sem bloquear o build por noUnusedLocals.
  void labelStatusParcela;
  void corIndicador;
  void baixarPDFDiaEspecifico;
  void atualizarParcelaCliente;
  void atualizarCronogramaObra;
  void adicionarFaturamento;
  void deletarItemHistorico;
  void saldoProduto;
  void saldoServico;
  void saldoGeral;
  void percentualGeral;
  void resumoReal;

  const totalPrevistoParcelas = parcelasCliente.reduce(
    (acc, curr) => acc + Number(curr.valor_previsto || 0),
    0,
  );
  const totalRealizadoParcelas = parcelasCliente.reduce(
    (acc, curr) => acc + Number(curr.valor_realizado || 0),
    0,
  );
  const saldoReceberParcelas = totalVendaGeral - totalRealizadoParcelas;
  const valorRestanteDistribuir = totalVendaGeral - totalPrevistoParcelas;
  const valorRestanteDistribuirPositivo = Math.max(valorRestanteDistribuir, 0);
  const valorDistribuidoExcedente = Math.max(
    totalPrevistoParcelas - totalVendaGeral,
    0,
  );
  const parcelasVencidas = parcelasCliente.filter(
    (p) =>
      calcularStatusParcela(p) === "pendente" &&
      p.data_prevista &&
      p.data_prevista < dataHojeISO(),
  ).length;
  const documentosConcluidos = documentosProjeto.filter(
    (d) => d.status === "concluido",
  ).length;
  const percentualDocumentos =
    documentosProjeto.length > 0
      ? Math.round((documentosConcluidos / documentosProjeto.length) * 100)
      : 0;
  const fasesConcluidas = cronogramaObra.filter(
    (c) => c.status === "concluido",
  ).length;
  const percentualCronograma =
    cronogramaObra.length > 0
      ? Math.round((fasesConcluidas / cronogramaObra.length) * 100)
      : 0;

  // "Relevante" = tem escopo hoje OU tem historico de previsao/realizado (mesmo que o
  // escopo tenha sido zerado depois, ex: pedido reestruturado no ERP). Filtrar so por
  // escopo > 0 esconderia faturamento ja realizado e lancado manualmente no passado.
  const idsFamiliaComPrevisaoOuRealizado = new Set([
    ...previsoesFaturamento.map((p) => p.id_obra_faturamento_familia),
    ...realizadosFaturamento.map((r) => r.id_obra_faturamento_familia),
  ]);
  const familiasFaturamentoComEscopo = familiasFaturamento.filter(
    (f) =>
      Number(f.valor_total_escopo || 0) > 0 ||
      idsFamiliaComPrevisaoOuRealizado.has(f.id),
  );
  const idsFamiliasFaturamentoComEscopo = new Set(
    familiasFaturamentoComEscopo.map((f) => f.id),
  );
  const previsoesFaturamentoDoEscopo = previsoesFaturamento.filter((p) =>
    idsFamiliasFaturamentoComEscopo.has(p.id_obra_faturamento_familia ?? ""),
  );
  const realizadosFaturamentoDoEscopo = realizadosFaturamento.filter((r) =>
    idsFamiliasFaturamentoComEscopo.has(r.id_obra_faturamento_familia ?? ""),
  );
  const totalEscopoFaturamento = familiasFaturamentoComEscopo.reduce(
    (acc, f) => acc + Number(f.valor_total_escopo || 0),
    0,
  );
  const totalPrevistoFaturamento = previsoesFaturamentoDoEscopo.reduce(
    (acc, p) => acc + Number(p.valor_previsto || 0),
    0,
  );
  const totalRealizadoFaturamento = realizadosFaturamentoDoEscopo.reduce(
    (acc, r) => acc + Number(r.valor_realizado || 0),
    0,
  );
  const saldoFaturarFamilias =
    totalEscopoFaturamento - totalRealizadoFaturamento;
  const saldoFaturarFamiliasPositivo = Math.max(saldoFaturarFamilias, 0);
  const obraSemEscopoFaturamento = totalEscopoFaturamento <= 0;
  const obraComFaturamentoPendente =
    totalEscopoFaturamento > 0 && totalRealizadoFaturamento < totalEscopoFaturamento;
  const podeFinalizarObraPorFaturamento =
    !obraSemEscopoFaturamento && !obraComFaturamentoPendente;

  const abrirModalFinalizarObra = () => {
    setFormFinalizarObra({
      data_finalizacao: new Date().toISOString().split("T")[0],
      observacao_finalizacao: "",
    });
    setModalFinalizarObraAberto(true);
  };

  const confirmarFinalizacaoObra = async () => {
    if (!obraEcoSelecionada) return;

    if (obraSemEscopoFaturamento) {
      mostrarAviso(
        "Não é possível finalizar. Informe o escopo de faturamento da obra antes de encerrar.",
        "erro",
      );
      return;
    }

    if (obraComFaturamentoPendente) {
      mostrarAviso(
        `Não é possível finalizar. Ainda existe ${formatarMoeda(saldoFaturarFamiliasPositivo)} a faturar.`,
        "erro",
      );
      return;
    }

    if (!formFinalizarObra.data_finalizacao) {
      mostrarAviso("Informe a data de finalização.", "erro");
      return;
    }

    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc("finalizar_obra_pmis", {
        p_id_obra: obraEcoSelecionada.id,
        p_data_finalizacao: formFinalizarObra.data_finalizacao,
        p_observacao: formFinalizarObra.observacao_finalizacao || "",
      });

      if (error) throw error;

      if (data && data.ok === false) {
        mostrarAviso(data.mensagem || "Não foi possível finalizar a obra.", "erro");
        return;
      }

      mostrarAviso("Obra finalizada com sucesso!");
      setModalFinalizarObraAberto(false);
      setObraEcoSelecionada(null);
      await buscarObras();
      setTelaAtiva("minhas_obras");
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao finalizar obra.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalCancelarObra = () => {
    setFormCancelarObra({
      data_cancelamento: new Date().toISOString().split("T")[0],
      motivo_cancelamento: "",
      observacao_cancelamento: "",
      cancelar_tarefas: true,
      cancelar_cronograma: true,
    });
    setModalCancelarObraAberto(true);
  };

  const confirmarCancelamentoObra = async () => {
    if (!obraEcoSelecionada) return;

    if (!formCancelarObra.data_cancelamento) {
      mostrarAviso("Informe a data de cancelamento.", "erro");
      return;
    }

    if (!formCancelarObra.motivo_cancelamento?.trim()) {
      mostrarAviso("Informe o motivo do cancelamento.", "erro");
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja cancelar esta obra? Ela sairá das obras em andamento, mas o histórico permanecerá disponível.",
    );

    if (!confirmar) return;

    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc("cancelar_obra_pmis", {
        p_id_obra: obraEcoSelecionada.id,
        p_data_cancelamento: formCancelarObra.data_cancelamento,
        p_motivo_cancelamento: formCancelarObra.motivo_cancelamento,
        p_observacao_cancelamento: formCancelarObra.observacao_cancelamento || "",
        p_cancelar_tarefas: Boolean(formCancelarObra.cancelar_tarefas),
        p_cancelar_cronograma: Boolean(formCancelarObra.cancelar_cronograma),
      });

      if (error) throw error;

      if (data && data.ok === false) {
        mostrarAviso(data.mensagem || "Não foi possível cancelar a obra.", "erro");
        return;
      }

      mostrarAviso("Obra cancelada com sucesso!");
      setModalCancelarObraAberto(false);
      setObraEcoSelecionada(null);
      await buscarObras();
      setTelaAtiva("minhas_obras");
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao cancelar obra.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  const competenciasFaturamento = Array.from(
    new Set(
      [
        ...previsoesFaturamentoDoEscopo.map((p) =>
          String(p.competencia || "").slice(0, 10),
        ),
        ...realizadosFaturamentoDoEscopo.map((r) =>
          String(r.competencia || "").slice(0, 10),
        ),
      ].filter(Boolean),
    ),
  ).sort();

  // Uma família pode abranger vários materiais/grupos do pedido (ex: obra 1256, família
  // 40/180, tem 3 materiais). obra_faturamento_familias so guarda 1 grupo por linha, entao
  // usamos as previsões (1 linha por material, ja granular como no ERP) para achar a
  // família REAL de cada grupo, em vez do campo unico e as vezes desatualizado da família.
  const familiaPorGrupoFaturamento = (() => {
    const mapa = new Map<string, any>();
    for (const p of previsoesFaturamento) {
      if (p.grupo_faturamento && !mapa.has(p.grupo_faturamento)) {
        const familia = familiasFaturamento.find(
          (f) => f.id === p.id_obra_faturamento_familia,
        );
        if (familia) mapa.set(p.grupo_faturamento, familia);
      }
    }
    for (const f of familiasFaturamento) {
      const grupo = grupoFaturamentoPorId(f.id_grupo_faturamento);
      if (grupo?.codigo && !mapa.has(grupo.codigo)) mapa.set(grupo.codigo, f);
    }
    return mapa;
  })();

  const gruposFaturamentoResumo = gruposFaturamentoAtivos()
    .filter((g) => Number(g.valor_total_grupo || 0) > 0)
    .map((g) => ({
      grupo: g,
      familia: familiaPorGrupoFaturamento.get(g.codigo || ""),
      valorEscopo: Number(g.valor_total_grupo || 0),
      valorFaturado: realizadosFaturamentoDoEscopo
        .filter((r) => r.grupo_faturamento === g.codigo)
        .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0),
    }))
    .sort((a, b) =>
      String(a.grupo.codigo).localeCompare(String(b.grupo.codigo), "pt-BR", {
        numeric: true,
      }),
    );

  const valorPrevistoGrupoCompetencia = (grupoCodigo: string, competencia: string) =>
    previsoesFaturamentoDoEscopo
      .filter(
        (previsao: any) =>
          previsao.grupo_faturamento === grupoCodigo &&
          String(previsao.competencia || "").slice(0, 10) === competencia,
      )
      .reduce((acc, previsao: any) => acc + Number(previsao.valor_previsto || 0), 0);

  const valorRealizadoGrupoCompetencia = (grupoCodigo: string, competencia: string) =>
    realizadosFaturamentoDoEscopo
      .filter(
        (realizado: any) =>
          realizado.grupo_faturamento === grupoCodigo &&
          String(realizado.competencia || "").slice(0, 10) === competencia,
      )
      .reduce((acc, realizado: any) => acc + Number(realizado.valor_realizado || 0), 0);

  const totalPrevistoCompetencia = (competencia: string) =>
    previsoesFaturamentoDoEscopo
      .filter((p) => String(p.competencia || "").slice(0, 10) === competencia)
      .reduce((acc, p) => acc + Number(p.valor_previsto || 0), 0);

  const totalRealizadoCompetencia = (competencia: string) =>
    realizadosFaturamentoDoEscopo
      .filter((r) => String(r.competencia || "").slice(0, 10) === competencia)
      .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0);

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
    if (projeto?.obraOriginal) abrirPainelObra(projeto.obraOriginal);
  };

  useEffect(() => {
    if (telaAtiva !== "painel_obra" || abaPainelObra !== "financeiro") return;
    if (!obraEcoSelecionada) return;
    if (novaParcelaCliente.valor_previsto !== "") return;
    if (valorRestanteDistribuirPositivo <= 0) return;

    setNovaParcelaCliente((prev: any) => ({
      ...prev,
      valor_previsto: String(valorRestanteDistribuirPositivo.toFixed(2)),
    }));
  }, [
    telaAtiva,
    abaPainelObra,
    obraEcoSelecionada?.id,
    valorRestanteDistribuirPositivo,
    novaParcelaCliente.valor_previsto,
  ]);

  if (carregandoAuth)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-[#2A6377]" size={48} />
      </div>
    );

  if (!sessao) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="bg-[#2A6377] p-6 md:p-8 text-center flex flex-col items-center justify-center border-b border-[#1e4857]">
            <img
              src="/logo.png"
              alt="Kalter Logo"
              className="max-h-16 w-auto object-contain"
            />
            <h1 className="text-4xl font-bold text-white hidden">Kalter</h1>
            <p className="text-white/80 font-medium tracking-wide uppercase text-xs mt-2">
              Gestão de Obras
            </p>
          </div>
          <div className="p-6 md:p-8">
            {erroLogin && (
              <div className="mb-6 bg-red-50 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <span>{erroLogin}</span>
              </div>
            )}
            {mensagemSucesso && (
              <div className="mb-6 bg-green-50 border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium">
                <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                <span>{mensagemSucesso}</span>
              </div>
            )}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => {
                  setModoAuth("login");
                  setErroLogin("");
                }}
                className={`flex-1 pb-3 text-sm font-bold transition ${modoAuth === "login" ? "border-b-2 border-[#2A6377] text-[#2A6377]" : "text-slate-400"}`}
              >
                Entrar
              </button>
              <button
                onClick={() => {
                  setModoAuth("cadastro");
                  setErroLogin("");
                }}
                className={`flex-1 pb-3 text-sm font-bold transition ${modoAuth === "cadastro" ? "border-b-2 border-[#2A6377] text-[#2A6377]" : "text-slate-400"}`}
              >
                Criar Conta
              </button>
            </div>
            <form onSubmit={processarAuth} className="space-y-4">
              {modoAuth === "cadastro" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      required
                      type="text"
                      value={nomeAuth}
                      onChange={(e) => setNomeAuth(e.target.value)}
                      className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">E-mail</label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-3 text-slate-400"
                  />
                  <input
                    required
                    type="email"
                    value={emailAuth}
                    onChange={(e) => setEmailAuth(e.target.value)}
                    className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
              </div>
              {modoAuth !== "recuperar" && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium">Senha</label>
                    {modoAuth === "login" && (
                      <button
                        type="button"
                        onClick={() => setModoAuth("recuperar")}
                        className="text-xs text-[#2A6377]"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound
                      size={18}
                      className="absolute left-3 top-3 text-slate-400"
                    />
                    <input
                      required
                      type="password"
                      value={senhaAuth}
                      onChange={(e) => setSenhaAuth(e.target.value)}
                      className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]"
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={carregandoAuth}
                className="w-full bg-[#2A6377] hover:bg-[#1e4857] text-white p-3 rounded-lg font-bold flex justify-center items-center mt-6 disabled:opacity-50"
              >
                {carregandoAuth ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    {modoAuth === "login" && "Entrar"}
                    {modoAuth === "cadastro" && "Cadastrar"}
                    {modoAuth === "recuperar" && "Recuperar"}
                  </>
                )}
              </button>
              {modoAuth === "recuperar" && (
                <button
                  type="button"
                  onClick={() => setModoAuth("login")}
                  className="w-full text-slate-500 text-sm font-medium mt-2"
                >
                  Voltar
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative overflow-hidden flex-col md:flex-row">
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg text-white font-medium ${toast.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"}`}
          >
            {toast.tipo === "sucesso" ? (
              <CheckCircle2 size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}{" "}
            {toast.mensagem}
          </div>
        ))}
      </div>


      {/* HEADER MOBILE */}
      <div className="md:hidden bg-[#2A6377] text-white p-4 flex justify-between items-center shadow-md z-30">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Kalter"
            className="h-8 w-auto object-contain"
          />
        </div>
        <button
          onClick={() => setMenuMobileAberto(true)}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
        >
          <Menu size={24} />
        </button>
      </div>

      {menuMobileAberto && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[40] md:hidden"
          onClick={() => setMenuMobileAberto(false)}
        />
      )}

      {/* MODAL DE EDIÇÃO DE ATA DE REUNIÃO */}
      {reuniaoEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-[#2A6377]">
                Editar Resumo da Reunião
              </h2>
              <button
                onClick={() => setReuniaoEmEdicao(null)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">
                  Resumo Geral
                </label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg p-3 outline-none"
                  value={reuniaoEmEdicao.resumo_geral}
                  onChange={(e) =>
                    setReuniaoEmEdicao({
                      ...reuniaoEmEdicao,
                      resumo_geral: e.target.value,
                    })
                  }
                ></textarea>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setReuniaoEmEdicao(null)}
                className="px-6 py-2 bg-white border rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicaoReuniao}
                disabled={carregando}
                className="px-6 py-2 bg-[#2A6377] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e4857] transition disabled:opacity-50"
              >
                {carregando ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}{" "}
                Atualizar Ata
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNovaTarefaObraAberto && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[86] flex items-center justify-center p-4"
          onClick={() => setModalNovaTarefaObraAberto(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-xl text-[#2A6377] flex items-center gap-2">
                  <CheckSquare size={20} /> Nova Tarefa da Obra
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {obraEcoSelecionada?.codigo_externo} - {obraEcoSelecionada?.nome}
                </p>
              </div>
              <button
                onClick={() => setModalNovaTarefaObraAberto(false)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 rounded-full p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Título da tarefa
                </label>
                <input
                  value={novaTarefaObra.titulo}
                  onChange={(e) =>
                    setNovaTarefaObra({ ...novaTarefaObra, titulo: e.target.value })
                  }
                  placeholder="Ex.: Validar cronograma revisado com cliente"
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Descrição / contexto
                </label>
                <textarea
                  rows={3}
                  value={novaTarefaObra.descricao}
                  onChange={(e) =>
                    setNovaTarefaObra({
                      ...novaTarefaObra,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Detalhe o que precisa ser feito, premissas ou alinhamentos."
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Responsável
                  </label>
                  <select
                    value={novaTarefaObra.id_responsavel}
                    onChange={(e) =>
                      setNovaTarefaObra({
                        ...novaTarefaObra,
                        id_responsavel: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  >
                    <option value="">Selecione</option>
                    {listaUsuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Prazo
                  </label>
                  <input
                    type="date"
                    value={novaTarefaObra.data_vencimento}
                    onChange={(e) =>
                      setNovaTarefaObra({
                        ...novaTarefaObra,
                        data_vencimento: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={novaTarefaObra.prioridade}
                    onChange={(e) =>
                      setNovaTarefaObra({
                        ...novaTarefaObra,
                        prioridade: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                Esta tarefa será criada diretamente na obra, sem vínculo obrigatório com uma ata. Na reunião, ela continuará disponível para revisão e acompanhamento.
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setModalNovaTarefaObraAberto(false)}
                className="px-5 py-2 bg-white border rounded-lg font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTarefaObra}
                disabled={carregando || !novaTarefaObra.titulo || !novaTarefaObra.id_responsavel}
                className="px-5 py-2 bg-[#2A6377] text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {carregando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Salvar tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DA TAREFA E COMENTÁRIOS */}
      {tarefaSelecionada && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4"
          onClick={() => setTarefaSelecionada(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-bold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded uppercase mb-2 inline-block">
                  {tarefaSelecionada.obras?.codigo_externo} -{" "}
                  {tarefaSelecionada.obras?.nome}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 break-words leading-tight">
                  {tarefaSelecionada.titulo}
                </h2>
              </div>
              <button
                onClick={() => setTarefaSelecionada(null)}
                className="text-slate-400 hover:text-red-500 shrink-0 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                  <div className="p-2 bg-white rounded-full shadow-sm border">
                    <User className="text-[#2A6377]" size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Responsável
                    </p>
                    <p className="font-bold text-slate-700 text-sm">
                      {tarefaSelecionada.usuarios?.nome || "Geral"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} /> Criada em
                  </p>
                  <p className="font-bold text-slate-700">
                    {formatarDataSegura(tarefaSelecionada.created_at)}
                  </p>
                </div>

                <div
                  className={`flex flex-col gap-1 text-sm p-4 rounded-lg border ${isAtrasada(tarefaSelecionada.data_vencimento, tarefaSelecionada.status) ? "bg-red-50 border-red-100 text-red-600" : "bg-slate-50 border-slate-100 text-slate-600"}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Clock size={12} /> Prazo da Tarefa
                  </p>
                  <input
                    type="date"
                    value={
                      tarefaSelecionada.data_vencimento
                        ? tarefaSelecionada.data_vencimento.split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      atualizarDataTarefa(tarefaSelecionada.id, e.target.value)
                    }
                    className="font-bold bg-transparent outline-none cursor-pointer w-full text-slate-700 p-0 m-0"
                  />
                </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col">
                <div className="mb-4 bg-slate-50 border rounded-lg p-4 text-sm">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-[#2A6377]/10 text-[#2A6377]">
                      Origem: {tarefaSelecionada.origem === "reuniao" ? "Reunião" : "Avulsa"}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${tarefaSelecionada.prioridade === "critica" ? "bg-red-100 text-red-700" : tarefaSelecionada.prioridade === "alta" ? "bg-amber-100 text-amber-700" : tarefaSelecionada.prioridade === "baixa" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                      Prioridade: {tarefaSelecionada.prioridade || "normal"}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Descrição
                  </p>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {tarefaSelecionada.descricao || "Sem descrição cadastrada."}
                  </p>
                </div>

                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
                  <MessageSquare size={18} className="text-[#2A6377]" />{" "}
                  Atualizações
                </h3>
                <div className="flex-1 bg-slate-50 rounded-lg border p-4 space-y-4 mb-4 min-h-[200px]">
                  {comentariosTarefaAtual.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
                      Nenhum comentário.
                    </div>
                  ) : (
                    comentariosTarefaAtual.map((com) => (
                      <div
                        key={com.id}
                        className="bg-white p-3 rounded shadow-sm border text-sm"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[#2A6377]">
                            {com.usuarios?.nome}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatarDataHora(com.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {com.texto}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar um comentário..."
                    value={novoComentarioTexto}
                    onChange={(e) => setNovoComentarioTexto(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && adicionarComentario()
                    }
                    className="flex-1 border rounded-lg p-3 outline-none focus:border-[#2A6377] text-sm"
                  />
                  <button
                    onClick={adicionarComentario}
                    disabled={!novoComentarioTexto.trim()}
                    className="bg-[#2A6377] text-white px-4 rounded-lg hover:bg-[#1e4857] transition disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap gap-3 justify-end bg-slate-50 rounded-b-2xl">
              {tarefaSelecionada.data_vencimento && (
                <button
                  onClick={() => agendarNoOutlookWeb(tarefaSelecionada)}
                  className="bg-white border border-[#2A6377]/30 text-[#2A6377] hover:bg-[#2A6377]/10 px-4 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 transition flex-1 sm:flex-none justify-center shadow-sm"
                >
                  <CalendarPlus size={18} /> Outlook
                </button>
              )}
              {tarefaSelecionada.status === "pendente" && (
                <button
                  onClick={() => {
                    atualizarStatusTarefa(tarefaSelecionada.id, "em_andamento");
                    setTarefaSelecionada(null);
                  }}
                  className="bg-[#2A6377] text-white px-6 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e4857] transition shadow-md flex-1 sm:flex-none justify-center"
                >
                  <Play size={18} /> Iniciar Tarefa
                </button>
              )}
              {tarefaSelecionada.status === "em_andamento" && (
                <button
                  onClick={() => {
                    atualizarStatusTarefa(tarefaSelecionada.id, "concluida");
                    setTarefaSelecionada(null);
                  }}
                  className="bg-green-600 text-white px-6 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-md flex-1 sm:flex-none justify-center"
                >
                  <Check size={18} strokeWidth={3} /> Concluir Tarefa
                </button>
              )}
              {!["concluida", "cancelada"].includes(tarefaSelecionada.status ?? "") &&
                (isAdmin || tarefaSelecionada.id_responsavel === usuarioAtual?.id || tarefaSelecionada.obras?.id_responsavel === idResponsavelEscopo) && (
                <button
                  onClick={() => cancelarTarefa(tarefaSelecionada)}
                  className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 transition flex-1 sm:flex-none justify-center"
                >
                  <X size={18} /> Cancelar Tarefa
                </button>
              )}
              {tarefaSelecionada.status === "concluida" && (
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold px-4 py-3 md:py-2 bg-green-100 rounded-lg flex-1 sm:flex-none">
                  <CheckCircle2 size={18} /> Concluída
                </div>
              )}
              {tarefaSelecionada.status === "cancelada" && (
                <div className="flex items-center justify-center gap-2 text-red-600 font-bold px-4 py-3 md:py-2 bg-red-100 rounded-lg flex-1 sm:flex-none">
                  <X size={18} /> Cancelada
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {faseCronogramaModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[95] flex items-center justify-center p-4"
          onClick={fecharModalCronograma}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-xl text-[#2A6377]">
                  {acaoCronogramaModal === "editar_previsto"
                    ? "Editar prazos previstos"
                    : acaoCronogramaModal === "finalizar"
                      ? "Finalizar fase"
                      : "Iniciar fase"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {labelFase(faseCronogramaModal.fase)}
                </p>
              </div>
              <button
                onClick={fecharModalCronograma}
                className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 border rounded-xl p-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Início previsto
                  </p>
                  <p className="font-bold text-slate-700">
                    {formatarDataSegura(
                      faseCronogramaModal.inicio_previsto ||
                        obraEcoSelecionada?.data_inicio,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Prazo entrega
                  </p>
                  <p className="font-bold text-slate-700">
                    {formatarDataSegura(
                      faseCronogramaModal.fim_previsto ||
                        obraEcoSelecionada?.data_previsao_fim,
                    )}
                  </p>
                </div>
              </div>

              {acaoCronogramaModal === "editar_previsto" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-700">
                      Início previsto
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="dd/mm/aaaa"
                      value={formCronogramaModal.inicio_previsto || ""}
                      onFocus={selecionarTextoAoFocar}
                      onChange={(e) =>
                        setFormCronogramaModal({
                          ...formCronogramaModal,
                          inicio_previsto: formatarEntradaDataBR(
                            e.target.value,
                          ),
                        })
                      }
                      className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1 text-slate-700">
                      Prazo de entrega
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="dd/mm/aaaa"
                      value={formCronogramaModal.fim_previsto || ""}
                      onFocus={selecionarTextoAoFocar}
                      onChange={(e) =>
                        setFormCronogramaModal({
                          ...formCronogramaModal,
                          fim_previsto: formatarEntradaDataBR(e.target.value),
                        })
                      }
                      className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">
                    {acaoCronogramaModal === "finalizar"
                      ? "Data de finalização"
                      : "Data de início"}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="dd/mm/aaaa"
                    value={formCronogramaModal.data || ""}
                    onFocus={selecionarTextoAoFocar}
                    onChange={(e) =>
                      setFormCronogramaModal({
                        ...formCronogramaModal,
                        data: formatarEntradaDataBR(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">
                  Observação
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    acaoCronogramaModal === "editar_previsto"
                      ? "Ex.: prazo ajustado após alinhamento com engenharia/compras..."
                      : "Ex.: início validado em reunião, etapa finalizada com pendências, aguardando cliente..."
                  }
                  value={formCronogramaModal.observacao || ""}
                  onChange={(e) =>
                    setFormCronogramaModal({
                      ...formCronogramaModal,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={fecharModalCronograma}
                className="px-5 py-2 rounded-lg bg-white border font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAcaoCronograma}
                className="px-5 py-2 rounded-lg bg-[#2A6377] text-white font-bold hover:bg-[#1e4857]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {parcelaParaLiquidar && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[88] flex items-center justify-center p-4"
          onClick={fecharLiquidacaoParcela}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="text-[#2A6377]" size={22} /> Liquidar
                  Parcela
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {parcelaParaLiquidar.descricao}
                </p>
              </div>
              <button
                onClick={fecharLiquidacaoParcela}
                className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border rounded-xl p-4 text-sm grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Vencimento
                  </p>
                  <p className="font-bold text-slate-700">
                    {formatarDataSegura(parcelaParaLiquidar.data_prevista)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Valor previsto
                  </p>
                  <p className="font-bold text-slate-700">
                    {formatarMoeda(parcelaParaLiquidar.valor_previsto)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">
                  Data de recebimento
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  value={liquidacaoParcela.data_recebimento}
                  onFocus={selecionarTextoAoFocar}
                  onChange={(e) =>
                    setLiquidacaoParcela({
                      ...liquidacaoParcela,
                      data_recebimento: formatarEntradaDataBR(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">
                  Valor recebido
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={liquidacaoParcela.valor_recebido}
                  onChange={(e) =>
                    setLiquidacaoParcela({
                      ...liquidacaoParcela,
                      valor_recebido: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Se o valor recebido for menor que o previsto, o sistema
                  marcará como parcial.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={fecharLiquidacaoParcela}
                className="px-5 py-2 bg-white border rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarLiquidacaoParcela}
                disabled={carregando}
                className="px-5 py-2 bg-[#2A6377] text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e4857] transition disabled:opacity-50"
              >
                {carregando ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}{" "}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFinalizarObraAberto && obraEcoSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={22} />
                  Finalizar Obra
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {obraEcoSelecionada.codigo_externo} - {obraEcoSelecionada.nome}
                </p>
              </div>
              <button
                onClick={() => setModalFinalizarObraAberto(false)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border rounded-xl p-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Escopo a faturar</p>
                  <p className="text-xl font-bold text-slate-800 mt-1">
                    {formatarMoeda(totalEscopoFaturamento)}
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">Faturado</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {formatarMoeda(totalRealizadoFaturamento)}
                  </p>
                </div>
                <div className={`${saldoFaturarFamiliasPositivo > 0 ? "bg-red-50 border-red-100" : "bg-green-50 border-green-100"} border rounded-xl p-4`}>
                  <p className={`text-[10px] uppercase font-bold ${saldoFaturarFamiliasPositivo > 0 ? "text-red-600" : "text-green-600"}`}>Saldo a faturar</p>
                  <p className={`text-xl font-bold mt-1 ${saldoFaturarFamiliasPositivo > 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatarMoeda(saldoFaturarFamiliasPositivo)}
                  </p>
                </div>
              </div>

              {obraSemEscopoFaturamento ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={22} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Escopo de faturamento não informado.</p>
                    <p className="text-sm mt-1">
                      Para finalizar a obra, primeiro cadastre o escopo na aba Faturamento e registre o faturamento realizado. Isso evita encerrar uma obra sem validar se todo o escopo foi faturado.
                    </p>
                  </div>
                </div>
              ) : obraComFaturamentoPendente ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={22} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Não é possível finalizar esta obra.</p>
                    <p className="text-sm mt-1">
                      Ainda existe faturamento pendente. A obra só pode ser finalizada quando o valor faturado for igual ou superior ao escopo total de faturamento. Contas a receber em aberto não bloqueiam a finalização.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 size={22} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Faturamento validado.</p>
                    <p className="text-sm mt-1">
                      Não há saldo a faturar. Você pode finalizar a obra mesmo que ainda existam parcelas a receber.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data de finalização</label>
                  <input
                    type="date"
                    value={formFinalizarObra.data_finalizacao}
                    onChange={(e) =>
                      setFormFinalizarObra((prev: any) => ({
                        ...prev,
                        data_finalizacao: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                    disabled={!podeFinalizarObraPorFaturamento}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Saldo a receber em aberto</label>
                  <div className="w-full border rounded-lg p-3 bg-slate-50 font-bold text-slate-700">
                    {formatarMoeda(Math.max(saldoReceberParcelas, 0))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Observação de encerramento</label>
                <textarea
                  rows={4}
                  value={formFinalizarObra.observacao_finalizacao}
                  onChange={(e) =>
                    setFormFinalizarObra((prev: any) => ({
                      ...prev,
                      observacao_finalizacao: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  placeholder="Ex.: Obra entregue e faturamento concluído. Recebimentos seguem conforme condição comercial."
                  disabled={!podeFinalizarObraPorFaturamento}
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setModalFinalizarObraAberto(false)}
                className="px-5 py-3 rounded-lg font-bold bg-white border hover:bg-slate-100 text-slate-600"
              >
                Voltar
              </button>
              <button
                onClick={confirmarFinalizacaoObra}
                disabled={!podeFinalizarObraPorFaturamento || carregando}
                className="px-5 py-3 rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {carregando ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Confirmar Finalização
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCancelarObraAberto && obraEcoSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={22} />
                  Cancelar Obra
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {obraEcoSelecionada.codigo_externo} - {obraEcoSelecionada.nome}
                </p>
              </div>
              <button
                onClick={() => setModalCancelarObraAberto(false)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle size={22} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Atenção: cancelamento não apaga o histórico.</p>
                  <p className="text-sm mt-1">
                    A obra sairá das listas de obras em andamento. Reuniões, documentos, faturamento, diário e registros existentes serão preservados para consulta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data de cancelamento</label>
                  <input
                    type="date"
                    value={formCancelarObra.data_cancelamento}
                    onChange={(e) =>
                      setFormCancelarObra((prev: any) => ({
                        ...prev,
                        data_cancelamento: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Motivo do cancelamento</label>
                  <input
                    type="text"
                    value={formCancelarObra.motivo_cancelamento}
                    onChange={(e) =>
                      setFormCancelarObra((prev: any) => ({
                        ...prev,
                        motivo_cancelamento: e.target.value,
                      }))
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                    placeholder="Ex.: Cancelado pelo cliente, revisão comercial, perda do projeto..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Observação</label>
                <textarea
                  rows={4}
                  value={formCancelarObra.observacao_cancelamento}
                  onChange={(e) =>
                    setFormCancelarObra((prev: any) => ({
                      ...prev,
                      observacao_cancelamento: e.target.value,
                    }))
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  placeholder="Descreva o contexto do cancelamento e próximos passos, se houver."
                />
              </div>

              <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCancelarObra.cancelar_tarefas}
                    onChange={(e) =>
                      setFormCancelarObra((prev: any) => ({
                        ...prev,
                        cancelar_tarefas: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <strong>Cancelar tarefas pendentes da obra</strong>
                    <br />
                    <span className="text-slate-500">Tarefas já concluídas permanecem como histórico.</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCancelarObra.cancelar_cronograma}
                    onChange={(e) =>
                      setFormCancelarObra((prev: any) => ({
                        ...prev,
                        cancelar_cronograma: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <strong>Cancelar fases de cronograma em aberto</strong>
                    <br />
                    <span className="text-slate-500">Fases concluídas permanecem concluídas.</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setModalCancelarObraAberto(false)}
                className="px-5 py-3 rounded-lg font-bold bg-white border hover:bg-slate-100 text-slate-600"
              >
                Voltar
              </button>
              <button
                onClick={confirmarCancelamentoObra}
                disabled={carregando}
                className="px-5 py-3 rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {carregando ? <Loader2 className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {painelNotificacaoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[75] flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bell className="text-[#2A6377]" /> Tarefas
              </h2>
              <button onClick={() => setPainelNotificacaoAberto(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              {minhasNotificacoes.length === 0 ? (
                <div className="text-center mt-10 text-slate-500">
                  <CheckCircle2
                    size={48}
                    className="mx-auto mb-3 text-slate-300"
                  />{" "}
                  Tudo em dia!
                </div>
              ) : (
                <div className="space-y-4">
                  {minhasNotificacoes.map((notif) => (
                    <div
                      key={notif.id}
                      className="bg-white p-4 rounded-xl border border-l-4 border-l-[#2A6377]"
                    >
                      <span className="text-[10px] font-bold text-[#2A6377] uppercase bg-[#2A6377]/10 px-2 py-1 rounded inline-block mb-2">
                        {notif.obras?.codigo_externo || "Obra"}
                      </span>
                      <p className="font-semibold text-sm mb-3">
                        {notif.titulo}
                      </p>
                      <div className="flex flex-col gap-3 text-xs border-t pt-3 mt-2">
                        <span
                          className={`flex items-center gap-1 ${isAtrasada(notif.data_vencimento, "pendente") ? "text-red-600 font-bold" : "text-slate-500"}`}
                        >
                          <Clock size={12} /> Prazo:{" "}
                          {formatarDataSegura(notif.data_vencimento)}
                        </span>
                        <div className="flex gap-3 justify-end mt-1">
                          {notif.data_vencimento && (
                            <button
                              onClick={() => agendarNoOutlookWeb(notif)}
                              className="text-[#2A6377] bg-[#2A6377]/10 px-3 py-1.5 rounded hover:bg-[#2A6377]/20 font-medium flex items-center gap-1 transition"
                            >
                              <CalendarPlus size={14} /> Agendar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setTelaAtiva("tarefas");
                              setPainelNotificacaoAberto(false);
                            }}
                            className="text-white bg-[#2A6377] px-3 py-1.5 rounded hover:bg-[#1e4857] font-medium transition"
                          >
                            Acessar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENVIO DE ATA ATUAL */}
      {modalAtaAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Mail className="text-[#2A6377]" /> Enviar Ata de Reunião
              </h2>
              <button onClick={fecharModalAta}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-slate-50">
              {enviandoEmailAta ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Enviando
                  e-mail automaticamente...
                </div>
              ) : statusEnvioEmailAta?.ok ? (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
                  ✅ E-mail enviado para: {statusEnvioEmailAta.destinatarios?.join(", ")}
                </div>
              ) : statusEnvioEmailAta && !statusEnvioEmailAta.ok ? (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex flex-col gap-2">
                  <span>❌ Falha ao enviar e-mail: {statusEnvioEmailAta.erro}</span>
                  <button
                    onClick={reenviarAtaPorEmail}
                    className="self-start bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Send size={12} /> Tentar novamente
                  </button>
                </div>
              ) : null}
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {ataGerada}
              </pre>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap justify-end gap-3">
              <button
                onClick={fecharModalAta}
                className="px-6 py-2 rounded-lg font-medium bg-slate-100 flex-1 md:flex-none hover:bg-slate-200"
              >
                Fechar
              </button>
              <button
                onClick={() =>
                  gerarVisualPDF(
                    obrasNaAtaAtual,
                    formatarDataSegura(new Date().toISOString()),
                    gravacaoAta?.resumo,
                  )
                }
                className="bg-white border border-[#2A6377] text-[#2A6377] hover:bg-[#2A6377] hover:text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none transition"
              >
                <FileText size={18} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MENU LATERAL (ARQUITETURA ERP) */}
      <aside
        className={`fixed inset-y-0 left-0 z-[50] w-64 bg-[#2A6377] text-white flex flex-col shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${menuMobileAberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center relative">
            <button
              onClick={() => setMenuMobileAberto(false)}
              className="md:hidden absolute top-4 right-4 text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
            <img
              src="/logo.png"
              alt="Kalter Logo"
              className="max-h-12 w-auto mb-2 object-contain"
              onError={(e: any) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            <div className="px-4 mt-6">
              <p className="text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider">
                Principal
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setTelaAtiva("dashboard");
                    setMenuMobileAberto(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "dashboard" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <LayoutDashboard size={20} /> Dashboard
                </button>
                <button
                  onClick={() => {
                    setTelaAtiva("tarefas");
                    setMenuMobileAberto(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "tarefas" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <CheckSquare size={20} /> Tarefas
                </button>
              </div>
            </div>

            <div className="px-4 mt-8">
              <p className="text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider">
                Operação
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setTelaAtiva("minhas_obras");
                    setMenuMobileAberto(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "minhas_obras" || telaAtiva === "painel_obra" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <Briefcase size={20} /> Minhas Obras
                </button>
                <button
                  onClick={() => {
                    setTelaAtiva("reunioes");
                    setMenuMobileAberto(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "reunioes" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <ClipboardList size={20} /> Reuniões
                </button>
              </div>
            </div>

            <div className="px-4 mt-8">
              <p className="text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider flex items-center gap-1">
                <Settings size={12} /> Cadastros
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setTelaAtiva("cadastros_obras");
                    setMenuMobileAberto(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "cadastros_obras" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                >
                  <HardHat size={20} /> Obras
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setTelaAtiva("cadastros_equipe");
                      setMenuMobileAberto(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === "cadastros_equipe" ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Users size={20} /> Equipe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">
                {usuarioAtual?.nome}
              </p>
              <p className="text-xs text-white/60 uppercase">
                {usuarioAtual?.perfil}
              </p>
            </div>
          </div>
          <button
            onClick={fazerLogout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-slate-50/50">
        {telaAtiva === "dashboard" && (
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
                onClick={() => setTelaAtiva("minhas_obras")}
                className="bg-[#2A6377] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#1e4857] transition"
              >
                <FolderOpen size={16} /> Ver Obras
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
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
                <p className="text-2xl font-bold text-slate-800">
                  {formatarMoeda(resumoPMIS.carteiraTotal)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Recebido
                  </p>
                  <CheckCircle2 className="text-green-500" size={22} />
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatarMoeda(resumoPMIS.recebidoTotal)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-orange-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Saldo a Receber
                  </p>
                  <Clock className="text-orange-500" size={22} />
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatarMoeda(resumoPMIS.saldoReceber)}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Valor Vencido
                  </p>
                  <AlertCircle className="text-red-500" size={22} />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {formatarMoeda(resumoPMIS.valorVencido)}
                </p>
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                  <table className="w-full text-sm min-w-[980px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left">Obra</th>
                        <th className="px-4 py-3 text-left">Fase</th>
                        <th className="px-4 py-3 text-center">Financeiro</th>
                        <th className="px-4 py-3 text-center">Documentos</th>
                        <th className="px-4 py-3 text-center">Cronograma</th>
                        <th className="px-4 py-3 text-center">Tarefas</th>
                        <th className="px-4 py-3 text-center">Geral</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
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
                            <td className="px-4 py-3 text-slate-700">
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
                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                              {formatarMoeda(projeto.saldoReceber)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <AlertTriangle size={20} className="text-amber-500" />{" "}
                    Projetos Críticos
                  </h3>
                </div>
                <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
                  {projetosCriticosPMIS.length === 0 ? (
                    <div className="text-center p-8 text-slate-400">
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
                          <div>
                            <p className="font-bold text-[#2A6377] text-sm">
                              {projeto.codigo} - {projeto.nome}
                            </p>
                            <p className="text-xs text-slate-400">
                              {labelFase(projeto.fase)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full border text-[10px] font-bold ${estiloStatusPMIS(projeto.statusGeral)}`}
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
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="nome"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip cursor={{ fill: "#f3f4f6" }} />
                        <Bar
                          dataKey="total"
                          name="Obras"
                          fill="#2A6377"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
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
                        onClick={() => setTarefaSelecionada(tarefa)}
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
                      onClick={() => setTelaAtiva("tarefas")}
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
        )}

        {telaAtiva === "minhas_obras" && (
          <div className="animate-in fade-in h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
                Minhas Obras em Andamento
              </h2>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="ordenacao-minhas-obras"
                  className="text-sm font-medium text-slate-500 whitespace-nowrap"
                >
                  Ordenar por:
                </label>
                <select
                  id="ordenacao-minhas-obras"
                  value={ordenacaoMinhasObras}
                  onChange={(e) =>
                    setOrdenacaoMinhasObras(
                      e.target.value as "codigo" | "nome",
                    )
                  }
                  className="border rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#2A6377] bg-white"
                >
                  <option value="codigo">Número (Código)</option>
                  <option value="nome">Descrição (Nome)</option>
                </select>
              </div>
            </div>
            {obrasLista.length === 0 ? (
              <div className="bg-white p-10 rounded-xl text-center border text-slate-400">
                Nenhuma obra vinculada a você.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {obrasListaOrdenada.map((obra) => (
                  <div
                    key={obra.id}
                    onClick={() => abrirPainelObra(obra)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-[#2A6377] transition cursor-pointer flex flex-col group"
                  >
                    <div className="h-2 bg-[#2A6377]"></div>
                    <div className="p-5 flex-1 flex flex-col">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 uppercase px-2 py-1 rounded w-fit mb-3">
                        {obra.codigo_externo}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight mb-4 group-hover:text-[#2A6377] transition">
                        {obra.nome}
                      </h3>
                      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <User size={14} /> {obra.usuarios?.nome}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                          <Clock size={14} /> Entrega:{" "}
                          {formatarDataSegura(obra.data_previsao_fim)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {telaAtiva === "painel_obra" && obraEcoSelecionada && (
          <div className="animate-in fade-in h-full flex flex-col">
            <header className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <button
                  onClick={() => setTelaAtiva("minhas_obras")}
                  className="text-slate-400 hover:text-[#2A6377] text-sm font-bold flex items-center gap-1 mb-2 transition"
                >
                  <ChevronRight size={16} className="rotate-180" /> Voltar para
                  Minhas Obras
                </button>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <FolderOpen className="text-[#2A6377]" size={32} />{" "}
                  {obraEcoSelecionada.codigo_externo} -{" "}
                  {obraEcoSelecionada.nome}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="bg-[#2A6377]/10 text-[#2A6377] px-3 py-1 rounded-full">
                    Fase:{" "}
                    {labelFase(
                      obraEcoSelecionada.fase_atual || "processo_inicial",
                    )}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    Responsável:{" "}
                    {obraEcoSelecionada.usuarios?.nome || "Não informado"}
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    Previsão:{" "}
                    {formatarDataSegura(obraEcoSelecionada.data_previsao_fim)}
                  </span>
                </div>
              </div>
              {podeEditarObraSelecionada && !["finalizada", "cancelada"].includes(obraEcoSelecionada.status ?? "") && (
                <details className="relative self-start md:self-auto group">
                  <summary className="list-none cursor-pointer select-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition">
                    <Settings size={18} /> Ações da Obra
                    <ChevronRight size={16} className="rotate-90 transition group-open:-rotate-90" />
                  </summary>

                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        editarObra(obraEcoSelecionada);
                        setTelaAtiva("cadastros_obras");
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit2 size={16} /> Editar cadastro
                    </button>

                    <button
                      onClick={abrirModalFinalizarObra}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                    >
                      <CheckCircle2 size={16} /> Finalizar obra
                    </button>

                    <button
                      onClick={abrirModalCancelarObra}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <AlertTriangle size={16} /> Cancelar obra
                    </button>
                  </div>
                </details>
              )}
            </header>

            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur pb-3 mb-3">
              <div className="bg-white rounded-xl border shadow-sm overflow-visible">
                <div className="flex flex-wrap">
                  {[
                    { id: "resumo", label: "Resumo", icon: LayoutDashboard },
                    { id: "financeiro", label: "Financeiro", icon: DollarSign },
                    { id: "faturamento", label: "Faturamento", icon: Receipt },
                    { id: "cronograma", label: "Cronograma", icon: Calendar },
                    { id: "documentos", label: "Documentos", icon: FileText },
                    {
                      id: "diario_tarefas",
                      label: "Diário e Tarefas",
                      icon: ClipboardList,
                    },
                  ].map((aba) => {
                    const IconeAba = aba.icon;
                    return (
                      <button
                        key={aba.id}
                        onClick={() => setAbaPainelObra(aba.id)}
                        className={`shrink-0 px-4 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition ${abaPainelObra === aba.id ? "border-[#2A6377] text-[#2A6377] bg-[#2A6377]/5" : "border-transparent text-slate-500 hover:text-[#2A6377] hover:bg-slate-50"}`}
                      >
                        <IconeAba size={16} /> {aba.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {abaPainelObra === "resumo" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-blue-500">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Venda Total
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                      {formatarMoeda(totalVendaGeral)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Recebido
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {formatarMoeda(totalRealizadoParcelas)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-amber-500">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Cronograma
                    </p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                      {percentualCronograma}%
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-red-500">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Parcelas Vencidas
                    </p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {parcelasVencidas}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <BookOpen size={18} className="text-[#2A6377]" />{" "}
                      Descrição do Projeto
                    </h3>
                    <p className="text-slate-700 whitespace-pre-wrap min-h-[80px]">
                      {obraEcoSelecionada.descricao ||
                        "Nenhum descritivo cadastrado para esta obra."}
                    </p>
                    {obraEcoSelecionada.observacoes && (
                      <div className="mt-4 bg-slate-50 p-3 rounded-lg border text-sm text-slate-600">
                        <strong>Observações:</strong>
                        <br />
                        {obraEcoSelecionada.observacoes}
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                      <Activity size={18} className="text-[#2A6377]" />{" "}
                      Indicadores Gerais
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span>Documentos concluídos</span>
                        <span className="font-bold">
                          {documentosConcluidos}/{documentosProjeto.length} (
                          {percentualDocumentos}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span>Fases concluídas</span>
                        <span className="font-bold">
                          {fasesConcluidas}/{cronogramaObra.length} (
                          {percentualCronograma}%)
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span>Saldo a receber</span>
                        <span className="font-bold text-amber-700">
                          {formatarMoeda(Math.max(saldoReceberParcelas, 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Fase atual</span>
                        <span className="font-bold text-[#2A6377]">
                          {labelFase(
                            obraEcoSelecionada.fase_atual || "processo_inicial",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {abaPainelObra === "financeiro" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Venda Total Prevista
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatarMoeda(totalVendaGeral)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Total Recebido
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatarMoeda(totalRealizadoParcelas)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Saldo a Receber
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatarMoeda(Math.max(saldoReceberParcelas, 0))}
                    </p>
                  </div>
                  <div
                    className={`bg-white p-5 rounded-xl shadow-sm border ${valorDistribuidoExcedente > 0 ? "border-red-200 bg-red-50" : ""}`}
                  >
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Falta Distribuir
                    </p>
                    <p
                      className={`text-2xl font-bold ${valorDistribuidoExcedente > 0 ? "text-red-600" : "text-blue-700"}`}
                    >
                      {valorDistribuidoExcedente > 0
                        ? `-${formatarMoeda(valorDistribuidoExcedente)}`
                        : formatarMoeda(valorRestanteDistribuirPositivo)}
                    </p>
                  </div>
                </div>

                {podeEditarObraSelecionada && (
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Plus size={18} /> Nova Parcela / Recebimento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <input
                        placeholder="Descrição"
                        value={novaParcelaCliente.descricao}
                        onChange={(e) =>
                          setNovaParcelaCliente({
                            ...novaParcelaCliente,
                            descricao: e.target.value,
                          })
                        }
                        className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        value={novaParcelaCliente.data_prevista}
                        onFocus={selecionarTextoAoFocar}
                        onChange={(e) =>
                          setNovaParcelaCliente({
                            ...novaParcelaCliente,
                            data_prevista: formatarEntradaDataBR(
                              e.target.value,
                            ),
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Valor previsto"
                        value={novaParcelaCliente.valor_previsto}
                        onChange={(e) =>
                          setNovaParcelaCliente({
                            ...novaParcelaCliente,
                            valor_previsto: e.target.value,
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        placeholder="Observação"
                        value={novaParcelaCliente.observacao || ""}
                        onChange={(e) =>
                          setNovaParcelaCliente({
                            ...novaParcelaCliente,
                            observacao: e.target.value,
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <button
                        onClick={salvarParcelaCliente}
                        disabled={carregando}
                        className="bg-[#2A6377] text-white rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        <Save size={16} /> Salvar
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <span className="text-slate-400 font-bold uppercase text-xs block">
                          Venda total
                        </span>
                        <span className="font-bold text-slate-700">
                          {formatarMoeda(totalVendaGeral)}
                        </span>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <span className="text-slate-400 font-bold uppercase text-xs block">
                          Já distribuído
                        </span>
                        <span className="font-bold text-slate-700">
                          {formatarMoeda(totalPrevistoParcelas)}
                        </span>
                      </div>
                      <div
                        className={`${valorDistribuidoExcedente > 0 ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-100"} border rounded-lg p-3`}
                      >
                        <span className="text-slate-400 font-bold uppercase text-xs block">
                          Falta distribuir
                        </span>
                        <span
                          className={`font-bold ${valorDistribuidoExcedente > 0 ? "text-red-600" : "text-blue-700"}`}
                        >
                          {valorDistribuidoExcedente > 0
                            ? `Excedeu ${formatarMoeda(valorDistribuidoExcedente)}`
                            : formatarMoeda(valorRestanteDistribuirPositivo)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setNovaParcelaCliente({
                            ...novaParcelaCliente,
                            valor_previsto: String(
                              valorRestanteDistribuirPositivo.toFixed(2),
                            ),
                          })
                        }
                        className="text-xs font-bold text-[#2A6377] bg-[#2A6377]/10 px-3 py-2 rounded-lg hover:bg-[#2A6377]/20 transition"
                      >
                        Usar saldo restante
                      </button>
                      <p className="text-xs text-slate-400">
                        A data é digitada no formato dd/mm/aaaa para evitar o
                        problema do seletor nativo de data no StackBlitz.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg">Pagamentos Cliente</h3>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm min-w-[920px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3">Data Prevista</th>
                          <th className="p-3">Valor Previsto</th>
                          <th className="p-3">Data Recebimento</th>
                          <th className="p-3">Valor Recebido</th>
                          <th className="p-3">Status</th>
                          {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {parcelasCliente.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhuma parcela cadastrada.
                            </td>
                          </tr>
                        ) : (
                          parcelasCliente.map((parcela) => (
                            <tr
                              key={parcela.id}
                              className="border-t hover:bg-slate-50"
                            >
                              <td className="p-3 font-medium">
                                <div>{parcela.descricao}</div>
                                {parcela.observacao && (
                                  <div className="text-xs text-slate-400 font-normal mt-1">
                                    {parcela.observacao}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {formatarDataSegura(parcela.data_prevista)}
                              </td>
                              <td className="p-3 text-center font-bold">
                                {formatarMoeda(parcela.valor_previsto)}
                              </td>
                              <td className="p-3 text-center">
                                {parcela.data_realizada
                                  ? formatarDataSegura(parcela.data_realizada)
                                  : "-"}
                              </td>
                              <td className="p-3 text-center font-medium">
                                {Number(parcela.valor_realizado || 0) > 0
                                  ? formatarMoeda(parcela.valor_realizado)
                                  : "-"}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusParcela(parcela)}`}
                                >
                                  {labelStatusParcelaCalculado(parcela)}
                                </span>
                              </td>
                              {podeEditarObraSelecionada && (
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() =>
                                        abrirLiquidacaoParcela(parcela)
                                      }
                                      className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-xs font-bold hover:bg-[#1e4857] transition"
                                    >
                                      {Number(parcela.valor_realizado || 0) > 0
                                        ? "Editar"
                                        : "Liquidar"}
                                    </button>
                                    {Number(parcela.valor_realizado || 0) >
                                      0 && (
                                      <button
                                        onClick={() =>
                                          reabrirParcelaCliente(parcela)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                                      >
                                        Reabrir
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        deletarRegistroPMIS(
                                          "parcelas_cliente",
                                          parcela.id,
                                        )
                                      }
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {abaPainelObra === "faturamento" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Escopo Total
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatarMoeda(totalEscopoFaturamento)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Previsto
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formatarMoeda(totalPrevistoFaturamento)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Faturado
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatarMoeda(totalRealizadoFaturamento)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      À Faturar
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatarMoeda(saldoFaturarFamiliasPositivo)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Itens no Escopo
                    </p>
                    <p className="text-2xl font-bold text-[#2A6377]">
                      {familiasFaturamentoComEscopo.length}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Receipt size={18} className="text-[#2A6377]" /> Escopo
                      por Grupo/Família
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Cada linha representa uma combinação de grupo de faturamento, família e valor de escopo.
                      A mesma família pode aparecer em mais de um grupo. O escopo vem direto do pedido de
                      venda no ERP — ajustes são feitos lá, não neste sistema.
                    </p>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">
                            Grupo de Faturamento
                          </th>
                          <th className="p-3 text-right">Valor Total Escopo</th>
                          <th className="p-3 text-right">Faturado</th>
                          <th className="p-3 text-right">% Faturado</th>
                          <th className="p-3 text-right">À Faturar</th>
                          <th className="p-3 text-right">% À Faturar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {familiasFaturamento.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              Nenhuma família criada para esta obra. Verifique
                              se a função de regularização foi executada.
                            </td>
                          </tr>
                        ) : gruposFaturamentoResumo.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              Nenhum item de escopo informado. O escopo é
                              importado automaticamente do pedido de venda no ERP.
                            </td>
                          </tr>
                        ) : (
                          gruposFaturamentoResumo.map((linha) => {
                            const saldoGrupo = Math.max(
                              0,
                              Math.round(
                                (linha.valorEscopo - linha.valorFaturado) * 100,
                              ) / 100 || 0,
                            );
                            return (
                              <tr
                                key={linha.grupo.id}
                                className="border-t hover:bg-slate-50"
                              >
                                <td className="p-3 font-bold text-[#2A6377]">
                                  <div>
                                    {linha.grupo.codigo}
                                    {linha.grupo.descricao
                                      ? ` - ${linha.grupo.descricao}`
                                      : ""}
                                  </div>
                                  {linha.familia?.observacao && (
                                    <div className="text-[10px] text-slate-400 font-normal mt-1">
                                      {linha.familia.observacao}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold whitespace-nowrap">
                                  {formatarMoeda(linha.valorEscopo)}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                                  {formatarMoeda(linha.valorFaturado)}
                                </td>
                                <td className="p-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                                  {formatarPercentual(
                                    linha.valorFaturado,
                                    linha.valorEscopo,
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold whitespace-nowrap text-amber-700">
                                  {formatarMoeda(saldoGrupo)}
                                </td>
                                <td className="p-3 text-right font-semibold whitespace-nowrap text-amber-700">
                                  {formatarPercentual(saldoGrupo, linha.valorEscopo)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Activity size={18} className="text-[#2A6377]" />
                      Previsão x Realizado por Grupo de Faturamento
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Uma linha por material do pedido (grupo de faturamento),
                      exatamente como no ERP.
                    </p>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table
                      className="text-xs"
                      style={{
                        minWidth: `${360 + Math.max(competenciasFaturamento.length, 1) * 260}px`,
                      }}
                    >
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th
                            rowSpan={2}
                            className="p-3 text-left min-w-[260px] sticky left-0 bg-slate-50 z-20 border-r"
                          >
                            Grupo de Faturamento
                          </th>
                          {competenciasFaturamento.length === 0 ? (
                            <th className="p-3 text-center min-w-[260px]">
                              Competências
                            </th>
                          ) : (
                            competenciasFaturamento.map((comp) => (
                              <th
                                key={`grupo-${comp}`}
                                className="p-0 text-center min-w-[260px] border-r"
                                colSpan={2}
                              >
                                <div className="bg-[#2A6377] text-white p-2 font-bold">
                                  {formatarCompetencia(comp)}
                                </div>
                              </th>
                            ))
                          )}
                        </tr>
                        <tr>
                          {competenciasFaturamento.length === 0 ? (
                            <th className="p-3 text-center text-slate-400">
                              Sem previsão cadastrada
                            </th>
                          ) : (
                            competenciasFaturamento.map((comp) => (
                              <th key={`grupo-${comp}-sub`} className="p-0" colSpan={2}>
                                <div className="grid grid-cols-2 min-w-[260px]">
                                  <span className="p-2 border-r bg-slate-50">
                                    Previsto
                                  </span>
                                  <span className="p-2 bg-slate-50">
                                    Realizado
                                  </span>
                                </div>
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {gruposFaturamentoResumo.length === 0 ? (
                          <tr>
                            <td
                              colSpan={Math.max(competenciasFaturamento.length * 2 + 1, 2)}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhum grupo de faturamento com escopo informado.
                            </td>
                          </tr>
                        ) : (
                          gruposFaturamentoResumo.map((linha: any) => (
                            <tr
                              key={`grupo-matriz-${linha.grupo.codigo}`}
                              className="border-t hover:bg-slate-50"
                            >
                              <td className="p-3 font-bold text-[#2A6377] sticky left-0 bg-white z-10 border-r min-w-[260px]">
                                <div>
                                  {linha.grupo.codigo}
                                  {linha.grupo.descricao ? ` - ${linha.grupo.descricao}` : ""}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal mt-1">
                                  Escopo: {formatarMoeda(linha.valorEscopo)} • Faturado: {formatarMoeda(linha.valorFaturado)}
                                </div>
                              </td>
                              {competenciasFaturamento.length === 0 ? (
                                <td className="p-3 text-center text-slate-400">
                                  Sem previsão
                                </td>
                              ) : (
                                competenciasFaturamento.map((comp) => {
                                  const previsto = valorPrevistoGrupoCompetencia(
                                    linha.grupo.codigo,
                                    comp,
                                  );
                                  const realizado = valorRealizadoGrupoCompetencia(
                                    linha.grupo.codigo,
                                    comp,
                                  );
                                  return (
                                    <td
                                      key={`${linha.grupo.codigo}-${comp}-grupo-matriz`}
                                      className="p-0 border-r"
                                      colSpan={2}
                                    >
                                      <div className="grid grid-cols-2 min-w-[260px]">
                                        <span
                                          className={`p-3 text-right border-r whitespace-nowrap ${previsto > 0 ? "font-bold text-blue-700" : "text-slate-300"}`}
                                        >
                                          {previsto > 0
                                            ? formatarMoeda(previsto)
                                            : "-"}
                                        </span>
                                        <span
                                          className={`p-3 text-right whitespace-nowrap ${realizado > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}
                                        >
                                          {realizado > 0
                                            ? formatarMoeda(realizado)
                                            : "-"}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                      {competenciasFaturamento.length > 0 && gruposFaturamentoResumo.length > 0 && (
                        <tfoot className="bg-slate-100 border-t-2 border-[#2A6377] text-slate-800">
                          <tr>
                            <td className="p-3 font-black text-[#2A6377] sticky left-0 bg-slate-100 z-20 border-r min-w-[260px]">
                              TOTAL POR COMPETÊNCIA
                            </td>
                            {competenciasFaturamento.map((comp) => {
                              const totalPrevisto = totalPrevistoCompetencia(comp);
                              const totalRealizado = totalRealizadoCompetencia(comp);

                              return (
                                <td
                                  key={`${comp}-total-grupo-matriz`}
                                  className="p-0 border-r"
                                  colSpan={2}
                                >
                                  <div className="grid grid-cols-2 min-w-[260px]">
                                    <span className="p-3 text-right border-r whitespace-nowrap font-black text-blue-700">
                                      {totalPrevisto > 0 ? formatarMoeda(totalPrevisto) : "-"}
                                    </span>
                                    <span className="p-3 text-right whitespace-nowrap font-black text-emerald-700">
                                      {totalRealizado > 0 ? formatarMoeda(totalRealizado) : "-"}
                                    </span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                <FaturamentosRealizados
                  realizados={realizadosFaturamentoDoEscopo}
                  previsoes={previsoesFaturamentoDoEscopo}
                  familias={familiasFaturamento}
                  grupos={gruposFaturamentoObra}
                />
              </div>
            )}

            {abaPainelObra === "cronograma" && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                <div className="p-4 border-b">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Calendar size={18} className="text-[#2A6377]" /> Cronograma
                    Resumo
                  </h3>
                </div>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-sm min-w-[1120px]">
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
                <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-500">
                  As datas previstas podem ser ajustadas pelo botão Editar
                  prazos. Quando a fase ainda não tiver datas próprias, o
                  sistema usa o início e o prazo de entrega cadastrados na obra
                  como sugestão. As datas reais são registradas pelos botões
                  Iniciar e Finalizar, informando data e observação. Se uma fase foi iniciada por engano, use Voltar para não iniciado.
                </div>
              </div>
            )}

            {abaPainelObra === "documentos" && (
              <div className="space-y-6">
                {podeEditarObraSelecionada && (
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Plus size={18} /> Novo Documento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input
                        placeholder="Item"
                        value={novoDocumentoProjeto.item}
                        onChange={(e) =>
                          setNovoDocumentoProjeto({
                            ...novoDocumentoProjeto,
                            item: e.target.value,
                          })
                        }
                        className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        placeholder="Detalhes"
                        value={novoDocumentoProjeto.detalhes}
                        onChange={(e) =>
                          setNovoDocumentoProjeto({
                            ...novoDocumentoProjeto,
                            detalhes: e.target.value,
                          })
                        }
                        className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <button
                        onClick={salvarDocumentoProjeto}
                        disabled={carregando}
                        className="bg-[#2A6377] text-white rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        <Save size={16} /> Salvar
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                      Novos documentos entram como “Não Elaborado” e indicador
                      vermelho. Use os botões da lista para iniciar ou concluir.
                    </p>
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileText size={18} className="text-[#2A6377]" />{" "}
                      Documentos do Projeto
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm min-w-[1100px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3 text-left">Detalhes</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Indicador</th>
                          <th className="p-3">Conclusão</th>
                          <th className="p-3 text-left">Anexos</th>
                          {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {documentosProjeto.length === 0 ? (
                          <tr>
                            <td
                              colSpan={podeEditarObraSelecionada ? 7 : 6}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhum documento cadastrado.
                            </td>
                          </tr>
                        ) : (
                          documentosProjeto.map((doc) => (
                            <tr
                              key={doc.id}
                              className="border-t hover:bg-slate-50 align-top"
                            >
                              <td className="p-3 font-bold">{doc.item}</td>
                              <td className="p-3 text-slate-600 max-w-[260px]">
                                {doc.detalhes}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusDocumento(doc.status ?? "")}`}
                                >
                                  {labelStatusDocumento(doc.status ?? "")}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-block w-5 h-5 rounded-full border-2 border-slate-800 ${corIndicadorDocumento(doc.status ?? "")}`}
                                ></span>
                              </td>
                              <td className="p-3 text-center text-slate-700">
                                {doc.data_conclusao
                                  ? formatarDataSegura(doc.data_conclusao)
                                  : "-"}
                              </td>
                              <td className="p-3 min-w-[280px]">
                                <div className="space-y-2">
                                  {(arquivosDocumentos[doc.id] || []).length ===
                                  0 ? (
                                    <p className="text-xs text-slate-400 italic">
                                      Nenhum anexo.
                                    </p>
                                  ) : (
                                    (arquivosDocumentos[doc.id] || []).map(
                                      (arquivo: any) => (
                                        <div
                                          key={arquivo.id}
                                          className="flex items-center justify-between gap-2 bg-white border rounded-lg p-2 shadow-sm"
                                        >
                                          <button
                                            onClick={() =>
                                              abrirArquivoDocumento(arquivo)
                                            }
                                            className="text-left flex-1 min-w-0 hover:text-[#2A6377]"
                                          >
                                            <p className="font-medium text-xs truncate">
                                              {arquivo.nome_arquivo}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                              {formatarTamanhoArquivo(
                                                arquivo.tamanho_bytes,
                                              )}{" "}
                                              •{" "}
                                              {formatarDataSegura(
                                                arquivo.created_at,
                                              )}
                                            </p>
                                          </button>
                                          {podeEditarObraSelecionada && (
                                            <button
                                              onClick={() =>
                                                excluirArquivoDocumento(arquivo)
                                              }
                                              className="text-red-400 hover:text-red-600 shrink-0"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ),
                                    )
                                  )}
                                  {podeEditarObraSelecionada && (
                                    <label
                                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${uploadDocumentoId === doc.id ? "bg-slate-200 text-slate-500" : "bg-[#2A6377]/10 text-[#2A6377] hover:bg-[#2A6377]/20"}`}
                                    >
                                      {uploadDocumentoId === doc.id ? (
                                        <Loader2
                                          className="animate-spin"
                                          size={14}
                                        />
                                      ) : (
                                        <Plus size={14} />
                                      )}{" "}
                                      Anexar arquivo
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        disabled={uploadDocumentoId === doc.id}
                                        onChange={(e) => {
                                          const arquivo =
                                            e.target.files?.[0] || null;
                                          anexarArquivoDocumento(doc, arquivo);
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </td>
                              {podeEditarObraSelecionada && (
                                <td className="p-3 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    {doc.status === "nao_elaborado" && (
                                      <button
                                        onClick={() =>
                                          iniciarDocumentoProjeto(doc)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition w-24"
                                      >
                                        Iniciar
                                      </button>
                                    )}
                                    {doc.status === "em_andamento" && (
                                      <button
                                        onClick={() =>
                                          concluirDocumentoProjeto(doc)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition w-24"
                                      >
                                        Concluir
                                      </button>
                                    )}
                                    {doc.status === "concluido" && (
                                      <button
                                        onClick={() =>
                                          reabrirDocumentoProjeto(doc)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition w-24"
                                      >
                                        Reabrir
                                      </button>
                                    )}
                                    {doc.status !== "concluido" &&
                                      doc.status !== "em_andamento" && (
                                        <button
                                          onClick={() =>
                                            concluirDocumentoProjeto(doc)
                                          }
                                          className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition w-24"
                                        >
                                          Concluir
                                        </button>
                                      )}
                                    <button
                                      onClick={() =>
                                        deletarRegistroPMIS(
                                          "documentos_projeto",
                                          doc.id,
                                        )
                                      }
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {abaPainelObra === "diario_tarefas" && (
              <div className="flex flex-col gap-6 flex-1 items-start w-full">
                <div className="flex gap-2 border-b w-full">
                  {[
                    { id: "historico", label: "Histórico" },
                    { id: "anexos", label: "Anexos" },
                    { id: "tarefas", label: "Tarefas" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSubAbaDiario(sub.id as any)}
                      className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${subAbaDiario === sub.id ? "border-[#2A6377] text-[#2A6377]" : "border-transparent text-slate-500 hover:text-[#2A6377]"}`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {subAbaDiario === "historico" && (
                  <TimelineObra
                    idObra={obraEcoSelecionada.id}
                    usuarioAtualId={usuarioAtual?.id}
                    podeGerenciar={podeEditarObraSelecionada}
                    onAviso={mostrarAviso}
                  />
                )}

                {subAbaDiario === "anexos" && (
                  <AnexosObra
                    idObra={obraEcoSelecionada.id}
                    usuarioAtualId={usuarioAtual?.id}
                    podeGerenciar={podeEditarObraSelecionada}
                    onAviso={mostrarAviso}
                  />
                )}

                {subAbaDiario === "tarefas" && (
                <div className="flex flex-col bg-white p-5 rounded-xl shadow-sm border w-full">
                  <div className="border-b pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <CheckSquare size={20} className="text-[#2A6377]" /> Tarefas da Obra
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Crie e acompanhe tarefas avulsas da obra. Tarefas de reunião também aparecem aqui.
                      </p>
                    </div>
                    {podeEditarObraSelecionada && !["finalizada", "cancelada"].includes(obraEcoSelecionada.status ?? "") && (
                      <button
                        onClick={abrirModalNovaTarefaObra}
                        className="bg-[#2A6377] hover:bg-[#1e4857] text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Nova Tarefa
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { id: "abertas", label: "Abertas" },
                      { id: "atrasadas", label: "Atrasadas" },
                      { id: "pendente", label: "A Fazer" },
                      { id: "em_andamento", label: "Em Andamento" },
                      { id: "concluida", label: "Concluídas" },
                      { id: "cancelada", label: "Canceladas" },
                      { id: "todas", label: "Todas" },
                    ].map((filtro) => (
                      <button
                        key={filtro.id}
                        onClick={() => setFiltroTarefasObra(filtro.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${filtroTarefasObra === filtro.id ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                      >
                        {filtro.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 items-start flex-1">
                    <div className="flex-1 min-w-[260px] bg-gray-50 rounded-xl p-3 border">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm">A Fazer</h4>
                        <span className="bg-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {
                            tarefasPainelObra.filter(
                              (t) => t?.status === "pendente",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tarefasPainelObra
                          .filter((t) => t?.status === "pendente")
                          .map((tarefa) => (
                            <div
                              key={tarefa?.id}
                              onClick={() => setTarefaSelecionada(tarefa)}
                              className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer"
                            >
                              <p className="font-medium text-sm leading-tight mb-2">
                                {tarefa?.titulo}
                              </p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  {tarefa?.origem === "reuniao" ? "Reunião" : "Avulsa"}
                                </span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${tarefa?.prioridade === "critica" ? "bg-red-100 text-red-700" : tarefa?.prioridade === "alta" ? "bg-amber-100 text-amber-700" : tarefa?.prioridade === "baixa" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                                  {tarefa?.prioridade || "normal"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  <User size={10} className="inline mr-1" />
                                  {tarefa?.usuarios?.nome}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
                                >
                                  <Clock size={10} />{" "}
                                  {formatarDataSegura(tarefa?.data_vencimento)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[260px] bg-[#2A6377]/5 rounded-xl p-3 border border-[#2A6377]/20">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-[#2A6377]">
                          Em Andamento
                        </h4>
                        <span className="bg-[#2A6377]/20 text-[#2A6377] text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {
                            tarefasPainelObra.filter(
                              (t) => t?.status === "em_andamento",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tarefasPainelObra
                          .filter((t) => t?.status === "em_andamento")
                          .map((tarefa) => (
                            <div
                              key={tarefa?.id}
                              onClick={() => setTarefaSelecionada(tarefa)}
                              className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer"
                            >
                              <p className="font-medium text-sm leading-tight mb-2">
                                {tarefa?.titulo}
                              </p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  {tarefa?.origem === "reuniao" ? "Reunião" : "Avulsa"}
                                </span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${tarefa?.prioridade === "critica" ? "bg-red-100 text-red-700" : tarefa?.prioridade === "alta" ? "bg-amber-100 text-amber-700" : tarefa?.prioridade === "baixa" ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
                                  {tarefa?.prioridade || "normal"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  <User size={10} className="inline mr-1" />
                                  {tarefa?.usuarios?.nome}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
                                >
                                  <Clock size={10} />{" "}
                                  {formatarDataSegura(tarefa?.data_vencimento)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[260px] bg-green-50/50 rounded-xl p-3 border border-green-100">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-green-700">
                          Concluídas
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {tarefasPainelObra
                          .filter((t) => t?.status === "concluida")
                          .map((tarefa) => (
                            <div
                              key={tarefa?.id}
                              onClick={() => setTarefaSelecionada(tarefa)}
                              className="bg-white p-3 rounded shadow-sm border opacity-70 cursor-pointer hover:opacity-100"
                            >
                              <p className="font-medium text-sm leading-tight mb-2 line-through text-slate-500">
                                {tarefa?.titulo}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[260px] bg-red-50/40 rounded-xl p-3 border border-red-100">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm text-red-700">
                          Canceladas
                        </h4>
                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {tarefasPainelObra.filter((t) => t?.status === "cancelada").length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tarefasPainelObra
                          .filter((t) => t?.status === "cancelada")
                          .map((tarefa) => (
                            <div
                              key={tarefa?.id}
                              onClick={() => setTarefaSelecionada(tarefa)}
                              className="bg-white p-3 rounded shadow-sm border opacity-70 cursor-pointer hover:opacity-100"
                            >
                              <p className="font-medium text-sm leading-tight mb-2 line-through text-slate-500">
                                {tarefa?.titulo}
                              </p>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                Cancelada
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        )}

        {telaAtiva === "cadastros_equipe" && isAdmin && (
          <div className="animate-in fade-in dash-main-wrapper max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-slate-800">
              Cadastros &rarr; Equipe
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <form
                id="form-cadastro-colaborador"
                onSubmit={salvarUsuario}
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm border h-fit max-w-full"
              >
                <h3 className="text-lg font-bold mb-4 border-b pb-2">
                  {novoUsuario.id ? "Editar Colaborador" : "Novo Colaborador"}
                </h3>
                <div className="space-y-4 max-w-full">
                  <div>
                    <label className="block text-sm mb-1 max-w-full">
                      Nome
                    </label>
                    <input
                      required
                      type="text"
                      value={novoUsuario.nome}
                      onChange={(e) =>
                        setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                      }
                      className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 max-w-full">
                      E-mail
                    </label>
                    <input
                      required
                      type="email"
                      value={novoUsuario.email}
                      onChange={(e) =>
                        setNovoUsuario({
                          ...novoUsuario,
                          email: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 max-w-full">
                      Perfil
                    </label>
                    <select
                      value={novoUsuario.perfil}
                      onChange={(e) =>
                        setNovoUsuario({
                          ...novoUsuario,
                          perfil: e.target.value,
                        })
                      }
                      className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
                    >
                      {perfisUsuario.map((p) => (
                        <option key={p.valor} value={p.valor}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {novoUsuario.perfil === "assistente" && (
                    <div>
                      <label className="block text-sm mb-1 max-w-full">
                        Engenheiro vinculado
                      </label>
                      <select
                        required
                        value={novoUsuario.id_engenheiro_vinculado}
                        onChange={(e) =>
                          setNovoUsuario({
                            ...novoUsuario,
                            id_engenheiro_vinculado: e.target.value,
                          })
                        }
                        className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
                      >
                        <option value="">Selecione...</option>
                        {listaUsuarios
                          .filter((u) => u.perfil === "engenheiro" && u.id !== novoUsuario.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nome}
                            </option>
                          ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        O assistente passa a ter o mesmo acesso às obras deste engenheiro.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-6">
                  {novoUsuario.id && (
                    <button
                      type="button"
                      onClick={cancelarEdicaoUsuario}
                      className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg font-medium border"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto"
                  >
                    {novoUsuario.id ? (
                      <>
                        <Save size={18} className="inline mr-2" /> Salvar
                        alterações
                      </>
                    ) : (
                      <>
                        <Plus size={18} className="inline mr-2" /> Adicionar
                      </>
                    )}
                  </button>
                </div>
              </form>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border max-w-full">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">
                  Registados
                </h3>
                <div className="space-y-3 max-w-full">
                  {listaUsuarios.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => editarUsuario(user)}
                      className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg max-w-full cursor-pointer hover:border-[#2A6377] transition group"
                    >
                      <div
                        className={`p-2 rounded-full text-white shrink-0 ${user.perfil === "admin" ? "bg-[#2A6377]" : "bg-[#2A6377]/60"}`}
                      >
                        <User size={16} />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-sm truncate max-w-full">
                          {user.nome}{" "}
                          <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">
                            {labelPerfilUsuario(user.perfil ?? "")}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-full">
                          {user.email}
                        </p>
                        {user.perfil === "assistente" && (
                          <p className="text-[11px] text-[#2A6377] font-bold truncate max-w-full">
                            Assistente de:{" "}
                            {nomeUsuarioPorId(user.id_engenheiro_vinculado) ||
                              "não definido"}
                          </p>
                        )}
                      </div>
                      <Edit2
                        size={14}
                        className="text-slate-300 group-hover:text-[#2A6377] shrink-0 transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {telaAtiva === "cadastros_obras" && (
          <div className="animate-in fade-in dash-main-wrapper max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-slate-800">
              Cadastros &rarr; Obras
            </h2>
            <form
              id="form-cadastro-obra"
              onSubmit={salvarObra}
              className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8 max-w-full"
            >
              <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h3 className="text-xl font-bold">
                  {novaObra.id ? "Editar Obra" : "Nova Obra"}
                </h3>
                {novaObra.id && (
                  <button
                    type="button"
                    onClick={cancelarEdicaoObra}
                    className="text-gray-500 flex items-center gap-1 text-sm"
                  >
                    <X size={16} /> Cancelar
                  </button>
                )}
              </div>
              {erroObra && (
                <div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                  <AlertTriangle size={20} />{" "}
                  <span className="text-sm">{erroObra}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 max-w-full">
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Código *
                  </label>
                  <input
                    type="text"
                    value={novaObra.codigo_externo}
                    onChange={(e) =>
                      setNovaObra({
                        ...novaObra,
                        codigo_externo: e.target.value,
                      })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={novaObra.nome}
                    onChange={(e) =>
                      setNovaObra({ ...novaObra, nome: e.target.value })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Início *
                  </label>
                  <input
                    type="date"
                    value={novaObra.data_inicio}
                    onChange={(e) =>
                      setNovaObra({ ...novaObra, data_inicio: e.target.value })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Prazo Fim *
                  </label>
                  <input
                    type="date"
                    value={novaObra.data_previsao_fim}
                    onChange={(e) =>
                      setNovaObra({
                        ...novaObra,
                        data_previsao_fim: e.target.value,
                      })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Fase Atual
                  </label>
                  <select
                    value={novaObra.fase_atual}
                    onChange={(e) =>
                      setNovaObra({ ...novaObra, fase_atual: e.target.value })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] bg-white max-w-full"
                  >
                    {fasesProjeto.map((fase) => (
                      <option key={fase.valor} value={fase.valor}>
                        {fase.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 max-w-full">
                    Responsável *
                  </label>
                  {isAdmin ? (
                    <select
                      value={novaObra.id_responsavel}
                      onChange={(e) =>
                        setNovaObra({
                          ...novaObra,
                          id_responsavel: e.target.value,
                        })
                      }
                      className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full bg-white"
                    >
                      <option value="">Selecione...</option>
                      {listaUsuarios
                        .filter((user) => user.perfil === "engenheiro")
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.nome}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="w-full border p-3 rounded-lg bg-slate-50 text-slate-700 max-w-full">
                      {nomeUsuarioPorId(idResponsavelEscopo) ||
                        usuarioAtual?.nome ||
                        "Usuário atual"}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 max-w-full">
                    Descrição da Obra
                  </label>
                  <textarea
                    rows={3}
                    value={novaObra.descricao}
                    onChange={(e) =>
                      setNovaObra({ ...novaObra, descricao: e.target.value })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                    placeholder="Descreva o escopo, ambientes, objetivo do projeto etc."
                  ></textarea>
                </div>

                <div className="border-t pt-4 md:col-span-2 mt-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Financeiro (Valores de Venda)
                  </p>
                </div>
                <div className="relative">
                  <label className="block text-sm mb-1 max-w-full">
                    Valor Total (Materiais)
                  </label>
                  <span className="absolute left-3 top-[30px] text-slate-400 text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={novaObra.valor_produto}
                    onChange={(e) =>
                      setNovaObra({
                        ...novaObra,
                        valor_produto: e.target.value,
                      })
                    }
                    className="w-full border p-3 pl-8 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm mb-1 max-w-full">
                    Valor Total (Serviço)
                  </label>
                  <span className="absolute left-3 top-[30px] text-slate-400 text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={novaObra.valor_servico}
                    onChange={(e) =>
                      setNovaObra({
                        ...novaObra,
                        valor_servico: e.target.value,
                      })
                    }
                    className="w-full border p-3 pl-8 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 max-w-full">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    value={novaObra.observacoes}
                    onChange={(e) =>
                      setNovaObra({ ...novaObra, observacoes: e.target.value })
                    }
                    className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377] max-w-full"
                    placeholder="Informações internas, premissas ou alertas."
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t max-w-full">
                <button
                  type="submit"
                  disabled={carregando}
                  className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-medium w-full sm:w-auto"
                >
                  <Save size={20} className="inline mr-2" /> Salvar
                </button>
              </div>
            </form>

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 max-w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-2 max-w-full">
                <h3 className="text-lg font-bold max-w-full">
                  Todas as Obras (Banco de Dados)
                </h3>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="filtro-status-cadastro-obras"
                    className="text-sm font-medium text-slate-500 whitespace-nowrap"
                  >
                    Status:
                  </label>
                  <select
                    id="filtro-status-cadastro-obras"
                    value={filtroStatusCadastroObras}
                    onChange={(e) =>
                      setFiltroStatusCadastroObras(e.target.value as any)
                    }
                    className="border rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-[#2A6377] bg-white"
                  >
                    <option value="em_andamento">Em Andamento</option>
                    <option value="finalizada">Finalizadas</option>
                    <option value="cancelada">Canceladas</option>
                    <option value="todas">Todas</option>
                  </select>
                </div>
              </div>
              {obrasCadastroLista.length === 0 ? (
                <p className="text-gray-500 text-sm max-w-full truncate">
                  {filtroStatusCadastroObras === "todas"
                    ? "Nenhuma obra."
                    : `Nenhuma obra ${labelStatusObra(filtroStatusCadastroObras).toLowerCase()}.`}
                </p>
              ) : (
                <div className="overflow-x-auto pb-2 max-w-full">
                  <table className="w-full text-left border-collapse min-w-[700px] max-w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-sm border-y max-w-full">
                        <th className="p-3 max-w-full truncate">Código</th>
                        <th className="p-3 max-w-full truncate">Nome</th>
                        <th className="p-3 max-w-full truncate">Fase</th>
                        <th className="p-3 max-w-full truncate">Responsável</th>
                        <th className="p-3 max-w-full truncate">Status</th>
                        <th className="p-3 max-w-full truncate">
                          Prazo Entrega
                        </th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm max-w-full">
                      {obrasCadastroLista.map((obra) => (
                        <tr
                          key={obra.id}
                          className="border-b hover:bg-slate-50 max-w-full"
                        >
                          <td className="p-3 text-slate-700 max-w-full truncate">
                            {obra.codigo_externo}
                          </td>
                          <td className="p-3 font-bold text-[#2A6377] max-w-full truncate">
                            {obra.nome}
                          </td>
                          <td className="p-3 text-slate-600 max-w-full truncate">
                            {labelFase(obra.fase_atual || "processo_inicial")}
                          </td>
                          <td className="p-3 text-slate-600 max-w-full truncate">
                            {obra.usuarios?.nome}
                          </td>
                          <td className="p-3 max-w-full truncate">
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${classeStatusObra(obra.status ?? "")}`}
                            >
                              {labelStatusObra(obra.status ?? "")}
                            </span>
                            {obra.status === "finalizada" && obra.data_finalizacao && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                em {formatarDataSegura(obra.data_finalizacao)}
                              </p>
                            )}
                            {obra.status === "cancelada" && obra.data_cancelamento && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                em {formatarDataSegura(obra.data_cancelamento)}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 max-w-full truncate">
                            {formatarDataSegura(obra.data_previsao_fim)}
                          </td>
                          <td className="p-3 text-right flex justify-end gap-2">
                            <button
                              onClick={() => abrirPainelObra(obra)}
                              className="text-[#2A6377] bg-[#2A6377]/10 hover:bg-[#2A6377] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1"
                            >
                              <FolderOpen size={14} /> Painel
                            </button>
                            {podeEditarObra(obra) && (
                              <button
                                onClick={() => editarObra(obra)}
                                className="text-slate-400 hover:text-[#2A6377] p-1.5 bg-slate-100 rounded transition"
                                title="Editar cadastro da obra"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {telaAtiva === "reunioes" && (
          <div className="animate-in fade-in dash-main-wrapper max-w-full flex flex-col items-start gap-4 xl:h-full xl:min-h-0">
            <div className="w-full flex flex-wrap items-end justify-between gap-3 shrink-0">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
                Reuniões
              </h2>
              <div className="inline-flex rounded-lg border overflow-hidden text-sm bg-white">
                {(
                  [
                    ["historico", "Reuniões anteriores"],
                    ["nova", "Nova reunião"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    onClick={() => setAbaReunioes(valor)}
                    className={`px-4 py-2 font-semibold transition ${abaReunioes === valor ? "bg-[#2A6377] text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {rotulo}
                    {valor === "nova" && idSessaoAtaAtual ? " •" : ""}
                  </button>
                ))}
              </div>
            </div>
            {abaReunioes === "historico" ? (
              <ReunioesHistorico
                recarregar={versaoHistoricoReunioes}
                onBaixarPdf={gerarVisualPDF}
                onReenviarEmail={enviarAtaPorEmailResend}
                onAviso={mostrarAviso}
              />
            ) : (
              <>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border mb-2 border-l-4 border-l-[#2A6377] w-full max-w-full">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 max-w-full">
                <div className="flex-1 max-w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 max-w-full">
                      1. Selecione o Gestor
                    </label>
                    <select
                      className="w-full border rounded-lg p-3 outline-none font-bold bg-gray-50 max-w-full"
                      value={gestorSelecionadoAta}
                      onChange={(e) => {
                        setGestorSelecionadoAta(e.target.value);
                        setReuniaoForm({ ...reuniaoForm, id_obra: "" });
                      }}
                    >
                      <option value="">Todos os gestores</option>
                      {gestoresComObrasAta.map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 max-w-full">
                      2. Selecione a Obra
                    </label>
                    <select
                      className="w-full border rounded-lg p-3 outline-none font-bold bg-gray-50 max-w-full"
                      value={reuniaoForm.id_obra}
                      onChange={(e) =>
                        setReuniaoForm({
                          ...reuniaoForm,
                          id_obra: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {gestorSelecionadoAta
                          ? "Selecione..."
                          : "Selecione um gestor primeiro (ou escolha aqui)"}
                      </option>
                      {obrasLista
                        .filter(
                          (obra) =>
                            !gestorSelecionadoAta ||
                            obra.id_responsavel === gestorSelecionadoAta,
                        )
                        .map((obra) => {
                          const jaSalva = obrasNaAtaAtual.some(
                            (ob: any) => ob.id_obra === obra.id,
                          );
                          return (
                            <option key={obra.id} value={obra.id}>
                              {jaSalva ? "✅ [SALVA] " : ""}
                              {obra.codigo_externo} - {obra.nome}
                            </option>
                          );
                        })}
                    </select>
                    {obrasNaAtaAtual.some(
                      (ob: any) => ob.id_obra === reuniaoForm.id_obra,
                    ) && (
                      <p className="text-amber-600 text-[10px] sm:text-xs mt-1 font-bold w-full">
                        ⚠️ Esta obra já foi registrada. Para alterar, clique
                        no botão de edição na tag abaixo.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto max-w-full">
                  <button
                    onClick={salvarReuniaoObra}
                    disabled={
                      carregando ||
                      !reuniaoForm.id_obra ||
                      obrasNaAtaAtual.some(
                        (ob: any) => ob.id_obra === reuniaoForm.id_obra,
                      )
                    }
                    className="bg-[#2A6377]/10 text-[#2A6377] px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50 flex-1 w-full sm:w-auto max-w-full"
                  >
                    <Loader2
                      className={`animate-spin shrink-0 ${carregando ? "block" : "hidden"}`}
                      size={18}
                    />
                    <Save
                      size={18}
                      className={`shrink-0 ${carregando ? "hidden" : "block"}`}
                    />{" "}
                    Salvar Obra na Ata
                  </button>
                  <button
                    onClick={gerarAtaFinal}
                    disabled={obrasNaAtaAtual.length === 0}
                    className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-md disabled:opacity-50 flex-1 w-full sm:w-auto max-w-full"
                  >
                    <Mail size={18} className="shrink-0" /> Fechar Ata & PDF
                  </button>
                </div>
              </div>
              {obrasNaAtaAtual.length > 0 && (
                <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-2 max-w-full">
                  <span className="text-sm font-medium text-gray-500 mr-2 max-w-full">
                    Obras finalizadas para esta ata:
                  </span>
                  {obrasNaAtaAtual.map((ob, idx) => (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 max-w-full truncate shadow-sm border border-green-200"
                      title={`Gestor: ${ob.nome_gestor}`}
                    >
                      <CheckCheck size={14} /> {ob.nome_gestor} · {ob.nome_obra}
                      <button
                        onClick={() => editarRegistroAta(ob, idx)}
                        className="ml-2 hover:bg-green-200 hover:text-green-900 bg-green-100 rounded-full p-1 transition-colors"
                        title="Reabrir para Edição"
                      >
                        <Edit2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {gravacaoAta && (
              <div className="w-full bg-white border border-l-4 border-l-violet-500 rounded-xl shadow-sm shrink-0">
                <button
                  onClick={() => setResumoGravacaoAberto((aberto) => !aberto)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-700">
                    <Mic size={16} className="text-violet-600" />
                    Resumo da gravação da reunião (Plaud)
                    {gravacaoAta.duracaoSeg ? (
                      <span className="text-xs font-normal text-slate-400">
                        · {Math.floor(gravacaoAta.duracaoSeg / 3600)}h
                        {String(
                          Math.floor((gravacaoAta.duracaoSeg % 3600) / 60),
                        ).padStart(2, "0")}
                        min
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-violet-700 font-semibold shrink-0">
                    {resumoGravacaoAberto ? "Ocultar" : "Ver resumo"}
                  </span>
                </button>
                {resumoGravacaoAberto && (
                  <div className="px-4 pb-3 border-t">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap max-h-72 overflow-y-auto pt-3">
                      {gravacaoAta.resumo}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,500px)] gap-4 items-start xl:flex-1 xl:min-h-0 xl:items-stretch">
              <div className="flex flex-col gap-4 min-w-0 xl:overflow-y-auto xl:min-h-0 xl:pr-1">
                <div className="bg-white p-4 rounded-xl shadow-sm border w-full flex flex-col items-start">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-3 w-full">
                    <h3 className="text-base font-bold">3. Resumo</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">
                        Data da Reunião
                      </label>
                      <input
                        type="date"
                        className="border rounded-lg p-1.5 text-sm outline-none"
                        value={reuniaoForm.data_reuniao}
                        onChange={(e) =>
                          setReuniaoForm({
                            ...reuniaoForm,
                            data_reuniao: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  {reuniaoForm.id_obra && (
                    <div className="w-full mb-3 bg-slate-50 border rounded-lg p-2.5">
                      {carregandoContextoAta ? (
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />{" "}
                          Carregando contexto da obra...
                        </p>
                      ) : contextoObraAta &&
                        (contextoObraAta.tarefasAtrasadas.length > 0 ||
                          contextoObraAta.valorVencido > 0 ||
                          contextoObraAta.fasesAtrasadas.length > 0) ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Contexto para a conversa
                          </p>
                          {contextoObraAta.valorVencido > 0 && (
                            <p className="text-xs text-red-600 font-semibold">
                              🔴 Financeiro vencido:{" "}
                              {formatarMoeda(contextoObraAta.valorVencido)}
                            </p>
                          )}
                          {contextoObraAta.fasesAtrasadas.length > 0 && (
                            <p className="text-xs text-red-600 font-semibold">
                              🔴 {contextoObraAta.fasesAtrasadas.length}{" "}
                              fase(s) de cronograma atrasada(s):{" "}
                              {contextoObraAta.fasesAtrasadas
                                .map((f: any) => labelFase(f.fase))
                                .join(", ")}
                            </p>
                          )}
                          {contextoObraAta.tarefasAtrasadas.length > 0 && (
                            <p className="text-xs text-amber-600 font-semibold">
                              🟡 {contextoObraAta.tarefasAtrasadas.length}{" "}
                              tarefa(s) atrasada(s):{" "}
                              {contextoObraAta.tarefasAtrasadas
                                .map((t: any) => t.titulo)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-green-600 font-semibold">
                          🟢 Nenhum ponto de atenção (financeiro, cronograma
                          ou tarefas) para esta obra.
                        </p>
                      )}
                    </div>
                  )}
                  <label className="block text-sm mb-1">Resumo Geral</label>
                  <textarea
                    rows={5}
                    className="w-full border rounded-lg p-3 outline-none"
                    value={reuniaoForm.resumo_geral}
                    onChange={(e) =>
                      setReuniaoForm({
                        ...reuniaoForm,
                        resumo_geral: e.target.value,
                      })
                    }
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 items-stretch">
                  <div className="bg-white p-4 rounded-xl shadow-sm border w-full flex flex-col items-start min-w-0">
                    <h3 className="text-base font-bold mb-3 border-b pb-2 w-full">
                      4. Ocorrências
                    </h3>
                    <div className="flex flex-col gap-2 w-full flex-1 min-h-0">
                      <div className="flex items-center gap-2 w-full">
                        <label className="text-xs text-slate-500 shrink-0">
                          Tipo
                        </label>
                        <select
                          className="border rounded-lg p-2 flex-1 outline-none text-sm"
                          value={novaOcorrencia.tipo}
                          onChange={(e) =>
                            setNovaOcorrencia({
                              ...novaOcorrencia,
                              tipo: e.target.value,
                            })
                          }
                        >
                          <option value="avanco">Avanço</option>
                          <option value="atraso">Atraso</option>
                          <option value="financeiro">Financeiro</option>
                          <option value="fornecedor">Fornecedor</option>
                          <option value="acidente">Acidente</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>
                      <textarea
                        className="border rounded-lg p-3 w-full flex-1 min-h-[110px] outline-none text-sm resize-none"
                        placeholder="Descreva a ocorrência... (Ctrl+Enter para adicionar)"
                        value={novaOcorrencia.descricao}
                        onChange={(e) =>
                          setNovaOcorrencia({
                            ...novaOcorrencia,
                            descricao: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.ctrlKey || e.metaKey) &&
                          adicionarOcorrencia()
                        }
                      />
                      <button
                        onClick={adicionarOcorrencia}
                        className="self-end bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm transition"
                      >
                        Adicionar
                      </button>
                    </div>
                    {listaOcorrencias.map((oc, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50 p-2 mt-2 rounded border text-sm w-full"
                      >
                        <div className="min-w-0 whitespace-pre-wrap">
                          <span className="font-semibold text-[#2A6377] capitalize">
                            {labelOcorrencia(oc.tipo)}:
                          </span>{" "}
                          {oc.descricao}
                        </div>
                        <button
                          onClick={() =>
                            setListaOcorrencias(
                              listaOcorrencias.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-red-400 hover:text-red-600 ml-2 shrink-0"
                        >
                          <Trash2 size={16} className="shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border w-full flex flex-col items-start min-w-0">
                    <h3 className="text-base font-bold mb-3 border-b pb-2 w-full">
                      5. Gerar Tarefas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2 mb-2 w-full">
                      <input
                        type="text"
                        className="border rounded-lg p-2 w-full outline-none text-sm"
                        placeholder="O que precisa ser feito..."
                        value={novaTarefa.titulo}
                        onChange={(e) =>
                          setNovaTarefa({
                            ...novaTarefa,
                            titulo: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        className="border rounded-lg p-2 w-full outline-none text-sm"
                        value={novaTarefa.data_vencimento}
                        onChange={(e) =>
                          setNovaTarefa({
                            ...novaTarefa,
                            data_vencimento: e.target.value,
                          })
                        }
                      />
                    </div>
                    <textarea
                      rows={2}
                      className="border rounded-lg p-2 w-full outline-none text-sm mb-2"
                      placeholder="Descrição / contexto da tarefa..."
                      value={novaTarefa.descricao}
                      onChange={(e) =>
                        setNovaTarefa({
                          ...novaTarefa,
                          descricao: e.target.value,
                        })
                      }
                    />
                    <div className="flex flex-wrap gap-2 w-full items-start">
                      <select
                        className="border rounded-lg p-2 flex-1 min-w-[140px] outline-none text-sm"
                        value={novaTarefa.id_responsavel}
                        onChange={(e) =>
                          setNovaTarefa({
                            ...novaTarefa,
                            id_responsavel: e.target.value,
                          })
                        }
                      >
                        <option value="">Atribuir a...</option>
                        {listaUsuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                      <select
                        className="border rounded-lg p-2 flex-1 min-w-[140px] outline-none text-sm"
                        value={novaTarefa.prioridade}
                        onChange={(e) =>
                          setNovaTarefa({
                            ...novaTarefa,
                            prioridade: e.target.value,
                          })
                        }
                      >
                        <option value="baixa">Prioridade baixa</option>
                        <option value="normal">Prioridade normal</option>
                        <option value="alta">Prioridade alta</option>
                        <option value="critica">Prioridade crítica</option>
                      </select>
                      <button
                        onClick={adicionarTarefa}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-bold text-sm transition"
                      >
                        Adicionar
                      </button>
                    </div>
                    {listaTarefas.map((tar, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-2.5 mt-2 rounded border text-sm gap-2 w-full"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold block truncate">
                            {tar.titulo}
                          </span>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <User size={12} className="shrink-0" />{" "}
                              {tar.nome_responsavel}
                            </span>
                            <span className="flex items-center gap-1 truncate uppercase">
                              Origem: reunião
                            </span>
                            <span className="flex items-center gap-1 truncate uppercase">
                              Prioridade: {tar.prioridade || "normal"}
                            </span>
                            {tar.data_vencimento && (
                              <span className="flex items-center gap-1 truncate">
                                <Clock size={12} className="shrink-0" /> Prazo:{" "}
                                {formatarDataSegura(tar.data_vencimento)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setListaTarefas(
                              listaTarefas.filter((_, i) => i !== idx),
                            )
                          }
                          className="text-red-400 hover:text-red-600 bg-white p-2 rounded shadow-sm border self-end sm:self-auto shrink-0 ml-auto sm:ml-0"
                        >
                          <Trash2 size={16} className="shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col min-w-0 xl:min-h-0 xl:h-full">
                {reuniaoForm.id_obra ? (
                  <>
                    <p className="text-xs text-slate-500 mb-2 truncate">
                      Obra:{" "}
                      {(() => {
                        const o = obrasLista.find(
                          (ob) => ob.id === reuniaoForm.id_obra,
                        );
                        return o ? `${o.codigo_externo} - ${o.nome}` : "";
                      })()}
                    </p>
                    <div className="flex flex-col xl:flex-1 xl:min-h-0">
                      <TimelineObra
                        idObra={reuniaoForm.id_obra}
                        usuarioAtualId={usuarioAtual?.id}
                        podeGerenciar={podeEditarObra(
                          obrasLista.find((o) => o.id === reuniaoForm.id_obra),
                        )}
                        mostrarFormularios={false}
                        preencherAltura
                        onAviso={mostrarAviso}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400 flex flex-col items-center justify-center gap-2 py-16 text-center xl:flex-1">
                    <Clock size={28} />
                    Selecione uma obra para ver o histórico (últimas reuniões,
                    pendências e diário).
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {telaAtiva === "tarefas" && (
          <div className="animate-in fade-in h-full flex flex-col dash-main-wrapper max-w-full">
            <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 max-w-full">
              <div className="max-w-full">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 max-w-full truncate">
                  Tarefas
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-sm font-medium text-gray-500 shrink-0">
                  Filtrar:
                </label>
                <select
                  className="border rounded-lg p-2 outline-none font-medium bg-white shadow-sm w-full sm:w-auto shrinking-0 max-w-full"
                  value={filtroObraKanban}
                  onChange={(e) => setFiltroObraKanban(e.target.value)}
                >
                  <option value="todas">Todas as Obras</option>
                  {obrasLista.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo_externo} - {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            </header>
            <div className="flex gap-6 overflow-x-auto pb-4 items-start flex-1 max-w-full">
              <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-gray-100/50 rounded-xl p-4 border flex flex-col max-w-full">
                <div className="flex justify-between items-center mb-4 max-w-full">
                  <h3 className="font-bold max-w-full truncate">A Fazer</h3>
                  <span className="bg-gray-200 text-xs px-2 py-1 rounded-full shrink-0">
                    {
                      tarefasFiltradas.filter((t) => t?.status === "pendente")
                        .length
                    }
                  </span>
                </div>
                <div className="space-y-3 max-w-full">
                  {tarefasFiltradas
                    .filter((t) => t?.status === "pendente")
                    .map((tarefa) => (
                      <div
                        key={tarefa.id}
                        onClick={() => setTarefaSelecionada(tarefa)}
                        className="bg-white p-4 rounded-lg shadow-sm border hover:border-[#2A6377] transition group max-w-full cursor-pointer relative"
                      >
                        <div className="flex justify-between items-start mb-2 max-w-full">
                          <span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded max-w-full truncate">
                            {tarefa.obras?.codigo_externo || "Geral"}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                            <User size={10} className="shrink-0" />{" "}
                            {tarefa.usuarios?.nome || "Geral"}
                          </span>
                        </div>
                        <p className="font-medium text-sm my-3 max-w-full truncate">
                          {tarefa.titulo || "Sem Título"}
                        </p>
                        <div className="flex justify-between items-center border-t pt-3 mt-3 max-w-full flex-wrap gap-2">
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <div
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"}`}
                            >
                              <Clock size={12} className="shrink-0" /> Prazo:{" "}
                              {formatarDataSegura(tarefa.data_vencimento)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-[#2A6377]/5 rounded-xl p-4 border border-[#2A6377]/20 flex flex-col max-w-full">
                <div className="flex justify-between items-center mb-4 max-w-full">
                  <h3 className="font-bold text-gray-700 max-w-full truncate">
                    Em Andamento
                  </h3>
                  <span className="bg-[#2A6377]/20 text-[#2A6377] text-xs px-2 py-1 rounded-full shrink-0">
                    {
                      tarefasFiltradas.filter(
                        (t) => t?.status === "em_andamento",
                      ).length
                    }
                  </span>
                </div>
                <div className="space-y-3 max-w-full">
                  {tarefasFiltradas
                    .filter((t) => t?.status === "em_andamento")
                    .map((tarefa) => (
                      <div
                        key={tarefa.id}
                        onClick={() => setTarefaSelecionada(tarefa)}
                        className={`bg-white p-4 rounded-lg shadow-sm border max-w-full cursor-pointer relative ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "border-red-300" : "border-gray-200 hover:border-[#2A6377]"}`}
                      >
                        <div className="flex justify-between items-start mb-2 max-w-full">
                          <span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded max-w-full truncate">
                            {tarefa.obras?.codigo_externo || "Geral"}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                            <User size={10} className="shrink-0" />{" "}
                            {tarefa.usuarios?.nome || "Geral"}
                          </span>
                        </div>
                        <p className="font-medium text-sm my-3 max-w-full truncate">
                          {tarefa.titulo || "Sem Título"}
                        </p>
                        <div className="flex justify-between items-center border-t pt-3 mt-3 max-w-full flex-wrap gap-2">
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <div
                              className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa.data_vencimento, tarefa.status) ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600"}`}
                            >
                              <Clock size={12} className="shrink-0" /> Prazo:{" "}
                              {formatarDataSegura(tarefa.data_vencimento)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-green-50/30 rounded-xl p-4 border border-green-100 flex flex-col max-w-full">
                <div className="flex justify-between items-center mb-4 max-w-full">
                  <h3 className="font-bold text-gray-700 max-w-full truncate">
                    Concluídas
                  </h3>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full shrink-0">
                    {
                      tarefasFiltradas.filter((t) => t?.status === "concluida")
                        .length
                    }
                  </span>
                </div>
                <div className="space-y-3 max-w-full">
                  {tarefasFiltradas
                    .filter((t) => t?.status === "concluida")
                    .map((tarefa) => (
                      <div
                        key={tarefa.id}
                        onClick={() => setTarefaSelecionada(tarefa)}
                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-70 max-w-full cursor-pointer relative hover:border-[#2A6377]"
                      >
                        <div className="flex justify-between items-start mb-2 max-w-full">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-full truncate">
                            {tarefa.obras?.codigo_externo || "Geral"}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1">
                            <User size={10} className="shrink-0" />{" "}
                            {tarefa.usuarios?.nome || "Geral"}
                          </span>
                        </div>
                        <p className="font-medium text-gray-500 line-through text-sm my-3 max-w-full truncate">
                          {tarefa.titulo || "Sem Título"}
                        </p>
                        <div className="flex justify-end border-t pt-3 mt-3 max-w-full">
                          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-600 shrink-0 ml-auto">
                            <CheckCircle2 size={12} className="shrink-0" />{" "}
                            Feito
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
