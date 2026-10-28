// Passo 10: pre-visualizacao e aprovacao. Mostra os documentos (Proforma, Commercial Invoice, Packing List e, se marcado, o
// Certificado de Origem) como vao sair; o que falta aparece como FALTA (vermelho) e o que e estimativa, em azul. O Excel final
// (rascunho ou definitivo) e gerado pelo robo a partir dos mesmos dados.
import { useState, type ReactNode } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { milhar, num } from "./numeros";
import { UN_NOME, emiteCertificado, m3Material, qtdAduaneira } from "./regras";
import type { Aprovacao, DocumentoLista, Material, Processo, Revisao } from "./tipos";
import { Aviso, Botao, Cartao, Titulo, classeEstimado, dataBR } from "./ui";

const MODAL_PT: Record<string, string> = { RODOVIARIO: "RODOVIÁRIO", MARITIMO: "MARÍTIMO", AEREO: "AÉREO", FERROVIARIO: "FERROVIÁRIO" };
const MODAL_EN: Record<string, string> = { RODOVIARIO: "Road / Carretera", MARITIMO: "Sea / Marítimo", AEREO: "Air / Aéreo", FERROVIARIO: "Rail / Ferroviario" };
const INCOTERM_FRETE = ["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const vazio = (v: unknown) => v === undefined || v === null || ["", "0", "0.0"].includes(String(v).trim());
const n2 = (v: number) => milhar(v, 2).replace(/,/g, "§").replace(/\./g, ",").replace(/§/g, ".");
const n3 = (v: number) => milhar(v, 3).replace(/,/g, "§").replace(/\./g, ",").replace(/§/g, ".");

function Falta() {
  return <span className="inline-block px-1.5 rounded bg-red-100 text-red-700 text-[11px] font-bold">FALTA</span>;
}
/** Valor de campo obrigatorio: vazio vira FALTA. */
const Obrig = ({ v, texto }: { v: unknown; texto?: ReactNode }) => (vazio(v) ? <Falta /> : <>{texto ?? String(v)}</>);

const CAB = "bg-[#1F3864] text-white text-[11px] font-bold px-1.5 py-1 text-center border border-slate-400";
const ROT = "bg-slate-100 text-[10px] font-bold text-slate-600 px-1.5 py-1 border border-slate-400";
const CEL = "px-1.5 py-1 border border-slate-400 align-top text-[12px]";

// ------------------------------------------------------------------------------------------------ contagem de "FALTA"

export function contarFaltas(proc: Processo, revisao: Revisao): { proforma: number; invoice: number; packing: number } {
  const e = proc.embarque ?? {};
  const t = revisao.totais;
  const fatura =
    [proc.documento?.numero, proc.documento?.data, e.local_embarque, e.porto_destino, e.modal, proc.comercial?.condicao_pagamento, proc.comercial?.prazo_entrega, t.peso_bruto, t.peso_liq, t.m3].filter(vazio).length +
    (proc.itens ?? []).reduce((s, i) => s + (vazio(i.ncm) ? 1 : 0) + (vazio(i.valor_unit) ? 1 : 0), 0);
  const mats = (proc.packing?.materiais ?? []).filter((m) => num(m.quantidade) > 0);
  const packing =
    [e.nf, e.transportadora, e.data_saida, t.volumes, t.peso_bruto, t.peso_liq, t.m3].filter(vazio).length +
    mats.reduce((s, m) => {
      const [qe] = qtdAduaneira(m);
      return s + [m.ncm, m.un_estat, qe, m3Material(m), num(m.peso_liq), num(m.peso_bruto)].filter(vazio).length;
    }, 0);
  return { proforma: fatura, invoice: fatura, packing };
}

// ------------------------------------------------------------------------------------------------ documentos

function Papel({ children }: { children: ReactNode }) {
  return <div className="bg-white border border-slate-300 shadow-md mx-auto w-full max-w-[860px] p-5 text-slate-900 overflow-x-auto">{children}</div>;
}

const parteTexto = (p: { razao?: string; id_fiscal?: string; endereco?: string; cidade?: string; pais?: string }) =>
  [p.razao, p.id_fiscal ? `NIT / Tax ID: ${p.id_fiscal}` : "", [p.endereco, p.cidade].filter(Boolean).join(", "), p.pais].filter(Boolean).join("\n");

function Fatura({ proc, revisao, proforma }: { proc: Processo; revisao: Revisao; proforma: boolean }) {
  const nome = proforma ? "PROFORMA INVOICE" : "COMMERCIAL INVOICE";
  const c = proc.comercial ?? {};
  const e = proc.embarque ?? {};
  const d = proc.documento ?? {};
  const exp = proc.exportador ?? {};
  const t = revisao.totais;
  const moeda = c.moeda || "USD";
  const cons = proc.consignatario ?? {};
  const notify = cons.igual_importador ? parteTexto(proc.importador ?? {}) : parteTexto(cons);
  const itens = proc.itens ?? [];
  const sub = itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unit), 0);
  const extras: [string, number][] = [];
  if (num(c.frete) || INCOTERM_FRETE.includes(c.incoterm ?? "")) extras.push(["FRETE", num(c.frete)]);
  if (num(c.seguro) || ["CIF", "CIP"].includes(c.incoterm ?? "")) extras.push(["SEGURO", num(c.seguro)]);
  const local = (c.local_incoterm ?? "").trim();
  const obs = [c.observacoes, c.banco].filter(Boolean).join("\n");
  return (
    <Papel>
      <p className="text-center text-xl font-bold text-[#1F3864]">{nome}</p>
      <p className="text-center text-[11px] mt-2 whitespace-pre-line">
        {[exp.razao, exp.endereco, exp.cep ? `CEP ${exp.cep}` : "", exp.cidade, exp.uf, "Brasil"].filter(Boolean).join("  -  ")}
        {"\n"}
        {[exp.cnpj ? `CNPJ ${exp.cnpj}` : "", exp.fone ? `Fone ${exp.fone}` : "", exp.email ? `E-mail  ${exp.email}` : ""].filter(Boolean).join("  -  ")}
      </p>
      <div className="text-right text-[12px] mt-2">
        <p>
          <b>{nome}:</b> <b><Obrig v={d.numero} /></b>
        </p>
        <p>
          <b>Data:</b> <Obrig v={d.data} texto={dataBR(d.data)} />
        </p>
      </div>
      <table className="w-full border-collapse mt-2 min-w-[640px]">
        <tbody>
          <tr>
            <td className={ROT} colSpan={2}>CUSTOMER / CLIENTE:</td>
            <td className={ROT} colSpan={2}>NOTIFY / NOTIFICAR:</td>
            <td className={ROT}>PORT OF LOADING / PORTO DE EMBARQUE:</td>
            <td className={CEL}><Obrig v={e.local_embarque} /></td>
          </tr>
          <tr>
            <td className={`${CEL} whitespace-pre-line`} colSpan={2} rowSpan={2}>{parteTexto(proc.importador ?? {})}</td>
            <td className={`${CEL} whitespace-pre-line`} colSpan={2} rowSpan={2}>{notify}</td>
            <td className={ROT}>PORT OF DESTINATION / PORTO DE DESTINO:</td>
            <td className={CEL}><Obrig v={e.porto_destino} /></td>
          </tr>
          <tr>
            <td className={ROT}>TRANSPORT:</td>
            <td className={CEL}><Obrig v={e.modal} texto={MODAL_PT[e.modal ?? ""] ?? e.modal} /></td>
          </tr>
          <tr>
            <td className={ROT} colSpan={2}>PAYMENT CONDITIONS / CONDICIONES DE PAGO:</td>
            <td className={CEL} colSpan={2}><Obrig v={c.condicao_pagamento} /></td>
            <td className={ROT}>VALIDITY / VALIDEZ:</td>
            <td className={CEL}>{c.validade_proforma}</td>
          </tr>
          <tr>
            <td className={ROT} colSpan={2}>DELIVERY TIME / PRAZO DE ENTREGA:</td>
            <td className={CEL} colSpan={4}><Obrig v={c.prazo_entrega} /></td>
          </tr>
          <tr>
            <td className={ROT} colSpan={2}>GROSS WEIGHT (PESO BRUTO): (kg)</td>
            <td className={ROT} colSpan={2}>NET WEIGHT (PESO NETO): (kg)</td>
            <td className={ROT} colSpan={2}>CUBIC METERS (TOTAL M3):</td>
          </tr>
          <tr>
            <td className={`${CEL} text-center font-bold`} colSpan={2}><Obrig v={t.peso_bruto} texto={n2(t.peso_bruto)} /></td>
            <td className={`${CEL} text-center font-bold`} colSpan={2}><Obrig v={t.peso_liq} texto={n2(t.peso_liq)} /></td>
            <td className={`${CEL} text-center font-bold`} colSpan={2}><Obrig v={t.m3} texto={n2(t.m3)} /></td>
          </tr>
          <tr>
            <td className={ROT} colSpan={2}>OBS:</td>
            <td className={`${CEL} whitespace-pre-line`} colSpan={4}>{obs}</td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse mt-3 min-w-[640px]">
        <thead>
          <tr>
            <th className={CAB}>CODIGO</th>
            <th className={CAB}>NCM / NALADI</th>
            <th className={CAB}>QTITY<br />CANT (UN)</th>
            <th className={CAB}>DESCRIPTION OF GOODS<br />DESCRICIÓN DE PRODUCTOS</th>
            <th className={CAB}>UN. PRICE<br />PRECIO UN.</th>
            <th className={CAB}>TOTAL<br />{moeda}</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i, k) => (
            <tr key={k}>
              <td className={CEL}>{i.codigo_invoice || (i.codigo ?? "").replace(/\D/g, "")}</td>
              <td className={CEL}><Obrig v={i.ncm} /></td>
              <td className={`${CEL} text-center`}>{num(i.quantidade)}</td>
              <td className={CEL}>{(i.descricao_en ?? "").trim() || i.descricao}</td>
              <td className={`${CEL} text-right`}><Obrig v={i.valor_unit} texto={n2(num(i.valor_unit))} /></td>
              <td className={`${CEL} text-right`}>{n2(num(i.quantidade) * num(i.valor_unit))}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={CEL} />
            <td className={`${CEL} text-center`}>TOTAL</td>
            <td className={`${CEL} text-center`}>{itens.reduce((s, i) => s + num(i.quantidade), 0)}</td>
            <td className={`${CEL} text-right`}>SUB-TOTAL</td>
            <td className={`${CEL} text-center`}>{moeda}</td>
            <td className={`${CEL} text-right`}>{n2(sub)}</td>
          </tr>
          {extras.map(([rot, v]) => (
            <tr key={rot}>
              <td className={CEL} colSpan={3} />
              <td className={`${CEL} text-right font-bold`}>{rot}</td>
              <td className={`${CEL} text-center`}>{moeda}</td>
              <td className={`${CEL} text-right`}>{n2(v)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-slate-100">
            <td className={CEL} colSpan={3} />
            <td className={`${CEL} text-right`}>
              TOTAL {c.incoterm}
              {local ? ` - ${local.toUpperCase()}` : ""}
            </td>
            <td className={`${CEL} text-center`}>{moeda}</td>
            <td className={`${CEL} text-right`}>{n2(sub + extras.reduce((s, [, v]) => s + v, 0))}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-center text-[11px] mt-8 border-t border-slate-400 w-1/2 ml-auto pt-1 whitespace-pre-line">
        {exp.razao}
        {"\n"}
        {exp.cidade}, {dataBR(d.data)}
      </p>
    </Papel>
  );
}

function Packing({ proc, revisao }: { proc: Processo; revisao: Revisao }) {
  const e = proc.embarque ?? {};
  const d = proc.documento ?? {};
  const t = revisao.totais;
  const mats = (proc.packing?.materiais ?? []).filter((m) => num(m.quantidade) > 0);
  // totais da linha final: soma simples, como no Excel gerado (documentos.py)
  const tl = mats.reduce((s, m) => s + num(m.peso_liq), 0);
  const tb = mats.reduce((s, m) => s + num(m.peso_bruto), 0);
  const tm = mats.reduce((s, m) => s + m3Material(m), 0);
  const grupos: { familia: string; titulo: string; itens: Material[] }[] = [];
  for (const m of mats) {
    const fam = m.familia ?? "";
    if (!grupos.length || grupos[grupos.length - 1].familia !== fam) grupos.push({ familia: fam, titulo: m.familia_desc || fam, itens: [] });
    grupos[grupos.length - 1].itens.push(m);
  }
  const cab: [string, ReactNode, string, ReactNode, string][] = [
    ["TRANSPORTADORA:", <Obrig key="a" v={e.transportadora} />, "DATA DE SAÍDA DA MERCADORIA:", <Obrig key="b" v={e.data_saida} texto={dataBR(e.data_saida)} />, ""],
    ["PLACA VEÍCULO:", e.placa, "N° VOLUMES:", <Obrig key="c" v={t.volumes} />, "vol"],
    ["MOTORISTA:", e.motorista, "PESO BRUTO:", <Obrig key="d" v={t.peso_bruto} texto={n2(t.peso_bruto)} />, "kg"],
    ["DATA EMISSÃO ROMANEIO:", dataBR(e.data_romaneio), "PESO LÍQUIDO:", <Obrig key="e" v={t.peso_liq} texto={n2(t.peso_liq)} />, "kg"],
    ["N° CARREGAMENTO:", e.carregamento, "QTDE M³:", <Obrig key="f" v={t.m3} texto={n2(t.m3)} />, "m³"],
  ];
  return (
    <Papel>
      <div className="flex justify-between items-start">
        <p className="text-xl font-bold text-[#1F3864]">ROMANEIO GLOBAL</p>
        <div className="text-[12px] text-right">
          <p><b>N°</b> {proc.pedido}</p>
          <p><b>TIPO</b> Registro</p>
        </div>
      </div>
      <div className="flex justify-between items-baseline mt-2">
        <p className="text-lg font-bold text-[#1F3864]">PACKING LIST</p>
        <p className="text-base font-bold">GLOBAL PEDIDO {proc.pedido}</p>
      </div>
      <div className="text-[12px] mt-3 space-y-0.5">
        <p><b>EXPORTADOR:</b> {proc.exportador?.razao}</p>
        <p><b>IMPORTADOR:</b> {proc.importador?.razao}</p>
        <p className="flex justify-between"><span><b>EQUIPAMENTO</b></span><span><b>NF N°:</b> <b><Obrig v={e.nf} /></b></span></p>
        <p>{d.descricao_geral}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[12px] mt-3">
        {cab.map(([r1, v1, r2, v2, un]) => (
          <div key={r1} className="contents">
            <p>{r1} {v1}</p>
            <p className="text-right"><b>{r2}</b> <b>{v2}</b> {un}</p>
          </div>
        ))}
      </div>
      <p className="text-center font-bold mt-3">FATURA {d.numero}</p>
      <p className={`text-[11px] px-2 py-1 mt-2 ${classeEstimado}`}>Em azul: valores estimados (catálogo / cálculo; peso bruto = líquido + 1,5%). Confira antes de aprovar.</p>
      <table className="w-full border-collapse mt-2 min-w-[760px]">
        <thead>
          <tr>
            <th className={CAB} rowSpan={2}>Descrição dos materiais</th>
            <th className={CAB} rowSpan={2}>NCM</th>
            <th className={CAB} rowSpan={2}>Unidade<br />(aduaneira)</th>
            <th className={CAB} rowSpan={2}>Qtde</th>
            <th className={CAB} colSpan={3}>Dimensões (mm)</th>
            <th className={CAB} rowSpan={2}>Volume tipo</th>
            <th className={CAB} rowSpan={2}>Volume<br />(m³)</th>
            <th className={CAB} rowSpan={2}>Peso Liq.<br />(kg)</th>
            <th className={CAB} rowSpan={2}>Peso Bruto<br />(kg)</th>
          </tr>
          <tr>
            <th className={CAB}>Comp.</th>
            <th className={CAB}>Larg.</th>
            <th className={CAB}>Alt.</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <GrupoPacking key={g.familia} grupo={g} />
          ))}
          <tr className="font-bold bg-slate-100">
            <td className={CEL} colSpan={8}>TOTAL: {mats.length} item(s)</td>
            <td className={`${CEL} text-right`}>{n3(tm)}</td>
            <td className={`${CEL} text-right`}>{n3(tl)}</td>
            <td className={`${CEL} text-right`}>{n3(tb)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-center text-[11px] mt-8 border-t border-slate-400 w-1/2 ml-auto pt-1 whitespace-pre-line">
        {proc.exportador?.razao}
        {"\n"}
        {proc.exportador?.cidade}, {dataBR(d.data)}
      </p>
    </Papel>
  );
}

function GrupoPacking({ grupo }: { grupo: { familia: string; titulo: string; itens: Material[] } }) {
  return (
    <>
      <tr className="bg-slate-100 font-bold">
        <td className={CEL} colSpan={11}>CONJUNTO {grupo.titulo}</td>
      </tr>
      {grupo.itens.map((m) => {
        const [qe] = qtdAduaneira(m);
        const pl = num(m.peso_liq);
        const pb = num(m.peso_bruto);
        const volume = m3Material(m);
        const ue = (m.un_estat ?? "").toLowerCase();
        const est = new Set(m.estimado ?? []);
        const azul = (cond: boolean, valorVazio: boolean) => (cond && !valorVazio ? classeEstimado : "");
        return (
          <tr key={`${m.sma}-${m.seq}`}>
            <td className={CEL}>{m.descricao}</td>
            <td className={CEL}><Obrig v={m.ncm} /></td>
            <td className={`${CEL} ${azul(est.has("un_estat"), !ue)}`}><Obrig v={ue} texto={UN_NOME[ue] ?? ue.toUpperCase()} /></td>
            <td className={`${CEL} text-right ${azul(ue === "kg" && est.has("peso_liq"), qe == null)}`}><Obrig v={qe} texto={qe == null ? "" : String(Number(qe.toPrecision(12)))} /></td>
            <td className={`${CEL} text-right ${azul(est.has("comp"), !num(m.comp))}`}>{num(m.comp) || ""}</td>
            <td className={`${CEL} text-right ${azul(est.has("larg"), !num(m.larg))}`}>{num(m.larg) || ""}</td>
            <td className={`${CEL} text-right ${azul(est.has("alt"), !num(m.alt))}`}>{num(m.alt) || ""}</td>
            <td className={CEL}>{m.tipo_volume}</td>
            <td className={`${CEL} text-right ${azul(est.has("comp") || est.has("larg") || est.has("alt"), !volume)}`}><Obrig v={volume} texto={n3(volume)} /></td>
            <td className={`${CEL} text-right ${azul(est.has("peso_liq"), !pl)}`}><Obrig v={pl} texto={n3(pl)} /></td>
            <td className={`${CEL} text-right ${azul(est.has("peso_bruto"), !pb)}`}><Obrig v={pb} texto={n3(pb)} /></td>
          </tr>
        );
      })}
    </>
  );
}

function Certificado({ proc }: { proc: Processo }) {
  const co = proc.certificado ?? {};
  const e = proc.embarque ?? {};
  const d = proc.documento ?? {};
  const cons = proc.consignatario ?? {};
  const moeda = proc.comercial?.moeda ?? "";
  const campo = (rotulo: string, valor: ReactNode) => (
    <div className="border border-slate-400">
      <p className={ROT}>{rotulo}</p>
      <p className="px-1.5 py-1 text-[12px] whitespace-pre-line min-h-[24px]">{valor}</p>
    </div>
  );
  return (
    <Papel>
      <p className="text-center text-lg font-bold text-[#1F3864]">CERTIFICADO DE ORIGEM - DADOS PARA EMISSÃO</p>
      <p className="text-center text-[11px] italic text-slate-500">O certificado oficial é emitido pela entidade credenciada no sistema dela; esta aba reúne os dados para preencher lá.</p>
      <div className="grid grid-cols-2 gap-2 mt-3 min-w-[560px]">
        {campo("ACORDO / ACUERDO", co.acordo)}
        {campo("ENTIDADE EMISSORA", co.entidade)}
        {campo("1. EXPORTADOR", parteTexto(proc.exportador ?? {}))}
        {campo("2. IMPORTADOR", parteTexto(proc.importador ?? {}))}
        {campo("3. CONSIGNATÁRIO", cons.igual_importador ? "O mesmo do importador" : parteTexto(cons))}
        {campo("4. PAÍS DE DESTINO", e.pais_destino)}
        {campo("5. MEIO DE TRANSPORTE", MODAL_EN[e.modal ?? ""] ?? e.modal)}
        {campo("6. PORTO / FRONTEIRA DE EMBARQUE", [e.local_embarque, e.fronteira].filter(Boolean).join(" / "))}
        {campo("7. FATURA COMERCIAL Nº", co.fatura_comercial || d.numero)}
        {campo("8. DATA DA FATURA", dataBR(d.data))}
      </div>
      <table className="w-full border-collapse mt-3 min-w-[640px]">
        <thead>
          <tr>
            {["Nº", "NCM / NALADI", "DESCRIÇÃO DA MERCADORIA", "QUANTIDADE", "PESO LÍQ. (kg)", "PESO BRUTO (kg)", `VALOR ${proc.comercial?.incoterm ?? ""} (${moeda})`, "CRITÉRIO DE ORIGEM"].map((h) => (
              <th key={h} className={CAB}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(proc.itens ?? []).map((i, k) => {
            const en = (i.descricao_en ?? "").trim();
            const pt = (i.descricao ?? "").trim();
            return (
              <tr key={k}>
                <td className={CEL}>{k + 1}</td>
                <td className={CEL}>{i.ncm}</td>
                <td className={`${CEL} whitespace-pre-line`}>{en && en.toUpperCase() !== pt.toUpperCase() ? `${en}\n(${pt})` : pt}</td>
                <td className={CEL}>{num(i.quantidade)} {i.unidade}</td>
                <td className={`${CEL} text-right`}>{n3(num(i.peso_liq))}</td>
                <td className={`${CEL} text-right`}>{n3(num(i.peso_bruto))}</td>
                <td className={`${CEL} text-right`}>{n2(num(i.quantidade) * num(i.valor_unit))}</td>
                <td className={CEL}>{i.criterio || co.criterio_origem}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Papel>
  );
}

// ------------------------------------------------------------------------------------------------ passo

interface Props {
  proc: Processo;
  revisao: Revisao;
  aprovado: boolean;
  aprovacao: Aprovacao | null;
  podeAprovar: boolean;
  ocupado: boolean;
  rascunho: DocumentoLista | null;
  mensagem: { tom: "ok" | "aviso" | "erro"; texto: string } | null;
  onAprovar: () => void;
  onPedirRascunho: () => void;
  onBaixar: (d: DocumentoLista) => void;
  onVerRevisao: () => void;
}

export function PassoPrevia({ proc, revisao, aprovado, aprovacao, podeAprovar, ocupado, rascunho, mensagem, onAprovar, onPedirRascunho, onBaixar, onVerRevisao }: Props) {
  const emite = emiteCertificado(proc);
  const abas = [
    { id: "proforma", nome: "Proforma Invoice" },
    { id: "invoice", nome: "Commercial Invoice" },
    { id: "packing", nome: "Packing List" },
    ...(emite ? [{ id: "certificado", nome: "Certificado de Origem" }] : []),
  ];
  const [aba, setAba] = useState("proforma");
  const faltas = contarFaltas(proc, revisao);
  const totalFaltas = faltas.proforma + faltas.invoice + faltas.packing;
  const erros = revisao.ajustes.filter((a) => a.nivel === "erro").length;
  const alteradoDepois = Boolean(aprovacao) && !aprovado;
  const liberado = aprovado && !revisao.bloqueado;
  const abaAtual = abas.some((a) => a.id === aba) ? aba : "proforma";
  return (
    <div className="space-y-4">
      <Titulo
        titulo="Pré-visualização"
        descricao="É assim que os documentos vão sair no Excel. O que ainda falta aparece como FALTA. Confira, aprove e gere. Se mudar algo depois de aprovar, é preciso aprovar de novo."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao rotulo="Faltando nos documentos" valor={totalFaltas} sub="campos marcados FALTA" tom={totalFaltas ? "erro" : "ok"} />
        <Cartao rotulo="Erros na revisão" valor={erros} sub={<button type="button" onClick={onVerRevisao} className="underline">ver a lista</button>} tom={erros ? "erro" : "ok"} />
        <Cartao
          rotulo="Aprovação"
          valor={aprovado ? "Aprovado" : "Não aprovado"}
          sub={aprovado && aprovacao ? `por ${aprovacao.por} em ${dataBR(aprovacao.em)} ${aprovacao.em.slice(11, 16)}` : alteradoDepois ? "houve alteração depois da aprovação" : ""}
          tom={aprovado ? "ok" : "aviso"}
        />
        <Cartao rotulo="Documento final" valor={liberado ? "Liberado" : "Bloqueado"} sub={liberado ? "pode gerar" : erros ? "corrija os erros" : "falta aprovar"} tom={liberado ? "ok" : "aviso"} />
      </div>
      {alteradoDepois && <Aviso tom="aviso">Houve alteração depois da aprovação: aprove de novo para liberar os documentos finais.</Aviso>}
      {mensagem && <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>}
      <div className="flex flex-wrap items-center gap-2">
        <Botao onClick={onPedirRascunho} desabilitado={ocupado}>
          <FileSpreadsheet size={15} /> Baixar rascunho (Excel)
        </Botao>
        {rascunho && (
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            {rascunho.situacao === "pendente" && (
              <>
                <Loader2 size={13} className="animate-spin" /> Rascunho na fila do robô (até 5 minutos)…
              </>
            )}
            {rascunho.situacao === "erro" && <span className="text-red-600">Rascunho não gerado: {rascunho.erro}</span>}
            {rascunho.situacao === "gerado" && (
              <Botao tamanho="pequeno" onClick={() => onBaixar(rascunho)}>
                <Download size={13} /> {rascunho.nome_arquivo}
              </Botao>
            )}
          </span>
        )}
        <span className="flex-1" />
        <Botao
          tipo="primario"
          desabilitado={aprovado || !podeAprovar || revisao.bloqueado || ocupado}
          titulo={revisao.bloqueado ? "Corrija os erros da revisão antes de aprovar" : undefined}
          onClick={onAprovar}
        >
          <CheckCircle2 size={15} /> {aprovado ? "Aprovado" : "Aprovar estes documentos"}
        </Botao>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {abas.map((a) => {
          const n = a.id === "packing" ? faltas.packing : a.id === "certificado" ? 0 : faltas[a.id as "proforma" | "invoice"];
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`px-3 py-2 text-sm rounded-t-lg border border-b-0 ${abaAtual === a.id ? "bg-white font-bold text-[#2A6377] border-slate-300" : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100"}`}
            >
              {a.nome}
              {n > 0 && <span className="ml-1.5 align-middle"><Falta /></span>}
            </button>
          );
        })}
      </div>
      <div className="bg-slate-300/60 p-3 md:p-5 rounded-b-lg rounded-tr-lg overflow-auto max-h-[78vh]">
        {abaAtual === "proforma" && <Fatura proc={proc} revisao={revisao} proforma />}
        {abaAtual === "invoice" && <Fatura proc={proc} revisao={revisao} proforma={false} />}
        {abaAtual === "packing" && <Packing proc={proc} revisao={revisao} />}
        {abaAtual === "certificado" && <Certificado proc={proc} />}
      </div>
    </div>
  );
}
