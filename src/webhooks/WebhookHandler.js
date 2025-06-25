/**
 * 🎣 WEBHOOK HANDLER - SISTEMA DE WEBHOOKS
 * 
 * Recebe mensagens de diferentes plataformas e encaminha para o Agente Principal
 * Suporta: WhatsApp, Instagram, Websites, APIs customizadas
 */

const AgentePrincipal = require('../agents/AgentePrincipal');
const express = require('express');
const crypto = require('crypto');
const { Timestamp } = require('firebase-admin/firestore');

class WebhookHandler {
    constructor(port = 3000) {
        this.app = express();
        this.port = port;
        this.agent = new AgentePrincipal();
        
        // Configurar middleware
        this.setupMiddleware();
        
        // Configurar rotas
        this.setupRoutes();
        
        console.log('🎣 Webhook Handler inicializado');
    }

    /**
     * ⚙️ CONFIGURAR MIDDLEWARE
     */
    setupMiddleware() {
        // Parser JSON
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            next();
        });

        // Logging
        this.app.use((req, res, next) => {
            console.log(`📥 ${req.method} ${req.path} - ${req.ip}`);
            next();
        });

        // Tratamento de erros
        this.app.use((error, req, res, next) => {
            console.error('❌ Webhook Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * 🛣️ CONFIGURAR ROTAS
     */
    setupRoutes() {
        // Health check
        this.app.get('/health', this.handleHealthCheck.bind(this));

        // WhatsApp webhook
        this.app.post('/webhook/whatsapp', this.handleWhatsAppWebhook.bind(this));
        this.app.get('/webhook/whatsapp', this.handleWhatsAppVerification.bind(this));

        // Instagram webhook
        this.app.post('/webhook/instagram', this.handleInstagramWebhook.bind(this));
        this.app.get('/webhook/instagram', this.handleInstagramVerification.bind(this));

        // Website chat
        this.app.post('/webhook/website', this.handleWebsiteWebhook.bind(this));

        // API genérica
        this.app.post('/api/message', this.handleGenericMessage.bind(this));

        // Status do agente
        this.app.get('/agent/status', this.handleAgentStatus.bind(this));

        // Estatísticas
        this.app.get('/agent/stats/:companyId', this.handleAgentStats.bind(this));
        this.app.get('/agent/stats', this.handleAgentStats.bind(this));

        // Rota catch-all
        this.app.all('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                availableEndpoints: [
                    '/health',
                    '/webhook/whatsapp',
                    '/webhook/instagram', 
                    '/webhook/website',
                    '/api/message',
                    '/agent/status',
                    '/agent/stats'
                ]
            });
        });
    }

    /**
     * 🏥 HEALTH CHECK
     */
    async handleHealthCheck(req, res) {
        try {
            const agentHealth = await this.agent.healthCheck();
            
            res.json({
                success: true,
                webhook: 'healthy',
                agent: agentHealth,
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 📱 WEBHOOK WHATSAPP
     */
    async handleWhatsAppWebhook(req, res) {
        try {
            console.log('📱 WhatsApp webhook recebido');
            
            const { entry } = req.body;
            
            if (!entry || !Array.isArray(entry)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid WhatsApp webhook format'
                });
            }

            const responses = [];

            for (const entryItem of entry) {
                const changes = entryItem.changes || [];
                
                for (const change of changes) {
                    if (change.field === 'messages') {
                        const messages = change.value.messages || [];
                        
                        for (const message of messages) {
                            const processedMessage = await this.processWhatsAppMessage(message, change.value);
                            responses.push(processedMessage);
                        }
                    }
                }
            }

            res.json({
                success: true,
                processed: responses.length,
                responses
            });

        } catch (error) {
            console.error('❌ Erro WhatsApp webhook:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 📱 PROCESSAR MENSAGEM WHATSAPP
     */
    async processWhatsAppMessage(message, value) {
        try {
            const processedMessage = {
                content: this.extractWhatsAppContent(message),
                source: 'whatsapp',
                from: message.from,
                to: value.metadata?.phone_number_id,
                timestamp: Timestamp.fromMillis(parseInt(message.timestamp) * 1000),
                messageId: message.id,
                messageType: message.type
            };

            const result = await this.agent.processMessage(processedMessage);
            
            // Se resposta automática gerada, enviar via WhatsApp API
            if (result.success && result.response && result.autoResponded) {
                await this.sendWhatsAppResponse(message.from, result.response.content);
            }

            return {
                messageId: message.id,
                processed: result.success,
                autoResponded: result.autoResponded,
                error: result.error
            };

        } catch (error) {
            console.error('❌ Erro ao processar mensagem WhatsApp:', error);
            return {
                messageId: message.id,
                processed: false,
                error: error.message
            };
        }
    }

    /**
     * 📱 EXTRAIR CONTEÚDO WHATSAPP
     */
    extractWhatsAppContent(message) {
        switch (message.type) {
            case 'text':
                return message.text?.body || '';
            
            case 'image':
                return `[Imagem] ${message.image?.caption || 'Imagem enviada'}`;
            
            case 'audio':
                return '[Áudio] Mensagem de voz enviada';
            
            case 'document':
                return `[Documento] ${message.document?.filename || 'Documento enviado'}`;
            
            case 'location':
                return '[Localização] Localização compartilhada';
            
            default:
                return `[${message.type}] Mensagem não suportada`;
        }
    }

    /**
     * 📱 VERIFICAÇÃO WHATSAPP
     */
    handleWhatsAppVerification(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Verificar token (configure seu token de verificação)
        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'verify_token_123';

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WhatsApp webhook verificado');
            res.status(200).send(challenge);
        } else {
            console.log('❌ WhatsApp webhook verificação falhou');
            res.status(403).send('Verification failed');
        }
    }

    /**
     * 📸 WEBHOOK INSTAGRAM
     */
    async handleInstagramWebhook(req, res) {
        try {
            console.log('📸 Instagram webhook recebido');
            
            const { object, entry } = req.body;

            if (object !== 'instagram') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid Instagram webhook object'
                });
            }

            const responses = [];

            for (const entryItem of entry) {
                const messaging = entryItem.messaging || [];
                
                for (const message of messaging) {
                    const processedMessage = await this.processInstagramMessage(message);
                    responses.push(processedMessage);
                }
            }

            res.json({
                success: true,
                processed: responses.length,
                responses
            });

        } catch (error) {
            console.error('❌ Erro Instagram webhook:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 📸 PROCESSAR MENSAGEM INSTAGRAM
     */
    async processInstagramMessage(messaging) {
        try {
            const message = messaging.message;
            
            if (!message) {
                return { processed: false, reason: 'No message content' };
            }

            const processedMessage = {
                content: message.text || '[Mídia] Conteúdo não textual',
                source: 'instagram',
                from: messaging.sender.id,
                instagramUser: messaging.sender.username,
                timestamp: Timestamp.fromMillis(messaging.timestamp),
                messageId: message.mid
            };

            const result = await this.agent.processMessage(processedMessage);

            return {
                messageId: message.mid,
                processed: result.success,
                autoResponded: result.autoResponded,
                error: result.error
            };

        } catch (error) {
            console.error('❌ Erro ao processar mensagem Instagram:', error);
            return {
                processed: false,
                error: error.message
            };
        }
    }

    /**
     * 📸 VERIFICAÇÃO INSTAGRAM
     */
    handleInstagramVerification(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'verify_token_456';

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Instagram webhook verificado');
            res.status(200).send(challenge);
        } else {
            console.log('❌ Instagram webhook verificação falhou');
            res.status(403).send('Verification failed');
        }
    }

    /**
     * 🌐 WEBHOOK WEBSITE
     */
    async handleWebsiteWebhook(req, res) {
        try {
            console.log('🌐 Website webhook recebido');
            
            const { message, domain, customerName, email, sessionId } = req.body;

            if (!message || !domain) {
                return res.status(400).json({
                    success: false,
                    error: 'Message and domain are required'
                });
            }

            const processedMessage = {
                content: message,
                source: 'website',
                domain: domain,
                customerName: customerName,
                email: email,
                sessionId: sessionId,
                timestamp: Timestamp.now()
            };

            const result = await this.agent.processMessage(processedMessage);

            res.json({
                success: result.success,
                response: result.response?.content,
                autoResponded: result.autoResponded,
                conversationId: result.conversationId,
                error: result.error
            });

        } catch (error) {
            console.error('❌ Erro website webhook:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 🔌 MENSAGEM GENÉRICA (API)
     */
    async handleGenericMessage(req, res) {
        try {
            const { message, companyId, clientId, source = 'api' } = req.body;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: 'Message is required'
                });
            }

            const processedMessage = {
                content: message,
                source: source,
                companyId: companyId, // Se fornecido, pula roteamento
                clientId: clientId,   // Se fornecido, pula identificação
                timestamp: Timestamp.now()
            };

            const result = await this.agent.processMessage(processedMessage);

            res.json({
                success: result.success,
                response: result.response?.content,
                analysis: result.analysis,
                autoResponded: result.autoResponded,
                processingTime: result.processingTime,
                error: result.error
            });

        } catch (error) {
            console.error('❌ Erro API genérica:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 📊 STATUS DO AGENTE
     */
    async handleAgentStatus(req, res) {
        try {
            const status = await this.agent.healthCheck();
            res.json(status);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 📈 ESTATÍSTICAS DO AGENTE
     */
    async handleAgentStats(req, res) {
        try {
            const { companyId } = req.params;
            const { timeRange = '24h' } = req.query;

            const stats = await this.agent.getStats(companyId, timeRange);
            res.json(stats);

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 📱 ENVIAR RESPOSTA WHATSAPP
     */
    async sendWhatsAppResponse(to, message) {
        try {
            // Implementar envio via WhatsApp Business API
            console.log(`📱 Enviando resposta WhatsApp para ${to}: "${message}"`);
            
            // Aqui você faria a chamada real para a API do WhatsApp
            // const response = await whatsappAPI.sendMessage(to, message);
            
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao enviar WhatsApp:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🚀 INICIAR SERVIDOR
     */
    start() {
        this.app.listen(this.port, () => {
            console.log(`🎣 Webhook Handler rodando na porta ${this.port}`);
            console.log(`🌐 Endpoints disponíveis:`);
            console.log(`   - Health: http://localhost:${this.port}/health`);
            console.log(`   - WhatsApp: http://localhost:${this.port}/webhook/whatsapp`);
            console.log(`   - Instagram: http://localhost:${this.port}/webhook/instagram`);
            console.log(`   - Website: http://localhost:${this.port}/webhook/website`);
            console.log(`   - API: http://localhost:${this.port}/api/message`);
        });
    }

    /**
     * 🛑 PARAR SERVIDOR
     */
    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 Webhook Handler parado');
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const port = process.env.PORT || 3000;
    const webhookHandler = new WebhookHandler(port);
    webhookHandler.start();
}

module.exports = WebhookHandler;
