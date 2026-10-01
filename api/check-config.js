export default function handler(req, res) {
  const username = process.env.ORPEN_USERNAME || '';
  const password = process.env.ORPEN_PASSWORD || '';
  const device = process.env.ORPEN_DEVICE_UNIQUE_ID || '';
  res.status(200).json({
    ok: true,
    route: 'check-config',
    build: '3.0.6',
    usernamePresent: Boolean(username),
    usernameMasked: username ? `${username.slice(0, 2)}***${username.slice(-3)}` : '',
    passwordPresent: Boolean(password),
    passwordLength: password.length,
    deviceUniqueIdConfigured: Boolean(device),
    baseUrl: process.env.ORPEN_BASE_URL || '',
    ajaxUrl: process.env.ORPEN_AJAX_URL || ''
  });
}
