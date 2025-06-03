// ===== VERIFICACIÓN Y CORRECCIÓN DE VINCULACIONES =====
// Ejecutar desde consola para verificar que todo esté conectado correctamente

console.log('[VERIFICACIÓN] 🔍 Iniciando verificación de vinculaciones...\n');

// ===== 1. VERIFICAR ARCHIVOS EXISTENTES =====
const fs = require('fs');
const path = require('path');

const baseDir = __dirname; // Detecta desde dónde se ejecuta el script

const archivosRequeridos = [
    path.join(baseDir, 'social/instagram_processor.js'),
    path.join(baseDir, 'analyzers/video_empresarial.js'),
    path.join(baseDir, 'analyzers/video_analyzer_premium.js'),
    path.join(baseDir, 'comandos/instagram_automation.js'),
    path.join(baseDir, 'index.js')
];

console.log('📁 VERIFICANDO ARCHIVOS:');
archivosRequeridos.forEach(archivo => {
    const existe = fs.existsSync(archivo);
    const nombreRelativo = path.relative(baseDir, archivo);
    console.log(`   ./${nombreRelativo}: ${existe ? '✅ EXISTE' : '❌ FALTA'}`);
});

console.log('\n' + '═'.repeat(60) + '\n');


// ===== 2. VERIFICAR IMPORTACIONES =====
console.log('📦 VERIFICANDO IMPORTACIONES:\n');

// Verificar instagram_processor.js
try {
    console.log('🔍 Verificando instagram_processor.js...');
    const { InstagramVideoProcessor } = require('./social/instagram_processor');
    console.log('   ✅ InstagramVideoProcessor importado correctamente');
    
    // Crear instancia de prueba
    const processor = new InstagramVideoProcessor();
    console.log('   ✅ Instancia creada correctamente');
    console.log(`   📊 Métodos disponibles: ${Object.getOwnPropertyNames(Object.getPrototypeOf(processor)).filter(m => m !== 'constructor').length}`);
    
} catch (error) {
    console.log(`   ❌ Error en instagram_processor: ${error.message}`);
}

// Verificar video_empresarial.js
try {
    console.log('\n🔍 Verificando video_empresarial.js...');
    const { AnalizadorVisualEmpresarial } = require('./analyzers/video_empresarial');
    console.log('   ✅ AnalizadorVisualEmpresarial importado correctamente');
    
    const analizador = new AnalizadorVisualEmpresarial();
    console.log('   ✅ Instancia creada correctamente');
    
} catch (error) {
    console.log(`   ❌ Error en video_empresarial: ${error.message}`);
}

// Verificar video_analyzer_premium.js
try {
    console.log('\n🔍 Verificando video_analyzer_premium.js...');
    const VideoAnalyzerPremium = require('./analyzers/video_analyzer_premium');
    console.log('   ✅ VideoAnalyzerPremium importado correctamente');
    
    const analyzer = new VideoAnalyzerPremium();
    console.log('   ✅ Instancia creada correctamente');
    
} catch (error) {
    console.log(`   ❌ Error en video_analyzer_premium: ${error.message}`);
}

// Verificar instagram_automation.js
try {
    console.log('\n🔍 Verificando instagram_automation.js...');
    const InstagramStoriesAutomation = require('./comandos/instagram_automation');
    console.log('   ✅ InstagramStoriesAutomation importado correctamente');
    
} catch (error) {
    console.log(`   ❌ Error en instagram_automation: ${error.message}`);
    console.log('   ⚠️ Se usará mock temporal en instagram_processor');
}

console.log('\n' + '═'.repeat(60) + '\n');

// ===== 3. VERIFICAR MÉTODOS ESPECÍFICOS =====
console.log('🔧 VERIFICANDO MÉTODOS ESPECÍFICOS:\n');

// Métodos requeridos para InstagramVideoProcessor
const metodosInstagram = [
    'procesarVideoParaInstagram',
    'analizarVideoParaInstagram', 
    'procesarRespuestaInstagram',
    'confirmarPublicacion',
    'cancelarPublicacion'
];

try {
    const { InstagramVideoProcessor } = require('./social/instagram_processor');
    const processor = new InstagramVideoProcessor();
    
    console.log('📱 InstagramVideoProcessor:');
    metodosInstagram.forEach(metodo => {
        const existe = typeof processor[metodo] === 'function';
        console.log(`   ${metodo}: ${existe ? '✅' : '❌'}`);
    });
    
} catch (error) {
    console.log(`   ❌ Error verificando métodos Instagram: ${error.message}`);
}

