const FirestoreConfig = require('../config/firestore-config');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');

/**
 * Conversation Categorization Service
 * Manages automatic categorization by date, tags, and topics
 */

class CategorizationService {
  constructor() {
    this.firestore = new FirestoreConfig();
    this.db = this.firestore.db;
  }
  
  /**
   * Categorize conversation automatically based on content and metadata
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @param {string} messageContent - Last message content for analysis
   * @returns {Promise<object>} - Categorization results
   */
  async categorizeConversation(companyId, clientId, conversationId, messageContent = '') {
    try {
      const automaticTags = this.generateAutomaticTags(messageContent);
      const priority = this.determinePriority(messageContent);
      const subject = this.extractSubject(messageContent);
      const category = this.determineCategory(messageContent);

      const categorization = {
        tags: automaticTags,
        priority,
        subject,
        category,
        lastAnalyzedAt: Timestamp.now()
      };

      // Update conversation with categorization
      const conversationRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        ...categorization,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Conversation ${conversationId} categorized:`, categorization);
      return categorization;
    } catch (error) {
      console.error('❌ Error categorizing conversation:', error);
      throw error;
    }
  }

  /**
   * Process monthly categorization for all conversations
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID (optional, if not provided processes all clients)
   * @returns {Promise<object>} - Processing results
   */
  async processMonthlyCategorizationForCompany(companyId, clientId = null) {
    try {
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      let processedConversations = 0;
      let categorizedConversations = 0;
      let errors = 0;

      if (clientId) {
        // Process specific client
        const result = await this.processClientConversations(companyId, clientId, monthKey);
        processedConversations += result.processed;
        categorizedConversations += result.categorized;
        errors += result.errors;
      } else {
        // Process all clients in company
        const clientsRef = this.db
          .collection('companies')
          .doc(companyId)
          .collection('clients');

        const clientsSnapshot = await clientsRef.get();
        
        for (const clientDoc of clientsSnapshot.docs) {
          const result = await this.processClientConversations(companyId, clientDoc.id, monthKey);
          processedConversations += result.processed;
          categorizedConversations += result.categorized;
          errors += result.errors;
        }
      }

      const results = {
        companyId,
        monthKey,
        processedConversations,
        categorizedConversations,
        errors,
        processedAt: Timestamp.now()
      };

      console.log(`✅ Monthly categorization completed for company ${companyId}:`, results);
      return results;
    } catch (error) {
      console.error('❌ Error in monthly categorization:', error);
      throw error;
    }
  }

  /**
   * Archive conversations older than specified months
   * @param {string} companyId - Company ID
   * @param {number} monthsToKeepCurrent - Number of months to keep as current (default: 2)
   * @returns {Promise<object>} - Archiving results
   */
  async archiveOldConversations(companyId, monthsToKeepCurrent = 2) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeepCurrent);
      const cutoffMonthKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

      let totalArchived = 0;
      let errors = 0;

      // Get all clients in company
      const clientsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients');

      const clientsSnapshot = await clientsRef.get();
      
      for (const clientDoc of clientsSnapshot.docs) {
        try {
          const archived = await this.archiveClientOldConversations(companyId, clientDoc.id, cutoffMonthKey);
          totalArchived += archived;
        } catch (error) {
          console.error(`❌ Error archiving conversations for client ${clientDoc.id}:`, error);
          errors++;
        }
      }

      const results = {
        companyId,
        cutoffMonthKey,
        totalArchived,
        errors,
        archivedAt: Timestamp.now()
      };

      console.log(`✅ Archiving completed for company ${companyId}:`, results);
      return results;
    } catch (error) {
      console.error('❌ Error in archiving process:', error);
      throw error;
    }
  }

  /**
   * Get conversation statistics by category
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} monthKey - Month key (optional, defaults to current month)
   * @returns {Promise<object>} - Statistics
   */
  async getConversationStatistics(companyId, clientId, monthKey = null) {
    try {
      if (!monthKey) {
        const currentDate = new Date();
        monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      }

      const conversationsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('monthKey', '==', monthKey);

      const snapshot = await conversationsRef.get();
      
      const stats = {
        total: 0,
        byCategory: {},
        byPriority: {},
        byTags: {},
        byStatus: {},
        monthKey,
        clientId,
        companyId
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        stats.total++;

        // Count by category
        const category = data.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // Count by priority
        const priority = data.priority || 'normal';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // Count by status
        const status = data.status || 'active';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Count by tags
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach(tag => {
            stats.byTags[tag] = (stats.byTags[tag] || 0) + 1;
          });
        }
      });

      console.log(`✅ Statistics generated for client ${clientId}, month ${monthKey}:`, stats);
      return stats;
    } catch (error) {
      console.error('❌ Error generating statistics:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Process conversations for a specific client
   * @private
   */
  async processClientConversations(companyId, clientId, monthKey) {
    try {
      const conversationsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('monthKey', '==', monthKey)
        .where('type', '==', 'current');

      const snapshot = await conversationsRef.get();
      
      let processed = 0;
      let categorized = 0;
      let errors = 0;

      for (const doc of snapshot.docs) {
        try {
          processed++;
          const conversationData = doc.data();
          
          // Get recent messages for analysis
          const messagesRef = doc.ref.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(5);
          
          const messagesSnapshot = await messagesRef.get();
          let messageContent = '';
          
          messagesSnapshot.forEach(msgDoc => {
            const msgData = msgDoc.data();
            messageContent += ' ' + (msgData.content || '');
          });

          // Only categorize if not already categorized recently
          if (!conversationData.lastAnalyzedAt || 
              (Date.now() - conversationData.lastAnalyzedAt.toDate().getTime()) > 24 * 60 * 60 * 1000) {
            
            await this.categorizeConversation(companyId, clientId, doc.id, messageContent.trim());
            categorized++;
          }
        } catch (error) {
          console.error(`❌ Error processing conversation ${doc.id}:`, error);
          errors++;
        }
      }

      return { processed, categorized, errors };
    } catch (error) {
      console.error(`❌ Error processing client ${clientId} conversations:`, error);
      throw error;
    }
  }

  /**
   * Archive old conversations for a specific client
   * @private
   */
  async archiveClientOldConversations(companyId, clientId, cutoffMonthKey) {
    try {
      const conversationsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('type', '==', 'current')
        .where('monthKey', '<', cutoffMonthKey);

      const snapshot = await conversationsRef.get();
      
      if (snapshot.empty) {
        return 0;
      }

      const batch = this.db.batch();
      let count = 0;

      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          type: 'archived',
          archivedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        count++;
      });

      await batch.commit();
      
      console.log(`✅ Archived ${count} conversations for client ${clientId}`);
      return count;
    } catch (error) {
      console.error(`❌ Error archiving conversations for client ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Generate automatic tags based on message content
   * @private
   */
  generateAutomaticTags(content) {
    const tags = [];
    const lowerContent = content.toLowerCase();

    // Business-related keywords
    const businessKeywords = {
      'pagamento': ['payment', 'billing'],
      'produto': ['product', 'catalog'],
      'suporte': ['support', 'help'],
      'vendas': ['sales', 'purchase'],
      'entrega': ['delivery', 'shipping'],
      'duvida': ['question', 'doubt'],
      'problema': ['issue', 'problem'],
      'reclamacao': ['complaint', 'feedback'],
      'elogio': ['compliment', 'praise'],
      'agendamento': ['scheduling', 'appointment']
    };

    // Check for business keywords
    Object.entries(businessKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        tags.push(tag);
      }
    });

    // Add urgency tags
    const urgentWords = ['urgente', 'urgent', 'emergency', 'emergencia', 'rapido', 'quick'];
    if (urgentWords.some(word => lowerContent.includes(word))) {
      tags.push('urgente');
    }

    // Add communication platform tags
    if (lowerContent.includes('whatsapp') || lowerContent.includes('wpp')) {
      tags.push('whatsapp');
    }
    if (lowerContent.includes('instagram') || lowerContent.includes('insta')) {
      tags.push('instagram');
    }

    return tags.length > 0 ? tags : ['geral'];
  }

