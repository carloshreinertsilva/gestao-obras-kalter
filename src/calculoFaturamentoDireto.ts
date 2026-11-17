// Valor de Faturamento Direto (17/11/2026): textos do envio ao ERP mostrados ao lado do campo no cadastro da obra.
// O robo grava no ERP (cadastro do projeto) so enquanto a chave faturamento_direto_erp_ligado() estiver ligada;
// a situacao vem de obras_valores_venda (gatilho marca 'pendente' quando o admin muda o valor; o robo devolve gravado/erro).

export interface EnvioFaturamentoDireto {
  faturamento_direto_erp_situacao?: string | null;
  faturamento_direto_erp_erro?: string | null;
  faturamento_direto_erp_em?: string | null;
}

export type TomEnvio = "neutro" | "ok" | "erro";

// horario de Brasilia fixo: o banco guarda em UTC e o teste nao pode depender do relogio da maquina
const dataHora = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/** Texto de ajuda do campo. ligado null = ainda nao se sabe (ou a leitura falhou): trata como desligado. */
export function ajudaFaturamentoDireto(ligado: boolean | null): string {
  return ligado
    ? "Valor faturado direto ao cliente por terceiros. Ao salvar, o robô envia o valor ao ERP em alguns minutos."
    : "Valor faturado direto ao cliente por terceiros. Fica registrado aqui. O envio ao ERP ainda está desligado.";
}

/** Situacao do envio ao ERP para mostrar ao lado do campo; null = nada a mostrar (valor nunca alterado no app). */
export function situacaoEnvioFaturamentoDireto(
  envio: EnvioFaturamentoDireto | null | undefined,
  ligado: boolean | null,
): { texto: string; tom: TomEnvio } | null {
  const situacao = envio?.faturamento_direto_erp_situacao;
  const erro = (envio?.faturamento_direto_erp_erro || "").trim();
  if (situacao === "gravado") {
    const quando = dataHora(envio?.faturamento_direto_erp_em);
    return { texto: `Envio ao ERP: gravado${quando ? ` em ${quando}` : ""}.`, tom: "ok" };
  }
  if (situacao === "erro") {
    return { texto: `Envio ao ERP: não gravado${erro ? ` - ${erro}` : "."}`, tom: "erro" };
  }
  if (situacao === "pendente") {
    if (!ligado) return { texto: "Envio ao ERP: pendente (o envio ainda está desligado).", tom: "neutro" };
    return {
      texto: erro ? `Envio ao ERP: pendente, nova tentativa em breve - ${erro}` : "Envio ao ERP: pendente, o robô envia em alguns minutos.",
      tom: "neutro",
    };
  }
  return null;
}
