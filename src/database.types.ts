// Tipos do banco (Supabase), gerados em 06/11/2026 a partir do projeto pnnhyzdbknzhsyyhhgbk. NAO editar a mao:
// regenerar quando o banco mudar (MCP generate_typescript_types ou `supabase gen types typescript`).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          antes: Json | null
          depois: Json | null
          em: string
          email: string | null
          id: number
          id_obra: string | null
          id_registro: string | null
          id_usuario: string | null
          nome_usuario: string | null
          operacao: string
          tabela: string
        }
        Insert: {
          antes?: Json | null
          depois?: Json | null
          em?: string
          email?: string | null
          id?: number
          id_obra?: string | null
          id_registro?: string | null
          id_usuario?: string | null
          nome_usuario?: string | null
          operacao: string
          tabela: string
        }
        Update: {
          antes?: Json | null
          depois?: Json | null
          em?: string
          email?: string | null
          id?: number
          id_obra?: string | null
          id_registro?: string | null
          id_usuario?: string | null
          nome_usuario?: string | null
          operacao?: string
          tabela?: string
        }
        Relationships: []
      }
      comentarios_tarefa: {
        Row: {
          created_at: string | null
          id: number
          id_tarefa: string | null
          id_usuario: string | null
          texto: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_tarefa?: string | null
          id_usuario?: string | null
          texto: string
        }
        Update: {
          created_at?: string | null
          id?: number
          id_tarefa?: string | null
          id_usuario?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_tarefa_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_tarefa_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_obra: {
        Row: {
          created_at: string | null
          fase: string
          fim_previsto: string | null
          fim_real: string | null
          id: string
          id_obra: string
          inicio_previsto: string | null
          inicio_real: string | null
          observacao: string | null
          ordem: number
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fase: string
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          id_obra: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          observacao?: string | null
          ordem: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fase?: string
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          id_obra?: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          observacao?: string | null
          ordem?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_obra_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_obra: {
        Row: {
          created_at: string | null
          data_registro: string
          id: number
          id_obra: string | null
          id_usuario: string | null
          texto: string
        }
        Insert: {
          created_at?: string | null
          data_registro: string
          id?: number
          id_obra?: string | null
          id_usuario?: string | null
          texto: string
        }
        Update: {
          created_at?: string | null
          data_registro?: string
          id?: number
          id_obra?: string | null
          id_usuario?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_obra_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_projeto: {
        Row: {
          created_at: string | null
          data_conclusao: string | null
          data_prevista: string | null
          detalhes: string | null
          id: string
          id_obra: string
          indicador: string
          item: string
          observacao: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          detalhes?: string | null
          id?: string
          id_obra: string
          indicador?: string
          item: string
          observacao?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          detalhes?: string | null
          id?: string
          id_obra?: string
          indicador?: string
          item?: string
          observacao?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_projeto_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_projeto_arquivos: {
        Row: {
          caminho_storage: string
          created_at: string | null
          id: string
          id_documento: string
          id_obra: string
          id_usuario: string | null
          nome_arquivo: string
          observacao: string | null
          tamanho_bytes: number | null
          tipo_arquivo: string | null
        }
        Insert: {
          caminho_storage: string
          created_at?: string | null
          id?: string
          id_documento: string
          id_obra: string
          id_usuario?: string | null
          nome_arquivo: string
          observacao?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Update: {
          caminho_storage?: string
          created_at?: string | null
          id?: string
          id_documento?: string
          id_obra?: string
          id_usuario?: string | null
          nome_arquivo?: string
          observacao?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_projeto_arquivos_id_documento_fkey"
            columns: ["id_documento"]
            isOneToOne: false
            referencedRelation: "documentos_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_projeto_arquivos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_projeto_arquivos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacao_config: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          banco: string | null
          exportador: Json
          id: number
          local_embarque: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          banco?: string | null
          exportador: Json
          id?: number
          local_embarque?: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          banco?: string | null
          exportador?: Json
          id?: number
          local_embarque?: string
        }
        Relationships: []
      }
      exportacao_documentos: {
        Row: {
          arquivo: string | null
          created_at: string
          erro: string | null
          gerado_em: string | null
          hash_dados: string
          id: string
          id_obra: string
          id_processo: string
          nome_arquivo: string | null
          nome_pedido_por: string | null
          pedido_por: string | null
          situacao: string
          tamanho: number | null
          tipo: string
        }
        Insert: {
          arquivo?: string | null
          created_at?: string
          erro?: string | null
          gerado_em?: string | null
          hash_dados: string
          id?: string
          id_obra: string
          id_processo: string
          nome_arquivo?: string | null
          nome_pedido_por?: string | null
          pedido_por?: string | null
          situacao?: string
          tamanho?: number | null
          tipo: string
        }
        Update: {
          arquivo?: string | null
          created_at?: string
          erro?: string | null
          gerado_em?: string | null
          hash_dados?: string
          id?: string
          id_obra?: string
          id_processo?: string
          nome_arquivo?: string | null
          nome_pedido_por?: string | null
          pedido_por?: string | null
          situacao?: string
          tamanho?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportacao_documentos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_documentos_id_processo_fkey"
            columns: ["id_processo"]
            isOneToOne: false
            referencedRelation: "exportacao_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_documentos_pedido_por_fkey"
            columns: ["pedido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacao_erp: {
        Row: {
          exportador_erp: Json | null
          hash: string
          id_obra: string
          lido_em: string
          materiais: Json
          nr_pedido: number
          pedido: Json
        }
        Insert: {
          exportador_erp?: Json | null
          hash: string
          id_obra: string
          lido_em?: string
          materiais: Json
          nr_pedido: number
          pedido: Json
        }
        Update: {
          exportador_erp?: Json | null
          hash?: string
          id_obra?: string
          lido_em?: string
          materiais?: Json
          nr_pedido?: number
          pedido?: Json
        }
        Relationships: [
          {
            foreignKeyName: "exportacao_erp_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacao_estimativas: {
        Row: {
          alt: number | null
          atualizado_em: string
          atualizado_por: string | null
          bruto: number | null
          codigo_material: string
          comp: number | null
          fonte: string | null
          larg: number | null
          peso: number | null
        }
        Insert: {
          alt?: number | null
          atualizado_em?: string
          atualizado_por?: string | null
          bruto?: number | null
          codigo_material: string
          comp?: number | null
          fonte?: string | null
          larg?: number | null
          peso?: number | null
        }
        Update: {
          alt?: number | null
          atualizado_em?: string
          atualizado_por?: string | null
          bruto?: number | null
          codigo_material?: string
          comp?: number | null
          fonte?: string | null
          larg?: number | null
          peso?: number | null
        }
        Relationships: []
      }
      exportacao_ncm: {
        Row: {
          codigo: number
          descricao: string
          un_estat: string | null
        }
        Insert: {
          codigo: number
          descricao: string
          un_estat?: string | null
        }
        Update: {
          codigo?: number
          descricao?: string
          un_estat?: string | null
        }
        Relationships: []
      }
      exportacao_processos: {
        Row: {
          aprovacao: Json | null
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          criado_por: string | null
          dados: Json
          hash_dados: string
          id: string
          id_obra: string
          nome_atualizou: string | null
          situacao: string
        }
        Insert: {
          aprovacao?: Json | null
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          dados: Json
          hash_dados?: string
          id?: string
          id_obra: string
          nome_atualizou?: string | null
          situacao?: string
        }
        Update: {
          aprovacao?: Json | null
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          criado_por?: string | null
          dados?: Json
          hash_dados?: string
          id?: string
          id_obra?: string
          nome_atualizou?: string | null
          situacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportacao_processos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_processos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_processos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacao_processos_versoes: {
        Row: {
          dados: Json | null
          em: string
          evento: string
          hash_dados: string | null
          id: number
          id_obra: string
          id_processo: string
          nome_por: string | null
          obs: string | null
          por: string | null
        }
        Insert: {
          dados?: Json | null
          em?: string
          evento: string
          hash_dados?: string | null
          id?: never
          id_obra: string
          id_processo: string
          nome_por?: string | null
          obs?: string | null
          por?: string | null
        }
        Update: {
          dados?: Json | null
          em?: string
          evento?: string
          hash_dados?: string | null
          id?: never
          id_obra?: string
          id_processo?: string
          nome_por?: string | null
          obs?: string | null
          por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exportacao_processos_versoes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_processos_versoes_id_processo_fkey"
            columns: ["id_processo"]
            isOneToOne: false
            referencedRelation: "exportacao_processos"
            referencedColumns: ["id"]
          },
        ]
      }
      familias_faturamento_padrao: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          ordem: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          ordem: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          ordem?: number
        }
        Relationships: []
      }
      faturamentos: {
        Row: {
          created_at: string | null
          id: number
          id_obra: string | null
          id_parcela_cliente: string | null
          id_usuario: string | null
          numero_nf: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_obra?: string | null
          id_parcela_cliente?: string | null
          id_usuario?: string | null
          numero_nf: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string | null
          id?: number
          id_obra?: string | null
          id_parcela_cliente?: string | null
          id_usuario?: string | null
          numero_nf?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_id_parcela_cliente_fkey"
            columns: ["id_parcela_cliente"]
            isOneToOne: false
            referencedRelation: "parcelas_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_email: {
        Row: {
          anexos: Json
          assunto: string
          cc: string[]
          created_at: string
          criado_por: string | null
          enviado_em: string | null
          erro: string | null
          html: string
          id: string
          id_tarefa: string | null
          origem: string
          para: string[]
          status: string
          tentativas: number
        }
        Insert: {
          anexos?: Json
          assunto: string
          cc?: string[]
          created_at?: string
          criado_por?: string | null
          enviado_em?: string | null
          erro?: string | null
          html: string
          id?: string
          id_tarefa?: string | null
          origem?: string
          para: string[]
          status?: string
          tentativas?: number
        }
        Update: {
          anexos?: Json
          assunto?: string
          cc?: string[]
          created_at?: string
          criado_por?: string | null
          enviado_em?: string | null
          erro?: string | null
          html?: string
          id?: string
          id_tarefa?: string | null
          origem?: string
          para?: string[]
          status?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "fila_email_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_email_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_erp: {
        Row: {
          atualizado_em: string
          cidade: string | null
          cnpj: string | null
          codigo: number
          ibge: number | null
          nome: string
          transportadora: boolean
          uf: string | null
        }
        Insert: {
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo: number
          ibge?: number | null
          nome: string
          transportadora?: boolean
          uf?: string | null
        }
        Update: {
          atualizado_em?: string
          cidade?: string | null
          cnpj?: string | null
          codigo?: number
          ibge?: number | null
          nome?: string
          transportadora?: boolean
          uf?: string | null
        }
        Relationships: []
      }
      fretes: {
        Row: {
          bloqueado_em: string | null
          cancelado_em: string | null
          carga: Json
          cod_fornecedor: number | null
          codigo_obra: string
          cotado_em: string | null
          cotado_por: string | null
          created_at: string
          cubagem_m3: number | null
          data_frete: string
          destino_ibge: number | null
          destino_nome: string | null
          destino_tipo: string | null
          familia: string
          id: string
          id_obra: string
          id_solicitante: string | null
          km: number | null
          km_estimado: number | null
          liberado_em: string | null
          motivo_cancelamento: string | null
          nome_solicitante: string | null
          nr_ad: number | null
          numero: number
          numero_documento: string | null
          observacao: string | null
          operacao: string
          origem_ibge: number | null
          origem_nome: string | null
          origem_tipo: string | null
          peso_kg: number | null
          realizado_em: string | null
          saldo_verificado: number | null
          status: string
          tipo_documento: string | null
          tipo_veiculo: string | null
          transportadora_codigo: number | null
          transportadora_nome: string | null
          updated_at: string
          valor_cotado: number | null
          valor_km: number | null
          valor_realizado: number | null
          volumes: number | null
        }
        Insert: {
          bloqueado_em?: string | null
          cancelado_em?: string | null
          carga?: Json
          cod_fornecedor?: number | null
          codigo_obra: string
          cotado_em?: string | null
          cotado_por?: string | null
          created_at?: string
          cubagem_m3?: number | null
          data_frete: string
          destino_ibge?: number | null
          destino_nome?: string | null
          destino_tipo?: string | null
          familia: string
          id?: string
          id_obra: string
          id_solicitante?: string | null
          km?: number | null
          km_estimado?: number | null
          liberado_em?: string | null
          motivo_cancelamento?: string | null
          nome_solicitante?: string | null
          nr_ad?: number | null
          numero?: never
          numero_documento?: string | null
          observacao?: string | null
          operacao: string
          origem_ibge?: number | null
          origem_nome?: string | null
          origem_tipo?: string | null
          peso_kg?: number | null
          realizado_em?: string | null
          saldo_verificado?: number | null
          status?: string
          tipo_documento?: string | null
          tipo_veiculo?: string | null
          transportadora_codigo?: number | null
          transportadora_nome?: string | null
          updated_at?: string
          valor_cotado?: number | null
          valor_km?: number | null
          valor_realizado?: number | null
          volumes?: number | null
        }
        Update: {
          bloqueado_em?: string | null
          cancelado_em?: string | null
          carga?: Json
          cod_fornecedor?: number | null
          codigo_obra?: string
          cotado_em?: string | null
          cotado_por?: string | null
          created_at?: string
          cubagem_m3?: number | null
          data_frete?: string
          destino_ibge?: number | null
          destino_nome?: string | null
          destino_tipo?: string | null
          familia?: string
          id?: string
          id_obra?: string
          id_solicitante?: string | null
          km?: number | null
          km_estimado?: number | null
          liberado_em?: string | null
          motivo_cancelamento?: string | null
          nome_solicitante?: string | null
          nr_ad?: number | null
          numero?: never
          numero_documento?: string | null
          observacao?: string | null
          operacao?: string
          origem_ibge?: number | null
          origem_nome?: string | null
          origem_tipo?: string | null
          peso_kg?: number | null
          realizado_em?: string | null
          saldo_verificado?: number | null
          status?: string
          tipo_documento?: string | null
          tipo_veiculo?: string | null
          transportadora_codigo?: number | null
          transportadora_nome?: string | null
          updated_at?: string
          valor_cotado?: number | null
          valor_km?: number | null
          valor_realizado?: number | null
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fretes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fretes_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fretes_ctes: {
        Row: {
          baixas: Json
          cod_fornecedor: number | null
          codigo_obra: string
          created_at: string
          data_entrada: string | null
          fornecedor_nome: string | null
          id_frete: string | null
          id_obra: string | null
          mensagem: string | null
          nr_ad: number
          numero_cte: string | null
          projeto: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          baixas?: Json
          cod_fornecedor?: number | null
          codigo_obra: string
          created_at?: string
          data_entrada?: string | null
          fornecedor_nome?: string | null
          id_frete?: string | null
          id_obra?: string | null
          mensagem?: string | null
          nr_ad: number
          numero_cte?: string | null
          projeto: string
          status: string
          updated_at?: string
          valor: number
        }
        Update: {
          baixas?: Json
          cod_fornecedor?: number | null
          codigo_obra?: string
          created_at?: string
          data_entrada?: string | null
          fornecedor_nome?: string | null
          id_frete?: string | null
          id_obra?: string | null
          mensagem?: string | null
          nr_ad?: number
          numero_cte?: string | null
          projeto?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fretes_ctes_id_frete_fkey"
            columns: ["id_frete"]
            isOneToOne: false
            referencedRelation: "fretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fretes_ctes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fretes_eventos: {
        Row: {
          created_at: string
          detalhe: string | null
          evento: string
          id: number
          id_frete: string
          id_usuario: string | null
          nome_usuario: string | null
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          evento: string
          id?: never
          id_frete: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          evento?: string
          id?: never
          id_frete?: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fretes_eventos_id_frete_fkey"
            columns: ["id_frete"]
            isOneToOne: false
            referencedRelation: "fretes"
            referencedColumns: ["id"]
          },
        ]
      }
      fretes_rotas: {
        Row: {
          ajustado_em: string
          ajustado_por: string | null
          destino_ibge: number
          km: number
          origem_ibge: number
        }
        Insert: {
          ajustado_em?: string
          ajustado_por?: string | null
          destino_ibge: number
          km: number
          origem_ibge: number
        }
        Update: {
          ajustado_em?: string
          ajustado_por?: string | null
          destino_ibge?: number
          km?: number
          origem_ibge?: number
        }
        Relationships: []
      }
      fretes_transp_historico: {
        Row: {
          atualizado_em: string
          ctes: number
          km_total: number
          rs_km: number | null
          transportadora_codigo: number
          ufs: string[]
          ultimo_cte: string | null
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          ctes: number
          km_total: number
          rs_km?: number | null
          transportadora_codigo: number
          ufs?: string[]
          ultimo_cte?: string | null
          valor_total: number
        }
        Update: {
          atualizado_em?: string
          ctes?: number
          km_total?: number
          rs_km?: number | null
          transportadora_codigo?: number
          ufs?: string[]
          ultimo_cte?: string | null
          valor_total?: number
        }
        Relationships: []
      }
      fretes_transp_tarifas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          id: string
          tipo_veiculo: string
          transportadora_codigo: number
          valor_km: number
          valor_minimo: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          id?: string
          tipo_veiculo: string
          transportadora_codigo: number
          valor_km: number
          valor_minimo?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          id?: string
          tipo_veiculo?: string
          transportadora_codigo?: number
          valor_km?: number
          valor_minimo?: number
        }
        Relationships: []
      }
      fretes_transp_ufs: {
        Row: {
          origem: string
          transportadora_codigo: number
          uf: string
        }
        Insert: {
          origem?: string
          transportadora_codigo: number
          uf: string
        }
        Update: {
          origem?: string
          transportadora_codigo?: number
          uf?: string
        }
        Relationships: []
      }
      historico_tarefas: {
        Row: {
          created_at: string | null
          id: string
          id_tarefa: string | null
          id_usuario: string | null
          texto_comentario: string | null
          tipo_registro: Database["public"]["Enums"]["tipo_historico"]
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_tarefa?: string | null
          id_usuario?: string | null
          texto_comentario?: string | null
          tipo_registro: Database["public"]["Enums"]["tipo_historico"]
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          id_tarefa?: string | null
          id_usuario?: string | null
          texto_comentario?: string | null
          tipo_registro?: Database["public"]["Enums"]["tipo_historico"]
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_tarefas_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_tarefas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_erp: {
        Row: {
          ativo: boolean
          atualizado_em: string
          busca: string | null
          classe_tipo: number | null
          codigo: number
          codigo_edit: string | null
          descricao: string
          genero: number | null
          ncm: string | null
          pct_ipi: number | null
          tipo_item: number | null
          tipo_pcp: number | null
          unidade: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          busca?: string | null
          classe_tipo?: number | null
          codigo: number
          codigo_edit?: string | null
          descricao: string
          genero?: number | null
          ncm?: string | null
          pct_ipi?: number | null
          tipo_item?: number | null
          tipo_pcp?: number | null
          unidade?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          busca?: string | null
          classe_tipo?: number | null
          codigo?: number
          codigo_edit?: string | null
          descricao?: string
          genero?: number | null
          ncm?: string | null
          pct_ipi?: number | null
          tipo_item?: number | null
          tipo_pcp?: number | null
          unidade?: string | null
        }
        Relationships: []
      }
      materiais_erp_classes: {
        Row: {
          classe_tipo: number
          descricao: string
        }
        Insert: {
          classe_tipo: number
          descricao: string
        }
        Update: {
          classe_tipo?: number
          descricao?: string
        }
        Relationships: []
      }
      materiais_erp_ncm: {
        Row: {
          descricao: string
          ncm: string
        }
        Insert: {
          descricao: string
          ncm: string
        }
        Update: {
          descricao?: string
          ncm?: string
        }
        Relationships: []
      }
      materiais_erp_unidades: {
        Row: {
          descricao: string
          unidade: string
        }
        Insert: {
          descricao: string
          unidade: string
        }
        Update: {
          descricao?: string
          unidade?: string
        }
        Relationships: []
      }
      municipios: {
        Row: {
          ibge: number
          lat: number
          lon: number
          nome: string
          nome_busca: string
          uf: string
        }
        Insert: {
          ibge: number
          lat: number
          lon: number
          nome: string
          nome_busca: string
          uf: string
        }
        Update: {
          ibge?: number
          lat?: number
          lon?: number
          nome?: string
          nome_busca?: string
          uf?: string
        }
        Relationships: []
      }
      nfs_terceiros: {
        Row: {
          anexos: Json
          arquivo_caminho: string
          arquivo_nome: string
          arquivo_url_email: string | null
          cancelado_em: string | null
          cnpj: string | null
          cod_fornecedor: number
          codigo_obra: string
          created_at: string
          dados_pagamento: Json | null
          data_emissao: string
          data_lancamento: string | null
          data_pagamento: string | null
          devolvido_em: string | null
          encaminhado_em: string
          forma_pagamento: string | null
          fornecedor: string
          id: string
          id_encaminhou: string | null
          id_obra: string
          motivo_cancelamento: string | null
          motivo_devolucao: string | null
          nome_devolveu: string | null
          nome_encaminhou: string | null
          nr_ad: number | null
          nr_pedido: number
          numero: number
          numero_nf: string
          observacao: string | null
          status: string
          ultimo_lembrete_em: string | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          anexos?: Json
          arquivo_caminho: string
          arquivo_nome: string
          arquivo_url_email?: string | null
          cancelado_em?: string | null
          cnpj?: string | null
          cod_fornecedor: number
          codigo_obra: string
          created_at?: string
          dados_pagamento?: Json | null
          data_emissao: string
          data_lancamento?: string | null
          data_pagamento?: string | null
          devolvido_em?: string | null
          encaminhado_em?: string
          forma_pagamento?: string | null
          fornecedor: string
          id?: string
          id_encaminhou?: string | null
          id_obra: string
          motivo_cancelamento?: string | null
          motivo_devolucao?: string | null
          nome_devolveu?: string | null
          nome_encaminhou?: string | null
          nr_ad?: number | null
          nr_pedido: number
          numero?: number
          numero_nf: string
          observacao?: string | null
          status?: string
          ultimo_lembrete_em?: string | null
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          anexos?: Json
          arquivo_caminho?: string
          arquivo_nome?: string
          arquivo_url_email?: string | null
          cancelado_em?: string | null
          cnpj?: string | null
          cod_fornecedor?: number
          codigo_obra?: string
          created_at?: string
          dados_pagamento?: Json | null
          data_emissao?: string
          data_lancamento?: string | null
          data_pagamento?: string | null
          devolvido_em?: string | null
          encaminhado_em?: string
          forma_pagamento?: string | null
          fornecedor?: string
          id?: string
          id_encaminhou?: string | null
          id_obra?: string
          motivo_cancelamento?: string | null
          motivo_devolucao?: string | null
          nome_devolveu?: string | null
          nome_encaminhou?: string | null
          nr_ad?: number | null
          nr_pedido?: number
          numero?: number
          numero_nf?: string
          observacao?: string | null
          status?: string
          ultimo_lembrete_em?: string | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfs_terceiros_id_encaminhou_fkey"
            columns: ["id_encaminhou"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfs_terceiros_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      nfs_terceiros_eventos: {
        Row: {
          created_at: string
          detalhe: string | null
          evento: string
          id: number
          id_nf: string
          id_usuario: string | null
          nome_usuario: string | null
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          evento: string
          id?: number
          id_nf: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          evento?: string
          id?: number
          id_nf?: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfs_terceiros_eventos_id_nf_fkey"
            columns: ["id_nf"]
            isOneToOne: false
            referencedRelation: "nfs_terceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          chave: string | null
          created_at: string
          detalhe: string | null
          financeira: boolean
          id: string
          id_obra: string | null
          id_tarefa: string | null
          id_usuario_destino: string
          lida_em: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          chave?: string | null
          created_at?: string
          detalhe?: string | null
          financeira?: boolean
          id?: string
          id_obra?: string | null
          id_tarefa?: string | null
          id_usuario_destino: string
          lida_em?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          chave?: string | null
          created_at?: string
          detalhe?: string | null
          financeira?: boolean
          id?: string
          id_obra?: string | null
          id_tarefa?: string | null
          id_usuario_destino?: string
          lida_em?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_id_tarefa_fkey"
            columns: ["id_tarefa"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_id_usuario_destino_fkey"
            columns: ["id_usuario_destino"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_alertas: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          gravidade: string
          id: string
          id_obra: string
          mensagem: string
          resolvido_em: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          gravidade?: string
          id?: string
          id_obra: string
          mensagem: string
          resolvido_em?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          gravidade?: string
          id?: string
          id_obra?: string
          mensagem?: string
          resolvido_em?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_alertas_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_anexos: {
        Row: {
          caminho_storage: string
          created_at: string
          descricao: string | null
          id: string
          id_obra: string
          id_ocorrencia: string | null
          id_usuario: string | null
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
        }
        Insert: {
          caminho_storage: string
          created_at?: string
          descricao?: string | null
          id?: string
          id_obra: string
          id_ocorrencia?: string | null
          id_usuario?: string | null
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Update: {
          caminho_storage?: string
          created_at?: string
          descricao?: string | null
          id?: string
          id_obra?: string
          id_ocorrencia?: string | null
          id_usuario?: string | null
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_anexos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_anexos_id_ocorrencia_fkey"
            columns: ["id_ocorrencia"]
            isOneToOne: false
            referencedRelation: "ocorrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_anexos_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_compras_abertas: {
        Row: {
          codigo_material: string | null
          codigo_projeto: string | null
          data_entrega: string | null
          data_pedido: string | null
          data_solicitacao: string | null
          descricao_material: string | null
          fornecedor: string | null
          id_obra: string
          nr_pedido: number | null
          nr_sma: number | null
          nr_solicitacao: number
          preco_unitario: number | null
          quantidade: number | null
          quantidade_recebida: number | null
          servico: boolean
          situacao: string
          valor: number | null
        }
        Insert: {
          codigo_material?: string | null
          codigo_projeto?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          data_solicitacao?: string | null
          descricao_material?: string | null
          fornecedor?: string | null
          id_obra: string
          nr_pedido?: number | null
          nr_sma?: number | null
          nr_solicitacao: number
          preco_unitario?: number | null
          quantidade?: number | null
          quantidade_recebida?: number | null
          servico?: boolean
          situacao: string
          valor?: number | null
        }
        Update: {
          codigo_material?: string | null
          codigo_projeto?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          data_solicitacao?: string | null
          descricao_material?: string | null
          fornecedor?: string | null
          id_obra?: string
          nr_pedido?: number | null
          nr_sma?: number | null
          nr_solicitacao?: number
          preco_unitario?: number | null
          quantidade?: number | null
          quantidade_recebida?: number | null
          servico?: boolean
          situacao?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_compras_abertas_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_familia_alerta: {
        Row: {
          a_caminho: number
          atualizado_em: string
          codigo_projeto: string
          comprometido: number
          disponivel: number
          id_obra: string
          itens_sem_preco: number
          nivel: string
          nivel_mudou_em: string
          pct_projetado: number | null
          verba: number
        }
        Insert: {
          a_caminho?: number
          atualizado_em?: string
          codigo_projeto: string
          comprometido?: number
          disponivel?: number
          id_obra: string
          itens_sem_preco?: number
          nivel?: string
          nivel_mudou_em?: string
          pct_projetado?: number | null
          verba?: number
        }
        Update: {
          a_caminho?: number
          atualizado_em?: string
          codigo_projeto?: string
          comprometido?: number
          disponivel?: number
          id_obra?: string
          itens_sem_preco?: number
          nivel?: string
          nivel_mudou_em?: string
          pct_projetado?: number | null
          verba?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_familia_alerta_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_faturamento_familias: {
        Row: {
          codigo_familia: string
          created_at: string | null
          descricao_familia: string
          grupo_faturamento: string | null
          id: string
          id_familia_padrao: string | null
          id_grupo_faturamento: string | null
          id_obra: string
          observacao: string | null
          ordem: number
          updated_at: string | null
          valor_total_escopo: number
        }
        Insert: {
          codigo_familia: string
          created_at?: string | null
          descricao_familia: string
          grupo_faturamento?: string | null
          id?: string
          id_familia_padrao?: string | null
          id_grupo_faturamento?: string | null
          id_obra: string
          observacao?: string | null
          ordem: number
          updated_at?: string | null
          valor_total_escopo?: number
        }
        Update: {
          codigo_familia?: string
          created_at?: string | null
          descricao_familia?: string
          grupo_faturamento?: string | null
          id?: string
          id_familia_padrao?: string | null
          id_grupo_faturamento?: string | null
          id_obra?: string
          observacao?: string | null
          ordem?: number
          updated_at?: string | null
          valor_total_escopo?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_faturamento_familias_id_familia_padrao_fkey"
            columns: ["id_familia_padrao"]
            isOneToOne: false
            referencedRelation: "familias_faturamento_padrao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_faturamento_familias_id_grupo_faturamento_fkey"
            columns: ["id_grupo_faturamento"]
            isOneToOne: false
            referencedRelation: "obra_faturamento_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_faturamento_familias_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_faturamento_grupos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          id_obra: string
          updated_at: string | null
          valor_total_grupo: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          id_obra: string
          updated_at?: string | null
          valor_total_grupo?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          id_obra?: string
          updated_at?: string | null
          valor_total_grupo?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_faturamento_grupos_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_faturamento_previsoes: {
        Row: {
          competencia: string
          created_at: string | null
          grupo_faturamento: string | null
          id: string
          id_obra: string
          id_obra_faturamento_familia: string
          observacao: string | null
          updated_at: string | null
          valor_previsto: number
        }
        Insert: {
          competencia: string
          created_at?: string | null
          grupo_faturamento?: string | null
          id?: string
          id_obra: string
          id_obra_faturamento_familia: string
          observacao?: string | null
          updated_at?: string | null
          valor_previsto?: number
        }
        Update: {
          competencia?: string
          created_at?: string | null
          grupo_faturamento?: string | null
          id?: string
          id_obra?: string
          id_obra_faturamento_familia?: string
          observacao?: string | null
          updated_at?: string | null
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_faturamento_previsoes_id_obra_faturamento_familia_fkey"
            columns: ["id_obra_faturamento_familia"]
            isOneToOne: false
            referencedRelation: "obra_faturamento_familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_faturamento_previsoes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_faturamento_realizados: {
        Row: {
          competencia: string
          created_at: string | null
          data_faturamento: string
          grupo_faturamento: string | null
          id: string
          id_obra: string
          id_obra_faturamento_familia: string
          id_previsao: string | null
          numero_nf: string | null
          observacao: string | null
          updated_at: string | null
          valor_realizado: number
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_faturamento: string
          grupo_faturamento?: string | null
          id?: string
          id_obra: string
          id_obra_faturamento_familia: string
          id_previsao?: string | null
          numero_nf?: string | null
          observacao?: string | null
          updated_at?: string | null
          valor_realizado?: number
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_faturamento?: string
          grupo_faturamento?: string | null
          id?: string
          id_obra?: string
          id_obra_faturamento_familia?: string
          id_previsao?: string | null
          numero_nf?: string | null
          observacao?: string | null
          updated_at?: string | null
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_faturamento_realizados_id_obra_faturamento_familia_fkey"
            columns: ["id_obra_faturamento_familia"]
            isOneToOne: false
            referencedRelation: "obra_faturamento_familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_faturamento_realizados_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_faturamento_realizados_id_previsao_fkey"
            columns: ["id_previsao"]
            isOneToOne: false
            referencedRelation: "obra_faturamento_previsoes"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_pedido_itens: {
        Row: {
          codigo_familia: string | null
          codigo_material: string
          data_entrega: string | null
          descricao: string | null
          id_obra: string
          pct_ipi: number
          quantidade_cancelada: number
          quantidade_entregue: number
          quantidade_pedida: number
          sequencia: number
          tipo: string
          unidade: string | null
          valor_unitario: number
        }
        Insert: {
          codigo_familia?: string | null
          codigo_material: string
          data_entrega?: string | null
          descricao?: string | null
          id_obra: string
          pct_ipi?: number
          quantidade_cancelada?: number
          quantidade_entregue?: number
          quantidade_pedida: number
          sequencia: number
          tipo: string
          unidade?: string | null
          valor_unitario: number
        }
        Update: {
          codigo_familia?: string | null
          codigo_material?: string
          data_entrega?: string | null
          descricao?: string | null
          id_obra?: string
          pct_ipi?: number
          quantidade_cancelada?: number
          quantidade_entregue?: number
          quantidade_pedida?: number
          sequencia?: number
          tipo?: string
          unidade?: string | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_pedido_itens_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_rentabilidade_familias: {
        Row: {
          codigo_projeto: string
          created_at: string
          custo_previsto: number
          custo_realizado: number
          descricao: string | null
          eh_obra: boolean
          id: string
          id_obra: string
          lancamentos_avulsos: number
          pedidos_em_aberto: number
          pedidos_encerrados: number
          previsoes_em_aberto: number
          previsoes_numeros: string | null
          requisicoes: number
          saldo_projetado: number
          updated_at: string
        }
        Insert: {
          codigo_projeto: string
          created_at?: string
          custo_previsto?: number
          custo_realizado?: number
          descricao?: string | null
          eh_obra?: boolean
          id?: string
          id_obra: string
          lancamentos_avulsos?: number
          pedidos_em_aberto?: number
          pedidos_encerrados?: number
          previsoes_em_aberto?: number
          previsoes_numeros?: string | null
          requisicoes?: number
          saldo_projetado?: number
          updated_at?: string
        }
        Update: {
          codigo_projeto?: string
          created_at?: string
          custo_previsto?: number
          custo_realizado?: number
          descricao?: string | null
          eh_obra?: boolean
          id?: string
          id_obra?: string
          lancamentos_avulsos?: number
          pedidos_em_aberto?: number
          pedidos_encerrados?: number
          previsoes_em_aberto?: number
          previsoes_numeros?: string | null
          requisicoes?: number
          saldo_projetado?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_rentabilidade_familias_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_rentabilidade_historico: {
        Row: {
          base_erp: boolean
          competencia: string
          custo_previsto: number
          custo_realizado: number
          id_obra: string
          margem_atual: number
          margem_prevista: number
          previsoes_em_aberto: number
          rentabilidade_atual_pct: number | null
          rentabilidade_prevista_pct: number | null
          resultado_projetado: number
          tirada_em: string
          valor_vendido: number
          venda_sem_impostos: number | null
        }
        Insert: {
          base_erp?: boolean
          competencia: string
          custo_previsto?: number
          custo_realizado?: number
          id_obra: string
          margem_atual?: number
          margem_prevista?: number
          previsoes_em_aberto?: number
          rentabilidade_atual_pct?: number | null
          rentabilidade_prevista_pct?: number | null
          resultado_projetado?: number
          tirada_em?: string
          valor_vendido?: number
          venda_sem_impostos?: number | null
        }
        Update: {
          base_erp?: boolean
          competencia?: string
          custo_previsto?: number
          custo_realizado?: number
          id_obra?: string
          margem_atual?: number
          margem_prevista?: number
          previsoes_em_aberto?: number
          rentabilidade_atual_pct?: number | null
          rentabilidade_prevista_pct?: number | null
          resultado_projetado?: number
          tirada_em?: string
          valor_vendido?: number
          venda_sem_impostos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_rentabilidade_historico_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_servicos_parcelas: {
        Row: {
          cnpj: string | null
          cod_fornecedor: number | null
          codigo_material: string | null
          data_emissao: string | null
          data_entrega: string | null
          data_pagamento: string | null
          data_pedido: string | null
          data_recebimento: string | null
          descricao: string | null
          fornecedor: string | null
          id: number
          id_obra: string
          nr_ad: number | null
          nr_pedido: number
          nr_solicitacao: number
          numero_nf: string | null
          serie_nf: string | null
          situacao: string
          situacao_pedido: string
          valor: number | null
          valor_nf: number | null
          vencimento: string | null
        }
        Insert: {
          cnpj?: string | null
          cod_fornecedor?: number | null
          codigo_material?: string | null
          data_emissao?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string | null
          data_recebimento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: number
          id_obra: string
          nr_ad?: number | null
          nr_pedido: number
          nr_solicitacao: number
          numero_nf?: string | null
          serie_nf?: string | null
          situacao: string
          situacao_pedido: string
          valor?: number | null
          valor_nf?: number | null
          vencimento?: string | null
        }
        Update: {
          cnpj?: string | null
          cod_fornecedor?: number | null
          codigo_material?: string | null
          data_emissao?: string | null
          data_entrega?: string | null
          data_pagamento?: string | null
          data_pedido?: string | null
          data_recebimento?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: number
          id_obra?: string
          nr_ad?: number | null
          nr_pedido?: number
          nr_solicitacao?: number
          numero_nf?: string | null
          serie_nf?: string | null
          situacao?: string
          situacao_pedido?: string
          valor?: number | null
          valor_nf?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_servicos_parcelas_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_sma_materiais: {
        Row: {
          cod_mater: number
          codigo_material: string | null
          created_at: string
          data_cadastro: string | null
          data_necessidade: string | null
          descricao_material: string | null
          id: string
          id_obra: string
          nr_sma: number
          observacao: string | null
          ordens_producao: string | null
          projeto_sma: string | null
          quantidade_atendida: number | null
          quantidade_solicitada: number | null
          sequencia: number
          situacao: string | null
          solicitante: string | null
          tipo_movimento_codigo: number | null
          tipo_movimento_descricao: string | null
          updated_at: string
          urgente: boolean
        }
        Insert: {
          cod_mater: number
          codigo_material?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_necessidade?: string | null
          descricao_material?: string | null
          id?: string
          id_obra: string
          nr_sma: number
          observacao?: string | null
          ordens_producao?: string | null
          projeto_sma?: string | null
          quantidade_atendida?: number | null
          quantidade_solicitada?: number | null
          sequencia: number
          situacao?: string | null
          solicitante?: string | null
          tipo_movimento_codigo?: number | null
          tipo_movimento_descricao?: string | null
          updated_at?: string
          urgente?: boolean
        }
        Update: {
          cod_mater?: number
          codigo_material?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_necessidade?: string | null
          descricao_material?: string | null
          id?: string
          id_obra?: string
          nr_sma?: number
          observacao?: string | null
          ordens_producao?: string | null
          projeto_sma?: string | null
          quantidade_atendida?: number | null
          quantidade_solicitada?: number | null
          sequencia?: number
          situacao?: string | null
          solicitante?: string | null
          tipo_movimento_codigo?: number | null
          tipo_movimento_descricao?: string | null
          updated_at?: string
          urgente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "obra_sma_materiais_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_sma_projecao: {
        Row: {
          cod_mater: number
          codigo_material: string | null
          codigo_projeto: string
          created_at: string
          descricao_material: string | null
          id: string
          id_obra: string
          nr_sma: number
          origem_preco: string | null
          preco_unitario: number | null
          quantidade_pendente: number
          sequencia: number
          situacao_compra: string
          valor: number | null
        }
        Insert: {
          cod_mater: number
          codigo_material?: string | null
          codigo_projeto: string
          created_at?: string
          descricao_material?: string | null
          id?: string
          id_obra: string
          nr_sma: number
          origem_preco?: string | null
          preco_unitario?: number | null
          quantidade_pendente: number
          sequencia: number
          situacao_compra: string
          valor?: number | null
        }
        Update: {
          cod_mater?: number
          codigo_material?: string | null
          codigo_projeto?: string
          created_at?: string
          descricao_material?: string | null
          id?: string
          id_obra?: string
          nr_sma?: number
          origem_preco?: string | null
          preco_unitario?: number | null
          quantidade_pendente?: number
          sequencia?: number
          situacao_compra?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_sma_projecao_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cidade_ibge: number | null
          codigo_externo: string | null
          created_at: string | null
          data_cancelamento: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          data_previsao_fim: string | null
          descricao: string | null
          exportacao: boolean
          fase_atual: string | null
          id: string
          id_responsavel: string | null
          margem_contribuicao_erp: number | null
          margem_prevista_erp: number | null
          motivo_cancelamento: string | null
          nome: string
          observacao_cancelamento: string | null
          observacao_finalizacao: string | null
          observacoes: string | null
          rentabilidade_erp: number | null
          status: Database["public"]["Enums"]["status_obra"] | null
          updated_at: string | null
          valor_produto: number | null
          valor_servico: number | null
          venda_sem_impostos_erp: number | null
        }
        Insert: {
          cidade_ibge?: number | null
          codigo_externo?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          descricao?: string | null
          exportacao?: boolean
          fase_atual?: string | null
          id?: string
          id_responsavel?: string | null
          margem_contribuicao_erp?: number | null
          margem_prevista_erp?: number | null
          motivo_cancelamento?: string | null
          nome: string
          observacao_cancelamento?: string | null
          observacao_finalizacao?: string | null
          observacoes?: string | null
          rentabilidade_erp?: number | null
          status?: Database["public"]["Enums"]["status_obra"] | null
          updated_at?: string | null
          valor_produto?: number | null
          valor_servico?: number | null
          venda_sem_impostos_erp?: number | null
        }
        Update: {
          cidade_ibge?: number | null
          codigo_externo?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          descricao?: string | null
          exportacao?: boolean
          fase_atual?: string | null
          id?: string
          id_responsavel?: string | null
          margem_contribuicao_erp?: number | null
          margem_prevista_erp?: number | null
          motivo_cancelamento?: string | null
          nome?: string
          observacao_cancelamento?: string | null
          observacao_finalizacao?: string | null
          observacoes?: string | null
          rentabilidade_erp?: number | null
          status?: Database["public"]["Enums"]["status_obra"] | null
          updated_at?: string | null
          valor_produto?: number | null
          valor_servico?: number | null
          venda_sem_impostos_erp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_id_responsavel_fkey"
            columns: ["id_responsavel"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      obras_valores_erp: {
        Row: {
          anteriores: Json | null
          codigo_obra: string
          created_at: string
          erro: string | null
          gravado_em: string | null
          id: string
          id_obra: string
          id_solicitante: string | null
          login_erp: string | null
          margem_contribuicao: number
          nome_solicitante: string | null
          rentabilidade: number
          situacao: string
          tentativas: number
          venda_sem_impostos: number
        }
        Insert: {
          anteriores?: Json | null
          codigo_obra: string
          created_at?: string
          erro?: string | null
          gravado_em?: string | null
          id?: string
          id_obra: string
          id_solicitante?: string | null
          login_erp?: string | null
          margem_contribuicao: number
          nome_solicitante?: string | null
          rentabilidade: number
          situacao?: string
          tentativas?: number
          venda_sem_impostos: number
        }
        Update: {
          anteriores?: Json | null
          codigo_obra?: string
          created_at?: string
          erro?: string | null
          gravado_em?: string | null
          id?: string
          id_obra?: string
          id_solicitante?: string | null
          login_erp?: string | null
          margem_contribuicao?: number
          nome_solicitante?: string | null
          rentabilidade?: number
          situacao?: string
          tentativas?: number
          venda_sem_impostos?: number
        }
        Relationships: [
          {
            foreignKeyName: "obras_valores_erp_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_valores_erp_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          created_at: string | null
          data_resolucao: string | null
          descricao: string
          id: string
          id_obra: string | null
          id_reuniao: string | null
          impacta_prazo: boolean | null
          status: string
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Insert: {
          created_at?: string | null
          data_resolucao?: string | null
          descricao: string
          id?: string
          id_obra?: string | null
          id_reuniao?: string | null
          impacta_prazo?: boolean | null
          status?: string
          tipo: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Update: {
          created_at?: string | null
          data_resolucao?: string | null
          descricao?: string
          id?: string
          id_obra?: string | null
          id_reuniao?: string | null
          impacta_prazo?: boolean | null
          status?: string
          tipo?: Database["public"]["Enums"]["tipo_ocorrencia"]
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_id_reuniao_fkey"
            columns: ["id_reuniao"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_cliente: {
        Row: {
          created_at: string | null
          data_prevista: string
          data_realizada: string | null
          descricao: string
          id: string
          id_obra: string
          observacao: string | null
          status: string
          updated_at: string | null
          valor_previsto: number
          valor_realizado: number
        }
        Insert: {
          created_at?: string | null
          data_prevista: string
          data_realizada?: string | null
          descricao: string
          id?: string
          id_obra: string
          observacao?: string | null
          status?: string
          updated_at?: string | null
          valor_previsto?: number
          valor_realizado?: number
        }
        Update: {
          created_at?: string | null
          data_prevista?: string
          data_realizada?: string | null
          descricao?: string
          id?: string
          id_obra?: string
          observacao?: string | null
          status?: string
          updated_at?: string | null
          valor_previsto?: number
          valor_realizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cliente_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      push_inscricoes: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          id_usuario: string
          p256dh: string
          ultimo_envio_em: string | null
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          id_usuario: string
          p256dh: string
          ultimo_envio_em?: string | null
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          id_usuario?: string
          p256dh?: string
          ultimo_envio_em?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_inscricoes_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          clima_semana: Database["public"]["Enums"]["clima_tipo"] | null
          created_at: string | null
          data_reuniao: string | null
          id: string
          id_criador: string | null
          id_obra: string | null
          id_sessao: string | null
          resumo_geral: string | null
        }
        Insert: {
          clima_semana?: Database["public"]["Enums"]["clima_tipo"] | null
          created_at?: string | null
          data_reuniao?: string | null
          id?: string
          id_criador?: string | null
          id_obra?: string | null
          id_sessao?: string | null
          resumo_geral?: string | null
        }
        Update: {
          clima_semana?: Database["public"]["Enums"]["clima_tipo"] | null
          created_at?: string | null
          data_reuniao?: string | null
          id?: string
          id_criador?: string | null
          id_obra?: string | null
          id_sessao?: string | null
          resumo_geral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_id_criador_fkey"
            columns: ["id_criador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_id_sessao_fkey"
            columns: ["id_sessao"]
            isOneToOne: false
            referencedRelation: "reunioes_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes_sessoes: {
        Row: {
          created_at: string
          data_reuniao: string
          fechada_at: string | null
          gravacao_duracao_seg: number | null
          gravacao_plaud_id: string | null
          id: string
          id_criador: string | null
          resumo_gravacao: string | null
          resumo_gravacao_em: string | null
          status: string
        }
        Insert: {
          created_at?: string
          data_reuniao?: string
          fechada_at?: string | null
          gravacao_duracao_seg?: number | null
          gravacao_plaud_id?: string | null
          id?: string
          id_criador?: string | null
          resumo_gravacao?: string | null
          resumo_gravacao_em?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          data_reuniao?: string
          fechada_at?: string | null
          gravacao_duracao_seg?: number | null
          gravacao_plaud_id?: string | null
          id?: string
          id_criador?: string | null
          resumo_gravacao?: string | null
          resumo_gravacao_em?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_sessoes_id_criador_fkey"
            columns: ["id_criador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sistema_alertas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avisado: boolean
          chave: string
          desde: string | null
          detalhe: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avisado?: boolean
          chave: string
          desde?: string | null
          detalhe?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avisado?: boolean
          chave?: string
          desde?: string | null
          detalhe?: string | null
        }
        Relationships: []
      }
      solicitacoes_faturamento: {
        Row: {
          anexos: Json
          aprovado_em: string | null
          cancelado_em: string | null
          codigo_obra: string
          codigo_transportadora: number | null
          created_at: string
          data_desejada: string | null
          devolvido_em: string | null
          enviado_em: string | null
          especie_volumes: string | null
          faturado_em: string | null
          id: string
          id_aprovador: string | null
          id_obra: string
          id_solicitante: string | null
          motivo_cancelamento: string | null
          motivo_devolucao: string | null
          nome_aprovador: string | null
          nome_devolveu: string | null
          nome_solicitante: string | null
          numero: number
          observacao: string | null
          observacao_logistica: string | null
          peso_bruto: number | null
          peso_liquido: number | null
          status: string
          tipo: string
          transportadora: string | null
          ultimo_lembrete_em: string | null
          updated_at: string
          valor_aprovado: number | null
          valor_solicitado: number
          volumes: number | null
        }
        Insert: {
          anexos?: Json
          aprovado_em?: string | null
          cancelado_em?: string | null
          codigo_obra: string
          codigo_transportadora?: number | null
          created_at?: string
          data_desejada?: string | null
          devolvido_em?: string | null
          enviado_em?: string | null
          especie_volumes?: string | null
          faturado_em?: string | null
          id?: string
          id_aprovador?: string | null
          id_obra: string
          id_solicitante?: string | null
          motivo_cancelamento?: string | null
          motivo_devolucao?: string | null
          nome_aprovador?: string | null
          nome_devolveu?: string | null
          nome_solicitante?: string | null
          numero?: number
          observacao?: string | null
          observacao_logistica?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          status?: string
          tipo: string
          transportadora?: string | null
          ultimo_lembrete_em?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_solicitado?: number
          volumes?: number | null
        }
        Update: {
          anexos?: Json
          aprovado_em?: string | null
          cancelado_em?: string | null
          codigo_obra?: string
          codigo_transportadora?: number | null
          created_at?: string
          data_desejada?: string | null
          devolvido_em?: string | null
          enviado_em?: string | null
          especie_volumes?: string | null
          faturado_em?: string | null
          id?: string
          id_aprovador?: string | null
          id_obra?: string
          id_solicitante?: string | null
          motivo_cancelamento?: string | null
          motivo_devolucao?: string | null
          nome_aprovador?: string | null
          nome_devolveu?: string | null
          nome_solicitante?: string | null
          numero?: number
          observacao?: string | null
          observacao_logistica?: string | null
          peso_bruto?: number | null
          peso_liquido?: number | null
          status?: string
          tipo?: string
          transportadora?: string | null
          ultimo_lembrete_em?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_solicitado?: number
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_faturamento_id_aprovador_fkey"
            columns: ["id_aprovador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_faturamento_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_faturamento_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_faturamento_eventos: {
        Row: {
          detalhe: string | null
          em: string
          evento: string
          id: number
          id_solicitacao: string
          id_usuario: string | null
          nome_usuario: string | null
        }
        Insert: {
          detalhe?: string | null
          em?: string
          evento: string
          id?: number
          id_solicitacao: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Update: {
          detalhe?: string | null
          em?: string
          evento?: string
          id?: number
          id_solicitacao?: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_faturamento_eventos_id_solicitacao_fkey"
            columns: ["id_solicitacao"]
            isOneToOne: false
            referencedRelation: "solicitacoes_faturamento"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_faturamento_itens: {
        Row: {
          codigo_familia: string | null
          codigo_material: string | null
          descricao: string | null
          id: string
          id_solicitacao: string
          numero_nf: string | null
          quantidade_aprovada: number | null
          quantidade_faturada: number | null
          quantidade_pedido: number
          quantidade_solicitada: number
          sequencia: number
          unidade: string | null
          valor_aprovado: number | null
          valor_faturado: number | null
          valor_solicitado: number
          valor_unitario_ipi: number
          volumes: number | null
        }
        Insert: {
          codigo_familia?: string | null
          codigo_material?: string | null
          descricao?: string | null
          id?: string
          id_solicitacao: string
          numero_nf?: string | null
          quantidade_aprovada?: number | null
          quantidade_faturada?: number | null
          quantidade_pedido: number
          quantidade_solicitada: number
          sequencia: number
          unidade?: string | null
          valor_aprovado?: number | null
          valor_faturado?: number | null
          valor_solicitado: number
          valor_unitario_ipi: number
          volumes?: number | null
        }
        Update: {
          codigo_familia?: string | null
          codigo_material?: string | null
          descricao?: string | null
          id?: string
          id_solicitacao?: string
          numero_nf?: string | null
          quantidade_aprovada?: number | null
          quantidade_faturada?: number | null
          quantidade_pedido?: number
          quantidade_solicitada?: number
          sequencia?: number
          unidade?: string | null
          valor_aprovado?: number | null
          valor_faturado?: number | null
          valor_solicitado?: number
          valor_unitario_ipi?: number
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_faturamento_itens_id_solicitacao_fkey"
            columns: ["id_solicitacao"]
            isOneToOne: false
            referencedRelation: "solicitacoes_faturamento"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_faturamento_nfs: {
        Row: {
          data_emissao: string | null
          detalhe: Json | null
          divergente: boolean
          id: string
          id_solicitacao: string
          numero_nf: string
          serie_nf: string
          valor: number | null
          vinculado_em: string
        }
        Insert: {
          data_emissao?: string | null
          detalhe?: Json | null
          divergente?: boolean
          id?: string
          id_solicitacao: string
          numero_nf: string
          serie_nf: string
          valor?: number | null
          vinculado_em?: string
        }
        Update: {
          data_emissao?: string | null
          detalhe?: Json | null
          divergente?: boolean
          id?: string
          id_solicitacao?: string
          numero_nf?: string
          serie_nf?: string
          valor?: number | null
          vinculado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_faturamento_nfs_id_solicitacao_fkey"
            columns: ["id_solicitacao"]
            isOneToOne: false
            referencedRelation: "solicitacoes_faturamento"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_faturamento_romaneios: {
        Row: {
          cancelado_em: string | null
          created_at: string
          criado_erp_em: string | null
          erro: string | null
          id: string
          id_solicitacao: string
          login_erp: string
          numero_romaneio: number | null
          situacao: string
          tentativas: number
        }
        Insert: {
          cancelado_em?: string | null
          created_at?: string
          criado_erp_em?: string | null
          erro?: string | null
          id?: string
          id_solicitacao: string
          login_erp: string
          numero_romaneio?: number | null
          situacao?: string
          tentativas?: number
        }
        Update: {
          cancelado_em?: string | null
          created_at?: string
          criado_erp_em?: string | null
          erro?: string | null
          id?: string
          id_solicitacao?: string
          login_erp?: string
          numero_romaneio?: number | null
          situacao?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_faturamento_romaneios_id_solicitacao_fkey"
            columns: ["id_solicitacao"]
            isOneToOne: false
            referencedRelation: "solicitacoes_faturamento"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_material: {
        Row: {
          aplicacao: string | null
          cadastro_em: string | null
          classe_tipo: number
          codigo_edit: string | null
          codigo_edit_automatico: boolean
          codigo_edit_proposto: string | null
          codigo_erp: number | null
          codigo_existente: number | null
          codigo_max_aprovacao: number | null
          concluida_em: string | null
          created_at: string
          descricao: string
          descricao_solicitada: string
          erp_erro: string | null
          erp_tentativas: number
          fiscal_em: string | null
          genero: number | null
          id: string
          id_solicitante: string | null
          motivo: string | null
          ncm: string | null
          ncm_sugerido: string | null
          nome_cadastro: string | null
          nome_concluiu: string | null
          nome_fiscal: string | null
          nome_motivo: string | null
          nome_solicitante: string | null
          numero: number
          obs_cadastro: string | null
          obs_fiscal: string | null
          origem: string | null
          pct_ipi: number | null
          similares: Json
          status: string
          tipo_item: number | null
          unidade: string
          updated_at: string
          urgente: boolean
        }
        Insert: {
          aplicacao?: string | null
          cadastro_em?: string | null
          classe_tipo: number
          codigo_edit?: string | null
          codigo_edit_automatico?: boolean
          codigo_edit_proposto?: string | null
          codigo_erp?: number | null
          codigo_existente?: number | null
          codigo_max_aprovacao?: number | null
          concluida_em?: string | null
          created_at?: string
          descricao: string
          descricao_solicitada: string
          erp_erro?: string | null
          erp_tentativas?: number
          fiscal_em?: string | null
          genero?: number | null
          id?: string
          id_solicitante?: string | null
          motivo?: string | null
          ncm?: string | null
          ncm_sugerido?: string | null
          nome_cadastro?: string | null
          nome_concluiu?: string | null
          nome_fiscal?: string | null
          nome_motivo?: string | null
          nome_solicitante?: string | null
          numero?: number
          obs_cadastro?: string | null
          obs_fiscal?: string | null
          origem?: string | null
          pct_ipi?: number | null
          similares?: Json
          status?: string
          tipo_item?: number | null
          unidade: string
          updated_at?: string
          urgente?: boolean
        }
        Update: {
          aplicacao?: string | null
          cadastro_em?: string | null
          classe_tipo?: number
          codigo_edit?: string | null
          codigo_edit_automatico?: boolean
          codigo_edit_proposto?: string | null
          codigo_erp?: number | null
          codigo_existente?: number | null
          codigo_max_aprovacao?: number | null
          concluida_em?: string | null
          created_at?: string
          descricao?: string
          descricao_solicitada?: string
          erp_erro?: string | null
          erp_tentativas?: number
          fiscal_em?: string | null
          genero?: number | null
          id?: string
          id_solicitante?: string | null
          motivo?: string | null
          ncm?: string | null
          ncm_sugerido?: string | null
          nome_cadastro?: string | null
          nome_concluiu?: string | null
          nome_fiscal?: string | null
          nome_motivo?: string | null
          nome_solicitante?: string | null
          numero?: number
          obs_cadastro?: string | null
          obs_fiscal?: string | null
          origem?: string | null
          pct_ipi?: number | null
          similares?: Json
          status?: string
          tipo_item?: number | null
          unidade?: string
          updated_at?: string
          urgente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_material_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_material_eventos: {
        Row: {
          created_at: string
          detalhe: string | null
          evento: string
          id: number
          id_solicitacao: string
          id_usuario: string | null
          nome_usuario: string | null
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          evento: string
          id?: number
          id_solicitacao: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          evento?: string
          id?: number
          id_solicitacao?: string
          id_usuario?: string | null
          nome_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_material_eventos_id_solicitacao_fkey"
            columns: ["id_solicitacao"]
            isOneToOne: false
            referencedRelation: "solicitacoes_material"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_previsao: {
        Row: {
          anexos: Json
          codigo_obra: string
          codigo_plano: string | null
          created_at: string
          decidido_em: string | null
          desfazer_codigo: string | null
          desfazer_mensagem: string | null
          desfazer_plano: Json | null
          desfazer_status: string | null
          desfeito_em: string | null
          disponivel_informado: number | null
          executado_em: string | null
          familia_destino: string
          id: string
          id_aprovador: string | null
          id_obra: string
          id_solicitante: string | null
          justificativa: string
          log_transferencia: string | null
          mensagem: string | null
          motivo_recusa: string | null
          necessario_informado: number | null
          nome_aprovador: string | null
          nome_solicitante: string
          origens: Json
          plano: Json | null
          resultado: Json | null
          simulado_em: string | null
          solicitante_erp: string | null
          status: string
          tentativas: number
          tipo: string
          updated_at: string
          valor: number
          vencimento: number | null
        }
        Insert: {
          anexos?: Json
          codigo_obra: string
          codigo_plano?: string | null
          created_at?: string
          decidido_em?: string | null
          desfazer_codigo?: string | null
          desfazer_mensagem?: string | null
          desfazer_plano?: Json | null
          desfazer_status?: string | null
          desfeito_em?: string | null
          disponivel_informado?: number | null
          executado_em?: string | null
          familia_destino: string
          id?: string
          id_aprovador?: string | null
          id_obra: string
          id_solicitante?: string | null
          justificativa: string
          log_transferencia?: string | null
          mensagem?: string | null
          motivo_recusa?: string | null
          necessario_informado?: number | null
          nome_aprovador?: string | null
          nome_solicitante: string
          origens?: Json
          plano?: Json | null
          resultado?: Json | null
          simulado_em?: string | null
          solicitante_erp?: string | null
          status?: string
          tentativas?: number
          tipo: string
          updated_at?: string
          valor: number
          vencimento?: number | null
        }
        Update: {
          anexos?: Json
          codigo_obra?: string
          codigo_plano?: string | null
          created_at?: string
          decidido_em?: string | null
          desfazer_codigo?: string | null
          desfazer_mensagem?: string | null
          desfazer_plano?: Json | null
          desfazer_status?: string | null
          desfeito_em?: string | null
          disponivel_informado?: number | null
          executado_em?: string | null
          familia_destino?: string
          id?: string
          id_aprovador?: string | null
          id_obra?: string
          id_solicitante?: string | null
          justificativa?: string
          log_transferencia?: string | null
          mensagem?: string | null
          motivo_recusa?: string | null
          necessario_informado?: number | null
          nome_aprovador?: string | null
          nome_solicitante?: string
          origens?: Json
          plano?: Json | null
          resultado?: Json | null
          simulado_em?: string | null
          solicitante_erp?: string | null
          status?: string
          tentativas?: number
          tipo?: string
          updated_at?: string
          valor?: number
          vencimento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_previsao_id_aprovador_fkey"
            columns: ["id_aprovador"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_previsao_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_previsao_id_solicitante_fkey"
            columns: ["id_solicitante"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_impressoes: {
        Row: {
          atualizado_em: string
          chave: string
          etapa: string
          hash: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          etapa: string
          hash: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          etapa?: string
          hash?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          avisos: Json | null
          duracoes: Json | null
          etapas_com_erro: string[]
          id: string
          iniciou_em: string | null
          ok: boolean
          terminou_em: string | null
          updated_at: string
        }
        Insert: {
          avisos?: Json | null
          duracoes?: Json | null
          etapas_com_erro?: string[]
          id: string
          iniciou_em?: string | null
          ok?: boolean
          terminou_em?: string | null
          updated_at?: string
        }
        Update: {
          avisos?: Json | null
          duracoes?: Json | null
          etapas_com_erro?: string[]
          id?: string
          iniciou_em?: string | null
          ok?: boolean
          terminou_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string | null
          data_conclusao: string | null
          data_vencimento: string | null
          descricao: string | null
          email_atribuicao_enviado: boolean
          id: string
          id_obra: string | null
          id_responsavel: string | null
          id_reuniao_origem: string | null
          id_reuniao_reaberta: string | null
          lembrete_prazo_enviado: boolean
          observacao_conclusao: string | null
          origem: string | null
          prioridade: string | null
          status: Database["public"]["Enums"]["status_tarefa"] | null
          titulo: string
          ultimo_lembrete_vencida_em: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          email_atribuicao_enviado?: boolean
          id?: string
          id_obra?: string | null
          id_responsavel?: string | null
          id_reuniao_origem?: string | null
          id_reuniao_reaberta?: string | null
          lembrete_prazo_enviado?: boolean
          observacao_conclusao?: string | null
          origem?: string | null
          prioridade?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"] | null
          titulo: string
          ultimo_lembrete_vencida_em?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_conclusao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          email_atribuicao_enviado?: boolean
          id?: string
          id_obra?: string | null
          id_responsavel?: string | null
          id_reuniao_origem?: string | null
          id_reuniao_reaberta?: string | null
          lembrete_prazo_enviado?: boolean
          observacao_conclusao?: string | null
          origem?: string | null
          prioridade?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"] | null
          titulo?: string
          ultimo_lembrete_vencida_em?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_id_obra_fkey"
            columns: ["id_obra"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_id_responsavel_fkey"
            columns: ["id_responsavel"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_id_reuniao_origem_fkey"
            columns: ["id_reuniao_origem"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      transportadoras: {
        Row: {
          cidade: string | null
          cnpj: string | null
          codigo: number
          nome: string
          uf: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          codigo: number
          nome: string
          uf?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          codigo?: number
          nome?: string
          uf?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          aprova_faturamento: boolean
          aprova_previsao: boolean
          ativo: boolean | null
          cadastra_materiais: boolean
          created_at: string | null
          email: string
          id: string
          id_engenheiro_vinculado: string | null
          login_erp: string | null
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"] | null
          recebe_alerta_sistema: boolean
          recebe_copia_faturamento: boolean
          recebe_copia_material: boolean
          recebe_copia_previsao: boolean
          recebe_nf_terceiros: boolean
          revisa_fiscal_material: boolean
        }
        Insert: {
          aprova_faturamento?: boolean
          aprova_previsao?: boolean
          ativo?: boolean | null
          cadastra_materiais?: boolean
          created_at?: string | null
          email: string
          id?: string
          id_engenheiro_vinculado?: string | null
          login_erp?: string | null
          nome: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"] | null
          recebe_alerta_sistema?: boolean
          recebe_copia_faturamento?: boolean
          recebe_copia_material?: boolean
          recebe_copia_previsao?: boolean
          recebe_nf_terceiros?: boolean
          revisa_fiscal_material?: boolean
        }
        Update: {
          aprova_faturamento?: boolean
          aprova_previsao?: boolean
          ativo?: boolean | null
          cadastra_materiais?: boolean
          created_at?: string | null
          email?: string
          id?: string
          id_engenheiro_vinculado?: string | null
          login_erp?: string | null
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"] | null
          recebe_alerta_sistema?: boolean
          recebe_copia_faturamento?: boolean
          recebe_copia_material?: boolean
          recebe_copia_previsao?: boolean
          recebe_nf_terceiros?: boolean
          revisa_fiscal_material?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_engenheiro_vinculado_fkey"
            columns: ["id_engenheiro_vinculado"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_erp: {
        Row: {
          atualizado_em: string
          login: string
        }
        Insert: {
          atualizado_em?: string
          login: string
        }
        Update: {
          atualizado_em?: string
          login?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alerta_sistema_avisar: {
        Args: { p_detalhe: string; p_problema: boolean; p_titulo: string }
        Returns: undefined
      }
      aprovar_solicitacao_previsao: {
        Args: { p_codigo: string; p_id: string }
        Returns: undefined
      }
      cancelar_desfazer_previsao: { Args: { p_id: string }; Returns: undefined }
      cancelar_obra_pmis: {
        Args: {
          p_cancelar_cronograma?: boolean
          p_cancelar_tarefas?: boolean
          p_data_cancelamento: string
          p_id_obra: string
          p_motivo_cancelamento: string
          p_observacao_cancelamento: string
        }
        Returns: Json
      }
      cancelar_solicitacao_previsao: {
        Args: { p_id: string }
        Returns: undefined
      }
      compras_previsoes_abertas: {
        Args: never
        Returns: {
          codigo_obra: string
          codigo_projeto: string
          descricao: string
          gestor: string
          id_obra: string
          nivel_alerta: string
          nome_obra: string
          previsoes_em_aberto: number
          previsoes_numeros: string
        }[]
      }
      compras_sma_pendentes: {
        Args: never
        Returns: {
          codigo_material: string
          codigo_obra: string
          data_cadastro: string
          data_necessidade: string
          descricao_material: string
          gestor: string
          id_obra: string
          nome_obra: string
          nr_sma: number
          projeto_sma: string
          quantidade_pendente: number
          sequencia: number
          situacao_compra: string
          solicitante: string
          urgente: boolean
        }[]
      }
      confirmar_desfazer_previsao: {
        Args: { p_codigo: string; p_id: string }
        Returns: undefined
      }
      criar_cronograma_padrao_obra: {
        Args: { p_id_obra: string }
        Returns: undefined
      }
      criar_documentos_padrao_obra: {
        Args: { p_id_obra: string }
        Returns: undefined
      }
      criar_familias_faturamento_obra: {
        Args: { p_id_obra: string }
        Returns: undefined
      }
      despertar_app: { Args: never; Returns: undefined }
      eh_admin: { Args: never; Returns: boolean }
      eh_admin_ou_coordenador: { Args: never; Returns: boolean }
      eh_aprovador_faturamento: { Args: never; Returns: boolean }
      eh_aprovador_previsao: { Args: never; Returns: boolean }
      eh_financeiro: { Args: never; Returns: boolean }
      eh_fiscal: { Args: never; Returns: boolean }
      eh_logistica: { Args: never; Returns: boolean }
      eh_usuario_ativo: { Args: never; Returns: boolean }
      email_frete: {
        Args: {
          f: Database["public"]["Tables"]["fretes"]["Row"]
          p_aviso: string
          p_cor: string
          p_saldo: number
          p_titulo: string
          p_url: string
        }
        Returns: string
      }
      email_nf_terceiros: {
        Args: {
          n: Database["public"]["Tables"]["nfs_terceiros"]["Row"]
          p_aviso: string
          p_cor: string
          p_titulo: string
          p_url: string
        }
        Returns: string
      }
      email_solicitacao_faturamento: {
        Args: {
          p_aviso: string
          p_botao: string
          p_cor: string
          p_titulo: string
          p_url: string
          s: Database["public"]["Tables"]["solicitacoes_faturamento"]["Row"]
        }
        Returns: string
      }
      email_solicitacao_material: {
        Args: {
          p_aviso: string
          p_cor: string
          p_titulo: string
          p_url: string
          s: Database["public"]["Tables"]["solicitacoes_material"]["Row"]
        }
        Returns: string
      }
      email_solicitacao_previsao: {
        Args: {
          p_aviso: string
          p_botao: string
          p_cor: string
          p_titulo: string
          p_url: string
          s: Database["public"]["Tables"]["solicitacoes_previsao"]["Row"]
        }
        Returns: string
      }
      enfileirar_email: {
        Args: {
          p_assunto: string
          p_html: string
          p_id_tarefa?: string
          p_origem?: string
          p_para: string[]
        }
        Returns: string
      }
      exportacao_aprovar: {
        Args: { p_hash: string; p_id_obra: string }
        Returns: undefined
      }
      exportacao_baixar: {
        Args: { p_id: string }
        Returns: {
          conteudo_base64: string
          nome_arquivo: string
        }[]
      }
      exportacao_config_salvar: {
        Args: { p_banco: string; p_exportador: Json; p_local: string }
        Returns: undefined
      }
      exportacao_estimativa_salvar: {
        Args: {
          p_alt: number
          p_bruto: number
          p_codigo: string
          p_comp: number
          p_fonte: string
          p_larg: number
          p_peso: number
        }
        Returns: undefined
      }
      exportacao_marcar_obra: {
        Args: { p_exportacao: boolean; p_id_obra: string }
        Returns: undefined
      }
      exportacao_pedir_documento: {
        Args: { p_id_obra: string; p_tipo: string }
        Returns: string
      }
      exportacao_salvar: {
        Args: { p_dados: Json; p_id_obra: string }
        Returns: {
          atualizado_em: string
          hash_dados: string
          situacao: string
        }[]
      }
      familia_com_nome: {
        Args: { p_familia: string; p_id_obra: string }
        Returns: string
      }
      faturamento_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      faturamento_devolver: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      faturamento_logistica_aprovar: {
        Args: {
          p_codigo_transportadora: number
          p_especie: string
          p_id: string
          p_itens: Json
          p_observacao: string
          p_peso_bruto: number
          p_peso_liquido: number
          p_transportadora: string
          p_volumes: number
        }
        Returns: undefined
      }
      faturamento_salvar: {
        Args: {
          p_anexos?: Json
          p_data_desejada: string
          p_enviar: boolean
          p_id: string
          p_id_obra: string
          p_itens: Json
          p_observacao: string
          p_tipo: string
        }
        Returns: string
      }
      finalizar_obra_pmis: {
        Args: {
          p_data_finalizacao: string
          p_id_obra: string
          p_observacao: string
        }
        Returns: Json
      }
      formatar_brl: { Args: { p_valor: number }; Returns: string }
      frete_avaliar: { Args: { p_id: string }; Returns: string }
      frete_avisar: {
        Args: {
          p_assunto: string
          p_aviso: string
          p_cc: string[]
          p_cor: string
          p_id: string
          p_para: string[]
          p_titulo: string
          p_titulo_push: string
        }
        Returns: undefined
      }
      frete_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      frete_carga_normalizar: {
        Args: { p_carga: Json }
        Returns: Record<string, unknown>
      }
      frete_distancia: {
        Args: { p_destino: number; p_origem: number }
        Returns: number
      }
      frete_email_ligado: { Args: never; Returns: boolean }
      frete_evento: {
        Args: { p_detalhe?: string; p_evento: string; p_id: string }
        Returns: undefined
      }
      frete_gestores: { Args: { p_id_obra: string }; Returns: string[] }
      frete_logistica: { Args: never; Returns: string[] }
      frete_marcar_transportadora: {
        Args: { p_codigo: number; p_sim: boolean }
        Returns: undefined
      }
      frete_reavaliar_obra: { Args: { p_id_obra: string }; Returns: number }
      frete_registrar_cte: {
        Args: {
          p_baixas: Json
          p_cod_fornecedor: number
          p_codigo_obra: string
          p_data_entrada: string
          p_mensagem: string
          p_nr_ad: number
          p_numero_cte: string
          p_projeto: string
          p_status: string
          p_valor: number
        }
        Returns: string
      }
      frete_saldo: {
        Args: { p_excluir?: string; p_id_obra: string }
        Returns: number
      }
      frete_salvar: {
        Args: {
          p_altura_m?: number
          p_carga?: Json
          p_cod_fornecedor: number
          p_comprimento_m?: number
          p_cubagem_m3?: number
          p_data: string
          p_destino_ibge: number
          p_destino_nome: string
          p_destino_tipo: string
          p_id: string
          p_id_obra: string
          p_km: number
          p_largura_m?: number
          p_numero_documento: string
          p_observacao: string
          p_operacao: string
          p_origem_ibge: number
          p_origem_nome: string
          p_origem_tipo: string
          p_peso_kg?: number
          p_tipo_documento: string
          p_tipo_veiculo: string
          p_transportadora_codigo: number
          p_valor_cotado: number
          p_valor_km: number
          p_volumes?: number
        }
        Returns: string
      }
      frete_sugestoes: {
        Args: { p_destino: number; p_origem: number; p_tipo_veiculo: string }
        Returns: {
          atende: boolean
          historico_ctes: number
          historico_rs_km: number
          km: number
          preco: number
          transportadora_codigo: number
          transportadora_nome: string
          valor_km: number
          valor_minimo: number
        }[]
      }
      html_esc: { Args: { p: string }; Returns: string }
      limpeza_diaria: { Args: never; Returns: Json }
      marcar_notificacoes_lidas: {
        Args: { p_ids?: string[] }
        Returns: undefined
      }
      mat_alterar_codigo_proposto: {
        Args: { p_codigo_edit: string; p_id: string }
        Returns: undefined
      }
      mat_aprovar_cadastro: {
        Args: {
          p_classe_tipo: number
          p_descricao: string
          p_id: string
          p_obs?: string
          p_origem?: string
          p_unidade: string
        }
        Returns: undefined
      }
      mat_aprovar_fiscal: {
        Args: {
          p_codigo_edit?: string
          p_id: string
          p_ncm: string
          p_obs?: string
          p_pct_ipi: number
          p_tipo_item: number
        }
        Returns: undefined
      }
      mat_avisar: {
        Args: {
          p_assunto: string
          p_aviso: string
          p_cor: string
          p_id: string
          p_para: string[]
          p_titulo: string
          p_titulo_push: string
        }
        Returns: undefined
      }
      mat_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      mat_classe_rotulo: { Args: { p: number }; Returns: string }
      mat_criacao_erp_ligada: { Args: never; Returns: boolean }
      mat_devolver: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      mat_eh_cadastro: { Args: never; Returns: boolean }
      mat_eh_fiscal: { Args: never; Returns: boolean }
      mat_email_ligado: { Args: never; Returns: boolean }
      mat_evento: {
        Args: { p_detalhe?: string; p_evento: string; p_id: string }
        Returns: undefined
      }
      mat_informar_codigo: {
        Args: { p_codigo: string; p_id: string }
        Returns: undefined
      }
      mat_lembretes: { Args: never; Returns: number }
      mat_ligar_criados: { Args: never; Returns: number }
      mat_nome_atual: { Args: never; Returns: string }
      mat_normalizar: { Args: { p: string }; Returns: string }
      mat_origem_pcp: { Args: { p_origem: string }; Returns: number }
      mat_prefixo_codigo: { Args: { p_classe_tipo: number }; Returns: string }
      mat_proximo_codigo_edit: {
        Args: { p_classe_tipo: number; p_excluir?: string }
        Returns: string
      }
      mat_recusar: {
        Args: { p_codigo_existente?: string; p_id: string; p_motivo: string }
        Returns: undefined
      }
      mat_registrar_criado_erp: {
        Args: { p_codigo: number; p_codigo_edit: string; p_id: string }
        Returns: boolean
      }
      mat_registrar_erro_erp: {
        Args: { p_erro: string; p_id: string }
        Returns: undefined
      }
      mat_similares: {
        Args: { p_excluir?: string; p_limite?: number; p_texto: string }
        Returns: {
          classe: string
          codigo: number
          codigo_edit: string
          descricao: string
          id_solicitacao: string
          ncm: string
          numero_solicitacao: number
          origem: string
          semelhanca: number
          situacao: string
          tipo_pcp: number
          unidade: string
        }[]
      }
      mat_solicitar: {
        Args: {
          p_aplicacao?: string
          p_classe_tipo: number
          p_descricao: string
          p_id: string
          p_ncm?: string
          p_origem?: string
          p_unidade: string
          p_urgente?: boolean
        }
        Returns: string
      }
      mat_validar_basico: {
        Args: { p_classe_tipo: number; p_descricao: string; p_unidade: string }
        Returns: undefined
      }
      mat_validar_codigo_edit: {
        Args: {
          p_codigo: string
          p_s: Database["public"]["Tables"]["solicitacoes_material"]["Row"]
        }
        Returns: string
      }
      minhas_pendencias: { Args: never; Returns: Json }
      nft_avisar: {
        Args: {
          p_anexar: boolean
          p_assunto: string
          p_aviso: string
          p_cc: string[]
          p_cor: string
          p_id: string
          p_para: string[]
          p_titulo: string
          p_titulo_push: string
        }
        Returns: undefined
      }
      nft_cancelar: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      nft_devolver: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      nft_email_ligado: { Args: never; Returns: boolean }
      nft_encaminhar: {
        Args: {
          p_anexos?: Json
          p_arquivo_caminho: string
          p_arquivo_nome: string
          p_arquivo_url: string
          p_dados_pagamento?: Json
          p_data_emissao: string
          p_forma_pagamento?: string
          p_id: string
          p_id_obra: string
          p_nr_pedido: number
          p_numero_nf: string
          p_observacao: string
          p_valor: number
          p_vencimento: string
        }
        Returns: string
      }
      nft_evento: {
        Args: { p_detalhe?: string; p_evento: string; p_id: string }
        Returns: undefined
      }
      nft_lembretes: { Args: never; Returns: number }
      nft_pagamento_html: {
        Args: { p_dados: Json; p_forma: string }
        Returns: string
      }
      nft_validar_pagamento: {
        Args: { p_dados: Json; p_forma: string }
        Returns: Json
      }
      notificar_equipe_obra: {
        Args: {
          p_chave?: string
          p_detalhe: string
          p_financeira?: boolean
          p_id_obra: string
          p_tipo: string
          p_titulo: string
        }
        Returns: undefined
      }
      notificar_recebimento_obra: {
        Args: { p_id_obra: string; p_valor: number }
        Returns: undefined
      }
      notificar_usuario: {
        Args: {
          p_chave?: string
          p_destino: string
          p_detalhe: string
          p_financeira?: boolean
          p_id_obra?: string
          p_id_tarefa?: string
          p_tipo: string
          p_titulo: string
        }
        Returns: undefined
      }
      obra_valores_erp_solicitar: {
        Args: {
          p_id_obra: string
          p_margem_contribuicao: number
          p_rentabilidade: number
          p_venda_sem_impostos: number
        }
        Returns: string
      }
      obras_resumo_cartao: {
        Args: { p_ids: string[] }
        Returns: {
          alertas_abertos: number
          alertas_criticos: number
          documentos_atrasados: number
          fases_atrasadas: number
          id_obra: string
          parcelas_vencidas: number
          tarefas_atrasadas: number
        }[]
      }
      pedir_desfazer_previsao: { Args: { p_id: string }; Returns: undefined }
      perfil_atual: { Args: never; Returns: string }
      pode_aprovar_exportacao: {
        Args: { p_id_obra?: string }
        Returns: boolean
      }
      pode_editar_exportacao: { Args: { p_id_obra?: string }; Returns: boolean }
      pode_gerenciar_arquivo: { Args: { p_nome: string }; Returns: boolean }
      pode_gerenciar_obra: { Args: { p_id_obra: string }; Returns: boolean }
      pode_gerenciar_responsavel: {
        Args: { p_id_responsavel: string }
        Returns: boolean
      }
      pode_ver_exportacao: { Args: { p_id_obra?: string }; Returns: boolean }
      pode_ver_nf_terceiros: { Args: { p_id_obra: string }; Returns: boolean }
      pode_ver_solicitacao_faturamento: {
        Args: { p_id_obra: string; p_id_solicitante: string }
        Returns: boolean
      }
      previsoes_familias_obra: {
        Args: { p_id_obra: string }
        Returns: {
          codigo_projeto: string
          descricao: string
          eh_obra: boolean
          nivel_alerta: string
          previsoes_em_aberto: number
          previsoes_numeros: string
        }[]
      }
      push_lote: { Args: { p_id: string; p_segredo: string }; Returns: Json }
      push_resultado: {
        Args: { p_enviadas: string[]; p_expiradas: string[]; p_segredo: string }
        Returns: undefined
      }
      push_segredo_ok: { Args: { p_segredo: string }; Returns: boolean }
      reabrir_ata: { Args: { p_id_reuniao: string }; Returns: Json }
      recusar_solicitacao_previsao: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      reenviar_solicitacao_previsao: {
        Args: { p_id: string }
        Returns: undefined
      }
      registrar_push: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      regularizar_familias_faturamento_obras_existentes: {
        Args: never
        Returns: undefined
      }
      regularizar_grupos_faturamento_obra: {
        Args: { p_id_obra: string }
        Returns: undefined
      }
      regularizar_pmis_obras_existentes: { Args: never; Returns: undefined }
      religar_tarefas_ata: {
        Args: { p_id_reuniao: string; p_ids_tarefas: string[] }
        Returns: number
      }
      remover_push: { Args: { p_endpoint: string }; Returns: undefined }
      sf_avisar: {
        Args: {
          p_assunto: string
          p_aviso: string
          p_cc: string[]
          p_cor: string
          p_id: string
          p_para: string[]
          p_titulo: string
          p_titulo_push: string
        }
        Returns: undefined
      }
      sf_descartar_romaneios: { Args: { p_id: string }; Returns: undefined }
      sf_email_ligado: { Args: never; Returns: boolean }
      sf_emails: {
        Args: { p_excluir?: string[]; p_ids: string[] }
        Returns: string[]
      }
      sf_evento: {
        Args: { p_detalhe?: string; p_evento: string; p_id: string }
        Returns: undefined
      }
      sf_gravar_itens: {
        Args: {
          p_id: string
          p_id_obra: string
          p_itens: Json
          p_logistica: boolean
          p_tipo: string
        }
        Returns: number
      }
      sf_itens_disponiveis: {
        Args: { p_id_obra: string; p_ignorar?: string; p_tipo: string }
        Returns: {
          codigo_familia: string
          codigo_material: string
          descricao: string
          descricao_familia: string
          quantidade_faturada: number
          quantidade_pedido: number
          saldo: number
          sequencia: number
          unidade: string
          valor_pedido: number
          valor_saldo: number
          valor_unitario_ipi: number
        }[]
      }
      sf_lembretes: { Args: never; Returns: number }
      sf_saldo_item: {
        Args: { p_id_obra: string; p_ignorar?: string; p_sequencia: number }
        Returns: number
      }
      url_da_notificacao: {
        Args: { n: Database["public"]["Tables"]["notificacoes"]["Row"] }
        Returns: string
      }
      usuario_atual_id: { Args: never; Returns: string }
      validar_escopo_grupos_faturamento: {
        Args: { p_id_obra: string }
        Returns: {
          codigo_grupo: string
          descricao_grupo: string
          diferenca: number
          esta_batendo: boolean
          id_grupo_faturamento: string
          valor_total_familias: number
          valor_total_grupo: number
        }[]
      }
      validar_faturamento_obra_para_finalizar: {
        Args: { p_id_obra: string }
        Returns: {
          escopo_total: number
          faturado_total: number
          pode_finalizar: boolean
          saldo_a_faturar: number
        }[]
      }
      verificar_saude_robo: { Args: never; Returns: number }
    }
    Enums: {
      clima_tipo: "ensolarado" | "chuvoso" | "misto"
      perfil_usuario:
        | "admin"
        | "gestor"
        | "engenheiro"
        | "cliente"
        | "assistente"
        | "logistica"
        | "coordenador"
        | "fiscal"
        | "financeiro"
      status_obra:
        | "em_andamento"
        | "concluida"
        | "paralisada"
        | "finalizada"
        | "cancelada"
        | "pausada"
      status_tarefa: "pendente" | "em_andamento" | "concluida" | "cancelada"
      tipo_historico:
        | "comentario"
        | "alteracao_status"
        | "alteracao_prazo"
        | "alteracao_responsavel"
      tipo_ocorrencia:
        | "avanco"
        | "atraso"
        | "fornecedor"
        | "financeiro"
        | "acidente"
        | "outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      clima_tipo: ["ensolarado", "chuvoso", "misto"],
      perfil_usuario: [
        "admin",
        "gestor",
        "engenheiro",
        "cliente",
        "assistente",
        "logistica",
        "coordenador",
        "fiscal",
        "financeiro",
      ],
      status_obra: [
        "em_andamento",
        "concluida",
        "paralisada",
        "finalizada",
        "cancelada",
        "pausada",
      ],
      status_tarefa: ["pendente", "em_andamento", "concluida", "cancelada"],
      tipo_historico: [
        "comentario",
        "alteracao_status",
        "alteracao_prazo",
        "alteracao_responsavel",
      ],
      tipo_ocorrencia: [
        "avanco",
        "atraso",
        "fornecedor",
        "financeiro",
        "acidente",
        "outros",
      ],
    },
  },
} as const
