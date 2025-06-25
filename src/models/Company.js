const { FieldValue } = require('firebase-admin/firestore');

/**
 * 🏢 MODELO COMPANY
 * Representa uma empresa no sistema multiempresa
 */

class Company {
  constructor(data = {}) {
    this.companyId = data.companyId || this.generateId();
    this.name = data.name || '';
    this.domain = data.domain || '';
    this.whatsappId = data.whatsappId || '';
    this.instagram = data.instagram || '';
    this.activePlan = data.activePlan || false;
    this.stripeCustomerId = data.stripeCustomerId || '';
    this.customPrompt = data.customPrompt || this.getDefaultPrompt();
    this.createdAt = data.createdAt || FieldValue.serverTimestamp();
    this.plan = data.plan || this.getDefaultPlan();
    this.settings = data.settings || this.getDefaultSettings();
    this.stats = data.stats || this.getDefaultStats();
  }

  /**
   * 🔧 Gerar ID único para empresa
   */
  generateId() {
    return `company-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📝 Prompt padrão para IA
   */
  getDefaultPrompt() {
    return `Você é um assistente virtual inteligente e prestativo. 
Responda de forma profissional, amigável e personalizada com base no histórico do cliente.
Mantenha sempre um tom respeitoso e ofereça soluções práticas.`;
  }

  /**
   * 💳 Plano padrão
   */
  getDefaultPlan() {
    return {
      type: 'free',
      features: ['basic_responses', 'limited_clients'],
      limits: {
        maxClients: 50,
        maxConversationsPerMonth: 1000,
        maxAIRequests: 500
      },
      expiresAt: null
    };
  }

  /**
   * ⚙️ Configurações padrão
   */
  getDefaultSettings() {
    return {
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      autoResponse: false,
      responseDelay: 2000, // ms
      workingHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
        weekdays: [1, 2, 3, 4, 5] // Segunda a Sexta
      },
      notifications: {
        email: true,
        webhook: false,
        webhookUrl: ''
      }
    };
  }

  /**
   * 📊 Estatísticas padrão
   */
  getDefaultStats() {
    return {
      totalClients: 0,
      totalConversations: 0,
      totalAIResponses: 0,
      lastActivity: null,
      avgResponseTime: 0,
      monthlyUsage: {
        conversations: 0,
        aiRequests: 0,
        lastReset: FieldValue.serverTimestamp()
      }
    };
  }

  /**
   * ✅ Validar dados da empresa
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Nome da empresa deve ter pelo menos 2 caracteres');
    }

    if (!this.domain && !this.whatsappId && !this.instagram) {
      errors.push('Pelo menos um identificador deve ser fornecido (domínio, WhatsApp ou Instagram)');
    }

    if (this.whatsappId && !this.isValidWhatsApp(this.whatsappId)) {
      errors.push('Número do WhatsApp inválido');
    }

    if (this.domain && !this.isValidDomain(this.domain)) {
      errors.push('Domínio inválido');
    }

    if (this.instagram && !this.isValidInstagram(this.instagram)) {
      errors.push('Perfil do Instagram inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 📱 Validar WhatsApp
   */
  isValidWhatsApp(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 🌐 Validar domínio
   */
  isValidDomain(domain) {
    const domainRegex = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  /**
   * 📸 Validar Instagram
   */
  isValidInstagram(instagram) {
    const instagramRegex = /^@?[a-zA-Z0-9_.]{1,30}$/;
    return instagramRegex.test(instagram);
  }

  /**
   * 📄 Converter para objeto simples (para Firestore)
   */
  toFirestore() {
    return {
      companyId: this.companyId,
      name: this.name,
      domain: this.domain,
      whatsappId: this.whatsappId,
      instagram: this.instagram,
      activePlan: this.activePlan,
      stripeCustomerId: this.stripeCustomerId,
      customPrompt: this.customPrompt,
      createdAt: this.createdAt,
      plan: this.plan,
      settings: this.settings,
      stats: this.stats
    };
  }

  /**
   * 🔄 Criar instância a partir de dados do Firestore
   */
  static fromFirestore(doc) {
    if (!doc.exists) return null;
    return new Company(doc.data());
  }

  /**
   * 🎯 Obter identificador único da empresa
   */
  getUniqueIdentifier() {
    if (this.domain) return this.domain;
    if (this.whatsappId) return this.whatsappId;
    if (this.instagram) return this.instagram;
    return this.companyId;
  }

  /**
   * 💰 Verificar se plano está ativo
   */
  isPlanActive() {
    if (!this.activePlan) return false;
    if (!this.plan.expiresAt) return true; // Plano sem expiração
    return new Date() < this.plan.expiresAt.toDate();
  }

  /**
   * 📈 Verificar limite de uso
   */
  isWithinUsageLimits() {
    const usage = this.stats.monthlyUsage;
    const limits = this.plan.limits;

    return {
      clients: this.stats.totalClients <= limits.maxClients,
      conversations: usage.conversations <= limits.maxConversationsPerMonth,
      aiRequests: usage.aiRequests <= limits.maxAIRequests
    };
  }

  /**
   * 🔄 Atualizar estatísticas
   */
  updateStats(updates) {
    this.stats = { ...this.stats, ...updates };
    this.stats.lastActivity = FieldValue.serverTimestamp();
  }

  /**
   * 📝 Atualizar prompt personalizado
   */
  updateCustomPrompt(newPrompt) {
    this.customPrompt = newPrompt || this.getDefaultPrompt();
  }

  /**
   * 🏆 Fazer upgrade do plano
   */
  upgradePlan(newPlanType, features, limits, expiresAt = null) {
    this.plan = {
      type: newPlanType,
      features,
      limits,
      expiresAt
    };
    this.activePlan = true;
  }
}

module.exports = Company;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  console.log('\n🧪 TESTANDO MODELO COMPANY\n');

  // Teste 1: Criar empresa básica
  const company1 = new Company({
    name: 'Restaurante Mario',
    domain: 'restaurantemario.com.br',
    whatsappId: '+5511999999999'
  });

  console.log('1. Empresa criada:', company1.name);
  console.log('   ID:', company1.companyId);
  console.log('   Identificador único:', company1.getUniqueIdentifier());

  // Teste 2: Validação
  const validation = company1.validate();
  console.log('2. Validação:', validation.isValid ? '✅ Válida' : '❌ Inválida');
  if (!validation.isValid) {
    console.log('   Erros:', validation.errors);
  }

  // Teste 3: Verificar plano
  console.log('3. Plano ativo:', company1.isPlanActive() ? '✅ Sim' : '❌ Não');
  console.log('   Limites:', company1.isWithinUsageLimits());

  // Teste 4: Converter para Firestore
  const firestoreData = company1.toFirestore();
  console.log('4. Dados para Firestore:', Object.keys(firestoreData));

  console.log('\n✅ TESTE MODELO COMPANY CONCLUÍDO!\n');
}
