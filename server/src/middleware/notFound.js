const notFound = (req, res, _next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = notFound;
