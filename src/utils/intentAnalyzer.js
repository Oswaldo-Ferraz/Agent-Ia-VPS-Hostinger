/**
 * Utilitários para análise de intenção do usuário
 */

const OpenAI = require('openai');
require('dotenv').config();

// Criar instância do cliente OpenAI para análise de intenções
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const INTENTIONS = {
  SCHEDULE: 'schedule',
  RESCHEDULE: 'reschedule',
  CANCEL: 'cancel',
  INFO: 'info',
  LIST: 'list',
  GREETING: 'greeting',
  FAREWELL: 'farewell',
  COMPLAINT: 'complaint',
  THANKS: 'thanks',
  CONFIRMATION: 'confirmation',
  REJECTION: 'rejection',
  CONFUSION: 'confusion'
};

/**
 * Analisa a mensagem do usuário para detectar a intenção principal
 * @param {string} message - Mensagem do usuário
 * @returns {Object} Objeto com intenção detectada e contexto
 */
function analyzeUserIntent(message) {
  const result = {
    mainIntent: null,
    subIntent: null,
    confidence: 0,
    context: {},
    entities: {}
  };

  if (!message) return result;
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Verificar saudações
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|e aí|e ai|hey|hi)[\s!,.?]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.GREETING;
    result.confidence = 0.95;
    return result;
  }
  
  // Verificar agradecimentos
  if (/^(obrigad[ao]|valeu|thanks|grat[ao]|vlw|muito obrigad[ao])[\s!,.?]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.THANKS;
    result.confidence = 0.9;
    return result;
  }
  
  // Verificar despedidas
  if (/^(tchau|até|ate|adeus|até mais|ate mais|bye|goodbye|flw|falou)[\s!,.?]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.FAREWELL;
    result.confidence = 0.9;
    return result;
  }
  
  // Verificar confirmações
  if (/^(sim|s|yes|isso|confirmo|pode ser|claro|exato|exatamente|certo|confirmar|ok|beleza|blz|perfeito|combinado|fechado|tá bom|ta bom|tá certo|ta certo)[\s!,.?]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.CONFIRMATION;
    result.confidence = 0.95;
    return result;
  }
  
  // Verificar rejeições
  if (/^(não|nao|n|no|não quero|nao quero|nunca|jamais|de jeito nenhum|negativo|não concordo|nao concordo)[\s!,.?]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.REJECTION;
    result.confidence = 0.95;
    return result;
  }

  // Verificar agendamentos
  if (/(marcar|agendar|reservar|quero.*marcar|quero.*agendar|marcar um|disponibilidade|horário|horarios|livre|tem vaga|tem horário|tem horario|disponível|disponivel)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.SCHEDULE;
    result.confidence = 0.8;
    
    // Verificar período (manhã/tarde)
    if (/manhã|manha|matutino/i.test(lowerMessage)) {
      result.context.period = 'morning';
    } else if (/tarde|vespertino/i.test(lowerMessage)) {
      result.context.period = 'afternoon';
    }
    
    return result;
  }
  
  // Verificar remarcações
  if (/(remarcar|reagendar|alterar|mudar|modificar|trocar|remarcação|remarcacao|reagendamento|alteração|alteracao|mudança|mudanca)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.RESCHEDULE;
    result.confidence = 0.85;
    return result;
  }
  
  // Verificar cancelamentos
  if (/(cancelar|desmarcar|cancela|desmarca|cancelamento|desistir|não quero mais|nao quero mais|não posso|nao posso)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.CANCEL;
    result.confidence = 0.85;
    return result;
  }
  
  // Verificar listagem de agendamentos - expressões diretas
  if (/(listar|mostrar|exibir|quais são|quais sao|ver meus|ver os|meus agendamentos|meus horários|meus horarios|minhas reservas|consultar|listar.*horários|listar.*horarios)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.LIST;
    result.confidence = 0.95; // Alta confiança para expressões diretas de listar
    return result;
  }

  // Verificar solicitações indiretas sobre agendamentos existentes
  if (/(quero saber|que dia|qual dia|quando|qual data|em que data|me informa|me lembra|me diz|marcad[oa]|marquei|agendei|marqu?ou|agendou)[\s\S]*(ensaio|foto|sessão|sessao|agendamento|horário|horario|reserva)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.LIST;
    result.confidence = 0.95; // Alta confiança para perguntas sobre agendamentos existentes
    return result;
  }

  // Verificar outras formas de perguntas sobre agendamentos
  if (/(qual.*dia|que.*dia|quando.*é|quando.*será|quando.*vai.*ser|meu.*ensaio.*quando|ensaio.*quando|data.*do.*ensaio|dia.*da.*reserva|horário.*marcado|horario.*marcado|meu.*horário|meu.*horario|minha.*reserva|minha.*sessão|minha.*sessao)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.LIST;
    result.confidence = 0.9; // Boa confiança para variações de consultas
    return result;
  }

  // Verificar perguntas sobre existência de agendamentos ou status
  if (/(tenho.*horário|tenho.*horario|tenho.*agendamento|tenho.*ensaio|tem.*algum.*horário|tem.*algum.*horario|algum.*horário.*marcado|algum.*horario.*marcado|já.*marcado|ja.*marcado|confirmado|agendado)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.LIST;
    result.confidence = 0.9;
    return result;
  }
  
  // Expressões curtas sobre consulta de agendamentos
  if (/^(horários|horarios|agendamentos|reservas|ensaio|ensaios|sessões|sessoes)[\s?!.]*$/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.LIST;
    result.confidence = 0.85;
    return result;
  }
  
  // Verificar reclamações ou frustração
  if (/(não entendi|nao entendi|confuso|confusa|não entendo|nao entendo|não é isso|nao e isso|errado|errada|está errado|esta errado|erro|não funciona|nao funciona)/i.test(lowerMessage)) {
    result.mainIntent = INTENTIONS.CONFUSION;
    result.confidence = 0.7;
    return result;
  }

  // Se nenhuma intenção clara for detectada
  return result;
}

