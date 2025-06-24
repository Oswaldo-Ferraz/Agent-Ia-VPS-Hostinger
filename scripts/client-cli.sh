#!/bin/bash

# Script para comandos rápidos do sistema multi-cliente

case "$1" in
    "list")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.listClientsWithIntegrations().then(clients => {
            console.log('📋 CLIENTES CONFIGURADOS:');
            clients.forEach(client => {
                console.log(\`  • \${client.name} (\${client.sites.length} sites, \${client.integration_count} integrações)\`);
            });
        });
        "
        ;;
    "stats")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.getSystemReport().then(report => {
            console.log('📊 ESTATÍSTICAS DO SISTEMA:');
            console.log('Total de clientes:', report.clients.total_clients);
            console.log('Clientes ativos:', report.clients.active_clients);
            console.log('Total de sites:', report.clients.total_sites);
            console.log('Cobertura de credenciais:', report.health.coverage_percentage + '%');
        });
        "
        ;;
    "backup")
        node -e "
        const MultiClientSystem = require('./src/core/multi-client-system');
        const system = new MultiClientSystem();
        system.backupSystem().then(result => {
            console.log('💾 Backup realizado:', result.timestamp);
        });
        "
        ;;
    *)
        echo "Uso: $0 {list|stats|backup}"
        echo ""
        echo "Comandos disponíveis:"
        echo "  list   - Listar todos os clientes"
        echo "  stats  - Mostrar estatísticas do sistema" 
        echo "  backup - Fazer backup completo"
        ;;
esac
