// /middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { log } from '../config/db.js';

/**
 * Middleware to verify JWT.
 * If token is valid, it attaches the user payload to req.user.
 * If token is invalid, it sends a 401 response.
 */
const authMiddleware = (req, res, next) => {
  // 1. Get token from the header
  // const authHeader = req.header('Authorization');

  // // 2. Check if token exists
  // if (!authHeader) {
  //   return res.status(401).json({ message: 'No token, authorization denied.' });
  // }

  // // 3. Check if token format is correct (Bearer <token>)
  // const tokenParts = authHeader.split(' ');
  // if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
  //    return res.status(401).json({ message: 'Token is not in a valid format.' });
  // }

  const token = req.cookies.token; log(token);
  // const token = tokenParts[1];

  try {
    // 4. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the user payload to the request object
    // This allows our protected routes to know *who* is making the request
    req.user = decoded.user;
    
    // 6. Call the next middleware or route handler
    next();
    
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};

export default authMiddleware;