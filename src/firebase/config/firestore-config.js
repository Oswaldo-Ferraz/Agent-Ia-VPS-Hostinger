const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

/**
 * 🔥 CONFIGURAÇÃO FIRESTORE
 * Sistema multiempresa com collections e subcollections
 */

class FirestoreConfig {
  constructor() {
    // Inicializar Firebase Admin se ainda não foi inicializado
    if (!admin.apps.length) {
      // Usar credenciais do ambiente ou arquivo de credenciais
      const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
        ? null 
        : require('../../../config/credentials/firebase-admin-sdk.json');
      
      admin.initializeApp({
        credential: serviceAccount 
          ? admin.credential.cert(serviceAccount)
          : admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    }
    
    this.db = admin.firestore();
    this.FieldValue = FieldValue;
  }

  /**
   * 📊 Estrutura das Collections
   */
  getCollections() {
    return {
      // Collection principal de empresas
      companies: 'companies',
      
      // Subcollections por empresa
      clients: (companyId) => `companies/${companyId}/clients`,
      conversations: (companyId, clientId) => `companies/${companyId}/clients/${clientId}/conversations`,
      paymentHistory: (companyId) => `companies/${companyId}/paymentHistory`,
      
      // Collections auxiliares
      systemStats: 'systemStats',
      auditLogs: 'auditLogs'
    };
  }

  /**
   * 🔧 Inicializar estrutura básica
   */
  async initializeCollections() {
    console.log('🔥 Inicializando estrutura Firestore...');
    
    const collections = this.getCollections();
    
    // Criar documento de estatísticas do sistema
    await this.db.collection(collections.systemStats).doc('general').set({
      totalCompanies: 0,
      totalClients: 0,
      totalConversations: 0,
      createdAt: this.FieldValue.serverTimestamp(),
      lastUpdated: this.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Estrutura Firestore inicializada');
    return true;
  }

  /**
   * 📋 Obter referência de collection
   */
  getCollection(collectionName) {
    return this.db.collection(collectionName);
  }

  /**
   * 📋 Obter referência de subcollection
   */
  getSubcollection(parentPath, subcollectionName) {
    return this.db.collection(`${parentPath}/${subcollectionName}`);
  }

  /**
   * 🧪 Testar conexão
   */
  async testConnection() {
    try {
      const testDoc = await this.db.collection('test').doc('connection').get();
      console.log('✅ Conexão Firestore estabelecida');
      return true;
    } catch (error) {
      console.error('❌ Erro na conexão Firestore:', error.message);
      return false;
    }
  }

  /**
   * 📊 Estatísticas do banco
   */
  async getDatabaseStats() {
    try {
      const stats = await this.db.collection('systemStats').doc('general').get();
      return stats.exists ? stats.data() : null;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error.message);
      return null;
    }
  }

  /**
   * 🔄 Atualizar contador global
   */
  async updateGlobalCounter(field, increment = 1) {
    const statsRef = this.db.collection('systemStats').doc('general');
    await statsRef.update({
      [field]: this.FieldValue.increment(increment),
      lastUpdated: this.FieldValue.serverTimestamp()
    });
  }
}

module.exports = FirestoreConfig;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  async function testFirestore() {
    console.log('\n🧪 TESTANDO CONFIGURAÇÃO FIRESTORE\n');
    
    const firestore = new FirestoreConfig();
    
    // Teste 1: Conexão
    console.log('1. Testando conexão...');
    const connected = await firestore.testConnection();
    
    if (connected) {
      // Teste 2: Inicializar estrutura
      console.log('2. Inicializando estrutura...');
      await firestore.initializeCollections();
      
      // Teste 3: Verificar collections
      console.log('3. Verificando collections disponíveis...');
      const collections = firestore.getCollections();
      console.log('Collections:', Object.keys(collections));
      
      // Teste 4: Estatísticas
      console.log('4. Obtendo estatísticas...');
      const stats = await firestore.getDatabaseStats();
      console.log('Stats:', stats);
      
      console.log('\n✅ TESTE FIRESTORE CONCLUÍDO COM SUCESSO!\n');
    } else {
      console.log('\n❌ FALHA NA CONEXÃO FIRESTORE\n');
    }
  }
  
  testFirestore().catch(console.error);
}
