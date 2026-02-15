const http = require('http');

/**
 * Simple client for sending notifications to the router
 * @param {Object} notification - The notification to send
 * @param {string} notification.source - Source identifier
 * @param {string} notification.priority - low|medium|high|critical
 * @param {string} notification.title - Short title
 * @param {string} notification.message - Full message
 * @param {Object} [notification.data] - Optional structured data
 * @param {string[]} [notification.channels] - Force specific channels
 * @param {string} [routerUrl] - Router URL (default: http://localhost:3456)
 */
function notify(notification, routerUrl = 'http://localhost:3456') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(notification);
    
    const req = http.request(
      `${routerUrl}/notify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (res.statusCode === 200) {
              resolve(result);
            } else {
              reject(new Error(result.error || `HTTP ${res.statusCode}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Convenience methods
notify.low = (source, title, message, data) => 
  notify({ source, priority: 'low', title, message, data });

notify.medium = (source, title, message, data) => 
  notify({ source, priority: 'medium', title, message, data });

notify.high = (source, title, message, data) => 
  notify({ source, priority: 'high', title, message, data });

notify.critical = (source, title, message, data) => 
  notify({ source, priority: 'critical', title, message, data });

module.exports = notify;
