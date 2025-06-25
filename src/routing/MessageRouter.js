/**
 * 🎯 MESSAGE ROUTER - SISTEMA DE ROTEAMENTO
 * 
 * Identifica automaticamente empresa e cliente baseado na mensagem recebida
 * Suporta múltiplos canais: WhatsApp, Instagram, Website
 */

const CompaniesService = require('../firebase/firestore/companies');
const ClientsService = require('../firebase/firestore/clients');

class MessageRouter {
    constructor() {
        this.companies = new CompaniesService();
        this.clients = new ClientsService();
        
        // Cache para otimizar consultas frequentes
        this.cache = {
            companies: new Map(),
            clients: new Map(),
            lastClean: Date.now()
        };

        console.log('🎯 Message Router inicializado');
    }

    /**
     * 🎯 ROTEAR MENSAGEM PRINCIPAL
     * Identifica empresa e cliente automaticamente
     */
    async routeMessage(message) {
        try {
            console.log(`🎯 Roteando mensagem de ${message.source}...`);

            // 1. Identificar empresa
            const companyResult = await this.identifyCompany(message);
            if (!companyResult.success) {
                return companyResult;
            }

            const companyId = companyResult.companyId;

            // 2. Identificar ou criar cliente
            const clientResult = await this.identifyOrCreateClient(companyId, message);
            if (!clientResult.success) {
                return clientResult;
            }

            const { clientId, isNewClient } = clientResult;

            console.log(`✅ Roteamento: ${companyId} → ${clientId} ${isNewClient ? '(novo)' : ''}`);

            return {
                success: true,
                companyId,
                clientId,
                isNewClient,
                confidence: 0.95
            };

        } catch (error) {
            console.error('❌ Erro no roteamento:', error);
            return {
                success: false,
                reason: 'routing_error',
                error: error.message
            };
        }
    }

    /**
     * 🏢 IDENTIFICAR EMPRESA
     */
    async identifyCompany(message) {
        try {
            // Estratégias diferentes baseadas na fonte
            switch (message.source) {
                case 'whatsapp':
                    return await this.identifyCompanyByWhatsApp(message);
                
                case 'instagram':
                    return await this.identifyCompanyByInstagram(message);
                
                case 'website':
                    return await this.identifyCompanyByDomain(message);
                
                case 'webhook':
                    return await this.identifyCompanyByWebhook(message);
                
                default:
                    return {
                        success: false,
                        reason: 'unknown_source',
                        details: `Fonte não suportada: ${message.source}`
                    };
            }

        } catch (error) {
            return {
                success: false,
                reason: 'company_identification_error',
                error: error.message
            };
        }
    }

    /**
     * 📱 IDENTIFICAR EMPRESA POR WHATSAPP
     */
    async identifyCompanyByWhatsApp(message) {
        try {
            const targetNumber = message.to || message.businessNumber;
            
            if (!targetNumber) {
                return {
                    success: false,
                    reason: 'missing_whatsapp_number'
                };
            }

            // Buscar empresa por número do WhatsApp
            const companies = await this.companies.listCompanies();
            const company = companies.find(comp => 
                comp.whatsappId === targetNumber || 
                comp.whatsapp === targetNumber
            );

            if (!company) {
                return {
                    success: false,
                    reason: 'company_not_found_by_whatsapp',
                    details: `Número ${targetNumber} não encontrado`
                };
            }

            return {
                success: true,
                companyId: company.companyId || company.id,
                method: 'whatsapp_number'
            };

        } catch (error) {
            throw new Error(`Erro identificação WhatsApp: ${error.message}`);
        }
    }

