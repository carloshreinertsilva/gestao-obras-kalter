// Leitura do XML da NF de terceiros no navegador (Pacote 3, C2). O robo so liga a NF a entrada do ERP com fornecedor +
// numero + data de emissao IGUAIS; digitar errado (ex.: ano 2025 no lugar de 2026) trava o lancamento. Aqui o XML
// anexado preenche/confere numero, emissao, valor e CNPJ do prestador.
// Funcao pura e sem DOMParser (o vitest roda em node): parser XML minimo proprio, que ignora namespaces/prefixos.
// NFS-e nao tem layout unico no Brasil: cada layout e uma "receita" em RECEITAS; para outra prefeitura, acrescente uma.

export type TipoNfXml = "nfe" | "nfse" | "cte" | "desconhecido";

export interface LeituraNfXml {
  tipo: TipoNfXml;
  numero?: string;
  emissao?: string; // AAAA-MM-DD, como escrita no XML (sem converter fuso)
  valor?: number; // valor bruto (dos servicos / total da nota), nao o liquido de retencoes
  cnpjEmitente?: string; // so digitos (CPF quando o prestador e pessoa fisica)
  nomeEmitente?: string;
  cnpjTomador?: string;
  avisos: string[];
}

// ---------------------------------------------------------------------------------------------
// Parser minimo
// ---------------------------------------------------------------------------------------------
export interface No {
  nome: string; // nome local, sem prefixo de namespace
  filhos: No[];
  texto: string;
  pai: No | null;
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodificarEntidades(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === "#") {
      const cod = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cod) && cod > 0 && cod <= 0x10ffff ? String.fromCodePoint(cod) : m;
    }
    return ENTIDADES[e] ?? m;
  });
}

const nomeLocal = (n: string) => n.slice(n.indexOf(":") + 1);

// Devolve a raiz ou null se o XML estiver malformado (tag sem fechar, fechamento trocado, nada de elemento).
export function analisarXml(texto: string): No | null {
  const s = texto.replace(/^﻿/, "");
  const doc: No = { nome: "#doc", filhos: [], texto: "", pai: null };
  let atual = doc;
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt < 0) {
      if (atual !== doc) atual.texto += decodificarEntidades(s.slice(i));
      break;
    }
    if (lt > i && atual !== doc) atual.texto += decodificarEntidades(s.slice(i, lt));
    if (s.startsWith("<!--", lt)) {
      const f = s.indexOf("-->", lt + 4);
      if (f < 0) return null;
      i = f + 3;
    } else if (s.startsWith("<![CDATA[", lt)) {
      const f = s.indexOf("]]>", lt + 9);
      if (f < 0) return null;
      if (atual !== doc) atual.texto += s.slice(lt + 9, f);
      i = f + 3;
    } else if (s.startsWith("<?", lt)) {
      const f = s.indexOf("?>", lt + 2);
      if (f < 0) return null;
      i = f + 2;
    } else if (s.startsWith("<!", lt)) {
      // DOCTYPE (sem subconjunto interno: nao aparece em NF)
      const f = s.indexOf(">", lt + 2);
      if (f < 0) return null;
      i = f + 1;
    } else if (s[lt + 1] === "/") {
      const f = s.indexOf(">", lt + 2);
      if (f < 0) return null;
      const nome = nomeLocal(s.slice(lt + 2, f).trim());
      if (atual === doc || atual.nome !== nome) return null;
      atual = atual.pai!;
      i = f + 1;
    } else {
      // abertura: acha o ">" fora de aspas (valor de atributo pode ter ">")
      let j = lt + 1;
      let aspas = "";
      for (; j < s.length; j++) {
        const c = s[j];
        if (aspas) {
          if (c === aspas) aspas = "";
        } else if (c === '"' || c === "'") aspas = c;
        else if (c === ">") break;
      }
      if (j >= s.length) return null;
      const corpo = s.slice(lt + 1, j);
      const auto = corpo.endsWith("/");
      const m = /^([^\s/>]+)/.exec(corpo);
      if (!m) return null;
      const no: No = { nome: nomeLocal(m[1]), filhos: [], texto: "", pai: atual };
      atual.filhos.push(no);
      if (!auto) atual = no;
      i = j + 1;
    }
  }
  if (atual !== doc || doc.filhos.length !== 1) return null;
  const raiz = doc.filhos[0];
  raiz.pai = null;
  return raiz;
}

function* percorrer(no: No): Generator<No> {
  yield no;
  for (const f of no.filhos) yield* percorrer(f);
}

