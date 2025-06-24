# 🤖 GUIA: NOVA LÓGICA DUAL IA - Claude + OpenAI

## 📋 VISÃO GERAL

O sistema agora usa **duas IAs especializadas** com **lógica inteligente** para escolher automaticamente qual usar:

- **🧠 Claude**: Código, sistemas, estruturas, desenvolvimento técnico
- **📝 OpenAI**: Conteúdo, textos, copywriting, marketing

## 🎯 REGRAS DE ESCOLHA AUTOMÁTICA

### 🧠 SEMPRE CLAUDE (Desenvolvimento)
```bash
# Comandos que sempre usam Claude
create-page        # Páginas WordPress
create-plugin      # Plugins WordPress  
create-form        # Formulários personalizados
create-dashboard   # Dashboards administrativos
create-upload      # Sistemas de upload
create-system      # Sistemas técnicos
```

### 📝 SEMPRE OPENAI (Conteúdo)
```bash
# Comandos que sempre usam OpenAI
create-copy        # Copy de vendas
create-blog        # Posts de blog
create-marketing   # Campanhas de marketing
create-text        # Textos puros
create-seo         # Conteúdo SEO
```

### 🔄 DUAL IA (Ambas)
```bash
# Comandos que usam as duas IAs
create-post        # OpenAI (conteúdo) + Claude (estrutura)
create-article     # OpenAI (texto) + Claude (layout)
```

### ❓ PERGUNTA AO USUÁRIO
```bash
# Quando ambíguo, pergunta qual IA usar
create-content     # Analisa palavras-chave ou pergunta
ai                 # Analisa contexto ou pergunta
```

## 💻 COMANDOS ESPECÍFICOS CLAUDE

### 1. Criar Página WordPress
```bash
create-page agenciafer.com.br landing page de vendas moderna
create-page metodoverus.com.br página sobre nós com formulário contato
```

### 2. Criar Plugin WordPress
```bash
create-plugin malucosta.com.br sistema-membros Sistema completo de área de membros
create-plugin aiofotoevideo.com.br galeria-avancada Galeria de fotos com lightbox
```

### 3. Criar Formulário Personalizado
```bash
create-form agenciafer.com.br contato nome,email,telefone,mensagem
create-form metodoverus.com.br inscricao nome,email,curso,experiencia
```

### 4. Criar Dashboard Administrativo
```bash
create-dashboard malucosta.com.br vendas relatórios,gráficos,métricas
create-dashboard aiofotoevideo.com.br clientes lista,agendamentos,histórico
```

## 📝 COMANDOS ESPECÍFICOS OPENAI

### 1. Criar Copy de Vendas
```bash
create-copy agenciafer.com.br landing Curso de Marketing Digital
create-copy metodoverus.com.br email Mentoria Individual de Vendas
```

### 2. Criar Posts de Blog
```bash
create-blog malucosta.com.br fotografia 5
create-blog aiofotoevideo.com.br marketing-visual 3
```

### 3. Criar Campanha de Marketing
```bash
create-marketing agenciafer.com.br lancamento-curso "empreendedores iniciantes"
create-marketing metodoverus.com.br black-friday "consultores experientes"
```

## 🔄 COMANDOS DUAL IA

### 1. Criar Post Completo
```bash
# OpenAI gera o conteúdo, Claude gera a estrutura WordPress
create-post agenciafer.com.br "10 estratégias de marketing digital para 2024"
create-post malucosta.com.br "como fotografar casamentos: guia completo"
```

**O que acontece:**
1. 📝 OpenAI cria o artigo completo (título, introdução, desenvolvimento, conclusão)
2. 🧠 Claude cria a estrutura WordPress (HTML, CSS, meta tags, SEO)
3. 🔄 Sistema combina ambos e publica

### 2. Criar Conteúdo Genérico
```bash
# Analisa palavras-chave e decide automaticamente
create-content artigo "benefícios do yoga"        # → OpenAI (conteúdo)
create-content sistema "dashboard de vendas"      # → Claude (código)
create-content pagina "sobre nossa empresa"       # → Pergunta qual usar
```

## ❓ LÓGICA DE DECISÃO AUTOMÁTICA

