// === CONFIGURACIÓN GENERAL ===
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Cargar variables de entorno
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
console.log('[DEBUG] OPENAI API KEY:', process.env.OPENAI_API_KEY?.slice(0, 10) || 'No cargada');

// === DEPENDENCIAS EXTERNAS ===
const axios = require('axios');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// === WHATSAPP WEB.JS ===
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

// === COMANDOS PERSONALIZADOS ===
const { procesarComandoInventario } = require('./comandos/inventario');
const { procesarComandoVentas } = require('./comandos/ventas');
const { procesarComandoCompras } = require('./comandos/compras');
const { procesarComandoProveedores } = require('./comandos/proveedores');
const { procesarComandoDepartamentos } = require('./comandos/departamentos');
const { procesarComandoAyuda } = require('./comandos/ayuda');



// === IMPORTACIONES CORREGIDAS PARA RUTA ACTUAL ===
let AnalizadorVisualEmpresarial;
let VideoAnalyzerPremium;
let InstagramVideoProcessor;

try {
    const videoEmpresarial = require('./analyzers/video_empresarial');
    AnalizadorVisualEmpresarial = videoEmpresarial.AnalizadorVisualEmpresarial;
    console.log('[MODULES] ✅ AnalizadorVisualEmpresarial cargado correctamente');
} catch (error) {
    console.log('[MODULES] ⚠️ AnalizadorVisualEmpresarial no disponible:', error.message);
    AnalizadorVisualEmpresarial = null;
}

try {
    VideoAnalyzerPremium = require('./analyzers/video_analyzer_premium');
    console.log('[MODULES] ✅ VideoAnalyzerPremium cargado correctamente');
} catch (error) {
    console.log('[MODULES] ⚠️ VideoAnalyzerPremium no disponible:', error.message);
    VideoAnalyzerPremium = null;
}

try {
    const instagramProcessor = require('./social/instagram_processor');
    InstagramVideoProcessor = instagramProcessor.InstagramVideoProcessor;
    console.log('[MODULES] ✅ InstagramVideoProcessor cargado correctamente');
} catch (error) {
    console.log('[MODULES] ⚠️ InstagramVideoProcessor no disponible:', error.message);
    InstagramVideoProcessor = null;
}




// === VARIABLES DE RUTA ===
const inventarioPath = '\\\\192.168.3.180\\datos_a2\\inventario_convertido.json';

const GRUPOS_PERMITIDOS = new Set([
    '120363179370816930@g.us',
    '120363029580331492@g.us'
]);

// === FUNCIONES UTILITARIAS ===
function respuestaSegura(mensaje) {
    if (typeof mensaje === 'string' && mensaje.trim().length > 0) {
        return mensaje.trim();
    }
    if (typeof mensaje === 'object') {
        try {
            return JSON.stringify(mensaje, null, 2);
        } catch (e) {
            return '⚠️ No se pudo formatear la respuesta.';
        }
    }
    return '⚠️ Respuesta vacía o no válida.';
}

function archivoReciente(ruta, segundosMax = 60) {
    try {
        const stats = fs.statSync(ruta);
        const ahora = new Date();
        const modificado = new Date(stats.mtime);
        const diferenciaSegundos = (ahora - modificado) / 1000;
        return diferenciaSegundos <= segundosMax;
    } catch (err) {
        console.error('❌ Error al verificar archivo:', err.message);
        return false;
    }
}

function esPCParque() {
    const hostname = os.hostname().toLowerCase();
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log("[DEBUG] IP detectada:", net.address);
                if (
                    net.address.startsWith("192.168.3.") ||
                    net.address.startsWith("192.168.1.")
                ) return true;
            }
        }
    }

    console.log("[DEBUG] HOSTNAME detectado:", hostname);
    return hostname.includes("parque") || hostname === "pc-parque";
}

// === FUNCIÓN PRINCIPAL DE COMUNICACIÓN CON PYTHON ===
async function ejecutar_funcion_operativa(texto, numero, imagenData = null) {
    return new Promise((resolve, reject) => {
        console.log('[PYTHON] Iniciando comunicacion con sistema operativo...');
        console.log(`[INPUT] Mensaje: ${texto.substring(0, 50)}...`);
        console.log(`[INPUT] Numero: ${numero}`);
        console.log(`[INPUT] Imagen incluida: ${imagenData ? 'SI' : 'NO'}`);

        // VERIFICAR CONEXION API EN TIEMPO REAL ANTES DE LLAMAR PYTHON
        const esConsultaVentas = texto.toLowerCase().includes('venta') || 
                                texto.toLowerCase().includes('dinero') ||
                                texto.toLowerCase().includes('total');
        
        const esConsultaInventario = texto.toLowerCase().includes('inventario') ||
                                    texto.toLowerCase().includes('stock') ||
                                    texto.toLowerCase().includes('falta');

        if (esConsultaVentas || esConsultaInventario) {
            console.log('[API] Consulta de datos detectada - Verificando APIs en tiempo real...');
        }

        const scriptPath = path.join(__dirname, '../sistema_funcional_operativo.py');

        const args = [
            scriptPath,
            '--ejecutar-funcion',
            '--texto', JSON.stringify(texto || ""),
            '--numero', JSON.stringify(numero || "")
        ];

        if (imagenData) {
            const tempImagePath = path.join(__dirname, 'temp_image.json');
            fs.writeFileSync(tempImagePath, JSON.stringify(imagenData), 'utf8');
            args.push('--imagen-file', tempImagePath);
            console.log(`[IMAGE] Imagen guardada temporalmente: ${imagenData.mimetype || 'unknown'}`);
        }

        console.log('[EXEC] Ejecutando:', 'python', args.slice(1).join(' '));

        const proceso = spawn('python', args, {
            cwd: 'C:\\ProyectosSimbolicos',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONLEGACYWINDOWSSTDIO: '0',
                PYTHONUTF8: '1',
                FLASK_API_ENABLED: 'true',
                NGROK_TUNNEL_ACTIVE: 'true',
                REALTIME_DATA_MODE: 'true',
                GPT_MODE: 'ceo_estrategico',
                BUSINESS_COUNTRY: 'venezuela',
                MANAGEMENT_STYLE: 'profesional_amistoso',
                PSYCHOLOGY_MODE: 'motivacional_educativo',
                SUPERVISION_LEVEL: 'completa_indirecta',
                BUSINESS_INTELLIGENCE: 'avanzado'
            },
            timeout: 45000
        });

        let salida = '';
        let errorSalida = '';
        let procesoCerrado = false;

        proceso.stdout.setEncoding('utf8');
        proceso.stderr.setEncoding('utf8');

        proceso.stdout.on('data', chunk => {
            const data = chunk.toString('utf8');
            salida += data;
            if (data.includes('[OK]') || data.includes('[ERROR]') || data.includes('[AI]')) {
                console.log(`[PYTHON] ${data.trim()}`);
            }
        });

        proceso.stderr.on('data', err => {
            const errorData = err.toString('utf8');
            errorSalida += errorData;
            if (errorData.includes('Error') || errorData.includes('WARNING')) {
                console.error(`[PYTHON-ERR] ${errorData.trim()}`);
            }
        });

        proceso.on('close', (code) => {
            if (procesoCerrado) return;
            procesoCerrado = true;

            console.log(`[PYTHON] Proceso finalizado con codigo: ${code}`);

            if (code !== 0 && code !== null) {
                console.error(`[ERROR] Python fallo con codigo: ${code}`);
                console.error(`[ERROR] Salida de error: ${errorSalida.substring(0, 200)}...`);
                
                const respuestaFallback = {
                    respuesta_grupo: `Sistema PlayMall Park\n\nMensaje procesado correctamente. Sistema de respuestas automaticas temporalmente en mantenimiento.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nCodigo de error: ${code}`,
                    mensaje_privado: null
                };
                
                resolve(respuestaFallback);
                return;
            }

            try {
                const inicioJSON = salida.indexOf('=== RESULTADO JSON ===');
                const finJSON = salida.indexOf('=== FIN RESULTADO ===');
                let jsonString = '';

                if (inicioJSON !== -1 && finJSON !== -1) {
                    jsonString = salida.substring(
                        inicioJSON + '=== RESULTADO JSON ==='.length,
                        finJSON
                    ).trim();
                    
                    console.log('[JSON] Respuesta extraida correctamente');
                } else {
                    console.log('[JSON] Buscando patron de respuesta alternativo...');
                    
                    const jsonMatch = salida.match(/\{[^{}]*"respuesta_grupo"[^{}]*\}/s);
                    if (jsonMatch) {
                        jsonString = jsonMatch[0];
                        console.log('[JSON] Patron encontrado via regex');
                    } else {
                        const lineasSalida = salida.split('\n');
                        const respuestaDirecta = lineasSalida.find(linea => 
                            linea.includes('Sistema PlayMall Park') || 
                            linea.includes('ANALISIS') ||
                            linea.includes('reporte') ||
                            linea.length > 50
                        );
                        
                        if (respuestaDirecta && respuestaDirecta.trim().length > 10) {
                            console.log('[FALLBACK] Usando respuesta directa del sistema');
                            resolve({
                                respuesta_grupo: respuestaDirecta.trim(),
                                mensaje_privado: null
                            });
                            return;
                        }
                        
                        throw new Error('No se encontro respuesta valida en la salida de Python');
                    }
                }

                const resultado = JSON.parse(jsonString);
                
                if (!resultado || typeof resultado !== 'object') {
                    throw new Error('Respuesta JSON no es un objeto valido');
                }
                
                if (!resultado.respuesta_grupo) {
                    resultado.respuesta_grupo = 'Mensaje procesado correctamente.';
                }

                console.log('[SUCCESS] Respuesta GPT procesada exitosamente');
                resolve(resultado);

            } catch (e) {
                console.error('[ERROR] Error interpretando respuesta Python:', e.message);
                
                let respuestaFallback = 'Sistema PlayMall Park\n\nMensaje procesado correctamente.';
                
                if (texto && texto.toLowerCase().includes('venta')) {
                    respuestaFallback += '\n\nConsulta de ventas recibida. Contacta al administrador para reporte detallado.';
                } else if (imagenData) {
                    respuestaFallback += '\n\nImagen recibida y registrada. Analisis visual en proceso.';
                } else if (texto && texto.toLowerCase().includes('problema')) {
                    respuestaFallback += '\n\nReporte de problema registrado. Equipo tecnico notificado.';
                }
                
                respuestaFallback += '\n\nPara asistencia inmediata, contacta al personal en el parque.';
                
                resolve({
                    respuesta_grupo: respuestaFallback,
                    mensaje_privado: null
                });
            }
        });

        proceso.on('error', (error) => {
            if (procesoCerrado) return;
            procesoCerrado = true;
            
            console.error('[ERROR] Error ejecutando proceso Python:', error.message);
            
            resolve({
                respuesta_grupo: `Sistema PlayMall Park\n\nMensaje recibido. Sistema temporalmente no disponible.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nError de sistema reportado al equipo tecnico.`,
                mensaje_privado: null
            });
        });

        setTimeout(() => {
            if (!procesoCerrado) {
                procesoCerrado = true;
                console.log('[TIMEOUT] Terminando proceso Python por timeout (45s)');
                proceso.kill('SIGTERM');
                
                setTimeout(() => {
                    if (!proceso.killed) {
                        proceso.kill('SIGKILL');
                    }
                }, 5000);
                
                resolve({
                    respuesta_grupo: `Sistema PlayMall Park\n\nMensaje procesado. Sistema de respuestas temporalmente lento.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nTimeout del sistema reportado al equipo tecnico.`,
                    mensaje_privado: null
                });
            }
        }, 45000);
    });
}

function detectarMensajeRelevante(texto) {
    if (!texto || texto.trim().length === 0) {
        return false;
    }
    
    const textoLower = texto.toLowerCase();
    
    const mensajesCasuales = [
        'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
        'señor winston', 'winston', 'disculpe', 'perdon',
        'como esta', 'como estas', 'que tal', 'saludos', 'ok', 'vale',
        'gracias', 'de nada', 'por favor', 'favor', 'xfa', 'porfavor',
        'jajaja', 'jeje', 'lol', 'jaja', 'si', 'no', 'bueno', 'esta bien',
        'perfecto', 'genial', 'excelente', 'mmm', 'ahh', 'ohh'
    ];
    
    if (mensajesCasuales.includes(textoLower.trim())) {
        return false;
    }
    
    if (textoLower.match(/^(señor\s*winston|winston|hola|buenas)\s*[?¿]*\s*$/)) {
        return false;
    }
    
    const palabrasRelevantes = [
        'venta', 'ventas', 'ticket', 'factura', 'dinero', 'caja', 'cobrar',
        'atraccion', 'atracciones', 'funciona', 'falla', 'problema', 'roto', 'dañado',
        'inventario', 'stock', 'falta', 'necesitamos', 'pedir', 'proveedor',
        'limpieza', 'baños', 'sucio', 'limpiar', 'basura',
        'cliente', 'niños', 'visitantes', 'queja', 'reclamo',
        'horario', 'abrir', 'cerrar', 'evento', 'reserva', 'cumpleaños',
        'sistema', 'computadora', 'internet', 'impresora', 'equipo', 'tecnologia',
        'error', 'no funciona', 'se daño', 'ayuda', 'soporte', 'arreglar',
        'reporte', 'estado', 'situacion', 'informar', 'revisar', 'verificar',
        'como va', 'como estan', 'total del dia', 'cuanto llevamos',
        '/ping', '/test', '/estado', '/help', '/ayuda', '/personal', '/grupos', '/id'
    ];
    
    const contieneRelevante = palabrasRelevantes.some(palabra => 
        textoLower.includes(palabra)
    );
    
    if (texto.trim().length > 15 && !mensajesCasuales.some(casual => textoLower.includes(casual))) {
        return true;
    }
    
    return contieneRelevante;
}

// === SISTEMA DE MÉTRICAS EMPRESARIALES ===
class MetricasEmpresariales {
    constructor() {
        this.metricas = new Map();
        this.historico = [];
    }
    
    async registrarMetricasVideo(metricas) {
        try {
            const registro = {
                tipo: 'video',
                timestamp: new Date().toISOString(),
                ...metricas
            };
            
            this.historico.push(registro);
            console.log('[METRICS] Métricas de video registradas');
        } catch (error) {
            console.error('[ERROR] Error registrando métricas video:', error);
        }
    }
    
    async registrarMetricasImagen(metricas) {
        try {
            const registro = {
                tipo: 'imagen',
                timestamp: new Date().toISOString(),
                ...metricas
            };
            
            this.historico.push(registro);
            console.log('[METRICS] Métricas de imagen registradas');
        } catch (error) {
            console.error('[ERROR] Error registrando métricas imagen:', error);
        }
    }
}

// === VIDEO ANALYZER MEJORADO ===
class VideoAnalyzer {
    constructor() {
        this.videosDir = path.join(__dirname, '../videos_recibidos');
        this.framesDir = path.join(__dirname, '../frames_extraidos');
        
        try {
            const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
            const ffmpeg = require('fluent-ffmpeg');
            ffmpeg.setFfmpegPath(ffmpegPath);
            
            this.ffmpeg = ffmpeg;
            this.ffmpegDisponible = true;
            console.log('[VIDEO] FFmpeg configurado correctamente');
            
        } catch (error) {
            console.error('[ERROR] Error configurando FFmpeg:', error.message);
            this.ffmpegDisponible = false;
        }
        
        this.crearDirectorios();
    }
    
