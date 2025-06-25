const openAIService = require('../../services/OpenAIService');
const conversationsService = require('./conversations');
const { Timestamp } = require('firebase-admin/firestore');
const FirestoreConfig = require('../config/firestore-config');

/**
 * 📝 SUMMARIZER SERVICE
 * Serviço para criação automática de resumos de conversas
 * Integra com OpenAI para análise inteligente
 */

class SummarizerService {
  constructor() {
    this.firestore = new FirestoreConfig();
    this.db = this.firestore.db;
    this.openai = openAIService;
  }

  /**
   * Processar resumos mensais automáticos para uma empresa
   * @param {string} companyId - ID da empresa
   * @param {string} targetMonth - Mês alvo no formato 'YYYY-MM' (opcional)
   * @returns {Promise<object>} - Resultado do processamento
   */
  async processMonthlyResumes(companyId, targetMonth = null) {
    try {
      if (!targetMonth) {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        targetMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      }

      console.log(`📝 Starting monthly resumes for company ${companyId}, month ${targetMonth}`);

      // Buscar empresa
      const companyDoc = await this.db.collection('companies').doc(companyId).get();
      if (!companyDoc.exists) {
        throw new Error('Company not found');
      }
      const companyData = companyDoc.data();

      // Buscar todos os clientes da empresa
      const clientsSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .get();

      let processedClients = 0;
      let resumesCreated = 0;
      let errors = 0;
      const results = [];

      // Processar cada cliente
      for (const clientDoc of clientsSnapshot.docs) {
        try {
          const clientData = clientDoc.data();
          const clientId = clientDoc.id;

          processedClients++;

          // Buscar conversas do mês para este cliente
          const conversationsSnapshot = await this.db
            .collection('companies')
            .doc(companyId)
            .collection('clients')
            .doc(clientId)
            .collection('conversations')
            .where('monthKey', '==', targetMonth)
            .where('type', '==', 'current')
            .get();

          if (conversationsSnapshot.empty) {
            console.log(`⚠️ No conversations found for client ${clientId} in month ${targetMonth}`);
            continue;
          }

          // Coletar todas as mensagens das conversas
          const allMessages = [];
          for (const convDoc of conversationsSnapshot.docs) {
            const messagesSnapshot = await convDoc.ref
              .collection('messages')
              .orderBy('timestamp', 'asc')
              .get();

            messagesSnapshot.forEach(msgDoc => {
              allMessages.push({
                conversationId: convDoc.id,
                ...msgDoc.data()
              });
            });
          }

          if (allMessages.length === 0) {
            console.log(`⚠️ No messages found for client ${clientId} in month ${targetMonth}`);
            continue;
          }

          // Gerar resumo usando OpenAI
          const summary = await this.openai.generateConversationSummary(
            allMessages,
            clientData,
            companyData
          );

          // Salvar resumo na subcoleção de resumos
          const resumeData = {
            companyId,
            clientId,
            monthKey: targetMonth,
            summary,
            messageCount: allMessages.length,
            conversationCount: conversationsSnapshot.docs.length,
            createdAt: Timestamp.now(),
            createdBy: 'auto_summarizer',
            type: 'monthly',
            status: 'completed'
          };

          const resumeRef = await this.db
            .collection('companies')
            .doc(companyId)
            .collection('clients')
            .doc(clientId)
            .collection('summaries')
            .add(resumeData);

          // Arquivar conversas antigas
          await this.archiveProcessedConversations(companyId, clientId, targetMonth);

          resumesCreated++;
          results.push({
            clientId,
            clientName: clientData.name,
            resumeId: resumeRef.id,
            messageCount: allMessages.length,
            status: 'success'
          });

          console.log(`✅ Resume created for client ${clientData.name}: ${allMessages.length} messages processed`);

        } catch (error) {
          console.error(`❌ Error processing client ${clientDoc.id}:`, error);
          errors++;
          results.push({
            clientId: clientDoc.id,
            status: 'error',
            error: error.message
          });
        }
      }

      const finalResult = {
        companyId,
        targetMonth,
        processedClients,
        resumesCreated,
        errors,
        results,
        processedAt: Timestamp.now()
      };

      console.log(`🎉 Monthly resumes completed for company ${companyId}:`, finalResult);
      return finalResult;

    } catch (error) {
      console.error('❌ Error in monthly resumes processing:', error);
      throw error;
    }
  }