### Palavras-chave para CLAUDE:
- página, sistema, código, formulário
- html, css, javascript, php
- plugin, theme, dashboard
- desenvolviment, programação
- api, integração, backend

### Palavras-chave para OPENAI:
- post, artigo, texto, conteúdo
- copy, redação, blog, marketing
- seo, landing, produto, serviço
- social media, email, campanha

### Quando PERGUNTA:
- Palavras-chave de ambas as IAs
- Nenhuma palavra-chave clara
- Contexto ambíguo

## 🎯 EXEMPLOS PRÁTICOS

### Cenário 1: Lançamento de Produto
```bash
# 1. Criar landing page (Claude)
create-page agenciafer.com.br "landing page curso marketing digital"

# 2. Criar copy de vendas (OpenAI)
create-copy agenciafer.com.br vendas "Curso Marketing Digital Pro"

# 3. Criar campanha completa (OpenAI)
create-marketing agenciafer.com.br "lancamento-curso" "empreendedores iniciantes"

# 4. Criar posts de blog (Dual)
create-post agenciafer.com.br "por que todo empreendedor precisa saber marketing"
```

### Cenário 2: Sistema Completo
```bash
# 1. Criar dashboard (Claude)
create-dashboard metodoverus.com.br clientes "lista,agendamentos,relatórios"

# 2. Criar formulário de cadastro (Claude)
create-form metodoverus.com.br inscricao "nome,email,telefone,interesse"

# 3. Criar sistema de upload (Claude)
create-upload metodoverus.com.br admin@metodoverus.com.br

# 4. Criar plugin personalizado (Claude)
create-plugin metodoverus.com.br "sistema-consultorias" "Gerenciamento completo de consultorias"
```

## 🛠️ COMO FORÇAR UMA IA ESPECÍFICA

Se você quiser usar uma IA específica independente da lógica automática:

### Usar Claude Diretamente:
```bash
# Adicione palavras-chave técnicas
create-content "sistema dashboard" "análise de vendas"
create-content "código html" "formulário de contato"
```

### Usar OpenAI Diretamente:
```bash
# Adicione palavras-chave de conteúdo
create-content "artigo blog" "estratégias de marketing"
create-content "copy email" "newsletter semanal"
```

### Pergunta Manual:
```bash
# Use termos neutros para ser perguntado
create-content "material" "apresentação empresa"
ai "crie algo para meu site"
```

## 🎯 DICAS DE BOAS PRÁTICAS

### 1. Seja Específico
```bash
# ✅ Bom
create-page agenciafer.com.br "página de contato com formulário e mapa"

# ❌ Genérico
create-page agenciafer.com.br "página"
```

### 2. Use Contexto
```bash
# ✅ Bom
create-post malucosta.com.br "técnicas de iluminação para retratos profissionais"

# ❌ Genérico  
create-post malucosta.com.br "fotografia"
```

### 3. Combine Comandos
```bash
# Primeiro a estrutura (Claude)
create-page agenciafer.com.br "landing page curso"

# Depois o conteúdo (OpenAI)
create-copy agenciafer.com.br landing "Curso Marketing Digital"

# Finalmente posts (Dual)
create-post agenciafer.com.br "primeiros passos no marketing digital"
```

## 🔄 FLUXO COMPLETO DE TRABALHO

### 1. Planejamento
```bash
sites                    # Ver sites disponíveis
status                   # Verificar status
```

### 2. Desenvolvimento
```bash
create-page [site] [descrição]        # Estrutura base
create-plugin [site] [nome] [desc]    # Funcionalidades
create-form [site] [tipo] [campos]    # Formulários
```

### 3. Conteúdo
```bash
create-blog [site] [nicho] [qtd]      # Posts de blog
create-copy [site] [tipo] [produto]   # Copy de vendas
create-marketing [site] [camp] [target] # Campanhas
```

### 4. Integração
```bash
create-post [site] [tópico]           # Posts completos (dual)
ai "integre tudo no site"             # Assistência geral
```

Este sistema garante que cada IA seja usada para o que faz de melhor, proporcionando resultados mais precisos e eficientes!
