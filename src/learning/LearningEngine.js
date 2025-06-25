/**
 * 🧠 LEARNING ENGINE - SISTEMA DE APRENDIZADO
 * 
 * Coleta feedback e melhora as respostas do agente automaticamente
 * Analisa padrões e otimiza performance
 */

const FirestoreConfig = require('../firebase/config/firestore-config');
const { Timestamp } = require('firebase-admin/firestore');

class LearningEngine {
    constructor() {
        this.firestore = new FirestoreConfig();
        this.db = this.firestore.db;
        
        // Métricas em memória para performance
        this.metrics = {
            interactions: 0,
            successfulResponses: 0,
            averageConfidence: 0,
            commonTopics: new Map(),
            responseTime: []
        };

        console.log('🧠 Learning Engine inicializado');
    }

    /**
     * 📊 REGISTRAR INTERAÇÃO PARA APRENDIZADO
     */
    async recordInteraction(companyId, clientId, interactionData) {
        try {
            const {
                input,
                context,
                analysis,
                response,
                processingTime,
                feedback = null
            } = interactionData;

            // Criar registro de aprendizado
            const learningRecord = {
                companyId,
                clientId,
                timestamp: Timestamp.now(),
                
                // Dados de entrada
                input: {
                    content: input.content,
                    source: input.source,
                    length: input.content.length
                },
                
                // Contexto usado
                context: {
                    hasProfile: !!context.client.profile,
                    recentConversations: context.recentConversations.length,
                    historicalSummaries: context.historicalSummaries.length,
                    companyCustomPrompt: !!context.company.customPrompt
                },
                
                // Análise da IA
                analysis: {
                    category: analysis.category,
                    confidence: analysis.confidence,
                    sentiment: analysis.sentiment,
                    urgency: analysis.urgency,
                    topics: analysis.topics || []
                },
                
                // Resposta gerada
                response: response ? {
                    generated: true,
                    confidence: response.confidence,
                    length: response.content.length,
                    type: response.type
                } : {
                    generated: false,
                    reason: 'low_confidence_or_human_required'
                },
                
                // Performance
                performance: {
                    processingTime,
                    timestamp: Date.now()
                },
                
                // Feedback (será atualizado posteriormente)
                feedback: feedback
            };

            // Salvar no Firestore
            await this.db
                .collection('learning')
                .add(learningRecord);

            // Atualizar métricas em memória
            this.updateInMemoryMetrics(learningRecord);

            console.log(`🧠 Interação registrada para aprendizado: ${companyId}/${clientId}`);

        } catch (error) {
            console.error('❌ Erro ao registrar interação:', error);
            // Não falhar o processo principal por erro de learning
        }
    }

    /**
     * 👍 REGISTRAR FEEDBACK DA INTERAÇÃO
     */
    async recordFeedback(interactionId, feedbackData) {
        try {
            const {
                rating, // 1-5
                wasHelpful, // boolean
                category, // 'excellent', 'good', 'poor', 'wrong'
                humanTookOver, // boolean
                userComment // string opcional
            } = feedbackData;

            const feedback = {
                rating,
                wasHelpful,
                category,
                humanTookOver,
                userComment,
                timestamp: Timestamp.now()
            };

            // Atualizar registro de learning
            await this.db
                .collection('learning')
                .doc(interactionId)
                .update({
                    feedback,
                    updatedAt: Timestamp.now()
                });

            console.log(`👍 Feedback registrado: ${rating}/5 - ${category}`);

            // Executar análise de melhoria se feedback negativo
            if (rating <= 2 || category === 'poor' || category === 'wrong') {
                await this.analyzeFailure(interactionId, feedback);
            }

        } catch (error) {
            console.error('❌ Erro ao registrar feedback:', error);
        }
    }

