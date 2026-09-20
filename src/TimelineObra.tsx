import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { formatarDataSegura, labelOcorrencia } from "./utils";
import {
  BookOpen,
  Clock,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react";

interface TimelineObraProps {
  idObra: string;
  usuarioAtualId?: string;
  podeGerenciar: boolean;
  mostrarFormularios?: boolean;
  onAviso?: (mensagem: string, tipo?: "sucesso" | "erro") => void;
}

const tiposOcorrencia = [
  { valor: "avanco", label: "Avanço" },
  { valor: "atraso", label: "Atraso" },
  { valor: "financeiro", label: "Financeiro" },
  { valor: "fornecedor", label: "Fornecedor" },
  { valor: "acidente", label: "Acidente" },
  { valor: "outros", label: "Outros" },
];

export default function TimelineObra({
  idObra,
  usuarioAtualId,
  podeGerenciar,
  mostrarFormularios = true,
  onAviso,
}: TimelineObraProps) {
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [ocorrenciasAbertas, setOcorrenciasAbertas] = useState<any[]>([]);
  const [novoDiarioTexto, setNovoDiarioTexto] = useState("");
  const [diarioEmEdicao, setDiarioEmEdicao] = useState<any>(null);
  const [novaOcorrenciaTipo, setNovaOcorrenciaTipo] = useState("avanco");
  const [novaOcorrenciaDescricao, setNovaOcorrenciaDescricao] = useState("");

  const avisar = (mensagem: string, tipo: "sucesso" | "erro" = "sucesso") => {
    if (onAviso) onAviso(mensagem, tipo);
  };

  const buscarTimeline = async () => {
    if (!idObra) return;
    setCarregando(true);
    try {
      const { data: reunioesData } = await supabase
        .from("reunioes")
        .select(
          "id, data_reuniao, resumo_geral, tarefas(id, titulo, data_vencimento, id_responsavel, usuarios(nome))",
        )
        .eq("id_obra", idObra);

      const { data: ocorrenciasData } = await supabase
        .from("ocorrencias")
        .select("id, tipo, descricao, status, data_resolucao, created_at")
        .eq("id_obra", idObra)
        .order("created_at", { ascending: false });

      let diariosData: any[] = [];
      try {
        const { data } = await supabase
          .from("diario_obra")
          .select(
            "id, data_registro, texto, created_at, id_usuario, usuarios(nome)",
          )
          .eq("id_obra", idObra);
        if (data) diariosData = data;
      } catch (e) {
        console.log("Tabela diario_obra ausente.");
      }

      const agrupado: any = {};
      const chaveDe = (data: any) => {
        const dataFormatada = formatarDataSegura(data);
        if (!agrupado[dataFormatada])
          agrupado[dataFormatada] = {
            dataFormatada,
            dataReal: data,
            resumos: [],
            ocorrencias: [],
            tarefas: [],
            diarios: [],
          };
        return agrupado[dataFormatada];
      };

      (reunioesData || []).forEach((r: any) => {
        const grupo = chaveDe(r.data_reuniao);
        if (r.resumo_geral)
          grupo.resumos.push({ id: r.id, texto: r.resumo_geral });
        if (r.tarefas?.length > 0) grupo.tarefas.push(...r.tarefas);
      });

      (ocorrenciasData || []).forEach((oc: any) => {
        chaveDe(oc.created_at).ocorrencias.push(oc);
      });

      diariosData.forEach((d: any) => {
        chaveDe(d.data_registro).diarios.push(d);
      });

      const historicoArray = Object.values(agrupado).sort(
        (a: any, b: any) =>
          new Date(b.dataReal).getTime() - new Date(a.dataReal).getTime(),
      );

      setHistorico(historicoArray);
      setOcorrenciasAbertas(
        (ocorrenciasData || []).filter((oc: any) => oc.status !== "resolvida"),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idObra]);

  const salvarDiario = async () => {
    if (!novoDiarioTexto.trim() || !idObra) return;
    setCarregando(true);
    try {
      if (diarioEmEdicao) {
        const { error } = await supabase
          .from("diario_obra")
          .update({ texto: novoDiarioTexto })
          .eq("id", diarioEmEdicao.id);
        if (error) throw error;
        avisar("Registro atualizado!");
      } else {
        const { error } = await supabase.from("diario_obra").insert([
          {
            id_obra: idObra,
            id_usuario: usuarioAtualId || null,
            texto: novoDiarioTexto,
            data_registro: new Date().toISOString().split("T")[0],
          },
        ]);
        if (error) throw error;
        avisar("Registrado no diário!");
      }
      setNovoDiarioTexto("");
      setDiarioEmEdicao(null);
      buscarTimeline();
    } catch (error: any) {
      avisar(error.message || "Erro ao salvar diário.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  const salvarOcorrencia = async () => {
    if (!novaOcorrenciaDescricao.trim() || !idObra) return;
    setCarregando(true);
    try {
      const { error } = await supabase.from("ocorrencias").insert([
        {
          id_obra: idObra,
          tipo: novaOcorrenciaTipo,
          descricao: novaOcorrenciaDescricao,
          status: "aberta",
        },
      ]);
      if (error) throw error;
      avisar("Ocorrência registrada!");
      setNovaOcorrenciaDescricao("");
      buscarTimeline();
    } catch (error: any) {
      avisar(error.message || "Erro ao registrar ocorrência.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  const resolverOcorrencia = async (idOcorrencia: string) => {
    setCarregando(true);
    try {
      const { error } = await supabase
        .from("ocorrencias")
        .update({ status: "resolvida", data_resolucao: new Date().toISOString() })
        .eq("id", idOcorrencia);
      if (error) throw error;
      avisar("Ocorrência marcada como resolvida!");
      buscarTimeline();
    } catch (error: any) {
      avisar(error.message || "Erro ao resolver ocorrência.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {ocorrenciasAbertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-3 text-sm">
            <AlertTriangle size={16} /> Pendências em Aberto (
            {ocorrenciasAbertas.length})
          </h4>
          <div className="space-y-2">
            {ocorrenciasAbertas.map((oc) => (
              <div
                key={oc.id}
                className="bg-white p-3 rounded border border-amber-100 flex justify-between items-start gap-3 text-sm"
              >
                <div>
                  <span className="font-bold text-amber-700">
                    {labelOcorrencia(oc.tipo)}:
                  </span>{" "}
                  <span className="text-slate-700">{oc.descricao}</span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Registrada em {formatarDataSegura(oc.created_at)}
                  </p>
                </div>
                {podeGerenciar && (
                  <button
                    onClick={() => resolverOcorrencia(oc.id)}
                    disabled={carregando}
                    className="shrink-0 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Resolver
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {podeGerenciar && mostrarFormularios && (
        <div className="bg-white p-4 rounded-xl border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2 text-sm">
                <BookOpen size={16} />{" "}
                {diarioEmEdicao ? "Editar Registro" : "Registrar no Diário"}
              </h4>
              <textarea
                rows={3}
                placeholder="Houve alguma alteração no projeto hoje? Registre aqui..."
                value={novoDiarioTexto}
                onChange={(e) => setNovoDiarioTexto(e.target.value)}
                className="w-full border rounded-lg p-2 outline-none text-sm mb-2"
              ></textarea>
              <div className="flex gap-2">
                <button
                  onClick={salvarDiario}
                  disabled={!novoDiarioTexto.trim() || carregando}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm transition flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {carregando ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Save size={14} />
                  )}{" "}
                  {diarioEmEdicao ? "Atualizar" : "Salvar"}
                </button>
                {diarioEmEdicao && (
                  <button
                    onClick={() => {
                      setDiarioEmEdicao(null);
                      setNovoDiarioTexto("");
                    }}
                    className="px-3 bg-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2 text-sm">
                <AlertTriangle size={16} /> Nova Ocorrência
              </h4>
              <div className="flex gap-2 mb-2">
                <select
                  className="border rounded-lg p-2 text-sm outline-none"
                  value={novaOcorrenciaTipo}
                  onChange={(e) => setNovaOcorrenciaTipo(e.target.value)}
                >
                  {tiposOcorrencia.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Descrição..."
                  value={novaOcorrenciaDescricao}
                  onChange={(e) => setNovaOcorrenciaDescricao(e.target.value)}
                  className="flex-1 border rounded-lg p-2 text-sm outline-none"
                  onKeyDown={(e) => e.key === "Enter" && salvarOcorrencia()}
                />
              </div>
              <button
                onClick={salvarOcorrencia}
                disabled={!novaOcorrenciaDescricao.trim() || carregando}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-bold text-sm transition flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Plus size={14} /> Registrar Ocorrência
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 p-4 rounded-xl border w-full max-h-[600px] overflow-y-auto">
        <h4 className="font-bold mb-4 flex items-center gap-2 text-sm text-slate-600">
          <Clock size={16} /> Histórico da Obra
        </h4>
        {carregando && historico.length === 0 ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="animate-spin" size={14} /> Carregando...
          </p>
        ) : historico.length === 0 ? (
          <p className="text-sm text-gray-500">Sem histórico.</p>
        ) : (
          historico.map((hist, idx) => (
            <div
              key={idx}
              className="w-full border-l-2 border-slate-200 pl-4 pb-5"
            >
              <h5 className="font-bold text-[#2A6377] mb-2 text-sm">
                {hist.dataFormatada}
              </h5>
              <div className="space-y-2">
                {hist.diarios?.map((diario: any) => (
                  <div
                    key={`d-${diario.id}`}
                    className="bg-white p-3 rounded border text-sm"
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Diário{diario.usuarios?.nome ? ` · ${diario.usuarios.nome}` : ""}
                    </p>
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
                {hist.ocorrencias?.map((oc: any) => (
                  <div
                    key={`oc-${oc.id}`}
                    className="bg-white p-3 rounded border text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#2A6377]">
                        {labelOcorrencia(oc.tipo)}:
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${oc.status === "resolvida" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {oc.status === "resolvida" ? "Resolvida" : "Aberta"}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1">{oc.descricao}</p>
                  </div>
                ))}
                {hist.tarefas?.map((t: any) => (
                  <div
                    key={`t-${t.id}`}
                    className="bg-white p-3 rounded border text-sm"
                  >
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Tarefa gerada
                    </p>
                    <p className="text-slate-700">
                      {t.titulo}
                      {t.usuarios?.nome ? ` (Resp: ${t.usuarios.nome})` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
