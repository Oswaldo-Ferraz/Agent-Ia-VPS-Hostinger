/**
 * 🔌 BASE CONNECTOR
 * Interface padrão para todos os conectores de integração
 */
class BaseConnector {
  constructor(credentials = {}) {
    this.credentials = credentials;
    this.isConfigured = false;
    this.lastTest = null;
  }

  /**
   * 🔑 Validar credenciais (implementar em cada conector)
   */
  async validateCredentials() {
    throw new Error('validateCredentials() deve ser implementado no conector');
  }

  /**
   * 🧪 Testar conexão (implementar em cada conector)
   */
  async testConnection() {
    throw new Error('testConnection() deve ser implementado no conector');
  }

  /**
   * ⚙️ Configurar conector
   */
  configure(credentials) {
    this.credentials = { ...this.credentials, ...credentials };
    this.isConfigured = true;
    return this;
  }

  /**
   * 📊 Obter status da conexão
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      last_test: this.lastTest,
      credentials_present: Object.keys(this.credentials).length > 0
    };
  }

  /**
   * 🔧 Métodos auxiliares para validação
   */
  requireCredentials(requiredKeys) {
    const missing = requiredKeys.filter(key => !this.credentials[key]);
    
    if (missing.length > 0) {
      throw new Error(`Credenciais obrigatórias ausentes: ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * 📝 Log de atividades
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.constructor.name}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(`❌ ${logMessage}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${logMessage}`);
        break;
      case 'success':
        console.log(`✅ ${logMessage}`);
        break;
      default:
        console.log(`ℹ️  ${logMessage}`);
    }
  }

  /**
   * 🔄 Retry com backoff exponencial
   */
  async retry(fn, maxAttempts = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.log(`Tentativa ${attempt} falhou, tentando novamente em ${delay}ms`, 'warn');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 🎯 Executar com timeout
   */
  async withTimeout(promise, timeoutMs = 30000) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na operação')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}

module.exports = BaseConnector;
