import { CheckSquare, FileInput, Package, Receipt, Truck, Wallet, CheckCircle2, type LucideIcon } from "lucide-react";

// "Minhas pendencias" (06/11/2026): o que esta esperando a pessoa logada, por modulo, vindo da RPC
// public.minhas_pendencias(). Aparece no topo do Dashboard e alimenta os contadores do menu.
export type Pendencias = Partial<
  Record<"tarefas" | "tarefas_atrasadas" | "materiais" | "faturamento" | "nfs_terceiros" | "previsoes" | "fretes", number>
>;

interface Item {
  chave: keyof Pendencias;
  tela: string;
  icone: LucideIcon;
  texto: (n: number, p: Pendencias) => string;
}

const ITENS: Item[] = [
  {
    chave: "tarefas",
    tela: "tarefas",
    icone: CheckSquare,
    texto: (n, p) =>
      `${n} tarefa${n > 1 ? "s" : ""} aberta${n > 1 ? "s" : ""}` +
      (p.tarefas_atrasadas ? ` · ${p.tarefas_atrasadas} atrasada${p.tarefas_atrasadas > 1 ? "s" : ""}` : ""),
  },
  { chave: "previsoes", tela: "solicitacoes_previsao", icone: Wallet, texto: (n) => `${n} ${n > 1 ? "previsões" : "previsão"} para aprovar` },
  { chave: "faturamento", tela: "faturamento", icone: Receipt, texto: (n) => `${n} ${n > 1 ? "solicitações" : "solicitação"} de faturamento com você` },
  { chave: "nfs_terceiros", tela: "nfs_terceiros", icone: FileInput, texto: (n) => `${n} NF${n > 1 ? "s" : ""} de terceiros com você` },
  { chave: "materiais", tela: "materiais", icone: Package, texto: (n) => `${n} ${n > 1 ? "solicitações" : "solicitação"} de material com você` },
  { chave: "fretes", tela: "fretes", icone: Truck, texto: (n) => `${n} frete${n > 1 ? "s" : ""} aguardando cotação` },
];

export function contadorDoMenu(p: Pendencias | null, tela: string): number | undefined {
  if (!p) return undefined;
  const item = ITENS.find((i) => i.tela === tela);
  const n = item ? Number(p[item.chave] || 0) : 0;
  return n > 0 ? n : undefined;
}

export function MinhasPendencias({ pendencias, onIr }: { pendencias: Pendencias | null; onIr: (tela: string) => void }) {
  if (!pendencias) return null;
  const itens = ITENS.filter((i) => Number(pendencias[i.chave] || 0) > 0);
  return (
    <section aria-label="Minhas pendências" className="bg-white rounded-xl border shadow-sm p-4 mb-6">
      <h3 className="text-sm font-bold text-slate-700 mb-3">Minhas pendências</h3>
      {itens.length === 0 ? (
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> Nada esperando por você agora.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {itens.map((i) => {
            const I = i.icone;
            const n = Number(pendencias[i.chave] || 0);
            const urgente = i.chave === "tarefas" && Number(pendencias.tarefas_atrasadas || 0) > 0;
            return (
              <button
                key={i.chave}
                type="button"
                onClick={() => onIr(i.tela)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition hover:shadow-sm ${
                  urgente ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100" : "bg-[#2A6377]/5 border-[#2A6377]/20 text-[#1e4857] hover:bg-[#2A6377]/10"
                }`}
              >
                <I size={16} className="shrink-0" /> {i.texto(n, pendencias)}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
