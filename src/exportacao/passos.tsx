// Passos "de formulario" do assistente de exportacao: dados do ERP, exportador, importador, condicoes comerciais, embarque e
// certificado de origem. Cada campo grava no processo pelo caminho (ex.: "importador.razao").
import { RefreshCw } from "lucide-react";
import { milhar } from "./numeros";
import type { LinhaErp } from "./processo";
import type { ErpPedido, Processo } from "./tipos";
import { Aviso, Botao, Cartao, CampoProcesso, Secao, Titulo, dataBR, fmtBR } from "./ui";

export interface PropsPasso {
  proc: Processo;
  atualizar: (caminho: string, valor: unknown) => void;
}

const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

const TABELA = "w-full text-sm border-collapse";
const TH = "text-left text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-2 py-1.5 bg-slate-50 border-b";
const TD = "px-2 py-1.5 border-b border-slate-100 align-top";

// ------------------------------------------------------------------------------------------------ 1. Dados do ERP

export function PassoErp({
  proc,
  atualizar,
  erp,
  linha,
  onAtualizarErp,
  atualizandoErp,
}: PropsPasso & { erp: ErpPedido; linha: LinhaErp | null; onAtualizarErp: () => void; atualizandoErp: boolean }) {
  const sit: Record<string, string> = { O: "Orçamento", P: "Pedido aprovado", L: "Liberado", C: "Cancelado", E: "Encerrado" };
  const cfop = String(erp.cfop ?? "");
  return (
    <div className="space-y-4">
      <Titulo
        titulo="Dados do pedido no ERP"
        descricao="Somente consulta. O que estiver errado aqui aparece na Revisão como ajuste no ERP, para pedir ao Carlos Silva."
      />
      {!linha ? (
        <Aviso tom="aviso">O robô ainda não leu o ERP desta obra (até 5 minutos). Os dados aparecem aqui assim que ele ler.</Aviso>
      ) : (
        <Aviso
          tom="info"
          acao={
            <Botao tamanho="pequeno" onClick={onAtualizarErp} desabilitado={atualizandoErp} titulo="Busca de novo o que o robô já leu">
              <RefreshCw size={13} className={atualizandoErp ? "animate-spin" : ""} /> Atualizar
            </Botao>
          }
        >
          Lido do ERP em <b>{dataHora(linha.lido_em)}</b>. O robô confere o ERP a cada 5 minutos.
        </Aviso>
      )}

      {linha && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Cartao rotulo="Pedido" valor={erp.pedido} sub={sit[erp.situacao ?? ""] ?? erp.situacao} />
            <Cartao rotulo="Valor do pedido" valor={`R$ ${fmtBR(erp.valor_brl)}`} sub={`aprovado em ${dataBR(erp.aprovacao) || "-"}`} />
            <Cartao rotulo="CFOP" valor={cfop || "-"} sub={cfop.startsWith("7") ? "exportação" : "não é de exportação"} tom={cfop.startsWith("7") ? "ok" : "aviso"} />
            <Cartao
              rotulo="Cliente no ERP"
              valor={erp.cod_cliente ?? "-"}
              sub={`UF "${erp.cliente_uf || "vazio"}" · ${erp.cliente_pais_erp || "sem país"} (${erp.cliente_cod_pais ?? "-"})`}
              tom={erp.cliente_uf === "EX" ? "normal" : "aviso"}
            />
          </div>

          <Secao titulo="Itens do pedido">
            <div className="overflow-x-auto -mx-1">
              <table className={`${TABELA} min-w-[640px]`}>
                <thead>
                  <tr>
                    <th className={TH}>Seq</th>
                    <th className={TH}>Código</th>
                    <th className={TH}>Descrição</th>
                    <th className={TH}>Tipo</th>
                    <th className={TH}>NCM</th>
                    <th className={`${TH} text-right`}>Qtd</th>
                    <th className={`${TH} text-right`}>Unit. (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {(erp.itens ?? []).map((i) => (
                    <tr key={i.seq}>
                      <td className={TD}>{i.seq}</td>
                      <td className={`${TD} tabular-nums`}>{i.codigo}</td>
                      <td className={TD}>{i.descricao}</td>
                      <td className={TD}>{Number(i.tipo_item) === 9 ? <span className="text-violet-700 font-semibold">Serviço</span> : "Material"}</td>
                      <td className={`${TD} tabular-nums`}>{i.ncm || <span className="text-red-600">sem NCM</span>}</td>
                      <td className={`${TD} text-right tabular-nums`}>{fmtBR(i.qtd, 0)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{fmtBR(i.vlr_unit_brl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <div className="grid md:grid-cols-2 gap-4">
            <Secao titulo="Parcelas (cronograma do pedido)">
              <table className={TABELA}>
                <thead>
                  <tr>
                    <th className={TH}>Seq</th>
                    <th className={TH}>Vencimento</th>
                    <th className={`${TH} text-right`}>Valor (R$)</th>
                    <th className={TH}>Antecipação</th>
                  </tr>
                </thead>
                <tbody>
                  {(erp.parcelas ?? []).map((p) => (
                    <tr key={p.seq}>
                      <td className={TD}>{p.seq}</td>
                      <td className={TD}>{dataBR(p.vencimento)}</td>
                      <td className={`${TD} text-right tabular-nums`}>{fmtBR(p.valor)}</td>
                      <td className={TD}>{Number(p.antecipada) ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                  {!(erp.parcelas ?? []).length && (
                    <tr>
                      <td className={`${TD} text-slate-400`} colSpan={4}>
                        Sem parcelas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Secao>
            <Secao titulo="Romaneios e NFs no ERP">
              <ul className="text-sm space-y-1">
                {(erp.romaneios ?? []).map((r) => (
                  <li key={r.romaneio}>
                    Romaneio <b>{r.romaneio}</b>: {fmtBR(r.volumes, 0)} vol., {milhar(Number(r.peso_liq) || 0, 1)} kg líq., {milhar(Number(r.peso_bruto) || 0, 1)} kg bruto
                  </li>
                ))}
                {!(erp.romaneios ?? []).length && <li className="text-slate-400">Nenhum romaneio.</li>}
                {(erp.nfs ?? []).map((n) => (
                  <li key={`${n.nota}-${n.serie}`}>
                    NF <b>{n.nota}</b>/{n.serie} de {dataBR(n.emissao)}: R$ {fmtBR(n.valor)}
                  </li>
                ))}
                {!(erp.nfs ?? []).length && <li className="text-slate-400">Nenhuma NF emitida.</li>}
              </ul>
            </Secao>
          </div>
        </>
      )}

      <Secao titulo="Documentos" descricao="Número e data da Proforma/Invoice (o mesmo número vale para a Packing List).">
        <div className="grid sm:grid-cols-2 gap-4">
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="documento.numero" rotulo="Nº da Proforma / Invoice" obrigatorio />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="documento.data" rotulo="Data dos documentos" tipo="data" obrigatorio />
        </div>
      </Secao>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 2. Exportador

export function PassoExportador({ proc, atualizar }: PropsPasso) {
  const c = (caminho: string, rotulo: string, extra: Partial<Parameters<typeof CampoProcesso>[0]> = {}) => (
    <CampoProcesso proc={proc} atualizar={atualizar} caminho={`exportador.${caminho}`} rotulo={rotulo} {...extra} />
  );
  return (
    <div className="space-y-4">
      <Titulo titulo="Exportador" descricao="Os dados fixos da Kalter já vêm preenchidos (valem por cima do cadastro da filial no ERP). Complete o que faltar." />
      <Secao titulo="Dados da empresa">
        <div className="grid sm:grid-cols-2 gap-4">
          {c("razao", "Razão social", { className: "sm:col-span-2", obrigatorio: true })}
          {c("cnpj", "CNPJ", { obrigatorio: true })}
          {c("contato", "Contato (nome)")}
          {c("endereco", "Endereço", { className: "sm:col-span-2", obrigatorio: true, dica: "Inclua o número." })}
          {c("cidade", "Cidade", { obrigatorio: true })}
          {c("uf", "UF")}
          {c("cep", "CEP")}
          {c("pais", "País", { obrigatorio: true })}
          {c("fone", "Telefone")}
          {c("email", "E-mail")}
        </div>
      </Secao>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 3. Importador

export function PassoImportador({ proc, atualizar }: PropsPasso) {
  const igual = Boolean(proc.consignatario?.igual_importador);
  const c = (caminho: string, rotulo: string, extra: Partial<Parameters<typeof CampoProcesso>[0]> = {}) => (
    <CampoProcesso proc={proc} atualizar={atualizar} caminho={caminho} rotulo={rotulo} {...extra} />
  );
  return (
    <div className="space-y-4">
      <Titulo titulo="Importador (comprador)" descricao="Confira com o pedido do cliente. O endereço do ERP pode estar incompleto." />
      <Secao titulo="Dados do comprador">
        <div className="grid sm:grid-cols-2 gap-4">
          {c("importador.razao", "Razão social", { className: "sm:col-span-2", obrigatorio: true })}
          {c("importador.id_fiscal", "Identificação fiscal", { dica: "Bolívia: NIT · Paraguai: RUC · Argentina: CUIT" })}
          {c("importador.ped_cliente", "Nº do pedido / ordem de compra do cliente")}
          {c("importador.endereco", "Endereço", { className: "sm:col-span-2", obrigatorio: true })}
          {c("importador.cidade", "Cidade", { obrigatorio: true })}
          {c("importador.pais", "País", { lista: "dl-paises", obrigatorio: true })}
          {c("importador.contato", "Contato")}
          {c("importador.fone", "Telefone")}
          {c("importador.email", "E-mail", { className: "sm:col-span-2" })}
        </div>
      </Secao>
      <Secao titulo="Consignatário (quem recebe)">
        <label className="flex items-center gap-2 text-sm text-slate-700 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={igual}
            onChange={(e) => atualizar("consignatario.igual_importador", e.target.checked)}
            className="h-4 w-4 accent-[#2A6377]"
          />
          O consignatário é o mesmo importador
        </label>
        {!igual && (
          <div className="grid sm:grid-cols-2 gap-4">
            {c("consignatario.razao", "Razão social", { className: "sm:col-span-2", obrigatorio: true })}
            {c("consignatario.endereco", "Endereço", { className: "sm:col-span-2" })}
            {c("consignatario.cidade", "Cidade")}
            {c("consignatario.pais", "País", { lista: "dl-paises" })}
          </div>
        )}
      </Secao>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 4. Condicoes comerciais

const INCOTERMS_ROTULO: [string, string][] = [
  ["EXW", "EXW - na fábrica"],
  ["FCA", "FCA - entregue ao transportador"],
  ["CPT", "CPT - frete pago até"],
  ["CIP", "CIP - frete e seguro pagos até"],
  ["DAP", "DAP - entregue no local"],
  ["DPU", "DPU - entregue descarregado"],
  ["DDP", "DDP - entregue com impostos pagos"],
  ["FOB", "FOB - livre a bordo (marítimo)"],
  ["CFR", "CFR - custo e frete (marítimo)"],
  ["CIF", "CIF - custo, seguro e frete (marítimo)"],
  ["FAS", "FAS - ao lado do navio"],
];

export function PassoComercial({ proc, atualizar }: PropsPasso) {
  const c = (caminho: string, rotulo: string, extra: Partial<Parameters<typeof CampoProcesso>[0]> = {}) => (
    <CampoProcesso proc={proc} atualizar={atualizar} caminho={`comercial.${caminho}`} rotulo={rotulo} {...extra} />
  );
  return (
    <div className="space-y-4">
      <Titulo titulo="Condições comerciais" descricao="Moeda, Incoterm e pagamento valem para a Proforma e a Commercial Invoice." />
      <Secao titulo="Moeda e Incoterm">
        <div className="grid sm:grid-cols-2 gap-4">
          {c("moeda", "Moeda da Invoice", { tipo: "select", opcoes: ["USD", "EUR", "BRL"], obrigatorio: true })}
          {c("taxa_cambio", "Taxa de câmbio (R$ por 1 unidade da moeda)", { tipo: "numero", dica: "Converte os valores do pedido e confere o total." })}
          {c("incoterm", "Incoterm", { tipo: "select", opcoes: INCOTERMS_ROTULO, obrigatorio: true })}
          {c("local_incoterm", "Local do Incoterm", { placeholder: "ex.: Joinville/SC, Brasil", obrigatorio: true })}
          {c("frete", "Frete internacional (na moeda da Invoice)", { tipo: "numero", casas: 2, dica: "Somado ao total (FRETE / SEGURO / TOTAL CIP)." })}
          {c("seguro", "Seguro (na moeda da Invoice)", { tipo: "numero", casas: 2 })}
        </div>
      </Secao>
      <Secao titulo="Pagamento e prazos">
        <div className="grid sm:grid-cols-2 gap-4">
          {c("condicao_pagamento", "Condição de pagamento", {
            tipo: "area",
            className: "sm:col-span-2",
            obrigatorio: true,
            dica: "Sugestão montada pelas parcelas do pedido no ERP.",
          })}
          {c("prazo_entrega", "Prazo de entrega", { placeholder: "ex.: 180 - DAYS AFTER ORDER CONFIRM" })}
          {c("validade_proforma", "Validade da Proforma", { placeholder: "ex.: 30 dias" })}
          {c("banco", "Dados bancários para pagamento (vai na Proforma)", { tipo: "area", linhas: 3, className: "sm:col-span-2", placeholder: "Banco, agência, conta, SWIFT, IBAN, beneficiário" })}
          {c("observacoes", "Observações (vão na Proforma e na Invoice)", { tipo: "area", className: "sm:col-span-2" })}
        </div>
      </Secao>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 5. Embarque

export function PassoEmbarque({ proc, atualizar }: PropsPasso) {
  const c = (caminho: string, rotulo: string, extra: Partial<Parameters<typeof CampoProcesso>[0]> = {}) => (
    <CampoProcesso proc={proc} atualizar={atualizar} caminho={`embarque.${caminho}`} rotulo={rotulo} {...extra} />
  );
  return (
    <div className="space-y-4">
      <Titulo titulo="Embarque" descricao="Transporte, rota e dados do carregamento." />
      <Secao titulo="Transporte">
        <div className="grid sm:grid-cols-2 gap-4">
          {c("modal", "Modal", {
            tipo: "select",
            opcoes: [["RODOVIARIO", "Rodoviário"], ["MARITIMO", "Marítimo"], ["AEREO", "Aéreo"], ["FERROVIARIO", "Ferroviário"]],
            obrigatorio: true,
          })}
          {c("transportadora", "Transportadora")}
          {c("local_embarque", "Porto / local de embarque", { placeholder: "ex.: Joinville, SC", obrigatorio: true })}
          {c("porto_destino", "Porto / local de destino", { placeholder: "ex.: Puerto Suárez - Bolivia", dica: "Vai em PORT OF DESTINATION na Invoice." })}
          {c("fronteira", "Fronteira / porto de saída", { placeholder: "ex.: Corumbá/MS" })}
          {c("destino_final", "Destino final (cidade)", { placeholder: "ex.: Santa Cruz de la Sierra" })}
          {c("pais_destino", "País de destino", { lista: "dl-paises", obrigatorio: true })}
          {c("pais_origem", "País de origem")}
          {c("data_prevista", "Data prevista de embarque", { tipo: "data" })}
        </div>
      </Secao>
      <Secao titulo="Dados do carregamento" descricao="Cabeçalho do romaneio (Packing List). Pode ficar em branco até a saída do caminhão.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="documento.descricao_geral" rotulo="Equipamento (descrição geral)" tipo="area" className="sm:col-span-2 lg:col-span-4" />
          {c("nf", "NF nº")}
          {c("qtd_volumes", "Nº de volumes", { tipo: "numero", casas: 0 })}
          {c("data_saida", "Data de saída da mercadoria", { tipo: "data" })}
          {c("data_romaneio", "Data de emissão do romaneio", { tipo: "data" })}
          {c("placa", "Placa do veículo")}
          {c("motorista", "Motorista")}
          {c("carregamento", "Nº do carregamento")}
        </div>
      </Secao>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ 8. Certificado de origem

export function PassoCertificado({ proc, atualizar }: PropsPasso) {
  const emitir = Boolean(proc.certificado?.emitir);
  const c = (caminho: string, rotulo: string, extra: Partial<Parameters<typeof CampoProcesso>[0]> = {}) => (
    <CampoProcesso proc={proc} atualizar={atualizar} caminho={`certificado.${caminho}`} rotulo={rotulo} {...extra} />
  );
  return (
    <div className="space-y-4">
      <Titulo
        titulo="Certificado de origem (opcional)"
        descricao="Só é preciso quando o cliente vai usar a redução de imposto do acordo comercial. O certificado oficial é emitido pela entidade credenciada (ex.: FIESC); o Excel traz uma aba com os dados para preencher lá."
      />
      <Secao titulo="Certificado">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 cursor-pointer">
          <input type="checkbox" checked={emitir} onChange={(e) => atualizar("certificado.emitir", e.target.checked)} className="h-4 w-4 accent-[#2A6377]" />
          Emitir certificado de origem neste processo
        </label>
        {emitir ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {c("acordo", "Acordo", { lista: "dl-acordos", obrigatorio: true, dica: "Bolívia: ACE 36 · Paraguai/Argentina/Uruguai: ACE 18." })}
            {c("entidade", "Entidade emissora", { lista: "dl-entidades" })}
            {c("criterio_origem", "Critério de origem (padrão para todos os itens)", { obrigatorio: true, dica: "Confirmar com a entidade emissora conforme o acordo." })}
            {c("fatura_comercial", "Nº da fatura comercial (se diferente)")}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Desmarcado: não sai a aba do certificado nem aparece aviso sobre ele.</p>
        )}
      </Secao>
    </div>
  );
}
