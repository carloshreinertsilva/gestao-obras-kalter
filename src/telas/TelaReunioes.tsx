import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import TimelineObra from "../TimelineObra";
import ReunioesHistorico from "../ReunioesHistorico";
import { formatarDataSegura, formatarMoeda, dataHojeISO, labelFase, labelOcorrencia } from "../utils";
import { Save, Clock, User, Loader2, Trash2, Edit2, Mail, CheckCheck, Send, FileText, Mic } from "lucide-react";
import type { Usuario, Obra } from "../types";
import { useDialogos } from "../Dialogos";
import { Modal } from "../Modal";

// Reunioes: historico (ReunioesHistorico), nova reuniao (formulario por obra com
// ocorrencias e tarefas, sessao do dia, contexto da obra, gravacao Plaud) e a ata
// (texto, PDF e e-mail). Fica sempre montado no App e so desenha a tela quando
// ativa, para o rascunho da reuniao nao se perder ao trocar de tela.
const TAREFA_VAZIA = {
  titulo: "",
  descricao: "",
  data_vencimento: "",
  id_responsavel: "",
  prioridade: "normal",
};

interface Props {
  ativa: boolean;
  usuarioAtual: Usuario | null;
  listaUsuarios: Usuario[];
  obrasLista: Obra[];
  abaReunioes: "historico" | "nova";
  setAbaReunioes: (aba: "historico" | "nova") => void;
  dataReuniaoSelecionada: string | null;
  setDataReuniaoSelecionada: (data: string | null) => void;
  podeEditarObra: (obra: any) => boolean;
  enviarEmailAtribuicaoTarefa: (idTarefa: string, dados: any) => Promise<void>;
  carregando: boolean;
  setCarregando: (valor: boolean) => void;
  setTelaAtiva: (tela: string) => void;
  falhaAoCarregar: (oque: string, error: unknown) => void;
  onAviso: (mensagem: string, tipo?: string) => void;
}

