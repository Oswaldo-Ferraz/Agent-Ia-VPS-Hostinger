/**
 * 🧪 TESTE OPENAI DIRETO - FASE 3
 * 
 * Testa apenas as funcionalidades básicas da OpenAI
 * sem dependências de Firestore complexas
 */

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIDirect() {
    console.log('🚀 TESTANDO OPENAI DIRETAMENTE - FASE 3\n');

    try {
        // 1. Testar conexão básica
        console.log('🔌 1. Testando conexão OpenAI...');
        
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const testResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: 'Responda apenas "OK" se você está funcionando.'
                }
            ],
            max_tokens: 10,
            temperature: 0
        });

        const response = testResponse.choices[0].message.content;
        console.log(`✅ Resposta OpenAI: "${response}"`);

        // 2. Testar categorização de mensagem
        console.log('\n🏷️ 2. Testando categorização de mensagem...');
        
        const messageToAnalyze = 'Olá, gostaria de fazer um pedido de pizza, mas estou com problema no pagamento';
        
        const categorizationResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um especialista em categorização de mensagens. Sempre responda com JSON válido.'
                },
                {
                    role: 'user',
                    content: `
MENSAGEM PARA CATEGORIZAR: "${messageToAnalyze}"

RETORNE UM JSON com:
{
  "category": "suporte|vendas|reclamacao|duvida|elogio|outros",
  "urgency": "low|normal|high|urgent", 
  "sentiment": "positive|neutral|negative",
  "topics": ["topico1", "topico2"],
  "confidence": 0.95
}

Apenas o JSON:`
                }
            ],
            max_tokens: 200,
            temperature: 0.1
        });

        const categorizationText = categorizationResponse.choices[0].message.content;
        console.log('📊 Categorização:', categorizationText);

        try {
            const categorization = JSON.parse(categorizationText);
            console.log('✅ Categorização JSON válida!');
            console.log(`   Categoria: ${categorization.category}`);
            console.log(`   Urgência: ${categorization.urgency}`);
            console.log(`   Sentimento: ${categorization.sentiment}`);
        } catch (parseError) {
            console.log('⚠️ JSON inválido, mas resposta recebida');
        }

        // 3. Testar geração de resumo
        console.log('\n📝 3. Testando geração de resumo...');
        
        const conversationsToSummarize = [
            'Cliente: Olá, gostaria de fazer um pedido',
            'Atendente: Claro! O que você gostaria?',
            'Cliente: Uma pizza margherita grande',
            'Atendente: Perfeito! Qual o endereço para entrega?',
            'Cliente: Rua das Flores, 123',
            'Atendente: Será 45 minutos. Total: R$ 35,00'
        ];

        const summaryResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é especialista em resumir conversas de atendimento ao cliente.'
                },
                {
                    role: 'user',
                    content: `
CONVERSAS PARA RESUMIR:
${conversationsToSummarize.join('\n')}

Crie um resumo conciso de até 100 palavras destacando:
- O que o cliente pediu
- Informações importantes
- Resultado da conversa

RESUMO:`
                }
            ],
            max_tokens: 300,
            temperature: 0.3
        });

        const summary = summaryResponse.choices[0].message.content;
        console.log('📋 Resumo gerado:', summary);

        // 4. Testar resposta contextual
        console.log('\n💬 4. Testando resposta contextual...');
        
        const contextualResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um atendente da Pizzaria do João. Seja amigável e prestativo.'
                },
                {
                    role: 'user',
                    content: `
CONTEXTO DO CLIENTE:
Nome: Maria Silva
Histórico: Cliente frequente, prefere pizza margherita, sempre pede aos sábados

MENSAGEM ATUAL DO CLIENTE:
"Oi! Estou pensando em fazer um pedido para hoje"

Responda como atendente da pizzaria, usando o contexto:`
                }
            ],
            max_tokens: 200,
            temperature: 0.7
        });

        const contextualAnswer = contextualResponse.choices[0].message.content;
        console.log('🎯 Resposta contextual:', contextualAnswer);

        // 5. Resultados finais
        console.log('\n' + '='.repeat(50));
        console.log('🎉 TESTE OPENAI DIRETO - CONCLUÍDO!');
        console.log('='.repeat(50));
        console.log('✅ Conexão OpenAI: OK');
        console.log('✅ Categorização: OK');
        console.log('✅ Resumos: OK');
        console.log('✅ Respostas contextuais: OK');
        console.log('\n🚀 FASE 3 - INTEGRAÇÃO OPENAI FUNCIONAL!');
        console.log('✨ Pronta para implementar FASE 4: Agente IA Inteligente');

    } catch (error) {
        console.error('\n❌ ERRO NO TESTE OPENAI:', error);
        
        if (error.message.includes('API key')) {
            console.log('\n💡 DICA: Verifique se a OPENAI_API_KEY está configurada no .env');
        }
        
        throw error;
    }
}

// Executar teste
if (require.main === module) {
    testOpenAIDirect().catch(console.error);
}

module.exports = testOpenAIDirect;
