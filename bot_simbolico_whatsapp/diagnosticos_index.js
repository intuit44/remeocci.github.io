// SCRIPT PARA VERIFICAR SINTAXIS DE index.js

// 1. VERIFICAR LLAVES BALANCEADAS - Ejecutar en PowerShell:
// Get-Content index.js | ForEach-Object { ($_ -split '{').Count - 1 } | Measure-Object -Sum
// Get-Content index.js | ForEach-Object { ($_ -split '}').Count - 1 } | Measure-Object -Sum
// Los números deben ser iguales

// 2. ERRORES COMUNES EN LAS MODIFICACIONES RECIENTES:

// PROBLEMA 1: Función procesarMensaje mal cerrada
// BUSCAR AL FINAL DE la función procesarMensaje:
async procesarMensaje(message) {
    // ... todo el código de la función ...
    
    // ❌ PUEDE QUE FALTE ESTO AL FINAL:
} // ← Cerrar función procesarMensaje

// PROBLEMA 2: Bloque if/else mal cerrado
// BUSCAR esta sección y verificar llaves:
if (esElegibleParaGPT) {
    if (esGrupo || esPersonalAutorizado) {
        try {
            // ... código ...
        } catch (error) {
            // ... manejo de error ...
        }
    } else {
        console.log(`🚫 Mensaje elegible para GPT pero de persona no autorizada: ${nombreContacto}`);
    }
} else {
    // ... mensajes no elegibles ...
} // ← Verificar que esta llave esté presente

// PROBLEMA 3: Clase BotWhatsAppPlayMall mal cerrada
// BUSCAR AL FINAL de la clase:
class BotWhatsAppPlayMall {
    constructor() {
        // ...
    }
    
    // ... todos los métodos ...
    
    manejarError(error) {
        // ... último método ...
    }
} // ← Debe cerrar la clase

// PROBLEMA 4: Función ejecutar_funcion_operativa mal cerrada
async function ejecutar_funcion_operativa(texto, numero) {
    return new Promise((resolve, reject) => {
        // ... código ...
        
        proceso.on('error', (error) => {
            console.error('❌ Error ejecutando Python:', error);
            reject(error);
        });

        setTimeout(() => {
            proceso.kill('SIGTERM');
            reject(new Error('Timeout: Python tardó más de 30 segundos'));
        }, 30000);
    }); // ← Promise
} // ← Función

// PROBLEMA 5: Código al final del archivo
const bot = new BotWhatsAppPlayMall();
bot.iniciarBot().catch((error) => {
    console.error('❌ Error fatal iniciando bot:', error);
    process.exit(1);
}); // ← Verificar punto y coma

// 3. SCRIPT DE VERIFICACIÓN AUTOMÁTICA
const fs = require('fs');

function verificarSintaxis() {
    try {
        const codigo = fs.readFileSync('index.js', 'utf8');
        
        // Contar llaves
        const abiertas = (codigo.match(/\{/g) || []).length;
        const cerradas = (codigo.match(/\}/g) || []).length;
        
        console.log(`Llaves abiertas: ${abiertas}`);
        console.log(`Llaves cerradas: ${cerradas}`);
        
        if (abiertas !== cerradas) {
            console.log(`❌ ERROR: Faltan ${abiertas - cerradas} llaves de cierre`);
        } else {
            console.log(`✅ Llaves balanceadas`);
        }
        
        // Verificar paréntesis
        const parentesisAbiertas = (codigo.match(/\(/g) || []).length;
        const parentesisCerradas = (codigo.match(/\)/g) || []).length;
        
        console.log(`Paréntesis abiertos: ${parentesisAbiertas}`);
        console.log(`Paréntesis cerrados: ${parentesisCerradas}`);
        
        if (parentesisAbiertas !== parentesisCerradas) {
            console.log(`❌ ERROR: Faltan ${parentesisAbiertas - parentesisCerradas} paréntesis de cierre`);
        } else {
            console.log(`✅ Paréntesis balanceados`);
        }
        
        // Verificar corchetes
        const corchetesAbiertos = (codigo.match(/\[/g) || []).length;
        const corchetesCerrados = (codigo.match(/\]/g) || []).length;
        
        if (corchetesAbiertos !== corchetesCerrados) {
            console.log(`❌ ERROR: Faltan ${corchetesAbiertos - corchetesCerrados} corchetes de cierre`);
        } else {
            console.log(`✅ Corchetes balanceados`);
        }
        
    } catch (error) {
        console.log(`❌ Error leyendo archivo: ${error.message}`);
    }
}

// Ejecutar verificación
// verificarSintaxis();

// 4. TEMPLATE DE LA ESTRUCTURA CORRECTA FINAL DE index.js
/*
class BotWhatsAppPlayMall {
    constructor() {
        // constructor code
    }
    
    cargarPersonalAutorizado() {
        // method code
    }
    
    async procesarMensaje(message) {
        // method code
        
        if (condicion) {
            // code
        } else {
            // code
        }
    } // ← Cerrar método
    
    async iniciarBot() {
        // method code
    }
    
    // ... otros métodos ...
    
    async manejarError(error) {
        // último método
    }
} // ← Cerrar clase

// Funciones fuera de la clase
async function ejecutar_funcion_operativa(texto, numero) {
    return new Promise((resolve, reject) => {
        // Promise code
    }); // ← Cerrar Promise
} // ← Cerrar función

// Manejo de señales
process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando bot gracefully...');
    process.exit(0);
});

// ... otros process.on ...

// Inicialización final
const bot = new BotWhatsAppPlayMall();
bot.iniciarBot().catch((error) => {
    console.error('❌ Error fatal iniciando bot:', error);
    process.exit(1);
});
*/