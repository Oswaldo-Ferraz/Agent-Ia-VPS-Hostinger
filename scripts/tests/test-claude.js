#!/usr/bin/env node

// Teste simples da Claude API
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

async function testClaude() {
  console.log('🧠 TESTE CLAUDE API');
  console.log('==================');
  
  // Verificar se API key existe
  if (!process.env.CLAUDE_API_KEY) {
    console.log('❌ CLAUDE_API_KEY não encontrada no .env');
    process.exit(1);
  }
  
  const apiKey = process.env.CLAUDE_API_KEY;
  console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');
  
  // Inicializar cliente
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });
  
  try {
    console.log('📡 Enviando requisição para Claude...');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Responda apenas: "Claude API funcionando perfeitamente!"'
      }]
    });

    console.log('✅ SUCESSO!');
    console.log('📝 Resposta:', message.content[0].text);
    console.log('🎉 Claude API configurada corretamente!');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Erro de autenticação - chave API inválida');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit - muitas requisições');
    } else if (error.status === 400) {
      console.error('📝 Erro na requisição');
    }
    
    console.error('📊 Status:', error.status);
    process.exit(1);
  }
}

testClaude();
