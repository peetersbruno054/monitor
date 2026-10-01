import { generateReport } from '../lib/orpen.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));

function brDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function payload(reportId, start, end, destiny) {
  const p = {
    reportTitle: reportId === 72 ? 'R72_-_Chat_-_Pontos_de_Acesso' : 'R74_-_Chat_-_Pesquisa_de_satisfação',
    reportClass: 'ContactCenter', user_type: '1', user_id: '162', repetitionType: '1', repeatDay: '1', interval: '',
    repeatHour: '00:00', reportAlias: '', reportId: String(reportId), reportAction: 'now', enable_date_filter: '1', period: '',
    from_date: brDate(start), to_date: brDate(end), from_hour: '00:00', to_hour: '23:59', protocolDateFilterAt: 'create_date',
    protocolStatus: '0', attendance_type: '', date_grouping_option: 'by_date', group_by_queue: '1', include_available_agents: '1',
    show_service_level_for_abandons: '1', startLetter: '0', uci: '0', blacklist: '0', optIn: '0', optOut: '0',
    show_only_first_substatus: '1', lineDivision: '1', minTalkTime: '0', graphDivision: '1', abandonThreshold: '5',
    include_transfer_info: '0', email: 'admti@safeweb.com.br', reportDestiny: destiny
  };
  if (reportId === 72) p.bot_point = BOT_POINTS;
  if (reportId === 74) p.survey_bots = ['66666','393939','313131','323232','676767'];
  return p;
}

function extract(raw) {
  try {
    const j = JSON.parse(raw);
    for (const c of [j?.data,j?.result,j?.rows,j?.aaData,j?.items,j?.records]) {
      if (Array.isArray(c)) return c;
      if (typeof c === 'string') return c;
    }
    return j;
  } catch (_) { return raw; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Método não permitido.' });
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ ok:false, error:'Informe start e end.' });
    const [a,b] = await Promise.all([
      generateReport(payload(72,start,end,'csv')),
      generateReport(payload(74,start,end,'screen'))
    ]);
    res.status(200).json({ ok:true, version:'3.0.0', period:{start,end}, r72:extract(a), r74:extract(b) });
  } catch (error) {
    res.status(500).json({ ok:false, error:error?.message || 'Erro ao consultar o Orpen.' });
  }
}
