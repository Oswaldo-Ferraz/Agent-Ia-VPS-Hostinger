const fs = require('fs').promises;
const path = require('path');

/**
 * 🏢 CLIENT MANAGER - Sistema Multi-Cliente Simplificado
 * Gerencia múltiplos clientes com credenciais e configurações isoladas
 */
class ClientManager {
  constructor() {
    this.clientsDir = path.join(__dirname, '../../config/clients');
    this.indexFile = path.join(this.clientsDir, 'clients-index.json');
    this.ensureDirectories();
  }

  /**
   * 📁 Garantir que diretórios existam
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.clientsDir, { recursive: true });
      
      // Criar índice se não existir
      try {
        await fs.access(this.indexFile);
      } catch {
        await this.saveIndex([]);
      }
    } catch (error) {
      console.error('❌ Erro ao criar diretórios:', error.message);
    }
  }

  /**
   * 🆔 Gerar ID único para cliente
   */
  generateClientId() {
    return 'client-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 👥 Criar novo cliente
   */
  async createClient(clientData) {
    const client = {
      id: this.generateClientId(),
      name: clientData.name,
      email: clientData.email || '',
      sites: clientData.sites || [],
      credentials: clientData.credentials || {},
      integrations: clientData.integrations || {},
      preferences: {
        default_ai: clientData.default_ai || 'auto',
        language: clientData.language || 'pt-BR',
        timezone: clientData.timezone || 'America/Sao_Paulo',
        currency: clientData.currency || 'BRL',
        ...clientData.preferences
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Salvar arquivo do cliente
    await this.saveClient(client);
    
    // Atualizar índice
    await this.addToIndex(client);

    console.log(`✅ Cliente "${client.name}" criado com ID: ${client.id}`);
    return client;
  }

  /**
   * 📄 Salvar cliente em arquivo
   */
  async saveClient(client) {
    const clientFile = path.join(this.clientsDir, `${client.id}.json`);
    client.updated_at = new Date().toISOString();
    
    await fs.writeFile(clientFile, JSON.stringify(client, null, 2));
  }

  /**
   * 📖 Buscar cliente por ID
   */
  async getClient(clientId) {
    try {
      const clientFile = path.join(this.clientsDir, `${clientId}.json`);
      const data = await fs.readFile(clientFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Cliente ${clientId} não encontrado`);
    }
  }

  /**
   * 📝 Buscar cliente por nome
   */
  async getClientByName(name) {
    const index = await this.getIndex();
    const clientInfo = index.find(c => c.name.toLowerCase() === name.toLowerCase());
    
    if (!clientInfo) {
      throw new Error(`Cliente "${name}" não encontrado`);
    }
    
    return await this.getClient(clientInfo.id);
  }

  /**
   * 📋 Listar todos os clientes
   */
  async listClients() {
    return await this.getIndex();
  }

  /**
   * 🔑 Obter credenciais de serviço para cliente
   */
  async getClientCredentials(clientId, service) {
    const client = await this.getClient(clientId);
    
    if (!client.credentials[service]) {
      throw new Error(`Credenciais para ${service} não encontradas para cliente ${clientId}`);
    }
    
    return client.credentials[service];
  }

  /**
   * 🔧 Atualizar credenciais de cliente
   */
  async updateClientCredentials(clientId, service, credentials) {
    const client = await this.getClient(clientId);
    
    if (!client.credentials) {
      client.credentials = {};
    }
    
    client.credentials[service] = credentials;
    await this.saveClient(client);
    
    console.log(`✅ Credenciais ${service} atualizadas para cliente ${client.name}`);
    return client;
  }

  /**
   * 🔗 Configurar integração para cliente
   */
  async updateClientIntegration(clientId, service, config) {
    const client = await this.getClient(clientId);
    
    if (!client.integrations) {
      client.integrations = {};
    }
    
    client.integrations[service] = {
      enabled: true,
      config,
      updated_at: new Date().toISOString()
    };
    
    await this.saveClient(client);
    
    console.log(`✅ Integração ${service} configurada para cliente ${client.name}`);
    return client;
  }

  /**
   * 🌐 Adicionar site ao cliente
   */
  async addSiteToClient(clientId, siteData) {
    const client = await this.getClient(clientId);
    
    const site = {
      domain: siteData.domain,
      wp_path: siteData.wp_path || `/domains/${siteData.domain}/public_html`,
      ssh_config: siteData.ssh_config || {},
      active: siteData.active !== false,
      added_at: new Date().toISOString()
    };
    
    client.sites.push(site);
    await this.saveClient(client);
    
    console.log(`✅ Site ${site.domain} adicionado ao cliente ${client.name}`);
    return client;
  }

  /**
   * 🗑️ Remover cliente
   */
  async removeClient(clientId) {
    const client = await this.getClient(clientId);
    
    // Remover arquivo do cliente
    const clientFile = path.join(this.clientsDir, `${clientId}.json`);
    await fs.unlink(clientFile);
    
    // Remover do índice
    await this.removeFromIndex(clientId);
    
    console.log(`✅ Cliente "${client.name}" removido`);
    return true;
  }

  /**
   * 📊 Estatísticas do cliente
   */
  async getClientStats(clientId) {
    const client = await this.getClient(clientId);
    
    return {
      id: client.id,
      name: client.name,
      sites_count: client.sites.length,
      active_sites: client.sites.filter(s => s.active).length,
      integrations_count: Object.keys(client.integrations).length,
      active_integrations: Object.values(client.integrations).filter(i => i.enabled).length,
      credentials_count: Object.keys(client.credentials).length,
      created_at: client.created_at,
      updated_at: client.updated_at
    };
  }

  /**
   * 🔍 Buscar cliente por domínio
   */
  async getClientBySite(domain) {
    const clients = await this.listClients();
    
    for (const clientInfo of clients) {
      const client = await this.getClient(clientInfo.id);
      const site = client.sites.find(s => s.domain === domain);
      
      if (site) {
        return { client, site };
      }
    }
    
    throw new Error(`Nenhum cliente encontrado para o site ${domain}`);
  }

  // === MÉTODOS INTERNOS DE ÍNDICE ===

  async getIndex() {
    try {
      const data = await fs.readFile(this.indexFile, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveIndex(index) {
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2));
  }

  async addToIndex(client) {
    let index = await this.getIndex();
    
    // Garantir que index é um array
    if (!Array.isArray(index)) {
      index = [];
    }
    
    const clientInfo = {
      id: client.id,
      name: client.name,
      email: client.email,
      sites: client.sites.map(s => s.domain),
      created_at: client.created_at
    };
    
    index.push(clientInfo);
    await this.saveIndex(index);
  }

  async removeFromIndex(clientId) {
    const index = await this.getIndex();
    const newIndex = index.filter(c => c.id !== clientId);
    await this.saveIndex(newIndex);
  }
}

module.exports = ClientManager;
