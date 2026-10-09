import { supabase } from "./supabase";

// Chave publica VAPID (a privada fica so no Supabase Vault).
const VAPID_PUBLICA =
  "BMEP-vLyDsV7hnCsGv8pX3vzsPbkNRntabfDA3a0OKjImrXOewqbxa-vYxWd1OBRducSUjVEt6-xH8cPIJxoOo8";

export type EstadoPush =
  | "carregando"
  | "sem_suporte" // navegador sem push
  | "ios_instalar" // iPhone/iPad: so funciona com o app adicionado a Tela de Inicio
  | "bloqueado" // usuario negou a permissao no navegador
  | "inativo"
  | "ativo";

export const ehIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const instaladoComoApp = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const suportaPush = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.error("Service worker:", e));
  });
}

async function inscricaoAtual() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!suportaPush()) return ehIOS() && !instaladoComoApp() ? "ios_instalar" : "sem_suporte";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission !== "granted") return "inativo";
  const insc = await inscricaoAtual();
  if (!insc) return "inativo";
  // reenvia ao banco: garante que a inscricao deste navegador esta no usuario logado
  try {
    await salvarInscricao(insc);
  } catch (e) {
    console.error("Erro ao registrar push:", e);
  }
  return "ativo";
}

function base64UrlParaBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bruto = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

async function salvarInscricao(insc: PushSubscription) {
  const json = insc.toJSON();
  const { error } = await supabase.rpc("registrar_push", {
    p_endpoint: insc.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

export async function ativarPush(): Promise<EstadoPush> {
  if (!suportaPush()) return estadoPush();
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "inativo";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let insc = await reg.pushManager.getSubscription();
  if (!insc) {
    insc = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaBytes(VAPID_PUBLICA),
    });
  }
  await salvarInscricao(insc);
  return "ativo";
}

export async function desativarPush(): Promise<EstadoPush> {
  const insc = suportaPush() ? await inscricaoAtual() : null;
  if (insc) {
    await supabase.rpc("remover_push", { p_endpoint: insc.endpoint });
    await insc.unsubscribe();
  }
  return estadoPush();
}

// No logout: este navegador para de receber os avisos do usuario que saiu.
export async function removerPushAoSair() {
  try {
    const insc = suportaPush() ? await inscricaoAtual() : null;
    if (insc) {
      await supabase.rpc("remover_push", { p_endpoint: insc.endpoint });
      await insc.unsubscribe();
    }
  } catch (e) {
    console.error("Erro ao remover push:", e);
  }
}
