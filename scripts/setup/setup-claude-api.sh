#!/bin/bash

# 🧠 Setup Claude API - Configuração automática
# Script para configurar a integração com Claude API

echo "🧠 CONFIGURAÇÃO CLAUDE API"
echo "=========================="
echo ""

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📋 Copiando .env.example para .env..."
    cp config/examples/.env.example .env
    echo "✅ Arquivo .env criado"
    echo ""
fi

# Verificar se Claude API key já está configurada
if grep -q "CLAUDE_API_KEY=sk-ant-" .env; then
    echo "✅ Claude API key já configurada!"
    echo ""
else
    echo "🔑 CONFIGURAÇÃO DA CLAUDE API KEY"
    echo "================================"
    echo ""
    echo "Para usar o Agente IA Avançado, você precisa de uma chave da Anthropic Claude API."
    echo ""
    echo "📌 Como obter sua chave:"
    echo "1. Acesse: https://console.anthropic.com/"
    echo "2. Faça login ou crie uma conta"
    echo "3. Vá em 'API Keys'"
    echo "4. Clique em 'Create Key'"
    echo "5. Copie a chave (sk-ant-api03-...)"
    echo ""
    
    read -p "🔑 Cole sua Claude API key aqui: " claude_key
    
    if [[ $claude_key == sk-ant-* ]]; then
        # Atualizar arquivo .env
        sed -i.bak "s/CLAUDE_API_KEY=.*/CLAUDE_API_KEY=$claude_key/" .env
        echo "✅ Claude API key configurada com sucesso!"
        echo ""
    else
        echo "❌ Chave inválida! Deve começar com 'sk-ant-'"
        echo "🔄 Execute o script novamente para tentar outra vez."
        exit 1
    fi
fi

# Verificar dependências Node.js
echo "📦 VERIFICANDO DEPENDÊNCIAS"
echo "=========================="

if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo "📥 Instale Node.js: https://nodejs.org/"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "📋 Criando package.json..."
    cat > package.json << EOF
{
  "name": "agente-ia-vps-hostinger",
  "version": "2.0.0",
  "description": "Agente IA para gerenciamento VPS e WordPress com Claude API",
  "main": "ai-agent-advanced.js",
  "scripts": {
    "start": "node ai-agent-advanced.js",
    "vps": "node vps-agent-complete.js",
    "hostinger": "node hostinger-complete.js",
    "test": "node -e \"console.log('✅ Node.js funcionando!')\""
  },
  "dependencies": {
    "dotenv": "^16.0.0"
  },
  "keywords": ["ai", "vps", "wordpress", "automation", "claude"],
  "author": "Agente IA",
  "license": "MIT"
}
EOF
    echo "✅ package.json criado"
fi

if [ ! -d "node_modules" ]; then
    echo "📥 Instalando dependências..."
    npm install
    echo "✅ Dependências instaladas"
fi

echo ""
echo "🧠 TESTANDO CONFIGURAÇÃO"
echo "======================"

# Testar Claude API
echo "🔍 Testando conexão com Claude API..."
node -e "
require('dotenv').config();
const apiKey = process.env.CLAUDE_API_KEY;
if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    console.log('❌ Claude API key não configurada corretamente');
    process.exit(1);
}

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey });

(async () => {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Responda apenas OK' }]
    });
    
    console.log('✅ Claude API funcionando!');
    console.log('📝 Resposta:', message.content[0].text);
  } catch (error) {
    if (error.message.includes('credit balance')) {
      console.log('💳 CRÉDITOS INSUFICIENTES!');
      console.log('');
      console.log('🌐 Adicione créditos em: https://console.anthropic.com/account/billing');
      console.log('💰 Recomendado: $5-10 USD para começar');
      console.log('📖 Veja: CLAUDE-CREDITS-SETUP.md para mais detalhes');
      console.log('');
      console.log('⚠️  O agente funcionará, mas comandos IA estarão limitados');
    } else {
      console.log('❌ Erro na Claude API:', error.message);
    }
  }
})();
" 2>/dev/null || echo "⚠️  Erro ao testar Claude API (pode ser problema de rede ou créditos)"

echo ""
echo "🎉 CONFIGURAÇÃO CONCLUÍDA!"
echo "========================"
echo ""
echo "🚀 Para iniciar o Agente IA Avançado:"
echo "   node ai-agent-advanced.js"
echo ""
echo "🔧 Outros agentes disponíveis:"
echo "   node vps-agent-complete.js      - Gerenciamento VPS"
echo "   node hostinger-complete.js      - Gerenciamento Hostinger"
echo ""
echo "📚 Comandos disponíveis no AI Agent:"
echo "   create-page [site] [descrição]   - Criar página com IA"
echo "   create-upload [site] [email]     - Criar formulário upload"
echo "   create-system [site] [tipo]      - Criar sistema completo"
echo "   ai [pergunta]                    - Assistente IA geral"
echo ""
echo "💡 Exemplo:"
echo "   create-page agenciafer.com.br página de vendas moderna"
echo ""
echo "📖 Documentação completa: README.md"