    /**
     * 📸 IDENTIFICAR EMPRESA POR INSTAGRAM
     */
    async identifyCompanyByInstagram(message) {
        try {
            const instagramHandle = message.instagramAccount || message.to;
            
            if (!instagramHandle) {
                return {
                    success: false,
                    reason: 'missing_instagram_handle'
                };
            }

            const companies = await this.companies.listCompanies();
            const company = companies.find(comp => 
                comp.instagram === instagramHandle ||
                comp.instagram === `@${instagramHandle.replace('@', '')}`
            );

            if (!company) {
                return {
                    success: false,
                    reason: 'company_not_found_by_instagram',
                    details: `Instagram ${instagramHandle} não encontrado`
                };
            }

            return {
                success: true,
                companyId: company.companyId || company.id,
                method: 'instagram_handle'
            };

        } catch (error) {
            throw new Error(`Erro identificação Instagram: ${error.message}`);
        }
    }

    /**
     * 🌐 IDENTIFICAR EMPRESA POR DOMÍNIO
     */
    async identifyCompanyByDomain(message) {
        try {
            const domain = message.domain || message.website || this.extractDomainFromMessage(message);
            
            if (!domain) {
                return {
                    success: false,
                    reason: 'missing_domain'
                };
            }

            const companies = await this.companies.listCompanies();
            const company = companies.find(comp => 
                comp.domain === domain ||
                comp.website === domain ||
                comp.domain === domain.replace('www.', '')
            );

            if (!company) {
                return {
                    success: false,
                    reason: 'company_not_found_by_domain',
                    details: `Domínio ${domain} não encontrado`
                };
            }

            return {
                success: true,
                companyId: company.companyId || company.id,
                method: 'domain'
            };

        } catch (error) {
            throw new Error(`Erro identificação domínio: ${error.message}`);
        }
    }

    /**
     * 🔗 IDENTIFICAR EMPRESA POR WEBHOOK
     */
    async identifyCompanyByWebhook(message) {
        try {
            // Webhook pode ter companyId direto
            if (message.companyId) {
                return {
                    success: true,
                    companyId: message.companyId,
                    method: 'webhook_direct'
                };
            }

            // Ou pode ter API key para identificar
            if (message.apiKey) {
                const companies = await this.companies.listCompanies();
                const company = companies.find(comp => comp.apiKey === message.apiKey);
                
                if (company) {
                    return {
                        success: true,
                        companyId: company.companyId || company.id,
                        method: 'webhook_apikey'
                    };
                }
            }

            return {
                success: false,
                reason: 'webhook_identification_failed'
            };

        } catch (error) {
            throw new Error(`Erro identificação webhook: ${error.message}`);
        }
    }

    /**
     * 👤 IDENTIFICAR OU CRIAR CLIENTE
     */
    async identifyOrCreateClient(companyId, message) {
        try {
            // 1. Tentar identificar cliente existente
            const existingClient = await this.findExistingClient(companyId, message);
            
            if (existingClient) {
                return {
                    success: true,
                    clientId: existingClient.clientId || existingClient.id,
                    isNewClient: false
                };
            }

            // 2. Criar novo cliente
            const newClient = await this.createNewClient(companyId, message);
            
            return {
                success: true,
                clientId: newClient.clientId || newClient.id,
                isNewClient: true
            };

        } catch (error) {
            return {
                success: false,
                reason: 'client_identification_error',
                error: error.message
            };
        }
    }

    /**
     * 🔍 BUSCAR CLIENTE EXISTENTE
     */
    async findExistingClient(companyId, message) {
        try {
            const clients = await this.clients.listClients(companyId);
            
            // Buscar por diferentes critérios baseados na fonte
            const searchCriteria = this.getClientSearchCriteria(message);
            
            for (const criteria of searchCriteria) {
                const client = clients.find(criteria.finder);
                if (client) {
                    console.log(`👤 Cliente encontrado por ${criteria.method}`);
                    return client;
                }
            }

            return null;

        } catch (error) {
            console.error('❌ Erro ao buscar cliente:', error);
            return null;
        }
    }

