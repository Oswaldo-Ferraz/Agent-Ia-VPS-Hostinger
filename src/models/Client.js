const { FieldValue } = require('firebase-admin/firestore');

/**
 * 👤 MODELO CLIENT
 * Representa um cliente de uma empresa específica
 */

class Client {
  constructor(data = {}) {
    this.clientId = data.clientId || this.generateId();
    this.companyId = data.companyId || '';
    this.name = data.name || '';
    this.contact = data.contact || this.getDefaultContact();
    this.tags = data.tags || [];
    this.summary = data.summary || '';
    this.profile = data.profile || this.getDefaultProfile();
    this.createdAt = data.createdAt || FieldValue.serverTimestamp();
    this.updatedAt = data.updatedAt || FieldValue.serverTimestamp();
    this.stats = data.stats || this.getDefaultStats();
    this.preferences = data.preferences || this.getDefaultPreferences();
    this.status = data.status || 'active'; // active, inactive, blocked
  }

  /**
   * 🔧 Gerar ID único para cliente
   */
  generateId() {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📞 Contato padrão
   */
  getDefaultContact() {
    return {
      whatsapp: '',
      email: '',
      phone: '',
      instagram: '',
      preferredChannel: 'whatsapp'
    };
  }

  /**
   * 👤 Perfil padrão
   */
  getDefaultProfile() {
    return {
      preferences: [],
      behavior: '',
      frequency: 'occasional', // occasional, regular, frequent, vip
      customerType: 'new', // new, returning, loyal, vip
      notes: '',
      lastTopic: '',
      commonQuestions: [],
      satisfactionLevel: 'neutral' // poor, neutral, good, excellent
    };
  }

  /**
   * 📊 Estatísticas padrão
   */
  getDefaultStats() {
    return {
      totalConversations: 0,
      totalMessages: 0,
      lastInteraction: null,
      firstInteraction: null,
      avgResponseTime: 0,
      totalSpent: 0,
      conversationStats: {
        thisMonth: 0,
        lastMonth: 0,
        thisWeek: 0
      },
      engagementScore: 0 // 0-100
    };
  }

  /**
   * ⚙️ Preferências padrão
   */
  getDefaultPreferences() {
    return {
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      communicationStyle: 'friendly', // formal, friendly, casual
      responseTime: 'normal', // immediate, fast, normal, slow
      topics: [],
      dislikes: [],
      specialNeeds: []
    };
  }

  /**
   * ✅ Validar dados do cliente
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Nome do cliente deve ter pelo menos 2 caracteres');
    }

    if (!this.companyId) {
      errors.push('ID da empresa é obrigatório');
    }

    // Pelo menos um meio de contato
    const hasContact = this.contact.whatsapp || this.contact.email || this.contact.phone;
    if (!hasContact) {
      errors.push('Pelo menos um meio de contato deve ser fornecido');
    }

    // Validar WhatsApp se fornecido
    if (this.contact.whatsapp && !this.isValidWhatsApp(this.contact.whatsapp)) {
      errors.push('Número do WhatsApp inválido');
    }

    // Validar email se fornecido
    if (this.contact.email && !this.isValidEmail(this.contact.email)) {
      errors.push('Email inválido');
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
   * 📧 Validar email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 🏷️ Adicionar tag
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = FieldValue.serverTimestamp();
    }
  }

  /**
   * 🗑️ Remover tag
   */
  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.updatedAt = FieldValue.serverTimestamp();
  }

  /**
   * 📝 Atualizar resumo
   */
  updateSummary(newSummary) {
    this.summary = newSummary;
    this.updatedAt = FieldValue.serverTimestamp();
  }

  /**
   * 📈 Atualizar estatísticas
   */
  updateStats(updates) {
    this.stats = { ...this.stats, ...updates };
    this.stats.lastInteraction = FieldValue.serverTimestamp();
    this.updatedAt = FieldValue.serverTimestamp();
  }

  /**
   * 💬 Registrar nova conversa
   */
  recordConversation(messageCount = 1) {
    this.stats.totalConversations += 1;
    this.stats.totalMessages += messageCount;
    this.stats.conversationStats.thisMonth += 1;
    this.stats.conversationStats.thisWeek += 1;
    
    if (!this.stats.firstInteraction) {
      this.stats.firstInteraction = FieldValue.serverTimestamp();
    }
    
    this.stats.lastInteraction = FieldValue.serverTimestamp();
    this.updatedAt = FieldValue.serverTimestamp();
  }

