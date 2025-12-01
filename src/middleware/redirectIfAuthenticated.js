// redirectIfAuthenticated.js
import jwt from 'jsonwebtoken';

export default function redirectIfAuthenticated(req, res, next) {
  try {
    const token =
      (req.cookies && (req.cookies.tms_token || req.cookies.token)) ||
      null;

    if (!token) return next(); // no token → show login page

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded) {
      // Already logged in → send to dashboard
      return res.redirect('/auth/dashboard');
    }

    return next();
  } catch (err) {
    // Invalid/expired token → just let them see login
    return next();
  }
}
