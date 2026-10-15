import { lazy, Suspense, useState, useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import TelaDashboard from "./telas/TelaDashboard";
import TelaReunioes from "./telas/TelaReunioes";
import { AbaPrevisoes, PainelSolicitacoes, podeSolicitarPrevisao } from "./SolicitacoesPrevisao";
import { SolicitacoesFaturamentoObra, TelaFaturamento } from "./SolicitacoesFaturamento";
import { AtivarPush, ItemNotificacao } from "./Notificacoes";
import { removerPushAoSair } from "./push";
import { caminhoParaRota, rotaParaCaminho, type Rota } from "./rotas";
import StatusSync from "./StatusSync";
import type {
  Notificacao,
  SyncStatus,
  Usuario,
  Obra,
  Tarefa,
  ComentarioTarefa,
  ParcelaCliente,
  DocumentoProjeto,
  CronogramaObra,
  ObraFaturamentoFamilia,
  ObraFaturamentoGrupo,
  ObraFaturamentoPrevisao,
  ObraFaturamentoRealizado,
  ObraSmaMaterial,
  ObraRentabilidadeFamilia,
} from "./types";
import {
  formatarDataSegura,
  formatarDataHora,
  formatarMoeda,
  dataHojeISO,
  selecionarTextoAoFocar,
  isoParaDataBR,
  formatarEntradaDataBR,
  dataBRParaISO,
  calcularStatusParcela,
  labelFase,
  indicadorPorStatusDocumento,
  normalizarNomeArquivo,
  compararCodigoFamilia,
  isAtrasada,
} from "./utils";
import {
  Briefcase,
  History,
  ShoppingCart,
  Calendar,
  CheckSquare,
  HardHat,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Loader2,
  Play,
  Check,
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
  ChevronRight,
  FolderOpen,
  FileText,
  LayoutDashboard,
  Settings,
  ClipboardList,
  DollarSign,
  Receipt,
  Boxes,
  TrendingUp,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// Link de "Esqueceu a senha?": o Supabase entra com a pessoa logada e marca
// type=recovery no endereco. Guardado aqui, antes do supabase-js limpar o endereco.
const ENTROU_POR_RECUPERACAO =
  typeof window !== "undefined" &&
  /type=recovery/.test(window.location.hash + window.location.search);

// Telas e abas carregadas so quando abertas (o Dashboard e a tela inicial e vem junto).
const AbaComprasObra = lazy(() => import("./telas/painel/AbaComprasObra"));
const AbaCronograma = lazy(() => import("./telas/painel/AbaCronograma"));
const AbaDiarioTarefas = lazy(() => import("./telas/painel/AbaDiarioTarefas"));
const AbaDocumentos = lazy(() => import("./telas/painel/AbaDocumentos"));
const AbaFaturamento = lazy(() => import("./telas/painel/AbaFaturamento"));
const AbaFinanceiro = lazy(() => import("./telas/painel/AbaFinanceiro"));
const AbaResumo = lazy(() => import("./telas/painel/AbaResumo"));
const ListaMateriaisSMA = lazy(() => import("./ListaMateriaisSMA"));
const RentabilidadeProjeto = lazy(() => import("./RentabilidadeProjeto"));
const TelaAuditoria = lazy(() => import("./telas/TelaAuditoria"));
const TelaCadastroObras = lazy(() => import("./telas/TelaCadastroObras"));
const TelaCompras = lazy(() => import("./telas/TelaCompras"));
const TelaEquipe = lazy(() => import("./telas/TelaEquipe"));
const TelaTarefas = lazy(() => import("./telas/TelaTarefas"));

const CarregandoTela = () => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
    <Loader2 className="animate-spin" size={18} /> Carregando...
  </div>
);

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
  // tela "Definir nova senha" (aberta pelo link de recuperacao do e-mail)
  const [redefinindoSenha, setRedefinindoSenha] = useState<boolean>(ENTROU_POR_RECUPERACAO);
  const [novaSenha, setNovaSenha] = useState<string>("");
  const [confirmaSenha, setConfirmaSenha] = useState<string>("");

  const [telaAtiva, setTelaAtiva] = useState<string>("dashboard");
  // partes da navegacao que vao para o endereco (ver rotas.ts)
  const [dataReuniaoSelecionada, setDataReuniaoSelecionada] = useState<string | null>(null);
  const [solicitacaoDestaque, setSolicitacaoDestaque] = useState<string | null>(null);
  const rotaPronta = useRef(false);
  const aplicandoRota = useRef(false);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [toasts, setToasts] = useState<any[]>([]);


  const [listaUsuarios, setListaUsuarios] = useState<Usuario[]>([]);

  // Obras com os valores de venda
  const [obrasLista, setObrasLista] = useState<Obra[]>([]);
  // obra a abrir no formulario de Cadastros -> Obras ("Editar cadastro" dentro da obra)
  const [obraParaEditar, setObraParaEditar] = useState<any>(null);
  const [ordenacaoMinhasObras, setOrdenacaoMinhasObras] = useState<
    "codigo" | "nome"
  >("codigo");

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

  const [abaReunioes, setAbaReunioes] = useState<"historico" | "nova">(
    "historico",
  );

  const [tarefasKanban, setTarefasKanban] = useState<Tarefa[]>([]);
  const [filtroObraKanban, setFiltroObraKanban] = useState<string>("todas");
  const [minhasNotificacoes, setMinhasNotificacoes] = useState<Tarefa[]>([]);
  const [painelNotificacaoAberto, setPainelNotificacaoAberto] =
    useState<boolean>(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);
  const [menuRecolhido, setMenuRecolhido] = useState<boolean>(() => {
    try {
      return localStorage.getItem("menu_recolhido") === "1";
    } catch {
      return false;
    }
  });
  const [novidades, setNovidades] = useState<Notificacao[]>([]);
  const [statusSync, setStatusSync] = useState<SyncStatus | null>(null);

  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);

  const [obraEcoSelecionada, setObraEcoSelecionada] = useState<Obra | null>(null);
  const [comentariosTarefaAtual, setComentariosTarefaAtual] = useState<
    ComentarioTarefa[]
  >([]);
  const [novoComentarioTexto, setNovoComentarioTexto] = useState<string>("");

  // ESTADOS DO FINANCEIRO

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
  const [materiaisSma, setMateriaisSma] = useState<ObraSmaMaterial[]>([]);
  const [rentabilidadeFamilias, setRentabilidadeFamilias] = useState<
    ObraRentabilidadeFamilia[]
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


  const mostrarAviso = (mensagem: string, tipo: string = "sucesso") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, mensagem, tipo }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  // Falha ao carregar dados: registra no console e avisa na tela, sem repetir o mesmo
  // aviso em sequencia (ex.: varias partes da obra falhando juntas).
  const ultimoAvisoFalha = useRef({ texto: "", quando: 0 });
  const falhaAoCarregar = (oque: string, error: unknown) => {
    console.error(`Erro ao carregar ${oque}:`, error);
    const texto = `Não foi possível carregar ${oque}. Verifique a conexão e atualize a página.`;
    const agora = Date.now();
    if (ultimoAvisoFalha.current.texto === texto && agora - ultimoAvisoFalha.current.quando < 15000) return;
    ultimoAvisoFalha.current = { texto, quando: agora };
    mostrarAviso(texto, "erro");
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session) buscarPerfilUsuario(session.user.email);
      else setCarregandoAuth(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRedefinindoSenha(true);
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
      if (data && data.ativo === false) {
        // usuario desativado: o banco ja bloqueia os dados; aqui so encerra a sessao
        await supabase.auth.signOut();
        setUsuarioAtual(null);
        setErroLogin("Seu acesso ao sistema está desativado. Fale com o administrador.");
        return;
      }
      if (data) setUsuarioAtual(data);
    } catch (error) {
      falhaAoCarregar("o seu cadastro", error);
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
        if (!/@kalter\.com\.br$/i.test(emailAuth.trim()))
          throw new Error("Use o seu e-mail da empresa (@kalter.com.br).");
        if (problemaSenha(senhaAuth)) throw new Error(problemaSenha(senhaAuth));
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
        setMensagemSucesso(
          "Conta criada! Enviamos um link de confirmação para o seu e-mail (veja também o spam). Confirme o e-mail e depois entre.",
        );
        setModoAuth("login");
        setSenhaAuth("");
      } else if (modoAuth === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailAuth, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMensagemSucesso(
          "Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha (veja também o spam). Abra o link: o sistema vai pedir a senha nova.",
        );
        setModoAuth("login");
      }
    } catch (error: any) {
      setErroLogin(
        error.message.includes("Invalid login credentials")
          ? "E-mail ou senha incorretos."
          : traduzirErroSenha(error.message),
      );
    } finally {
      setCarregandoAuth(false);
    }
  };

  // Mesma regra configurada no Supabase (Authentication > Sign In / Providers, 14/10): minimo 8,
  // minuscula, maiuscula, numero e simbolo. Validar aqui so da a mensagem em portugues antes de enviar.
  const REGRA_SENHA = "Mínimo de 8 caracteres, com letra minúscula, maiúscula, número e símbolo (ex.: ! @ # $).";
  const problemaSenha = (s: string) =>
    s.length < 8 || !/[a-z]/.test(s) || !/[A-Z]/.test(s) || !/[0-9]/.test(s) || !/[^A-Za-z0-9]/.test(s)
      ? `Senha fraca. ${REGRA_SENHA}`
      : "";
  const traduzirErroSenha = (msg: string) =>
    /different from the old/i.test(msg)
      ? "A nova senha precisa ser diferente da anterior."
      : /password/i.test(msg) && /(weak|characters|at least|should contain)/i.test(msg)
        ? `Senha fraca. ${REGRA_SENHA}`
        : msg;

  const salvarNovaSenha = async (e: any) => {
    e.preventDefault();
    setErroLogin("");
    if (problemaSenha(novaSenha)) return setErroLogin(problemaSenha(novaSenha));
    if (novaSenha !== confirmaSenha) return setErroLogin("As duas senhas não são iguais.");
    setCarregandoAuth(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setRedefinindoSenha(false);
      setNovaSenha("");
      setConfirmaSenha("");
      window.history.replaceState(null, "", "/");
      mostrarAviso("Senha alterada! Use a nova senha nos próximos acessos.");
    } catch (error: any) {
      setErroLogin(traduzirErroSenha(error.message));
    } finally {
      setCarregandoAuth(false);
    }
  };

  const fazerLogout = async () => {
    await removerPushAoSair();
    await supabase.auth.signOut();
    setTelaAtiva("dashboard");
    setEmailAuth("");
    setSenhaAuth("");
    setObraEcoSelecionada(null);
  };
  // admin: tudo, inclusive cadastros (equipe, obras) e historico de alteracoes.
  // coordenador: ve e gerencia tudo como o admin, menos esses cadastros e o historico.
  const isAdmin = usuarioAtual?.perfil === "admin";
  const veTudo = isAdmin || usuarioAtual?.perfil === "coordenador";
  const podeCadastrarObras = usuarioAtual?.perfil !== "coordenador";
  // Rentabilidade (custo/margem do projeto) e informacao sensivel - so admin e
  // engenheiro veem essa aba; assistente e logistica ficam de fora.
  const podeVerRentabilidade =
    veTudo || usuarioAtual?.perfil === "engenheiro";
  // Assistente herda o escopo de obras do engenheiro ao qual está vinculado.
  const idResponsavelEscopo =
    usuarioAtual?.perfil === "assistente"
      ? usuarioAtual?.id_engenheiro_vinculado || usuarioAtual?.id
      : usuarioAtual?.id;
  // Logistica/Suprimentos acompanha TODAS as obras (cota e compra o material que os
  // gestores pedem), so para consulta e so nas abas de que precisa; pode pedir previsao.
  // Resumo e Financeiro ficam de fora (mostram recebimentos do cliente).
  const ehLogistica = usuarioAtual?.perfil === "logistica";
  // Fiscal: emite as NFs das solicitacoes de faturamento; ve todas as obras so na aba Faturamento
  const ehFiscal = usuarioAtual?.perfil === "fiscal";
  // painel de compras (so consulta): logistica e admin
  const podeVerCompras = ehLogistica || veTudo;
  const veTodasObras = veTudo || ehLogistica || ehFiscal;
  const abaInicialObra = ehLogistica || ehFiscal ? "faturamento" : "resumo";
  const abaObraPermitida = (aba: string) => {
    if (ehFiscal) return aba === "faturamento";
    if (ehLogistica) return ["faturamento", "lista_materiais", "compras", "diario_tarefas", "previsoes"].includes(aba);
    if (aba === "rentabilidade") return podeVerRentabilidade;
    if (aba === "previsoes") return podeSolicitarPrevisao(usuarioAtual);
    return ["resumo", "financeiro", "faturamento", "lista_materiais", "compras", "cronograma", "documentos", "diario_tarefas"].includes(aba);
  };
  // Filtro unico das obras que o usuario enxerga: quem nao ve todas fica com as do
  // seu escopo (engenheiro: as dele; assistente: as do engenheiro vinculado).
  const noEscopoDoUsuario = (query: any, verTodas: boolean = veTudo) =>
    verTodas ? query : query.eq("id_responsavel", idResponsavelEscopo);
  const podeEditarObra = (obra: any) =>
    Boolean(veTudo || (obra && usuarioAtual && obra.id_responsavel === idResponsavelEscopo));
  const podeEditarObraSelecionada = Boolean(
    veTudo ||
      (obraEcoSelecionada &&
        usuarioAtual &&
        obraEcoSelecionada.id_responsavel === idResponsavelEscopo),
  );

  useEffect(() => {
    async function buscarNotificacoes() {
      if (!usuarioAtual) return;
      try {
        const { data, error } = await supabase
          .from("tarefas")
          .select("id, titulo, data_vencimento, obras(nome, codigo_externo)")
          .eq("id_responsavel", usuarioAtual.id)
          .eq("status", "pendente")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) setMinhasNotificacoes(data);
      } catch (error) {
        falhaAoCarregar("suas tarefas pendentes", error);
      }
    }
    buscarNotificacoes();
  }, [usuarioAtual, telaAtiva]);

  const buscarNovidades = async () => {
    if (!usuarioAtual) return;
    try {
      const { data } = await supabase
        .from("notificacoes")
        .select("id, tipo, titulo, detalhe, id_obra, id_tarefa, financeira, lida_em, created_at, chave")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setNovidades(data);
      const { data: sync } = await supabase
        .from("sync_status")
        .select("iniciou_em, terminou_em, ok, etapas_com_erro")
        .eq("id", "robo")
        .maybeSingle();
      setStatusSync(sync || null);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  };

  useEffect(() => {
    if (!usuarioAtual) return;
    buscarNovidades();
    const atualizarSeVisivel = () => {
      if (document.visibilityState === "visible") buscarNovidades();
    };
    const intervalo = setInterval(atualizarSeVisivel, 60000);
    document.addEventListener("visibilitychange", atualizarSeVisivel);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", atualizarSeVisivel);
    };
  }, [usuarioAtual?.id]);

  // ---- Endereco do navegador (ver rotas.ts) ----------------------------------
  // Ao entrar (inclusive depois do login, que nao recarrega a pagina) e no
  // Voltar/Avancar do navegador, o caminho vira estado; quando o estado muda, o
  // caminho e gravado no historico. Links dos e-mails caem aqui.
  const aplicarRota = async (rota: Rota) => {
    aplicandoRota.current = true;
    try {
      if (rota.abrirNotificacoes) {
        setPainelNotificacaoAberto(true);
        buscarNovidades();
      }
      let tela = rota.tela;
      if (tela === "solicitacoes_previsao" && !podeSolicitarPrevisao(usuarioAtual)) tela = "dashboard";
      if (tela === "cadastros_equipe" && usuarioAtual?.perfil !== "admin") tela = "dashboard";
      if (tela === "compras" && !podeVerCompras) tela = "dashboard";
      if (tela === "historico" && usuarioAtual?.perfil !== "admin") tela = "dashboard";
      if (tela === "cadastros_obras" && !podeCadastrarObras) tela = "dashboard";

      if (tela === "painel_obra" && rota.codigoObra) {
        const aba = abaObraPermitida(rota.abaObra || "") ? rota.abaObra! : abaInicialObra;
        if (obraEcoSelecionada?.codigo_externo === rota.codigoObra) {
          setTelaAtiva("painel_obra");
          setAbaPainelObra(aba);
        } else {
          const { data } = await supabase
            .from("obras")
            .select("id, codigo_externo, nome, fase_atual, id_responsavel, status")
            .eq("codigo_externo", rota.codigoObra)
            .maybeSingle();
          if (data) {
            abrirPainelObra(data);
            setAbaPainelObra(aba);
          } else {
            mostrarAviso(`Obra ${rota.codigoObra} não encontrada ou sem acesso.`, "erro");
            setTelaAtiva("minhas_obras");
          }
        }
      } else {
        setTelaAtiva(tela === "painel_obra" ? "minhas_obras" : tela);
      }

      if (tela === "reunioes") {
        setAbaReunioes(rota.novaReuniao ? "nova" : "historico");
        setDataReuniaoSelecionada(rota.dataReuniao || null);
      }
      setSolicitacaoDestaque(tela === "solicitacoes_previsao" || tela === "faturamento" ? rota.idSolicitacao || null : null);

      if (rota.idTarefa) {
        if (tarefaSelecionada?.id !== rota.idTarefa) {
          const { data } = await supabase
            .from("tarefas")
            .select(
              `id, id_obra, titulo, descricao, status, data_vencimento, id_responsavel, created_at, origem, prioridade, data_conclusao, observacao_conclusao, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`,
            )
            .eq("id", rota.idTarefa)
            .maybeSingle();
          if (data) setTarefaSelecionada(data as any);
          else mostrarAviso("Tarefa não encontrada ou sem acesso.", "erro");
        }
      } else {
        setTarefaSelecionada(null);
      }
    } finally {
      // deixa o React aplicar os estados acima antes de voltar a gravar no historico
      setTimeout(() => {
        aplicandoRota.current = false;
        rotaPronta.current = true;
        // normaliza o endereco (ex.: link antigo /?tela=tarefas -> /tarefas)
        if (caminhoRef.current !== window.location.pathname + window.location.search)
          window.history.replaceState(null, "", caminhoRef.current);
      }, 0);
    }
  };

  useEffect(() => {
    if (!usuarioAtual) {
      rotaPronta.current = false;
      return;
    }
    aplicarRota(caminhoParaRota(window.location.pathname, window.location.search));
    const aoVoltar = () => aplicarRota(caminhoParaRota(window.location.pathname, window.location.search));
    // clique num aviso push com o app ja aberto: o service worker manda o endereco do
    // aviso (ex.: /previsoes/<id>) e o app navega ate ele
    const aoReceber = (ev: MessageEvent) => {
      if (ev.data?.tipo === "abrir-url" && typeof ev.data.url === "string") {
        const destino = new URL(ev.data.url, window.location.origin);
        if (destino.origin !== window.location.origin) return;
        window.history.pushState(null, "", destino.pathname + destino.search);
        aplicarRota(caminhoParaRota(destino.pathname, destino.search));
        return;
      }
      if (ev.data?.tipo === "abrir-notificacoes") {
        setPainelNotificacaoAberto(true);
        buscarNovidades();
      }
    };
    window.addEventListener("popstate", aoVoltar);
    navigator.serviceWorker?.addEventListener("message", aoReceber);
    return () => {
      window.removeEventListener("popstate", aoVoltar);
      navigator.serviceWorker?.removeEventListener("message", aoReceber);
    };
  }, [usuarioAtual?.id]);

  const caminhoAtual = rotaParaCaminho({
    tela: telaAtiva,
    codigoObra: obraEcoSelecionada?.codigo_externo || undefined,
    abaObra: abaPainelObra,
    novaReuniao: abaReunioes === "nova",
    dataReuniao: dataReuniaoSelecionada || undefined,
    idSolicitacao: solicitacaoDestaque || undefined,
    idTarefa: tarefaSelecionada?.id,
  });
  const caminhoRef = useRef(caminhoAtual);
  caminhoRef.current = caminhoAtual;

  useEffect(() => {
    if (!usuarioAtual || !rotaPronta.current) return;
    const atual = window.location.pathname + window.location.search;
    if (caminhoAtual === atual) return;
    if (aplicandoRota.current) window.history.replaceState(null, "", caminhoAtual);
    else window.history.pushState(null, "", caminhoAtual);
  }, [caminhoAtual]);

  const alternarMenuRecolhido = () =>
    setMenuRecolhido((atual) => {
      const novo = !atual;
      try {
        localStorage.setItem("menu_recolhido", novo ? "1" : "0");
      } catch {
        /* sem armazenamento local: a escolha vale so ate recarregar */
      }
      return novo;
    });

  const buscarUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, perfil, id_engenheiro_vinculado, aprova_previsao, recebe_copia_previsao, aprova_faturamento, recebe_copia_faturamento, login_erp")
        .eq("ativo", true);
      if (error) throw error;
      setListaUsuarios(data || []);
    } catch (error) {
      falhaAoCarregar("a lista de usuários", error);
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
      query = noEscopoDoUsuario(query, veTodasObras);
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setObrasLista(data);
      }
    } catch (error) {
      falhaAoCarregar("as obras", error);
    }
  };

  useEffect(() => {
    if (sessao && usuarioAtual) {
      buscarUsuarios();
      buscarObras();
    }
  }, [telaAtiva, sessao, usuarioAtual]);

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
      falhaAoCarregar("as parcelas do cliente", error);
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
      falhaAoCarregar("os documentos do projeto", error);
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
      falhaAoCarregar("os anexos dos documentos", error);
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
      falhaAoCarregar("o cronograma da obra", error);
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
      falhaAoCarregar("as famílias de faturamento", error);
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
      falhaAoCarregar("os grupos de faturamento", error);
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
      falhaAoCarregar("as previsões de faturamento", error);
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
      falhaAoCarregar("os faturamentos realizados", error);
    }
  };

  const buscarMateriaisSma = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_sma_materiais")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("nr_sma", { ascending: false });
      if (error) throw error;
      setMateriaisSma(data || []);
    } catch (error) {
      falhaAoCarregar("a lista de materiais (SMA)", error);
    }
  };

  const buscarRentabilidadeFamilias = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_rentabilidade_familias")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("codigo_projeto", { ascending: true });
      if (error) throw error;
      setRentabilidadeFamilias(data || []);
    } catch (error) {
      falhaAoCarregar("a rentabilidade do projeto", error);
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
    if (telaAtiva === "painel_obra" && obraEcoSelecionada) {
      buscarParcelasCliente(obraEcoSelecionada.id);
      buscarDocumentosProjeto(obraEcoSelecionada.id);
      buscarArquivosDocumentos(obraEcoSelecionada.id);
      buscarCronogramaObra(obraEcoSelecionada.id);
      buscarFamiliasFaturamento(obraEcoSelecionada.id);
      buscarGruposFaturamentoObra(obraEcoSelecionada.id);
      buscarPrevisoesFaturamento(obraEcoSelecionada.id);
      buscarRealizadosFaturamento(obraEcoSelecionada.id);
      buscarMateriaisSma(obraEcoSelecionada.id);
      if (podeVerRentabilidade) buscarRentabilidadeFamilias(obraEcoSelecionada.id);
    }
  }, [telaAtiva, obraEcoSelecionada, podeVerRentabilidade]);

  const buscarTarefasKanban = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("tarefas")
        .select(
          `id, id_obra, titulo, descricao, status, data_vencimento, id_responsavel, created_at, origem, prioridade, data_conclusao, observacao_conclusao, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`,
        )
        .order("created_at", { ascending: false });
      if (!veTodasObras) {
        const { data: obrasUsuario, error: erroObras } = await supabase
          .from("obras")
          .select("id")
          .eq("id_responsavel", idResponsavelEscopo); // so entra aqui quem nao ve todas
        if (erroObras) throw erroObras;
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
      falhaAoCarregar("as tarefas", error);
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
        const { data, error } = await supabase
          .from("comentarios_tarefa")
          .select("id, texto, created_at, usuarios(nome)")
          .eq("id_tarefa", tarefaSelecionada.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setComentariosTarefaAtual(data || []);
      } catch (error) {
        falhaAoCarregar("os comentários da tarefa", error);
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

  const abrirPainelObra = async (obra: any) => {
    // Mostra o card clicado na hora (alguns lugares, ex: cards do Dashboard PMIS,
    // trazem so um subconjunto de colunas), depois busca a linha completa da obra -
    // sem isso, campos como "observacoes" (ex: alertas do robo) ficavam sempre vazios
    // quando o painel era aberto a partir do Dashboard.
    setObraEcoSelecionada(obra);
    setFiltroObraKanban(obra.id);
    setAbaPainelObra(abaInicialObra);
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
      falhaAoCarregar("os dados da obra", error);
    }
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

      // So o miolo: cabecalho com logo e rodape sao colocados pelo robo
      // (robo-sync-erp/src/layout_email.py) na hora do envio.
      const esc = (t?: string | null) =>
        (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const linha = (rotulo: string, valor: string) =>
        `<tr><td style="padding:6px 12px 6px 0; color:#64748b; font-size:13px; white-space:nowrap; vertical-align:top;">${rotulo}</td><td style="padding:6px 0; font-size:15px; color:#1e293b;">${valor}</td></tr>`;
      const html = `
        <p style="margin:0 0 18px 0; font-size:20px; font-weight:bold; color:#2A6377;">Nova tarefa atribuída a você</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top:1px solid #e5eaee; border-bottom:1px solid #e5eaee; padding:8px 0;">
          ${linha("Tarefa", `<strong>${esc(dados.titulo)}</strong>`)}
          ${dados.descricao ? linha("Descrição", esc(dados.descricao).replace(/\n/g, "<br/>")) : ""}
          ${dados.nome_obra ? linha("Obra", esc(dados.nome_obra)) : ""}
          ${dados.data_vencimento ? linha("Prazo", `<strong>${formatarDataSegura(dados.data_vencimento)}</strong>`) : ""}
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 4px 0;">
          <tr><td style="border-radius:8px; background:#2A6377;">
            <a href="${window.location.origin}/tarefas?tarefa=${idTarefa}" target="_blank" style="display:inline-block; padding:12px 22px; font-family:'Segoe UI',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Clique aqui para ver a tarefa</a>
          </td></tr>
        </table>
      `;

      // Vai para a fila; o robo envia pelo Gmail do Gestao de Obras e marca
      // email_atribuicao_enviado quando sair.
      const { error } = await supabase.rpc("enfileirar_email", {
        p_para: [responsavel.email],
        p_assunto: `Nova tarefa: ${dados.titulo}`,
        p_html: html,
        p_origem: "tarefa_atribuida",
        p_id_tarefa: idTarefa,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Erro ao enviar e-mail de atribuição de tarefa:", error);
      mostrarAviso("A tarefa foi salva, mas o e-mail para o responsável não pôde ser enviado.", "erro");
    }
  };

  const novidadesNaoLidas = novidades.filter((n) => !n.lida_em).length;
  const tarefasVencidasMinhas = minhasNotificacoes.filter((t) =>
    isAtrasada(t.data_vencimento, "pendente"),
  ).length;
  const totalSino = novidadesNaoLidas + tarefasVencidasMinhas;

  const marcarNotificacoesLidas = async (ids?: string[]) => {
    const agora = new Date().toISOString();
    setNovidades((prev) =>
      prev.map((n) =>
        !n.lida_em && (!ids || ids.includes(n.id)) ? { ...n, lida_em: agora } : n,
      ),
    );
    const { error } = await supabase.rpc("marcar_notificacoes_lidas", {
      p_ids: ids ?? null,
    });
    if (error) console.error("Erro ao marcar notificações como lidas:", error);
  };

  const abrirNotificacao = async (notif: Notificacao) => {
    if (!notif.lida_em) marcarNotificacoesLidas([notif.id]);
    setPainelNotificacaoAberto(false);
    if (notif.tipo === "tarefa_atribuida" || notif.tipo === "tarefa_comentario") {
      setTelaAtiva("tarefas");
      return;
    }
    if (notif.tipo === "previsao_aprovacao") {
      setTelaAtiva("solicitacoes_previsao");
      return;
    }
    if (notif.tipo === "faturamento") {
      const id = /^fat:([0-9a-f-]{36})/.exec(notif.chave || "")?.[1] || null;
      setTelaAtiva("faturamento");
      setSolicitacaoDestaque(id);
      return;
    }
    if (!notif.id_obra) return;
    try {
      const { data } = await supabase
        .from("obras")
        .select("id, codigo_externo, nome, fase_atual, id_responsavel, status")
        .eq("id", notif.id_obra)
        .single();
      if (data) {
        abrirPainelObra(data);
        // nf_nova -> aba Faturamento; recebimento_novo -> aba Financeiro (parcelas)
        if (notif.tipo === "nf_nova") setAbaPainelObra("faturamento");
        if (notif.tipo === "recebimento_novo") setAbaPainelObra("financeiro");
        if (notif.tipo === "previsao_resultado") setAbaPainelObra("previsoes");
        if (notif.tipo === "familia_alerta") setAbaPainelObra("previsoes");
      }
    } catch (error) {
      falhaAoCarregar("a obra da notificação", error);
    }
  };

  const botaoSino = (classe: string) => (
    <button
      onClick={() => {
        setPainelNotificacaoAberto(true);
        buscarNovidades();
      }}
      title="Notificações"
      className={`relative ${classe}`}
    >
      <Bell size={20} />
      {totalSino > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#2A6377]">
          {totalSino > 99 ? "99+" : totalSino}
        </span>
      )}
    </button>
  );

  const itemMenu = (tela: string, rotulo: string, Icone: any, ativo: boolean) => (
    <button
      key={tela}
      title={menuRecolhido ? rotulo : undefined}
      onClick={() => {
        setTelaAtiva(tela);
        setSolicitacaoDestaque(null);
        setMenuMobileAberto(false);
      }}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${menuRecolhido ? "md:justify-center md:px-0" : ""} ${ativo ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
    >
      <Icone size={20} className="shrink-0" />
      <span className={menuRecolhido ? "md:hidden" : ""}>{rotulo}</span>
    </button>
  );

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

  // CÁLCULOS DO FINANCEIRO
  const totalVendaProduto = Number(obraEcoSelecionada?.valor_produto) || 0;
  const totalVendaServico = Number(obraEcoSelecionada?.valor_servico) || 0;
  const totalVendaGeral = totalVendaProduto + totalVendaServico;

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

  if (sessao && redefinindoSenha) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="bg-[#2A6377] p-6 md:p-8 text-center flex flex-col items-center justify-center border-b border-[#1e4857]">
            <img src="/logo.png" alt="Kalter Logo" className="max-h-16 w-auto object-contain" />
            <p className="text-white/80 font-medium tracking-wide uppercase text-xs mt-2">Gestão de Obras</p>
          </div>
          <form onSubmit={salvarNovaSenha} className="p-6 md:p-8 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Definir nova senha</h2>
              <p className="text-sm text-slate-500 mt-1">
                Crie a nova senha para <b>{sessao.user?.email}</b>.
              </p>
            </div>
            {erroLogin && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <span>{erroLogin}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Nova senha</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{REGRA_SENHA}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Repita a nova senha</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={carregandoAuth}
              className="w-full bg-[#2A6377] hover:bg-[#1e4857] text-white p-3 rounded-lg font-bold flex justify-center items-center disabled:opacity-50"
            >
              {carregandoAuth ? <Loader2 className="animate-spin" size={18} /> : "Salvar nova senha"}
            </button>
            <button
              type="button"
              onClick={async () => {
                setRedefinindoSenha(false);
                window.history.replaceState(null, "", "/");
                await supabase.auth.signOut();
              }}
              className="w-full text-slate-500 text-sm font-medium"
            >
              Cancelar e sair
            </button>
          </form>
        </div>
      </div>
    );
  }

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
                  {modoAuth === "cadastro" && <p className="text-[11px] text-slate-400 mt-1">{REGRA_SENHA}</p>}
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
        <div className="flex items-center gap-3">
          {botaoSino("p-2 bg-white/10 rounded-lg hover:bg-white/20 transition")}
          <button
            onClick={() => setMenuMobileAberto(true)}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {menuMobileAberto && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[40] md:hidden"
          onClick={() => setMenuMobileAberto(false)}
        />
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
                (veTudo || tarefaSelecionada.id_responsavel === usuarioAtual?.id || tarefaSelecionada.obras?.id_responsavel === idResponsavelEscopo) && (
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
                <Bell className="text-[#2A6377]" /> Notificações
              </h2>
              <button onClick={() => setPainelNotificacaoAberto(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              <AtivarPush />
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Novidades{novidadesNaoLidas > 0 ? ` (${novidadesNaoLidas} nova${novidadesNaoLidas > 1 ? "s" : ""})` : ""}
                </p>
                {novidadesNaoLidas > 0 && (
                  <button
                    onClick={() => marcarNotificacoesLidas()}
                    className="text-xs font-semibold text-[#2A6377] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Marcar todas como lidas
                  </button>
                )}
              </div>
              {novidades.length === 0 ? (
                <p className="text-sm text-slate-400 mb-6">
                  Nenhuma novidade nos últimos 30 dias.
                </p>
              ) : (
                <div className="space-y-2 mb-6">
                  {novidades.map((notif) => (
                    <ItemNotificacao
                      key={notif.id}
                      notificacao={notif}
                      onClick={() => abrirNotificacao(notif)}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                Minhas tarefas pendentes
                {minhasNotificacoes.length > 0 ? ` (${minhasNotificacoes.length})` : ""}
              </p>
              {minhasNotificacoes.length === 0 ? (
                <div className="text-center mt-4 text-slate-500">
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


      {/* MENU LATERAL (ARQUITETURA ERP) */}
      <aside
        className={`fixed inset-y-0 left-0 z-[50] w-64 ${menuRecolhido ? "md:w-16 2xl:w-16" : "md:w-56 2xl:w-64"} bg-[#2A6377] text-white flex flex-col shadow-2xl transition-[transform,width] duration-300 md:relative md:translate-x-0 ${menuMobileAberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div>
          <div
            className={`p-6 ${menuRecolhido ? "md:p-3" : ""} border-b border-white/10 flex flex-col items-center justify-center relative`}
          >
            <button
              onClick={() => setMenuMobileAberto(false)}
              className="md:hidden absolute top-4 right-4 text-white/70 hover:text-white p-1"
            >
              <X size={24} />
            </button>
            <img
              src="/logo.png"
              alt="Kalter Logo"
              className={`max-h-12 w-auto mb-2 object-contain ${menuRecolhido ? "md:hidden" : ""}`}
              onError={(e: any) => {
                e.target.style.display = "none";
              }}
            />
            <div
              className={`hidden md:flex items-center gap-3 ${menuRecolhido ? "md:flex-col" : ""}`}
            >
              {botaoSino("p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition")}
              <button
                onClick={alternarMenuRecolhido}
                title={menuRecolhido ? "Expandir menu" : "Recolher menu"}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                {menuRecolhido ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-6">
            <div className={`px-4 ${menuRecolhido ? "md:px-2" : ""} mt-6`}>
              <p className={`text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider ${menuRecolhido ? "md:hidden" : ""}`}>
                Principal
              </p>
              <div className="space-y-1">
                {itemMenu("dashboard", "Dashboard", LayoutDashboard, telaAtiva === "dashboard")}
                {itemMenu("tarefas", "Tarefas", CheckSquare, telaAtiva === "tarefas")}
              </div>
            </div>

            <div className={`px-4 ${menuRecolhido ? "md:px-2 md:mt-3" : ""} mt-8`}>
              <p className={`text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider ${menuRecolhido ? "md:hidden" : ""}`}>
                Operação
              </p>
              {menuRecolhido && <div className="hidden md:block h-px bg-white/10 mb-3" />}
              <div className="space-y-1">
                {itemMenu(
                  "minhas_obras",
                  "Minhas Obras",
                  Briefcase,
                  telaAtiva === "minhas_obras" || telaAtiva === "painel_obra",
                )}
                {itemMenu("reunioes", "Reuniões", ClipboardList, telaAtiva === "reunioes")}
                {podeSolicitarPrevisao(usuarioAtual) &&
                  itemMenu("solicitacoes_previsao", "Previsões", Wallet, telaAtiva === "solicitacoes_previsao")}
                {podeVerCompras && itemMenu("compras", "Compras", ShoppingCart, telaAtiva === "compras")}
                {itemMenu("faturamento", "Faturamento", Receipt, telaAtiva === "faturamento")}
              </div>
            </div>

            {(podeCadastrarObras || isAdmin) && (
            <div className={`px-4 ${menuRecolhido ? "md:px-2 md:mt-3" : ""} mt-8`}>
              <p className={`text-[10px] uppercase text-white/50 font-bold mb-2 tracking-wider flex items-center gap-1 ${menuRecolhido ? "md:hidden" : ""}`}>
                <Settings size={12} /> Cadastros
              </p>
              {menuRecolhido && <div className="hidden md:block h-px bg-white/10 mb-3" />}
              <div className="space-y-1">
                {podeCadastrarObras && itemMenu("cadastros_obras", "Obras", HardHat, telaAtiva === "cadastros_obras")}
                {isAdmin &&
                  itemMenu("cadastros_equipe", "Equipe", Users, telaAtiva === "cadastros_equipe")}
                {isAdmin && itemMenu("historico", "Histórico", History, telaAtiva === "historico")}
              </div>
            </div>
            )}
          </div>
        </div>

        <div className={`p-4 ${menuRecolhido ? "md:p-2" : ""} border-t border-white/10 mt-auto`}>
          <StatusSync
            status={statusSync}
            recolhido={menuRecolhido}
            mostrarDetalhes={veTudo}
          />
          <div
            className={`flex items-center gap-3 mb-4 px-2 ${menuRecolhido ? "md:justify-center md:px-0" : ""}`}
            title={menuRecolhido ? `${usuarioAtual?.nome} (${usuarioAtual?.perfil})` : undefined}
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              <User size={16} />
            </div>
            <div className={`overflow-hidden ${menuRecolhido ? "md:hidden" : ""}`}>
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
            title={menuRecolhido ? "Sair" : undefined}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut size={18} className="shrink-0" />
            <span className={menuRecolhido ? "md:hidden" : ""}>Sair</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-5 2xl:p-8 overflow-y-auto overflow-x-hidden bg-slate-50/50">
        <Suspense fallback={<CarregandoTela />}>
        {telaAtiva === "dashboard" && (
          <TelaDashboard
            usuarioAtual={usuarioAtual}
            isAdmin={veTudo}
            tarefasDashboard={tarefasDashboard}
            noEscopoDoUsuario={noEscopoDoUsuario}
            falhaAoCarregar={falhaAoCarregar}
            onAbrirObra={abrirPainelObra}
            onAbrirTarefa={setTarefaSelecionada}
            onIrPara={setTelaAtiva}
          />
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
                        setObraParaEditar(obraEcoSelecionada);
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
                    { id: "lista_materiais", label: "Lista de Materiais", icon: Boxes },
                    { id: "compras", label: "Compras", icon: ShoppingCart },
                    { id: "cronograma", label: "Cronograma", icon: Calendar },
                    { id: "documentos", label: "Documentos", icon: FileText },
                    {
                      id: "diario_tarefas",
                      label: "Diário e Tarefas",
                      icon: ClipboardList,
                    },
                    { id: "previsoes", label: "Previsões", icon: Wallet },
                    { id: "rentabilidade", label: "Rentabilidade", icon: TrendingUp },
                  ].filter((aba) => abaObraPermitida(aba.id)).map((aba) => {
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

            <Suspense fallback={<CarregandoTela />}>
            {abaPainelObra === "resumo" && abaObraPermitida("resumo") && (
              <AbaResumo
                cronogramaObra={cronogramaObra}
                documentosConcluidos={documentosConcluidos}
                documentosProjeto={documentosProjeto}
                fasesConcluidas={fasesConcluidas}
                obraEcoSelecionada={obraEcoSelecionada}
                parcelasVencidas={parcelasVencidas}
                percentualCronograma={percentualCronograma}
                percentualDocumentos={percentualDocumentos}
                saldoReceberParcelas={saldoReceberParcelas}
                totalRealizadoParcelas={totalRealizadoParcelas}
                totalVendaGeral={totalVendaGeral}
              />
            )}

            {abaPainelObra === "financeiro" && abaObraPermitida("financeiro") && (
              <AbaFinanceiro
                abrirLiquidacaoParcela={abrirLiquidacaoParcela}
                carregando={carregando}
                deletarRegistroPMIS={deletarRegistroPMIS}
                novaParcelaCliente={novaParcelaCliente}
                parcelasCliente={parcelasCliente}
                podeEditarObraSelecionada={podeEditarObraSelecionada}
                reabrirParcelaCliente={reabrirParcelaCliente}
                saldoReceberParcelas={saldoReceberParcelas}
                salvarParcelaCliente={salvarParcelaCliente}
                setNovaParcelaCliente={setNovaParcelaCliente}
                totalPrevistoParcelas={totalPrevistoParcelas}
                totalRealizadoParcelas={totalRealizadoParcelas}
                totalVendaGeral={totalVendaGeral}
                valorDistribuidoExcedente={valorDistribuidoExcedente}
                valorRestanteDistribuirPositivo={valorRestanteDistribuirPositivo}
              />
            )}

            {abaPainelObra === "faturamento" && obraEcoSelecionada && (
              <div className="mb-6">
                <SolicitacoesFaturamentoObra
                  idObra={obraEcoSelecionada.id}
                  codigoObra={obraEcoSelecionada.codigo_externo || ""}
                  usuario={usuarioAtual}
                  podeSolicitar={podeEditarObraSelecionada && !ehLogistica && !ehFiscal}
                />
              </div>
            )}
            {abaPainelObra === "faturamento" && (
              <AbaFaturamento
                competenciasFaturamento={competenciasFaturamento}
                familiasFaturamento={familiasFaturamento}
                familiasFaturamentoComEscopo={familiasFaturamentoComEscopo}
                gruposFaturamentoObra={gruposFaturamentoObra}
                gruposFaturamentoResumo={gruposFaturamentoResumo}
                previsoesFaturamentoDoEscopo={previsoesFaturamentoDoEscopo}
                realizadosFaturamentoDoEscopo={realizadosFaturamentoDoEscopo}
                saldoFaturarFamiliasPositivo={saldoFaturarFamiliasPositivo}
                totalEscopoFaturamento={totalEscopoFaturamento}
                totalPrevistoCompetencia={totalPrevistoCompetencia}
                totalPrevistoFaturamento={totalPrevistoFaturamento}
                totalRealizadoCompetencia={totalRealizadoCompetencia}
                totalRealizadoFaturamento={totalRealizadoFaturamento}
                valorPrevistoGrupoCompetencia={valorPrevistoGrupoCompetencia}
                valorRealizadoGrupoCompetencia={valorRealizadoGrupoCompetencia}
              />
            )}

            {abaPainelObra === "lista_materiais" && (
              <ListaMateriaisSMA materiais={materiaisSma} />
            )}
            {abaPainelObra === "compras" && abaObraPermitida("compras") && obraEcoSelecionada && (
              <AbaComprasObra idObra={obraEcoSelecionada.id} codigoObra={obraEcoSelecionada.codigo_externo || ""} />
            )}

            {abaPainelObra === "rentabilidade" && podeVerRentabilidade && (
              <RentabilidadeProjeto
                familias={rentabilidadeFamilias}
                valorVendido={totalVendaGeral}
                obra={obraEcoSelecionada}
                usuario={usuarioAtual}
              />
            )}

            {abaPainelObra === "previsoes" && podeSolicitarPrevisao(usuarioAtual) && obraEcoSelecionada && (
              <AbaPrevisoes obra={obraEcoSelecionada} usuario={usuarioAtual} />
            )}

            {abaPainelObra === "cronograma" && (
              <AbaCronograma
                abrirModalCronograma={abrirModalCronograma}
                cronogramaObra={cronogramaObra}
                obraEcoSelecionada={obraEcoSelecionada}
                podeEditarObraSelecionada={podeEditarObraSelecionada}
                reabrirFaseCronograma={reabrirFaseCronograma}
                zerarFaseCronograma={zerarFaseCronograma}
              />
            )}

            {abaPainelObra === "documentos" && (
              <AbaDocumentos
                abrirArquivoDocumento={abrirArquivoDocumento}
                anexarArquivoDocumento={anexarArquivoDocumento}
                arquivosDocumentos={arquivosDocumentos}
                carregando={carregando}
                concluirDocumentoProjeto={concluirDocumentoProjeto}
                deletarRegistroPMIS={deletarRegistroPMIS}
                documentosProjeto={documentosProjeto}
                excluirArquivoDocumento={excluirArquivoDocumento}
                iniciarDocumentoProjeto={iniciarDocumentoProjeto}
                novoDocumentoProjeto={novoDocumentoProjeto}
                podeEditarObraSelecionada={podeEditarObraSelecionada}
                reabrirDocumentoProjeto={reabrirDocumentoProjeto}
                salvarDocumentoProjeto={salvarDocumentoProjeto}
                setNovoDocumentoProjeto={setNovoDocumentoProjeto}
                uploadDocumentoId={uploadDocumentoId}
              />
            )}

            {abaPainelObra === "diario_tarefas" && (
              <AbaDiarioTarefas
                abrirModalNovaTarefaObra={abrirModalNovaTarefaObra}
                filtroTarefasObra={filtroTarefasObra}
                mostrarAviso={mostrarAviso}
                obraEcoSelecionada={obraEcoSelecionada}
                podeEditarObraSelecionada={podeEditarObraSelecionada}
                setFiltroTarefasObra={setFiltroTarefasObra}
                setSubAbaDiario={setSubAbaDiario}
                setTarefaSelecionada={setTarefaSelecionada}
                subAbaDiario={subAbaDiario}
                tarefasPainelObra={tarefasPainelObra}
                usuarioAtual={usuarioAtual}
              />
            )}
            </Suspense>
          </div>
        )}

        {telaAtiva === "cadastros_equipe" && isAdmin && (
          <TelaEquipe listaUsuarios={listaUsuarios} onAtualizar={buscarUsuarios} onAviso={mostrarAviso} />
        )}

        {telaAtiva === "cadastros_obras" && podeCadastrarObras && (
          <TelaCadastroObras
            usuarioAtual={usuarioAtual}
            listaUsuarios={listaUsuarios}
            isAdmin={isAdmin}
            idResponsavelEscopo={idResponsavelEscopo}
            noEscopoDoUsuario={noEscopoDoUsuario}
            podeEditarObra={podeEditarObra}
            abrirPainelObra={abrirPainelObra}
            obraParaEditar={obraParaEditar}
            onEdicaoIniciada={() => setObraParaEditar(null)}
            onObrasAlteradas={buscarObras}
            falhaAoCarregar={falhaAoCarregar}
            onAviso={mostrarAviso}
          />
        )}

        {telaAtiva === "compras" && podeVerCompras && <TelaCompras falhaAoCarregar={falhaAoCarregar} />}

        {telaAtiva === "faturamento" && (
          <TelaFaturamento usuario={usuarioAtual} idAberto={solicitacaoDestaque} onAbrir={setSolicitacaoDestaque} podeGerenciar={veTudo} />
        )}

        {telaAtiva === "historico" && isAdmin && <TelaAuditoria falhaAoCarregar={falhaAoCarregar} />}

        {telaAtiva === "solicitacoes_previsao" && podeSolicitarPrevisao(usuarioAtual) && (
          <div className="animate-in fade-in space-y-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Solicitações de previsão</h2>
              <p className="text-sm text-slate-400 mt-1">
                Aumentos e transferências de previsão pedidos pelo app: andamento, aprovação e o que foi gravado no
                ERP. Para pedir uma nova, abra a obra e use a aba Previsões.
              </p>
            </div>
            <PainelSolicitacoes
              usuario={usuarioAtual}
              destaque={solicitacaoDestaque}
              onLimparDestaque={() => setSolicitacaoDestaque(null)}
            />
          </div>
        )}

        <TelaReunioes
          ativa={telaAtiva === "reunioes"}
          usuarioAtual={usuarioAtual}
          listaUsuarios={listaUsuarios}
          obrasLista={obrasLista}
          abaReunioes={abaReunioes}
          setAbaReunioes={setAbaReunioes}
          dataReuniaoSelecionada={dataReuniaoSelecionada}
          setDataReuniaoSelecionada={setDataReuniaoSelecionada}
          podeEditarObra={podeEditarObra}
          enviarEmailAtribuicaoTarefa={enviarEmailAtribuicaoTarefa}
          carregando={carregando}
          setCarregando={setCarregando}
          setTelaAtiva={setTelaAtiva}
          falhaAoCarregar={falhaAoCarregar}
          onAviso={mostrarAviso}
        />

        {telaAtiva === "tarefas" && (
          <TelaTarefas
            obrasLista={obrasLista}
            filtroObraKanban={filtroObraKanban}
            setFiltroObraKanban={setFiltroObraKanban}
            tarefasFiltradas={tarefasFiltradas}
            onAbrirTarefa={setTarefaSelecionada}
          />
        )}
        </Suspense>
      </main>
    </div>
  );
}
