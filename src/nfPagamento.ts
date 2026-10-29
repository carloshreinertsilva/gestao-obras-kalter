// Forma de pagamento da NF de terceiros (29/10): quem encaminha informa como pagar e o e-mail ao fiscal/financeiro
// leva os dados. Mesmas regras de public.nft_validar_pagamento (o banco confere de novo).

export type FormaPagamento = "boleto" | "pix" | "deposito" | "cartao";

export interface DadosPagamento {
  tipo_chave?: string;
  chave?: string;
  favorecido?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;
  tipo_conta?: string;
  documento?: string;
  cartao?: string;
}

export const FORMAS_PAGAMENTO: { id: FormaPagamento; rotulo: string }[] = [
  { id: "boleto", rotulo: "Boleto" },
  { id: "pix", rotulo: "PIX" },
  { id: "deposito", rotulo: "Depósito" },
  { id: "cartao", rotulo: "Cartão" },
];

export const TIPOS_CHAVE_PIX = ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"];
export const TIPOS_CONTA = ["Corrente", "Poupança"];

const CAMPOS: Record<FormaPagamento, (keyof DadosPagamento)[]> = {
  boleto: [],
  pix: ["tipo_chave", "chave", "favorecido"],
  deposito: ["banco", "agencia", "conta", "digito", "tipo_conta", "favorecido", "documento"],
  cartao: ["cartao"],
};

/** So os campos da forma escolhida, sem espacos sobrando (o que vai para o banco). */
export function limparPagamento(forma: FormaPagamento, dados: DadosPagamento): DadosPagamento {
  const r: DadosPagamento = {};
  for (const k of CAMPOS[forma]) {
    const v = (dados[k] || "").trim();
    if (v) r[k] = v;
  }
  return r;
}

/** Primeiro problema encontrado ("" = ok). */
export function erroPagamento(forma: FormaPagamento | "", dados: DadosPagamento): string {
  if (!forma) return "Informe a forma de pagamento.";
  const d = limparPagamento(forma, dados);
  if (forma === "pix") {
    if (!d.tipo_chave) return "Informe o tipo da chave PIX.";
    if (!d.chave) return "Informe a chave PIX.";
  }
  if (forma === "deposito") {
    if (!d.banco) return "Informe o banco do depósito.";
    if (!d.agencia) return "Informe a agência do depósito.";
    if (!d.conta) return "Informe a conta do depósito.";
    if (!d.digito) return "Informe o dígito da conta.";
  }
  if (forma === "cartao") {
    if (!d.cartao) return "Informe qual cartão foi usado.";
    if (/\d{9,}/.test(d.cartao.replace(/\D/g, ""))) return "Não digite o número do cartão: informe só o nome e o final (ex.: Itaú final 1234).";
  }
  return "";
}

/** Texto curto para a tela de detalhe. */
export function resumoPagamento(forma?: string | null, dados?: DadosPagamento | null): string[] {
  const d = dados || {};
  switch (forma) {
    case "boleto":
      return ["Boleto (anexado com a NF)"];
    case "pix":
      return ["PIX", `Chave (${d.tipo_chave}): ${d.chave}`, ...(d.favorecido ? [`Favorecido: ${d.favorecido}`] : [])];
    case "deposito":
      return [
        "Depósito em conta",
        `Banco ${d.banco} · Agência ${d.agencia} · Conta${d.tipo_conta ? " " + d.tipo_conta.toLowerCase() : ""} ${d.conta}-${d.digito}`,
        ...(d.favorecido || d.documento ? [[d.favorecido, d.documento && `CPF/CNPJ ${d.documento}`].filter(Boolean).join(" · ")] : []),
      ];
    case "cartao":
      return ["Cartão", `Cartão usado: ${d.cartao}`];
    default:
      return [];
  }
}
