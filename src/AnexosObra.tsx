import { useEffect, useState } from "react";
import { supabase } from "./supabase";
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
} from "lucide-react";

interface AnexosObraProps {
  idObra: string;
  usuarioAtualId?: string;
  podeGerenciar: boolean;
  onAviso?: (mensagem: string, tipo?: "sucesso" | "erro") => void;
}

const BUCKET = "obra-anexos";
const TAMANHO_MAXIMO_MB = 25;

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
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(
    null,
  );
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

  const enviarAnexo = async () => {
    if (!arquivoSelecionado || !idObra) return;
    if (arquivoSelecionado.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      return avisar(`Arquivo maior que ${TAMANHO_MAXIMO_MB} MB.`, "erro");
    }
    setEnviando(true);
    try {
      const nomeNormalizado = normalizarNomeArquivo(arquivoSelecionado.name);
      const caminhoStorage = `obras/${idObra}/anexos/${Date.now()}_${nomeNormalizado}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(caminhoStorage, arquivoSelecionado, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("obra_anexos").insert([
        {
          id_obra: idObra,
          id_ocorrencia: idOcorrenciaVinculada || null,
          id_usuario: usuarioAtualId || null,
          descricao: descricao || null,
          nome_arquivo: arquivoSelecionado.name,
          caminho_storage: caminhoStorage,
          tipo_arquivo: arquivoSelecionado.type || null,
          tamanho_bytes: arquivoSelecionado.size,
        },
      ]);
      if (insertError) throw insertError;

      avisar("Anexo enviado!");
      setArquivoSelecionado(null);
      setDescricao("");
      setIdOcorrenciaVinculada("");
      buscarAnexos();
    } catch (error: any) {
      avisar(error.message || "Erro ao enviar anexo.", "erro");
    } finally {
      setEnviando(false);
    }
  };

  const excluirAnexo = async (anexo: any) => {
    if (!window.confirm(`Excluir o anexo "${anexo.nome_arquivo}"?`)) return;
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
    } catch (error: any) {
      avisar(error.message || "Erro ao excluir anexo.", "erro");
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
            <input
              type="file"
              onChange={(e) =>
                setArquivoSelecionado(e.target.files?.[0] || null)
              }
              className="border rounded-lg p-2 text-sm outline-none md:col-span-1"
            />
            <input
              type="text"
              placeholder="Legenda (opcional)..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="border rounded-lg p-2 text-sm outline-none md:col-span-1"
            />
            <select
              value={idOcorrenciaVinculada}
              onChange={(e) => setIdOcorrenciaVinculada(e.target.value)}
              className="border rounded-lg p-2 text-sm outline-none md:col-span-1"
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
            disabled={!arquivoSelecionado || enviando}
            className="mt-3 bg-[#2A6377] hover:bg-[#1e4857] text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Upload size={14} />
            )}{" "}
            Enviar Anexo
          </button>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Carregando...
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
                    <p className="text-[11px] text-slate-500">
                      {anexo.descricao}
                    </p>
                  )}
                  {anexo.ocorrencias && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5 w-fit flex items-center gap-1">
                      <Link2 size={10} />{" "}
                      {labelOcorrencia(anexo.ocorrencias.tipo)}
                    </span>
                  )}
                  <p className="text-[10px] text-slate-400 mt-auto">
                    {formatarDataSegura(anexo.created_at)} ·{" "}
                    {formatarTamanhoArquivo(anexo.tamanho_bytes)}
                    {anexo.usuarios?.nome ? ` · ${anexo.usuarios.nome}` : ""}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-1 text-[11px] font-bold flex items-center justify-center gap-1"
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
