// Janela (modal) padrao do app - revisao de 06/11/2026 (item 34).
//
//   <Modal titulo="Encaminhar NF" onFechar={fechar} sujo={alterou} largura="2xl" rodape={<>...botoes...</>}>
//     ...conteudo...
//   </Modal>
//
// - Portal no <body>, role="dialog" + aria-modal, titulo ligado por aria-labelledby.
// - Foco vai para o primeiro campo, Tab fica preso dentro, Esc / X / clique no fundo fecham.
// - sujo=true: antes de fechar pergunta "Descartar as alterações?" (janela do app, nao window.confirm).
// - Celular: tela cheia (rolagem interna, rodape fixo embaixo); computador: caixa centralizada.
// - O fundo leva data-confirmacao: o Esc global e o aviso de rascunho de src/teclado.ts ignoram esta janela
//   (ela mesma trata Esc e rascunho).
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { confirmar } from "./Dialogos";

const FOCAVEIS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const LARGURAS = {
  md: "md:max-w-md",
  lg: "md:max-w-lg",
  xl: "md:max-w-xl",
  "2xl": "md:max-w-2xl",
  "3xl": "md:max-w-3xl",
  "4xl": "md:max-w-4xl",
  "5xl": "md:max-w-5xl",
} as const;

export interface ModalProps {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: keyof typeof LARGURAS;
  sujo?: boolean;
  /** rotulo acessivel quando o titulo nao e texto simples */
  rotulo?: string;
}

export function Modal({ titulo, subtitulo, onFechar, children, rodape, largura = "2xl", sujo = false, rotulo }: ModalProps) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const estado = useRef({ onFechar, sujo });
  estado.current = { onFechar, sujo };

  const tentarFechar = async () => {
    if (estado.current.sujo) {
      const ok = await confirmar({
        titulo: "Descartar as alterações?",
        texto: "O que você preencheu nesta janela será perdido.",
        rotuloConfirmar: "Descartar",
        rotuloCancelar: "Continuar editando",
        perigo: true,
      });
      if (!ok) return;
    }
    estado.current.onFechar();
  };

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const el = caixa.current;
    (el?.querySelector<HTMLElement>("[data-foco-inicial], input, select, textarea") || el?.querySelector<HTMLElement>(FOCAVEIS))?.focus();
    const travaRolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const teclas = (ev: KeyboardEvent) => {
      // um dialogo de confirmacao aberto por cima (Dialogos.tsx) trata as proprias teclas
      if (document.querySelector('[role="alertdialog"]')) return;
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        tentarFechar();
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
      document.body.style.overflow = travaRolagem;
      if (anterior && document.contains(anterior)) anterior.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      data-confirmacao="1"
      className="fixed inset-0 z-[150] bg-slate-900/50 flex items-stretch md:items-center justify-center md:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) tentarFechar();
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={rotulo ? undefined : idTitulo}
        aria-label={rotulo}
        className={`bg-white w-full ${LARGURAS[largura]} md:rounded-xl shadow-xl flex flex-col h-full md:h-auto md:max-h-[92vh] pb-[env(safe-area-inset-bottom)]`}
      >
        <div className="flex items-start justify-between gap-3 px-4 md:px-5 py-3 md:py-4 border-b shrink-0">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-base md:text-lg font-bold text-slate-800 leading-snug">
              {titulo}
            </h2>
            {subtitulo && <div className="text-sm text-slate-500 mt-0.5">{subtitulo}</div>}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={tentarFechar}
            className="-mr-1 p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">{children}</div>
        {rodape && (
          <div className="shrink-0 border-t px-4 md:px-5 py-3 flex flex-col-reverse md:flex-row md:justify-end gap-2 bg-slate-50/60 md:rounded-b-xl">
            {rodape}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
