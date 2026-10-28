// Modelo do processo de exportacao (guia, secao 5): o que fica em public.exportacao_processos.dados.
// Numeros digitados podem estar como texto ou numero (a revisao le tudo por num()).

export type Valor = number | string | null | undefined;

export interface Material {
  sma: number;
  seq: number;
  situacao?: string;
  etapa?: string;
  familia?: string;
  familia_desc?: string;
  codigo?: string;
  descricao?: string;
  unidade?: string;
  ncm?: string;
  un_estat?: string;
  peso_un?: Valor;
  qtd_solic?: Valor;
  qtd_atend?: Valor;
  quantidade?: Valor;
  peso_liq?: Valor;
  peso_bruto?: Valor;
  comp?: Valor;
  larg?: Valor;
  alt?: Valor;
  tipo_volume?: string;
  m3?: Valor;
  qtd_estat?: Valor;
  estimado?: string[];
  aceito?: string[];
  peso_un_est?: number | null;
  bruto_un_est?: number | null;
  fonte_est?: string | null;
  peso_divergente?: number;
}

export interface ItemInvoice {
  seq?: number;
  codigo?: string;
  codigo_invoice?: string;
  descricao?: string;
  descricao_en?: string;
  ncm?: string;
  unidade?: string;
  quantidade?: Valor;
  valor_unit?: Valor;
  valor_unit_brl?: Valor;
  peso_liq?: Valor;
  peso_bruto?: Valor;
  criterio?: string;
}

export interface Parte {
  razao?: string;
  cnpj?: string;
  id_fiscal?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  pais?: string;
  fone?: string;
  email?: string;
  contato?: string;
  ped_cliente?: string;
}

export interface Processo {
  pedido: number;
  documento: { numero?: string; data?: string; idioma?: string; descricao_geral?: string };
  exportador: Parte;
  importador: Parte;
  consignatario: { igual_importador?: boolean; razao?: string; endereco?: string; cidade?: string; pais?: string };
  comercial: {
    moeda?: string;
    taxa_cambio?: Valor;
    incoterm?: string;
    local_incoterm?: string;
    condicao_pagamento?: string;
    validade_proforma?: string;
    prazo_entrega?: string;
    frete?: Valor;
    seguro?: Valor;
    banco?: string;
    observacoes?: string;
  };
  embarque: {
    modal?: string;
    local_embarque?: string;
    porto_destino?: string;
    fronteira?: string;
    destino_final?: string;
    transportadora?: string;
    data_prevista?: string;
    pais_origem?: string;
    pais_destino?: string;
    nf?: string;
    placa?: string;
    motorista?: string;
    data_saida?: string;
    data_romaneio?: string;
    carregamento?: string;
    qtd_volumes?: Valor;
  };
  itens: ItemInvoice[];
  volumes?: unknown[];
  packing?: { cc?: number | string; lido_em?: string; materiais: Material[] };
  certificado?: { emitir?: boolean; acordo?: string; criterio_origem?: string; entidade?: string; fatura_comercial?: string };
}

/** Secao "erp" do guia: o pedido como esta no ERP (so leitura; o robo atualiza). */
export interface ErpPedido {
  pedido?: number;
  situacao?: string;
  cadastro?: string;
  aprovacao?: string;
  valor_brl?: Valor;
  cfop?: Valor;
  moeda_pedido?: Valor;
  antecipado_brl?: Valor;
  cod_cliente?: Valor;
  cliente_uf?: string;
  cliente_cod_pais?: Valor;
  cliente_pais_erp?: string;
  cliente_cod_municip?: Valor;
  parcelas?: { seq: number; valor: Valor; vencimento: string; antecipada: Valor }[];
  romaneios?: { romaneio: number; situacao: Valor; volumes: Valor; peso_liq: Valor; peso_bruto: Valor }[];
  nfs?: { nota: Valor; serie: string; emissao: string; valor: Valor }[];
  itens?: { seq: number; codigo: string; descricao: string; ncm: Valor; tipo_item: Valor; qtd: Valor; vlr_unit_brl: Valor; ipi: Valor }[];
}

export type Nivel = "erro" | "aviso";

export interface Ajuste {
  nivel: Nivel;
  /** "documento" = corrigir na tela; "erp" = corrigir no ERP (so o Carlos Silva) */
  onde: "documento" | "erp";
  campo: string;
  texto: string;
}

export interface Totais {
  valor: number;
  frete: number;
  seguro: number;
  valor_total: number;
  peso_liq: number;
  peso_bruto: number;
  m3: number;
  volumes: number;
  materiais: number;
}

export interface Revisao {
  ajustes: Ajuste[];
  bloqueado: boolean;
  totais: Totais;
}

/** Aprovacao gravada pelo banco (hash do conteudo aprovado). Vale enquanto aprovacao.hash == hash do processo. */
export interface Aprovacao {
  hash: string;
  em: string;
  por: string;
  id_usuario?: string;
}

/** Linha de public.exportacao_documentos (sem a coluna "arquivo": o download e pela funcao exportacao_baixar). */
export interface DocumentoLista {
  id: string;
  tipo: "rascunho" | "final";
  situacao: "pendente" | "gerado" | "erro";
  erro: string | null;
  nome_arquivo: string | null;
  tamanho: number | null;
  nome_pedido_por: string | null;
  created_at: string;
  gerado_em: string | null;
  hash_dados: string;
}

export interface Estimativa {
  peso?: number | null;
  bruto?: number | null;
  /** [comp, larg, alt] em mm, por unidade */
  dim?: number[] | null;
  fonte?: string | null;
}

export type TabelaEstimativas = Record<string, Estimativa>;
