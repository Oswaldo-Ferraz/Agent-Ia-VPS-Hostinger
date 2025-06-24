const fs = require('fs').promises;
const path = require('path');
const GoogleCloudIntegrator = require('./google-cloud-integrator');
const FirebaseIntegrator = require('./firebase-integrator');

/**
 * 🏢 CLIENT MANAGER - Sistema Multi-Cliente Simplificado
 * Gerencia múltiplos clientes com credenciais e configurações isoladas
 */
class ClientManager {
  constructor() {
    this.clientsDir = path.join(__dirname, '../../config/clients');
    this.indexFile = path.join(this.clientsDir, 'clients-index.json');
    this.googleCloudIntegrator = new GoogleCloudIntegrator();
    this.firebaseIntegrator = new FirebaseIntegrator();
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

  /**
   * 🌐 INTEGRAÇÃO GOOGLE CLOUD
   */

  /**
   * 🏗️ Criar projeto Google Cloud para cliente
   */
  async setupGoogleCloudForClient(clientId, autoCreate = true) {
    console.log(`\n🌐 Configurando Google Cloud para cliente: ${clientId}`);

    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      console.log(`👤 Cliente: ${client.name}`);

      if (autoCreate) {
        console.log('🏗️ Criando projeto Google Cloud automaticamente...');
        
        const result = await this.googleCloudIntegrator.createClientProject(client.name);
        
        if (result.success) {
          // Salvar credenciais no cliente
          await this.addCredentials(clientId, 'google-cloud', {
            projectId: result.projectId,
            serviceAccountEmail: result.serviceAccountEmail,
            credentials: result.credentials,
            enabledApis: result.enabledApis,
            createdAt: new Date().toISOString()
          });

          console.log('✅ Projeto Google Cloud criado e configurado!');
          console.log(`📁 Projeto: ${result.projectId}`);
          console.log(`👤 Service Account: ${result.serviceAccountEmail}`);
          console.log(`🔌 APIs ativadas: ${result.enabledApis.length}`);

          return {
            success: true,
            projectId: result.projectId,
            serviceAccountEmail: result.serviceAccountEmail,
            enabledApis: result.enabledApis
          };
        } else {
          throw new Error('Falha ao criar projeto Google Cloud');
        }
      } else {
        console.log('🔧 Modo manual - adicione as credenciais manualmente');
        return { success: false, manual: true };
      }

    } catch (error) {
      console.error('❌ Erro ao configurar Google Cloud:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Listar projetos Google Cloud de todos os clientes
   */
  async listGoogleCloudProjects() {
    try {
      const projects = await this.googleCloudIntegrator.listClientProjects();
      const clients = await this.listClients();
      
      // Relacionar projetos com clientes
      const result = projects.map(project => {
        const client = clients.find(c => 
          c.integrations.googleCloud && 
          c.integrations.googleCloud.projectId === project.projectId
        );
        
        return {
          ...project,
          clientName: client ? client.name : 'Cliente não encontrado',
          clientId: client ? client.id : null
        };
      });

      return result;
    } catch (error) {
      console.error('❌ Erro ao listar projetos Google Cloud:', error.message);
      return [];
    }
  }

  /**
   * 🧪 Testar integração Google Cloud de um cliente
   */
  async testGoogleCloudIntegration(clientId) {
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const googleCredentials = client.credentials.googleCloud;
      if (!googleCredentials) {
        throw new Error('Cliente não possui credenciais Google Cloud');
      }

      console.log(`🧪 Testando integração Google Cloud para: ${client.name}`);
      
      const testResult = await this.googleCloudIntegrator.testCredentials(googleCredentials.credentials);
      
      if (testResult) {
        console.log('✅ Integração Google Cloud funcionando!');
        return { success: true, projectId: googleCredentials.projectId };
      } else {
        console.log('❌ Falha no teste de integração');
        return { success: false, error: 'Teste de credenciais falhou' };
      }

    } catch (error) {
      console.error('❌ Erro ao testar integração:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 Setup completo de cliente com Google Cloud
   */
  async createClientWithGoogleCloud(clientData, setupGoogleCloud = true) {
    console.log(`\n🚀 CRIANDO CLIENTE COMPLETO: ${clientData.name}`);

    try {
      // 1. Criar cliente básico
      console.log('1. 👤 Criando cliente...');
      const client = await this.createClient(clientData);
      console.log(`   ✅ Cliente criado: ${client.id}`);

      // 2. Configurar Google Cloud se solicitado
      if (setupGoogleCloud) {
        console.log('2. 🌐 Configurando Google Cloud...');
        
        if (this.googleCloudIntegrator.isReady()) {
          try {
            const gcResult = await this.setupGoogleCloudForClient(client.id, true);
            if (gcResult.success) {
              console.log('   ✅ Google Cloud configurado');
            } else {
              console.log('   ⚠️ Google Cloud não configurado automaticamente');
            }
          } catch (error) {
            console.log('   ⚠️ Erro no Google Cloud:', error.message);
          }
        } else {
          console.log('   ⚠️ Credenciais Google Cloud não configuradas');
          console.log('   Execute: node scripts/setup-google-credentials.js');
        }
      }

      console.log('\n🎉 CLIENTE CRIADO COM SUCESSO!');
      return client;

    } catch (error) {
      console.error('❌ Erro ao criar cliente completo:', error.message);
      throw error;
    }
  }

  /**
   * 🔥 INTEGRAÇÃO FIREBASE
   */

  /**
   * 🔥 Configurar Firebase para cliente
   */
  async setupFirebaseForClient(clientId, customProjectId = null) {
    console.log(`\n🔥 Configurando Firebase para cliente: ${clientId}`);

    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      console.log(`👤 Cliente: ${client.name}`);

      const result = await this.firebaseIntegrator.createFirebaseProjectForClient(
        client.name, 
        customProjectId
      );

      if (result.success) {
        // Salvar informações do Firebase no cliente
        await this.addCredentials(clientId, 'firebase', {
          projectId: result.projectId,
          functionsPath: result.functionsPath,
          consoleUrl: result.consoleUrl,
          createdAt: new Date().toISOString()
        });

        console.log('✅ Projeto Firebase criado e configurado!');
        console.log(`🔥 Projeto: ${result.projectId}`);
        console.log(`🌐 Console: ${result.consoleUrl}`);

        return {
          success: true,
          projectId: result.projectId,
          consoleUrl: result.consoleUrl,
          functionsPath: result.functionsPath
        };
      } else {
        throw new Error('Falha ao criar projeto Firebase');
      }

    } catch (error) {
      console.error('❌ Erro ao configurar Firebase:', error.message);
      throw error;
    }
  }

  /**
   * ⚡ Criar Firebase Function com Claude
   */
  async createFirebaseFunction(clientId, functionName, description) {
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const firebaseCredentials = client.credentials.firebase;
      if (!firebaseCredentials) {
        throw new Error('Cliente não possui projeto Firebase configurado');
      }

      console.log(`⚡ Criando function "${functionName}" para: ${client.name}`);

      const result = await this.firebaseIntegrator.createClaudeFunction(
        firebaseCredentials.projectId,
        functionName,
        description
      );

      if (result.success) {
        console.log(`✅ Function "${functionName}" criada com sucesso!`);
        console.log(`📁 Arquivo: ${result.file}`);
        
        return {
          success: true,
          functionName: result.functionName,
          file: result.file,
          projectId: firebaseCredentials.projectId
        };
      } else {
        throw new Error('Falha ao criar function');
      }

    } catch (error) {
      console.error('❌ Erro ao criar function:', error.message);
      throw error;
    }
  }

  /**
   * 🚀 Deploy Firebase Functions
   */
  async deployFirebaseFunctions(clientId) {
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const firebaseCredentials = client.credentials.firebase;
      if (!firebaseCredentials) {
        throw new Error('Cliente não possui projeto Firebase configurado');
      }

      console.log(`🚀 Fazendo deploy das functions para: ${client.name}`);

      const result = await this.firebaseIntegrator.deployFunctions(
        firebaseCredentials.projectId
      );

      if (result.success) {
        console.log('✅ Deploy realizado com sucesso!');
        console.log(`🌐 Console: ${result.consoleUrl}`);
        
        return {
          success: true,
          projectId: firebaseCredentials.projectId,
          consoleUrl: result.consoleUrl
        };
      } else {
        throw new Error('Falha no deploy');
      }

    } catch (error) {
      console.error('❌ Erro no deploy:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Listar Firebase Functions do cliente
   */
  async listFirebaseFunctions(clientId) {
    try {
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      const firebaseCredentials = client.credentials.firebase;
      if (!firebaseCredentials) {
        throw new Error('Cliente não possui projeto Firebase configurado');
      }

      const functions = await this.firebaseIntegrator.listFunctions(
        firebaseCredentials.projectId
      );

      return {
        clientName: client.name,
        projectId: firebaseCredentials.projectId,
        functions: functions
      };

    } catch (error) {
      console.error('❌ Erro ao listar functions:', error.message);
      return { functions: [] };
    }
  }

  /**
   * 🎯 Setup completo: Cliente + Google Cloud + Firebase
   */
  async createClientWithFirebase(clientData, setupGoogleCloud = true, setupFirebase = true) {
    console.log(`\n🔥 CRIANDO CLIENTE COMPLETO COM FIREBASE: ${clientData.name}`);

    try {
      // 1. Criar cliente básico
      console.log('1. 👤 Criando cliente...');
      const client = await this.createClient(clientData);
      console.log(`   ✅ Cliente criado: ${client.id}`);

      // 2. Configurar Google Cloud se solicitado
      if (setupGoogleCloud && this.googleCloudIntegrator.isReady()) {
        console.log('2. 🌐 Configurando Google Cloud...');
        try {
          const gcResult = await this.setupGoogleCloudForClient(client.id, true);
          if (gcResult.success) {
            console.log('   ✅ Google Cloud configurado');
          }
        } catch (error) {
          console.log('   ⚠️ Erro no Google Cloud:', error.message);
        }
      }

      // 3. Configurar Firebase se solicitado
      if (setupFirebase && this.firebaseIntegrator.isReady()) {
        console.log('3. 🔥 Configurando Firebase...');
        try {
          const firebaseResult = await this.setupFirebaseForClient(client.id);
          if (firebaseResult.success) {
            console.log('   ✅ Firebase configurado');
            
            // 4. Criar functions padrão
            console.log('4. ⚡ Criando functions padrão...');
            const defaultFunctions = [
              { name: 'apiHandler', description: 'Function para endpoints de API REST' },
              { name: 'webhookProcessor', description: 'Function para processar webhooks' }
            ];
            
            for (const func of defaultFunctions) {
              await this.createFirebaseFunction(client.id, func.name, func.description);
            }
          }
        } catch (error) {
          console.log('   ⚠️ Erro no Firebase:', error.message);
        }
      }

      console.log('\n🎉 CLIENTE COM FIREBASE CRIADO COM SUCESSO!');
      return client;

    } catch (error) {
      console.error('❌ Erro ao criar cliente completo:', error.message);
      throw error;
    }
  }
}

module.exports = ClientManager;
