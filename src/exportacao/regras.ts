// Conferencia do processo antes de gerar os documentos. Porte 1:1 de DocumentosExportacao/exportacao/regras.py (mesmas regras,
// mesmos textos, mesma ordem), validado contra o gabarito gerado pelo proprio Python (regras.test.ts).
//
// Cada ajuste tem: nivel ("erro" bloqueia a geracao; "aviso" deixa gerar), onde ("documento" = corrigir na tela; "erp" = corrigir
// no ERP, so pelo Carlos Silva), campo (passo da tela) e texto.
import { arredondar, comSinal, corta, kg, milhar, num, soDigitos, somar, texto } from "./numeros";
import type { Ajuste, ErpPedido, Material, Processo, Revisao } from "./tipos";

export const INCOTERMS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
export const MOEDAS = ["USD", "EUR", "BRL"];
const INCOTERMS_COM_FRETE = ["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const UN_PECA = ["UN", "PC", "PÇ", "PCA", "CJ", "PEC"];
const UN_IGUAIS: Record<string, string[]> = { m: ["M", "MT"], m2: ["M2"], m3: ["M3"], l: ["L", "LT"], par: ["PR", "PAR"], dz: ["DZ"] };

export const UN_NOME: Record<string, string> = {
  kg: "KG - Quilograma",
  un: "UN - Unidade",
  m: "MT - Metro",
  m2: "M2 - Metro quadrado",
  m3: "M3 - Metro cúbico",
  l: "LT - Litro",
  par: "PAR - Par",
  dz: "DZ - Dúzia",
  ton: "TON - Tonelada",
  mil: "MIL - Milheiro",
  ct: "CT - Cento",
  g: "G - Grama",
};

/** Quantidade na unidade estatistica do NCM: [quantidade, automatica], ou [null, false] quando nao da para converter e o
 *  usuario precisa digitar. Um valor digitado em qtd_estat sempre vale. */
export function qtdAduaneira(m: Material): [number | null, boolean] {
  const dig = String(m.qtd_estat ?? "").trim();
  if (dig) return [num(dig), false];
  const ue = (m.un_estat ?? "").toLowerCase();
  const uc = (m.unidade ?? "").toUpperCase();
  const q = num(m.quantidade);
  const pl = num(m.peso_liq);
  if (ue === "kg") return pl > 0 ? [pl, true] : [null, false];
  if (ue === "ton") return pl > 0 ? [pl / 1000, true] : [null, false];
  if (ue === "g") return pl > 0 ? [pl * 1000, true] : [null, false];
  if (ue === "un") {
    if (UN_PECA.includes(uc)) return [q, true];
    if (uc === "CT") return [q * 100, true];
    if (uc === "DZ") return [q * 12, true];
  }
  if (ue === "ct" && uc === "CT") return [q, true];
  if (ue === "mil" && UN_PECA.includes(uc)) return [q / 1000, true];
  if ((UN_IGUAIS[ue] ?? []).includes(uc)) return [q, true];
  return [null, false];
}

/** Certificado de origem e opcional: so quando marcado na tela (rascunhos antigos: quando ja tinham acordo). */
export function emiteCertificado(proc: Processo): boolean {
  const co = proc.certificado ?? {};
  return "emitir" in co ? Boolean(co.emitir) : Boolean(texto(co.acordo));
}

/** Volume cubico da linha da Packing List: dimensoes em mm x quantidade (como no modelo da Kalter) ou o m3 digitado. */
export function m3Material(m: Material): number {
  const c = num(m.comp);
  const l = num(m.larg);
  const a = num(m.alt);
  if (c > 0 && l > 0 && a > 0) return ((c * l * a) / 1e9) * num(m.quantidade);
  return num(m.m3);
}

export function revisar(proc: Processo, erp: ErpPedido, ncmCadastro: Set<string> | null = null): Revisao {
  const aj: Ajuste[] = [];
  const add = (nivel: Ajuste["nivel"], onde: Ajuste["onde"], campo: string, textoAjuste: string) =>
    aj.push({ nivel, onde, campo, texto: textoAjuste });

  // ---- documento
  const d = proc.documento ?? {};
  if (!texto(d.numero)) add("erro", "documento", "documento", "Informe o número da Invoice/Proforma.");
  if (!d.data) add("erro", "documento", "documento", "Informe a data dos documentos.");

  for (const [chave, nome] of [
    ["exportador", "Exportador"],
    ["importador", "Importador"],
  ] as const) {
    const p = proc[chave] ?? {};
    for (const [campo, rot] of [
      ["razao", "razão social"],
      ["endereco", "endereço"],
      ["cidade", "cidade"],
      ["pais", "país"],
    ] as const) {
      if (!texto(p[campo])) add("erro", "documento", chave, `${nome}: falta ${rot}.`);
    }
  }
  if (!texto(proc.exportador?.cnpj)) add("erro", "documento", "exportador", "Exportador: falta o CNPJ.");
  if (!texto(proc.importador?.id_fiscal))
    add("aviso", "documento", "importador", "Importador sem identificação fiscal (NIT, RUC, CUIT, Tax ID). A aduana do destino costuma exigir.");
  const cons = proc.consignatario ?? {};
  if (!cons.igual_importador && !texto(cons.razao))
    add("erro", "documento", "importador", "Consignatário diferente do importador, mas sem razão social.");

  const c = proc.comercial ?? {};
  if (!MOEDAS.includes(c.moeda ?? "")) add("erro", "documento", "comercial", "Escolha a moeda da Invoice.");
  else if (c.moeda === "BRL")
    add("aviso", "documento", "comercial", "Invoice em reais (BRL): o normal é dólar (USD). Confirme com o cliente e o câmbio.");
  if (!INCOTERMS.includes(c.incoterm ?? "")) add("erro", "documento", "comercial", "Escolha o Incoterm.");
  if (!texto(c.local_incoterm))
    add("erro", "documento", "comercial", `Informe o local do Incoterm (ex.: ${c.incoterm || "FCA"} Joinville/SC).`);
  if (!texto(c.condicao_pagamento)) add("erro", "documento", "comercial", "Informe a condição de pagamento.");
  if (c.moeda !== "BRL" && num(c.taxa_cambio) <= 0)
    add("aviso", "documento", "comercial", "Sem taxa de câmbio: não dá para conferir o valor da Invoice com o pedido em reais.");

  const e = proc.embarque ?? {};
  for (const [campo, rot] of [
    ["modal", "modal de transporte"],
    ["local_embarque", "local de embarque"],
    ["pais_destino", "país de destino"],
  ] as const) {
    if (!texto(e[campo])) add("erro", "documento", "embarque", `Embarque: falta ${rot}.`);
  }
  if (e.modal === "RODOVIARIO" && !texto(e.fronteira))
    add("aviso", "documento", "embarque", "Rodoviário: informe a fronteira de saída (ex.: Corumbá/MS).");
  if (!texto(e.porto_destino))
    add("aviso", "documento", "embarque", "Informe o porto/local de destino (vai em PORT OF DESTINATION na Invoice).");

  // ---- itens
  const itens = proc.itens ?? [];
  if (!itens.length) add("erro", "documento", "itens", "Nenhum item na Invoice.");
  let total = 0;
  let plItens = 0;
  let pbItens = 0;
  itens.forEach((i, idx) => {
    const n = idx + 1;
    const rot = `Item ${n} (${corta(i.descricao ? String(i.descricao) : "", 30)})`;
    if (!texto(i.descricao)) add("erro", "documento", "itens", `Item ${n}: falta a descrição.`);
    if (!texto(i.descricao_en)) add("aviso", "documento", "itens", `${rot}: sem descrição em inglês/espanhol (vai só em português).`);
    const ncm = soDigitos(i.ncm);
    if (ncm.length !== 8) add("erro", "documento", "itens", `${rot}: NCM precisa ter 8 dígitos.`);
    else if (ncmCadastro !== null && !ncmCadastro.has(ncm))
      add("aviso", "documento", "itens", `${rot}: NCM ${i.ncm} não existe no cadastro fiscal do ERP. Confira com o despachante.`);
    const q = num(i.quantidade);
    const vu = num(i.valor_unit);
    if (q <= 0) add("erro", "documento", "itens", `${rot}: quantidade zerada.`);
    if (vu <= 0) add("erro", "documento", "itens", `${rot}: valor unitário na moeda da Invoice zerado.`);
    // pesos por item da Invoice: opcionais (os totais vem da Packing List); o Certificado de Origem usa
    const pl = num(i.peso_liq);
    const pb = num(i.peso_bruto);
    if (pl > pb && pb > 0) add("erro", "documento", "itens", `${rot}: peso líquido maior que o bruto.`);
    total += q * vu;
    plItens += pl;
    pbItens += pb;
  });
  if (num(c.frete) < 0 || num(c.seguro) < 0) add("erro", "documento", "comercial", "Frete e seguro não podem ser negativos.");
  if (INCOTERMS_COM_FRETE.includes(c.incoterm ?? "") && num(c.frete) <= 0)
    add("aviso", "documento", "comercial", `Incoterm ${c.incoterm} inclui o frete, mas o frete está zerado.`);
  if (["CIF", "CIP"].includes(c.incoterm ?? "") && num(c.seguro) <= 0)
    add("aviso", "documento", "comercial", `Incoterm ${c.incoterm} inclui o seguro, mas o seguro está zerado.`);

  // ---- Packing List = materiais do gerenciador de SMA do centro de custo
  const pk = proc.packing ?? { materiais: [] };
  const mats = (pk.materiais ?? []).filter((m) => num(m.quantidade) > 0);
  const plMat = somar(mats.map((m) => num(m.peso_liq)));
  const pbMat = somar(mats.map((m) => num(m.peso_bruto)));
  const m3Mat = somar(mats.map((m) => m3Material(m)));

  const lista = (ms: Material[]) => ms.slice(0, 6).map((m) => m.codigo || "?").join(", ") + (ms.length > 6 ? ` e mais ${ms.length - 6}` : "");

  if (!mats.length) {
    add("erro", "documento", "volumes", `Lista de materiais da SMA do centro de custo ${pk.cc ?? ""} vazia: a Packing List sai sem materiais.`);
  } else {
    const falta = mats.filter((m) => num(m.qtd_atend) < num(m.quantidade));
    if (falta.length)
      add(
        "aviso",
        "documento",
        "volumes",
        `${falta.length} de ${mats.length} materiais da SMA ainda não foram atendidos por completo pelo almoxarifado (quantidade atendida menor que a embarcada).`,
      );
    const condicoes: [(m: Material) => boolean, string][] = [
      [(m) => soDigitos(m.ncm).length !== 8, "sem NCM no cadastro do ERP"],
      [
        (m) => !texto(m.un_estat),
        "sem unidade aduaneira (o NCM não tem unidade estatística no cadastro fiscal do ERP): escolha na coluna Unid. aduaneira",
      ],
      [
        (m) => Boolean(texto(m.un_estat)) && qtdAduaneira(m)[0] === null,
        "sem quantidade na unidade aduaneira (não dá para converter da unidade do material): digite",
      ],
      [(m) => num(m.peso_liq) <= 0, "sem peso líquido"],
      [(m) => num(m.peso_bruto) <= 0, "sem peso bruto"],
      [(m) => num(m.peso_bruto) > 0 && num(m.peso_liq) > num(m.peso_bruto), "com peso líquido maior que o bruto"],
      [(m) => m3Material(m) <= 0, "sem volume cúbico (informe as dimensões em mm ou o m³)"],
    ];
    for (const [cond, txt] of condicoes) {
      const ms = mats.filter(cond);
      if (ms.length) add("erro", "documento", "volumes", `Packing List: ${ms.length} de ${mats.length} materiais ${txt} (${lista(ms)}).`);
    }
    const semVolume = mats.filter((m) => !texto(m.tipo_volume));
    if (semVolume.length)
      add(
        "aviso",
        "documento",
        "volumes",
        `Packing List: ${semVolume.length} de ${mats.length} materiais sem tipo de volume (caixa de madeira, avulso, bobina...) (${lista(semVolume)}).`,
      );
    for (const [campos, txt] of [
      [["peso_liq"], "com peso líquido estimado"],
      [["peso_bruto"], "com peso bruto estimado"],
      [["comp", "larg", "alt"], "com medidas estimadas"],
      [["un_estat"], "com unidade aduaneira sugerida (kg)"],
    ] as const) {
      const ms = mats.filter((m) => campos.some((k) => (m.estimado ?? []).includes(k)));
      if (ms.length)
        add(
          "aviso",
          "documento",
          "volumes",
          `Packing List: ${ms.length} de ${mats.length} materiais ${txt} (em azul na tela e na pré-visualização): confira e clique em Aceitar ou corrija (${lista(ms)}).`,
        );
    }
    const divergentes = mats.filter((m) => m.peso_divergente);
    if (divergentes.length)
      add(
        "aviso",
        "erp",
        "erp",
        "Peso unitário do cadastro do ERP parece errado (muito diferente do catálogo do fabricante): " +
          divergentes
            .slice(0, 8)
            .map((m) => `${m.codigo} ${kg(m.peso_un)} kg no ERP, catálogo ≈ ${kg(m.peso_divergente)} kg`)
            .join("; ") +
          (divergentes.length > 8 ? ` e mais ${divergentes.length - 8}` : "") +
          ". A Packing List usa o do ERP; ajuste na tela se for o caso.",
      );
    if (plItens > 0 && Math.abs(plMat - plItens) > 0.01)
      add(
        "aviso",
        "documento",
        "itens",
        `Peso líquido da Packing List (${milhar(plMat, 2)} kg) diferente da soma dos itens da Invoice (${milhar(plItens, 2)} kg).`,
      );
    if (pbItens > 0 && pbMat > 0 && Math.abs(pbMat - pbItens) > 0.01)
      add(
        "aviso",
        "documento",
        "itens",
        `Peso bruto da Packing List (${milhar(pbMat, 2)} kg) diferente da soma dos itens da Invoice (${milhar(pbItens, 2)} kg).`,
      );
    const fams = new Set(mats.map((m) => (m.familia ?? "").split(".").pop()));
    const obra = String(pk.cc || erp.pedido || "");
    for (const i of erp.itens ?? []) {
      const g = /^(\d+)\.(\d{3})\.(\d+)$/.exec(i.codigo ?? "");
      if (Number(i.tipo_item) !== 9 && g && g[3] === obra && !fams.has(g[2]))
        add(
          "aviso",
          "documento",
          "volumes",
          `Item do pedido ${i.codigo} (${i.descricao}) é da família ${obra}.${g[2]}, que não tem material em SMA: ele não aparece na Packing List.`,
        );
    }
  }

  // ---- cabecalho do romaneio (Packing List)
  if (num(e.qtd_volumes) <= 0)
    add("aviso", "documento", "volumes", "Packing List: informe o nº de volumes (vai no cabeçalho do romaneio e na DU-E).");
  for (const [campo, rot] of [
    ["nf", "nº da NF"],
    ["transportadora", "transportadora"],
    ["data_saida", "data de saída"],
  ] as const) {
    if (!String(e[campo] || "").trim()) add("aviso", "documento", "volumes", `Packing List: falta ${rot} no cabeçalho do romaneio.`);
  }

  // ---- certificado de origem
  const co = proc.certificado ?? {};
  if (emiteCertificado(proc)) {
    if (!texto(co.acordo)) add("erro", "documento", "certificado", "Certificado de origem: escolha o acordo (ex.: ACE 36 Mercosul / Bolívia).");
    if (!texto(co.criterio_origem))
      add("erro", "documento", "certificado", "Certificado de origem: informe o critério de origem (confirmar com a entidade emissora).");
    if (itens.some((i) => num(i.peso_liq) <= 0))
      add("aviso", "documento", "itens", "Certificado de origem: informe o peso líquido de cada item da Invoice.");
  }

  // ---- comparacao com o pedido do ERP
  let taxa = num(c.taxa_cambio);
  const brl = num(erp.valor_brl);
  if (c.moeda === "BRL") taxa = 1.0;
  if (taxa > 0 && brl > 0 && total > 0) {
    const conv = total * taxa;
    if (Math.abs(conv - brl) / brl > 0.01)
      add(
        "aviso",
        "documento",
        "itens",
        `Total da Invoice × câmbio = R$ ${milhar(conv, 2)}, mas o pedido no ERP é R$ ${milhar(brl, 2)} (diferença de ${comSinal((100 * (conv - brl)) / brl, 1)}%).`,
      );
  }

  // ---- ERP (so o Carlos Silva altera)
  const cfop = Math.trunc(num(erp.cfop));
  if (cfop && !String(cfop).startsWith("7"))
    add(
      "aviso",
      "erp",
      "erp",
      `Pedido ${erp.pedido} está com CFOP ${cfop} (operação no Brasil). Exportação usa 7101 (produção própria) ou 7102 (revenda). A NF de exportação depende disso.`,
    );
  if ((erp.cliente_uf || "") !== "EX")
    add("aviso", "erp", "erp", `Cliente ${erp.cod_cliente} sem UF 'EX' no cadastro (está '${erp.cliente_uf || "vazio"}').`);
  const paisDoc = texto(proc.importador?.pais).toUpperCase();
  const paisErp = texto(erp.cliente_pais_erp).toUpperCase();
  if (paisDoc && paisErp && paisDoc.slice(0, 4) !== paisErp.slice(0, 4))
    add(
      "aviso",
      "erp",
      "erp",
      `País do cliente no ERP é '${erp.cliente_pais_erp}' (código ${erp.cliente_cod_pais}), mas nos documentos é '${paisDoc}'.`,
    );
  for (const i of erp.itens ?? []) {
    if (Number(i.tipo_item) === 9)
      add(
        "aviso",
        "erp",
        "erp",
        `Item ${i.seq} do pedido (${i.codigo} ${i.descricao}) é SERVIÇO no ERP (tipo 9). Para exportar mercadoria, o pedido precisa do material com NCM.`,
      );
    else if (!i.ncm) add("aviso", "erp", "erp", `Material ${i.codigo} sem NCM no cadastro do ERP.`);
  }
  if (!(erp.romaneios ?? []).length)
    add("aviso", "erp", "erp", "Pedido sem romaneio no ERP: pesos e volumes da Packing List vêm só do que foi digitado.");

  const frete = num(c.frete);
  const seguro = num(c.seguro);
  // pesos e m3 dos documentos = Packing List (lista da SMA); sem lista, a soma dos itens da Invoice
  return {
    ajustes: aj,
    bloqueado: aj.some((a) => a.nivel === "erro"),
    totais: {
      valor: arredondar(total, 2),
      frete,
      seguro,
      valor_total: arredondar(total + frete + seguro, 2),
      peso_liq: arredondar(mats.length ? plMat : plItens, 3),
      peso_bruto: arredondar(mats.length ? pbMat : pbItens, 3),
      m3: arredondar(m3Mat, 3),
      volumes: Math.trunc(num(e.qtd_volumes)),
      materiais: mats.length,
    },
  };
}
