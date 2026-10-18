/**
 * Lingo. Server-Side Administrative Authorization
 *
 * Enforces admin privileges based strictly on verified session identity (req.user.username),
 * validated against the ADMIN_USERNAMES environment variable.
 * Does NOT rely on client-supplied headers or body fields.
 */

export function getAdminUsernames() {
  const envAdmins = (process.env.ADMIN_USERNAMES || '').trim();
  if (!envAdmins) return new Set();
  return new Set(
    envAdmins
      .split(',')
      .map(u => u.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdmin(username) {
  if (!username || typeof username !== 'string') return false;
  const admins = getAdminUsernames();
  return admins.has(username.toLowerCase().trim());
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.username) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  if (!isAdmin(req.user.username)) {
    return res.status(403).json({
      error: 'Administrative privileges required for this operation.'
    });
  }

  next();
}
