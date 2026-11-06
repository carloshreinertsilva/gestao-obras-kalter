// Dialogos do app no lugar de window.prompt / window.confirm / window.alert.
//
// API por promessa (precisa do <DialogosProvider> em volta do app - ja esta no main.tsx):
//   const { pedirMotivo, confirmar } = useDialogos();
//   const motivo = await pedirMotivo({ titulo: "Motivo da devolução", motivosRapidos: ["Falta anexo"] });
//   if (motivo === null) return;            // cancelou
//   const ok = await confirmar({ titulo: "Cancelar a solicitação?", rotuloConfirmar: "Cancelar solicitação", perigo: true });
//   if (!ok) return;
//
// Fora de componentes (ou no App.tsx sem hook) ha as funcoes soltas `pedirMotivo`, `confirmar`
// e `informar` (este no lugar do alert), com a mesma assinatura.
//
// Os componentes <DialogoMotivo> e <DialogoConfirmar> tambem podem ser usados direto
// (controlados), e <ErroCarga onTentar> mostra "Não foi possível carregar. [Tentar de novo]".
//
// Convivencia com src/teclado.ts: o fundo do dialogo leva data-confirmacao (o Esc global e o
// aviso de rascunho ignoram) e o proprio dialogo trata Esc (cancela) antes de todo mundo.
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

// ---------------------------------------------------------------------------------------------
// Moldura comum: fundo + caixa (bottom-sheet no celular, centralizada no computador)

const FOCAVEIS = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Moldura({
  titulo,
  onCancelar,
  children,
  rodape,
  alerta = false,
  idDescricao,
}: {
  titulo: string;
  onCancelar: () => void;
  children?: ReactNode;
  rodape: ReactNode;
  alerta?: boolean;
  idDescricao?: string;
}) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef(onCancelar);
  useEffect(() => {
    cancelarRef.current = onCancelar;
  }, [onCancelar]);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    // foco: primeiro campo; se nao houver, o botao marcado com data-foco-inicial; senao o 1o botao
    const el = caixa.current;
    const alvo =
      el?.querySelector<HTMLElement>("textarea, input, select") ||
      el?.querySelector<HTMLElement>("[data-foco-inicial]") ||
      el?.querySelector<HTMLElement>(FOCAVEIS);
    alvo?.focus();

    const teclas = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        cancelarRef.current();
        return;
      }
      if (ev.key === "Tab" && caixa.current) {
        const lista = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((x) => x.getClientRects().length > 0);
        if (!lista.length) return;
        const primeiro = lista[0];
        const ultimo = lista[lista.length - 1];
        const ativo = document.activeElement;
        if (!caixa.current.contains(ativo)) {
          ev.preventDefault();
          primeiro.focus();
        } else if (ev.shiftKey && ativo === primeiro) {
          ev.preventDefault();
          ultimo.focus();
        } else if (!ev.shiftKey && ativo === ultimo) {
          ev.preventDefault();
          primeiro.focus();
        }
      }
    };
    document.addEventListener("keydown", teclas, true);
    return () => {
      document.removeEventListener("keydown", teclas, true);
      if (anterior && document.contains(anterior)) anterior.focus?.();
    };
  }, []);

  return (
    <div
      data-confirmacao="1"
      className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end md:items-center justify-center md:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div
        ref={caixa}
        role={alerta ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescricao}
        className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-xl shadow-xl max-h-[92vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <h2 id={idTitulo} className="text-base font-bold text-slate-800 leading-snug">
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onCancelar}
            className="-mr-2 -mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pt-2 overflow-y-auto">{children}</div>
        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2 px-5 pt-4 pb-5">{rodape}</div>
      </div>
    </div>
  );
}

const BOTAO_SECUNDARIO =
  "px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition";
const botaoPrimario = (perigo?: boolean) =>
  `px-4 py-2.5 md:py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
    perigo ? "bg-red-600 hover:bg-red-700" : "bg-[#2A6377] hover:bg-[#1f4b5a]"
  }`;

// ---------------------------------------------------------------------------------------------
// DialogoConfirmar

export interface OpcoesConfirmar {
  titulo: string;
  /** Texto explicativo (quebras de linha \n sao respeitadas). */
  texto?: ReactNode;
  /** Rotulo do botao que confirma (padrao "Confirmar"). Prefira rotulos explicitos: "Excluir anexo". */
  rotuloConfirmar?: string;
  /** Rotulo do botao que cancela (padrao "Cancelar"). */
  rotuloCancelar?: string;
  /** Botao de confirmar em vermelho (acao destrutiva). */
  perigo?: boolean;
  /** Sem botao de cancelar (uso como "alert"): so o botao de confirmar. */
  somenteOk?: boolean;
}

