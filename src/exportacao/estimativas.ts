// Estimativa de peso e medidas dos materiais da Packing List que nao tem esses dados no ERP.
// Porte 1:1 de DocumentosExportacao/exportacao/estimativas.py (a tabela vem de public.exportacao_estimativas).
//
// Cada material guarda em "estimado" a lista dos campos preenchidos por estimativa (aparecem em azul na tela); quando o usuario
// digita um valor, o campo sai da lista. Funcao pura: devolve materiais novos, nao mexe nos recebidos.
import { arredondar, num } from "./numeros";
import type { Estimativa, Material, TabelaEstimativas } from "./tipos";

export const PCT_BRUTO = 1.5; // peso bruto estimado = liquido + 1,5% (embalagem)
export const CAP_KG = ["39", "72", "73", "74", "76"]; // capitulos da NCM com unidade estatistica em kg
export const DIVERGE = 2.0; // peso do cadastro do ERP com o dobro (ou metade) da estimativa: aviso para o Carlos conferir
const DIMENSOES = ["comp", "larg", "alt"] as const;

/** Peso bruto estimado: o do fabricante (por unidade x quantidade), se houver e for maior; senao liquido + 1,5%. */
export function bruto(pl: number, q: number, brutoUn?: unknown): number {
  let pb = pl * (1 + PCT_BRUTO / 100);
  if (brutoUn && q * num(brutoUn) > pb) pb = q * num(brutoUn);
  return arredondar(pb, 3);
}

/** Linhas de public.exportacao_estimativas -> tabela por codigo do material. */
export function tabelaDeLinhas(
  linhas: { codigo_material: string; peso: number | null; bruto: number | null; comp: number | null; larg: number | null; alt: number | null; fonte: string | null }[],
): TabelaEstimativas {
  const tab: TabelaEstimativas = {};
  for (const l of linhas) {
    const dim = l.comp != null && l.larg != null && l.alt != null ? [Number(l.comp), Number(l.larg), Number(l.alt)] : null;
    tab[l.codigo_material.trim()] = {
      peso: l.peso == null ? null : Number(l.peso),
      bruto: l.bruto == null ? null : Number(l.bruto),
      dim,
      fonte: l.fonte ?? "",
    };
  }
  return tab;
}

/** Preenche por estimativa o que esta vazio (zero) ou ja era estimado; o que foi digitado ou veio do ERP fica. */
export function aplicarEstimativas(materiais: Material[], tab: TabelaEstimativas): Material[] {
  return materiais.map((original) => {
    const m: Material = { ...original };
    const est = new Set(m.estimado ?? []);
    const e: Estimativa | undefined = tab[(m.codigo ?? "").trim()];
    const q = num(m.quantidade);
    if (e) {
      m.peso_un_est = e.peso ?? null;
      m.bruto_un_est = e.bruto ?? null;
      m.fonte_est = e.fonte ?? "";
      if (num(m.peso_un) <= 0 && e.peso && (num(m.peso_liq) <= 0 || est.has("peso_liq"))) {
        m.peso_liq = arredondar(q * num(e.peso), 3);
        est.add("peso_liq");
      }
      const vazio = DIMENSOES.every((k) => num(m[k]) <= 0) && num(m.m3) <= 0;
      if (e.dim && e.dim.length > 0 && (vazio || DIMENSOES.every((k) => est.has(k)))) {
        [m.comp, m.larg, m.alt] = e.dim;
        DIMENSOES.forEach((k) => est.add(k));
      }
      const pu = num(m.peso_un);
      if (pu > 0 && e.peso && !(1 / DIVERGE <= pu / num(e.peso) && pu / num(e.peso) <= DIVERGE)) m.peso_divergente = e.peso;
      else delete m.peso_divergente;
    }
    const pl = num(m.peso_liq);
    if (pl > 0 && (num(m.peso_bruto) <= 0 || est.has("peso_bruto"))) {
      m.peso_bruto = bruto(pl, q, m.bruto_un_est);
      est.add("peso_bruto");
    }
    if (!(m.un_estat ?? "").trim() && CAP_KG.includes((m.ncm ?? "").slice(0, 2))) {
      m.un_estat = "kg";
      est.add("un_estat");
    }
    m.estimado = [...est].sort();
    return m;
  });
}
