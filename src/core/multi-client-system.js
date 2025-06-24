#!/usr/bin/env node

// 🔗 MULTI-CLIENT INTEGRATION - Integração Cliente + Credenciais
// Sistema completo para gestão multi-cliente com credenciais seguras

const ClientManager = require('./client-manager');
const CredentialManager = require('../security/credential-manager');

class MultiClientSystem {
  constructor() {
    this.clientManager = new ClientManager();
    this.credentialManager = new CredentialManager();
  }

  // Criar cliente com credenciais
  async createClientWithCredentials(clientData, credentialsData = {}) {
    try {
      console.log(`🏢 Criando cliente completo: ${clientData.name}`);

      // 1. Criar cliente
      const client = await this.clientManager.createClient(clientData);

      // 2. Salvar credenciais se fornecidas
      for (const [service, credentials] of Object.entries(credentialsData)) {
        if (credentials && Object.keys(credentials).length > 0) {
          await this.credentialManager.saveClientCredentials(client.id, service, credentials);
          console.log(`🔐 Credenciais ${service} salvas para ${client.name}`);
        }
      }

      // 3. Atualizar cliente com serviços configurados
      const servicesConfigured = Object.keys(credentialsData);
      if (servicesConfigured.length > 0) {
        const integrations = {};
        servicesConfigured.forEach(service => {
          integrations[service] = {
            enabled: true,
            configured_at: new Date().toISOString()
          };
        });

        await this.clientManager.updateClient(client.id, {
          integrations: { ...client.integrations, ...integrations }
        });
      }

      console.log(`✅ Cliente ${client.name} criado com ${servicesConfigured.length} serviços configurados`);
      return client;

    } catch (error) {
      console.error('❌ Erro ao criar cliente completo:', error.message);
      throw error;
    }
  }

  // Buscar credenciais de um cliente para um serviço
  async getClientCredentials(clientIdOrName, service) {
    try {
      // Buscar cliente (por ID ou nome)
      let client;
      if (clientIdOrName.length === 16) { // ID tem 16 chars
        client = await this.clientManager.getClient(clientIdOrName);
      } else {
        client = await this.clientManager.getClientByName(clientIdOrName);
      }

      // Carregar credenciais
      const credentials = await this.credentialManager.loadClientCredentials(client.id, service);
      
      return {
        client,
        credentials,
        service
      };

    } catch (error) {
      console.error(`❌ Erro ao buscar credenciais ${service}:`, error.message);
      throw error;
    }
  }

  // Configurar credenciais para um cliente existente
  async setClientCredentials(clientIdOrName, service, credentials) {
    try {
      // Buscar cliente
      let client;
      if (clientIdOrName.length === 16) {
        client = await this.clientManager.getClient(clientIdOrName);
      } else {
        client = await this.clientManager.getClientByName(clientIdOrName);
      }

      // Salvar credenciais
      await this.credentialManager.saveClientCredentials(client.id, service, credentials);

      // Atualizar integrações do cliente
      const integrations = client.integrations || {};
      integrations[service] = {
        enabled: true,
        configured_at: new Date().toISOString()
      };

      await this.clientManager.updateClient(client.id, { integrations });

      console.log(`✅ Credenciais ${service} configuradas para ${client.name}`);
      return true;

    } catch (error) {
      console.error('❌ Erro ao configurar credenciais:', error.message);
      throw error;
    }
  }

