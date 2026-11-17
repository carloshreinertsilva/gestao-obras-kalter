import { useMemo, type CSSProperties, type ReactNode } from "react";
import {
  COR_SITUACAO,
  ORDEM_SITUACOES,
  ROTULO_SITUACAO,
  descreverPrevisto,
  descreverReal,
  formatarDataBR,
  geometria,
  montarEscala,
  posicaoData,
  type LinhaGantt,
} from "./calculoGantt";

// Cronograma em barras no tempo (Gantt), desenhado com HTML/CSS (sem biblioteca).
// Generico: a aba Cronograma passa as fases da obra; o Painel passa uma linha por obra (GanttCarteira).
// - barra clara = previsto; barra cheia logo abaixo = realizado (ate hoje se em andamento)
// - linha vertical = hoje; cor E texto da situacao em cada linha (nunca so cor)
// - quando nao cabe, rola de lado DENTRO do grafico (a coluna de nomes fica parada)
// As contas (escala, posicoes, textos) ficam em calculoGantt.ts.

const LARGURA_ROTULO = 148; // px: coluna de nomes fixa a esquerda (tambem usada no deslocamento das linhas de grade)

interface Props {
  linhas: LinhaGantt[];
  hojeISO: string;
  /** nome do grafico para leitores de tela ("Cronograma da obra 1497") */
  titulo: string;
  /** nome da barra prevista no texto acessivel ("previsto", "obra prevista") */
  nomePrevisto?: string;
  /** clicar na linha (ex.: abrir a obra); o nome vira botao */
  onClicarLinha?: (id: string) => void;
  rotuloClicar?: (linha: LinhaGantt) => string;
  /** itens extras da legenda (ex.: o que e o marco no cronograma da carteira) */
  legendaExtra?: ReactNode;
  /** false: nao mostra "Realizado" na legenda (carteira so tem previsto) */
  temRealizado?: boolean;
}

