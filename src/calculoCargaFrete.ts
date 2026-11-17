// Fretes: leitura da carga colada do Excel e copia de um frete anterior (contas puras, sem tela).
// O formato do item e o que o banco aceita em frete_salvar (frete_carga_normalizar): descricao, quantidade (inteira > 0),
// peso_kg (> 0 ou nulo), altura/largura/comprimento em metros (as tres ou nenhuma).
import { lerNumero } from "./numero";

export interface ItemLido {
  descricao: string | null;
  quantidade: number;
  peso_kg: number | null;
  altura_m: number | null;
  largura_m: number | null;
  comprimento_m: number | null;
}

type Campo = "descricao" | "quantidade" | "peso" | "altura" | "largura" | "comprimento";
// "volumes" vale como quantidade so quando nao ha coluna de quantidade; "ignorar" = reconhecida, mas o app nao guarda
type Reconhecido = Campo | "volumes" | "ignorar";

/** ordem das colunas que o formulario mostra na tela (usada quando o texto nao tem cabecalho) */
export const ORDEM_TELA: Campo[] = ["descricao", "quantidade", "peso", "altura", "largura", "comprimento"];
export const LIMITE_LINHAS = 200;
const MAX_DIMENSAO_M = 30; // mesma conferencia do formulario (provavel milimetro digitado no lugar de metro)

export const ROTULO_CAMPO: Record<Campo, string> = {
  descricao: "Descrição",
  quantidade: "Quantidade",
  peso: "Peso de cada volume (kg)",
  altura: "Altura (m)",
  largura: "Largura (m)",
  comprimento: "Comprimento (m)",
};

