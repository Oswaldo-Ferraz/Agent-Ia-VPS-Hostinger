# 🚀 EXEMPLOS PRÁTICOS - WORDPRESS VIA TERMINAL

## 🌐 **4 SITES WORDPRESS ATIVOS:**
1. ✅ **agenciafer.com.br** - Agência/Portfolio
2. ✅ **aiofotoevideo.com.br** - Fotografia/Vídeo  
3. ✅ **malucosta.com.br** - Site Pessoal
4. ✅ **metodoverus.com.br** - Método/Curso

---

## 📋 **AÇÕES PRÁTICAS QUE PODEMOS FAZER:**

### 🎯 **1. GERENCIAMENTO BÁSICO**
```bash
# Ver informações do site
node wp-manager.js info

# Alterar título do site
node wp-manager.js set-title

# Alterar descrição
node wp-manager.js set-description

# Verificar atualizações
node wp-manager.js status
```

### 📝 **2. CRIAÇÃO DE CONTEÚDO**
```bash
# Criar post automaticamente
node wp-manager.js create-post

# Criar nova página
node wp-manager.js create-page

# Ver todos os posts
node wp-manager.js posts

# Ver todas as páginas
node wp-manager.js pages
```

### 🎨 **3. TEMAS E DESIGN**
```bash
# Ver temas instalados
node wp-manager.js themes

# Ver tema ativo
node wp-manager.js active-theme

# Instalar novo tema via SSH:
cd domains/SITE/public_html
wp theme install [nome-tema] --activate
```

### 🔌 **4. PLUGINS ESSENCIAIS**
```bash
# Instalar SEO (Yoast)
node wp-manager.js install-seo

# Instalar segurança (Wordfence)
node wp-manager.js install-security

# Instalar backup (UpdraftPlus)
node wp-manager.js install-backup

# Ver plugins instalados
node wp-manager.js plugins
```

### 🔄 **5. ATUALIZAÇÕES**
```bash
# Atualizar tudo (WordPress + plugins + temas)
node wp-manager.js update-all

# Atualizar só o WordPress
node wp-manager.js update-core
```

### 👥 **6. USUÁRIOS**
```bash
# Ver usuários do site
node wp-manager.js users

# Criar novo usuário via SSH:
cd domains/SITE/public_html
wp user create novouser email@exemplo.com --role=editor
```

### 💾 **7. BACKUP E SEGURANÇA**
```bash
# Fazer backup do banco
node wp-manager.js backup-db

# Backup completo via SSH:
cd domains/SITE/public_html
tar -czf backup-completo-$(date +%Y%m%d).tar.gz .
```

### 🔍 **8. SEO E OTIMIZAÇÃO**
```bash
# Configurar permalinks SEO-friendly
node wp-manager.js seo-permalinks

# Via SSH - outras otimizações:
cd domains/SITE/public_html
wp rewrite flush
wp db optimize
```

---

## 🎯 **EXEMPLOS ESPECÍFICOS POR SITE:**

### 🏢 **AGENCIAFER.COM.BR** (Agência)
```bash
# Criar portfolio
wp post create --post_type=page --post_title="Portfolio" --post_status=publish

# Instalar Elementor
wp plugin install elementor --activate

# Criar post de projeto
wp post create --post_title="Projeto Cliente X" --post_category=portfolio --post_status=publish
```

### 📸 **AIOFOTOEVIDEO.COM.BR** (Fotografia)
```bash
# Criar galeria
wp plugin install nextgen-gallery --activate

# Criar post com categoria
wp term create category "Casamentos" --slug=casamentos
wp post create --post_title="Casamento João e Maria" --post_category=casamentos --post_status=publish

# Instalar tema específico
wp theme install fotografo --activate
```

### 👤 **MALUCOSTA.COM.BR** (Pessoal)
```bash
# Criar página Sobre
wp post create --post_type=page --post_title="Sobre Mim" --post_status=publish

# Criar blog pessoal
wp term create category "Reflexões" --slug=reflexoes
wp post create --post_title="Minha Jornada" --post_category=reflexoes --post_status=publish
```

### 🎓 **METODOVERUS.COM.BR** (Curso/Método)
```bash
# Instalar LMS
wp plugin install learnpress --activate

# Criar página de curso
wp post create --post_type=page --post_title="Método Verus" --post_status=publish

# Instalar WooCommerce para vendas
wp plugin install woocommerce --activate
```

---

## 🚀 **AÇÕES AVANÇADAS VIA SSH DIRETO:**

### 📱 **Criar Subdomínio:**
```bash
# 1. Criar no painel Hostinger primeiro
# 2. Configurar WordPress:
cd domains/SITE/public_html
wp search-replace "https://site.com" "https://blog.site.com"
```

### 🛒 **Transformar em E-commerce:**
```bash
cd domains/SITE/public_html
wp plugin install woocommerce --activate
wp wc tool run install_pages
wp plugin install woocommerce-gateway-stripe --activate
```

### 🔄 **Migrar Conteúdo:**
```bash
# Exportar de um site
cd domains/site1/public_html
wp export --dir=/tmp/

# Importar para outro
cd domains/site2/public_html
wp import /tmp/export.xml
```

### 🎨 **Personalização Avançada:**
```bash
# Criar child theme
wp scaffold child-theme meu-tema-child --parent_theme=twentytwentyfour

# Adicionar CSS personalizado
echo ".custom { color: red; }" >> wp-content/themes/tema-ativo/style.css
```

---

## ⚡ **COMANDOS RÁPIDOS ESSENCIAIS:**

```bash
# Acesso rápido
ssh -p 65002 u148368058@147.93.37.192

# Status de todos os sites
for site in agenciafer.com.br aiofotoevideo.com.br malucosta.com.br metodoverus.com.br; do
  echo "=== $site ==="
  cd domains/$site/public_html && wp core version
done

# Backup de todos os sites
for site in agenciafer.com.br aiofotoevideo.com.br malucosta.com.br metodoverus.com.br; do
  cd domains/$site/public_html
  wp db export backup-$site-$(date +%Y%m%d).sql
done
```

**🎯 COM ESSAS FERRAMENTAS VOCÊ TEM CONTROLE TOTAL DOS 4 SITES WORDPRESS!**