/**
 * Analisa se uma mensagem é uma confirmação usando OpenAI
 * @param {string} message - Mensagem do usuário
 * @returns {Promise<Object>} Resultado da análise com tipo e confiança
 */
async function analyzeConfirmationWithAI(message) {
  try {
    const prompt = `Analise a seguinte mensagem e determine se é uma resposta:
1. POSITIVA (confirmação, aceitação, concordância)
2. NEGATIVA (rejeição, cancelamento, recusa)
3. NEUTRA (não é clara se é positiva ou negativa)

Mensagem: "${message}"

Responda APENAS com um JSON no formato:
{
  "type": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "confidence": 0.0-1.0,
  "reasoning": "breve explicação"
}

Exemplos de respostas POSITIVAS: sim, beleza, fechado, ok, confirmo, perfeito, pode ser, claro, tá bom, confirma aí, isso mesmo, exato, combinado, aceito, concordo, certeza, é isso aí, vai dar certo, maravilha, ótimo, legal, top, massa, demais, valeu, show, bacana, etc.

Exemplos de respostas NEGATIVAS: não, nao, cancelar, cancela, não quero, deixa pra lá, mudei de ideia, esquece, recuso, nego, jamais, nunca, de jeito nenhum, nem pensar, etc.

Considere variações de escrita, gírias brasileiras, emojis e contexto.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    });

    let responseContent = response.choices[0].message.content.trim();
    
    // Remove blocos de código markdown se existirem
    if (responseContent.startsWith('```json')) {
      responseContent = responseContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (responseContent.startsWith('```')) {
      responseContent = responseContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const result = JSON.parse(responseContent);
    
    // Mapear para o formato esperado pelo sistema
    let intention;
    if (result.type === 'POSITIVE') {
      intention = INTENTIONS.CONFIRMATION;
    } else if (result.type === 'NEGATIVE') {
      intention = INTENTIONS.REJECTION;
    } else {
      intention = INTENTIONS.CONFUSION;
    }

    return {
      mainIntent: intention,
      confidence: result.confidence,
      reasoning: result.reasoning,
      aiAnalysis: true
    };

  } catch (error) {
    console.error('[IntentAnalyzer] Erro na análise com OpenAI:', error);
    
    // Fallback para análise básica em caso de erro
    return analyzeUserIntent(message);
  }
}

module.exports = {
  INTENTIONS,
  analyzeUserIntent,
  analyzeConfirmationWithAI
};
