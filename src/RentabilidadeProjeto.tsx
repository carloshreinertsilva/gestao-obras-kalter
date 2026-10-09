import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { formatarMoeda } from "./utils";
import { supabase } from "./supabase";
import type { Obra, ObraRentabilidadeFamilia, Usuario } from "./types";
import GraficoRentabilidade from "./GraficoRentabilidade";
import { ModalSolicitarPrevisao, podeSolicitarPrevisao } from "./SolicitacoesPrevisao";

interface Props {
  familias: ObraRentabilidadeFamilia[];
  valorVendido: number;
  obra?: Obra | null;
  usuario?: Usuario | null;
}

type Coluna =
  | "codigo_projeto"
  | "custo_previsto"
  | "custo_realizado"
  | "requisicoes"
  | "pedidos_encerrados"
  | "pedidos_em_aberto"
  | "previsoes_em_aberto"
  | "previsoes_numeros"
  | "saldo_projetado";

const somar = (lista: ObraRentabilidadeFamilia[], campo: Coluna) =>
  lista.reduce((acc, f) => acc + Number(f[campo] || 0), 0);

const CelulaValor = ({
  valor,
  cor = "text-slate-800",
  negativoVermelho = false,
}: {
  valor: number;
  cor?: string;
  negativoVermelho?: boolean;
}) => (
  <td
    className={`px-2 py-3 text-right whitespace-nowrap font-semibold ${negativoVermelho && valor < 0 ? "text-red-600" : cor}`}
  >
    {formatarMoeda(valor)}
  </td>
);