  /**
   * 🎯 Calcular score de engajamento
   */
  calculateEngagementScore() {
    let score = 0;
    
    // Frequência de conversas (0-30 pontos)
    if (this.stats.conversationStats.thisMonth >= 10) score += 30;
    else if (this.stats.conversationStats.thisMonth >= 5) score += 20;
    else if (this.stats.conversationStats.thisMonth >= 1) score += 10;
    
    // Recência da última interação (0-25 pontos)
    if (this.stats.lastInteraction) {
      const daysSinceLastInteraction = (Date.now() - this.stats.lastInteraction.toMillis()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastInteraction <= 1) score += 25;
      else if (daysSinceLastInteraction <= 7) score += 20;
      else if (daysSinceLastInteraction <= 30) score += 10;
    }
    
    // Satisfação (0-25 pontos)
    switch (this.profile.satisfactionLevel) {
      case 'excellent': score += 25; break;
      case 'good': score += 20; break;
      case 'neutral': score += 10; break;
      default: score += 0;
    }
    
    // Tipo de cliente (0-20 pontos)
    switch (this.profile.customerType) {
      case 'vip': score += 20; break;
      case 'loyal': score += 15; break;
      case 'returning': score += 10; break;
      case 'new': score += 5; break;
    }
    
    this.stats.engagementScore = Math.min(score, 100);
    return this.stats.engagementScore;
  }

  /**
   * 🎭 Determinar personalidade do cliente
   */
  getPersonalityProfile() {
    return {
      communicationStyle: this.preferences.communicationStyle,
      responseExpectation: this.preferences.responseTime,
      frequency: this.profile.frequency,
      satisfaction: this.profile.satisfactionLevel,
      engagement: this.stats.engagementScore,
      type: this.profile.customerType
    };
  }

  /**
   * 📄 Converter para objeto simples (para Firestore)
   */
  toFirestore() {
    return {
      clientId: this.clientId,
      companyId: this.companyId,
      name: this.name,
      contact: this.contact,
      tags: this.tags,
      summary: this.summary,
      profile: this.profile,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      stats: this.stats,
      preferences: this.preferences,
      status: this.status
    };
  }

  /**
   * 🔄 Criar instância a partir de dados do Firestore
   */
  static fromFirestore(doc) {
    if (!doc.exists) return null;
    return new Client(doc.data());
  }

  /**
   * 🎯 Obter identificador de contato principal
   */
  getPrimaryContact() {
    const channel = this.contact.preferredChannel;
    return this.contact[channel] || this.contact.whatsapp || this.contact.email || this.contact.phone;
  }

  /**
   * 🕒 Verificar se cliente está ativo recentemente
   */
  isRecentlyActive(days = 30) {
    if (!this.stats.lastInteraction) return false;
    const daysSinceLastInteraction = (Date.now() - this.stats.lastInteraction.toMillis()) / (1000 * 60 * 60 * 24);
    return daysSinceLastInteraction <= days;
  }

  /**
   * 💎 Verificar se é cliente VIP
   */
  isVIP() {
    return this.profile.customerType === 'vip' || 
           this.tags.includes('vip') ||
           this.stats.engagementScore >= 80;
  }
}

module.exports = Client;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  console.log('\n🧪 TESTANDO MODELO CLIENT\n');

  // Teste 1: Criar cliente básico
  const client1 = new Client({
    companyId: 'company-123',
    name: 'João Silva',
    contact: {
      whatsapp: '+5511888888888',
      email: 'joao@email.com',
      preferredChannel: 'whatsapp'
    }
  });

  console.log('1. Cliente criado:', client1.name);
  console.log('   ID:', client1.clientId);
  console.log('   Contato principal:', client1.getPrimaryContact());

  // Teste 2: Validação
  const validation = client1.validate();
  console.log('2. Validação:', validation.isValid ? '✅ Válida' : '❌ Inválida');
  if (!validation.isValid) {
    console.log('   Erros:', validation.errors);
  }

  // Teste 3: Adicionar tags e simular atividade
  client1.addTag('frequente');
  client1.addTag('pizza');
  client1.recordConversation(5);
  
  console.log('3. Tags:', client1.tags);
  console.log('   Conversas:', client1.stats.totalConversations);

  // Teste 4: Calcular engajamento
  const engagementScore = client1.calculateEngagementScore();
  console.log('4. Score de engajamento:', engagementScore);
  console.log('   É VIP:', client1.isVIP() ? '✅ Sim' : '❌ Não');

  // Teste 5: Personalidade
  const personality = client1.getPersonalityProfile();
  console.log('5. Perfil de personalidade:', personality);

  console.log('\n✅ TESTE MODELO CLIENT CONCLUÍDO!\n');
}
