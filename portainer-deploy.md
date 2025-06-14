# Deploy do Bot WhatsApp no Portainer

## 📋 Pré-requisitos
- VPS com Docker instalado
- Portainer configurado e funcionando
- Acesso ao ambiente Portainer via web

## 🚀 Método 1: Deploy via Stack (Recomendado)

### Passo 1: Criar uma Nova Stack no Portainer

1. Acesse seu Portainer: `https://painel.agenciafer.com.br`
2. Vá em **Stacks** → **Add stack**
3. Digite o nome: `bot-whatsapp`

### Passo 2: Configurar o Docker Compose

Cole o seguinte conteúdo no editor do Portainer:

```yaml
version: '3.8'

services:
  bot-whatsapp:
    image: bot-whatsapp:latest
    container_name: bot-whatsapp-prod
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - TZ=America/Sao_Paulo
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
      
      # Variáveis de ambiente do bot (substitua pelos seus valores)
      - OPENAI_API_KEY=your_openai_api_key_here
      - GOOGLE_CALENDAR_EMAIL=your_email@gmail.com
      - GOOGLE_PRIVATE_KEY=your_google_private_key_here
      - GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
      - GOOGLE_PROJECT_ID=your_google_project_id
      - BOT_OWNER_NUMBER=5511999999999
      - DEFAULT_TIMEZONE=America/Sao_Paulo
      
    volumes:
      # Volumes nomeados para persistência
      - whatsapp_session:/app/.wwebjs_auth
      - bot_logs:/app/logs
      - bot_exports:/app/exports
      - bot_config:/app/config
      - bot_tmp:/app/tmp
      
    ports:
      - "3000:3000"
      
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Bot está rodando')"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3
      
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
          
    networks:
      - bot-network

volumes:
  whatsapp_session:
    driver: local
  bot_logs:
    driver: local
  bot_exports:
    driver: local
  bot_config:
    driver: local
  bot_tmp:
    driver: local

networks:
  bot-network:
    driver: bridge
```

## 🚀 Método 2: Upload da Imagem Docker

### Opção A: Build direto na VPS

1. **Fazer upload dos arquivos do projeto**:
   ```bash
   # Na sua máquina local
   tar -czf bot-whatsapp.tar.gz --exclude=node_modules --exclude=.git --exclude=logs/* .
   scp bot-whatsapp.tar.gz user@sua-vps:/home/user/
   ```

2. **Na VPS**:
   ```bash
   # Extrair arquivos
   cd /home/user
   tar -xzf bot-whatsapp.tar.gz
   cd bot-whatsapp
   
   # Build da imagem
   docker build -t bot-whatsapp:latest .
   ```

### Opção B: Via Docker Registry (Mais Profissional)

1. **Na sua máquina local**:
   ```bash
   # Build e tag da imagem
   docker build -t bot-whatsapp:latest .
   docker tag bot-whatsapp:latest seu-registry/bot-whatsapp:latest
   
   # Push para registry
   docker push seu-registry/bot-whatsapp:latest
   ```

2. **No Portainer**: Use a imagem `seu-registry/bot-whatsapp:latest`

## 🚀 Método 3: Deploy via Git (Profissional - Recomendado)

### Passo 1: Configurar Repositório Git

1. **Criar repositório no GitHub/GitLab** (se ainda não tiver):
   ```bash
   # Inicializar git (se não existir)
   git init
   
   # Adicionar remote
   git remote add origin https://github.com/seu-usuario/bot-whatsapp.git
   
   # Fazer commit das alterações
   git add .
   git commit -m "feat: setup para deploy em produção"
   git push -u origin main
   ```

### Passo 2: Script de Deploy via Git na VPS

```bash
#!/bin/bash
# Script para rodar na VPS

PROJECT_NAME="bot-whatsapp"
REPO_URL="https://github.com/seu-usuario/bot-whatsapp.git"
DEPLOY_PATH="/opt/deployments/$PROJECT_NAME"

# Clonar ou atualizar repositório
if [ -d "$DEPLOY_PATH" ]; then
    echo "🔄 Atualizando repositório..."
    cd $DEPLOY_PATH
    git pull origin main
else
    echo "📥 Clonando repositório..."
    sudo mkdir -p /opt/deployments
    sudo chown $USER:$USER /opt/deployments
    git clone $REPO_URL $DEPLOY_PATH
    cd $DEPLOY_PATH
fi

# Build da imagem
echo "🏗️ Building imagem Docker..."
docker build -t $PROJECT_NAME:latest .

# Limpar imagens antigas
docker image prune -f

echo "✅ Deploy concluído! Imagem $PROJECT_NAME:latest disponível"
```

### Passo 3: Automatizar Deploy na VPS

1. **Salvar script na VPS**:
   ```bash
   # Conectar na VPS
   ssh user@sua-vps
   
   # Criar script de deploy
   nano deploy-bot.sh
   # Cole o script acima e configure a REPO_URL
   
   # Tornar executável
   chmod +x deploy-bot.sh
   ```