// Primeiro elemento (ordem do documento) cujo caminho TERMINA com os nomes dados, pai e filho diretos.
// Ex.: achar(raiz, "InfNfse/Numero") nao pega Rps/IdentificacaoRps/Numero.
export function achar(raiz: No, caminho: string): No | undefined {
  const partes = caminho.split("/");
  for (const no of percorrer(raiz)) {
    let n: No | null = no;
    let k = partes.length - 1;
    while (n && k >= 0 && n.nome === partes[k]) {
      n = n.pai;
      k--;
    }
    if (k < 0) return no;
  }
  return undefined;
}

const todos = (raiz: No, nome: string) => [...percorrer(raiz)].filter((n) => n.nome === nome);

// primeiro caminho da lista que existe e tem texto
function txt(raiz: No, ...caminhos: string[]): string | undefined {
  for (const c of caminhos) {
    const v = achar(raiz, c)?.texto.trim();
    if (v) return v;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Conversoes (numeros do XML usam ponto decimal: NAO usar lerNumero, que e para digitacao brasileira)
// ---------------------------------------------------------------------------------------------
export function numeroDoXml(v?: string): number | undefined {
  if (!v) return undefined;
  let s = v.trim().replace(/\s/g, "");
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // algumas prefeituras escrevem "1234,56" ou "1.234,56"
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) || /^-?\d+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
    return Number(s);
  }
  return undefined;
}

// data como escrita (10 primeiros caracteres), nunca convertida para UTC; aceita tambem DD/MM/AAAA
export function dataDoXml(v?: string): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  let iso: string | undefined;
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (a) iso = `${a[1]}-${a[2]}-${a[3]}`;
  const b = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (!iso && b) iso = `${b[3]}-${b[2]}-${b[1]}`;
  if (!iso) return undefined;
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? iso : undefined;
}

export const soDigitos = (v?: string | null) => (v || "").replace(/\D/g, "");

// numero da NF como o banco guarda (upper(trim)) e sem zeros a esquerda (o robo compara como inteiro com o ERP)
export function normalizarNumeroNf(v?: string | null): string {
  const s = (v || "").trim().toUpperCase();
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
}

export function formatarDocumento(v?: string | null): string {
  const d = soDigitos(v);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return v || "";
}

// mesmo CNPJ/CPF comparando so digitos (sem documento de um dos lados: nao da para dizer que e diferente)
export function mesmoDocumento(a?: string | null, b?: string | null): boolean {
  const x = soDigitos(a);
  const y = soDigitos(b);
  return !x || !y || x === y;
}

// ---------------------------------------------------------------------------------------------
// Receitas por layout
// ---------------------------------------------------------------------------------------------
interface Receita {
  nome: string;
  tipo: TipoNfXml;
  reconhece: (raiz: No) => boolean;
  ler: (raiz: No, avisos: string[]) => Omit<LeituraNfXml, "tipo" | "avisos">;
}

// valor bruto; se o liquido vier diferente, avisa
function brutoLiquido(avisos: string[], bruto?: string, liquido?: string): number | undefined {
  const b = numeroDoXml(bruto);
  const l = numeroDoXml(liquido);
  if (b !== undefined && l !== undefined && Math.abs(b - l) > 0.005)
    avisos.push(`O XML traz valor líquido de ${l.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (após retenções); foi usado o valor total da nota.`);
  return b ?? l;
}

const RAIZES_EVENTO = /^(procEvento|evento|retEvento|envEvento|pedRegEvento|procCancNFe|cancNFe|retCancNFe|inutNFe|procInutNFe|eventoNFSe|CancelarNfse|PedidoCancelamento)/i;

