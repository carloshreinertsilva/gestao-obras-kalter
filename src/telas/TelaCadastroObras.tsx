import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { fasesProjeto } from "../constants";
import type { Obra, Usuario } from "../types";
import { formatarDataSegura, labelFase, labelStatusObra, classeStatusObra } from "../utils";
import { Save, AlertTriangle, Edit2, X, FolderOpen } from "lucide-react";

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
        onAviso("Obra atualizada!");
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

        onAviso("Obra salva com cronograma e documentos padrão!");
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

  return (
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
  );
}
