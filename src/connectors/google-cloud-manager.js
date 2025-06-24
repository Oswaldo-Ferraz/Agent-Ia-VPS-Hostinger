#!/usr/bin/env node

// 🌐 GOOGLE CLOUD MANAGER AUTOMÁTICO
// Cria projetos, ativa APIs e gera credenciais automaticamente

const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

class GoogleCloudManager {
  constructor(adminCredentials) {
    // Credenciais de admin do Google Cloud que você vai fornecer
    this.adminAuth = new GoogleAuth({
      credentials: adminCredentials,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloudresourcemanager',
        'https://www.googleapis.com/auth/iam',
        'https://www.googleapis.com/auth/servicemanagement'
      ]
    });
    
    this.resourceManager = google.cloudresourcemanager('v1');
    this.serviceUsage = google.serviceusage('v1');
    this.iam = google.iam('v1');
  }

  /**
   * 🏗️ Criar projeto completo para cliente
   */
  async createClientProject(clientName) {
    console.log(`🏗️ Criando projeto Google Cloud para: ${clientName}`);
    
    const projectId = `client-${clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    try {
      // 1. Criar projeto
      console.log('1. 📁 Criando projeto...');
      const auth = await this.adminAuth.getClient();
      
      const project = await this.resourceManager.projects.create({
        auth,
        requestBody: {
          projectId,
          name: `${clientName} - AI Agent Project`,
          labels: {
            'created-by': 'ai-agent',
            'client': clientName.toLowerCase().replace(/\s+/g, '-')
          }
        }
      });
      
      console.log(`✅ Projeto criado: ${projectId}`);
      
      // 2. Ativar APIs necessárias
      const apis = [
        'calendar-json.googleapis.com',
        'gmail.googleapis.com',
        'drive.googleapis.com',
        'sheets.googleapis.com',
        'docs.googleapis.com',
        'forms.googleapis.com',
        'slides.googleapis.com',
        'contacts.googleapis.com',
        'people.googleapis.com'
      ];
      
      console.log('2. 🔌 Ativando APIs...');
      for (const api of apis) {
        await this.enableAPI(projectId, api);
        console.log(`   ✅ ${api} ativada`);
      }
      
      // 3. Criar Service Account
      console.log('3. 🔑 Criando Service Account...');
      const serviceAccount = await this.createServiceAccount(projectId, clientName);
      
      // 4. Gerar chave JSON
      console.log('4. 📄 Gerando credenciais JSON...');
      const credentials = await this.createServiceAccountKey(projectId, serviceAccount.email);
      
      // 5. Configurar permissões
      console.log('5. 🔐 Configurando permissões...');
      await this.setupPermissions(projectId, serviceAccount.email);
      
      return {
        success: true,
        projectId,
        serviceAccount,
        credentials,
        apis: apis
      };
      
    } catch (error) {
      console.error(`❌ Erro ao criar projeto: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔌 Ativar API específica
   */
  async enableAPI(projectId, apiName) {
    const auth = await this.adminAuth.getClient();
    
    await this.serviceUsage.services.enable({
      auth,
      name: `projects/${projectId}/services/${apiName}`
    });
  }

  /**
   * 👤 Criar Service Account
   */
  async createServiceAccount(projectId, clientName) {
    const auth = await this.adminAuth.getClient();
    
    const accountId = `ai-agent-${clientName.toLowerCase().replace(/\s+/g, '-')}`;
    
    const response = await this.iam.projects.serviceAccounts.create({
      auth,
      name: `projects/${projectId}`,
      requestBody: {
        accountId,
        serviceAccount: {
          displayName: `AI Agent - ${clientName}`,
          description: `Service Account criado automaticamente para ${clientName}`
        }
      }
    });
    
    return response.data;
  }

  /**
   * 🔑 Criar chave do Service Account
   */
  async createServiceAccountKey(projectId, serviceAccountEmail) {
    const auth = await this.adminAuth.getClient();
    
    const response = await this.iam.projects.serviceAccounts.keys.create({
      auth,
      name: `projects/${projectId}/serviceAccounts/${serviceAccountEmail}`,
      requestBody: {
        keyAlgorithm: 'KEY_ALG_RSA_2048',
        privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE'
      }
    });
    
    // Decodificar base64 para obter JSON
    const credentialsJson = Buffer.from(response.data.privateKeyData, 'base64').toString();
    return JSON.parse(credentialsJson);
  }

  /**
   * 🔐 Configurar permissões necessárias
   */
  async setupPermissions(projectId, serviceAccountEmail) {
    const auth = await this.adminAuth.getClient();
    
    const roles = [
      'roles/calendar.editor',
      'roles/gmail.modify',
      'roles/drive.file',
      'roles/sheets.editor',
      'roles/docs.editor'
    ];
    
    for (const role of roles) {
      await this.resourceManager.projects.setIamPolicy({
        auth,
        resource: projectId,
        requestBody: {
          policy: {
            bindings: [{
              role,
              members: [`serviceAccount:${serviceAccountEmail}`]
            }]
          }
        }
      });
    }
  }

  /**
   * 📋 Listar projetos do cliente
   */
  async listClientProjects() {
    const auth = await this.adminAuth.getClient();
    
    const response = await this.resourceManager.projects.list({
      auth,
      filter: 'labels.created-by:ai-agent'
    });
    
    return response.data.projects || [];
  }

  /**
   * 🗑️ Deletar projeto (cleanup)
   */
  async deleteProject(projectId) {
    const auth = await this.adminAuth.getClient();
    
    await this.resourceManager.projects.delete({
      auth,
      projectId
    });
    
    console.log(`🗑️ Projeto ${projectId} deletado`);
  }

  /**
   * 🧪 Testar credenciais criadas
   */
  async testCredentials(credentials) {
    try {
      const testAuth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly']
      });
      
      const calendar = google.calendar({ version: 'v3', auth: testAuth });
      await calendar.calendarList.list();
      
      console.log('✅ Credenciais funcionando perfeitamente!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao testar credenciais:', error.message);
      return false;
    }
  }

  /**
   * 🎯 Setup completo para cliente (método principal)
   */
  async setupClientGoogleAccess(clientName) {
    console.log(`\n🚀 CONFIGURAÇÃO AUTOMÁTICA GOOGLE CLOUD PARA: ${clientName}\n`);
    
    try {
      // Criar projeto completo
      const result = await this.createClientProject(clientName);
      
      // Testar credenciais
      const testResult = await this.testCredentials(result.credentials);
      
      if (testResult) {
        console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log(`📁 Projeto: ${result.projectId}`);
        console.log(`👤 Service Account: ${result.serviceAccount.email}`);
        console.log(`🔌 APIs ativadas: ${result.apis.length}`);
        console.log(`🔑 Credenciais: Prontas para uso`);
        
        return {
          success: true,
          projectId: result.projectId,
          serviceAccountEmail: result.serviceAccount.email,
          credentials: result.credentials,
          enabledApis: result.apis
        };
      } else {
        throw new Error('Falha no teste de credenciais');
      }
      
    } catch (error) {
      console.error(`❌ Falha na configuração: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GoogleCloudManager;
