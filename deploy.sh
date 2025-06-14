#!/bin/bash

# Script de Deploy para VPS com Portainer
# Executar na VPS após fazer upload dos arquivos

echo "🚀 Iniciando deploy do Bot WhatsApp..."

# Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando!"
    exit 1
fi

# Para container existente se houver
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Remove imagens antigas para economizar espaço
echo "🧹 Limpando imagens antigas..."
docker image prune -f

# Constrói e inicia os containers
echo "🔨 Construindo e iniciando containers..."
docker-compose up -d --build

# Verifica se os containers estão rodando
echo "✅ Verificando status dos containers..."
docker-compose ps

# Mostra logs iniciais
echo "📋 Primeiros logs do bot:"
docker-compose logs --tail=20 bot-whatsapp

echo ""
echo "🎉 Deploy concluído!"
echo "📱 Para ver o QR Code do WhatsApp: docker-compose logs -f bot-whatsapp"
echo "🔍 Para monitorar logs: docker-compose logs -f"
echo "🛑 Para parar: docker-compose down"
