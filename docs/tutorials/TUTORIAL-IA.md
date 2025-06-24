# 🤖 TUTORIAL PARA IA's - VPS Agent

## ⚡ ACESSO RÁPIDO

Para usar este projeto, qualquer IA deve:

1. **Executar**: `npm start`
2. **Testar conectividade**: comando `diagnostico`
3. **Ver capacidades**: comando `help` ou `menu`

## 🎯 COMANDOS PARA IA's TESTAREM

### ✅ Teste de Conectividade (SEMPRE PRIMEIRO)
```bash
diagnostico
```
**Esperado**: Retorna IP, containers, disco, memória, portas

### ✅ Verificação de Serviços
```bash
status          # Containers Docker
portainer       # Status Portainer (deve retornar "✅ funcionando")  
```

### ✅ Monitoramento Sistema
```bash
disk            # Deve mostrar ~20% usado, 78G livres
memory          # Deve mostrar ~1.2Gi usado, 6.3Gi disponível
ip              # Deve retornar: 147.79.83.6
```

### ✅ Docker Management
```bash
containers      # Lista todos (ativo + parado)
images          # Imagens disponíveis
```

## 🚨 COMANDOS SEGUROS vs PERIGOSOS

### ✅ SEMPRE SEGUROS (só leitura)
```bash
status, diagnostico, portainer, disk, memory, cpu, ip, ports, logs, containers, images, help, menu
```

### ⚠️ USAR COM CUIDADO (modificam sistema)
```bash
cleanup         # Limpa Docker (pode remover dados não utilizados)
restart-docker  # Restart serviço Docker
ssh "comando"   # Comando personalizado
```

### 🚫 NUNCA USAR (perigosos)
```bash
ssh "shutdown"
ssh "rm -rf /"
ssh "systemctl stop docker"
```

## 📋 CHECKLIST PARA IA's

Quando assumir este projeto:

1. ✅ Executar `diagnostico` - confirma conectividade
2. ✅ Verificar se IP retorna `147.79.83.6`
3. ✅ Confirmar Portainer com status "funcionando"
4. ✅ Ver containers ativos com `status`
5. ✅ Verificar recursos com `disk` e `memory`

Se algum desses falhar = problema na VPS ou conectividade.

## 🎪 CASOS DE USO COMUNS

### 🔍 "Verifique se tudo está OK"
```bash
diagnostico
```

### 🐳 "Tem algum container com problema?"
```bash
status
# Se encontrar problema:
ssh "docker logs nome_container"
```

### 💾 "VPS está com pouco espaço?"
```bash
disk
# Se > 80% usado = atenção
```

### 🌐 "Site está fora do ar?"
```bash
portainer
ports
# Verificar se portas 80/443 estão abertas
```

### 🧹 "Limpar lixo do Docker"
```bash
cleanup
# Remove images, containers e volumes não utilizados
```

## 🔧 RESOLUÇÃO DE PROBLEMAS

### ❌ "Erro SSH/Conexão"
- Verificar VPS_PASSWORD no .env
- IP pode ter mudado
- VPS pode estar offline

### ❌ "Container não responde"
```bash
ssh "docker restart nome_container"
```

### ❌ "Portainer fora do ar"
```bash
ssh "docker ps | grep portainer"
ssh "docker restart portainer_portainer.*"
```

### ❌ "Pouco espaço em disco"
```bash
cleanup
ssh "docker volume prune -f"
```

## 📊 VALORES NORMAIS (BASELINE)

- **Disk**: ~20% usado (normal)
- **Memory**: ~1-2GB usado de 7.8GB (normal)
- **Containers**: ~10 containers ativos (normal)
- **Portainer**: HTTP 200 (normal)
- **Portas**: 80, 443, 9000, 9443 abertas (normal)

## 🎯 RESUMO PARA IA

**Este projeto = CLI simples para gerenciar VPS via SSH**
- Conecta automaticamente 
- Comandos organizados por categoria
- Foco em monitoramento e diagnóstico
- Interface amigável em português
- Histórico de comandos seguros pré-testados

**Meta**: Tornar administração VPS mais fácil e acessível via linha de comando.

### ⚠️ Gerenciamento de Senha
```bash
trocar-senha    # Informações sobre como trocar senha
check-passwd    # Verificar se comando passwd disponível
auth-logs       # Logs de autenticação
```

## 🔐 SEGURANÇA - TROCA DE SENHA

### ✅ CAPACIDADES CONFIRMADAS:
- Comando `passwd` disponível: ✅ /usr/bin/passwd
- Usuário atual: root (acesso total)
- Sistema: Ubuntu/Debian

### 🔧 COMO TROCAR SENHA (se necessário):
```bash
ssh "passwd"        # Solicita nova senha interativamente
```

### 🚨 CUIDADOS CRÍTICOS:
1. **SEMPRE** anotar nova senha antes de trocar
2. **TESTAR** nova senha antes de desconectar  
3. **ATUALIZAR** arquivo .env após troca
4. **RISCO**: Perder acesso se esquecer senha

### ⚠️ NÃO RECOMENDADO:
- Trocar senha via script automático
- Trocar sem backup da senha atual
- Trocar sem testar conexão nova