export default function GraficoGantt({
  linhas,
  hojeISO,
  titulo,
  nomePrevisto = "previsto",
  onClicarLinha,
  rotuloClicar,
  legendaExtra,
  temRealizado = true,
}: Props) {
  const escala = useMemo(() => montarEscala(linhas, hojeISO), [linhas, hojeISO]);
  const situacoesPresentes = useMemo(() => {
    const s = new Set(linhas.map((l) => l.situacao));
    linhas.forEach((l) => l.marcos.forEach((m) => s.add(m.situacao)));
    // as quatro principais sempre aparecem; cancelada so se existir
    return ORDEM_SITUACOES.filter((x) => x !== "cancelada" || s.has(x));
  }, [linhas]);

  const legenda = (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 mb-3" aria-label="Legenda do gráfico">
      {situacoesPresentes.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: COR_SITUACAO[s] }} aria-hidden="true" />
          {ROTULO_SITUACAO[s]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="w-5 h-2.5 rounded-sm inline-block border border-slate-400 bg-slate-300/40" aria-hidden="true" />
        Previsto
      </li>
      {temRealizado && (
        <li className="flex items-center gap-1.5">
          <span className="w-5 h-1.5 rounded-sm inline-block bg-slate-500" aria-hidden="true" />
          Realizado
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <span className="h-3 border-l-2 border-dashed border-[#2A6377] inline-block" aria-hidden="true" />
        Hoje
      </li>
      {legendaExtra}
    </ul>
  );

  if (!escala) {
    return (
      <div>
        <p className="text-sm text-slate-500">Nenhuma data cadastrada para montar o gráfico.</p>
        <ListaSemDatas linhas={linhas} />
      </div>
    );
  }

  const larguraTotal = LARGURA_ROTULO + escala.larguraMinimaPx;

  return (
    <div className="min-w-0">
      {legenda}
      <div
        className="overflow-x-auto max-w-full border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]/40"
        role="region"
        aria-label={`${titulo} em barras no tempo (role para o lado para ver todo o período)`}
        tabIndex={0}
      >
        <div className="relative" style={{ minWidth: larguraTotal }}>
          {/* grade de meses e linha de hoje: atras das barras, so na area do tempo */}
          <div className="absolute top-0 bottom-0 right-0 pointer-events-none" style={{ left: LARGURA_ROTULO }} aria-hidden="true">
            {escala.semanas.map((s) => (
              <div key={`s${s.iso}`} className="absolute top-8 bottom-0 border-l border-slate-100" style={{ left: `${s.posicao}%` }} />
            ))}
            {escala.meses.map((m) => (
              <div key={`m${m.iso}`} className="absolute top-0 bottom-0 border-l border-slate-200" style={{ left: `${m.posicao}%` }} />
            ))}
            {escala.posicaoHoje !== null && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed border-[#2A6377] z-[15]"
                style={{ left: `${escala.posicaoHoje}%` }}
                title={`Hoje, ${formatarDataBR(hojeISO)}`}
              >
                <span className="absolute -top-0 left-1 text-[10px] font-bold text-[#2A6377] bg-white/90 px-0.5 rounded">Hoje</span>
              </div>
            )}
          </div>

          {/* cabecalho: meses (e semanas no periodo curto) */}
          <div className="flex border-b border-slate-200 bg-slate-50/80" aria-hidden="true">
            <div
              className="sticky left-0 z-20 bg-slate-50 shrink-0 px-2 py-1.5 text-[11px] font-bold uppercase text-slate-500 border-r border-slate-200"
              style={{ width: LARGURA_ROTULO }}
            >
              {escala.semanas.length ? "Semana" : "Mês"}
            </div>
            <div className="relative flex-1 h-8">
              {escala.meses.map((m) => (
                <span key={m.iso} className="absolute top-0.5 pl-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap" style={{ left: `${m.posicao}%` }}>
                  {m.rotulo}
                </span>
              ))}
              {escala.semanas.map((s) => (
                <span key={s.iso} className="absolute bottom-0 pl-1 text-[10px] text-slate-400 whitespace-nowrap" style={{ left: `${s.posicao}%` }}>
                  {s.rotulo}
                </span>
              ))}
            </div>
          </div>

          <ul aria-label={titulo}>
            {linhas.map((l) => (
              <LinhaGrafico
                key={l.id}
                linha={l}
                escala={escala}
                nomePrevisto={nomePrevisto}
                onClicar={onClicarLinha ? () => onClicarLinha(l.id) : undefined}
                rotuloClicar={rotuloClicar?.(l)}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LinhaGrafico({
  linha: l,
  escala,
  nomePrevisto,
  onClicar,
  rotuloClicar,
}: {
  linha: LinhaGantt;
  escala: NonNullable<ReturnType<typeof montarEscala>>;
  nomePrevisto: string;
  onClicar?: () => void;
  rotuloClicar?: string;
}) {
  const cor = COR_SITUACAO[l.situacao];
  const semDatas = !l.previsto && !l.real && !l.marcos.length;
  const nome = (
    <>
      <span className="block font-semibold text-slate-800 text-xs truncate">{l.rotulo}</span>
      {l.subtitulo && <span className="block text-[11px] text-slate-500 truncate">{l.subtitulo}</span>}
      <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: cor }}>
        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: cor }} aria-hidden="true" />
        {ROTULO_SITUACAO[l.situacao]}
      </span>
    </>
  );
  const dica = [l.rotulo, l.subtitulo, l.complemento].filter(Boolean).join(" — ");

  return (
    <li
      className={`flex border-b border-slate-100 last:border-b-0 ${onClicar ? "cursor-pointer hover:bg-slate-50/70" : ""}`}
      onClick={onClicar}
    >
      <div
        className="sticky left-0 z-20 bg-white shrink-0 px-2 py-1.5 border-r border-slate-200 min-w-0"
        style={{ width: LARGURA_ROTULO }}
        title={dica}
      >
        {onClicar ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClicar();
            }}
            className="w-full text-left min-w-0 rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A6377]/40"
            aria-label={rotuloClicar}
          >
            {nome}
          </button>
        ) : (
          nome
        )}
      </div>
      <div className="flex-1 min-w-0">
      <div className={`relative ${l.real || !l.complemento ? "h-12" : "h-8"}`}>
        {semDatas && <span className="absolute left-2 top-3 text-xs italic text-slate-400">sem datas</span>}
        {l.previsto && (
          <Barra
            esquerda={geometria(l.previsto, escala).esquerda}
            largura={geometria(l.previsto, escala).largura}
            className="top-2 h-4 border"
            estilo={{ backgroundColor: `${cor}38`, borderColor: cor }}
            rotulo={descreverPrevisto(l, nomePrevisto)}
          />
        )}
        {l.destaque && (
          <Barra
            esquerda={geometria(l.destaque, escala).esquerda}
            largura={geometria(l.destaque, escala).largura}
            className="top-2 h-4 ring-2 ring-white"
            estilo={{ backgroundColor: COR_SITUACAO[l.destaque.situacao] }}
            rotulo={`${l.destaque.rotulo}: ${formatarDataBR(l.destaque.inicio)} a ${formatarDataBR(l.destaque.fim)}. Situação: ${ROTULO_SITUACAO[l.destaque.situacao]}`}
          />
        )}
        {l.marcos.map((m, i) => (
          <span
            key={`${m.iso}-${i}`}
            role="img"
            aria-label={`${m.rotulo}: ${formatarDataBR(m.iso)} (${ROTULO_SITUACAO[m.situacao]})`}
            title={`${m.rotulo}: ${formatarDataBR(m.iso)} (${ROTULO_SITUACAO[m.situacao]})`}
            className="absolute top-3 w-2.5 h-2.5 rotate-45 border border-white z-[11]"
            style={{ left: `calc(${posicaoData(m.iso, escala)}% - 5px)`, backgroundColor: COR_SITUACAO[m.situacao] }}
          />
        ))}
        {l.real && (
          <Barra
            esquerda={geometria(l.real, escala).esquerda}
            largura={geometria(l.real, escala).largura}
            className={`top-7 h-2.5 ${l.realEmAberto ? "rounded-r-none" : ""}`}
            estilo={{ backgroundColor: cor }}
            rotulo={descreverReal(l)}
          />
        )}
      </div>
      {l.complemento && (
        // texto preso a esquerda da area do tempo: continua legivel enquanto o grafico rola de lado
        <div className="pb-1.5">
          <span className="sticky inline-block text-[11px] text-slate-600 whitespace-nowrap px-1" style={{ left: LARGURA_ROTULO + 4 }}>
            {l.complemento}
          </span>
        </div>
      )}
      </div>
    </li>
  );
}

function Barra({
  esquerda,
  largura,
  className,
  estilo,
  rotulo,
}: {
  esquerda: number;
  largura: number;
  className: string;
  estilo: CSSProperties;
  rotulo: string;
}) {
  return (
    <span
      role="img"
      aria-label={rotulo}
      title={rotulo}
      className={`absolute rounded z-10 ${className}`}
      // largura minima de 4px: fase de um dia continua visivel
      style={{ left: `${esquerda}%`, width: `max(${largura}%, 4px)`, ...estilo }}
    />
  );
}

function ListaSemDatas({ linhas }: { linhas: LinhaGantt[] }) {
  if (!linhas.length) return null;
  return (
    <ul className="mt-2 text-sm text-slate-600 space-y-1">
      {linhas.map((l) => (
        <li key={l.id}>
          <span className="font-semibold">{l.rotulo}</span> — sem datas
        </li>
      ))}
    </ul>
  );
}
