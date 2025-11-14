// /middleware/isAdmin.js

/**
 * Middleware to ensure only admins can access a route.
 * Works AFTER authMiddleware, which sets req.user.
 */
export default function isAdmin(req, res, next) {
  try {
    // If JWT not decoded (user not logged in)
    if (!req.user) {
      return res.redirect('/login');
    }

    // Check admin role
    if (!req.user.role || req.user.role.toLowerCase() !== 'admin') {
      // Redirect to your corporate 403 page
      return res.redirect('/403');
    }

    // User is admin → allow access
    next();
  } catch (error) {
    console.error("isAdmin Middleware Error:", error);
    return res.redirect('/403');
  }
}
