# 🐳 PLANO COMPLETO: DEPLOY BOT WHATSAPP NO PORTAINER

## 📋 VISÃO GERAL
Este guia vai te ajudar a subir o bot WhatsApp no Portainer com integração Git, permitindo atualizações automáticas sempre que você fizer push no repositório.

### ✅ **INFORMAÇÕES COLETADAS:**
- **Portainer:** https://painel.agenciafer.com.br/#!/home
- **Repositório:** https://github.com/AgenciaFER/bot-whatsapp.git (privado)
- **Usuário:** AgenciaFER

### ✅ **BACKUP INICIAL REALIZADO:**
- **Commit:** f8d829f - "✅ Docker funcionando - Bot WhatsApp pronto para produção"
- **Push:** Realizado com sucesso
- **Status:** Código atual salvo no Git

## 🎯 OBJETIVOS
- ✅ Preparar código para produção (remover permissões de desenvolvimento)
- ✅ Configurar repositório Git adequadamente  
- ✅ Criar stack no Portainer
- ✅ Configurar auto-deploy via Git
- ✅ Testar funcionamento em produção
- ✅ Documentar processo de atualizações futuras

---

## 📝 PRÉ-REQUISITOS

### ✅ O que você precisa ter:
- [ ] Portainer funcionando e acessível
- [ ] Conta no GitHub (ou GitLab/Bitbucket)
- [ ] Bot funcionando localmente (✅ **CONCLUÍDO**)
- [ ] Acesso ao servidor onde roda o Portainer

### 🔧 Informações que vou precisar:
- [ ] URL do seu Portainer (ex: `https://meu-servidor:9000`)
- [ ] Repositório Git onde quer hospedar (ex: `https://github.com/usuario/bot-whatsapp`)
- [ ] Se vai usar repositório público ou privado

---

## 🚀 FASE 1: PREPARAR CÓDIGO PARA PRODUÇÃO

### ✅ PASSO 1.1: Ajustar Dockerfile para Produção
**Status: ✅ CONCLUÍDO**

**✅ Mudanças aplicadas:**
- ✅ Removido `chmod -R 777` (inseguro)
- ✅ Configurado usuário não-root (`botuser`)
- ✅ Mantido funcionamento do Chromium
- ✅ Permissões adequadas aplicadas (755/775)
- ✅ Segurança em produção habilitada

### ✅ PASSO 1.2: Criar docker-compose para Produção  
**Status: ✅ CONCLUÍDO**

**✅ Arquivo criado:** `docker-compose.prod.yml`
- ✅ Volumes nomeados em vez de bind mounts
- ✅ Configurações de segurança aplicadas
- ✅ Healthcheck configurado
- ✅ Limites de recursos definidos
- ✅ Network isolada criada

### ✅ PASSO 1.3: Preparar Variáveis de Ambiente
**Status: ✅ CONCLUÍDO**

**✅ Arquivo atualizado:** `.env.example`
- ✅ Todas as variáveis documentadas
- ✅ Instruções para Portainer incluídas
- ✅ Valores sensíveis removidos
- ✅ Comentários explicativos adicionados

---

## 🗂️ FASE 2: CONFIGURAR REPOSITÓRIO GIT

### ❌ PASSO 2.1: Criar/Configurar Repositório
**Status: ⏳ PENDENTE**

**O que vamos fazer:**
- Criar repositório no GitHub (se não existir)
- Configurar .gitignore adequado
- Fazer primeiro commit com código limpo

**Informações necessárias:**
- [ ] Nome do repositório desejado
- [ ] Público ou privado?
- [ ] URL do repositório (após criação)

### ❌ PASSO 2.2: Organizar Estrutura do Projeto
**Status: ⏳ PENDENTE**

**Estrutura que será criada:**
```
bot-whatsapp/
├── src/                    # Código fonte
├── config/                 # Configurações
├── docker-compose.yml      # Para desenvolvimento local
├── docker-compose.prod.yml # Para produção/Portainer
├── Dockerfile              # Imagem Docker
├── .env.example           # Exemplo de variáveis
├── .gitignore             # Arquivos ignorados
├── portainer.md           # Este guia
├── README.md              # Documentação
└── docs/                  # Documentação adicional
```

### ❌ PASSO 2.3: Configurar Auto-Deploy
**Status: ⏳ PENDENTE**

