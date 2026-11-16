// Leitura e exibicao de numeros digitados pelo usuario (regra unica do app).
// Antes cada tela lia de um jeito e o ponto virava coisas opostas ("4.50" -> 450 numa, "15.000" -> 15 noutra).
//
// Regra:
// - tira "R$", espacos e unidades (km, kg, m, m³, %...); vazio ou invalido -> NaN (quem chama decide o padrao)
// - com virgula: pontos sao milhar e a virgula e decimal ("1.234,56" -> 1234,56)
// - sem virgula e com mais de um ponto: pontos sao milhar ("1.234.567")
// - sem virgula e com UM ponto: milhar se vierem 1 a 3 digitos (sem zero a esquerda) + ponto + exatamente 3 digitos
//   ("15.000" -> 15000; "1.500" -> 1500); senao decimal ("4.50" -> 4,5; "850.5"; "0.500" -> 0,5)
// - modo medida (metros, m³, km fracionado): ponto unico e sempre decimal ("1.200" -> 1,2)

export interface OpcoesLeitura {
  /** campo de medida/quantidade pequena: ponto unico e sempre decimal */
  medida?: boolean;
}

export function lerNumero(texto: string | null | undefined, opcoes: OpcoesLeitura = {}): number {
  if (texto == null) return NaN;
  let t = String(texto)
    .replace(/R\$/gi, "")
    .replace(/[\s ]/g, "")
    .replace(/[a-zA-Z³²°%]/g, "")
    .replace(/[−–]/g, "-"); // sinal de menos tipografico
  if (!t) return NaN;
  const negativo = t.startsWith("-");
  if (negativo) t = t.slice(1);
  // so digitos, pontos e no maximo uma virgula; precisa de algum digito
  if (!/^[\d.,]+$/.test(t) || !/\d/.test(t) || (t.match(/,/g) || []).length > 1) return NaN;

  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    const pontos = (t.match(/\./g) || []).length;
    if (pontos > 1) t = t.replace(/\./g, "");
    else if (pontos === 1 && !opcoes.medida && /^[1-9]\d{0,2}\.\d{3}$/.test(t)) t = t.replace(".", "");
  }
  if (t === ".") return NaN;
  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return negativo ? -n || 0 : n; // "-0" vira 0
}

/** Numero no formato brasileiro: `casas` minimas e ate `casasMax` (padrao = casas). NaN/vazio -> "". */
export function formatarNumero(v: number | null | undefined, casas = 2, casasMax = casas): string {
  if (v == null || !Number.isFinite(v)) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: Math.max(casas, casasMax) });
}

/**
 * Texto digitado -> texto reescrito como foi entendido ("4.50" -> "4,50"; "15.000" -> "15.000,00").
 * Invalido ou vazio volta como esta (a tela mostra o erro). O texto devolvido, lido de novo, da o mesmo numero.
 */
export function normalizarTexto(texto: string, casas = 2, opcoes: OpcoesLeitura & { casasMax?: number } = {}): string {
  const n = lerNumero(texto, opcoes);
  if (Number.isNaN(n)) return texto;
  const max = Math.max(casas, opcoes.casasMax ?? 6);
  // medida sem separador de milhar: "1.500" (sem virgula) seria lido de volta como 1,5
  if (opcoes.medida) return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: max, useGrouping: false });
  return formatarNumero(n, casas, max);
}
