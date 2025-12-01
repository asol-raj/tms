// /middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { log } from '../config/db.js';

const authMiddleware = (req, res, next) => {
  try {
    let token;

    // Prefer Authorization header if present
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && (req.cookies.tms_token || req.cookies.token)) {
      // Fallback to cookie
      token = req.cookies.tms_token || req.cookies.token;
    }

    // 🔹 No token → redirect once and STOP
    if (!token) {
      return res.redirect('/login');
    }

    // 🔹 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user || decoded;

    return next();
  } catch (error) {
    log('JWT verify failed:', error?.message || error);

    // Optional: clear bad cookies
    if (req.cookies?.tms_token) res.clearCookie('tms_token');
    if (req.cookies?.token) res.clearCookie('token');

    // Redirect and STOP
    return res.redirect('/login');
  }
};

export default authMiddleware;
