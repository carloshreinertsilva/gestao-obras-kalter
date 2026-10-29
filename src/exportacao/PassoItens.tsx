// Passo 6: itens da Invoice, um cartao por item. Descricao em portugues e em ingles/espanhol, NCM (busca no cadastro fiscal do
// ERP espelhado em exportacao_ncm), quantidade, valor na moeda da Invoice e pesos. Com o cambio informado oferece converter os
// valores do pedido (R$ / cambio); "Usar os pesos do Packing List" soma os pesos dos materiais por familia em cada item.
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Scale, X } from "lucide-react";
import { supabase } from "../supabase";
import type { PassoId } from "./navegacao";
import { milhar, num } from "./numeros";
import { converterValores, itemDaFamilia, itensParaConverter, pendenciasItem, pesosDoPacking, pesosPorFamilia, type PesoFamilia } from "./processo";
import type { PropsPasso } from "./passos";
import type { ItemInvoice, Processo } from "./tipos";
import { Aviso, Botao, CampoNumero, Cartao, Rotulo, Titulo, classeCampo, fmtBR } from "./ui";

const formatarNcm = (codigo: number | string) => {
  const s = String(codigo).replace(/\D/g, "").padStart(8, "0");
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}`;
};

interface SugestaoNcm {
  codigo: number;
  descricao: string;
}

async function buscarNcm(q: string): Promise<SugestaoNcm[]> {
  const t = q.replace(/\./g, "").trim();
  if (t.length < 3) return [];
  let consulta = supabase.from("exportacao_ncm").select("codigo, descricao").order("codigo").limit(30);
  if (/^\d+$/.test(t)) {
    const d = t.slice(0, 8);
    consulta = consulta.gte("codigo", Number(d.padEnd(8, "0"))).lte("codigo", Number(d.padEnd(8, "9")));
  } else {
    consulta = consulta.ilike("descricao", `%${t.replace(/[%_]/g, "")}%`);
  }
  const { data } = await consulta;
  return (data ?? []) as SugestaoNcm[];
}

function CampoNcm({ id, valor, onChange, classe }: { id: string; valor: string; onChange: (v: string) => void; classe: string }) {
  const [sugestoes, setSugestoes] = useState<SugestaoNcm[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);
  return (
    <div className="relative">
      <input
        id={id}
        value={valor}
        placeholder="0000.00.00 ou nome"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          if (temporizador.current) clearTimeout(temporizador.current);
          const q = e.target.value;
          temporizador.current = setTimeout(() => void buscarNcm(q).then(setSugestoes), 350);
        }}
        onBlur={() => setSugestoes([])}
        className={`${classe} tabular-nums`}
      />
      {sugestoes.length > 0 && (
        <ul className="absolute z-20 left-0 mt-1 w-[min(360px,80vw)] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs">
          {sugestoes.map((s) => (
            <li
              key={s.codigo}
              onMouseDown={(e) => {
                e.preventDefault(); // nao deixa o campo perder o foco antes do clique
                onChange(formatarNcm(s.codigo));
                setSugestoes([]);
              }}
              className="px-2 py-1.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <b className="tabular-nums">{formatarNcm(s.codigo)}</b> {s.descricao}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const nomeItem = (i: ItemInvoice, n: number) => `${n + 1}. ${String(i.descricao || i.codigo || "sem descrição").slice(0, 40)}`;

/** Campo com borda vermelha quando falta (a revisao bloqueia o final). */
const comFalta = (falta: boolean) => `${classeCampo} ${falta ? "!border-red-300 bg-red-50/40" : ""}`;

function CartaoItem({
  item,
  n,
  moeda,
  atualizar,
  remover,
}: {
  item: ItemInvoice;
  n: number;
  moeda: string;
  atualizar: (caminho: string, valor: unknown) => void;
  remover: () => void;
}) {
  const falta = pendenciasItem(item);
  const tem = (p: string) => falta.includes(p);
  const id = (c: string) => `item-${n}-${c}`;
  const campo = (c: string, v: unknown) => atualizar(`itens.${n}.${c}`, v);
  return (
    <article className={`rounded-xl border bg-white p-4 ${falta.length ? "border-red-200" : "border-slate-200"}`} aria-label={`Item ${n + 1}`}>
      <header className="flex items-start gap-3 mb-3">
        <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-slate-100 text-xs font-bold text-slate-600">{n + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{item.descricao || "Item sem descrição"}</p>
          <p className="text-[11px] text-slate-500">
            {item.codigo ? `Código do pedido ${item.codigo}` : "Item incluído na Invoice"}
            {num(item.valor_unit_brl) > 0 && ` · pedido R$ ${fmtBR(item.valor_unit_brl)} por unidade`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Total {moeda}</p>
          <p className="text-sm font-bold tabular-nums text-slate-800">{milhar(num(item.quantidade) * num(item.valor_unit), 2)}</p>
        </div>
        <button type="button" onClick={remover} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Remover item ${n + 1}`}>
          <X size={16} />
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Rotulo htmlFor={id("descricao")} texto="Descrição (português)" obrigatorio />
          <textarea
            id={id("descricao")}
            rows={2}
            value={item.descricao ?? ""}
            onChange={(e) => campo("descricao", e.target.value)}
            className={`${comFalta(tem("descrição"))} h-auto py-2 resize-y`}
          />
        </div>
        <div>
          <Rotulo htmlFor={id("descricao_en")} texto="Descrição (inglês / espanhol)" dica="sem ela, vai só em português" />
          <textarea
            id={id("descricao_en")}
            rows={2}
            placeholder="English / Español"
            value={item.descricao_en ?? ""}
            onChange={(e) => campo("descricao_en", e.target.value)}
            className={`${classeCampo} h-auto py-2 resize-y`}
          />
        </div>
      </div>

      <div className="grid gap-3 mt-3 grid-cols-2 sm:grid-cols-4">
        <div className="col-span-2">
          <Rotulo htmlFor={id("ncm")} texto="NCM" obrigatorio dica="digite o código ou parte do nome" />
          <CampoNcm id={id("ncm")} valor={item.ncm ?? ""} onChange={(v) => campo("ncm", v)} classe={comFalta(tem("NCM com 8 dígitos"))} />
        </div>
        <div>
          <Rotulo htmlFor={id("unidade")} texto="Unidade" />
          <input id={id("unidade")} value={item.unidade ?? ""} onChange={(e) => campo("unidade", e.target.value)} className={classeCampo} />
        </div>
        <div>
          <Rotulo htmlFor={id("quantidade")} texto="Quantidade" obrigatorio />
          <CampoNumero id={id("quantidade")} valor={item.quantidade} onChange={(v) => campo("quantidade", v)} classe={comFalta(tem("quantidade"))} />
        </div>
        <div className="col-span-2">
          <Rotulo htmlFor={id("valor_unit")} texto={`Valor unitário (${moeda})`} obrigatorio />
          <CampoNumero id={id("valor_unit")} valor={item.valor_unit} casas={2} onChange={(v) => campo("valor_unit", v)} classe={comFalta(tem("valor unitário"))} />
        </div>
        <div>
          <Rotulo htmlFor={id("peso_liq")} texto="Peso líq. (kg)" />
          <CampoNumero id={id("peso_liq")} valor={item.peso_liq} onChange={(v) => campo("peso_liq", v)} classe={comFalta(tem("peso líquido maior que o bruto"))} />
        </div>
        <div>
          <Rotulo htmlFor={id("peso_bruto")} texto="Peso bruto (kg)" />
          <CampoNumero id={id("peso_bruto")} valor={item.peso_bruto} onChange={(v) => campo("peso_bruto", v)} classe={comFalta(tem("peso líquido maior que o bruto"))} />
        </div>
      </div>

      {falta.length > 0 && <p className="mt-3 text-xs text-red-600">Falta: {falta.join(", ")}.</p>}
    </article>
  );
}

