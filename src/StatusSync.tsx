import type { SyncStatus } from "./types";

// O robo roda de segunda a sexta, das 7h as 19h, a cada 30 min. So avisa "atrasado"
// dentro da janela util (9h-19h): antes disso a ultima rodada pode ser do dia anterior.
const LIMITE_ATRASO_MS = 2 * 60 * 60 * 1000;

const dentroDaJanelaUtil = (agora: Date) => {
  const dia = agora.getDay();
  return dia >= 1 && dia <= 5 && agora.getHours() >= 9 && agora.getHours() < 19;
};

const rotuloQuando = (data: Date, agora: Date) => {
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const mesmoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mesmoDia(data, agora)) return `hoje ${hora}`;
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(data, ontem)) return `ontem ${hora}`;
  return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
};

export default function StatusSync({
  status,
  recolhido,
  mostrarDetalhes,
}: {
  status: SyncStatus | null;
  recolhido: boolean;
  mostrarDetalhes: boolean;
}) {
  const agora = new Date();
  const fim = status?.terminou_em ? new Date(status.terminou_em) : null;
  const atrasado =
    !!fim && dentroDaJanelaUtil(agora) && agora.getTime() - fim.getTime() > LIMITE_ATRASO_MS;

  let texto = "Sem registro de sincronização";
  let cor = "bg-white/30";
  let titulo = "O robô ainda não registrou nenhuma sincronização.";
  if (fim) {
    const quando = rotuloQuando(fim, agora);
    texto = atrasado ? `Sincronização atrasada (${quando})` : `Dados do ERP: ${quando}`;
    cor = atrasado ? "bg-red-400" : "bg-emerald-300";
    titulo = atrasado
      ? `A última sincronização com o ERP foi ${quando}. O robô pode ter parado - avise o administrador.`
      : `Última sincronização com o ERP: ${quando}`;
    if (mostrarDetalhes && status && status.etapas_com_erro?.length > 0) {
      titulo += `\nEtapas com erro na última rodada: ${status.etapas_com_erro.join(", ")}`;
    }
  }

  return (
    <div
      title={titulo}
      className={`flex items-center gap-2 mb-3 px-2 text-[11px] ${atrasado ? "text-red-200 font-semibold" : "text-white/70"} ${recolhido ? "md:justify-center md:px-0" : ""}`}
    >
      <span className={`shrink-0 w-2 h-2 rounded-full ${cor} ${atrasado ? "animate-pulse" : ""}`} />
      <span className={`leading-tight ${recolhido ? "md:hidden" : ""}`}>{texto}</span>
    </div>
  );
}
