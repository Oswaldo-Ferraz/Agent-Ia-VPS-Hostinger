const FirestoreConfig = require('../config/firestore-config');
const Company = require('../../models/Company');

/**
 * 🏢 CRUD COMPANIES
 * Operações básicas para gerenciar empresas
 */

class CompaniesService {
  constructor() {
    this.firestore = new FirestoreConfig();
    this.collection = this.firestore.getCollection('companies');
  }

  /**
   * ➕ Criar nova empresa
   */
  async createCompany(companyData) {
    try {
      console.log('🏢 Criando nova empresa...');
      
      // Criar instância do modelo
      const company = new Company(companyData);
      
      // Validar dados
      const validation = company.validate();
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }

      // Verificar se empresa já existe
      const existing = await this.findByIdentifier(company.getUniqueIdentifier());
      if (existing) {
        throw new Error('Empresa já existe com este identificador');
      }

      // Salvar no Firestore
      const companyRef = this.collection.doc(company.companyId);
      await companyRef.set(company.toFirestore());

      // Atualizar contador global
      await this.firestore.updateGlobalCounter('totalCompanies');

      console.log('✅ Empresa criada:', company.companyId);
      return company;

    } catch (error) {
      console.error('❌ Erro ao criar empresa:', error.message);
      throw error;
    }
  }

  /**
   * 📖 Buscar empresa por ID
   */
  async getCompanyById(companyId) {
    try {
      const doc = await this.collection.doc(companyId).get();
      return Company.fromFirestore(doc);
    } catch (error) {
      console.error('❌ Erro ao buscar empresa:', error.message);
      return null;
    }
  }

  /**
   * 🔍 Buscar empresa por identificador (domínio, WhatsApp, Instagram)
   */
  async findByIdentifier(identifier) {
    try {
      // Buscar por domínio
      let query = await this.collection.where('domain', '==', identifier).limit(1).get();
      if (!query.empty) {
        return Company.fromFirestore(query.docs[0]);
      }

      // Buscar por WhatsApp
      query = await this.collection.where('whatsappId', '==', identifier).limit(1).get();
      if (!query.empty) {
        return Company.fromFirestore(query.docs[0]);
      }

      // Buscar por Instagram
      query = await this.collection.where('instagram', '==', identifier).limit(1).get();
      if (!query.empty) {
        return Company.fromFirestore(query.docs[0]);
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar por identificador:', error.message);
      return null;
    }
  }

  /**
   * 📝 Atualizar empresa
   */
  async updateCompany(companyId, updates) {
    try {
      console.log('📝 Atualizando empresa:', companyId);

      // Buscar empresa atual
      const existingCompany = await this.getCompanyById(companyId);
      if (!existingCompany) {
        throw new Error('Empresa não encontrada');
      }

      // Aplicar atualizações
      const updatedData = { ...existingCompany.toFirestore(), ...updates };
      const company = new Company(updatedData);

      // Validar dados atualizados
      const validation = company.validate();
      if (!validation.isValid) {
        throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
      }

      // Salvar atualizações
      await this.collection.doc(companyId).update(updates);

      console.log('✅ Empresa atualizada:', companyId);
      return await this.getCompanyById(companyId);

    } catch (error) {
      console.error('❌ Erro ao atualizar empresa:', error.message);
      throw error;
    }
  }

  /**
   * 🗑️ Deletar empresa (soft delete)
   */
  async deleteCompany(companyId) {
    try {
      console.log('🗑️ Deletando empresa:', companyId);

      await this.collection.doc(companyId).update({
        status: 'deleted',
        deletedAt: this.firestore.FieldValue.serverTimestamp()
      });

      // Atualizar contador global
      await this.firestore.updateGlobalCounter('totalCompanies', -1);

      console.log('✅ Empresa deletada:', companyId);
      return true;

    } catch (error) {
      console.error('❌ Erro ao deletar empresa:', error.message);
      throw error;
    }
  }

  /**
   * 📋 Listar empresas (com paginação)
   */
  async listCompanies(limit = 10, startAfter = null) {
    try {
      let query = this.collection
        .where('status', '!=', 'deleted')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        const startDoc = await this.collection.doc(startAfter).get();
        query = query.startAfter(startDoc);
      }

      const snapshot = await query.get();
      const companies = snapshot.docs.map(doc => Company.fromFirestore(doc));

      return {
        companies,
        hasMore: snapshot.docs.length === limit,
        lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null
      };

    } catch (error) {
      console.error('❌ Erro ao listar empresas:', error.message);
      return { companies: [], hasMore: false, lastDoc: null };
    }
  }

  /**
   * 💳 Atualizar status do plano
   */
  async updatePlanStatus(companyId, activePlan, planData = null) {
    try {
      const updates = { activePlan };
      
      if (planData) {
        updates.plan = planData;
      }

      await this.collection.doc(companyId).update(updates);
      console.log('✅ Status do plano atualizado:', companyId);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar plano:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Atualizar estatísticas da empresa
   */
  async updateStats(companyId, statsUpdates) {
    try {
      await this.collection.doc(companyId).update({
        stats: statsUpdates,
        'stats.lastActivity': this.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar estatísticas:', error.message);
      throw error;
    }
  }

  /**
   * 🔍 Buscar empresas ativas
   */
  async getActiveCompanies() {
    try {
      const snapshot = await this.collection
        .where('activePlan', '==', true)
        .where('status', '!=', 'deleted')
        .get();

      return snapshot.docs.map(doc => Company.fromFirestore(doc));
    } catch (error) {
      console.error('❌ Erro ao buscar empresas ativas:', error.message);
      return [];
    }
  }

  /**
   * 📈 Obter estatísticas gerais
   */
  async getGeneralStats() {
    try {
      const stats = await this.firestore.getDatabaseStats();
      
      // Contar empresas ativas
      const activeCompanies = await this.collection
        .where('activePlan', '==', true)
        .where('status', '!=', 'deleted')
        .get();

      return {
        ...stats,
        activeCompanies: activeCompanies.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return null;
    }
  }

  /**
   * 🧪 Testar conexão e operações básicas
   */
  async testOperations() {
    try {
      console.log('\n🧪 TESTANDO OPERAÇÕES COMPANIES\n');

      // Teste 1: Criar empresa teste
      const testCompany = await this.createCompany({
        name: 'Empresa Teste',
        domain: 'empresateste.com',
        whatsappId: '+5511999999999'
      });
      console.log('1. ✅ Empresa criada:', testCompany.companyId);

      // Teste 2: Buscar por ID
      const foundById = await this.getCompanyById(testCompany.companyId);
      console.log('2. ✅ Busca por ID:', foundById ? 'Encontrada' : 'Não encontrada');

      // Teste 3: Buscar por domínio
      const foundByDomain = await this.findByIdentifier('empresateste.com');
      console.log('3. ✅ Busca por domínio:', foundByDomain ? 'Encontrada' : 'Não encontrada');

      // Teste 4: Atualizar empresa
      await this.updateCompany(testCompany.companyId, { 
        customPrompt: 'Prompt personalizado de teste' 
      });
      console.log('4. ✅ Empresa atualizada');

      // Teste 5: Listar empresas
      const list = await this.listCompanies(5);
      console.log('5. ✅ Lista obtida:', list.companies.length, 'empresas');

      // Teste 6: Limpar teste
      await this.deleteCompany(testCompany.companyId);
      console.log('6. ✅ Empresa teste removida');

      console.log('\n🎉 TODOS OS TESTES PASSARAM!\n');
      return true;

    } catch (error) {
      console.error('❌ TESTE FALHOU:', error.message);
      return false;
    }
  }
}

module.exports = CompaniesService;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  const service = new CompaniesService();
  service.testOperations().catch(console.error);
}
