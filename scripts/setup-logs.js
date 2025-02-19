const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory at:', logsDir);
} else {
    console.log('Logs directory already exists at:', logsDir);
} 