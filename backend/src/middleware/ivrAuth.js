function ivrAuth(req, res, next) {
  const key = req.headers['x-ivr-api-key'];
  if (!key || key !== process.env.IVR_API_KEY) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid IVR API key' } });
  }
  next();
}

module.exports = ivrAuth;