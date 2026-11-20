import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { confirmar } from "./Dialogos";
import {
  formatarDataSegura,
  formatarTamanhoArquivo,
  normalizarNomeArquivo,
  labelOcorrencia,
} from "./utils";
import {
  FileText,
  Loader2,
  Upload,
  Trash2,
  Download,
  Link2,
  Paperclip,
  X,
} from "lucide-react";
import EntradaArquivos from "./EntradaArquivos";
import { semDuplicados, textoProgresso } from "./arquivosRegras";
import { mensagemErro } from "./erros";
import { MAX_MB_ANEXO, separarPorTipo, tipoParaEnvio } from "./tiposArquivoAnexo";

interface AnexosObraProps {
  idObra: string;
  usuarioAtualId?: string;
  podeGerenciar: boolean;
  onAviso?: (mensagem: string, tipo?: "sucesso" | "erro") => void;
}

const BUCKET = "obra-anexos";
const TAMANHO_MAXIMO_MB = MAX_MB_ANEXO;

const ehImagem = (tipo: string | null) =>
  Boolean(tipo && tipo.startsWith("image/"));

export default function AnexosObra({
  idObra,
  usuarioAtualId,
  podeGerenciar,
  onAviso,
}: AnexosObraProps) {
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [urlsAssinadas, setUrlsAssinadas] = useState<Record<string, string>>(
    {},
  );
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  // varios de uma vez (cada um vira uma linha em obra_anexos, com a mesma legenda/ocorrencia)
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);
  const [progresso, setProgresso] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idOcorrenciaVinculada, setIdOcorrenciaVinculada] = useState("");

  const avisar = (mensagem: string, tipo: "sucesso" | "erro" = "sucesso") => {
    if (onAviso) onAviso(mensagem, tipo);
  };

  const buscarAnexos = async () => {
    if (!idObra) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("obra_anexos")
        .select(
          "id, id_ocorrencia, descricao, nome_arquivo, caminho_storage, tipo_arquivo, tamanho_bytes, created_at, usuarios(nome), ocorrencias(tipo, descricao)",
        )
        .eq("id_obra", idObra)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnexos(data || []);

      const caminhos = (data || []).map((a: any) => a.caminho_storage);
      if (caminhos.length > 0) {
        const { data: assinadas } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(caminhos, 60 * 60);
        const mapa: Record<string, string> = {};
        (assinadas || []).forEach((item: any) => {
          if (item.signedUrl) mapa[item.path] = item.signedUrl;
        });
        setUrlsAssinadas(mapa);
      } else {
        setUrlsAssinadas({});
      }

      const { data: ocs } = await supabase
        .from("ocorrencias")
        .select("id, tipo, descricao")
        .eq("id_obra", idObra)
        .order("created_at", { ascending: false });
      setOcorrencias(ocs || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarAnexos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idObra]);

  // envia um por um; se um falhar segue com os outros, diz qual falhou e deixa so os que falharam selecionados
  const enviarAnexo = async () => {
    if (!arquivosSelecionados.length || !idObra) return;
    // conferido de novo antes de enviar (o banco tambem recusa estas extensoes)
    const { bloqueados, aviso } = separarPorTipo(arquivosSelecionados);
    if (bloqueados.length) {
      avisar(aviso, "erro");
      setArquivosSelecionados((atuais) => atuais.filter((a) => !bloqueados.includes(a)));
      return;
    }
    setEnviando(true);
    const falhas: { arquivo: File; motivo: string }[] = [];
    let enviados = 0;
    try {
      for (const [k, arquivo] of arquivosSelecionados.entries()) {
        setProgresso(textoProgresso(k + 1, arquivosSelecionados.length));
        try {
          const nomeNormalizado = normalizarNomeArquivo(arquivo.name);
          const caminhoStorage = `obras/${idObra}/anexos/${Date.now()}_${nomeNormalizado}`;

          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(caminhoStorage, arquivo, {
              cacheControl: "3600",
              upsert: false,
              // tipo que o bucket nao lista (ex.: desenho de programa menos comum) vai como "binario"
              contentType: tipoParaEnvio(arquivo),
            });
          if (uploadError) throw uploadError;

          const { error: insertError } = await supabase
            .from("obra_anexos")
            .insert([
              {
                id_obra: idObra,
                id_ocorrencia: idOcorrenciaVinculada || null,
                id_usuario: usuarioAtualId || null,
                descricao: descricao || null,
                nome_arquivo: arquivo.name,
                caminho_storage: caminhoStorage,
                tipo_arquivo: arquivo.type || null,
                tamanho_bytes: arquivo.size,
              },
            ]);
          if (insertError) {
            // registro nao gravou: nao deixa arquivo solto no armazenamento
            await supabase.storage.from(BUCKET).remove([caminhoStorage]);
            throw insertError;
          }
          enviados += 1;
        } catch (error) {
          falhas.push({ arquivo, motivo: mensagemErro(error) });
        }
      }

      if (falhas.length) {
        avisar(
          (enviados ? `${enviados} de ${arquivosSelecionados.length} anexos enviados. ` : "") +
            falhas
              .map((f) => `Não foi possível enviar o anexo ${f.arquivo.name}: ${f.motivo}`)
              .join(" "),
          "erro",
        );
        setArquivosSelecionados(falhas.map((f) => f.arquivo));
      } else {
        avisar(enviados > 1 ? `${enviados} anexos enviados!` : "Anexo enviado!");
        setArquivosSelecionados([]);
        setDescricao("");
        setIdOcorrenciaVinculada("");
      }
      if (enviados) buscarAnexos();
    } finally {
      setEnviando(false);
      setProgresso("");
    }
  };

  const excluirAnexo = async (anexo: any) => {
    if (
      !(await confirmar({
        titulo: "Excluir anexo?",
        texto: `O arquivo "${anexo.nome_arquivo}" será excluído da obra. Esta ação não pode ser desfeita.`,
        rotuloConfirmar: "Excluir anexo",
        perigo: true,
      }))
    )
      return;
    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([anexo.caminho_storage]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("obra_anexos")
        .delete()
        .eq("id", anexo.id);
      if (dbError) throw dbError;

      avisar("Anexo excluído!");
      buscarAnexos();
    } catch (error) {
      avisar(
        `Não foi possível excluir o anexo ${anexo.nome_arquivo}: ${mensagemErro(error)}`,
        "erro",
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {podeGerenciar && (
        <div className="bg-white p-4 rounded-xl border">
          <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3 text-sm">
            <Upload size={16} /> Novo Anexo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div className="md:col-span-1 min-w-0">
              {/* sem accept: aceita qualquer arquivo de trabalho; so barra executavel/script/pagina (tiposArquivoAnexo) */}
              <EntradaArquivos
                maxMb={TAMANHO_MAXIMO_MB}
                desabilitado={enviando}
                onArquivos={(novos) => {
                  const { permitidos, aviso } = separarPorTipo(novos);
                  if (aviso) avisar(aviso, "erro");
                  if (permitidos.length)
                    setArquivosSelecionados((atuais) =>
                      semDuplicados([...atuais, ...permitidos]),
                    );
                }}
              />
              {arquivosSelecionados.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {arquivosSelecionados.map((a, i) => (
                    <li
                      key={`${a.name}-${a.size}-${i}`}
                      className="text-xs text-slate-600 flex items-center gap-2 break-all"
                    >
                      <Paperclip size={12} aria-hidden="true" className="shrink-0" />
                      <span className="min-w-0">{a.name}</span>
                      <span className="text-slate-500 shrink-0">
                        ({formatarTamanhoArquivo(a.size)})
                      </span>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() =>
                          setArquivosSelecionados((prev) =>
                            prev.filter((_, k) => k !== i),
                          )
                        }
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
            </div>
            <input
              type="text"
              placeholder="Legenda (opcional)…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="border rounded-lg p-2 text-sm outline-none focus:border-petroleo md:col-span-1"
            />
            <select
              value={idOcorrenciaVinculada}
              onChange={(e) => setIdOcorrenciaVinculada(e.target.value)}
              className="border rounded-lg p-2 text-sm outline-none focus:border-petroleo md:col-span-1"
            >
              <option value="">Sem vínculo com ocorrência</option>
              {ocorrencias.map((oc) => (
                <option key={oc.id} value={oc.id}>
                  {labelOcorrencia(oc.tipo)}: {oc.descricao.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={enviarAnexo}
            disabled={!arquivosSelecionados.length || enviando}
            className="mt-3 bg-petroleo hover:bg-petroleo-escuro text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Upload size={14} />
            )}{" "}
            {enviando && progresso
              ? progresso
              : arquivosSelecionados.length > 1
                ? `Enviar ${arquivosSelecionados.length} anexos`
                : "Enviar Anexo"}
          </button>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Carregando…
        </p>
      ) : anexos.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum anexo ainda.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {anexos.map((anexo) => {
            const url = urlsAssinadas[anexo.caminho_storage];
            const imagem = ehImagem(anexo.tipo_arquivo);
            return (
              <div
                key={anexo.id}
                className="bg-white rounded-xl border overflow-hidden shadow-sm flex flex-col"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-100 h-32 flex items-center justify-center overflow-hidden"
                >
                  {imagem && url ? (
                    <img
                      src={url}
                      alt={anexo.nome_arquivo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText size={32} className="text-slate-400" />
                  )}
                </a>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p
                    className="text-xs font-bold text-slate-700 truncate"
                    title={anexo.nome_arquivo}
                  >
                    {anexo.nome_arquivo}
                  </p>
                  {anexo.descricao && (
                    <p className="text-xs text-slate-500">
                      {anexo.descricao}
                    </p>
                  )}
                  {anexo.ocorrencias && (
                    <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 w-fit flex items-center gap-1">
                      <Link2 size={10} />{" "}
                      {labelOcorrencia(anexo.ocorrencias.tipo)}
                    </span>
                  )}
                  <p className="text-xs text-slate-500 mt-auto">
                    {formatarDataSegura(anexo.created_at)} ·{" "}
                    {formatarTamanhoArquivo(anexo.tamanho_bytes)}
                    {anexo.usuarios?.nome ? ` · ${anexo.usuarios.nome}` : ""}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-1 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Download size={11} /> Abrir
                    </a>
                    {podeGerenciar && (
                      <button
                        onClick={() => excluirAnexo(anexo)}
                        className="bg-red-50 hover:bg-red-100 text-red-500 rounded-lg px-2 py-1"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
