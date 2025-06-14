/**
 * Sistema de logging personalizado para depuração do bot
 */

const fs = require('fs');
const path = require('path');

// Cria diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Escreve log em arquivo e console
 */
function writeLog(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    data
  };

  // Log no console com cores
  const colors = {
    ERROR: '\x1b[31m', // Vermelho
    WARN: '\x1b[33m',  // Amarelo
    INFO: '\x1b[36m',  // Ciano
    DEBUG: '\x1b[37m'  // Branco
  };
  
  const resetColor = '\x1b[0m';
  const color = colors[level] || colors.INFO;
  
  console.log(`${color}[${timestamp}] [${level}] [${category}] ${message}${resetColor}`);
  if (data) {
    console.log(color + JSON.stringify(data, null, 2) + resetColor);
  }

  // Log em arquivo (apenas para erros e debugging importantes)
  if (level === 'ERROR' || category === 'REMINDER' || category === 'CONFIRMATION') {
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFileSync(logFile, logLine, 'utf8');
  }
}

const logger = {
  error: (category, message, data) => writeLog('ERROR', category, message, data),
  warn: (category, message, data) => writeLog('WARN', category, message, data),
  info: (category, message, data) => writeLog('INFO', category, message, data),
  debug: (category, message, data) => writeLog('DEBUG', category, message, data)
};

module.exports = logger;
