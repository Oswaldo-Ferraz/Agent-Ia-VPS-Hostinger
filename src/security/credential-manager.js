#!/usr/bin/env node

// 🔐 CREDENTIAL MANAGER - Sistema de Credenciais Seguras
// Criptografia AES-256 + Gestão de credenciais por cliente

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class CredentialManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 32;
    
    this.credentialsPath = path.join(__dirname, '../../config/credentials');
    this.masterKeyFile = path.join(this.credentialsPath, 'master.key');
    this.configFile = path.join(this.credentialsPath, 'encryption.config');
    
    this.ensureCredentialsDirectory();
  }

  // Garantir que diretório de credenciais existe
  async ensureCredentialsDirectory() {
    try {
      await fs.access(this.credentialsPath);
    } catch {
      await fs.mkdir(this.credentialsPath, { recursive: true, mode: 0o700 });
      console.log('🔐 Diretório de credenciais criado com permissões seguras');
    }
  }

  // Gerar chave mestra
  async generateMasterKey() {
    try {
      const masterKey = crypto.randomBytes(this.keyLength);
      const keyHex = masterKey.toString('hex');
      
      // Salvar chave mestra com permissões restritas
      await fs.writeFile(this.masterKeyFile, keyHex, { mode: 0o600 });
      
      // Criar configuração de criptografia
      const config = {
        algorithm: this.algorithm,
        created_at: new Date().toISOString(),
        version: '1.0.0',
        description: 'Configuração de criptografia AES-256-GCM'
      };
      
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
      
      console.log('🔑 Chave mestra gerada e salva com segurança');
      return keyHex;
      
    } catch (error) {
      console.error('❌ Erro ao gerar chave mestra:', error.message);
      throw error;
    }
  }

  // Carregar chave mestra
  async loadMasterKey() {
    try {
      // Tentar carregar de variável de ambiente primeiro
      if (process.env.MASTER_ENCRYPTION_KEY) {
        return process.env.MASTER_ENCRYPTION_KEY;
      }

      // Carregar do arquivo
      const keyHex = await fs.readFile(this.masterKeyFile, 'utf8');
      return keyHex.trim();
      
    } catch (error) {
      console.log('🔑 Chave mestra não encontrada, gerando nova...');
      return await this.generateMasterKey();
    }
  }

  // Derivar chave específica para cliente
  deriveClientKey(masterKey, clientId, service) {
    const salt = crypto.createHash('sha256')
      .update(`${clientId}:${service}`)
      .digest();
    
    return crypto.pbkdf2Sync(
      Buffer.from(masterKey, 'hex'),
      salt,
      100000, // 100k iterações
      this.keyLength,
      'sha512'
    );
  }

  // Criptografar dados
  encrypt(data, masterKey, clientId, service) {
    try {
      const key = this.deriveClientKey(masterKey, clientId, service);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        algorithm: 'aes-256-cbc',
        encrypted,
        iv: iv.toString('hex'),
        clientId,
        service,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Erro ao criptografar:', error.message);
      throw error;
    }
  }

  // Descriptografar dados
  decrypt(encryptedData, masterKey, clientId, service) {
    try {
      const key = this.deriveClientKey(masterKey, clientId, service);
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
      
    } catch (error) {
      console.error('❌ Erro ao descriptografar:', error.message);
      throw error;
    }
  }

  // Salvar credenciais de cliente
  async saveClientCredentials(clientId, service, credentials) {
    try {
      const masterKey = await this.loadMasterKey();
      
      // Criptografar credenciais
      const encryptedData = this.encrypt(credentials, masterKey, clientId, service);
      
      // Salvar em arquivo específico do cliente e serviço
      const credentialFile = path.join(
        this.credentialsPath, 
        `${clientId}-${service}.cred`
      );
      
      await fs.writeFile(
        credentialFile, 
        JSON.stringify(encryptedData, null, 2), 
        { mode: 0o600 }
      );
      
      console.log(`🔐 Credenciais ${service} salvas para cliente ${clientId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar credenciais:', error.message);
      throw error;
    }
  }

  // Carregar credenciais de cliente
  async loadClientCredentials(clientId, service) {
    try {
      const credentialFile = path.join(
        this.credentialsPath, 
        `${clientId}-${service}.cred`
      );
      
      const encryptedData = JSON.parse(
        await fs.readFile(credentialFile, 'utf8')
      );
      
      const masterKey = await this.loadMasterKey();
      
      // Descriptografar
      const credentials = this.decrypt(encryptedData, masterKey, clientId, service);
      
      return credentials;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Credenciais ${service} não encontradas para cliente ${clientId}`);
      }
      console.error('❌ Erro ao carregar credenciais:', error.message);
      throw error;
    }
  }

  // Listar credenciais de um cliente
  async listClientCredentials(clientId) {
    try {
      const files = await fs.readdir(this.credentialsPath);
      const clientCredentials = files
        .filter(file => file.startsWith(`${clientId}-`) && file.endsWith('.cred'))
        .map(file => {
          const service = file.replace(`${clientId}-`, '').replace('.cred', '');
          return service;
        });
      
      return clientCredentials;
      
    } catch (error) {
      console.error('❌ Erro ao listar credenciais:', error.message);
      return [];
    }
  }

  // Deletar credenciais de um serviço
  async deleteClientCredentials(clientId, service) {
    try {
      const credentialFile = path.join(
        this.credentialsPath, 
        `${clientId}-${service}.cred`
      );
      
      await fs.unlink(credentialFile);
      console.log(`🗑️ Credenciais ${service} deletadas para cliente ${clientId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao deletar credenciais:', error.message);
      throw error;
    }
  }

  // Testar credenciais (verificar se podem ser descriptografadas)
  async testCredentials(clientId, service) {
    try {
      const credentials = await this.loadClientCredentials(clientId, service);
      console.log(`✅ Credenciais ${service} para cliente ${clientId} são válidas`);
      return true;
    } catch (error) {
      console.log(`❌ Credenciais ${service} para cliente ${clientId} são inválidas: ${error.message}`);
      return false;
    }
  }

  // Rotacionar chave mestra (re-criptografar tudo)
  async rotateMasterKey() {
    try {
      console.log('🔄 Iniciando rotação da chave mestra...');
      
      // Carregar chave atual
      const oldMasterKey = await this.loadMasterKey();
      
      // Gerar nova chave
      const newMasterKey = crypto.randomBytes(this.keyLength).toString('hex');
      
      // Listar todos os arquivos de credenciais
      const files = await fs.readdir(this.credentialsPath);
      const credFiles = files.filter(file => file.endsWith('.cred'));
      
      const backup = {};
      
      // Descriptografar todas as credenciais com chave antiga
      for (const file of credFiles) {
        const [clientId, serviceWithExt] = file.split('-');
        const service = serviceWithExt.replace('.cred', '');
        
        try {
          const credentials = await this.loadClientCredentials(clientId, service);
          backup[`${clientId}-${service}`] = credentials;
        } catch (error) {
          console.error(`⚠️ Erro ao descriptografar ${file}: ${error.message}`);
        }
      }
      
      // Salvar nova chave mestra
      await fs.writeFile(this.masterKeyFile, newMasterKey, { mode: 0o600 });
      
      // Re-criptografar todas as credenciais com nova chave
      for (const [key, credentials] of Object.entries(backup)) {
        const [clientId, service] = key.split('-');
        await this.saveClientCredentials(clientId, service, credentials);
      }
      
      console.log(`✅ Rotação concluída! ${Object.keys(backup).length} credenciais re-criptografadas`);
      return newMasterKey;
      
    } catch (error) {
      console.error('❌ Erro na rotação da chave:', error.message);
      throw error;
    }
  }

  // Backup seguro de credenciais
  async backupCredentials(outputPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(outputPath || __dirname, `credentials-backup-${timestamp}.json`);
      
      // Listar todos os arquivos
      const files = await fs.readdir(this.credentialsPath);
      const credFiles = files.filter(file => file.endsWith('.cred'));
      
      const backup = {
        timestamp,
        algorithm: this.algorithm,
        total_files: credFiles.length,
        credentials: {}
      };
      
      // Incluir dados criptografados (sem descriptografar)
      for (const file of credFiles) {
        const filePath = path.join(this.credentialsPath, file);
        const encryptedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        backup.credentials[file] = encryptedData;
      }
      
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), { mode: 0o600 });
      
      console.log(`💾 Backup criado: ${backupFile}`);
      return backupFile;
      
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error.message);
      throw error;
    }
  }

  // Estatísticas de credenciais
  async getCredentialsStats() {
    try {
      const files = await fs.readdir(this.credentialsPath);
      const credFiles = files.filter(file => file.endsWith('.cred'));
      
      const stats = {
        total_credential_files: credFiles.length,
        clients_with_credentials: new Set(),
        services: {},
        oldest_credential: null,
        newest_credential: null
      };
      
      for (const file of credFiles) {
        const [clientId, serviceWithExt] = file.split('-');
        const service = serviceWithExt.replace('.cred', '');
        
        stats.clients_with_credentials.add(clientId);
        stats.services[service] = (stats.services[service] || 0) + 1;
        
        // Verificar timestamps
        try {
          const filePath = path.join(this.credentialsPath, file);
          const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
          const timestamp = new Date(data.timestamp);
          
          if (!stats.oldest_credential || timestamp < stats.oldest_credential) {
            stats.oldest_credential = timestamp;
          }
          
          if (!stats.newest_credential || timestamp > stats.newest_credential) {
            stats.newest_credential = timestamp;
          }
        } catch (error) {
          // Ignorar erros de parsing
        }
      }
      
      stats.unique_clients = stats.clients_with_credentials.size;
      stats.clients_with_credentials = Array.from(stats.clients_with_credentials);
      
      return stats;
      
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return null;
    }
  }

  // Validar integridade de todas as credenciais
  async validateAllCredentials() {
    try {
      const files = await fs.readdir(this.credentialsPath);
      const credFiles = files.filter(file => file.endsWith('.cred'));
      
      const results = {
        total: credFiles.length,
        valid: 0,
        invalid: 0,
        errors: []
      };
      
      for (const file of credFiles) {
        const [clientId, serviceWithExt] = file.split('-');
        const service = serviceWithExt.replace('.cred', '');
        
        try {
          await this.loadClientCredentials(clientId, service);
          results.valid++;
        } catch (error) {
          results.invalid++;
          results.errors.push({
            file,
            clientId,
            service,
            error: error.message
          });
        }
      }
      
      console.log(`🔍 Validação concluída: ${results.valid}/${results.total} válidas`);
      return results;
      
    } catch (error) {
      console.error('❌ Erro na validação:', error.message);
      throw error;
    }
  }
}

// Exportar classe
module.exports = CredentialManager;

// Se executado diretamente, mostrar testes
if (require.main === module) {
  async function testCredentialManager() {
    const credManager = new CredentialManager();

    console.log('\n🔐 TESTANDO CREDENTIAL MANAGER\n');

    try {
      // Testar credenciais do Google
      const googleCreds = {
        client_id: '123456789.apps.googleusercontent.com',
        client_secret: 'GOCSPX-test-secret-key',
        service_account: {
          type: 'service_account',
          project_id: 'test-project',
          private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n'
        }
      };

      // Salvar credenciais
      await credManager.saveClientCredentials('test-client-001', 'google', googleCreds);

      // Carregar e verificar
      const loadedCreds = await credManager.loadClientCredentials('test-client-001', 'google');
      console.log('✅ Credenciais Google carregadas:', Object.keys(loadedCreds));

      // Testar credenciais Stripe
      const stripeCreds = {
        public_key: 'pk_test_123456789',
        secret_key: 'sk_test_987654321',
        webhook_secret: 'whsec_test_webhook_secret'
      };

      await credManager.saveClientCredentials('test-client-001', 'stripe', stripeCreds);

      // Listar credenciais do cliente
      const clientCreds = await credManager.listClientCredentials('test-client-001');
      console.log('📋 Credenciais do cliente:', clientCreds);

      // Estatísticas
      const stats = await credManager.getCredentialsStats();
      console.log('📊 Estatísticas:', JSON.stringify(stats, null, 2));

      // Validar todas
      const validation = await credManager.validateAllCredentials();
      console.log('🔍 Validação:', validation);

    } catch (error) {
      console.error('❌ Erro no teste:', error.message);
    }
  }

  testCredentialManager();
}
