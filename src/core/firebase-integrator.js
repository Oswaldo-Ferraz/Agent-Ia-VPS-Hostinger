#!/usr/bin/env node

// 🔥 FIREBASE INTEGRATOR
// Conecta Firebase Manager com nosso sistema multi-cliente

const FirebaseManager = require('../connectors/firebase-manager');
const CredentialsManager = require('./credentials-manager');
const Anthropic = require('@anthropic-ai/sdk');

class FirebaseIntegrator {
  constructor() {
    this.credentialsManager = new CredentialsManager();
    this.firebaseManager = null;
    this.claudeApi = null;
  }

  /**
   * 🚀 Inicializar Firebase Manager
   */
  async initialize() {
    console.log('🔥 Inicializando Firebase Integrator...');
    
    try {
      // Carregar credenciais Google Cloud
      const credentials = this.credentialsManager.loadCredentials('google-cloud-admin');
      
      if (!credentials) {
        console.log('❌ Credenciais Google Cloud não encontradas');
        console.log('Execute: npm run setup:google-credentials');
        return false;
      }

      // Inicializar Firebase Manager
      this.firebaseManager = new FirebaseManager(credentials);
      
      // Inicializar Claude API
      this.claudeApi = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY
      });
      
      console.log('✅ Firebase Integrator inicializado!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase Integrator:', error.message);
      return false;
    }
  }

  /**
   * 🔥 Criar projeto Firebase para cliente
   */
  async createFirebaseProjectForClient(clientName, customProjectId = null) {
    if (!this.firebaseManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Firebase Manager');
      }
    }

    return await this.firebaseManager.createFirebaseProject(clientName, customProjectId);
  }

  /**
   * ⚡ Criar Function com Claude
   */
  async createClaudeFunction(projectId, functionName, description) {
    if (!this.firebaseManager || !this.claudeApi) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Firebase Integrator');
      }
    }

    return await this.firebaseManager.createClaudeFunction(
      projectId, 
      functionName, 
      description, 
      this.claudeApi
    );
  }

  /**
   * 🚀 Deploy de Functions
   */
  async deployFunctions(projectId) {
    if (!this.firebaseManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Firebase Manager');
      }
    }

    return await this.firebaseManager.deployFunctions(projectId);
  }

  /**
   * 📋 Listar Functions
   */
  async listFunctions(projectId) {
    if (!this.firebaseManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Firebase Manager');
      }
    }

    return await this.firebaseManager.listFunctions(projectId);
  }

  /**
   * 🗑️ Deletar projeto
   */
  async deleteProject(projectId) {
    if (!this.firebaseManager) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Falha ao inicializar Firebase Manager');
      }
    }

    return await this.firebaseManager.deleteFirebaseProject(projectId);
  }

  /**
   * 🎯 Setup completo: Cliente + Firebase + Functions
   */
  async setupCompleteFirebaseClient(clientName, functionsToCreate = []) {
    console.log(`\n🔥 SETUP COMPLETO FIREBASE PARA: ${clientName}\n`);
    
    try {
      // 1. Criar projeto Firebase
      console.log('1. 🔥 Criando projeto Firebase...');
      const project = await this.createFirebaseProjectForClient(clientName);
      
      if (!project.success) {
        throw new Error('Falha ao criar projeto Firebase');
      }
      
      console.log(`✅ Projeto criado: ${project.projectId}`);
      
      // 2. Criar Functions com Claude
      if (functionsToCreate.length > 0) {
        console.log('2. ⚡ Criando Functions com Claude...');
        
        for (const func of functionsToCreate) {
          console.log(`   Criando function: ${func.name}`);
          await this.createClaudeFunction(
            project.projectId,
            func.name,
            func.description
          );
        }
      }
      
      // 3. Functions padrão
      console.log('3. 🛠️ Criando Functions padrão...');
      
      const defaultFunctions = [
        {
          name: 'webhookHandler',
          description: 'Function para receber e processar webhooks de diferentes serviços'
        },
        {
          name: 'emailSender',
          description: 'Function para envio de emails usando SendGrid ou Nodemailer'
        },
        {
          name: 'dataProcessor',
          description: 'Function para processar e validar dados de formulários'
        }
      ];
      
      for (const func of defaultFunctions) {
        await this.createClaudeFunction(
          project.projectId,
          func.name,
          func.description
        );
      }
      
      console.log('\n🎉 SETUP FIREBASE CONCLUÍDO!');
      console.log(`📁 Projeto: ${project.projectId}`);
      console.log(`🌐 Console: ${project.consoleUrl}`);
      console.log(`📂 Código: ${project.functionsPath}`);
      
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. cd ' + project.functionsPath);
      console.log('2. npm install');
      console.log('3. firebase login');
      console.log('4. firebase use ' + project.projectId);
      console.log('5. firebase deploy --only functions');
      
      return project;
      
    } catch (error) {
      console.error(`❌ Erro no setup Firebase: ${error.message}`);
      throw error;
    }
  }

  /**
   * ✅ Verificar se está pronto
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
      hasFirebaseManager: this.firebaseManager !== null,
      hasClaudeApi: this.claudeApi !== null,
      credentialsStatus
    };
  }
}

module.exports = FirebaseIntegrator;
