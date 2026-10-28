// Passo 6: itens da Invoice. Descricao em portugues e em ingles/espanhol, NCM (busca no cadastro fiscal do ERP espelhado em
// exportacao_ncm), quantidade, valor na moeda da Invoice e pesos. "Converter" divide o valor do pedido em R$ pelo cambio.
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "../supabase";
import { milhar, num } from "./numeros";
import type { PropsPasso } from "./passos";
import type { ItemInvoice, Processo } from "./tipos";
import { Aviso, Botao, CampoNumero, Titulo, classeCelula, fmtBR } from "./ui";

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

function CampoNcm({ valor, onChange, rotulo }: { valor: string; onChange: (v: string) => void; rotulo: string }) {
  const [sugestoes, setSugestoes] = useState<SugestaoNcm[]>([]);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (temporizador.current && clearTimeout(temporizador.current)), []);
  return (
    <div className="relative">
      <input
        value={valor}
        aria-label={rotulo}
        placeholder="0000.00.00"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          if (temporizador.current) clearTimeout(temporizador.current);
          const q = e.target.value;
          temporizador.current = setTimeout(() => void buscarNcm(q).then(setSugestoes), 350);
        }}
        onBlur={() => setSugestoes([])}
        className={`${classeCelula} tabular-nums`}
      />
      {sugestoes.length > 0 && (
        <ul className="absolute z-20 left-0 mt-1 w-[360px] max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-xs">
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

const TH = "text-left text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1.5 bg-slate-50 border-b whitespace-nowrap";

export function PassoItens({ proc, atualizar, modificar }: PropsPasso & { modificar: (fn: (p: Processo) => Processo) => void }) {
  const [mensagem, setMensagem] = useState("");
  const moeda = proc.comercial?.moeda || "USD";
  const itens = proc.itens ?? [];
  const total = itens.reduce((s, i) => s + num(i.quantidade) * num(i.valor_unit), 0);

  const converter = () => {
    const taxa = num(proc.comercial?.taxa_cambio);
    if (moeda !== "BRL" && taxa <= 0) {
      setMensagem("Informe a taxa de câmbio em Condições comerciais.");
      return;
    }
    setMensagem("");
    modificar((p) => ({
      ...p,
      itens: p.itens.map((i) =>
        num(i.valor_unit_brl) ? { ...i, valor_unit: moeda === "BRL" ? num(i.valor_unit_brl) : Math.round((num(i.valor_unit_brl) / taxa) * 100) / 100 } : i,
      ),
    }));
  };
  const novoItem = () =>
    modificar((p) => ({
      ...p,
      itens: [...p.itens, { descricao: "", descricao_en: "", ncm: "", unidade: "UN", quantidade: 1, valor_unit: 0, peso_liq: 0, peso_bruto: 0 } as ItemInvoice],
    }));
  const tirarItem = (n: number) => {
    if (window.confirm(`Remover o item ${n + 1}?`)) modificar((p) => ({ ...p, itens: p.itens.filter((_, k) => k !== n) }));
  };

  return (
    <div className="space-y-4">
      <Titulo
        titulo="Itens da Invoice"
        descricao="O que vai na Invoice. Pode reescrever a descrição (ex.: “Instalação frigorífica”), separar em vários itens e buscar o NCM no cadastro fiscal do ERP digitando o código ou parte do nome."
      />
      {mensagem && <Aviso tom="aviso">{mensagem}</Aviso>}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>#</th>
              <th className={TH}>Descrição (PT)</th>
              <th className={TH}>Descrição (EN / ES)</th>
              <th className={TH}>NCM</th>
              <th className={TH}>Un.</th>
              <th className={`${TH} text-right`}>Qtd</th>
              <th className={`${TH} text-right`}>Valor unit. ({moeda})</th>
              <th className={`${TH} text-right`}>Peso líq. (kg)</th>
              <th className={`${TH} text-right`}>Peso bruto (kg)</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {itens.map((i, n) => (
              <tr key={n} className="border-b border-slate-100 align-top">
                <td className="px-1.5 py-1.5 text-sm text-slate-500">{n + 1}</td>
                <td className="px-1 py-1 min-w-[200px]">
                  <textarea
                    rows={2}
                    aria-label={`Descrição do item ${n + 1}`}
                    value={i.descricao ?? ""}
                    onChange={(e) => atualizar(`itens.${n}.descricao`, e.target.value)}
                    className={`${classeCelula} h-auto py-1 resize-y`}
                  />
                </td>
                <td className="px-1 py-1 min-w-[200px]">
                  <textarea
                    rows={2}
                    aria-label={`Descrição em inglês ou espanhol do item ${n + 1}`}
                    placeholder="English / Español"
                    value={i.descricao_en ?? ""}
                    onChange={(e) => atualizar(`itens.${n}.descricao_en`, e.target.value)}
                    className={`${classeCelula} h-auto py-1 resize-y`}
                  />
                </td>
                <td className="px-1 py-1 w-[120px]">
                  <CampoNcm rotulo={`NCM do item ${n + 1}`} valor={i.ncm ?? ""} onChange={(v) => atualizar(`itens.${n}.ncm`, v)} />
                </td>
                <td className="px-1 py-1 w-[64px]">
                  <input
                    aria-label={`Unidade do item ${n + 1}`}
                    value={i.unidade ?? ""}
                    onChange={(e) => atualizar(`itens.${n}.unidade`, e.target.value)}
                    className={classeCelula}
                  />
                </td>
                <td className="px-1 py-1 w-[80px]">
                  <CampoNumero rotuloAcessivel={`Quantidade do item ${n + 1}`} valor={i.quantidade} onChange={(v) => atualizar(`itens.${n}.quantidade`, v)} classe={classeCelula} />
                </td>
                <td className="px-1 py-1 w-[130px]">
                  <CampoNumero
                    rotuloAcessivel={`Valor unitário do item ${n + 1}`}
                    valor={i.valor_unit}
                    casas={2}
                    onChange={(v) => atualizar(`itens.${n}.valor_unit`, v)}
                    classe={classeCelula}
                  />
                  {num(i.valor_unit_brl) > 0 && <p className="text-[10px] text-slate-400 text-right mt-0.5">pedido: R$ {fmtBR(i.valor_unit_brl)}</p>}
                </td>
                <td className="px-1 py-1 w-[100px]">
                  <CampoNumero rotuloAcessivel={`Peso líquido do item ${n + 1}`} valor={i.peso_liq} onChange={(v) => atualizar(`itens.${n}.peso_liq`, v)} classe={classeCelula} />
                </td>
                <td className="px-1 py-1 w-[100px]">
                  <CampoNumero rotuloAcessivel={`Peso bruto do item ${n + 1}`} valor={i.peso_bruto} onChange={(v) => atualizar(`itens.${n}.peso_bruto`, v)} classe={classeCelula} />
                </td>
                <td className="px-1 py-1">
                  <button type="button" onClick={() => tirarItem(n)} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Remover item ${n + 1}`}>
                    <X size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {!itens.length && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-400">
                  Nenhum item na Invoice.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={6} className="px-2 py-2 text-right text-xs uppercase text-slate-500">
                Total {moeda}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-sm">{milhar(total, 2)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Botao onClick={novoItem}>
          <Plus size={14} /> Item
        </Botao>
        <Botao onClick={converter} titulo="Divide o valor unitário do pedido (R$) pela taxa de câmbio">
          Converter valores do pedido (R$ ÷ câmbio)
        </Botao>
      </div>
    </div>
  );
}
