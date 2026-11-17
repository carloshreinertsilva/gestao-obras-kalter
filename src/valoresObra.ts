// Valores em R$ fechados por obra (decisao do Carlos em 17/11/2026): venda da obra e preco/valor das compras
// em aberto so podem ser lidos por admin/coordenador, pelo gestor da obra e pelo assistente dele.
// O banco guarda esses valores em tabelas proprias (obras_valores_venda e obra_compras_abertas_valores, espelhadas
// por gatilho); quem nao pode ver recebe lista vazia, sem erro. Aqui: buscar e juntar as linhas.
// Regra unica: linha ausente = sem acesso = campo null. null NUNCA vira R$ 0,00 (nem na tela, nem em soma).
import { supabase } from "./supabase";

export interface LinhaValoresVenda {
  id_obra: string;
  valor_produto: number | string | null;
  valor_servico: number | string | null;
}

export interface LinhaValoresCompra {
  id_obra: string;
  nr_solicitacao: number | string;
  preco_unitario: number | null;
  valor: number | null;
}

export const TITULO_SEM_ACESSO_VALOR = "Você não tem acesso a este valor";

const PAGINA = 1000;

// cast: tabelas novas ainda fora do database.types.ts gerado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = () => supabase as any;

/** Valores de venda das obras (UMA consulta). Obra sem linha no resultado = usuario sem acesso. */
export async function buscarValoresVenda(ids: string[]): Promise<LinhaValoresVenda[]> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return [];
  const { data, error } = await sb()
    .from("obras_valores_venda")
    .select("id_obra, valor_produto, valor_servico")
    .in("id_obra", unicos);
  if (error) throw error;
  return (data || []) as LinhaValoresVenda[];
}

/** Preco/valor das compras em aberto de uma obra (paginado: a API devolve no maximo 1000 linhas). */
export async function buscarValoresCompras(idObra: string): Promise<LinhaValoresCompra[]> {
  const todas: LinhaValoresCompra[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await sb()
      .from("obra_compras_abertas_valores")
      .select("id_obra, nr_solicitacao, preco_unitario, valor")
      .eq("id_obra", idObra)
      .order("nr_solicitacao", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    todas.push(...((data || []) as LinhaValoresCompra[]));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}

const numeroOuZero = (v: number | string | null | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Anexa valor_produto/valor_servico (mesmos nomes da tabela antiga) a cada obra.
 * Com linha: valores numericos (nulo no banco = 0, como o app sempre tratou "obra sem valor").
 * Sem linha (sem acesso): os dois ficam null.
 */
export function anexarValoresVenda<T extends { id: string }>(
  obras: T[],
  valores: LinhaValoresVenda[],
): (T & { valor_produto: number | null; valor_servico: number | null })[] {
  const porObra = new Map(valores.map((v) => [v.id_obra, v]));
  return obras.map((o) => {
    const v = porObra.get(o.id);
    return {
      ...o,
      valor_produto: v ? numeroOuZero(v.valor_produto) : null,
      valor_servico: v ? numeroOuZero(v.valor_servico) : null,
    };
  });
}

/** Venda total da obra (produto + servico); null = usuario sem acesso ao valor. */
export function totalVendaObra(
  obra: { valor_produto?: number | string | null; valor_servico?: number | string | null } | null | undefined,
): number | null {
  if (!obra || (obra.valor_produto == null && obra.valor_servico == null)) return null;
  return (Number(obra.valor_produto) || 0) + (Number(obra.valor_servico) || 0);
}

/** Soma da carteira so com as obras que tem valor visivel; parcial = alguma obra ficou de fora. */
export function somarCarteira(obras: { valor_produto?: number | string | null; valor_servico?: number | string | null }[]) {
  let total = 0;
  let semAcesso = 0;
  for (const o of obras) {
    const v = totalVendaObra(o);
    if (v === null) semAcesso += 1;
    else total += v;
  }
  return { total, semAcesso, parcial: semAcesso > 0 };
}

/**
 * Junta preco/valor as compras pela solicitacao. Sem linha: preco e valor null.
 * valoresVisiveis: o banco devolveu algum valor (o gatilho cria uma linha por compra, entao compras sem
 * nenhuma linha de valor = usuario sem acesso). Sem compras nao ha o que esconder.
 */
export function anexarValoresCompras<T extends { nr_solicitacao: number | string }>(
  compras: T[],
  valores: LinhaValoresCompra[],
): { compras: (T & { preco_unitario: number | null; valor: number | null })[]; valoresVisiveis: boolean } {
  const porSolicitacao = new Map(valores.map((v) => [String(v.nr_solicitacao), v]));
  return {
    compras: compras.map((c) => {
      const v = porSolicitacao.get(String(c.nr_solicitacao));
      return {
        ...c,
        preco_unitario: v && v.preco_unitario != null ? Number(v.preco_unitario) : null,
        valor: v && v.valor != null ? Number(v.valor) : null,
      };
    }),
    valoresVisiveis: compras.length === 0 || valores.length > 0,
  };
}
