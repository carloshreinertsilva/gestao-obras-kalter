import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, FileInput, Package, Receipt, Send, Truck, Undo2, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "./supabase";
import {
  LINHAS_INICIAIS,
  MODULOS,
  agruparPedidos,
  diasParado,
  estaParado,
  limitarGrupos,
  telaDoModulo,
  textoHa,
  type PedidoAndamento,
} from "./calculoMeusPedidos";

// "Meus pedidos em andamento" (Pacote 4 / B7, 16/11/2026): o outro lado de "Minhas pendencias" - o que a pessoa
// logada PEDIU e ainda esta com outra area (RPC meus_pedidos_andamento). Busca ao montar e quando a aba do
// navegador volta a ficar visivel (o App re-renderiza a cada 60 s; isso nao refaz a consulta).
// Nada em andamento (ou falha ao buscar) = nao ocupa espaco.

const ICONE: Record<string, LucideIcon> = {
  solicitacoes_previsao: Wallet,
  faturamento: Receipt,
  nfs_terceiros: FileInput,
  materiais: Package,
  fretes: Truck,
  com_voce: Undo2,
};

const rotuloModulo = (modulo: string) => MODULOS.find((m) => m.modulo === modulo)?.rotulo || "Pedido";

export default function MeusPedidos({
  onIr,
  onAbrirPedido,
}: {
  onIr: (tela: string) => void;
  onAbrirPedido?: (modulo: string, id: string) => void;
}) {
  const [pedidos, setPedidos] = useState<PedidoAndamento[] | null>(null);
  const [todos, setTodos] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("meus_pedidos_andamento");
    // falha: mantem a ultima lista (ou nada) - o resto do Painel segue normal
    if (!error) setPedidos((data as PedidoAndamento[]) || []);
  }, []);

  useEffect(() => {
    carregar();
    const aoVoltar = () => {
      if (document.visibilityState === "visible") carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [carregar]);

  if (!pedidos || pedidos.length === 0) return null;

  const grupos = agruparPedidos(pedidos);
  const visiveis = todos ? grupos : limitarGrupos(grupos, LINHAS_INICIAIS);
  const parados = pedidos.filter((p) => estaParado(p)).length;

  const abrir = (p: PedidoAndamento) => {
    if (onAbrirPedido) onAbrirPedido(p.modulo, p.id);
    else onIr(telaDoModulo(p.modulo));
  };

  return (
    <section aria-label="Meus pedidos em andamento" className="bg-white rounded-xl border shadow-sm p-4 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Send size={15} className="text-petroleo" aria-hidden="true" /> Meus pedidos em andamento
        </h3>
        <p className="text-xs text-slate-500">
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
          {parados > 0 && (
            <span className="text-red-700 font-semibold">
              {" "}
              · {parados} parado{parados > 1 ? "s" : ""} há mais de 5 dias úteis
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {visiveis.map((g) => {
          const Icone = ICONE[g.chave] || Send;
          const comVoce = g.chave === "com_voce";
          return (
            <div key={g.chave}>
              <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${comVoce ? "text-red-700" : "text-slate-500"}`}>
                <Icone size={13} aria-hidden="true" /> {g.rotulo}
              </p>
              <ul className="divide-y border rounded-lg">
                {g.itens.map((p) => {
                  const dias = diasParado(p);
                  const parado = estaParado(p);
                  return (
                    <li key={`${p.modulo}:${p.id}`}>
                      <button
                        type="button"
                        onClick={() => abrir(p)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-slate-50 ${comVoce ? "bg-red-50/40" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800 truncate" title={p.titulo}>
                            {p.titulo}
                          </span>
                          <span className="block text-xs text-slate-500 truncate">
                            {comVoce && <>{rotuloModulo(p.modulo)} · </>}
                            {p.codigo_obra && <>Obra {p.codigo_obra} · </>}
                            {p.status_rotulo}
                            {" · "}
                            <span className={comVoce ? "text-red-700 font-semibold" : "text-slate-700"}>
                              {comVoce ? "voltou para você corrigir" : `com ${p.com_quem}`}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-xs whitespace-nowrap flex items-center gap-1 ${parado ? "text-red-700 font-semibold" : "text-slate-500"}`}
                          title={p.desde ? `Nesta etapa desde ${new Date(p.desde).toLocaleDateString("pt-BR")}` : undefined}
                        >
                          {parado && <AlertTriangle size={12} aria-hidden="true" />}
                          {textoHa(dias)}
                          {parado && <span className="sr-only sm:not-sr-only"> · parado</span>}
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {pedidos.length > LINHAS_INICIAIS && (
        <button type="button" onClick={() => setTodos((v) => !v)} className="mt-3 text-sm font-semibold text-petroleo hover:underline">
          {todos ? "Mostrar menos" : `Ver todos (${pedidos.length})`}
        </button>
      )}
    </section>
  );
}