  /**
   * Determine conversation priority based on content
   * @private
   */
  determinePriority(content) {
    const lowerContent = content.toLowerCase();
    
    // High priority keywords
    const highPriorityWords = ['urgente', 'urgent', 'emergency', 'emergencia', 'problema', 'problem', 'reclamacao'];
    if (highPriorityWords.some(word => lowerContent.includes(word))) {
      return 'high';
    }

    // Low priority keywords  
    const lowPriorityWords = ['duvida', 'informacao', 'question', 'info'];
    if (lowPriorityWords.some(word => lowerContent.includes(word))) {
      return 'low';
    }

    return 'normal';
  }

  /**
   * Extract subject from message content
   * @private
   */
  extractSubject(content) {
    if (!content || content.length < 10) {
      return 'Conversa geral';
    }

    // Simple subject extraction - first 50 characters
    let subject = content.substring(0, 50).trim();
    
    // Clean up subject
    subject = subject.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    if (subject.length < content.length) {
      subject += '...';
    }

    return subject || 'Conversa geral';
  }

  /**
   * Determine conversation category
   * @private
   */
  determineCategory(content) {
    const lowerContent = content.toLowerCase();

    const categories = {
      'vendas': ['comprar', 'buy', 'purchase', 'preco', 'price', 'valor', 'cost'],
      'suporte': ['problema', 'problem', 'help', 'ajuda', 'suporte', 'support'],
      'entrega': ['entrega', 'delivery', 'envio', 'shipping', 'pedido', 'order'],
      'pagamento': ['pagamento', 'payment', 'pagar', 'pay', 'cobranca', 'billing'],
      'informacoes': ['info', 'informacao', 'duvida', 'question', 'como', 'how'],
      'feedback': ['feedback', 'reclamacao', 'elogio', 'opinion', 'review']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return category;
      }
    }

    return 'geral';
  }
}

module.exports = new CategorizationService();
