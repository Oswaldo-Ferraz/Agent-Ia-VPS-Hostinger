const FirestoreConfig = require('../config/firestore-config');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');

/**
 * CRUD Operations for Conversations
 * Manages both current (monthly) and archived conversations
 */

class ConversationsService {
  constructor() {
    this.firestore = new FirestoreConfig();
    this.db = this.firestore.db;
  }
  /**
   * Create a new conversation
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {object} conversationData - Conversation data
   * @returns {Promise<string>} - Conversation ID
   */
  async createConversation(companyId, clientId, conversationData = {}) {
    try {
      const timestamp = Timestamp.now();
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const conversationRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc();

      const newConversation = {
        id: conversationRef.id,
        companyId,
        clientId,
        monthKey,
        status: 'active',
        type: 'current', // 'current' or 'archived'
        tags: [],
        priority: 'normal', // 'low', 'normal', 'high', 'urgent'
        subject: '',
        summary: '',
        messageCount: 0,
        lastMessageAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...conversationData
      };

      await conversationRef.set(newConversation);
      
      // Update client's last activity
      await this.updateClientLastActivity(companyId, clientId);
      
      console.log(`✅ Conversation created: ${conversationRef.id}`);
      return conversationRef.id;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @param {object} messageData - Message data
   * @returns {Promise<string>} - Message ID
   */
  async addMessage(companyId, clientId, conversationId, messageData) {
    try {
      const timestamp = Timestamp.now();
      
      const messageRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc();

      const newMessage = {
        id: messageRef.id,
        conversationId,
        role: messageData.role || 'user', // 'user', 'assistant', 'system'
        content: messageData.content || '',
        platform: messageData.platform || 'whatsapp', // 'whatsapp', 'instagram', 'web'
        metadata: messageData.metadata || {},
        timestamp,
        createdAt: timestamp
      };

      await messageRef.set(newMessage);

      // Update conversation stats
      await this.updateConversationStats(companyId, clientId, conversationId, timestamp);
      
      console.log(`✅ Message added to conversation ${conversationId}: ${messageRef.id}`);
      return messageRef.id;
    } catch (error) {
      console.error('❌ Error adding message:', error);
      throw error;
    }
  }

  /**
   * Get current month conversations for a client
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @returns {Promise<Array>} - Current conversations
   */
  async getCurrentConversations(companyId, clientId) {
    try {
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const conversationsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('monthKey', '==', monthKey)
        .where('type', '==', 'current')
        .orderBy('lastMessageAt', 'desc');

      const snapshot = await conversationsRef.get();
      
      if (snapshot.empty) {
        console.log(`📭 No current conversations found for client ${clientId}`);
        return [];
      }

      const conversations = [];
      snapshot.forEach(doc => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Found ${conversations.length} current conversations for client ${clientId}`);
      return conversations;
    } catch (error) {
      console.error('❌ Error getting current conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages from a conversation
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @param {number} limit - Limit of messages to retrieve
   * @returns {Promise<Array>} - Messages
   */
  async getConversationMessages(companyId, clientId, conversationId, limit = 50) {
    try {
      const messagesRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      const snapshot = await messagesRef.get();
      
      if (snapshot.empty) {
        console.log(`📭 No messages found for conversation ${conversationId}`);
        return [];
      }

      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Found ${messages.length} messages for conversation ${conversationId}`);
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('❌ Error getting conversation messages:', error);
      throw error;
    }
  }

  /**
   * Archive old conversations (move from current to archived)
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} monthsAgo - How many months ago to archive (default: 2)
   * @returns {Promise<number>} - Number of archived conversations
   */
  async archiveOldConversations(companyId, clientId, monthsAgo = 2) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
      const cutoffMonthKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

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
        console.log(`📭 No conversations to archive for client ${clientId}`);
        return 0;
      }

      let archivedCount = 0;
      const batch = this.db.batch();

      snapshot.forEach(doc => {
        const conversationRef = doc.ref;
        batch.update(conversationRef, {
          type: 'archived',
          archivedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        archivedCount++;
      });

      await batch.commit();
      
      console.log(`✅ Archived ${archivedCount} conversations for client ${clientId}`);
      return archivedCount;
    } catch (error) {
      console.error('❌ Error archiving conversations:', error);
      throw error;
    }
  }

  /**
   * Add tags to conversation
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @param {Array<string>} tags - Tags to add
   * @returns {Promise<void>}
   */
  async addTagsToConversation(companyId, clientId, conversationId, tags) {
    try {
      const conversationRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        tags: FieldValue.arrayUnion(...tags),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Added tags ${tags.join(', ')} to conversation ${conversationId}`);
    } catch (error) {
      console.error('❌ Error adding tags to conversation:', error);
      throw error;
    }
  }

  /**
   * Update conversation subject and priority
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {string} conversationId - Conversation ID
   * @param {object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async updateConversation(companyId, clientId, conversationId, updates) {
    try {
      const conversationRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId);

      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      await conversationRef.update(updateData);
      
      console.log(`✅ Updated conversation ${conversationId}`);
    } catch (error) {
      console.error('❌ Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversations by tags
   * @param {string} companyId - Company ID
   * @param {string} clientId - Client ID
   * @param {Array<string>} tags - Tags to search for
   * @returns {Promise<Array>} - Conversations with matching tags
   */
  async getConversationsByTags(companyId, clientId, tags) {
    try {
      const conversationsRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('tags', 'array-contains-any', tags)
        .orderBy('lastMessageAt', 'desc');

      const snapshot = await conversationsRef.get();
      
      if (snapshot.empty) {
        console.log(`📭 No conversations found with tags: ${tags.join(', ')}`);
        return [];
      }

      const conversations = [];
      snapshot.forEach(doc => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Found ${conversations.length} conversations with specified tags`);
      return conversations;
    } catch (error) {
      console.error('❌ Error getting conversations by tags:', error);
      throw error;
    }
  }

  /**
   * Helper: Update conversation statistics
   * @private
   */
  async updateConversationStats(companyId, clientId, conversationId, timestamp) {
    try {
      const conversationRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        messageCount: FieldValue.increment(1),
        lastMessageAt: timestamp,
        updatedAt: timestamp
      });
    } catch (error) {
      console.error('❌ Error updating conversation stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Update client's last activity
   * @private
   */
  async updateClientLastActivity(companyId, clientId) {
    try {
      const clientRef = this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId);

      await clientRef.update({
        lastActivity: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('❌ Error updating client last activity:', error);
      throw error;
    }
  }
}

module.exports = new ConversationsService();
