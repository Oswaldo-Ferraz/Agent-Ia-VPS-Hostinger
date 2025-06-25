/**
 * 🤖 AGENTE IA PRINCIPAL - FASE 4
 * 
 * Agente central que integra todos os serviços das fases anteriores
 * para criar um sistema de atendimento automatizado completo.
 * 
 * Integra:
 * - Sistema de empresas e clientes (Fase 1)
 * - Sistema de conversas (Fase 2) 
 * - OpenAI e resumos (Fase 3)
 * - Lógica de roteamento e automação (Fase 4)
 */

const OpenAIService = require('../services/OpenAIService');
const ContextService = require('../services/ContextService');
const conversationsService = require('../firebase/firestore/conversations');
const CompaniesService = require('../firebase/firestore/companies');
const ClientsService = require('../firebase/firestore/clients');
const MessageRouter = require('../routing/MessageRouter');
const LearningEngine = require('../learning/LearningEngine');
const { Timestamp } = require('firebase-admin/firestore');

class AgentePrincipal {
    constructor() {
        this.openai = OpenAIService;
        this.context = ContextService;
        this.router = new MessageRouter();
        this.learning = new LearningEngine();
        this.companiesService = new CompaniesService();
        this.clientsService = new ClientsService();
        
        // Configurações
        this.config = {
            autoResponse: true,
            learningEnabled: true,
            confidenceThreshold: 0.7,
            maxResponseTime: 30000, // 30 segundos
            fallbackToHuman: true
        };

        console.log('🤖 Agente IA Principal inicializado');
    }

