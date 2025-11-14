// /middleware/redirectIfAuthenticated.js
import jwt from 'jsonwebtoken';

/**
 * If a valid, non-expired JWT exists in cookies (or Authorization header),
 * redirect the user to /auth/dashboard. Otherwise call next().
 *
 * Use this on routes like GET /login so logged-in users don't see the login form.
 */
export default function redirectIfAuthenticated(req, res, next) {
  try {
    let token;

    // Prefer cookie (your app seems to use tms_token or token)
    if (req.cookies && (req.cookies.tms_token || req.cookies.token)) {
      token = req.cookies.tms_token || req.cookies.token;
    } else {
      // Fallback to Authorization Bearer header
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      // No token → allow access to login page
      return next();
    }

    // Verify token (will throw if invalid or expired)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optionally attach user info for later use
    req.user = decoded.user || decoded;

    // Token valid → redirect to dashboard
    return res.redirect('/auth/dashboard');
  } catch (err) {
    // If verify failed (invalid/expired), allow to proceed to login page.
    // You may log the error for diagnostics but avoid leaking details.
    // console.debug('redirectIfAuthenticated: token verify failed:', err?.message);
    return next();
  }
}
