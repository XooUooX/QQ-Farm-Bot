const DEFAULT_ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "admin").trim() || "admin";
const DEFAULT_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin");
const { hashPassword, verifyPassword, checkPasswordStrength, getClientIp, recordLoginAttempts, clearLoginAttempts } = require("../services/security");

function createDefaultAdmin(username = DEFAULT_ADMIN_USERNAME) {
  return {
    username,
    role: "admin",
    card: null,
    accountLimit: Number.MAX_SAFE_INTEGER,
    mustChangePassword: false,
  };
}

function sendAdminSession(res, createAdminSession, username = DEFAULT_ADMIN_USERNAME) {
  const admin = createDefaultAdmin(username);
  const token = createAdminSession(admin);
  return res.json({
    ok: true,
    data: {
      token,
      role: admin.role,
      card: null,
      accountLimit: admin.accountLimit,
      user: { username: admin.username },
      mustChangePassword: false,
    },
  });
}

function registerAdminAuthRoutes({
  app,
  store,
  createAdminSession,
  invalidateAdminSessions,
  updateAdminSessions,
  requireAdminToken,
  requireAdminRole,
}) {
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};
    const clientIp = getClientIp(req);
    try {
      recordLoginAttempts(`${clientIp}:${String(username || '').trim()}`);
      const configured = store.getAdminAuthConfig();
      const validUsername = String(username || '').trim() === configured.username;
      const validPassword = configured.passwordHash
        ? await verifyPassword(String(password || ''), configured.passwordHash)
        : String(password || '') === DEFAULT_ADMIN_PASSWORD;
      if (!validUsername || !validPassword) {
        return res.status(401).json({ ok: false, error: "用户名或密码错误" });
      }
      clearLoginAttempts(`${clientIp}:${String(username || '').trim()}`);
      return sendAdminSession(res, createAdminSession, configured.username);
    } catch (error) {
      if (error.message && error.message.includes('锁定')) {
        return res.status(429).json({ ok: false, error: error.message });
      }
      return res.status(401).json({ ok: false, error: "用户名或密码错误" });
    }
  });

  app.get('/api/admin/auth-config', requireAdminToken, requireAdminRole, (req, res) => {
    res.json({ ok: true, data: { username: store.getAdminUsername() } });
  });

  app.post('/api/admin/auth-config', requireAdminToken, requireAdminRole, async (req, res) => {
    try {
      const configured = store.getAdminAuthConfig();
      const currentPassword = String(req.body?.currentPassword || '');
      const newUsername = String(req.body?.username || '').trim();
      const newPassword = String(req.body?.newPassword || '');
      const confirmPassword = String(req.body?.confirmPassword || '');
      const currentValid = configured.passwordHash
        ? await verifyPassword(currentPassword, configured.passwordHash)
        : currentPassword === DEFAULT_ADMIN_PASSWORD;
      if (!currentValid) return res.status(400).json({ ok: false, error: '当前密码错误' });
      if (!newUsername || !/^[\w.@-]{1,64}$/.test(newUsername)) {
        return res.status(400).json({ ok: false, error: '管理员账号格式无效' });
      }
      if (newPassword.length < 4 || newPassword.length > 64) {
        return res.status(400).json({ ok: false, error: '新密码长度必须为 4-64 位' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ ok: false, error: '两次输入的新密码不一致' });
      }
      const strength = checkPasswordStrength(newPassword);
      if (!strength.valid) return res.status(400).json({ ok: false, error: strength.feedback[0] });
      const passwordHash = await hashPassword(newPassword);
      store.setAdminAuthConfig({ username: newUsername, passwordHash });
      const currentToken = req.headers['x-admin-token'];
      invalidateAdminSessions((_session, token) => token !== currentToken);
      updateAdminSessions((_session, token) => token === currentToken, (session) => {
        Object.assign(session, createDefaultAdmin(newUsername));
      });
      res.json({ ok: true, data: { token: currentToken, username: newUsername } });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || '保存管理员账号失败' });
    }
  });
}

module.exports = { registerAdminAuthRoutes };
