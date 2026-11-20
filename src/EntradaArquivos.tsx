import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Camera, Paperclip } from "lucide-react";
import { useAviso } from "./aviso";
import { acceptPermiteImagem, nomePrint, precisaNomeDePrint, separarArquivos, textoRecusa } from "./arquivosRegras";

// Entrada unica de arquivos do app (Pacote 3, C7): escolher varios de uma vez, tirar foto pela camera no celular e
// colar print (Ctrl+V). Antes cada tela tinha o proprio <input type="file">, quase sempre um arquivo por vez.
// CONTRATO (nao mudar as props; varias telas importam). Quem usa continua dono da lista e do envio: este componente
// so entrega os arquivos escolhidos.
export interface EntradaArquivosProps {
  // recebe os arquivos escolhidos, fotografados ou colados (nunca lista vazia)
  onArquivos: (arquivos: File[]) => void;
  // mesmo formato do atributo accept do input (ex.: ".pdf,.xml,image/*"); arquivo fora disso e recusado com aviso
  accept?: string;
  // varios arquivos de uma vez (padrao: sim)
  multiplo?: boolean;
  // texto do botao principal (padrao: "Escolher arquivos…")
  rotulo?: string;
  desabilitado?: boolean;
  // botao "Tirar foto" em aparelho com toque (padrao: sim; so aparece se accept permitir imagem)
  camera?: boolean;
  // aceitar imagem colada com Ctrl+V enquanto o componente esta na tela (padrao: sim; so se accept permitir imagem)
  colar?: boolean;
  // tamanho maximo por arquivo em MB (acima disso recusa com aviso); sem valor = sem limite aqui
  maxMb?: number;
  className?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Colar (Ctrl+V): um unico ouvinte no document para o app todo.
// REGRA quando ha mais de um EntradaArquivos na tela: recebe o colar o ULTIMO montado que esta VISIVEL (um modal
// aberto por cima da tela monta depois dela, entao o modal recebe; aba escondida/display:none nao conta).
// So intercepta quando a area de transferencia tem ARQUIVO de imagem. Se o foco esta num campo de texto e o que foi
// copiado tambem tem texto (ex.: celulas do Excel trazem texto + imagem), deixa colar o texto no campo.
interface Receptor {
  id: string;
  elemento: () => HTMLElement | null;
  receber: (arquivos: File[]) => void;
}
const receptores: Receptor[] = [];

const visivel = (el: HTMLElement | null) => Boolean(el && el.isConnected && el.getClientRects().length > 0);

const focoEmCampoDeTexto = () => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA") return true;
  if (el.tagName === "INPUT") {
    const t = (el as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "file", "submit", "reset", "range", "color"].includes(t);
  }
  return false;
};

const imagensDaAreaDeTransferencia = (dados: DataTransfer): File[] => {
  // files e items costumam trazer o mesmo arquivo: usa files e cai para items so se vier vazio
  let lista = Array.from(dados.files || []).filter((f) => f.type.startsWith("image/"));
  if (!lista.length) {
    lista = Array.from(dados.items || [])
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter((f): f is File => Boolean(f));
  }
  const agora = new Date();
  return lista.map((f, k) =>
    precisaNomeDePrint(f.name)
      ? new File([f], nomePrint(agora, f.type || "image/png", k), { type: f.type || "image/png", lastModified: agora.getTime() })
      : f,
  );
};

function aoColar(e: ClipboardEvent) {
  const dados = e.clipboardData;
  if (!dados) return;
  const temImagem =
    Array.from(dados.files || []).some((f) => f.type.startsWith("image/")) ||
    Array.from(dados.items || []).some((i) => i.kind === "file" && i.type.startsWith("image/"));
  if (!temImagem) return; // texto puro: colar normal
  if (focoEmCampoDeTexto() && Array.from(dados.types || []).includes("text/plain")) return;
  const alvo = [...receptores].reverse().find((r) => visivel(r.elemento()));
  if (!alvo) return;
  const arquivos = imagensDaAreaDeTransferencia(dados);
  if (!arquivos.length) return;
  e.preventDefault();
  alvo.receber(arquivos);
}

function registrarReceptor(r: Receptor) {
  if (!receptores.length) document.addEventListener("paste", aoColar);
  receptores.push(r);
  return () => {
    const i = receptores.indexOf(r);
    if (i >= 0) receptores.splice(i, 1);
    if (!receptores.length) document.removeEventListener("paste", aoColar);
  };
}

