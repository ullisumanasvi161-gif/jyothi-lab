const loginAttempts = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const timeframe = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 5; // Limit to 5 attempts per window

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, []);
  }

  // Filter out timestamps older than the window
  const attempts = loginAttempts.get(ip).filter(timestamp => now - timestamp < timeframe);
  attempts.push(now);
  loginAttempts.set(ip, attempts);

  if (attempts.length > maxAttempts) {
    return res.status(429).json({ 
      error: 'Too many authentication attempts. Please try again after 15 minutes.' 
    });
  }

  next();
};

module.exports = rateLimiter;