/** Painel "Usar os pesos do Packing List": cada familia de material vai para um item (sugestao pelo codigo do pedido). */
function PainelPesos({
  itens,
  familias,
  aplicar,
  fechar,
}: {
  itens: ItemInvoice[];
  familias: PesoFamilia[];
  aplicar: (destino: Record<string, number>) => void;
  fechar: () => void;
}) {
  const [destino, setDestino] = useState<Record<string, number>>(() =>
    Object.fromEntries(familias.map((f) => [f.familia, itens.length === 1 ? 0 : itemDaFamilia(itens, f.familia)])),
  );
  const [todas, setTodas] = useState("");
  const previa = pesosDoPacking(itens, familias, destino);
  const semItem = familias.filter((f) => (destino[f.familia] ?? -1) < 0);
  const kgSemItem = semItem.reduce((s, f) => s + f.peso_liq, 0);
  const opcoes = (
    <>
      <option value={-1}>— nenhum —</option>
      {itens.map((i, k) => (
        <option key={k} value={k}>
          {nomeItem(i, k)}
        </option>
      ))}
    </>
  );
  return (
    <section className="rounded-xl border border-[#2A6377]/30 bg-white p-4 space-y-3" aria-label="Pesos do Packing List">
      <div>
        <h4 className="text-sm font-bold text-slate-800">Pesos dos itens pela Packing List</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Os materiais da Packing List estão somados por família. Diga em que item da Invoice entra cada família; as que têm o mesmo código do item já vêm
          escolhidas. Os pesos digitados nos itens são trocados por essas somas.
        </p>
      </div>
      {semItem.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>
            {semItem.length} família(s) sem item ({milhar(kgSemItem, 1)} kg). Mandar todas para:
          </span>
          <select aria-label="Item para as famílias sem item" value={todas} onChange={(e) => setTodas(e.target.value)} className="h-8 rounded border border-slate-300 px-1.5 text-xs">
            <option value="">escolha o item</option>
            {itens.map((i, k) => (
              <option key={k} value={k}>
                {nomeItem(i, k)}
              </option>
            ))}
          </select>
          <Botao
            tamanho="pequeno"
            desabilitado={todas === ""}
            onClick={() => setDestino((d) => ({ ...d, ...Object.fromEntries(semItem.map((f) => [f.familia, Number(todas)])) }))}
          >
            Aplicar
          </Botao>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-2 py-1.5 border-b font-semibold">Família</th>
              <th className="px-2 py-1.5 border-b font-semibold text-right">Materiais</th>
              <th className="px-2 py-1.5 border-b font-semibold text-right">Líq. (kg)</th>
              <th className="px-2 py-1.5 border-b font-semibold text-right">Bruto (kg)</th>
              <th className="px-2 py-1.5 border-b font-semibold">Entra no item</th>
            </tr>
          </thead>
          <tbody>
            {familias.map((f) => (
              <tr key={f.familia} className="border-b border-slate-100">
                <td className="px-2 py-1.5">
                  <b className="tabular-nums">{f.familia || "sem família"}</b> <span className="text-xs text-slate-500">{f.descricao}</span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{f.materiais}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{milhar(f.peso_liq, 3)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{milhar(f.peso_bruto, 3)}</td>
                <td className="px-2 py-1">
                  <select
                    aria-label={`Item da família ${f.familia}`}
                    value={destino[f.familia] ?? -1}
                    onChange={(e) => setDestino((d) => ({ ...d, [f.familia]: Number(e.target.value) }))}
                    className={`h-8 w-full rounded border px-1.5 text-xs ${(destino[f.familia] ?? -1) < 0 ? "border-amber-300 bg-amber-50" : "border-slate-300"}`}
                  >
                    {opcoes}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1">
        <p className="font-semibold text-slate-600">Como os itens ficam</p>
        {previa.map((i, k) => (
          <p key={k} className="flex justify-between gap-3">
            <span className="truncate">{nomeItem(i, k)}</span>
            <span className={`tabular-nums shrink-0 ${num(i.peso_liq) > 0 ? "text-slate-800" : "text-amber-700"}`}>
              {milhar(num(i.peso_liq), 3)} kg líq. · {milhar(num(i.peso_bruto), 3)} kg bruto
            </span>
          </p>
        ))}
      </div>
      {semItem.length > 0 && (
        <Aviso tom="aviso">
          {milhar(kgSemItem, 3)} kg de {semItem.length} família(s) ficam fora dos itens: a soma dos itens não vai bater com a Packing List.
        </Aviso>
      )}
      <div className="flex flex-wrap gap-2">
        <Botao tipo="primario" onClick={() => aplicar(destino)}>
          Usar esses pesos nos itens
        </Botao>
        <Botao onClick={fechar}>Cancelar</Botao>
      </div>
    </section>
  );
}

export function PassoItens({
  proc,
  atualizar,
  modificar,
  onIrPara,
}: PropsPasso & { modificar: (fn: (p: Processo) => Processo) => void; onIrPara: (p: PassoId) => void }) {
  const [painelPesos, setPainelPesos] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const moeda = proc.comercial?.moeda || "USD";
  const taxa = num(proc.comercial?.taxa_cambio);
  const itens = proc.itens ?? [];
  const total = itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unit), 0);
  const plItens = itens.reduce((s, i) => s + num(i.peso_liq), 0);
  const pbItens = itens.reduce((s, i) => s + num(i.peso_bruto), 0);
  const familias = useMemo(() => pesosPorFamilia(proc.packing?.materiais ?? []), [proc.packing?.materiais]);
  const plPacking = familias.reduce((s, f) => s + f.peso_liq, 0);
  const pbPacking = familias.reduce((s, f) => s + f.peso_bruto, 0);
  const pesosBatem = Math.abs(plPacking - plItens) <= 0.01 && Math.abs(pbPacking - pbItens) <= 0.01;
  const paraConverter = itensParaConverter(itens, moeda, taxa);
  const semCambio = moeda !== "BRL" && taxa <= 0 && itens.some((i) => num(i.valor_unit_brl) > 0 && num(i.valor_unit) <= 0);

  const converter = () => modificar((p) => ({ ...p, itens: converterValores(p.itens, moeda, taxa) }));
  const novoItem = () =>
    modificar((p) => ({
      ...p,
      itens: [...p.itens, { descricao: "", descricao_en: "", ncm: "", unidade: "UN", quantidade: 1, valor_unit: 0, peso_liq: 0, peso_bruto: 0 } as ItemInvoice],
    }));
  const tirarItem = (n: number) => {
    if (window.confirm(`Remover o item ${n + 1}?`)) modificar((p) => ({ ...p, itens: p.itens.filter((_, k) => k !== n) }));
  };
  const usarPesos = (destino: Record<string, number>) => {
    modificar((p) => ({ ...p, itens: pesosDoPacking(p.itens, familias, destino) }));
    setPainelPesos(false);
    setMensagem("Pesos dos itens trocados pelas somas da Packing List.");
  };

  return (
    <div className="space-y-4">
      <Titulo
        titulo="Itens da Invoice"
        descricao="O que vai na Invoice. Pode reescrever a descrição (ex.: “Instalação frigorífica”), separar em vários itens e buscar o NCM no cadastro fiscal do ERP digitando o código ou parte do nome."
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Cartao rotulo={`Total ${moeda}`} valor={milhar(total, 2)} sub={taxa > 0 && moeda !== "BRL" ? `≈ R$ ${milhar(total * taxa, 2)} no câmbio ${fmtBR(taxa, 4)}` : undefined} />
        <Cartao
          rotulo="Peso líquido dos itens"
          valor={`${milhar(plItens, 3)} kg`}
          sub={familias.length ? `Packing List: ${milhar(plPacking, 3)} kg` : undefined}
          tom={familias.length && !pesosBatem ? "aviso" : "normal"}
        />
        <Cartao
          rotulo="Peso bruto dos itens"
          valor={`${milhar(pbItens, 3)} kg`}
          sub={familias.length ? `Packing List: ${milhar(pbPacking, 3)} kg` : undefined}
          tom={familias.length && !pesosBatem ? "aviso" : "normal"}
        />
      </div>

      {paraConverter > 0 && (
        <Aviso
          tom="aviso"
          acao={
            <Botao tamanho="pequeno" tipo="primario" onClick={converter}>
              Converter
            </Botao>
          }
        >
          {paraConverter === 1 ? "1 item tem" : `${paraConverter} itens têm`} valor diferente do pedido convertido pelo câmbio de {fmtBR(taxa, 4)} (R$ ÷ câmbio).
        </Aviso>
      )}
      {semCambio && (
        <Aviso
          tom="info"
          acao={
            <Botao tamanho="pequeno" onClick={() => onIrPara("comercial")}>
              Informar o câmbio
            </Botao>
          }
        >
          Informe a taxa de câmbio em Condições comerciais para converter os valores do pedido (R$) para {moeda}.
        </Aviso>
      )}
      {familias.length > 0 && !pesosBatem && !painelPesos && (
        <Aviso
          tom="aviso"
          acao={
            <Botao tamanho="pequeno" tipo="primario" onClick={() => setPainelPesos(true)}>
              <Scale size={13} /> Usar os pesos do Packing List
            </Botao>
          }
        >
          A soma dos pesos dos itens não bate com a Packing List. Os pesos dos itens vão no Certificado de Origem.
        </Aviso>
      )}
      {mensagem && !painelPesos && <Aviso tom="ok">{mensagem}</Aviso>}
      {painelPesos && <PainelPesos itens={itens} familias={familias} aplicar={usarPesos} fechar={() => setPainelPesos(false)} />}

      <div className="space-y-3">
        {itens.map((i, n) => (
          <CartaoItem key={n} item={i} n={n} moeda={moeda} atualizar={atualizar} remover={() => tirarItem(n)} />
        ))}
        {!itens.length && <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400">Nenhum item na Invoice.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Botao onClick={novoItem}>
          <Plus size={14} /> Item
        </Botao>
        {familias.length > 0 && pesosBatem && !painelPesos && (
          <Botao onClick={() => setPainelPesos(true)} titulo="Refazer os pesos dos itens pela soma dos materiais da Packing List">
            <Scale size={14} /> Usar os pesos do Packing List
          </Botao>
        )}
      </div>
    </div>
  );
}