// no computador o capture e ignorado e "Tirar foto" viraria um segundo botao igual ao principal
const ehToque = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

export default function EntradaArquivos({
  onArquivos,
  accept,
  multiplo = true,
  rotulo = "Escolher arquivos…",
  desabilitado = false,
  camera = true,
  colar = true,
  maxMb,
  className = "",
}: EntradaArquivosProps) {
  const aviso = useAviso();
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  const [toque] = useState(ehToque);
  const [arrastando, setArrastando] = useState(false);
  const profundidadeArraste = useRef(0);

  const permiteImagem = acceptPermiteImagem(accept);
  const mostrarCamera = camera && permiteImagem && toque;
  const colarAtivo = colar && permiteImagem && !desabilitado;

  // filtra, avisa o que ficou de fora e entrega o resto; guardado em ref para o ouvinte do colar ver a versao atual
  const entregar = (escolhidos: File[]) => {
    if (desabilitado || !escolhidos.length) return;
    const { aceitos, recusados } = separarArquivos(escolhidos, { accept, maxMb });
    if (recusados.length) aviso.erro(textoRecusa(recusados, { accept, maxMb }));
    if (!aceitos.length) return;
    if (!multiplo && aceitos.length > 1) {
      aviso.info(`Aqui vai um arquivo só: ficou ${aceitos[0].name}.`);
      onArquivos([aceitos[0]]);
      return;
    }
    onArquivos(aceitos);
  };
  const entregarRef = useRef(entregar);
  entregarRef.current = entregar;

  useEffect(() => {
    if (!colarAtivo) return;
    return registrarReceptor({
      id,
      elemento: () => caixa.current,
      receber: (arquivos) => entregarRef.current(arquivos),
    });
  }, [colarAtivo, id]);

  const aoMudar = (e: ChangeEvent<HTMLInputElement>) => {
    const escolhidos = [...(e.target.files || [])];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    entregar(escolhidos);
  };

  const temArquivos = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
  const aoEntrarArraste = (e: DragEvent) => {
    if (desabilitado || !temArquivos(e)) return;
    e.preventDefault();
    profundidadeArraste.current += 1;
    setArrastando(true);
  };
  const aoSairArraste = (e: DragEvent) => {
    if (!temArquivos(e)) return;
    profundidadeArraste.current = Math.max(0, profundidadeArraste.current - 1);
    if (!profundidadeArraste.current) setArrastando(false);
  };
  const aoArrastarSobre = (e: DragEvent) => {
    if (desabilitado || !temArquivos(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const aoSoltar = (e: DragEvent) => {
    if (!temArquivos(e)) return;
    e.preventDefault();
    profundidadeArraste.current = 0;
    setArrastando(false);
    entregar(Array.from(e.dataTransfer.files || []));
  };

  const ajuda = toque
    ? ""
    : colarAtivo
      ? "Você também pode arrastar ou colar um print (Ctrl+V)."
      : "Você também pode arrastar os arquivos para cá.";
  const idAjuda = `${id}-ajuda`;

  const estiloBotao =
    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-petroleo disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      ref={caixa}
      onDragEnter={aoEntrarArraste}
      onDragLeave={aoSairArraste}
      onDragOver={aoArrastarSobre}
      onDrop={aoSoltar}
      className={`rounded-lg border border-dashed px-3 py-2 transition ${arrastando ? "border-petroleo bg-petroleo/5" : "border-slate-300"} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => inputArquivos.current?.click()}
          aria-describedby={ajuda ? idAjuda : undefined}
          className={estiloBotao}
        >
          <Paperclip size={15} aria-hidden="true" />
          {rotulo}
        </button>
        {mostrarCamera && (
          <button type="button" disabled={desabilitado} onClick={() => inputCamera.current?.click()} className={estiloBotao}>
            <Camera size={15} aria-hidden="true" />
            Tirar foto
          </button>
        )}
      </div>
      {arrastando ? (
        <p className="mt-1 text-xs font-semibold text-petroleo">Solte para anexar.</p>
      ) : (
        ajuda && (
          <p id={idAjuda} className="mt-1 text-xs text-slate-500">
            {ajuda}
          </p>
        )
      )}
      <input
        ref={inputArquivos}
        type="file"
        multiple={multiplo}
        accept={accept}
        disabled={desabilitado}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={aoMudar}
      />
      {mostrarCamera && (
        <input
          ref={inputCamera}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={desabilitado}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={aoMudar}
        />
      )}
    </div>
  );
}
