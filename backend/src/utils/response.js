function response(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(data),
  };
}

function success(data, statusCode = 200) {
  return response(statusCode, { success: true, data });
}

function error(message, statusCode = 400, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return response(statusCode, body);
}

module.exports = {
  response,
  success,
  error,
};
