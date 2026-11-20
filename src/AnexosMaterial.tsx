import { useEffect, useState } from "react";
import { FileText, Image as ImagemIcone, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { supabase } from "./supabase";
import { avisar } from "./aviso";
import { confirmar } from "./Dialogos";
import EntradaArquivos from "./EntradaArquivos";
import { semDuplicados, textoProgresso } from "./arquivosRegras";
import { mensagemErro } from "./erros";
import { MAX_MB_ANEXO, separarPorTipo, tipoParaEnvio } from "./tiposArquivoAnexo";
import { formatarTamanhoArquivo } from "./utils";
import {
  BUCKET_MATERIAL,
  MAX_ANEXOS_MATERIAL,
  cabemNoLimite,
  caminhoAnexoMaterial,
  podeAnexarMaterial,
  podeExcluirAnexoMaterial,
  type AnexoMaterial,
  type PessoaMaterial,
} from "./calculoAnexosMaterial";

// Anexos da solicitacao de material (p14, 18/11/2026): varios arquivos/imagens por solicitacao, no bucket privado
// material-anexos. Envio: arquivo no Storage e depois o registro pelo banco (mat_anexo_registrar, que confere quem
// pode e grava o evento no historico). Exclusao: mat_anexo_excluir e depois remove o arquivo do Storage (cota de disco).
// Nada disso vai para e-mail.

const fmtDataHora = (v?: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export interface FalhaEnvio {
  arquivo: File;
  motivo: string;
}

/** Envia um por um; se um falhar segue com os outros. Arquivo cujo registro falhou e removido do Storage. */
export async function enviarAnexosMaterial(
  idSolicitacao: string,
  arquivos: File[],
  aoProgresso?: (texto: string) => void,
): Promise<{ enviados: number; falhas: FalhaEnvio[] }> {
  const falhas: FalhaEnvio[] = [];
  let enviados = 0;
  const agora = new Date();
  for (const [k, arquivo] of arquivos.entries()) {
    aoProgresso?.(textoProgresso(k + 1, arquivos.length));
    const caminho = caminhoAnexoMaterial(idSolicitacao, arquivo.name, agora, k);
    const { error: erroEnvio } = await supabase.storage
      .from(BUCKET_MATERIAL)
      .upload(caminho, arquivo, { cacheControl: "3600", upsert: false, contentType: tipoParaEnvio(arquivo) });
    if (erroEnvio) {
      falhas.push({ arquivo, motivo: mensagemErro(erroEnvio) });
      continue;
    }
    const { error } = await supabase.rpc("mat_anexo_registrar", {
      p_id: idSolicitacao,
      p_caminho: caminho,
      p_nome: arquivo.name,
      p_tipo: arquivo.type || null,
      p_tamanho: arquivo.size,
    });
    if (error) {
      // registro nao gravou: nao deixa arquivo solto no armazenamento
      await supabase.storage.from(BUCKET_MATERIAL).remove([caminho]);
      falhas.push({ arquivo, motivo: mensagemErro(error) });
      continue;
    }
    enviados += 1;
  }
  return { enviados, falhas };
}

export const textoFalhas = (falhas: FalhaEnvio[]) =>
  falhas.map((f) => `Não foi possível anexar ${f.arquivo.name}: ${f.motivo}`).join(" ");

/** Filtra os escolhidos (tipo bloqueado) e avisa; devolve os que podem ir. */
export function filtrarEscolhidos(novos: File[]): File[] {
  const { permitidos, aviso } = separarPorTipo(novos);
  if (aviso) avisar.erro(aviso);
  return permitidos;
}

/** Lista dos arquivos escolhidos e ainda nao enviados (formulario de nova solicitacao). */
export function ArquivosEscolhidos({
  arquivos,
  onAdicionar,
  onRemover,
  desabilitado,
}: {
  arquivos: File[];
  onAdicionar: (novos: File[]) => void;
  onRemover: (indice: number) => void;
  desabilitado?: boolean;
}) {
  return (
    <div>
      {arquivos.length > 0 && (
        <ul className="mb-2 space-y-1">
          {arquivos.map((a, i) => (
            <li key={`${a.name}-${a.size}-${i}`} className="text-xs text-slate-600 flex items-center gap-2 break-all">
              <Paperclip size={12} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0">{a.name}</span>
              <span className="text-slate-500 shrink-0">({formatarTamanhoArquivo(a.size)})</span>
              <button
                type="button"
                disabled={desabilitado}
                onClick={() => onRemover(i)}
                className="text-red-500 hover:text-red-700 shrink-0"
                title="Tirar da lista"
                aria-label={`Tirar ${a.name} da lista`}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* sem accept: qualquer arquivo de trabalho; so barra executavel/script/pagina (tiposArquivoAnexo) */}
      <EntradaArquivos
        maxMb={MAX_MB_ANEXO}
        desabilitado={desabilitado}
        rotulo={arquivos.length ? "Adicionar mais arquivos…" : "Escolher arquivos…"}
        onArquivos={(novos) => {
          const ok = filtrarEscolhidos(novos);
          if (ok.length) onAdicionar(ok);
        }}
      />
    </div>
  );
}

/** Junta os novos aos ja escolhidos sem repetir e respeitando o limite por solicitacao. */
export function juntarEscolhidos(atuais: File[], novos: File[], jaAnexados = 0): File[] {
  const todos = semDuplicados([...atuais, ...novos]);
  const cabem = cabemNoLimite(jaAnexados, todos.length);
  if (cabem < todos.length) avisar.erro(`No máximo ${MAX_ANEXOS_MATERIAL} anexos por solicitação.`);
  return todos.slice(0, cabem);
}

async function abrirAnexo(a: AnexoMaterial) {
  const { data, error } = await supabase.storage.from(BUCKET_MATERIAL).createSignedUrl(a.caminho_storage, 300);
  if (error || !data?.signedUrl) return avisar.erro(`Não foi possível abrir o arquivo ${a.nome_arquivo}.`);
  window.open(data.signedUrl, "_blank", "noopener");
}

/** Anexos no detalhe da solicitacao: lista (abre por link curto), anexar e excluir conforme a permissao. */
export function SecaoAnexosMaterial({
  solicitacao,
  usuario,
  onMudou,
}: {
  solicitacao: { id: string; status: string; id_solicitante: string | null };
  usuario: PessoaMaterial | null;
  onMudou?: () => void;
}) {
  const [anexos, setAnexos] = useState<AnexoMaterial[] | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [enviando, setEnviando] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const podeAnexar = podeAnexarMaterial(solicitacao, usuario);

  const carregar = async () => {
    const { data, error } = await supabase
      .from("solicitacoes_material_anexos")
      .select("id, id_solicitacao, nome_arquivo, caminho_storage, tipo_arquivo, tamanho_bytes, id_usuario, nome_usuario, created_at")
      .eq("id_solicitacao", solicitacao.id)
      .order("created_at");
    if (error) {
      setErroCarga(mensagemErro(error));
      setAnexos([]);
      return;
    }
    setErroCarga("");
    setAnexos((data as AnexoMaterial[]) || []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacao.id]);

  const anexar = async (novos: File[]) => {
    const escolhidos = juntarEscolhidos([], filtrarEscolhidos(novos), anexos?.length || 0);
    if (!escolhidos.length) return;
    setEnviando(textoProgresso(1, escolhidos.length));
    const { enviados, falhas } = await enviarAnexosMaterial(solicitacao.id, escolhidos, setEnviando);
    setEnviando("");
    if (falhas.length) avisar.erro((enviados ? `${enviados} de ${escolhidos.length} arquivos anexados. ` : "") + textoFalhas(falhas));
    else avisar.sucesso(enviados > 1 ? `${enviados} arquivos anexados.` : "Arquivo anexado.");
    if (enviados) {
      await carregar();
      onMudou?.();
    }
  };

  const excluir = async (a: AnexoMaterial) => {
    const ok = await confirmar({
      titulo: "Excluir anexo?",
      texto: `O arquivo "${a.nome_arquivo}" será excluído desta solicitação. Esta ação não pode ser desfeita.`,
      rotuloConfirmar: "Excluir anexo",
      perigo: true,
    });
    if (!ok) return;
    setExcluindo(a.id);
    const { data, error } = await supabase.rpc("mat_anexo_excluir", { p_id_anexo: a.id });
    if (error) {
      setExcluindo(null);
      return avisar.erro(`Não foi possível excluir o anexo ${a.nome_arquivo}: ${mensagemErro(error)}`);
    }
    // registro ja saiu: tira o arquivo do armazenamento (se falhar, so sobra o arquivo, sem aparecer na tela)
    const { error: erroArquivo } = await supabase.storage.from(BUCKET_MATERIAL).remove([typeof data === "string" ? data : a.caminho_storage]);
    if (erroArquivo) console.error("anexo de material excluido, mas o arquivo ficou no armazenamento", erroArquivo);
    setExcluindo(null);
    avisar.sucesso("Anexo excluído.");
    await carregar();
    onMudou?.();
  };

  // o envoltorio do detalhe marca "com alteracoes" em qualquer onChange; anexo ja e gravado na hora, entao nao conta
  return (
    <div onChange={(e) => e.stopPropagation()}>
      <p className="text-xs font-bold uppercase text-slate-500 mb-1">Anexos{anexos && anexos.length ? ` (${anexos.length})` : ""}</p>
      {anexos === null ? (
        <p className="text-[12px] text-slate-500 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Carregando os anexos…
        </p>
      ) : erroCarga ? (
        <p className="text-[12px] text-red-600">Não foi possível carregar os anexos: {erroCarga}</p>
      ) : anexos.length === 0 ? (
        <p className="text-[12px] text-slate-500">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="divide-y border rounded-lg">
          {anexos.map((a) => {
            const imagem = Boolean(a.tipo_arquivo?.startsWith("image/"));
            const Icone = imagem ? ImagemIcone : FileText;
            return (
              <li key={a.id} className="px-3 py-2 flex items-start gap-2 text-[12px]">
                <Icone size={15} aria-hidden="true" className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => abrirAnexo(a)}
                    className="font-semibold text-petroleo hover:underline text-left break-all"
                    title="Abrir o arquivo"
                  >
                    {a.nome_arquivo}
                  </button>
                  <span className="block text-xs text-slate-500">
                    {[a.tamanho_bytes != null ? formatarTamanhoArquivo(a.tamanho_bytes) : "", fmtDataHora(a.created_at), a.nome_usuario].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {podeExcluirAnexoMaterial(a, solicitacao.status, usuario) && (
                  <button
                    type="button"
                    disabled={excluindo === a.id || Boolean(enviando)}
                    onClick={() => excluir(a)}
                    className="text-red-500 hover:text-red-700 shrink-0 p-1 disabled:opacity-50"
                    title="Excluir anexo"
                    aria-label={`Excluir o anexo ${a.nome_arquivo}`}
                  >
                    {excluindo === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} aria-hidden="true" />}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {podeAnexar && anexos !== null && !erroCarga && (
        <div className="mt-2">
          <EntradaArquivos
            maxMb={MAX_MB_ANEXO}
            desabilitado={Boolean(enviando) || anexos.length >= MAX_ANEXOS_MATERIAL}
            rotulo={enviando || (anexos.length ? "Anexar mais arquivos…" : "Anexar arquivos…")}
            onArquivos={anexar}
          />
          {anexos.length >= MAX_ANEXOS_MATERIAL && (
            <p className="text-xs text-slate-500 mt-1">Limite de {MAX_ANEXOS_MATERIAL} anexos atingido. Exclua algum para anexar outro.</p>
          )}
        </div>
      )}
    </div>
  );
}