export default function RentabilidadeProjeto({ familias, valorVendido, obra, usuario }: Props) {
  const [aba, setAba] = useState<"tabela" | "grafico">("tabela");
  const [solicitando, setSolicitando] = useState(false);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<{ coluna: Coluna; direcao: "asc" | "desc" }>({
    coluna: "codigo_projeto",
    direcao: "asc",
  });

  const alternarOrdenacao = (coluna: Coluna) =>
    setOrdenacao((atual) => ({
      coluna,
      direcao: atual.coluna === coluna && atual.direcao === "asc" ? "desc" : "asc",
    }));

  // Margem prevista do orcamento e venda sem impostos, vindas do ERP pelo robo (obras.margem_prevista_erp /
  // venda_sem_impostos_erp). E a mesma base do BI "Analise Margem e Rentabilidade" e da calculadora de
  // orcamento: % = margem / venda sem impostos (ex.: obra 2182 = 32,1%).
  const [margemErp, setMargemErp] = useState<{ margem: number; vendaSemImpostos: number } | null>(null);
  useEffect(() => {
    let ativo = true;
    setMargemErp(null);
    if (!obra?.id) return;
    supabase
      .from("obras")
      .select("margem_prevista_erp, venda_sem_impostos_erp")
      .eq("id", obra.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo || !data) return;
        const margem = Number(data.margem_prevista_erp || 0);
        const vendaSemImpostos = Number(data.venda_sem_impostos_erp || 0);
        if (margem !== 0 && vendaSemImpostos > 0) setMargemErp({ margem, vendaSemImpostos });
      });
    return () => {
      ativo = false;
    };
  }, [obra?.id]);

  const obraRow = useMemo(() => familias.find((f) => f.eh_obra) || null, [familias]);
  // Familia sem nenhum valor (previsto, realizado ou em aberto) nao entra na tela - so
  // ocupa espaco. Nao altera nenhum total, ja que todos os campos dela sao zero.
  const familiasLista = useMemo(
    () =>
      familias.filter(
        (f) =>
          !f.eh_obra &&
          [f.custo_previsto, f.custo_realizado, f.previsoes_em_aberto, f.pedidos_em_aberto].some(
            (v) => Math.abs(Number(v || 0)) >= 0.005,
          ),
      ),
    [familias],
  );

  const panorama = useMemo(() => {
    // Custo Previsto vem da SOMA das familias, nao do campo "topo" do ERP
    // (cpj_valor_projeto da linha-obra): em tese os dois deveriam bater, mas o
    // cadastro no ERP pode ficar dessincronizado (familia reorcada sem atualizar o
    // total, ou vice-versa) - a soma das familias e o valor confiavel e verificavel,
    // e bate com a tabela detalhada logo abaixo.
    const custoPrevisto = somar(familiasLista, "custo_previsto");
    const custoRealizado = somar(familias, "custo_realizado");
    const previsoesEmAberto = somar(familias, "previsoes_em_aberto");
    const resultadoProjetado = custoPrevisto - custoRealizado - previsoesEmAberto;
    // Com a margem do orcamento no ERP: % sobre a venda sem impostos (regra do BI / calculadora).
    // Sem ela (obra sem margem cadastrada ou pedido sem venda sem impostos): regra antiga, venda - custo.
    const baseErp = margemErp !== null;
    const margemOriginal = baseErp ? margemErp.margem : valorVendido - custoPrevisto;
    const margemAtual = margemOriginal + resultadoProjetado;
    const base = baseErp ? margemErp.vendaSemImpostos : valorVendido;
    const rentabilidadeOriginal = base > 0 ? (margemOriginal / base) * 100 : 0;
    const rentabilidadeAtual = base > 0 ? (margemAtual / base) * 100 : 0;
    return {
      custoPrevisto,
      custoRealizado,
      previsoesEmAberto,
      resultadoProjetado,
      baseErp,
      margemOriginal,
      margemAtual,
      rentabilidadeOriginal,
      rentabilidadeAtual,
      delta: rentabilidadeAtual - rentabilidadeOriginal,
    };
  }, [familias, familiasLista, valorVendido, margemErp]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return [...familiasLista]
      .filter(
        (f) =>
          !termo ||
          (f.codigo_projeto || "").toLowerCase().includes(termo) ||
          (f.descricao || "").toLowerCase().includes(termo) ||
          (f.previsoes_numeros || "").toLowerCase().includes(termo),
      )
      .sort((a, b) => {
        const va = a[ordenacao.coluna];
        const vb = b[ordenacao.coluna];
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va ?? "").localeCompare(String(vb ?? ""), "pt-BR", { numeric: true });
        return ordenacao.direcao === "asc" ? cmp : -cmp;
      });
  }, [familiasLista, busca, ordenacao]);

  const totais = useMemo(
    () => ({
      custo_previsto: somar(filtradas, "custo_previsto"),
      custo_realizado: somar(filtradas, "custo_realizado"),
      requisicoes: somar(filtradas, "requisicoes"),
      pedidos_encerrados: somar(filtradas, "pedidos_encerrados"),
      pedidos_em_aberto: somar(filtradas, "pedidos_em_aberto"),
      previsoes_em_aberto: somar(filtradas, "previsoes_em_aberto"),
      saldo_projetado: somar(filtradas, "saldo_projetado"),
    }),
    [filtradas],
  );

  const exportarExcel = () => {
    const cabecalho = [
      "Família - Descrição",
      "Custo Previsto",
      "Custo Realizado",
      "Requisições",
      "Pedidos Encerrados",
      "Pedidos em Aberto",
      "Previsões em Aberto",
      "Nº Previsão",
      "Saldo Projetado",
    ];
    const linhas = filtradas.map((f) => [
      `${f.codigo_projeto} - ${f.descricao || ""}`,
      f.custo_previsto ?? 0,
      f.custo_realizado ?? 0,
      f.requisicoes ?? 0,
      f.pedidos_encerrados ?? 0,
      f.pedidos_em_aberto ?? 0,
      f.previsoes_em_aberto ?? 0,
      f.previsoes_numeros ?? "",
      f.saldo_projetado ?? 0,
    ]);
    const escapar = (valor: any) => `"${String(valor).replace(/"/g, '""')}"`;
    const csv = [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentabilidade_projeto_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const Cab = ({ rotulo, coluna, alinhar = "right" }: { rotulo: string; coluna: Coluna; alinhar?: "left" | "right" | "center" }) => (
    <th className={`px-2 py-3 align-bottom leading-tight ${alinhar === "left" ? "text-left" : alinhar === "center" ? "text-center" : "text-right"}`}>
      <button
        onClick={() => alternarOrdenacao(coluna)}
        className={`hover:text-[#2A6377] transition ${ordenacao.coluna === coluna ? "text-[#2A6377]" : ""}`}
      >
        {rotulo}
        {ordenacao.coluna === coluna ? (ordenacao.direcao === "asc" ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  if (!obraRow && familiasLista.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border text-center text-slate-500">
        Sem dados de rentabilidade importados do ERP para esta obra.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">Valor Vendido</p>
          <p className="text-2xl font-bold text-slate-800">{formatarMoeda(valorVendido)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">Custo Previsto</p>
          <p className="text-2xl font-bold text-slate-800">{formatarMoeda(panorama.custoPrevisto)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">Custo Realizado</p>
          <p className="text-2xl font-bold text-blue-700">{formatarMoeda(panorama.custoRealizado)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">Previsões em Aberto</p>
          <p className="text-2xl font-bold text-amber-700">{formatarMoeda(panorama.previsoesEmAberto)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <p className="text-xs text-slate-400 font-bold uppercase">Resultado Projetado</p>
          <p className={`text-2xl font-bold ${panorama.resultadoProjetado < 0 ? "text-red-600" : "text-emerald-700"}`}>
            {formatarMoeda(panorama.resultadoProjetado)}
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <p className="text-xs text-slate-400 font-bold uppercase mb-3">
          {panorama.baseErp ? "Margem sobre a venda sem impostos" : "Rentabilidade sobre o valor vendido"}
        </p>
        <div className="flex flex-wrap items-end gap-8">
          <div>
            <p className="text-[11px] text-slate-400">
              {panorama.baseErp ? "Prevista (margem do orçamento no ERP)" : "Original (venda − custo previsto)"}
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {panorama.rentabilidadeOriginal.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </p>
            <p className="text-[11px] text-slate-500">{formatarMoeda(panorama.margemOriginal)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">
              {panorama.baseErp ? "Atual (margem prevista + resultado projetado)" : "Atual (venda − realizado − previsões)"}
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {panorama.rentabilidadeAtual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </p>
            <p className="text-[11px] text-slate-500">{formatarMoeda(panorama.margemAtual)}</p>
          </div>
          <div
            className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-lg ${panorama.delta < 0 ? "text-red-700 bg-red-50" : "text-emerald-700 bg-emerald-50"}`}
          >
            {panorama.delta < 0 ? "▼" : "▲"}{" "}
            {Math.abs(panorama.delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Estimativa: considera o que já foi realizado e comprometido (pedidos + previsões de
          pagamento) no lugar do orçamento original.
          {panorama.baseErp
            ? " Margem prevista = contribuição + rentabilidade do orçamento no ERP; % sobre a venda sem impostos."
            : " Obra sem margem de orçamento cadastrada no ERP: % calculado como venda − custo sobre o valor vendido."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border overflow-hidden text-sm bg-white">
          {(
            [
              ["tabela", "Tabela"],
              ["grafico", "Gráfico"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setAba(valor)}
              className={`px-4 py-1.5 font-semibold transition ${aba === valor ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {obra && podeSolicitarPrevisao(usuario) && (
          <button
            onClick={() => setSolicitando(true)}
            className="bg-[#2A6377] text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1e4857]"
          >
            <Plus size={16} /> Solicitar previsão
          </button>
        )}
      </div>

      {solicitando && obra && (
        <ModalSolicitarPrevisao
          obra={obra}
          familias={familias}
          usuario={usuario || null}
          onFechar={() => setSolicitando(false)}
        />
      )}

      {aba === "grafico" && (
        <GraficoRentabilidade familias={familiasLista} />
      )}

      {aba === "tabela" && (
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">Rentabilidade por Família</h3>
              <p className="text-xs text-slate-400 mt-1">
                Custo previsto x realizado por família, importado do ERP. Somente leitura -
                ajustes são feitos lá, não neste sistema.
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
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar família..."
              className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-[13px] 2xl:text-sm min-w-[820px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Cab rotulo="Família - Descrição" coluna="codigo_projeto" alinhar="left" />
                <Cab rotulo="Custo Previsto" coluna="custo_previsto" />
                <Cab rotulo="Custo Realizado" coluna="custo_realizado" />
                <Cab rotulo="Requisições" coluna="requisicoes" />
                <Cab rotulo="Pedidos Encerrados" coluna="pedidos_encerrados" />
                <Cab rotulo="Pedidos em Aberto" coluna="pedidos_em_aberto" />
                <Cab rotulo="Previsões em Aberto" coluna="previsoes_em_aberto" />
                <Cab rotulo="Nº Previsão" coluna="previsoes_numeros" alinhar="center" />
                <Cab rotulo="Saldo Projetado" coluna="saldo_projetado" />
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-500">
                    Nenhuma família encontrada.
                  </td>
                </tr>
              ) : (
                filtradas.map((f) => (
                  <tr key={f.id} className="border-t hover:bg-slate-50">
                    <td className="px-2 py-3 text-slate-700 min-w-[150px]">
                      {f.codigo_projeto} - {f.descricao}
                    </td>
                    <CelulaValor valor={Number(f.custo_previsto || 0)} />
                    <CelulaValor valor={Number(f.custo_realizado || 0)} />
                    <CelulaValor valor={Number(f.requisicoes || 0)} cor="text-blue-700" />
                    <CelulaValor valor={Number(f.pedidos_encerrados || 0)} cor="text-blue-700" />
                    <CelulaValor valor={Number(f.pedidos_em_aberto || 0)} cor="text-blue-700" />
                    <CelulaValor valor={Number(f.previsoes_em_aberto || 0)} cor="text-blue-700" />
                    <td
                      className="px-2 py-3 text-center text-slate-700 font-semibold whitespace-nowrap"
                      title={f.previsoes_numeros ? `Previsão(ões) em aberto: ${f.previsoes_numeros}` : undefined}
                    >
                      {f.previsoes_numeros || ""}
                    </td>
                    <CelulaValor valor={Number(f.saldo_projetado || 0)} negativoVermelho />
                  </tr>
                ))
              )}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-slate-50 font-bold">
                  <td className="px-2 py-3 text-slate-700">Soma</td>
                  <CelulaValor valor={totais.custo_previsto} />
                  <CelulaValor valor={totais.custo_realizado} />
                  <CelulaValor valor={totais.requisicoes} cor="text-blue-700" />
                  <CelulaValor valor={totais.pedidos_encerrados} cor="text-blue-700" />
                  <CelulaValor valor={totais.pedidos_em_aberto} cor="text-blue-700" />
                  <CelulaValor valor={totais.previsoes_em_aberto} cor="text-blue-700" />
                  <td className="px-2 py-3" />
                  <CelulaValor valor={totais.saldo_projetado} negativoVermelho />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
