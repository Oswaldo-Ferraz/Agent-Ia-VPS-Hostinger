#!/usr/bin/env node

// 🏢 COMANDOS CLI PARA CLIENT MANAGER
// Integração do sistema multi-cliente com o agente principal

const ClientManager = require('./client-manager');

class ClientCLI {
  constructor() {
    this.clientManager = new ClientManager();
  }

  /**
   * 👥 Criar novo cliente via CLI
   */
  async createClientCommand(name, options = {}) {
    try {
      const clientData = {
        name,
        email: options.email || '',
        sites: options.sites ? options.sites.split(',').map(domain => ({ domain: domain.trim() })) : [],
        credentials: {},
        integrations: {}
      };

      const client = await this.clientManager.createClient(clientData);
      
      console.log(`\n🎉 CLIENTE CRIADO COM SUCESSO!`);
      console.log(`📋 Nome: ${client.name}`);
      console.log(`🆔 ID: ${client.id}`);
      console.log(`🌐 Sites: ${client.sites.map(s => s.domain).join(', ') || 'Nenhum'}`);
      
      return client;
    } catch (error) {
      console.error(`❌ Erro ao criar cliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📋 Listar todos os clientes
   */
  async listClientsCommand() {
    try {
      const clients = await this.clientManager.listClients();
      
      if (clients.length === 0) {
        console.log('📭 Nenhum cliente cadastrado ainda.');
        return;
      }

      console.log('\n👥 CLIENTES CADASTRADOS:\n');
      
      for (const client of clients) {
        const stats = await this.clientManager.getClientStats(client.id);
        console.log(`🏢 ${client.name} (${client.id})`);
        console.log(`   📧 ${client.email}`);
        console.log(`   🌐 Sites: ${stats.sites_count} (${stats.active_sites} ativos)`);
        console.log(`   🔗 Integrações: ${stats.integrations_count} ativas`);
        console.log(`   🔑 Credenciais: ${stats.credentials_count} serviços`);
        console.log(`   📅 Criado: ${new Date(client.created_at).toLocaleDateString()}`);
        console.log('');
      }
      
      return clients;
    } catch (error) {
      console.error(`❌ Erro ao listar clientes: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔑 Configurar credenciais de cliente
   */
  async setCredentialsCommand(clientId, service, credentials) {
    try {
      const client = await this.clientManager.updateClientCredentials(clientId, service, credentials);
      
      console.log(`\n🔑 CREDENCIAIS CONFIGURADAS!`);
      console.log(`🏢 Cliente: ${client.name}`);
      console.log(`🔧 Serviço: ${service}`);
      console.log(`✅ Status: Configurado com sucesso`);
      
      return client;
    } catch (error) {
      console.error(`❌ Erro ao configurar credenciais: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🌐 Adicionar site ao cliente
   */
  async addSiteCommand(clientId, domain, wpPath) {
    try {
      const siteData = {
        domain,
        wp_path: wpPath || `/domains/${domain}/public_html`
      };

      const client = await this.clientManager.addSiteToClient(clientId, siteData);
      
      console.log(`\n🌐 SITE ADICIONADO!`);
      console.log(`🏢 Cliente: ${client.name}`);
      console.log(`🌐 Domínio: ${domain}`);
      console.log(`📁 Path: ${siteData.wp_path}`);
      
      return client;
    } catch (error) {
      console.error(`❌ Erro ao adicionar site: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔍 Buscar cliente por nome ou ID
   */
  async getClientCommand(identifier) {
    try {
      let client;
      
      // Tentar por ID primeiro
      if (identifier.startsWith('client-')) {
        client = await this.clientManager.getClient(identifier);
      } else {
        // Buscar por nome
        client = await this.clientManager.getClientByName(identifier);
      }
      
      console.log(`\n🏢 CLIENTE ENCONTRADO:`);
      console.log(`📋 Nome: ${client.name}`);
      console.log(`🆔 ID: ${client.id}`);
      console.log(`📧 Email: ${client.email}`);
      console.log(`🌐 Sites: ${client.sites.map(s => s.domain).join(', ')}`);
      console.log(`🔑 Credenciais: ${Object.keys(client.credentials).join(', ')}`);
      console.log(`🔗 Integrações: ${Object.keys(client.integrations).join(', ')}`);
      console.log(`📅 Criado: ${new Date(client.created_at).toLocaleDateString()}`);
      
      return client;
    } catch (error) {
      console.error(`❌ Cliente não encontrado: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🎯 Buscar cliente por site
   */
  async getClientBySiteCommand(domain) {
    try {
      const { client, site } = await this.clientManager.getClientBySite(domain);
      
      console.log(`\n🎯 CLIENTE DO SITE ${domain}:`);
      console.log(`🏢 Cliente: ${client.name} (${client.id})`);
      console.log(`📧 Email: ${client.email}`);
      console.log(`📁 Path WP: ${site.wp_path}`);
      console.log(`✅ Status: ${site.active ? 'Ativo' : 'Inativo'}`);
      
      return { client, site };
    } catch (error) {
      console.error(`❌ ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔗 Configurar integração
   */
  async setIntegrationCommand(clientId, service, config) {
    try {
      const client = await this.clientManager.updateClientIntegration(clientId, service, config);
      
      console.log(`\n🔗 INTEGRAÇÃO CONFIGURADA!`);
      console.log(`🏢 Cliente: ${client.name}`);
      console.log(`🔧 Serviço: ${service}`);
      console.log(`⚙️ Configuração: ${JSON.stringify(config, null, 2)}`);
      
      return client;
    } catch (error) {
      console.error(`❌ Erro ao configurar integração: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📊 Mostrar estatísticas de um cliente
   */
  async statsCommand(clientId) {
    try {
      const stats = await this.clientManager.getClientStats(clientId);
      
      console.log(`\n📊 ESTATÍSTICAS DO CLIENTE:`);
      console.log(`🏢 Nome: ${stats.name}`);
      console.log(`🆔 ID: ${stats.id}`);
      console.log(`🌐 Sites: ${stats.sites_count} total (${stats.active_sites} ativos)`);
      console.log(`🔗 Integrações: ${stats.integrations_count} total (${stats.active_integrations} ativas)`);
      console.log(`🔑 Credenciais: ${stats.credentials_count} serviços configurados`);
      console.log(`📅 Criado em: ${new Date(stats.created_at).toLocaleString()}`);
      console.log(`🔄 Atualizado em: ${new Date(stats.updated_at).toLocaleString()}`);
      
      return stats;
    } catch (error) {
      console.error(`❌ Erro ao obter estatísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🗑️ Remover cliente
   */
  async removeClientCommand(clientId) {
    try {
      const client = await this.clientManager.getClient(clientId);
      const result = await this.clientManager.removeClient(clientId);
      
      console.log(`\n🗑️ CLIENTE REMOVIDO!`);
      console.log(`🏢 Nome: ${client.name}`);
      console.log(`🆔 ID: ${clientId}`);
      console.log(`✅ Status: Removido com sucesso`);
      
      return result;
    } catch (error) {
      console.error(`❌ Erro ao remover cliente: ${error.message}`);
      throw error;
    }
  }

  /**
   * 💡 Mostrar ajuda dos comandos de cliente
   */
  showHelp() {
    console.log(`
🏢 COMANDOS DO CLIENT MANAGER:

👥 GESTÃO DE CLIENTES:
• client create [nome] --email="..." --sites="site1.com,site2.com"
• client list
• client get [nome ou ID]
• client stats [clientId]
• client remove [clientId]

🌐 GESTÃO DE SITES:
• client add-site [clientId] [domain] [wpPath]
• client get-by-site [domain]

🔑 CREDENCIAIS:
• client set-credentials [clientId] [service] [credentials]

🔗 INTEGRAÇÕES:
• client set-integration [clientId] [service] [config]

📋 EXEMPLOS:
• client create "Agência Fer" --email="contato@agenciafer.com.br" --sites="agenciafer.com.br"
• client set-credentials client-abc123 google '{"client_id":"...","secret":"..."}'
• client add-site client-abc123 blog.agenciafer.com.br
• client get-by-site agenciafer.com.br
`);
  }
}

module.exports = ClientCLI;
