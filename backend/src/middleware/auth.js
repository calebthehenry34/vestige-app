import jwt from 'jsonwebtoken';

const auth = async (req, res, next) => {
  try {
    // Extract the token from the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token using the JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if decoded token contains userId
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user info to the request object
    req.user = { userId: decoded.userId };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Please authenticate' });
  }
};

export default auth;
