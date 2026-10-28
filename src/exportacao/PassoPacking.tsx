// Passo 7: Packing List (romaneio no modelo da Kalter). Os materiais vem das SMAs de transferencia do centro de custo da obra;
// pesos, medidas e unidade aduaneira vem do ERP ou de estimativa (em azul ate alguem digitar ou aceitar).
// Tela (29/10/2026, maquete aprovada pelo Carlos): abre no que falta; familias recolhiveis; lista curta so de leitura; ao clicar
// num material abre o painel com os campos em tres grupos (quantidade, peso, medidas). O cabecalho do romaneio foi para Embarque.
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, RefreshCw, X } from "lucide-react";
import { arredondar, num, somar } from "./numeros";
import {
  aceitarSugestoes,
  aplicarFamilia,
  brutoPorPercentual,
  chaveMaterial,
  editarMaterial,
  mesclarSma,
  pendenciasMaterial,
  situacaoMaterial,
  type CampoMaterial,
  type SituacaoMaterial,
} from "./processo";
import { UN_NOME, m3Material, qtdAduaneira } from "./regras";
import type { PropsPasso } from "./passos";
import type { PassoId } from "./navegacao";
import type { Material, Processo, TabelaEstimativas } from "./tipos";
import { Aviso, Botao, CampoNumero, Cartao, Rotulo, Titulo, classeCampo, classeEstimado, dataBR, fmtBR, lerNumero } from "./ui";

type Filtro = "falta" | "conferir" | "todos";

