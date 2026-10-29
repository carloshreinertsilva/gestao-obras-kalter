// Aba "Exportacao" da obra: assistente em 11 passos que monta a Proforma, a Commercial Invoice, a Packing List e os dados do
// Certificado de Origem. So admin, coordenador e fiscal veem. O ERP e so lido (pelo robo, que grava o instantaneo em
// exportacao_erp); o rascunho fica em exportacao_processos (autosave com pausa de 2 s, so quando o conteudo muda); a aprovacao
// vale por hash calculado no banco; o Excel e gerado pelo robo (fila exportacao_documentos).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, Ship } from "lucide-react";
import { supabase } from "./supabase";
import type { Usuario } from "./types";
import { aplicarEstimativas, tabelaDeLinhas } from "./exportacao/estimativas";
import { ETAPAS, PASSOS, PASSOS_DE_PREENCHER, proximaPendencia, situacoesDosPassos, type PassoId, type SituacaoPasso } from "./exportacao/navegacao";
import { PassoCertificado, PassoComercial, PassoEmbarque, PassoErp, PassoExportador, PassoImportador } from "./exportacao/passos";
import { PassoDocumentos } from "./exportacao/PassoDocumentos";
import { PassoItens } from "./exportacao/PassoItens";
import { PassoPacking } from "./exportacao/PassoPacking";
import { PassoPrevia } from "./exportacao/PassoPrevia";
import { PassoRevisao } from "./exportacao/PassoRevisao";
import { definir, processoInicial, type ConfigExportacao, type LinhaErp } from "./exportacao/processo";
import { revisar } from "./exportacao/regras";
import { soDigitos } from "./exportacao/numeros";
import type { Aprovacao, DocumentoLista, Material, Processo, TabelaEstimativas } from "./exportacao/tipos";
import { Aviso, Botao, ListasDeSugestoes } from "./exportacao/ui";

const COLUNAS_DOCUMENTO = "id, tipo, situacao, erro, nome_arquivo, tamanho, nome_pedido_por, created_at, gerado_em, hash_dados";
const PERFIS_EXPORTACAO = ["admin", "coordenador", "fiscal"];
const msgErro = (e: unknown) => String((e as { message?: string })?.message || e || "Erro").replace(/^.*?ERROR:\s*/, "");

interface Mensagem {
  tom: "ok" | "aviso" | "erro";
  texto: string;
}

/** Situacao do passo na navegacao: nº de erros (vermelho), nº de avisos (ambar), ✓, "opcional" ou nada. */
function MarcaPasso({ s, ativo }: { s: SituacaoPasso; ativo: boolean }) {
  if (s.tipo === "erro")
    return <span className={`min-w-5 h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center ${ativo ? "bg-white text-red-600" : "bg-red-50 text-red-600"}`} title={`${s.n} erro(s) a corrigir`}>{s.n}</span>;
  if (s.tipo === "aviso")
    return <span className={`text-[11px] font-semibold ${ativo ? "text-amber-200" : "text-amber-600"}`} title={`${s.n} aviso(s); não impedem o final`}>{s.n} aviso{s.n === 1 ? "" : "s"}</span>;
  if (s.tipo === "opcional") return <span className={`text-[11px] ${ativo ? "text-white/70" : "text-slate-400"}`}>opcional</span>;
  if (s.tipo === "ok")
    return s.texto ? (
      <span className={`text-[11px] font-semibold ${ativo ? "text-emerald-200" : "text-emerald-600"}`}>{s.texto}</span>
    ) : (
      <Check size={15} className={ativo ? "text-emerald-200" : "text-emerald-600"} aria-label="sem pendência" />
    );
  return null;
}

