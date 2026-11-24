// Leitura do MD da cotacao (Painel BeeStock) so para a PREVIA na tela de importacao. Quem valida de verdade e o robo
// (robo-sync-erp/src/gerar_pedido_compra.py, parse_arquivo); aqui so o suficiente para o comprador conferir o que vai
// enviar: fornecedor, SCs, valores e total. Mudou o formato la, mudar aqui.

export interface ItemCotacao {
  sc: number;
  material: string;
  qtde: number;
  un: string;
  preco: number;
  ipi: number;
  entrega: string; // AAAA-MM-DD
  total: number; // base + IPI, arredondados separadamente como o ERP
}

export interface PreviaCotacao {
  titulo: string | null;
  intencao: string | null;
  previsao: boolean | null;
  fornecedores: number[];
  condicao: number | null;
  frete: string | null; // "1" FOB, "2" CIF
  observacao: string | null;
  itens: ItemCotacao[];
  total: number;
  problemas: string[];
}

const centavos = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function numero(texto: string): number {
  const t = texto.trim().replace(/\s/g, "");
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
}

export function valorItem(qtde: number, preco: number, ipi: number): number {
  const base = centavos(qtde * preco);
  return centavos(base + centavos((base * ipi) / 100));
}

export function lerCotacao(md: string): PreviaCotacao {
  const linhas = md.split(/\r?\n/);
  const r: PreviaCotacao = {
    titulo: linhas.find((l) => l.startsWith("# "))?.slice(2).trim() || null,
    intencao: null,
    previsao: null,
    fornecedores: [],
    condicao: null,
    frete: null,
    observacao: null,
    itens: [],
    total: 0,
    problemas: [],
  };
  const ini = linhas.findIndex((l) => l.trim().toLowerCase().startsWith("## pedidos para processar"));
  if (ini < 0) {
    r.problemas.push('O arquivo não tem a seção "Pedidos para processar".');
    return r;
  }
  const cercas = linhas.map((l, i) => (i > ini && l.trim().startsWith("```") ? i : -1)).filter((i) => i >= 0);
  if (cercas.length < 2) {
    r.problemas.push('A seção "Pedidos para processar" precisa de um bloco de código (```).');
    return r;
  }
  for (const bruta of linhas.slice(cercas[0] + 1, cercas[1])) {
    const l = bruta.trim();
    if (!l) continue;
    if (l.startsWith("#")) {
      const m = l.match(/^#\s*(INTENCAO|PREVISAO_PAGAMENTO)\s*\|\s*(\w+)/i);
      if (m && m[1].toUpperCase() === "INTENCAO") r.intencao = m[2].toUpperCase();
      else if (m) r.previsao = m[2].toUpperCase() === "SIM";
      continue;
    }
    const p = l.split("|").map((x) => x.trim());
    if (p.length === 7) {
      r.fornecedores.push(Number(p[0]));
      r.condicao = Number(p[1]);
      r.frete = p[2];
      r.observacao = p[6] || null;
    } else if (p.length === 13) {
      const [, sc, material, qtde, un, preco, ipi, , , entrega] = p;
      const item = { sc: Number(sc), material, qtde: numero(qtde), un, preco: numero(preco), ipi: numero(ipi || "0"), entrega, total: 0 };
      if (![item.sc, item.qtde, item.preco, item.ipi].every(Number.isFinite)) {
        r.problemas.push(`Linha com número inválido: ${l}`);
        continue;
      }
      item.total = valorItem(item.qtde, item.preco, item.ipi);
      r.itens.push(item);
    } else {
      r.problemas.push(`Linha com ${p.length} campos (esperado 7 de cabeçalho ou 13 de item): ${l}`);
    }
  }
  r.total = centavos(r.itens.reduce((s, i) => s + i.total, 0));
  if (r.intencao !== "D") r.problemas.push("Falta a linha '# INTENCAO|D' (só a intenção D, gerar pedido, é aceita).");
  if (r.previsao === null) r.problemas.push("Falta a linha '# PREVISAO_PAGAMENTO|SIM' (ou NAO).");
  if (r.fornecedores.length !== 1) r.problemas.push(`O arquivo tem ${r.fornecedores.length} fornecedores; cada arquivo deve ter um só.`);
  if (r.itens.length === 0) r.problemas.push("Nenhum item no arquivo.");
  return r;
}
