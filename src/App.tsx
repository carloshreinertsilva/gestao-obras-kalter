import { useState, useEffect } from "react";
import { supabase } from "./supabase";
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
} from "lucide-react";

export default function App() {
  const [sessao, setSessao] = useState<any>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
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

  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);

  // Obras com os valores de venda
  const [novoUsuario, setNovoUsuario] = useState<any>({
    nome: "",
    email: "",
    perfil: "engenheiro",
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
  const [obrasLista, setObrasLista] = useState<any[]>([]);

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
    data_vencimento: "",
    id_responsavel: "",
  });
  const [listaTarefas, setListaTarefas] = useState<any[]>([]);

  const [historicoObra, setHistoricoObra] = useState<any[]>([]);

  const [ataGerada, setAtaGerada] = useState<string>("");
  const [modalAtaAberto, setModalAtaAberto] = useState<boolean>(false);
  const [obrasNaAtaAtual, setObrasNaAtaAtual] = useState<any[]>([]);

  const [tarefasKanban, setTarefasKanban] = useState<any[]>([]);
  const [filtroObraKanban, setFiltroObraKanban] = useState<string>("todas");
  const [minhasNotificacoes, setMinhasNotificacoes] = useState<any[]>([]);
  const [painelNotificacaoAberto, setPainelNotificacaoAberto] =
    useState<boolean>(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);

  const [tarefaSelecionada, setTarefaSelecionada] = useState<any>(null);

  const [obraEcoSelecionada, setObraEcoSelecionada] = useState<any>(null);
  const [novoDiarioTexto, setNovoDiarioTexto] = useState<string>("");
  const [comentariosTarefaAtual, setComentariosTarefaAtual] = useState<any[]>(
    [],
  );
  const [novoComentarioTexto, setNovoComentarioTexto] = useState<string>("");

  const [diarioEmEdicao, setDiarioEmEdicao] = useState<any>(null);
  const [reuniaoEmEdicao, setReuniaoEmEdicao] = useState<any>(null);

  // ESTADOS DO FINANCEIRO
  const [faturamentosObra, setFaturamentosObra] = useState<any[]>([]);
  const [novoFaturamento, setNovoFaturamento] = useState<any>({
    numero_nf: "",
    tipo: "produto",
    valor: "",
  });

  // ESTADOS DO PMIS
  const [abaPainelObra, setAbaPainelObra] = useState<string>("resumo");
  const [parcelasCliente, setParcelasCliente] = useState<any[]>([]);
  const [documentosProjeto, setDocumentosProjeto] = useState<any[]>([]);
  const [cronogramaObra, setCronogramaObra] = useState<any[]>([]);
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
  const [familiasFaturamento, setFamiliasFaturamento] = useState<any[]>([]);
  const [previsoesFaturamento, setPrevisoesFaturamento] = useState<any[]>([]);
  const [realizadosFaturamento, setRealizadosFaturamento] = useState<any[]>([]);
  const [familiaFaturamentoEmEdicao, setFamiliaFaturamentoEmEdicao] =
    useState<any>(null);
  const [formFamiliaFaturamento, setFormFamiliaFaturamento] = useState<any>({
    grupo_faturamento: "",
    valor_total_escopo: "",
    observacao: "",
  });
  const [modalEscopoFaturamentoAberto, setModalEscopoFaturamentoAberto] =
    useState<boolean>(false);
  const [escopoFaturamentoDraft, setEscopoFaturamentoDraft] = useState<any[]>(
    [],
  );
  const [novaPrevisaoFaturamento, setNovaPrevisaoFaturamento] = useState<any>({
    id_obra_faturamento_familia: "",
    competencia: "",
    valor_previsto: "",
    grupo_faturamento: "",
    observacao: "",
  });
  const [previsaoParaRealizar, setPrevisaoParaRealizar] = useState<any>(null);
  const [realizacaoFaturamento, setRealizacaoFaturamento] = useState<any>({
    competencia: "",
    data_faturamento: "",
    numero_nf: "",
    valor_realizado: "",
    observacao: "",
  });

  const formatarDataSegura = (dataStr: any) => {
    if (!dataStr) return "Sem prazo";
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return "Data Inválida";
      return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch (e) {
      return "Data Inválida";
    }
  };

  const formatarDataHora = (dataStr: any) => {
    if (!dataStr) return "";
    try {
      const d = new Date(dataStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString("pt-BR", {
        timeZone: "UTC",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const formatarMoeda = (valor: any) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(valor) || 0);
  };

  const dataHojeISO = () => new Date().toISOString().split("T")[0];

  const competenciaParaData = (competencia: string) => {
    if (!competencia) return null;
    if (/^\d{4}-\d{2}$/.test(competencia)) return `${competencia}-01`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(competencia))
      return competencia.slice(0, 7) + "-01";
    return null;
  };

  const formatarCompetencia = (competencia: any) => {
    if (!competencia) return "-";
    const dataISO = String(competencia).slice(0, 10);
    const data = new Date(`${dataISO}T00:00:00`);
    if (isNaN(data.getTime())) return String(competencia);
    const meses = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    return `${meses[data.getUTCMonth()]}/${String(data.getUTCFullYear()).slice(-2)}`;
  };

  const selecionarTextoAoFocar = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  const isoParaDataBR = (dataStr: any) => {
    if (!dataStr) return "";
    const dataLimpa = String(dataStr).split("T")[0];
    const partes = dataLimpa.split("-");
    if (partes.length !== 3) return "";
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const formatarEntradaDataBR = (valor: string) => {
    const somenteNumeros = valor.replace(/\D/g, "").slice(0, 8);
    const dia = somenteNumeros.slice(0, 2);
    const mes = somenteNumeros.slice(2, 4);
    const ano = somenteNumeros.slice(4, 8);
    if (somenteNumeros.length <= 2) return dia;
    if (somenteNumeros.length <= 4) return `${dia}/${mes}`;
    return `${dia}/${mes}/${ano}`;
  };

  const dataBRParaISO = (valor: string) => {
    const partes = valor.split("/");
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    if (dia.length !== 2 || mes.length !== 2 || ano.length !== 4) return null;
    const data = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    if (isNaN(data.getTime())) return null;
    if (
      data.getFullYear() !== Number(ano) ||
      data.getMonth() + 1 !== Number(mes) ||
      data.getDate() !== Number(dia)
    )
      return null;
    return `${ano}-${mes}-${dia}`;
  };

  const calcularStatusParcela = (parcela: any) => {
    const previsto = Number(parcela?.valor_previsto || 0);
    const realizado = Number(parcela?.valor_realizado || 0);
    if (parcela?.status === "cancelado") return "cancelado";
    if (realizado >= previsto && previsto > 0) return "pago";
    if (realizado > 0) return "pago_parcial";
    return "pendente";
  };

  const labelStatusParcelaCalculado = (parcela: any) => {
    const statusCalculado = calcularStatusParcela(parcela);
    const estaVencida =
      statusCalculado === "pendente" &&
      parcela?.data_prevista &&
      parcela.data_prevista < dataHojeISO();
    const mapa: any = {
      pendente: estaVencida ? "Pendente (vencido)" : "Pendente",
      pago_parcial: "Parcial",
      pago: "Pago",
      cancelado: "Cancelado",
    };
    return mapa[statusCalculado] || "Pendente";
  };

  const classeStatusParcela = (parcela: any) => {
    const statusCalculado = calcularStatusParcela(parcela);
    const estaVencida =
      statusCalculado === "pendente" &&
      parcela?.data_prevista &&
      parcela.data_prevista < dataHojeISO();
    if (statusCalculado === "pago")
      return "bg-green-100 text-green-700 border-green-200";
    if (statusCalculado === "pago_parcial")
      return "bg-amber-100 text-amber-700 border-amber-200";
    if (statusCalculado === "cancelado")
      return "bg-slate-100 text-slate-500 border-slate-200";
    if (estaVencida) return "bg-red-100 text-red-700 border-red-200";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  const fasesProjeto = [
    { valor: "processo_inicial", label: "Processo Inicial" },
    { valor: "engenharia", label: "Engenharia" },
    { valor: "compras", label: "Compras" },
    { valor: "fabricacao", label: "Fabricação" },
    { valor: "montagem", label: "Montagem" },
    { valor: "comissionamento", label: "Comissionamento" },
    { valor: "start_up", label: "Start-up" },
    { valor: "garantia", label: "Garantia" },
  ];

  const labelFase = (fase: string) =>
    fasesProjeto.find((f) => f.valor === fase)?.label || fase;

  const labelStatusParcela = (status: string) => {
    const mapa: any = {
      a_vencer: "Pendente",
      vencido: "Pendente (vencido)",
      pago_parcial: "Parcial",
      pago: "Pago",
      cancelado: "Cancelado",
    };
    return mapa[status] || status;
  };

  const labelStatusDocumento = (status: string) => {
    const mapa: any = {
      nao_elaborado: "Não Elaborado",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      nao_aplicavel: "Não Aplicável",
    };
    return mapa[status] || status;
  };

  const corIndicador = (indicador: string) => {
    const mapa: any = {
      verde: "bg-green-500",
      amarelo: "bg-yellow-400",
      vermelho: "bg-red-500",
    };
    return mapa[indicador] || "bg-slate-300";
  };

  const indicadorPorStatusDocumento = (status: string) => {
    const mapa: any = {
      concluido: "verde",
      em_andamento: "amarelo",
      nao_elaborado: "vermelho",
      nao_aplicavel: "cinza",
    };
    return mapa[status] || "vermelho";
  };

  const corIndicadorDocumento = (status: string) => {
    const mapa: any = {
      concluido: "bg-green-500",
      em_andamento: "bg-yellow-400",
      nao_elaborado: "bg-red-500",
      nao_aplicavel: "bg-slate-300",
    };
    return mapa[status] || "bg-red-500";
  };

  const classeStatusDocumento = (status: string) => {
    const mapa: any = {
      concluido: "bg-green-100 text-green-700 border-green-200",
      em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
      nao_elaborado: "bg-red-100 text-red-700 border-red-200",
      nao_aplicavel: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return mapa[status] || "bg-red-100 text-red-700 border-red-200";
  };

  const classeStatusCronograma = (status: string) => {
    const mapa: any = {
      concluido: "bg-green-100 text-green-700 border-green-200",
      em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
      nao_iniciado: "bg-blue-50 text-blue-700 border-blue-100",
      atrasado: "bg-red-100 text-red-700 border-red-200",
      cancelado: "bg-slate-100 text-slate-500 border-slate-200",
    };
    return mapa[status] || "bg-blue-50 text-blue-700 border-blue-100";
  };

  const labelStatusCronograma = (status: string) => {
    const mapa: any = {
      nao_iniciado: "Não Iniciado",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      atrasado: "Atrasado",
      cancelado: "Cancelado",
    };
    return mapa[status] || status;
  };

  const formatarTamanhoArquivo = (bytes: any) => {
    const valor = Number(bytes) || 0;
    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
    return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
  };

  const normalizarNomeArquivo = (nome: string) => {
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();
  };

  const labelOcorrencia = (tipo: string) => {
    const mapas: any = {
      avanco: "Avanço",
      atraso: "Atraso",
      financeiro: "Financeiro",
    };
    return mapas[tipo] || tipo;
  };

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

  const gerarVisualPDF = (listaObrasParaPDF: any[], dataAta: string) => {
    const janela = window.open("", "", "width=900,height=900");
    if (!janela)
      return mostrarAviso(
        "Seu navegador bloqueou o PDF. Permita os pop-ups!",
        "erro",
      );

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

    listaObrasParaPDF.forEach((obra) => {
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
            ${obra.ocorrencias.map((o: any) => `<tr><td><strong>${labelOcorrencia(o.tipo).toUpperCase()}</strong></td><td>${o.descricao}</td></tr>`).join("")}
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

    html += `
          <div class="footer">Gerado via Kalter Sistema de Gestão de Obras</div>
          <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 300); }
          </script>
        </body>
      </html>
    `;

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
  const podeEditarObra = (obra: any) =>
    Boolean(isAdmin || (obra && usuarioAtual && obra.id_responsavel === usuarioAtual.id));
  const podeEditarObraSelecionada = Boolean(
    isAdmin ||
      (obraEcoSelecionada &&
        usuarioAtual &&
        obraEcoSelecionada.id_responsavel === usuarioAtual.id),
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
        .select("id, nome, email, perfil")
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
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, valor_produto, valor_servico, usuarios(nome)",
        )
        .eq("status", "em_andamento")
        .order("created_at", { ascending: false });
      if (!isAdmin) query = query.eq("id_responsavel", usuarioAtual.id);
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
          queryObras = queryObras.eq("id_responsavel", usuarioAtual.id);

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

  const buscarHistoricoUnificado = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data: reunioesData } = await supabase
        .from("reunioes")
        .select(
          `id, data_reuniao, resumo_geral, ocorrencias(id, tipo, descricao), tarefas(id, titulo, data_vencimento, id_responsavel, usuarios(nome))`,
        )
        .eq("id_obra", idDaObra);
      let diariosData: any[] = [];
      try {
        const { data } = await supabase
          .from("diario_obra")
          .select(
            "id, data_registro, texto, created_at, id_usuario, usuarios(nome)",
          )
          .eq("id_obra", idDaObra);
        if (data) diariosData = data;
      } catch (e) {
        console.log("Tabela diario_obra ausente.");
      }

      const historicoAgrupado = (reunioesData || []).reduce(
        (acc: any, curr: any) => {
          const dataFormatada = formatarDataSegura(curr.data_reuniao);
          if (!acc[dataFormatada])
            acc[dataFormatada] = {
              dataFormatada,
              dataReal: curr.data_reuniao,
              resumos: [],
              ocorrencias: [],
              tarefas: [],
              diarios: [],
            };
          if (curr.resumo_geral)
            acc[dataFormatada].resumos.push({
              id: curr.id,
              texto: curr.resumo_geral,
            });
          if (curr.ocorrencias?.length > 0)
            acc[dataFormatada].ocorrencias.push(...curr.ocorrencias);
          if (curr.tarefas?.length > 0)
            acc[dataFormatada].tarefas.push(...curr.tarefas);
          return acc;
        },
        {},
      );

      diariosData.forEach((diario: any) => {
        const dataFormatada = formatarDataSegura(diario.data_registro);
        if (!historicoAgrupado[dataFormatada])
          historicoAgrupado[dataFormatada] = {
            dataFormatada,
            dataReal: diario.data_registro,
            resumos: [],
            ocorrencias: [],
            tarefas: [],
            diarios: [],
          };
        historicoAgrupado[dataFormatada].diarios.push(diario);
      });

      const historicoArray = Object.values(historicoAgrupado).sort(
        (a: any, b: any) =>
          new Date(b.dataReal).getTime() - new Date(a.dataReal).getTime(),
      );
      setHistoricoObra(historicoArray);
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
      setFamiliasFaturamento(data || []);
    } catch (error) {
      console.error("Erro ao buscar famílias de faturamento:", error);
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

  const atualizarFamiliaFaturamento = async () => {
    if (!obraEcoSelecionada || !familiaFaturamentoEmEdicao) return;
    try {
      const payload = {
        grupo_faturamento: formFamiliaFaturamento.grupo_faturamento || null,
        valor_total_escopo:
          Number(formFamiliaFaturamento.valor_total_escopo) || 0,
        observacao: formFamiliaFaturamento.observacao || null,
      };
      const { error } = await supabase
        .from("obra_faturamento_familias")
        .update(payload)
        .eq("id", familiaFaturamentoEmEdicao.id);
      if (error) throw error;
      setFamiliaFaturamentoEmEdicao(null);
      setFormFamiliaFaturamento({
        grupo_faturamento: "",
        valor_total_escopo: "",
        observacao: "",
      });
      buscarFamiliasFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Família de faturamento atualizada!");
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao atualizar família.", "erro");
    }
  };

  const abrirEdicaoFamiliaFaturamento = (familia: any) => {
    setFamiliaFaturamentoEmEdicao(familia);
    setFormFamiliaFaturamento({
      grupo_faturamento: familia.grupo_faturamento || "",
      valor_total_escopo: String(familia.valor_total_escopo || ""),
      observacao: familia.observacao || "",
    });
  };

  const abrirModalEscopoFaturamento = () => {
    setEscopoFaturamentoDraft(
      familiasFaturamento.map((familia) => ({
        ...familia,
        usar_no_escopo: Number(familia.valor_total_escopo || 0) > 0,
        grupo_faturamento: familia.grupo_faturamento || "",
        valor_total_escopo: familia.valor_total_escopo
          ? String(familia.valor_total_escopo)
          : "",
        observacao: familia.observacao || "",
      })),
    );
    setModalEscopoFaturamentoAberto(true);
  };

  const atualizarDraftEscopoFaturamento = (
    idFamilia: string,
    campo: string,
    valor: any,
  ) => {
    setEscopoFaturamentoDraft((prev) =>
      prev.map((familia) => {
        if (familia.id !== idFamilia) return familia;

        if (campo === "usar_no_escopo" && !valor) {
          return {
            ...familia,
            usar_no_escopo: false,
            grupo_faturamento: "",
            valor_total_escopo: "",
            observacao: familia.observacao || "",
          };
        }

        return { ...familia, [campo]: valor };
      }),
    );
  };

  const salvarEscopoFaturamento = async () => {
    if (!obraEcoSelecionada) return;

    setCarregando(true);
    try {
      const updates = escopoFaturamentoDraft.map((familia) => {
        const usarNoEscopo = Boolean(familia.usar_no_escopo);
        const valorEscopo = usarNoEscopo
          ? Number(familia.valor_total_escopo || 0)
          : 0;

        return supabase
          .from("obra_faturamento_familias")
          .update({
            grupo_faturamento: usarNoEscopo
              ? familia.grupo_faturamento || null
              : null,
            valor_total_escopo: valorEscopo,
            observacao: familia.observacao || null,
          })
          .eq("id", familia.id);
      });

      const resultados = await Promise.all(updates);
      const erro = resultados.find((resultado) => resultado.error)?.error;
      if (erro) throw erro;

      setModalEscopoFaturamentoAberto(false);
      setEscopoFaturamentoDraft([]);
      buscarFamiliasFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Escopo de faturamento atualizado!");
    } catch (error: any) {
      mostrarAviso(
        error.message || "Erro ao salvar escopo de faturamento.",
        "erro",
      );
    } finally {
      setCarregando(false);
    }
  };

  const salvarPrevisaoFaturamento = async () => {
    if (!obraEcoSelecionada) return;
    const competencia = competenciaParaData(
      novaPrevisaoFaturamento.competencia || "",
    );
    if (
      !novaPrevisaoFaturamento.id_obra_faturamento_familia ||
      !competencia ||
      !novaPrevisaoFaturamento.valor_previsto
    ) {
      return mostrarAviso(
        "Preencha família, mês/ano e valor previsto.",
        "erro",
      );
    }

    const familia = familiasFaturamento.find(
      (f) => f.id === novaPrevisaoFaturamento.id_obra_faturamento_familia,
    );
    try {
      const { error } = await supabase
        .from("obra_faturamento_previsoes")
        .insert([
          {
            id_obra: obraEcoSelecionada.id,
            id_obra_faturamento_familia:
              novaPrevisaoFaturamento.id_obra_faturamento_familia,
            competencia,
            grupo_faturamento:
              novaPrevisaoFaturamento.grupo_faturamento ||
              familia?.grupo_faturamento ||
              null,
            valor_previsto: Number(novaPrevisaoFaturamento.valor_previsto) || 0,
            observacao: novaPrevisaoFaturamento.observacao || null,
          },
        ]);
      if (error) throw error;
      setNovaPrevisaoFaturamento({
        id_obra_faturamento_familia: "",
        competencia: "",
        valor_previsto: "",
        grupo_faturamento: "",
        observacao: "",
      });
      buscarPrevisoesFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Previsão de faturamento salva!");
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao salvar previsão.", "erro");
    }
  };

  const abrirRealizacaoFaturamento = (previsao: any) => {
    const familia = familiasFaturamento.find(
      (f) => f.id === previsao.id_obra_faturamento_familia,
    );
    const jaRealizado = realizadosFaturamento
      .filter((r) => r.id_previsao === previsao.id)
      .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0);
    const saldo = Math.max(
      (Number(previsao.valor_previsto) || 0) - jaRealizado,
      0,
    );
    setPrevisaoParaRealizar({ ...previsao, familia });
    setRealizacaoFaturamento({
      competencia: String(previsao.competencia || "").slice(0, 7),
      data_faturamento: isoParaDataBR(dataHojeISO()),
      numero_nf: "",
      valor_realizado: String(
        (saldo || Number(previsao.valor_previsto) || 0).toFixed(2),
      ),
      observacao: "",
    });
  };

  const confirmarRealizacaoFaturamento = async () => {
    if (!obraEcoSelecionada || !previsaoParaRealizar) return;
    const competencia = competenciaParaData(
      realizacaoFaturamento.competencia || "",
    );
    const dataFaturamentoISO = dataBRParaISO(
      realizacaoFaturamento.data_faturamento || "",
    );
    if (
      !competencia ||
      !dataFaturamentoISO ||
      !realizacaoFaturamento.valor_realizado
    ) {
      return mostrarAviso(
        "Preencha competência, data de faturamento e valor realizado.",
        "erro",
      );
    }
    try {
      const { error } = await supabase
        .from("obra_faturamento_realizados")
        .insert([
          {
            id_obra: obraEcoSelecionada.id,
            id_obra_faturamento_familia:
              previsaoParaRealizar.id_obra_faturamento_familia,
            id_previsao: previsaoParaRealizar.id,
            competencia,
            data_faturamento: dataFaturamentoISO,
            grupo_faturamento:
              previsaoParaRealizar.grupo_faturamento ||
              previsaoParaRealizar.familia?.grupo_faturamento ||
              null,
            numero_nf: realizacaoFaturamento.numero_nf || null,
            valor_realizado: Number(realizacaoFaturamento.valor_realizado) || 0,
            observacao: realizacaoFaturamento.observacao || null,
          },
        ]);
      if (error) throw error;
      setPrevisaoParaRealizar(null);
      setRealizacaoFaturamento({
        competencia: "",
        data_faturamento: "",
        numero_nf: "",
        valor_realizado: "",
        observacao: "",
      });
      buscarRealizadosFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Faturamento realizado registrado!");
    } catch (error: any) {
      mostrarAviso(
        error.message || "Erro ao registrar faturamento realizado.",
        "erro",
      );
    }
  };

  const excluirPrevisaoFaturamento = async (previsao: any) => {
    if (!window.confirm("Deseja excluir esta previsão de faturamento?")) return;
    try {
      const { error } = await supabase
        .from("obra_faturamento_previsoes")
        .delete()
        .eq("id", previsao.id);
      if (error) throw error;
      if (obraEcoSelecionada) buscarPrevisoesFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Previsão excluída!");
    } catch (error: any) {
      mostrarAviso(error.message || "Erro ao excluir previsão.", "erro");
    }
  };

  const excluirRealizacaoFaturamento = async (realizado: any) => {
    if (!window.confirm("Deseja excluir este faturamento realizado?")) return;
    try {
      const { error } = await supabase
        .from("obra_faturamento_realizados")
        .delete()
        .eq("id", realizado.id);
      if (error) throw error;
      if (obraEcoSelecionada)
        buscarRealizadosFaturamento(obraEcoSelecionada.id);
      mostrarAviso("Faturamento realizado excluído!");
    } catch (error: any) {
      mostrarAviso(
        error.message || "Erro ao excluir faturamento realizado.",
        "erro",
      );
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
    if (telaAtiva === "reunioes" && reuniaoForm.id_obra)
      buscarHistoricoUnificado(reuniaoForm.id_obra);
    if (telaAtiva === "painel_obra" && obraEcoSelecionada) {
      buscarHistoricoUnificado(obraEcoSelecionada.id);
      buscarFaturamentosDaObra(obraEcoSelecionada.id);
      buscarParcelasCliente(obraEcoSelecionada.id);
      buscarDocumentosProjeto(obraEcoSelecionada.id);
      buscarArquivosDocumentos(obraEcoSelecionada.id);
      buscarCronogramaObra(obraEcoSelecionada.id);
      buscarFamiliasFaturamento(obraEcoSelecionada.id);
      buscarPrevisoesFaturamento(obraEcoSelecionada.id);
      buscarRealizadosFaturamento(obraEcoSelecionada.id);
    }
  }, [reuniaoForm.id_obra, telaAtiva, obraEcoSelecionada]);

  const buscarTarefasKanban = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("tarefas")
        .select(
          `id, id_obra, titulo, status, data_vencimento, id_responsavel, created_at, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`,
        )
        .order("created_at", { ascending: false });
      if (!isAdmin) {
        const { data: obrasUsuario } = await supabase
          .from("obras")
          .select("id")
          .eq("id_responsavel", usuarioAtual.id);
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
          id_usuario: usuarioAtual.id,
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

  const adicionarDiarioObra = async () => {
    if (!novoDiarioTexto.trim() || !obraEcoSelecionada) return;
    setCarregando(true);
    try {
      if (diarioEmEdicao) {
        const { error } = await supabase
          .from("diario_obra")
          .update({ texto: novoDiarioTexto })
          .eq("id", diarioEmEdicao.id);
        if (error) throw error;
        mostrarAviso("Diário atualizado com sucesso!");
        setDiarioEmEdicao(null);
      } else {
        const { error } = await supabase.from("diario_obra").insert([
          {
            id_obra: obraEcoSelecionada.id,
            id_usuario: usuarioAtual.id,
            texto: novoDiarioTexto,
            data_registro: new Date().toISOString().split("T")[0],
          },
        ]);
        if (error) throw error;
        mostrarAviso("Registro salvo no Diário!");
      }
      setNovoDiarioTexto("");
      buscarHistoricoUnificado(obraEcoSelecionada.id);
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
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
      buscarHistoricoUnificado(obraEcoSelecionada?.id || reuniaoForm.id_obra);
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
          id_usuario: usuarioAtual.id,
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
      buscarHistoricoUnificado(obraEcoSelecionada?.id || reuniaoForm.id_obra);
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
      const { error } = await supabase.from("usuarios").insert([
        {
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          perfil: novoUsuario.perfil,
        },
      ]);
      if (error) throw error;
      mostrarAviso("Registado com sucesso!");
      setNovoUsuario({ nome: "", email: "", perfil: "engenheiro" });
      buscarUsuarios();
    } catch (error: any) {
      mostrarAviso(error.message, "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function salvarObra(e: any) {
    e.preventDefault();
    setErroObra("");
    const responsavelObra = isAdmin
      ? novaObra.id_responsavel
      : usuarioAtual?.id;

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
      setTelaAtiva("cadastros_obras");
    } catch (error: any) {
      setErroObra("Erro: " + error.message);
    } finally {
      setCarregando(false);
    }
  }

  const abrirPainelObra = (obra: any) => {
    setObraEcoSelecionada(obra);
    setFiltroObraKanban(obra.id);
    setAbaPainelObra("resumo");
    setTelaAtiva("painel_obra");
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
      await supabase
        .from("tarefas")
        .update({ status: novoStatus })
        .eq("id", idTarefa);
      buscarTarefasKanban();
      mostrarAviso("Status atualizado!");
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
    setNovaTarefa({ titulo: "", data_vencimento: "", id_responsavel: "" });
  };

  async function salvarReuniaoObra() {
    if (!reuniaoForm.id_obra)
      return mostrarAviso("Selecione uma obra.", "erro");
    setCarregando(true);
    try {
      const obraSelecionada = obrasLista.find(
        (o) => o.id === reuniaoForm.id_obra,
      );

      const { data: reuniaoSalva, error: errReuniao } = await supabase
        .from("reunioes")
        .insert([
          {
            id_obra: reuniaoForm.id_obra,
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
            tipo: o.tipo,
            descricao: o.descricao,
          })),
        );
      if (listaTarefas.length > 0)
        await supabase.from("tarefas").insert(
          listaTarefas.map((t) => ({
            id_obra: reuniaoForm.id_obra,
            id_reuniao_origem: reuniaoSalva.id,
            titulo: t.titulo,
            data_vencimento: t.data_vencimento || null,
            id_responsavel: t.id_responsavel,
            status: "pendente",
          })),
        );

      const registroObraAta = {
        id_reuniao: reuniaoSalva.id,
        id_obra: obraSelecionada.id,
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

  const gerarAtaFinal = () => {
    if (obrasNaAtaAtual.length === 0)
      return mostrarAviso("Você não salvou obras.", "erro");
    const dataHj = formatarDataSegura(reuniaoForm.data_reuniao);
    let textoAta = `ATA DE REUNIÃO DE OBRAS - KALTER\nData: ${dataHj}\n\n`;
    obrasNaAtaAtual.forEach((obra) => {
      textoAta += `==========================================\nOBRA: ${obra.nome_obra.toUpperCase()}\n==========================================\n`;
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
      textoAta += `\n`;
    });
    setAtaGerada(textoAta);
    setModalAtaAberto(true);
  };

  const enviarPorEmailAplicativo = () => {
    const emailsAdmins = listaUsuarios
      .filter((u) => u.perfil === "admin")
      .map((u) => u.email);
    const destinatarios = [...new Set([...emailsAdmins])].join(",");
    const assunto = encodeURIComponent(
      `Ata de Reunião de Obras - ${formatarDataSegura(new Date().toISOString())}`,
    );
    window.location.href = `mailto:${destinatarios}?subject=${assunto}&body=${encodeURIComponent(ataGerada)}`;
    setModalAtaAberto(false);
    setObrasNaAtaAtual([]);
  };

  const isAtrasada = (dataVencimento: any, status: any) => {
    if (!dataVencimento || status === "concluida") return false;
    return dataVencimento < new Date().toISOString().split("T")[0];
  };
  const tarefasFiltradas =
    filtroObraKanban === "todas"
      ? tarefasKanban || []
      : (tarefasKanban || []).filter((t) => t?.id_obra === filtroObraKanban);
  const tarefasDashboard = tarefasKanban
    .filter(
      (t) => t.status !== "concluida" && t.id_responsavel === usuarioAtual?.id,
    )
    .slice(0, 6);

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

  const familiasFaturamentoComEscopo = familiasFaturamento.filter(
    (f) => Number(f.valor_total_escopo || 0) > 0,
  );
  const idsFamiliasFaturamentoComEscopo = new Set(
    familiasFaturamentoComEscopo.map((f) => f.id),
  );
  const previsoesFaturamentoDoEscopo = previsoesFaturamento.filter((p) =>
    idsFamiliasFaturamentoComEscopo.has(p.id_obra_faturamento_familia),
  );
  const realizadosFaturamentoDoEscopo = realizadosFaturamento.filter((r) =>
    idsFamiliasFaturamentoComEscopo.has(r.id_obra_faturamento_familia),
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

  const valorPrevistoFamiliaCompetencia = (
    familiaId: string,
    competencia: string,
  ) =>
    previsoesFaturamento
      .filter(
        (p) =>
          p.id_obra_faturamento_familia === familiaId &&
          String(p.competencia || "").slice(0, 10) === competencia,
      )
      .reduce((acc, p) => acc + Number(p.valor_previsto || 0), 0);

  const valorRealizadoFamiliaCompetencia = (
    familiaId: string,
    competencia: string,
  ) =>
    realizadosFaturamento
      .filter(
        (r) =>
          r.id_obra_faturamento_familia === familiaId &&
          String(r.competencia || "").slice(0, 10) === competencia,
      )
      .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0);

  const valorRealizadoFamilia = (familiaId: string) =>
    realizadosFaturamento
      .filter((r) => r.id_obra_faturamento_familia === familiaId)
      .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0);

  const previsoesComSaldo = previsoesFaturamentoDoEscopo.map((previsao) => {
    const realizado = realizadosFaturamento
      .filter((r) => r.id_previsao === previsao.id)
      .reduce((acc, r) => acc + Number(r.valor_realizado || 0), 0);
    return {
      ...previsao,
      realizado,
      saldo: Math.max(Number(previsao.valor_previsto || 0) - realizado, 0),
    };
  });

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

      {modalEscopoFaturamentoAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-xl text-[#2A6377]">
                  Editar Escopo de Faturamento
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Marque as famílias que fazem parte do escopo faturável da obra
                  e informe grupo, valor e observação.
                </p>
              </div>
              <button
                onClick={() => setModalEscopoFaturamentoAberto(false)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 rounded-full p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Famílias selecionadas
                </p>
                <p className="text-xl font-bold text-[#2A6377]">
                  {
                    escopoFaturamentoDraft.filter(
                      (f) =>
                        f.usar_no_escopo &&
                        Number(f.valor_total_escopo || 0) > 0,
                    ).length
                  }
                </p>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Valor total informado
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {formatarMoeda(
                    escopoFaturamentoDraft.reduce(
                      (acc, f) =>
                        acc +
                        (f.usar_no_escopo
                          ? Number(f.valor_total_escopo || 0)
                          : 0),
                      0,
                    ),
                  )}
                </p>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <p className="text-xs text-slate-400 font-bold uppercase">
                  Total de famílias padrão
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {escopoFaturamentoDraft.length}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-center w-[70px]">Usar</th>
                    <th className="p-3 text-left min-w-[260px]">Família</th>
                    <th className="p-3 text-left min-w-[260px]">
                      Grupo de Faturamento
                    </th>
                    <th className="p-3 text-right min-w-[180px]">
                      Valor do Escopo
                    </th>
                    <th className="p-3 text-left min-w-[240px]">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {escopoFaturamentoDraft.map((familia) => (
                    <tr
                      key={familia.id}
                      className={`border-t ${familia.usar_no_escopo ? "bg-white" : "bg-slate-50 text-slate-400"}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(familia.usar_no_escopo)}
                          onChange={(e) =>
                            atualizarDraftEscopoFaturamento(
                              familia.id,
                              "usar_no_escopo",
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 accent-[#2A6377]"
                        />
                      </td>
                      <td className="p-3 font-bold text-[#2A6377]">
                        {familia.codigo_familia} - {familia.descricao_familia}
                      </td>
                      <td className="p-3">
                        <input
                          disabled={!familia.usar_no_escopo}
                          value={familia.grupo_faturamento || ""}
                          onChange={(e) =>
                            atualizarDraftEscopoFaturamento(
                              familia.id,
                              "grupo_faturamento",
                              e.target.value,
                            )
                          }
                          className="w-full border rounded-lg p-2 outline-none focus:border-[#2A6377] disabled:bg-slate-100"
                          placeholder="Grupo de faturamento"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          disabled={!familia.usar_no_escopo}
                          type="number"
                          step="0.01"
                          min="0"
                          value={familia.valor_total_escopo || ""}
                          onChange={(e) =>
                            atualizarDraftEscopoFaturamento(
                              familia.id,
                              "valor_total_escopo",
                              e.target.value,
                            )
                          }
                          className="w-full border rounded-lg p-2 text-right outline-none focus:border-[#2A6377] disabled:bg-slate-100"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          disabled={!familia.usar_no_escopo}
                          value={familia.observacao || ""}
                          onChange={(e) =>
                            atualizarDraftEscopoFaturamento(
                              familia.id,
                              "observacao",
                              e.target.value,
                            )
                          }
                          className="w-full border rounded-lg p-2 outline-none focus:border-[#2A6377] disabled:bg-slate-100"
                          placeholder="Observação"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Ao desmarcar uma família, o valor do escopo será zerado e ela
                deixará de aparecer na consulta principal.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalEscopoFaturamentoAberto(false)}
                  className="px-5 py-2 bg-white border rounded-lg font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEscopoFaturamento}
                  disabled={carregando}
                  className="px-5 py-2 bg-[#2A6377] text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Salvar Escopo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {familiaFaturamentoEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-xl text-[#2A6377]">
                  Editar família de faturamento
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {familiaFaturamentoEmEdicao.codigo_familia} -{" "}
                  {familiaFaturamentoEmEdicao.descricao_familia}
                </p>
              </div>
              <button
                onClick={() => setFamiliaFaturamentoEmEdicao(null)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 rounded-full p-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Grupo de faturamento
                </label>
                <input
                  value={formFamiliaFaturamento.grupo_faturamento}
                  onChange={(e) =>
                    setFormFamiliaFaturamento({
                      ...formFamiliaFaturamento,
                      grupo_faturamento: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  placeholder="Ex.: 40.190.2033 - SKID DE BOMBAS"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Valor total do escopo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formFamiliaFaturamento.valor_total_escopo}
                  onChange={(e) =>
                    setFormFamiliaFaturamento({
                      ...formFamiliaFaturamento,
                      valor_total_escopo: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={formFamiliaFaturamento.observacao}
                  onChange={(e) =>
                    setFormFamiliaFaturamento({
                      ...formFamiliaFaturamento,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setFamiliaFaturamentoEmEdicao(null)}
                className="px-5 py-2 bg-white border rounded-lg font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={atualizarFamiliaFaturamento}
                className="px-5 py-2 bg-[#2A6377] text-white rounded-lg font-bold"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {previsaoParaRealizar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b flex justify-between items-start gap-4">
              <div>
                <h2 className="font-bold text-xl text-[#2A6377]">
                  Realizar faturamento
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {previsaoParaRealizar.familia?.codigo_familia} -{" "}
                  {previsaoParaRealizar.familia?.descricao_familia}
                </p>
              </div>
              <button
                onClick={() => setPrevisaoParaRealizar(null)}
                className="text-slate-400 hover:text-red-500 bg-slate-100 rounded-full p-2"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border rounded-lg p-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Previsto
                  </p>
                  <p className="font-bold">
                    {formatarMoeda(previsaoParaRealizar.valor_previsto)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Competência
                  </p>
                  <p className="font-bold">
                    {formatarCompetencia(previsaoParaRealizar.competencia)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Competência
                  </label>
                  <input
                    type="month"
                    value={realizacaoFaturamento.competencia}
                    onChange={(e) =>
                      setRealizacaoFaturamento({
                        ...realizacaoFaturamento,
                        competencia: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Data faturamento
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={realizacaoFaturamento.data_faturamento}
                    onFocus={selecionarTextoAoFocar}
                    onChange={(e) =>
                      setRealizacaoFaturamento({
                        ...realizacaoFaturamento,
                        data_faturamento: formatarEntradaDataBR(e.target.value),
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Número NF
                  </label>
                  <input
                    value={realizacaoFaturamento.numero_nf}
                    onChange={(e) =>
                      setRealizacaoFaturamento({
                        ...realizacaoFaturamento,
                        numero_nf: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Valor realizado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={realizacaoFaturamento.valor_realizado}
                    onChange={(e) =>
                      setRealizacaoFaturamento({
                        ...realizacaoFaturamento,
                        valor_realizado: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  value={realizacaoFaturamento.observacao}
                  onChange={(e) =>
                    setRealizacaoFaturamento({
                      ...realizacaoFaturamento,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setPrevisaoParaRealizar(null)}
                className="px-5 py-2 bg-white border rounded-lg font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRealizacaoFaturamento}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
              {tarefaSelecionada.status === "concluida" && (
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold px-4 py-3 md:py-2 bg-green-100 rounded-lg flex-1 sm:flex-none">
                  <CheckCircle2 size={18} /> Concluída
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
              <button onClick={() => setModalAtaAberto(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-slate-50">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {ataGerada}
              </pre>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setModalAtaAberto(false)}
                className="px-6 py-2 rounded-lg font-medium bg-slate-100 flex-1 md:flex-none hover:bg-slate-200"
              >
                Fechar
              </button>
              <button
                onClick={() =>
                  gerarVisualPDF(
                    obrasNaAtaAtual,
                    formatarDataSegura(new Date().toISOString()),
                  )
                }
                className="bg-white border border-[#2A6377] text-[#2A6377] hover:bg-[#2A6377] hover:text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none transition"
              >
                <FileText size={18} /> Baixar PDF
              </button>
              <button
                onClick={enviarPorEmailAplicativo}
                className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none w-full md:w-auto hover:bg-[#1e4857] transition"
              >
                <Send size={18} /> Enviar por E-mail
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
                  <ClipboardList size={20} /> Gerar Ata
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
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800">
              Minhas Obras em Andamento
            </h2>
            {obrasLista.length === 0 ? (
              <div className="bg-white p-10 rounded-xl text-center border text-slate-400">
                Nenhuma obra vinculada a você.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {obrasLista.map((obra) => (
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
                          {formatarMoeda(saldoReceberParcelas)}
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
                      {formatarMoeda(saldoReceberParcelas)}
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
                      {formatarMoeda(saldoFaturarFamilias)}
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <p className="text-xs text-slate-400 font-bold uppercase">
                      Famílias no Escopo
                    </p>
                    <p className="text-2xl font-bold text-[#2A6377]">
                      {familiasFaturamentoComEscopo.length}/
                      {familiasFaturamento.length}
                    </p>
                  </div>
                </div>

                {podeEditarObraSelecionada && (
                  <div className="bg-white p-5 rounded-xl shadow-sm border">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Plus size={18} /> Nova Previsão de Faturamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <select
                        value={
                          novaPrevisaoFaturamento.id_obra_faturamento_familia
                        }
                        onChange={(e) => {
                          const familia = familiasFaturamento.find(
                            (f) => f.id === e.target.value,
                          );
                          setNovaPrevisaoFaturamento({
                            ...novaPrevisaoFaturamento,
                            id_obra_faturamento_familia: e.target.value,
                            grupo_faturamento: familia?.grupo_faturamento || "",
                          });
                        }}
                        disabled={familiasFaturamentoComEscopo.length === 0}
                        className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377] disabled:bg-slate-100"
                      >
                        <option value="">Família</option>
                        {familiasFaturamentoComEscopo.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.codigo_familia} - {f.descricao_familia}
                          </option>
                        ))}
                      </select>
                      <input
                        type="month"
                        value={novaPrevisaoFaturamento.competencia}
                        onChange={(e) =>
                          setNovaPrevisaoFaturamento({
                            ...novaPrevisaoFaturamento,
                            competencia: e.target.value,
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Valor previsto"
                        value={novaPrevisaoFaturamento.valor_previsto}
                        onChange={(e) =>
                          setNovaPrevisaoFaturamento({
                            ...novaPrevisaoFaturamento,
                            valor_previsto: e.target.value,
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <input
                        placeholder="Grupo faturamento"
                        value={novaPrevisaoFaturamento.grupo_faturamento}
                        onChange={(e) =>
                          setNovaPrevisaoFaturamento({
                            ...novaPrevisaoFaturamento,
                            grupo_faturamento: e.target.value,
                          })
                        }
                        className="border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                      />
                      <button
                        onClick={salvarPrevisaoFaturamento}
                        disabled={familiasFaturamentoComEscopo.length === 0}
                        className="bg-[#2A6377] text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} /> Salvar
                      </button>
                    </div>
                    <input
                      placeholder="Observação da previsão"
                      value={novaPrevisaoFaturamento.observacao || ""}
                      onChange={(e) =>
                        setNovaPrevisaoFaturamento({
                          ...novaPrevisaoFaturamento,
                          observacao: e.target.value,
                        })
                      }
                      className="mt-3 w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
                    />
                    {familiasFaturamentoComEscopo.length === 0 && (
                      <p className="text-xs text-amber-600 font-medium mt-3">
                        Antes de cadastrar previsões, clique em “Editar Escopo”
                        e informe pelo menos uma família com valor de escopo.
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Receipt size={18} className="text-[#2A6377]" /> Escopo
                        e Faturamento por Família
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        A consulta mostra somente famílias com valor de escopo.
                        Use “Editar Escopo” para selecionar famílias, grupos e
                        valores.
                      </p>
                    </div>
                    {podeEditarObraSelecionada && (
                      <button
                        onClick={abrirModalEscopoFaturamento}
                        className="px-4 py-2 rounded-lg bg-[#2A6377] text-white text-sm font-bold hover:bg-[#1e4857] transition flex items-center gap-2"
                      >
                        <Edit2 size={16} /> Editar Escopo
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-xs min-w-[1400px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left min-w-[220px]">
                            Grupo de Faturamento
                          </th>
                          <th className="p-3 text-left min-w-[260px]">
                            Família
                          </th>
                          <th className="p-3 text-right">Valor Total Escopo</th>
                          <th className="p-3 text-right">Faturado</th>
                          <th className="p-3 text-right">À Faturar</th>
                          {competenciasFaturamento.length === 0 && (
                            <th className="p-3 text-center">Competências</th>
                          )}
                          {competenciasFaturamento.map((comp) => (
                            <th
                              key={comp}
                              className="p-0 text-center"
                              colSpan={2}
                            >
                              <div className="bg-[#2A6377] text-white p-2 font-bold">
                                {formatarCompetencia(comp)}
                              </div>
                              <div className="grid grid-cols-2">
                                <span className="p-2 border-r">Previsto</span>
                                <span className="p-2">Realizado</span>
                              </div>
                            </th>
                          ))}
                          {podeEditarObraSelecionada && (
                            <th className="p-3 text-center">Ações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {familiasFaturamento.length === 0 ? (
                          <tr>
                            <td
                              colSpan={podeEditarObraSelecionada ? 7 : 6}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhuma família criada para esta obra. Verifique
                              se a função de regularização foi executada.
                            </td>
                          </tr>
                        ) : familiasFaturamentoComEscopo.length === 0 ? (
                          <tr>
                            <td
                              colSpan={podeEditarObraSelecionada ? 7 : 6}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhuma família com escopo informado. Clique em
                              “Editar Escopo” para selecionar as famílias
                              faturáveis desta obra.
                            </td>
                          </tr>
                        ) : (
                          familiasFaturamentoComEscopo.map((familia) => {
                            const faturadoFamilia = valorRealizadoFamilia(
                              familia.id,
                            );
                            const saldoFamilia =
                              Number(familia.valor_total_escopo || 0) -
                              faturadoFamilia;
                            return (
                              <tr
                                key={familia.id}
                                className="border-t hover:bg-slate-50"
                              >
                                <td className="p-3 font-medium text-slate-700">
                                  {familia.grupo_faturamento || "-"}
                                </td>
                                <td className="p-3 font-bold text-[#2A6377]">
                                  <div>
                                    {familia.codigo_familia} -{" "}
                                    {familia.descricao_familia}
                                  </div>
                                  {familia.observacao && (
                                    <div className="text-[10px] text-slate-400 font-normal mt-1">
                                      {familia.observacao}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-bold">
                                  {formatarMoeda(familia.valor_total_escopo)}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700">
                                  {formatarMoeda(faturadoFamilia)}
                                </td>
                                <td
                                  className={`p-3 text-right font-bold ${saldoFamilia < 0 ? "text-red-600" : "text-amber-700"}`}
                                >
                                  {formatarMoeda(saldoFamilia)}
                                </td>
                                {competenciasFaturamento.length === 0 && (
                                  <td className="p-3 text-center text-slate-400">
                                    Sem previsão
                                  </td>
                                )}
                                {competenciasFaturamento.map((comp) => {
                                  const previsto =
                                    valorPrevistoFamiliaCompetencia(
                                      familia.id,
                                      comp,
                                    );
                                  const realizado =
                                    valorRealizadoFamiliaCompetencia(
                                      familia.id,
                                      comp,
                                    );
                                  return (
                                    <td
                                      key={`${familia.id}-${comp}`}
                                      className="p-0"
                                      colSpan={2}
                                    >
                                      <div className="grid grid-cols-2 h-full">
                                        <span
                                          className={`p-3 text-right border-r ${previsto > 0 ? "font-bold text-blue-700" : "text-slate-300"}`}
                                        >
                                          {previsto > 0
                                            ? formatarMoeda(previsto)
                                            : "-"}
                                        </span>
                                        <span
                                          className={`p-3 text-right ${realizado > 0 ? "font-bold text-emerald-700" : "text-slate-300"}`}
                                        >
                                          {realizado > 0
                                            ? formatarMoeda(realizado)
                                            : "-"}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                                {podeEditarObraSelecionada && (
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() =>
                                        abrirEdicaoFamiliaFaturamento(familia)
                                      }
                                      className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-xs font-bold hover:bg-[#1e4857] transition"
                                    >
                                      Ajustar
                                    </button>
                                  </td>
                                )}
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
                    <h3 className="font-bold text-lg">Previsões em Aberto</h3>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm min-w-[980px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">Família</th>
                          <th className="p-3 text-left">Grupo</th>
                          <th className="p-3">Competência</th>
                          <th className="p-3 text-right">Previsto</th>
                          <th className="p-3 text-right">Realizado</th>
                          <th className="p-3 text-right">Saldo</th>
                          {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previsoesComSaldo.length === 0 ? (
                          <tr>
                            <td
                              colSpan={podeEditarObraSelecionada ? 7 : 6}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhuma previsão cadastrada.
                            </td>
                          </tr>
                        ) : (
                          previsoesComSaldo.map((previsao) => {
                            const familia = familiasFaturamento.find(
                              (f) =>
                                f.id === previsao.id_obra_faturamento_familia,
                            );
                            return (
                              <tr
                                key={previsao.id}
                                className="border-t hover:bg-slate-50"
                              >
                                <td className="p-3 font-bold text-[#2A6377]">
                                  {familia
                                    ? `${familia.codigo_familia} - ${familia.descricao_familia}`
                                    : "-"}
                                </td>
                                <td className="p-3">
                                  {previsao.grupo_faturamento ||
                                    familia?.grupo_faturamento ||
                                    "-"}
                                </td>
                                <td className="p-3 text-center">
                                  {formatarCompetencia(previsao.competencia)}
                                </td>
                                <td className="p-3 text-right font-bold">
                                  {formatarMoeda(previsao.valor_previsto)}
                                </td>
                                <td className="p-3 text-right text-emerald-700 font-bold">
                                  {formatarMoeda(previsao.realizado)}
                                </td>
                                <td className="p-3 text-right font-bold text-amber-700">
                                  {formatarMoeda(previsao.saldo)}
                                </td>
                                {podeEditarObraSelecionada && (
                                  <td className="p-3">
                                    <div className="flex justify-center gap-2">
                                      <button
                                        onClick={() =>
                                          abrirRealizacaoFaturamento(previsao)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                                      >
                                        Realizar
                                      </button>
                                      <button
                                        onClick={() =>
                                          excluirPrevisaoFaturamento(previsao)
                                        }
                                        className="text-red-400 hover:text-red-600"
                                      >
                                        <Trash2 size={16} />
                                      </button>
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
                </div>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg">
                      Faturamentos Realizados
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-sm min-w-[900px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-left">Família</th>
                          <th className="p-3">Competência</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">NF</th>
                          <th className="p-3 text-right">Valor</th>
                          {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {realizadosFaturamentoDoEscopo.length === 0 ? (
                          <tr>
                            <td
                              colSpan={podeEditarObraSelecionada ? 6 : 5}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhum faturamento realizado registrado.
                            </td>
                          </tr>
                        ) : (
                          realizadosFaturamentoDoEscopo.map((realizado) => {
                            const familia = familiasFaturamento.find(
                              (f) =>
                                f.id === realizado.id_obra_faturamento_familia,
                            );
                            return (
                              <tr
                                key={realizado.id}
                                className="border-t hover:bg-slate-50"
                              >
                                <td className="p-3 font-bold text-[#2A6377]">
                                  {familia
                                    ? `${familia.codigo_familia} - ${familia.descricao_familia}`
                                    : "-"}
                                </td>
                                <td className="p-3 text-center">
                                  {formatarCompetencia(realizado.competencia)}
                                </td>
                                <td className="p-3 text-center">
                                  {formatarDataSegura(
                                    realizado.data_faturamento,
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  {realizado.numero_nf || "-"}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-700">
                                  {formatarMoeda(realizado.valor_realizado)}
                                </td>
                                {podeEditarObraSelecionada && (
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() =>
                                        excluirRealizacaoFaturamento(realizado)
                                      }
                                      className="text-red-400 hover:text-red-600"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
                                {labelFase(fase.fase)}
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
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusCronograma(fase.status)}`}
                                >
                                  {labelStatusCronograma(fase.status)}
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
                                  className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusDocumento(doc.status)}`}
                                >
                                  {labelStatusDocumento(doc.status)}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-block w-5 h-5 rounded-full border-2 border-slate-800 ${corIndicadorDocumento(doc.status)}`}
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                      <BookOpen size={18} />{" "}
                      {diarioEmEdicao
                        ? "Editar Registro"
                        : "Registrar no Diário"}
                    </h3>
                    <textarea
                      rows={3}
                      placeholder="Houve alguma alteração no projeto hoje? Registre aqui..."
                      value={novoDiarioTexto}
                      onChange={(e) => setNovoDiarioTexto(e.target.value)}
                      className="w-full border border-blue-100 bg-blue-50/30 rounded-lg p-3 outline-none focus:border-blue-400 text-sm mb-3"
                    ></textarea>
                    <div className="flex gap-2">
                      <button
                        onClick={adicionarDiarioObra}
                        disabled={!novoDiarioTexto.trim() || carregando}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {carregando ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Save size={16} />
                        )}{" "}
                        {diarioEmEdicao ? "Atualizar" : "Salvar no Diário"}
                      </button>
                      {diarioEmEdicao && (
                        <button
                          onClick={() => {
                            setDiarioEmEdicao(null);
                            setNovoDiarioTexto("");
                          }}
                          className="px-4 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 md:p-6 rounded-xl border w-full flex flex-col items-start max-h-[600px] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <Clock size={20} className="text-slate-500" /> Histórico
                      da Obra
                    </h3>
                    {historicoObra.length === 0 ? (
                      <p className="text-sm text-gray-500">Sem histórico.</p>
                    ) : (
                      historicoObra.map((hist, idx) => (
                        <div
                          key={idx}
                          className="w-full border-l-2 border-slate-200 pl-4 pb-5"
                        >
                          <h4 className="font-bold text-[#2A6377] mb-2">
                            {hist.dataFormatada}
                          </h4>
                          <div className="space-y-2">
                            {hist.diarios?.map((diario: any) => (
                              <div
                                key={`d-${diario.id}`}
                                className="bg-white p-3 rounded border text-sm"
                              >
                                <p className="text-slate-700 whitespace-pre-wrap">
                                  {diario.texto}
                                </p>
                              </div>
                            ))}
                            {hist.resumos?.map((res: any) => (
                              <div
                                key={`r-${res.id}`}
                                className="bg-white p-3 rounded border text-sm"
                              >
                                <p className="font-bold text-slate-800 mb-1">
                                  Resumo da Reunião
                                </p>
                                <p className="text-slate-700 whitespace-pre-wrap">
                                  {res.texto}
                                </p>
                              </div>
                            ))}
                            {hist.ocorrencias?.map((oc: any, i: number) => (
                              <div
                                key={`oc-${i}`}
                                className="bg-white p-3 rounded border text-sm"
                              >
                                <span className="font-bold text-[#2A6377]">
                                  {labelOcorrencia(oc.tipo)}:
                                </span>{" "}
                                {oc.descricao}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col bg-white p-5 rounded-xl shadow-sm border h-full min-h-[600px]">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                    <CheckSquare size={20} className="text-[#2A6377]" /> Tarefas
                    da Obra
                  </h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 items-start flex-1">
                    <div className="flex-1 min-w-[260px] bg-gray-50 rounded-xl p-3 border">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm">A Fazer</h4>
                        <span className="bg-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {
                            tarefasFiltradas.filter(
                              (t) => t?.status === "pendente",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tarefasFiltradas
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
                            tarefasFiltradas.filter(
                              (t) => t?.status === "em_andamento",
                            ).length
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tarefasFiltradas
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
                        {tarefasFiltradas
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
                  </div>
                </div>
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
                onSubmit={salvarUsuario}
                className="bg-white p-4 md:p-6 rounded-xl shadow-sm border h-fit max-w-full"
              >
                <h3 className="text-lg font-bold mb-4 border-b pb-2">
                  Novo Colaborador
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
                      <option value="engenheiro">Engenheiro/Gestor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto"
                  >
                    <Plus size={18} className="inline mr-2" /> Adicionar
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
                      className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg max-w-full"
                    >
                      <div
                        className={`p-2 rounded-full text-white ${user.perfil === "admin" ? "bg-[#2A6377]" : "bg-[#2A6377]/60"}`}
                      >
                        <User size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-sm truncate max-w-full">
                          {user.nome}{" "}
                          <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">
                            {user.perfil}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-full">
                          {user.email}
                        </p>
                      </div>
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
                      {listaUsuarios.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full border p-3 rounded-lg bg-slate-50 text-slate-700 max-w-full">
                      {usuarioAtual?.nome || "Usuário atual"}
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
              <h3 className="text-lg font-bold mb-4 border-b pb-2 max-w-full">
                Todas as Obras (Banco de Dados)
              </h3>
              {obrasLista.length === 0 ? (
                <p className="text-gray-500 text-sm max-w-full truncate">
                  Nenhuma obra.
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
                        <th className="p-3 max-w-full truncate">
                          Prazo Entrega
                        </th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm max-w-full">
                      {obrasLista.map((obra) => (
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
          <div className="animate-in fade-in dash-main-wrapper max-w-full flex flex-col items-start gap-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
              Gerador de Ata de Reunião
            </h2>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border mb-2 border-l-4 border-l-[#2A6377] w-full max-w-full">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 max-w-full">
                <div className="flex-1 max-w-full">
                  <label className="block text-sm font-medium mb-2 max-w-full">
                    1. Selecione a Obra para a Reunião
                  </label>
                  <select
                    className="w-full max-w-lg border rounded-lg p-3 outline-none font-bold bg-gray-50 max-w-full"
                    value={reuniaoForm.id_obra}
                    onChange={(e) =>
                      setReuniaoForm({
                        ...reuniaoForm,
                        id_obra: e.target.value,
                      })
                    }
                  >
                    <option value="">A carregar...</option>
                    {obrasLista.map((obra) => {
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
                      ⚠️ Esta obra já foi registrada. Para alterar, clique no
                      botão de edição na tag abaixo.
                    </p>
                  )}
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
                    >
                      <CheckCheck size={14} /> {ob.nome_obra}
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

            <div className="grid grid-cols-1 gap-6 w-full max-w-4xl mx-auto items-start">
              <div className="max-w-full flex flex-col items-start gap-6 w-full">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full max-w-full flex flex-col items-start">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 max-w-full w-full">
                    2. Resumo
                  </h3>
                  <div className="grid grid-cols-1 gap-4 mb-4 max-w-full w-full items-start">
                    <div>
                      <label className="block text-sm mb-1 max-w-full">
                        Data da Reunião
                      </label>
                      <input
                        type="date"
                        className="w-full sm:w-[200px] border rounded-lg p-2 outline-none max-w-full"
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
                  <div className="w-full max-w-full flex flex-col items-start">
                    <label className="block text-sm mb-1 max-w-full">
                      Resumo Geral
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-lg p-3 outline-none max-w-full"
                      value={reuniaoForm.resumo_geral}
                      onChange={(e) =>
                        setReuniaoForm({
                          ...reuniaoForm,
                          resumo_geral: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                </div>

                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full max-w-full flex flex-col items-start">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 max-w-full w-full">
                    3. Ocorrências
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full items-start">
                    <select
                      className="border rounded-lg p-2 w-full sm:w-[150px] shrink-0 outline-none"
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
                    </select>
                    <input
                      type="text"
                      className="border rounded-lg p-2 flex-1 w-full outline-none max-w-full"
                      placeholder="Ex: Chegou o material..."
                      value={novaOcorrencia.descricao}
                      onChange={(e) =>
                        setNovaOcorrencia({
                          ...novaOcorrencia,
                          descricao: e.target.value,
                        })
                      }
                      onKeyPress={(e) =>
                        e.key === "Enter" && adicionarOcorrencia()
                      }
                    />
                    <button
                      onClick={adicionarOcorrencia}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold w-full sm:w-auto max-w-full sm:ml-auto transition"
                    >
                      Add
                    </button>
                  </div>
                  {listaOcorrencias.map((oc, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-50 p-2 mt-2 rounded border text-sm max-w-full w-full"
                    >
                      <div>
                        <span className="font-semibold text-[#2A6377] capitalize max-w-full truncate">
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
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full max-w-full flex flex-col items-start">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 max-w-full w-full">
                    4. Gerar Tarefas
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 mb-3 w-full max-w-full items-start">
                    <input
                      type="text"
                      className="border rounded-lg p-2 flex-1 w-full outline-none max-w-full"
                      placeholder="O que precisa ser feito..."
                      value={novaTarefa.titulo}
                      onChange={(e) =>
                        setNovaTarefa({ ...novaTarefa, titulo: e.target.value })
                      }
                    />
                    <input
                      type="date"
                      className="border rounded-lg p-2 w-full sm:w-[160px] shrinking-0 max-w-full"
                      value={novaTarefa.data_vencimento}
                      onChange={(e) =>
                        setNovaTarefa({
                          ...novaTarefa,
                          data_vencimento: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full max-w-full items-start">
                    <select
                      className="border rounded-lg p-2 flex-1 w-full outline-none max-w-full"
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
                    <button
                      onClick={adicionarTarefa}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold w-full sm:w-auto max-w-full sm:ml-auto transition"
                    >
                      Adicionar
                    </button>
                  </div>
                  {listaTarefas.map((tar, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-3 mt-2 rounded border text-sm gap-2 max-w-full w-full"
                    >
                      <div>
                        <span className="font-semibold block max-w-full truncate">
                          {tar.titulo}
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1 max-w-full">
                          <span className="flex items-center gap-1 max-w-full truncate">
                            <User size={12} className="shrink-0" />{" "}
                            {tar.nome_responsavel}
                          </span>
                          {tar.data_vencimento && (
                            <span className="flex items-center gap-1 max-w-full truncate">
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
