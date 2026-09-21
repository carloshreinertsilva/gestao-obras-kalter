import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  FileText,
  Loader2,
  Mail,
  Mic,
  Search,
  BookOpen,
} from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, labelOcorrencia } from "./utils";

interface Props {
  recarregar: number;
  onBaixarPdf: (obras: any[], dataFormatada: string, resumoGravacao?: string | null) => void;
  onReenviarEmail: (
    obras: any[],
    dataFormatada: string,
    resumoGravacao?: string | null,
  ) => Promise<{ ok: boolean; erro?: string }>;
  onAviso: (mensagem: string, tipo?: "sucesso" | "erro") => void;
}

interface Reuniao {
  chave: string;
  data: string | null;
  sessao: any | null;
  reunioes: any[];
  bitrix: any[];
}

const PREFIXO_BITRIX = "(Importado do Bitrix) ";
const CHAVE_ANTIGAS = "antigas";

const statusTarefa: Record<string, string> = {
  pendente: "A fazer",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const diaSemana = (data: string) => {
  const [a, m, d] = data.split("-").map(Number);
  return ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][
    new Date(a, m - 1, d).getDay()
  ];
};

const dataISO = (valor: any) => String(valor || "").slice(0, 10);

const limparBitrix = (texto: string) =>
  texto.startsWith(PREFIXO_BITRIX) ? texto.slice(PREFIXO_BITRIX.length) : texto;

