import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "./supabase";
import { exportarCsv, formatarMoeda } from "./utils";
import { BotaoExportar, numCsv } from "./modulos_lista";
import { consumoDaVerba, situacaoDaVerba, transitoPorObra, type CteSefaz, type SituacaoVerba, type TransitoDaObra } from "./calculoCteTransito";

// Visao "Por obra" da aba Em transito (2026-11-24): soma dos CT-es ainda sem entrada no ERP por obra, ao lado da verba
// de frete disponivel (familia .510: previsoes em aberto menos os fretes liberados no app - funcao frete_saldo).
// CT-e de varias obras e dividido em partes iguais. So leitura.

interface DadosObra {
  nome: string;
  /** null = obra fora do app, sem acesso ou falha na consulta. */
  saldo: number | null;
}

const COR: Record<SituacaoVerba, { barra: string; texto: string; rotulo: string }> = {
  estoura: { barra: "bg-red-500", texto: "text-red-700", rotulo: "Não cabe na verba" },
  atencao: { barra: "bg-amber-500", texto: "text-amber-700", rotulo: "Verba quase no fim" },
  cabe: { barra: "bg-emerald-500", texto: "text-emerald-700", rotulo: "Cabe na verba" },
  sem_dado: { barra: "bg-slate-300", texto: "text-slate-500", rotulo: "Sem verba para comparar" },
};
const ORDEM: SituacaoVerba[] = ["estoura", "atencao", "cabe", "sem_dado"];

// nome e verba disponivel de cada obra da lista (as que existem no app e que a pessoa pode consultar)
async function buscarDados(codigos: string[]): Promise<Map<string, DadosObra>> {
  const mapa = new Map<string, DadosObra>();
  if (!codigos.length) return mapa;
  const { data } = await supabase.from("obras").select("id, codigo_externo, nome").in("codigo_externo", codigos);
  const obras = (data as { id: string; codigo_externo: string; nome: string | null }[]) || [];
  await Promise.all(
    obras.map(async (o) => {
      const { data: s, error } = await supabase.rpc("frete_saldo", { p_id_obra: o.id, p_excluir: null });
      mapa.set(o.codigo_externo, { nome: o.nome || "", saldo: error || s === null ? null : Number(s) });
    }),
  );
  return mapa;
}

function Barra({ transito, saldo }: { transito: number; saldo: number | null }) {
  const sit = situacaoDaVerba(transito, saldo);
  const pct = Math.round(consumoDaVerba(transito, saldo) * 100);
  return (
    <div>
      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={sit === "sem_dado" ? COR[sit].rotulo : `${COR[sit].rotulo}: o frete em trânsito usa ${pct}% da verba disponível`}
      >
        <div className={`h-full rounded-full ${COR[sit].barra}`} style={{ width: `${sit === "sem_dado" ? 0 : Math.max(pct, 3)}%` }} />
      </div>
      <p className={`text-xs mt-1 font-semibold ${COR[sit].texto}`}>
        {COR[sit].rotulo}
        {sit !== "sem_dado" && saldo !== null && saldo > 0 ? ` · ${pct >= 100 && sit === "estoura" ? "mais de 100" : pct}%` : ""}
      </p>
    </div>
  );
}

const Rateio = ({ o }: { o: TransitoDaObra }) =>
  o.rateados > 0 ? (
    <span className="block text-xs text-slate-500">
      {o.rateados === 1 ? "1 dividido" : `${o.rateados} divididos`} com outra obra
    </span>
  ) : null;

