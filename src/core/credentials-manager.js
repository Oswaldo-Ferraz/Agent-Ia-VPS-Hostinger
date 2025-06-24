#!/usr/bin/env node

// 🔐 GERENCIADOR DE CREDENCIAIS SEGURO
// Sistema para armazenar e gerenciar credenciais de forma segura

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

class CredentialsManager {
  constructor() {
    this.credentialsDir = path.join(__dirname, '../../config/credentials');
    this.masterKeyFile = path.join(this.credentialsDir, '.master.key');
    this.credentialsFile = path.join(this.credentialsDir, 'encrypted-credentials.json');
    
    // Criar diretório se não existir
    if (!fs.existsSync(this.credentialsDir)) {
      fs.mkdirSync(this.credentialsDir, { recursive: true });
    }
  }

  /**
   * 🔑 Gerar ou carregar chave mestra
   */
  getMasterKey() {
    if (fs.existsSync(this.masterKeyFile)) {
      return fs.readFileSync(this.masterKeyFile, 'utf8').trim();
    } else {
      const key = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(this.masterKeyFile, key, { mode: 0o600 });
      console.log('🔑 Nova chave mestra gerada e salva');
      return key;
    }
  }

  /**
   * 🔒 Criptografar dados
   */
  encrypt(data) {
    const key = this.getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      data: encrypted
    };
  }

  /**
   * 🔓 Descriptografar dados
   */
  decrypt(encryptedData) {
    const key = this.getMasterKey();
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * 💾 Salvar credenciais criptografadas
   */
  saveCredentials(type, credentials) {
    let allCredentials = {};
    
    // Carregar credenciais existentes
    if (fs.existsSync(this.credentialsFile)) {
      const encrypted = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
      allCredentials = this.decrypt(encrypted);
    }
    
    // Adicionar novas credenciais
    allCredentials[type] = credentials;
    
    // Criptografar e salvar
    const encrypted = this.encrypt(allCredentials);
    fs.writeFileSync(this.credentialsFile, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
    
    console.log(`🔐 Credenciais ${type} salvas com segurança`);
  }

  /**
   * 📖 Carregar credenciais específicas
   */
  loadCredentials(type) {
    if (!fs.existsSync(this.credentialsFile)) {
      return null;
    }
    
    try {
      const encrypted = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
      const allCredentials = this.decrypt(encrypted);
      return allCredentials[type] || null;
    } catch (error) {
      console.error('❌ Erro ao carregar credenciais:', error.message);
      return null;
    }
  }

  /**
   * 📋 Listar tipos de credenciais disponíveis
   */
  listCredentialTypes() {
    if (!fs.existsSync(this.credentialsFile)) {
      return [];
    }
    
    try {
      const encrypted = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
      const allCredentials = this.decrypt(encrypted);
      return Object.keys(allCredentials);
    } catch (error) {
      console.error('❌ Erro ao listar credenciais:', error.message);
      return [];
    }
  }

  /**
   * 🗑️ Remover credenciais
   */
  removeCredentials(type) {
    if (!fs.existsSync(this.credentialsFile)) {
      console.log('❌ Nenhuma credencial encontrada');
      return;
    }
    
    try {
      const encrypted = JSON.parse(fs.readFileSync(this.credentialsFile, 'utf8'));
      const allCredentials = this.decrypt(encrypted);
      
      if (allCredentials[type]) {
        delete allCredentials[type];
        
        // Salvar alterações
        const newEncrypted = this.encrypt(allCredentials);
        fs.writeFileSync(this.credentialsFile, JSON.stringify(newEncrypted, null, 2), { mode: 0o600 });
        
        console.log(`🗑️ Credenciais ${type} removidas`);
      } else {
        console.log(`❌ Credenciais ${type} não encontradas`);
      }
    } catch (error) {
      console.error('❌ Erro ao remover credenciais:', error.message);
    }
  }

  /**
   * 🎯 Interface para adicionar credenciais Google Cloud Admin
   */
  async addGoogleCloudAdminCredentials() {
    console.log('\n🔐 CONFIGURAÇÃO DE CREDENCIAIS GOOGLE CLOUD ADMIN\n');
    console.log('Para usar o Google Cloud Manager, você precisa fornecer credenciais de admin.');
    console.log('Estas são as credenciais da sua conta Google Cloud que tem permissões para:');
    console.log('• Criar projetos');
    console.log('• Ativar APIs');
    console.log('• Criar Service Accounts');
    console.log('• Gerenciar IAM\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('Escolha uma opção:');
      console.log('1. Carregar arquivo JSON de credenciais');
      console.log('2. Inserir credenciais manualmente');
      console.log('3. Usar Application Default Credentials (ADC)');
      console.log('4. Cancelar\n');

      rl.question('Opção (1-4): ', async (option) => {
        switch (option) {
          case '1':
            await this.loadCredentialsFromFile(rl, resolve);
            break;
          case '2':
            await this.inputCredentialsManually(rl, resolve);
            break;
          case '3':
            await this.useApplicationDefaultCredentials(rl, resolve);
            break;
          default:
            console.log('❌ Configuração cancelada');
            rl.close();
            resolve(false);
        }
      });
    });
  }

  /**
   * 📁 Carregar credenciais de arquivo
   */
  async loadCredentialsFromFile(rl, resolve) {
    rl.question('Digite o caminho para o arquivo JSON de credenciais: ', (filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          const credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.saveCredentials('google-cloud-admin', credentials);
          console.log('✅ Credenciais carregadas e salvas com segurança!');
          resolve(true);
        } else {
          console.log('❌ Arquivo não encontrado');
          resolve(false);
        }
      } catch (error) {
        console.log('❌ Erro ao carregar arquivo:', error.message);
        resolve(false);
      }
      rl.close();
    });
  }

  /**
   * ✍️ Inserir credenciais manualmente
   */
  async inputCredentialsManually(rl, resolve) {
    console.log('\nInsira as informações do arquivo JSON de credenciais:');
    
    const credentials = {};
    
    rl.question('Project ID: ', (projectId) => {
      credentials.project_id = projectId;
      
      rl.question('Client Email: ', (clientEmail) => {
        credentials.client_email = clientEmail;
        
        rl.question('Client ID: ', (clientId) => {
          credentials.client_id = clientId;
          
          rl.question('Private Key (cole a chave completa): ', (privateKey) => {
            credentials.private_key = privateKey.replace(/\\n/g, '\n');
            credentials.type = 'service_account';
            credentials.auth_uri = 'https://accounts.google.com/o/oauth2/auth';
            credentials.token_uri = 'https://oauth2.googleapis.com/token';
            
            this.saveCredentials('google-cloud-admin', credentials);
            console.log('✅ Credenciais inseridas e salvas com segurança!');
            rl.close();
            resolve(true);
          });
        });
      });
    });
  }

  /**
   * 🔧 Usar Application Default Credentials
   */
  async useApplicationDefaultCredentials(rl, resolve) {
    console.log('\n🔧 Configurando para usar Application Default Credentials...');
    console.log('Certifique-se de ter executado: gcloud auth application-default login');
    
    this.saveCredentials('google-cloud-admin', { useADC: true });
    console.log('✅ Configurado para usar ADC!');
    rl.close();
    resolve(true);
  }

  /**
   * ✅ Verificar se credenciais Google Cloud estão configuradas
   */
  hasGoogleCloudCredentials() {
    const credentials = this.loadCredentials('google-cloud-admin');
    return credentials !== null;
  }

  /**
   * 📊 Status das credenciais
   */
  getCredentialsStatus() {
    const types = this.listCredentialTypes();
    
    return {
      hasGoogleCloudAdmin: types.includes('google-cloud-admin'),
      availableTypes: types,
      totalCredentials: types.length
    };
  }
}

module.exports = CredentialsManager;
