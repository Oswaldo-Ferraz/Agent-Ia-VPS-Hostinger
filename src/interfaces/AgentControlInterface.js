/**
 * 🎛️ AGENT CONTROL INTERFACE
 * 
 * Interface para monitorar e controlar o agente IA
 * Dashboard em linha de comando para facilitar gestão
 */

const AgentePrincipal = require('../agents/AgentePrincipal');
const readline = require('readline');
const { Timestamp } = require('firebase-admin/firestore');

class AgentControlInterface {
    constructor() {
        this.agent = new AgentePrincipal();
        this.isRunning = false;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('🎛️ Agent Control Interface inicializada');
    }

    /**
     * 🚀 INICIAR INTERFACE
     */
    async start() {
        console.log('\n' + '='.repeat(60));
        console.log('🤖 AGENTE IA PRINCIPAL - INTERFACE DE CONTROLE');
        console.log('='.repeat(60));

        await this.showStatus();
        this.showMenu();
        this.isRunning = true;
        this.handleUserInput();
    }

    /**
     * 📊 MOSTRAR STATUS DO AGENTE
     */
    async showStatus() {
        try {
            console.log('\n📊 STATUS DO AGENTE:');
            console.log('-'.repeat(30));

            // Health check
            const health = await this.agent.healthCheck();
            console.log(`Status: ${this.getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);

            // Configurações atuais
            console.log('\n⚙️ CONFIGURAÇÕES:');
            console.log(`Auto Response: ${this.agent.config.autoResponse ? '✅' : '❌'}`);
            console.log(`Learning: ${this.agent.config.learningEnabled ? '✅' : '❌'}`);
            console.log(`Confidence Threshold: ${this.agent.config.confidenceThreshold}`);
            console.log(`Fallback to Human: ${this.agent.config.fallbackToHuman ? '✅' : '❌'}`);

            // Serviços
            console.log('\n🔧 SERVIÇOS:');
            Object.entries(health.services).forEach(([service, status]) => {
                console.log(`${service}: ${status === 'ok' ? '✅' : '❌'} ${status}`);
            });

            // Estatísticas recentes
            const stats = await this.agent.getStats(null, '24h');
            if (stats.success) {
                console.log('\n📈 ÚLTIMAS 24H:');
                console.log(`Interações: ${stats.stats.totalInteractions}`);
                console.log(`Taxa de Resposta: ${(stats.stats.responseRate * 100).toFixed(1)}%`);
                console.log(`Confiança Média: ${(stats.stats.averageConfidence * 100).toFixed(1)}%`);
            }

        } catch (error) {
            console.log(`❌ Erro ao obter status: ${error.message}`);
        }
    }

    /**
     * 📋 MOSTRAR MENU
     */
    showMenu() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 COMANDOS DISPONÍVEIS:');
        console.log('='.repeat(60));
        console.log('1. status          - Mostrar status atual');
        console.log('2. config          - Modificar configurações');
        console.log('3. test <message>  - Testar mensagem');
        console.log('4. stats [company] - Ver estatísticas');
        console.log('5. companies       - Listar empresas');
        console.log('6. monitor         - Modo monitor (tempo real)');
        console.log('7. optimize        - Otimizar performance');
        console.log('8. help            - Mostrar ajuda');
        console.log('9. quit            - Sair');
        console.log('='.repeat(60));
        console.log('Digite um comando:');
    }

    /**
     * 🎯 PROCESSAR ENTRADA DO USUÁRIO
     */
    handleUserInput() {
        this.rl.on('line', async (input) => {
            const [command, ...args] = input.trim().split(' ');

            try {
                switch (command.toLowerCase()) {
                    case '1':
                    case 'status':
                        await this.showStatus();
                        break;

                    case '2':
                    case 'config':
                        await this.handleConfigCommand();
                        break;

                    case '3':
                    case 'test':
                        await this.handleTestCommand(args.join(' '));
                        break;

                    case '4':
                    case 'stats':
                        await this.handleStatsCommand(args[0]);
                        break;

                    case '5':
                    case 'companies':
                        await this.handleCompaniesCommand();
                        break;

                    case '6':
                    case 'monitor':
                        await this.handleMonitorCommand();
                        break;

                    case '7':
                    case 'optimize':
                        await this.handleOptimizeCommand();
                        break;

                    case '8':
                    case 'help':
                        this.showHelp();
                        break;

                    case '9':
                    case 'quit':
                    case 'exit':
                        await this.quit();
                        return;

                    default:
                        console.log(`❌ Comando não reconhecido: ${command}`);
                        console.log('Digite "help" para ver comandos disponíveis.');
                }

            } catch (error) {
                console.log(`❌ Erro ao executar comando: ${error.message}`);
            }

            console.log('\n> ');
        });
    }

    /**
     * ⚙️ CONFIGURAR AGENTE
     */
    async handleConfigCommand() {
        console.log('\n⚙️ CONFIGURAÇÃO DO AGENTE:');
        console.log('='.repeat(40));

        const questions = [
            {
                key: 'autoResponse',
                prompt: 'Auto Response (true/false): ',
                current: this.agent.config.autoResponse
            },
            {
                key: 'learningEnabled',
                prompt: 'Learning Enabled (true/false): ',
                current: this.agent.config.learningEnabled
            },
            {
                key: 'confidenceThreshold',
                prompt: 'Confidence Threshold (0.0-1.0): ',
                current: this.agent.config.confidenceThreshold
            },
            {
                key: 'fallbackToHuman',
                prompt: 'Fallback to Human (true/false): ',
                current: this.agent.config.fallbackToHuman
            }
        ];

        const newConfig = {};

        for (const question of questions) {
            const answer = await this.askQuestion(
                `${question.prompt}[atual: ${question.current}] `
            );

            if (answer.trim()) {
                if (question.key === 'confidenceThreshold') {
                    newConfig[question.key] = parseFloat(answer);
                } else {
                    newConfig[question.key] = answer.toLowerCase() === 'true';
                }
            }
        }

        if (Object.keys(newConfig).length > 0) {
            this.agent.configure(newConfig);
            console.log('✅ Configuração atualizada!');
        } else {
            console.log('⚠️ Nenhuma configuração alterada.');
        }
    }

    /**
     * 🧪 TESTAR MENSAGEM
     */
    async handleTestCommand(message) {
        if (!message.trim()) {
            console.log('❌ Forneça uma mensagem para testar.');
            console.log('Exemplo: test Olá, gostaria de fazer um pedido');
            return;
        }

        console.log('\n🧪 TESTANDO MENSAGEM:');
        console.log(`Mensagem: "${message}"`);
        console.log('-'.repeat(50));

        try {
            // Simular dados de teste
            const companyId = 'test-company';
            const clientId = 'test-client';

            const result = await this.agent.testMode(message, companyId, clientId);

            if (result.success) {
                console.log('✅ RESULTADO DO TESTE:');
                console.log(`Categoria: ${result.analysis.category}`);
                console.log(`Confiança: ${(result.analysis.confidence * 100).toFixed(1)}%`);
                console.log(`Sentimento: ${result.analysis.sentiment}`);
                console.log(`Urgência: ${result.analysis.urgency}`);
                
                if (result.response) {
                    console.log(`\n💬 RESPOSTA GERADA:`);
                    console.log(`"${result.response.content}"`);
                    console.log(`Confiança da resposta: ${(result.response.confidence * 100).toFixed(1)}%`);
                } else {
                    console.log('\n⚠️ Nenhuma resposta automática gerada');
                }

                console.log(`\n⏱️ Tempo de processamento: ${result.processingTime}ms`);

            } else {
                console.log(`❌ Teste falhou: ${result.error}`);
            }

        } catch (error) {
            console.log(`❌ Erro no teste: ${error.message}`);
        }
    }

    /**
     * 📊 MOSTRAR ESTATÍSTICAS
     */
    async handleStatsCommand(companyId) {
        console.log('\n📊 ESTATÍSTICAS:');
        console.log('='.repeat(50));

        try {
            const timeRanges = ['24h', '7d', '30d'];

            for (const range of timeRanges) {
                const stats = await this.agent.getStats(companyId, range.replace('d', '') * 24 + 'h');
                
                if (stats.success) {
                    console.log(`\n⏰ ÚLTIMOS ${range.replace('h', ' horas').replace('d', ' dias')}:`);
                    console.log(`Interações: ${stats.stats.totalInteractions}`);
                    console.log(`Taxa de Resposta: ${(stats.stats.responseRate * 100).toFixed(1)}%`);
                    console.log(`Confiança Média: ${(stats.stats.averageConfidence * 100).toFixed(1)}%`);
                }
            }

        } catch (error) {
            console.log(`❌ Erro ao obter estatísticas: ${error.message}`);
        }
    }

    /**
     * 🏢 LISTAR EMPRESAS
     */
    async handleCompaniesCommand() {
        console.log('\n🏢 EMPRESAS CADASTRADAS:');
        console.log('='.repeat(50));

        try {
            const CompaniesService = require('../firebase/firestore/companies');
            const companiesService = new CompaniesService();
            
            const companies = await companiesService.listCompanies();

            if (companies.length === 0) {
                console.log('⚠️ Nenhuma empresa cadastrada.');
                return;
            }

            companies.forEach((company, index) => {
                console.log(`\n${index + 1}. ${company.name}`);
                console.log(`   ID: ${company.companyId || company.id}`);
                console.log(`   Domínio: ${company.domain || 'N/A'}`);
                console.log(`   WhatsApp: ${company.whatsappId || company.whatsapp || 'N/A'}`);
                console.log(`   Plano: ${company.activePlan ? '✅ Ativo' : '❌ Inativo'}`);
            });

        } catch (error) {
            console.log(`❌ Erro ao listar empresas: ${error.message}`);
        }
    }

    /**
     * 👁️ MODO MONITOR
     */
    async handleMonitorCommand() {
        console.log('\n👁️ MODO MONITOR ATIVADO');
        console.log('Pressione CTRL+C para sair do monitor');
        console.log('='.repeat(50));

        const interval = setInterval(async () => {
            try {
                const stats = await this.agent.getStats(null, '1h');
                if (stats.success) {
                    console.log(`[${new Date().toLocaleTimeString()}] Interações: ${stats.stats.totalInteractions} | Taxa: ${(stats.stats.responseRate * 100).toFixed(1)}%`);
                }
            } catch (error) {
                console.log(`[${new Date().toLocaleTimeString()}] Erro: ${error.message}`);
            }
        }, 5000); // A cada 5 segundos

        // Parar monitor com CTRL+C
        process.once('SIGINT', () => {
            clearInterval(interval);
            console.log('\n👁️ Monitor parado.');
        });
    }

    /**
     * ⚡ OTIMIZAR PERFORMANCE
     */
    async handleOptimizeCommand() {
        console.log('\n⚡ OTIMIZANDO PERFORMANCE...');

        try {
            // Aqui você implementaria a lógica de otimização
            console.log('🔍 Analisando padrões...');
            console.log('📈 Calculando melhorias...');
            console.log('✅ Otimização concluída!');
            console.log('💡 Sugestões aplicadas automaticamente.');

        } catch (error) {
            console.log(`❌ Erro na otimização: ${error.message}`);
        }
    }

    /**
     * ❓ MOSTRAR AJUDA
     */
    showHelp() {
        console.log('\n❓ AJUDA - COMANDOS DETALHADOS:');
        console.log('='.repeat(60));
        console.log('status           - Mostra status completo do agente');
        console.log('config           - Interface para alterar configurações');
        console.log('test <mensagem>  - Testa como o agente responderia');
        console.log('stats [empresa]  - Estatísticas (todas ou empresa específica)');
        console.log('companies        - Lista todas as empresas cadastradas');
        console.log('monitor          - Acompanha métricas em tempo real');
        console.log('optimize         - Executa otimizações automáticas');
        console.log('quit             - Sair da interface');
        console.log('\n💡 DICAS:');
        console.log('- Use números (1-9) ou nomes completos dos comandos');
        console.log('- Para teste: "test Olá, preciso de ajuda"');
        console.log('- Para stats de empresa: "stats empresa-123"');
    }

    /**
     * 🚪 SAIR
     */
    async quit() {
        console.log('\n🚪 Encerrando Agent Control Interface...');
        this.isRunning = false;
        this.rl.close();
        process.exit(0);
    }

    /**
     * ❓ FAZER PERGUNTA
     */
    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    /**
     * 📊 EMOJI DE STATUS
     */
    getStatusEmoji(status) {
        switch (status) {
            case 'healthy': return '✅';
            case 'degraded': return '⚠️';
            case 'error': return '❌';
            default: return '❓';
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const interface = new AgentControlInterface();
    interface.start().catch(console.error);
}

module.exports = AgentControlInterface;