export function FretesTransitoPorObra({
  ctes,
  hoje,
  onVerObra,
  onVerSemObra,
}: {
  ctes: CteSefaz[];
  hoje: string;
  onVerObra: (codigo: string) => void;
  onVerSemObra: () => void;
}) {
  const soma = useMemo(() => transitoPorObra(ctes, hoje), [ctes, hoje]);
  const codigos = useMemo(() => soma.obras.map((o) => o.codigo), [soma]);
  const chave = codigos.join(",");
  const [dados, setDados] = useState<{ chave: string; mapa: Map<string, DadosObra> } | null>(null);

  useEffect(() => {
    let vivo = true;
    buscarDados(chave ? chave.split(",") : []).then((mapa) => vivo && setDados({ chave, mapa }));
    return () => {
      vivo = false;
    };
  }, [chave]);

  const carregando = dados?.chave !== chave;
  const saldoDe = (codigo: string) => (carregando ? null : (dados?.mapa.get(codigo)?.saldo ?? null));
  const nomeDe = (codigo: string) => dados?.mapa.get(codigo)?.nome || "";
  const foraDoApp = (codigo: string) => !carregando && !dados?.mapa.has(codigo);

  // pior caso primeiro: o que nao cabe, depois o que esta no limite; dentro de cada grupo, maior valor em transito
  const linhas = useMemo(() => {
    const pos = (o: TransitoDaObra) => ORDEM.indexOf(situacaoDaVerba(o.valor, carregando ? null : (dados?.mapa.get(o.codigo)?.saldo ?? null)));
    return [...soma.obras].sort((a, b) => pos(a) - pos(b) || b.valor - a.valor);
  }, [soma, dados, carregando]);
  const estouram = linhas.filter((o) => situacaoDaVerba(o.valor, saldoDe(o.codigo)) === "estoura").length;

  const exportar = () =>
    exportarCsv(
      "fretes_em_transito_por_obra",
      ["Obra", "Nome", "CT-es", "Divididos com outra obra", "Em trânsito", "Verba de frete disponível", "Sobra", "Situação", "CT-e mais antigo (dias)"],
      [
        ...linhas.map((o) => {
          const saldo = saldoDe(o.codigo);
          return [o.codigo, nomeDe(o.codigo), o.quantidade, o.rateados, numCsv(o.valor), saldo === null ? "" : numCsv(saldo),
            saldo === null ? "" : numCsv(saldo - o.valor), COR[situacaoDaVerba(o.valor, saldo)].rotulo, o.diasMaisAntigo];
        }),
        ["Sem obra identificada", "", soma.semObra.quantidade, "", numCsv(soma.semObra.valor), "", "", "", ""],
        ["Não é de obra", "", soma.foraDeObra.quantidade, "", numCsv(soma.foraDeObra.valor), "", "", "", ""],
      ],
    );

  return (
    <div className="bg-white border rounded-xl">
      <div className="p-3 border-b flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-600">
          {linhas.length === 0
            ? "Nenhuma obra com frete em trânsito."
            : `${linhas.length} ${linhas.length === 1 ? "obra" : "obras"} com frete em trânsito`}
          {estouram > 0 && (
            <span className="text-red-700 font-semibold">
              {" "}
              · {estouram} {estouram === 1 ? "não cabe" : "não cabem"} na verba
            </span>
          )}
        </p>
        <div className="ml-auto">
          <BotaoExportar onClick={exportar} disabled={!linhas.length && !soma.semObra.quantidade} />
        </div>
      </div>

      {/* celular: cartoes */}
      <ul className="md:hidden divide-y">
        {linhas.map((o) => {
          const saldo = saldoDe(o.codigo);
          return (
            <li key={o.codigo}>
              <button type="button" onClick={() => onVerObra(o.codigo)} className="w-full text-left px-3 py-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[#2A6377]">
                    {o.codigo} <span className="text-slate-700 font-semibold">{nomeDe(o.codigo)}</span>
                  </p>
                  <span className="font-bold tabular-nums whitespace-nowrap">{formatarMoeda(o.valor)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {o.quantidade} {o.quantidade === 1 ? "CT-e" : "CT-es"}
                  {o.rateados > 0 ? ` (${o.rateados} dividido${o.rateados === 1 ? "" : "s"} com outra obra)` : ""} · verba disponível{" "}
                  {carregando ? "…" : saldo === null ? "—" : formatarMoeda(saldo)}
                </p>
                <div className="mt-2">
                  <Barra transito={o.valor} saldo={saldo} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* computador: tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Obra</th>
              <th className="px-3 py-2 text-right">CT-es</th>
              <th className="px-3 py-2 text-right">Em trânsito</th>
              <th className="px-3 py-2 text-right">Verba disponível</th>
              <th className="px-3 py-2 text-right">Sobra</th>
              <th className="px-3 py-2 text-left w-56">Uso da verba</th>
              <th className="px-3 py-2" aria-label="Abrir" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((o) => {
              const saldo = saldoDe(o.codigo);
              const sobra = saldo === null ? null : saldo - o.valor;
              return (
                <tr key={o.codigo} className="border-t align-top hover:bg-slate-50 cursor-pointer" onClick={() => onVerObra(o.codigo)}>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-[#2A6377]">{o.codigo}</span> <span className="text-slate-700">{nomeDe(o.codigo)}</span>
                    {foraDoApp(o.codigo) && <span className="block text-xs text-slate-500">Obra fora do app ou sem acesso à verba</span>}
                    {o.diasMaisAntigo > 7 && <span className="block text-xs text-red-600">CT-e mais antigo há {o.diasMaisAntigo} dias</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {o.quantidade}
                    <Rateio o={o} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold whitespace-nowrap">{formatarMoeda(o.valor)}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{carregando ? "…" : saldo === null ? "—" : formatarMoeda(saldo)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums whitespace-nowrap ${sobra !== null && sobra < 0 ? "text-red-700 font-semibold" : ""}`}>
                    {carregando ? "…" : sobra === null ? "—" : formatarMoeda(sobra)}
                  </td>
                  <td className="px-3 py-2">
                    <Barra transito={o.valor} saldo={saldo} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" aria-label={`Ver os CT-es da obra ${o.codigo}`} className="text-slate-400 hover:text-[#2A6377]">
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t divide-y text-sm">
        {soma.semObra.quantidade > 0 && (
          <button type="button" onClick={onVerSemObra} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-amber-50">
            <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
              <AlertTriangle size={14} aria-hidden="true" /> Sem obra identificada · {soma.semObra.quantidade}{" "}
              {soma.semObra.quantidade === 1 ? "CT-e" : "CT-es"}
            </span>
            <span className="inline-flex items-center gap-1 font-bold tabular-nums text-amber-800">
              {formatarMoeda(soma.semObra.valor)} <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        )}
        {soma.foraDeObra.quantidade > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-slate-500">
            <span>
              Não é de obra · {soma.foraDeObra.quantidade} {soma.foraDeObra.quantidade === 1 ? "CT-e" : "CT-es"}
            </span>
            <span className="tabular-nums">{formatarMoeda(soma.foraDeObra.valor)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 rounded-b-xl">
          <span className="font-bold text-slate-700">Total em trânsito</span>
          <span className="font-bold tabular-nums">{formatarMoeda(soma.total)}</span>
        </div>
      </div>
    </div>
  );
}