  // Listar todos os clientes com suas integrações
  async listClientsWithIntegrations() {
    try {
      const clients = await this.clientManager.listClientsDetailed();
      
      const result = [];
      
      for (const client of clients) {
        const availableCredentials = await this.credentialManager.listClientCredentials(client.id);
        
        result.push({
          ...client,
          available_services: availableCredentials,
          integration_count: availableCredentials.length
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Erro ao listar clientes:', error.message);
      throw error;
    }
  }

  // Testar conexão de um serviço para um cliente
  async testClientIntegration(clientIdOrName, service) {
    try {
      console.log(`🧪 Testando integração ${service} para cliente...`);

      const { client, credentials } = await this.getClientCredentials(clientIdOrName, service);

      // Teste básico: verificar se credenciais existem e têm campos necessários
      const requiredFields = this.getRequiredFields(service);
      const missingFields = requiredFields.filter(field => !credentials[field]);

      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
      }

      console.log(`✅ Integração ${service} para ${client.name} parece válida`);
      return {
        client: client.name,
        service,
        status: 'valid',
        fields_present: Object.keys(credentials).length,
        required_fields: requiredFields.length
      };

    } catch (error) {
      console.log(`❌ Integração ${service} inválida: ${error.message}`);
      return {
        service,
        status: 'invalid',
        error: error.message
      };
    }
  }

  // Definir campos obrigatórios por serviço
  getRequiredFields(service) {
    const fields = {
      google: ['client_id', 'client_secret'],
      stripe: ['secret_key'],
      whatsapp: ['token'],
      mailgun: ['api_key', 'domain'],
      twillio: ['account_sid', 'auth_token'],
      hubspot: ['api_key'],
      rdstation: ['client_id', 'client_secret']
    };

    return fields[service] || [];
  }

  // Buscar cliente por site (útil para contexto automático)
  async getClientBySite(domain) {
    try {
      const client = await this.clientManager.getClientBySite(domain);
      const availableCredentials = await this.credentialManager.listClientCredentials(client.id);
      
      return {
        ...client,
        available_services: availableCredentials
      };

    } catch (error) {
      console.error(`❌ Cliente não encontrado para site ${domain}:`, error.message);
      throw error;
    }
  }

  // Dashboard completo de um cliente
  async getClientDashboard(clientIdOrName) {
    try {
      // Buscar cliente
      let client;
      if (clientIdOrName.length === 16) {
        client = await this.clientManager.getClient(clientIdOrName);
      } else {
        client = await this.clientManager.getClientByName(clientIdOrName);
      }

      // Credenciais disponíveis
      const availableCredentials = await this.credentialManager.listClientCredentials(client.id);

      // Testar cada serviço
      const integrationTests = {};
      for (const service of availableCredentials) {
        integrationTests[service] = await this.testClientIntegration(client.id, service);
      }

      return {
        client,
        services: {
          total: availableCredentials.length,
          available: availableCredentials,
          tests: integrationTests
        },
        summary: {
          active_integrations: Object.values(integrationTests).filter(t => t.status === 'valid').length,
          failed_integrations: Object.values(integrationTests).filter(t => t.status === 'invalid').length,
          total_sites: client.sites.length
        }
      };

    } catch (error) {
      console.error('❌ Erro ao gerar dashboard:', error.message);
      throw error;
    }
  }

  // Relatório geral do sistema
  async getSystemReport() {
    try {
      const clientStats = await this.clientManager.getStats();
      const credentialStats = await this.credentialManager.getCredentialsStats();
      
      return {
        timestamp: new Date().toISOString(),
        clients: clientStats,
        credentials: credentialStats,
        health: {
          total_clients: clientStats.total_clients,
          clients_with_credentials: credentialStats.unique_clients,
          coverage_percentage: Math.round(
            (credentialStats.unique_clients / clientStats.total_clients) * 100
          )
        }
      };

    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error.message);
      throw error;
    }
  }

  // Backup completo do sistema
  async backupSystem() {
    try {
      console.log('💾 Iniciando backup completo do sistema...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Backup de clientes
      const clientsBackup = await this.clientManager.backupClients();
      
      // Backup de credenciais
      const credentialsBackup = await this.credentialManager.backupCredentials();

      console.log('✅ Backup completo realizado');
      return {
        timestamp,
        clients_backup: clientsBackup,
        credentials_backup: credentialsBackup
      };

    } catch (error) {
      console.error('❌ Erro no backup:', error.message);
      throw error;
    }
  }

  // Migrar cliente (útil para mudanças de estrutura)
  async migrateClient(clientId, newStructure) {
    try {
      console.log(`🔄 Migrando cliente ${clientId}...`);
      
      const client = await this.clientManager.getClient(clientId);
      const credentials = await this.credentialManager.listClientCredentials(clientId);

      // Aplicar nova estrutura
      const updatedClient = { ...client, ...newStructure };
      await this.clientManager.updateClient(clientId, updatedClient);

      console.log(`✅ Cliente ${client.name} migrado com sucesso`);
      return updatedClient;

    } catch (error) {
      console.error('❌ Erro na migração:', error.message);
      throw error;
    }
  }
}

// Exportar classe
module.exports = MultiClientSystem;

// Se executado diretamente, mostrar exemplo completo
if (require.main === module) {
  async function demonstrateMultiClientSystem() {
    const system = new MultiClientSystem();

    console.log('\n🏢 DEMONSTRAÇÃO DO SISTEMA MULTI-CLIENTE\n');

    try {
      // 1. Criar cliente com credenciais
      const client = await system.createClientWithCredentials(
        {
          name: 'Agência Fer Digital',
          email: 'contato@agenciafer.com.br',
          company: 'Agência Fer Marketing Digital Ltda',
          sites: ['agenciafer.com.br', 'aiofotoevideo.com.br'],
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          currency: 'BRL'
        },
        {
          google: {
            client_id: '123456789.apps.googleusercontent.com',
            client_secret: 'GOCSPX-example-secret',
            service_account: JSON.stringify({
              type: 'service_account',
              project_id: 'agencia-fer-calendar'
            })
          },
          stripe: {
            public_key: 'pk_test_example',
            secret_key: 'sk_test_example',
            webhook_secret: 'whsec_example'
          }
        }
      );

      // 2. Testar integrações
      await system.testClientIntegration(client.id, 'google');
      await system.testClientIntegration(client.id, 'stripe');

      // 3. Dashboard do cliente
      const dashboard = await system.getClientDashboard(client.id);
      console.log('\n📊 DASHBOARD DO CLIENTE:');
      console.log(`Cliente: ${dashboard.client.name}`);
      console.log(`Serviços: ${dashboard.services.total}`);
      console.log(`Integrações ativas: ${dashboard.summary.active_integrations}`);

      // 4. Buscar por site
      const clientBySite = await system.getClientBySite('agenciafer.com.br');
      console.log(`\n🌐 Cliente do site agenciafer.com.br: ${clientBySite.name}`);

      // 5. Relatório geral
      const report = await system.getSystemReport();
      console.log('\n📈 RELATÓRIO GERAL:');
      console.log(`Total de clientes: ${report.clients.total_clients}`);
      console.log(`Cobertura de credenciais: ${report.health.coverage_percentage}%`);

    } catch (error) {
      console.error('❌ Erro na demonstração:', error.message);
    }
  }

  demonstrateMultiClientSystem();
}
