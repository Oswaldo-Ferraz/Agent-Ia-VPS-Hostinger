const OpenAI = require('openai');
require('dotenv').config();

/**
 * 🤖 OPENAI SERVICE
 * Serviço completo para integração com OpenAI GPT
 * Focado em resumos automáticos e análise de conversas
 */

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Configurações padrão
    this.defaultModel = 'gpt-4o-mini'; // Modelo mais econômico e eficiente
    this.maxTokens = 2000;
    this.temperature = 0.7;
    
    console.log('🤖 OpenAI Service initialized');
  }

  /**
   * Gerar resumo de conversas antigas
   * @param {Array} conversations - Array de conversas para resumir
   * @param {object} clientInfo - Informações do cliente
   * @param {object} companyInfo - Informações da empresa
   * @returns {Promise<string>} - Resumo gerado
   */
  async generateConversationSummary(conversations, clientInfo, companyInfo) {
    try {
      if (!conversations || conversations.length === 0) {
        return 'Nenhuma conversa para resumir.';
      }

      // Preparar contexto das conversas
      const conversationText = this.formatConversationsForSummary(conversations);
      
      const prompt = `
CONTEXTO DA EMPRESA:
Nome: ${companyInfo.name}
Tipo: ${companyInfo.domain}

CLIENTE:
Nome: ${clientInfo.name}
Contato: ${clientInfo.contact?.whatsapp || clientInfo.contact?.email || 'N/A'}

INSTRUÇÕES:
Você é um assistente especializado em resumir conversas de atendimento ao cliente.
Analise as conversas abaixo e crie um resumo estruturado e útil.

CONVERSAS PARA RESUMIR:
${conversationText}

FORMATO DO RESUMO:
Crie um resumo seguindo esta estrutura:

**RESUMO DO CLIENTE:**
- Nome: [nome do cliente]
- Período: [período das conversas]
- Total de interações: [número]

**PRINCIPAIS TÓPICOS:**
- [tópico 1]: [breve descrição]
- [tópico 2]: [breve descrição]
- [tópico 3]: [breve descrição]

**PREFERÊNCIAS IDENTIFICADAS:**
- [preferência 1]
- [preferência 2]
- [preferência 3]

**PADRÃO DE COMPORTAMENTO:**
[descrição do comportamento do cliente baseado nas conversas]

**HISTÓRICO DE QUESTÕES:**
- [questão resolvida 1]
- [questão resolvida 2]
- [questão pendente se houver]

**RECOMENDAÇÕES PARA PRÓXIMAS INTERAÇÕES:**
- [recomendação 1]
- [recomendação 2]

Seja conciso mas informativo. Foque em informações úteis para futuras interações.
`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em resumir conversas de atendimento ao cliente, extraindo insights valiosos para melhorar o relacionamento.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const summary = response.choices[0].message.content;
      
      console.log(`✅ Summary generated for client ${clientInfo.name}: ${summary.length} characters`);
      return summary;

    } catch (error) {
      console.error('❌ Error generating conversation summary:', error);
      throw error;
    }
  }

  /**
   * Gerar resumo de perfil do cliente baseado em histórico
   * @param {object} clientData - Dados completos do cliente
   * @param {Array} recentSummaries - Resumos recentes
   * @param {object} companyInfo - Informações da empresa
   * @returns {Promise<object>} - Perfil resumido
   */
  async generateClientProfile(clientData, recentSummaries = [], companyInfo) {
    try {
      const summariesText = recentSummaries.join('\n\n');
      
      const prompt = `
CONTEXTO DA EMPRESA:
Nome: ${companyInfo.name}
Setor: ${companyInfo.domain}

DADOS DO CLIENTE:
Nome: ${clientData.name}
Contato: ${JSON.stringify(clientData.contact, null, 2)}
Tags atuais: ${clientData.tags?.join(', ') || 'Nenhuma'}
Resumo atual: ${clientData.summary || 'Não disponível'}

HISTÓRICO DE RESUMOS:
${summariesText || 'Nenhum resumo disponível'}

INSTRUÇÕES:
Analise todos os dados disponíveis e crie um perfil atualizado do cliente.
Identifique padrões, preferências e características importantes.

FORMATO DA RESPOSTA (JSON):
{
  "profile": {
    "personalityType": "string (amigável/formal/direto/etc)",
    "preferences": ["pref1", "pref2", "pref3"],
    "behaviorPattern": "string (descrição do comportamento)",
    "communicationStyle": "string (como prefere se comunicar)",
    "frequency": "string (frequência de contato)",
    "topics": ["tópico1", "tópico2", "tópico3"]
  },
  "summary": "string (resumo atualizado em português)",
  "tags": ["tag1", "tag2", "tag3"],
  "insights": [
    "insight útil 1",
    "insight útil 2"
  ],
  "recommendations": [
    "recomendação para próximas interações"
  ]
}

Responda APENAS com o JSON válido, sem texto adicional.
`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de perfil de clientes. Sempre responda com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3 // Menos criativo para estrutura consistente
      });

      const profileText = response.choices[0].message.content;
      const profile = JSON.parse(profileText);
      
      console.log(`✅ Client profile generated for ${clientData.name}`);
      return profile;

    } catch (error) {
      console.error('❌ Error generating client profile:', error);
      
      // Fallback em caso de erro
      return {
        profile: {
          personalityType: 'análise_pendente',
          preferences: [],
          behaviorPattern: 'Dados insuficientes para análise',
          communicationStyle: 'A definir',
          frequency: 'Irregular',
          topics: []
        },
        summary: clientData.summary || 'Cliente sem histórico suficiente para análise detalhada.',
        tags: clientData.tags || [],
        insights: ['Necessário mais interações para análise precisa'],
        recommendations: ['Coletar mais informações nas próximas conversas']
      };
    }
  }

  /**
   * Categorizar mensagem automaticamente
   * @param {string} messageContent - Conteúdo da mensagem
   * @param {object} context - Contexto adicional
   * @returns {Promise<object>} - Categorização
   */
  async categorizeMessage(messageContent, context = {}) {
    try {
      const prompt = `
EMPRESA: ${context.companyName || 'N/A'}
CLIENTE: ${context.clientName || 'N/A'}

MENSAGEM PARA CATEGORIZAR:
"${messageContent}"

INSTRUÇÕES:
Analise a mensagem e categorize conforme as opções abaixo.

CATEGORIAS DISPONÍVEIS:
- vendas: interesse em produtos/serviços
- suporte: problemas técnicos ou dúvidas
- entrega: questões de envio/recebimento
- pagamento: questões financeiras/cobrança
- feedback: elogios/reclamações/sugestões
- informacoes: pedidos de informação geral
- agendamento: marcação de horários/consultas
- cancelamento: cancelamentos de produtos/serviços
- geral: não se encaixa nas outras categorias

PRIORIDADES:
- low: informações gerais, elogios
- normal: vendas, agendamentos, dúvidas simples
- high: problemas, reclamações, cancelamentos
- urgent: emergências, problemas críticos

FORMATO DA RESPOSTA (JSON):
{
  "category": "categoria_escolhida",
  "priority": "prioridade_escolhida", 
  "confidence": 0.95,
  "tags": ["tag1", "tag2"],
  "sentiment": "positive|negative|neutral",
  "summary": "breve resumo da mensagem"
}

Responda APENAS com JSON válido.
`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em categorização de mensagens de atendimento. Sempre responda com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1 // Muito baixo para consistência
      });

      const categorizationText = response.choices[0].message.content;
      const categorization = JSON.parse(categorizationText);
      
      console.log(`✅ Message categorized: ${categorization.category} (${categorization.priority})`);
      return categorization;

    } catch (error) {
      console.error('❌ Error categorizing message:', error);
      
      // Fallback simples
      return {
        category: 'geral',
        priority: 'normal',
        confidence: 0.1,
        tags: ['automatico'],
        sentiment: 'neutral',
        summary: 'Categorização automática falhou'
      };
    }
  }

  /**
   * Gerar resposta contextual para o cliente
   * @param {string} message - Mensagem do cliente
   * @param {object} context - Contexto completo
   * @returns {Promise<string>} - Resposta sugerida
   */
  async generateContextualResponse(message, context) {
    try {
      const {
        company,
        client,
        recentConversations = [],
        clientSummary = ''
      } = context;

      // Formatar conversas recentes
      const recentHistory = recentConversations.slice(0, 10).map(conv => 
        `[${conv.role}]: ${conv.content}`
      ).join('\n');

      const prompt = `
CONTEXTO DA EMPRESA:
Nome: ${company.name}
Prompt customizado: ${company.customPrompt || 'Seja sempre educado e prestativo'}

INFORMAÇÕES DO CLIENTE:
Nome: ${client.name}
Resumo do perfil: ${clientSummary}
Tags: ${client.tags?.join(', ') || 'Nenhuma'}

HISTÓRICO RECENTE (últimas mensagens):
${recentHistory}

NOVA MENSAGEM DO CLIENTE:
"${message}"

INSTRUÇÕES:
1. Responda como se fosse um atendente da ${company.name}
2. Use as informações do cliente para personalizar a resposta
3. Mantenha consistência com o histórico recente
4. Seja natural, prestativo e profissional
5. Se necessário, faça perguntas de esclarecimento
6. NÃO mencione que você é uma IA

RESPOSTA:
`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `Você é um atendente experiente da empresa ${company.name}. Sempre mantenha o tom profissional mas amigável, e use o contexto do cliente para personalizar suas respostas.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const suggestedResponse = response.choices[0].message.content;
      
      console.log(`✅ Contextual response generated for ${client.name}`);
      return suggestedResponse.trim();

    } catch (error) {
      console.error('❌ Error generating contextual response:', error);
      throw error;
    }
  }

  /**
   * Busca semântica simples em resumos
   * @param {string} query - Consulta de busca
   * @param {Array} summaries - Array de resumos para buscar
   * @returns {Promise<Array>} - Resumos relevantes ordenados por relevância
   */
  async semanticSearch(query, summaries) {
    try {
      if (!summaries || summaries.length === 0) {
        return [];
      }

      const prompt = `
CONSULTA DE BUSCA: "${query}"

RESUMOS DISPONÍVEIS:
${summaries.map((summary, index) => `${index}: ${summary.text || summary}`).join('\n\n')}

INSTRUÇÕES:
Analise quais resumos são mais relevantes para a consulta.
Retorne os IDs dos resumos ordenados por relevância (mais relevante primeiro).

FORMATO DA RESPOSTA (JSON):
{
  "relevant_ids": [2, 5, 1],
  "explanation": "breve explicação do critério usado"
}

Se nenhum resumo for relevante, retorne array vazio.
Responda APENAS com JSON válido.
`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em busca semântica. Sempre responda com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      const searchResult = JSON.parse(response.choices[0].message.content);
      const relevantSummaries = searchResult.relevant_ids.map(id => summaries[id]).filter(Boolean);
      
      console.log(`✅ Semantic search completed: ${relevantSummaries.length} relevant results`);
      return relevantSummaries;

    } catch (error) {
      console.error('❌ Error in semantic search:', error);
      return [];
    }
  }

  /**
   * Helper: Formatar conversas para resumo
   * @private
   */
  formatConversationsForSummary(conversations) {
    return conversations.map((conv, index) => {
      const date = conv.timestamp ? new Date(conv.timestamp.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não disponível';
      const content = conv.content || conv.text || 'Conteúdo não disponível';
      const role = conv.role || 'user';
      
      return `${index + 1}. [${date}] [${role.toUpperCase()}]: ${content}`;
    }).join('\n');
  }

  /**
   * Validar configuração do serviço
   * @returns {Promise<boolean>} - Status da validação
   */
  async validateService() {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: 'Responda apenas "OK" se você está funcionando corretamente.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      });

      const isValid = response.choices[0].message.content.trim().toLowerCase().includes('ok');
      
      if (isValid) {
        console.log('✅ OpenAI Service validation successful');
      } else {
        console.log('⚠️ OpenAI Service validation failed');
      }
      
      return isValid;

    } catch (error) {
      console.error('❌ OpenAI Service validation error:', error);
      return false;
    }
  }
}

module.exports = new OpenAIService();
