// Logica pura do processo de exportacao (sem tela): criar o processo a partir do que o robo leu no ERP, mesclar a lista de
// SMA relida sem perder o que foi digitado e editar os materiais da Packing List com as mesmas regras do programa local
// (DocumentosExportacao/exportacao/static/index.html).
import { aplicarEstimativas, bruto } from "./estimativas";
import { num } from "./numeros";
import type { ErpPedido, Material, Parte, Processo, TabelaEstimativas } from "./tipos";

/** Uma linha de public.exportacao_erp (instantaneo do ERP por obra, gravado pelo robo). */
export interface LinhaErp {
  nr_pedido: number;
  pedido: { erp: ErpPedido; base: Processo };
  materiais: Material[];
  exportador_erp: Parte | null;
  lido_em: string;
}

/** public.exportacao_config: dados fixos da Kalter, valem por cima do cadastro da filial no ERP. */
export interface ConfigExportacao {
  exportador: Parte;
  banco: string | null;
  local_embarque: string;
}

export const hojeISO = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const naoVazios = (p: Parte): Parte => Object.fromEntries(Object.entries(p).filter(([, v]) => v)) as Parte;

/** Processo inicial: dados do ERP + padroes da Kalter + materiais da SMA com as estimativas aplicadas. */
export function processoInicial(erp: LinhaErp, config: ConfigExportacao | null, tabela: TabelaEstimativas, hoje = hojeISO()): Processo {
  const proc = structuredClone(erp.pedido.base) as Processo;
  proc.documento = { ...proc.documento, data: hoje };
  proc.exportador = { ...(erp.exportador_erp ?? proc.exportador ?? {}), ...naoVazios(config?.exportador ?? {}) };
  if (config?.banco) proc.comercial = { ...proc.comercial, banco: config.banco };
  if (config?.local_embarque) proc.embarque = { ...proc.embarque, local_embarque: config.local_embarque };
  proc.packing = { cc: erp.nr_pedido, lido_em: hoje, materiais: aplicarEstimativas(erp.materiais, tabela) };
  return proc;
}

export const chaveMaterial = (m: Material): string => `${m.sma}-${m.seq}`;

const DIGITADOS = ["quantidade", "peso_liq", "peso_bruto", "comp", "larg", "alt", "tipo_volume", "m3", "qtd_estat", "estimado", "aceito"] as const;

/** Relê a lista da SMA: linhas novas entram, as que sairam da SMA saem e as que continuam mantem o que foi digitado. */
export function mesclarSma(
  atual: Material[],
  doErp: Material[],
  tabela: TabelaEstimativas,
): { materiais: Material[]; entraram: number; sairam: number } {
  const antes = new Map(atual.map((m) => [chaveMaterial(m), m]));
  const materiais = aplicarEstimativas(doErp, tabela).map((novo) => {
    const a = antes.get(chaveMaterial(novo));
    if (!a) return novo;
    const m: Material = { ...novo };
    for (const k of DIGITADOS) if (a[k] !== undefined) (m as unknown as Record<string, unknown>)[k] = a[k];
    if (a.un_estat) m.un_estat = a.un_estat; // unidade escolhida na tela vale sobre a do ERP
    return m;
  });
  const entraram = materiais.filter((m) => !antes.has(chaveMaterial(m))).length;
  return { materiais, entraram, sairam: atual.length - (materiais.length - entraram) };
}

export type CampoMaterial = "quantidade" | "peso_liq" | "peso_bruto" | "comp" | "larg" | "alt" | "m3" | "qtd_estat" | "tipo_volume" | "un_estat";

const arred3 = (x: number) => Math.round(x * 1000) / 1000;

/** Edicao de um campo da Packing List: o campo digitado deixa de ser estimativa; quantidade e peso liquido refazem os pesos
 *  que ainda eram estimados; com as tres dimensoes o m3 passa a ser calculado. */
export function editarMaterial(m: Material, campo: CampoMaterial, valor: string | number): Material {
  const novo: Material = { ...m, [campo]: valor };
  if ((m.estimado ?? []).includes(campo)) novo.estimado = (m.estimado ?? []).filter((c) => c !== campo);
  const estimado = (c: string) => (novo.estimado ?? []).includes(c);
  if (campo === "quantidade") {
    const pu = num(novo.peso_un) > 0 ? num(novo.peso_un) : estimado("peso_liq") ? num(novo.peso_un_est) : 0;
    if (pu > 0) novo.peso_liq = arred3(num(novo.quantidade) * pu);
  }
  if ((campo === "quantidade" || campo === "peso_liq") && estimado("peso_bruto"))
    novo.peso_bruto = num(novo.peso_liq) > 0 ? bruto(num(novo.peso_liq), num(novo.quantidade), novo.bruto_un_est) : 0;
  if ((campo === "comp" || campo === "larg" || campo === "alt") && num(novo.comp) > 0 && num(novo.larg) > 0 && num(novo.alt) > 0) novo.m3 = 0;
  return novo;
}

/** Aceitar: os valores em azul passam a valer como informados (saem de "estimado"; ficam registrados em "aceito"). */
export function aceitarSugestoes(m: Material): Material {
  if (!(m.estimado ?? []).length) return m;
  return { ...m, aceito: [...new Set([...(m.aceito ?? []), ...(m.estimado ?? [])])], estimado: [] };
}

/** "Aplicar a familia": tipo de volume e/ou peso bruto = liquido + pct% em todos os materiais do conjunto. */
export function aplicarFamilia(materiais: Material[], familia: string, tipoVolume: string, pct: number | null): Material[] {
  return materiais.map((m) => {
    if (m.familia !== familia) return m;
    const novo: Material = { ...m };
    if (tipoVolume.trim()) novo.tipo_volume = tipoVolume.trim();
    if (pct !== null && num(m.peso_liq) > 0) {
      novo.peso_bruto = arred3(num(m.peso_liq) * (1 + pct / 100));
      novo.estimado = (m.estimado ?? []).filter((c) => c !== "peso_bruto");
    }
    return novo;
  });
}

/** Peso bruto = liquido + pct% em todos os materiais com peso liquido e sem peso bruto digitado (inclusive os estimados). */
export function brutoPorPercentual(materiais: Material[], pct: number): Material[] {
  return materiais.map((m) => {
    if (!(num(m.peso_liq) > 0 && (!num(m.peso_bruto) || (m.estimado ?? []).includes("peso_bruto")))) return m;
    return { ...m, peso_bruto: arred3(num(m.peso_liq) * (1 + pct / 100)), estimado: (m.estimado ?? []).filter((c) => c !== "peso_bruto") };
  });
}

/** Valor de um caminho "a.b.0.c" dentro de um objeto. */
export function ler(obj: unknown, caminho: string): unknown {
  return caminho.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj);
}

/** Copia com o caminho "a.b.0.c" trocado; o que nao muda mantem a mesma referencia (as linhas da tabela nao redesenham). */
export function definir<T>(obj: T, caminho: string, valor: unknown): T {
  const [k, ...resto] = caminho.split(".");
  const filho = obj == null ? undefined : (obj as Record<string, unknown>)[k];
  const novo = resto.length ? definir(filho ?? (/^\d+$/.test(resto[0]) ? [] : {}), resto.join("."), valor) : valor;
  if (Array.isArray(obj)) {
    const copia = obj.slice();
    copia[Number(k)] = novo;
    return copia as T;
  }
  return { ...((obj ?? {}) as Record<string, unknown>), [k]: novo } as T;
}
