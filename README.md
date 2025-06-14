# 🤖 Bot WhatsApp com Integração OpenAI e Google Calendar

Bot inteligente para WhatsApp que integra com OpenAI (ChatGPT) e Google Calendar, permitindo agendamento de compromissos e conversas naturais.

## 🚀 Funcionalidades

- **🤖 Integração OpenAI**: Conversas inteligentes usando ChatGPT
- **📅 Google Calendar**: Agendamento automático de compromissos
- **⏰ Sistema de Lembretes**: Notificações automáticas
- **👤 Controle de Acesso**: Sistema de autenticação por número
- **📊 Logs Detalhados**: Monitoramento completo de atividades
- **🐳 Docker Ready**: Pronto para deploy em produção

## 📋 Pré-requisitos

- Node.js 18+ ou Docker
- Conta OpenAI com API Key
- Google Service Account configurada
- WhatsApp Business API ou WhatsApp Web

## 🔧 Instalação

### Desenvolvimento Local

```bash
# Clonar repositório
git clone <repo-url>
cd bot-whatsapp

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar
npm start
```

### 🐳 Deploy com Docker (Recomendado)

#### 1. Desenvolvimento
```bash
# Build e execução local
docker-compose up --build
```

#### 2. Produção
```bash
# Build da imagem de produção
docker-compose -f docker-compose.prod.yml build

# Executar em produção
docker-compose -f docker-compose.prod.yml up -d
```

## 🚀 Deploy na VPS com Portainer

### Método Rápido (Script Automatizado)

```bash
# Executar script de deploy
./deploy-vps.sh
```

### Método Manual

1. **Preparar imagem Docker**:
   ```bash
   # Build da imagem
   docker build -t bot-whatsapp:latest .
   
   # Upload para sua VPS
   docker save bot-whatsapp:latest | ssh user@sua-vps 'docker load'
   ```

2. **Configurar no Portainer**:
   - Acesse seu Portainer
   - Vá em **Stacks** → **Add stack**
   - Nome: `bot-whatsapp`
   - Cole o conteúdo do arquivo `stack-portainer.yml`
   - Configure as variáveis de ambiente
   - Deploy!

### 📚 Documentação Completa

- [**🔧 Guia de Deploy no Portainer**](./portainer-deploy.md) - Passo a passo completo
- [**⚙️ Configuração de Variáveis**](./configuracao-env.md) - Como configurar todas as variáveis
- [**🛠️ Desenvolvimento**](./DEVELOPMENT.md) - Guia para desenvolvedores

## 🔐 Configuração das Variáveis de Ambiente

### Obrigatórias

```env
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxx

# Google Calendar
GOOGLE_CALENDAR_EMAIL=seu-email@gmail.com
GOOGLE_CLIENT_EMAIL=service-account@projeto.iam.gserviceaccount.com
GOOGLE_PROJECT_ID=seu-projeto-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Bot
BOT_OWNER_NUMBER=5511999999999
DEFAULT_TIMEZONE=America/Sao_Paulo
```

### Opcionais

```env
NODE_ENV=production
TZ=America/Sao_Paulo
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## 📁 Estrutura do Projeto

```
bot-whatsapp/
├── 📄 index.js                 # Arquivo principal
├── 📁 src/
│   ├── 📁 handlers/            # Handlers de mensagens
│   ├── 📁 services/            # Serviços (OpenAI, Google, etc)
│   └── 📁 utils/              # Utilitários e helpers
├── 📁 config/                 # Configurações
├── 📁 logs/                   # Arquivos de log
├── 📁 exports/                # Exports de dados
├── 🐳 Dockerfile              # Imagem Docker
├── 🐳 docker-compose.yml      # Desenvolvimento
├── 🐳 docker-compose.prod.yml # Produção
└── 🚀 deploy-vps.sh          # Script de deploy
```

## 🎯 Como Usar

1. **Primeira Execução**:
   - Execute o bot
   - Escaneie o QR code que aparece no terminal
   - Aguarde a mensagem "Bot conectado!"

2. **Comandos Disponíveis**:
   - Envie qualquer mensagem para conversar com a IA
   - Use palavras-chave como "agendar", "compromisso" para agendamentos
   - Digite "admin" para acessar comandos administrativos

3. **Agendamento**:
   - "Agendar reunião para amanhã às 14h"
   - "Marcar consulta na sexta-feira"
   - "Compromisso no dia 25 às 10:30"

## 🔍 Monitoramento

### Logs em Tempo Real
```bash
# Docker Compose
docker-compose logs -f

# Container específico
docker logs -f bot-whatsapp-prod

# Arquivo de log
tail -f logs/$(date +%Y-%m-%d).log
```

### Health Check
```bash
# Verificar status
docker ps | grep bot-whatsapp

# Verificar health
docker inspect bot-whatsapp-prod --format='{{.State.Health.Status}}'
```

## 🛠️ Desenvolvimento

### Executar em modo desenvolvimento
```bash
# Instalar dependências
npm install

# Executar com nodemon
npm run dev

# Executar testes
npm test
```

### Estrutura de Desenvolvimento
- `src/handlers/` - Lógica de tratamento de mensagens
- `src/services/` - Integração com APIs externas
- `src/utils/` - Funções utilitárias
- `test_*.js` - Arquivos de teste

## 🔧 Troubleshooting

### Problemas Comuns

1. **QR Code não aparece**:
   - Verifique se o Puppeteer está configurado corretamente
   - Em Docker, certifique-se que o Chromium está instalado

2. **Erro de autenticação Google**:
   - Verifique o arquivo `google-service-account.json`
   - Confirme as permissões da service account

3. **OpenAI não responde**:
   - Verifique se a API key está válida
   - Confirme se há créditos disponíveis

4. **Bot não recebe mensagens**:
   - Verifique se o número está correto no `BOT_OWNER_NUMBER`
   - Confirme se o WhatsApp Web está conectado

## 📊 Performance

### Recursos Recomendados
- **RAM**: 512MB mínimo, 1GB recomendado
- **CPU**: 0.25 cores mínimo, 0.5 cores recomendado
- **Disco**: 2GB para logs e cache

### Otimizações
- Logs rotacionados automaticamente
- Cache de sessão do WhatsApp persistente
- Límites de memória configurados

## 🔒 Segurança

- ✅ Variáveis sensíveis via secrets
- ✅ Controle de acesso por número
- ✅ Logs sem dados sensíveis
- ✅ Sessão WhatsApp isolada
- ✅ Network isolada no Docker

## 🚀 Deploy em Produção

### Checklist Pré-Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Arquivo `google-service-account.json` presente
- [ ] Número do owner configurado corretamente
- [ ] OpenAI API key válida
- [ ] Recursos de sistema adequados
- [ ] Backup da sessão WhatsApp (se existir)

### Pós-Deploy

- [ ] Verificar logs de inicialização
- [ ] Testar conexão WhatsApp (QR code)
- [ ] Testar integração OpenAI
- [ ] Testar agendamento no Google Calendar
- [ ] Configurar monitoramento
- [ ] Agendar backups regulares

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique a documentação específica:
   - [Guia de Deploy](./portainer-deploy.md)
   - [Configuração de Variáveis](./configuracao-env.md)
   - [Desenvolvimento](./DEVELOPMENT.md)

2. Verifique os logs:
   ```bash
   docker logs bot-whatsapp-prod
   ```

3. Arquivo de troubleshooting comum em `DEVELOPMENT.md`

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**⚡ Desenvolvido com ❤️ para automação inteligente de WhatsApp**
