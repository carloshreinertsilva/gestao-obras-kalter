// Atalhos de teclado globais do app.
//
// Esc fecha o modal que estiver por cima (os modais sao divs "fixed inset-0", cada um com seu
// botao de fechar). Se o foco estiver num campo, o primeiro Esc so sai do campo - assim nao se
// perde o que foi digitado por engano; o segundo Esc fecha.
//
// Rascunho: modal com algo digitado pede confirmacao antes de fechar sem salvar.
import type { KeyboardEvent as TeclaReact } from "react";

const CAMPOS = "INPUT, TEXTAREA, SELECT";

function modalDoTopo(): HTMLElement | null {
  const visiveis = [...document.querySelectorAll<HTMLElement>("div.fixed.inset-0")].filter(
    (el) => el.getClientRects().length > 0 && el.childElementCount > 0,
  );
  if (!visiveis.length) return null;
  // maior z-index; empate -> o que vem depois no DOM (aberto por ultimo)
  const z = (el: HTMLElement) => Number(getComputedStyle(el).zIndex) || 0;
  return visiveis.reduce((topo, el) => (z(el) >= z(topo) ? el : topo));
}

const ehX = (b: HTMLElement) => Boolean(b.querySelector("svg.lucide-x"));
const ehTextoFechar = (b: HTMLElement) =>
  /^(fechar|cancelar)$/i.test((b.getAttribute("aria-label") || b.title || b.innerText).trim());
const ehBotaoFechar = (b: HTMLElement) => ehX(b) || ehTextoFechar(b);

function botaoFechar(modal: HTMLElement): HTMLElement | null {
  const botoes = [...modal.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
  return botoes.find(ehX) || botoes.find(ehTextoFechar) || null;
}

// ---------------------------------------------------------------------------------------------
// Rascunho: se algo foi digitado num modal, fechar sem salvar (X, Cancelar, Esc, clique fora)
// pede confirmacao. Salvar fecha o modal pelo proprio React, sem passar por aqui.

const MARCA = "rascunho";
let liberarProximoClique: EventTarget | null = null;

function modalDe(el: Element | null): HTMLElement | null {
  return (el?.closest("div.fixed.inset-0") as HTMLElement | null) ?? null;
}

function ehFechamento(alvo: HTMLElement, modal: HTMLElement): boolean {
  if (alvo === modal) {
    // clique no fundo escuro: so conta nos modais que fecham assim (tem onClick no fundo)
    const props = Object.keys(modal).find((k) => k.startsWith("__reactProps"));
    return Boolean(props && (modal as unknown as Record<string, { onClick?: unknown }>)[props]?.onClick);
  }
  const botao = alvo.closest("button");
  return Boolean(botao && modal.contains(botao) && ehBotaoFechar(botao));
}

function confirmarDescarte(): Promise<boolean> {
  return new Promise((resolver) => {
    const fundo = document.createElement("div");
    fundo.className = "fixed inset-0 z-[200] bg-slate-900/50 flex items-center justify-center p-4";
    fundo.setAttribute("data-confirmacao", "1");
    fundo.innerHTML = `
      <div role="alertdialog" aria-modal="true" aria-labelledby="rascunho-titulo" aria-describedby="rascunho-texto"
           class="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h2 id="rascunho-titulo" class="text-base font-bold text-slate-800">Descartar o que foi digitado?</h2>
        <p id="rascunho-texto" class="text-sm text-slate-500 mt-1">As informações preenchidas ainda não foram salvas e serão perdidas.</p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" data-acao="descartar"
                  class="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition">Descartar</button>
          <button type="button" data-acao="continuar"
                  class="px-3 py-2 rounded-lg text-sm font-bold text-white bg-[#2A6377] hover:bg-[#1f4b5a] transition">Continuar editando</button>
        </div>
      </div>`;
    const anterior = document.activeElement as HTMLElement | null;
    const fim = (descartar: boolean) => {
      document.removeEventListener("keydown", teclas, true);
      fundo.remove();
      if (!descartar) anterior?.focus?.();
      resolver(descartar);
    };
    const teclas = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        fim(false);
      }
    };
    fundo.addEventListener("click", (ev) => {
      const acao = (ev.target as HTMLElement).closest("button")?.dataset.acao;
      if (acao === "descartar") fim(true);
      else if (acao === "continuar" || ev.target === fundo) fim(false);
    });
    document.addEventListener("keydown", teclas, true);
    document.body.appendChild(fundo);
    fundo.querySelector<HTMLButtonElement>('[data-acao="continuar"]')?.focus();
  });
}

function instalarAvisoDeRascunho() {
  // qualquer digitacao/alteracao dentro de um modal marca o modal como rascunho
  const marcar = (ev: Event) => {
    const modal = modalDe(ev.target as Element);
    if (modal && !modal.hasAttribute("data-confirmacao")) modal.dataset[MARCA] = "1";
  };
  document.addEventListener("input", marcar, true);
  document.addEventListener("change", marcar, true);

  // fechar um modal com rascunho: segura o clique e pergunta
  document.addEventListener(
    "click",
    (ev) => {
      // clique no icone (svg) dentro do botao: o alvo passa a ser o proprio botao
      const alvo = ((ev.target as Element).closest("button") ?? ev.target) as HTMLElement;
      if (liberarProximoClique && liberarProximoClique === alvo) {
        liberarProximoClique = null;
        return;
      }
      const modal = modalDe(alvo);
      if (!modal || modal.dataset[MARCA] !== "1" || !ehFechamento(alvo, modal)) return;
      ev.preventDefault();
      ev.stopPropagation();
      void confirmarDescarte().then((descartar) => {
        if (!descartar) return;
        delete modal.dataset[MARCA];
        liberarProximoClique = alvo;
        alvo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
    true,
  );

  // fechar/recarregar a aba com um modal preenchido
  window.addEventListener("beforeunload", (ev) => {
    if (document.querySelector(`div.fixed.inset-0[data-${MARCA}="1"]`)) {
      ev.preventDefault();
      ev.returnValue = "";
    }
  });
}

export function instalarAtalhosGlobais() {
  instalarAvisoDeRascunho();
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || ev.defaultPrevented) return;
    if (document.querySelector("[data-confirmacao]")) return;
    const ativo = document.activeElement as HTMLElement | null;
    if (ativo && ativo.matches(CAMPOS)) {
      ativo.blur();
      return;
    }
    const modal = modalDoTopo();
    if (!modal) return;
    const fechar = botaoFechar(modal);
    if (fechar) fechar.click();
    else modal.click(); // modais que fecham ao clicar fora
  });
}

/** Linha de tabela que abre algo ao clicar: tambem abre com Enter/Espaco e recebe foco pelo Tab. */
export function linhaClicavel(abrir: () => void) {
  return {
    tabIndex: 0,
    onClick: abrir,
    onKeyDown: (ev: TeclaReact) => {
      if (ev.target !== ev.currentTarget) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        abrir();
      }
    },
  };
}
