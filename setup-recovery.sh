#!/bin/bash

# 🚀 Script de Recuperação - Agent IA VPS Hostinger
# Execute após clonar o repositório em um novo computador

echo "🚀 RECUPERAÇÃO DO AGENTE IA - VPS HOSTINGER"
echo "=========================================="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório do projeto!"
    exit 1
fi

echo "📦 Instalando dependências Node.js..."
npm install

echo ""
echo "🔧 Configurando arquivo de credenciais..."

# Verificar se .env já existe
if [ -f ".env" ]; then
    echo "⚠️  Arquivo .env já existe!"
    read -p "Deseja sobrescrever? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Configuração cancelada."
        exit 1
    fi
fi

# Copiar template
cp .env.example .env

echo "✅ Template .env criado!"
echo ""
echo "🔐 AGORA VOCÊ PRECISA CONFIGURAR AS CREDENCIAIS:"
echo "   1. Abra o arquivo .env:"
echo "      nano .env"
echo ""
echo "   2. Configure as seguintes variáveis:"
echo "      VPS_IP=147.79.83.6"
echo "      VPS_PASSWORD=[sua_senha_vps]"
echo "      HOSTINGER_HOST=147.93.37.192"
echo "      HOSTINGER_PORT=65002"
echo "      HOSTINGER_USER=[seu_usuario_hostinger]"
echo "      HOSTINGER_PASS=[sua_senha_hostinger]"
echo ""
echo "📱 ONDE ENCONTRAR AS CREDENCIAIS:"
echo "   • Backup salvo: iCloud/Google Drive/1Password"
echo "   • Painel Hostinger: https://hpanel.hostinger.com"
echo "   • Arquivo: RECUPERACAO-CREDENCIAIS.md (se salvou)"
echo ""
echo "🧪 APÓS CONFIGURAR, TESTE:"
echo "   node vps-agent-complete.js"
echo "   node wp-manager.js info"
echo ""
echo "✅ Setup básico concluído!"
echo "🔐 Configure as credenciais para continuar."
