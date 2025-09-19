export default function authMiddleware(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  
  if (!apiToken) {
    console.warn('Warning: API_TOKEN not set. Authentication disabled.');
    return next();
  }

  const providedToken = req.headers['x-api-key'] || req.headers['X-API-Key'];

  if (!providedToken) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide an API key in the x-api-key header'
    });
  }

  if (providedToken !== apiToken) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  next();
}