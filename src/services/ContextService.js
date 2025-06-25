const openAIService = require('./OpenAIService');
const conversationsService = require('../firebase/firestore/conversations');
const summarizerService = require('../firebase/firestore/summarizer');
const FirestoreConfig = require('../firebase/config/firestore-config');

/**
 * 🧠 CONTEXT SERVICE
 * Serviço central para buscar e organizar contexto completo
 * para respostas inteligentes da IA
 */

class ContextService {
  constructor() {
    this.firestore = new FirestoreConfig();
    this.db = this.firestore.db;
    this.openai = openAIService;
  }

  /**
   * Obter contexto completo de um cliente para IA
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {number} recentLimit - Limite de mensagens recentes (padrão: 20)
   * @returns {Promise<object>} - Contexto completo
   */
  async getClientContext(companyId, clientId, recentLimit = 20) {
    try {
      console.log(`🧠 Building context for client ${clientId}`);

      // 1. Buscar dados da empresa
      const companyDoc = await this.db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        throw new Error('Company not found');
      }
      const companyData = companyDoc.data();

      // 2. Buscar dados do cliente
      const clientDoc = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .get();

      if (!clientDoc.exists) {
        throw new Error('Client not found');
      }
      const clientData = clientDoc.data();

      // 3. Buscar conversas recentes (mês atual)
      const currentDate = new Date();
      const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      const recentConversationsSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('monthKey', '==', currentMonthKey)
        .where('type', '==', 'current')
        .orderBy('lastMessageAt', 'desc')
        .limit(5)
        .get();

      // 4. Coletar mensagens recentes
      const recentMessages = [];
      for (const convDoc of recentConversationsSnapshot.docs) {
        const messagesSnapshot = await convDoc.ref
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(recentLimit / recentConversationsSnapshot.docs.length || 5)
          .get();

        messagesSnapshot.forEach(msgDoc => {
          recentMessages.push({
            conversationId: convDoc.id,
            ...msgDoc.data()
          });
        });
      }

      // Ordenar mensagens por timestamp
      recentMessages.sort((a, b) => {
        const aTime = a.timestamp?.seconds || 0;
        const bTime = b.timestamp?.seconds || 0;
        return bTime - aTime; // Mais recente primeiro
      });

      // Pegar apenas as mais recentes
      const limitedRecentMessages = recentMessages.slice(0, recentLimit);

      // 5. Buscar resumos relevantes (últimos 3 meses)
      const summariesSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('summaries')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      const relevantSummaries = [];
      summariesSnapshot.forEach(doc => {
        relevantSummaries.push(doc.data());
      });

      // 6. Construir contexto estruturado
      const context = {
        company: {
          id: companyId,
          name: companyData.name,
          domain: companyData.domain,
          customPrompt: companyData.customPrompt || 'Seja sempre educado, prestativo e profissional.',
          whatsapp: companyData.whatsapp,
          instagram: companyData.instagram
        },
        client: {
          id: clientId,
          name: clientData.name,
          contact: clientData.contact,
          tags: clientData.tags || [],
          summary: clientData.summary || '',
          profile: clientData.profile || {},
          insights: clientData.insights || [],
          recommendations: clientData.recommendations || [],
          lastActivity: clientData.lastActivity,
          stats: clientData.stats || {}
        },
        recentMessages: limitedRecentMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          platform: msg.platform
        })),
        summaries: relevantSummaries.map(summary => ({
          monthKey: summary.monthKey,
          summary: summary.summary,
          messageCount: summary.messageCount,
          createdAt: summary.createdAt
        })),
        metadata: {
          contextBuiltAt: new Date(),
          recentMessageCount: limitedRecentMessages.length,
          summaryCount: relevantSummaries.length,
          currentMonth: currentMonthKey
        }
      };

      console.log(`✅ Context built for ${clientData.name}: ${limitedRecentMessages.length} recent messages, ${relevantSummaries.length} summaries`);
      return context;

    } catch (error) {
      console.error('❌ Error building client context:', error);
      throw error;
    }
  }

  /**
   * Gerar resposta da IA com contexto completo
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {string} message - Mensagem do cliente
   * @param {object} options - Opções adicionais
   * @returns {Promise<object>} - Resposta da IA com metadados
   */
  async generateAIResponse(companyId, clientId, message, options = {}) {
    try {
      console.log(`🤖 Generating AI response for client ${clientId}`);

      // 1. Obter contexto completo
      const context = await this.getClientContext(companyId, clientId, options.recentLimit || 20);

      // 2. Categorizar a mensagem
      const categorization = await this.openai.categorizeMessage(message, {
        companyName: context.company.name,
        clientName: context.client.name
      });

      // 3. Gerar resposta contextual
      const response = await this.openai.generateContextualResponse(message, {
        company: context.company,
        client: context.client,
        recentConversations: context.recentMessages,
        clientSummary: context.client.summary
      });

      // 4. Preparar resultado completo
      const result = {
        response: response,
        categorization: categorization,
        context: {
          companyName: context.company.name,
          clientName: context.client.name,
          messageCount: context.recentMessages.length,
          summaryCount: context.summaries.length
        },
        metadata: {
          generatedAt: new Date(),
          model: 'gpt-4o-mini',
          hasContext: true,
          contextQuality: this.assessContextQuality(context)
        }
      };

      console.log(`✅ AI response generated for ${context.client.name} (category: ${categorization.category})`);
      return result;

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Buscar conversas relevantes por tópico
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {string} topic - Tópico de interesse
   * @returns {Promise<Array>} - Conversas relevantes
   */
  async findRelevantConversations(companyId, clientId, topic) {
    try {
      console.log(`🔍 Finding conversations about "${topic}" for client ${clientId}`);

      // 1. Buscar conversas com tags relacionadas
      const conversationsWithTags = await conversationsService.getConversationsByTags(
        companyId, 
        clientId, 
        [topic.toLowerCase()]
      );

      // 2. Buscar nos resumos
      const relevantSummaries = await summarizerService.searchClientSummaries(
        companyId, 
        clientId, 
        topic
      );

      // 3. Combinar resultados
      const results = {
        conversations: conversationsWithTags,
        summaries: relevantSummaries,
        topic: topic,
        searchedAt: new Date()
      };

      console.log(`✅ Found ${conversationsWithTags.length} conversations and ${relevantSummaries.length} summaries about "${topic}"`);
      return results;

    } catch (error) {
      console.error('❌ Error finding relevant conversations:', error);
      throw error;
    }
  }

  /**
   * Atualizar contexto do cliente após nova interação
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {string} conversationId - ID da conversa
   * @param {string} messageContent - Conteúdo da nova mensagem
   * @returns {Promise<void>}
   */
  async updateClientContextAfterMessage(companyId, clientId, conversationId, messageContent) {
    try {
      console.log(`🔄 Updating client context after new message`);

      // 1. Categorizar a nova mensagem
      const categorization = await this.openai.categorizeMessage(messageContent);

      // 2. Atualizar conversa com categorização
      await conversationsService.updateConversation(companyId, clientId, conversationId, {
        category: categorization.category,
        priority: categorization.priority,
        sentiment: categorization.sentiment,
        lastAnalyzedAt: new Date()
      });

      // 3. Adicionar tags automáticas se relevantes
      if (categorization.tags && categorization.tags.length > 0) {
        await conversationsService.addTagsToConversation(
          companyId, 
          clientId, 
          conversationId, 
          categorization.tags
        );
      }

      // 4. Verificar se cliente precisa de atualização de perfil
      const clientDoc = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .get();

      const clientData = clientDoc.data();
      const lastProfileUpdate = clientData.lastProfileUpdate?.toDate();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Se não tem perfil atualizado nos últimos 30 dias, agendar atualização
      if (!lastProfileUpdate || lastProfileUpdate < thirtyDaysAgo) {
        console.log(`📅 Scheduling profile update for client ${clientId}`);
        // Aqui poderia adicionar à fila de processamento ou fazer imediatamente
        // Por simplicidade, vamos fazer imediatamente se não há muita atividade
        setTimeout(async () => {
          try {
            await summarizerService.generateClientProfileSummary(companyId, clientId);
          } catch (error) {
            console.error('❌ Error in scheduled profile update:', error);
          }
        }, 5000); // Atraso de 5 segundos
      }

      console.log(`✅ Client context updated after message processing`);

    } catch (error) {
      console.error('❌ Error updating client context:', error);
      throw error;
    }
  }

  /**
   * Obter insights sobre cliente
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @returns {Promise<object>} - Insights do cliente
   */
  async getClientInsights(companyId, clientId) {
    try {
      const context = await this.getClientContext(companyId, clientId);
      
      // Calcular métricas
      const insights = {
        client: context.client,
        metrics: {
          totalInteractions: context.recentMessages.length,
          averageResponseTime: this.calculateAverageResponseTime(context.recentMessages),
          mostUsedPlatform: this.getMostUsedPlatform(context.recentMessages),
          sentimentTrend: this.analyzeSentimentTrend(context.recentMessages),
          topTopics: this.extractTopTopics(context.client.tags)
        },
        recommendations: context.client.recommendations || [],
        lastUpdate: context.metadata.contextBuiltAt
      };

      return insights;

    } catch (error) {
      console.error('❌ Error getting client insights:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Avaliar qualidade do contexto
   * @private
   */
  assessContextQuality(context) {
    let score = 0;
    
    if (context.client.summary) score += 25;
    if (context.client.profile && Object.keys(context.client.profile).length > 0) score += 25;
    if (context.recentMessages.length > 5) score += 25;
    if (context.summaries.length > 0) score += 25;

    if (score >= 75) return 'excellent';
    if (score >= 50) return 'good';
    if (score >= 25) return 'fair';
    return 'limited';
  }

  /**
   * Calcular tempo médio de resposta
   * @private
   */
  calculateAverageResponseTime(messages) {
    if (messages.length < 2) return null;

    const responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
      const current = messages[i];
      const previous = messages[i - 1];
      
      if (current.role === 'assistant' && previous.role === 'user') {
        const currentTime = current.timestamp?.seconds || 0;
        const previousTime = previous.timestamp?.seconds || 0;
        if (currentTime > previousTime) {
          responseTimes.push(currentTime - previousTime);
        }
      }
    }

    if (responseTimes.length === 0) return null;
    
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average); // em segundos
  }

  /**
   * Obter plataforma mais usada
   * @private
   */
  getMostUsedPlatform(messages) {
    const platforms = {};
    messages.forEach(msg => {
      const platform = msg.platform || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;
    });

    return Object.keys(platforms).reduce((a, b) => 
      platforms[a] > platforms[b] ? a : b
    );
  }

  /**
   * Analisar tendência de sentimento
   * @private
   */
  analyzeSentimentTrend(messages) {
    const sentiments = messages
      .filter(msg => msg.sentiment)
      .map(msg => msg.sentiment);

    if (sentiments.length === 0) return 'unknown';

    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;
    const neutral = sentiments.filter(s => s === 'neutral').length;

    if (positive > negative && positive > neutral) return 'positive';
    if (negative > positive && negative > neutral) return 'negative';
    return 'neutral';
  }

  /**
   * Extrair principais tópicos
   * @private
   */
  extractTopTopics(tags) {
    if (!tags || tags.length === 0) return [];
    
    // Contar frequência de tags
    const tagCount = {};
    tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    // Retornar top 5 mais frequentes
    return Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }
}

module.exports = new ContextService();
