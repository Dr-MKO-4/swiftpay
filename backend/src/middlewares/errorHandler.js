// src/middlewares/errorHandler.js


function notFound(req, res, next) {
    res.status(404).json({ message: 'Route not found' });
  }
  
  function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
  
  module.exports = { notFound, errorHandler };
  