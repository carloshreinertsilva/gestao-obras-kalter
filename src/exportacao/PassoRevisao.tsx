// Passo 9: revisao. Erros (vermelho) bloqueiam os documentos finais; avisos (amarelo) nao; ajustes no ERP (roxo) so o Carlos
// Silva corrige (o app nunca grava no ERP).
import { ArrowRight } from "lucide-react";
import { alvoDoAjuste, nomeDoPasso, type PassoId } from "./navegacao";
import { Botao, Cartao, Titulo, fmtBR } from "./ui";
import type { Ajuste, Processo, Revisao } from "./tipos";

/** Vai ao passo e, quando se sabe o campo, poe o cursor nele. */
export type IrPara = (p: PassoId, campo?: string) => void;

function Grupo({ titulo, tom, lista, aoIrPara }: { titulo: string; tom: "erro" | "aviso" | "erp"; lista: Ajuste[]; aoIrPara: IrPara }) {
  if (!lista.length) return null;
  const cor = tom === "erro" ? "bg-red-50 border-red-200 text-red-700" : tom === "aviso" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-violet-50 border-violet-200 text-violet-800";
  return (
    <section>
      <h4 className="text-sm font-bold text-slate-700 mb-2">
        {titulo} ({lista.length})
      </h4>
      <ul className="space-y-1.5">
        {lista.map((a, i) => {
          const alvo = alvoDoAjuste(a);
          return (
            <li key={i} className={`rounded-lg border px-3 py-2 text-sm flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-1.5 ${cor}`}>
              <span className="flex-1 min-w-[12rem]">{a.texto}</span>
              {a.onde === "erp" ? (
                <span className="text-[11px] font-bold rounded-full bg-white/70 px-2 py-0.5 whitespace-nowrap">Carlos Silva</span>
              ) : (
                alvo && (
                  <Botao
                    tamanho="pequeno"
                    onClick={() => aoIrPara(alvo.passo, alvo.campo)}
                    titulo={alvo.campo ? `Abre ${nomeDoPasso(alvo.passo)} com o cursor no campo` : `Abre ${nomeDoPasso(alvo.passo)}`}
                  >
                    Corrigir <span className="font-normal text-slate-500">· {nomeDoPasso(alvo.passo)}</span>
                  </Botao>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PassoRevisao({ proc, revisao, aoIrPara }: { proc: Processo; revisao: Revisao; aoIrPara: IrPara }) {
  const erros = revisao.ajustes.filter((a) => a.nivel === "erro");
  const avisos = revisao.ajustes.filter((a) => a.nivel === "aviso" && a.onde !== "erp");
  const erp = revisao.ajustes.filter((a) => a.onde === "erp");
  const t = revisao.totais;
  const moeda = proc.comercial?.moeda || "";
  return (
    <div className="space-y-4">
      <Titulo
        titulo="Revisão e ajustes"
        descricao="Erros impedem gerar os documentos finais. Avisos podem ser aceitos. Ajustes no ERP não são feitos pelo app: vão para o Guia do processo, para pedir ao Carlos Silva."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao rotulo="Total da Invoice" valor={`${moeda} ${fmtBR(t.valor_total)}`} sub={`${proc.comercial?.incoterm ?? ""} ${proc.comercial?.local_incoterm ?? ""} · mercadoria ${fmtBR(t.valor)} + frete ${fmtBR(t.frete)} + seguro ${fmtBR(t.seguro)}`} />
        <Cartao rotulo="Peso líquido / bruto" valor={`${fmtBR(t.peso_liq, 1)} / ${fmtBR(t.peso_bruto, 1)}`} sub="kg (Packing List)" />
        <Cartao rotulo="Volumes / m³" valor={`${t.volumes} / ${fmtBR(t.m3)}`} sub={`${t.materiais} materiais na Packing List`} />
        <Cartao
          rotulo="Situação"
          valor={revisao.bloqueado ? `${erros.length} erro(s)` : "Pronto"}
          sub={`${avisos.length} aviso(s) · ${erp.length} no ERP`}
          tom={revisao.bloqueado ? "erro" : "ok"}
        />
      </div>
      {!revisao.ajustes.length && <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-3">Tudo certo. Pode ver a pré-visualização e aprovar.</div>}
      <Grupo titulo="Erros: corrigir antes de gerar" tom="erro" lista={erros} aoIrPara={aoIrPara} />
      <Grupo titulo="Avisos" tom="aviso" lista={avisos} aoIrPara={aoIrPara} />
      <Grupo titulo="Ajustes no ERP (pedir ao Carlos Silva)" tom="erp" lista={erp} aoIrPara={aoIrPara} />
      <div className="flex justify-end">
        <Botao tipo="primario" onClick={() => aoIrPara("previa")}>
          Ver como os documentos vão ficar <ArrowRight size={15} />
        </Botao>
      </div>
    </div>
  );
}
