# 🔧 Configuração das Variáveis de Ambiente

## 📋 Variáveis Obrigatórias

Antes de fazer o deploy no Portainer, você precisa configurar estas variáveis no arquivo `stack-portainer.yml`:

### 1. OpenAI API Key
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- **Onde obter**: https://platform.openai.com/api-keys
- **Formato**: Começa com `sk-`

### 2. Google Calendar (Service Account)
```
GOOGLE_CALENDAR_EMAIL=oswaldolrf@gmail.com
GOOGLE_CLIENT_EMAIL=bot-whatsapp@seu-projeto.iam.gserviceaccount.com
GOOGLE_PROJECT_ID=seu-projeto-id
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...
```

**⚠️ Importante**: A `GOOGLE_PRIVATE_KEY` deve ter as quebras de linha substituídas por `\n`

### 3. Bot Owner (Seu número)
```
BOT_OWNER_NUMBER=5511999999999
```
- **Formato**: Código do país + DDD + número (sem espaços ou símbolos)

## 🔒 Método Seguro (Usando Secrets do Portainer)

### Passo 1: Criar Secrets
1. No Portainer, vá em **Secrets**
2. Clique em **Add secret**
3. Crie os seguintes secrets:

| Nome | Conteúdo |
|------|----------|
| `openai_api_key` | sua chave da OpenAI |
| `google_private_key` | sua chave privada do Google |
| `bot_owner_number` | seu número de WhatsApp |

### Passo 2: Modificar o Stack
```yaml
version: '3.8'

services:
  bot-whatsapp:
    image: bot-whatsapp:latest
    container_name: bot-whatsapp-prod
    restart: unless-stopped
    
    secrets:
      - openai_api_key
      - google_private_key
      - bot_owner_number
    
    environment:
      - NODE_ENV=production
      - TZ=America/Sao_Paulo
      - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
      - PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
      
      # Usando secrets (mais seguro)
      - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key
      - GOOGLE_PRIVATE_KEY_FILE=/run/secrets/google_private_key
      - BOT_OWNER_NUMBER_FILE=/run/secrets/bot_owner_number
      
      # Outras variáveis (não sensíveis)
      - GOOGLE_CALENDAR_EMAIL=oswaldolrf@gmail.com
      - GOOGLE_CLIENT_EMAIL=bot-whatsapp@seu-projeto.iam.gserviceaccount.com
      - GOOGLE_PROJECT_ID=seu-projeto-id
      - DEFAULT_TIMEZONE=America/Sao_Paulo
    
    # ... resto da configuração

secrets:
  openai_api_key:
    external: true
  google_private_key:
    external: true
  bot_owner_number:
    external: true
```

## 📁 Upload do Arquivo google-service-account.json

### Método 1: Via Volume Mount (Recomendado)
1. No Portainer, vá em **Volumes**
2. Encontre o volume `bot-whatsapp_bot_config`
3. Clique em **Browse**
4. Faça upload do arquivo `google-service-account.json`

### Método 2: Via Container
```bash
# Copiar arquivo para container rodando
docker cp google-service-account.json bot-whatsapp-prod:/app/config/
```

## 🧪 Testando as Configurações

Após o deploy, verifique os logs:

```bash
docker logs bot-whatsapp-prod -f
```

### Logs de Sucesso:
```
✅ Teste de listagem de eventos do Google Calendar concluído.
🤖 Inicializando Bot WhatsApp com integração OpenAI...
⏳ Aguardando QR code para conexão...
```

### Logs de Erro Comum:
```
❌ Erro na API do Google Calendar: unauthorized_client
❌ OpenAI API key inválida
❌ Número do proprietário não configurado
```

## 🔍 Troubleshooting

### Erro: "Google Calendar unauthorized"
- Verifique se o arquivo `google-service-account.json` está no volume
- Confirme se o email do calendário tem permissão para a service account

### Erro: "OpenAI API key invalid"
- Verifique se a chave começa com `sk-`
- Confirme se a chave está ativa no painel da OpenAI

### Erro: "Bot owner not configured"
- Verifique o formato do número: `5511999999999`
- Não use espaços, hífens ou parênteses

## 📞 Números de Teste

Para testar, use estes formatos:
- **Brasil**: `5511999999999` (55 + 11 + número)
- **Outros países**: Código do país + DDD + número

## 🔄 Reiniciar Após Configuração

Após configurar as variáveis:
1. No Portainer: **Containers** → `bot-whatsapp-prod` → **Restart**
2. Ou via comando: `docker restart bot-whatsapp-prod`