    /**
     * 🎯 PROCESSAR MENSAGEM RECEBIDA
     * Ponto de entrada principal para todas as mensagens
     */
    async processMessage(incomingMessage) {
        console.log(`\n🎯 Processing message: "${incomingMessage.content.substring(0, 50)}..."`);
        
        try {
            const startTime = Date.now();

            // 1. ROTEAMENTO: Identificar empresa e cliente
            const routingResult = await this.router.routeMessage(incomingMessage);
            
            if (!routingResult.success) {
                return this.handleRoutingFailure(routingResult, incomingMessage);
            }

            const { companyId, clientId, isNewClient } = routingResult;

            // 2. CONTEXTO: Buscar contexto completo
            const context = await this.context.getClientContext(companyId, clientId);

            // 3. ANÁLISE: Categorizar mensagem
            const analysis = await this.openai.categorizeMessage(
                incomingMessage.content,
                {
                    companyName: context.company.name,
                    clientName: context.client.name
                }
            );

            // 4. DECISÃO: Determinar se deve responder automaticamente
            const shouldAutoRespond = this.shouldRespondAutomatically(analysis, context);

            let response = null;
            if (shouldAutoRespond) {
                // 5. RESPOSTA: Gerar resposta contextual
                response = await this.generateResponse(incomingMessage, context, analysis);
            }

            // 6. REGISTRO: Salvar interação
            await this.saveInteraction(companyId, clientId, incomingMessage, response, analysis);

            // 7. APRENDIZADO: Feedback para melhoria
            if (this.config.learningEnabled) {
                await this.learning.recordInteraction(companyId, clientId, {
                    input: incomingMessage,
                    context,
                    analysis,
                    response,
                    processingTime: Date.now() - startTime
                });
            }

            // 8. RESULTADO
            return {
                success: true,
                companyId,
                clientId,
                isNewClient,
                analysis,
                response,
                autoResponded: shouldAutoRespond,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ Erro no processamento:', error);
            return {
                success: false,
                error: error.message,
                shouldNotifyHuman: true
            };
        }
    }

    /**
     * 🧠 GERAR RESPOSTA CONTEXTUAL
     */
    async generateResponse(message, context, analysis) {
        try {
            console.log('🧠 Gerando resposta contextual...');

            // Preparar contexto para OpenAI
            const contextForAI = {
                company: context.company,
                client: context.client,
                recentConversations: context.recentConversations,
                clientSummary: context.clientSummary
            };

            // Gerar resposta usando OpenAI
            const aiResponse = await this.openai.generateContextualResponse(
                message.content,
                contextForAI
            );

            // Adicionar metadados da resposta
            const response = {
                content: aiResponse,
                type: 'ai_generated',
                confidence: analysis.confidence || 0.8,
                category: analysis.category,
                timestamp: Timestamp.now(),
                metadata: {
                    model: 'gpt-4o-mini',
                    processingTime: Date.now(),
                    contextUsed: {
                        recentConversations: context.recentConversations.length,
                        historicalSummaries: context.historicalSummaries.length,
                        clientProfile: !!context.client.profile
                    }
                }
            };

            console.log(`✅ Resposta gerada com confiança: ${response.confidence}`);
            return response;

        } catch (error) {
            console.error('❌ Erro ao gerar resposta:', error);
            throw error;
        }
    }

    /**
     * 🤔 DECIDIR SE DEVE RESPONDER AUTOMATICAMENTE
     */
    shouldRespondAutomatically(analysis, context) {
        // Verificar se empresa tem resposta automática ativada
        if (!context.company.plan?.features?.includes('ai_responses')) {
            console.log('⚠️ Empresa não tem resposta automática no plano');
            return false;
        }

        // Verificar confiança da análise
        if (analysis.confidence < this.config.confidenceThreshold) {
            console.log(`⚠️ Confiança baixa: ${analysis.confidence}`);
            return false;
        }

        // Verificar se requer atendimento humano
        if (analysis.requires_human) {
            console.log('⚠️ Análise indica necessidade de atendimento humano');
            return false;
        }

        // Verificar urgência crítica
        if (analysis.urgency === 'urgent') {
            console.log('⚠️ Urgência crítica - escalar para humano');
            return false;
        }

        // Verificar status da empresa
        if (!context.company.activePlan) {
            console.log('⚠️ Empresa com plano inativo');
            return false;
        }

        console.log('✅ Autorizado para resposta automática');
        return true;
    }

    /**
     * 💾 SALVAR INTERAÇÃO COMPLETA
     */
    async saveInteraction(companyId, clientId, message, response, analysis) {
        try {
            console.log('💾 Salvando interação...');

            // Salvar mensagem do cliente
            const clientMessageData = {
                content: message.content,
                source: message.source || 'unknown',
                type: 'client_message',
                timestamp: message.timestamp || Timestamp.now(),
                metadata: {
                    analysis,
                    originalMessageId: message.id
                }
            };

            await conversationsService.addConversation(companyId, clientId, clientMessageData);

            // Salvar resposta da IA (se houver)
            if (response) {
                const aiResponseData = {
                    content: response.content,
                    source: 'ai_agent',
                    type: 'ai_response',
                    timestamp: Timestamp.now(),
                    metadata: {
                        ...response.metadata,
                        relatedToMessage: message.id,
                        confidence: response.confidence
                    }
                };

                await conversationsService.addConversation(companyId, clientId, aiResponseData);
            }

            // Atualizar estatísticas do cliente
            await this.updateClientStats(companyId, clientId, analysis);

            console.log('✅ Interação salva com sucesso');

        } catch (error) {
            console.error('❌ Erro ao salvar interação:', error);
            throw error;
        }
    }

    /**
     * 📊 ATUALIZAR ESTATÍSTICAS DO CLIENTE
     */
    async updateClientStats(companyId, clientId, analysis) {
        try {
            const updateData = {
                'stats.lastInteraction': Timestamp.now(),
                'stats.totalConversations': require('firebase-admin').firestore.FieldValue.increment(1),
                updatedAt: Timestamp.now()
            };

            // Adicionar tags baseadas na análise
            if (analysis.topics && analysis.topics.length > 0) {
                updateData.tags = require('firebase-admin').firestore.FieldValue.arrayUnion(...analysis.topics);
            }

            await this.clientsService.updateClient(companyId, clientId, updateData);

        } catch (error) {
            console.error('❌ Erro ao atualizar stats do cliente:', error);
        }
    }

    /**
     * ❌ LIDAR COM FALHA DE ROTEAMENTO
     */
    async handleRoutingFailure(routingResult, message) {
        console.log('❌ Falha no roteamento:', routingResult.reason);

        return {
            success: false,
            reason: 'routing_failed',
            details: routingResult.reason,
            suggestedAction: 'manual_review',
            originalMessage: message
        };
    }

    /**
     * 🔧 CONFIGURAR AGENTE
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 Configuração atualizada:', this.config);
    }

    /**
     * 📊 OBTER ESTATÍSTICAS DO AGENTE
     */
    async getStats(companyId = null, timeRange = '24h') {
        try {
            const stats = await this.learning.getAgentStats(companyId, timeRange);
            return {
                success: true,
                stats,
                config: this.config
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧪 MODO DE TESTE
     */
    async testMode(testMessage, companyId, clientId) {
        console.log('\n🧪 MODO DE TESTE ATIVADO');
        
        const originalConfig = { ...this.config };
        
        // Configuração para teste (sem salvar dados)
        this.config.autoResponse = true;
        this.config.learningEnabled = false;

        try {
            const testInput = {
                content: testMessage,
                source: 'test',
                timestamp: Timestamp.now()
            };

            const result = await this.processMessage(testInput);
            
            console.log('🧪 Resultado do teste:', result);
            return result;

        } finally {
            // Restaurar configuração original
            this.config = originalConfig;
            console.log('🧪 Modo de teste finalizado');
        }
    }

    /**
     * 🏥 HEALTH CHECK
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {}
        };

        try {
            // Testar OpenAI
            health.services.openai = await this.openai.validateService() ? 'ok' : 'error';
            
            // Testar router
            health.services.router = this.router ? 'ok' : 'error';
            
            // Testar learning engine
            health.services.learning = this.learning ? 'ok' : 'error';

            // Status geral
            const hasErrors = Object.values(health.services).includes('error');
            health.status = hasErrors ? 'degraded' : 'healthy';

            return health;

        } catch (error) {
            health.status = 'error';
            health.error = error.message;
            return health;
        }
    }
}

module.exports = AgentePrincipal;
