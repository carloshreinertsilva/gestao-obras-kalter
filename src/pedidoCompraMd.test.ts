import { describe, expect, it } from "vitest";
import { lerCotacao, valorItem } from "./pedidoCompraMd";

const MD = `# Pedidos de compra — cotação 5 (Proposta 21977 · J7S SINALIZACAO IND. E COM. LTDA) — 2026-11-23 17:03

## Pedidos para processar

\`\`\`
# INTENCAO|D
# PREVISAO_PAGAMENTO|SIM
# CABECALHO: FORNECEDOR|COD_CNDPGTO|COD_TIPO_FRETE|COD_COMPRADOR|VLR_FRETE|VLR_DESCONTO|OBS_EXTERNA
1082|2|2|9|0|0|Validade: 10 dias

# ITENS: FORNECEDOR|SC|MATERIAL|QTDE|UN|PRECO_UNIT|PCT_IPI|PCT_ICMS|PCT_DESC|DATA_ENTREGA|SC_FORNEC_ATUAL|SC_PRECO_ATUAL|SC_PEDIDO_ATUAL
1082|25259|10.250.0166|3|UN|2.73|0|12|0|2026-12-13|1082|1|0
1082|25238|10.250.0295|5|UN|7.4|0|12|0|2026-12-13|1082|1|0
\`\`\`

## Conferência
`;

describe("lerCotacao", () => {
  it("lê cabeçalho, itens e total do MD do Painel", () => {
    const r = lerCotacao(MD);
    expect(r.problemas).toEqual([]);
    expect(r.titulo).toContain("cotação 5");
    expect(r).toMatchObject({ intencao: "D", previsao: true, fornecedores: [1082], condicao: 2, frete: "2", observacao: "Validade: 10 dias" });
    expect(r.itens.map((i) => [i.sc, i.material, i.qtde, i.total])).toEqual([
      [25259, "10.250.0166", 3, 8.19],
      [25238, "10.250.0295", 5, 37],
    ]);
    expect(r.total).toBe(45.19);
  });

  it("arredonda base e IPI separadamente como o ERP", () => {
    expect(valorItem(1, 33.0, 3.25)).toBe(34.07); // 33,00 + 1,0725 -> 1,07
    expect(valorItem(3, 0.335, 0)).toBe(1.01);
  });

  it("aponta os problemas sem quebrar", () => {
    expect(lerCotacao("nada").problemas[0]).toContain("Pedidos para processar");
    const dois = MD.replace("1082|2|2|9|0|0|Validade: 10 dias", "1082|2|2|9|0|0|\n2000|2|2|9|0|0|");
    expect(lerCotacao(dois).problemas).toContain("O arquivo tem 2 fornecedores; cada arquivo deve ter um só.");
    expect(lerCotacao(MD.replace("# INTENCAO|D", "# INTENCAO|A")).problemas[0]).toContain("INTENCAO");
  });
});
