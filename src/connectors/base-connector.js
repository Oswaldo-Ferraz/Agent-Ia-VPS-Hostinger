const ClientManager = require('../core/client-manager');

/**
 * 🔗 CONECTOR BASE
 * Classe base para todos os conectores com SDK oficial
 */
class BaseConnector {
  constructor(clientId, service) {
    this.clientId = clientId;
    this.service = service;
    this.clientManager = new ClientManager();
    this.client = null;
    this.authenticated = false;
  }

  /**
   * 🔑 Obter credenciais do cliente
   */
  async getCredentials() {
    try {
      return await this.clientManager.getClientCredentials(this.clientId, this.service);
    } catch (error) {
      throw new Error(`❌ Credenciais ${this.service} não encontradas para cliente ${this.clientId}`);
    }
  }

  /**
   * 🔐 Autenticar com o serviço
   */
  async authenticate() {
    throw new Error('❌ Método authenticate() deve ser implementado pela classe filha');
  }

  /**
   * 🧪 Testar conexão
   */
  async testConnection() {
    throw new Error('❌ Método testConnection() deve ser implementado pela classe filha');
  }

  /**
   * ✅ Verificar se está autenticado
   */
  isAuthenticated() {
    return this.authenticated;
  }

  /**
   * 📊 Obter informações do cliente conectado
   */
  async getClientInfo() {
    const client = await this.clientManager.getClient(this.clientId);
    return {
      name: client.name,
      email: client.email,
      service: this.service,
      authenticated: this.authenticated
    };
  }
}

module.exports = BaseConnector;
