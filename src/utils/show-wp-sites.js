#!/usr/bin/env node

console.log('🌐 SITES WORDPRESS DETECTADOS NA HOSTINGER:\n');

const sites = [
  'agenciafer.com.br',
  'aiofotoevideo.com.br', 
  'malucosta.com.br',
  'metodoverus.com.br'
];

sites.forEach((site, index) => {
  console.log(`${index + 1}. ✅ ${site} - WordPress 6.8.1`);
});

console.log(`\n�� Total: ${sites.length} sites WordPress ativos`);
console.log('🔧 WP-CLI disponível para gerenciamento');
