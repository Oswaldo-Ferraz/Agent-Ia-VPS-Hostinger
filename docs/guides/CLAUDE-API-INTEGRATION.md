# 🧠 CLAUDE API INTEGRATION

Este documento explica como usar a integração com Claude API para criar páginas, sistemas e formulários automaticamente no WordPress.

## 🚀 Configuração Inicial

### 1. Obter Claude API Key

1. Acesse [Anthropic Console](https://console.anthropic.com/)
2. Faça login ou crie uma conta
3. Vá em **API Keys**
4. Clique em **Create Key**
5. Copie a chave (formato: `sk-ant-api03-...`)

### 2. Configurar no Projeto

```bash
# Executar setup automático
./setup-claude-api.sh

# OU configurar manualmente no .env
CLAUDE_API_KEY=sk-ant-api03-sua-chave-aqui
```

### 3. Iniciar o Agente IA

```bash
node ai-agent-advanced.js
```

---

## 🎯 Comandos Principais

### 📝 Criação de Páginas

```bash
create-page [site] [descrição]
```

**Exemplos:**
```bash
create-page agenciafer.com.br página de contato moderna com formulário
create-page metodoverus.com.br página sobre nossa empresa
create-page aiofotoevideo.com.br portfolio de trabalhos fotográficos
```

**O que faz:**
- Solicita à Claude geração de código HTML/CSS/JS
- Cria template PHP personalizado
- Instala no WordPress automaticamente
- Retorna URL da página criada

### 📤 Formulários de Upload

```bash
create-upload [site] [email-destino]
```

**Exemplos:**
```bash
create-upload agenciafer.com.br contato@agenciafer.com.br
create-upload metodoverus.com.br propostas@metodoverus.com.br
```

**Funcionalidades incluídas:**
- Upload seguro de arquivos (PDF, DOC, JPG, PNG)
- Validação de tipos e tamanhos
- Envio automático por email
- Interface responsiva moderna
- Proteção anti-spam

### 🏗️ Sistemas Completos

```bash
create-system [site] [tipo] [parâmetros]
```

**Tipos disponíveis:**

#### Landing Page
```bash
create-system agenciafer.com.br landing-page curso de marketing digital
```
- Hero section impactante
- Seções de benefícios
- Depoimentos
- Formulário de conversão
- Design responsivo

#### Sistema de Contato
```bash
create-system metodoverus.com.br contact-system contato@metodoverus.com.br
```
- Formulário completo
- Validação avançada
- Email automático
- Mapa de localização
- Informações da empresa

#### Portfólio
```bash
create-system aiofotoevideo.com.br portfolio trabalhos fotográficos
```
- Grid responsivo
- Modal/lightbox
- Filtros por categoria
- Animações suaves
- Integração social

#### Blog System
```bash
create-system malucosta.com.br blog-system notícias corporativas
```
- Lista de posts
- Paginação
- Categorias
- Busca avançada
- Newsletter

### 🤖 Assistente IA Geral

```bash
ai [sua pergunta ou solicitação]
```

**Exemplos:**
```bash
ai como criar uma loja online no meu site
ai preciso de uma página de vendas para meu curso
ai como configurar um sistema de agendamento
ai quero melhorar o SEO do meu site
```

---

## 🌐 Gestão de Subdomínios

### Criar Subdomínio

```bash
create-subdomain [nome] [site-principal] [propósito]
```

**Exemplos:**
```bash
create-subdomain loja agenciafer.com.br wordpress ecommerce
create-subdomain blog metodoverus.com.br wordpress corporativo
create-subdomain app aiofotoevideo.com.br sistema galeria
```

### Deploy Completo

```bash
deploy-site [subdominio] [site-principal] [tipo]
```

**Exemplo:**
```bash
deploy-site shop agenciafer.com.br wordpress
```

**O que faz:**
1. Cria subdomínio
2. Instala WordPress
3. Configura estrutura básica
4. Cria página inicial
5. Configura redirecionamentos

---

## 🔧 Utilitários

### Verificar Status

```bash
status
```
Mostra status de todos os sites WordPress configurados.

### Testar Claude API

```bash
test-claude
```
Verifica se a conexão com Claude API está funcionando.

### Listar Sites

```bash
sites
```
Mostra todos os sites disponíveis para gerenciamento.

---

## 💡 Casos de Uso Práticos

### 1. Criar Site de Empresa Completo

```bash
# 1. Criar subdomínio
create-subdomain empresa agenciafer.com.br wordpress

# 2. Página inicial
create-page agenciafer.com.br página inicial corporativa moderna

# 3. Sistema de contato
create-system agenciafer.com.br contact-system contato@agenciafer.com.br

# 4. Portfólio
create-system agenciafer.com.br portfolio nossos projetos

# 5. Blog
create-system agenciafer.com.br blog-system notícias da empresa
```

### 2. Landing Page para Produto

```bash
# Criar landing completa
create-system metodoverus.com.br landing-page curso de programação online

# Adicionar formulário de interesse
create-upload metodoverus.com.br vendas@metodoverus.com.br
```

### 3. Site de Portfólio Fotográfico

```bash
# Página principal
create-page aiofotoevideo.com.br galeria principal de fotografias

# Sistema de portfólio
create-system aiofotoevideo.com.br portfolio trabalhos fotográficos

# Formulário para orçamentos
create-upload aiofotoevideo.com.br orcamento@aiofotoevideo.com.br
```

---

## 🎨 Personalização Avançada

### Prompts Personalizados

O agente usa prompts otimizados para diferentes tipos de conteúdo:

- **WordPress Pages**: Código semântico e responsivo
- **Upload Forms**: Segurança e validação completa
- **Landing Pages**: Foco em conversão
- **Portfolios**: Design visual atrativo

### Modificar Comportamento

Você pode pedir modificações específicas:

```bash
ai modifique a página de contato para incluir chat online
ai adicione animações CSS à landing page
ai configure validação extra no formulário de upload
```

---

## 🔒 Segurança

### Validações Automáticas

- **Arquivos**: Tipos e tamanhos validados
- **Formulários**: Proteção CSRF/XSS
- **Uploads**: Diretórios seguros
- **Emails**: Sanitização de dados

### Boas Práticas

- Chaves API protegidas no `.env`
- Validação server-side sempre
- Logs de atividades
- Backup automático

---

## 🐛 Troubleshooting

### Problemas Comuns

**Claude API não responde:**
```bash
test-claude
```

**Página não criada:**
- Verificar permissões WordPress
- Conferir tema ativo
- Validar conexão SSH

**Upload não funciona:**
- Verificar permissões de escrita
- Conferir configuração de email
- Validar tamanhos máximos

### Logs e Debug

```bash
# Ver logs do WordPress
ai mostrar logs de erro do site

# Testar conexão
status

# Verificar configuração
sites
```

---

## 📈 Próximas Funcionalidades

- **E-commerce**: Integração WooCommerce
- **SEO**: Otimização automática
- **Analytics**: Relatórios integrados
- **Backup**: Sistema automático
- **Cache**: Otimização de performance

---

## 🤝 Suporte

Para dúvidas ou problemas:

1. **Documentação**: Consulte `README.md`
2. **Assistente IA**: Use `ai [sua dúvida]`
3. **Status**: Verifique com `status`
4. **Logs**: Analise erros específicos

**Exemplo de solicitação de ajuda:**
```bash
ai estou com problema para criar formulário de upload, pode me ajudar?
```
