# 🚀 GERENCIAMENTO COMPLETO WORDPRESS VIA TERMINAL

## 🌐 **Sites Disponíveis:**
- ✅ **agenciafer.com.br** - WordPress 6.8.1
- ✅ **aiofotoevideo.com.br** - WordPress 6.8.1  
- ✅ **malucosta.com.br** - WordPress 6.8.1
- ✅ **metodoverus.com.br** - WordPress 6.8.1

---

## 📋 **ÍNDICE DE FUNCIONALIDADES**

### 1. 🏠 [Gerenciamento Básico do Site](#gerenciamento-básico)
### 2. 📝 [Conteúdo (Posts, Páginas, Blogs)](#conteúdo)
### 3. 🎨 [Temas e Aparência](#temas)
### 4. 🔌 [Plugins e Funcionalidades](#plugins)
### 5. 🔍 [SEO e Otimização](#seo)
### 6. 👥 [Usuários e Segurança](#usuários)
### 7. 💾 [Banco de Dados e Backup](#backup)
### 8. 🛠️ [Desenvolvimento e Personalização](#desenvolvimento)
### 9. 🌐 [Domínios e Subdomínios](#domínios)
### 10. 🛒 [E-commerce e Portfolios](#ecommerce)

---

## 1. 🏠 **GERENCIAMENTO BÁSICO DO SITE** {#gerenciamento-básico}

### ✅ **Informações do Site**
```bash
# Acessar site
cd domains/[SITE]/public_html

# Verificar versão WordPress
wp core version

# Status geral do site
wp core check-update
wp plugin status
wp theme status

# Informações do site
wp option get siteurl
wp option get blogname
wp option get blogdescription
```

### ✅ **Configurações Básicas**
```bash
# Alterar título do site
wp option update blogname "Novo Título do Site"

# Alterar descrição/tagline
wp option update blogdescription "Nova descrição do site"

# Alterar URL do site
wp option update siteurl "https://novodominio.com"
wp option update home "https://novodominio.com"

# Alterar idioma
wp language core install pt_BR --activate

# Configurar timezone
wp option update timezone_string "America/Sao_Paulo"
```

### ✅ **Atualizações**
```bash
# Atualizar WordPress
wp core update

# Atualizar todos os plugins
wp plugin update --all

# Atualizar todos os temas
wp theme update --all

# Verificar atualizações disponíveis
wp core check-update
wp plugin list --update=available
wp theme list --update=available
```

---

## 2. 📝 **CONTEÚDO (POSTS, PÁGINAS, BLOGS)** {#conteúdo}

### ✅ **Criação de Conteúdo**
```bash
# Criar novo post
wp post create --post_title="Título do Post" --post_content="Conteúdo aqui" --post_status=publish

# Criar nova página
wp post create --post_type=page --post_title="Sobre Nós" --post_content="Conteúdo da página" --post_status=publish

# Criar post com categoria
wp post create --post_title="Post com Categoria" --post_content="Conteúdo" --post_category=1 --post_status=publish

# Criar rascunho
wp post create --post_title="Rascunho" --post_content="Conteúdo" --post_status=draft
```

### ✅ **Gerenciamento de Posts**
```bash
# Listar todos os posts
wp post list

# Listar posts publicados
wp post list --post_status=publish

# Listar rascunhos
wp post list --post_status=draft

# Editar post (abrir editor)
wp post edit [ID]

# Deletar post
wp post delete [ID]

# Buscar posts por palavra-chave
wp post list --s="palavra-chave"
```

### ✅ **Categorias e Tags**
```bash
# Criar categoria
wp term create category "Nova Categoria" --slug=nova-categoria

# Listar categorias
wp term list category

# Criar tag
wp term create post_tag "Nova Tag" --slug=nova-tag

# Listar tags
wp term list post_tag

# Adicionar categoria a post
wp post term add [POST_ID] category [CATEGORY_ID]
```

### ✅ **Mídia e Uploads**
```bash
# Importar imagem
wp media import imagem.jpg --title="Título da Imagem"

# Listar mídia
wp post list --post_type=attachment

# Regenerar miniaturas
wp media regenerate
```

