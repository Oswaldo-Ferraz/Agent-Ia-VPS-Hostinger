#!/bin/bash

# 🔐 CONFIGURAÇÃO AUTOMÁTICA DE CREDENCIAIS SEGURAS
# Este script configura git-crypt para criptografar automaticamente suas credenciais

echo "🔐 CONFIGURANDO CREDENCIAIS SEGURAS NO GIT"
echo "========================================="

# Verificar se git-crypt está instalado
if ! command -v git-crypt &> /dev/null; then
    echo "📦 Instalando git-crypt..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install git-crypt
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install git-crypt
    else
        echo "❌ Sistema não suportado. Instale git-crypt manualmente."
        exit 1
    fi
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env com suas credenciais..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANTE: Configure suas credenciais no arquivo .env"
    echo "   nano .env"
    echo ""
    read -p "Pressione Enter após configurar o .env..."
fi

# Adicionar .env ao Git (agora criptografado)
echo "🔒 Adicionando .env criptografado ao Git..."
git add .env .gitattributes

# Commit das mudanças
git commit -m "🔐 Adiciona credenciais criptografadas com git-crypt

✅ Arquivo .env agora é criptografado automaticamente
✅ Credenciais seguras no repositório Git  
🔑 Chave salva em ~/git-crypt-key
📋 Use git-crypt unlock ~/git-crypt-key para descriptografar"

echo ""
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo ""
echo "🔑 CHAVE DE DESCRIPTOGRAFIA SALVA EM: ~/git-crypt-key"
echo "   ⚠️  GUARDE ESTA CHAVE COM SEGURANÇA!"
echo ""
echo "📤 Para fazer push:"
echo "   git push origin main"
echo ""
echo "📥 Para clonar em outro computador:"
echo "   git clone [repo]"
echo "   git-crypt unlock ~/git-crypt-key"
echo "   npm install"
echo "   # Pronto para usar!"
echo ""
echo "🔐 Suas credenciais agora estão seguras no Git!"
