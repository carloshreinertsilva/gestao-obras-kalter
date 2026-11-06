// Filtros de tela lembrados no navegador (localStorage), por usuario do navegador.
// Revisao 06/11/2026 (item 29). Tudo em try/catch: janela anonima, armazenamento bloqueado ou cheio
// simplesmente volta ao valor inicial, sem quebrar a tela.
import { useEffect, useState } from "react";

const PREFIXO = "kalter.filtro.";

export function lerFiltro<T>(chave: string, inicial: T): T {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    if (bruto === null) return inicial;
    const valor = JSON.parse(bruto);
    // so aceita o mesmo tipo do valor inicial (protege contra lixo de versoes antigas)
    return typeof valor === typeof inicial ? (valor as T) : inicial;
  } catch {
    return inicial;
  }
}

export function gravarFiltro<T>(chave: string, valor: T) {
  try {
    window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: so nao lembra */
  }
}

/** useState que lembra o valor no navegador. */
export function useFiltroSalvo<T>(chave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => lerFiltro(chave, inicial));
  useEffect(() => {
    gravarFiltro(chave, valor);
  }, [chave, valor]);
  return [valor, setValor] as const;
}
