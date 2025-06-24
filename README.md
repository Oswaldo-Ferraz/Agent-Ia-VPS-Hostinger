# 🤖 VPS Agent

Agente simples para acesso e gerenciamento de VPS via SSH.

## 🚀 Como usar

```bash
# 1. Configure
cp .env.example .env
# Edite .env com sua senha VPS

# 2. Instale
npm install

# 3. Execute
npm start
```

## 📋 Comandos

- `status` - Status containers Docker
- `containers` - Lista todos containers  
- `disk` - Uso do disco
- `memory` - Uso da memória
- `ip` - IP público
- `ports` - Portas abertas
- `diagnostico` - Diagnóstico completo
- `portainer` - Verifica Portainer
- `ssh [comando]` - Comando personalizado
- `help` - Lista comandos
- `exit` - Sair

## 🔧 Requisitos

- Node.js
- sshpass (`brew install hudochenkov/sshpass/sshpass` no macOS)

Super simples! 🎯