export default function Exportacao({ obra, usuario }: { obra: { id: string; codigo_externo?: string; nome?: string }; usuario: Usuario | null }) {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [linhaErp, setLinhaErp] = useState<LinhaErp | null>(null);
  const [config, setConfig] = useState<ConfigExportacao | null>(null);
  const [tabela, setTabela] = useState<TabelaEstimativas>({});
  const [proc, setProc] = useState<Processo | null>(null);
  const [hash, setHash] = useState("");
  const [aprovacao, setAprovacao] = useState<Aprovacao | null>(null);
  const [docs, setDocs] = useState<DocumentoLista[]>([]);
  const [passo, setPasso] = useState<PassoId>("erp");
  // no celular os passos ficam numa linha que rola de lado: traz o passo atual para a vista
  const listaPassos = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lista = listaPassos.current;
    const botao = lista?.querySelector<HTMLElement>('[aria-current="step"]');
    // rolagem direta: a suave e cancelada pela troca de tela que vem junto
    if (lista && botao && lista.scrollWidth > lista.clientWidth) lista.scrollLeft = botao.offsetLeft - lista.clientWidth / 2 + botao.clientWidth / 2;
  }, [passo]);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [atualizandoErp, setAtualizandoErp] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [ncmCadastro, setNcmCadastro] = useState<Set<string> | null>(null);

  const procRef = useRef<Processo | null>(null);
  const hashRef = useRef("");
  const ultimoSalvo = useRef(""); // JSON do que esta no banco (carregado ou ultimo enviado)
  const fila = useRef<Promise<unknown>>(Promise.resolve());

  const podeAprovar = PERFIS_EXPORTACAO.includes(String(usuario?.perfil || ""));

  // ------------------------------------------------------------------ carga
  const carregarDocs = useCallback(async () => {
    const { data } = await supabase.from("exportacao_documentos").select(COLUNAS_DOCUMENTO).eq("id_obra", obra.id).order("created_at", { ascending: false }).limit(20);
    setDocs((data ?? []) as DocumentoLista[]);
  }, [obra.id]);

  const lerErp = useCallback(async (): Promise<LinhaErp | null> => {
    const { data, error } = await supabase.from("exportacao_erp").select("nr_pedido, pedido, materiais, exportador_erp, lido_em").eq("id_obra", obra.id).maybeSingle();
    if (error) throw error;
    setLinhaErp((data as LinhaErp | null) ?? null);
    return (data as LinhaErp | null) ?? null;
  }, [obra.id]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga("");
    try {
      const [p, e, c, est, d] = await Promise.all([
        supabase.from("exportacao_processos").select("dados, hash_dados, aprovacao, atualizado_em").eq("id_obra", obra.id).maybeSingle(),
        supabase.from("exportacao_erp").select("nr_pedido, pedido, materiais, exportador_erp, lido_em").eq("id_obra", obra.id).maybeSingle(),
        supabase.from("exportacao_config").select("exportador, banco, local_embarque").eq("id", 1).maybeSingle(),
        supabase.from("exportacao_estimativas").select("codigo_material, peso, bruto, comp, larg, alt, fonte"),
        supabase.from("exportacao_documentos").select(COLUNAS_DOCUMENTO).eq("id_obra", obra.id).order("created_at", { ascending: false }).limit(20),
      ]);
      const falha = [p, e, c, est, d].find((r) => r.error)?.error;
      if (falha) throw falha;
      const tab = tabelaDeLinhas(est.data ?? []);
      setTabela(tab);
      setConfig((c.data as ConfigExportacao | null) ?? null);
      setLinhaErp((e.data as LinhaErp | null) ?? null);
      setDocs((d.data ?? []) as DocumentoLista[]);
      if (p.data) {
        const dados = p.data.dados as Processo;
        ultimoSalvo.current = JSON.stringify(dados);
        // as estimativas rodam de novo ao abrir (so preenchem o que esta vazio ou ainda era estimado)
        const normal = dados.packing ? { ...dados, packing: { ...dados.packing, materiais: aplicarEstimativas(dados.packing.materiais ?? [], tab) } } : dados;
        procRef.current = normal;
        hashRef.current = p.data.hash_dados as string;
        setProc(normal);
        setHash(p.data.hash_dados as string);
        setAprovacao((p.data.aprovacao as Aprovacao | null) ?? null);
        setSalvoEm(p.data.atualizado_em as string);
      }
    } catch (err) {
      setErroCarga(msgErro(err));
    } finally {
      setCarregando(false);
    }
  }, [obra.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // ------------------------------------------------------------------ edicao e autosave
  const modificar = useCallback((fn: (p: Processo) => Processo) => {
    setProc((p) => {
      if (!p) return p;
      const novo = fn(p);
      procRef.current = novo;
      return novo;
    });
  }, []);
  const atualizar = useCallback((caminho: string, valor: unknown) => modificar((p) => definir(p, caminho, valor)), [modificar]);

  const salvarUmaVez = useCallback(async (): Promise<string | null> => {
    const atual = procRef.current;
    if (!atual) return hashRef.current || null;
    const json = JSON.stringify(atual);
    if (json === ultimoSalvo.current && hashRef.current) return hashRef.current;
    setSalvando(true);
    const { data, error } = await supabase.rpc("exportacao_salvar", { p_id_obra: obra.id, p_dados: atual });
    setSalvando(false);
    if (error) {
      setErroSalvar(msgErro(error));
      return null;
    }
    const linha = (data as { hash_dados: string; atualizado_em: string }[])[0];
    ultimoSalvo.current = json;
    hashRef.current = linha.hash_dados;
    setHash(linha.hash_dados);
    setSalvoEm(linha.atualizado_em);
    setErroSalvar("");
    setSujo(JSON.stringify(procRef.current) !== json);
    return linha.hash_dados;
  }, [obra.id]);

  /** Salva o que estiver pendente (uma gravacao por vez) e devolve o hash do que ficou no banco. */
  const salvarAgora = useCallback((): Promise<string | null> => {
    const p = fila.current.then(salvarUmaVez);
    fila.current = p.catch(() => null);
    return p;
  }, [salvarUmaVez]);
  const salvarAgoraRef = useRef(salvarAgora);
  useEffect(() => {
    salvarAgoraRef.current = salvarAgora;
  }, [salvarAgora]);

  useEffect(() => {
    if (!proc) return;
    if (JSON.stringify(proc) === ultimoSalvo.current) {
      setSujo(false);
      return;
    }
    setSujo(true);
    const t = setTimeout(() => void salvarAgora(), 2000);
    return () => clearTimeout(t);
  }, [proc, salvarAgora]);

  // sair da aba ou fechar a pagina com alteracao pendente: tenta salvar e avisa
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);
  useEffect(
    () => () => {
      if (procRef.current && JSON.stringify(procRef.current) !== ultimoSalvo.current) void salvarAgoraRef.current();
    },
    [],
  );

  // ------------------------------------------------------------------ revisao
  const chaveNcm = useMemo(
    () => [...new Set((proc?.itens ?? []).map((i) => soDigitos(i.ncm)).filter((n) => n.length === 8))].sort().join(","),
    [proc?.itens],
  );
  useEffect(() => {
    if (!chaveNcm) {
      setNcmCadastro(new Set());
      return;
    }
    let vivo = true;
    void supabase
      .from("exportacao_ncm")
      .select("codigo")
      .in("codigo", chaveNcm.split(",").map(Number))
      .then(({ data, error }) => {
        if (vivo) setNcmCadastro(error ? null : new Set((data ?? []).map((r: { codigo: number }) => String(r.codigo).padStart(8, "0"))));
      });
    return () => {
      vivo = false;
    };
  }, [chaveNcm]);

  const erp = linhaErp?.pedido.erp ?? {};
  const revisao = useMemo(() => (proc ? revisar(proc, erp, ncmCadastro) : null), [proc, erp, ncmCadastro]);
  const aprovado = Boolean(aprovacao) && aprovacao?.hash === hash && !sujo;
  const finalGerado = docs.some((d) => d.tipo === "final" && d.situacao === "gerado");
  const situacoes = useMemo(
    () => situacoesDosPassos(revisao?.ajustes ?? [], { certificado: Boolean(proc?.certificado?.emitir), aprovado, finalGerado }),
    [revisao, proc?.certificado?.emitir, aprovado, finalGerado],
  );

  // ------------------------------------------------------------------ documentos
  const temPendente = docs.some((d) => d.situacao === "pendente");
  const inicioEspera = useRef(0);
  useEffect(() => {
    if (!temPendente) {
      inicioEspera.current = 0;
      return;
    }
    if (!inicioEspera.current) inicioEspera.current = Date.now();
    const t = setInterval(() => {
      if (Date.now() - inicioEspera.current > 10 * 60 * 1000) return; // depois de 10 min para de perguntar
      void carregarDocs();
    }, 15000);
    return () => clearInterval(t);
  }, [temPendente, carregarDocs]);

  const pedirDocumento = async (tipo: "rascunho" | "final") => {
    setOcupado(true);
    setMensagem(null);
    try {
      const h = await salvarAgora();
      if (!h) throw new Error("Não foi possível salvar o processo antes de pedir o documento.");
      const { error } = await supabase.rpc("exportacao_pedir_documento", { p_id_obra: obra.id, p_tipo: tipo });
      if (error) throw error;
      await carregarDocs();
      setMensagem({ tom: "ok", texto: `Pedido enviado ao robô: ${tipo === "final" ? "os documentos finais saem" : "o rascunho sai"} em até 5 minutos.` });
    } catch (e) {
      setMensagem({ tom: "erro", texto: msgErro(e) });
    } finally {
      setOcupado(false);
    }
  };

  const aprovar = async () => {
    if (!window.confirm("Aprovar os documentos como estão na pré-visualização?")) return;
    setOcupado(true);
    setMensagem(null);
    try {
      const h = await salvarAgora();
      if (!h) throw new Error("Não foi possível salvar o processo antes de aprovar.");
      const { error } = await supabase.rpc("exportacao_aprovar", { p_id_obra: obra.id, p_hash: h });
      if (error) throw error;
      const { data } = await supabase.from("exportacao_processos").select("aprovacao, hash_dados").eq("id_obra", obra.id).maybeSingle();
      if (data) {
        setAprovacao((data.aprovacao as Aprovacao | null) ?? null);
        hashRef.current = data.hash_dados as string;
        setHash(data.hash_dados as string);
      }
      setMensagem({ tom: "ok", texto: "Documentos aprovados. Já dá para gerar os finais." });
    } catch (e) {
      setMensagem({ tom: "erro", texto: msgErro(e) });
    } finally {
      setOcupado(false);
    }
  };

  const baixar = async (d: DocumentoLista) => {
    setMensagem(null);
    const { data, error } = await supabase.rpc("exportacao_baixar", { p_id: d.id });
    if (error) {
      setMensagem({ tom: "erro", texto: msgErro(error) });
      return;
    }
    const linha = (data as { nome_arquivo: string; conteudo_base64: string }[])[0];
    const bin = atob(linha.conteudo_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = linha.nome_arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const atualizarErp = async () => {
    setAtualizandoErp(true);
    try {
      await lerErp();
    } catch (e) {
      setMensagem({ tom: "erro", texto: msgErro(e) });
    } finally {
      setAtualizandoErp(false);
    }
  };
  const reler = async (): Promise<Material[] | null> => (await lerErp())?.materiais ?? null;

  const iniciar = async () => {
    if (!linhaErp) return;
    const novo = processoInicial(linhaErp, config, tabela);
    procRef.current = novo;
    setProc(novo);
    setPasso("erp");
    await salvarAgora();
  };

  // "Corrigir" da revisao: abre o passo e poe o cursor no campo (depois que a tela do passo desenhou)
  const [foco, setFoco] = useState<{ campo: string } | null>(null);
  useEffect(() => {
    if (!foco) return;
    const t = setTimeout(() => {
      const el = document.getElementById(foco.campo);
      if (el) {
        el.scrollIntoView({ block: "center" });
        el.focus({ preventScroll: true });
      }
      setFoco(null);
    }, 60);
    return () => clearTimeout(t);
  }, [foco, passo]);

  const ir = (p: PassoId, campo?: string) => {
    setPasso(p);
    if (campo) setFoco({ campo });
    else window.scrollTo({ top: 0 });
  };

  // ------------------------------------------------------------------ tela
  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-10 justify-center">
        <Loader2 className="animate-spin" size={18} /> Carregando a exportação…
      </div>
    );
  }
  if (erroCarga) {
    return (
      <Aviso tom="erro" acao={<Botao tamanho="pequeno" onClick={() => void carregar()}>Tentar de novo</Botao>}>
        Não foi possível carregar a exportação: {erroCarga}
      </Aviso>
    );
  }

  if (!proc || !revisao) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Ship size={20} className="text-[#2A6377]" />
          <h3 className="text-lg font-bold text-slate-800">Exportação · obra {obra.codigo_externo}</h3>
        </div>
        {!linhaErp ? (
          <Aviso tom="aviso" acao={<Botao tamanho="pequeno" onClick={() => void carregar()}>Verificar de novo</Botao>}>
            O robô ainda não leu o pedido desta obra no ERP (até 5 minutos). Quando ele ler, o processo de exportação pode ser iniciado aqui.
          </Aviso>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-sm text-slate-600">
              Pedido <b>{linhaErp.nr_pedido}</b> lido do ERP: {linhaErp.pedido.erp.itens?.length ?? 0} item(ns) e {linhaErp.materiais.length} materiais de SMA de transferência para a Packing List.
              O processo reúne Proforma Invoice, Commercial Invoice, Packing List e, se precisar, os dados do Certificado de Origem.
            </p>
            <Botao tipo="primario" onClick={() => void iniciar()}>
              Iniciar processo de exportação
            </Botao>
          </div>
        )}
        <ListasDeSugestoes />
      </div>
    );
  }

  const indice = PASSOS.findIndex((p) => p.id === passo);
  const prontos = PASSOS_DE_PREENCHER.filter((p) => situacoes[p].tipo !== "erro").length;
  const pendente = proximaPendencia(situacoes, passo);
  const rascunho = docs.find((d) => d.tipo === "rascunho") ?? null;
  const status = erroSalvar ? (
    <span className="text-red-600 font-semibold" role="alert">NÃO SALVOU: {erroSalvar}</span>
  ) : salvando ? (
    <span className="text-slate-500">Salvando…</span>
  ) : sujo ? (
    <span className="text-amber-700">Alterações ainda não salvas</span>
  ) : salvoEm ? (
    <span className="text-slate-500">Rascunho salvo {new Date(salvoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
  ) : null;

  const base = { proc, atualizar };
  return (
    <div className="space-y-4">
      <ListasDeSugestoes />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Ship size={20} className="text-[#2A6377]" /> Exportação · pedido {proc.pedido}
          </h3>
          <p className="text-xs text-slate-500 truncate">{proc.importador?.razao}</p>
        </div>
        <p className="text-xs" aria-live="polite">{status}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <nav aria-label="Passos da exportação" className="lg:w-64 shrink-0 w-full bg-white border border-slate-200 rounded-xl p-2 lg:p-3">
          <div className="px-1 pb-2 lg:pb-3 mb-1 lg:mb-2 border-b border-slate-100">
            <p className="text-xs text-slate-500">
              <b className="text-slate-700">{prontos}</b> de {PASSOS_DE_PREENCHER.length} passos sem erro
            </p>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={PASSOS_DE_PREENCHER.length} aria-valuenow={prontos}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(prontos / PASSOS_DE_PREENCHER.length) * 100}%` }} />
            </div>
            {pendente && (
              <button type="button" onClick={() => ir(pendente)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2A6377] hover:underline">
                Ir para a próxima pendência <ArrowRight size={13} />
              </button>
            )}
          </div>
          <div ref={listaPassos} className="relative flex lg:flex-col gap-1 overflow-x-auto">
            {ETAPAS.map((etapa, e) => (
              <div key={etapa.nome} className="contents lg:block">
                <p className={`hidden lg:block px-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 ${e ? "mt-3" : ""} mb-1`}>{etapa.nome}</p>
                {etapa.passos.map((id) => {
                  const ativo = id === passo;
                  const n = PASSOS.findIndex((p) => p.id === id) + 1;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => ir(id)}
                      aria-current={ativo ? "step" : undefined}
                      className={`lg:w-full shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm whitespace-nowrap text-left transition ${ativo ? "bg-[#2A6377] text-white font-semibold" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      <span className={`h-5 w-5 shrink-0 rounded-full text-[11px] font-bold flex items-center justify-center ${ativo ? "bg-white text-[#2A6377]" : "bg-slate-100 text-slate-600"}`}>{n}</span>
                      <span className="flex-1">{PASSOS[n - 1].nome}</span>
                      <MarcaPasso s={situacoes[id]} ativo={ativo} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0 w-full">
          {passo === "erp" && <PassoErp {...base} erp={erp} linha={linhaErp} onAtualizarErp={() => void atualizarErp()} atualizandoErp={atualizandoErp} />}
          {passo === "exportador" && <PassoExportador {...base} />}
          {passo === "importador" && <PassoImportador {...base} />}
          {passo === "comercial" && <PassoComercial {...base} />}
          {passo === "embarque" && <PassoEmbarque {...base} />}
          {passo === "itens" && <PassoItens {...base} modificar={modificar} onIrPara={ir} />}
          {passo === "volumes" && <PassoPacking {...base} modificar={modificar} tabela={tabela} podeReler={Boolean(linhaErp)} onReler={reler} onIrPara={ir} />}
          {passo === "certificado" && <PassoCertificado {...base} />}
          {passo === "revisao" && <PassoRevisao proc={proc} revisao={revisao} aoIrPara={ir} />}
          {passo === "previa" && (
            <PassoPrevia
              idObra={obra.id}
              proc={proc}
              revisao={revisao}
              aprovado={aprovado}
              aprovacao={aprovacao}
              podeAprovar={podeAprovar}
              ocupado={ocupado}
              rascunho={rascunho}
              mensagem={mensagem}
              onAprovar={() => void aprovar()}
              onPedirRascunho={() => void pedirDocumento("rascunho")}
              onBaixar={(d) => void baixar(d)}
              onVerRevisao={() => ir("revisao")}
            />
          )}
          {passo === "documentos" && (
            <PassoDocumentos
              docs={docs}
              aprovado={aprovado}
              bloqueado={revisao.bloqueado}
              ocupado={ocupado}
              mensagem={mensagem}
              onGerarFinal={() => void pedirDocumento("final")}
              onBaixar={(d) => void baixar(d)}
              onIrPara={ir}
            />
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
            <Botao onClick={() => ir(PASSOS[indice - 1].id)} desabilitado={indice <= 0}>
              <ChevronLeft size={15} /> Voltar
            </Botao>
            <Botao tipo="primario" onClick={() => ir(PASSOS[indice + 1].id)} desabilitado={indice >= PASSOS.length - 1}>
              Próximo <ChevronRight size={15} />
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
