const FirestoreConfig = require('../config/firestore-config');
const Client = require('../../models/Client');

/**
 * 👤 CRUD CLIENTS
 * Operações básicas para gerenciar clientes por empresa
 */

class ClientsService {
  constructor() {
    this.firestore = new FirestoreConfig();
  }

  /**
   * 📁 Obter collection de clientes de uma empresa
   */
  getClientsCollection(companyId) {
    return this.firestore.db.collection(`companies/${companyId}/clients`);
  }

  /**
   * ➕ Criar novo cliente
   */
  async createClient(companyId, clientData) {
    try {
      console.log('👤 Criando novo cliente...');
      
      // Adicionar companyId aos dados
      clientData.companyId = companyId;
      
      // Criar instância do modelo
      const client = new Client(clientData);
      
      // Validar dados
      const validation = client.validate();
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }

      // Verificar se cliente já existe
      const existing = await this.findByContact(companyId, client.getPrimaryContact());
      if (existing) {
        throw new Error('Cliente já existe com este contato');
      }

      // Salvar no Firestore
      const clientsCollection = this.getClientsCollection(companyId);
      const clientRef = clientsCollection.doc(client.clientId);
      await clientRef.set(client.toFirestore());

      // Atualizar contador global e da empresa
      await this.firestore.updateGlobalCounter('totalClients');
      await this.updateCompanyClientCount(companyId, 1);

      console.log('✅ Cliente criado:', client.clientId);
      return client;

    } catch (error) {
      console.error('❌ Erro ao criar cliente:', error.message);
      throw error;
    }
  }

  /**
   * 📖 Buscar cliente por ID
   */
  async getClientById(companyId, clientId) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      const doc = await clientsCollection.doc(clientId).get();
      return Client.fromFirestore(doc);
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error.message);
      return null;
    }
  }

  /**
   * 🔍 Buscar cliente por contato (WhatsApp, email, phone)
   */
  async findByContact(companyId, contact) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      
      // Buscar por WhatsApp
      let query = await clientsCollection.where('contact.whatsapp', '==', contact).limit(1).get();
      if (!query.empty) {
        return Client.fromFirestore(query.docs[0]);
      }

      // Buscar por email
      query = await clientsCollection.where('contact.email', '==', contact).limit(1).get();
      if (!query.empty) {
        return Client.fromFirestore(query.docs[0]);
      }

      // Buscar por telefone
      query = await clientsCollection.where('contact.phone', '==', contact).limit(1).get();
      if (!query.empty) {
        return Client.fromFirestore(query.docs[0]);
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar por contato:', error.message);
      return null;
    }
  }

  /**
   * 📝 Atualizar cliente
   */
  async updateClient(companyId, clientId, updates) {
    try {
      console.log('📝 Atualizando cliente:', clientId);

      // Buscar cliente atual
      const existingClient = await this.getClientById(companyId, clientId);
      if (!existingClient) {
        throw new Error('Cliente não encontrado');
      }

      // Aplicar atualizações
      const updatedData = { ...existingClient.toFirestore(), ...updates };
      updatedData.updatedAt = this.firestore.FieldValue.serverTimestamp();
      
      const client = new Client(updatedData);

      // Validar dados atualizados
      const validation = client.validate();
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }

      // Salvar atualizações
      const clientsCollection = this.getClientsCollection(companyId);
      await clientsCollection.doc(clientId).update(updates);

      console.log('✅ Cliente atualizado:', clientId);
      return await this.getClientById(companyId, clientId);

    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error.message);
      throw error;
    }
  }

  /**
   * 🗑️ Deletar cliente (soft delete)
   */
  async deleteClient(companyId, clientId) {
    try {
      console.log('🗑️ Deletando cliente:', clientId);

      const clientsCollection = this.getClientsCollection(companyId);
      await clientsCollection.doc(clientId).update({
        status: 'deleted',
        deletedAt: this.firestore.FieldValue.serverTimestamp()
      });

      // Atualizar contadores
      await this.firestore.updateGlobalCounter('totalClients', -1);
      await this.updateCompanyClientCount(companyId, -1);

      console.log('✅ Cliente deletado:', clientId);
      return true;

    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Listar clientes de uma empresa (com paginação)
   */
  async listClients(companyId, limit = 10, startAfter = null, filters = {}) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      
      let query = clientsCollection
        .where('status', '!=', 'deleted')
        .orderBy('updatedAt', 'desc')
        .limit(limit);

      // Aplicar filtros
      if (filters.tag) {
        query = query.where('tags', 'array-contains', filters.tag);
      }
      
      if (filters.customerType) {
        query = query.where('profile.customerType', '==', filters.customerType);
      }

      if (startAfter) {
        const startDoc = await clientsCollection.doc(startAfter).get();
        query = query.startAfter(startDoc);
      }

      const snapshot = await query.get();
      const clients = snapshot.docs.map(doc => Client.fromFirestore(doc));

      return {
        clients,
        hasMore: snapshot.docs.length === limit,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null
      };

    } catch (error) {
      console.error('❌ Erro ao listar clientes:', error.message);
      return { clients: [], hasMore: false, lastDoc: null };
    }
  }

  /**
   * 🔍 Buscar clientes por nome ou tag
   */
  async searchClients(companyId, searchTerm) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      
      // Buscar por nome (busca simples - em produção usar Algolia/Elasticsearch)
      const nameResults = await clientsCollection
        .where('status', '!=', 'deleted')
        .orderBy('name')
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff')
        .limit(20)
        .get();

      // Buscar por tag
      const tagResults = await clientsCollection
        .where('tags', 'array-contains', searchTerm.toLowerCase())
        .where('status', '!=', 'deleted')
        .limit(20)
        .get();

      // Combinar resultados e remover duplicatas
      const allDocs = [...nameResults.docs, ...tagResults.docs];
      const uniqueDocs = allDocs.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      return uniqueDocs.map(doc => Client.fromFirestore(doc));

    } catch (error) {
      console.error('❌ Erro na busca:', error.message);
      return [];
    }
  }

  /**
   * 🏷️ Obter clientes por tag
   */
  async getClientsByTag(companyId, tag) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      const snapshot = await clientsCollection
        .where('tags', 'array-contains', tag)
        .where('status', '!=', 'deleted')
        .get();

      return snapshot.docs.map(doc => Client.fromFirestore(doc));
    } catch (error) {
      console.error('❌ Erro ao buscar por tag:', error.message);
      return [];
    }
  }

  /**
   * 💎 Obter clientes VIP
   */
  async getVIPClients(companyId) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      const snapshot = await clientsCollection
        .where('profile.customerType', '==', 'vip')
        .where('status', '!=', 'deleted')
        .orderBy('stats.engagementScore', 'desc')
        .get();

      return snapshot.docs.map(doc => Client.fromFirestore(doc));
    } catch (error) {
      console.error('❌ Erro ao buscar VIPs:', error.message);
      return [];
    }
  }

  /**
   * 📊 Atualizar estatísticas do cliente
   */
  async updateClientStats(companyId, clientId, statsUpdates) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      await clientsCollection.doc(clientId).update({
        stats: statsUpdates,
        'stats.lastInteraction': this.firestore.FieldValue.serverTimestamp(),
        updatedAt: this.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error.message);
      throw error;
    }
  }

  /**
   * 📈 Obter estatísticas da empresa
   */
  async getCompanyClientStats(companyId) {
    try {
      const clientsCollection = this.getClientsCollection(companyId);
      
      // Total de clientes ativos
      const totalActive = await clientsCollection
        .where('status', '==', 'active')
        .get();

      // Clientes VIP
      const vipClients = await clientsCollection
        .where('profile.customerType', '==', 'vip')
        .where('status', '==', 'active')
        .get();

      // Clientes recentes (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentClients = await clientsCollection
        .where('createdAt', '>=', thirtyDaysAgo)
        .where('status', '==', 'active')
        .get();

      return {
        totalActive: totalActive.size,
        vipClients: vipClients.size,
        recentClients: recentClients.size,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return null;
    }
  }

  /**
   * 🔄 Atualizar contador de clientes da empresa
   */
  async updateCompanyClientCount(companyId, increment) {
    try {
      const companyRef = this.firestore.db.collection('companies').doc(companyId);
      await companyRef.update({
        'stats.totalClients': this.firestore.FieldValue.increment(increment),
        'stats.lastActivity': this.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar contador da empresa:', error.message);
    }
  }

  /**
   * 🧪 Testar operações básicas
   */
  async testOperations(companyId = 'test-company') {
    try {
      console.log('\n🧪 TESTANDO OPERAÇÕES CLIENTS\n');

      // Teste 1: Criar cliente teste
      const testClient = await this.createClient(companyId, {
        name: 'João Teste',
        contact: {
          whatsapp: '+5511999888777',
          email: 'joao.teste@email.com',
          preferredChannel: 'whatsapp'
        },
        tags: ['teste', 'vip']
      });
      console.log('1. ✅ Cliente criado:', testClient.clientId);

      // Teste 2: Buscar por ID
      const foundById = await this.getClientById(companyId, testClient.clientId);
      console.log('2. ✅ Busca por ID:', foundById ? 'Encontrado' : 'Não encontrado');

      // Teste 3: Buscar por contato
      const foundByContact = await this.findByContact(companyId, '+5511999888777');
      console.log('3. ✅ Busca por contato:', foundByContact ? 'Encontrado' : 'Não encontrado');

      // Teste 4: Atualizar cliente
      await this.updateClient(companyId, testClient.clientId, { 
        summary: 'Cliente teste atualizado',
        'profile.customerType': 'vip'
      });
      console.log('4. ✅ Cliente atualizado');

      // Teste 5: Listar clientes
      const list = await this.listClients(companyId, 5);
      console.log('5. ✅ Lista obtida:', list.clients.length, 'clientes');

      // Teste 6: Buscar por tag
      const vipClients = await this.getClientsByTag(companyId, 'vip');
      console.log('6. ✅ Clientes VIP:', vipClients.length);

      // Teste 7: Estatísticas
      const stats = await this.getCompanyClientStats(companyId);
      console.log('7. ✅ Estatísticas:', stats);

      // Teste 8: Limpar teste
      await this.deleteClient(companyId, testClient.clientId);
      console.log('8. ✅ Cliente teste removido');

      console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
      return true;

    } catch (error) {
      console.error('❌ TESTE FALHOU:', error.message);
      return false;
    }
  }
}

module.exports = ClientsService;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  const service = new ClientsService();
  service.testOperations().catch(console.error);
}
