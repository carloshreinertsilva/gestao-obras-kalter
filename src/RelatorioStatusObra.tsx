import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { AREAS_SAUDE, ROTULO_NIVEL, type SaudeObra } from "./saudeObra";
import type { ResumoCronograma, ResumoFaturamento, ResumoRecebimento } from "./calculoResumoObra";
import { formatarPct, formatarPp } from "./painel/calculoMargemCarteira";
import { formatarMoeda, isoParaDataBR, labelFase } from "./utils";
import "./relatorioStatus.css";

// Relatorio de status da obra em uma pagina A4 (item B9, pacote 4). So exibicao: as contas vem prontas
// da aba Resumo (calculoResumoObra.ts). O PDF sai pelo "Salvar como PDF" do proprio navegador
// (window.print, como a impressao da SF) - sem biblioteca nova.
// "Para o cliente" NUNCA mostra margem, custo, verba, compras nem valor de pedido de fornecedor:
// por isso este componente nem recebe compras/verba, e a margem e descartada aqui no modo cliente.

export type ModoRelatorio = "interno" | "cliente";

export interface MargemRelatorio {
  pctPrevista: number;
  pctAtual: number;
  variacaoPp: number;
  margemPrevista: number;
  margemAtual: number;
}

export interface PropsRelatorioStatus {
  modo: ModoRelatorio;
  onTrocarModo: (m: ModoRelatorio) => void;
  onFechar: () => void;
  codigo: string;
  nome: string;
  gestor: string;
  emitidoEm: string;
  saude: SaudeObra | null;
  dataEntrega: string | null;
  prazo: { texto: string; atrasada: boolean } | null;
  faturamento: ResumoFaturamento | null;
  recebimento: ResumoRecebimento | null;
  faseAtual: string;
  cronograma: ResumoCronograma;
  pendencias: string[];
  diario: { id: string | number; data: string | null; autor: string; texto: string }[] | null;
  margem: MargemRelatorio | null;
}

const Titulo = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#2A6377] border-b border-slate-300 pb-0.5 mb-1.5">{children}</h3>
);

const Linha = ({ rotulo, valor, forte }: { rotulo: string; valor: ReactNode; forte?: boolean }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-600">{rotulo}</span>
    <span className={`text-right ${forte ? "font-bold" : "font-semibold"} text-slate-900`}>{valor}</span>
  </div>
);

const SemDado = ({ texto = "Sem dados." }: { texto?: string }) => <p className="text-slate-500 italic">{texto}</p>;

// selo com texto e borda (sobrevive a impressao em preto e branco)
const CLASSE_SELO = {
  critico: "border-red-700 text-red-800 bg-red-50",
  atencao: "border-amber-700 text-amber-900 bg-amber-50",
  em_dia: "border-emerald-700 text-emerald-800 bg-emerald-50",
} as const;
const MARCA_NIVEL = { vermelho: "✖", amarelo: "!", verde: "✓" } as const;

