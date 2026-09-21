// Tipos das entidades principais, espelhando as tabelas do Supabase.
// Cobre os estados de listagem/detalhe mais usados no app.
//
// Só `id` é obrigatório: o app usa muitos .select() parciais (nem toda
// consulta traz todas as colunas), e o cliente Supabase não usa tipos
// gerados aqui, então relações aninhadas (ex: usuarios(nome)) ora vêm
// como objeto, ora como array, dependendo da consulta — por isso ficam
// como `any`. Formulários de rascunho (novaObra, novoUsuario, etc.)
// continuam soltos por enquanto, já que representam entradas parciais/em
// edição, não linhas reais do banco.

export type PerfilUsuario =
  | "admin"
  | "engenheiro"
  | "assistente"
  | "logistica"
  | "gestor"
  | "cliente";

export interface Usuario {
  id: string;
  nome?: string;
  email?: string;
  perfil?: PerfilUsuario;
  ativo?: boolean;
  id_engenheiro_vinculado?: string | null;
  created_at?: string;
}

export type StatusObra =
  | "em_andamento"
  | "concluida"
  | "paralisada"
  | "finalizada"
  | "cancelada"
  | "pausada";

export type FaseObra =
  | "processo_inicial"
  | "engenharia"
  | "compras"
  | "fabricacao"
  | "montagem"
  | "comissionamento"
  | "start_up"
  | "garantia";

export interface Obra {
  id: string;
  codigo_externo?: string;
  nome?: string;
  descricao?: string | null;
  fase_atual?: FaseObra | string;
  status?: StatusObra;
  data_inicio?: string | null;
  data_previsao_fim?: string | null;
  id_responsavel?: string | null;
  valor_produto?: number | null;
  valor_servico?: number | null;
  observacoes?: string | null;
  data_finalizacao?: string | null;
  observacao_finalizacao?: string | null;
  data_cancelamento?: string | null;
  motivo_cancelamento?: string | null;
  observacao_cancelamento?: string | null;
  created_at?: string;
  updated_at?: string;
  usuarios?: any;
}

export type StatusTarefa = "pendente" | "em_andamento" | "concluida" | "cancelada";
export type PrioridadeTarefa = "baixa" | "normal" | "alta" | "critica";

export interface Tarefa {
  id: string;
  id_obra?: string;
  id_reuniao_origem?: string | null;
  titulo?: string;
  descricao?: string | null;
  id_responsavel?: string | null;
  data_vencimento?: string | null;
  status?: StatusTarefa;
  origem?: "avulsa" | "reuniao" | "sistema";
  prioridade?: PrioridadeTarefa;
  observacao_conclusao?: string | null;
  data_conclusao?: string | null;
  created_at?: string;
  updated_at?: string;
  obras?: any;
  usuarios?: any;
}

export interface Reuniao {
  id: string;
  id_obra?: string;
  id_sessao?: string | null;
  data_reuniao?: string;
  clima_semana?: "ensolarado" | "chuvoso" | "misto" | null;
  resumo_geral?: string | null;
  id_criador?: string | null;
  created_at?: string;
}

export interface ReuniaoSessao {
  id: string;
  data_reuniao?: string;
  status?: "em_andamento" | "fechada";
  id_criador?: string | null;
  created_at?: string;
  fechada_at?: string | null;
  resumo_gravacao?: string | null;
  gravacao_plaud_id?: string | null;
  gravacao_duracao_seg?: number | null;
  resumo_gravacao_em?: string | null;
}

export type TipoOcorrencia =
  | "avanco"
  | "atraso"
  | "fornecedor"
  | "financeiro"
  | "acidente"
  | "outros";

export interface Ocorrencia {
  id: string;
  id_reuniao?: string;
  tipo?: TipoOcorrencia;
  descricao?: string;
  impacta_prazo?: boolean;
  created_at?: string;
}

export type StatusParcela = "a_vencer" | "vencido" | "pago_parcial" | "pago" | "cancelado";

export interface ParcelaCliente {
  id: string;
  id_obra?: string;
  descricao?: string;
  data_prevista?: string;
  valor_previsto?: number;
  data_realizada?: string | null;
  valor_realizado?: number;
  status?: StatusParcela;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StatusDocumento = "nao_elaborado" | "em_andamento" | "concluido" | "nao_aplicavel";
export type IndicadorDocumento = "verde" | "amarelo" | "vermelho";

export interface DocumentoProjeto {
  id: string;
  id_obra?: string;
  item?: string;
  detalhes?: string | null;
  status?: StatusDocumento;
  indicador?: IndicadorDocumento;
  data_prevista?: string | null;
  data_conclusao?: string | null;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentoProjetoArquivo {
  id: string;
  id_documento?: string;
  id_obra?: string;
  id_usuario?: string | null;
  nome_arquivo?: string;
  caminho_storage?: string;
  tipo_arquivo?: string | null;
  tamanho_bytes?: number | null;
  observacao?: string | null;
  created_at?: string;
}

export type StatusCronograma =
  | "nao_iniciado"
  | "em_andamento"
  | "concluido"
  | "atrasado"
  | "cancelado";

export interface CronogramaObra {
  id: string;
  id_obra?: string;
  fase?: string;
  ordem?: number;
  inicio_previsto?: string | null;
  fim_previsto?: string | null;
  inicio_real?: string | null;
  fim_real?: string | null;
  status?: StatusCronograma;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DiarioObra {
  id: number;
  id_obra?: string;
  id_usuario?: string | null;
  texto?: string;
  data_registro?: string;
  created_at?: string;
  usuarios?: any;
}

export interface ComentarioTarefa {
  id: number;
  id_tarefa?: string;
  id_usuario?: string | null;
  texto?: string;
  created_at?: string;
  usuarios?: any;
}

export interface Faturamento {
  id: number;
  id_obra?: string;
  id_usuario?: string | null;
  numero_nf?: string;
  tipo?: "produto" | "servico";
  valor?: number;
  id_parcela_cliente?: string | null;
  created_at?: string;
  usuarios?: any;
}

export interface ObraFaturamentoGrupo {
  id: string;
  id_obra?: string;
  codigo?: string;
  descricao?: string;
  valor_total_grupo?: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ObraFaturamentoFamilia {
  id: string;
  id_obra?: string;
  id_familia_padrao?: string | null;
  codigo_familia?: string;
  descricao_familia?: string;
  ordem?: number;
  grupo_faturamento?: string | null;
  id_grupo_faturamento?: string | null;
  valor_total_escopo?: number;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ObraFaturamentoPrevisao {
  id: string;
  id_obra?: string;
  id_obra_faturamento_familia?: string;
  competencia?: string;
  grupo_faturamento?: string | null;
  valor_previsto?: number;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ObraFaturamentoRealizado {
  id: string;
  id_obra?: string;
  id_obra_faturamento_familia?: string;
  id_previsao?: string | null;
  competencia?: string;
  data_faturamento?: string;
  grupo_faturamento?: string | null;
  numero_nf?: string | null;
  valor_realizado?: number;
  observacao?: string | null;
  created_at?: string;
  updated_at?: string;
}