---

## 3. 🎨 **TEMAS E APARÊNCIA** {#temas}

### ✅ **Gerenciamento de Temas**
```bash
# Listar temas instalados
wp theme list

# Ativar tema
wp theme activate [nome-do-tema]

# Instalar novo tema
wp theme install twentytwentyfour --activate

# Instalar tema do repositório
wp theme install [nome-tema] --activate

# Deletar tema
wp theme delete [nome-tema]

# Verificar tema ativo
wp theme list --status=active
```

### ✅ **Personalização**
```bash
# Listar widgets
wp widget list

# Configurar menu
wp menu create "Menu Principal"
wp menu item add-post [menu-id] [post-id]
wp menu item add-custom [menu-id] "Link Personalizado" https://exemplo.com

# Configurar página inicial
wp option update show_on_front page
wp option update page_on_front [PAGE_ID]

# Configurar página de blog
wp option update page_for_posts [PAGE_ID]
```

---

## 4. 🔌 **PLUGINS E FUNCIONALIDADES** {#plugins}

### ✅ **Gerenciamento de Plugins**
```bash
# Listar plugins
wp plugin list

# Instalar plugin
wp plugin install contact-form-7 --activate

# Ativar plugin
wp plugin activate [nome-plugin]

# Desativar plugin
wp plugin deactivate [nome-plugin]

# Deletar plugin
wp plugin delete [nome-plugin]

# Atualizar plugin específico
wp plugin update [nome-plugin]
```

### ✅ **Plugins Essenciais para Instalar**
```bash
# SEO
wp plugin install wordpress-seo --activate

# Segurança
wp plugin install wordfence --activate

# Backup
wp plugin install updraftplus --activate

# Cache/Performance
wp plugin install w3-total-cache --activate

# Formulários
wp plugin install contact-form-7 --activate

# E-commerce
wp plugin install woocommerce --activate

# Page Builder
wp plugin install elementor --activate
```

---

## 5. 🔍 **SEO E OTIMIZAÇÃO** {#seo}

### ✅ **Configurações SEO**
```bash
# Instalar Yoast SEO
wp plugin install wordpress-seo --activate

# Configurar permalinks
wp rewrite structure '/%postname%/'
wp rewrite flush

# Otimizar banco de dados
wp db optimize

# Verificar SEO de posts
wp yoast index --reindex

# Gerar sitemap
wp plugin install google-sitemap-generator --activate
```

### ✅ **Performance**
```bash
# Instalar cache
wp plugin install w3-total-cache --activate

# Otimizar imagens
wp plugin install smush --activate

# Minificar CSS/JS
wp plugin install autoptimize --activate

# Verificar velocidade (análise)
wp plugin install query-monitor --activate
```

---

## 6. 👥 **USUÁRIOS E SEGURANÇA** {#usuários}

### ✅ **Gerenciamento de Usuários**
```bash
# Listar usuários
wp user list

# Criar usuário
wp user create novousuario email@exemplo.com --role=editor --display_name="Nome do Usuário"

# Alterar senha
wp user update admin --user_pass="novasenha123"

# Alterar role
wp user set-role usuario editor

# Deletar usuário
wp user delete [ID] --reassign=[OUTRO_ID]
```

### ✅ **Segurança**
```bash
# Instalar plugin de segurança
wp plugin install wordfence --activate

# Alterar chaves de segurança
wp config shuffle-salts

# Verificar permissões de arquivo
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;

# Criar backup antes de mudanças
wp db export backup.sql
```

---

## 7. 💾 **BANCO DE DADOS E BACKUP** {#backup}

### ✅ **Backup**
```bash
# Exportar banco de dados
wp db export backup-$(date +%Y%m%d).sql

# Backup completo do site
tar -czf backup-site-$(date +%Y%m%d).tar.gz .

# Instalar plugin de backup
wp plugin install updraftplus --activate
```

### ✅ **Restauração**
```bash
# Importar banco de dados
wp db import backup.sql

# Buscar e substituir URLs
wp search-replace "https://site-antigo.com" "https://site-novo.com"

# Verificar integridade
wp db check
wp db repair
```