export default function TelaReunioes({
  ativa,
  usuarioAtual,
  listaUsuarios,
  obrasLista,
  abaReunioes,
  setAbaReunioes,
  dataReuniaoSelecionada,
  setDataReuniaoSelecionada,
  podeEditarObra,
  enviarEmailAtribuicaoTarefa,
  carregando,
  setCarregando,
  setTelaAtiva,
  falhaAoCarregar,
  onAviso,
}: Props) {
  const { confirmar } = useDialogos();
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
  // obra ja gravada aberta para edicao: o banco continua com a versao gravada ate salvar
  // (salvar_ata troca tudo numa transacao so; a versao recusa a gravacao se outra pessoa alterou antes)
  const [ataEmEdicao, setAtaEmEdicao] = useState<{
    idReuniao: string;
    versao: string;
    nomeObra: string;
  } | null>(null);
  const refDescricaoOcorrencia = useRef<HTMLTextAreaElement>(null);
  const refTituloTarefa = useRef<HTMLInputElement>(null);
  const refResponsavelTarefa = useRef<HTMLSelectElement>(null);
  const [ataGerada, setAtaGerada] = useState<string>("");
  const [modalAtaAberto, setModalAtaAberto] = useState<boolean>(false);
  const [obrasNaAtaAtual, setObrasNaAtaAtual] = useState<any[]>([]);
  const [idSessaoAtaAtual, setIdSessaoAtaAtual] = useState<string | null>(
    null,
  );
  const [gestorSelecionadoAta, setGestorSelecionadoAta] =
    useState<string>("");
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

  // texto digitado pelos usuarios vai escapado no HTML da ata (a ata e aberta numa
  // janela do proprio app para imprimir e vai por e-mail)
  const escHtml = (t: any) =>
    String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const montarHtmlAta = (
    listaObrasParaAta: any[],
    dataAta: string,
    resumoGravacao?: string | null,
    linkApp?: string, // so no e-mail: botao "Ver ata no app" (no PDF nao aparece)
  ) => {
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ata de Reunião Kalter - ${dataAta}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #2A6377; padding-bottom: 20px; margin-bottom: 30px; }
            .header img { display: block; margin: 0 auto 12px auto; width: 260px; max-width: 100%; height: auto; border-radius: 6px; }
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
             <img src="https://gestaoobraskalter.vercel.app/logo2.png" alt="KALTER - Refrigeração Industrial" />
             <div class="data">Gestão de Obras • Ata de Reunião • ${dataAta}</div>
             ${
               linkApp
                 ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px auto 0 auto; width:auto;"><tr><td style="border:0; padding:0; border-radius:8px; background:#2A6377;"><a href="${linkApp}" target="_blank" style="display:inline-block; padding:10px 20px; font-family:'Segoe UI',Arial,sans-serif; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">Ver ata no app</a></td></tr></table>`
                 : ""
             }
          </div>
    `;

    agruparObrasPorGestor(listaObrasParaAta).forEach(({ nomeGestor, obras }) => {
      html += `<div class="gestor-title">GESTOR: ${escHtml(nomeGestor.toUpperCase())}</div>`;
      obras.forEach((obra: any) => {
        html += `
          <div class="obra-section">
            <div class="obra-title">OBRA: ${escHtml(obra.nome_obra.toUpperCase())}</div>
            <div class="info-box">
              <p><strong>Resumo da Reunião:</strong><br/>${obra.resumo ? escHtml(obra.resumo).replace(/\n/g, "<br/>") : "Nenhum resumo registrado."}</p>
            </div>
        `;

        if (obra.ocorrencias && obra.ocorrencias.length > 0) {
          html += `
            <h4>Ocorrências Registradas</h4>
            <table>
              <tr><th width="20%">Tipo</th><th>Descrição</th></tr>
              ${obra.ocorrencias.map((o: any) => `<tr><td><strong>${labelOcorrencia(o.tipo).toUpperCase()}</strong></td><td style="white-space:pre-wrap">${escHtml(o.descricao)}</td></tr>`).join("")}
            </table>
          `;
        }

        if (obra.tarefas && obra.tarefas.length > 0) {
          html += `
            <h4>Tarefas e Prazos Definidos</h4>
            <table>
              <tr><th width="45%">Tarefa</th><th width="30%">Responsável</th><th width="25%">Prazo</th></tr>
              ${obra.tarefas.map((t: any) => `<tr><td>${escHtml(t.titulo)}</td><td>${escHtml(t.nome_responsavel || t.usuarios?.nome || "Geral")}</td><td>${formatarDataSegura(t.data_vencimento)}</td></tr>`).join("")}
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
      return onAviso(
        "Seu navegador bloqueou o PDF. Permita os pop-ups!",
        "erro",
      );

    const html = montarHtmlAta(listaObrasParaPDF, dataAta, resumoGravacao);

    janela.document.write(html);
    janela.document.close();
    // a impressao e chamada daqui (e nao por <script> dentro da janela): a politica de seguranca (CSP,
    // vercel.json) bloqueia script inline, e a janela em branco herda essa politica
    const imprimir = () => setTimeout(() => janela.print(), 300);
    if (janela.document.readyState === "complete") imprimir();
    else janela.addEventListener("load", imprimir, { once: true });
  };

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
      // erro numa das consultas: nao mostra o contexto como se estivesse tudo em dia
      const falha = tarefasResp.error || parcelasResp.error || cronogramaResp.error;
      if (falha) throw falha;

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
      falhaAoCarregar("os dados da obra para a reunião", error);
      setContextoObraAta(null);
    } finally {
      setCarregandoContextoAta(false);
    }
  };

  const iniciarOuRetomarSessaoAta = async () => {
    try {
      const { data: sessaoAberta, error: errSessao } = await supabase
        .from("reunioes_sessoes")
        .select("id, data_reuniao")
        .eq("status", "em_andamento")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errSessao) throw errSessao;

      if (!sessaoAberta) return;
      if (String(sessaoAberta.data_reuniao).slice(0, 10) === new Date().toLocaleDateString("sv-SE"))
        setAbaReunioes("nova");

      const { data: reunioesDaSessao, error: errReunioes } = await supabase
        .from("reunioes")
        .select(
          `id, id_obra, data_reuniao, resumo_geral, obras(codigo_externo, nome, id_responsavel, usuarios(nome)), ocorrencias(id, tipo, descricao), tarefas(id, titulo, descricao, data_vencimento, id_responsavel, prioridade, usuarios(nome))`,
        )
        .eq("id_sessao", sessaoAberta.id);
      if (errReunioes) throw errReunioes;

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
      onAviso(
        `Retomando ata em andamento (${obrasRecuperadas.length} obra(s) já registrada(s)).`,
      );
    } catch (error) {
      falhaAoCarregar("a reunião", error);
    }
  };

  const adicionarOcorrencia = () => {
    if (!String(novaOcorrencia.descricao || "").trim()) return; // o banco recusa descricao em branco
    setListaOcorrencias([...listaOcorrencias, novaOcorrencia]);
    setNovaOcorrencia({ tipo: "avanco", descricao: "" });
  };

  const adicionarTarefa = () => {
    if (!String(novaTarefa.titulo || "").trim() || !novaTarefa.id_responsavel)
      return onAviso("Preencha título e responsável.", "erro");
    const nomeResp =
      listaUsuarios.find((u) => u.id === novaTarefa.id_responsavel)?.nome || "";
    setListaTarefas([
      ...listaTarefas,
      { ...novaTarefa, nome_responsavel: nomeResp },
    ]);
    setNovaTarefa(TAREFA_VAZIA);
  };

  // texto digitado nos campos de nova ocorrencia / nova tarefa sem clicar em "Adicionar"
  const ocorrenciaPendente = () => !!String(novaOcorrencia.descricao || "").trim();
  const tarefaPendente = () =>
    !!(String(novaTarefa.titulo || "").trim() || String(novaTarefa.descricao || "").trim());
  const formularioTemConteudo = () =>
    !!String(reuniaoForm.resumo_geral || "").trim() ||
    listaOcorrencias.length > 0 ||
    listaTarefas.length > 0 ||
    ocorrenciaPendente() ||
    tarefaPendente();

  const limparFormularioObra = () => {
    setReuniaoForm((prev: any) => ({
      ...prev,
      id_obra: "",
      resumo_geral: "",
    }));
    setListaOcorrencias([]);
    setListaTarefas([]);
    setNovaOcorrencia({ tipo: "avanco", descricao: "" });
    setNovaTarefa(TAREFA_VAZIA);
    setAtaEmEdicao(null);
    setContextoObraAta(null);
  };

  // Antes de salvar: o que ficou digitado e nao foi adicionado nao some calado (A9).
  // Devolve as listas a gravar, ou null para voltar ao formulario.
  const resolverItensPendentes = async (): Promise<{ ocorrencias: any[]; tarefas: any[] } | null> => {
    const temOc = ocorrenciaPendente();
    const temTar = tarefaPendente();
    if (!temOc && !temTar)
      return { ocorrencias: listaOcorrencias, tarefas: listaTarefas };
    const oque =
      temOc && temTar
        ? "uma ocorrência e uma tarefa digitadas que ainda não foram adicionadas"
        : temOc
          ? "uma ocorrência digitada que ainda não foi adicionada"
          : "uma tarefa digitada que ainda não foi adicionada";
    const faltaTitulo = temTar && !String(novaTarefa.titulo || "").trim();
    const faltaResponsavel = temTar && !novaTarefa.id_responsavel;
    const tarefaIncompleta = faltaTitulo || faltaResponsavel;
    const adicionar = await confirmar({
      titulo: `Há ${oque}`,
      texto: tarefaIncompleta
        ? `Para adicionar a tarefa falta ${faltaTitulo && faltaResponsavel ? "o título e o responsável" : faltaTitulo ? "o título" : "o responsável"}.`
        : "Você pode adicionar e salvar tudo junto.",
      rotuloConfirmar: tarefaIncompleta ? "Completar a tarefa" : "Adicionar e salvar",
      rotuloCancelar: "Não adicionar",
    });
    if (adicionar) {
      if (tarefaIncompleta) {
        (faltaTitulo ? refTituloTarefa : refResponsavelTarefa).current?.focus();
        return null;
      }
      const ocorrencias = temOc ? [...listaOcorrencias, novaOcorrencia] : listaOcorrencias;
      const tarefas = temTar
        ? [
            ...listaTarefas,
            {
              ...novaTarefa,
              nome_responsavel: listaUsuarios.find((u) => u.id === novaTarefa.id_responsavel)?.nome || "",
            },
          ]
        : listaTarefas;
      // ja entra na lista da tela: se a gravacao falhar, o item continua visivel
      setListaOcorrencias(ocorrencias);
      setListaTarefas(tarefas);
      if (temOc) setNovaOcorrencia({ tipo: "avanco", descricao: "" });
      if (temTar) setNovaTarefa(TAREFA_VAZIA);
      return { ocorrencias, tarefas };
    }
    // descartar exige clique explicito (Esc / fechar no dialogo = voltar)
    const descartar = await confirmar({
      titulo: "Salvar sem o que não foi adicionado?",
      texto: "O texto digitado e não adicionado será descartado.",
      rotuloConfirmar: "Salvar sem adicionar",
      rotuloCancelar: "Voltar",
      perigo: true,
    });
    if (!descartar) {
      (temOc ? refDescricaoOcorrencia : refTituloTarefa).current?.focus();
      return null;
    }
    return { ocorrencias: listaOcorrencias, tarefas: listaTarefas };
  };

  async function salvarReuniaoObra() {
    if (!reuniaoForm.id_obra)
      return onAviso("Selecione uma obra.", "erro");
    const itens = await resolverItensPendentes();
    if (!itens) return;
    const emEdicao = ataEmEdicao;
    setCarregando(true);
    try {
      const obraSelecionada = obrasLista.find(
        (o) => o.id === reuniaoForm.id_obra,
      );

      // uma transacao no banco (salvar_ata): sessao (se for a 1a obra), reuniao, ocorrencias e tarefas
      // gravam juntas ou nada grava. Editando, a reuniao e atualizada no lugar; tarefa tirada da ata
      // continua ativa no quadro (so desligada da ata) e as ja criadas nao sao duplicadas.
      const { data: salva, error: errSalvar } = await supabase.rpc("salvar_ata", {
        p_ata: {
          id_reuniao: emEdicao?.idReuniao || null,
          versao: emEdicao?.versao || null,
          id_sessao: idSessaoAtaAtual,
          id_obra: reuniaoForm.id_obra,
          data_reuniao: reuniaoForm.data_reuniao,
          resumo_geral: reuniaoForm.resumo_geral,
          ocorrencias: itens.ocorrencias.map((o) => ({
            id: o.id || null,
            tipo: o.tipo,
            descricao: o.descricao,
          })),
          tarefas: itens.tarefas.map((t) => ({
            id: t.id || null,
            titulo: t.titulo,
            descricao: t.descricao || null,
            data_vencimento: t.data_vencimento || null,
            id_responsavel: t.id_responsavel || null,
            prioridade: t.prioridade || "normal",
          })),
        },
      });
      if (errSalvar) {
        // a obra sumiu da ata (reaberta pelo app antigo em outra tela): sai do modo edicao; o texto fica
        // na tela e o proximo "Salvar" grava como obra nova
        if (emEdicao && errSalvar.code === "P0002") {
          setAtaEmEdicao(null);
          setObrasNaAtaAtual((prev: any) =>
            prev.filter((ob: any) => ob.id_reuniao !== emEdicao.idReuniao),
          );
          onAviso(`${errSalvar.message} Clique em salvar de novo para gravar o que está na tela.`, "erro");
          return;
        }
        throw errSalvar;
      }
      if (!salva?.id_reuniao) throw new Error("A gravação não retornou a reunião.");
      setIdSessaoAtaAtual(salva.id_sessao);

      const nomeObra = obraSelecionada
        ? `${obraSelecionada.codigo_externo} - ${obraSelecionada.nome}`
        : "Obra Não Identificada";
      const idsNovas: string[] = salva.tarefas_novas || [];
      (salva.tarefas || [])
        .filter((t: any) => idsNovas.includes(t.id))
        .forEach((tarefaCriada: any) => {
          enviarEmailAtribuicaoTarefa(tarefaCriada.id, {
            titulo: tarefaCriada.titulo,
            descricao: tarefaCriada.descricao,
            data_vencimento: tarefaCriada.data_vencimento,
            id_responsavel: tarefaCriada.id_responsavel,
            nome_obra: obraSelecionada ? nomeObra : undefined,
          });
        });

      // o registro vem do banco (com ids): reabrir de novo reaproveita ocorrencias e tarefas
      const registroObraAta = {
        id_reuniao: salva.id_reuniao,
        id_obra: obraSelecionada?.id || salva.id_obra,
        id_gestor: obraSelecionada?.id_responsavel || null,
        nome_gestor: obraSelecionada?.usuarios?.nome || "Sem gestor definido",
        data_reuniao: salva.data_reuniao,
        nome_obra: nomeObra,
        resumo: salva.resumo_geral,
        ocorrencias: salva.ocorrencias || [],
        tarefas: salva.tarefas || [],
      };
      setObrasNaAtaAtual((prev: any[]) =>
        prev.some((ob: any) => ob.id_reuniao === registroObraAta.id_reuniao)
          ? prev.map((ob: any) =>
              ob.id_reuniao === registroObraAta.id_reuniao ? registroObraAta : ob,
            )
          : [...prev, registroObraAta],
      );

      const naoReligadas = Number(salva.tarefas_nao_religadas || 0);
      if (naoReligadas > 0)
        onAviso(
          `${obraSelecionada?.nome || "Obra"} salva, mas ${naoReligadas} tarefa(s) já criada(s) não voltaram para a ata (elas continuam no quadro de tarefas).`,
          "erro",
        );
      else
        onAviso(
          emEdicao
            ? `${obraSelecionada?.nome || "Obra"}: alterações salvas!`
            : `${obraSelecionada?.nome || "Obra"} salva! Vá para a próxima.`,
        );
      limparFormularioObra();
      setTelaAtiva("reunioes");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      // nada foi gravado (transacao unica): o que esta na tela continua para tentar de novo
      onAviso("Não foi possível salvar: " + (error?.message || "erro desconhecido"), "erro");
    } finally {
      setCarregando(false);
    }
  }

  // Reabrir so carrega a ata gravada no formulario: nada e apagado no banco. A versao gravada continua
  // valendo ate salvar (recarregar a pagina ou cancelar nao perde nada).
  const editarRegistroAta = async (registro: any) => {
    if (ataEmEdicao?.idReuniao === registro.id_reuniao) return;
    if (formularioTemConteudo()) {
      const emAndamento = ataEmEdicao
        ? ataEmEdicao.nomeObra
        : (() => {
            const o = obrasLista.find((ob) => ob.id === reuniaoForm.id_obra);
            return o ? `${o.codigo_externo} - ${o.nome}` : "";
          })();
      if (
        !(await confirmar({
          titulo: `Abrir ${registro.nome_obra} para edição?`,
          texto: `O que está digitado agora${emAndamento ? ` (${emAndamento})` : ""} ainda não foi salvo e será descartado.`,
          rotuloConfirmar: "Descartar e abrir",
          rotuloCancelar: "Voltar",
          perigo: true,
        }))
      )
        return;
    }
    setCarregando(true);
    try {
      const { data: ata, error } = await supabase.rpc("ata_para_edicao", {
        p_id_reuniao: registro.id_reuniao,
      });
      if (error) throw error;

      setGestorSelecionadoAta(registro.id_gestor || "");
      setReuniaoForm({
        id_obra: ata.id_obra,
        data_reuniao: ata.data_reuniao || new Date().toISOString().split("T")[0],
        resumo_geral: ata.resumo_geral || "",
      });
      setListaOcorrencias(ata.ocorrencias || []);
      setListaTarefas(ata.tarefas || []);
      setNovaOcorrencia({ tipo: "avanco", descricao: "" });
      setNovaTarefa(TAREFA_VAZIA);
      setAtaEmEdicao({
        idReuniao: ata.id_reuniao,
        versao: ata.versao,
        nomeObra: registro.nome_obra,
      });
      onAviso(
        "Obra aberta para edição. A versão gravada continua valendo até você salvar.",
      );
    } catch (error: any) {
      onAviso("Não foi possível abrir a obra para edição: " + error.message, "erro");
    } finally {
      setCarregando(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cancelarEdicaoAta = async () => {
    if (
      !(await confirmar({
        titulo: "Cancelar a edição?",
        texto: "As alterações feitas na tela são descartadas. A versão gravada continua como estava.",
        rotuloConfirmar: "Descartar alterações",
        rotuloCancelar: "Continuar editando",
        perigo: true,
      }))
    )
      return;
    limparFormularioObra();
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

  // logistica nao recebe a ata (pedido do Carlos em 26/10/2026)
  const destinatariosAta = () => {
    const emails = listaUsuarios
      .filter((u) =>
        ["admin", "coordenador", "engenheiro", "gestor"].includes(u.perfil || ""),
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
      // dataAta vem como DD/MM/AAAA; o endereco da reuniao usa AAAA-MM-DD
      const [dia, mes, ano] = dataAta.split("/");
      const html = montarHtmlAta(
        listaObras,
        dataAta,
        resumoGravacao === undefined ? gravacaoAta?.resumo : resumoGravacao,
        ano && mes && dia ? `${window.location.origin}/reunioes/${ano}-${mes}-${dia}` : window.location.origin,
      );
      // Vai para a fila; o robo envia pelo Gmail do Gestao de Obras na proxima rodada.
      const { error } = await supabase.rpc("enfileirar_email", {
        p_para: destinatarios,
        p_assunto: `Ata de Reunião de Obras - ${dataAta}`,
        p_html: html,
        p_origem: "ata",
      });
      if (error) throw error;
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
      return onAviso("Você não salvou obras.", "erro");
    // a ata sai com o que esta gravado: avisa se ha edicao ou obra digitada e nao salva
    if (ataEmEdicao || formularioTemConteudo()) {
      if (
        !(await confirmar({
          titulo: "Há uma obra na tela que não foi salva",
          texto: ataEmEdicao
            ? `As alterações em ${ataEmEdicao.nomeObra} não foram salvas: a ata sai com a versão gravada antes.`
            : "O que está digitado no formulário não entra na ata.",
          rotuloConfirmar: "Fechar a ata assim mesmo",
          rotuloCancelar: "Voltar",
          perigo: true,
        }))
      )
        return;
      limparFormularioObra();
    }
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
      const { error: errFechar } = await supabase
        .from("reunioes_sessoes")
        .update({ status: "fechada", fechada_at: new Date().toISOString() })
        .eq("id", idSessaoAtaAtual);
      if (errFechar)
        onAviso(`A ata foi gerada, mas a sessão da reunião não foi fechada no banco: ${errFechar.message}`, "erro");
    }

    setEnviandoEmailAta(true);
    const resultado = await enviarAtaPorEmailResend(obrasNaAtaAtual, dataHj);
    setEnviandoEmailAta(false);
    setStatusEnvioEmailAta(resultado);
    if (resultado.ok) {
      onAviso("Ata enviada por e-mail automaticamente!");
    } else {
      onAviso(
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
    onAviso(
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

  useEffect(() => {
    if (
      ativa &&
      usuarioAtual &&
      !idSessaoAtaAtual &&
      obrasNaAtaAtual.length === 0
    )
      iniciarOuRetomarSessaoAta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, usuarioAtual]);

  useEffect(() => {
    if (!ativa || !reuniaoForm.data_reuniao) return;
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
  }, [ativa, reuniaoForm.data_reuniao]);

  // obra pre-selecionada no formulario (antes feito no buscarObras do App)
  useEffect(() => {
    if (obrasLista.length > 0 && !reuniaoForm.id_obra)
      setReuniaoForm((prev: any) => ({ ...prev, id_obra: obrasLista[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obrasLista]);

  // contexto da obra escolhida (tarefas, parcelas, cronograma) para a conversa
  useEffect(() => {
    if (ativa && reuniaoForm.id_obra) buscarContextoObraAta(reuniaoForm.id_obra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniaoForm.id_obra, ativa]);

  return (
    <>
      {ativa && (
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
              selecao={dataReuniaoSelecionada}
              onSelecionar={setDataReuniaoSelecionada}
              onBaixarPdf={gerarVisualPDF}
              onReenviarEmail={enviarAtaPorEmailResend}
              onAviso={onAviso}
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
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] font-bold bg-gray-50 max-w-full"
                    value={gestorSelecionadoAta}
                    disabled={!!ataEmEdicao}
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
                    className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] font-bold bg-gray-50 max-w-full"
                    value={reuniaoForm.id_obra}
                    disabled={!!ataEmEdicao}
                    onChange={(e) =>
                      setReuniaoForm({
                        ...reuniaoForm,
                        id_obra: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      {gestorSelecionadoAta
                        ? "Selecione…"
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
                  {!ataEmEdicao && obrasNaAtaAtual.some(
                    (ob: any) => ob.id_obra === reuniaoForm.id_obra,
                  ) && (
                    <p className="text-amber-600 text-xs mt-1 font-bold w-full">
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
                    (!ataEmEdicao &&
                      obrasNaAtaAtual.some(
                        (ob: any) => ob.id_obra === reuniaoForm.id_obra,
                      ))
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
                  {ataEmEdicao ? "Salvar Alterações" : "Salvar Obra na Ata"}
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
            {ataEmEdicao && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm">
                <span>
                  Editando <strong>{ataEmEdicao.nomeObra}</strong>. A versão gravada continua valendo até você salvar.
                </span>
                <button
                  onClick={cancelarEdicaoAta}
                  disabled={carregando}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 disabled:opacity-50"
                >
                  Cancelar edição
                </button>
              </div>
            )}
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
                      onClick={() => editarRegistroAta(ob)}
                      disabled={carregando || ataEmEdicao?.idReuniao === ob.id_reuniao}
                      className="ml-2 hover:bg-green-200 hover:text-green-900 bg-green-100 rounded-full p-1 transition-colors disabled:opacity-50"
                      title={ataEmEdicao?.idReuniao === ob.id_reuniao ? "Em edição" : "Reabrir para Edição"}
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
                    <span className="text-xs font-normal text-slate-500">
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
                      className="border rounded-lg p-1.5 text-sm outline-none focus:border-[#2A6377]"
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
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Loader2 className="animate-spin" size={14} />{" "}
                        Carregando contexto da obra…
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
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"
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
                        className="border rounded-lg p-2 flex-1 outline-none focus:border-[#2A6377] text-sm"
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
                      ref={refDescricaoOcorrencia}
                      className="border rounded-lg p-3 w-full flex-1 min-h-[110px] outline-none focus:border-[#2A6377] text-sm resize-none"
                      placeholder="Descreva a ocorrência… (Ctrl+Enter para adicionar)"
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
                      ref={refTituloTarefa}
                      type="text"
                      className="border rounded-lg p-2 w-full outline-none focus:border-[#2A6377] text-sm"
                      placeholder="O que precisa ser feito…"
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
                      className="border rounded-lg p-2 w-full outline-none focus:border-[#2A6377] text-sm"
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
                    className="border rounded-lg p-2 w-full outline-none focus:border-[#2A6377] text-sm mb-2"
                    placeholder="Descrição / contexto da tarefa…"
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
                      ref={refResponsavelTarefa}
                      className="border rounded-lg p-2 flex-1 min-w-[140px] outline-none focus:border-[#2A6377] text-sm"
                      value={novaTarefa.id_responsavel}
                      onChange={(e) =>
                        setNovaTarefa({
                          ...novaTarefa,
                          id_responsavel: e.target.value,
                        })
                      }
                    >
                      <option value="">Atribuir a…</option>
                      {listaUsuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border rounded-lg p-2 flex-1 min-w-[140px] outline-none focus:border-[#2A6377] text-sm"
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
                          {tar.id && (
                            <span
                              className="bg-[#2A6377]/10 text-[#2A6377] rounded px-1.5 text-[11px] font-semibold"
                              title="Tarefa já criada: ao salvar ela volta a ficar ligada a esta ata (não é duplicada)"
                            >
                              Já criada
                            </span>
                          )}
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
                        className="text-red-600 hover:text-red-700 bg-white p-2 rounded shadow-sm border self-end sm:self-auto shrink-0 ml-auto sm:ml-0"
                        aria-label={tar.id ? "Tirar da ata (a tarefa continua no quadro)" : "Remover tarefa"}
                        title={tar.id ? "Tirar da ata (a tarefa continua no quadro)" : "Remover tarefa"}
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
                      onAviso={onAviso}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 flex flex-col items-center justify-center gap-2 py-16 text-center xl:flex-1">
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
      {modalAtaAberto && (
        <Modal
          titulo={
            <span className="flex items-center gap-2">
              <Mail className="text-[#2A6377]" aria-hidden="true" /> Enviar Ata de Reunião
            </span>
          }
          rotulo="Enviar Ata de Reunião"
          onFechar={fecharModalAta}
          largura="2xl"
          rodape={
            <>
              <button
                onClick={fecharModalAta}
                className="px-6 py-2 rounded-lg font-medium bg-slate-100 hover:bg-slate-200"
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
                className="bg-white border border-[#2A6377] text-[#2A6377] hover:bg-[#2A6377] hover:text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
              >
                <FileText size={18} /> Baixar PDF
              </button>
            </>
          }
        >
          {enviandoEmailAta ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Enviando e-mail automaticamente…
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
          <pre className="text-sm font-mono whitespace-pre-wrap bg-slate-50 border rounded-lg p-3">{ataGerada}</pre>
        </Modal>
      )}
    </>
  );
}