export function DialogoConfirmar({
  titulo,
  texto,
  rotuloConfirmar = "Confirmar",
  rotuloCancelar = "Cancelar",
  perigo,
  somenteOk,
  onConfirmar,
  onCancelar,
}: OpcoesConfirmar & { onConfirmar: () => void; onCancelar: () => void }) {
  const idTexto = useId();
  return (
    <Moldura
      titulo={titulo}
      onCancelar={onCancelar}
      alerta
      idDescricao={texto ? idTexto : undefined}
      rodape={
        <>
          {!somenteOk && (
            <button type="button" className={BOTAO_SECUNDARIO} onClick={onCancelar} data-foco-inicial={perigo ? "1" : undefined}>
              {rotuloCancelar}
            </button>
          )}
          <button type="button" className={botaoPrimario(perigo)} onClick={onConfirmar} data-foco-inicial={perigo ? undefined : "1"}>
            {rotuloConfirmar}
          </button>
        </>
      }
    >
      {texto && (
        <div id={idTexto} className="text-sm text-slate-600 whitespace-pre-line">
          {texto}
        </div>
      )}
    </Moldura>
  );
}

// ---------------------------------------------------------------------------------------------
// DialogoMotivo

export interface OpcoesMotivo {
  titulo: string;
  /** Texto acima do campo (opcional). */
  texto?: ReactNode;
  /** Rotulo do campo (padrao "Motivo"). */
  rotulo?: string;
  placeholder?: string;
  /** Chips com motivos prontos: clicar preenche o campo. */
  motivosRapidos?: string[];
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  perigo?: boolean;
  valorInicial?: string;
  /** false = aceita campo vazio (padrao: obrigatorio). */
  obrigatorio?: boolean;
}