---

## 8. 🛠️ **DESENVOLVIMENTO E PERSONALIZAÇÃO** {#desenvolvimento}

### ✅ **Modo de Desenvolvimento**
```bash
# Ativar debug
wp config set WP_DEBUG true
wp config set WP_DEBUG_LOG true

# Ver logs de erro
tail -f wp-content/debug.log

# Informações do sistema
wp cli info
wp core version --extra
```

### ✅ **Customizações**
```bash
# Criar child theme
wp scaffold child-theme nome-child-theme --parent_theme=twentytwentyfour

# Gerar plugin
wp scaffold plugin meu-plugin

# Adicionar funções personalizadas
echo "// Função personalizada" >> wp-content/themes/[tema]/functions.php
```

---

## 9. 🌐 **DOMÍNIOS E SUBDOMÍNIOS** {#domínios}

### ✅ **Configuração de Domínios**
```bash
# Alterar domínio principal
wp search-replace "https://dominio-antigo.com" "https://novo-dominio.com"
wp option update siteurl "https://novo-dominio.com"
wp option update home "https://novo-dominio.com"

# Configurar subdomínio
# (Criar subdomínio no painel Hostinger primeiro)
# Depois configurar WordPress:
wp option update siteurl "https://blog.meusite.com"
wp option update home "https://blog.meusite.com"
```

### ✅ **Multisite (se necessário)**
```bash
# Converter para multisite
wp core multisite-convert

# Criar novo site na rede
wp site create --slug=novosite --title="Novo Site"
```

---

## 10. 🛒 **E-COMMERCE E PORTFOLIOS** {#ecommerce}

### ✅ **WooCommerce (Loja Online)**
```bash
# Instalar WooCommerce
wp plugin install woocommerce --activate

# Configurar loja
wp wc tool run install_pages

# Criar produto
wp wc product create --name="Produto Teste" --type=simple --regular_price=99.99

# Listar produtos
wp wc product list

# Configurar pagamento
wp plugin install woocommerce-gateway-stripe --activate
```

### ✅ **Portfolio**
```bash
# Instalar tema portfolio
wp theme install portfolio-press --activate

# Criar tipo de post personalizado
wp scaffold post-type portfolio

# Instalar Elementor para design
wp plugin install elementor --activate

# Instalar galeria
wp plugin install nextgen-gallery --activate
```

### ✅ **Blog/Revista**
```bash
# Instalar tema de revista
wp theme install newspaper --activate

# Configurar categorias
wp term create category "Tecnologia"
wp term create category "Negócios"
wp term create category "Lifestyle"

# Criar posts em massa
for i in {1..10}; do
  wp post create --post_title="Post $i" --post_content="Conteúdo do post $i" --post_status=publish
done
```

---

## 🚀 **COMANDOS RÁPIDOS ESSENCIAIS**

```bash
# Acesso rápido a qualquer site
cd ~/domains/[SITE]/public_html

# Status completo
wp core version && wp plugin list --status=active && wp theme list --status=active

# Backup rápido
wp db export backup-$(date +%Y%m%d).sql && tar -czf files-backup-$(date +%Y%m%d).tar.gz wp-content/

# Atualização completa
wp core update && wp plugin update --all && wp theme update --all

# Criar post rapidamente
wp post create --post_title="$1" --post_content="$2" --post_status=publish

# Verificar problemas
wp core verify-checksums && wp plugin verify-checksums
```

---

## 📞 **COMANDOS DE CONEXÃO**

```bash
# Conectar via SSH
ssh -p 65002 u148368058@147.93.37.192

# Com sshpass
sshpass -p 'pMU6XPk2k$epwC%' ssh -p 65002 u148368058@147.93.37.192

# Executar comando direto
sshpass -p 'pMU6XPk2k$epwC%' ssh -p 65002 u148368058@147.93.37.192 'cd domains/SITE/public_html && wp core version'
```

---

**🎯 COM ESSES COMANDOS VOCÊ PODE FAZER QUALQUER COISA EM WORDPRESS VIA TERMINAL!**