    /**
     * 📈 ANALISAR PADRÕES E MELHORIAS
     */
    async analyzePatterns(companyId = null, daysBack = 7) {
        try {
            console.log('📈 Analisando padrões de aprendizado...');

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysBack);

            let query = this.db
                .collection('learning')
                .where('timestamp', '>=', Timestamp.fromDate(cutoffDate));

            if (companyId) {
                query = query.where('companyId', '==', companyId);
            }

            const snapshot = await query.get();
            const interactions = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const analysis = {
                totalInteractions: interactions.length,
                responseRate: this.calculateResponseRate(interactions),
                averageConfidence: this.calculateAverageConfidence(interactions),
                topTopics: this.getTopTopics(interactions),
                sentimentDistribution: this.getSentimentDistribution(interactions),
                categoryPerformance: this.getCategoryPerformance(interactions),
                improvementSuggestions: this.generateImprovementSuggestions(interactions)
            };

            console.log('📊 Análise de padrões concluída');
            return analysis;

        } catch (error) {
            console.error('❌ Erro na análise de padrões:', error);
            throw error;
        }
    }

    /**
     * 💡 GERAR SUGESTÕES DE MELHORIA
     */
    generateImprovementSuggestions(interactions) {
        const suggestions = [];

        // Análise de confiança baixa
        const lowConfidenceCount = interactions.filter(i => 
            i.analysis.confidence < 0.7
        ).length;

        if (lowConfidenceCount > interactions.length * 0.3) {
            suggestions.push({
                type: 'confidence',
                issue: 'Alto índice de baixa confiança',
                suggestion: 'Considerar melhorar o prompt customizado da empresa ou adicionar mais contexto',
                priority: 'high'
            });
        }

        // Análise de feedback negativo
        const negativeFeedback = interactions.filter(i => 
            i.feedback && i.feedback.rating <= 2
        );

        if (negativeFeedback.length > 0) {
            suggestions.push({
                type: 'feedback',
                issue: `${negativeFeedback.length} feedbacks negativos`,
                suggestion: 'Revisar respostas que receberam feedback negativo para identificar padrões',
                priority: 'high'
            });
        }

        // Análise de topics não atendidos
        const humanTakeovers = interactions.filter(i => 
            i.feedback && i.feedback.humanTookOver
        ).length;

        if (humanTakeovers > interactions.length * 0.2) {
            suggestions.push({
                type: 'coverage',
                issue: 'Muitas transferências para atendimento humano',
                suggestion: 'Expandir conhecimento do agente ou melhorar categorização',
                priority: 'medium'
            });
        }

        return suggestions;
    }

    /**
     * ⚡ OTIMIZAR PERFORMANCE
     */
    async optimizePerformance(companyId) {
        try {
            console.log(`⚡ Otimizando performance para empresa ${companyId}...`);

            const analysis = await this.analyzePatterns(companyId, 30);
            const optimizations = [];

            // Otimização de prompt baseada em topics frequentes
            if (analysis.topTopics.length > 0) {
                const promptOptimization = await this.generatePromptOptimization(
                    companyId, 
                    analysis.topTopics
                );
                optimizations.push(promptOptimization);
            }

            // Otimização de threshold de confiança
            if (analysis.averageConfidence < 0.6) {
                optimizations.push({
                    type: 'confidence_threshold',
                    recommendation: 'Reduzir threshold de confiança para 0.6',
                    reasoning: 'Confiança média muito baixa indica threshold muito alto'
                });
            }

            return {
                companyId,
                optimizations,
                currentPerformance: analysis,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro na otimização:', error);
            throw error;
        }
    }

    /**
     * 📊 CALCULAR TAXA DE RESPOSTA
     */
    calculateResponseRate(interactions) {
        const responded = interactions.filter(i => i.response.generated).length;
        return interactions.length > 0 ? (responded / interactions.length) : 0;
    }

    /**
     * 🎯 CALCULAR CONFIANÇA MÉDIA
     */
    calculateAverageConfidence(interactions) {
        if (interactions.length === 0) return 0;
        
        const sum = interactions.reduce((acc, i) => acc + i.analysis.confidence, 0);
        return sum / interactions.length;
    }

    /**
     * 🏷️ OBTER TOPICS MAIS FREQUENTES
     */
    getTopTopics(interactions) {
        const topicCount = new Map();
        
        interactions.forEach(interaction => {
            interaction.analysis.topics?.forEach(topic => {
                topicCount.set(topic, (topicCount.get(topic) || 0) + 1);
            });
        });

        return Array.from(topicCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count }));
    }

    /**
     * 😊 DISTRIBUIÇÃO DE SENTIMENTOS
     */
    getSentimentDistribution(interactions) {
        const sentiments = { positive: 0, neutral: 0, negative: 0 };
        
        interactions.forEach(interaction => {
            const sentiment = interaction.analysis.sentiment;
            if (sentiments.hasOwnProperty(sentiment)) {
                sentiments[sentiment]++;
            }
        });

        return sentiments;
    }

    /**
     * 📋 PERFORMANCE POR CATEGORIA
     */
    getCategoryPerformance(interactions) {
        const categories = {};
        
        interactions.forEach(interaction => {
            const category = interaction.analysis.category;
            if (!categories[category]) {
                categories[category] = {
                    total: 0,
                    responded: 0,
                    avgConfidence: 0,
                    positiFeedback: 0
                };
            }
            
            categories[category].total++;
            if (interaction.response.generated) {
                categories[category].responded++;
            }
            categories[category].avgConfidence += interaction.analysis.confidence;
            
            if (interaction.feedback && interaction.feedback.rating >= 4) {
                categories[category].positiFeedback++;
            }
        });

        // Calcular médias
        Object.keys(categories).forEach(category => {
            const cat = categories[category];
            cat.responseRate = cat.responded / cat.total;
            cat.avgConfidence = cat.avgConfidence / cat.total;
            cat.satisfactionRate = cat.positiFeedback / cat.total;
        });

        return categories;
    }

    /**
     * 🔍 ANALISAR FALHA ESPECÍFICA
     */
    async analyzeFailure(interactionId, feedback) {
        try {
            console.log(`🔍 Analisando falha: ${interactionId}`);

            const interactionDoc = await this.db
                .collection('learning')
                .doc(interactionId)
                .get();

            if (!interactionDoc.exists) {
                console.log('⚠️ Interação não encontrada para análise');
                return;
            }

            const interaction = interactionDoc.data();

            const failureAnalysis = {
                interactionId,
                timestamp: Timestamp.now(),
                companyId: interaction.companyId,
                clientId: interaction.clientId,
                
                issue: {
                    category: feedback.category,
                    rating: feedback.rating,
                    comment: feedback.userComment
                },
                
                context: {
                    inputCategory: interaction.analysis.category,
                    confidence: interaction.analysis.confidence,
                    topics: interaction.analysis.topics,
                    hasCustomPrompt: interaction.context.companyCustomPrompt
                },
                
                possibleCauses: this.identifyPossibleCauses(interaction, feedback),
                
                suggestedActions: this.suggestCorrectiveActions(interaction, feedback)
            };

            // Salvar análise de falha
            await this.db
                .collection('failure_analysis')
                .add(failureAnalysis);

            console.log('🔍 Análise de falha concluída e salva');

        } catch (error) {
            console.error('❌ Erro na análise de falha:', error);
        }
    }

    /**
     * 🎯 IDENTIFICAR POSSÍVEIS CAUSAS
     */
    identifyPossibleCauses(interaction, feedback) {
        const causes = [];

        if (interaction.analysis.confidence < 0.6) {
            causes.push('Low confidence in message analysis');
        }

        if (!interaction.context.companyCustomPrompt) {
            causes.push('No custom prompt configured for company');
        }

        if (interaction.context.recentConversations === 0) {
            causes.push('No conversation history available');
        }

        if (feedback.category === 'wrong') {
            causes.push('Incorrect understanding of user intent');
        }

        return causes;
    }

    /**
     * 💡 SUGERIR AÇÕES CORRETIVAS
     */
    suggestCorrectiveActions(interaction, feedback) {
        const actions = [];

        if (interaction.analysis.confidence < 0.6) {
            actions.push('Review and improve message categorization prompts');
        }

        if (!interaction.context.companyCustomPrompt) {
            actions.push('Configure custom prompt for better context');
        }

        if (feedback.category === 'wrong') {
            actions.push('Add this scenario to training examples');
        }

        return actions;
    }

    /**
     * 🔄 ATUALIZAR MÉTRICAS EM MEMÓRIA
     */
    updateInMemoryMetrics(learningRecord) {
        this.metrics.interactions++;
        
        if (learningRecord.response.generated) {
            this.metrics.successfulResponses++;
        }

        // Atualizar confiança média
        const totalConfidence = this.metrics.averageConfidence * (this.metrics.interactions - 1) + 
                               learningRecord.analysis.confidence;
        this.metrics.averageConfidence = totalConfidence / this.metrics.interactions;

        // Atualizar topics comuns
        learningRecord.analysis.topics?.forEach(topic => {
            this.metrics.commonTopics.set(
                topic, 
                (this.metrics.commonTopics.get(topic) || 0) + 1
            );
        });

        // Atualizar tempo de resposta
        this.metrics.responseTime.push(learningRecord.performance.processingTime);
        if (this.metrics.responseTime.length > 100) {
            this.metrics.responseTime.shift(); // Manter apenas últimas 100
        }
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DO AGENTE
     */
    async getAgentStats(companyId = null, timeRange = '24h') {
        try {
            const hours = parseInt(timeRange.replace('h', ''));
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - hours);

            let query = this.db
                .collection('learning')
                .where('timestamp', '>=', Timestamp.fromDate(cutoffDate));

            if (companyId) {
                query = query.where('companyId', '==', companyId);
            }

            const snapshot = await query.get();
            const interactions = snapshot.docs.map(doc => doc.data());

            return {
                timeRange,
                totalInteractions: interactions.length,
                responseRate: this.calculateResponseRate(interactions),
                averageConfidence: this.calculateAverageConfidence(interactions),
                inMemoryMetrics: this.metrics,
                lastUpdate: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Erro ao obter stats:', error);
            return { error: error.message };
        }
    }
}

module.exports = LearningEngine;