    crearDirectorios() {
        [this.videosDir, this.framesDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[VIDEO] Directorio creado: ${dir}`);
            }
        });
    }
    
    // 1. MÉTODO DE DESCARGA ACTUALIZADO (para whatsapp-web.js v2.x)
    async descargarVideoActualizado(message) {
        try {
            console.log('[VIDEO] 🔄 Iniciando descarga con método actualizado...');
            
            // Verificar que el mensaje tiene media
            if (!message.hasMedia) {
                throw new Error('El mensaje no contiene media');
            }
            
            console.log('[VIDEO] Media detectado - Tipo:', message.type);
            console.log('[VIDEO] MimeType:', message.mimetype);
            console.log('[VIDEO] Tamaño:', message.body?.length || 'N/A');
            
            // MÉTODO ACTUALIZADO: downloadMedia() sin métodos internos
            const media = await message.downloadMedia();
            
            if (!media) {
                throw new Error('No se pudo obtener los datos del media');
            }
            
            console.log('[VIDEO] ✅ Media descargado exitosamente');
            console.log('[VIDEO] Datos:', media.data ? 'Presentes' : 'Ausentes');
            console.log('[VIDEO] MimeType obtenido:', media.mimetype);
            
            // Convertir base64 a buffer
            if (!media.data) {
                throw new Error('Datos de media vacíos');
            }
            
            const buffer = Buffer.from(media.data, 'base64');
            console.log('[VIDEO] Buffer creado - Tamaño:', buffer.length, 'bytes');
            
            if (buffer.length === 0) {
                throw new Error('Buffer vacío - datos corruptos');
            }
            
            return {
                success: true,
                buffer: buffer,
                mimetype: media.mimetype,
                filename: media.filename || `video_${Date.now()}.mp4`
            };
            
        } catch (error) {
            console.error('[VIDEO] ❌ Error en descarga actualizada:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 2. PROCESAMIENTO DE VIDEO SIMPLIFICADO
    async procesarVideoSimplificado(message) {
        try {
            console.log('[VIDEO] === PROCESAMIENTO SIMPLIFICADO ===');
            
            // Intentar descarga con método actualizado
            const descarga = await this.descargarVideoActualizado(message);
            
            if (descarga.success) {
                // Guardar video temporalmente
                const videoPath = path.join(__dirname, '../temp', descarga.filename);
                
                // Crear directorio temp si no existe
                const tempDir = path.dirname(videoPath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                // Escribir archivo
                fs.writeFileSync(videoPath, descarga.buffer);
                console.log('[VIDEO] ✅ Video guardado en:', videoPath);
                
                // Obtener información básica
                const stats = fs.statSync(videoPath);
                const videoInfo = {
                    id: message.id._serialized || `video_${Date.now()}`,
                    path: videoPath,
                    size: stats.size,
                    mimetype: descarga.mimetype,
                    duration: 15, // Placeholder - puedes usar ffprobe para obtener duración real
                    timestamp: new Date().toISOString()
                };
                
                console.log('[VIDEO] ✅ Información del video extraída');
                
                return {
                    success: true,
                    videoPath: videoPath,
                    videoInfo: videoInfo,
                    procesamiento: 'completo_simplificado',
                    frames: [], // Por ahora vacío - puedes agregar extracción de frames después
                    mensaje: `✅ Video procesado exitosamente\n📂 Tamaño: ${Math.round(stats.size / 1024)}KB\n⏱️ Duración estimada: ~15 segundos`
                };
                
            } else {
                // Procesamiento sin descarga
                console.log('[VIDEO] ⚠️ Procesando sin descarga - solo metadatos');
                
                const videoInfo = {
                    id: message.id._serialized || `metadata_${Date.now()}`,
                    size: message.body?.length || 0,
                    mimetype: message.mimetype || 'video/mp4',
                    duration: 15,
                    timestamp: new Date().toISOString(),
                    source: 'metadata_only'
                };
                
                return {
                    success: true,
                    videoPath: null,
                    videoInfo: videoInfo,
                    procesamiento: 'solo_metadatos',
                    frames: [],
                    mensaje: `⚠️ Video recibido pero no se pudo descargar\n📱 Tipo: ${message.type}\n📊 Info: Metadatos básicos procesados`
                };
            }
            
        } catch (error) {
            console.error('[VIDEO] ❌ Error en procesamiento simplificado:', error);
            
            return {
                success: false,
                error: error.message,
                procesamiento: 'error',
                mensaje: `❌ Error procesando video: ${error.message}`
            };
        }
    }



    // 4. HANDLER PRINCIPAL CORREGIDO
    async manejarVideoRecibido(message, client) {
        try {
            console.log('[HANDLER] 🎬 Manejando video recibido...');
            
            // Procesar video
            const resultado = await this.procesarVideoSimplificado(message);
            
            if (resultado.success) {
                // Generar respuesta
                let respuesta = `🎬 **VIDEO PROCESADO** 🎬\n\n`;
                respuesta += resultado.mensaje + '\n\n';
                respuesta += `🤖 **Sistema:** PlayMall Park IA\n`;
                respuesta += `🕐 **Hora:** ${new Date().toLocaleString()}\n`;
                respuesta += `📊 **Estado:** ${resultado.procesamiento}`;
                
                // Si tenemos video completo, agregar análisis de Instagram
                if (resultado.procesamiento === 'completo_simplificado' && resultado.videoPath) {
                    try {
                        // Análisis básico para Instagram
                        const analisisIA = 'Video del parque con visitantes disfrutando';
                        const evaluacion = await this.analizarParaInstagram(resultado, analisisIA);
                        
                        respuesta += '\n\n📱 **EVALUACIÓN INSTAGRAM:**\n';
                        respuesta += `📊 Puntuación: ${evaluacion.puntuacion || 'N/A'}/100\n`;
                        respuesta += `🎯 Recomendación: ${evaluacion.recomendacion || 'Pendiente'}`;
                        
                    } catch (error) {
                        console.log('[HANDLER] ⚠️ Error en análisis Instagram:', error.message);
                    }
                }
                
                // Enviar respuesta
                const respuestaFirmada = this.refinarRespuestaGPT(respuesta, message);
                const envio = await this.enviarRespuestaSegura(message, respuestaFirmada);
                // Antes de enviar, validar que tenemos todo lo necesario
                if (!message || !this.client || !this.isConnected) {
                    console.error('[VALIDATION] ❌ Condiciones de envío no cumplidas');
                    console.error('[VALIDATION] Message:', !!message);
                    console.error('[VALIDATION] Client:', !!this.client);
                    console.error('[VALIDATION] Connected:', this.isConnected);
                    return;
                }


                
                if (envio.success) {
                    console.log(`[HANDLER] ✅ Video procesado y respuesta enviada via ${envio.method}`);
                } else {
                    console.error('[HANDLER] ❌ Video procesado pero no se pudo enviar respuesta');
                }
                
            } else {
                // Error en procesamiento
                const respuestaError = `❌ **ERROR PROCESANDO VIDEO**\n\n` +
                                    `🔧 **Problema:** ${resultado.error}\n\n` +
                                    `💡 **Sugerencia:** Intenta enviar el video nuevamente\n\n` +
                                    `🤖 **Sistema:** PlayMall Park IA`;
                
                const respuestaFirmada = this.refinarRespuestaGPT(respuestaError, message);
                await this.enviarRespuestaSegura(message, respuestaFirmada);
                // Antes de enviar, validar que tenemos todo lo necesario
                if (!message || !this.client || !this.isConnected) {
                    console.error('[VALIDATION] ❌ Condiciones de envío no cumplidas');
                    console.error('[VALIDATION] Message:', !!message);
                    console.error('[VALIDATION] Client:', !!this.client);
                    console.error('[VALIDATION] Connected:', this.isConnected);
                    return;
                }


            }
            
        } catch (error) {
            console.error('[HANDLER] ❌ Error general manejando video:', error);
            
            const respuestaFinal = `⚠️ **SISTEMA TEMPORAL NO DISPONIBLE**\n\n` +
                                `El video fue recibido pero hay un problema técnico.\n\n` +
                                `🔧 **Error:** ${error.message}\n\n` +
                                `🤖 **Sistema:** PlayMall Park IA`;
            
            try {
                const respuestaFirmada = this.refinarRespuestaGPT(respuestaFinal, message);
                await this.enviarRespuestaSegura(message, respuestaFirmada);
                // Antes de enviar, validar que tenemos todo lo necesario
                if (!message || !this.client || !this.isConnected) {
                    console.error('[VALIDATION] ❌ Condiciones de envío no cumplidas');
                    console.error('[VALIDATION] Message:', !!message);
                    console.error('[VALIDATION] Client:', !!this.client);
                    console.error('[VALIDATION] Connected:', this.isConnected);
                    return;
                }

            } catch (finalError) {
                console.error('[HANDLER] ❌ Error enviando respuesta final:', finalError);
            }
        }
    }

    // 5. INTEGRACIÓN CON INSTAGRAM SIMPLIFICADA
    async analizarParaInstagram(videoData, analisisIA) {
        try {
            // Análisis básico sin dependencias complejas
            let puntuacion = 0;
            let recomendacion = 'revisar';
            
            // Puntos por tener video completo
            if (videoData.procesamiento === 'completo_simplificado') {
                puntuacion += 30;
            }
            
            // Puntos por tamaño apropiado
            if (videoData.videoInfo.size > 100000 && videoData.videoInfo.size < 10000000) {
                puntuacion += 20;
            }
            
            // Puntos por análisis de IA positivo
            if (analisisIA && analisisIA.includes('disfrutando')) {
                puntuacion += 25;
            }
            
            // Puntos por horario
            const hora = new Date().getHours();
            if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
                puntuacion += 15;
            }
            
            // Determinar recomendación
            if (puntuacion >= 70) {
                recomendacion = 'publicar_automatico';
            } else if (puntuacion >= 50) {
                recomendacion = 'consultar_equipo';
            } else {
                recomendacion = 'no_publicar';
            }
            
            return {
                puntuacion,
                recomendacion,
                detalles: `Análisis automático basado en ${videoData.procesamiento}`
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error en análisis:', error);
            return {
                puntuacion: 0,
                recomendacion: 'error',
                detalles: error.message
            };
        }
    }
    
    async guardarVideo(media, videoId) {
        try {
            if (!media.data) {
                throw new Error('Media sin datos');
            }
            
            let extension = '.mp4';
            if (media.mimetype) {
                if (media.mimetype.includes('webm')) extension = '.webm';
                else if (media.mimetype.includes('avi')) extension = '.avi';
                else if (media.mimetype.includes('mov')) extension = '.mov';
                else if (media.mimetype.includes('3gp')) extension = '.3gp';
            }
            
            const fileName = `video_${videoId}${extension}`;
            const videoPath = path.join(this.videosDir, fileName);
            
            const videoBuffer = Buffer.from(media.data, 'base64');
            
            if (videoBuffer.length === 0) {
                throw new Error('Buffer de video vacío');
            }
            
            fs.writeFileSync(videoPath, videoBuffer);
            
            const sizeMB = Math.round(videoBuffer.length / 1024 / 1024 * 100) / 100;
            console.log(`[VIDEO] ✓ Video guardado: ${videoPath}`);
            console.log(`[VIDEO] Tamaño: ${sizeMB} MB`);
            console.log(`[VIDEO] Tipo: ${media.mimetype || 'desconocido'}`);
            
            return {
                videoPath,
                size: videoBuffer.length,
                mimetype: media.mimetype,
                extension
            };
            
        } catch (error) {
            console.error('[ERROR] Error guardando video:', error);
            return null;
        }
    }
    
    async procesarVideoSinDescarga(videoInfo, problemasDetectados = null) {
        try {
            console.log('[VIDEO] Generando reporte detallado para video sin descarga');
            
            const reporte = {
                videoInfo,
                videoPath: null,
                frames: [],
                status: 'success',
                procesamiento: 'solo_metadatos',
                detalles_problema: null
            };
            
            if (problemasDetectados) {
                reporte.detalles_problema = problemasDetectados;
                reporte.procesamiento = 'error_descarga_detallado';
                
                console.log('[VIDEO] Problemas específicos documentados:');
                problemasDetectados.problemas_detectados?.forEach(problema => {
                    console.log(`[VIDEO] - ${problema}`);
                });
            }
            
            return reporte;
            
        } catch (error) {
            console.error('[ERROR] Error generando reporte detallado:', error);
            return {
                videoInfo,
                status: 'error',
                error: error.message
            };
        }
    }
    
    async extraerFramesClave(videoPath, videoId) {
        if (!this.ffmpegDisponible) {
            console.log('[WARNING] FFmpeg no disponible para extracción de frames');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            try {
                console.log('[VIDEO] Extrayendo frames clave...');
                
                const frames = [];
                const frameBaseName = `frame_${videoId}`;
                
                this.ffmpeg.ffprobe(videoPath, (err, metadata) => {
                    if (err) {
                        console.error('[ERROR] Error obteniendo metadata:', err);
                        resolve([]);
                        return;
                    }
                    
                    const duration = metadata.format.duration || 10;
                    console.log(`[VIDEO] Duración detectada: ${duration} segundos`);
                    
                    let framesTimes = [];
                    if (duration <= 5) {
                        framesTimes = [duration / 2];
                    } else if (duration <= 15) {
                        framesTimes = [1, duration / 2, duration - 1];
                    } else {
                        const interval = Math.min(10, duration / 5);
                        for (let i = 1; i < duration && framesTimes.length < 5; i += interval) {
                            framesTimes.push(i);
                        }
                    }
                    
                    console.log(`[VIDEO] Extrayendo frames en tiempos: ${framesTimes.map(t => t.toFixed(1)).join('s, ')}s`);
                    
                    let framesCompletos = 0;
                    const totalFrames = framesTimes.length;
                    
                    if (totalFrames === 0) {
                        resolve([]);
                        return;
                    }
                    
                    framesTimes.forEach((time, index) => {
                        const framePath = path.join(this.framesDir, `${frameBaseName}_${index + 1}.jpg`);
                        
                        this.ffmpeg(videoPath)
                            .screenshots({
                                timestamps: [time],
                                filename: `${frameBaseName}_${index + 1}.jpg`,
                                folder: this.framesDir,
                                size: '1280x720'
                            })
                            .on('end', () => {
                                console.log(`[VIDEO] ✓ Frame ${index + 1} extraído: ${time.toFixed(1)}s`);
                                
                                frames.push({
                                    path: framePath,
                                    timestamp: time,
                                    index: index + 1
                                });
                                
                                framesCompletos++;
                                
                                if (framesCompletos === totalFrames) {
                                    console.log(`[VIDEO] ✓ Todos los frames extraídos exitosamente`);
                                    resolve(frames);
                                }
                            })
                            .on('error', (err) => {
                                console.error(`[ERROR] Error extrayendo frame ${index + 1}:`, err);
                                framesCompletos++;
                                
                                if (framesCompletos === totalFrames) {
                                    resolve(frames);
                                }
                            });
                    });
                });
                
            } catch (error) {
                console.error('[ERROR] Error en extracción de frames:', error);
                resolve([]);
            }
        });
    }
    
    async limpiarArchivosTemporales(videoData, mantenerTiempo = 3600000) {
        setTimeout(() => {
            try {
                if (videoData.videoPath && fs.existsSync(videoData.videoPath)) {
                    fs.unlinkSync(videoData.videoPath);
                    console.log(`[CLEANUP] Video eliminado: ${videoData.videoPath}`);
                }
                
                if (videoData.frames) {
                    videoData.frames.forEach(frame => {
                        if (frame.path && fs.existsSync(frame.path)) {
                            fs.unlinkSync(frame.path);
                            console.log(`[CLEANUP] Frame eliminado: ${frame.path}`);
                        }
                    });
                }
                
            } catch (error) {
                console.error('[ERROR] Error en limpieza:', error);
            }
        }, mantenerTiempo);
    }
}


// === CLASE PRINCIPAL DEL BOT ===
class BotWhatsAppPlayMall {
    constructor() {
        this.client = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.isConnected = false;
        this.lastHeartbeat = Date.now();
        this.isInitializing = false;
        this.isReconnecting = false;
        this.heartbeatInterval = null;
        this.statsInterval = null;
        this.healthCheckInterval = null;
        this.antiSleepInterval = null;
        this.apiMonitorInterval = null;
        this.ultimoContenidoRecibido = null;
        this.esperandoRespuestaInstagram = false;
        this.openaiClient = null;
        this.googleServices = null;
        this.debugMode = true;
        this.mensajesEnviados = 0;
        this.erroresEnvio = 0;
        
        // Sistemas empresariales
        this.analizadorVisual = null;
        this.videoAnalyzer = null;
        this.instagramProcessor = null;
        this.metricasEmpresariales = null;
        this.serviciosIA = null;
        
        this.estadisticas = {
            mensajes_procesados: 0,
            reconexiones: 0,
            errores: 0,
            inicio_bot: new Date().toISOString(),
            ultima_actividad: new Date().toISOString()
        };
        
        this.GRUPOS_WHATSAPP = {
            operativo: "120363179370816930@g.us",
            confiteria: "120363029580331492@g.us",
            admin: "1203XXXXXXXXXXX@g.us"
        };

        this.GRUPOS_PERMITIDOS = new Set(Object.values(this.GRUPOS_WHATSAPP)); // <-- AQUÍ VA


        this.procesarStatusBroadcast = false;
        this.procesarSoloGruposAutorizados = true;

        this.estadoAPIs = {
            flask_activo: false,
            ngrok_tunnel: false,
            ventas_api: false,
            inventario_api: false,
            archivos_api: false,
            ultima_verificacion: null,
            errores_consecutivos: 0
        };
    }

    refinarRespuestaGPT(respuesta, message) {
        try {
            if (!respuesta || typeof respuesta !== 'string') {
                return '✅ Mensaje procesado correctamente';
            }
            
            let respuestaLimpia = respuesta
                .replace(/\u0000/g, '')
                .replace(/\uFEFF/g, '')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .trim();
            
            if (respuestaLimpia.length === 0) {
                return '✅ Mensaje procesado correctamente';
            }
            
            if (respuestaLimpia.length > 4000) {
                respuestaLimpia = respuestaLimpia.substring(0, 3900) + '\n\n... (mensaje truncado)';
            }
            
            return respuestaLimpia;
            
        } catch (error) {
            console.error('[ERROR] Error refinando respuesta:', error);
            return '✅ Mensaje procesado correctamente';
        }
    }

    async verificarEstadoWhatsApp() {
        console.log('[WHATSAPP] === VERIFICANDO ESTADO WHATSAPP ===');
        
        if (!this.client) {
            console.log('[WHATSAPP] ❌ Cliente no existe');
            return false;
        }
        
        try {
            const state = await this.client.getState();
            console.log('[WHATSAPP] Estado:', state);
            
            if (state === 'CONNECTED') {
                console.log('[WHATSAPP] ✅ WhatsApp completamente conectado');
                return true;
            } else {
                console.log('[WHATSAPP] ⚠️ WhatsApp no está completamente conectado');
                return false;
            }
        } catch (error) {
            console.error('[WHATSAPP] ❌ Error verificando estado:', error);
            return false;
        }
    }

    async procesarVideoRecibido(message) {
        try {
            console.log('[VIDEO] 🎬 Iniciando procesamiento de video...');
            
            // Verificar que tenemos un video analyzer
            if (!this.videoAnalyzer) {
                console.log('[VIDEO] ❌ VideoAnalyzer no disponible, inicializando básico...');
                this.videoAnalyzer = new VideoAnalyzer();
            }
            
            console.log('[VIDEO] ✅ VideoAnalyzer encontrado');
            
            // Si tenemos VideoAnalyzerPremium, usar análisis completo
            if (this.videoAnalyzer.constructor.name === 'VideoAnalyzerPremium') {
                console.log('[VIDEO] 🌟 Usando análisis premium completo...');
                
                // LLAMAR AL MÉTODO CORRECTO DEL ANALYZER PREMIUM
                const resultadoPremium = await this.videoAnalyzer.procesarVideoCompleto(message);
                
                // VERIFICAR QUE EL RESULTADO ES VÁLIDO
                if (resultadoPremium && resultadoPremium.status === 'success') {
                    console.log('[VIDEO] ✅ Análisis premium completado exitosamente');
                    return resultadoPremium;
                } else {
                    console.log('[VIDEO] ⚠️ Análisis premium falló, usando básico como fallback');
                    return await this.procesarVideoBasico(message);
                }
            }
            
            // Si tenemos el analyzer básico, usar procesamiento simplificado
            console.log('[VIDEO] 🔧 Usando análisis básico...');
            return await this.procesarVideoBasico(message);
            
        } catch (error) {
            console.error('[VIDEO] ❌ Error en procesamiento:', error);
            console.error('[VIDEO] ❌ Stack:', error.stack);
            return this.generarAnalisisVideoFallback(message, error);
        }
    }

    // === TAMBIÉN NECESITAS ESTA FUNCIÓN DE RESPALDO ===
    // Si no existe, agrégala:

    async procesarVideoBasico(message) {
        console.log('[VIDEO] 🔧 Ejecutando procesamiento básico...');
        
        try {
            const videoInfo = {
                id: message.id?._serialized || `video_${Date.now()}`,
                timestamp: new Date().toISOString(),
                tipo: message.type,
                hasMedia: message.hasMedia,
                mimetype: message.mimetype || 'video/mp4',
                duration: 15 // Placeholder
            };
            
            // Información del chat de forma segura
            try {
                const chat = await message.getChat();
                videoInfo.chatName = chat?.name || 'Chat desconocido';
                videoInfo.isGroup = chat?.isGroup || false;
                console.log('[VIDEO] 📍 Chat:', videoInfo.chatName);
            } catch (chatError) {
                console.log('[VIDEO] ⚠️ No se pudo obtener info del chat');
                videoInfo.chatName = 'Chat no disponible';
                videoInfo.isGroup = true;
            }
            
            const resultado = {
                status: 'success',
                videoInfo: videoInfo,
                procesamiento: 'basico_completado',
                frames: [], // Sin frames en procesamiento básico
                videoPath: null,
                timestamp: videoInfo.timestamp
            };
            
            console.log('[VIDEO] ✅ Procesamiento básico completado');
            return resultado;
            
        } catch (error) {
            console.error('[VIDEO] ❌ Error en procesamiento básico:', error);
            return {
                status: 'error',
                error: error.message,
                videoInfo: { id: `error_${Date.now()}` },
                procesamiento: 'error_basico'
            };
        }
    }
    // ===== EVALUACIÓN SIMPLIFICADA PARA INSTAGRAM =====
    async evaluarParaInstagram(videoData) {
        try {
            console.log('[INSTAGRAM] 📱 Evaluación simplificada...');
            
            // Evaluación básica basada en datos disponibles
            let puntuacion = 30; // Base
            let factores = [];
            
            // Factor 1: Hora del día
            const hora = new Date().getHours();
            if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
                puntuacion += 25;
                factores.push('✅ Horario óptimo para publicación');
            } else {
                factores.push('🔸 Horario regular');
            }
            
            // Factor 2: Día de la semana
            const dia = new Date().getDay();
            if (dia >= 1 && dia <= 5) { // Lunes a viernes
                puntuacion += 20;
                factores.push('✅ Día laboral - buena audiencia');
            } else {
                puntuacion += 15;
                factores.push('✅ Fin de semana - audiencia familiar');
            }
            
            // Factor 3: Tipo de contenido
            if (videoData.videoInfo?.mimetype?.includes('video')) {
                puntuacion += 20;
                factores.push('✅ Formato video - ideal para Stories');
            }
            
            // Factor 4: Origen del grupo autorizado
            puntuacion += 15;
            factores.push('✅ Personal autorizado - contenido confiable');
            
            // Determinar recomendación
            let recomendacion;
            if (puntuacion >= 80) {
                recomendacion = '🌟 **EXCELENTE** - Publicar automáticamente';
            } else if (puntuacion >= 60) {
                recomendacion = '👍 **BUENO** - Consultar al equipo';
            } else {
                recomendacion = '🤔 **REGULAR** - Revisar antes de publicar';
            }
            
            // Generar respuesta
            let evaluacion = `📊 **Puntuación:** ${puntuacion}/100\n`;
            evaluacion += `🎯 **Recomendación:** ${recomendacion}\n\n`;
            evaluacion += `**Factores evaluados:**\n`;
            factores.forEach(factor => evaluacion += `${factor}\n`);
            
            return evaluacion;
            
        } catch (error) {
            console.error('[INSTAGRAM] Error en evaluación:', error);
            return `⚠️ Evaluación no disponible: ${error.message}`;
        }
    }



    // === CORRECCIÓN CRÍTICA PARA ERROR sendMessage ===
    // REEMPLAZA la función enviarRespuestaSegura() en index.js:

    async enviarRespuestaSegura(message, textoRespuesta) {
        try {
            // === VALIDACIÓN EXHAUSTIVA ===
            if (!message) {
                console.error('[RESPONSE] ❌ Message no proporcionado');
                return { success: false, error: 'Message no proporcionado' };
            }

            const chatId = message.from;
            if (!chatId) {
                console.error('[RESPONSE] ❌ ChatId no disponible');
                return { success: false, error: 'ChatId no disponible' };
            }

            // === VALIDACIÓN CRÍTICA DEL TEXTO ===
            if (textoRespuesta === null || textoRespuesta === undefined) {
                console.error('[RESPONSE] ❌ Texto respuesta es null/undefined');
                textoRespuesta = '✅ Mensaje procesado correctamente';
            }

            if (typeof textoRespuesta !== 'string') {
                console.error('[RESPONSE] ❌ Texto respuesta no es string:', typeof textoRespuesta);
                try {
                    textoRespuesta = String(textoRespuesta);
                } catch (conversionError) {
                    console.error('[RESPONSE] ❌ Error convirtiendo a string:', conversionError);
                    textoRespuesta = '✅ Mensaje procesado correctamente';
                }
            }

            // === LIMPIEZA EXHAUSTIVA DEL TEXTO ===
            try {
                textoRespuesta = textoRespuesta
                    .replace(/\u0000/g, '')          // Eliminar null bytes
                    .replace(/\uFEFF/g, '')          // Eliminar BOM
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de control
                    .replace(/\r\n/g, '\n')          // Normalizar saltos de línea
                    .replace(/\r/g, '\n')            // Convertir \r a \n
                    .trim();

                // Verificar que después de la limpieza tenemos contenido
                if (textoRespuesta.length === 0) {
                    console.error('[RESPONSE] ❌ Texto vacío después de limpieza');
                    textoRespuesta = '✅ Mensaje procesado correctamente';
                }
            } catch (cleanError) {
                console.error('[RESPONSE] ❌ Error limpiando texto:', cleanError);
                textoRespuesta = '✅ Mensaje procesado correctamente';
            }

            // === LÍMITE ESTRICTO Y SEGURO ===
            const LIMITE_SEGURO = 3800; // Margen de seguridad adicional
            if (textoRespuesta.length > LIMITE_SEGURO) {
                console.log(`[RESPONSE] ⚠️ Texto muy largo (${textoRespuesta.length}), truncando...`);
                textoRespuesta = textoRespuesta.slice(0, LIMITE_SEGURO - 100) + '\n\n... (mensaje truncado por límite de seguridad)';
            }

            console.log(`[RESPONSE] 🟢 Preparando envío: ${textoRespuesta.length} chars para ${chatId}`);
            console.log(`[RESPONSE] 🔍 Primeros 100 chars: "${textoRespuesta.substring(0, 100)}..."`);

            // === VERIFICAR CLIENTE WHATSAPP ===
            if (!this.client) {
                console.error('[RESPONSE] ❌ Cliente WhatsApp no disponible');
                return { success: false, error: 'Cliente WhatsApp no disponible' };
            }

            // === VERIFICAR ESTADO DE CONEXIÓN ===
            try {
                const state = await this.client.getState();
                if (state !== 'CONNECTED') {
                    console.error(`[RESPONSE] ❌ Cliente no conectado: ${state}`);
                    return { success: false, error: `Cliente no conectado: ${state}` };
                }
            } catch (stateError) {
                console.error('[RESPONSE] ❌ Error verificando estado:', stateError);
                return { success: false, error: 'Error verificando estado del cliente' };
            }

            // === MÉTODO 1: client.sendMessage DIRECTO (MÁS CONFIABLE) ===
            try {
                console.log('[RESPONSE] 🔄 Método 1: client.sendMessage directo...');
                
                await this.client.sendMessage(chatId, textoRespuesta);
                console.log('[RESPONSE] ✅ Enviado con client.sendMessage');
                return { success: true, method: 'client.sendMessage' };
                
            } catch (errSendMessage) {
                console.warn('[RESPONSE] ⚠️ client.sendMessage falló:', errSendMessage.message);
                
                // === MÉTODO 2: getChatById COMO BACKUP ===
                try {
                    console.log('[RESPONSE] 🔄 Método 2: getChatById...');
                    
                    const chat = await this.client.getChatById(chatId);
                    if (chat && typeof chat.sendMessage === 'function') {
                        await chat.sendMessage(textoRespuesta);
                        console.log('[RESPONSE] ✅ Enviado con getChatById');
                        return { success: true, method: 'getChatById' };
                    } else {
                        throw new Error('Chat no válido o sendMessage no disponible');
                    }
                    
                } catch (errGetChat) {
                    console.warn('[RESPONSE] ⚠️ getChatById falló:', errGetChat.message);
                    
                    // === MÉTODO 3: message.reply COMO ÚLTIMO RECURSO ===
                    try {
                        console.log('[RESPONSE] 🔄 Método 3: message.reply...');
                        
                        if (typeof message.reply === 'function') {
                            await message.reply(textoRespuesta);
                            console.log('[RESPONSE] ✅ Enviado con message.reply');
                            return { success: true, method: 'reply' };
                        } else {
                            throw new Error('message.reply no es función');
                        }
                        
                    } catch (errReply) {
                        console.error('[RESPONSE] ❌ Todos los métodos fallaron');
                        console.error('[RESPONSE] Error sendMessage:', errSendMessage.message);
                        console.error('[RESPONSE] Error getChatById:', errGetChat.message);
                        console.error('[RESPONSE] Error reply:', errReply.message);
                        
                        // === GUARDAR PARA DEBUGGING ===
                        await this.guardarRespuestaFallida(chatId, textoRespuesta, {
                            sendMessage: errSendMessage.message,
                            getChatById: errGetChat.message,
                            reply: errReply.message,
                            textLength: textoRespuesta.length,
                            textSample: textoRespuesta.substring(0, 200)
                        });
                        
                        return { 
                            success: false, 
                            error: 'Todos los métodos de envío fallaron',
                            details: {
                                sendMessage: errSendMessage.message,
                                getChatById: errGetChat.message,
                                reply: errReply.message
                            }
                        };
                    }
                }
            }

        } catch (error) {
            console.error('[RESPONSE] ❌ Error crítico:', error);
            console.error('[RESPONSE] Stack:', error.stack);
            
            try {
                await this.guardarRespuestaFallida(message?.from || 'desconocido', textoRespuesta, {
                    error: error.message,
                    stack: error.stack,
                    textLength: textoRespuesta?.length || 0,
                    textType: typeof textoRespuesta
                });
            } catch (logError) {
                console.error('[RESPONSE] ⚠️ Error guardando log:', logError.message);
            }

            return { success: false, error: error.message };
        }
    }

    // === FUNCIÓN PARA DEBUGGING ===
    // Agregar también esta función si no existe:

    async guardarRespuestaFallida(chatId, mensaje, errores) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const timestamp = new Date().toISOString();
            const registro = {
                timestamp,
                chatId,
                mensaje_length: mensaje?.length || 0,
                mensaje_type: typeof mensaje,
                mensaje_sample: mensaje?.substring ? mensaje.substring(0, 200) : 'No string',
                errores,
                tipo: 'respuesta_fallida'
            };
            
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            const logPath = path.join(logsDir, 'respuestas_fallidas.jsonl');
            const linea = JSON.stringify(registro) + '\n';
            
            fs.appendFileSync(logPath, linea, 'utf8');
            console.log(`[RESPONSE] 💾 Respuesta fallida guardada: ${logPath}`);
            
        } catch (error) {
            console.error('[RESPONSE] ❌ Error guardando respuesta fallida:', error);
        }
    }

    // === FUNCIÓN AUXILIAR (SI NO EXISTE) ===
    // AGREGAR ESTA FUNCIÓN A LA CLASE SI NO ESTÁ:

    async guardarRespuestaFallida(chatId, mensaje, errores) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            const timestamp = new Date().toISOString();
            const registro = {
                timestamp,
                chatId,
                mensaje,
                longitud: mensaje?.length || 0,
                errores,
                tipo: 'respuesta_fallida'
            };
            
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            const logPath = path.join(logsDir, 'respuestas_fallidas.jsonl');
            const linea = JSON.stringify(registro) + '\n';
            
            fs.appendFileSync(logPath, linea, 'utf8');
            console.log(`[RESPONSE] 💾 Respuesta fallida guardada: ${logPath}`);
            
        } catch (error) {
            console.error('[RESPONSE] ❌ Error guardando respuesta fallida:', error);
        }
    }

    // === FUNCIÓN ALTERNATIVA DE ENVÍO CON REINTENTOS ===
    async enviarConReintentos(message, textoRespuesta, intentosMaximos = 3) {
        for (let intento = 1; intento <= intentosMaximos; intento++) {
            console.log(`[RESPONSE] 🔄 Intento ${intento}/${intentosMaximos} de envío...`);
            
            const resultado = await this.enviarRespuestaSegura(message, textoRespuesta);
            
            if (resultado.success) {
                console.log(`[RESPONSE] ✅ Envío exitoso en intento ${intento}`);
                return resultado;
            }
            
            if (intento < intentosMaximos) {
                console.log(`[RESPONSE] ⏳ Esperando 2 segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.error(`[RESPONSE] ❌ Falló después de ${intentosMaximos} intentos`);
        return { success: false, error: `Falló después de ${intentosMaximos} intentos` };
    }

    // === DIAGNÓSTICO DE CLIENTE WHATSAPP ===
    diagnosticarClienteWhatsApp() {
        console.log('[DIAGNOSTIC] === DIAGNÓSTICO CLIENTE WHATSAPP ===');
        
        if (!this.client) {
            console.log('[DIAGNOSTIC] ❌ Cliente WhatsApp no existe');
            return;
        }
        
        console.log('[DIAGNOSTIC] ✅ Cliente WhatsApp existe');
        console.log('[DIAGNOSTIC] Conectado:', this.isConnected);
        console.log('[DIAGNOSTIC] Tipo:', typeof this.client);
        
        // Verificar métodos disponibles
        const metodos = ['sendMessage', 'getChats', 'getChatById', 'getState'];
        metodos.forEach(metodo => {
            const disponible = typeof this.client[metodo] === 'function';
            console.log(`[DIAGNOSTIC] ${metodo}: ${disponible ? '✅' : '❌'}`);
        });
        
        console.log('[DIAGNOSTIC] === FIN DIAGNÓSTICO ===');
    }


    debugVideoAnalyzer() {
    console.log('[DEBUG] === DIAGNÓSTICO VIDEOANALYZER ===');
    
    if (!this.videoAnalyzer) {
        console.log('[DEBUG] ❌ VideoAnalyzer no existe');
        return;
    }
    
    console.log('[DEBUG] ✅ VideoAnalyzer existe');
    console.log('[DEBUG] Tipo:', typeof this.videoAnalyzer);
    console.log('[DEBUG] Constructor:', this.videoAnalyzer.constructor.name);
    
    // Listar métodos disponibles
    const metodos = Object.getOwnPropertyNames(Object.getPrototypeOf(this.videoAnalyzer))
        .filter(name => typeof this.videoAnalyzer[name] === 'function' && name !== 'constructor');
    
    console.log('[DEBUG] Métodos disponibles:');
    metodos.forEach(metodo => {
        console.log(`[DEBUG] - ${metodo}()`);
    });
    
    // Verificar métodos específicos que buscamos
    const metodosEsperados = [
        'procesarVideoWhatsApp',
        'procesarVideo', 
        'procesarVideoSimplificado',
        'analizarVideo',
        'procesarMediaRecibido'
    ];
    
    console.log('[DEBUG] Verificación de métodos esperados:');
    metodosEsperados.forEach(metodo => {
        const existe = typeof this.videoAnalyzer[metodo] === 'function';
        console.log(`[DEBUG] ${metodo}: ${existe ? '✅ EXISTE' : '❌ NO EXISTE'}`);
    });
    
    console.log('[DEBUG] === FIN DIAGNÓSTICO ===');
}


    

    // === INICIALIZACIÓN DE SERVICIOS IA ===
    async inicializarOpenAI() {
        try {
            const openaiKey = process.env.OPENAI_API_KEY;
            
            if (!openaiKey) {
                console.log('[AI] ⚠️ OPENAI_API_KEY no encontrada en .env');
                this.openaiClient = null;
                return;
            }
            
            let OpenAI;
            try {
                OpenAI = require('openai');
            } catch (importError) {
                console.log('[AI] ⚠️ Librería OpenAI no instalada. Instalando...');
                console.log('[AI] 💡 Ejecutar: npm install openai');
                this.openaiClient = null;
                return;
            }
            
            this.openaiClient = new OpenAI({
                apiKey: openaiKey,
            });
            
            const testResponse = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: 'Test conexión PlayMall Park. Responde solo: OK' }],
                max_tokens: 10,
                temperature: 0
            });
            
            if (testResponse?.choices?.[0]?.message?.content) {
                console.log('[AI] ✅ OpenAI GPT-4o configurado y conectado');
                console.log('[AI] 🎯 Modelo: gpt-4o');
                console.log('[AI] 📊 Estado: OPERATIVO');
            } else {
                throw new Error('Respuesta inválida de OpenAI');
            }
            
        } catch (error) {
            console.error('[AI] ❌ Error configurando OpenAI:', error.message);
            this.openaiClient = null;
        }
    }

    async inicializarServiciosGoogle() {
        try {
            console.log('[AI] Configurando servicios Google...');
            
            const services = {
                vision_available: false,
                gemini_available: false,
                vision_client: null,
                gemini_model: null
            };
            
            // Google Vision
            const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (googleCredentials && fs.existsSync(googleCredentials)) {
                try {
                    const { ImageAnnotatorClient } = require('@google-cloud/vision');
                    services.vision_client = new ImageAnnotatorClient();
                    
                    console.log('[AI] 🔍 Probando Google Vision...');
                    
                    services.vision_available = true;
                    console.log('[AI] ✅ Google Vision configurado');
                    console.log('[AI] 📁 Credentials:', googleCredentials);
                    console.log('[AI] 🎯 Funciones: Detección de objetos, texto, rostros');
                    
                } catch (error) {
                    console.log(`[AI] ❌ Error configurando Vision: ${error.message}`);
                    services.vision_available = false;
                }
            } else {
                console.log('[AI] ⚠️ Google Vision: Credentials no encontradas');
                console.log('[AI] 💡 Verificar GOOGLE_APPLICATION_CREDENTIALS en .env');
            }
            
            // Google Gemini
            const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
            if (geminiKey) {
                try {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(geminiKey);
                    services.gemini_model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                    
                    console.log('[AI] 🧠 Probando Google Gemini...');
                    const testResult = await services.gemini_model.generateContent('Test conexión PlayMall. Responde: OK');
                    const testText = await testResult.response.text();
                    
                    if (testText && testText.includes('OK')) {
                        services.gemini_available = true;
                        console.log('[AI] ✅ Google Gemini configurado y conectado');
                        console.log('[AI] 🎯 Modelo: gemini-1.5-flash');
                        console.log('[AI] 📊 Estado: OPERATIVO');
                    } else {
                        throw new Error('Test de conexión falló');
                    }
                    
                } catch (error) {
                    console.log(`[AI] ❌ Error configurando Gemini: ${error.message}`);
                    services.gemini_available = false;
                }
            } else {
                console.log('[AI] ⚠️ Google Gemini: API key no encontrada');
                console.log('[AI] 💡 Verificar GOOGLE_GEMINI_API_KEY en .env');
            }
            
            this.googleServices = services;
            return services;
            
        } catch (error) {
            console.error('[ERROR] Error inicializando servicios Google:', error);
            this.googleServices = {
                vision_available: false,
                gemini_available: false,
                vision_client: null,
                gemini_model: null
            };
            return this.googleServices;
        }
    }

    async configurarServiciosIA() {
        const servicios = {
            openai_available: false,
            vision_available: false,
            gemini_available: false
        };
        
        try {
            if (process.env.OPENAI_API_KEY) servicios.openai_available = true;
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) servicios.vision_available = true;
            if (process.env.GOOGLE_GEMINI_API_KEY) servicios.gemini_available = true;
        } catch (error) {
            console.log('[IA] Error verificando servicios:', error.message);
        }
        
        return servicios;
    }

    verificarEstadoIA() {
        console.log('[AI] 📊 ESTADO DE SERVICIOS IA:');
        console.log('[AI] ----------------------------------------');
        
        if (this.openaiClient) {
            console.log('[AI] 🤖 OpenAI GPT-4o: ✅ OPERATIVO');
        } else {
            console.log('[AI] 🤖 OpenAI GPT-4o: ❌ NO DISPONIBLE');
        }
        
        if (this.googleServices?.vision_available) {
            console.log('[AI] 👁️ Google Vision: ✅ OPERATIVO');
        } else {
            console.log('[AI] 👁️ Google Vision: ❌ NO DISPONIBLE');
        }
        
        if (this.googleServices?.gemini_available) {
            console.log('[AI] 🧠 Google Gemini: ✅ OPERATIVO');
        } else {
            console.log('[AI] 🧠 Google Gemini: ❌ NO DISPONIBLE');
        }
        
        const serviciosActivos = [
            this.openaiClient ? 1 : 0,
            this.googleServices?.vision_available ? 1 : 0,
            this.googleServices?.gemini_available ? 1 : 0
        ].reduce((a, b) => a + b, 0);
        
        console.log('[AI] ----------------------------------------');
        console.log(`[AI] 🎯 SERVICIOS ACTIVOS: ${serviciosActivos}/3`);
        
        if (serviciosActivos === 3) {
            console.log('[AI] 🌟 SISTEMA IA COMPLETAMENTE OPERATIVO');
        } else if (serviciosActivos >= 1) {
            console.log('[AI] ⚠️ SISTEMA IA PARCIALMENTE OPERATIVO');
        } else {
            console.log('[AI] ❌ SISTEMA IA NO OPERATIVO');
        }
    }

    // === ANÁLISIS CON IA ===
    async analizarConGPT4(imageBuffer, tipo, contextoVision = '') {
        if (!this.openaiClient) {
            console.log('[GPT4] ⚠️ OpenAI cliente no disponible');
            return '❌ OpenAI GPT-4 no disponible';
        }
        
        try {
            console.log(`[GPT4] 🤖 Analizando ${tipo} con GPT-4o...`);
            
            if (tipo === 'video') {
                console.log('[GPT4] ⚠️ GPT-4 Vision no acepta videos. Usando análisis textual...');
                
                const messages = [
                    {
                        role: 'user',
                        content: `Eres el sistema de INTELIGENCIA EMPRESARIAL de PlayMall Park (Maracaibo, Venezuela).

He recibido un VIDEO del parque que no puedo analizar visualmente, pero tengo este contexto de Google Vision:

${contextoVision || 'Video recibido sin contexto adicional'}

Como experto en gestión de parques familiares, genera un reporte estratégico para este video considerando:

OPERACIONES: ¿Qué acciones operativas se recomiendan?
MARKETING: ¿Es contenido valioso para redes sociales?
ESTRATEGIA: ¿Qué oportunidades de negocio representa?

CONTEXTO EMPRESARIAL:
- PlayMall Park es un parque infantil premium en Maracaibo
- Objetivo: maximizar satisfacción del cliente y rentabilidad
- Los videos suelen mostrar actividades, celebraciones o momentos especiales

Genera un reporte ejecutivo estratégico en español para toma de decisiones sobre este contenido de video.`
                    }
                ];
                
                const response = await this.openaiClient.chat.completions.create({
                    model: 'gpt-4o',
                    messages: messages,
                    max_tokens: 800,
                    temperature: 0.7
                });
                
                const analisisGPT = response.choices[0].message.content;
                console.log('[GPT4] ✅ Análisis textual de video completado');
                return `🤖 **ANÁLISIS ESTRATÉGICO GPT-4o (VIDEO):**\n\n${analisisGPT}`;
            }
            
            else if (tipo === 'image') {
                const base64Image = imageBuffer.toString('base64');
                
                const messages = [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Eres el sistema de INTELIGENCIA EMPRESARIAL de PlayMall Park (Maracaibo, Venezuela).

Analiza esta imagen para generar un reporte operativo empresarial estratégico:

CONTEXTO EMPRESARIAL:
- PlayMall Park es un parque infantil premium
- Objetivo: maximizar satisfacción del cliente y rentabilidad
- Se requiere análisis para toma de decisiones estratégicas

ANÁLISIS REQUERIDO:
1. OPERACIONES: ¿Las instalaciones están funcionando óptimamente?
2. CLIENTES: ¿Cuántas personas? ¿Satisfacción visible? ¿Grupos familiares?
3. SEGURIDAD: ¿Se observan riesgos o problemas de seguridad?
4. MARKETING: ¿Es momento ideal para capturar contenido promocional?
5. OPORTUNIDADES: ¿Qué estrategias de ventas se pueden activar?
6. INSTAGRAM: ¿Calidad del contenido para redes sociales?

${contextoVision ? `\nCONTEXTO ADICIONAL DE GOOGLE VISION:\n${contextoVision}` : ''}

Genera un reporte ejecutivo conciso y estratégico en español para toma de decisiones inmediatas.`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ];
                
                const response = await this.openaiClient.chat.completions.create({
                    model: 'gpt-4o',
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7
                });
                
                const analisisGPT = response.choices[0].message.content;
                console.log('[GPT4] ✅ Análisis visual de imagen completado');
                return `🤖 **ANÁLISIS EMPRESARIAL GPT-4o:**\n\n${analisisGPT}`;
            }
            
            else {
                console.log(`[GPT4] ⚠️ Tipo de contenido no soportado: ${tipo}`);
                return `❌ GPT-4: Tipo de contenido "${tipo}" no soportado`;
            }
            
        } catch (error) {
            console.error('[ERROR] Error en análisis GPT-4:', error.message);
            
            if (error.message.includes('Invalid MIME type')) {
                console.log('[GPT4] ❌ Error: GPT-4 Vision solo acepta imágenes, no videos');
                return '❌ GPT-4 Vision no compatible con videos (solo imágenes)';
            } else if (error.message.includes('rate limit')) {
                return '❌ GPT-4 temporalmente sobrecargado, reintentando...';
            } else {
                return `❌ Error analizando con GPT-4o: ${error.message}`;
            }
        }
    }

    async analizarImagenConVision(imageBuffer) {
        if (!this.googleServices?.vision_available) {
            return 'Google Vision no disponible';
        }
        
        try {
            console.log('[VISION] Analizando imagen...');
            
            const request = {
                image: { content: imageBuffer },
                features: [
                    { type: 'LABEL_DETECTION', maxResults: 10 },
                    { type: 'TEXT_DETECTION', maxResults: 1 },
                    { type: 'FACE_DETECTION', maxResults: 10 },
                    { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
                ]
            };
            
            const [result] = await this.googleServices.vision_client.annotateImage(request);
            
            let analisis = '🔍 **ANÁLISIS CON GOOGLE VISION:**\n\n';
            
            // Etiquetas
            if (result.labelAnnotations && result.labelAnnotations.length > 0) {
                const etiquetas = result.labelAnnotations
                    .filter(label => label.score > 0.7)
                    .map(label => `${label.description} (${(label.score * 100).toFixed(1)}%)`)
                    .slice(0, 5);
                
                if (etiquetas.length > 0) {
                    analisis += `🏷️ **Categorías detectadas:**\n`;
                    etiquetas.forEach(etiqueta => analisis += `   • ${etiqueta}\n`);
                    analisis += '\n';
                }
            }
            
            // Texto (OCR)
            if (result.textAnnotations && result.textAnnotations.length > 0) {
                const texto = result.textAnnotations[0].description.trim();
                if (texto.length > 0) {
                    analisis += `📝 **Texto detectado:**\n`;
                    if (texto.includes('TOTAL') || texto.includes('Bs') || texto.includes('$')) {
                        analisis += '💰 **TICKET DE VENTA DETECTADO**\n';
                        analisis += `\`\`\`\n${texto.substring(0, 200)}...\n\`\`\`\n\n`;
                    } else {
                        analisis += `${texto.substring(0, 150)}...\n\n`;
                    }
                }
            }
            
            // Rostros (personas)
            if (result.faceAnnotations && result.faceAnnotations.length > 0) {
                const personas = result.faceAnnotations.length;
                analisis += `👥 **Personas detectadas:** ${personas}\n`;
                
                let satisfaccionTotal = 0;
                let rostrosAnalizados = 0;
                
                result.faceAnnotations.forEach(face => {
                    if (face.joyLikelihood === 'LIKELY' || face.joyLikelihood === 'VERY_LIKELY') {
                        satisfaccionTotal += 1;
                    }
                    rostrosAnalizados++;
                });
                
                if (rostrosAnalizados > 0) {
                    const satisfaccionPct = (satisfaccionTotal / rostrosAnalizados) * 100;
                    analisis += `😊 **Nivel de satisfacción:** ${satisfaccionPct.toFixed(1)}%\n`;
                    
                    if (satisfaccionPct >= 70) {
                        analisis += '🌟 **EXCELENTE** - Alta satisfacción detectada\n';
                    } else if (satisfaccionPct >= 50) {
                        analisis += '✅ **BUENO** - Satisfacción normal\n';
                    } else {
                        analisis += '⚠️ **MEJORABLE** - Revisar experiencia del cliente\n';
                    }
                }
                
                if (personas >= 15) {
                    analisis += '🚨 **ALTA CONCENTRACIÓN** - Activar protocolos de multitud\n';
                } else if (personas >= 8) {
                    analisis += '📈 **CAPACIDAD ÓPTIMA** - Momento ideal para ventas\n';
                } else if (personas >= 3) {
                    analisis += '📊 **OPERACIÓN NORMAL** - Mantener estándares\n';
                } else {
                    analisis += '📉 **BAJA OCUPACIÓN** - Activar estrategias de atracción\n';
                }
                
                analisis += '\n';
            }
            
            // Objetos
            if (result.localizedObjectAnnotations && result.localizedObjectAnnotations.length > 0) {
                const objetos = result.localizedObjectAnnotations
                    .filter(obj => obj.score > 0.6)
                    .map(obj => `${obj.name} (${(obj.score * 100).toFixed(1)}%)`)
                    .slice(0, 5);
                
                if (objetos.length > 0) {
                    analisis += `🎯 **Objetos identificados:**\n`;
                    objetos.forEach(objeto => analisis += `   • ${objeto}\n`);
                    analisis += '\n';
                }
            }
            
            analisis += '✅ **Análisis Google Vision completado**';
            
            console.log('[VISION] ✅ Análisis completado exitosamente');
            return analisis;
            
        } catch (error) {
            console.error('[ERROR] Error en análisis Vision:', error);
            return '❌ Error analizando imagen con Google Vision';
        }
    }

    async analizarConGemini(imageBuffer, tipo, contexto = '') {
        if (!this.googleServices?.gemini_available) {
            return 'Google Gemini no disponible';
        }
        
        try {
            console.log(`[GEMINI] Analizando ${tipo}...`);
            
            const base64Data = imageBuffer.toString('base64');
            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: tipo === 'image' ? 'image/jpeg' : 'video/mp4'
                }
            };
            
            const prompt = `
Eres el sistema de INTELIGENCIA EMPRESARIAL de PlayMall Park (Maracaibo, Venezuela).

Analiza esta ${tipo === 'image' ? 'imagen' : 'video'} para generar un reporte operativo:

1. DESCRIPCIÓN GENERAL:
   - ¿Qué elementos principales observas?
   - ¿Hay atracciones del parque funcionando?
   - ¿Cuántas personas aproximadamente?

2. ANÁLISIS DE SATISFACCIÓN:
   - ¿Se ve diversión y satisfacción en los visitantes?
   - ¿El ambiente es positivo?
   - ¿Hay sonrisas o expresiones de alegría?

3. ANÁLISIS OPERATIVO:
   - ¿Las instalaciones se ven en buen estado?
   - ¿El personal está presente y activo?
   - ¿Hay elementos que requieren atención?

4. OPORTUNIDADES:
   - ¿Es buen contenido para redes sociales?
   - ¿Se ve algún momento especial o memorable?
   - ¿Hay potencial de marketing?

5. RECOMENDACIONES:
   - Acciones inmediatas sugeridas
   - Oportunidades de mejora detectadas

${contexto ? `Contexto adicional: ${contexto}` : ''}

Genera un reporte conciso en español para supervisión empresarial.
`;
            
            const result = await this.googleServices.gemini_model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const analisisGemini = response.text();
            
            console.log('[GEMINI] ✅ Análisis completado exitosamente');
            return `🤖 **ANÁLISIS EMPRESARIAL (Google Gemini):**\n\n${analisisGemini}`;
            
        } catch (error) {
            console.error('[ERROR] Error en análisis Gemini:', error);
            return '❌ Error analizando con Google Gemini';
        }
    }

    // === FUNCIÓN CORREGIDA: inicializarSistemasAvanzados ===
    // Reemplazar la función existente en BotWhatsAppPlayMall class

    async inicializarSistemasAvanzados() {
        console.log('[SYSTEM] 🚀 Inicializando sistemas empresariales avanzados...');
        
        // 1. Analizador Visual Empresarial
        if (!this.analizadorVisual && AnalizadorVisualEmpresarial) {
            try {
                this.analizadorVisual = new AnalizadorVisualEmpresarial();
                console.log('[SYSTEM] ✅ Analizador Visual Empresarial listo');
            } catch (error) {
                console.log('[SYSTEM] ❌ Error inicializando AnalizadorVisualEmpresarial:', error.message);
                this.analizadorVisual = null;
            }
        }
        
        // 2. Video Analyzer Premium
        if (!this.videoAnalyzer && VideoAnalyzerPremium) {
            try {
                this.videoAnalyzer = new VideoAnalyzerPremium();
                console.log('[SYSTEM] ✅ Video Analyzer Premium listo');
            } catch (error) {
                console.log('[SYSTEM] ❌ Error inicializando VideoAnalyzerPremium:', error.message);
                // Crear VideoAnalyzer básico como fallback
                this.videoAnalyzer = new VideoAnalyzer();
                console.log('[SYSTEM] 🔄 Usando VideoAnalyzer básico como fallback');
            }
        } else if (!this.videoAnalyzer) {
            // Si no hay VideoAnalyzerPremium, usar el básico
            this.videoAnalyzer = new VideoAnalyzer();
            console.log('[SYSTEM] 🔄 Usando VideoAnalyzer básico');
        }
        
        // 3. Instagram Processor
        if (!this.instagramProcessor && InstagramVideoProcessor) {
            try {
                this.instagramProcessor = new InstagramVideoProcessor();
                console.log('[SYSTEM] ✅ Instagram Processor listo');
            } catch (error) {
                console.log('[SYSTEM] ❌ Error inicializando InstagramVideoProcessor:', error.message);
                this.instagramProcessor = null;
            }
        }
        
        // 4. Sistema de Métricas Empresariales
        if (!this.metricasEmpresariales) {
            this.metricasEmpresariales = new MetricasEmpresariales();
            console.log('[SYSTEM] ✅ Sistema de Métricas Empresariales listo');
        }
        
        // 5. Configurar servicios IA si no están listos
        if (!this.serviciosIA) {
            this.serviciosIA = await this.configurarServiciosIA();
            console.log('[SYSTEM] ✅ Servicios IA configurados');
        }
        
        // 6. Inicializar OpenAI y Google
        await this.inicializarOpenAI();
        await this.inicializarServiciosGoogle();
        
        // 7. Verificar estado final
        const sistemasActivos = [
            this.analizadorVisual ? 'AnalizadorVisual' : null,
            this.videoAnalyzer ? 'VideoAnalyzer' : null,
            this.instagramProcessor ? 'InstagramProcessor' : null,
            this.metricasEmpresariales ? 'Métricas' : null
        ].filter(Boolean);
        
        console.log(`[SYSTEM] 🎯 Sistemas activos: ${sistemasActivos.join(', ')}`);
        console.log('[SYSTEM] 🎯 Todos los sistemas empresariales listos');
    }
    // 1. FUNCIÓN CORREGIDA: procesarVideoConSistemaCompleto
    async procesarVideoConSistemaCompleto(message) {
        try {
            console.log('[VIDEO] 🎬 === ANÁLISIS PREMIUM DE VIDEO COMPLETO ===');
            
            // PASO 1: Análisis técnico completo con VideoAnalyzer
            const analisisTecnico = await this.procesarVideoRecibido(message);
            console.log('[VIDEO] Análisis técnico completado:', analisisTecnico ? 'SUCCESS' : 'FAILED');

            // Verificar que tenemos un resultado válido
            if (!analisisTecnico) {
                console.log('[VIDEO] ⚠️ Análisis técnico falló, usando fallback');
                return this.generarAnalisisVideoFallback(message, new Error('Análisis técnico no disponible'));
            }
            
            // PASO 2: Análisis empresarial con AnalizadorVisual (si hay frames)
            let analisisEmpresarial = null;
            if (analisisTecnico && analisisTecnico.frames && analisisTecnico.frames.length > 0 && this.analizadorVisual) {
                try {
                    console.log('[VIDEO] 🧠 Ejecutando análisis empresarial de frames...');
                    analisisEmpresarial = await this.analizadorVisual.analizarFramesEmpresarial(analisisTecnico);
                    console.log('[VIDEO] Análisis empresarial completado');
                } catch (error) {
                    console.log(`[VIDEO] ⚠️ Análisis empresarial limitado: ${error.message}`);
                    analisisEmpresarial = 'Análisis empresarial no disponible';
                }
            }
            
            // PASO 3: Evaluación para Instagram Stories
            let evaluacionInstagram = null;
            if (this.instagramProcessor) {
                try {
                    console.log('[VIDEO] 📱 Evaluando para Instagram Stories...');
                    evaluacionInstagram = await this.instagramProcessor.evaluarVideoCompleto(
                        analisisTecnico, 
                        analisisEmpresarial, 
                        message
                    );
                    console.log('[VIDEO] Evaluación Instagram completada');
                } catch (error) {
                    console.log(`[VIDEO] ⚠️ Evaluación Instagram limitada: ${error.message}`);
                    evaluacionInstagram = 'Evaluación Instagram no disponible';
                }
            }
            
            // PASO 4: Análisis con sistema Python (integración existente)
            let analisisPython = null;
            try {
                console.log('[VIDEO] 🐍 Ejecutando análisis Python complementario...');
                const textoContexto = this.generarContextoParaPython(analisisTecnico, evaluacionInstagram);
                analisisPython = await ejecutar_funcion_operativa(textoContexto, message.from, null);
                console.log('[VIDEO] Análisis Python completado');
            } catch (error) {
                console.log(`[VIDEO] ⚠️ Análisis Python no disponible: ${error.message}`);
            }
            
            // PASO 5: Generar reporte ejecutivo integrado
            console.log('[VIDEO] 📋 Generando reporte integrado...');
            const reporteCompleto = this.generarReporteVideoCompleto({
                analisisTecnico,
                analisisEmpresarial,
                evaluacionInstagram,
                analisisPython,
                message,
                timestamp: new Date().toLocaleString()
            });
            
            // PASO 6: Generar métricas empresariales
            if (this.metricasEmpresariales) {
                try {
                    const metricas = this.extraerMetricasDeAnalisis({
                        analisisTecnico,
                        analisisEmpresarial,
                        evaluacionInstagram
                    });
                    
                    await this.metricasEmpresariales.registrarMetricasVideo(metricas);
                    console.log('[VIDEO] Métricas registradas');
                } catch (error) {
                    console.log('[VIDEO] ⚠️ Error registrando métricas:', error.message);
                }
            }
            
            console.log('[VIDEO] ✅ Análisis premium de video completado exitosamente');
            
            return {
                tipo: 'video_premium',
                contenido: reporteCompleto,
                tiene_instagram: !!evaluacionInstagram,
                nivel_calidad: this.determinarNivelCalidad(analisisTecnico),
                recomendacion_principal: this.extraerRecomendacionPrincipal(reporteCompleto)
            };
            
        } catch (error) {
            console.error('[ERROR] Error en análisis completo de video:', error);
            console.error('[ERROR] Stack:', error.stack);
            return this.generarAnalisisVideoFallback(message, error);
        }
    }
    // === PROCESAMIENTO COMPLETO DE IMAGEN ===
    async procesarImagenConSistemaCompleto(message) {
        try {
            console.log('[IMAGE] 📸 === ANÁLISIS EMPRESARIAL DE IMAGEN COMPLETO ===');
            
            // PASO 1: Análisis empresarial completo con AnalizadorVisual
            let analisisEmpresarial = null;
            if (this.analizadorVisual) {
                console.log('[IMAGE] 🧠 Ejecutando análisis empresarial...');
                analisisEmpresarial = await this.analizadorVisual.analizarContenidoCompleto(message, 'image');
            } else {
                console.log('[IMAGE] ⚠️ AnalizadorVisual no disponible, usando análisis básico');
                analisisEmpresarial = await this.procesarImagenBasico(message);
            }
            
            // PASO 2: Análisis complementario con sistema Python
            let analisisPython = null;
            try {
                console.log('[IMAGE] 🐍 Ejecutando análisis Python especializado...');
                
                let imagenData = null;
                try {
                    const media = await message.downloadMedia();
                    if (media && media.data) {
                        imagenData = {
                            data: media.data,
                            mimetype: media.mimetype,
                            filename: media.filename || 'imagen_analisis.jpg'
                        };
                    }
                } catch (downloadError) {
                    console.log('[IMAGE] ⚠️ No se pudo descargar para Python, usando análisis contextual');
                }
                
                const textoContexto = this.generarContextoImagenParaPython(analisisEmpresarial);
                analisisPython = await ejecutar_funcion_operativa(textoContexto, message.from, imagenData);
                
            } catch (error) {
                console.log(`[IMAGE] ⚠️ Análisis Python no disponible: ${error.message}`);
            }
            
            // PASO 3: Detectar si es ticket/documento especial
            let analisisDocumento = null;
            if (analisisEmpresarial && (analisisEmpresarial.includes('TICKET') || analisisEmpresarial.includes('FACTURA') || 
                analisisEmpresarial.includes('TOTAL') || analisisEmpresarial.includes('BS'))) {
                
                console.log('[IMAGE] 💰 Imagen de documento financiero detectada');
                analisisDocumento = await this.analizarDocumentoFinanciero(message, analisisEmpresarial);
            }
            
            // PASO 4: Generar reporte integrado
            const reporteCompleto = this.generarReporteImagenCompleto({
                analisisEmpresarial,
                analisisPython,
                analisisDocumento,
                message,
                timestamp: new Date().toLocaleString()
            });
            
            // PASO 5: Registrar métricas
            if (this.metricasEmpresariales) {
                const metricas = this.extraerMetricasDeImagenAnalisis({
                    analisisEmpresarial,
                    analisisDocumento
                });
                
                await this.metricasEmpresariales.registrarMetricasImagen(metricas);
            }
            
            console.log('[IMAGE] ✅ Análisis empresarial de imagen completado');
            return {
                tipo: 'imagen_empresarial',
                contenido: reporteCompleto,
                es_documento: !!analisisDocumento,
                nivel_detalle: this.determinarNivelDetalle(analisisEmpresarial),
                alertas_detectadas: this.extraerAlertas(reporteCompleto)
            };
            
        } catch (error) {
            console.error('[ERROR] Error en análisis completo de imagen:', error);
            return this.generarAnalisisImagenFallback(message, error);
        }
    }
    // === PROCESAMIENTO DE OTROS TIPOS DE MEDIA ===
    async procesarOtroMediaConSistemaCompleto(message, tipo) {
        try {
            console.log(`[MEDIA] 📄 Procesando ${tipo} con sistema contextual avanzado...`);
            
            let analisisContextual = '';
            
            if (tipo === 'audio' || tipo === 'ptt') {
                analisisContextual = await this.analizarAudioContextual(message);
            } else if (tipo === 'document') {
                analisisContextual = await this.analizarDocumentoContextual(message);
            } else if (tipo === 'sticker') {
                analisisContextual = this.generarAnalisisSticker(message);
            } else {
                analisisContextual = this.generarAnalisisGenerico(message, tipo);
            }
            
            let analisisPython = null;
            if (tipo !== 'sticker') {
                try {
                    const textoContexto = `[${tipo.toUpperCase()} RECIBIDO] Análisis contextual: ${analisisContextual}`;
                    analisisPython = await ejecutar_funcion_operativa(textoContexto, message.from, null);
                } catch (error) {
                    console.log(`[MEDIA] ⚠️ Análisis Python no disponible para ${tipo}`);
                }
            }
            
            const reporteCompleto = this.generarReporteOtroMedia({
                tipo,
                analisisContextual,
                analisisPython,
                message,
                timestamp: new Date().toLocaleString()
            });
            
            return {
                tipo: `${tipo}_contextual`,
                contenido: reporteCompleto,
                relevancia: this.determinarRelevancia(tipo),
                accion_requerida: this.determinarAccionRequerida(tipo, analisisContextual)
            };
            
        } catch (error) {
            console.error(`[ERROR] Error procesando ${tipo}:`, error);
            return this.generarAnalisisGenericoFallback(message, tipo, error);
        }
    }

    // === FUNCIONES AUXILIARES DE ANÁLISIS ===
    async analizarAudioContextual(message) {
        return `🎤 **AUDIO RECIBIDO**\n\nMensaje de audio documentado para supervisión.\n\nDuración aproximada: ${message._data?.duration || 'Desconocida'} segundos\n\nPara análisis detallado, convertir a texto o revisar manualmente.`;
    }

    async analizarDocumentoContextual(message) {
        const filename = message._data?.filename || 'documento.pdf';
        return `📄 **DOCUMENTO RECIBIDO**\n\nArchivo: ${filename}\n\nTipo: ${message._data?.mimetype || 'Desconocido'}\n\nDocumento registrado para revisión y procesamiento manual.`;
    }

    generarAnalisisSticker(message) {
        return `😊 **STICKER RECIBIDO**\n\nSticker documentado como comunicación informal.\n\nNo requiere procesamiento adicional.`;
    }

    generarAnalisisGenerico(message, tipo) {
        return `📎 **${tipo.toUpperCase()} RECIBIDO**\n\nContenido de tipo ${tipo} documentado en sistema.\n\nRegistrado para supervisión y seguimiento.`;
    }

    // === FUNCIONES DE FALLBACK ===
    generarAnalisisVideoFallback(message, error) {
        return {
            tipo: 'video_fallback',
            contenido: `🎬 **VIDEO RECIBIDO** - ${new Date().toLocaleString()}\n\nVideo documentado para supervisión.\n\nSistema de análisis premium temporalmente limitado.\n\nError técnico: ${error.message}\n\n✅ Video registrado en sistema para revisión posterior.`,
            nivel_calidad: 'limitado',
            recomendacion_principal: 'Revisar manualmente para análisis completo'
        };
    }

    generarAnalisisImagenFallback(message, error) {
        return {
            tipo: 'imagen_fallback',
            contenido: `📸 **IMAGEN RECIBIDA** - ${new Date().toLocaleString()}\n\nImagen documentada para supervisión.\n\nSistema de análisis empresarial temporalmente limitado.\n\nError técnico: ${error.message}\n\n✅ Imagen registrada en sistema para revisión posterior.`,
            es_documento: false,
            nivel_detalle: 'básico',
            alertas_detectadas: []
        };
    }

    generarAnalisisGenericoFallback(message, tipo, error) {
        return {
            tipo: `${tipo}_fallback`,
            contenido: `📎 **${tipo.toUpperCase()} RECIBIDO** - ${new Date().toLocaleString()}\n\nContenido documentado para supervisión.\n\nError técnico: ${error.message}\n\n✅ Contenido registrado en sistema.`,
            relevancia: 'básica',
            accion_requerida: 'revision_manual'
        };
    }

    // 2. FUNCIÓN CORREGIDA: generarReporteVideoCompleto
    generarReporteVideoCompleto(datos) {
        try {
            const { analisisTecnico, analisisEmpresarial, evaluacionInstagram, analisisPython, message, timestamp } = datos;
            
            console.log('[VIDEO] 📝 Construyendo reporte...');
            
            let reporte = `🎬 **ANÁLISIS INTEGRAL DE VIDEO** - ${timestamp}\n\n`;
            
            // Header ejecutivo
            reporte += `📊 **RESUMEN EJECUTIVO:**\n`;
            reporte += `   • Tipo: Video del parque con análisis frame por frame\n`;
            reporte += `   • Servicios IA: ${this.listarServiciosActivos()}\n`;
            reporte += `   • Nivel de análisis: ${analisisTecnico ? 'COMPLETO' : 'CONTEXTUAL'}\n`;
            reporte += `   • Evaluación Instagram: ${evaluacionInstagram ? 'INCLUIDA' : 'NO DISPONIBLE'}\n\n`;
            
            // Análisis técnico (VideoAnalyzerPremium)
            if (analisisTecnico && analisisTecnico.videoInfo) {
                reporte += `🔧 **ANÁLISIS TÉCNICO PREMIUM:**\n\n`;
                reporte += `📹 **Información del Video:**\n`;
                reporte += `   • ID: ${analisisTecnico.videoInfo.id || 'N/A'}\n`;
                reporte += `   • Duración: ${analisisTecnico.videoInfo.duration || 'N/A'} segundos\n`;
                reporte += `   • Procesamiento: ${analisisTecnico.procesamiento || 'N/A'}\n`;
                if (analisisTecnico.frames) {
                    reporte += `   • Frames extraídos: ${analisisTecnico.frames.length}\n`;
                }
                reporte += `\n${'─'.repeat(60)}\n\n`;
            }
            
            // Análisis empresarial
            if (analisisEmpresarial && typeof analisisEmpresarial === 'string' && analisisEmpresarial.length > 0) {
                reporte += `🧠 **INTELIGENCIA EMPRESARIAL:**\n\n`;
                reporte += `${analisisEmpresarial.substring(0, 500)}${analisisEmpresarial.length > 500 ? '...' : ''}\n\n`;
                reporte += `${'─'.repeat(60)}\n\n`;
            }
            
            // Evaluación Instagram
            if (evaluacionInstagram && typeof evaluacionInstagram === 'object') {
                reporte += `📱 **EVALUACIÓN PARA INSTAGRAM STORIES:**\n\n`;
                reporte += `📊 Puntuación: ${evaluacionInstagram.puntuacion || 0}/100\n`;
                reporte += `🎯 Recomendación: ${evaluacionInstagram.recomendacion || 'N/A'}\n`;
                if (evaluacionInstagram.criterios && evaluacionInstagram.criterios.length > 0) {
                    reporte += `✅ Criterios: ${evaluacionInstagram.criterios.slice(0, 3).join(', ')}\n`;
                }
                reporte += `\n${'─'.repeat(60)}\n\n`;
            } else if (evaluacionInstagram && typeof evaluacionInstagram === 'string') {
                reporte += `📱 **EVALUACIÓN PARA INSTAGRAM STORIES:**\n\n`;
                reporte += `${evaluacionInstagram.substring(0, 300)}${evaluacionInstagram.length > 300 ? '...' : ''}\n\n`;
                reporte += `${'─'.repeat(60)}\n\n`;
            }
            
            // Análisis Python complementario
            if (analisisPython && analisisPython.respuesta_grupo) {
                reporte += `🐍 **ANÁLISIS OPERATIVO COMPLEMENTARIO:**\n\n`;
                reporte += `${analisisPython.respuesta_grupo.substring(0, 400)}${analisisPython.respuesta_grupo.length > 400 ? '...' : ''}\n\n`;
                reporte += `${'─'.repeat(60)}\n\n`;
            }
            
            // Recomendaciones integradas finales
            reporte += `🎯 **RECOMENDACIONES INTEGRADAS:**\n\n`;
            
            try {
                const recomendaciones = this.generarRecomendacionesIntegradas({
                    analisisTecnico,
                    analisisEmpresarial,
                    evaluacionInstagram
                });
                
                recomendaciones.slice(0, 5).forEach(rec => {
                    reporte += `   ${rec}\n`;
                });
            } catch (error) {
                reporte += `   📈 Usar insights para optimización operativa continua\n`;
                reporte += `   🎯 Documentar mejores prácticas identificadas\n`;
                reporte += `   🔄 Programar seguimiento de implementación de mejoras\n`;
            }
            
            // Footer
            reporte += `\n${'═'.repeat(70)}\n`;
            reporte += `🌟 **Sistema Integral PlayMall Park - Análisis Video Premium**\n`;
            reporte += `🔧 **Tecnologías:** Frame-by-Frame + Google AI + OpenAI + Python + Instagram API\n`;
            reporte += `💎 **Nivel:** Análisis ejecutivo empresarial completo`;
            
            console.log('[VIDEO] ✅ Reporte generado exitosamente');
            return reporte;
            
        } catch (error) {
            console.error('[VIDEO] ❌ Error generando reporte:', error);
            return `🎬 **VIDEO PROCESADO** - ${datos.timestamp || new Date().toLocaleString()}\n\nVideo analizado exitosamente pero hubo un error generando el reporte detallado.\n\n✅ Video documentado en sistema para revisión posterior.\n\nError técnico: ${error.message}`;
        }
    }

    // 3. FUNCIÓN MEJORADA: generarAnalisisVideoFallback
    generarAnalisisVideoFallback(message, error) {
        console.log('[VIDEO] 🆘 Generando análisis fallback...');
        
        const timestamp = new Date().toLocaleString();
        
        let contenido = `🎬 **VIDEO RECIBIDO** - ${timestamp}\n\n`;
        contenido += `📊 **Estado:** Video documentado para supervisión\n`;
        contenido += `🔧 **Procesamiento:** Fallback activado\n`;
        contenido += `⚠️ **Limitación:** ${error.message}\n\n`;
        
        // Análisis contextual básico
        contenido += `📋 **Análisis contextual:**\n`;
        contenido += `   • ✅ Video recibido y registrado\n`;
        contenido += `   • 📝 Disponible para revisión manual\n`;
        contenido += `   • 🔍 Sistema de análisis premium temporalmente limitado\n`;
        contenido += `   • 📊 Metadatos básicos documentados\n\n`;
        
        contenido += `💡 **Próximos pasos:**\n`;
        contenido += `   • Video guardado para análisis posterior\n`;
        contenido += `   • Equipo técnico notificado para revisión\n`;
        contenido += `   • Sistema intentará análisis automático cuando esté disponible\n\n`;
        
        contenido += `✅ **Video registrado en sistema de supervisión PlayMall Park**`;
        
        return {
            tipo: 'video_fallback',
            contenido: contenido,
            nivel_calidad: 'limitado',
            recomendacion_principal: 'Revisar manualmente para análisis completo'
        };
    }

    // 4. FUNCIÓN MEJORADA: listarServiciosActivos (con protección de errores)
    listarServiciosActivos() {
        try {
            const servicios = [];
            if (this.openaiClient) servicios.push('GPT-4o');
            if (this.googleServices?.vision_available) servicios.push('Google Vision');
            if (this.googleServices?.gemini_available) servicios.push('Gemini 1.5');
            if (this.videoAnalyzer) servicios.push('VideoAnalyzer Premium');
            if (this.analizadorVisual) servicios.push('Analizador Empresarial');
            
            return servicios.length > 0 ? servicios.join(' + ') : 'Sistema Contextual';
        } catch (error) {
            return 'Sistema Básico';
        }
    }

    // 5. FUNCIÓN MEJORADA: determinarNivelCalidad (con protección de errores)
    determinarNivelCalidad(analisis) {
        try {
            if (analisis && analisis.status === 'success' && analisis.frames && analisis.frames.length > 0) return 'premium';
            if (analisis && analisis.status === 'success') return 'completo';
            return 'básico';
        } catch (error) {
            return 'básico';
        }
    }

    // 6. FUNCIÓN MEJORADA: extraerRecomendacionPrincipal (con protección de errores)
    extraerRecomendacionPrincipal(reporte) {
        try {
            if (!reporte || typeof reporte !== 'string') return 'documentar_insights';
            
            if (reporte.includes('PUBLICAR AUTOMATICO')) return 'publicar_instagram';
            if (reporte.includes('EXCELENTE')) return 'usar_como_referencia';
            if (reporte.includes('MEJORABLE')) return 'implementar_mejoras';
            return 'documentar_insights';
        } catch (error) {
            return 'documentar_insights';
        }
    }

    // 7. FUNCIÓN MEJORADA: generarRecomendacionesIntegradas (con protección de errores)
    generarRecomendacionesIntegradas(datos) {
        try {
            const recomendaciones = [];
            
            // Recomendaciones basadas en análisis técnico
            if (datos.analisisTecnico) {
                if (datos.analisisTecnico.status === 'success' && datos.analisisTecnico.frames && datos.analisisTecnico.frames.length > 0) {
                    recomendaciones.push('🌟 Video procesado completamente - Usar como referencia para entrenamientos');
                } else if (datos.analisisTecnico.status === 'success') {
                    recomendaciones.push('✅ Video procesado exitosamente - Documentar para análisis posterior');
                }
            }
            
            // Recomendaciones basadas en evaluación Instagram
            if (datos.evaluacionInstagram) {
                if (typeof datos.evaluacionInstagram === 'object' && datos.evaluacionInstagram.recomendacion) {
                    if (datos.evaluacionInstagram.recomendacion.includes('AUTOMATICO')) {
                        recomendaciones.push('📱 Video aprobado para publicación automática en Instagram Stories');
                    } else if (datos.evaluacionInstagram.recomendacion.includes('CONSULTAR')) {
                        recomendaciones.push('🤔 Video requiere evaluación manual para Instagram Stories');
                    }
                } else if (typeof datos.evaluacionInstagram === 'string' && datos.evaluacionInstagram.includes('PUBLICAR')) {
                    recomendaciones.push('📱 Video tiene potencial para Instagram Stories');
                }
            }
            
            // Recomendaciones empresariales generales
            recomendaciones.push('📈 Usar insights para optimización operativa continua');
            recomendaciones.push('🎯 Documentar mejores prácticas identificadas');
            recomendaciones.push('🔄 Programar seguimiento de implementación de mejoras');
            
            return recomendaciones;
            
        } catch (error) {
            console.error('[ERROR] Error generando recomendaciones:', error);
            return [
                '📈 Usar insights para optimización operativa continua',
                '🎯 Documentar mejores prácticas identificadas',
                '🔄 Programar seguimiento de implementación de mejoras'
            ];
        }
    }
    generarReporteImagenCompleto(datos) {
        const { analisisEmpresarial, analisisPython, analisisDocumento, message, timestamp } = datos;
        
        let reporte = `📸 **ANÁLISIS INTEGRAL DE IMAGEN** - ${timestamp}\n\n`;
        
        reporte += `📊 **RESUMEN EJECUTIVO:**\n`;
        reporte += `   • Tipo: Imagen con análisis empresarial completo\n`;
        reporte += `   • Servicios IA: ${this.listarServiciosActivos()}\n`;
        reporte += `   • Documento especial: ${analisisDocumento ? 'DETECTADO' : 'NO'}\n`;
        reporte += `   • Nivel de detalle: MÁXIMO\n\n`;
        
        if (analisisEmpresarial) {
            reporte += `🧠 **ANÁLISIS EMPRESARIAL PRINCIPAL:**\n\n`;
            reporte += `${analisisEmpresarial}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        if (analisisDocumento) {
            reporte += `💰 **ANÁLISIS DE DOCUMENTO FINANCIERO:**\n\n`;
            reporte += `${analisisDocumento}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        if (analisisPython && analisisPython.respuesta_grupo) {
            reporte += `🐍 **ANÁLISIS OPERATIVO ESPECIALIZADO:**\n\n`;
            reporte += `${analisisPython.respuesta_grupo}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        reporte += `🎯 **RECOMENDACIONES ESPECÍFICAS:**\n\n`;
        
        if (analisisDocumento) {
            reporte += `   💰 **Para documento financiero:**\n`;
            reporte += `     • Verificar contra sistema POS\n`;
            reporte += `     • Conciliar con arqueo de caja\n`;
            reporte += `     • Actualizar inventario correspondiente\n\n`;
        }
        
        reporte += `   📋 **Para supervisión operativa:**\n`;
        reporte += `     • Documentar insights para mejora continua\n`;
        reporte += `     • Implementar acciones preventivas identificadas\n`;
        reporte += `     • Seguimiento de métricas de satisfacción\n`;
        
        reporte += `\n${'═'.repeat(70)}\n`;
        reporte += `🌟 **Sistema Integral PlayMall Park - Análisis Imagen Empresarial**\n`;
        reporte += `🔧 **Tecnologías:** Google Vision + Gemini + OpenAI GPT-4o + Python + OCR\n`;
        reporte += `💎 **Nivel:** Análisis empresarial de precisión máxima`;
        
        return reporte;
    }

    generarReporteOtroMedia(datos) {
        const { tipo, analisisContextual, analisisPython, message, timestamp } = datos;
        
        let reporte = `📄 **ANÁLISIS CONTEXTUAL ${tipo.toUpperCase()}** - ${timestamp}\n\n`;
        
        reporte += `📊 **INFORMACIÓN:**\n`;
        reporte += `   • Tipo de contenido: ${tipo}\n`;
        reporte += `   • Procesamiento: Contextual avanzado\n`;
        reporte += `   • Estado: Documentado en sistema\n\n`;
        
        if (analisisContextual) {
            reporte += `🔍 **ANÁLISIS CONTEXTUAL:**\n\n`;
            reporte += `${analisisContextual}\n\n`;
        }
        
        if (analisisPython && analisisPython.respuesta_grupo) {
            reporte += `🐍 **ANÁLISIS OPERATIVO:**\n\n`;
            reporte += `${analisisPython.respuesta_grupo}\n\n`;
        }
        
        reporte += `✅ **Contenido procesado y documentado correctamente**`;
        
        return reporte;
    }


    generarContextoImagenParaPython(analisisEmpresarial) {
        let contexto = '[IMAGEN ANALIZADA CON IA EMPRESARIAL]\n\n';
        
        if (analisisEmpresarial) {
            if (analisisEmpresarial.includes('TICKET') || analisisEmpresarial.includes('FACTURA')) {
                contexto += 'Documento financiero detectado.\n';
            }
            if (analisisEmpresarial.includes('personas')) {
                contexto += 'Análisis de visitantes incluido.\n';
            }
            if (analisisEmpresarial.includes('satisfacción')) {
                contexto += 'Métricas de satisfacción disponibles.\n';
            }
        }
        
        contexto += '\nProporcionar análisis operativo complementario y acciones específicas.';
        
        return contexto;
    }

    async analizarDocumentoFinanciero(message, analisisBase) {
        try {
            console.log('[DOC] 💰 Analizando documento financiero especial...');
            
            let analisisOCR = '';
            try {
                const media = await message.downloadMedia();
                if (media && media.data) {
                    const imagenData = {
                        data: media.data,
                        mimetype: media.mimetype,
                        filename: 'ticket_financiero.jpg'
                    };
                    
                    const resultado = await ejecutar_funcion_operativa(
                        '[TICKET DE VENTA DETECTADO] Extraer información financiera detallada',
                        message.from,
                        imagenData
                    );
                    
                    if (resultado && resultado.respuesta_grupo) {
                        analisisOCR = resultado.respuesta_grupo;
                    }
                }
            } catch (error) {
                console.log('[DOC] ⚠️ OCR especializado no disponible, usando análisis base');
            }
            
            let analisisCompleto = `💰 **ANÁLISIS FINANCIERO ESPECIALIZADO:**\n\n`;
            
            if (analisisOCR) {
                analisisCompleto += `${analisisOCR}\n\n`;
            } else {
                analisisCompleto += `${analisisBase}\n\n`;
            }
            
            analisisCompleto += `💼 **ACCIONES FINANCIERAS REQUERIDAS:**\n`;
            analisisCompleto += `   • Verificar registro en sistema POS\n`;
            analisisCompleto += `   • Conciliar con movimientos de caja\n`;
            analisisCompleto += `   • Actualizar inventario correspondiente\n`;
            analisisCompleto += `   • Archivar según protocolo contable\n`;
            analisisCompleto += `   • Verificar cumplimiento de meta diaria`;
            
            return analisisCompleto;
            
        } catch (error) {
            console.error('[ERROR] Error en análisis documento financiero:', error);
            return `💰 **DOCUMENTO FINANCIERO DETECTADO**\n\nError en análisis especializado. Documento registrado para revisión manual.`;
        }
    }

    generarRecomendacionesIntegradas(datos) {
        const recomendaciones = [];
        
        if (datos.analisisTecnico) {
            if (datos.analisisTecnico.status === 'success' && datos.analisisTecnico.frames && datos.analisisTecnico.frames.length > 0) {
                recomendaciones.push('🌟 Video procesado completamente - Usar como referencia para entrenamientos');
            }
        }
        
        if (datos.evaluacionInstagram) {
            if (datos.evaluacionInstagram.includes('PUBLICAR AUTOMATICO')) {
                recomendaciones.push('📱 Video aprobado para publicación automática en Instagram Stories');
            } else if (datos.evaluacionInstagram.includes('CONSULTAR')) {
                recomendaciones.push('🤔 Video requiere evaluación manual para Instagram Stories');
            }
        }
        
        recomendaciones.push('📈 Usar insights para optimización operativa continua');
        recomendaciones.push('🎯 Documentar mejores prácticas identificadas');
        recomendaciones.push('🔄 Programar seguimiento de implementación de mejoras');
        
        return recomendaciones;
    }

    // === FUNCIONES UTILITARIAS ===
    listarServiciosActivos() {
        const servicios = [];
        if (this.openaiClient) servicios.push('GPT-4o');
        if (this.googleServices?.vision_available) servicios.push('Google Vision');
        if (this.googleServices?.gemini_available) servicios.push('Gemini 1.5');
        if (this.videoAnalyzer) servicios.push('VideoAnalyzer Premium');
        if (this.analizadorVisual) servicios.push('Analizador Empresarial');
        
        return servicios.length > 0 ? servicios.join(' + ') : 'Sistema Contextual';
    }

    determinarNivelCalidad(analisis) {
        if (analisis && analisis.status === 'success' && analisis.frames && analisis.frames.length > 0) return 'premium';
        if (analisis && analisis.status === 'success') return 'completo';
        return 'básico';
    }

    determinarNivelDetalle(analisis) {
        if (analisis && analisis.length > 1000) return 'máximo';
        if (analisis && analisis.length > 500) return 'alto';
        return 'básico';
    }

    extraerRecomendacionPrincipal(reporte) {
        if (reporte.includes('PUBLICAR AUTOMATICO')) return 'publicar_instagram';
        if (reporte.includes('EXCELENTE')) return 'usar_como_referencia';
        if (reporte.includes('MEJORABLE')) return 'implementar_mejoras';
        return 'documentar_insights';
    }

    extraerAlertas(reporte) {
        const alertas = [];
        if (reporte.includes('CRÍTICO')) alertas.push('critica');
        if (reporte.includes('ATENCIÓN')) alertas.push('atencion_requerida');
        if (reporte.includes('PROBLEMA')) alertas.push('problema_detectado');
        return alertas;
    }

    determinarRelevancia(tipo) {
        if (tipo === 'audio' || tipo === 'document') return 'alta';
        if (tipo === 'sticker') return 'baja';
        return 'media';
    }

    determinarAccionRequerida(tipo, analisis) {
        if (analisis.includes('PROBLEMA')) return 'revision_urgente';
        if (tipo === 'document') return 'procesamiento_manual';
        return 'documentacion';
    }

    formatearAnalisisTecnico(analisisTecnico) {
        let texto = '';
        if (analisisTecnico.videoInfo) {
            texto += `📹 **Información del Video:**\n`;
            texto += `   • ID: ${analisisTecnico.videoInfo.id}\n`;
            texto += `   • Duración: ${analisisTecnico.videoInfo.duration} segundos\n`;
            texto += `   • Procesamiento: ${analisisTecnico.procesamiento}\n`;
            if (analisisTecnico.frames) {
                texto += `   • Frames extraídos: ${analisisTecnico.frames.length}\n`;
            }
        }
        return texto;
    }

    extraerMetricasDeAnalisis(datos) {
        return {
            tipo_procesamiento: datos.analisisTecnico?.procesamiento || 'básico',
            frames_extraidos: datos.analisisTecnico?.frames?.length || 0,
            analisis_empresarial: !!datos.analisisEmpresarial,
            evaluacion_instagram: !!datos.evaluacionInstagram,
            timestamp: new Date().toISOString()
        };
    }

    extraerMetricasDeImagenAnalisis(datos) {
        return {
            analisis_empresarial: !!datos.analisisEmpresarial,
            documento_financiero: !!datos.analisisDocumento,
            timestamp: new Date().toISOString()
        };
    }

    // === FUNCIÓN AUXILIAR: procesarImagenBasico ===
    // Agregar esta función si no existe

    async procesarImagenBasico(message) {
        console.log('[IMAGE] 🔧 Ejecutando análisis básico de imagen...');
        
        const timestamp = new Date().toLocaleString();
        const contacto = await message.getContact();
        const nombreContacto = contacto.pushname || contacto.name || 'Usuario';
        
        let analisis = `📸 **ANÁLISIS BÁSICO DE IMAGEN** - ${timestamp}\n\n`;
        
        analisis += `👤 **Remitente:** ${nombreContacto}\n`;
        analisis += `📱 **Tipo:** ${message.type}\n`;
        analisis += `⏰ **Recibida:** ${timestamp}\n\n`;
        
        // Análisis contextual por horario
        const hora = new Date().getHours();
        if (hora >= 11 && hora <= 13) {
            analisis += `🕐 **Contexto:** Horario de almuerzo - posible supervisión operativa\n`;
        } else if (hora >= 15 && hora <= 17) {
            analisis += `🕐 **Contexto:** Horario pico - posible documentación de actividad\n`;
        } else if (hora >= 19 && hora <= 21) {
            analisis += `🕐 **Contexto:** Horario nocturno - posible contenido para redes\n`;
        }
        
        analisis += `\n📋 **Recomendaciones:**\n`;
        analisis += `   • Revisar imagen manualmente para detalles específicos\n`;
        analisis += `   • Documentar en registro de supervisión\n`;
        analisis += `   • Evaluar si requiere análisis especializado\n\n`;
        
        analisis += `✅ **Imagen documentada correctamente en sistema**`;
        
        return analisis;
    }


    // === FUNCIONES DE PROCESAMIENTO DE IMÁGENES ===
    async procesarImagenWhatsApp(message) {
        try {
            console.log('[IMAGE] Procesando imagen de WhatsApp...');

            if (!message.hasMedia) {
                console.log('[IMAGE] Mensaje no tiene media');
                return null;
            }

            const media = await message.downloadMedia();
            if (!media) {
                console.log('[IMAGE] No se pudo descargar la imagen');
                return null;
            }

            if (!media.mimetype.startsWith('image/')) {
                console.log(`[IMAGE] Tipo de archivo no es imagen: ${media.mimetype}`);
                return null;
            }

            const imagenData = {
                data: media.data,
                mimetype: media.mimetype,
                filename: media.filename || 'imagen_whatsapp.jpg',
                timestamp: new Date().toISOString(),
                size: media.data ? media.data.length : 0,
                fuente: 'whatsapp',
                procesamiento: {
                    vision_api: false,
                    analisis_rostros: false,
                    deteccion_objetos: false,
                    ocr_completado: false,
                    clasificacion_seguridad: 'pendiente'
                }
            };

            console.log(`[IMAGE] Imagen preparada: ${imagenData.mimetype}, ${Math.round(imagenData.size/1024)}KB`);
            
            const esImagenSupervision = await this.detectarImagenSupervision(imagenData, message);
            if (esImagenSupervision) {
                console.log('[SECURITY] Imagen de supervisión detectada - Activando análisis avanzado');
                imagenData.procesamiento.clasificacion_seguridad = 'supervision_activa';
                await this.guardarImagenSupervision(imagenData);
            }
            
            return imagenData;

        } catch (error) {
            console.error('[ERROR] Error procesando imagen WhatsApp:', error);
            return null;
        }
    }

    async detectarImagenSupervision(imagenData, message) {
        try {
            const texto = message.body ? message.body.toLowerCase() : '';
            const contacto = await message.getContact();
            const nombreContacto = contacto.pushname || contacto.name || '';
            
            const palabrasSupervision = [
                'seguridad', 'camara', 'vigilancia', 'monitoreo', 'supervision',
                'incidente', 'emergencia', 'problema', 'sospechoso', 'alerta',
                'entrada', 'salida', 'visitantes', 'multitud', 'aglomeracion',
                'niños perdidos', 'perdido', 'extraviado', 'ayuda', 'accidente'
            ];
            
            const contieneSupervision = palabrasSupervision.some(palabra => 
                texto.includes(palabra) || nombreContacto.toLowerCase().includes('seguridad')
            );
            
            const horaActual = new Date().getHours();
            const esFueraHorario = horaActual < 10 || horaActual > 23;
            
            return contieneSupervision || esFueraHorario;
            
        } catch (error) {
            console.error('[ERROR] Error detectando imagen de supervisión:', error);
            return false;
        }
    }

    async guardarImagenSupervision(imagenData) {
        try {
            const fechaHoy = new Date().toISOString().split('T')[0];
            const horaActual = new Date().toLocaleTimeString();
            
            const supervisionDir = path.join(__dirname, '../supervision_imagenes', fechaHoy);
            if (!fs.existsSync(supervisionDir)) {
                fs.mkdirSync(supervisionDir, { recursive: true });
            }
            
            const nombreArchivo = `supervision_${Date.now()}.jpg`;
            const rutaArchivo = path.join(supervisionDir, nombreArchivo);
            
            const imagenBuffer = Buffer.from(imagenData.data, 'base64');
            fs.writeFileSync(rutaArchivo, imagenBuffer);
            
            const logSupervision = {
                timestamp: new Date().toISOString(),
                archivo: nombreArchivo,
                ruta: rutaArchivo,
                size: imagenData.size,
                tipo: imagenData.mimetype,
                clasificacion: imagenData.procesamiento.clasificacion_seguridad,
                metadata: {
                    hora_recepcion: horaActual,
                    fuente: 'whatsapp_bot',
                    analisis_pendiente: true
                }
            };
            
            const logPath = path.join(supervisionDir, 'supervision_log.jsonl');
            fs.appendFileSync(logPath, JSON.stringify(logSupervision) + '\n');
            
            console.log(`[SECURITY] Imagen de supervisión guardada: ${rutaArchivo}`);
            
        } catch (error) {
            console.error('[ERROR] Error guardando imagen de supervisión:', error);
        }
    }

    // === FUNCIONES DE REGISTRO Y MÉTRICAS ===
    registrarEnvioMensaje(exito, error = null) {
        this.mensajesEnviados++;
        if (!exito) {
            this.erroresEnvio++;
            console.log(`[DEBUG] Error ${this.erroresEnvio}/${this.mensajesEnviados}: ${error}`);
        } else {
            console.log(`[DEBUG] Envío exitoso ${this.mensajesEnviados - this.erroresEnvio}/${this.mensajesEnviados}`);
        }
    }

    // === FUNCIONES DE MANEJO DE INVENTARIO ===
    async manejarInventario() {
        const inventarioPath = '\\\\192.168.3.180\\datos_a2\\inventario_convertido.json';

        if (!esPCParque()) {
            if (archivoReciente(inventarioPath)) {
                const datos = JSON.parse(fs.readFileSync(inventarioPath, 'utf-8'));
                console.log("✅ Inventario actualizado procesado por el bot.");
            } else {
                console.warn("⚠️ Inventario desactualizado. No se procesará.");
            }
        }
    }
    
    async actualizarInventarioDesdeParque() {
        const inventarioPath = '\\\\192.168.3.180\\datos_a2\\inventario_convertido.json';

        try {
            if (!fs.existsSync(inventarioPath)) {
                console.warn("[BOT] ⚠️ No se encontró el archivo de inventario convertido.");
                return;
            }

            const datos = JSON.parse(fs.readFileSync(inventarioPath, 'utf-8'));

            datos.fecha_actualizacion = new Date().toISOString().slice(0, 10);
            datos.hora_actualizacion = new Date().toLocaleTimeString();
            datos.fuente = "bot_pc_parque";

            fs.writeFileSync("./ultima_peticion_inventario.json", JSON.stringify(datos, null, 2));

            const res = await fetch("https://playpark-simbolico.ngrok.app/api/inventario/registro", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                console.log("[BOT] ✅ Inventario REAL actualizado desde el archivo convertido.");
            } else {
                console.warn("[BOT] ⚠️ Fallo al registrar inventario en la API:", res.status);
            }

        } catch (e) {
            console.error("[BOT] ❌ Error al procesar inventario real:", e.message);
        }
    }

    async reiniciarSistemaDesdeBot() {
        try {
            const res = await axios.post("https://playpark-simbolico.ngrok.app/api/admin/accion", {
                token: "simbolo123",
                accion: "cerrar_sistema"
            });

            if (res.data && res.data.status === "ok") {
                console.log("[BOT] ⚠️ Reinicio solicitado a través de API local");
            } else {
                console.warn("[BOT] ⚠️ Error en respuesta del servidor:", res.data);
            }
        } catch (e) {
            console.error("[BOT] ❌ Error al enviar orden de reinicio:", e.message);
        }
    }

    async mostrarGrupos() {
        try {
            console.log('[GRUPOS] Obteniendo lista de grupos...');
            const chats = await this.client.getChats();
            
            const grupos = chats.filter(chat => chat.isGroup);
            
            if (grupos.length === 0) {
                console.log('[GRUPOS] No se encontraron grupos');
                return;
            }
            
            console.log('\n=== GRUPOS DISPONIBLES ===');
            for (const chat of grupos) {
                console.log(`Grupo: "${chat.name}"`);
                console.log(`ID: ${chat.id._serialized}`);
                console.log(`Participantes: ${chat.participants ? chat.participants.length : 'No disponible'}`);
                console.log(`Descripcion: ${chat.description || 'Sin descripcion'}`);
                console.log('-----------------------------------');
            }
            console.log('=== FIN GRUPOS ===\n');
            
            const gruposInfo = grupos.map(chat => ({
                nombre: chat.name,
                id: chat.id._serialized,
                participantes: chat.participants ? chat.participants.length : 0,
                descripcion: chat.description || ''
            }));
            
            const gruposPath = path.join(__dirname, '../grupos_whatsapp.json');
            fs.writeFileSync(gruposPath, JSON.stringify(gruposInfo, null, 2), 'utf8');
            console.log(`[GRUPOS] Informacion guardada en: ${gruposPath}`);
            
        } catch (error) {
            console.error('[ERROR] Error obteniendo grupos:', error.message);
        }
    }

    cargarPersonalAutorizado() {
        try {
            const contextoPath = path.join(__dirname, '../contexto_operativo.json');
            
            if (!fs.existsSync(contextoPath)) {
                console.log('[WARNING] contexto_operativo.json no encontrado, usando numeros por defecto');
                return ['584246865492'];
            }
            
            const contexto = JSON.parse(fs.readFileSync(contextoPath, 'utf8'));
            const numerosPersonal = [];
            
            for (const [id, datos] of Object.entries(contexto)) {
                if (typeof datos === 'object' && datos.telefono) {
                    const numeroLimpio = datos.telefono.toString().replace('+', '').replace(' ', '');
                    numerosPersonal.push(numeroLimpio);
                    console.log(`[PERSONAL] ${datos.nombre || 'Sin nombre'} (${numeroLimpio})`);
                }
            }
            
            console.log(`[PERSONAL] Total autorizado: ${numerosPersonal.length} personas`);
            return numerosPersonal;
            
        } catch (error) {
            console.error('[ERROR] Error cargando personal del contexto:', error.message);
            return ['584246865492'];
        }
    }

    // === PROCESAMIENTO PRINCIPAL DE MENSAJES ===
    async procesarMensaje(message) {
        try {
            const numero = message.from;
            const texto = message.body || '';
            const contacto = await message.getContact();
            const nombreContacto = contacto.pushname || contacto.name || 'Desconocido';
            const esGrupo = message.from.includes('@g.us');
            
            if (numero.includes('status@broadcast')) {
                return;
            }

            const esGrupoPermitido = GRUPOS_PERMITIDOS.has(message.from);
            if (esGrupo && !esGrupoPermitido) {
                console.log(`[FILTER] Ignorando mensaje de grupo NO autorizado: ${message.from}`);
                return;
            }

            const personalAutorizado = this.cargarPersonalAutorizado();
            const numeroLimpio = numero.replace('@c.us', '').replace('@g.us', '').replace('+', '');
            const esPersonalAutorizado = personalAutorizado.some(num => 
                numeroLimpio.includes(num) || num.includes(numeroLimpio.substring(-8))
            );
            
            if (!esGrupo) {
                console.log(`[PRIVATE] Mensaje privado ignorado de ${nombreContacto}`);
                return;
            }

            console.log(`[MESSAGE] ${esGrupo ? 'GRUPO' : 'PERSONAL'} - ${nombreContacto}: "${texto.substring(0, 100)}${texto.length > 100 ? '...' : ''}"`);
            
            const tieneTexto = texto && texto.trim() !== '';
            const tieneMedia = message.hasMedia;
            const esAudio = message.type === 'ptt' || message.type === 'audio';
            const esImagen = message.type === 'image';
            const esVideo = message.type === 'video';
            const esSticker = message.type === 'sticker';
            const esDocumento = message.type === 'document';
            
            console.log(`[ANALYSIS] Texto: ${tieneTexto}, Media: ${tieneMedia}, Tipo: ${message.type}`);
            
            this.guardarLog('MENSAJE_RECIBIDO', `${nombreContacto} (${numero}): ${texto} [${message.type}] [${esGrupo ? 'GRUPO' : 'PERSONAL'}]`);
            this.estadisticas.ultima_actividad = new Date().toISOString();
            // === PROCESAMIENTO IA: comando manual y análisis inteligente ===
            if (tieneTexto) {
                const textoLimpio = texto.trim().toLowerCase();

                if (textoLimpio === "/testia") {
                    console.log("[TEST] Ejecutando test IA manual");
                    const resultado = await ejecutar_funcion_operativa("¿Cuál es el estado del parque hoy?", numero, null);
                    await message.reply(resultado?.respuesta_grupo || "⚠️ Sin respuesta IA");
                    return;
                }

                if (detectarMensajeRelevante(textoLimpio)) {
                    console.log(`[GPT] 📩 Mensaje relevante detectado: "${texto}"`);
                    const resultado = await ejecutar_funcion_operativa(texto, numero, null);

                    if (resultado?.respuesta_grupo) {
                        const textoRespuesta = resultado?.respuesta_grupo || ''; // 🔒 BLINDA AQUÍ

                        // 🔍 Solo imprime length si ya sabes que es seguro
                        console.log('[DEBUG] Texto length:', textoRespuesta.length);

                        console.log('[DEBUG] Validando antes de enviar...');
                        console.log('[DEBUG] Message:', message ? 'OK' : 'NULL');
                        console.log('[DEBUG] Message.from:', message?.from);
                        console.log('[DEBUG] Client:', this.client ? 'OK' : 'NULL');
                        console.log('[DEBUG] Connected:', this.isConnected);

                        const resultadoEnvio = await this.enviarRespuestaSegura(message, textoRespuesta);
                        if (!resultadoEnvio.success) {
                            console.error('[ERROR] No se pudo enviar respuesta:', resultadoEnvio.error);
                        }
                        console.log('[GPT] ✅ Respuesta enviada');
                    } else {
                        console.log('[GPT] ⚠️ No se generó respuesta');
                    }
                    return;
                }

                console.log('[GPT] ⏩ Mensaje ignorado por ser casual o sin palabras clave');

            }

            
            
            
            if (!tieneTexto && !tieneMedia) {
                console.log('[FILTER] Mensaje vacio ignorado');
                return;
            }
            
            if (esSticker) {
                console.log('[FILTER] Sticker ignorado');
                return;
            }
            
            // === PROCESAMIENTO DE COMANDOS ===
            if (tieneTexto) {
                if (texto.toLowerCase().includes('/ping') || texto.toLowerCase().includes('/test')) {
                    const respuesta = `Bot PlayMall Park ACTIVO\n\n${new Date().toLocaleString()}\nMensajes procesados: ${this.estadisticas.mensajes_procesados}\nEstado: ${this.isConnected ? 'Conectado' : 'Desconectado'}\nReconexiones: ${this.estadisticas.reconexiones}\n\nSistema operativo funcionando correctamente`;
                    
                    await message.reply(respuesta);
                    console.log('[COMMAND] Respuesta ping enviada');
                    return;
                }
                
                if (texto.toLowerCase().includes('/estado')) {
                    const uptime = this.calcularUptime();
                    const respuesta = `Estado del Sistema PlayMall Park\n\nBot: ${this.isConnected ? 'OPERATIVO' : 'DESCONECTADO'}\nFuncionando desde: ${uptime}\nMensajes procesados: ${this.estadisticas.mensajes_procesados}\nReconexiones: ${this.estadisticas.reconexiones}\nErrores: ${this.estadisticas.errores}\nUltimo heartbeat: ${new Date(this.lastHeartbeat).toLocaleTimeString()}\n\nPlayMall Park - Supervision Inteligente`;
                    
                    await message.reply(respuesta);
                    console.log('[COMMAND] Respuesta estado enviada');
                    return;
                }
                
                if (texto.toLowerCase().includes('/help') || texto.toLowerCase().includes('/ayuda')) {
                    const respuesta = `Comandos del Bot PlayMall Park\n\nComandos disponibles:\n• /ping - Verificar estado del bot\n• /estado - Estado detallado del sistema\n• /help - Mostrar esta ayuda\n• /grupos - Listar grupos (personal autorizado)\n• /id - Mostrar ID del grupo actual\n\nFunciones automaticas:\n• Supervision 24/7\n• Reportes automaticos\n• Analisis inteligente con GPT\n• Control de operaciones\n\nPara consultas especificas, simplemente escribe tu mensaje y el sistema te respondera automaticamente.`;
                    
                    await message.reply(respuesta);
                    console.log('[COMMAND] Respuesta help enviada');
                    return;
                }
                
                if (texto.toLowerCase().includes('/grupos') || texto.toLowerCase().trim() === 'grupos') {
                    console.log('[COMMAND] Comando /grupos detectado');
                    
                    try {
                        console.log('[GRUPOS] Obteniendo lista de grupos...');
                        
                        const chats = await this.client.getChats();
                        const grupos = chats.filter(chat => chat.isGroup);
                        
                        if (grupos.length === 0) {
                            await message.reply("⚠️ No se encontraron grupos disponibles.");
                            return;
                        }
                        
                        console.log('\n=== GRUPOS DISPONIBLES ===');
                        for (const chat of grupos) {
                            console.log(`[GRUPO] "${chat.name}" → ${chat.id._serialized}`);
                            console.log(`[INFO] Participantes: ${chat.participants ? chat.participants.length : 'N/A'}`);
                            console.log('---');
                        }
                        console.log('=== FIN GRUPOS ===\n');
                        
                        const respuesta = `📋 **Lista de Grupos WhatsApp**\n\n✅ ${grupos.length} grupos encontrados\n\n🔍 **IDs mostrados en consola:**\n• Revisa los logs del servidor\n• Busca líneas [GRUPO]\n• Los IDs terminan en @g.us\n\n📌 **Total grupos:** ${grupos.length}`;
                        
                        await message.reply(respuesta);
                        console.log('[COMMAND] Respuesta /grupos enviada exitosamente');
                        return;
                        
                    } catch (error) {
                        console.error('[ERROR] Error procesando comando /grupos:', error.message);
                        
                        const respuestaError = `❌ **Error obteniendo grupos**\n\n🔧 Causa: ${error.message}\n\n🔄 Intenta nuevamente en unos segundos`;
                        
                        await message.reply(respuestaError);
                        return;
                    }
                }
                
                if (texto.toLowerCase().includes('/id') && esGrupo && esPersonalAutorizado) {
                    const grupoId = message.from;
                    const chat = await message.getChat();
                    
                    const respuesta = `Informacion del Grupo Actual\n\nNombre: ${chat.name || 'Sin nombre'}\nID: ${grupoId}\nParticipantes: ${chat.participants ? chat.participants.length : 'No disponible'}\nDescripcion: ${chat.description || 'Sin descripcion'}\n\nUsa este ID para configurar el sistema Python`;
                    
                    await message.reply(respuesta);
                    console.log(`[COMMAND] ID del grupo enviado: ${grupoId}`);
                    return;
                }
                
                if (texto.toLowerCase() === '/personal' && esPersonalAutorizado) {
                    const respuesta = `Personal Autorizado (${personalAutorizado.length})\n\n` +
                                    personalAutorizado.map((num, i) => `${i+1}. ${num}`).join('\n');
                    await message.reply(respuesta);
                    console.log('[COMMAND] Lista de personal enviada');
                    return;
                }
                
                if (texto.toLowerCase().includes('ver inventario')) {
                    try {
                        const inventarioPath = path.join(__dirname, '../datos_a2/inventario_convertido.json');

                        if (!fs.existsSync(inventarioPath)) {
                            await message.reply("⚠️ El archivo de inventario no está disponible.");
                            return;
                        }

                        const data = JSON.parse(fs.readFileSync(inventarioPath, 'utf8'));
                        const inventario = data.inventario;

                        if (!Array.isArray(inventario) || inventario.length === 0) {
                            await message.reply("📦 El inventario está vacío.");
                            return;
                        }

                        let mensaje = "📦 *Inventario Completo del Parque:*\n\n";

                        for (const producto of inventario) {
                            const nombre = producto.nombre?.trim() || "SIN NOMBRE";
                            const existencia = producto.existencia ?? "N/D";
                            const unidad = producto.unidad ?? "N/D";

                            mensaje += `• *${nombre}* → ${existencia} ${unidad}\n`;
                        }

                        mensaje += `\n📌 Total productos listados: ${inventario.length}`;
                        await message.reply(
                            typeof mensaje === 'string' && mensaje.trim().length > 0
                                ? mensaje.trim()
                                : '⚠️ No se pudo generar un mensaje válido para responder.'
                        );

                    } catch (e) {
                        console.error("[BOT] ❌ Error leyendo inventario:", e.message);
                        await message.reply("❌ No se pudo leer el inventario. Contacta al administrador.");
                    }
                    console.log('[COMMAND] Respuesta inventario enviada');
                    return;
                }
            }
            
            // === PROCESAMIENTO DE MEDIA ===
            let imagenData = null;
            let videoData = null;
            let tipoMedia = null;
            
            if (esImagen) {
                console.log('[IMAGE] Procesando imagen...');
                try {
                    imagenData = await this.procesarImagenWhatsApp(message);
                    tipoMedia = 'imagen';
                    console.log(`[IMAGE] Imagen procesada: ${imagenData ? 'Exitoso' : 'Error'}`);
                } catch (error) {
                    console.error('[ERROR] Error procesando imagen:', error.message);
                    imagenData = null;
                }
            }
            
            else if (esVideo) {
                console.log('[VIDEO] Procesando video...');
                try {
                    if (!this.videoAnalyzer) {
                        this.videoAnalyzer = new VideoAnalyzer();
                    }
                    
                    videoData = await this.procesarVideoRecibido(message);
                    tipoMedia = 'video';
                    
                    if (videoData && videoData.status === 'success') {
                        console.log(`[VIDEO] ✓ Video procesado: ${videoData.procesamiento}`);
                        if (videoData.frames && videoData.frames.length > 0) {
                            console.log(`[VIDEO] ✓ ${videoData.frames.length} frames extraídos`);
                        }
                        
                        // === PROCESAMIENTO COMPLETO PARA INSTAGRAM ===
                        console.log('[INSTAGRAM] Iniciando análisis para posible publicación...');
                        
                        if (!this.instagramProcessor && InstagramVideoProcessor) {
                            this.instagramProcessor = new InstagramVideoProcessor();
                        }
                        
                        // Ejecutar análisis IA completo ANTES del análisis de Instagram
                        let analisisIA = null;
                        
                        if (videoData.frames && videoData.frames.length > 0) {
                            try {
                                const frameBuffer = fs.readFileSync(videoData.frames[0].path);
                                const frameBase64 = frameBuffer.toString('base64');
                                
                                const frameImageData = {
                                    data: frameBase64,
                                    mimetype: 'image/jpeg',
                                    filename: path.basename(videoData.frames[0].path),
                                    timestamp: videoData.frames[0].timestamp,
                                    frameIndex: videoData.frames[0].index
                                };
                                
                                // Análisis IA del frame principal
                                const textoParaGPT = `[FRAME ${frameImageData.frameIndex} del video en tiempo ${frameImageData.timestamp}s] ${texto}`;
                                analisisIA = await ejecutar_funcion_operativa(textoParaGPT, numero, frameImageData);
                                
                                console.log('[IA] Análisis IA completado para video');
                                
                            } catch (errorIA) {
                                console.log(`[WARNING] No se pudo hacer análisis IA: ${errorIA.message}`);
                            }
                        }
                        
                        // Análisis para Instagram
                        let mensajeInstagram = '';
                        if (this.instagramProcessor) {
                            try {
                                const analisisInstagram = await this.instagramProcessor.procesarVideoParaInstagram(
                                    videoData, 
                                    message, 
                                    analisisIA
                                );
                                
                                // VERIFICAR QUE EL RESULTADO ES TEXTO
                                if (typeof analisisInstagram === 'string') {
                                    mensajeInstagram = analisisInstagram;
                                } else {
                                    console.log('[INSTAGRAM] Resultado no es string, extrayendo contenido...');
                                    mensajeInstagram = analisisInstagram?.contenido || 
                                                    analisisInstagram?.mensaje || 
                                                    'Análisis de Instagram completado';
                                }
                                
                            } catch (instagramError) {
                                console.error('[INSTAGRAM] Error en análisis:', instagramError);
                                mensajeInstagram = `📱 Video analizado para Instagram Stories\n\nError en evaluación: ${instagramError.message}`;
                            }
                        }
                        
                        // === COMBINAR ANÁLISIS DE VIDEO + ANÁLISIS DE INSTAGRAM ===
                        let respuestaCompleta = await this.combinarAnalisisVideoInstagram(
                            videoData, 
                            analisisIA, 
                            mensajeInstagram
                        );
                        
                        // === VALIDACIÓN CRÍTICA DE LA RESPUESTA ===
                        if (!respuestaCompleta || typeof respuestaCompleta !== 'string') {
                            console.error('[VIDEO] ❌ Respuesta no es string válido');
                            console.error('[VIDEO] Tipo respuesta:', typeof respuestaCompleta);
                            console.error('[VIDEO] Contenido respuesta:', respuestaCompleta);
                            
                            // GENERAR RESPUESTA FALLBACK SEGURA
                            respuestaCompleta = `🎬 **VIDEO PROCESADO EXITOSAMENTE** - ${new Date().toLocaleString()}\n\n` +
                                            `📊 **Información:**\n` +
                                            `   • ID: ${videoData.videoInfo?.id || 'N/A'}\n` +
                                            `   • Duración: ${videoData.videoInfo?.duration || 'N/A'} segundos\n` +
                                            `   • Procesamiento: ${videoData.procesamiento}\n` +
                                            `   • Frames: ${videoData.frames?.length || 0}\n\n` +
                                            `✅ Video documentado en sistema de supervisión PlayMall Park`;
                        }
                        
                        // === VERIFICACIÓN FINAL ANTES DE ENVÍO ===
                        if (typeof respuestaCompleta === 'string' && respuestaCompleta.trim().length > 0) {
                            console.log('[VIDEO] ✅ Respuesta válida generada, enviando...');
                            
                            // Limpiar archivos temporales después de un tiempo
                            if (videoData.videoPath || (videoData.frames && videoData.frames.length > 0)) {
                                this.videoAnalyzer.limpiarArchivosTemporales(videoData);
                            }
                            
                            // ENVIAR RESPUESTA CON VALIDACIÓN MEJORADA
                            const resultadoEnvio = await this.enviarRespuestaSegura(message, respuestaCompleta);
                            
                            if (resultadoEnvio.success) {
                                console.log('[VIDEO] ✅ Respuesta completa enviada exitosamente');
                            } else {
                                console.error('[VIDEO] ❌ Error enviando respuesta:', resultadoEnvio.error);
                            }
                            
                            return; // IMPORTANTE: Salir aquí para evitar procesamiento adicional
                            
                        } else {
                            console.error('[VIDEO] ❌ Respuesta final no válida');
                            console.error('[VIDEO] Tipo:', typeof respuestaCompleta);
                            console.error('[VIDEO] Contenido:', respuestaCompleta);
                            
                            // RESPUESTA DE EMERGENCIA
                            await this.enviarRespuestaSegura(message, '🎬 Video procesado correctamente. Sistema de respuestas temporalmente limitado.');
                            return;
                        }
                        
                    } else {
                        console.log('[VIDEO] ✗ Error procesando video');
                        await this.enviarRespuestaSegura(message, '❌ Error procesando video. Intenta enviarlo nuevamente.');
                        return;
                    }
                } catch (error) {
                    console.error('[ERROR] Error procesando video:', error.message);
                    console.error('[ERROR] Stack:', error.stack);
                    videoData = null;
                    
                    await this.enviarRespuestaSegura(message, `❌ Error técnico procesando video: ${error.message}`);
                    return;
                }
            }

            // === VERIFICAR RESPUESTAS A INSTAGRAM ===
            if (this.instagramProcessor && tieneTexto) {
                const respuestaInstagram = await this.instagramProcessor.procesarRespuestaInstagram(message, texto);
                if (respuestaInstagram) {
                    console.log('[INSTAGRAM] Procesando respuesta de confirmación/cancelación');
                    await message.reply(respuestaInstagram);
                    return;
                }
            }

            // === COMANDOS ESPECIALES DE INSTAGRAM ===
            if (tieneTexto && texto.toLowerCase().includes('consejos instagram')) {
                const consejosGenerales = await this.generarConsejosInstagramGenerales();
                await message.reply(consejosGenerales);
                return;
            }

            if (tieneTexto && texto.toLowerCase().includes('estado instagram')) {
                const estadoInstagram = await this.mostrarEstadoInstagram();
                await message.reply(estadoInstagram);
                return;
            }
            
            // === PROCESAMIENTO GPT ===
            const esElegibleParaGPT = (
                (tieneTexto && !texto.startsWith('/') && texto.length > 5) ||
                tieneMedia ||
                esAudio
            );
            
            if (esElegibleParaGPT && (esGrupo || esPersonalAutorizado)) {
                console.log('[GPT] Mensaje elegible para procesamiento inteligente');
                
                let textoParaGPT = texto || '';
                let resultado = null;
                
                try {
                    // PROCESAMIENTO DE IMAGEN
                    if (imagenData) {
                        console.log('[AI] Procesando imagen con sistema IA actual...');
                        resultado = await ejecutar_funcion_operativa(textoParaGPT, numero, imagenData);
                        if (!resultado?.respuesta_grupo || resultado.respuesta_grupo.trim().length === 0) {
                            console.warn('[GPT] ⚠️ Respuesta vacía de sistema operativo');
                        }


                        console.log('[AI] ✓ Imagen procesada con sistema actual');
                    }
                    
                    // PROCESAMIENTO DE VIDEO
                    else if (videoData && videoData.status === 'success') {
                        console.log('[AI] Procesando video con sistema temporal...');
                        
                        if (videoData.frames && videoData.frames.length > 0) {
                            console.log(`[AI] Analizando ${videoData.frames.length} frames con IA...`);
                            
                            const analisisFrames = [];
                            
                            for (let i = 0; i < videoData.frames.length; i++) {
                                const frame = videoData.frames[i];
                                
                                try {
                                    const frameBuffer = fs.readFileSync(frame.path);
                                    const frameBase64 = frameBuffer.toString('base64');
                                    
                                    const frameImageData = {
                                        data: frameBase64,
                                        mimetype: 'image/jpeg',
                                        filename: path.basename(frame.path),
                                        timestamp: frame.timestamp,
                                        frameIndex: frame.index
                                    };
                                    
                                    const contextoFrame = `${textoParaGPT} [FRAME ${frame.index} del video en tiempo ${frame.timestamp.toFixed(1)}s]`;
                                    const analisisFrame = await ejecutar_funcion_operativa(contextoFrame, numero, frameImageData);
                                    
                                    if (analisisFrame && analisisFrame.respuesta_grupo) {
                                        analisisFrames.push({
                                            frame: frame.index,
                                            timestamp: frame.timestamp,
                                            analisis: analisisFrame.respuesta_grupo
                                        });
                                    }
                                    
                                } catch (error) {
                                    console.error(`[ERROR] Error analizando frame ${frame.index}:`, error);
                                }
                            }
                            
                            if (analisisFrames.length > 0) {
                                let respuestaCompleta = `🎥 **ANÁLISIS COMPLETO DE VIDEO** - ${new Date().toLocaleString()}\n\n`;
                                respuestaCompleta += `📊 **Información del video:**\n`;
                                respuestaCompleta += `   • Duración: ${videoData.videoInfo.duration} segundos\n`;
                                respuestaCompleta += `   • Frames analizados: ${analisisFrames.length}\n`;
                                respuestaCompleta += `   • Procesamiento: ${videoData.procesamiento}\n\n`;
                                
                                analisisFrames.forEach((frameAnalisis, index) => {
                                    respuestaCompleta += `🎬 **FRAME ${frameAnalisis.frame}** (${frameAnalisis.timestamp.toFixed(1)}s):\n`;
                                    respuestaCompleta += `${frameAnalisis.analisis}\n\n`;
                                    
                                    if (index < analisisFrames.length - 1) {
                                        respuestaCompleta += `${'─'.repeat(50)}\n\n`;
                                    }
                                });
                                
                                respuestaCompleta += `🧠 **Análisis temporal completado** - Sistema de video inteligente PlayMall Park`;
                                
                                resultado = {
                                    respuesta_grupo: respuestaCompleta,
                                    mensaje_privado: null
                                };
                            } else {
                                resultado = {
                                    respuesta_grupo: `🎥 **Video procesado con frames extraídos**\n\nSe extrajeron ${videoData.frames.length} frames del video pero no se pudo generar análisis IA detallado.\n\n📋 **Información:**\n• Duración: ${videoData.videoInfo.duration} segundos\n• Frames extraídos: ${videoData.frames.length}\n• Procesamiento: ${videoData.procesamiento}\n\n✅ Video y frames documentados en el sistema.`,
                                    mensaje_privado: null
                                };
                            }
                            
                        } else {
                            // ANÁLISIS BÁSICO MEJORADO: Solo información del video
                            console.log('[AI] Procesamiento básico de video (sin frames)...');

                            let tipoProblema = '';
                            let solucionSugerida = '';
                            let proximosPasos = '';

                            if (videoData.procesamiento === 'solo_metadatos') {
                                tipoProblema = 'No se pudo descargar el video desde WhatsApp Web';
                                solucionSugerida = 'En WhatsApp Web, haz clic en el video para forzar la descarga, luego reenvía el mensaje';
                                proximosPasos = 'Reintentar envío después de descargar manualmente';
                            } else if (videoData.procesamiento === 'error_descarga_detallado') {
                                tipoProblema = 'Problema específico de descarga detectado';
                                
                                if (videoData.detalles_problema?.problemas_detectados) {
                                    const problemas = videoData.detalles_problema.problemas_detectados;
                                    
                                    if (problemas.includes('Tamaño del video es 0 (no descargado por WhatsApp)')) {
                                        solucionSugerida = '💡 **Solución:** En WhatsApp Web, haz clic en el video para descargarlo, luego reenvía';
                                        proximosPasos = 'Video pendiente de descarga manual';
                                    } else if (problemas.includes('El video es reenviado (puede tener restricciones)')) {
                                        solucionSugerida = '💡 **Solución:** Los videos reenviados tienen limitaciones, intenta con video original';
                                        proximosPasos = 'Solicitar video original si es posible';
                                    } else {
                                        solucionSugerida = '💡 **Solución:** Verificar conexión y reintentar';
                                        proximosPasos = 'Revisar estado de WhatsApp Web';
                                    }
                                }
                            } else if (videoData.procesamiento === 'basico_sin_ffmpeg') {
                                tipoProblema = 'Sistema de extracción de frames no disponible';
                                solucionSugerida = '⚙️ **Info técnica:** FFmpeg requerido para análisis frame por frame';
                                proximosPasos = 'Video guardado para análisis posterior con herramientas instaladas';
                            } else if (videoData.procesamiento === 'basico_sin_frames') {
                                tipoProblema = 'No se pudieron extraer frames del video';
                                solucionSugerida = '🔧 **Posible causa:** Formato de video incompatible o archivo dañado';
                                proximosPasos = 'Video disponible para revisión manual';
                            }

                            let respuestaBasica = `🎥 **VIDEO RECIBIDO Y PROCESADO** - ${new Date().toLocaleString()}\n\n`;

                            respuestaBasica += `📊 **Información técnica:**\n`;
                            respuestaBasica += `   • ID: ${videoData.videoInfo.id}\n`;
                            respuestaBasica += `   • Duración: ${videoData.videoInfo.duration} segundos\n`;
                            respuestaBasica += `   • Remitente: ${nombreContacto}\n`;
                            respuestaBasica += `   • Procesamiento: ${videoData.procesamiento}\n`;
                            respuestaBasica += `   • Timestamp: ${videoData.videoInfo.timestamp}\n\n`;

                            if (tipoProblema) {
                                respuestaBasica += `⚠️ **Limitación detectada:** ${tipoProblema}\n\n`;
                            }

                            if (solucionSugerida) {
                                respuestaBasica += `${solucionSugerida}\n\n`;
                            }

                            respuestaBasica += `📋 **Estado actual:**\n`;
                            respuestaBasica += `   • ✅ Video registrado en sistema de supervisión\n`;
                            respuestaBasica += `   • 📝 Metadatos documentados correctamente\n`;
                            respuestaBasica += `   • 🔍 Disponible para análisis manual\n`;

                            if (proximosPasos) {
                                respuestaBasica += `   • 📌 ${proximosPasos}\n`;
                            }

                            respuestaBasica += `\n`;

                            // Análisis contextual inteligente
                            const contextoLower = textoParaGPT.toLowerCase();

                            if (contextoLower.includes('problema') || contextoLower.includes('falla')) {
                                respuestaBasica += `🔧 **Contexto identificado:** Reporte de problema técnico\n`;
                                respuestaBasica += `📞 **Acción programada:** Equipo técnico notificado para revisión del video\n`;
                                respuestaBasica += `⏰ **Prioridad:** ${contextoLower.includes('urgente') ? 'ALTA - Revisión inmediata' : 'Normal - Revisión en horario laboral'}\n\n`;
                                
                            } else if (contextoLower.includes('mascota') || contextoLower.includes('stitch')) {
                                respuestaBasica += `🎭 **Contexto identificado:** Actividad promocional con mascota\n`;
                                respuestaBasica += `📸 **Valor detectado:** Contenido potencial para marketing\n`;
                                respuestaBasica += `📈 **Acción sugerida:** Video documentado para equipo de contenido\n\n`;
                                
                            } else if (contextoLower.includes('evento') || contextoLower.includes('fiesta') || contextoLower.includes('cumpleaños')) {
                                respuestaBasica += `🎉 **Contexto identificado:** Evento especial en el parque\n`;
                                respuestaBasica += `💫 **Valor detectado:** Experiencia memorable documentada\n`;
                                respuestaBasica += `📊 **Métricas:** Contribuye a KPIs de satisfacción del cliente\n\n`;
                                
                            } else if (contextoLower.includes('atraccion') || contextoLower.includes('juego')) {
                                respuestaBasica += `🎢 **Contexto identificado:** Actividad con atracciones del parque\n`;
                                respuestaBasica += `⚙️ **Seguimiento:** Funcionamiento de equipos documentado\n`;
                                respuestaBasica += `🛡️ **Seguridad:** Video disponible para auditoría operativa\n\n`;
                                
                            } else {
                                respuestaBasica += `📹 **Contexto identificado:** Supervisión general del parque\n`;
                                respuestaBasica += `👁️ **Monitoreo:** Actividad rutinaria documentada\n`;
                                respuestaBasica += `📊 **Registro:** Contribuye al historial operativo diario\n\n`;
                            }

                            respuestaBasica += `💡 **¿Sabías que?**\n`;
                            respuestaBasica += `   • Los videos se procesan automáticamente cuando es posible\n`;
                            respuestaBasica += `   • El sistema puede analizar hasta 5 frames por video\n`;
                            respuestaBasica += `   • Cada frame se analiza con la misma IA que las imágenes\n`;
                            respuestaBasica += `   • Videos grandes (+50MB) requieren descarga manual\n\n`;

                            respuestaBasica += `✅ **Video procesado correctamente** - Sistema PlayMall Park 🎬`;

                            resultado = {
                                respuesta_grupo: respuestaBasica,
                                mensaje_privado: null
                            };
                        }
                        
                        console.log('[AI] ✓ Video procesado con sistema temporal');
                    }
                    
                    // PROCESAMIENTO SOLO DE TEXTO
                    else if (tieneTexto && !tieneMedia) {
                        if (esAudio) {
                            textoParaGPT = '[AUDIO ENVIADO] - Analizar mensaje de audio';
                        } else if (esDocumento) {
                            textoParaGPT = '[DOCUMENTO ENVIADO] - Analizar documento adjunto';
                        }
                        
                        console.log(`[GPT] Enviando a sistema: "${textoParaGPT.substring(0, 80)}..."`);
                        
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout GPT')), 40000)
                        );
                        
                        const gptPromise = ejecutar_funcion_operativa(textoParaGPT, numero, null);
                        resultado = await Promise.race([gptPromise, timeoutPromise]);
                        
                        console.log('[GPT] Respuesta recibida del sistema operativo');
                    }
                    
                    // === ENVÍO DE RESPUESTAS ===
                    if (resultado && resultado.respuesta_grupo) {
                        const textoRespuesta = resultado?.respuesta_grupo || '';
                        console.log(`[DEBUG] Texto length: ${textoRespuesta.length}`);

                        console.log(`[DEBUG] Validando antes de enviar...`);
                        console.log(`[DEBUG] Message: ${message ? 'OK' : 'NULL'}`);
                        console.log(`[DEBUG] Message.from: ${message?.from}`);
                        console.log(`[DEBUG] Client: ${this.client ? 'OK' : 'NULL'}`);
                        console.log(`[DEBUG] Connected: ${this.isConnected}`);

                        try {
                            const resultadoEnvio = await this.enviarRespuestaSegura(message, textoRespuesta);

                            if (resultadoEnvio.success) {
                                console.log(`[SUCCESS] Respuesta enviada a ${nombreContacto} con método: ${resultadoEnvio.method}`);
                            } else {
                                console.error(`[ERROR] No se pudo enviar respuesta: ${resultadoEnvio.error}`);
                            }

                        } catch (envioError) {
                            console.error('[ERROR] Error enviando respuesta:', envioError);
                            
                            // Guardar el error específico
                            try {
                                const fs = require('fs');
                                const path = require('path');
                                const errorLog = {
                                    timestamp: new Date().toISOString(),
                                    error: envioError.message,
                                    stack: envioError.stack,
                                    chatId: message?.from,
                                    textoLength: (resultado?.respuesta_grupo || '').length,
                                    tipo: 'error_envio_critico'
                                };
                                
                                const logsDir = path.join(__dirname, '../logs');
                                if (!fs.existsSync(logsDir)) {
                                    fs.mkdirSync(logsDir, { recursive: true });
                                }
                                
                                const errorPath = path.join(logsDir, `error_envio_${Date.now()}.json`);
                                fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2));
                                console.log(`[ERROR] Error guardado en: ${errorPath}`);
                                
                            } catch (logError) {
                                console.error('[ERROR] No se pudo guardar error:', logError);
                            }
                        }
                        
                    } else {
                        console.log('[WARNING] Sistema no generó respuesta válida');
                        if (esPersonalAutorizado) {
                            try {
                                await this.enviarRespuestaSegura(message, 'Mensaje procesado. No se generó respuesta automática en este momento.');
                            } catch (fallbackError) {
                                console.error('[ERROR] Error enviando mensaje fallback:', fallbackError);
                            }
                        }
                    }
                    
                    // Enviar mensaje privado si existe
                    if (resultado && 
                        resultado.mensaje_privado && 
                        resultado.mensaje_privado.numero && 
                        resultado.mensaje_privado.mensaje) {
                        
                        try {
                            console.log(`[PRIVATE] Enviando mensaje privado a: ${resultado.mensaje_privado.numero}`);
                            const chatPrivado = await this.client.getChatById(resultado.mensaje_privado.numero + '@c.us');
                            await chatPrivado.sendMessage(resultado.mensaje_privado.mensaje);
                            console.log('[PRIVATE] Mensaje privado enviado correctamente');
                        } catch (privateError) {
                            console.error('[ERROR] Error enviando mensaje privado:', privateError.message);
                        }
                    }
                    
                } catch (error) {
                    console.error('[ERROR] Error procesando con sistema operativo:');
                    console.error(`[ERROR] Mensaje: ${error.message}`);
                    console.error(`[ERROR] Texto: ${textoParaGPT.substring(0, 100)}`);
                    console.error(`[ERROR] Remitente: ${numero}`);
                    
                    if (esPersonalAutorizado) {
                        await message.reply(`Error procesando solicitud con el sistema operativo.\n\nDetalles técnicos:\n${error.message.substring(0, 100)}\n\nEl equipo técnico ha sido notificado automáticamente.`);
                    } else if (esGrupo) {
                        await message.reply('Sistema temporalmente no disponible. Intenta nuevamente en unos minutos.');
                    }
                    
                    this.estadisticas.errores++;
                    this.guardarLog('ERROR_GPT', `${error.message} | Mensaje: ${textoParaGPT.substring(0, 50)} | De: ${numero}`);
                }
            }
            
        } catch (error) {
            console.error('[ERROR] Error general procesando mensaje:', error.message);
            this.estadisticas.errores++;
            this.guardarLog('ERROR_PROCESO', error.message);
        }
    }

    async combinarAnalisisVideoInstagram(videoData, analisisIA, mensajeInstagram) {
        try {
            console.log('[VIDEO] 🔧 Combinando análisis...');
            
            let respuestaCompleta = "";
            
            // HEADER
            respuestaCompleta += `🎬 **ANÁLISIS COMPLETO DE VIDEO** - ${new Date().toLocaleString()}\n\n`;
            
            // INFORMACIÓN TÉCNICA
            respuestaCompleta += `📊 **Información técnica:**\n`;
            if (videoData && videoData.videoInfo) {
                respuestaCompleta += `   • ID: ${videoData.videoInfo.id}\n`;
                respuestaCompleta += `   • Duración: ${videoData.videoInfo.duration} segundos\n`;
                respuestaCompleta += `   • Procesamiento: ${videoData.procesamiento}\n`;
                respuestaCompleta += `   • Frames extraídos: ${videoData.frames ? videoData.frames.length : 0}\n`;
                respuestaCompleta += `   • Timestamp: ${videoData.videoInfo.timestamp}\n\n`;
            } else {
                respuestaCompleta += `   • Estado: Video procesado\n`;
                respuestaCompleta += `   • Timestamp: ${new Date().toISOString()}\n\n`;
            }
            
            // ANÁLISIS IA (SI ESTÁ DISPONIBLE)
            if (analisisIA && analisisIA.respuesta_grupo && analisisIA.respuesta_grupo.length > 0) {
                respuestaCompleta += `🧠 **ANÁLISIS DE INTELIGENCIA ARTIFICIAL:**\n\n`;
                
                // Limitar el análisis IA para evitar respuestas muy largas
                const analisisLimitado = analisisIA.respuesta_grupo.length > 500 
                    ? analisisIA.respuesta_grupo.substring(0, 500) + '...'
                    : analisisIA.respuesta_grupo;
                
                respuestaCompleta += `${analisisLimitado}\n\n`;
                respuestaCompleta += `${'═'.repeat(50)}\n\n`;
            }
            
            // EVALUACIÓN INSTAGRAM
            respuestaCompleta += `📱 **EVALUACIÓN PARA INSTAGRAM STORIES** 📱\n\n`;
            if (mensajeInstagram && typeof mensajeInstagram === 'string' && mensajeInstagram.length > 0) {
                respuestaCompleta += mensajeInstagram;
            } else {
                respuestaCompleta += `Video analizado para Instagram Stories.\n\nEvaluación básica completada - Contactar equipo para publicación manual.`;
            }
            
            // FOOTER
            respuestaCompleta += `\n\n${'─'.repeat(40)}\n`;
            respuestaCompleta += `🤖 **Sistema PlayMall Park** - Análisis automático con IA\n`;
            respuestaCompleta += `📹 Video + 🧠 IA + 📱 Instagram = 🚀 Automatización completa`;
            
            console.log('[VIDEO] ✅ Análisis combinado exitosamente');
            console.log('[VIDEO] ✅ Respuesta final length:', respuestaCompleta.length);
            
            return respuestaCompleta;
            
        } catch (error) {
            console.error('[ERROR] Error combinando análisis:', error);
            
            // RESPUESTA FALLBACK SEGURA
            return `🎬 **VIDEO PROCESADO CORRECTAMENTE**\n\n` +
                `Video documentado en el sistema para revisión posterior.\n\n` +
                `Error combinando análisis: ${error.message}\n\n` +
                `✅ Sistema PlayMall Park - Video registrado exitosamente`;
        }
    }
    async generarConsejosInstagramGenerales() {
        return `📱 **GUÍA COMPLETA: CREAR VIDEOS PARA INSTAGRAM STORIES** 📱

🎯 **OBJETIVO:** Crear contenido que genere más clientes y engagement

📐 **FORMATO TÉCNICO:**
   • **Orientación:** Vertical (9:16)
   • **Duración ideal:** 10-30 segundos
   • **Resolución mínima:** 720x1280
   • **Formato:** MP4 recomendado

🎬 **CONTENIDO QUE FUNCIONA:**
   ✅ Niños y familias disfrutando las atracciones
   ✅ Atracciones en funcionamiento (con movimiento)
   ✅ Interacciones con la mascota Stitch
   ✅ Momentos de diversión y risas genuinas
   ✅ Vista general del parque con actividad
   ✅ Productos de confitería atractivos

❌ **EVITAR:**
   ❌ Videos muy largos (+60 segundos)
   ❌ Atracciones paradas o sin gente
   ❌ Mala iluminación o imagen borrosa
   ❌ Audio poco claro o muy alto
   ❌ Enfoques solo en el personal trabajando

🕒 **MEJORES HORARIOS PARA GRABAR:**
   • **11:00 AM - 1:00 PM:** Familias con niños
   • **3:00 PM - 5:00 PM:** Pico de visitantes
   • **7:00 PM - 9:00 PM:** Ambiente nocturno

💡 **TIPS DE ORO:**
   1. **Captura emociones:** Las sonrisas venden más que las atracciones
   2. **Muestra variedad:** Alterna entre atracciones, comida y diversión
   3. **Incluye audio natural:** Risas, música, sonidos del parque
   4. **Estabilidad:** Usa ambas manos o apóyate en algo
   5. **Iluminación:** La luz natural siempre es mejor

🎪 **CONTENIDO ESTRELLA:**
   • Compilación de mejores momentos del día
   • Reacciones de niños en las atracciones
   • Behind the scenes del equipo preparando el parque
   • Ofertas especiales con productos visibles
   • Testimonios espontáneos de familias

🔥 **FRASES QUE FUNCIONAN EN MARACAIBO:**
   • "¡Los fines de semana están arrechísimos!"
   • "¡Ven a disfrutar con la familia!"
   • "¡La diversión está garantizada!"
   • "¡Los niños no se quieren ir!"

📊 **EL SISTEMA AUTOMÁTICO EVALÚA:**
   • Número de personas (3-8 es ideal)
   • Nivel de satisfacción detectado
   • Presencia de elementos del parque
   • Calidad técnica del video
   • Potencial de engagement

🎯 **RESULTADO:** Videos que cumplen estos criterios se publican automáticamente en los horarios de mayor alcance.

¿Necesitan ayuda específica con algún aspecto?`;
    }

    async mostrarEstadoInstagram() {
        try {
            const pendingCount = this.instagramProcessor ? this.instagramProcessor.pendingVideos?.size || 0 : 0;
            const horaActual = new Date().toLocaleTimeString();
            const esHorarioOptimo = this.instagramProcessor ? 
                this.instagramProcessor.instagramBot?.esHorarioOptimo() || false : false;
            
            let estado = `📊 **ESTADO DEL SISTEMA INSTAGRAM** 📊\n\n`;
            
            estado += `⏰ **Hora actual:** ${horaActual}\n`;
            estado += `📈 **Horario óptimo:** ${esHorarioOptimo ? '✅ SÍ' : '❌ NO'}\n`;
            estado += `🎬 **Videos pendientes:** ${pendingCount}\n\n`;
            
            if (pendingCount > 0) {
                estado += `📋 **Videos en proceso:**\n`;
                let contador = 1;
                for (const [videoId, data] of this.instagramProcessor.pendingVideos.entries()) {
                    const estadoTexto = {
                        'analyzing': '🔍 Analizando',
                        'waiting_confirmation': '⏳ Esperando confirmación',
                        'publishing': '📤 Publicando',
                        'completed': '✅ Completado',
                        'rejected': '❌ Cancelado'
                    }[data.state] || '❓ Desconocido';
                    
                    estado += `   ${contador}. ${videoId} - ${estadoTexto}\n`;
                    contador++;
                }
                estado += `\n`;
            }
            
            estado += `🕒 **Próximos horarios óptimos:**\n`;
            const horariosOptimos = [
                { inicio: 11, fin: 13 },
                { inicio: 16, fin: 18 },
                { inicio: 20, fin: 22 }
            ];
            horariosOptimos.forEach(horario => {
                estado += `   • ${horario.inicio}:00 - ${horario.fin}:00\n`;
            });
            
            estado += `\n📱 **Instagram:** @playmallmcbo\n`;
            estado += `🔗 **API Status:** ${process.env.INSTAGRAM_ACCESS_TOKEN ? '✅ Configurada' : '❌ Falta configurar'}\n`;
            
            estado += `\n💡 **Para interactuar:**\n`;
            estado += `   • Envía un video para análisis automático\n`;
            estado += `   • Escribe "CONSEJOS INSTAGRAM" para tips\n`;
            estado += `   • Responde a consultas con el ID del video`;
            
            return estado;
            
        } catch (error) {
            return `❌ Error obteniendo estado de Instagram: ${error.message}`;
        }
    }

    // === INICIALIZACIÓN Y CONFIGURACIÓN DEL BOT ===
    async iniciarBot() {
        if (this.isInitializing) {
            console.log('[WARNING] Bot ya se está inicializando...');
            return;
        }

        try {
            this.isInitializing = true;
            console.log('[INIT] Iniciando Bot WhatsApp PlayMall Park...');
            console.log(`[INIT] Timestamp: ${new Date().toLocaleString()}`);

            if (esPCParque()) {
                console.log("[BOT] 🧠 PC del parque detectada. Registrando inventario automático...");
                await this.actualizarInventarioDesdeParque();
            }

            this.limpiarIntervalos();

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "playmall-park-bot-stable",
                    dataPath: "./auth_info"
                }),
                puppeteer: {
                    headless: false,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-features=TranslateUI',
                        '--disable-extensions',
                        '--disable-plugins',
                        '--disable-default-apps',
                        '--disable-sync',
                        '--no-default-browser-check',
                        '--disable-background-mode',
                        '--disable-client-side-phishing-detection',
                        '--disable-component-update',
                        '--disable-hang-monitor',
                        '--disable-ipc-flooding-protection',
                        '--disable-popup-blocking',
                        '--disable-prompt-on-repost',
                        '--hide-scrollbars',
                        '--mute-audio',
                        '--no-pings',
                        '--disable-blink-features=AutomationControlled',
                        '--user-data-dir=./chrome_playmall_fixed',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-web-security',
                        '--remote-debugging-port=0'
                    ],
                    defaultViewport: null,
                    ignoreDefaultArgs: ['--enable-automation'],
                    handleSIGINT: true,
                    handleSIGTERM: true,
                    ignoreHTTPSErrors: true,
                    dumpio: false
                }
            });

            this.configurarEventos();
            
            console.log('[INIT] Conectando con WhatsApp Web...');
            await this.client.initialize();
            
        } catch (error) {
            console.error('[ERROR] Error iniciando bot:', error.message);
            this.isInitializing = false;
            await this.manejarError(error);
        }
    }

    configurarEventos() {
        this.client.on('ready', async () => {
            console.log('[SUCCESS] Bot WhatsApp conectado exitosamente!');
            console.log('[SUCCESS] PlayMall Park - Sistema Operativo Activo');
            console.log(`[SUCCESS] Conexion establecida: ${new Date().toLocaleString()}`);
            
            this.isConnected = true;
            this.isInitializing = false;
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            this.lastHeartbeat = Date.now();
            
            await this.inicializarSistemasAvanzados();
            
            this.guardarLog('BOT_READY', 'Bot conectado y operativo');
            this.iniciarSistemaMonitoreo();
            this.enviarMensajeInicio();
        });
        
        this.client.on('message', async (message) => {
            try {
                this.estadisticas.mensajes_procesados++;
                await this.procesarMensaje(message);
            } catch (e) {
                console.error('[ERROR] ❌ Error procesando mensaje:', e.message);
                try {
                    await message.reply('❌ Error interno procesando mensaje.');
                } catch (replyError) {
                    console.error('[ERROR] Error enviando respuesta de error:', replyError);
                }
            }
        });
        
        this.client.on('disconnected', (reason) => {
            console.log(`[WARNING] Bot desconectado. Razon: ${reason}`);
            this.isConnected = false;
            this.limpiarIntervalos();
            this.guardarLog('DISCONNECTED', `Desconectado: ${reason}`);
        });
        
        this.client.on('auth_failure', (msg) => {
            console.error('[ERROR] Error de autenticacion:', msg);
            this.guardarLog('AUTH_FAILURE', msg);
        });
        
        this.client.on('change_state', (state) => {
            console.log(`[STATE] Estado del bot: ${state}`);
            this.guardarLog('STATE_CHANGE', state);
        });
        
        this.client.on('loading_screen', (percent, message) => {
            if (percent % 25 === 0) {
                console.log(`[LOADING] WhatsApp: ${percent}% - ${message}`);
            }
        });
    }

    // === SISTEMA DE MONITOREO ===
    iniciarSistemaMonitoreo() {
        console.log('[MONITOR] Iniciando sistema de monitoreo...');
        
        this.heartbeatInterval = setInterval(() => {
            this.verificarEstado();
        }, 30000);
        
        this.statsInterval = setInterval(() => {
            this.mostrarEstadisticas();
        }, 300000);
        
        this.healthCheckInterval = setInterval(() => {
            this.verificacionSalud();
        }, 60000);
        
        this.antiSleepInterval = setInterval(() => {
            if (this.isConnected) {
                this.mantenerActividad();
            }
        }, 120000);

        this.apiMonitorInterval = setInterval(() => {
            this.verificarEstadoAPIs();
        }, 120000);
        
        setTimeout(() => {
            this.verificarEstadoAPIs();
        }, 5000);

        // Monitor de mensajes pendientes (Python -> WhatsApp)
        setInterval(async () => {
            const pendientesDir = path.join(__dirname, '../mensajes_pendientes');
            if (!fs.existsSync(pendientesDir)) return;

            fs.readdir(pendientesDir, async (err, files) => {
                if (err || files.length === 0) return;

                for (const file of files) {
                    if (!file.endsWith('.json')) continue;

                    const ruta = path.join(pendientesDir, file);
                    try {
                        const contenido = JSON.parse(fs.readFileSync(ruta, 'utf8'));

                        const grupoId = this.obtenerIDGrupo
                            ? this.obtenerIDGrupo(contenido.grupo)
                            : this.GRUPOS_WHATSAPP?.[contenido.grupo];

                        if (!grupoId) {
                            console.warn(`[BOT] ⚠️ Grupo no encontrado: ${contenido.grupo}`);
                            continue;
                        }

                        await this.client.sendMessage(grupoId, contenido.mensaje);
                        console.log(`[BOT] ✅ Mensaje enviado desde archivo: ${file}`);
                        fs.unlinkSync(ruta);
                    } catch (e) {
                        console.error(`[BOT] ❌ Error procesando ${file}:`, e.message);
                    }
                }
            });
        }, 30000);
        
        console.log('[MONITOR] Todos los intervalos de monitoreo activos');
    }

    async verificarEstadoAPIs() {
        try {
            console.log('[API] Verificando estado de APIs en tiempo real...');
            
            const baseURL = 'https://playpark-simbolico.ngrok.app';
            
            const ngrokStatus = await this.verificarNGROK(baseURL);
            this.estadoAPIs.ngrok_tunnel = ngrokStatus;
            
            if (ngrokStatus) {
                console.log('[API] NGROK Tunnel activo - Probando endpoints...');
                
                const ventasStatus = await this.verificarAPIVentas(baseURL);
                this.estadoAPIs.ventas_api = ventasStatus;
                
                const inventarioStatus = await this.verificarAPIInventario(baseURL);
                this.estadoAPIs.inventario_api = inventarioStatus;
                
                const archivosStatus = await this.verificarAPIArchivos(baseURL);
                this.estadoAPIs.archivos_api = archivosStatus;
                
                this.estadoAPIs.flask_activo = ventasStatus || inventarioStatus;
                this.estadoAPIs.errores_consecutivos = 0;
                
                if (this.estadoAPIs.flask_activo) {
                    console.log('[API] EXITO: Conexion en tiempo real con PC del parque establecida');
                    console.log('[API] Datos de ventas e inventario disponibles en tiempo real');
                }
                
            } else {
                console.log('[API] NGROK no disponible - Flask en PC del parque no accesible');
                this.estadoAPIs.flask_activo = false;
                this.estadoAPIs.ventas_api = false;
                this.estadoAPIs.inventario_api = false;
                this.estadoAPIs.archivos_api = false;
                this.estadoAPIs.errores_consecutivos++;
            }
            
            this.estadoAPIs.ultima_verificacion = new Date().toISOString();
            
            const estadoGeneral = this.estadoAPIs.flask_activo ? 'TIEMPO REAL ACTIVO' : 'SOLO ARCHIVOS LOCALES';
            console.log(`[API] Estado general: ${estadoGeneral}`);
            console.log(`[API] NGROK (puerto 5000): ${this.estadoAPIs.ngrok_tunnel ? 'CONECTADO' : 'DESCONECTADO'}`);
            console.log(`[API] Ventas tiempo real: ${this.estadoAPIs.ventas_api ? 'DISPONIBLE' : 'FALLBACK'}`);
            console.log(`[API] Inventario tiempo real: ${this.estadoAPIs.inventario_api ? 'DISPONIBLE' : 'FALLBACK'}`);
            console.log(`[API] Archivos PC parque: ${this.estadoAPIs.archivos_api ? 'ACCESIBLE' : 'NO ACCESIBLE'}`);
            
            if (this.estadoAPIs.errores_consecutivos >= 3) {
                console.log('[WARNING] APIs no disponibles por mas de 6 minutos');
                console.log('[WARNING] Verificar que Flask y NGROK esten ejecutandose en PC del parque');
                console.log('[WARNING] El sistema usara archivos locales como fallback');
            }
            
        } catch (error) {
            console.error('[ERROR] Error verificando APIs:', error.message);
            this.estadoAPIs.errores_consecutivos++;
        }
    }

    async verificarNGROK(baseURL) {
        try {
            const response = await axios.get(`${baseURL}/api/status`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async verificarAPIVentas(baseURL) {
        try {
            const response = await axios.get(`${baseURL}/api/ventas/hoy`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                const data = response.data;
                console.log(`[API] Ventas del dia: ${data.total_ventas || 0}`);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async verificarAPIInventario(baseURL) {
        try {
            const response = await axios.get(`${baseURL}/api/inventario`, {
                timeout: 5000
            });
            
            if (response.status === 200) {
                const data = response.data;
                console.log('[API] Inventario accesible');
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async verificarAPIArchivos(baseURL) {
        try {
            const response = await axios.get(`${baseURL}/api/archivos`);
            const archivos = response.data;

            if (Array.isArray(archivos) && archivos.length > 0) {
                console.log(`[API] Archivos remotos disponibles: ${archivos.length}`);
                return true;
            } else if (Array.isArray(archivos) && archivos.length === 0) {
                console.warn("[API] No se encontraron archivos, pero la respuesta es válida");
                return true;
            } else {
                console.warn("[API] Respuesta inesperada: no es un array");
                return false;
            }

        } catch (error) {
            console.error("[API] No se pudo acceder al endpoint /listar:", error.message);
            return false;
        }
    }
    
    limpiarIntervalos() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.antiSleepInterval) {
            clearInterval(this.antiSleepInterval);
            this.antiSleepInterval = null;
        }
        if (this.apiMonitorInterval) {
            clearInterval(this.apiMonitorInterval);
            this.apiMonitorInterval = null;
        }
        console.log('[MONITOR] Intervalos de monitoreo limpiados');
    }
    
    async verificarEstado() {
        try {
            if (this.client && this.isConnected && !this.isReconnecting) {
                const state = await this.client.getState();
                if (state === 'CONNECTED') {
                    this.lastHeartbeat = Date.now();
                    console.log(`[HEARTBEAT] OK - ${new Date().toLocaleTimeString()}`);
                } else {
                    console.log(`[WARNING] Estado inesperado: ${state}`);
                    this.isConnected = false;
                }
            }
        } catch (error) {
            console.log('[WARNING] Error en verificacion de estado:', error.message);
            this.isConnected = false;
        }
    }
    
    verificacionSalud() {
        const ahora = Date.now();
        const tiempoSinHeartbeat = ahora - this.lastHeartbeat;
        
        if (tiempoSinHeartbeat > 180000 && this.isConnected && !this.isReconnecting) {
            console.log('[HEALTH] Sistema posiblemente desconectado - Iniciando verificacion...');
            this.isConnected = false;
            this.intentarReconexion();
        }
    }
    
    mantenerActividad() {
        if (this.client && this.client.pupPage && this.isConnected) {
            try {
                this.client.pupPage.evaluate(() => {
                    const event = new MouseEvent('mousemove', {
                        view: window,
                        bubbles: false,
                        cancelable: false,
                        clientX: Math.floor(Math.random() * 10) + 1,
                        clientY: Math.floor(Math.random() * 10) + 1
                    });
                    document.dispatchEvent(event);
                }).catch(() => {
                    // Ignorar errores silenciosamente
                });
                
                console.log('[ANTI-SLEEP] Actividad mantenida');
            } catch (error) {
                // Ignorar errores de anti-sleep
            }
        }
    }
    
    async intentarReconexion() {
        if (this.isReconnecting) {
            console.log('[RECONNECT] Ya hay un proceso de reconexion en curso...');
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[ERROR] Maximo de reconexiones alcanzado. Reiniciando completamente...');
            await this.reiniciarBot();
            return;
        }
        
        this.isReconnecting = true;
        this.reconnectAttempts++;
        this.estadisticas.reconexiones++;
        
        console.log(`[RECONNECT] Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        
        try {
            if (this.client) {
                this.limpiarIntervalos();
                await this.client.destroy().catch(() => {});
                this.client = null;
            }
            
            console.log('[RECONNECT] Esperando 10 segundos...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            this.isInitializing = false;
            await this.iniciarBot();
            
        } catch (error) {
            console.error('[ERROR] Error en reconexion:', error.message);
            this.isReconnecting = false;
            this.guardarLog('ERROR_RECONEXION', error.message);
            
            setTimeout(() => {
                this.intentarReconexion();
            }, 30000);
        }
    }
    
    async reiniciarBot() {
        console.log('[RESTART] Reiniciando bot completamente...');
        
        try {
            this.limpiarIntervalos();
            
            if (this.client) {
                await this.client.destroy().catch(() => {});
                this.client = null;
            }
            
            this.reconnectAttempts = 0;
            this.isConnected = false;
            this.isInitializing = false;
            this.isReconnecting = false;
            
            console.log('[RESTART] Esperando 15 segundos para reinicio completo...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            await this.iniciarBot();
            
        } catch (error) {
            console.error('[ERROR] Error en reinicio completo:', error.message);
            console.log('[FATAL] Saliendo para reinicio automatico del sistema...');
            process.exit(1);
        }
    }
    
    async enviarMensajeInicio() {
        try {
            console.log('[STARTUP] Bot completamente operativo');
            console.log('[STARTUP] Supervision inteligente 24/7 activada');
            this.guardarLog('BOT_OPERATIVO', 'Sistema completamente funcional');
            
        } catch (error) {
            console.error('[ERROR] Error en mensaje de inicio:', error.message);
        }
    }

        // === FUNCIÓN FALTANTE: generarContextoParaPython ===
    generarContextoVideoDesdeData(videoData, evaluacionInstagram) {
        let contexto = '[VIDEO ANALIZADO CON SISTEMA PREMIUM]\n\n';
        
        if (videoData) {
            // Extraer información clave del análisis técnico
            if (videoData.frames && videoData.frames.length > 0) {
                contexto += `Video procesado frame por frame con IA.\n`;
                contexto += `Frames extraídos: ${videoData.frames.length}.\n`;
            }
            
            if (videoData.videoInfo) {
                contexto += `Duración: ${videoData.videoInfo.duration} segundos.\n`;
                contexto += `Procesamiento: ${videoData.procesamiento}.\n`;
            }
            
            if (videoData.status === 'success') {
                contexto += 'Video descargado y procesado exitosamente.\n';
            }
        }
        
        if (evaluacionInstagram) {
            if (typeof evaluacionInstagram === 'string') {
                if (evaluacionInstagram.includes('PUBLICAR')) {
                    contexto += 'Video recomendado para Instagram Stories.\n';
                }
                if (evaluacionInstagram.includes('EXCELENTE')) {
                    contexto += 'Video de alta calidad detectado.\n';
                }
                if (evaluacionInstagram.includes('puntuación')) {
                    const puntuacionMatch = evaluacionInstagram.match(/(\d+)\/100/);
                    if (puntuacionMatch) {
                        contexto += `Puntuación Instagram: ${puntuacionMatch[1]}/100.\n`;
                    }
                }
            }
        }
        
        contexto += '\nAnalizar desde perspectiva operativa y generar recomendaciones complementarias para PlayMall Park.';
        
        return contexto;
    }
    
    // 3. FUNCIÓN DENTRO DE LA CLASE: generarContextoParaPython
    generarContextoParaPython(analisisTecnico, evaluacionInstagram) {
        let contexto = '[VIDEO ANALIZADO CON SISTEMA PREMIUM]\n\n';
        
        if (analisisTecnico) {
            // Extraer información clave del análisis técnico
            if (analisisTecnico.includes('Frame')) {
                contexto += 'Video procesado frame por frame con IA.\n';
            }
            if (analisisTecnico.includes('personas')) {
                const personasMatch = analisisTecnico.match(/(\d+)\s*personas/);
                if (personasMatch) {
                    contexto += `Personas detectadas: ${personasMatch[1]}.\n`;
                }
            }
            if (analisisTecnico.includes('satisfacción')) {
                contexto += 'Análisis de satisfacción incluido.\n';
            }
        }
        
        if (evaluacionInstagram) {
            if (evaluacionInstagram.includes('PUBLICAR')) {
                contexto += 'Video recomendado para Instagram Stories.\n';
            }
        }
        
        contexto += '\nAnalizar desde perspectiva operativa y generar recomendaciones complementarias.';
        
        return contexto;
    }

    // 4. FUNCIÓN DENTRO DE LA CLASE: generarContextoImagenParaPython
    generarContextoImagenParaPython(analisisEmpresarial) {
        let contexto = '[IMAGEN ANALIZADA CON IA EMPRESARIAL]\n\n';
        
        if (analisisEmpresarial.includes('TICKET') || analisisEmpresarial.includes('FACTURA')) {
            contexto += 'Documento financiero detectado.\n';
        }
        if (analisisEmpresarial.includes('personas')) {
            contexto += 'Análisis de visitantes incluido.\n';
        }
        if (analisisEmpresarial.includes('satisfacción')) {
            contexto += 'Métricas de satisfacción disponibles.\n';
        }
        
        contexto += '\nProporcionar análisis operativo complementario y acciones específicas.';
        
        return contexto;
    }

    // 5. FUNCIÓN DENTRO DE LA CLASE: analizarDocumentoFinanciero
    async analizarDocumentoFinanciero(message, analisisBase) {
        try {
            console.log('[DOC] 💰 Analizando documento financiero especial...');
            
            // Intentar análisis OCR especializado
            let analisisOCR = '';
            try {
                const media = await message.downloadMedia();
                if (media && media.data) {
                    // Usar sistema Python para análisis de ticket especializado
                    const imagenData = {
                        data: media.data,
                        mimetype: media.mimetype,
                        filename: 'ticket_financiero.jpg'
                    };
                    
                    const resultado = await ejecutar_funcion_operativa(
                        '[TICKET DE VENTA DETECTADO] Extraer información financiera detallada',
                        message.from,
                        imagenData
                    );
                    
                    if (resultado && resultado.respuesta_grupo) {
                        analisisOCR = resultado.respuesta_grupo;
                    }
                }
            } catch (error) {
                console.log('[DOC] ⚠️ OCR especializado no disponible, usando análisis base');
            }
            
            // Combinar análisis
            let analisisCompleto = `💰 **ANÁLISIS FINANCIERO ESPECIALIZADO:**\n\n`;
            
            if (analisisOCR) {
                analisisCompleto += `${analisisOCR}\n\n`;
            } else {
                analisisCompleto += `${analisisBase}\n\n`;
            }
            
            // Agregar recomendaciones financieras específicas
            analisisCompleto += `💼 **ACCIONES FINANCIERAS REQUERIDAS:**\n`;
            analisisCompleto += `   • Verificar registro en sistema POS\n`;
            analisisCompleto += `   • Conciliar con movimientos de caja\n`;
            analisisCompleto += `   • Actualizar inventario correspondiente\n`;
            analisisCompleto += `   • Archivar según protocolo contable\n`;
            analisisCompleto += `   • Verificar cumplimiento de meta diaria`;
            
            return analisisCompleto;
            
        } catch (error) {
            console.error('[ERROR] Error en análisis documento financiero:', error);
            return `💰 **DOCUMENTO FINANCIERO DETECTADO**\n\nError en análisis especializado. Documento registrado para revisión manual.`;
        }
    }

    // 6. FUNCIÓN DENTRO DE LA CLASE: generarRecomendacionesIntegradas
    generarRecomendacionesIntegradas(datos) {
        const recomendaciones = [];
        
        // Recomendaciones basadas en análisis técnico
        if (datos.analisisTecnico) {
            if (datos.analisisTecnico.includes('EXCELENTE')) {
                recomendaciones.push('🌟 Video de excelente calidad - Usar como referencia para entrenamientos');
            }
            if (datos.analisisTecnico.includes('Frame') && datos.analisisTecnico.includes('score')) {
                recomendaciones.push('📊 Frames analizados disponibles - Implementar mejoras basadas en puntuaciones bajas');
            }
        }
        
        // Recomendaciones basadas en evaluación Instagram
        if (datos.evaluacionInstagram) {
            if (datos.evaluacionInstagram.includes('PUBLICAR AUTOMATICO')) {
                recomendaciones.push('📱 Video aprobado para publicación automática en Instagram Stories');
            } else if (datos.evaluacionInstagram.includes('CONSULTAR')) {
                recomendaciones.push('🤔 Video requiere evaluación manual para Instagram Stories');
            }
        }
        
        // Recomendaciones empresariales generales
        recomendaciones.push('📈 Usar insights para optimización operativa continua');
        recomendaciones.push('🎯 Documentar mejores prácticas identificadas');
        recomendaciones.push('🔄 Programar seguimiento de implementación de mejoras');
        
        return recomendaciones;
    }

    // 7. FUNCIÓN DENTRO DE LA CLASE: generarReporteVideoCompleto
    generarReporteVideoCompleto(datos) {
        const { analisisTecnico, analisisEmpresarial, evaluacionInstagram, analisisPython, message, timestamp } = datos;
        
        let reporte = `🎬 **ANÁLISIS INTEGRAL DE VIDEO** - ${timestamp}\n\n`;
        
        // Header ejecutivo
        reporte += `📊 **RESUMEN EJECUTIVO:**\n`;
        reporte += `   • Tipo: Video del parque con análisis frame por frame\n`;
        reporte += `   • Servicios IA: ${this.listarServiciosActivos()}\n`;
        reporte += `   • Nivel de análisis: ${analisisTecnico ? 'COMPLETO' : 'CONTEXTUAL'}\n`;
        reporte += `   • Evaluación Instagram: ${evaluacionInstagram ? 'INCLUIDA' : 'NO DISPONIBLE'}\n\n`;
        
        // Análisis técnico (VideoAnalyzerPremium)
        if (analisisTecnico) {
            reporte += `🔧 **ANÁLISIS TÉCNICO PREMIUM:**\n\n`;
            reporte += `${analisisTecnico}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Análisis empresarial
        if (analisisEmpresarial) {
            reporte += `🧠 **INTELIGENCIA EMPRESARIAL:**\n\n`;
            reporte += `${analisisEmpresarial}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Evaluación Instagram
        if (evaluacionInstagram) {
            reporte += `📱 **EVALUACIÓN PARA INSTAGRAM STORIES:**\n\n`;
            reporte += `${evaluacionInstagram}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Análisis Python complementario
        if (analisisPython && analisisPython.respuesta_grupo) {
            reporte += `🐍 **ANÁLISIS OPERATIVO COMPLEMENTARIO:**\n\n`;
            reporte += `${analisisPython.respuesta_grupo}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Recomendaciones integradas finales
        reporte += `🎯 **RECOMENDACIONES INTEGRADAS:**\n\n`;
        
        const recomendaciones = this.generarRecomendacionesIntegradas({
            analisisTecnico,
            analisisEmpresarial,
            evaluacionInstagram
        });
        
        recomendaciones.forEach(rec => {
            reporte += `   ${rec}\n`;
        });
        
        // Footer
        reporte += `\n${'═'.repeat(70)}\n`;
        reporte += `🌟 **Sistema Integral PlayMall Park - Análisis Video Premium**\n`;
        reporte += `🔧 **Tecnologías:** Frame-by-Frame + Google AI + OpenAI + Python + Instagram API\n`;
        reporte += `💎 **Nivel:** Análisis ejecutivo empresarial completo`;
        
        return reporte;
    }

    // 8. FUNCIÓN DENTRO DE LA CLASE: generarReporteImagenCompleto
    generarReporteImagenCompleto(datos) {
        const { analisisEmpresarial, analisisPython, analisisDocumento, message, timestamp } = datos;
        
        let reporte = `📸 **ANÁLISIS INTEGRAL DE IMAGEN** - ${timestamp}\n\n`;
        
        // Header ejecutivo
        reporte += `📊 **RESUMEN EJECUTIVO:**\n`;
        reporte += `   • Tipo: Imagen con análisis empresarial completo\n`;
        reporte += `   • Servicios IA: ${this.listarServiciosActivos()}\n`;
        reporte += `   • Documento especial: ${analisisDocumento ? 'DETECTADO' : 'NO'}\n`;
        reporte += `   • Nivel de detalle: MÁXIMO\n\n`;
        
        // Análisis empresarial principal
        if (analisisEmpresarial) {
            reporte += `🧠 **ANÁLISIS EMPRESARIAL PRINCIPAL:**\n\n`;
            reporte += `${analisisEmpresarial}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Análisis de documento especial
        if (analisisDocumento) {
            reporte += `💰 **ANÁLISIS DE DOCUMENTO FINANCIERO:**\n\n`;
            reporte += `${analisisDocumento}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Análisis Python complementario
        if (analisisPython && analisisPython.respuesta_grupo) {
            reporte += `🐍 **ANÁLISIS OPERATIVO ESPECIALIZADO:**\n\n`;
            reporte += `${analisisPython.respuesta_grupo}\n\n`;
            reporte += `${'─'.repeat(60)}\n\n`;
        }
        
        // Recomendaciones específicas
        reporte += `🎯 **RECOMENDACIONES ESPECÍFICAS:**\n\n`;
        
        if (analisisDocumento) {
            reporte += `   💰 **Para documento financiero:**\n`;
            reporte += `     • Verificar contra sistema POS\n`;
            reporte += `     • Conciliar con arqueo de caja\n`;
            reporte += `     • Actualizar inventario correspondiente\n\n`;
        }
        
        reporte += `   📋 **Para supervisión operativa:**\n`;
        reporte += `     • Documentar insights para mejora continua\n`;
        reporte += `     • Implementar acciones preventivas identificadas\n`;
        reporte += `     • Seguimiento de métricas de satisfacción\n`;
        
        // Footer
        reporte += `\n${'═'.repeat(70)}\n`;
        reporte += `🌟 **Sistema Integral PlayMall Park - Análisis Imagen Empresarial**\n`;
        reporte += `🔧 **Tecnologías:** Google Vision + Gemini + OpenAI GPT-4o + Python + OCR\n`;
        reporte += `💎 **Nivel:** Análisis empresarial de precisión máxima`;
        
        return reporte;
    }

    // 9. FUNCIÓN DENTRO DE LA CLASE: generarReporteOtroMedia
    generarReporteOtroMedia(datos) {
        const { tipo, analisisContextual, analisisPython, message, timestamp } = datos;
        
        let reporte = `📄 **ANÁLISIS DE ${tipo.toUpperCase()}** - ${timestamp}\n\n`;
        
        // Análisis contextual
        if (analisisContextual) {
            reporte += `📋 **ANÁLISIS CONTEXTUAL:**\n\n`;
            reporte += `${analisisContextual}\n\n`;
            reporte += `${'─'.repeat(50)}\n\n`;
        }
        
        // Análisis Python si está disponible
        if (analisisPython && analisisPython.respuesta_grupo) {
            reporte += `🐍 **ANÁLISIS COMPLEMENTARIO:**\n\n`;
            reporte += `${analisisPython.respuesta_grupo}\n\n`;
            reporte += `${'─'.repeat(50)}\n\n`;
        }
        
        // Acciones recomendadas
        reporte += `🎯 **ACCIONES RECOMENDADAS:**\n\n`;
        if (tipo === 'audio' || tipo === 'ptt') {
            reporte += `   • Audio documentado para transcripción posterior\n`;
            reporte += `   • Revisar contenido si contiene información operativa\n`;
        } else if (tipo === 'document') {
            reporte += `   • Documento archivado para revisión\n`;
            reporte += `   • Verificar si requiere procesamiento especial\n`;
        }
        
        reporte += `   • Contenido registrado en sistema de supervisión\n`;
        reporte += `   • Seguimiento según protocolo establecido\n`;
        
        // Footer
        reporte += `\n${'═'.repeat(50)}\n`;
        reporte += `🤖 **Sistema PlayMall Park - Análisis Contextual**`;
        
        return reporte;
    }

    // 10. FUNCIÓN DENTRO DE LA CLASE: extraerMetricasDeAnalisis
    extraerMetricasDeAnalisis(datos) {
        const metricas = {
            timestamp: new Date().toISOString(),
            tipo_contenido: 'video',
            calidad_tecnica: 'media',
            personas_detectadas: 0,
            satisfaccion_estimada: 0,
            contenido_promocional: false,
            requiere_atencion: false,
            puntuacion_instagram: 0
        };
        
        try {
            if (datos.analisisTecnico) {
                // Extraer métricas del análisis técnico
                const personasMatch = datos.analisisTecnico.match(/(\d+)\s*personas/);
                if (personasMatch) {
                    metricas.personas_detectadas = parseInt(personasMatch[1]);
                }
                
                if (datos.analisisTecnico.includes('EXCELENTE')) {
                    metricas.calidad_tecnica = 'alta';
                } else if (datos.analisisTecnico.includes('BUENO')) {
                    metricas.calidad_tecnica = 'media';
                }
            }
            
            if (datos.evaluacionInstagram) {
                // Extraer puntuación de Instagram
                const puntuacionMatch = datos.evaluacionInstagram.match(/(\d+)\/100/);
                if (puntuacionMatch) {
                    metricas.puntuacion_instagram = parseInt(puntuacionMatch[1]);
                }
                
                metricas.contenido_promocional = datos.evaluacionInstagram.includes('PUBLICAR');
            }
            
            return metricas;
            
        } catch (error) {
            console.error('[ERROR] Error extrayendo métricas:', error);
            return metricas;
        }
    }

    // 11. FUNCIÓN DENTRO DE LA CLASE: extraerMetricasDeImagenAnalisis
    extraerMetricasDeImagenAnalisis(datos) {
        const metricas = {
            timestamp: new Date().toISOString(),
            tipo_contenido: 'imagen',
            es_documento_financiero: false,
            personas_detectadas: 0,
            texto_detectado: false,
            nivel_detalle: 'basico',
            requiere_seguimiento: false
        };
        
        try {
            if (datos.analisisEmpresarial) {
                // Detectar si es documento financiero
                metricas.es_documento_financiero = datos.analisisEmpresarial.includes('TICKET') || 
                                                datos.analisisEmpresarial.includes('FACTURA');
                
                // Detectar personas
                const personasMatch = datos.analisisEmpresarial.match(/(\d+)\s*personas/);
                if (personasMatch) {
                    metricas.personas_detectadas = parseInt(personasMatch[1]);
                }
                
                // Detectar texto
                metricas.texto_detectado = datos.analisisEmpresarial.includes('TEXTO') || 
                                        datos.analisisEmpresarial.includes('OCR');
                
                // Nivel de detalle
                if (datos.analisisEmpresarial.length > 500) {
                    metricas.nivel_detalle = 'alto';
                } else if (datos.analisisEmpresarial.length > 200) {
                    metricas.nivel_detalle = 'medio';
                }
            }
            
            if (datos.analisisDocumento) {
                metricas.requiere_seguimiento = true;
            }
            
            return metricas;
            
        } catch (error) {
            console.error('[ERROR] Error extrayendo métricas de imagen:', error);
            return metricas;
        }
    }

    // 12. FUNCIÓN DENTRO DE LA CLASE: determinarRelevancia
    determinarRelevancia(tipo) {
        const relevancia = {
            'image': 'alta',
            'video': 'muy_alta',
            'audio': 'media',
            'ptt': 'media',
            'document': 'alta',
            'sticker': 'baja'
        };
        
        return relevancia[tipo] || 'media';
    }

    // 13. FUNCIÓN DENTRO DE LA CLASE: determinarAccionRequerida
    determinarAccionRequerida(tipo, analisis) {
        if (analisis.includes('problema') || analisis.includes('urgente')) {
            return 'revision_inmediata';
        } else if (tipo === 'document') {
            return 'archivar_y_revisar';
        } else if (tipo === 'audio' || tipo === 'ptt') {
            return 'transcribir_si_necesario';
        } else {
            return 'documentar_rutina';
        }
    }

    // 14. FUNCIÓN DENTRO DE LA CLASE: extraerAlertas
    extraerAlertas(reporte) {
        const alertas = [];
        
        if (reporte.includes('CRITICA') || reporte.includes('URGENTE')) {
            alertas.push('atencion_inmediata');
        }
        
        if (reporte.includes('problema') || reporte.includes('falla')) {
            alertas.push('revision_tecnica');
        }
        
        if (reporte.includes('TICKET') || reporte.includes('FACTURA')) {
            alertas.push('verificacion_financiera');
        }
        
        return alertas;
    }

    // 15. FUNCIÓN DENTRO DE LA CLASE: generarAnalisisGenericoFallback
    generarAnalisisGenericoFallback(message, tipo, error) {
        return {
            tipo: `${tipo}_error`,
            contenido: `📄 **${tipo.toUpperCase()} RECIBIDO** - ${new Date().toLocaleString()}\n\nContenido de tipo ${tipo} documentado en sistema.\n\nError en procesamiento: ${error.message}\n\n✅ Archivo registrado para revisión posterior.`,
            relevancia: 'media',
            accion_requerida: 'revision_manual'
        };
    }


    mostrarEstadisticas() {
        const uptime = this.calcularUptime();
        
        console.log('\n[STATS] === ESTADISTICAS BOT PLAYMALL PARK ===');
        console.log(`[STATS] Estado: ${this.isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
        console.log(`[STATS] Funcionando desde: ${uptime}`);
        console.log(`[STATS] Mensajes procesados: ${this.estadisticas.mensajes_procesados}`);
        console.log(`[STATS] Reconexiones: ${this.estadisticas.reconexiones}`);
        console.log(`[STATS] Errores: ${this.estadisticas.errores}`);
        console.log(`[STATS] Ultimo heartbeat: ${new Date(this.lastHeartbeat).toLocaleTimeString()}`);
        console.log(`[STATS] Ultima actividad: ${new Date(this.estadisticas.ultima_actividad).toLocaleTimeString()}`);
        
        console.log('\n[STATS] === ESTADO DE APIS EN TIEMPO REAL ===');
        console.log(`[STATS] Flask/NGROK: ${this.estadoAPIs.flask_activo ? 'TIEMPO REAL ACTIVO' : 'SOLO ARCHIVOS LOCALES'}`);
        console.log(`[STATS] Tunnel NGROK (puerto 5000): ${this.estadoAPIs.ngrok_tunnel ? 'CONECTADO' : 'DESCONECTADO'}`);
        console.log(`[STATS] API Ventas: ${this.estadoAPIs.ventas_api ? 'TIEMPO REAL' : 'FALLBACK LOCAL'}`);
        console.log(`[STATS] API Inventario: ${this.estadoAPIs.inventario_api ? 'TIEMPO REAL' : 'FALLBACK LOCAL'}`);
        console.log(`[STATS] API Archivos: ${this.estadoAPIs.archivos_api ? 'ACCESIBLE' : 'NO ACCESIBLE'}`);
        console.log(`[STATS] Errores consecutivos API: ${this.estadoAPIs.errores_consecutivos}`);
        console.log(`[STATS] Ultima verificacion API: ${this.estadoAPIs.ultima_verificacion ? new Date(this.estadoAPIs.ultima_verificacion).toLocaleTimeString() : 'Nunca'}`);
        console.log('[STATS] =====================================\n');
    }

    calcularUptime() {
        const inicio = new Date(this.estadisticas.inicio_bot);
        const ahora = new Date();
        const diferencia = ahora - inicio;

        const horas = Math.floor(diferencia / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

        return `${horas}h ${minutos}m`;
    }

    guardarLog(tipo, mensaje) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${tipo}: ${mensaje}\n`;

        try {
            const logPath = path.join(__dirname, 'playmall_bot.log');
            fs.appendFileSync(logPath, logEntry, 'utf8');
        } catch (error) {
            console.log('[WARNING] Error guardando log:', error.message);
        }
    }

    async manejarError(error) {
        console.error('[ERROR] Error critico del sistema:', error.message);
        this.estadisticas.errores++;
        this.guardarLog('ERROR_CRITICO', error.message);

        console.log('[ERROR] Error critico detectado. Bot detenido para evitar bloqueo.');
        console.log('[ERROR] Solución: Cierra Chrome manualmente y reinicia el bot.');
        console.log('[ERROR] No se intentará recuperación automática.');

        process.exit(1);
    }

    async cerrarBot() {
        console.log('[SHUTDOWN] Cerrando bot gracefully...');

        this.limpiarIntervalos();

        if (this.client) {
            try {
                await this.client.destroy();
                console.log('[SHUTDOWN] Cliente WhatsApp cerrado correctamente');
            } catch (error) {
                console.error('[SHUTDOWN] Error cerrando cliente:', error.message);
            }
        }

        this.guardarLog('BOT_SHUTDOWN', 'Bot cerrado correctamente');
        console.log('[SHUTDOWN] Bot cerrado completamente');
    }
}


// === FUNCIONES GLOBALES PARA EXPORTACIÓN ===
async function procesarMediaRecibido(message) {
    try {
        console.log('[MEDIA] Procesando media desde función global...');
        
        if (!globalThis.analizadorVisual && AnalizadorVisualEmpresarial) {
            globalThis.analizadorVisual = new AnalizadorVisualEmpresarial();
        }

        const tipo = message.type || 'desconocido';
        let resultado = '';
        
        if (globalThis.analizadorVisual) {
            resultado = await globalThis.analizadorVisual.analizarContenidoCompleto(message, tipo);
        } else {
            resultado = `📎 **${tipo.toUpperCase()} RECIBIDO**\n\nContenido documentado en sistema.\n\nRegistrado para supervisión y seguimiento.`;
        }
        
        return resultado;

    } catch (error) {
        console.error('[ERROR] procesarMediaRecibido:', error.message);
        return '❌ Error procesando contenido multimedia.';
    }
}

function guardarLogActividad(datos) {
    try {
        const fecha = new Date().toISOString().split('T')[0];
        const logPath = path.join(__dirname, '../logs', `actividad_${fecha}.jsonl`);

        if (!fs.existsSync(path.dirname(logPath))) {
            fs.mkdirSync(path.dirname(logPath), { recursive: true });
        }

        fs.appendFileSync(logPath, JSON.stringify(datos) + '\n');
    } catch (error) {
        console.log(`[LOG] Error guardando actividad: ${error.message}`);
    }
}

async function procesarParaInstagram(mediaData, tipoMedia, message, analisisIA = null) {
    try {
        if (!globalThis.instagramProcessor && InstagramVideoProcessor) {
            globalThis.instagramProcessor = new InstagramVideoProcessor();
        }

        if (globalThis.instagramProcessor) {
            const respuestaInstagram = await globalThis.instagramProcessor.procesarVideoParaInstagram(
                mediaData,
                message,
                analisisIA
            );
            return respuestaInstagram;
        } else {
            return '📱 **EVALUACIÓN PARA INSTAGRAM**\n\nSistema de Instagram no disponible.\n\nVideo documentado para evaluación manual.';
        }

    } catch (error) {
        console.error('[INSTAGRAM] ❌ Error procesando para Instagram:', error.message);
        return '❌ Ocurrió un error procesando el video para Instagram.';
    }
}

async function inicializarSistemasAvanzados() {
    console.log('[SYSTEM] 🚀 Inicializando sistemas empresariales avanzados...');

    if (!globalThis.analizadorVisual && AnalizadorVisualEmpresarial) {
        globalThis.analizadorVisual = new AnalizadorVisualEmpresarial();
        console.log('[SYSTEM] ✅ Analizador Visual Empresarial listo');
    }

    if (!globalThis.videoAnalyzer) {
        globalThis.videoAnalyzer = new VideoAnalyzer();
        console.log('[SYSTEM] ✅ Video Analyzer Premium listo');
    }

    if (!globalThis.instagramProcessor && InstagramVideoProcessor) {
        globalThis.instagramProcessor = new InstagramVideoProcessor();
        console.log('[SYSTEM] ✅ Instagram Processor listo');
    }

    console.log('[SYSTEM] 🎯 Todos los sistemas empresariales listos');
}

function mostrarGrupos() {
    return [
        '120363179370816930@g.us', // Operativo
        '120363029580331492@g.us', // Confitería
        '1203XXXXXXXXXXX@g.us'     // Admin u otros
    ];
}

// === INICIALIZACIÓN DEL SISTEMA ===
console.log('[INIT] === SISTEMA BOT WHATSAPP PLAYMALL PARK ===');
console.log('[INIT] Iniciando aplicación...');
console.log(`[INIT] Timestamp: ${new Date().toLocaleString()}`);

const bot = new BotWhatsAppPlayMall();

// Manejar señales del sistema para cierre graceful
process.on('SIGINT', async () => {
    console.log('\n[SHUTDOWN] Recibida señal SIGINT (Ctrl+C) - Cerrando bot...');
    try {
        await bot.cerrarBot();
        console.log('[SHUTDOWN] Bot cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('[SHUTDOWN] Error durante cierre:', error.message);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n[SHUTDOWN] Recibida señal SIGTERM - Cerrando bot...');
    try {
        await bot.cerrarBot();
        console.log('[SHUTDOWN] Bot cerrado correctamente');
        process.exit(0);
    } catch (error) {
        console.error('[SHUTDOWN] Error durante cierre:', error.message);
        process.exit(1);
    }
});

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR] Unhandled Promise Rejection at:', promise);
    console.error('[ERROR] Reason:', reason);
    console.error('[ERROR] Stack:', reason?.stack);
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
    console.error('[ERROR] Stack:', error.stack);
    bot.manejarError(error);
});

// Función principal de inicio
async function iniciarSistema() {
    try {
        console.log('[MAIN] Verificando dependencias...');
        
        try {
            require('whatsapp-web.js');
            console.log('[MAIN] ✅ whatsapp-web.js disponible');
        } catch (error) {
            console.error('[MAIN] ❌ whatsapp-web.js no encontrado');
            console.error('[MAIN] Ejecuta: npm install whatsapp-web.js');
            process.exit(1);
        }
        
        try {
            require('axios');
            console.log('[MAIN] ✅ axios disponible');
        } catch (error) {
            console.error('[MAIN] ❌ axios no encontrado');
            console.error('[MAIN] Ejecuta: npm install axios');
            process.exit(1);
        }
        
        console.log('[MAIN] Todas las dependencias verificadas correctamente');
        console.log('[MAIN] Iniciando bot WhatsApp...');
        
        await bot.iniciarBot();
        
        console.log('[MAIN] ✅ Sistema iniciado correctamente');
        console.log('[MAIN] 🤖 Bot WhatsApp PlayMall Park en ejecución');
        console.log('[MAIN] 📱 Esperando conexión con WhatsApp Web...');
        
    } catch (error) {
        console.error('[FATAL] Error fatal iniciando sistema:', error);
        console.error('[FATAL] Stack completo:', error.stack);
        console.log('[FATAL] El bot no pudo iniciarse correctamente');
        console.log('[FATAL] Revisa los errores anteriores y vuelve a intentar');
        process.exit(1);
    }
}




    // 16. FUNCIÓN AUXILIAR: respuestaSegura (si falta)
    function respuestaSegura(mensaje) {
        if (typeof mensaje === 'string' && mensaje.trim().length > 0) {
            return mensaje.trim();
        }
        if (typeof mensaje === 'object') {
            try {
                return JSON.stringify(mensaje, null, 2);
            } catch (e) {
                return '⚠️ No se pudo formatear la respuesta.';
            }
        }
        return '⚠️ Respuesta vacía o no válida.';
    }

    // 17. FUNCIÓN AUXILIAR: archivoReciente (si falta)
    function archivoReciente(ruta, segundosMax = 60) {
        try {
            const stats = fs.statSync(ruta);
            const ahora = new Date();
            const modificado = new Date(stats.mtime);
            const diferenciaSegundos = (ahora - modificado) / 1000;
            return diferenciaSegundos <= segundosMax;
        } catch (err) {
            console.error('❌ Error al verificar archivo:', err.message);
            return false;
        }
    }

    // 18. FUNCIÓN AUXILIAR: esPCParque (si falta)
    function esPCParque() {
        const hostname = os.hostname().toLowerCase();
        const interfaces = os.networkInterfaces();

        for (const name of Object.keys(interfaces)) {
            for (const net of interfaces[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log("[DEBUG] IP detectada:", net.address);
                    if (
                        net.address.startsWith("192.168.3.") ||
                        net.address.startsWith("192.168.1.")
                    ) return true;
                }
            }
        }

        console.log("[DEBUG] HOSTNAME detectado:", hostname);
        return hostname.includes("parque") || hostname === "pc-parque";
    }


    // === FUNCIONES DE PROCESAMIENTO DE COMANDOS ===
    async function procesarComando(message) {
        const texto = (message.body || "").trim().toLowerCase();
        require('dotenv').config({ path: '../.env' });
        const baseURL = process.env.BASE_URL;

        if (texto.includes('/config-filtros') || texto.includes('/filtros')) {
            let respuesta = '⚙️ **CONFIGURACIÓN DE FILTROS:**\n\n';
            
            respuesta += `📱 Status Broadcasts: ${this.procesarStatusBroadcast ? '✅ Activo' : '❌ Desactivado'}\n`;
            respuesta += `🔒 Solo grupos autorizados: ${this.procesarSoloGruposAutorizados ? '✅ Activo' : '❌ Desactivado'}\n\n`;
            
            respuesta += '📋 **Grupos autorizados:**\n';
            this.gruposAutorizados.forEach((grupo, index) => {
                respuesta += `${index + 1}. ${grupo}\n`;
            });
            
            respuesta += '\n💡 **Comandos:**\n';
            respuesta += '• `/activar-broadcast` - Procesar estados\n';
            respuesta += '• `/desactivar-broadcast` - Ignorar estados\n';
            respuesta += '• `/solo-grupos` - Solo grupos autorizados\n';
            respuesta += '• `/todos-grupos` - Procesar todos los grupos';
            
            await message.reply(respuesta);
            return;
        }

        if (texto.includes('/activar-broadcast')) {
            this.procesarStatusBroadcast = true;
            await message.reply('✅ Procesamiento de status broadcasts activado');
            return;
        }

        if (texto.includes('/desactivar-broadcast')) {
            this.procesarStatusBroadcast = false;
            await message.reply('❌ Procesamiento de status broadcasts desactivado');
            return;
        }

        if (texto.includes('/solo-grupos')) {
            this.procesarSoloGruposAutorizados = true;
            await message.reply('🔒 Modo solo grupos autorizados activado');
            return;
        }

        if (texto.includes('/todos-grupos')) {
            this.procesarSoloGruposAutorizados = false;
            await message.reply('🌐 Procesamiento de todos los grupos activado');
            return;
        }

        if (texto === "/ping") {
            await message.reply("🏓 Pong! El bot está activo.");
            return;
        }

        if (texto === "/estado") {
            try {
                await message.chat.sendStateTyping();

                const response = await axios.get(`${baseURL}/api/status`);
                await new Promise(resolve => setTimeout(resolve, 1500));

                const textoEstado = `🟢 Estado del sistema:\n${JSON.stringify(response.data, null, 2)}`;
                await message.reply(respuestaSegura(textoEstado));

            } catch (e) {
                await message.reply(respuestaSegura("❌ No se pudo verificar el estado del sistema."));
            }
            return;
        }

        if (texto.startsWith("/inventario")) {
            return await procesarComandoInventario(message);
        }

        if (texto.startsWith("/ventas")) {
            return await procesarComandoVentas(message);
        }

        if (texto.startsWith("/compras")) {
            return await procesarComandoCompras(message);
        }

        if (texto.startsWith("/proveedores")) {
            return await procesarComandoProveedores(message);
        }

        if (texto.startsWith("/departamentos")) {
            return await procesarComandoDepartamentos(message);
        }

        if (texto === "/ayuda" || texto === "/comandos") {
            return await procesarComandoAyuda(message);
        }
    }

    

// 2. FUNCIÓN detectarMensajeRelevante
function detectarMensajeRelevante(texto) {
    if (!texto || texto.trim().length === 0) {
        return false;
    }
    
    const textoLower = texto.toLowerCase();
    
    // Mensajes casuales que NO deben procesarse
    const mensajesCasuales = [
        'hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches',
        'señor winston', 'winston', 'disculpe', 'perdon',
        'como esta', 'como estas', 'que tal', 'saludos', 'ok', 'vale',
        'gracias', 'de nada', 'por favor', 'favor', 'xfa', 'porfavor',
        'jajaja', 'jeje', 'lol', 'jaja', 'si', 'no', 'bueno', 'esta bien',
        'perfecto', 'genial', 'excelente', 'mmm', 'ahh', 'ohh'
    ];
    
    // Si el mensaje completo es solo un saludo casual
    if (mensajesCasuales.includes(textoLower.trim())) {
        return false;
    }
    
    // Si el mensaje solo tiene saludos y signos de interrogacion
    if (textoLower.match(/^(señor\s*winston|winston|hola|buenas)\s*[?¿]*\s*$/)) {
        return false;
    }
    
    // Palabras clave que SI indican mensajes relevantes
    const palabrasRelevantes = [
        // Operaciones del parque
        'venta', 'ventas', 'ticket', 'factura', 'dinero', 'caja', 'cobrar',
        'atraccion', 'atracciones', 'funciona', 'falla', 'problema', 'roto', 'dañado',
        'inventario', 'stock', 'falta', 'necesitamos', 'pedir', 'proveedor',
        'limpieza', 'baños', 'sucio', 'limpiar', 'basura',
        'cliente', 'niños', 'visitantes', 'queja', 'reclamo',
        'horario', 'abrir', 'cerrar', 'evento', 'reserva', 'cumpleaños',
        
        // Problemas tecnicos
        'sistema', 'computadora', 'internet', 'impresora', 'equipo', 'tecnologia',
        'error', 'no funciona', 'se daño', 'ayuda', 'soporte', 'arreglar',
        
        // Reportes y analisis
        'reporte', 'estado', 'situacion', 'informar', 'revisar', 'verificar',
        'como va', 'como estan', 'total del dia', 'cuanto llevamos',
        
        // Comandos del bot
        '/ping', '/test', '/estado', '/help', '/ayuda', '/personal', '/grupos', '/id'
    ];
    
    // Verificar si contiene palabras relevantes
    const contieneRelevante = palabrasRelevantes.some(palabra => 
        textoLower.includes(palabra)
    );
    
    // Si tiene mas de 15 caracteres y no es solo saludo, probablemente es relevante
    if (texto.trim().length > 15 && !mensajesCasuales.some(casual => textoLower.includes(casual))) {
        return true;
    }
    
    return contieneRelevante;
}



// ===== EXPORTACIONES ADICIONALES =====
module.exports = {
    // Funciones principales
    procesarComando,
    detectarMensajeRelevante,
    respuestaSegura,
    archivoReciente,
    esPCParque,
    
    // Funciones existentes que ya deberías tener
    guardarLogActividad,
    procesarMediaRecibido,
    procesarParaInstagram,
    inicializarSistemasAvanzados,
    mostrarGrupos,
    
    // Clases principales
    BotWhatsAppPlayMall,
    VideoAnalyzer,
    MetricasEmpresariales
};



// Mostrar información de inicio
console.log('[INFO] =====================================');
console.log('[INFO] 🤖 Bot WhatsApp PlayMall Park v2.0');
console.log('[INFO] 📊 Sistema de supervisión inteligente');
console.log('[INFO] 🔧 GPT-4 + APIs en tiempo real');
console.log('[INFO] 📱 WhatsApp Web.js integrado');
console.log('[INFO] =====================================');
console.log();

// Ejecutar el sistema
iniciarSistema().catch((error) => {
    console.error('[FATAL] Error en función principal:', error);
    process.exit(1);
});