  /**
   * Gerar resumo de perfil atualizado para um cliente
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @returns {Promise<object>} - Perfil atualizado
   */
  async generateClientProfileSummary(companyId, clientId) {
    try {
      console.log(`👤 Generating profile summary for client ${clientId}`);

      // Buscar dados do cliente
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

      // Buscar empresa
      const companyDoc = await this.db.collection('companies').doc(companyId).get();
      const companyData = companyDoc.data();

      // Buscar resumos recentes (últimos 6 meses)
      const recentSummariesSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('summaries')
        .orderBy('createdAt', 'desc')
        .limit(6)
        .get();

      const recentSummaries = [];
      recentSummariesSnapshot.forEach(doc => {
        recentSummaries.push(doc.data().summary);
      });

      // Gerar perfil usando OpenAI
      const profileData = await this.openai.generateClientProfile(
        clientData,
        recentSummaries,
        companyData
      );

      // Atualizar cliente com novo perfil
      const updatedData = {
        summary: profileData.summary,
        profile: profileData.profile,
        tags: profileData.tags,
        insights: profileData.insights,
        recommendations: profileData.recommendations,
        lastProfileUpdate: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await clientDoc.ref.update(updatedData);

      console.log(`✅ Profile summary updated for client ${clientData.name}`);
      return {
        clientId,
        clientName: clientData.name,
        profileData,
        updatedAt: updatedData.lastProfileUpdate
      };

    } catch (error) {
      console.error('❌ Error generating client profile summary:', error);
      throw error;
    }
  }

  /**
   * Busca semântica em resumos de um cliente
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {string} query - Consulta de busca
   * @returns {Promise<Array>} - Resumos relevantes
   */
  async searchClientSummaries(companyId, clientId, query) {
    try {
      console.log(`🔍 Searching summaries for client ${clientId} with query: "${query}"`);

      // Buscar todos os resumos do cliente
      const summariesSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('summaries')
        .orderBy('createdAt', 'desc')
        .get();

      if (summariesSnapshot.empty) {
        return [];
      }

      const summaries = [];
      summariesSnapshot.forEach(doc => {
        summaries.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Usar OpenAI para busca semântica
      const relevantSummaries = await this.openai.semanticSearch(query, summaries);

      console.log(`✅ Found ${relevantSummaries.length} relevant summaries`);
      return relevantSummaries;

    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Arquivar conversas processadas
   * @param {string} companyId - ID da empresa
   * @param {string} clientId - ID do cliente
   * @param {string} monthKey - Chave do mês
   * @returns {Promise<number>} - Número de conversas arquivadas
   */
  async archiveProcessedConversations(companyId, clientId, monthKey) {
    try {
      const conversationsSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .doc(clientId)
        .collection('conversations')
        .where('monthKey', '==', monthKey)
        .where('type', '==', 'current')
        .get();

      if (conversationsSnapshot.empty) {
        return 0;
      }

      const batch = this.db.batch();
      let count = 0;

      conversationsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          type: 'archived',
          archivedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        count++;
      });

      await batch.commit();

      console.log(`✅ Archived ${count} conversations for client ${clientId}, month ${monthKey}`);
      return count;

    } catch (error) {
      console.error('❌ Error archiving conversations:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de resumos de uma empresa
   * @param {string} companyId - ID da empresa
   * @param {number} lastMonths - Número de meses para analisar (padrão: 6)
   * @returns {Promise<object>} - Estatísticas
   */
  async getSummaryStatistics(companyId, lastMonths = 6) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - lastMonths);

      // Buscar todos os clientes
      const clientsSnapshot = await this.db
        .collection('companies')
        .doc(companyId)
        .collection('clients')
        .get();

      let totalClients = 0;
      let clientsWithSummaries = 0;
      let totalSummaries = 0;
      let totalMessagesProcessed = 0;

      for (const clientDoc of clientsSnapshot.docs) {
        totalClients++;

        const summariesSnapshot = await clientDoc.ref
          .collection('summaries')
          .where('createdAt', '>=', Timestamp.fromDate(cutoffDate))
          .get();

        if (!summariesSnapshot.empty) {
          clientsWithSummaries++;
          
          summariesSnapshot.forEach(summaryDoc => {
            totalSummaries++;
            const summaryData = summaryDoc.data();
            totalMessagesProcessed += summaryData.messageCount || 0;
          });
        }
      }

      const stats = {
        companyId,
        period: `${lastMonths} months`,
        totalClients,
        clientsWithSummaries,
        totalSummaries,
        totalMessagesProcessed,
        coveragePercentage: totalClients > 0 ? Math.round((clientsWithSummaries / totalClients) * 100) : 0,
        generatedAt: Timestamp.now()
      };

      console.log(`📊 Summary statistics for company ${companyId}:`, stats);
      return stats;

    } catch (error) {
      console.error('❌ Error getting summary statistics:', error);
      throw error;
    }
  }

  /**
   * Executar processo de resumo agendado para todas as empresas
   * @returns {Promise<Array>} - Resultados de todas as empresas
   */
  async runScheduledSummaryProcess() {
    try {
      console.log('🕐 Starting scheduled summary process for all companies');

      // Buscar todas as empresas ativas
      const companiesSnapshot = await this.db
        .collection('companies')
        .where('activePlan', '==', true)
        .get();

      const results = [];

      for (const companyDoc of companiesSnapshot.docs) {
        try {
          const companyResult = await this.processMonthlyResumes(companyDoc.id);
          results.push(companyResult);
        } catch (error) {
          console.error(`❌ Error processing company ${companyDoc.id}:`, error);
          results.push({
            companyId: companyDoc.id,
            status: 'error',
            error: error.message
          });
        }
      }

      console.log(`🎉 Scheduled summary process completed: ${results.length} companies processed`);
      return results;

    } catch (error) {
      console.error('❌ Error in scheduled summary process:', error);
      throw error;
    }
  }
}

module.exports = new SummarizerService();
