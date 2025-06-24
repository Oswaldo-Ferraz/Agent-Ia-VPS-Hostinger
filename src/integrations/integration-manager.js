const path = require('path');
const ClientManager = require('../core/client-manager');

/**
 * 🔌 INTEGRATION MANAGER
 * Gerencia todas as integrações de forma centralizada
 */
class IntegrationManager {
  constructor() {
    this.clientManager = new ClientManager();
    this.connectors = new Map();
    this.loadConnectors();
  }

  /**
   * 📦 Carregar todos os conectores disponíveis
   */
  loadConnectors() {
    // Conectores disponíveis
    const connectorList = [
      'google-connector',
      'stripe-connector', 
      'whatsapp-connector',
      'email-connector',
      'crm-connector',
      'api-connector'
    ];

    connectorList.forEach(connectorName => {
      try {
        const ConnectorClass = require(`./connectors/${connectorName}`);
        this.connectors.set(connectorName.replace('-connector', ''), ConnectorClass);
        console.log(`✅ Conector ${connectorName} carregado`);
      } catch (error) {
        console.log(`⚠️  Conector ${connectorName} não encontrado (será criado)`);
      }
    });
  }

  /**
   * 🔧 Configurar integração para cliente
   */
  async configureIntegration(clientId, service, config) {
    try {
      // Verificar se o conector existe
      if (!this.connectors.has(service)) {
        throw new Error(`Conector para ${service} não encontrado`);
      }

      // Validar credenciais com o conector
      const ConnectorClass = this.connectors.get(service);
      const connector = new ConnectorClass(config);
      
      const isValid = await connector.validateCredentials();
      if (!isValid) {
        throw new Error(`Credenciais inválidas para ${service}`);
      }

      // Salvar configuração no cliente
      await this.clientManager.updateClientCredentials(clientId, service, config);
      await this.clientManager.updateClientIntegration(clientId, service, {
        enabled: true,
        config: config,
        validated_at: new Date().toISOString()
      });

      console.log(`✅ Integração ${service} configurada para cliente ${clientId}`);
      return true;

    } catch (error) {
      console.error(`❌ Erro ao configurar ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * 🔍 Testar integração
   */
  async testIntegration(clientId, service) {
    try {
      const credentials = await this.clientManager.getClientCredentials(clientId, service);
      
      if (!this.connectors.has(service)) {
        throw new Error(`Conector para ${service} não encontrado`);
      }

      const ConnectorClass = this.connectors.get(service);
      const connector = new ConnectorClass(credentials);
      
      const testResult = await connector.testConnection();
      
      console.log(`🧪 Teste de ${service}:`, testResult.success ? '✅ OK' : '❌ FALHOU');
      console.log('📊 Detalhes:', testResult.details);
      
      return testResult;

    } catch (error) {
      console.error(`❌ Erro no teste de ${service}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📋 Listar integrações disponíveis
   */
  getAvailableIntegrations() {
    return Array.from(this.connectors.keys()).map(service => ({
      service,
      status: 'disponível',
      description: this.getServiceDescription(service)
    }));
  }

  /**
   * 👤 Obter integrações do cliente
   */
  async getClientIntegrations(clientId) {
    try {
      const client = await this.clientManager.getClient(clientId);
      const integrations = [];

      for (const [service, config] of Object.entries(client.integrations || {})) {
        integrations.push({
          service,
          enabled: config.enabled,
          configured_at: config.updated_at,
          status: config.enabled ? 'ativo' : 'inativo'
        });
      }

      return integrations;
    } catch (error) {
      console.error('❌ Erro ao buscar integrações:', error.message);
      return [];
    }
  }

  /**
   * 🔄 Executar ação em integração
   */
  async executeIntegrationAction(clientId, service, action, params = {}) {
    try {
      const credentials = await this.clientManager.getClientCredentials(clientId, service);
      
      if (!this.connectors.has(service)) {
        throw new Error(`Conector para ${service} não encontrado`);
      }

      const ConnectorClass = this.connectors.get(service);
      const connector = new ConnectorClass(credentials);
      
      // Executar ação específica
      if (typeof connector[action] === 'function') {
        const result = await connector[action](params);
        console.log(`✅ Ação ${action} executada em ${service}`);
        return result;
      } else {
        throw new Error(`Ação ${action} não disponível no conector ${service}`);
      }

    } catch (error) {
      console.error(`❌ Erro ao executar ${action} em ${service}:`, error.message);
      throw error;
    }
  }

  /**
   * 📖 Obter descrição do serviço
   */
  getServiceDescription(service) {
    const descriptions = {
      google: 'Google Calendar, Gmail, Drive - Sincronização de eventos e emails',
      stripe: 'Stripe Payments - Processamento de pagamentos e assinaturas',
      whatsapp: 'WhatsApp Business API - Envio de mensagens e automações',
      email: 'Email SMTP - Envio de emails transacionais',
      crm: 'CRM Genérico - Integração com sistemas de CRM',
      api: 'API Genérica - Conectores customizados para APIs'
    };

    return descriptions[service] || 'Integração personalizada';
  }

  /**
   * 🔐 Validar todas as integrações do cliente
   */
  async validateAllClientIntegrations(clientId) {
    try {
      const integrations = await this.getClientIntegrations(clientId);
      const results = {};

      for (const integration of integrations) {
        if (integration.enabled) {
          try {
            const testResult = await this.testIntegration(clientId, integration.service);
            results[integration.service] = testResult;
          } catch (error) {
            results[integration.service] = { 
              success: false, 
              error: error.message 
            };
          }
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Erro na validação geral:', error.message);
      return {};
    }
  }

  /**
   * 🚫 Desabilitar integração
   */
  async disableIntegration(clientId, service) {
    try {
      const client = await this.clientManager.getClient(clientId);
      
      if (client.integrations && client.integrations[service]) {
        client.integrations[service].enabled = false;
        client.integrations[service].disabled_at = new Date().toISOString();
        
        await this.clientManager.saveClient(client);
        console.log(`🚫 Integração ${service} desabilitada para cliente ${clientId}`);
        return true;
      }

      throw new Error(`Integração ${service} não encontrada`);
    } catch (error) {
      console.error(`❌ Erro ao desabilitar ${service}:`, error.message);
      throw error;
    }
  }
}

module.exports = IntegrationManager;
