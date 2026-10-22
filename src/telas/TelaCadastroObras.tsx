import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { fasesProjeto } from "../constants";
import type { Obra, Usuario } from "../types";
import { formatarDataSegura, formatarMoeda, labelFase, labelStatusObra, classeStatusObra } from "../utils";
import { Save, AlertTriangle, Edit2, X, FolderOpen, Loader2, CheckCircle2, Clock } from "lucide-react";

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

type ValoresErp = { contribuicao: string; rentabilidade: string; venda: string };
const VALORES_ERP_VAZIOS: ValoresErp = { contribuicao: "", rentabilidade: "", venda: "" };

// ---- campos do formulario (mesmo visual em toda a tela)
const classeCampo =
  "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#2A6377] focus:ring-2 focus:ring-[#2A6377]/15 disabled:bg-slate-50";

function Rotulo({ htmlFor, texto, obrigatorio, dica }: { htmlFor?: string; texto: string; obrigatorio?: boolean; dica?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-600">
        {texto}
        {obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {dica && <span className="text-[10px] text-slate-400 truncate">{dica}</span>}
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
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">R$</span>
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
  const [erroObra, setErroObra] = useState<string>("");
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

  const carregarValoresErp = async (idObra: string | null) => {
    setUltimoPedidoErp(null);
    if (!isAdmin || !idObra) {
      setValoresErp(VALORES_ERP_VAZIOS);
      setValoresErpOriginais(VALORES_ERP_VAZIOS);
      return;
    }
    const [{ data: o }, { data: pedidos }] = await Promise.all([
      supabase
        .from("obras")
        .select("margem_contribuicao_erp, rentabilidade_erp, venda_sem_impostos_erp")
        .eq("id", idObra)
        .single(),
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
          "id, codigo_externo, nome, descricao, fase_atual, observacoes, data_inicio, data_previsao_fim, id_responsavel, valor_produto, valor_servico, status, data_finalizacao, observacao_finalizacao, data_cancelamento, motivo_cancelamento, observacao_cancelamento, usuarios(nome)",
        )
        .order("created_at", { ascending: false });
      if (filtroStatusCadastroObras !== "todas")
        query = query.eq("status", filtroStatusCadastroObras);
      query = noEscopoDoUsuario(query);
      const { data, error } = await query;
      if (error) throw error;
      setObrasCadastroLista(data || []);
    } catch (error) {
      falhaAoCarregar("o cadastro de obras", error);
    }
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
    const valoresErpMudaram =
      isAdmin &&
      (["contribuicao", "rentabilidade", "venda"] as const).some(
        (k) => Number(valoresErp[k] || 0) !== Number(valoresErpOriginais[k] || 0) || (valoresErp[k] === "") !== (valoresErpOriginais[k] === ""),
      );
    if (valoresErpMudaram && (["contribuicao", "rentabilidade", "venda"] as const).some((k) => valoresErp[k] === "")) {
      setErroObra("Para gravar no ERP, informe a margem de contribuição, a rentabilidade e o faturamento sem impostos.");
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

      let idObraSalva: string | null = novaObra.id;
      if (novaObra.id) {
        const { error } = await supabase
          .from("obras")
          .update(dadosObra)
          .eq("id", novaObra.id);
        if (error) throw error;
        onAviso("Obra atualizada!");
      } else {
        const { data: obraCriada, error } = await supabase
          .from("obras")
          .insert([dadosObra])
          .select()
          .single();
        if (error) throw error;
        idObraSalva = obraCriada?.id || null;

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

        onAviso("Obra salva com cronograma e documentos padrão!");
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
          setErroObra("Obra salva, mas os valores do ERP não: " + erroErp.message);
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
      onObrasAlteradas();
      buscarObrasCadastro();
    } catch (error: any) {
      setErroObra("Erro: " + error.message);
    } finally {
      setCarregando(false);
    }
  }

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
    carregarValoresErp(obra.id);
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
    setValoresErp(VALORES_ERP_VAZIOS);
    setValoresErpOriginais(VALORES_ERP_VAZIOS);
    setUltimoPedidoErp(null);
    setErroObra("");
  };

  useEffect(() => {
    buscarObrasCadastro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioAtual?.id, filtroStatusCadastroObras]);

  // "Editar cadastro" aberto de dentro da obra: preenche o formulario com ela
  useEffect(() => {
    if (!obraParaEditar) return;
    editarObra(obraParaEditar);
    onEdicaoIniciada();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraParaEditar]);

  const totalVenda = Number(novaObra.valor_produto || 0) + Number(novaObra.valor_servico || 0);

  return (
    <div className="animate-in fade-in dash-main-wrapper max-w-5xl">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800">Cadastros &rarr; Obras</h2>

      <form
        id="form-cadastro-obra"
        onSubmit={salvarObra}
        className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 md:mb-8 max-w-full overflow-hidden"
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

          <Secao titulo="Dados da obra">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Rotulo htmlFor="obra-codigo" texto="Código" obrigatorio />
                <input
                  id="obra-codigo"
                  value={novaObra.codigo_externo}
                  onChange={(e) => setNovaObra({ ...novaObra, codigo_externo: e.target.value })}
                  placeholder="ex.: 2182"
                  autoComplete="off"
                  className={`${classeCampo} tabular-nums`}
                />
              </div>
              <div className="sm:col-span-3">
                <Rotulo htmlFor="obra-nome" texto="Nome" obrigatorio />
                <input
                  id="obra-nome"
                  value={novaObra.nome}
                  onChange={(e) => setNovaObra({ ...novaObra, nome: e.target.value })}
                  placeholder="Cliente / unidade"
                  autoComplete="off"
                  className={classeCampo}
                />
              </div>
              <div>
                <Rotulo htmlFor="obra-inicio" texto="Início" obrigatorio />
                <input
                  id="obra-inicio"
                  type="date"
                  value={novaObra.data_inicio}
                  onChange={(e) => setNovaObra({ ...novaObra, data_inicio: e.target.value })}
                  className={classeCampo}
                />
              </div>
              <div>
                <Rotulo htmlFor="obra-fim" texto="Prazo de entrega" obrigatorio />
                <input
                  id="obra-fim"
                  type="date"
                  value={novaObra.data_previsao_fim}
                  onChange={(e) => setNovaObra({ ...novaObra, data_previsao_fim: e.target.value })}
                  className={classeCampo}
                />
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
                    value={novaObra.id_responsavel}
                    onChange={(e) => setNovaObra({ ...novaObra, id_responsavel: e.target.value })}
                    className={classeCampo}
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
            Obras cadastradas <span className="text-sm font-semibold text-slate-400">({obrasCadastroLista.length})</span>
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
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide border-b">
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
                    <td className="px-4 py-3 font-semibold text-[#2A6377] max-w-[260px] truncate" title={obra.nome}>
                      {obra.nome}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{labelFase(obra.fase_atual || "processo_inicial")}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{(obra as any).usuarios?.nome || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${classeStatusObra(obra.status ?? "")}`}>
                        {labelStatusObra(obra.status ?? "")}
                      </span>
                      {obra.status === "finalizada" && obra.data_finalizacao && (
                        <p className="text-[10px] text-slate-400 mt-1">em {formatarDataSegura(obra.data_finalizacao)}</p>
                      )}
                      {obra.status === "cancelada" && obra.data_cancelamento && (
                        <p className="text-[10px] text-slate-400 mt-1">em {formatarDataSegura(obra.data_cancelamento)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">{formatarDataSegura(obra.data_previsao_fim)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                      {formatarMoeda(Number(obra.valor_produto || 0) + Number(obra.valor_servico || 0))}
                    </td>
                    <td className="px-4 py-3">
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
            <p className="flex justify-between gap-2 text-[11px] mt-1">
              <span className="text-slate-400 truncate">{origem}</span>
              <span className="text-slate-500 tabular-nums whitespace-nowrap">{nota ?? `${pct(Number(valores[chave] || 0))} do faturamento`}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Margem prevista</p>
          <p className="text-xs text-slate-400">contribuição + rentabilidade</p>
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
