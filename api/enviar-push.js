import webpush from "web-push";

// Envia a notificacao do sininho como push (Windows/Mac, Android e iPhone com
// o app instalado na Tela de Inicio). Chamada pelo gatilho notificacoes_push do
// banco (pg_net) a cada notificacao nova, com o segredo compartilhado no header.
// Esta funcao nao guarda segredo nenhum: repassa o segredo recebido para as RPCs
// push_lote/push_resultado, que so respondem se ele bater com o do Supabase Vault.

const SUPABASE_URL = "https://pnnhyzdbknzhsyyhhgbk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubmh5emRia256aHN5eWhoZ2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTA0MTEsImV4cCI6MjA4OTMyNjQxMX0.MG0h50YTuKUCWqFpMIAuDtmLGI63z12RPIQeA8ccUkg";

async function rpc(nome, args) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const texto = await resp.text();
  if (!resp.ok) throw Object.assign(new Error(texto), { status: resp.status });
  return texto ? JSON.parse(texto) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const segredo = req.headers["x-push-segredo"];
  const id = req.body?.id;
  if (!segredo || !id) return res.status(400).json({ error: "Faltam segredo ou id" });

  let lote;
  try {
    lote = await rpc("push_lote", { p_segredo: segredo, p_id: id });
  } catch (e) {
    const naoAutorizado = String(e.message).includes("Nao autorizado");
    return res.status(naoAutorizado ? 401 : 502).json({ error: naoAutorizado ? "Nao autorizado" : "Falha ao ler o banco" });
  }
  if (!lote || !lote.inscricoes?.length) return res.status(200).json({ enviados: 0 });

  webpush.setVapidDetails("mailto:gestaoobras@kalter.com.br", lote.vapid_publica, lote.vapid_privada);
  const payload = JSON.stringify(lote.payload);

  const enviadas = [];
  const expiradas = [];
  const falhas = [];
  await Promise.all(
    lote.inscricoes.map(async (insc) => {
      try {
        await webpush.sendNotification(
          { endpoint: insc.endpoint, keys: { p256dh: insc.p256dh, auth: insc.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
        enviadas.push(insc.id);
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) expiradas.push(insc.id);
        falhas.push({ status: e.statusCode ?? null, erro: String(e.body || e.message).slice(0, 200) });
      }
    }),
  );

  try {
    await rpc("push_resultado", { p_segredo: segredo, p_enviadas: enviadas, p_expiradas: expiradas });
  } catch {
    // so atualiza ultimo_envio_em / limpa expiradas; nao afeta o envio
  }
  return res.status(200).json({ enviados: enviadas.length, expiradas: expiradas.length, falhas });
}
