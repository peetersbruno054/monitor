import { authenticate, generateReport } from '../lib/orpen.js';

const BOT_POINTS = Array.from({ length: 23 }, (_, i) => String(52 + i));

function brDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

export default async function handler(req, res) {
  try {
    const start = req.query?.start || '2026-10-01';
    const end = req.query?.end || start;
    const session = await authenticate();
    const payload = {
      reportTitle: 'R72_-_Chat_-_Pontos_de_Acesso',
      reportClass: 'ContactCenter',
      user_type: '1',
      user_id: '162',
      repetitionType: '1',
      repeatDay: '1',
      interval: '',
      repeatHour: '00:00',
      reportAlias: '',
      reportId: '72',
      reportAction: 'now',
      enable_date_filter: '1',
      period: '',
      from_date: brDate(start),
      to_date: brDate(end),
      from_hour: '00:00',
      to_hour: '23:59',
      protocolDateFilterAt: 'create_date',
      protocolStatus: '0',
      attendance_type: '',
      date_grouping_option: 'by_date',
      group_by_queue: '1',
      include_available_agents: '1',
      show_service_level_for_abandons: '1',
      startLetter: '0',
      uci: '0',
      blacklist: '0',
      optIn: '0',
      optOut: '0',
      show_only_first_substatus: '1',
      lineDivision: '1',
      minTalkTime: '0',
      graphDivision: '1',
      abandonThreshold: '5',
      include_transfer_info: '0',
      email: process.env.ORPEN_REPORT_EMAIL || 'admti@safeweb.com.br',
      reportDestiny: 'screen',
      bot_point: BOT_POINTS
    };
    const raw = await generateReport(payload, session);
    return res.status(200).json({
      ok: true,
      route: 'test-report',
      build: '3.1.2',
      status: 200,
      rawLength: raw.length,
      rawStart: raw.slice(0, 3000)
    });
  } catch (error) {
    console.error('Monitor IA report diagnostic:', error);
    return res.status(502).json({
      ok: false,
      route: 'test-report',
      build: '3.1.2',
      error: error?.message || String(error),
      name: error?.name || 'Error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