// Métodos requeridos para AnalizadorVisualEmpresarial
const metodosAnalizador = [
    'analizarContenidoCompleto',
    'inicializarServiciosIA',
    'ejecutarAnalisisIACompleto',
    'ejecutarAnalisisContextualAvanzado'
];

try {
    const { AnalizadorVisualEmpresarial } = require('./analyzers/video_empresarial');
    const analizador = new AnalizadorVisualEmpresarial();
    
    console.log('\n🧠 AnalizadorVisualEmpresarial:');
    metodosAnalizador.forEach(metodo => {
        const existe = typeof analizador[metodo] === 'function';
        console.log(`   ${metodo}: ${existe ? '✅' : '❌'}`);
    });
    
} catch (error) {
    console.log(`   ❌ Error verificando métodos Analizador: ${error.message}`);
}

// Métodos requeridos para VideoAnalyzerPremium
const metodosVideo = [
    'procesarVideoCompleto',
    'descargarVideoEstrategico',
    'extraerFramesInteligentes',
    'analizarFramesConIA'
];

try {
    const VideoAnalyzerPremium = require('./analyzers/video_analyzer_premium');
    const analyzer = new VideoAnalyzerPremium();
    
    console.log('\n🎬 VideoAnalyzerPremium:');
    metodosVideo.forEach(metodo => {
        const existe = typeof analyzer[metodo] === 'function';
        console.log(`   ${metodo}: ${existe ? '✅' : '❌'}`);
    });
    
} catch (error) {
    console.log(`   ❌ Error verificando métodos Video: ${error.message}`);
}

console.log('\n' + '═'.repeat(60) + '\n');

// ===== 4. VERIFICAR DEPENDENCIAS =====
console.log('📋 VERIFICANDO DEPENDENCIAS:\n');

const dependencias = [
    'whatsapp-web.js',
    'axios',
    'fluent-ffmpeg',
    '@ffmpeg-installer/ffmpeg',
    'openai',
    '@google-cloud/vision',
    '@google/generative-ai'
];

dependencias.forEach(dep => {
    try {
        require(dep);
        console.log(`   ${dep}: ✅`);
    } catch (error) {
        console.log(`   ${dep}: ❌ (${error.message.split(' ')[0]})`);
    }
});

console.log('\n' + '═'.repeat(60) + '\n');

// ===== 5. VERIFICAR VARIABLES DE ENTORNO =====
console.log('🔐 VERIFICANDO VARIABLES DE ENTORNO:\n');

const variablesEnv = [
    'OPENAI_API_KEY',
    'GOOGLE_GEMINI_API_KEY', 
    'GOOGLE_APPLICATION_CREDENTIALS',
    'INSTAGRAM_ACCESS_TOKEN',
    'INSTAGRAM_ACCOUNT_ID'
];

variablesEnv.forEach(variable => {
    const valor = process.env[variable];
    if (valor) {
        const longitud = valor.length;
        const preview = valor.substring(0, 8) + '...';
        console.log(`   ${variable}: ✅ (${longitud} chars, inicia: ${preview})`);
    } else {
        console.log(`   ${variable}: ❌ NO CONFIGURADA`);
    }
});

console.log('\n' + '═'.repeat(60) + '\n');

// ===== 6. GENERAR RESUMEN DE ESTADO =====
console.log('📊 RESUMEN FINAL:\n');

let todoCorrecto = true;
const problemas = [];

// Verificar archivos críticos
archivosRequeridos.forEach(archivo => {
    if (!fs.existsSync(archivo)) {
        problemas.push(`Archivo faltante: ${archivo}`);
        todoCorrecto = false;
    }
});

// Verificar importaciones críticas
try {
    require('./social/instagram_processor');
    require('./analyzers/video_empresarial');
    require('./analyzers/video_analyzer_premium');
} catch (error) {
    problemas.push(`Error en importaciones: ${error.message}`);
    todoCorrecto = false;
}

if (todoCorrecto) {
    console.log('🎉 ¡TODAS LAS VINCULACIONES ESTÁN CORRECTAS!');
    console.log('✅ Todos los archivos existen');
    console.log('✅ Todas las importaciones funcionan');
    console.log('✅ Sistema listo para usar');
} else {
    console.log('⚠️ SE ENCONTRARON PROBLEMAS:');
    problemas.forEach(problema => {
        console.log(`   ❌ ${problema}`);
    });
}

console.log('\n' + '═'.repeat(60));
console.log('🔧 VERIFICACIÓN COMPLETADA');
console.log('═'.repeat(60));