#!/usr/bin/env node

// 🔗 INTEGRADOR GOOGLE CLOUD
// Conecta o CredentialsManager com o GoogleCloudManager

const GoogleCloudManager = require('../connectors/google-cloud-manager');
const CredentialsManager = require('./credentials-manager');
const { GoogleAuth } = require('google-auth-library');

class GoogleCloudIntegrator {
  constructor() {
    this.credentialsManager = new CredentialsManager();
    this.cloudManager = null;
  }

  /**
   * 🚀 Inicializar Google Cloud Manager com credenciais seguras
   */
  async initialize() {
    console.log('🔐 Carregando credenciais Google Cloud...');
    
    const credentials = this.credentialsManager.loadCredentials('google-cloud-admin');
    
    if (!credentials) {
      console.log('❌ Credenciais Google Cloud não encontradas');
      console.log('Execute o comando de configuração primeiro: npm run setup:google-credentials');
      return false;
    }

    try {
      // Se estiver usando ADC
      if (credentials.useADC) {
        console.log('🔧 Usando Application Default Credentials...');
        this.cloudManager = new GoogleCloudManager(null);
      } else {
        console.log('🔑 Usando credenciais de Service Account...');
        this.cloudManager = new GoogleCloudManager(credentials);
      }

      console.log('✅ Google Cloud Manager inicializado!');
      return true;

    } catch (error) {
      console.error('❌ Erro ao inicializar Google Cloud Manager:', error.message);
      return false;
    }
  }

  /**
   * 🏗️ Criar projeto Google Cloud para cliente
   */
  async createClientProject(clientName) {
    if (!this.cloudManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Google Cloud Manager');
      }
    }

    return await this.cloudManager.setupClientGoogleAccess(clientName);
  }

  /**
   * 📋 Listar projetos de clientes
   */
  async listClientProjects() {
    if (!this.cloudManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Google Cloud Manager');
      }
    }

    return await this.cloudManager.listClientProjects();
  }

  /**
   * 🗑️ Deletar projeto
   */
  async deleteProject(projectId) {
    if (!this.cloudManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Google Cloud Manager');
      }
    }

    return await this.cloudManager.deleteProject(projectId);
  }

  /**
   * 🧪 Testar credenciais
   */
  async testCredentials(credentials) {
    if (!this.cloudManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Google Cloud Manager');
      }
    }

    return await this.cloudManager.testCredentials(credentials);
  }

  /**
   * ✅ Verificar se está pronto para uso
   */
  isReady() {
    return this.credentialsManager.hasGoogleCloudCredentials();
  }

  /**
   * 📊 Status do integrador
   */
  getStatus() {
    const credentialsStatus = this.credentialsManager.getCredentialsStatus();
    
    return {
      isReady: this.isReady(),
      hasCloudManager: this.cloudManager !== null,
      credentialsStatus
    };
  }

  /**
   * 🔧 Configurar credenciais (interface amigável)
   */
  async setupCredentials() {
    return await this.credentialsManager.addGoogleCloudAdminCredentials();
  }
}

module.exports = GoogleCloudIntegrator;
