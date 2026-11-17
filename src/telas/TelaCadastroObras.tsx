import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { fasesProjeto } from "../constants";
import type { Obra, Usuario } from "../types";
import { formatarDataSegura, formatarMoeda, labelFase, labelStatusObra, classeStatusObra } from "../utils";
import { Save, AlertTriangle, Edit2, X, FolderOpen, Loader2, CheckCircle2, Clock, Search, List } from "lucide-react";
import { mensagemErro } from "../erros";
import { anexarValoresVenda, buscarValoresVenda, totalVendaObra, TITULO_SEM_ACESSO_VALOR } from "../valoresObra";
import { useDialogos } from "../Dialogos";
import {
  anexarValoresProjetos,
  COLUNAS_PROJETO_ERP,
  localDoCliente,
  normalizarCodigoErp,
  planejarPreenchimento,
  resumoGravacaoErp,
  totalProjetoErp,
  type CampoPreenchivel,
  type LinhaResumoErp,
  type LinhaValoresProjetoErp,
  type ProjetoErp,
} from "../calculoObraErp";

// Cadastros -> Obras: lista (filtro por situacao), cadastro de obra nova (com
// cronograma e documentos padrao) e edicao. "Editar cadastro" de dentro da obra
// chega por obraParaEditar.
interface Props {
  usuarioAtual: Usuario | null;
  listaUsuarios: Usuario[];
  isAdmin: boolean;
  idResponsavelEscopo: string | null | undefined;
  noEscopoDoUsuario: (query: any) => any;
  podeEditarObra: (obra: any) => boolean;
  abrirPainelObra: (obra: any) => void;
  obraParaEditar: any;
  onEdicaoIniciada: () => void;
  onObrasAlteradas: () => void;
  falhaAoCarregar: (oque: string, error: unknown) => void;
  onAviso: (mensagem: string, tipo?: string) => void;
}

// Campos de obras que este formulario edita (status nao: finalizar/cancelar/reabrir tem tela propria).
// valor_produto/valor_servico sao LIDOS de obras_valores_venda (restrita) e continuam GRAVADOS em obras
// (o gatilho espelha na tabela restrita).
const CAMPOS_FORMULARIO =
  "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, exportacao";

const dadosDoFormulario = (o: any, idResponsavel: any) => ({
  codigo_externo: o.codigo_externo,
  nome: o.nome,
  descricao: o.descricao || null,
  fase_atual: o.fase_atual || "processo_inicial",
  observacoes: o.observacoes || null,
  data_inicio: o.data_inicio,
  data_previsao_fim: o.data_previsao_fim,
  id_responsavel: idResponsavel,
  valor_produto: o.valor_produto || 0,
  valor_servico: o.valor_servico || 0,
});

type ValoresErp = { contribuicao: string; rentabilidade: string; venda: string };
const VALORES_ERP_VAZIOS: ValoresErp = { contribuicao: "", rentabilidade: "", venda: "" };

// ---- campos do formulario (mesmo visual em toda a tela)
const classeCampo =
  "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#2A6377] focus:ring-2 focus:ring-[#2A6377]/15 disabled:bg-slate-50";

// atributos de acessibilidade + texto de erro de um campo obrigatorio (erro so aparece enquanto o campo segue vazio)
function propsErroCampo(erros: Record<string, string>, id: string, vazio: boolean) {
  const msg = vazio ? erros[id] : undefined;
  return {
    msg,
    attrs: {
      "aria-required": true as const,
      "aria-invalid": msg ? (true as const) : undefined,
      "aria-describedby": msg ? `${id}-erro` : undefined,
    },
    classe: msg ? " !border-red-500 focus:!border-red-500 focus:!ring-red-500/20" : "",
  };
}

function TextoErroCampo({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={`${id}-erro`} className="mt-1 text-xs text-red-600">
      {msg}
    </p>
  ) : null;
}

