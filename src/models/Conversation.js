const { FieldValue } = require('firebase-admin/firestore');

/**
 * 💬 MODELO CONVERSATION
 * Representa uma conversa/mensagem no sistema
 */

class Conversation {
  constructor(data = {}) {
    this.conversationId = data.conversationId || this.generateId();
    this.companyId = data.companyId || '';
    this.clientId = data.clientId || '';
    this.timestamp = data.timestamp || FieldValue.serverTimestamp();
    this.content = data.content || '';
    this.source = data.source || 'whatsapp'; // whatsapp, website, instagram, email
    this.category = data.category || this.determineCategory();
    this.processed = data.processed || false;
    this.metadata = data.metadata || this.getDefaultMetadata();
    this.summary = data.summary || null;
    this.aiResponse = data.aiResponse || null;
    this.context = data.context || this.getDefaultContext();
  }

  /**
   * 🔧 Gerar ID único para conversa
   */
  generateId() {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📅 Determinar categoria baseada na data
   */
  determineCategory() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Se é do mês atual, categoria 'current'
    return 'current'; // Por padrão, sempre atual quando criada
  }

  /**
   * 📊 Metadados padrão
   */
  getDefaultMetadata() {
    return {
      messageType: 'text', // text, image, audio, document, location
      direction: 'incoming', // incoming, outgoing
      sentiment: null, // positive, negative, neutral (será analisado)
      topics: [],
      keywords: [],
      urgency: 'normal', // low, normal, high, urgent
      language: 'pt-BR',
      wordCount: 0,
      hasAttachment: false,
      attachmentType: null,
      mentions: [],
      entities: [] // pessoas, lugares, produtos mencionados
    };
  }

  /**
   * 🧠 Contexto padrão
   */
  getDefaultContext() {
    return {
      threadId: null, // Para agrupar conversas relacionadas
      previousMessageId: null,
      relatedTopics: [],
      customerIntent: null, // question, complaint, compliment, request, order
      businessContext: null, // support, sales, general
      priority: 'normal',
      requiresResponse: true,
      isFollowUp: false
    };
  }

  /**
   * ✅ Validar dados da conversa
   */
  validate() {
    const errors = [];

    if (!this.companyId) {
      errors.push('ID da empresa é obrigatório');
    }

    if (!this.clientId) {
      errors.push('ID do cliente é obrigatório');
    }

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Conteúdo da mensagem é obrigatório');
    }

    if (!['whatsapp', 'website', 'instagram', 'email', 'phone'].includes(this.source)) {
      errors.push('Fonte da mensagem inválida');
    }

