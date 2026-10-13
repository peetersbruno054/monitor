// Alerta de falhas seguidas na coleta (Orpen ou Supabase).
//  • Toda falha fica registrada em sync_runs (success = false).
//  • Se as últimas 3 coletas falharam, manda um e-mail (no máximo 1 a cada 2 horas).
//  • O e-mail é opcional: só funciona com RESEND_API_KEY e ALERT_EMAIL nas variáveis da Vercel.
//    ALERT_FROM é opcional (padrão: Monitor IA <onboarding@resend.dev>).
import { isSupabaseConfigured, saveSyncRun, recentSyncRuns, getSetting, setSetting } from './supabase.js';

const STREAK = 3;
const ALERT_EVERY_MS = 2 * 60 * 60 * 1000;
let lastAlertLocal = 0;

export function alertEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL);
}

// Situação das últimas coletas, para o aviso aos administradores
export async function collectionHealth() {
  if (!isSupabaseConfigured()) return null;
  const runs = await recentSyncRuns(10);
  let streak = 0;
  for (const r of runs) { if (r.success) break; streak += 1; }
  const lastOk = runs.find((r) => r.success);
  const lastFail = runs.find((r) => !r.success);
  return {
    failing: streak >= STREAK,
    consecutiveFailures: streak,
    lastSuccessAt: lastOk ? lastOk.started_at : null,
    lastFailureAt: lastFail ? lastFail.started_at : null,
    lastError: lastFail ? String(lastFail.error || '').slice(0, 300) : null,
    emailConfigured: alertEmailConfigured()
  };
}

async function sendEmail(subject, text) {
  const to = String(process.env.ALERT_EMAIL || '').split(/[,;\s]+/).filter(Boolean);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ALERT_FROM || 'Monitor IA <onboarding@resend.dev>', to, subject, text })
  });
  if (!response.ok) throw new Error('Resend HTTP ' + response.status);
}

export async function noteCollectionFailure({ start, end, stage, error }) {
  const message = (stage ? '[' + stage + '] ' : '') + (error?.message || String(error || 'Erro desconhecido'));
  try {
    await saveSyncRun({ success: false, start, end, error: message });
  } catch (e) {
    console.error('Monitor IA registro de falha:', e.message);
    return;
  }
  if (!alertEmailConfigured()) return;
  try {
    const health = await collectionHealth();
    if (!health || !health.failing) return;
    if (Date.now() - lastAlertLocal < ALERT_EVERY_MS) return;
    let last = null;
    try { last = await getSetting('last_failure_alert'); } catch (_) { /* tabela ainda não criada */ }
    if (last && Date.now() - Date.parse(last.value?.at || last.updated_at) < ALERT_EVERY_MS) return;
    lastAlertLocal = Date.now();
    try { await setSetting('last_failure_alert', { at: new Date().toISOString() }, 'sistema'); } catch (_) { /* segue só com o controle local */ }
    const when = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
    await sendEmail(
      'Monitor IA: ' + health.consecutiveFailures + ' coletas seguidas falharam',
      'O Monitor IA não conseguiu coletar os dados nas últimas ' + health.consecutiveFailures + ' tentativas.\n\n' +
      'Último erro: ' + message + '\n' +
      'Última coleta com sucesso: ' + when(health.lastSuccessAt) + '\n\n' +
      'Enquanto isso, o painel mostra os dados já guardados no Supabase (quando houver).\n' +
      'Vale conferir se o Orpen está no ar e se a senha do usuário de integração continua válida.'
    );
  } catch (e) {
    console.error('Monitor IA alerta de falha:', e.message);
  }
}

// Supabase fora do ar não tem onde registrar a falha: conta aqui mesmo (por instância)
let supabaseFails = 0;
let lastSupabaseAlert = 0;
export function noteSupabaseFailure(error) {
  supabaseFails += 1;
  if (supabaseFails < STREAK || !alertEmailConfigured() || Date.now() - lastSupabaseAlert < ALERT_EVERY_MS) return;
  lastSupabaseAlert = Date.now();
  sendEmail(
    'Monitor IA: falhas seguidas ao salvar no Supabase',
    'O Monitor IA não conseguiu salvar os dados no Supabase em ' + supabaseFails + ' tentativas seguidas.\n\n' +
    'Último erro: ' + String(error?.message || error).slice(0, 300) + '\n\n' +
    'O painel continua consultando o Orpen, mas sem guardar cópias (mais carga no Orpen).\n' +
    'Vale conferir o projeto no Supabase (pausado? chave trocada?).'
  ).catch((e) => console.error('Monitor IA alerta Supabase:', e.message));
}
export function noteSupabaseSuccess() { supabaseFails = 0; }
