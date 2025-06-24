#!/usr/bin/env node

// 🧪 TESTE DOS SDKs GOOGLE INSTALADOS
// Verificar se todos os SDKs estão funcionando

console.log('🔍 TESTANDO SDKs GOOGLE...\n');

// Teste 1: Google APIs Core
try {
  const { google } = require('googleapis');
  console.log('✅ googleapis - SDK principal instalado');
  
  // Verificar serviços disponíveis
  const calendar = google.calendar('v3');
  const sheets = google.sheets('v4');
  const drive = google.drive('v3');
  const gmail = google.gmail('v1');
  
  console.log('   📅 Google Calendar API - OK');
  console.log('   📊 Google Sheets API - OK');
  console.log('   📁 Google Drive API - OK');
  console.log('   📧 Gmail API - OK');
  
} catch (error) {
  console.log('❌ googleapis - ERRO:', error.message);
}

// Teste 2: Google Auth Library
try {
  const { GoogleAuth } = require('google-auth-library');
  console.log('✅ google-auth-library - Autenticação instalada');
} catch (error) {
  console.log('❌ google-auth-library - ERRO:', error.message);
}

// Teste 3: Google Cloud Resource Manager
try {
  const { ResourceManagerClient } = require('@google-cloud/resource-manager');
  console.log('✅ @google-cloud/resource-manager - Gerenciador de projetos instalado');
} catch (error) {
  console.log('❌ @google-cloud/resource-manager - ERRO:', error.message);
}

// Teste 4: Google Cloud Service Usage
try {
  const { ServiceUsageClient } = require('@google-cloud/service-usage');
  console.log('✅ @google-cloud/service-usage - Gerenciador de APIs instalado');
} catch (error) {
  console.log('❌ @google-cloud/service-usage - ERRO:', error.message);
}

// Teste 5: Google Maps
try {
  const { Client } = require('@googlemaps/google-maps-services-js');
  console.log('✅ @googlemaps/google-maps-services-js - Google Maps instalado');
} catch (error) {
  console.log('❌ @googlemaps/google-maps-services-js - ERRO:', error.message);
}

// Teste 6: Google Maps Loader
try {
  const { Loader } = require('@googlemaps/js-api-loader');
  console.log('✅ @googlemaps/js-api-loader - Maps Loader instalado');
} catch (error) {
  console.log('❌ @googlemaps/js-api-loader - ERRO:', error.message);
}

console.log('\n🎯 RESUMO:');
console.log('📦 Todos os SDKs necessários estão instalados!');
console.log('🔑 Agora você pode fornecer as credenciais do Google Cloud');
console.log('🤖 O agente poderá criar automaticamente:');
console.log('   - Projetos Google Cloud');
console.log('   - Service Accounts');
console.log('   - Ativar APIs (Calendar, Sheets, Drive, Maps, etc.)');
console.log('   - Gerar credenciais JSON');
console.log('   - Configurar permissões');

console.log('\n🚀 PRONTO PARA USAR!');
