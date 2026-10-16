// Atalhos de teclado globais do app.
//
// Esc fecha o modal que estiver por cima (os modais sao divs "fixed inset-0", cada um com seu
// botao de fechar). Se o foco estiver num campo, o primeiro Esc so sai do campo - assim nao se
// perde o que foi digitado por engano; o segundo Esc fecha.
import type { KeyboardEvent } from "react";

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

function botaoFechar(modal: HTMLElement): HTMLElement | null {
  const botoes = [...modal.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
  return (
    botoes.find((b) => b.querySelector("svg.lucide-x")) ||
    botoes.find((b) => /^(fechar|cancelar)$/i.test((b.getAttribute("aria-label") || b.title || b.innerText).trim())) ||
    null
  );
}

export function instalarAtalhosGlobais() {
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || ev.defaultPrevented) return;
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
    onKeyDown: (ev: KeyboardEvent) => {
      if (ev.target !== ev.currentTarget) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        abrir();
      }
    },
  };
}