    /**
     * 🔍 CRITÉRIOS DE BUSCA DO CLIENTE
     */
    getClientSearchCriteria(message) {
        const criteria = [];

        // Por número do WhatsApp
        if (message.from || message.phone) {
            const phone = message.from || message.phone;
            criteria.push({
                method: 'whatsapp',
                finder: (client) => 
                    client.contact?.whatsapp === phone ||
                    client.whatsapp === phone ||
                    client.phone === phone
            });
        }

        // Por email
        if (message.email) {
            criteria.push({
                method: 'email',
                finder: (client) => 
                    client.contact?.email === message.email ||
                    client.email === message.email
            });
        }

        // Por Instagram
        if (message.instagramUser) {
            criteria.push({
                method: 'instagram',
                finder: (client) => 
                    client.contact?.instagram === message.instagramUser ||
                    client.instagram === message.instagramUser
            });
        }

        // Por nome (fuzzy match)
        if (message.customerName || message.name) {
            const name = message.customerName || message.name;
            criteria.push({
                method: 'name',
                finder: (client) => 
                    client.name?.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(client.name?.toLowerCase())
            });
        }

        return criteria;
    }

    /**
     * ➕ CRIAR NOVO CLIENTE
     */
    async createNewClient(companyId, message) {
        try {
            const clientData = this.extractClientDataFromMessage(message);
            
            console.log(`➕ Criando novo cliente: ${clientData.name}`);
            
            const newClient = await this.clients.createClient(companyId, clientData);
            return newClient;

        } catch (error) {
            throw new Error(`Erro ao criar cliente: ${error.message}`);
        }
    }

    /**
     * 📤 EXTRAIR DADOS DO CLIENTE DA MENSAGEM
     */
    extractClientDataFromMessage(message) {
        const clientData = {
            name: this.extractClientName(message),
            contact: {},
            tags: ['novo', 'auto_created'],
            summary: 'Cliente criado automaticamente via agente IA',
            createdBy: 'ai_agent',
            source: message.source
        };

        // Adicionar contatos conforme disponível
        if (message.from || message.phone) {
            clientData.contact.whatsapp = message.from || message.phone;
        }

        if (message.email) {
            clientData.contact.email = message.email;
        }

        if (message.instagramUser) {
            clientData.contact.instagram = message.instagramUser;
        }

        return clientData;
    }

    /**
     * 📝 EXTRAIR NOME DO CLIENTE
     */
    extractClientName(message) {
        // Se nome explícito disponível
        if (message.customerName || message.name) {
            return message.customerName || message.name;
        }

        // Se só tem número/handle, criar nome genérico
        if (message.from) {
            return `Cliente ${message.from.substring(-4)}`;
        }

        if (message.instagramUser) {
            return `@${message.instagramUser}`;
        }

        if (message.email) {
            return message.email.split('@')[0];
        }

        return 'Cliente Anônimo';
    }

    /**
     * 🌐 EXTRAIR DOMÍNIO DA MENSAGEM
     */
    extractDomainFromMessage(message) {
        // Tentar extrair domínio de URLs na mensagem
        const urlRegex = /https?:\/\/([\w\.-]+)/g;
        const matches = message.content?.match(urlRegex);
        
        if (matches && matches.length > 0) {
            return matches[0].replace(/https?:\/\//, '').replace('www.', '');
        }

        return null;
    }

    /**
     * 🧹 LIMPAR CACHE
     */
    cleanCache() {
        const now = Date.now();
        const cacheAge = now - this.cache.lastClean;
        
        // Limpar cache a cada 30 minutos
        if (cacheAge > 30 * 60 * 1000) {
            this.cache.companies.clear();
            this.cache.clients.clear();
            this.cache.lastClean = now;
            console.log('🧹 Cache limpo');
        }
    }

    /**
     * 📊 ESTATÍSTICAS DE ROTEAMENTO
     */
    getRoutingStats() {
        return {
            cacheSize: {
                companies: this.cache.companies.size,
                clients: this.cache.clients.size
            },
            lastCacheClean: new Date(this.cache.lastClean).toISOString()
        };
    }
}

module.exports = MessageRouter;
