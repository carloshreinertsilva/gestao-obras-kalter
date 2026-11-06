import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

// Menu lateral em grupos (06/11/2026, pedido do Carlos - menu estava comprido demais).
// - Menu aberto: o titulo do grupo recolhe/abre os itens; o grupo da tela atual fica sempre aberto;
//   o que cada pessoa fechou fica guardado no navegador.
// - Menu recolhido (so icones, no computador): um icone por grupo, como os modulos do ERP; passar o mouse ou
//   clicar abre a lista do grupo ao lado (com uma pequena tolerancia para o mouse nao "escorregar" e fechar).
//   Grupo de um item so vai direto para a tela.
// A lista ao lado vai num portal no <body> (o menu tem transform/overflow, que cortariam a lista).
// - Celular: sempre a lista de grupos, abrindo/fechando por toque.

type Icone = ComponentType<{ size?: number; className?: string }>;

export interface ItemMenu {
  tela: string;
  rotulo: string;
  icone: Icone;
  ativo: boolean;
}

export interface GrupoMenu {
  id: string;
  titulo: string;
  icone: Icone;
  itens: ItemMenu[];
}

const CHAVE = "menu_grupos_fechados";
const ATRASO_FECHAR = 250;

function lerFechados(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "{}") || {};
  } catch {
    return {};
  }
}

function useDesktop() {
  const consulta = "(min-width: 768px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.(consulta).matches));
  useEffect(() => {
    const m = window.matchMedia?.(consulta);
    if (!m) return;
    const f = () => setDesktop(m.matches);
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, []);
  return desktop;
}

function BotaoItem({ item, onIr, compacto }: { item: ItemMenu; onIr: (tela: string) => void; compacto?: boolean }) {
  const I = item.icone;
  return (
    <button
      role={compacto ? "menuitem" : undefined}
      onClick={() => onIr(item.tela)}
      aria-current={item.ativo ? "page" : undefined}
      className={`w-full flex items-center gap-3 px-3 ${compacto ? "py-1.5" : "py-2"} rounded-lg transition text-left ${
        item.ativo ? "bg-white/20 text-white font-bold" : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <I size={compacto ? 18 : 20} className="shrink-0" />
      <span className="truncate">{item.rotulo}</span>
    </button>
  );
}

export function MenuGrupos({ grupos, recolhido, onIr }: { grupos: GrupoMenu[]; recolhido: boolean; onIr: (tela: string) => void }) {
  const desktop = useDesktop();
  const visiveis = grupos.filter((g) => g.itens.length > 0);
  const [fechados, setFechados] = useState<Record<string, boolean>>(lerFechados);
  const [flutuante, setFlutuante] = useState<{ id: string; top: number; left: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const alternar = (id: string) =>
    setFechados((f) => {
      const novo = { ...f, [id]: !f[id] };
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novo));
      } catch {
        /* navegador sem localStorage: so nao lembra */
      }
      return novo;
    });

  const cancelarFechar = () => window.clearTimeout(timer.current);
  const fecharDepois = () => {
    cancelarFechar();
    timer.current = window.setTimeout(() => setFlutuante(null), ATRASO_FECHAR);
  };
  const abrirFlutuante = (id: string, el: HTMLElement) => {
    cancelarFechar();
    const r = el.getBoundingClientRect();
    setFlutuante({ id, top: Math.max(8, Math.min(r.top - 6, window.innerHeight - 280)), left: r.right + 8 });
  };
  useEffect(() => () => cancelarFechar(), []);
  useEffect(() => {
    if (!flutuante) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFlutuante(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [flutuante]);
  useEffect(() => {
    if (!recolhido) setFlutuante(null);
  }, [recolhido]);

  const ir = (tela: string) => {
    setFlutuante(null);
    onIr(tela);
  };

  // ---------------- recolhido (computador): um icone por grupo + lista ao lado
  if (recolhido && desktop) {
    const aberto = visiveis.find((g) => g.id === flutuante?.id);
    return (
      <nav aria-label="Menu" className="px-2 mt-3 space-y-1">
        {visiveis.map((g) => {
          const I = g.icone;
          const ativo = g.itens.some((i) => i.ativo);
          const unico = g.itens.length === 1;
          return (
            <button
              key={g.id}
              aria-haspopup={unico ? undefined : "menu"}
              aria-expanded={unico ? undefined : flutuante?.id === g.id}
              aria-label={unico ? g.itens[0].rotulo : g.titulo}
              title={unico ? g.itens[0].rotulo : undefined}
              onMouseEnter={(e) => (unico ? setFlutuante(null) : abrirFlutuante(g.id, e.currentTarget))}
              onMouseLeave={fecharDepois}
              onClick={(e) =>
                unico ? ir(g.itens[0].tela) : flutuante?.id === g.id ? setFlutuante(null) : abrirFlutuante(g.id, e.currentTarget)
              }
              className={`w-full flex justify-center py-2.5 rounded-lg transition ${
                ativo ? "bg-white/20 text-white" : flutuante?.id === g.id ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <I size={20} />
            </button>
          );
        })}
        {aberto && flutuante && createPortal(
          <div
            role="menu"
            aria-label={aberto.titulo}
            onMouseEnter={cancelarFechar}
            onMouseLeave={fecharDepois}
            style={{ top: flutuante.top, left: flutuante.left }}
            className="fixed z-[60] w-56 bg-[#23566a] text-white rounded-xl shadow-2xl ring-1 ring-black/10 p-2"
          >
            {/* ponte invisivel entre o icone e a lista: o mouse atravessa sem fechar */}
            <div className="absolute -left-3 top-0 bottom-0 w-3" />
            <p className="text-[10px] uppercase text-white/50 font-bold tracking-wider px-3 pt-1 pb-2">{aberto.titulo}</p>
            <div className="space-y-0.5">
              {aberto.itens.map((i) => (
                <BotaoItem key={i.tela} item={i} onIr={ir} compacto />
              ))}
            </div>
          </div>,
          document.body,
        )}
      </nav>
    );
  }

  // ---------------- aberto (e celular): grupos com titulo que recolhe/abre
  return (
    <nav aria-label="Menu" className="px-4 mt-3 space-y-3">
      {visiveis.map((g) => {
        const temAtivo = g.itens.some((i) => i.ativo);
        const aberto = temAtivo || !fechados[g.id];
        return (
          <div key={g.id}>
            <button
              onClick={() => !temAtivo && alternar(g.id)}
              aria-expanded={aberto}
              title={temAtivo ? "Grupo da tela aberta" : aberto ? "Recolher" : "Abrir"}
              className={`w-full flex items-center justify-between text-[10px] uppercase font-bold tracking-wider py-1 mb-1 ${
                temAtivo ? "text-white/70 cursor-default" : "text-white/50 hover:text-white/80"
              }`}
            >
              <span>{g.titulo}</span>
              {!temAtivo && <ChevronDown size={14} className={`transition-transform ${aberto ? "" : "-rotate-90"}`} />}
            </button>
            {aberto && (
              <div className="space-y-1">
                {g.itens.map((i) => (
                  <BotaoItem key={i.tela} item={i} onIr={ir} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
