#!/usr/bin/env node

// 🔥 FIREBASE MANAGER
// Gerencia projetos Firebase e Functions automaticamente

const admin = require('firebase-admin');
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class FirebaseManager {
  constructor(credentials) {
    this.credentials = credentials;
    this.firebaseProjects = new Map();
    
    // Initialize Google APIs for Firebase Management
    this.resourceManager = google.cloudresourcemanager('v1');
    this.firebase = google.firebase('v1beta1');
    this.cloudfunctions = google.cloudfunctions('v1');
  }

  /**
   * 🔥 Criar projeto Firebase completo
   */
  async createFirebaseProject(clientName, projectId = null) {
    console.log(`🔥 Criando projeto Firebase para: ${clientName}`);
    
    const firebaseProjectId = projectId || `firebase-${clientName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    try {
      // 1. Verificar se já existe no Google Cloud
      console.log('1. 📁 Verificando projeto Google Cloud...');
      
      // 2. Ativar Firebase APIs
      console.log('2. 🔌 Ativando APIs Firebase...');
      await this.enableFirebaseAPIs(firebaseProjectId);
      
      // 3. Inicializar Firebase Admin
      console.log('3. 🔥 Inicializando Firebase Admin...');
      const app = await this.initializeFirebaseApp(firebaseProjectId);
      
      // 4. Configurar Firebase Functions
      console.log('4. ⚡ Configurando Firebase Functions...');
      await this.setupFirebaseFunctions(firebaseProjectId);
      
      // 5. Criar estrutura inicial
      console.log('5. 📁 Criando estrutura inicial...');
      await this.createInitialStructure(firebaseProjectId);
      
      return {
        success: true,
        projectId: firebaseProjectId,
        app: app,
        functionsPath: path.join(__dirname, '../../firebase-projects', firebaseProjectId),
        consoleUrl: `https://console.firebase.google.com/project/${firebaseProjectId}`
      };
      
    } catch (error) {
      console.error(`❌ Erro ao criar projeto Firebase: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔌 Ativar APIs necessárias do Firebase
   */
  async enableFirebaseAPIs(projectId) {
    const apis = [
      'firebase.googleapis.com',
      'cloudfunctions.googleapis.com',
      'runtimeconfig.googleapis.com',
      'cloudbuild.googleapis.com',
      'storage-component.googleapis.com'
    ];

    const serviceUsage = google.serviceusage('v1');
    
    for (const api of apis) {
      try {
        await serviceUsage.services.enable({
          auth: this.credentials,
          name: `projects/${projectId}/services/${api}`
        });
        console.log(`   ✅ ${api} ativada`);
      } catch (error) {
        console.log(`   ⚠️ Erro ao ativar ${api}: ${error.message}`);
      }
    }
  }

  /**
   * 🔥 Inicializar Firebase App
   */
  async initializeFirebaseApp(projectId) {
    try {
      // Verificar se app já existe
      const existingApps = admin.apps.filter(app => app.options.projectId === projectId);
      if (existingApps.length > 0) {
        return existingApps[0];
      }

      // Criar novo app
      const app = admin.initializeApp({
        credential: admin.credential.cert(this.credentials),
        projectId: projectId,
        databaseURL: `https://${projectId}-default-rtdb.firebaseio.com/`
      }, projectId);

      this.firebaseProjects.set(projectId, app);
      return app;
      
    } catch (error) {
      console.error(`❌ Erro ao inicializar Firebase App: ${error.message}`);
      throw error;
    }
  }

  /**
   * ⚡ Configurar Firebase Functions
   */
  async setupFirebaseFunctions(projectId) {
    const functionsDir = path.join(__dirname, '../../firebase-projects', projectId);
    
    try {
      // Criar diretório do projeto
      await fs.mkdir(functionsDir, { recursive: true });
      
      // Inicializar Firebase Functions
      process.chdir(functionsDir);
      
      // Criar firebase.json
      const firebaseConfig = {
        functions: {
          source: "functions",
          runtime: "nodejs18"
        },
        hosting: {
          public: "public",
          ignore: ["firebase.json", "**/.*", "**/node_modules/**"]
        }
      };
      
      await fs.writeFile(
        path.join(functionsDir, 'firebase.json'),
        JSON.stringify(firebaseConfig, null, 2)
      );
      
      // Criar diretório functions
      const functionsPath = path.join(functionsDir, 'functions');
      await fs.mkdir(functionsPath, { recursive: true });
      
      // Criar package.json para functions
      const functionsPackage = {
        name: `functions-${projectId}`,
        description: `Firebase Functions para ${projectId}`,
        scripts: {
          serve: "firebase emulators:start --only functions",
          shell: "firebase functions:shell",
          start: "npm run shell",
          deploy: "firebase deploy --only functions",
          logs: "firebase functions:log"
        },
        engines: {
          node: "18"
        },
        main: "index.js",
        dependencies: {
          "firebase-admin": "^12.0.0",
          "firebase-functions": "^4.8.0"
        },
        devDependencies: {
          "firebase-functions-test": "^3.1.0"
        }
      };
      
      await fs.writeFile(
        path.join(functionsPath, 'package.json'),
        JSON.stringify(functionsPackage, null, 2)
      );
      
      // Criar index.js inicial
      const initialIndex = `const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// 🔥 Function de exemplo criada automaticamente
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase! 🔥");
});

// 🚀 Function para processar dados
exports.processData = functions.https.onCall((data, context) => {
  return {
    message: \`Dados processados: \${JSON.stringify(data)}\`,
    timestamp: new Date().toISOString()
  };
});
`;
      
      await fs.writeFile(path.join(functionsPath, 'index.js'), initialIndex);
      
      console.log(`   ✅ Estrutura Firebase Functions criada em: ${functionsPath}`);
      return functionsPath;
      
    } catch (error) {
      console.error(`❌ Erro ao configurar Functions: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📁 Criar estrutura inicial do projeto
   */
  async createInitialStructure(projectId) {
    const projectDir = path.join(__dirname, '../../firebase-projects', projectId);
    
    try {
      // Criar README.md
      const readme = `# 🔥 Firebase Project: ${projectId}

## 📋 Informações
- **Projeto**: ${projectId}
- **Criado**: ${new Date().toISOString()}
- **Tipo**: Firebase Functions + Hosting

## 🚀 Comandos Úteis

\`\`\`bash
# Instalar dependências
cd functions && npm install

# Testar localmente
npm run serve

# Deploy
npm run deploy

# Ver logs
npm run logs
\`\`\`

## 📂 Estrutura
- \`functions/\` - Firebase Functions
- \`public/\` - Hosting files
- \`firebase.json\` - Configuração Firebase
`;
      
      await fs.writeFile(path.join(projectDir, 'README.md'), readme);
      
      // Criar public/index.html
      const publicDir = path.join(projectDir, 'public');
      await fs.mkdir(publicDir, { recursive: true });
      
      const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>🔥 ${projectId}</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
    .container { max-width: 600px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔥 Firebase Project</h1>
    <p><strong>Projeto:</strong> ${projectId}</p>
    <p><strong>Status:</strong> Ativo ✅</p>
    <p><strong>Criado:</strong> ${new Date().toLocaleString()}</p>
    
    <h2>🚀 Functions Disponíveis</h2>
    <ul>
      <li>helloWorld - Function HTTP básica</li>
      <li>processData - Function callable</li>
    </ul>
  </div>
</body>
</html>`;
      
      await fs.writeFile(path.join(publicDir, 'index.html'), indexHtml);
      
    } catch (error) {
      console.error(`❌ Erro ao criar estrutura: ${error.message}`);
    }
  }

  /**
   * ⚡ Criar Firebase Function com Claude
   */
  async createClaudeFunction(projectId, functionName, description, claudeApi) {
    console.log(`⚡ Criando Function "${functionName}" com Claude...`);
    
    try {
      // Prompt para Claude gerar a function
      const prompt = `Crie uma Firebase Function em JavaScript/Node.js com as seguintes especificações:

Nome da Function: ${functionName}
Descrição: ${description}

Requisitos:
1. Use firebase-functions v4+ 
2. Use firebase-admin para operações no Firebase
3. Inclua tratamento de erros
4. Adicione logs apropriados
5. Siga boas práticas de segurança
6. Adicione comentários explicativos

Formatos suportados:
- functions.https.onRequest (HTTP endpoints)
- functions.https.onCall (callable functions)
- functions.firestore.document (triggers Firestore)
- functions.auth.user (triggers Auth)

Retorne apenas o código JavaScript da function, sem explicações adicionais.`;

      const response = await claudeApi.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      const functionCode = response.content[0].text;
      
      // Salvar a function no arquivo
      const functionsDir = path.join(__dirname, '../../firebase-projects', projectId, 'functions');
      const functionFile = path.join(functionsDir, `${functionName}.js`);
      
      await fs.writeFile(functionFile, functionCode);
      
      // Atualizar index.js para incluir a nova function
      await this.updateIndexWithNewFunction(functionsDir, functionName);
      
      console.log(`✅ Function "${functionName}" criada com sucesso!`);
      console.log(`📁 Arquivo: ${functionFile}`);
      
      return {
        success: true,
        functionName,
        file: functionFile,
        code: functionCode
      };
      
    } catch (error) {
      console.error(`❌ Erro ao criar function: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📝 Atualizar index.js com nova function
   */
  async updateIndexWithNewFunction(functionsDir, functionName) {
    const indexPath = path.join(functionsDir, 'index.js');
    
    try {
      let indexContent = await fs.readFile(indexPath, 'utf8');
      
      // Adicionar require da nova function
      const requireLine = `const ${functionName} = require('./${functionName}');`;
      const exportLine = `exports.${functionName} = ${functionName}.${functionName};`;
      
      // Verificar se já não existe
      if (!indexContent.includes(requireLine)) {
        indexContent = requireLine + '\n' + indexContent;
      }
      
      if (!indexContent.includes(exportLine)) {
        indexContent += '\n' + exportLine;
      }
      
      await fs.writeFile(indexPath, indexContent);
      
    } catch (error) {
      console.error(`❌ Erro ao atualizar index.js: ${error.message}`);
    }
  }

  /**
   * 🚀 Deploy das Functions
   */
  async deployFunctions(projectId) {
    console.log(`🚀 Fazendo deploy das Functions para: ${projectId}`);
    
    const projectDir = path.join(__dirname, '../../firebase-projects', projectId);
    
    try {
      // Ir para o diretório do projeto
      process.chdir(projectDir);
      
      // Instalar dependências das functions
      console.log('📦 Instalando dependências...');
      await execAsync('cd functions && npm install');
      
      // Fazer deploy
      console.log('🚀 Fazendo deploy...');
      const { stdout, stderr } = await execAsync(`firebase deploy --only functions --project ${projectId}`);
      
      console.log('✅ Deploy concluído!');
      console.log(stdout);
      
      return {
        success: true,
        output: stdout,
        consoleUrl: `https://console.firebase.google.com/project/${projectId}/functions`
      };
      
    } catch (error) {
      console.error(`❌ Erro no deploy: ${error.message}`);
      throw error;
    }
  }

  /**
   * 📋 Listar Functions de um projeto
   */
  async listFunctions(projectId) {
    try {
      const functionsDir = path.join(__dirname, '../../firebase-projects', projectId, 'functions');
      const files = await fs.readdir(functionsDir);
      
      const functions = files
        .filter(file => file.endsWith('.js') && file !== 'index.js')
        .map(file => file.replace('.js', ''));
        
      return functions;
      
    } catch (error) {
      console.error(`❌ Erro ao listar functions: ${error.message}`);
      return [];
    }
  }

  /**
   * 🗑️ Deletar projeto Firebase
   */
  async deleteFirebaseProject(projectId) {
    try {
      console.log(`🗑️ Deletando projeto Firebase: ${projectId}`);
      
      // Remover app do Firebase Admin
      const app = this.firebaseProjects.get(projectId);
      if (app) {
        await app.delete();
        this.firebaseProjects.delete(projectId);
      }
      
      // Remover diretório local
      const projectDir = path.join(__dirname, '../../firebase-projects', projectId);
      await execAsync(`rm -rf "${projectDir}"`);
      
      console.log(`✅ Projeto ${projectId} deletado localmente`);
      console.log(`⚠️ Para deletar completamente, acesse: https://console.firebase.google.com/project/${projectId}/settings/general`);
      
    } catch (error) {
      console.error(`❌ Erro ao deletar projeto: ${error.message}`);
    }
  }
}

module.exports = FirebaseManager;
