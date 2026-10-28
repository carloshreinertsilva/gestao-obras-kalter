// Numeros e textos com o MESMO resultado do Python do programa local de documentos de exportacao (regras.py / estimativas.py),
// para a revisao do app dar exatamente o que o programa daria (conferido pelos testes com o gabarito do pedido 2126).
//
// O round() e o format() do Python arredondam o valor BINARIO exato do float (4.5675 e na verdade 4.56749999...) e, em empate
// exato, vao para o par. Intl.NumberFormat/toFixed do JS partem da representacao decimal curta e erram esses casos;
// por isso o arredondamento abaixo e feito com inteiros grandes (BigInt), sem erro de ponto flutuante.

const buf = new DataView(new ArrayBuffer(8));

/** x = m * 2^e, exato (m inteiro de ate 53 bits). */
function decompor(x: number): { neg: boolean; m: bigint; e: number } {
  buf.setFloat64(0, x);
  const bits = buf.getBigUint64(0);
  const neg = bits >> 63n === 1n;
  const exp = Number((bits >> 52n) & 0x7ffn);
  const frac = bits & ((1n << 52n) - 1n);
  return exp === 0 ? { neg, m: frac, e: -1074 } : { neg, m: frac | (1n << 52n), e: exp - 1075 };
}

/** |x| x 10^casas arredondado para inteiro (empate exato para o par), como o Python. */
function escalado(x: number, casas: number): { neg: boolean; q: bigint } {
  const { neg, m, e } = decompor(x);
  const n = m * 10n ** BigInt(casas);
  if (e >= 0) return { neg, q: n * 2n ** BigInt(e) };
  const d = 2n ** BigInt(-e);
  let q = n / d;
  const r2 = (n % d) * 2n;
  if (r2 > d || (r2 === d && q % 2n === 1n)) q += 1n;
  return { neg, q };
}

function partes(x: number, casas: number): { neg: boolean; inteiro: string; frac: string } {
  const { neg, q } = escalado(x, casas);
  const s = q.toString().padStart(casas + 1, "0");
  return { neg, inteiro: s.slice(0, s.length - casas), frac: casas ? "." + s.slice(s.length - casas) : "" };
}

/** float(v or 0): vazio, nulo e texto que nao e numero valem 0 (como o _num do Python). */
export function num(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return 1;
  if (typeof v === "string") {
    const t = v.trim();
    return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t) ? Number(t) : 0;
  }
  return 0;
}

/** sum() de floats do Python 3.12+ (soma compensada de Neumaier): a ordem e o erro de arredondamento contam no ultimo digito. */
export function somar(valores: number[]): number {
  let r = 0;
  let c = 0;
  for (const x of valores) {
    const t = r + x;
    c += Math.abs(r) >= Math.abs(x) ? r - t + x : x - t + r;
    r = t;
  }
  return c && Number.isFinite(c) ? r + c : r;
}

/** round(x, casas) do Python. */
export function arredondar(x: number, casas = 0): number {
  if (!Number.isFinite(x)) return x;
  const { neg, q } = escalado(x, casas);
  const r = Number(`${q}e-${casas}`);
  return neg ? -r : r;
}

/** f"{x:,.{casas}f}" do Python (1,234.56). */
export function milhar(x: number, casas: number): string {
  if (!Number.isFinite(x)) return String(x);
  const p = partes(x, casas);
  return (p.neg ? "-" : "") + p.inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + p.frac;
}

/** f"{x:+.{casas}f}" do Python. */
export function comSinal(x: number, casas: number): string {
  if (!Number.isFinite(x)) return String(x);
  const p = partes(x, casas);
  return (p.neg ? "-" : "+") + p.inteiro + p.frac;
}

/** f"{x:g}" do Python (6 algarismos significativos, sem zeros a direita). */
export function formatG(x: number): string {
  if (x === 0) return "0";
  const [m, e] = x.toExponential(5).split("e");
  const exp = parseInt(e, 10);
  const semZeros = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  if (exp < -4 || exp >= 6) return `${semZeros(m)}e${exp < 0 ? "-" : "+"}${String(Math.abs(exp)).padStart(2, "0")}`;
  return semZeros(x.toFixed(Math.max(0, 5 - exp)));
}

/** "1,5" no lugar do ponto, como o _kg do Python. */
export const kg = (v: unknown): string => formatG(num(v)).replace(".", ",");

/** Primeiros n caracteres (por caractere, como o fatiamento do Python). */
export const corta = (s: string, n: number): string => Array.from(s).slice(0, n).join("");

/** So os digitos (NCM de 8 digitos). */
export const soDigitos = (s: unknown): string => String(s ?? "").replace(/\D/g, "");

/** (v or "").strip() */
export const texto = (v: unknown): string => (v ? String(v) : "").trim();
