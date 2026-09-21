import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, Trash2 } from "lucide-react";
import {
  compararCodigoFamilia,
  formatarDataSegura,
  formatarMoeda,
  formatarPercentual,
} from "./utils";
import type {
  ObraFaturamentoFamilia,
  ObraFaturamentoGrupo,
  ObraFaturamentoPrevisao,
  ObraFaturamentoRealizado,
} from "./types";

interface Props {
  realizados: ObraFaturamentoRealizado[];
  previsoes: ObraFaturamentoPrevisao[];
  familias: ObraFaturamentoFamilia[];
  grupos: ObraFaturamentoGrupo[];
  podeEditar: boolean;
  onExcluir: (realizado: ObraFaturamentoRealizado) => void;
}

type Tipo = "material" | "servico";
type TipoNF = Tipo | "misto";

const tipoDoGrupo = (codigo?: string | null): Tipo =>
  (codigo || "").startsWith("70.") ? "servico" : "material";

const rotuloTipo: Record<TipoNF, string> = {
  material: "Material",
  servico: "Serviço",
  misto: "Misto",
};

const estiloTipo: Record<TipoNF, string> = {
  material: "bg-sky-50 text-sky-700 border-sky-200",
  servico: "bg-violet-50 text-violet-700 border-violet-200",
  misto: "bg-amber-50 text-amber-700 border-amber-200",
};

