// Regras puras do cadastro de obra ligadas ao ERP (Pacote 4):
// - C4: projeto do ERP sem obra no app (tabela projetos_erp, gravada pelo robo) -> campos do formulario de obra nova;
//   "Preencher com os dados do ERP" so preenche os vazios e devolve as diferencas dos ja digitados para perguntar.
//   Valores de venda ficam em projetos_erp_valores (17/11: so admin/coordenador leem); sem linha = sem acesso = null,
//   e null nunca vira R$ 0,00 nem preenche o formulario.
// - C9: resumo do que vai ser gravado no ERP (margem, rentabilidade, faturamento sem impostos) antes de enviar.

export interface ProjetoErp {
  codigo: string;
  nome: string;
  pedido_venda: number | null;
  situacao_pedido: string | null;
  cliente_nome: string | null;
  cidade: string | null;
  uf: string | null;
  // null = sem acesso ao valor (projetos_erp_valores)
  valor_produto: number | string | null;
  valor_servico: number | string | null;
  data_pedido: string | null;
  data_aprovacao: string | null;
  data_entrega_prevista: string | null;
}

// campos do formulario de obra que o ERP sabe preencher (mesmos nomes do estado novaObra da tela)
export type CampoPreenchivel = "nome" | "descricao" | "data_inicio" | "data_previsao_fim" | "valor_produto" | "valor_servico";

export const ROTULO_CAMPO: Record<CampoPreenchivel, string> = {
  nome: "Nome",
  descricao: "Descrição da obra",
  data_inicio: "Início",
  data_previsao_fim: "Prazo de entrega",
  valor_produto: "Materiais",
  valor_servico: "Serviço",
};

export const COLUNAS_PROJETO_ERP =
  "codigo, nome, pedido_venda, situacao_pedido, cliente_nome, cidade, uf, data_pedido, data_aprovacao, data_entrega_prevista";

export interface LinhaValoresProjetoErp {
  codigo: string;
  valor_produto: number | string | null;
  valor_servico: number | string | null;
}

/** Junta os valores (tabela restrita) aos projetos pelo codigo; projeto sem linha = sem acesso = valores null. */
export function anexarValoresProjetos<T extends { codigo: string }>(
  projetos: T[],
  valores: LinhaValoresProjetoErp[],
): (T & { valor_produto: number | string | null; valor_servico: number | string | null })[] {
  const porCodigo = new Map(valores.map((v) => [v.codigo, v]));
  return projetos.map((p) => {
    const v = porCodigo.get(p.codigo);
    return { ...p, valor_produto: v ? v.valor_produto : null, valor_servico: v ? v.valor_servico : null };
  });
}

/** Venda total do projeto; null = sem acesso aos valores. */
export function totalProjetoErp(p: Pick<ProjetoErp, "valor_produto" | "valor_servico">): number | null {
  if (p.valor_produto == null && p.valor_servico == null) return null;
  return Number(p.valor_produto || 0) + Number(p.valor_servico || 0);
}

/** Codigo como o ERP guarda: sem espacos (o robo grava o codigo "trim"). */
export const normalizarCodigoErp = (texto: string | null | undefined) => String(texto ?? "").trim();

/** "Cidade/UF" do cliente (ou so um dos dois, ou vazio). */
export function localDoCliente(p: Pick<ProjetoErp, "cidade" | "uf">): string {
  return [p.cidade, p.uf].filter(Boolean).join("/");
}

// valor em reais do banco (numeric chega como texto ou numero) -> texto "1234.5" como o formulario guarda
function reais(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return isFinite(n) && n !== 0 ? String(Math.round(n * 100) / 100) : "";
}

/** Valores do formulario vindos do projeto do ERP (vazio = o ERP nao tem o dado; nao sobrescreve nada). */
export function camposDoProjeto(p: ProjetoErp): Record<CampoPreenchivel, string> {
  const cliente = [p.cliente_nome, localDoCliente(p)].filter(Boolean).join(" - ");
  const descricao = [cliente && `Cliente: ${cliente}`, p.pedido_venda ? `Pedido de venda ${p.pedido_venda}` : ""].filter(Boolean).join(" · ");
  return {
    nome: (p.nome || "").trim(),
    descricao,
    // inicio: primeira aprovacao do pedido; sem ela, o cadastro do pedido
    data_inicio: p.data_aprovacao || p.data_pedido || "",
    data_previsao_fim: p.data_entrega_prevista || "",
    valor_produto: reais(p.valor_produto),
    valor_servico: reais(p.valor_servico),
  };
}

export interface Diferenca {
  campo: CampoPreenchivel;
  rotulo: string;
  digitado: string;
  erp: string;
}

// compara do jeito que o campo e: valor por numero (1234.5 == 1234.50), texto sem espacos nas pontas
function iguais(campo: CampoPreenchivel, a: string, b: string): boolean {
  if (campo === "valor_produto" || campo === "valor_servico") return Number(a || 0) === Number(b || 0);
  return a.trim() === b.trim();
}

const vazio = (campo: CampoPreenchivel, v: unknown) =>
  v === null || v === undefined || String(v).trim() === "" || ((campo === "valor_produto" || campo === "valor_servico") && Number(v) === 0);

/**
 * Plano do "Preencher com os dados do ERP": `preencher` = campos vazios no formulario que o ERP tem;
 * `diferencas` = campos ja digitados com valor diferente do ERP (a tela pergunta antes de trocar).
 */
export function planejarPreenchimento(
  formulario: Partial<Record<CampoPreenchivel, unknown>>,
  p: ProjetoErp,
): { preencher: Partial<Record<CampoPreenchivel, string>>; diferencas: Diferenca[] } {
  const doErp = camposDoProjeto(p);
  const preencher: Partial<Record<CampoPreenchivel, string>> = {};
  const diferencas: Diferenca[] = [];
  (Object.keys(doErp) as CampoPreenchivel[]).forEach((campo) => {
    const erp = doErp[campo];
    if (!erp) return;
    const atual = formulario[campo];
    if (vazio(campo, atual)) preencher[campo] = erp;
    else if (!iguais(campo, String(atual), erp)) diferencas.push({ campo, rotulo: ROTULO_CAMPO[campo], digitado: String(atual), erp });
  });
  return { preencher, diferencas };
}

// ---- C9: confirmacao antes de mandar os valores do orcamento para o ERP

export type ChaveValorErp = "venda" | "contribuicao" | "rentabilidade";

export const ROTULO_VALOR_ERP: Record<ChaveValorErp, string> = {
  venda: "Faturamento sem impostos",
  contribuicao: "Margem de contribuição",
  rentabilidade: "Rentabilidade",
};

export interface LinhaResumoErp {
  chave: ChaveValorErp;
  rotulo: string;
  atual: number | null; // null = nao conhecido no app (ainda nao veio do ERP)
  novo: number;
  muda: boolean;
}

/** Linhas "campo: valor atual no ERP -> valor novo" na ordem da tela (todas: o robo grava os tres juntos). */
export function resumoGravacaoErp(
  originais: Record<ChaveValorErp, string>,
  novos: Record<ChaveValorErp, string>,
): LinhaResumoErp[] {
  return (["venda", "contribuicao", "rentabilidade"] as const).map((chave) => {
    const atual = originais[chave] === "" ? null : Number(originais[chave]);
    const novo = Number(novos[chave] || 0);
    return { chave, rotulo: ROTULO_VALOR_ERP[chave], atual, novo, muda: atual === null || atual !== novo };
  });
}