export default function ReunioesHistorico({
  recarregar,
  onBaixarPdf,
  onReenviarEmail,
  onAviso,
}: Props) {
  const [carregando, setCarregando] = useState(true);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [reunioesObra, setReunioesObra] = useState<any[]>([]);
  const [notasBitrix, setNotasBitrix] = useState<any[]>([]);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [aba, setAba] = useState<"resumos" | "gravacao" | "tarefas">("resumos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      setCarregando(true);
      const [s, r, b] = await Promise.all([
        supabase
          .from("reunioes_sessoes")
          .select("id, data_reuniao, status, fechada_at, resumo_gravacao, gravacao_duracao_seg"),
        supabase
          .from("reunioes")
          .select(
            `id, id_obra, id_sessao, data_reuniao, resumo_geral, obras(codigo_externo, nome, id_responsavel, usuarios(nome)), ocorrencias(id, tipo, descricao), tarefas(id, titulo, descricao, data_vencimento, prioridade, status, id_responsavel, usuarios(nome))`,
          ),
        supabase
          .from("diario_obra")
          .select(
            "id, id_obra, texto, data_registro, obras(codigo_externo, nome, id_responsavel, usuarios(nome))",
          )
          .like("texto", `${PREFIXO_BITRIX}%`)
          .limit(3000),
      ]);
      if (cancelado) return;
      setSessoes(s.data || []);
      setReunioesObra(r.data || []);
      setNotasBitrix(b.data || []);
      setCarregando(false);
    };
    carregar();
    return () => {
      cancelado = true;
    };
  }, [recarregar]);

  const reunioes = useMemo(() => {
    const mapa = new Map<string, Reuniao>();
    const obter = (chave: string, data: string | null) => {
      if (!mapa.has(chave))
        mapa.set(chave, { chave, data, sessao: null, reunioes: [], bitrix: [] });
      return mapa.get(chave)!;
    };
    for (const s of sessoes) {
      const chave = dataISO(s.data_reuniao);
      const m = obter(chave, chave);
      if (!m.sessao || s.resumo_gravacao) m.sessao = s;
    }
    for (const r of reunioesObra) {
      const chave = dataISO(r.data_reuniao);
      obter(chave, chave).reunioes.push(r);
    }
    for (const n of notasBitrix) {
      if (n.texto.includes("Itens da lista de verificação sem data:")) {
        obter(CHAVE_ANTIGAS, null).bitrix.push(n);
      } else {
        const chave = dataISO(n.data_registro);
        obter(chave, chave).bitrix.push(n);
      }
    }
    return [...mapa.values()].sort((a, b) => {
      if (!a.data) return 1;
      if (!b.data) return -1;
      return b.data.localeCompare(a.data);
    });
  }, [sessoes, reunioesObra, notasBitrix]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reunioes.filter((m) => {
      if (m.data) {
        if (de && m.data < de) return false;
        if (ate && m.data > ate) return false;
      } else if (de || ate) {
        return false;
      }
      if (!termo) return true;
      const textos: string[] = [m.sessao?.resumo_gravacao || ""];
      for (const r of m.reunioes)
        textos.push(
          r.resumo_geral || "",
          r.obras?.codigo_externo || "",
          r.obras?.nome || "",
          r.obras?.usuarios?.nome || "",
          ...(r.ocorrencias || []).map((o: any) => o.descricao),
          ...(r.tarefas || []).map((t: any) => `${t.titulo} ${t.descricao || ""}`),
        );
      for (const n of m.bitrix)
        textos.push(n.texto, n.obras?.codigo_externo || "", n.obras?.nome || "");
      return textos.some((t) => t.toLowerCase().includes(termo));
    });
  }, [reunioes, de, ate, busca]);

  useEffect(() => {
    if (!filtradas.length) return setSelecionada(null);
    if (!filtradas.some((m) => m.chave === selecionada))
      setSelecionada(filtradas[0].chave);
  }, [filtradas, selecionada]);

  const atual = filtradas.find((m) => m.chave === selecionada) || null;

  const obrasDaReuniao = (m: Reuniao) => {
    const mapa = new Map<string, any>();
    const obter = (idObra: string, obra: any) => {
      if (!mapa.has(idObra))
        mapa.set(idObra, {
          idObra,
          nomeObra: obra ? `${obra.codigo_externo} - ${obra.nome}` : "Obra não identificada",
          nomeGestor: obra?.usuarios?.nome || "Sem gestor definido",
          reuniao: null,
          bitrix: [],
        });
      return mapa.get(idObra);
    };
    m.reunioes.forEach((r) => (obter(r.id_obra, r.obras).reuniao = r));
    m.bitrix.forEach((n) => obter(n.id_obra, n.obras).bitrix.push(n));
    const porGestor = new Map<string, any[]>();
    [...mapa.values()]
      .sort((a, b) => a.nomeObra.localeCompare(b.nomeObra, "pt-BR"))
      .forEach((o) => {
        if (!porGestor.has(o.nomeGestor)) porGestor.set(o.nomeGestor, []);
        porGestor.get(o.nomeGestor)!.push(o);
      });
    return [...porGestor.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([gestor, obras]) => ({ gestor, obras }));
  };

  const listaParaAta = (m: Reuniao) =>
    m.reunioes.map((r) => ({
      id_reuniao: r.id,
      id_obra: r.id_obra,
      id_gestor: r.obras?.id_responsavel || null,
      nome_gestor: r.obras?.usuarios?.nome || "Sem gestor definido",
      nome_obra: r.obras ? `${r.obras.codigo_externo} - ${r.obras.nome}` : "Obra Não Identificada",
      resumo: r.resumo_geral,
      ocorrencias: r.ocorrencias || [],
      tarefas: (r.tarefas || []).map((t: any) => ({
        ...t,
        nome_responsavel: t.usuarios?.nome || "Geral",
      })),
    }));

  const tarefasDaReuniao = (m: Reuniao) =>
    m.reunioes.flatMap((r) =>
      (r.tarefas || []).map((t: any) => ({
        ...t,
        obra: r.obras ? `${r.obras.codigo_externo} - ${r.obras.nome}` : "-",
      })),
    );

  const hoje = new Date().toISOString().slice(0, 10);
  const titulo = (m: Reuniao) =>
    m.data
      ? `${formatarDataSegura(m.data)} · ${diaSemana(m.data)}`
      : "Antigas - Importadas Bitrix";

  const reenviar = async (m: Reuniao) => {
    setEnviando(true);
    const resultado = await onReenviarEmail(
      listaParaAta(m),
      formatarDataSegura(m.data),
      m.sessao?.resumo_gravacao || null,
    );
    setEnviando(false);
    onAviso(
      resultado.ok ? "Ata reenviada por e-mail!" : `Falha ao enviar: ${resultado.erro}`,
      resultado.ok ? "sucesso" : "erro",
    );
  };

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-4 items-start xl:flex-1 xl:min-h-0 xl:items-stretch">
      <div className="bg-white rounded-xl shadow-sm border flex flex-col min-w-0 xl:min-h-0 max-h-[70vh] xl:max-h-none">
        <div className="p-3 border-b flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar obra, gestor ou palavra..."
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="border rounded-lg px-2 py-1 flex-1 min-w-0" title="De" />
            <span>até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="border rounded-lg px-2 py-1 flex-1 min-w-0" title="Até" />
            {(de || ate || busca) && (
              <button
                onClick={() => {
                  setDe("");
                  setAte("");
                  setBusca("");
                }}
                className="text-violet-700 font-semibold shrink-0"
              >
                Limpar
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {filtradas.length} reunião(ões)
          </p>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {carregando ? (
            <p className="p-4 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Carregando reuniões...
            </p>
          ) : filtradas.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Nenhuma reunião encontrada.</p>
          ) : (
            filtradas.map((m) => {
              const ocorrencias = m.reunioes.reduce((a, r) => a + (r.ocorrencias || []).length, 0);
              const tarefas = m.reunioes.reduce((a, r) => a + (r.tarefas || []).length, 0);
              const obras = new Set([...m.reunioes.map((r) => r.id_obra), ...m.bitrix.map((n) => n.id_obra)]).size;
              const ativa = m.chave === selecionada;
              return (
                <button
                  key={m.chave}
                  onClick={() => {
                    setSelecionada(m.chave);
                    setAba("resumos");
                  }}
                  className={`w-full text-left px-4 py-3 border-b transition ${ativa ? "bg-[#2A6377]/10 border-l-4 border-l-[#2A6377]" : "hover:bg-slate-50 border-l-4 border-l-transparent"}`}
                >
                  <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <CalendarDays size={14} className="text-[#2A6377]" /> {titulo(m)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {obras} obra(s)
                    {m.reunioes.length > 0 && ` · ${ocorrencias} ocorrência(s) · ${tarefas} tarefa(s)`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.reunioes.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Ata</span>}
                    {m.sessao?.resumo_gravacao && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">Gravação</span>}
                    {m.bitrix.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">Bitrix</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border flex flex-col min-w-0 xl:min-h-0">
        {!atual ? (
          <p className="p-8 text-sm text-slate-400 text-center">Selecione uma reunião para ver os detalhes.</p>
        ) : (
          <>
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{titulo(atual)}</h3>
                {atual.data === null && (
                  <p className="text-xs text-slate-400">Anotações antigas do Bitrix, sem data, tratadas como a primeira reunião.</p>
                )}
              </div>
              {atual.reunioes.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onBaixarPdf(listaParaAta(atual), formatarDataSegura(atual.data), atual.sessao?.resumo_gravacao || null)}
                    className="px-3 py-1.5 rounded-lg border border-[#2A6377] text-[#2A6377] text-sm font-bold hover:bg-[#2A6377] hover:text-white transition flex items-center gap-2"
                  >
                    <FileText size={15} /> Baixar ata (PDF)
                  </button>
                  <button
                    onClick={() => reenviar(atual)}
                    disabled={enviando}
                    className="px-3 py-1.5 rounded-lg bg-[#2A6377] text-white text-sm font-bold hover:bg-[#1e4857] transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {enviando ? <Loader2 className="animate-spin" size={15} /> : <Mail size={15} />} Reenviar por e-mail
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 pt-3 flex gap-1 border-b shrink-0">
              {(
                [
                  ["resumos", "Resumo por obra"],
                  ["gravacao", "Gravação (Plaud)"],
                  ["tarefas", "Tarefas geradas"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  onClick={() => setAba(valor)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition ${aba === valor ? "border-[#2A6377] text-[#2A6377]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0 max-h-[70vh] xl:max-h-none">
              {aba === "resumos" &&
                obrasDaReuniao(atual).map(({ gestor, obras }) => (
                  <div key={gestor} className="mb-6 last:mb-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#2A6377] border-b-2 border-[#2A6377] pb-1 mb-3">
                      Gestor: {gestor}
                    </p>
                    {obras.map((o: any) => (
                      <div key={o.idObra} className="mb-4 border rounded-lg overflow-hidden">
                        <p className="bg-[#2A6377] text-white text-sm font-bold px-3 py-2">{o.nomeObra}</p>
                        <div className="p-3 space-y-3 text-sm">
                          {o.reuniao && (
                            <p className="whitespace-pre-wrap text-slate-700">
                              <span className="font-bold text-slate-800">Resumo da reunião: </span>
                              {o.reuniao.resumo_geral || "Nenhum resumo registrado."}
                            </p>
                          )}
                          {o.reuniao?.ocorrencias?.length > 0 && (
                            <div>
                              <p className="font-bold text-slate-800 mb-1">Ocorrências</p>
                              {o.reuniao.ocorrencias.map((oc: any) => (
                                <p key={oc.id} className="whitespace-pre-wrap text-slate-700">
                                  <span className="font-semibold text-[#2A6377] uppercase text-xs">{labelOcorrencia(oc.tipo)}: </span>
                                  {oc.descricao}
                                </p>
                              ))}
                            </div>
                          )}
                          {o.reuniao?.tarefas?.length > 0 && (
                            <div>
                              <p className="font-bold text-slate-800 mb-1">Tarefas e prazos</p>
                              {o.reuniao.tarefas.map((t: any) => (
                                <p key={t.id} className="text-slate-700">
                                  • {t.titulo}{" "}
                                  <span className="text-xs text-slate-500">
                                    ({t.usuarios?.nome || "Geral"}
                                    {t.data_vencimento ? ` · prazo ${formatarDataSegura(t.data_vencimento)}` : ""})
                                  </span>
                                </p>
                              ))}
                            </div>
                          )}
                          {o.bitrix.length > 0 && (
                            <div className="bg-slate-50 border rounded-lg p-2.5">
                              <p className="font-bold text-slate-600 text-xs flex items-center gap-1.5 mb-1">
                                <BookOpen size={13} /> Anotações importadas do Bitrix
                              </p>
                              {o.bitrix.map((n: any) => (
                                <p key={n.id} className="whitespace-pre-wrap text-slate-700">
                                  {limparBitrix(n.texto)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

              {aba === "gravacao" &&
                (atual.sessao?.resumo_gravacao ? (
                  <div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                      <Mic size={14} className="text-violet-600" /> Resumo da gravação (Plaud)
                      {atual.sessao.gravacao_duracao_seg ? ` · ${Math.floor(atual.sessao.gravacao_duracao_seg / 3600)}h${String(Math.floor((atual.sessao.gravacao_duracao_seg % 3600) / 60)).padStart(2, "0")}min` : ""}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{atual.sessao.resumo_gravacao}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Nenhuma gravação vinculada a esta reunião.</p>
                ))}

              {aba === "tarefas" &&
                (tarefasDaReuniao(atual).length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma tarefa foi criada nesta reunião.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-2 text-left">Tarefa</th>
                        <th className="p-2 text-left">Obra</th>
                        <th className="p-2 text-left">Responsável</th>
                        <th className="p-2">Prazo</th>
                        <th className="p-2">Situação hoje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tarefasDaReuniao(atual).map((t: any) => {
                        const aberta = t.status !== "concluida" && t.status !== "cancelada";
                        const atrasada = aberta && t.data_vencimento && dataISO(t.data_vencimento) < hoje;
                        return (
                          <tr key={t.id} className="border-t">
                            <td className="p-2">{t.titulo}</td>
                            <td className="p-2 text-slate-500 text-xs">{t.obra}</td>
                            <td className="p-2">{t.usuarios?.nome || "Geral"}</td>
                            <td className="p-2 text-center">{t.data_vencimento ? formatarDataSegura(t.data_vencimento) : "-"}</td>
                            <td className="p-2 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${atrasada ? "bg-red-50 text-red-700 border-red-200" : t.status === "concluida" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600"}`}>
                                {atrasada ? "Atrasada" : statusTarefa[t.status] || t.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
