import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Truck } from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, formatarMoeda } from "./utils";
import { ctesDaObra, efetivo, situacaoDaVerba, type CteSefaz, type IdentificacaoCte } from "./calculoCteTransito";

// Fretes em transito no painel da obra (2026-11-24): os CT-es ja emitidos e ainda sem entrada no ERP que contam para
// esta obra, ao lado da verba de frete disponivel (frete_saldo). E a lista que explica o alerta "Frete em transito
// acima da verba" para quem gerencia a obra e nao tem a tela de Fretes. So leitura; sem CT-e, nao mostra nada.

const COLUNAS =
  "chave, numero, serie, emitido_em, sentido, transportadora_cnpj, transportadora_nome, remetente_nome, destinatario_nome, origem_nome, destino_nome, valor, cancelado, nr_ad, data_entrada, ligacao, pedidos, projetos, codigos_obra";
const SENTIDO: Record<CteSefaz["sentido"], string> = { compra: "Compra", venda: "Venda", outro: "Outro" };
const COR = {
  estoura: "bg-red-50 border-red-200 text-red-800",
  atencao: "bg-amber-50 border-amber-200 text-amber-900",
  cabe: "bg-emerald-50 border-emerald-200 text-emerald-800",
  sem_dado: "bg-slate-50 border-slate-200 text-slate-600",
} as const;

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function buscar(idObra: string): Promise<{ ctes: CteSefaz[]; saldo: number | null }> {
  // o banco ja devolve so o que este usuario pode ver; a obra e conferida aqui porque a identificacao manual pode mudar a obra
  const [{ data, error }, { data: ident }, { data: s, error: erroSaldo }] = await Promise.all([
    supabase.from("fretes_ctes_sefaz").select(COLUNAS).eq("cancelado", false).is("nr_ad", null).order("emitido_em").limit(500),
    supabase
      .from("fretes_ctes_identificacao")
      .select("chave, sentido, pedido, codigo_obra, fora_de_obra, observacao, nome_usuario, identificado_em")
      .limit(5000),
    supabase.rpc("frete_saldo", { p_id_obra: idObra, p_excluir: null }),
  ]);
  if (error) return { ctes: [], saldo: null };
  const manuais = new Map(((ident as unknown as IdentificacaoCte[]) || []).map((i) => [i.chave, i]));
  const ctes = ((data as unknown as CteSefaz[]) || []).map((c) => ({
    ...c,
    valor: Number(c.valor || 0),
    pedidos: c.pedidos || [],
    projetos: c.projetos || [],
    codigos_obra: c.codigos_obra || [],
    manual: manuais.get(c.chave) || null,
  }));
  return { ctes, saldo: erroSaldo || s === null ? null : Number(s) };
}

export function FretesTransitoDaObra({ idObra, codigoObra }: { idObra: string; codigoObra: string | null | undefined }) {
  const [dados, setDados] = useState<{ idObra: string; ctes: CteSefaz[]; saldo: number | null } | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    buscar(idObra)
      .then((r) => {
        if (vivo) setDados({ idObra, ...r });
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [idObra]);

  const atual = dados && dados.idObra === idObra ? dados : null;
  const { itens, total } = useMemo(
    () => (atual && codigoObra ? ctesDaObra(atual.ctes, codigoObra, hojeIso()) : { itens: [], total: 0 }),
    [atual, codigoObra],
  );
  if (!atual || !itens.length) return null;

  const saldo = atual.saldo;
  const sit = situacaoDaVerba(total, saldo);
  const verba =
    saldo === null
      ? "Verba de frete não disponível para comparar."
      : sit === "estoura"
        ? `Verba de frete disponível: ${formatarMoeda(saldo)} — faltam ${formatarMoeda(total - Math.max(saldo, 0))}.`
        : `Verba de frete disponível: ${formatarMoeda(saldo)} — sobram ${formatarMoeda(saldo - total)} depois destes fretes.`;

  return (
    <section aria-label="Fretes em trânsito da obra" className="mb-4 bg-white border rounded-xl shadow-sm">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-700 text-left"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Truck size={16} className={sit === "estoura" ? "text-red-600" : "text-[#2A6377]"} aria-hidden="true" />
          Fretes em trânsito: {itens.length} CT-e{itens.length > 1 ? "s" : ""} · {formatarMoeda(total)}
          {sit === "estoura" && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800">acima da verba</span>}
          {sit === "atencao" && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">perto do limite</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${aberto ? "" : "-rotate-90"}`} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="px-4 pb-3 space-y-2">
          <p className={`border rounded-lg px-3 py-2 text-sm ${COR[sit]}`}>{verba}</p>
          <ul className="divide-y border rounded-lg">
            {itens.map(({ cte: c, parte, outrasObras, dias }) => {
              const e = efetivo(c);
              const quem = (e.sentido === "compra" ? c.remetente_nome : e.sentido === "venda" ? c.destinatario_nome : null) || "";
              return (
                <li key={c.chave} className="px-3 py-2 text-sm flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-800">
                      CT-e {c.numero} · {c.transportadora_nome || c.transportadora_cnpj}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {SENTIDO[e.sentido]}
                      {quem ? ` · ${quem}` : ""}
                      {c.origem_nome || c.destino_nome ? ` · ${c.origem_nome || "?"} → ${c.destino_nome || "?"}` : ""}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Emitido em {formatarDataSegura(c.emitido_em)}
                      {e.pedidos.length > 0 && ` · pedido ${e.pedidos.join(", ")}`}
                    </span>
                  </span>
                  <span className="text-left sm:text-right shrink-0">
                    <span className="block font-bold tabular-nums text-slate-800">{formatarMoeda(parte)}</span>
                    {outrasObras.length > 0 && (
                      <span className="block text-xs text-slate-500">
                        de {formatarMoeda(c.valor)}, dividido com {outrasObras.join(", ")}
                      </span>
                    )}
                    <span className={`block text-xs font-semibold ${dias > 7 ? "text-red-700" : "text-blue-700"}`}>
                      sem entrada {dias === 0 ? "desde hoje" : `há ${dias} ${dias === 1 ? "dia" : "dias"}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500">
            CT-es em que a Kalter paga o frete, já emitidos e ainda não lançados no ERP. Verba disponível = previsões de frete em aberto (família
            .510) menos os fretes já liberados no app. Frete de várias obras é dividido em partes iguais.
          </p>
        </div>
      )}
    </section>
  );
}