const ALIASES: Record<string, Reconhecido> = {
  descricao: "descricao", desc: "descricao", descr: "descricao", item: "descricao", itens: "descricao", material: "descricao",
  produto: "descricao", mercadoria: "descricao", carga: "descricao", nome: "descricao", descricaodoitem: "descricao",
  qtd: "quantidade", qtde: "quantidade", qde: "quantidade", qt: "quantidade", quant: "quantidade", quantidade: "quantidade",
  qte: "quantidade", unidades: "quantidade",
  volumes: "volumes", volume: "volumes", vol: "volumes", vols: "volumes",
  peso: "peso", pesokg: "peso", pesoun: "peso", pesounit: "peso", pesounitario: "peso", pesounkg: "peso", pesounitariokg: "peso",
  pesodecadavolume: "peso", kg: "peso", pesobruto: "peso",
  altura: "altura", alt: "altura", alturam: "altura", altm: "altura",
  largura: "largura", larg: "largura", largurem: "largura", largm: "largura", larguram: "largura",
  comprimento: "comprimento", comp: "comprimento", compr: "comprimento", comprimentom: "comprimento", compm: "comprimento",
  // reconhecidas mas sem lugar na carga do app (nao viram erro nem coluna "desconhecida")
  valor: "ignorar", vlr: "ignorar", valormercadoria: "ignorar", valordamercadoria: "ignorar", preco: "ignorar", valortotal: "ignorar",
  pesototal: "ignorar", pesototalkg: "ignorar", m3: "ignorar", cubagem: "ignorar", cubagemm3: "ignorar", total: "ignorar",
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
/** nome de coluna comparavel: sem acento, minusculo, sem o que esta entre parenteses nem pontuacao ("Peso un. (kg)" -> "pesoun") */
export const nomeColuna = (t: string) =>
  semAcento(t)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
const reconhecer = (t: string): Reconhecido | null => {
  const n = nomeColuna(t);
  if (ALIASES[n]) return ALIASES[n];
  // "Altura (m)" sem parenteses vira "alturam"; ja ha alias, mas tenta tambem a forma sem o sufixo de unidade
  const sem = n.replace(/(kg|m)$/, "");
  return sem !== n && ALIASES[sem] ? ALIASES[sem] : null;
};

// ---------------------------------------------------------------------------------------------
// Divisao do texto em linhas e celulas (aspas duplas do Excel, com quebra de linha dentro da celula)

function delimitador(texto: string): string {
  // o Excel separa por TAB; CSV brasileiro por ";" (a virgula e decimal, nunca separador). Olha so fora das aspas.
  let dentro = false;
  let tabs = 0;
  let pontoVirgula = 0;
  for (const c of texto) {
    if (c === '"') dentro = !dentro;
    else if (!dentro && c === "\t") tabs++;
    else if (!dentro && c === ";") pontoVirgula++;
  }
  return tabs > 0 ? "\t" : pontoVirgula > 0 ? ";" : "\t";
}

export function dividirCelulas(texto: string): string[][] {
  const t = texto.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const sep = delimitador(t);
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let i = 0;
  let inicioCelula = true;
  const fechaCelula = () => {
    linha.push(celula);
    celula = "";
    inicioCelula = true;
  };
  while (i < t.length) {
    const c = t[i];
    if (c === '"' && inicioCelula) {
      // celula com aspas: vai ate a aspa de fechamento ("" dentro e uma aspa literal)
      i++;
      while (i < t.length) {
        if (t[i] === '"') {
          if (t[i + 1] === '"') {
            celula += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        celula += t[i++];
      }
      inicioCelula = false;
      continue;
    }
    if (c === sep) {
      fechaCelula();
      i++;
      continue;
    }
    if (c === "\n") {
      fechaCelula();
      linhas.push(linha);
      linha = [];
      i++;
      continue;
    }
    celula += c;
    inicioCelula = false;
    i++;
  }
  if (celula !== "" || linha.length) {
    fechaCelula();
    linhas.push(linha);
  }
  return linhas.map((l) => l.map((x) => x.replace(/ /g, " ").trim()));
}

// ---------------------------------------------------------------------------------------------
// Leitura

export interface ColunaLida {
  indice: number;
  /** texto do cabecalho (ou "Coluna n" sem cabecalho) */
  titulo: string;
  /** campo da carga que a coluna alimenta; null = ignorada */
  campo: Campo | null;
  /** motivo de nao ser usada (so quando campo e null) */
  obs?: string;
}
export interface ProblemaLinha {
  /** numero da linha no texto colado (a primeira e a 1) */
  linha: number;
  mensagem: string;
}
export interface ResultadoLeitura {
  itens: ItemLido[];
  /** linha do texto de cada item de `itens` (para a previa) */
  linhasDosItens: number[];
  problemas: ProblemaLinha[];
  colunas: ColunaLida[];
  temCabecalho: boolean;
  /** havia mais linhas que o limite: as que passaram foram descartadas */
  limiteExcedido: boolean;
  /** linhas de dados lidas (sem cabecalho, vazias nem total) */
  linhasLidas: number;
}

const vazia = (l: string[]) => l.every((c) => !c.trim());
const ehNumeroComUnidade = (c: string) => /^-?\s*(R\$\s*)?[\d.,]+\s*[a-zA-Zµ³²°%/]*\.?$/.test(c.trim());
const ehLinhaTotal = (l: string[]) => {
  const primeira = l.find((c) => c.trim());
  return primeira != null && /^(sub)?total(geral)?$/.test(nomeColuna(primeira));
};

function lerCelula(texto: string, medida = false): number {
  const t = texto.trim();
  if (!t || !ehNumeroComUnidade(t)) return NaN;
  return lerNumero(t, { medida });
}

function mapearCabecalho(linha: string[]): { colunas: ColunaLida[]; reconhecidas: number } {
  const campos: Partial<Record<Campo, number>> = {};
  const reconhecidos = linha.map((t) => reconhecer(t));
  const temQuantidade = reconhecidos.includes("quantidade");
  let reconhecidas = 0;
  const colunas: ColunaLida[] = linha.map((titulo, indice) => {
    const r = reconhecidos[indice];
    if (r) reconhecidas++;
    if (!r) return { indice, titulo, campo: null, obs: titulo.trim() ? "coluna não reconhecida" : undefined };
    if (r === "ignorar") return { indice, titulo, campo: null, obs: "o app não guarda esta informação" };
    const campo: Campo = r === "volumes" ? "quantidade" : r;
    if (r === "volumes" && temQuantidade) return { indice, titulo, campo: null, obs: "já existe uma coluna de quantidade" };
    if (campos[campo] != null) return { indice, titulo, campo: null, obs: "repetida: vale a primeira" };
    campos[campo] = indice;
    return { indice, titulo, campo };
  });
  return { colunas, reconhecidas };
}

function pareceCabecalho(linha: string[]): boolean {
  const preenchidas = linha.filter((c) => c.trim());
  if (!preenchidas.length) return false;
  const reconhecidas = preenchidas.filter((c) => reconhecer(c) !== null).length;
  // dado nunca e so nome de coluna: precisa de 2 nomes conhecidos, ou do unico nome conhecido numa linha de uma celula so
  return reconhecidas >= 2 || (reconhecidas === 1 && preenchidas.length === 1 && !ehNumeroComUnidade(preenchidas[0]));
}

export function lerCargaColada(texto: string, limite = LIMITE_LINHAS): ResultadoLeitura {
  const todas = dividirCelulas(texto || "");
  const resultado: ResultadoLeitura = {
    itens: [], linhasDosItens: [], problemas: [], colunas: [], temCabecalho: false, limiteExcedido: false, linhasLidas: 0,
  };
  // primeira linha nao vazia
  const primeira = todas.findIndex((l) => !vazia(l));
  if (primeira < 0) return resultado;

  const temCabecalho = pareceCabecalho(todas[primeira]);
  const largura = Math.max(...todas.map((l) => l.length), 0);
  let colunas: ColunaLida[];
  if (temCabecalho) {
    const m = mapearCabecalho(todas[primeira]);
    colunas = m.colunas;
    // colunas depois do fim do cabecalho (linhas de dados mais largas) ficam ignoradas
    for (let i = colunas.length; i < largura; i++) colunas.push({ indice: i, titulo: `Coluna ${i + 1}`, campo: null, obs: "sem nome no cabeçalho" });
  } else {
    colunas = Array.from({ length: Math.max(largura, 1) }, (_, indice) => ({
      indice,
      titulo: `Coluna ${indice + 1}`,
      campo: ORDEM_TELA[indice] ?? null,
      obs: ORDEM_TELA[indice] ? undefined : "sem uso: a tela só tem 6 colunas",
    }));
  }
  resultado.colunas = colunas;
  resultado.temCabecalho = temCabecalho;

  const indiceDe = (campo: Campo) => colunas.find((c) => c.campo === campo)?.indice ?? -1;
  const col = {
    descricao: indiceDe("descricao"), quantidade: indiceDe("quantidade"), peso: indiceDe("peso"),
    altura: indiceDe("altura"), largura: indiceDe("largura"), comprimento: indiceDe("comprimento"),
  };
  const celula = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

  for (let n = temCabecalho ? primeira + 1 : primeira; n < todas.length; n++) {
    const l = todas[n];
    if (vazia(l) || ehLinhaTotal(l)) continue;
    resultado.linhasLidas++;
    if (resultado.linhasLidas > limite) {
      resultado.limiteExcedido = true;
      continue;
    }
    const numLinha = n + 1;
    const erros: string[] = [];

    const descricao = celula(l, col.descricao) || null;

    let quantidade = 1;
    const tq = celula(l, col.quantidade);
    if (tq) {
      const q = lerCelula(tq, true);
      if (Number.isNaN(q)) erros.push("quantidade não é número");
      else if (!Number.isInteger(q)) erros.push("quantidade precisa ser um número inteiro");
      else if (q <= 0) erros.push("quantidade precisa ser maior que zero");
      else quantidade = q;
    }

    let peso: number | null = null;
    const tp = celula(l, col.peso);
    if (tp) {
      const p = lerCelula(tp);
      if (Number.isNaN(p)) erros.push("peso não é número");
      else if (p <= 0) erros.push("peso precisa ser maior que zero");
      else peso = p;
    }

    const dims: Record<"altura" | "largura" | "comprimento", number | null> = { altura: null, largura: null, comprimento: null };
    const nomes = { altura: "altura", largura: "largura", comprimento: "comprimento" } as const;
    for (const k of ["altura", "largura", "comprimento"] as const) {
      const t = celula(l, col[k]);
      if (!t) continue;
      const v = lerCelula(t, true);
      if (Number.isNaN(v)) erros.push(`${nomes[k]} não é número`);
      else if (v <= 0) erros.push(`${nomes[k]} precisa ser maior que zero`);
      else if (v > MAX_DIMENSAO_M) erros.push(`${nomes[k]} em metros, confira (ex.: 1,20)`);
      else dims[k] = v;
    }
    const comDim = Object.values(dims).filter((v) => v !== null).length;
    // so avisa da falta de dimensao se as que vieram estavam todas boas (senao ja ha o erro de numero)
    const dimsDigitadas = [col.altura, col.largura, col.comprimento].filter((i) => celula(l, i)).length;
    if (comDim > 0 && comDim < 3 && dimsDigitadas === comDim) erros.push("informe as três dimensões (altura, largura e comprimento) ou nenhuma");

    // linha sem descricao, peso nem medida e vazia para o banco: so conta se havia algo digitado
    if (!erros.length && !descricao && peso === null && comDim === 0) {
      resultado.linhasLidas--;
      continue;
    }
    if (erros.length) {
      resultado.problemas.push({ linha: numLinha, mensagem: `linha ${numLinha}: ${erros.join("; ")}` });
      continue;
    }
    resultado.itens.push({
      descricao, quantidade, peso_kg: peso, altura_m: dims.altura, largura_m: dims.largura, comprimento_m: dims.comprimento,
    });
    resultado.linhasDosItens.push(numLinha);
  }
  return resultado;
}

/** o texto colado parece varias celulas/linhas de planilha (e nao um texto solto de um campo)? */
export const pareceTabela = (texto: string) => /[\t\n;]/.test(texto.trim()) || /\t/.test(texto);

// ---------------------------------------------------------------------------------------------
// Copiar de um frete anterior

/** campos do frete que a copia precisa (estrutural: nao importa a tela) */
export interface FreteCopiavel {
  id: string;
  numero: number;
  id_obra: string;
  codigo_obra: string;
  operacao: "compra" | "venda";
  origem_tipo: string | null;
  origem_ibge: number | null;
  origem_nome: string | null;
  destino_tipo: string | null;
  destino_ibge: number | null;
  destino_nome: string | null;
  cod_fornecedor: number | null;
  observacao: string | null;
  carga: ItemLido[] | null;
  created_at: string;
}

/** O que a copia leva. Status, cotacoes, transportadora, valores, CT-e, datas, documento e versao NUNCA vao. */
export function dadosDaCopia(f: FreteCopiavel) {
  return {
    idObra: f.id_obra,
    operacao: f.operacao,
    origem: { tipo: f.origem_tipo || "outro", ibge: f.origem_ibge, nome: f.origem_nome || "", codFornecedor: f.origem_tipo === "fornecedor" ? f.cod_fornecedor : null },
    destino: { tipo: f.destino_tipo || "outro", ibge: f.destino_ibge, nome: f.destino_nome || "", codFornecedor: f.destino_tipo === "fornecedor" ? f.cod_fornecedor : null },
    carga: (f.carga || []).map((i) => ({ ...i })),
    observacao: f.observacao || "",
  };
}

const minusculo = (t: unknown) => semAcento(String(t ?? "")).toLowerCase();

/** Fretes para escolher na copia: busca por numero, obra, origem ou destino; os da mesma obra primeiro, depois os mais recentes. */
export function fretesParaCopiar<T extends FreteCopiavel>(fretes: T[], idObra: string, busca: string): T[] {
  const termos = minusculo(busca).split(/\s+/).filter(Boolean);
  return fretes
    .filter((f) => {
      if (!termos.length) return true;
      const texto = [f.numero, f.codigo_obra, f.origem_nome, f.destino_nome].map(minusculo).join(" ");
      return termos.every((t) => texto.includes(t));
    })
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      const ma = idObra && a.f.id_obra === idObra ? 0 : 1;
      const mb = idObra && b.f.id_obra === idObra ? 0 : 1;
      if (ma !== mb) return ma - mb;
      if (a.f.created_at !== b.f.created_at) return a.f.created_at < b.f.created_at ? 1 : -1;
      return a.i - b.i;
    })
    .map((x) => x.f);
}