**O que vamos configurar:**
- Webhook do GitHub para Portainer
- Trigger automático em push na branch main
- Teste de funcionamento

---

## 🐳 FASE 3: CONFIGURAR STACK NO PORTAINER

### ❌ PASSO 3.1: Criar Stack no Portainer
**Status: ⏳ PENDENTE**

**O que vamos fazer no Portainer:**
1. Acessar Portainer
2. Ir em "Stacks"
3. Criar nova stack
4. Configurar repositório Git
5. Configurar auto-deploy

### ❌ PASSO 3.2: Configurar Variáveis de Ambiente
**Status: ⏳ PENDENTE**

**Variáveis que precisam ser configuradas:**
```env
OPENAI_API_KEY=sua_chave_aqui
GOOGLE_CALENDAR_EMAIL=seu_email_aqui
PORT=3000
NODE_ENV=production
TZ=America/Sao_Paulo
```

### ❌ PASSO 3.3: Configurar Volumes
**Status: ⏳ PENDENTE**

**Volumes que serão criados:**
- `bot_session` - Sessão do WhatsApp
- `bot_logs` - Logs da aplicação  
- `bot_exports` - Exports de contatos
- `bot_config` - Configurações

---

## 🧪 FASE 4: TESTAR E VALIDAR

### ❌ PASSO 4.1: Deploy Inicial
**Status: ⏳ PENDENTE**

**O que vamos testar:**
- [ ] Stack iniciando sem erros
- [ ] QR Code sendo exibido nos logs
- [ ] Bot conectando ao WhatsApp
- [ ] Comandos funcionando

### ❌ PASSO 4.2: Teste de Auto-Update
**Status: ⏳ PENDENTE**

**O que vamos testar:**
- [ ] Fazer mudança pequena no código
- [ ] Push para repositório
- [ ] Verificar se Portainer atualizou automaticamente
- [ ] Confirmar que bot ainda funciona

### ❌ PASSO 4.3: Teste de Persistência
**Status: ⏳ PENDENTE**

**O que vamos testar:**
- [ ] Reiniciar stack
- [ ] Verificar se sessão WhatsApp persiste
- [ ] Verificar se logs são mantidos
- [ ] Confirmar funcionamento pós-restart

---

## 📚 FASE 5: DOCUMENTAÇÃO E MANUTENÇÃO

### ❌ PASSO 5.1: Documentar Processo
**Status: ⏳ PENDENTE**

**O que vamos documentar:**
- [ ] Como fazer atualizações via Git
- [ ] Como verificar logs no Portainer
- [ ] Como fazer backup da sessão WhatsApp
- [ ] Troubleshooting comum

### ❌ PASSO 5.2: Criar Guia de Manutenção
**Status: ⏳ PENDENTE**

**Guia incluirá:**
- [ ] Comandos úteis
- [ ] Como monitorar a aplicação
- [ ] Como resolver problemas comuns
- [ ] Processo de rollback se algo der errado

---

## 🔄 FLUXO DE ATUALIZAÇÕES FUTURAS

### Quando você quiser atualizar o bot:

1. **Fazer mudanças localmente:**
   ```bash
   # Editar código
   # Testar localmente com: docker-compose up
   ```

2. **Enviar para Git:**
   ```bash
   git add .
   git commit -m "Descrição da mudança"
   git push origin main
   ```

3. **Portainer atualiza automaticamente:**
   - Webhook detecta o push
   - Baixa código atualizado
   - Reconstrói e reinicia a stack
   - Bot volta a funcionar com as mudanças

4. **Verificar funcionamento:**
   - Checar logs no Portainer
   - Testar comandos do bot

---

## 📞 INFORMAÇÕES DE CONTATO E SUPORTE

### Se algo der errado:
1. **Verificar logs no Portainer**
2. **Consultar este guia**
3. **Verificar se variáveis de ambiente estão corretas**
4. **Fazer rollback se necessário**

---

## 🎯 PRÓXIMO PASSO

**AGORA VAMOS COMEÇAR!**

Me confirme:
1. Qual a URL do seu Portainer?
2. Quer criar repositório público ou privado no GitHub?
3. Que nome quer dar ao repositório?

**Após essas informações, começamos pelo PASSO 1.1! 🚀**
