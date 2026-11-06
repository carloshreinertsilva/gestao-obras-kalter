// Pecas compartilhadas das listas dos modulos (Fretes, Faturamento, Previsoes, NFs de terceiros, Materiais)
// - revisao de 06/11/2026 (itens 28, 29 e 32).
//
// diasUteisDesde / SeloDiasParados: ha quantos dias uteis (seg-sex) o item esta na etapa atual;
//   selo ambar a partir de 3 dias uteis e vermelho a partir de 5 (so em itens abertos).
// useFiltroSalvo: estado lembrado no localStorage (try/catch: modo privado / armazenamento bloqueado).
// BotaoExportar: botao "Exportar Excel" padrao (usa utils.exportarCsv por quem chama).
import { useEffect, useState } from "react";
import { Clock, Download } from "lucide-react";

const DIA = 86400000;

/** Dias uteis (segunda a sexta) entre a data e hoje, sem contar o proprio dia. null se nao houver data. */
export function diasUteisDesde(data: string | null | undefined, hoje: Date = new Date()): number | null {
  if (!data) return null;
  const inicio = new Date(data.length <= 10 ? `${data}T12:00:00` : data);
  if (Number.isNaN(inicio.getTime())) return null;
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12);
  const b = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12);
  if (b <= a) return 0;
  let n = 0;
  for (let d = new Date(a.getTime() + DIA); d <= b; d = new Date(d.getTime() + DIA)) {
    const s = d.getDay();
    if (s !== 0 && s !== 6) n++;
  }
  return n;
}

/** A data mais recente entre as informadas (ISO); ignora vazias. */
export function maisRecente(...datas: (string | null | undefined)[]): string | null {
  let r: string | null = null;
  for (const d of datas) if (d && (!r || new Date(d).getTime() > new Date(r).getTime())) r = d;
  return r;
}

export const classeDiasParados = (dias: number) =>
  dias >= 5 ? "bg-red-50 text-red-700 border-red-200" : dias >= 3 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200";

export const textoDiasParados = (dias: number) => (dias === 0 ? "hoje" : dias === 1 ? "1 dia útil" : `${dias} dias úteis`);

/**
 * Selo "ha N dias uteis na etapa". Em item fechado (aberto=false) nao mostra nada.
 * Abaixo de 3 dias uteis aparece discreto (texto cinza); 3+ ambar, 5+ vermelho.
 */
export function SeloDiasParados({ desde, aberto = true, className = "" }: { desde: string | null | undefined; aberto?: boolean; className?: string }) {
  if (!aberto) return null;
  const dias = diasUteisDesde(desde);
  if (dias === null) return null;
  const titulo = `Na etapa atual desde ${new Date(desde!.length <= 10 ? `${desde}T12:00:00` : desde!).toLocaleDateString("pt-BR")} (${textoDiasParados(dias)})`;
  if (dias < 3)
    return (
      <span title={titulo} className={`inline-flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap ${className}`}>
        <Clock size={12} aria-hidden="true" className="text-slate-400" />
        {textoDiasParados(dias)}
      </span>
    );
  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${classeDiasParados(dias)} ${className}`}
    >
      <Clock size={12} aria-hidden="true" />
      {textoDiasParados(dias)} na etapa
    </span>
  );
}

const PREFIXO = "kalter.filtro.";

function ler<T>(chave: string, inicial: T, valido?: (v: unknown) => boolean): T {
  try {
    const bruto = window.localStorage.getItem(PREFIXO + chave);
    if (bruto === null) return inicial;
    const v = JSON.parse(bruto);
    if (valido && !valido(v)) return inicial;
    if (typeof v !== typeof inicial) return inicial;
    return v as T;
  } catch {
    return inicial;
  }
}

/** useState lembrado no localStorage. `valido` descarta valores antigos que nao existem mais (ex.: filtro removido). */
export function useFiltroSalvo<T extends string | number | boolean>(chave: string, inicial: T, valido?: (v: unknown) => boolean) {
  const [valor, setValor] = useState<T>(() => ler(chave, inicial, valido));
  useEffect(() => {
    try {
      window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    } catch {
      // armazenamento indisponivel: segue sem lembrar
    }
  }, [chave, valor]);
  return [valor, setValor] as const;
}

/** Numero com virgula decimal para o CSV (Excel pt-BR). */
export const numCsv = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? "" : String(Number(v)).replace(".", ","));

export function BotaoExportar({ onClick, disabled, rotulo = "Exportar Excel" }: { onClick: () => void; disabled?: boolean; rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Baixa o que está filtrado na tela (CSV que abre no Excel)"
      className="px-3 py-1.5 rounded-lg border text-sm text-slate-600 hover:bg-slate-50 font-semibold flex items-center gap-1.5 disabled:opacity-50"
    >
      <Download size={14} aria-hidden="true" /> {rotulo}
    </button>
  );
}
