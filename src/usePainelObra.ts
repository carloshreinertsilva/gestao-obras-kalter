import { useState } from "react";
import { supabase } from "./supabase";
import { compararCodigoFamilia } from "./utils";
import type {
  ParcelaCliente,
  DocumentoProjeto,
  CronogramaObra,
  ObraFaturamentoFamilia,
  ObraFaturamentoGrupo,
  ObraFaturamentoPrevisao,
  ObraFaturamentoRealizado,
  ObraSmaMaterial,
  ObraRentabilidadeFamilia,
} from "./types";

// Painel da obra (06/11/2026, item 37 da revisao): estados e cargas das tabelas da obra, tirados do App.tsx.
// O App decide QUANDO carregar (1x por obra aberta; SMA e rentabilidade so quando a aba e aberta) e usa
// os mesmos nomes de antes. Proximo passo: mover para ca tambem os efeitos e as gravacoes do painel.
export function usePainelObra(falhaAoCarregar: (oque: string, error: unknown) => void) {
  const [parcelasCliente, setParcelasCliente] = useState<ParcelaCliente[]>([]);
  const [documentosProjeto, setDocumentosProjeto] = useState<DocumentoProjeto[]>([]);
  const [cronogramaObra, setCronogramaObra] = useState<CronogramaObra[]>([]);
  const [arquivosDocumentos, setArquivosDocumentos] = useState<any>({});
  const [familiasFaturamento, setFamiliasFaturamento] = useState<
    ObraFaturamentoFamilia[]
  >([]);
  const [gruposFaturamentoObra, setGruposFaturamentoObra] = useState<
    ObraFaturamentoGrupo[]
  >([]);
  const [previsoesFaturamento, setPrevisoesFaturamento] = useState<
    ObraFaturamentoPrevisao[]
  >([]);
  const [realizadosFaturamento, setRealizadosFaturamento] = useState<
    ObraFaturamentoRealizado[]
  >([]);
  const [materiaisSma, setMateriaisSma] = useState<ObraSmaMaterial[]>([]);
  const [rentabilidadeFamilias, setRentabilidadeFamilias] = useState<
    ObraRentabilidadeFamilia[]
  >([]);

  const buscarParcelasCliente = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("parcelas_cliente")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("data_prevista", { ascending: true });
      if (error) throw error;
      setParcelasCliente(data || []);
    } catch (error) {
      falhaAoCarregar("as parcelas do cliente", error);
    }
  };

  const buscarDocumentosProjeto = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("documentos_projeto")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setDocumentosProjeto(data || []);
    } catch (error) {
      falhaAoCarregar("os documentos do projeto", error);
    }
  };

  const buscarArquivosDocumentos = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("documentos_projeto_arquivos")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const agrupado = (data || []).reduce((acc: any, arquivo: any) => {
        if (!acc[arquivo.id_documento]) acc[arquivo.id_documento] = [];
        acc[arquivo.id_documento].push(arquivo);
        return acc;
      }, {});

      setArquivosDocumentos(agrupado);
    } catch (error) {
      falhaAoCarregar("os anexos dos documentos", error);
    }
  };

  const buscarCronogramaObra = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("cronograma_obra")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("ordem", { ascending: true });
      if (error) throw error;
      setCronogramaObra(data || []);
    } catch (error) {
      falhaAoCarregar("o cronograma da obra", error);
    }
  };

  const buscarFamiliasFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_familias")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("ordem", { ascending: true });
      if (error) throw error;
      setFamiliasFaturamento(
        (data || []).sort((a, b) =>
          compararCodigoFamilia(a.codigo_familia, b.codigo_familia),
        ),
      );
    } catch (error) {
      falhaAoCarregar("as famílias de faturamento", error);
    }
  };

  const buscarGruposFaturamentoObra = async (idDaObra: any) => {
    if (!idDaObra) return;

    try {
      const { data, error } = await supabase
        .from("obra_faturamento_grupos")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("codigo", { ascending: true });

      if (error) throw error;

      setGruposFaturamentoObra(data || []);
    } catch (error) {
      falhaAoCarregar("os grupos de faturamento", error);
      setGruposFaturamentoObra([]);
    }
  };

  const buscarPrevisoesFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_previsoes")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("competencia", { ascending: true });
      if (error) throw error;
      setPrevisoesFaturamento(data || []);
    } catch (error) {
      falhaAoCarregar("as previsões de faturamento", error);
    }
  };

  const buscarRealizadosFaturamento = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_faturamento_realizados")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("competencia", { ascending: true });
      if (error) throw error;
      setRealizadosFaturamento(data || []);
    } catch (error) {
      falhaAoCarregar("os faturamentos realizados", error);
    }
  };

  const buscarMateriaisSma = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      // 06/11 (item 4): a API do Supabase devolve no maximo 1000 linhas por consulta; a maior obra tem ~1200
      const PAGINA = 1000;
      const todas: any[] = [];
      for (let inicio = 0; ; inicio += PAGINA) {
        const { data, error } = await supabase
          .from("obra_sma_materiais")
          .select("*")
          .eq("id_obra", idDaObra)
          .order("nr_sma", { ascending: false })
          .order("id", { ascending: true })
          .range(inicio, inicio + PAGINA - 1);
        if (error) throw error;
        todas.push(...(data || []));
        if (!data || data.length < PAGINA) break;
      }
      setMateriaisSma(todas);
    } catch (error) {
      falhaAoCarregar("a lista de materiais (SMA)", error);
    }
  };

  const buscarRentabilidadeFamilias = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data, error } = await supabase
        .from("obra_rentabilidade_familias")
        .select("*")
        .eq("id_obra", idDaObra)
        .order("codigo_projeto", { ascending: true });
      if (error) throw error;
      setRentabilidadeFamilias(data || []);
    } catch (error) {
      falhaAoCarregar("a rentabilidade do projeto", error);
    }
  };

  return {
    parcelasCliente,
    setParcelasCliente,
    documentosProjeto,
    setDocumentosProjeto,
    cronogramaObra,
    setCronogramaObra,
    arquivosDocumentos,
    setArquivosDocumentos,
    familiasFaturamento,
    setFamiliasFaturamento,
    gruposFaturamentoObra,
    setGruposFaturamentoObra,
    previsoesFaturamento,
    setPrevisoesFaturamento,
    realizadosFaturamento,
    setRealizadosFaturamento,
    materiaisSma,
    setMateriaisSma,
    rentabilidadeFamilias,
    setRentabilidadeFamilias,
    buscarParcelasCliente,
    buscarDocumentosProjeto,
    buscarArquivosDocumentos,
    buscarCronogramaObra,
    buscarFamiliasFaturamento,
    buscarGruposFaturamentoObra,
    buscarPrevisoesFaturamento,
    buscarRealizadosFaturamento,
    buscarMateriaisSma,
    buscarRentabilidadeFamilias,
  };
}
