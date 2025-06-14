const { analyzeConfirmationWithAI, INTENTIONS } = require('./src/utils/intentAnalyzer');

// Teste rápido do sistema de análise de confirmações
async function quickTest() {
    console.log('🔥 TESTE RÁPIDO - Sistema de Confirmações com OpenAI\n');
    
    const testCases = [
        // Positivas claras
        'sim',
        'beleza', 
        'fechado',
        'ok',
        'confirmo',
        
        // Negativas claras  
        'não',
        'nao',
        'cancelar',
        'não posso',
        
        // Neutras/ambíguas
        'talvez',
        'não sei',
        'que horas?',
        'oi'
    ];
    
    console.log('🎯 Testando respostas representativas:\n');
    
    for (let i = 0; i < testCases.length; i++) {
        const response = testCases[i];
        console.log(`[${i + 1}/${testCases.length}] "${response}"`);
        
        try {
            const analysis = await analyzeConfirmationWithAI(response);
            
            let status = '';
            if (analysis.mainIntent === INTENTIONS.CONFIRMATION) {
                status = '✅ POSITIVA';
            } else if (analysis.mainIntent === INTENTIONS.REJECTION) {
                status = '❌ NEGATIVA';
            } else {
                status = '❓ NEUTRA';
            }
            
            console.log(`   ${status} (${analysis.confidence.toFixed(2)}) - ${analysis.reasoning}\n`);
            
        } catch (error) {
            console.log(`   ❌ ERRO: ${error.message}\n`);
        }
        
        // Pausa menor para teste rápido
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ Teste rápido concluído!');
}

// Executar
if (require.main === module) {
    quickTest().catch(console.error);
}

module.exports = { quickTest };