const ETIQUETA: Record<SituacaoMaterial, [string, string]> = {
  falta: ["falta dado", "bg-red-50 text-red-700 border-red-200"],
  conferir: ["conferir", "bg-[#ddebf7] text-[#1f4e9a] border-[#b9d2ee]"],
  pronto: ["pronto", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  fora: ["não embarca", "bg-slate-50 text-slate-500 border-slate-200"],
};

function Etiqueta({ s, texto }: { s: SituacaoMaterial; texto?: string }) {
  const [rot, cor] = ETIQUETA[s];
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${cor}`}>{texto ?? rot}</span>;
}

const kgBR = (v: number) => `${fmtBR(v, v >= 100 ? 0 : 1)} kg`;

interface PropsLinha {
  m: Material;
  aberta: boolean;
  onAbrir: (chave: string) => void;
}

const LinhaMaterial = memo(function LinhaMaterial({ m, aberta, onAbrir }: PropsLinha) {
  const s = situacaoMaterial(m);
  const est = (c: string) => (m.estimado ?? []).includes(c);
  const m3 = m3Material(m);
  return (
    <button
      type="button"
      onClick={() => onAbrir(chaveMaterial(m))}
      aria-expanded={aberta}
      className={`w-full text-left grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[104px_minmax(0,1fr)_92px_88px_72px_96px] gap-x-3 gap-y-0.5 items-center px-4 py-2 border-t border-slate-100 text-[13px] transition ${aberta ? "bg-slate-100" : "hover:bg-slate-50"}`}
    >
      <span className="tabular-nums text-slate-500 text-xs sm:text-[13px] order-1">{m.codigo}</span>
      <span className="order-3 sm:order-2 col-span-2 sm:col-span-1 truncate text-slate-800">{m.descricao}</span>
      <span className="hidden sm:block order-3 text-right tabular-nums text-slate-600">
        {fmtBR(m.quantidade, num(m.quantidade) % 1 ? 2 : 0)} {m.unidade}
      </span>
      <span className={`hidden sm:block order-4 text-right tabular-nums ${est("peso_liq") ? "text-[#1f4e9a] italic" : "text-slate-600"}`}>
        {num(m.peso_liq) > 0 ? kgBR(num(m.peso_liq)) : <span className="text-red-600">—</span>}
      </span>
      <span className={`hidden sm:block order-5 text-right tabular-nums ${["comp", "larg", "alt"].some(est) ? "text-[#1f4e9a] italic" : "text-slate-600"}`}>
        {m3 > 0 ? `${fmtBR(m3, 3)} m³` : <span className="text-red-600">—</span>}
      </span>
      <span className="order-2 sm:order-6 justify-self-end">
        <Etiqueta s={s} />
      </span>
    </button>
  );
});

function Grupo({ titulo, dica, children }: { titulo: string; dica?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      {dica && <p className="text-xs text-[#1f4e9a] mt-0.5">{dica}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">{children}</div>
    </div>
  );
}

function PainelMaterial({
  m,
  onEditar,
  onAceitar,
  onProximo,
  onFechar,
  temProximo,
}: {
  m: Material;
  onEditar: (campo: CampoMaterial, valor: string | number) => void;
  onAceitar: () => void;
  onProximo: () => void;
  onFechar: () => void;
  temProximo: boolean;
}) {
  const est = (c: string) => (m.estimado ?? []).includes(c);
  const falta = pendenciasMaterial(m);
  const dims = num(m.comp) > 0 && num(m.larg) > 0 && num(m.alt) > 0;
  const semVolume = m3Material(m) <= 0;
  const [qe, auto] = qtdAduaneira({ ...m, qtd_estat: "" });
  const ue = (m.un_estat ?? "").toLowerCase();
  const fonte = m.fonte_est ?? "";
  const vermelho = (cond: boolean) => (cond ? "!border-red-400" : "");
  const id = (c: string) => `pk-${chaveMaterial(m)}-${c}`;
  const numero = (
    campo: CampoMaterial,
    rotulo: string,
    opcoes: { placeholder?: string; zero?: boolean; erro?: boolean; desabilitado?: boolean; valor?: unknown } = {},
  ) => (
    <div>
      <Rotulo htmlFor={id(campo)} texto={rotulo} />
      <CampoNumero
        id={id(campo)}
        valor={opcoes.valor ?? m[campo]}
        casas={3}
        zeroVisivel={opcoes.zero}
        estimado={est(campo)}
        desabilitado={opcoes.desabilitado}
        placeholder={opcoes.placeholder}
        classe={`${classeCampo} ${vermelho(Boolean(opcoes.erro))}`}
        onChange={(v) => onEditar(campo, v)}
      />
    </div>
  );
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">
            <span className="tabular-nums">{m.codigo}</span> <span className="font-normal text-slate-600">{m.descricao}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            SMA {m.sma} · NCM {m.ncm || "—"} · solicitada {fmtBR(m.qtd_solic, 2)} {m.unidade}, atendida {fmtBR(m.qtd_atend, 2)}
          </p>
        </div>
        <button type="button" onClick={onFechar} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar o material">
          <X size={18} />
        </button>
      </div>
      {falta.length > 0 && <p className="text-xs text-red-700 font-semibold mt-2">Falta: {falta.join(", ")}.</p>}
      {(m.estimado ?? []).length > 0 && (
        <p className="text-xs text-[#1f4e9a] mt-2">
          Valores em azul são sugestão{fonte ? `: ${fonte}` : ""}. Digite por cima ou aceite.
        </p>
      )}

      <Grupo titulo="Quantidade">
        {numero("quantidade", `A embarcar (${m.unidade || "un"})`, { zero: true })}
        <div>
          <Rotulo htmlFor={id("un_estat")} texto="Unidade aduaneira" />
          <select
            id={id("un_estat")}
            value={ue}
            onChange={(e) => onEditar("un_estat", e.target.value)}
            className={`${classeCampo} ${est("un_estat") ? classeEstimado : ""} ${vermelho(!ue)}`}
          >
            <option value="">Escolha</option>
            {Object.entries(UN_NOME).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
          {!ue && <p className="text-[11px] text-slate-500 mt-1">O NCM deste material não tem unidade no ERP.</p>}
        </div>
        <div>
          <Rotulo htmlFor={id("qtd_estat")} texto="Qtde na unidade aduaneira" />
          <CampoNumero
            id={id("qtd_estat")}
            valor={m.qtd_estat}
            casas={3}
            classe={`${classeCampo} ${vermelho(Boolean(ue) && qtdAduaneira(m)[0] === null)}`}
            placeholder={auto && qe != null ? fmtBR(qe, 3) : "digite"}
            onChange={(v) => onEditar("qtd_estat", v === 0 ? "" : v)}
          />
          <p className="text-[11px] text-slate-500 mt-1">Vazio = calculada (kg = peso líquido; un = peças).</p>
        </div>
      </Grupo>

      <Grupo titulo="Peso (kg, total da linha)">
        {numero("peso_liq", "Líquido", { erro: num(m.peso_liq) <= 0 })}
        <div>
          {numero("peso_bruto", "Bruto", { erro: num(m.peso_bruto) <= 0 || num(m.peso_liq) > num(m.peso_bruto) })}
          <p className="text-[11px] text-slate-500 mt-1">Sugestão: líquido + 1,5%{m.bruto_un_est ? " ou o bruto do fabricante" : ""}.</p>
        </div>
      </Grupo>

      <Grupo titulo="Medidas por unidade e volume" dica={dims ? `m³ = C × L × A × quantidade = ${fmtBR(m3Material(m), 3)} m³` : undefined}>
        {numero("comp", "Comprimento (mm)", { erro: semVolume })}
        {numero("larg", "Largura (mm)", { erro: semVolume })}
        {numero("alt", "Altura (mm)", { erro: semVolume })}
        {numero("m3", "m³ (se não tiver medidas)", { valor: dims ? 0 : m.m3, desabilitado: dims, placeholder: dims ? fmtBR(m3Material(m), 3) : "", erro: semVolume })}
        <div className="col-span-2">
          <Rotulo htmlFor={id("tipo_volume")} texto="Tipo de volume" />
          <input
            id={id("tipo_volume")}
            list="dl-embalagens"
            value={m.tipo_volume ?? ""}
            autoComplete="off"
            onChange={(e) => onEditar("tipo_volume", e.target.value)}
            className={classeCampo}
          />
        </div>
      </Grupo>

      <div className="flex flex-wrap justify-end gap-2 mt-4">
        {(m.estimado ?? []).length > 0 && <Botao onClick={onAceitar}>Aceitar sugestão</Botao>}
        {temProximo && (
          <Botao tipo="primario" onClick={onProximo}>
            Próximo <ChevronRight size={15} />
          </Botao>
        )}
      </div>
    </div>
  );
}

type Dialogo = { modo: "familia"; familia: string; descricao: string } | { modo: "todos" } | null;

function filtroInicial(materiais: Material[]): Filtro {
  const s = materiais.map(situacaoMaterial);
  return s.includes("falta") ? "falta" : s.includes("conferir") ? "conferir" : "todos";
}

export function PassoPacking({
  proc,
  modificar,
  tabela,
  podeReler,
  onReler,
  onIrPara,
}: PropsPasso & {
  modificar: (fn: (p: Processo) => Processo) => void;
  tabela: TabelaEstimativas;
  podeReler: boolean;
  onReler: () => Promise<Material[] | null>;
  onIrPara: (p: PassoId) => void;
}) {
  const materiais = useMemo(() => proc.packing?.materiais ?? [], [proc.packing?.materiais]);
  const [filtro, setFiltro] = useState<Filtro>(() => filtroInicial(materiais));
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [textoTipo, setTextoTipo] = useState("Caixa de madeira");
  const [textoPct, setTextoPct] = useState("");
  const [mensagem, setMensagem] = useState<{ tom: "ok" | "aviso"; texto: string } | null>(null);
  const [relendo, setRelendo] = useState(false);

  const trocarMateriais = useCallback(
    (fn: (ms: Material[]) => Material[]) => modificar((p) => ({ ...p, packing: { ...p.packing!, materiais: fn(p.packing!.materiais) } })),
    [modificar],
  );
  const editar = (chave: string, campo: CampoMaterial, valor: string | number) =>
    trocarMateriais((ms) => ms.map((m) => (chaveMaterial(m) === chave ? editarMaterial(m, campo, valor) : m)));
  const abrir = useCallback((chave: string) => setSel((s) => (s === chave ? null : chave)), []);

  const situacoes = useMemo(() => new Map(materiais.map((m) => [chaveMaterial(m), situacaoMaterial(m)])), [materiais]);
  const situacao = (m: Material) => situacoes.get(chaveMaterial(m));
  const nFalta = materiais.filter((m) => situacao(m) === "falta").length;
  const nConferir = materiais.filter((m) => situacao(m) === "conferir").length;
  const ativos = materiais.filter((m) => num(m.quantidade) > 0);
  const pesoLiq = somar(ativos.map((m) => num(m.peso_liq)));
  const pesoBruto = somar(ativos.map((m) => num(m.peso_bruto)));
  const m3 = somar(ativos.map((m) => m3Material(m)));
  const embarque = (proc.embarque ?? {}) as Record<string, unknown>;
  const cabecalhoVazio = ["nf", "transportadora", "data_saida"].some((c) => !String(embarque[c] ?? "").trim());

  // o material aberto continua na lista mesmo quando deixa de casar com o filtro (ex.: acabou de preencher o que faltava)
  const visivel = (m: Material) => filtro === "todos" || situacao(m) === filtro || chaveMaterial(m) === sel;
  const familias = useMemo(() => {
    const ordem: { familia: string; descricao: string; ms: Material[] }[] = [];
    for (const m of materiais) {
      const f = m.familia ?? "";
      const atual = ordem[ordem.length - 1];
      if (atual && atual.familia === f) atual.ms.push(m);
      else ordem.push({ familia: f, descricao: m.familia_desc || f, ms: [m] });
    }
    return ordem;
  }, [materiais]);

  // "Proximo": o seguinte com a mesma situacao do filtro (no filtro "todos", o seguinte com falta)
  const naFila = materiais.filter((m) => situacao(m) === (filtro === "conferir" ? "conferir" : "falta"));
  const proximo = () => {
    const i = materiais.findIndex((m) => chaveMaterial(m) === sel);
    const seguinte = naFila.find((m) => materiais.indexOf(m) > i) ?? naFila.find((m) => chaveMaterial(m) !== sel);
    if (!seguinte) {
      setSel(null);
      return;
    }
    const chave = chaveMaterial(seguinte);
    setSel(chave);
    if (filtro === "todos") setAbertas((a) => ({ ...a, [seguinte.familia ?? ""]: true }));
    setTimeout(() => document.getElementById(`pk-linha-${chave}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  };

  const reler = async () => {
    setRelendo(true);
    setMensagem(null);
    try {
      const doErp = await onReler();
      if (!doErp) {
        setMensagem({ tom: "aviso", texto: "O robô ainda não leu a lista de SMA desta obra." });
        return;
      }
      const r = mesclarSma(materiais, doErp, tabela);
      trocarMateriais(() => r.materiais);
      modificar((p) => ({ ...p, packing: { ...p.packing!, lido_em: new Date().toISOString().slice(0, 10) } }));
      setMensagem({ tom: "ok", texto: `Lista relida: ${r.materiais.length} materiais (${r.entraram} novos, ${r.sairam} saíram da SMA).` });
    } finally {
      setRelendo(false);
    }
  };

  const confirmarDialogo = () => {
    if (!dialogo) return;
    const pct = textoPct.trim() ? lerNumero(textoPct) : null;
    if (dialogo.modo === "familia") trocarMateriais((ms) => aplicarFamilia(ms, dialogo.familia, textoTipo, pct));
    else if (pct !== null) trocarMateriais((ms) => brutoPorPercentual(ms, pct));
    setDialogo(null);
  };
  const abrirDialogo = (d: NonNullable<Dialogo>) => {
    setTextoTipo("Caixa de madeira");
    setTextoPct(d.modo === "todos" ? "1,5" : "");
    setDialogo(d);
  };
  const aceitarFamilia = (familia: string, q: number) => {
    if (window.confirm(`Aceitar as sugestões (valores em azul) de ${q} material(is) desta família?`))
      trocarMateriais((ms) => ms.map((m) => (m.familia === familia ? aceitarSugestoes(m) : m)));
  };
  const aceitarTodas = () => {
    if (window.confirm(`Aceitar as sugestões (valores em azul) de todos os ${nConferir} materiais? Confira antes os que forem importantes.`))
      trocarMateriais((ms) => ms.map(aceitarSugestoes));
  };

  const chip = (f: Filtro, texto: string, n: number) => (
    <button
      type="button"
      onClick={() => {
        setFiltro(f);
        setSel(null);
      }}
      aria-pressed={filtro === f}
      className={`h-9 px-3 rounded-lg border text-sm font-semibold transition ${filtro === f ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}
    >
      {texto}
      <span className={`ml-1.5 tabular-nums ${filtro === f ? "text-white/80" : "text-slate-400"}`}>{n}</span>
    </button>
  );

  const blocos: ReactNode[] = [];
  familias.forEach(({ familia, descricao, ms }, k) => {
    const vis = ms.filter(visivel);
    if (filtro !== "todos" && !vis.length) return;
    const nf = ms.filter((m) => situacao(m) === "falta").length;
    const nc = ms.filter((m) => situacao(m) === "conferir").length;
    const peso = somar(ms.filter((m) => num(m.quantidade) > 0).map((m) => num(m.peso_liq)));
    const aberta = filtro !== "todos" || Boolean(abertas[familia]);
    blocos.push(
      <section key={`fam-${familia}-${k}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setAbertas((a) => ({ ...a, [familia]: !a[familia] }))}
            disabled={filtro !== "todos"}
            aria-expanded={aberta}
            className="flex items-center gap-2 min-w-0 flex-1 text-left disabled:cursor-default"
          >
            {filtro === "todos" && (aberta ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />)}
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-800 truncate">{descricao}</span>
              <span className="block text-xs text-slate-500">
                família {familia} · {ms.length} materiais · {kgBR(peso)}
              </span>
            </span>
          </button>
          {nf ? <Etiqueta s="falta" texto={`${nf} com falta`} /> : nc ? <Etiqueta s="conferir" texto={`${nc} a conferir`} /> : <Etiqueta s="pronto" texto="completo" />}
          <span className="flex gap-1.5">
            {nc > 0 && (
              <Botao tamanho="pequeno" onClick={() => aceitarFamilia(familia, nc)}>
                Aceitar sugestões
              </Botao>
            )}
            <Botao tamanho="pequeno" onClick={() => abrirDialogo({ modo: "familia", familia, descricao })} titulo="Tipo de volume e peso bruto para todos os materiais da família">
              Aplicar à família…
            </Botao>
          </span>
        </div>
        {aberta &&
          (filtro === "todos" ? ms : vis).map((m) => {
            const chave = chaveMaterial(m);
            return (
              <div key={chave} id={`pk-linha-${chave}`} className="scroll-mt-4">
                <LinhaMaterial m={m} aberta={sel === chave} onAbrir={abrir} />
                {sel === chave && (
                  <PainelMaterial
                    m={m}
                    onEditar={(campo, valor) => editar(chave, campo, valor)}
                    onAceitar={() => trocarMateriais((xs) => xs.map((x) => (chaveMaterial(x) === chave ? aceitarSugestoes(x) : x)))}
                    onProximo={proximo}
                    onFechar={() => setSel(null)}
                    temProximo={naFila.some((x) => chaveMaterial(x) !== chave)}
                  />
                )}
              </div>
            );
          })}
      </section>,
    );
  });

  return (
    <div className="space-y-4">
      <Titulo
        titulo="Packing List"
        descricao={`Materiais das SMAs de transferência do centro de custo ${proc.packing?.cc ?? ""} (lido em ${dataBR(proc.packing?.lido_em)}; SMAs canceladas ficam fora).`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Cartao rotulo="Materiais" valor={ativos.length} sub={`de ${materiais.length} na SMA`} />
        <Cartao rotulo="Peso líquido" valor={kgBR(pesoLiq)} />
        <Cartao rotulo="Peso bruto" valor={kgBR(pesoBruto)} />
        <Cartao rotulo="Volume" valor={`${fmtBR(arredondar(m3, 3), 2)} m³`} />
      </div>

      {nFalta > 0 ? (
        <Aviso tom="erro">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              <b>
                {nFalta} {nFalta === 1 ? "material precisa" : "materiais precisam"} de você
              </b>{" "}
              antes de gerar o final. O resto já tem valor.
            </span>
          </span>
        </Aviso>
      ) : materiais.length ? (
        <Aviso tom="ok">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Packing List completa.{nConferir ? ` ${nConferir} sugestões (em azul) ainda podem ser conferidas.` : ""}</span>
          </span>
        </Aviso>
      ) : null}

      {cabecalhoVazio && (
        <Aviso
          tom="info"
          acao={
            <Botao tamanho="pequeno" onClick={() => onIrPara("embarque")}>
              Ir para Embarque
            </Botao>
          }
        >
          NF, transportadora, placa e datas do romaneio ficam em <b>Embarque › Dados do carregamento</b> (preencher na saída).
        </Aviso>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {chip("falta", "Precisam de você", nFalta)}
        {chip("conferir", "Sugestões a conferir", nConferir)}
        {chip("todos", "Todos", materiais.length)}
        <span className="flex-1" />
        <span className="text-xs text-slate-500">
          <span className={`px-1.5 py-0.5 rounded ${classeEstimado}`}>azul</span> = sugestão (catálogo ou cálculo)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Botao
          tamanho="pequeno"
          onClick={() => void reler()}
          desabilitado={!podeReler || relendo}
          titulo={podeReler ? "Busca a lista da SMA que o robô leu no ERP e mantém o que já foi digitado" : "O robô ainda não leu o ERP desta obra"}
        >
          <RefreshCw size={13} className={relendo ? "animate-spin" : ""} /> Reler lista da SMA
        </Botao>
        <Botao tamanho="pequeno" onClick={() => abrirDialogo({ modo: "todos" })}>
          Peso bruto = líquido + % (todos)
        </Botao>
        {nConferir > 0 && (
          <Botao tamanho="pequeno" onClick={aceitarTodas}>
            Aceitar todas as sugestões
          </Botao>
        )}
      </div>
      {mensagem && <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>}

      <div className="space-y-3">
        {blocos.length ? (
          blocos
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            {!materiais.length
              ? "Nenhum material em SMA de transferência para este centro de custo."
              : filtro === "falta"
                ? "Nenhum material com falta de dado."
                : "Nenhuma sugestão para conferir."}
          </p>
        )}
      </div>

      {dialogo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDialogo(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-bold text-slate-800">{dialogo.modo === "familia" ? `Aplicar à família ${dialogo.descricao}` : "Peso bruto = líquido + %"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {dialogo.modo === "familia"
                  ? "Preenche o tipo de volume e/ou o percentual do peso bruto de todos os materiais do conjunto."
                  : "Vale para todos os materiais com peso líquido e sem peso bruto digitado (inclusive os estimados em azul, que passam a valer como informados)."}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {dialogo.modo === "familia" && (
                <div>
                  <label htmlFor="dlg-tipo" className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipo de volume (vazio = não mudar)
                  </label>
                  <input id="dlg-tipo" list="dl-embalagens" value={textoTipo} onChange={(e) => setTextoTipo(e.target.value)} className={classeCampo} />
                </div>
              )}
              <div>
                <label htmlFor="dlg-pct" className="block text-xs font-semibold text-slate-600 mb-1">
                  Peso bruto = peso líquido + quantos % {dialogo.modo === "familia" ? "(vazio = não mudar)" : ""}
                </label>
                <input id="dlg-pct" inputMode="decimal" value={textoPct} onChange={(e) => setTextoPct(e.target.value)} placeholder="1,5" className={classeCampo} />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
              <Botao onClick={() => setDialogo(null)}>Cancelar</Botao>
              <Botao tipo="primario" onClick={confirmarDialogo}>
                Aplicar
              </Botao>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
