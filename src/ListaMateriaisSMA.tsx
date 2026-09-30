import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Filter, Search } from "lucide-react";
import { formatarDataSegura } from "./utils";
import type { ObraSmaMaterial, SituacaoSma } from "./types";

interface Props {
  materiais: ObraSmaMaterial[];
}

const rotuloSituacao: Record<SituacaoSma, string> = {
  A: "Ativa",
  E: "Encerrada",
  C: "Cancelada",
};

const estiloSituacao: Record<SituacaoSma, string> = {
  A: "bg-amber-50 text-amber-700 border-amber-200",
  E: "bg-emerald-50 text-emerald-700 border-emerald-200",
  C: "bg-slate-100 text-slate-500 border-slate-200",
};

const BadgeSituacao = ({ situacao }: { situacao?: string }) => {
  const s = (situacao as SituacaoSma) || "A";
  return (
    <span
      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${estiloSituacao[s] || estiloSituacao.A}`}
    >
      {rotuloSituacao[s] || situacao || "-"}
    </span>
  );
};

const formatarQtd = (valor: any) =>
  Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

function FiltroColuna({
  opcoes,
  selecionado,
  onChange,
}: {
  opcoes: OpcaoFiltro[];
  selecionado: Set<string> | null;
  onChange: (novo: Set<string> | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [rascunho, setRascunho] = useState<Set<string>>(
    new Set(selecionado ?? opcoes.map((o) => o.valor)),
  );
  const ref = useRef<HTMLDivElement>(null);
  const ativo = selecionado !== null;

  useEffect(() => {
    if (aberto) {
      setRascunho(new Set(selecionado ?? opcoes.map((o) => o.valor)));
      setBusca("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const visiveis = opcoes.filter((o) => o.rotulo.toLowerCase().includes(busca.toLowerCase()));

  const alternar = (valor: string) =>
    setRascunho((atual) => {
      const novo = new Set(atual);
      novo.has(valor) ? novo.delete(valor) : novo.add(valor);
      return novo;
    });

  const aplicar = () => {
    onChange(rascunho.size >= opcoes.length ? null : new Set(rascunho));
    setAberto(false);
  };

  const limpar = () => {
    onChange(null);
    setAberto(false);
  };

  return (
    <span className="relative inline-block ml-1 normal-case font-normal" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className={`align-middle p-0.5 rounded transition ${ativo ? "text-[#2A6377]" : "text-slate-300 hover:text-slate-500"}`}
        title="Filtrar"
      >
        <Filter size={12} fill={ativo ? "currentColor" : "none"} />
      </button>
      {aberto && (
        <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border rounded-lg shadow-xl p-2 text-left">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar..."
            className="w-full border rounded px-2 py-1 text-xs mb-2 outline-none"
            autoFocus
          />
          <div className="flex justify-between text-[11px] text-violet-700 font-bold mb-1 px-0.5">
            <button onClick={() => setRascunho(new Set(opcoes.map((o) => o.valor)))}>
              Marcar todos
            </button>
            <button onClick={() => setRascunho(new Set())}>Desmarcar todos</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {visiveis.length === 0 ? (
              <p className="text-xs text-slate-400 p-1">Nenhum valor.</p>
            ) : (
              visiveis.map((o) => (
                <label
                  key={o.valor}
                  className="flex items-center gap-2 text-xs text-slate-700 px-0.5 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={rascunho.has(o.valor)}
                    onChange={() => alternar(o.valor)}
                  />
                  <span className="truncate">{o.rotulo}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-between gap-2 mt-2 pt-2 border-t">
            <button onClick={limpar} className="text-xs text-slate-500 font-semibold">
              Limpar
            </button>
            <button
              onClick={aplicar}
              className="text-xs bg-[#2A6377] text-white font-bold px-3 py-1 rounded"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

export default function ListaMateriaisSMA({ materiais }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<"todas" | SituacaoSma>("todas");
  const [filtroSma, setFiltroSma] = useState<Set<string> | null>(null);
  const [filtroMaterial, setFiltroMaterial] = useState<Set<string> | null>(null);
  const [filtroProjeto, setFiltroProjeto] = useState<Set<string> | null>(null);
  const [filtroTipoMovimento, setFiltroTipoMovimento] = useState<Set<string> | null>(null);
  const [filtroSolicitante, setFiltroSolicitante] = useState<Set<string> | null>(null);

  const resumo = useMemo(() => {
    const porSituacao = { A: 0, E: 0, C: 0 } as Record<SituacaoSma, number>;
    const smas = new Set<number>();
    for (const m of materiais) {
      const s = (m.situacao as SituacaoSma) || "A";
      if (porSituacao[s] !== undefined) porSituacao[s] += 1;
      if (m.nr_sma) smas.add(m.nr_sma);
    }
    return { totalSmas: smas.size, totalItens: materiais.length, ...porSituacao };
  }, [materiais]);

  const opcoesSma = useMemo(
    () =>
      [...new Set(materiais.map((m) => m.nr_sma).filter((n): n is number => !!n))]
        .sort((a, b) => b - a)
        .map((n) => ({ valor: String(n), rotulo: String(n) })),
    [materiais],
  );

  const opcoesMaterial = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const m of materiais) {
      if (!m.codigo_material) continue;
      if (!mapa.has(m.codigo_material))
        mapa.set(m.codigo_material, `${m.codigo_material} - ${m.descricao_material || ""}`);
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR", { numeric: true }))
      .map(([valor, rotulo]) => ({ valor, rotulo }));
  }, [materiais]);

  const opcoesProjeto = useMemo(
    () =>
      [...new Set(materiais.map((m) => m.projeto_sma).filter((p): p is string => !!p))]
        .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
        .map((p) => ({ valor: p, rotulo: p })),
    [materiais],
  );

  const opcoesTipoMovimento = useMemo(
    () =>
      [...new Set(materiais.map((m) => m.tipo_movimento_descricao).filter((t): t is string => !!t))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((t) => ({ valor: t, rotulo: t })),
    [materiais],
  );

  const opcoesSolicitante = useMemo(
    () =>
      [...new Set(materiais.map((m) => m.solicitante).filter((s): s is string => !!s))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((s) => ({ valor: s, rotulo: s })),
    [materiais],
  );

  const filtroAtivo =
    filtroSituacao !== "todas" ||
    filtroSma !== null ||
    filtroMaterial !== null ||
    filtroProjeto !== null ||
    filtroTipoMovimento !== null ||
    filtroSolicitante !== null;

  const limparFiltros = () => {
    setFiltroSituacao("todas");
    setFiltroSma(null);
    setFiltroMaterial(null);
    setFiltroProjeto(null);
    setFiltroTipoMovimento(null);
    setFiltroSolicitante(null);
  };

  const exportarExcel = () => {
    const cabecalho = [
      "SMA",
      "Urgente",
      "Código do Material",
      "Descrição",
      "Qtd. Solicitada",
      "Projeto",
      "Tipo de Movimento",
      "Solicitante",
      "Situação",
      "Cadastro",
      "Necessidade",
      "Observação",
    ];
    const linhas = filtrados.map((m) => [
      m.nr_sma ?? "",
      m.urgente ? "Sim" : "Não",
      m.codigo_material || "",
      m.descricao_material || "",
      formatarQtd(m.quantidade_solicitada),
      m.projeto_sma || "",
      m.tipo_movimento_descricao || "",
      m.solicitante || "",
      rotuloSituacao[(m.situacao as SituacaoSma) || "A"] || m.situacao || "",
      m.data_cadastro ? formatarDataSegura(m.data_cadastro) : "",
      m.data_necessidade ? formatarDataSegura(m.data_necessidade) : "",
      m.observacao || "",
    ]);
    const escapar = (valor: any) => `"${String(valor).replace(/"/g, '""')}"`;
    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map(escapar).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista_materiais_sma_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...materiais]
      .filter((m) => filtroSituacao === "todas" || m.situacao === filtroSituacao)
      .filter((m) => !filtroSma || filtroSma.has(String(m.nr_sma)))
      .filter((m) => !filtroMaterial || filtroMaterial.has(m.codigo_material || ""))
      .filter((m) => !filtroProjeto || filtroProjeto.has(m.projeto_sma || ""))
      .filter((m) => !filtroTipoMovimento || filtroTipoMovimento.has(m.tipo_movimento_descricao || ""))
      .filter((m) => !filtroSolicitante || filtroSolicitante.has(m.solicitante || ""))
      .filter((m) => {
        if (!termo) return true;
        const textos = [
          String(m.nr_sma || ""),
          m.codigo_material || "",
          m.descricao_material || "",
          m.projeto_sma || "",
          m.solicitante || "",
          m.tipo_movimento_descricao || "",
          m.observacao || "",
        ];
        return textos.some((t) => t.toLowerCase().includes(termo));
      })
      .sort((a, b) => (b.nr_sma || 0) - (a.nr_sma || 0) || (a.sequencia || 0) - (b.sequencia || 0));
  }, [
    materiais,
    busca,
    filtroSituacao,
    filtroSma,
    filtroMaterial,
    filtroProjeto,
    filtroTipoMovimento,
    filtroSolicitante,
  ]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">SMAs</p>
          <p className="text-2xl font-bold text-slate-800">{resumo.totalSmas}</p>
          <p className="text-[11px] text-slate-400">{resumo.totalItens} item(ns) de material</p>
        </div>
        <button
          onClick={() => setFiltroSituacao(filtroSituacao === "A" ? "todas" : "A")}
          className={`text-left p-4 rounded-xl shadow-sm border transition ${filtroSituacao === "A" ? "bg-amber-100 border-amber-300" : "bg-amber-50 border-amber-100 hover:bg-amber-100"}`}
        >
          <p className="text-xs text-amber-700 font-bold uppercase">Ativas</p>
          <p className="text-2xl font-bold text-amber-700">{resumo.A}</p>
        </button>
        <button
          onClick={() => setFiltroSituacao(filtroSituacao === "E" ? "todas" : "E")}
          className={`text-left p-4 rounded-xl shadow-sm border transition ${filtroSituacao === "E" ? "bg-emerald-100 border-emerald-300" : "bg-emerald-50 border-emerald-100 hover:bg-emerald-100"}`}
        >
          <p className="text-xs text-emerald-700 font-bold uppercase">Encerradas</p>
          <p className="text-2xl font-bold text-emerald-700">{resumo.E}</p>
        </button>
        <button
          onClick={() => setFiltroSituacao(filtroSituacao === "C" ? "todas" : "C")}
          className={`text-left p-4 rounded-xl shadow-sm border transition ${filtroSituacao === "C" ? "bg-slate-200 border-slate-300" : "bg-slate-100 border-slate-200 hover:bg-slate-200"}`}
        >
          <p className="text-xs text-slate-500 font-bold uppercase">Canceladas</p>
          <p className="text-2xl font-bold text-slate-600">{resumo.C}</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">Lista de Materiais (SMA)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Materiais solicitados ao almoxarifado para a obra, importados do ERP. Somente
                leitura - ajustes são feitos lá, não neste sistema. Use o funil no cabeçalho de
                cada coluna para filtrar por valores específicos.
              </p>
            </div>
            <button
              onClick={exportarExcel}
              title="Exportar lista filtrada para Excel"
              className="shrink-0 mt-0.5 text-xs font-semibold text-slate-500 hover:text-[#2A6377] flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 hover:border-[#2A6377]/40 transition"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar material, SMA, solicitante..."
                className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="inline-flex rounded-lg border overflow-hidden text-sm">
              {(
                [
                  ["todas", "Todas"],
                  ["A", "Ativa"],
                  ["E", "Encerrada"],
                  ["C", "Cancelada"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  onClick={() => setFiltroSituacao(valor)}
                  className={`px-3 py-1.5 font-semibold transition ${filtroSituacao === valor ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {filtroAtivo && (
              <button onClick={limparFiltros} className="text-xs font-bold text-violet-700 shrink-0">
                Limpar filtros
              </button>
            )}
            <span className="text-xs text-slate-400 ml-auto">
              {filtrados.length} de {materiais.length} item(ns)
            </span>
          </div>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm min-w-[940px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left whitespace-nowrap">
                  SMA
                  <FiltroColuna opcoes={opcoesSma} selecionado={filtroSma} onChange={setFiltroSma} />
                </th>
                <th className="p-3 text-left whitespace-nowrap">
                  Material
                  <FiltroColuna
                    opcoes={opcoesMaterial}
                    selecionado={filtroMaterial}
                    onChange={setFiltroMaterial}
                  />
                </th>
                <th className="p-3 text-right">Qtd. Solicitada</th>
                <th className="p-3 text-left whitespace-nowrap">
                  Projeto
                  <FiltroColuna
                    opcoes={opcoesProjeto}
                    selecionado={filtroProjeto}
                    onChange={setFiltroProjeto}
                  />
                </th>
                <th className="p-3 text-left whitespace-nowrap">
                  Tipo de Movimento
                  <FiltroColuna
                    opcoes={opcoesTipoMovimento}
                    selecionado={filtroTipoMovimento}
                    onChange={setFiltroTipoMovimento}
                  />
                </th>
                <th className="p-3 text-left whitespace-nowrap">
                  Solicitante
                  <FiltroColuna
                    opcoes={opcoesSolicitante}
                    selecionado={filtroSolicitante}
                    onChange={setFiltroSolicitante}
                  />
                </th>
                <th className="p-3 text-center">Situação</th>
                <th className="p-3 text-center">Cadastro</th>
                <th className="p-3 text-center">Necessidade</th>
                <th className="p-3 text-left">Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500">
                    {materiais.length === 0
                      ? "Nenhuma SMA importada do ERP para esta obra."
                      : "Nenhum item encontrado para o filtro atual."}
                  </td>
                </tr>
              ) : (
                filtrados.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-[#2A6377] whitespace-nowrap">
                      {m.nr_sma}
                      {m.urgente && (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                          Urgente
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-700">{m.codigo_material || "-"}</div>
                      <div className="text-xs text-slate-500">{m.descricao_material || ""}</div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {formatarQtd(m.quantidade_solicitada)}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{m.projeto_sma || "-"}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {m.tipo_movimento_descricao || "-"}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{m.solicitante || "-"}</td>
                    <td className="p-3 text-center">
                      <BadgeSituacao situacao={m.situacao} />
                    </td>
                    <td className="p-3 text-center text-slate-600 whitespace-nowrap">
                      {m.data_cadastro ? formatarDataSegura(m.data_cadastro) : "-"}
                    </td>
                    <td className="p-3 text-center text-slate-600 whitespace-nowrap">
                      {m.data_necessidade ? formatarDataSegura(m.data_necessidade) : "-"}
                    </td>
                    <td className="p-3 text-slate-600 max-w-[260px] truncate" title={m.observacao || ""}>
                      {m.observacao || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