const BadgeTipo = ({ tipo }: { tipo: TipoNF }) => (
  <span
    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${estiloTipo[tipo]}`}
  >
    {rotuloTipo[tipo]}
  </span>
);

const valor = (r: ObraFaturamentoRealizado) => Number(r.valor_realizado || 0);

const pct = formatarPercentual;

export default function FaturamentosRealizados({
  realizados,
  previsoes,
  familias,
  grupos,
  podeEditar,
  onExcluir,
}: Props) {
  const [aba, setAba] = useState<"nf" | "familia">("nf");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | Tipo>("todos");
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const familiaPorId = useMemo(
    () => new Map(familias.map((f) => [f.id, f])),
    [familias],
  );
  const descricaoGrupo = useMemo(
    () => new Map(grupos.map((g) => [g.codigo || "", g.descricao || ""])),
    [grupos],
  );
  // Valor do pedido por grupo = soma das previsões (itens do pedido no ERP). Não usar
  // valor_total_grupo: fica inflado quando uma família concentra vários grupos.
  const valorGrupoNoPedido = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of previsoes) {
      const codigo = p.grupo_faturamento || "";
      mapa.set(codigo, (mapa.get(codigo) || 0) + Number(p.valor_previsto || 0));
    }
    return mapa;
  }, [previsoes]);
  const pedidoPorTipo = useMemo(() => {
    const total: Record<Tipo, number> = { material: 0, servico: 0 };
    for (const [codigo, valorGrupo] of valorGrupoNoPedido) total[tipoDoGrupo(codigo)] += valorGrupo;
    return total;
  }, [valorGrupoNoPedido]);

  const alternar = (chave: string) =>
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  const nomeFamilia = (r: ObraFaturamentoRealizado) => {
    const f = familiaPorId.get(r.id_obra_faturamento_familia || "");
    return f ? `${f.codigo_familia} - ${(f.descricao_familia || "").trim()}` : "-";
  };

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return realizados.filter((r) => {
      if (filtroTipo !== "todos" && tipoDoGrupo(r.grupo_faturamento) !== filtroTipo)
        return false;
      if (!termo) return true;
      const f = familiaPorId.get(r.id_obra_faturamento_familia || "");
      return [
        r.numero_nf,
        r.grupo_faturamento,
        descricaoGrupo.get(r.grupo_faturamento || ""),
        f?.codigo_familia,
        f?.descricao_familia,
      ].some((t) => (t || "").toLowerCase().includes(termo));
    });
  }, [realizados, filtroTipo, busca, familiaPorId, descricaoGrupo]);

  const notas = useMemo(() => {
    const mapa = new Map<string, ObraFaturamentoRealizado[]>();
    for (const r of linhas) {
      const chave = r.numero_nf || "(sem NF)";
      mapa.set(chave, [...(mapa.get(chave) || []), r]);
    }
    return [...mapa.entries()]
      .map(([nf, itens]) => {
        const tipos = new Set(itens.map((i) => tipoDoGrupo(i.grupo_faturamento)));
        const tipo: TipoNF = tipos.size > 1 ? "misto" : [...tipos][0];
        const data = itens
          .map((i) => i.data_faturamento || "")
          .sort()
          .at(-1);
        const porTipo: Record<Tipo, number> = { material: 0, servico: 0 };
        for (const i of itens) porTipo[tipoDoGrupo(i.grupo_faturamento)] += valor(i);
        return {
          nf,
          itens: [...itens].sort((a, b) => valor(b) - valor(a)),
          tipo,
          data,
          porTipo,
          total: itens.reduce((acc, i) => acc + valor(i), 0),
        };
      })
      .sort((a, b) => (b.data || "").localeCompare(a.data || "") || b.nf.localeCompare(a.nf));
  }, [linhas]);

  const porFamilia = useMemo(() => {
    const mapa = new Map<string, ObraFaturamentoRealizado[]>();
    for (const r of linhas) {
      const chave = r.id_obra_faturamento_familia || "sem-familia";
      mapa.set(chave, [...(mapa.get(chave) || []), r]);
    }
    return [...mapa.entries()]
      .map(([id, itens]) => {
        const f = familiaPorId.get(id);
        return {
          id,
          codigo: f?.codigo_familia || "SEM-GRUPO",
          nome: f ? `${f.codigo_familia} - ${(f.descricao_familia || "").trim()}` : "Sem família",
          escopo: Number(f?.valor_total_escopo || 0),
          itens: [...itens].sort((a, b) => (b.data_faturamento || "").localeCompare(a.data_faturamento || "")),
          total: itens.reduce((acc, i) => acc + valor(i), 0),
          qtdNotas: new Set(itens.map((i) => i.numero_nf)).size,
        };
      })
      .sort((a, b) => compararCodigoFamilia(a.codigo, b.codigo));
  }, [linhas, familiaPorId]);

  const totalGeral = linhas.reduce((acc, r) => acc + valor(r), 0);
  const totalMaterial = linhas
    .filter((r) => tipoDoGrupo(r.grupo_faturamento) === "material")
    .reduce((acc, r) => acc + valor(r), 0);
  const totalServico = totalGeral - totalMaterial;
  const qtdNotas = new Set(linhas.map((r) => r.numero_nf)).size;

  const botaoExcluir = (r: ObraFaturamentoRealizado) =>
    podeEditar && (
      <button
        onClick={() => onExcluir(r)}
        className="text-red-400 hover:text-red-600"
        title="Excluir este lançamento"
      >
        <Trash2 size={15} />
      </button>
    );

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
      <div className="p-4 border-b flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-lg">Faturamentos Realizados</h3>
          <div className="inline-flex rounded-lg border overflow-hidden text-sm">
            {(
              [
                ["nf", "Por NF"],
                ["familia", "Por família"],
              ] as const
            ).map(([valorAba, rotulo]) => (
              <button
                key={valorAba}
                onClick={() => setAba(valorAba)}
                className={`px-4 py-1.5 font-semibold transition ${aba === valorAba ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar NF, grupo ou família..."
              className="border rounded-lg pl-8 pr-3 py-1.5 outline-none w-64 max-w-full"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "todos" | Tipo)}
            className="border rounded-lg px-3 py-1.5 outline-none bg-white"
          >
            <option value="todos">Todos os tipos</option>
            <option value="material">Material</option>
            <option value="servico">Serviço</option>
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              <b className="text-slate-700">{qtdNotas}</b> notas
            </span>
            <span title={`Pedido de material: ${formatarMoeda(pedidoPorTipo.material)}`}>
              Material: <b className="text-sky-700">{formatarMoeda(totalMaterial)}</b>{" "}
              <span className="text-slate-400">de {formatarMoeda(pedidoPorTipo.material)}</span>
            </span>
            <span title={`Pedido de serviço: ${formatarMoeda(pedidoPorTipo.servico)}`}>
              Serviço: <b className="text-violet-700">{formatarMoeda(totalServico)}</b>{" "}
              <span className="text-slate-400">de {formatarMoeda(pedidoPorTipo.servico)}</span>
            </span>
            <span>
              Total: <b className="text-emerald-700 text-sm">{formatarMoeda(totalGeral)}</b>
            </span>
          </div>
        </div>
      </div>

      {linhas.length === 0 ? (
        <p className="p-6 text-center text-slate-500 text-sm">
          {realizados.length === 0
            ? "Nenhum faturamento realizado registrado."
            : "Nenhum faturamento encontrado com esses filtros."}
        </p>
      ) : aba === "nf" ? (
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left">NF</th>
                <th className="p-3">Data</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Grupos</th>
                <th className="p-3 text-right">Valor total da NF</th>
                <th className="p-3 text-right">% do pedido (por tipo)</th>
              </tr>
            </thead>
            <tbody>
              {notas.map((n) => {
                const aberto = abertos.has(`nf-${n.nf}`);
                return (
                  <NotaLinha
                    key={n.nf}
                    aberto={aberto}
                    onAlternar={() => alternar(`nf-${n.nf}`)}
                    cabecalho={
                      <>
                        <td className="p-3 font-bold text-[#2A6377]">NF {n.nf}</td>
                        <td className="p-3 text-center">{formatarDataSegura(n.data)}</td>
                        <td className="p-3 text-center">
                          <BadgeTipo tipo={n.tipo} />
                        </td>
                        <td className="p-3 text-center text-slate-500">{n.itens.length}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {formatarMoeda(n.total)}
                        </td>
                        <td className="p-3 text-right">
                          {(["material", "servico"] as const)
                            .filter((t) => n.porTipo[t] > 0)
                            .map((t) => (
                              <div
                                key={t}
                                title={`Representa ${pct(n.porTipo[t], pedidoPorTipo[t])} do pedido de ${rotuloTipo[t].toLowerCase()} (${formatarMoeda(pedidoPorTipo[t])})`}
                              >
                                <span className="font-bold text-slate-700">
                                  {pct(n.porTipo[t], pedidoPorTipo[t])}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {" "}
                                  do pedido de {rotuloTipo[t].toLowerCase()}
                                </span>
                              </div>
                            ))}
                        </td>
                      </>
                    }
                    colunas={6}
                    detalhe={
                      <table className="w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="py-1.5 px-2 text-left">Grupo (material)</th>
                            <th className="py-1.5 px-2 text-left">Família</th>
                            <th className="py-1.5 px-2 text-center">Tipo</th>
                            <th className="py-1.5 px-2 text-right">Valor</th>
                            <th className="py-1.5 px-2 text-right">% da NF</th>
                            <th className="py-1.5 px-2 text-right">% do grupo no pedido</th>
                            {podeEditar && <th className="py-1.5 px-2 w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {n.itens.map((i) => (
                            <tr key={i.id} className="border-t border-slate-200">
                              <td className="py-1.5 px-2">
                                <span className="font-semibold text-slate-700">{i.grupo_faturamento}</span>
                                {descricaoGrupo.get(i.grupo_faturamento || "") && (
                                  <span className="text-slate-500"> · {descricaoGrupo.get(i.grupo_faturamento || "")}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-[#2A6377]">{nomeFamilia(i)}</td>
                              <td className="py-1.5 px-2 text-center">
                                <BadgeTipo tipo={tipoDoGrupo(i.grupo_faturamento)} />
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-emerald-700">
                                {formatarMoeda(valor(i))}
                              </td>
                              <td className="py-1.5 px-2 text-right text-slate-500">
                                {pct(valor(i), n.total)}
                              </td>
                              <td
                                className={`py-1.5 px-2 text-right font-semibold ${valor(i) > (valorGrupoNoPedido.get(i.grupo_faturamento || "") || 0) + 0.05 ? "text-red-600" : "text-slate-700"}`}
                                title={`Grupo no pedido: ${formatarMoeda(valorGrupoNoPedido.get(i.grupo_faturamento || "") || 0)}`}
                              >
                                {pct(valor(i), valorGrupoNoPedido.get(i.grupo_faturamento || "") || 0)}
                              </td>
                              {podeEditar && <td className="py-1.5 px-2 text-center">{botaoExcluir(i)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3 text-left">Família</th>
                <th className="p-3">NFs</th>
                <th className="p-3 text-right">Escopo</th>
                <th className="p-3 text-right">Faturado</th>
                <th className="p-3 text-right">% do escopo</th>
              </tr>
            </thead>
            <tbody>
              {porFamilia.map((f) => {
                const aberto = abertos.has(`fam-${f.id}`);
                return (
                  <NotaLinha
                    key={f.id}
                    aberto={aberto}
                    onAlternar={() => alternar(`fam-${f.id}`)}
                    cabecalho={
                      <>
                        <td className="p-3 font-bold text-[#2A6377]">{f.nome}</td>
                        <td className="p-3 text-center text-slate-500">{f.qtdNotas}</td>
                        <td className="p-3 text-right text-slate-600">{formatarMoeda(f.escopo)}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatarMoeda(f.total)}</td>
                        <td className="p-3 text-right text-slate-500">
                          {f.escopo > 0 ? `${((f.total / f.escopo) * 100).toFixed(0)}%` : "-"}
                        </td>
                      </>
                    }
                    colunas={5}
                    detalhe={
                      <table className="w-full text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="py-1.5 px-2 text-left">NF</th>
                            <th className="py-1.5 px-2 text-center">Data</th>
                            <th className="py-1.5 px-2 text-center">Tipo</th>
                            <th className="py-1.5 px-2 text-left">Grupo (material)</th>
                            <th className="py-1.5 px-2 text-right">Valor</th>
                            {podeEditar && <th className="py-1.5 px-2 w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {f.itens.map((i) => (
                            <tr key={i.id} className="border-t border-slate-200">
                              <td className="py-1.5 px-2 font-semibold text-slate-700">NF {i.numero_nf || "-"}</td>
                              <td className="py-1.5 px-2 text-center">{formatarDataSegura(i.data_faturamento)}</td>
                              <td className="py-1.5 px-2 text-center">
                                <BadgeTipo tipo={tipoDoGrupo(i.grupo_faturamento)} />
                              </td>
                              <td className="py-1.5 px-2">
                                <span className="text-slate-700">{i.grupo_faturamento}</span>
                                {descricaoGrupo.get(i.grupo_faturamento || "") && (
                                  <span className="text-slate-500"> · {descricaoGrupo.get(i.grupo_faturamento || "")}</span>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-emerald-700">
                                {formatarMoeda(valor(i))}
                              </td>
                              {podeEditar && <td className="py-1.5 px-2 text-center">{botaoExcluir(i)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NotaLinha({
  aberto,
  onAlternar,
  cabecalho,
  colunas,
  detalhe,
}: {
  aberto: boolean;
  onAlternar: () => void;
  cabecalho: React.ReactNode;
  colunas: number;
  detalhe: React.ReactNode;
}) {
  return (
    <>
      <tr onClick={onAlternar} className={`border-t cursor-pointer hover:bg-slate-50 ${aberto ? "bg-slate-50" : ""}`}>
        <td className="p-3 text-slate-400">
          {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </td>
        {cabecalho}
      </tr>
      {aberto && (
        <tr className="bg-slate-50/60">
          <td></td>
          <td colSpan={colunas} className="px-3 pb-3 pt-0">
            <div className="bg-white border rounded-lg px-3 py-2">{detalhe}</div>
          </td>
        </tr>
      )}
    </>
  );
}