function Rotulo({ htmlFor, texto, obrigatorio, dica }: { htmlFor?: string; texto: string; obrigatorio?: boolean; dica?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-600">
        {texto}
        {obrigatorio && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {dica && <span className="text-xs text-slate-500 truncate">{dica}</span>}
    </label>
  );
}

function Secao({ titulo, descricao, children, destaque }: { titulo: string; descricao?: string; children: any; destaque?: boolean }) {
  return (
    <section className={`rounded-xl border p-4 md:p-5 ${destaque ? "border-[#2A6377]/25 bg-[#2A6377]/[0.03]" : "border-slate-200 bg-white"}`}>
      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-800">{titulo}</h4>
        {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

// valor em reais: guarda "1234.5" (ponto decimal, como o banco); mostra "1.234,50" fora do foco.
// Aceita digitar 1234,5 | 1.234,50 | 1234.50
const formatarReais = (v: string) =>
  v === "" || isNaN(Number(v)) ? "" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function lerReais(texto: string): string {
  let t = texto.replace(/[^\d.,-]/g, "");
  if (!t) return "";
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return isNaN(n) ? "" : String(Math.round(n * 100) / 100);
}

function CampoMoeda({ id, valor, onChange, placeholder = "0,00" }: { id: string; valor: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focado, setFocado] = useState(false);
  const [texto, setTexto] = useState("");
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">R$</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={focado ? texto : formatarReais(valor)}
        onFocus={() => {
          setTexto(valor === "" ? "" : formatarReais(valor));
          setFocado(true);
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(lerReais(e.target.value));
        }}
        onBlur={() => setFocado(false)}
        className={`${classeCampo} pl-9 text-right tabular-nums`}
      />
    </div>
  );
}

export default function TelaCadastroObras({
  usuarioAtual,
  listaUsuarios,
  isAdmin,
  idResponsavelEscopo,
  noEscopoDoUsuario,
  podeEditarObra,
  abrirPainelObra,
  obraParaEditar,
  onEdicaoIniciada,
  onObrasAlteradas,
  falhaAoCarregar,
  onAviso,
}: Props) {
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
  // como a obra estava no banco ao abrir a edicao: o update manda so o que mudou em relacao a isto
  const [obraOriginal, setObraOriginal] = useState<any>(null);
  const [erroObra, setErroObra] = useState<string>("");
  // erro junto do campo obrigatorio vazio (id do campo -> texto); some quando a pessoa preenche
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const [obrasCadastroLista, setObrasCadastroLista] = useState<Obra[]>([]);
  const [filtroStatusCadastroObras, setFiltroStatusCadastroObras] = useState<
    "em_andamento" | "finalizada" | "cancelada" | "todas"
  >("em_andamento");
  const [carregando, setCarregando] = useState(false);
  // margem de contribuicao / rentabilidade / faturamento sem impostos: so admin; o robo grava no ERP
  // (CADPROJ.cpj_valor_proprio / cpj_valor_terceiro, PEDVEN.pv_meta_venda)
  const [valoresErp, setValoresErp] = useState(VALORES_ERP_VAZIOS);
  const [valoresErpOriginais, setValoresErpOriginais] = useState(VALORES_ERP_VAZIOS);
  const [ultimoPedidoErp, setUltimoPedidoErp] = useState<any>(null);
  const { confirmar } = useDialogos();

  // C4: projetos do ERP ainda sem obra no app (tabela projetos_erp, gravada pelo robo). Enquanto o robo novo nao roda
  // a tabela fica vazia (ou nem existe): a tela so nao mostra nada e o cadastro segue manual.
  const podeCadastrar = isAdmin || usuarioAtual?.perfil === "engenheiro" || usuarioAtual?.perfil === "assistente";
  const [projetosErp, setProjetosErp] = useState<ProjetoErp[]>([]);
  const [buscaErp, setBuscaErp] = useState<{ codigo: string; estado: "buscando" | "achou" | "nao_achou"; projeto?: ProjetoErp } | null>(null);
  const [verListaErp, setVerListaErp] = useState(false);
  const [filtroListaErp, setFiltroListaErp] = useState("");
  const codigoBuscadoRef = useRef("");

  // valores de venda dos projetos ficam em projetos_erp_valores (17/11: so admin/coordenador recebem linhas); quem nao
  // recebe fica com os valores null e pre-preenche so os outros campos. Erro = sem valores, sem atrapalhar o cadastro
  const comValoresDosProjetos = async (projetos: Omit<ProjetoErp, "valor_produto" | "valor_servico">[]): Promise<ProjetoErp[]> => {
    if (projetos.length === 0) return [];
    const { data, error } = await (supabase as any)
      .from("projetos_erp_valores")
      .select("codigo, valor_produto, valor_servico")
      .in("codigo", projetos.map((p) => p.codigo));
    return anexarValoresProjetos(projetos, error ? [] : ((data as LinhaValoresProjetoErp[]) || []));
  };

  const carregarProjetosErp = async () => {
    if (!podeCadastrar) return;
    // cast: tabela nova ainda fora do database.types.ts gerado
    const { data, error } = await (supabase as any)
      .from("projetos_erp")
      .select(COLUNAS_PROJETO_ERP)
      .order("data_aprovacao", { ascending: false, nullsFirst: false })
      .limit(300);
    // erro (ex.: tabela ainda nao criada) = sem lista; nao atrapalha o cadastro manual
    setProjetosErp(error ? [] : await comValoresDosProjetos(data || []));
  };

  const buscarProjetoErp = async (texto: string) => {
    const codigo = normalizarCodigoErp(texto);
    codigoBuscadoRef.current = codigo;
    if (!codigo || novaObra.id || !podeCadastrar) {
      setBuscaErp(null);
      return;
    }
    setBuscaErp({ codigo, estado: "buscando" });
    const { data, error } = await (supabase as any).from("projetos_erp").select(COLUNAS_PROJETO_ERP).eq("codigo", codigo).maybeSingle();
    if (codigoBuscadoRef.current !== codigo) return; // a pessoa ja trocou o codigo
    if (error) {
      setBuscaErp(null);
      return;
    }
    if (data) {
      const [projeto] = await comValoresDosProjetos([data]);
      if (codigoBuscadoRef.current !== codigo) return;
      setBuscaErp({ codigo, estado: "achou", projeto });
    }
    // lista vazia = robo ainda nao sincronizou nada: nao mostra "nao encontrei"
    else setBuscaErp(projetosErp.length > 0 ? { codigo, estado: "nao_achou" } : null);
  };

  const escolherProjetoErp = (p: ProjetoErp) => {
    codigoBuscadoRef.current = p.codigo;
    setNovaObra((o: any) => ({ ...o, codigo_externo: p.codigo }));
    setBuscaErp({ codigo: p.codigo, estado: "achou", projeto: p });
    setVerListaErp(false);
    setFiltroListaErp("");
  };

  const mostrarCampoObra = (campo: CampoPreenchivel, v: string) =>
    campo === "valor_produto" || campo === "valor_servico"
      ? formatarMoeda(Number(v || 0))
      : campo === "data_inicio" || campo === "data_previsao_fim"
        ? formatarDataSegura(v)
        : v;

  const preencherComErp = async (p: ProjetoErp) => {
    const { preencher, diferencas } = planejarPreenchimento(novaObra, p);
    let trocar: Record<string, string> = {};
    if (diferencas.length > 0) {
      const ok = await confirmar({
        titulo: "Trocar o que já foi digitado?",
        texto: (
          <div className="space-y-2">
            <p>Estes campos já têm valor diferente do ERP:</p>
            <ul className="space-y-1.5">
              {diferencas.map((d) => (
                <li key={d.campo} className="rounded-lg border border-slate-200 px-3 py-2">
                  <span className="block text-xs font-semibold text-slate-500">{d.rotulo}</span>
                  <span className="block break-words">Digitado: {mostrarCampoObra(d.campo, d.digitado)}</span>
                  <span className="block break-words text-[#2A6377] font-semibold">ERP: {mostrarCampoObra(d.campo, d.erp)}</span>
                </li>
              ))}
            </ul>
            <p>Os campos vazios são preenchidos de qualquer forma.</p>
          </div>
        ),
        rotuloConfirmar: "Usar os dados do ERP",
        rotuloCancelar: "Manter o que digitei",
      });
      if (ok) trocar = Object.fromEntries(diferencas.map((d) => [d.campo, d.erp]));
    }
    const mudou = Object.keys(preencher).length + Object.keys(trocar).length;
    if (mudou === 0) {
      onAviso(diferencas.length > 0 ? "Mantido o que foi digitado." : "Os campos já estão iguais aos do ERP.", "info");
      return;
    }
    setNovaObra((o: any) => ({ ...o, ...preencher, ...trocar }));
    onAviso("Campos preenchidos com os dados do ERP. Confira e escolha o responsável antes de cadastrar.", "info");
  };

  const carregarValoresErp = async (idObra: string | null) => {
    setUltimoPedidoErp(null);
    if (!isAdmin || !idObra) {
      setValoresErp(VALORES_ERP_VAZIOS);
      setValoresErpOriginais(VALORES_ERP_VAZIOS);
      return;
    }
    const [{ data: o }, { data: pedidos }] = await Promise.all([
      // valores confidenciais ficam em obras_valores_restritos (mesma regra de leitura da rentabilidade);
      // cast: tabela nova ainda fora do database.types.ts gerado
      (supabase as any)
        .from("obras_valores_restritos")
        .select("margem_contribuicao_erp, rentabilidade_erp, venda_sem_impostos_erp")
        .eq("id_obra", idObra)
        .maybeSingle() as Promise<{ data: { margem_contribuicao_erp: any; rentabilidade_erp: any; venda_sem_impostos_erp: any } | null }>,
      supabase
        .from("obras_valores_erp")
        .select("situacao, erro, created_at, gravado_em, nome_solicitante, margem_contribuicao, rentabilidade, venda_sem_impostos")
        .eq("id_obra", idObra)
        .neq("situacao", "substituido")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const txt = (v: any) => (v === null || v === undefined ? "" : String(v));
    const ultimo = pedidos?.[0] || null;
    const vindoDoErp = {
      contribuicao: txt(o?.margem_contribuicao_erp),
      rentabilidade: txt(o?.rentabilidade_erp),
      venda: txt(o?.venda_sem_impostos_erp),
    };
    setValoresErpOriginais(vindoDoErp);
    // pedido ainda nao gravado: mostra o que foi pedido
    setValoresErp(
      ultimo && ultimo.situacao !== "gravado"
        ? { contribuicao: txt(ultimo.margem_contribuicao), rentabilidade: txt(ultimo.rentabilidade), venda: txt(ultimo.venda_sem_impostos) }
        : vindoDoErp,
    );
    setUltimoPedidoErp(ultimo);
  };

  const nomeUsuarioPorId = (id: any) => listaUsuarios.find((u) => u.id === id)?.nome || "";

  const buscarObrasCadastro = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase
        .from("obras")
        .select(
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, status, data_finalizacao, observacao_finalizacao, data_cancelamento, motivo_cancelamento, observacao_cancelamento, exportacao, usuarios(nome)",
        )
        .order("created_at", { ascending: false });
      if (filtroStatusCadastroObras !== "todas")
        query = query.eq("status", filtroStatusCadastroObras);
      query = noEscopoDoUsuario(query);
      const { data, error } = await query;
      if (error) throw error;
      const lista = data || [];
      const valores = await buscarValoresVenda(lista.map((o: any) => o.id));
      setObrasCadastroLista(anexarValoresVenda(lista, valores));
    } catch (error) {
      falhaAoCarregar("o cadastro de obras", error);
    }
  };

  async function salvarObra(e: any) {
    e.preventDefault();
    setErroObra("");
    setErrosCampo({});

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
      const faltando: Record<string, string> = {};
      if (!novaObra.codigo_externo) faltando["obra-codigo"] = "Informe o código.";
      if (!novaObra.nome) faltando["obra-nome"] = "Informe o nome.";
      if (!novaObra.data_inicio) faltando["obra-inicio"] = "Informe a data de início.";
      if (!novaObra.data_previsao_fim) faltando["obra-fim"] = "Informe o prazo de entrega.";
      if (!responsavelObra) faltando["obra-responsavel"] = "Escolha o responsável.";
      setErrosCampo(faltando);
      setErroObra("Preencha os campos obrigatórios (*).");
      // foco no primeiro campo com erro (apos o React pintar o aria-invalid)
      const primeiro = Object.keys(faltando)[0];
      setTimeout(() => document.getElementById(primeiro)?.focus(), 0);
      return;
    }
    const valoresErpMudaram =
      isAdmin &&
      (["contribuicao", "rentabilidade", "venda"] as const).some(
        (k) => Number(valoresErp[k] || 0) !== Number(valoresErpOriginais[k] || 0) || (valoresErp[k] === "") !== (valoresErpOriginais[k] === ""),
      );
    if (valoresErpMudaram && (["contribuicao", "rentabilidade", "venda"] as const).some((k) => valoresErp[k] === "")) {
      setErroObra("Para gravar no ERP, informe a margem de contribuição, a rentabilidade e o faturamento sem impostos.");
      return;
    }
    // C9: o robo grava estes valores no ERP (cadastro de projetos e pedido de venda): mostra antes o que vai mudar.
    // Nao confirmou = nada e salvo (nem a obra), para a pessoa revisar os valores.
    if (valoresErpMudaram) {
      const ok = await confirmar({
        titulo: `Gravar no ERP os valores da obra ${novaObra.codigo_externo}?`,
        texto: <ResumoGravacaoErp linhas={resumoGravacaoErp(valoresErpOriginais, valoresErp)} />,
        rotuloConfirmar: novaObra.id ? "Salvar e enviar ao ERP" : "Cadastrar e enviar ao ERP",
        rotuloCancelar: "Voltar e revisar",
      });
      if (!ok) return;
    }
    setCarregando(true);
    try {
      const dadosObra = dadosDoFormulario(novaObra, responsavelObra);

      let idObraSalva: string | null = novaObra.id;
      if (novaObra.id) {
        // so os campos que a pessoa mudou: sem status (editar obra finalizada/cancelada nao pode reabri-la) e sem
        // regravar o que outra tela mudou depois que o formulario foi aberto (ex.: fase avancada no painel)
        const original = obraOriginal ? dadosDoFormulario(obraOriginal, obraOriginal.id_responsavel) : null;
        const mudancas = Object.fromEntries(
          Object.entries(dadosObra).filter(
            ([k, v]) => !original || String(v ?? "") !== String((original as any)[k] ?? ""),
          ),
        );
        // sem acesso aos valores de venda o formulario nao os conhece: nunca grava (nem zera) esses campos
        if (novaObra.valores_ocultos) {
          delete mudancas.valor_produto;
          delete mudancas.valor_servico;
        }
        if (Object.keys(mudancas).length > 0) {
          const { error } = await supabase
            .from("obras")
            .update(mudancas)
            .eq("id", novaObra.id);
          if (error) throw error;
          onAviso("Obra atualizada!");
        } else if (!valoresErpMudaram) {
          onAviso("Nenhuma alteração para salvar.", "info");
        }
      } else {
        const { data: obraCriada, error } = await supabase
          .from("obras")
          .insert([{ ...dadosObra, status: "em_andamento" }])
          .select("id") // so o id e usado; nao devolve os valores de venda
          .single();
        if (error) throw error;
        idObraSalva = obraCriada?.id || null;

        const faltou: string[] = [];
        if (obraCriada?.id) {
          const { error: erroCronograma } = await supabase.rpc(
            "criar_cronograma_padrao_obra",
            { p_id_obra: obraCriada.id },
          );
          if (erroCronograma) {
            console.warn("Cronograma padrão não criado:", erroCronograma);
            faltou.push("o cronograma padrão");
          }

          const { error: erroDocumentos } = await supabase.rpc(
            "criar_documentos_padrao_obra",
            { p_id_obra: obraCriada.id },
          );
          if (erroDocumentos) {
            console.warn("Documentos padrão não criados:", erroDocumentos);
            faltou.push("os documentos padrão");
          }
        }

        if (faltou.length > 0) {
          // a obra existe; so o que falhou precisa ser refeito - o aviso diz a verdade em vez de "salva com cronograma"
          onAviso(
            `Obra salva, mas ${faltou.join(" e ")} não ${faltou.length > 1 ? "foram criados" : "foi criado"}. ` +
              "Abra o painel da obra para conferir e, se faltar, avise o administrador do sistema.",
            "erro",
          );
        } else {
          onAviso("Obra salva com cronograma e documentos padrão!");
        }
      }

      if (valoresErpMudaram && idObraSalva) {
        const { data: idPedido, error: erroErp } = await supabase.rpc("obra_valores_erp_solicitar", {
          p_id_obra: idObraSalva,
          p_margem_contribuicao: Number(valoresErp.contribuicao),
          p_rentabilidade: Number(valoresErp.rentabilidade),
          p_venda_sem_impostos: Number(valoresErp.venda),
        });
        if (erroErp) {
          // a obra ja foi salva; so os valores do ERP ficaram de fora
          setErroObra("Obra salva, mas os valores do ERP não: " + mensagemErro(erroErp, "Tente salvar de novo."));
          await carregarValoresErp(idObraSalva);
          onObrasAlteradas();
          buscarObrasCadastro();
          return;
        }
        onAviso(
          idPedido
            ? "Margem, rentabilidade e faturamento enviados ao ERP: o robô grava em até 5 minutos."
            : "Margem, rentabilidade e faturamento já estão iguais no ERP.",
        );
      }

      setValoresErp(VALORES_ERP_VAZIOS);
      setValoresErpOriginais(VALORES_ERP_VAZIOS);
      setUltimoPedidoErp(null);
      setObraOriginal(null);
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
      setBuscaErp(null);
      onObrasAlteradas();
      buscarObrasCadastro();
      carregarProjetosErp(); // a obra nova sai da lista "ainda sem obra no app"
    } catch (error: any) {
      // codigo repetido chega como erro tecnico do banco (unique de codigo_externo): traduz
      const msg = String(error?.message || "");
      setErroObra(
        error?.code === "23505" || msg.includes("duplicate key value")
          ? `Já existe uma obra com o código ${novaObra.codigo_externo}. Confira o código ou edite a obra existente.`
          : mensagemErro(error, "Não foi possível salvar a obra."),
      );
    } finally {
      setCarregando(false);
    }
  }

  const editarObra = async (obraDaLista: any) => {
    // rele do banco: a copia da lista (ou a que veio do painel, as vezes sem descricao/observacoes) pode estar velha
    // valores de venda vem da tabela restrita; falha ou sem acesso = valores desconhecidos (ficam fora da gravacao)
    const [{ data: atual }, valores] = await Promise.all([
      supabase.from("obras").select(CAMPOS_FORMULARIO).eq("id", obraDaLista.id).maybeSingle(),
      buscarValoresVenda([obraDaLista.id]).catch(() => null),
    ]);
    const obraBase: any = atual || obraDaLista;
    const obra: any = valores ? anexarValoresVenda([obraBase], valores)[0] : obraBase;
    const valoresOcultos = obra.valor_produto == null && obra.valor_servico == null;
    const noFormulario = {
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
      exportacao: Boolean(obra.exportacao),
      valores_ocultos: valoresOcultos,
    };
    setNovaObra(noFormulario);
    // sem a releitura nao da para saber o que a pessoa mudou: entao manda todos os campos do formulario (sem status)
    setObraOriginal(atual ? noFormulario : null);
    setErroObra("");
    setBuscaErp(null);
    setVerListaErp(false);
    carregarValoresErp(obra.id);
    setTimeout(() => {
      document
        .getElementById("form-cadastro-obra")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Obra de exportacao: liga a aba Exportacao (Proforma, Invoice, Packing List) e o robo passa a ler o pedido no ERP
  const marcarExportacao = async (valor: boolean) => {
    if (!novaObra.id) return;
    const { error } = await supabase.rpc("exportacao_marcar_obra", { p_id_obra: novaObra.id, p_exportacao: valor });
    if (error) {
      setErroObra("Não foi possível alterar a marca de exportação: " + mensagemErro(error, "Tente de novo."));
      return;
    }
    setNovaObra((o: any) => ({ ...o, exportacao: valor }));
    onAviso(valor ? "Obra marcada como obra de exportação." : "Obra desmarcada como obra de exportação.");
    onObrasAlteradas();
    buscarObrasCadastro();
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
    setValoresErp(VALORES_ERP_VAZIOS);
    setValoresErpOriginais(VALORES_ERP_VAZIOS);
    setUltimoPedidoErp(null);
    setObraOriginal(null);
    setErroObra("");
    setErrosCampo({});
    setBuscaErp(null);
  };

  useEffect(() => {
    buscarObrasCadastro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioAtual?.id, filtroStatusCadastroObras]);

  useEffect(() => {
    carregarProjetosErp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioAtual?.id]);

  const filtroErp = filtroListaErp.trim().toLowerCase();
  const projetosErpFiltrados = filtroErp
    ? projetosErp.filter((p) => [p.codigo, p.nome, p.cliente_nome, p.cidade].some((t) => (t || "").toLowerCase().includes(filtroErp)))
    : projetosErp;
  const mostrarErp = !novaObra.id && podeCadastrar;

  // "Editar cadastro" aberto de dentro da obra: preenche o formulario com ela
  useEffect(() => {
    if (!obraParaEditar) return;
    editarObra(obraParaEditar);
    onEdicaoIniciada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraParaEditar]);

  const totalVenda = Number(novaObra.valor_produto || 0) + Number(novaObra.valor_servico || 0);

  const pe_obra_codigo = propsErroCampo(errosCampo, "obra-codigo", !novaObra.codigo_externo);
  const pe_obra_nome = propsErroCampo(errosCampo, "obra-nome", !novaObra.nome);
  const pe_obra_inicio = propsErroCampo(errosCampo, "obra-inicio", !novaObra.data_inicio);
  const pe_obra_fim = propsErroCampo(errosCampo, "obra-fim", !novaObra.data_previsao_fim);
  const pe_obra_responsavel = propsErroCampo(errosCampo, "obra-responsavel", !novaObra.id_responsavel);

  return (
    <div className="animate-in fade-in dash-main-wrapper">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800">Cadastros &rarr; Obras</h2>

      <form
        id="form-cadastro-obra"
        onSubmit={salvarObra}
        className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 md:mb-8 max-w-5xl overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-4 md:px-6 py-4 border-b bg-slate-50/70">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate">
              {novaObra.id ? `Editar obra ${novaObra.codigo_externo}` : "Nova obra"}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {novaObra.id ? novaObra.nome : "Cadastre a obra; o cronograma e os documentos padrão são criados juntos."}
            </p>
          </div>
          {novaObra.id && (
            <button
              type="button"
              onClick={cancelarEdicaoObra}
              className="shrink-0 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm px-2 py-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200"
            >
              <X size={16} /> Cancelar edição
            </button>
          )}
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {erroObra && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3" role="alert">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="text-sm">{erroObra}</span>
            </div>
          )}

          <p className="text-xs text-slate-500">
            <span className="text-red-500" aria-hidden="true">
              *
            </span>{" "}
            obrigatório
          </p>

          <Secao titulo="Dados da obra">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Rotulo htmlFor="obra-codigo" texto="Código" obrigatorio />
                <input
                  id="obra-codigo"
                  {...pe_obra_codigo.attrs}
                  value={novaObra.codigo_externo}
                  onChange={(e) => {
                    setNovaObra({ ...novaObra, codigo_externo: e.target.value });
                    // codigo mudou: o quadro do ERP era de outro codigo
                    if (buscaErp && buscaErp.codigo !== normalizarCodigoErp(e.target.value)) {
                      codigoBuscadoRef.current = "";
                      setBuscaErp(null);
                    }
                  }}
                  onBlur={(e) => {
                    if (mostrarErp && normalizarCodigoErp(e.target.value) !== buscaErp?.codigo) void buscarProjetoErp(e.target.value);
                  }}
                  placeholder="ex.: 2182"
                  autoComplete="off"
                  className={`${classeCampo} tabular-nums${pe_obra_codigo.classe}`}
                />
                <TextoErroCampo id="obra-codigo" msg={pe_obra_codigo.msg} />
                {mostrarErp && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => void buscarProjetoErp(novaObra.codigo_externo)}
                      disabled={!normalizarCodigoErp(novaObra.codigo_externo)}
                      className="text-xs font-semibold text-[#2A6377] hover:underline flex items-center gap-1 disabled:text-slate-400 disabled:no-underline"
                    >
                      <Search size={12} aria-hidden="true" /> Buscar no ERP
                    </button>
                    {projetosErp.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setVerListaErp((v) => !v)}
                        aria-expanded={verListaErp}
                        aria-controls="lista-projetos-erp"
                        className="text-xs font-semibold text-[#2A6377] hover:underline flex items-center gap-1"
                      >
                        <List size={12} aria-hidden="true" /> Escolher da lista ({projetosErp.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-3">
                <Rotulo htmlFor="obra-nome" texto="Nome" obrigatorio />
                <input
                  id="obra-nome"
                  {...pe_obra_nome.attrs}
                  value={novaObra.nome}
                  onChange={(e) => setNovaObra({ ...novaObra, nome: e.target.value })}
                  placeholder="Cliente / unidade"
                  autoComplete="off"
                  className={`${classeCampo}${pe_obra_nome.classe}`}
                />
                <TextoErroCampo id="obra-nome" msg={pe_obra_nome.msg} />
              </div>
              {mostrarErp && verListaErp && projetosErp.length > 0 && (
                <ListaProjetosErp
                  projetos={projetosErpFiltrados}
                  total={projetosErp.length}
                  filtro={filtroListaErp}
                  onFiltro={setFiltroListaErp}
                  onEscolher={escolherProjetoErp}
                  onFechar={() => setVerListaErp(false)}
                />
              )}
              {mostrarErp && buscaErp && <QuadroProjetoErp busca={buscaErp} onPreencher={(p) => void preencherComErp(p)} />}
              <div>
                <Rotulo htmlFor="obra-inicio" texto="Início" obrigatorio />
                <input
                  id="obra-inicio"
                  {...pe_obra_inicio.attrs}
                  type="date"
                  value={novaObra.data_inicio}
                  onChange={(e) => setNovaObra({ ...novaObra, data_inicio: e.target.value })}
                  className={`${classeCampo}${pe_obra_inicio.classe}`}
                />
                <TextoErroCampo id="obra-inicio" msg={pe_obra_inicio.msg} />
              </div>
              <div>
                <Rotulo htmlFor="obra-fim" texto="Prazo de entrega" obrigatorio />
                <input
                  id="obra-fim"
                  {...pe_obra_fim.attrs}
                  type="date"
                  value={novaObra.data_previsao_fim}
                  onChange={(e) => setNovaObra({ ...novaObra, data_previsao_fim: e.target.value })}
                  className={`${classeCampo}${pe_obra_fim.classe}`}
                />
                <TextoErroCampo id="obra-fim" msg={pe_obra_fim.msg} />
              </div>
              <div>
                <Rotulo htmlFor="obra-fase" texto="Fase atual" />
                <select
                  id="obra-fase"
                  value={novaObra.fase_atual}
                  onChange={(e) => setNovaObra({ ...novaObra, fase_atual: e.target.value })}
                  className={classeCampo}
                >
                  {fasesProjeto.map((fase) => (
                    <option key={fase.valor} value={fase.valor}>
                      {fase.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Rotulo htmlFor="obra-responsavel" texto="Responsável" obrigatorio />
                {isAdmin ? (
                  <select
                    id="obra-responsavel"
                    {...pe_obra_responsavel.attrs}
                    value={novaObra.id_responsavel}
                    onChange={(e) => setNovaObra({ ...novaObra, id_responsavel: e.target.value })}
                    className={`${classeCampo}${pe_obra_responsavel.classe}`}
                  >
                    <option value="">Selecione…</option>
                    {listaUsuarios
                      .filter((user) => user.perfil === "engenheiro")
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.nome}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className={`${classeCampo} flex items-center bg-slate-50 text-slate-600`}>
                    {nomeUsuarioPorId(idResponsavelEscopo) || usuarioAtual?.nome || "Usuário atual"}
                  </div>
                )}
                <TextoErroCampo id="obra-responsavel" msg={pe_obra_responsavel.msg} />
              </div>
              <div className="sm:col-span-4">
                <Rotulo htmlFor="obra-descricao" texto="Descrição da obra" />
                <textarea
                  id="obra-descricao"
                  rows={3}
                  value={novaObra.descricao}
                  onChange={(e) => setNovaObra({ ...novaObra, descricao: e.target.value })}
                  className={`${classeCampo} h-auto py-2 resize-y`}
                  placeholder="Escopo, ambientes, objetivo do projeto etc."
                />
              </div>
            </div>
          </Secao>

          <Secao titulo="Valores de venda" descricao="Valor vendido ao cliente, com impostos.">
            {novaObra.id && novaObra.valores_ocultos && (
              <p className="text-xs text-slate-500 mb-3">Você não tem acesso aos valores de venda desta obra; eles não serão alterados.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Rotulo htmlFor="obra-valor-produto" texto="Materiais" />
                <CampoMoeda id="obra-valor-produto" valor={String(novaObra.valor_produto ?? "")} onChange={(v) => setNovaObra({ ...novaObra, valor_produto: v })} />
              </div>
              <div>
                <Rotulo htmlFor="obra-valor-servico" texto="Serviço" />
                <CampoMoeda id="obra-valor-servico" valor={String(novaObra.valor_servico ?? "")} onChange={(v) => setNovaObra({ ...novaObra, valor_servico: v })} />
              </div>
              <div>
                <Rotulo texto="Total da venda" />
                <div className="h-10 px-3 rounded-lg bg-slate-100 flex items-center justify-end text-sm font-bold text-slate-800 tabular-nums">
                  {formatarMoeda(totalVenda)}
                </div>
              </div>
            </div>
          </Secao>

          {isAdmin && <ValoresErpObra valores={valoresErp} onChange={setValoresErp} ultimoPedido={ultimoPedidoErp} />}

          {isAdmin && (
            <Secao
              titulo="Exportação"
              descricao="Habilita a aba Exportação no painel da obra (Proforma, Commercial Invoice, Packing List). O robô passa a ler o pedido da obra no ERP."
            >
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(novaObra.exportacao)}
                  disabled={!novaObra.id}
                  onChange={(e) => void marcarExportacao(e.target.checked)}
                  className="h-4 w-4 accent-[#2A6377] disabled:opacity-50"
                />
                Obra de exportação
              </label>
              {!novaObra.id && <p className="text-xs text-slate-500 mt-2">Salve a obra primeiro; depois edite-a para marcar como obra de exportação.</p>}
            </Secao>
          )}

          <Secao titulo="Observações">
            <textarea
              id="obra-observacoes"
              aria-label="Observações"
              rows={2}
              value={novaObra.observacoes}
              onChange={(e) => setNovaObra({ ...novaObra, observacoes: e.target.value })}
              className={`${classeCampo} h-auto py-2 resize-y`}
              placeholder="Informações internas, premissas ou alertas."
            />
          </Secao>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-4 md:px-6 py-4 border-t bg-slate-50/70">
          {novaObra.id && (
            <button
              type="button"
              onClick={cancelarEdicaoObra}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={carregando}
            className="h-10 px-6 rounded-lg bg-[#2A6377] hover:bg-[#21505f] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {carregando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {novaObra.id ? "Salvar alterações" : "Cadastrar obra"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 md:px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-slate-800">
            Obras cadastradas <span className="text-sm font-semibold text-slate-500">({obrasCadastroLista.length})</span>
          </h3>
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-status-cadastro-obras" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Situação
            </label>
            <select
              id="filtro-status-cadastro-obras"
              value={filtroStatusCadastroObras}
              onChange={(e) => setFiltroStatusCadastroObras(e.target.value as any)}
              className={`${classeCampo} w-auto font-semibold`}
            >
              <option value="em_andamento">Em andamento</option>
              <option value="finalizada">Finalizadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        </div>
        {obrasCadastroLista.length === 0 ? (
          <p className="text-slate-500 text-sm px-4 md:px-6 py-8 text-center">
            {filtroStatusCadastroObras === "todas"
              ? "Nenhuma obra."
              : `Nenhuma obra ${labelStatusObra(filtroStatusCadastroObras).toLowerCase()}.`}
          </p>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b">
                  <th className="px-4 py-2.5 font-semibold">Código</th>
                  <th className="px-4 py-2.5 font-semibold">Nome</th>
                  <th className="px-4 py-2.5 font-semibold">Fase</th>
                  <th className="px-4 py-2.5 font-semibold">Responsável</th>
                  <th className="px-4 py-2.5 font-semibold">Situação</th>
                  <th className="px-4 py-2.5 font-semibold">Entrega</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Venda</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="text-sm">
                {obrasCadastroLista.map((obra) => (
                  <tr
                    key={obra.id}
                    className={`border-b last:border-0 hover:bg-slate-50 ${novaObra.id === obra.id ? "bg-[#2A6377]/[0.05]" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">{obra.codigo_externo}</td>
                    <td className="px-4 py-3 font-semibold text-[#2A6377] max-w-[420px] truncate" title={obra.nome}>
                      {obra.nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{labelFase(obra.fase_atual || "processo_inicial")}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{(obra as any).usuarios?.nome || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`whitespace-nowrap text-[11px] font-semibold px-2 py-1 rounded border uppercase ${classeStatusObra(obra.status ?? "")}`}>
                        {labelStatusObra(obra.status ?? "")}
                      </span>
                      {obra.status === "finalizada" && obra.data_finalizacao && (
                        <p className="text-xs text-slate-500 mt-1">em {formatarDataSegura(obra.data_finalizacao)}</p>
                      )}
                      {obra.status === "cancelada" && obra.data_cancelamento && (
                        <p className="text-xs text-slate-500 mt-1">em {formatarDataSegura(obra.data_cancelamento)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{formatarDataSegura(obra.data_previsao_fim)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {totalVendaObra(obra) === null ? (
                        <span className="text-slate-500" title={TITULO_SEM_ACESSO_VALOR}>
                          —
                        </span>
                      ) : (
                        formatarMoeda(totalVendaObra(obra))
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirPainelObra(obra)}
                          className="text-[#2A6377] bg-[#2A6377]/10 hover:bg-[#2A6377] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <FolderOpen size={14} /> Painel
                        </button>
                        {podeEditarObra(obra) && (
                          <button
                            onClick={() => editarObra(obra)}
                            className="text-slate-500 hover:text-[#2A6377] p-1.5 bg-slate-100 hover:bg-[#2A6377]/10 rounded-lg transition"
                            title="Editar cadastro da obra"
                            aria-label={`Editar cadastro da obra ${obra.codigo_externo}`}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// valor null = sem acesso (so admin/coordenador recebem os valores do projeto): mostra "—", nunca R$ 0,00
const valorProjeto = (v: number | string | null) => (v == null ? "—" : formatarMoeda(Number(v || 0)));

// C4: resultado da busca do codigo nos projetos do ERP sincronizados pelo robo
function QuadroProjetoErp({
  busca,
  onPreencher,
}: {
  busca: { codigo: string; estado: "buscando" | "achou" | "nao_achou"; projeto?: ProjetoErp };
  onPreencher: (p: ProjetoErp) => void;
}) {
  if (busca.estado === "buscando")
    return (
      <p className="sm:col-span-4 text-xs text-slate-500 flex items-center gap-1" aria-live="polite">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Procurando o código {busca.codigo} nos projetos do ERP…
      </p>
    );
  if (busca.estado === "nao_achou" || !busca.projeto)
    return (
      <p className="sm:col-span-4 text-xs text-slate-500" aria-live="polite">
        Não encontrei este código nos projetos do ERP sincronizados (a lista é atualizada pelo robô). Siga com o cadastro manual.
      </p>
    );
  const p = busca.projeto;
  const local = localDoCliente(p);
  const linhas: [string, string][] = [
    ["Nome", p.nome],
    ["Cliente", [p.cliente_nome, local].filter(Boolean).join(" - ") || "—"],
    ["Pedido de venda", p.pedido_venda ? `${p.pedido_venda}${p.situacao_pedido === "P" ? " (pendente)" : p.situacao_pedido === "L" ? " (liberado)" : ""}` : "—"],
    ["Materiais", valorProjeto(p.valor_produto)],
    ["Serviço", valorProjeto(p.valor_servico)],
    ["Total da venda", valorProjeto(totalProjetoErp(p))],
    ["Aprovação do pedido", p.data_aprovacao ? formatarDataSegura(p.data_aprovacao) : p.data_pedido ? `${formatarDataSegura(p.data_pedido)} (cadastro)` : "—"],
    ["Entrega prevista", p.data_entrega_prevista ? formatarDataSegura(p.data_entrega_prevista) : "—"],
  ];
  return (
    <div className="sm:col-span-4 rounded-lg border border-[#2A6377]/25 bg-[#2A6377]/[0.04] p-3 md:p-4" aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-wide text-[#2A6377] mb-2">Dados do ERP · projeto {p.codigo}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-3 min-w-0">
            <dt className="text-slate-500 shrink-0">{rotulo}</dt>
            <dd className="text-slate-800 font-semibold text-right break-words min-w-0">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          type="button"
          onClick={() => onPreencher(p)}
          className="h-9 px-4 rounded-lg bg-[#2A6377] hover:bg-[#21505f] text-white text-sm font-bold"
        >
          Preencher com os dados do ERP
        </button>
        <p className="text-xs text-slate-500">Preenche só os campos vazios; se algo já digitado for diferente, pergunta antes.</p>
      </div>
    </div>
  );
}

// C4: lista dos projetos do ERP ainda sem obra no app, para escolher em vez de digitar o codigo
function ListaProjetosErp({
  projetos,
  total,
  filtro,
  onFiltro,
  onEscolher,
  onFechar,
}: {
  projetos: ProjetoErp[];
  total: number;
  filtro: string;
  onFiltro: (v: string) => void;
  onEscolher: (p: ProjetoErp) => void;
  onFechar: () => void;
}) {
  return (
    <div id="lista-projetos-erp" className="sm:col-span-4 rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50/70">
        <p className="text-sm font-bold text-slate-800">
          Projetos do ERP ainda sem obra no app <span className="text-xs font-semibold text-slate-500">({total})</span>
        </p>
        <div className="flex items-center gap-2">
          <input
            aria-label="Filtrar projetos do ERP"
            value={filtro}
            onChange={(e) => onFiltro(e.target.value)}
            placeholder="Código, nome, cliente ou cidade"
            autoComplete="off"
            className={`${classeCampo} h-9 sm:w-64`}
          />
          <button
            type="button"
            onClick={onFechar}
            className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white"
            aria-label="Fechar a lista de projetos do ERP"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {projetos.length === 0 ? (
        <p className="text-sm text-slate-500 px-3 py-4 text-center">Nenhum projeto com esse filtro.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto divide-y">
          {projetos.map((p) => (
            <li key={p.codigo}>
              <button
                type="button"
                onClick={() => onEscolher(p)}
                className="w-full text-left px-3 py-2 hover:bg-[#2A6377]/[0.05] focus:bg-[#2A6377]/[0.05] outline-none"
              >
                <span className="flex justify-between gap-3">
                  <span className="min-w-0 font-semibold text-slate-800 truncate">
                    <span className="tabular-nums text-[#2A6377]">{p.codigo}</span> · {p.nome}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700 tabular-nums">{valorProjeto(totalProjetoErp(p))}</span>
                </span>
                <span className="flex justify-between gap-3 text-xs text-slate-500">
                  <span className="min-w-0 truncate">{[p.cliente_nome, localDoCliente(p)].filter(Boolean).join(" - ") || "Cliente não informado"}</span>
                  <span className="shrink-0 tabular-nums">
                    {p.data_aprovacao ? `aprovado em ${formatarDataSegura(p.data_aprovacao)}` : p.data_pedido ? `pedido de ${formatarDataSegura(p.data_pedido)}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// C9: "campo: valor atual no ERP -> valor novo" na confirmacao antes de mandar ao ERP. Valor atual = o que o robo
// trouxe do ERP para o app (pode estar ate 5 min atrasado); sem ele, "não informado".
function ResumoGravacaoErp({ linhas }: { linhas: LinhaResumoErp[] }) {
  return (
    <div className="space-y-3">
      <p>O robô grava no ERP em até 5 minutos (cadastro de projetos e pedido de venda):</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-xs text-slate-500 border-b">
            <th scope="col" className="text-left font-semibold py-1.5 pr-2">Campo</th>
            <th scope="col" className="text-right font-semibold py-1.5 px-2">Hoje no ERP</th>
            <th scope="col" className="text-right font-semibold py-1.5 pl-2">Novo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave} className="border-b last:border-0">
              <th scope="row" className="text-left font-normal py-1.5 pr-2 text-slate-700">{l.rotulo}</th>
              <td className="text-right py-1.5 px-2 tabular-nums text-slate-500 whitespace-nowrap">
                {l.atual === null ? "não informado" : formatarMoeda(l.atual)}
              </td>
              <td className={`text-right py-1.5 pl-2 tabular-nums whitespace-nowrap ${l.muda ? "font-bold text-[#2A6377]" : "text-slate-500"}`}>
                {formatarMoeda(l.novo)}
                {!l.muda && <span className="block text-xs font-normal">sem mudança</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Margem de contribuicao + rentabilidade = margem prevista; % = margem / faturamento sem impostos (igual a aba
// Rentabilidade e ao BI). Mostra a situacao do ultimo pedido de gravacao no ERP.
function ValoresErpObra({
  valores,
  onChange,
  ultimoPedido,
}: {
  valores: ValoresErp;
  onChange: (v: ValoresErp) => void;
  ultimoPedido: any;
}) {
  const margem = Number(valores.contribuicao || 0) + Number(valores.rentabilidade || 0);
  const venda = Number(valores.venda || 0);
  const pct = (v: number) => (venda > 0 ? `${((v / venda) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—");
  const situacao = ultimoPedido?.situacao;
  const quando = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return (
    <Secao
      destaque
      titulo="Orçamento no ERP"
      descricao="Somente administradores. Ao salvar, o robô grava no ERP em até 5 minutos (cadastro de projetos e pedido de venda)."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(
          [
            ["venda", "Faturamento sem impostos", "PEDVEN · meta de venda", "base do %"],
            ["contribuicao", "Margem de contribuição", "CADPROJ · valor próprio", null],
            ["rentabilidade", "Rentabilidade", "CADPROJ · valor terceiro", null],
          ] as const
        ).map(([chave, texto, origem, nota]) => (
          <div key={chave}>
            <Rotulo htmlFor={`erp-${chave}`} texto={texto} />
            <CampoMoeda id={`erp-${chave}`} valor={valores[chave]} onChange={(v) => onChange({ ...valores, [chave]: v })} />
            <p className="flex justify-between gap-2 text-xs mt-1">
              <span className="text-slate-500 truncate">{origem}</span>
              <span className="text-slate-500 tabular-nums whitespace-nowrap">{nota ?? `${pct(Number(valores[chave] || 0))} do faturamento`}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Margem prevista</p>
          <p className="text-xs text-slate-500">contribuição + rentabilidade</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-800 tabular-nums">{formatarMoeda(margem)}</p>
          <p className="text-sm font-bold text-[#2A6377] tabular-nums">{pct(margem)}</p>
        </div>
      </div>

      {ultimoPedido && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${
            situacao === "erro"
              ? "bg-red-50 border-red-200 text-red-700"
              : situacao === "pendente"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
          aria-live="polite"
        >
          {situacao === "erro" ? (
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          ) : situacao === "pendente" ? (
            <Clock size={16} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          )}
          <span>
            {situacao === "pendente" && (
              <>
                Aguardando o robô gravar no ERP — pedido de {ultimoPedido.nome_solicitante} em {quando(ultimoPedido.created_at)}
                {ultimoPedido.erro ? ` (${ultimoPedido.erro})` : ""}.
              </>
            )}
            {situacao === "gravado" && (
              <>
                Gravado no ERP em {quando(ultimoPedido.gravado_em)} ({ultimoPedido.nome_solicitante}).
              </>
            )}
            {situacao === "erro" && <>Não gravado no ERP: {ultimoPedido.erro}. Corrija e salve de novo.</>}
          </span>
        </div>
      )}
    </Secao>
  );
}