export default function RelatorioStatusObra(p: PropsRelatorioStatus) {
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const interno = p.modo === "interno";
  const margem = interno ? p.margem : null;
  const estado = useRef(p.onFechar);
  useEffect(() => {
    estado.current = p.onFechar;
  });

  // classe no body liga o CSS de impressao so enquanto o relatorio esta aberto
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    document.body.classList.add("rso-imprimindo");
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botaoFechar.current?.focus();
    const teclas = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        estado.current();
      }
    };
    document.addEventListener("keydown", teclas, true);
    return () => {
      document.removeEventListener("keydown", teclas, true);
      document.body.classList.remove("rso-imprimindo");
      document.body.style.overflow = rolagem;
      if (anterior && document.contains(anterior)) anterior.focus?.();
    };
  }, []);

  const botaoModo = (m: ModoRelatorio, rotulo: string) => (
    <button
      type="button"
      aria-pressed={p.modo === m}
      onClick={() => p.onTrocarModo(m)}
      className={`px-3 py-1.5 text-sm font-semibold ${p.modo === m ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
    >
      {rotulo}
    </button>
  );

  return createPortal(
    <div
      className="rso-raiz fixed inset-0 z-[150] bg-slate-200 overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Relatório de status da obra ${p.codigo}`}
      data-confirmacao="1"
    >
      <div className="rso-nao-imprimir sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-2 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex rounded-lg border overflow-hidden" role="group" aria-label="Versão do relatório">
          {botaoModo("interno", "Interno")}
          {botaoModo("cliente", "Para o cliente")}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-[#2A6377] text-white font-bold text-sm flex items-center gap-1.5"
          >
            <Printer size={15} aria-hidden="true" /> Imprimir / salvar PDF
          </button>
          <button
            ref={botaoFechar}
            type="button"
            onClick={p.onFechar}
            className="px-3 py-2 rounded-lg border bg-white text-slate-600 text-sm flex items-center gap-1.5"
          >
            <X size={15} aria-hidden="true" /> Fechar
          </button>
        </div>
        <p className="w-full text-xs text-slate-500">
          No computador, escolha “Salvar como PDF” como impressora.{" "}
          {p.modo === "cliente"
            ? "Versão para o cliente: sem margem, custos, verba, compras, saúde da obra, pendências internas e anotações do diário."
            : "Versão interna: inclui a margem quando você tem acesso a ela."}
        </p>
      </div>

      <article className="rso-pagina bg-white text-slate-900 text-[12px] leading-snug w-full max-w-[210mm] mx-auto my-4 p-4 sm:p-[12mm] shadow border">
        <header className="flex items-start justify-between gap-3 border-b-2 border-[#2A6377] pb-2 mb-3">
          <div className="min-w-0">
            <p className="text-lg font-black tracking-wide text-[#2A6377]">Kalter</p>
            <h2 className="text-base font-bold break-words">
              Obra {p.codigo} - {p.nome}
            </h2>
            <p className="text-slate-600">Gestor: {p.gestor || "não informado"}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold">Relatório de status</p>
            <p className="text-slate-600">Emitido em {isoParaDataBR(p.emitidoEm)}</p>
            {p.modo === "interno" && <p className="text-[10px] uppercase font-bold text-slate-500">Uso interno</p>}
          </div>
        </header>

        <div className="rso-grade">
          {/* para o cliente nao vao saude, pendencias, fases atrasadas nem diario (decisao do Carlos, 17/11/2026) */}
          {interno && (
          <section className="rso-bloco">
            <Titulo>Saúde da obra</Titulo>
            {p.saude ? (
              <>
                <p className="mb-1">
                  <span className={`inline-block border-2 rounded px-2 py-0.5 font-black ${CLASSE_SELO[p.saude.geral]}`}>
                    {p.saude.rotulo}
                  </span>
                </p>
                <ul className="space-y-0.5">
                  {AREAS_SAUDE.map((a) => {
                    const n = p.saude!.areas[a.campo];
                    return (
                      <li key={a.campo} className="flex justify-between gap-2">
                        <span className="text-slate-600">{a.nome}</span>
                        <span className="font-semibold">
                          <span aria-hidden="true">{MARCA_NIVEL[n]} </span>
                          {ROTULO_NIVEL[n]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <SemDado />
            )}
          </section>
          )}

          <section className="rso-bloco">
            <Titulo>Prazo de entrega</Titulo>
            {p.dataEntrega ? (
              <>
                <Linha rotulo="Entrega prevista" valor={isoParaDataBR(p.dataEntrega)} forte />
                {p.prazo && <Linha rotulo="Situação" valor={p.prazo.atrasada ? `Atrasada (${p.prazo.texto})` : p.prazo.texto} />}
              </>
            ) : (
              <SemDado texto="Sem data de entrega cadastrada." />
            )}
            <div className="mt-2">
              <Titulo>Cronograma</Titulo>
              <Linha rotulo="Fase atual" valor={labelFase(p.faseAtual)} forte />
              <Linha
                rotulo="Próxima fase"
                valor={
                  p.cronograma.proxima
                    ? `${labelFase(p.cronograma.proxima.fase)}${p.cronograma.proxima.fimPrevisto ? ` (até ${isoParaDataBR(p.cronograma.proxima.fimPrevisto)})` : ""}`
                    : "—"
                }
              />
              {interno && (
              <Linha
                rotulo="Fases atrasadas"
                valor={
                  p.cronograma.atrasadas.length
                    ? p.cronograma.atrasadas.map((f) => `${labelFase(f.fase)} (${f.diasAtraso} d)`).join(", ")
                    : "nenhuma"
                }
              />
              )}
            </div>
          </section>

          <section className="rso-bloco">
            <Titulo>Faturado x escopo</Titulo>
            {!p.faturamento ? (
              <SemDado />
            ) : p.faturamento.semEscopo ? (
              <SemDado texto="Escopo de faturamento não cadastrado." />
            ) : (
              <>
                <Linha rotulo="Escopo" valor={formatarMoeda(p.faturamento.escopo)} />
                <Linha rotulo="Faturado" valor={`${formatarMoeda(p.faturamento.faturado)} (${formatarPct(p.faturamento.pct)})`} forte />
                <Linha rotulo="A faturar" valor={formatarMoeda(p.faturamento.aFaturar)} />
                <div className="h-2 mt-1 rounded border border-slate-400 overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-[#2A6377]" style={{ width: `${p.faturamento.pct}%` }} />
                </div>
              </>
            )}
          </section>

          <section className="rso-bloco">
            <Titulo>Recebimento</Titulo>
            {p.recebimento ? (
              <>
                <Linha rotulo="Recebido" valor={formatarMoeda(p.recebimento.recebido)} forte />
                <Linha rotulo="A receber" valor={p.recebimento.aReceber === null ? "—" : formatarMoeda(p.recebimento.aReceber)} />
                <Linha
                  rotulo="Vencido"
                  valor={p.recebimento.vencido > 0 ? `${formatarMoeda(p.recebimento.vencido)} (${p.recebimento.parcelasVencidas} parcela(s))` : "nada vencido"}
                />
                <Linha
                  rotulo="Próxima parcela"
                  valor={
                    p.recebimento.proxima
                      ? `${isoParaDataBR(p.recebimento.proxima.data)} - ${formatarMoeda(p.recebimento.proxima.valor)}`
                      : "nenhuma programada"
                  }
                />
              </>
            ) : (
              <SemDado />
            )}
          </section>

          {margem && (
            <section className="rso-bloco">
              <Titulo>Margem (uso interno)</Titulo>
              <Linha rotulo="Prevista" valor={`${formatarPct(margem.pctPrevista)} (${formatarMoeda(margem.margemPrevista)})`} />
              <Linha rotulo="Atual" valor={`${formatarPct(margem.pctAtual)} (${formatarMoeda(margem.margemAtual)})`} forte />
              <Linha rotulo="Variação" valor={formatarPp(margem.variacaoPp)} />
            </section>
          )}

          {interno && (
          <section className="rso-bloco">
            <Titulo>Principais pendências</Titulo>
            {p.pendencias.length ? (
              <ul className="list-disc pl-4 space-y-0.5">
                {p.pendencias.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : (
              <SemDado texto="Nenhuma pendência vencida." />
            )}
          </section>
          )}
        </div>

        {interno && (
        <section className="rso-bloco mt-3">
          <Titulo>Últimas anotações do diário</Titulo>
          {!p.diario ? (
            <SemDado />
          ) : p.diario.length === 0 ? (
            <SemDado texto="Nenhuma anotação no diário." />
          ) : (
            <ul className="space-y-1">
              {p.diario.map((d) => (
                <li key={d.id}>
                  <span className="font-semibold">
                    {d.data ? isoParaDataBR(d.data) : "Sem data"}
                    {d.autor ? ` · ${d.autor}` : ""}:
                  </span>{" "}
                  {d.texto}
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        <footer className="mt-3 pt-1 border-t text-[10px] text-slate-500">
          Gerado pelo sistema Gestão de Obras Kalter em {isoParaDataBR(p.emitidoEm)}. Valores conforme o sistema nesta data.
        </footer>
      </article>
    </div>,
    document.body,
  );
}
