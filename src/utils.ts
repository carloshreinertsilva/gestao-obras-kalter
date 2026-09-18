import type { FocusEvent } from "react";
import { fasesProjeto, perfisUsuario } from "./constants";

export const formatarDataSegura = (dataStr: any) => {
  if (!dataStr) return "Sem prazo";
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return "Data Inválida";
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch (e) {
    return "Data Inválida";
  }
};

export const formatarDataHora = (dataStr: any) => {
  if (!dataStr) return "";
  try {
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("pt-BR", {
      timeZone: "UTC",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch (e) {
    return "";
  }
};

export const formatarMoeda = (valor: any) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
};

export const dataHojeISO = () => new Date().toISOString().split("T")[0];

export const competenciaParaData = (competencia: string) => {
  if (!competencia) return null;
  if (/^\d{4}-\d{2}$/.test(competencia)) return `${competencia}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(competencia))
    return competencia.slice(0, 7) + "-01";
  return null;
};

export const formatarCompetencia = (competencia: any) => {
  if (!competencia) return "-";
  const dataISO = String(competencia).slice(0, 10);
  const data = new Date(`${dataISO}T00:00:00`);
  if (isNaN(data.getTime())) return String(competencia);
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${meses[data.getUTCMonth()]}/${String(data.getUTCFullYear()).slice(-2)}`;
};

export const codigoGrupoFaturamento = (valor: any) => String(valor || "").trim();

export const selecionarTextoAoFocar = (e: FocusEvent<HTMLInputElement>) => {
  e.currentTarget.select();
};

export const isoParaDataBR = (dataStr: any) => {
  if (!dataStr) return "";
  const dataLimpa = String(dataStr).split("T")[0];
  const partes = dataLimpa.split("-");
  if (partes.length !== 3) return "";
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export const formatarEntradaDataBR = (valor: string) => {
  const somenteNumeros = valor.replace(/\D/g, "").slice(0, 8);
  const dia = somenteNumeros.slice(0, 2);
  const mes = somenteNumeros.slice(2, 4);
  const ano = somenteNumeros.slice(4, 8);
  if (somenteNumeros.length <= 2) return dia;
  if (somenteNumeros.length <= 4) return `${dia}/${mes}`;
  return `${dia}/${mes}/${ano}`;
};

export const dataBRParaISO = (valor: string) => {
  const partes = valor.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes;
  if (dia.length !== 2 || mes.length !== 2 || ano.length !== 4) return null;
  const data = new Date(`${ano}-${mes}-${dia}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  if (
    data.getFullYear() !== Number(ano) ||
    data.getMonth() + 1 !== Number(mes) ||
    data.getDate() !== Number(dia)
  )
    return null;
  return `${ano}-${mes}-${dia}`;
};

export const calcularStatusParcela = (parcela: any) => {
  const previsto = Number(parcela?.valor_previsto || 0);
  const realizado = Number(parcela?.valor_realizado || 0);
  if (parcela?.status === "cancelado") return "cancelado";
  if (realizado >= previsto && previsto > 0) return "pago";
  if (realizado > 0) return "pago_parcial";
  return "pendente";
};

export const labelStatusParcelaCalculado = (parcela: any) => {
  const statusCalculado = calcularStatusParcela(parcela);
  const estaVencida =
    statusCalculado === "pendente" &&
    parcela?.data_prevista &&
    parcela.data_prevista < dataHojeISO();
  const mapa: any = {
    pendente: estaVencida ? "Pendente (vencido)" : "Pendente",
    pago_parcial: "Parcial",
    pago: "Pago",
    cancelado: "Cancelado",
  };
  return mapa[statusCalculado] || "Pendente";
};

export const classeStatusParcela = (parcela: any) => {
  const statusCalculado = calcularStatusParcela(parcela);
  const estaVencida =
    statusCalculado === "pendente" &&
    parcela?.data_prevista &&
    parcela.data_prevista < dataHojeISO();
  if (statusCalculado === "pago")
    return "bg-green-100 text-green-700 border-green-200";
  if (statusCalculado === "pago_parcial")
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (statusCalculado === "cancelado")
    return "bg-slate-100 text-slate-500 border-slate-200";
  if (estaVencida) return "bg-red-100 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-100";
};

export const labelFase = (fase: string) =>
  fasesProjeto.find((f) => f.valor === fase)?.label || fase;

export const labelPerfilUsuario = (perfil: string) =>
  perfisUsuario.find((p) => p.valor === perfil)?.label || perfil;

export const labelStatusParcela = (status: string) => {
  const mapa: any = {
    a_vencer: "Pendente",
    vencido: "Pendente (vencido)",
    pago_parcial: "Parcial",
    pago: "Pago",
    cancelado: "Cancelado",
  };
  return mapa[status] || status;
};

export const labelStatusDocumento = (status: string) => {
  const mapa: any = {
    nao_elaborado: "Não Elaborado",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    nao_aplicavel: "Não Aplicável",
  };
  return mapa[status] || status;
};

export const corIndicador = (indicador: string) => {
  const mapa: any = {
    verde: "bg-green-500",
    amarelo: "bg-yellow-400",
    vermelho: "bg-red-500",
  };
  return mapa[indicador] || "bg-slate-300";
};

export const indicadorPorStatusDocumento = (status: string) => {
  const mapa: any = {
    concluido: "verde",
    em_andamento: "amarelo",
    nao_elaborado: "vermelho",
    nao_aplicavel: "cinza",
  };
  return mapa[status] || "vermelho";
};

export const corIndicadorDocumento = (status: string) => {
  const mapa: any = {
    concluido: "bg-green-500",
    em_andamento: "bg-yellow-400",
    nao_elaborado: "bg-red-500",
    nao_aplicavel: "bg-slate-300",
  };
  return mapa[status] || "bg-red-500";
};

export const classeStatusDocumento = (status: string) => {
  const mapa: any = {
    concluido: "bg-green-100 text-green-700 border-green-200",
    em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
    nao_elaborado: "bg-red-100 text-red-700 border-red-200",
    nao_aplicavel: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return mapa[status] || "bg-red-100 text-red-700 border-red-200";
};

export const classeStatusCronograma = (status: string) => {
  const mapa: any = {
    concluido: "bg-green-100 text-green-700 border-green-200",
    em_andamento: "bg-amber-100 text-amber-700 border-amber-200",
    nao_iniciado: "bg-blue-50 text-blue-700 border-blue-100",
    atrasado: "bg-red-100 text-red-700 border-red-200",
    cancelado: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return mapa[status] || "bg-blue-50 text-blue-700 border-blue-100";
};

export const labelStatusCronograma = (status: string) => {
  const mapa: any = {
    nao_iniciado: "Não Iniciado",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    atrasado: "Atrasado",
    cancelado: "Cancelado",
  };
  return mapa[status] || status;
};

export const labelStatusObra = (status: string) => {
  const mapa: any = {
    em_andamento: "Em Andamento",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
    paralisada: "Paralisada",
    pausada: "Pausada",
  };
  return mapa[status] || status;
};

export const classeStatusObra = (status: string) => {
  const mapa: any = {
    em_andamento: "bg-blue-50 text-blue-700 border-blue-100",
    finalizada: "bg-green-100 text-green-700 border-green-200",
    cancelada: "bg-red-100 text-red-700 border-red-200",
  };
  return mapa[status] || "bg-slate-100 text-slate-500 border-slate-200";
};

export const formatarTamanhoArquivo = (bytes: any) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return `${valor} B`;
  if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
};

export const normalizarNomeArquivo = (nome: string) => {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
};

export const labelOcorrencia = (tipo: string) => {
  const mapas: any = {
    avanco: "Avanço",
    atraso: "Atraso",
    financeiro: "Financeiro",
  };
  return mapas[tipo] || tipo;
};