export function DialogoMotivo({
  titulo,
  texto,
  rotulo = "Motivo",
  placeholder,
  motivosRapidos,
  rotuloConfirmar = "Confirmar",
  rotuloCancelar = "Cancelar",
  perigo,
  valorInicial = "",
  obrigatorio = true,
  onConfirmar,
  onCancelar,
}: OpcoesMotivo & { onConfirmar: (motivo: string) => void; onCancelar: () => void }) {
  const [valor, setValor] = useState(valorInicial);
  const idCampo = useId();
  const idTexto = useId();
  const vazio = !valor.trim();
  const confirmar = () => {
    if (obrigatorio && vazio) return;
    onConfirmar(valor.trim());
  };
  return (
    <Moldura
      titulo={titulo}
      onCancelar={onCancelar}
      idDescricao={texto ? idTexto : undefined}
      rodape={
        <>
          <button type="button" className={BOTAO_SECUNDARIO} onClick={onCancelar}>
            {rotuloCancelar}
          </button>
          <button type="button" className={botaoPrimario(perigo)} onClick={confirmar} disabled={obrigatorio && vazio}>
            {rotuloConfirmar}
          </button>
        </>
      }
    >
      {texto && (
        <div id={idTexto} className="text-sm text-slate-600 whitespace-pre-line mb-3">
          {texto}
        </div>
      )}
      <label htmlFor={idCampo} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
        {rotulo}
        {obrigatorio ? "" : " (opcional)"}
      </label>
      <textarea
        id={idCampo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl+Enter confirma
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            confirmar();
          }
        }}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6377]/40 focus:border-[#2A6377]"
      />
      {!!motivosRapidos?.length && (
        <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Motivos rápidos">
          {motivosRapidos.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setValor(m)}
              aria-pressed={valor === m}
              className={`px-2.5 py-1 rounded-full text-xs border transition ${
                valor === m ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </Moldura>
  );
}

// ---------------------------------------------------------------------------------------------
// ErroCarga: estado de falha de carga dentro de uma lista/painel

export function ErroCarga({
  onTentar,
  mensagem = "Não foi possível carregar.",
  detalhe,
  compacto = false,
}: {
  onTentar?: () => void;
  mensagem?: string;
  /** Mensagem tecnica do erro (aparece pequena, abaixo). */
  detalhe?: string;
  compacto?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center gap-2 text-sm text-red-700 ${compacto ? "py-3" : "py-8"}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={18} aria-hidden="true" className="text-red-500 shrink-0" />
        <span>{mensagem}</span>
      </div>
      {detalhe && <p className="text-xs text-red-500/80 max-w-md break-words">{detalhe}</p>}
      {onTentar && (
        <button
          type="button"
          onClick={onTentar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#2A6377] border border-[#2A6377]/40 hover:bg-[#2A6377]/5 transition"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Tentar de novo
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Provider + API por promessa

type PedidoSemId =
  | { tipo: "confirmar"; opcoes: OpcoesConfirmar; resolver: (ok: boolean) => void }
  | { tipo: "motivo"; opcoes: OpcoesMotivo; resolver: (motivo: string | null) => void };
type Pedido = PedidoSemId & { id: number };

export interface ApiDialogos {
  /** Pede um texto (motivo). Devolve o texto (sem espacos nas pontas) ou null se cancelou. */
  pedirMotivo: (opcoes: OpcoesMotivo) => Promise<string | null>;
  /** Pede confirmacao. Devolve true se clicou no botao de confirmar. */
  confirmar: (opcoes: OpcoesConfirmar) => Promise<boolean>;
  /** Mensagem com um botao so (no lugar do alert). */
  informar: (opcoes: Omit<OpcoesConfirmar, "somenteOk" | "rotuloCancelar">) => Promise<void>;
}

type Abridor = (p: PedidoSemId) => void;
let abridorGlobal: Abridor | null = null;

function abrir(p: PedidoSemId) {
  if (abridorGlobal) return abridorGlobal(p);
  // sem provider montado (ex.: testes): cai nos dialogos do navegador
  if (p.tipo === "confirmar") {
    const o = p.opcoes;
    const txt = [o.titulo, typeof o.texto === "string" ? o.texto : ""].filter(Boolean).join("\n\n");
    if (o.somenteOk) {
      window.alert(txt);
      p.resolver(true);
    } else p.resolver(window.confirm(txt));
  } else {
    const r = window.prompt(p.opcoes.titulo, p.opcoes.valorInicial || "");
    const t = r === null ? null : r.trim();
    p.resolver(t === null || (p.opcoes.obrigatorio !== false && !t) ? null : t);
  }
}

export const pedirMotivo: ApiDialogos["pedirMotivo"] = (opcoes) =>
  new Promise((resolver) => abrir({ tipo: "motivo", opcoes, resolver }));
export const confirmar: ApiDialogos["confirmar"] = (opcoes) =>
  new Promise((resolver) => abrir({ tipo: "confirmar", opcoes, resolver }));
export const informar: ApiDialogos["informar"] = (opcoes) =>
  new Promise((resolver) =>
    abrir({ tipo: "confirmar", opcoes: { rotuloConfirmar: "OK", ...opcoes, somenteOk: true }, resolver: () => resolver() }),
  );

const API_GLOBAL: ApiDialogos = { pedirMotivo, confirmar, informar };
const ContextoDialogos = createContext<ApiDialogos>(API_GLOBAL);

/** Hook com pedirMotivo / confirmar / informar. */
export function useDialogos(): ApiDialogos {
  return useContext(ContextoDialogos);
}

export function DialogosProvider({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<Pedido[]>([]);
  const seq = useRef(1);

  const abridor = useCallback<Abridor>((p) => {
    setFila((f) => [...f, { ...p, id: seq.current++ } as Pedido]);
  }, []);

  useEffect(() => {
    abridorGlobal = abridor;
    return () => {
      if (abridorGlobal === abridor) abridorGlobal = null;
    };
  }, [abridor]);

  const atual = fila[0];
  const encerrar = useCallback((id: number) => setFila((f) => f.filter((p) => p.id !== id)), []);

  const api = useMemo(() => API_GLOBAL, []);

  return (
    <ContextoDialogos.Provider value={api}>
      {children}
      {atual?.tipo === "confirmar" && (
        <DialogoConfirmar
          key={atual.id}
          {...atual.opcoes}
          onConfirmar={() => {
            encerrar(atual.id);
            atual.resolver(true);
          }}
          onCancelar={() => {
            encerrar(atual.id);
            atual.resolver(false);
          }}
        />
      )}
      {atual?.tipo === "motivo" && (
        <DialogoMotivo
          key={atual.id}
          {...atual.opcoes}
          onConfirmar={(m) => {
            encerrar(atual.id);
            atual.resolver(m);
          }}
          onCancelar={() => {
            encerrar(atual.id);
            atual.resolver(null);
          }}
        />
      )}
    </ContextoDialogos.Provider>
  );
}
