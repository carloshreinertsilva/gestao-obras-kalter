// Aviso (toast) de sucesso / erro / informacao para o app todo.
//
// Uso nos componentes:
//   const aviso = useAviso();
//   aviso.sucesso("NF 1234 encaminhada ao financeiro.");
//   aviso.erro("Não foi possível salvar: " + msg);
//
// Fora de componentes (ou no App.tsx sem hook): import { avisar } from "./aviso";
//   avisar.sucesso("..."), avisar.erro("..."), avisar.info("...")
//
// Sucesso e info somem em ~5 s; erro fica ate a pessoa fechar.
// No celular aparece em cima e centralizado (nao cobre os botoes dos modais); no computador,
// embaixo a direita.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type TipoAviso = "sucesso" | "erro" | "info";

export interface ItemAviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

export interface ApiAviso {
  /** Mostra um aviso; devolve o id (para fechar antes, se quiser). */
  mostrar: (tipo: TipoAviso, texto: string) => number;
  sucesso: (texto: string) => number;
  erro: (texto: string) => number;
  info: (texto: string) => number;
  fechar: (id: number) => void;
}

const DURACAO_MS = 5000;
const MAX_VISIVEIS = 4;

// ---------------------------------------------------------------------------------------------
// Ponte global: o provider registra aqui a funcao que mostra o aviso. Assim `avisar` funciona
// em qualquer lugar (App.tsx, funcoes fora de componente). Antes do provider montar, os avisos
// ficam guardados e aparecem quando ele montar.
type Despachante = (tipo: TipoAviso, texto: string) => number;
let despachante: Despachante | null = null;
const pendentes: { tipo: TipoAviso; texto: string }[] = [];
let proximoIdPendente = -1;

function despachar(tipo: TipoAviso, texto: string): number {
  if (despachante) return despachante(tipo, texto);
  pendentes.push({ tipo, texto });
  return proximoIdPendente--;
}

let fecharGlobal: ((id: number) => void) | null = null;

/** Mostra avisos de qualquer lugar do app (inclusive fora de componentes React). */
export const avisar: ApiAviso = {
  mostrar: despachar,
  sucesso: (t) => despachar("sucesso", t),
  erro: (t) => despachar("erro", t),
  info: (t) => despachar("info", t),
  fechar: (id) => fecharGlobal?.(id),
};

const ContextoAviso = createContext<ApiAviso>(avisar);

/** Hook para mostrar avisos. Funciona mesmo sem provider (cai na ponte global). */
export function useAviso(): ApiAviso {
  return useContext(ContextoAviso);
}

const ESTILO: Record<TipoAviso, { caixa: string; icone: string; Icone: typeof Info; rotulo: string }> = {
  sucesso: { caixa: "border-emerald-200 bg-emerald-50 text-emerald-900", icone: "text-emerald-600", Icone: CheckCircle2, rotulo: "Sucesso" },
  erro: { caixa: "border-red-200 bg-red-50 text-red-900", icone: "text-red-600", Icone: AlertTriangle, rotulo: "Erro" },
  info: { caixa: "border-[#2A6377]/30 bg-white text-slate-800", icone: "text-[#2A6377]", Icone: Info, rotulo: "Aviso" },
};

function Toast({ item, onFechar }: { item: ItemAviso; onFechar: (id: number) => void }) {
  const { caixa, icone, Icone, rotulo } = ESTILO[item.tipo];
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (item.tipo === "erro" || pausado) return;
    const t = window.setTimeout(() => onFechar(item.id), DURACAO_MS);
    return () => window.clearTimeout(t);
  }, [item.id, item.tipo, pausado, onFechar]);
  return (
    <div
      className={`pointer-events-auto w-full flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 text-sm ${caixa}`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <Icone size={20} className={`shrink-0 mt-0.5 ${icone}`} aria-hidden="true" />
      <p className="flex-1 min-w-0 break-words leading-snug">
        <span className="sr-only">{rotulo}: </span>
        {item.texto}
      </p>
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => onFechar(item.id)}
        className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 transition"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemAviso[]>([]);
  const seq = useRef(1);

  const fechar = useCallback((id: number) => setItens((l) => l.filter((i) => i.id !== id)), []);

  const mostrar = useCallback((tipo: TipoAviso, texto: string) => {
    const id = seq.current++;
    setItens((l) => {
      // mesmo texto ja na tela: troca pelo novo (nao empilha repetido)
      const sem = l.filter((i) => !(i.tipo === tipo && i.texto === texto));
      return [...sem, { id, tipo, texto }].slice(-MAX_VISIVEIS);
    });
    return id;
  }, []);

  useEffect(() => {
    despachante = mostrar;
    fecharGlobal = fechar;
    while (pendentes.length) {
      const p = pendentes.shift()!;
      mostrar(p.tipo, p.texto);
    }
    return () => {
      if (despachante === mostrar) despachante = null;
      if (fecharGlobal === fechar) fecharGlobal = null;
    };
  }, [mostrar, fechar]);

  const api = useMemo<ApiAviso>(
    () => ({
      mostrar,
      sucesso: (t) => mostrar("sucesso", t),
      erro: (t) => mostrar("erro", t),
      info: (t) => mostrar("info", t),
      fechar,
    }),
    [mostrar, fechar],
  );

  return (
    <ContextoAviso.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed z-[210] flex flex-col gap-2 left-1/2 -translate-x-1/2 top-3 w-[calc(100%-1.5rem)] max-w-sm md:left-auto md:translate-x-0 md:top-auto md:right-4 md:bottom-4 md:w-96 md:max-w-none"
      >
        {itens.map((i) => (
          <Toast key={i.id} item={i} onFechar={fechar} />
        ))}
      </div>
    </ContextoAviso.Provider>
  );
}
