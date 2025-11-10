// /middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { log } from '../config/db.js';

/**
 * Middleware to verify JWT.
 * Looks for a token in either the Authorization header (Bearer <token>)
 * or the cookie named "tms_token".
 * If valid, attaches the payload to req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    let token;

    // Prefer Authorization header if present
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && (req.cookies.tms_token || req.cookies.token)) {
      // Fallback to cookie (correct name is tms_token)
      token = req.cookies.tms_token || req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user || decoded;
    next();
  } catch (error) {
    log('JWT verify failed:', error?.message || error);
    return res.status(401).json({ message: 'Token is not valid.' });
  }
};

export default authMiddleware;