    if (!['current', 'long-term'].includes(this.category)) {
      errors.push('Categoria inválida');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 📝 Analisar conteúdo da mensagem
   */
  analyzeContent() {
    const content = this.content.toLowerCase();
    
    // Contar palavras
    this.metadata.wordCount = this.content.split(/\s+/).length;

    // Detectar urgência por palavras-chave
    const urgentKeywords = ['urgente', 'emergência', 'rápido', 'agora', 'imediatamente', 'problema'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => content.includes(keyword));
    
    if (hasUrgentKeywords) {
      this.metadata.urgency = 'high';
      this.context.priority = 'high';
    }

    // Detectar intenção do cliente
    if (content.includes('pedido') || content.includes('comprar') || content.includes('encomendar')) {
      this.context.customerIntent = 'order';
      this.context.businessContext = 'sales';
    } else if (content.includes('problema') || content.includes('reclamação') || content.includes('erro')) {
      this.context.customerIntent = 'complaint';
      this.context.businessContext = 'support';
    } else if (content.includes('dúvida') || content.includes('?') || content.includes('como')) {
      this.context.customerIntent = 'question';
      this.context.businessContext = 'support';
    } else if (content.includes('obrigado') || content.includes('parabéns') || content.includes('excelente')) {
      this.context.customerIntent = 'compliment';
    }

    // Extrair tópicos básicos
    const topics = this.extractTopics(content);
    this.metadata.topics = topics;

    // Extrair palavras-chave
    const keywords = this.extractKeywords(content);
    this.metadata.keywords = keywords;

    return this;
  }

  /**
   * 🏷️ Extrair tópicos da mensagem
   */
  extractTopics(content) {
    const topicKeywords = {
      'pedido': ['pedido', 'encomendar', 'comprar', 'solicitar'],
      'entrega': ['entrega', 'delivery', 'entregar', 'enviar'],
      'pagamento': ['pagamento', 'pagar', 'dinheiro', 'cartão', 'pix'],
      'produto': ['produto', 'item', 'mercadoria'],
      'serviço': ['serviço', 'atendimento', 'ajuda'],
      'horário': ['horário', 'hora', 'tempo', 'quando'],
      'localização': ['endereço', 'local', 'onde', 'localização'],
      'preço': ['preço', 'valor', 'custo', 'quanto']
    };

    const topics = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * 🔍 Extrair palavras-chave relevantes
   */
  extractKeywords(content) {
    // Remover palavras comuns (stop words)
    const stopWords = ['o', 'a', 'de', 'para', 'com', 'em', 'um', 'uma', 'e', 'ou', 'que', 'do', 'da'];
    
    const words = content
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !stopWords.includes(word))
      .slice(0, 10); // Máximo 10 palavras-chave

    return [...new Set(words)]; // Remove duplicatas
  }

  /**
   * 😊 Analisar sentimento (básico)
   */
  analyzeSentiment() {
    const content = this.content.toLowerCase();
    
    const positiveWords = ['obrigado', 'ótimo', 'excelente', 'bom', 'perfeito', 'adorei', 'parabéns'];
    const negativeWords = ['problema', 'ruim', 'terrível', 'péssimo', 'reclamação', 'erro', 'demora'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;

    if (positiveCount > negativeCount) {
      this.metadata.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      this.metadata.sentiment = 'negative';
    } else {
      this.metadata.sentiment = 'neutral';
    }

    return this.metadata.sentiment;
  }

  /**
   * 📅 Verificar se deve virar long-term
   */
  shouldBeLongTerm() {
    if (this.category === 'long-term') return false;

    const now = new Date();
    const messageDate = this.timestamp.toDate ? this.timestamp.toDate() : new Date(this.timestamp);
    
    // Se a mensagem é de mês anterior, deve virar long-term
    return messageDate.getMonth() !== now.getMonth() || messageDate.getFullYear() !== now.getFullYear();
  }

  /**
   * 📝 Converter para long-term com resumo
   */
  convertToLongTerm(summary) {
    this.category = 'long-term';
    this.summary = summary;
    this.processed = true;
    
    // Limpar conteúdo detalhado para economizar espaço
    this.content = `[RESUMIDO] ${summary}`;
    
    return this;
  }

  /**
   * 🤖 Adicionar resposta da IA
   */
  addAIResponse(response, model = 'gpt-3.5-turbo', processingTime = 0) {
    this.aiResponse = {
      content: response,
      model,
      timestamp: FieldValue.serverTimestamp(),
      processingTime,
      tokens: response.length // Estimativa simples
    };
    return this;
  }

  /**
   * 🔗 Conectar com conversa anterior
   */
  linkToPrevious(previousConversationId) {
    this.context.previousMessageId = previousConversationId;
    this.context.isFollowUp = true;
    return this;
  }

  /**
   * 📄 Converter para objeto simples (para Firestore)
   */
  toFirestore() {
    return {
      conversationId: this.conversationId,
      companyId: this.companyId,
      clientId: this.clientId,
      timestamp: this.timestamp,
      content: this.content,
      source: this.source,
      category: this.category,
      processed: this.processed,
      metadata: this.metadata,
      summary: this.summary,
      aiResponse: this.aiResponse,
      context: this.context
    };
  }

  /**
   * 🔄 Criar instância a partir de dados do Firestore
   */
  static fromFirestore(doc) {
    if (!doc.exists) return null;
    return new Conversation(doc.data());
  }

  /**
   * 📊 Obter estatísticas da conversa
   */
  getStats() {
    return {
      wordCount: this.metadata.wordCount,
      sentiment: this.metadata.sentiment,
      urgency: this.metadata.urgency,
      topics: this.metadata.topics.length,
      hasAIResponse: !!this.aiResponse,
      processingTime: this.aiResponse?.processingTime || 0
    };
  }

  /**
   * 🎯 Verificar se precisa de resposta humana
   */
  needsHumanResponse() {
    return this.metadata.urgency === 'urgent' || 
           this.metadata.sentiment === 'negative' ||
           this.context.customerIntent === 'complaint';
  }
}

module.exports = Conversation;

// 🧪 Teste se executado diretamente
if (require.main === module) {
  console.log('\n🧪 TESTANDO MODELO CONVERSATION\n');

  // Teste 1: Criar conversa básica
  const conversation1 = new Conversation({
    companyId: 'company-123',
    clientId: 'client-456',
    content: 'Oi, gostaria de fazer um pedido de pizza urgente!',
    source: 'whatsapp'
  });

  console.log('1. Conversa criada:', conversation1.conversationId);
  console.log('   Conteúdo:', conversation1.content.substring(0, 50) + '...');

  // Teste 2: Análise de conteúdo
  conversation1.analyzeContent();
  console.log('2. Análise de conteúdo:');
  console.log('   Tópicos:', conversation1.metadata.topics);
  console.log('   Urgência:', conversation1.metadata.urgency);
  console.log('   Intenção:', conversation1.context.customerIntent);

  // Teste 3: Análise de sentimento
  const sentiment = conversation1.analyzeSentiment();
  console.log('3. Sentimento:', sentiment);

  // Teste 4: Validação
  const validation = conversation1.validate();
  console.log('4. Validação:', validation.isValid ? '✅ Válida' : '❌ Inválida');

  // Teste 5: Adicionar resposta da IA
  conversation1.addAIResponse('Olá! Claro, posso ajudar com seu pedido. Qual pizza você gostaria?', 'gpt-3.5-turbo', 1500);
  console.log('5. Resposta IA adicionada:', !!conversation1.aiResponse);

  // Teste 6: Estatísticas
  const stats = conversation1.getStats();
  console.log('6. Estatísticas:', stats);

  console.log('\n✅ TESTE MODELO CONVERSATION CONCLUÍDO!\n');
}