2. **Executar deploy**:
   ```bash
   ./deploy-bot.sh
   ```

### Passo 4: Configurar Webhook (Opcional - Avançado)

Para deploy automático quando fizer push:

1. **Instalar webhook na VPS**:
   ```bash
   # Ubuntu/Debian
   sudo apt install webhook
   
   # CentOS/RHEL
   sudo yum install webhook
   ```

2. **Criar arquivo de configuração** (`/etc/webhook/hooks.json`):
   ```json
   [
     {
       "id": "bot-whatsapp-deploy",
       "execute-command": "/opt/deployments/deploy-bot.sh",
       "command-working-directory": "/opt/deployments",
       "response-message": "Deploy iniciado!",
       "trigger-rule": {
         "match": {
           "type": "payload-hash-sha1",
           "secret": "seu-secret-aqui",
           "parameter": {
             "source": "header",
             "name": "X-Hub-Signature"
           }
         }
       }
     }
   ]
   ```

3. **Iniciar webhook**:
   ```bash
   webhook -hooks /etc/webhook/hooks.json -verbose
   ```

4. **Configurar no GitHub**:
   - Vá em Settings → Webhooks
   - URL: `http://sua-vps:9000/hooks/bot-whatsapp-deploy`
   - Secret: use o mesmo do arquivo de configuração

### Vantagens do Método Git:

✅ **Controle de Versão**: Histórico completo de mudanças
✅ **Rollback Fácil**: Voltar para versão anterior rapidamente
✅ **Deploy Automático**: Com webhooks, deploy a cada push
✅ **Colaboração**: Múltiplos desenvolvedores podem contribuir
✅ **Backup Natural**: Código sempre seguro no repositório
✅ **CI/CD Ready**: Fácil integração com pipelines

### Deploy Rápido via Git:

```bash
# Na sua máquina local
git add .
git commit -m "update: nova versão do bot"
git push origin main

# Na VPS (automatizado com webhook ou manual)
cd /opt/deployments/bot-whatsapp
git pull origin main
docker build -t bot-whatsapp:latest .
docker restart bot-whatsapp-prod
```

## 🔧 Configuração das Variáveis de Ambiente

### Método Seguro (Recomendado)
No Portainer, você pode usar **Secrets** para dados sensíveis:

1. Vá em **Secrets** → **Add secret**
2. Crie secrets para:
   - `openai_api_key`
   - `google_private_key`
   - `bot_owner_number`

3. Modifique o docker-compose para usar secrets:
```yaml
secrets:
  - openai_api_key
  - google_private_key

environment:
  - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key
  - GOOGLE_PRIVATE_KEY_FILE=/run/secrets/google_private_key
```

## 📂 Upload do arquivo google-service-account.json

1. No Portainer, vá em **Volumes** → **Browse** → `bot_config`
2. Faça upload do arquivo `google-service-account.json`
3. Ou monte como volume:

```yaml
volumes:
  - ./config/google-service-account.json:/app/config/google-service-account.json:ro
```

## 🔍 Monitoramento

### Logs em Tempo Real
1. No Portainer: **Containers** → `bot-whatsapp-prod` → **Logs**
2. Ou via comando: `docker logs -f bot-whatsapp-prod`

### Health Check
- O container terá status "healthy" quando funcionando corretamente
- Verificação a cada 30 segundos

## 🛠️ Comandos Úteis

### Restart do Container
```bash
docker restart bot-whatsapp-prod
```

### Ver Status
```bash
docker ps | grep bot-whatsapp
```

### Backup dos Volumes
```bash
# Backup da sessão do WhatsApp
docker run --rm -v bot-whatsapp_whatsapp_session:/data -v $(pwd):/backup alpine tar czf /backup/whatsapp_session_backup.tar.gz -C /data .
```

### Restore dos Volumes
```bash
# Restore da sessão do WhatsApp
docker run --rm -v bot-whatsapp_whatsapp_session:/data -v $(pwd):/backup alpine tar xzf /backup/whatsapp_session_backup.tar.gz -C /data
```

## 🔒 Segurança

1. **Firewall**: Certifique-se que apenas as portas necessárias estão abertas
2. **Secrets**: Use sempre secrets para dados sensíveis
3. **Volumes**: Mantenha backups regulares dos volumes
4. **Updates**: Mantenha a imagem atualizada

## 📝 Troubleshooting

### Container não inicia
1. Verifique os logs: `docker logs bot-whatsapp-prod`
2. Verifique se todas as variáveis estão definidas
3. Verifique se o arquivo `google-service-account.json` está presente

### WhatsApp não conecta
1. Verifique se o QR code está sendo gerado nos logs
2. Verifique se o volume da sessão está montado corretamente
3. Pode ser necessário limpar a sessão: `docker volume rm bot-whatsapp_whatsapp_session`

### Problemas de memória
1. Monitore o uso via Portainer
2. Ajuste os limits de memória se necessário
3. Considere otimizar o código se uso for muito alto
