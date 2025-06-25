#!/usr/bin/env node

/**
 * TESTE DA API CLAUDE - AGÊNCIA FER
 * Script para testar integração com Claude API
 * Autor: AI Agent
 * Data: 24/06/2025
 */

const fs = require('fs');
const path = require('path');

// Configuração da API Claude
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

class ClaudeAPITest {
    constructor() {
        this.apiKey = this.loadApiKey();
        this.testResults = [];
    }

    // Carregar API Key do arquivo .env
    loadApiKey() {
        try {
            const envPath = path.join(__dirname, '.env');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const match = envContent.match(/CLAUDE_API_KEY=(.+)/);
                if (match) {
                    return match[1].trim();
                }
            }
            
            // Tentar variável de ambiente
            if (process.env.CLAUDE_API_KEY) {
                return process.env.CLAUDE_API_KEY;
            }
            
            throw new Error('API Key não encontrada');
        } catch (error) {
            console.error('❌ Erro ao carregar API Key:', error.message);
            return null;
        }
    }

    // Fazer requisição para Claude API
    async makeRequest(messages, maxTokens = 1000) {
        if (!this.apiKey) {
            throw new Error('API Key não configurada');
        }

        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
        };

        const body = {
            model: CLAUDE_MODEL,
            max_tokens: maxTokens,
            messages: messages
        };

        try {
            const response = await fetch(CLAUDE_API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Erro na requisição:', error.message);
            throw error;
        }
    }

    // Teste 1: Verificar conexão básica
    async testBasicConnection() {
        console.log('🧪 Teste 1: Conexão básica com Claude API');
        
        try {
            const messages = [{
                role: 'user',
                content: 'Olá! Responda apenas: "API funcionando"'
            }];

            const response = await this.makeRequest(messages);
            
            if (response.content && response.content[0] && response.content[0].text) {
                const reply = response.content[0].text;
                console.log('✅ Resposta recebida:', reply);
                this.testResults.push({ test: 'Conexão Básica', status: 'PASSOU', response: reply });
                return true;
            } else {
                throw new Error('Formato de resposta inválido');
            }
        } catch (error) {
            console.error('❌ Falhou:', error.message);
            this.testResults.push({ test: 'Conexão Básica', status: 'FALHOU', error: error.message });
            return false;
        }
    }

    // Teste 2: Análise de código
    async testCodeAnalysis() {
        console.log('\n🧪 Teste 2: Análise de código JavaScript');
        
        try {
            const codeToAnalyze = `
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price * item.quantity;
    }
    return total;
}
`;

            const messages = [{
                role: 'user',
                content: `Analise este código JavaScript e sugira melhorias em no máximo 100 palavras:\n\n${codeToAnalyze}`
            }];

            const response = await this.makeRequest(messages);
            const analysis = response.content[0].text;
            
            console.log('✅ Análise recebida:', analysis.substring(0, 200) + '...');
            this.testResults.push({ test: 'Análise de Código', status: 'PASSOU', response: analysis });
            return true;
        } catch (error) {
            console.error('❌ Falhou:', error.message);
            this.testResults.push({ test: 'Análise de Código', status: 'FALHOU', error: error.message });
            return false;
        }
    }

    // Teste 3: Geração de conteúdo para Agência Fer
    async testContentGeneration() {
        console.log('\n🧪 Teste 3: Geração de conteúdo para Agência Fer');
        
        try {
            const messages = [{
                role: 'user',
                content: 'Crie um título impactante para um serviço de IA da Agência Fer. Máximo 10 palavras.'
            }];

            const response = await this.makeRequest(messages);
            const title = response.content[0].text;
            
            console.log('✅ Título gerado:', title);
            this.testResults.push({ test: 'Geração de Conteúdo', status: 'PASSOU', response: title });
            return true;
        } catch (error) {
            console.error('❌ Falhou:', error.message);
            this.testResults.push({ test: 'Geração de Conteúdo', status: 'FALHOU', error: error.message });
            return false;
        }
    }

    // Teste 4: Processamento de dados estruturados
    async testStructuredData() {
        console.log('\n🧪 Teste 4: Processamento de dados estruturados');
        
        try {
            const jsonData = {
                cliente: "Empresa XYZ",
                servicos: ["Chatbot IA", "Automação", "CRM"],
                valor: 5000,
                status: "ativo"
            };

            const messages = [{
                role: 'user',
                content: `Analise estes dados JSON e crie um resumo executivo em formato JSON:\n\n${JSON.stringify(jsonData, null, 2)}`
            }];

            const response = await this.makeRequest(messages);
            const summary = response.content[0].text;
            
            console.log('✅ Resumo gerado:', summary.substring(0, 150) + '...');
            this.testResults.push({ test: 'Dados Estruturados', status: 'PASSOU', response: summary });
            return true;
        } catch (error) {
            console.error('❌ Falhou:', error.message);
            this.testResults.push({ test: 'Dados Estruturados', status: 'FALHOU', error: error.message });
            return false;
        }
    }

    // Teste 5: Performance e limite de tokens
    async testPerformance() {
        console.log('\n🧪 Teste 5: Performance e limite de tokens');
        
        try {
            const startTime = Date.now();
            
            const messages = [{
                role: 'user',
                content: 'Liste 10 benefícios da automação com IA para empresas. Seja conciso.'
            }];

            const response = await this.makeRequest(messages, 500); // Limite menor de tokens
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const benefits = response.content[0].text;
            
            console.log('✅ Resposta em', duration, 'ms');
            console.log('📊 Tokens usados:', response.usage?.output_tokens || 'N/A');
            
            this.testResults.push({ 
                test: 'Performance', 
                status: 'PASSOU', 
                response: benefits,
                duration: duration,
                tokens: response.usage?.output_tokens 
            });
            return true;
        } catch (error) {
            console.error('❌ Falhou:', error.message);
            this.testResults.push({ test: 'Performance', status: 'FALHOU', error: error.message });
            return false;
        }
    }

    // Executar todos os testes
    async runAllTests() {
        console.log('🚀 INICIANDO TESTES DA API CLAUDE');
        console.log('==================================\n');

        const tests = [
            () => this.testBasicConnection(),
            () => this.testCodeAnalysis(),
            () => this.testContentGeneration(),
            () => this.testStructuredData(),
            () => this.testPerformance()
        ];

        let passedTests = 0;
        let totalTests = tests.length;

        for (const test of tests) {
            const result = await test();
            if (result) passedTests++;
            
            // Pausa entre testes
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.displayResults(passedTests, totalTests);
        return { passed: passedTests, total: totalTests, results: this.testResults };
    }

    // Exibir resultados finais
    displayResults(passed, total) {
        console.log('\n📊 RESULTADOS DOS TESTES');
        console.log('========================');
        console.log(`✅ Passou: ${passed}/${total}`);
        console.log(`❌ Falhou: ${total - passed}/${total}`);
        console.log(`📈 Taxa de sucesso: ${Math.round((passed/total) * 100)}%\n`);

        console.log('📋 DETALHES:');
        this.testResults.forEach((result, index) => {
            const status = result.status === 'PASSOU' ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   Erro: ${result.error}`);
            }
        });

        console.log('\n🎯 CONCLUSÃO:');
        if (passed === total) {
            console.log('🎉 Todos os testes passaram! API Claude funcionando perfeitamente.');
        } else if (passed > 0) {
            console.log('⚠️  Alguns testes falharam. Verificar configurações.');
        } else {
            console.log('❌ Todos os testes falharam. Verificar API Key e conectividade.');
        }
    }

    // Salvar resultados em arquivo
    saveResults() {
        const resultsFile = path.join(__dirname, 'claude-test-results.json');
        const data = {
            timestamp: new Date().toISOString(),
            model: CLAUDE_MODEL,
            results: this.testResults
        };

        fs.writeFileSync(resultsFile, JSON.stringify(data, null, 2));
        console.log(`\n💾 Resultados salvos em: ${resultsFile}`);
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new ClaudeAPITest();
    
    tester.runAllTests().then(results => {
        tester.saveResults();
        
        // Exit code baseado nos resultados
        const exitCode = results.passed === results.total ? 0 : 1;
        process.exit(exitCode);
    }).catch(error => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = ClaudeAPITest;