const RECEITAS: Receita[] = [
  {
    // NF-e modelo 55 (produto; algumas prestadoras emitem conjugada com ISSQN)
    nome: "NF-e",
    tipo: "nfe",
    reconhece: (r) => Boolean(achar(r, "infNFe")),
    ler: (r) => ({
      numero: txt(r, "ide/nNF"),
      emissao: txt(r, "ide/dhEmi", "ide/dEmi"),
      valor: numeroDoXml(txt(r, "ICMSTot/vNF")),
      cnpjEmitente: txt(r, "emit/CNPJ", "emit/CPF"),
      nomeEmitente: txt(r, "emit/xNome"),
      cnpjTomador: txt(r, "dest/CNPJ", "dest/CPF"),
    }),
  },
  {
    // CT-e (frete)
    nome: "CT-e",
    tipo: "cte",
    reconhece: (r) => Boolean(achar(r, "infCte")),
    ler: (r) => ({
      numero: txt(r, "ide/nCT"),
      emissao: txt(r, "ide/dhEmi"),
      valor: numeroDoXml(txt(r, "vPrest/vTPrest")),
      cnpjEmitente: txt(r, "emit/CNPJ", "emit/CPF"),
      nomeEmitente: txt(r, "emit/xNome"),
      cnpjTomador: txt(r, "toma3/CNPJ", "toma4/CNPJ", "dest/CNPJ"),
    }),
  },
  {
    // NFS-e padrao nacional (NFSe/infNFSe + DPS/infDPS). Emissao = data da NFS-e (dhProc); dhEmi e a da DPS
    nome: "NFS-e nacional",
    tipo: "nfse",
    reconhece: (r) => Boolean(achar(r, "infNFSe")),
    ler: (r, avisos) => {
      const proc = dataDoXml(txt(r, "infNFSe/dhProc"));
      const dps = dataDoXml(txt(r, "infDPS/dhEmi"));
      if (proc && dps && proc !== dps) avisos.push(`A DPS foi emitida em ${dps.split("-").reverse().join("/")}; a nota em ${proc.split("-").reverse().join("/")} (usada aqui).`);
      return {
        numero: txt(r, "infNFSe/nNFSe"),
        emissao: proc || dps,
        valor: brutoLiquido(avisos, txt(r, "vServPrest/vServ"), txt(r, "infNFSe/valores/vLiq")),
        cnpjEmitente: txt(r, "infNFSe/emit/CNPJ", "infNFSe/emit/CPF", "prest/CNPJ", "prest/CPF"),
        nomeEmitente: txt(r, "infNFSe/emit/xNome", "prest/xNome"),
        cnpjTomador: txt(r, "toma/CNPJ", "toma/CPF"),
      };
    },
  },
  {
    // ABRASF 1.0 e 2.0x (a maioria das prefeituras: Ginfes, Betha, ISSNet, WebISS...)
    nome: "NFS-e ABRASF",
    tipo: "nfse",
    reconhece: (r) => Boolean(achar(r, "InfNfse")),
    ler: (r, avisos) => {
      const notas = todos(r, "InfNfse").length;
      if (notas > 1) avisos.push(`O XML tem ${notas} notas; foi lida a primeira.`);
      if (achar(r, "NfseCancelamento")) avisos.push("O XML indica que esta nota foi CANCELADA.");
      return {
        numero: txt(r, "InfNfse/Numero"),
        // so a data de emissao da nota (Competencia e o mes do servico, nao serve para ligar com o ERP)
        emissao: txt(r, "InfNfse/DataEmissao"),
        valor: brutoLiquido(
          avisos,
          txt(r, "Valores/ValorServicos"),
          txt(r, "ValoresNfse/ValorLiquidoNfse", "Valores/ValorLiquidoNfse", "InfNfse/ValorLiquidoNfse"),
        ),
        cnpjEmitente: txt(
          r,
          "IdentificacaoPrestador/CpfCnpj/Cnpj",
          "IdentificacaoPrestador/CpfCnpj/Cpf",
          "IdentificacaoPrestador/Cnpj",
          "Prestador/CpfCnpj/Cnpj",
          "Prestador/CpfCnpj/Cpf",
          "Prestador/Cnpj",
        ),
        nomeEmitente: txt(r, "PrestadorServico/RazaoSocial", "PrestadorServico/NomeFantasia"),
        cnpjTomador: txt(r, "IdentificacaoTomador/CpfCnpj/Cnpj", "IdentificacaoTomador/CpfCnpj/Cpf", "IdentificacaoTomador/Cnpj"),
      };
    },
  },
  {
    // Prefeitura de Sao Paulo (NFS-e paulistana)
    nome: "NFS-e São Paulo",
    tipo: "nfse",
    reconhece: (r) => Boolean(achar(r, "NumeroNFe")),
    ler: (r, avisos) => {
      if (txt(r, "StatusNFe")?.toUpperCase() === "C") avisos.push("O XML indica que esta nota foi CANCELADA.");
      return {
        numero: txt(r, "ChaveNFe/NumeroNFe", "NumeroNFe"),
        emissao: txt(r, "DataEmissaoNFe", "DataEmissao"),
        valor: numeroDoXml(txt(r, "ValorServicos")),
        cnpjEmitente: txt(r, "CPFCNPJPrestador/CNPJ", "CPFCNPJPrestador/CPF"),
        nomeEmitente: txt(r, "RazaoSocialPrestador"),
        cnpjTomador: txt(r, "CPFCNPJTomador/CNPJ", "CPFCNPJTomador/CPF"),
      };
    },
  },
];

