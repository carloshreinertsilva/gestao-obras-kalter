// "Meus pedidos em andamento" (Pacote 4 / B7): contas da lista que fica logo abaixo de "Minhas pendencias".
// Os dados vem da RPC meus_pedidos_andamento() (so os pedidos que a pessoa abriu e ainda nao terminaram).
// Dias parado = dias uteis desde que entrou na etapa (mesma conta do selo das telas, modulos_lista.diasUteisDesde).
import { diasUteisDesde } from "./modulos_lista";

export interface PedidoAndamento {
  modulo: string; // nome da tela do app (solicitacoes_previsao, faturamento, nfs_terceiros, materiais, fretes)
  id: string;
  id_obra: string | null;
  codigo_obra: string | null;
  titulo: string;
  status: string;
  status_rotulo: string;
  com_quem: string;
  desde: string | null;
  aberto_em: string | null;
  prazo: string | null; // AAAA-MM-DD; espera normal ate essa data (NF lancada: vencimento)
}

export const COM_VOCE = "Com você";
/** Acima disso (dias uteis na mesma etapa) o pedido e destacado como parado. */
export const LIMITE_PARADO = 5;
/** Linhas mostradas antes do "ver todos". */
export const LINHAS_INICIAIS = 5;

export const MODULOS: { modulo: string; rotulo: string }[] = [
  { modulo: "solicitacoes_previsao", rotulo: "Previsões" },
  { modulo: "faturamento", rotulo: "Faturamento" },
  { modulo: "nfs_terceiros", rotulo: "NFs de terceiros" },
  { modulo: "materiais", rotulo: "Material novo" },
  { modulo: "fretes", rotulo: "Fretes" },
];

/** Tela do app que abre o modulo (os nomes ja sao os mesmos de MinhasPendencias / rotas.ts). */
export const telaDoModulo = (modulo: string) => (MODULOS.some((m) => m.modulo === modulo) ? modulo : "dashboard");

const dataLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function diasParado(p: PedidoAndamento, hoje: Date = new Date()): number | null {
  return diasUteisDesde(p.desde, hoje);
}

/** Parado demais: mais de 5 dias uteis na etapa, a nao ser que ainda esteja dentro do prazo normal (ex.: NF a pagar). */
export function estaParado(p: PedidoAndamento, hoje: Date = new Date()): boolean {
  const dias = diasParado(p, hoje);
  if (dias === null || dias <= LIMITE_PARADO) return false;
  if (p.prazo && p.prazo.slice(0, 10) >= dataLocalISO(hoje)) return false;
  return true;
}

export function textoHa(dias: number | null): string {
  if (dias === null) return "";
  if (dias === 0) return "desde hoje";
  return dias === 1 ? "há 1 dia útil" : `há ${dias} dias úteis`;
}

export interface GrupoPedidos {
  chave: string; // "com_voce" ou o modulo
  rotulo: string;
  itens: PedidoAndamento[];
}

const maisAntigoPrimeiro = (a: PedidoAndamento, b: PedidoAndamento) =>
  (a.desde ? new Date(a.desde).getTime() : Infinity) - (b.desde ? new Date(b.desde).getTime() : Infinity);

/** "Com você" (devolvidos para corrigir) no topo; depois um grupo por modulo, o mais parado primeiro. */
export function agruparPedidos(pedidos: PedidoAndamento[]): GrupoPedidos[] {
  const grupos: GrupoPedidos[] = [];
  const comVoce = pedidos.filter((p) => p.com_quem === COM_VOCE).sort(maisAntigoPrimeiro);
  if (comVoce.length) grupos.push({ chave: "com_voce", rotulo: "Voltou para você", itens: comVoce });
  const resto = pedidos.filter((p) => p.com_quem !== COM_VOCE);
  for (const m of MODULOS) {
    const itens = resto.filter((p) => p.modulo === m.modulo).sort(maisAntigoPrimeiro);
    if (itens.length) grupos.push({ chave: m.modulo, rotulo: m.rotulo, itens });
  }
  // modulo que o app ainda nao conhece: entra no fim para nao sumir
  const outros = resto.filter((p) => !MODULOS.some((m) => m.modulo === p.modulo)).sort(maisAntigoPrimeiro);
  if (outros.length) grupos.push({ chave: "outros", rotulo: "Outros", itens: outros });
  return grupos;
}

/** Corta a lista agrupada nas primeiras N linhas (na ordem dos grupos), sem deixar grupo vazio. */
export function limitarGrupos(grupos: GrupoPedidos[], limite: number): GrupoPedidos[] {
  const r: GrupoPedidos[] = [];
  let resta = limite;
  for (const g of grupos) {
    if (resta <= 0) break;
    r.push({ ...g, itens: g.itens.slice(0, resta) });
    resta -= Math.min(g.itens.length, resta);
  }
  return r;
}
