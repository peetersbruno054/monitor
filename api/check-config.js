export default function handler(req, res) {
  const username = process.env.ORPEN_USERNAME || '';
  const password = process.env.ORPEN_PASSWORD || '';
  const device = process.env.ORPEN_DEVICE_UNIQUE_ID || '';
  const externalToken = process.env.ORPEN_EXTERNAL_TOKEN || '';
  res.status(200).json({
    ok: true,
    route: 'check-config',
    build: '3.1.0',
    usernamePresent: Boolean(username),
    usernameMasked: username ? `${username.slice(0, 2)}***${username.slice(-3)}` : '',
    passwordPresent: Boolean(password),
    passwordLength: password.length,
    deviceUniqueIdConfigured: Boolean(device),
    externalTokenConfigured: Boolean(externalToken),
    baseUrl: process.env.ORPEN_BASE_URL || '',
    ajaxUrl: process.env.ORPEN_AJAX_URL || ''
  });
}
