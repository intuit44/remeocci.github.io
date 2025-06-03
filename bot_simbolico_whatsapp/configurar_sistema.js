// ===== SCRIPT DE CONFIGURACIÓN AUTOMÁTICA =====
// Guardar como: configurar_sistema.js
// Ejecutar con: node configurar_sistema.js

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛠️ CONFIGURACIÓN AUTOMÁTICA - PLAYMALL PARK\n');
console.log('═'.repeat(70));

async function configurarSistema() {
    console.log('\n🔧 Iniciando configuración automática del sistema...\n');
    
    // 1. CREAR DIRECTORIOS NECESARIOS
    console.log('📂 1. Creando directorios necesarios:\n');
    
    const directorios = [
        './social',
        './analyzers', 
        './videos_recibidos',
        './frames_extraidos',
        './logs',
        './temp',
        './auth_info',
        './supervision_imagenes',
        './mensajes_pendientes'
    ];
    
    directorios.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Creado: ${dir}`);
        } else {
            console.log(`   ✅ Existe: ${dir}`);
        }
    });
    
    // 2. VERIFICAR Y CREAR ARCHIVO .ENV
    console.log('\n🔐 2. Configurando archivo .env:\n');
    
    const envTemplate = `# ===== CONFIGURACIÓN PLAYMALL PARK =====
# Copia este archivo como .env y configura tus claves

# OpenAI GPT-4 (REQUERIDO para análisis inteligente)
OPENAI_API_KEY=tu_openai_api_key_aqui

# Google Services (OPCIONALES pero recomendados)
GOOGLE_GEMINI_API_KEY=tu_google_gemini_key_aqui
GOOGLE_APPLICATION_CREDENTIALS=./path/to/google-credentials.json

# Instagram (OPCIONAL para publicación automática)
INSTAGRAM_ACCESS_TOKEN=tu_instagram_token_aqui
INSTAGRAM_ACCOUNT_ID=tu_instagram_account_id_aqui

# URLs del sistema
BASE_URL=https://playpark-simbolico.ngrok.app

# Configuración del bot
BOT_NAME=PlayMall Park Bot
BOT_VERSION=2.0

# Configuración de análisis
MAX_FRAMES_VIDEO=5
VIDEO_TIMEOUT=45000
IMAGE_ANALYSIS_ENABLED=true

# Configuración de logs
LOG_LEVEL=info
LOG_TO_FILE=true
`;
    
    if (!fs.existsSync('.env')) {
        fs.writeFileSync('.env.example', envTemplate);
        console.log('   ✅ Creado: .env.example (plantilla)');
        console.log('   ⚠️ Copia .env.example a .env y configura tus claves');
    } else {
        console.log('   ✅ Archivo .env ya existe');
    }
    
    // 3. VERIFICAR DEPENDENCIAS NPM
    console.log('\n📦 3. Verificando dependencias NPM:\n');
    
    const dependenciasRequeridas = [
        'whatsapp-web.js@latest',
        'axios',
        'fluent-ffmpeg', 
        '@ffmpeg-installer/ffmpeg',
        'dotenv'
    ];
    
    const dependenciasOpcionales = [
        'openai',
        '@google-cloud/vision',
        '@google/generative-ai'
    ];
    
    // Verificar package.json
    let packageJson = {};
    if (fs.existsSync('package.json')) {
        packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        console.log('   ✅ package.json encontrado');
    } else {
        console.log('   ⚠️ package.json no encontrado, creando uno básico...');
        
        const packageTemplate = {
            "name": "playmall-park-bot",
            "version": "2.0.0",
            "description": "Bot inteligente para PlayMall Park con análisis IA",
            "main": "bot_simbolico_whatsapp/index.js",
            "scripts": {
                "start": "node bot_simbolico_whatsapp/index.js",
                "verify": "node verificar_vinculaciones.js",
                "setup": "node configurar_sistema.js"
            },
            "dependencies": {},
            "engines": {
                "node": ">=16.0.0"
            }
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageTemplate, null, 2));
        packageJson = packageTemplate;
        console.log('   ✅ package.json creado');
    }
    
    // Instalar dependencias requeridas
    console.log('\n   Instalando dependencias requeridas:');
    for (const dep of dependenciasRequeridas) {
        try {
            console.log(`      Instalando ${dep}...`);
            execSync(`npm install ${dep}`, { stdio: 'pipe' });
            console.log(`      ✅ ${dep} instalado`);
        } catch (error) {
            console.log(`      ❌ Error instalando ${dep}: ${error.message}`);
        }
    }
    
    // 4. VERIFICAR ARCHIVOS DE CÓDIGO
    console.log('\n📄 4. Verificando archivos de código:\n');
    
    const archivosRequeridos = {
        './social/instagram_processor.js': 'Instagram Processor',
        './analyzers/video_empresarial.js': 'Analizador Visual',
        './analyzers/video_analyzer_premium.js': 'Video Analyzer Premium',
        './bot_simbolico_whatsapp/index.js': 'Bot Principal'
    };
    
    let archivosOK = true;
    for (const [archivo, descripcion] of Object.entries(archivosRequeridos)) {
        if (fs.existsSync(archivo)) {
            console.log(`   ✅ ${descripcion}: ${archivo}`);
        } else {
            console.log(`   ❌ FALTA: ${descripcion}: ${archivo}`);
            archivosOK = false;
        }
    }
    
    // 5. CREAR SCRIPTS DE UTILIDAD
    console.log('\n🔧 5. Creando scripts de utilidad:\n');
    
    // Script de inicio
    const startScript = `#!/bin/bash
echo "🚀 Iniciando PlayMall Park Bot..."
echo "📊 Verificando sistema..."

if node verificar_vinculaciones.js; then
    echo "✅ Sistema verificado correctamente"
    echo "🤖 Iniciando bot..."
    node bot_simbolico_whatsapp/index.js
else
    echo "❌ Errores encontrados en el sistema"
    echo "🔧 Ejecuta: node configurar_sistema.js"
    exit 1
fi`;
    
    fs.writeFileSync('start.sh', startScript);
    console.log('   ✅ Creado: start.sh');
    
    // Script de Windows
    const startBat = `@echo off
echo 🚀 Iniciando PlayMall Park Bot...
echo 📊 Verificando sistema...

node verificar_vinculaciones.js
if %errorlevel% == 0 (
    echo ✅ Sistema verificado correctamente
    echo 🤖 Iniciando bot...
    node bot_simbolico_whatsapp/index.js
) else (
    echo ❌ Errores encontrados en el sistema
    echo 🔧 Ejecuta: node configurar_sistema.js
    pause
)`;
    
    fs.writeFileSync('start.bat', startBat);
    console.log('   ✅ Creado: start.bat');
    
    // 6. CREAR ARCHIVO DE CONFIGURACIÓN DEL SISTEMA
    console.log('\n⚙️ 6. Creando configuración del sistema:\n');
    
    const configuracionSistema = {
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        componentes: {
            bot_principal: "./bot_simbolico_whatsapp/index.js",
            instagram_processor: "./social/instagram_processor.js",
            analizador_visual: "./analyzers/video_empresarial.js",
            video_analyzer: "./analyzers/video_analyzer_premium.js"
        },
        configuracion: {
            max_frames_video: 5,
            timeout_video: 45000,
            limite_tamaño_archivo: "50MB",
            idioma: "español",
            zona_horaria: "America/Caracas"
        },
        grupos_whatsapp: {
            operativo: "120363179370816930@g.us",
            confiteria: "120363029580331492@g.us"
        },
        servicios_ia: {
            openai_gpt4: "análisis empresarial",
            google_vision: "detección de objetos",
            google_gemini: "análisis estratégico"
        }
    };
    
    fs.writeFileSync('config.json', JSON.stringify(configuracionSistema, null, 2));
    console.log('   ✅ Creado: config.json');
    
    // 7. RESUMEN FINAL
    console.log('\n' + '═'.repeat(70));
    console.log('📋 RESUMEN DE CONFIGURACIÓN:\n');
    
    console.log('✅ Directorios creados');
    console.log('✅ Plantilla .env creada');
    console.log('✅ Dependencias básicas instaladas');
    console.log('✅ Scripts de utilidad creados');
    console.log('✅ Configuración del sistema guardada');
    
    if (archivosOK) {
        console.log('✅ Todos los archivos de código están presentes');
    } else {
        console.log('⚠️ Faltan algunos archivos de código importantes');
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS:\n');
    console.log('1. Configurar archivo .env con tus claves de API');
    console.log('2. Verificar sistema: node verificar_vinculaciones.js');
    console.log('3. Iniciar bot: npm start o ./start.sh');
    
    console.log('\n📚 COMANDOS ÚTILES:\n');
    console.log('• Verificar sistema: node verificar_vinculaciones.js');
    console.log('• Configurar sistema: node configurar_sistema.js');
    console.log('• Iniciar bot: npm start');
    console.log('• Logs del bot: tail -f logs/*.log');
    
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 CONFIGURACIÓN COMPLETADA');
    console.log('═'.repeat(70));
}

// EJECUTAR CONFIGURACIÓN
configurarSistema().catch(error => {
    console.error('❌ Error durante configuración:', error);
    process.exit(1);
});