function lerRaiz(raiz: No, profundidade: number): LeituraNfXml | null {
  const avisos: string[] = [];
  if (RAIZES_EVENTO.test(raiz.nome))
    return { tipo: "desconhecido", avisos: ["Este XML é de um evento (cancelamento, correção…), não da nota."] };
  const receita = RECEITAS.find((r) => r.reconhece(raiz));
  if (!receita) {
    // alguns sistemas devolvem a nota como texto escapado dentro de outro XML (ex.: resposta SOAP)
    if (profundidade < 2)
      for (const no of percorrer(raiz)) {
        const t = no.texto.trim();
        if (t.startsWith("<") && t.length > 50) {
          const interna = analisarXml(t);
          const lida = interna && lerRaiz(interna, profundidade + 1);
          if (lida && lida.tipo !== "desconhecido") return lida;
        }
      }
    return { tipo: "desconhecido", avisos: ["Layout de XML não reconhecido."] };
  }
  const b = receita.ler(raiz, avisos);
  const out: LeituraNfXml = { tipo: receita.tipo, avisos };
  const numero = b.numero ? normalizarNumeroNf(b.numero) : "";
  if (numero) out.numero = numero;
  const emissao = dataDoXml(b.emissao);
  if (emissao) out.emissao = emissao;
  if (b.valor !== undefined && Number.isFinite(b.valor) && b.valor > 0) out.valor = Math.round(b.valor * 100) / 100;
  const cnpj = soDigitos(b.cnpjEmitente);
  if (cnpj) out.cnpjEmitente = cnpj;
  if (b.nomeEmitente) out.nomeEmitente = b.nomeEmitente;
  const tomador = soDigitos(b.cnpjTomador);
  if (tomador) out.cnpjTomador = tomador;
  if (!out.numero && !out.emissao && out.valor === undefined) return { tipo: "desconhecido", avisos: [`Nada encontrado no XML (${receita.nome}).`] };
  return out;
}

// null = nao e XML (ou esta corrompido); tipo "desconhecido" = XML valido mas nao e uma nota que da para ler
export function lerNfXml(texto: string): LeituraNfXml | null {
  if (!texto || !texto.trim()) return null;
  const raiz = analisarXml(texto);
  return raiz ? lerRaiz(raiz, 0) : null;
}

// leitura util para a tela: tem ao menos um dos campos que o usuario digita
export const leituraUtil = (l: LeituraNfXml | null): l is LeituraNfXml =>
  Boolean(l && l.tipo !== "desconhecido" && (l.numero || l.emissao || l.valor !== undefined));

// Bytes do arquivo -> texto, respeitando o encoding declarado (prefeituras antigas mandam ISO-8859-1)
export function decodificarXml(bytes: Uint8Array): string {
  const cabeca = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const enc = /encoding\s*=\s*["']([\w-]+)["']/i.exec(cabeca)?.[1]?.toLowerCase();
  if (enc && enc !== "utf-8" && enc !== "utf8") {
    try {
      return new TextDecoder(enc).decode(bytes);
    } catch {
      // encoding desconhecido: cai no utf-8
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

// ---------------------------------------------------------------------------------------------
// Comparacao com o que foi digitado
// ---------------------------------------------------------------------------------------------
export type CampoXml = "numero" | "emissao" | "valor";

export interface DiferencaXml {
  campo: CampoXml;
  rotulo: string;
  digitado: string; // ja formatado para mostrar
  doXml: string; // ja formatado para mostrar
}

const fmtData = (iso: string) => iso.split("-").reverse().join("/");
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// So compara campo preenchido dos dois lados (campo vazio nao e diferenca: o XML preenche).
export function diferencasXml(
  l: LeituraNfXml,
  digitado: { numero: string; emissao: string; valor: number | null },
): DiferencaXml[] {
  const out: DiferencaXml[] = [];
  if (l.numero && digitado.numero.trim() && normalizarNumeroNf(digitado.numero) !== normalizarNumeroNf(l.numero))
    out.push({ campo: "numero", rotulo: "Número da NF", digitado: digitado.numero.trim(), doXml: l.numero });
  if (l.emissao && digitado.emissao && digitado.emissao !== l.emissao)
    out.push({ campo: "emissao", rotulo: "Data de emissão", digitado: fmtData(digitado.emissao), doXml: fmtData(l.emissao) });
  if (l.valor !== undefined && digitado.valor && Math.abs(digitado.valor - l.valor) > 0.005)
    out.push({ campo: "valor", rotulo: "Valor", digitado: fmtMoeda(digitado.valor), doXml: fmtMoeda(l.valor) });
  return out;
}

// "NF 123 · emissão 05/11/2026 · R$ 1.234,56 · CNPJ 00.000.000/0001-00"
export function resumoXml(l: LeituraNfXml): string {
  return [
    l.numero && `NF ${l.numero}`,
    l.emissao && `emissão ${fmtData(l.emissao)}`,
    l.valor !== undefined && fmtMoeda(l.valor),
    l.cnpjEmitente && `${l.cnpjEmitente.length === 11 ? "CPF" : "CNPJ"} ${formatarDocumento(l.cnpjEmitente)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
