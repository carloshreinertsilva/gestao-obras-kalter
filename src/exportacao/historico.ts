// O que mudou entre duas versoes do processo (a copia guardada na aprovacao, em exportacao_processos_versoes, e o processo
// de agora), em linguagem de tela: "Importador · Cidade: COCHABAMBA -> SANTA CRUZ". So o que se digita entra; marcas
// internas (estimado, aceito, fonte da estimativa...) ficam de fora.
import { num } from "./numeros";
import type { ItemInvoice, Material, Processo } from "./tipos";

export interface Diferenca {
  grupo: string;
  campo: string;
  antes: string;
  depois: string;
}

/** Linha de public.exportacao_processos_versoes (sem a copia dos dados, que so se le quando precisa). */
export interface EventoHistorico {
  id: number;
  evento: "aprovado" | "editado_apos_aprovacao" | "final_gerado";
  nome_por: string | null;
  em: string;
  obs: string | null;
}

export const NOME_EVENTO: Record<EventoHistorico["evento"], string> = {
  aprovado: "Aprovou os documentos",
  editado_apos_aprovacao: "Alterou depois da aprovação (precisa aprovar de novo)",
  final_gerado: "Gerou os documentos finais",
};

const GRUPOS: [keyof Processo, string][] = [
  ["documento", "Documento"],
  ["exportador", "Exportador"],
  ["importador", "Importador"],
  ["consignatario", "Consignatário"],
  ["comercial", "Condições comerciais"],
  ["embarque", "Embarque"],
  ["certificado", "Certificado de origem"],
];

const CAMPOS: Record<string, string> = {
  numero: "Nº da Invoice",
  data: "Data",
  idioma: "Idioma",
  descricao_geral: "Descrição geral",
  razao: "Razão social",
  cnpj: "CNPJ",
  id_fiscal: "Identificação fiscal",
  endereco: "Endereço",
  cidade: "Cidade",
  uf: "UF",
  cep: "CEP",
  pais: "País",
  fone: "Telefone",
  email: "E-mail",
  contato: "Contato",
  ped_cliente: "Pedido do cliente",
  igual_importador: "Mesmo que o importador",
  moeda: "Moeda",
  taxa_cambio: "Câmbio",
  incoterm: "Incoterm",
  local_incoterm: "Local do Incoterm",
  condicao_pagamento: "Condição de pagamento",
  validade_proforma: "Validade da Proforma",
  prazo_entrega: "Prazo de entrega",
  frete: "Frete",
  seguro: "Seguro",
  banco: "Dados bancários",
  observacoes: "Observações",
  modal: "Modal",
  local_embarque: "Local de embarque",
  porto_destino: "Porto / local de destino",
  fronteira: "Fronteira",
  destino_final: "Destino final",
  transportadora: "Transportadora",
  data_prevista: "Data prevista",
  pais_origem: "País de origem",
  pais_destino: "País de destino",
  nf: "NF",
  placa: "Placa",
  motorista: "Motorista",
  data_saida: "Data de saída",
  data_romaneio: "Data do romaneio",
  carregamento: "Carregamento",
  qtd_volumes: "Nº de volumes",
  emitir: "Emitir",
  acordo: "Acordo",
  criterio_origem: "Critério de origem",
  entidade: "Entidade emissora",
  fatura_comercial: "Fatura comercial",
  descricao: "Descrição",
  descricao_en: "Descrição (EN/ES)",
  ncm: "NCM",
  unidade: "Unidade",
  quantidade: "Quantidade",
  valor_unit: "Valor unitário",
  peso_liq: "Peso líquido",
  peso_bruto: "Peso bruto",
  comp: "Comprimento",
  larg: "Largura",
  alt: "Altura",
  m3: "m³",
  tipo_volume: "Tipo de volume",
  un_estat: "Unidade aduaneira",
  qtd_estat: "Qtd. aduaneira",
};

const CAMPOS_ITEM: (keyof ItemInvoice)[] = ["descricao", "descricao_en", "ncm", "unidade", "quantidade", "valor_unit", "peso_liq", "peso_bruto"];
const CAMPOS_MATERIAL: (keyof Material)[] = ["quantidade", "peso_liq", "peso_bruto", "comp", "larg", "alt", "m3", "tipo_volume", "un_estat", "qtd_estat"];

// numero como no num() (ponto decimal); o que a tela digita ja vem como numero
const numerico = (v: unknown) => typeof v === "number" || (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()));
const vazio = (v: unknown) => v === undefined || v === null || String(v).trim() === "";

/** Texto para mostrar: vazio = "—"; numero no formato brasileiro; sim/nao. */
export function mostrar(v: unknown): string {
  if (vazio(v)) return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (numerico(v)) return num(v).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function iguais(a: unknown, b: unknown): boolean {
  // vazio e zero valem o mesmo (campo numerico apagado)
  if (vazio(a) || vazio(b)) return (vazio(a) || (numerico(a) && num(a) === 0)) && (vazio(b) || (numerico(b) && num(b) === 0));
  if (numerico(a) && numerico(b)) return Math.abs(num(a) - num(b)) < 1e-9;
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return String(a).trim() === String(b).trim();
}

const rotulo = (k: string) => CAMPOS[k] ?? k;

export function diferencas(antes: Processo, depois: Processo): Diferenca[] {
  const r: Diferenca[] = [];
  const add = (grupo: string, campo: string, a: unknown, b: unknown) => {
    if (!iguais(a, b)) r.push({ grupo, campo, antes: mostrar(a), depois: mostrar(b) });
  };

  for (const [chave, grupo] of GRUPOS) {
    const a = (antes[chave] ?? {}) as Record<string, unknown>;
    const b = (depois[chave] ?? {}) as Record<string, unknown>;
    const ks = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k in CAMPOS);
    for (const k of ks) add(grupo, rotulo(k), a[k], b[k]);
  }

  const ia = antes.itens ?? [];
  const ib = depois.itens ?? [];
  for (let n = 0; n < Math.max(ia.length, ib.length); n++) {
    const grupo = `Item ${n + 1} da Invoice`;
    if (!ia[n]) r.push({ grupo, campo: "Item", antes: "—", depois: `incluído: ${mostrar(ib[n].descricao)}` });
    else if (!ib[n]) r.push({ grupo, campo: "Item", antes: mostrar(ia[n].descricao), depois: "removido" });
    else for (const k of CAMPOS_ITEM) add(grupo, rotulo(k), ia[n][k], ib[n][k]);
  }

  const chave = (m: Material) => `${m.sma}-${m.seq}`;
  const ma = new Map((antes.packing?.materiais ?? []).map((m) => [chave(m), m]));
  const mb = new Map((depois.packing?.materiais ?? []).map((m) => [chave(m), m]));
  for (const [k, b] of mb) {
    const a = ma.get(k);
    const grupo = `Packing List · ${b.codigo || k}`;
    if (!a) r.push({ grupo, campo: "Material", antes: "—", depois: "entrou na lista da SMA" });
    else for (const c of CAMPOS_MATERIAL) add(grupo, rotulo(c), a[c], b[c]);
  }
  for (const [k, a] of ma) if (!mb.has(k)) r.push({ grupo: `Packing List · ${a.codigo || k}`, campo: "Material", antes: "na lista", depois: "saiu da lista da SMA" });
  return r;
}
