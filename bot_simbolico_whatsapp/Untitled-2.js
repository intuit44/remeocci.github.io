const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function ejecutar_funcion_operativa(texto, numero, imagenData = null) {
    return new Promise((resolve, reject) => {
        console.log('Iniciando comunicacion con Python...');
        console.log(`Mensaje: ${texto.substring(0, 50)}...`);
        console.log(`Numero: ${numero}`);
        console.log(`Imagen incluida: ${imagenData ? 'SI' : 'NO'}`);

        const scriptPath = path.join(__dirname, '../sistema_funcional_operativo.py');

        const args = [
            scriptPath,
            '--ejecutar-funcion',
            '--texto', texto,
            '--numero', numero
        ];

        if (imagenData) {
            args.push('--imagen', JSON.stringify(imagenData));
        }

        console.log('Comando Python:', 'python', args.join(' '));

        const proceso = spawn('python', args, {
            cwd: 'C:\\ProyectosSimbolicos',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
                PYTHONLEGACYWINDOWSSTDIO: '0'
            }
        });

        let salida = '';
        let errorSalida = '';

        proceso.stdout.setEncoding('utf8');
        proceso.stderr.setEncoding('utf8');

        proceso.stdout.on('data', chunk => {
            const data = chunk.toString('utf8');
            salida += data;
            console.log('Python stdout:', data);
        });

        proceso.stderr.on('data', err => {
            const errorData = err.toString('utf8');
            errorSalida += errorData;
            console.error('Python stderr:', errorData);
        });

        proceso.on('close', (code) => {
            console.log(`Python proceso terminado con codigo: ${code}`);
            console.log(`Salida completa Python (${salida.length} chars):`, salida);
            console.log(`Error completo Python (${errorSalida.length} chars):`, errorSalida);

            if (code !== 0) {
                console.error('Python fallo con codigo:', code);
                console.error('Error completo:', errorSalida);
                
                const respuestaFallback = {
                    respuesta_grupo: `Sistema PlayMall Park\n\nMensaje procesado correctamente. Sistema de respuestas automaticas temporalmente en mantenimiento.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nError tecnico reportado: Codigo ${code}`,
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
                    
                    console.log('JSON extraido entre marcadores:', jsonString);
                } else {
                    console.log('No se encontraron marcadores JSON, buscando patron...');
                    const jsonMatch = salida.match(/\{.*\}/s);
                    if (jsonMatch) {
                        jsonString = jsonMatch[0];
                        console.log('JSON encontrado por patron:', jsonString);
                    } else {
                        console.log('No se encontro JSON valido en ningun formato');
                        console.log('Buscando texto de respuesta alternativo...');
                        
                        if (salida.includes('Sistema PlayMall Park') || salida.includes('temporalmente no disponible')) {
                            const respuestaDirecta = salida.split('\n').find(line => 
                                line.includes('Sistema PlayMall Park') || 
                                line.includes('temporalmente no disponible')
                            );
                            
                            if (respuestaDirecta) {
                                resolve({
                                    respuesta_grupo: respuestaDirecta.trim(),
                                    mensaje_privado: null
                                });
                                return;
                            }
                        }
                        
                        throw new Error('No se encontro JSON valido en la respuesta de Python');
                    }
                }

                console.log('Intentando parsear JSON...');
                const resultado = JSON.parse(jsonString);
                console.log('JSON parseado exitosamente:', resultado);
                resolve(resultado);

            } catch (e) {
                console.error('Error interpretando JSON desde Python:', e.message);
                console.error('Salida completa de Python para debug:', salida);
                console.error('Error completo de Python para debug:', errorSalida);
                
                resolve({
                    respuesta_grupo: `Sistema PlayMall Park\n\nMensaje procesado. Sistema de respuestas automaticas temporalmente en mantenimiento.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nError de procesamiento reportado al equipo tecnico.`,
                    mensaje_privado: null
                });
            }
        });

        proceso.on('error', (error) => {
            console.error('Error ejecutando Python:', error);
            
            resolve({
                respuesta_grupo: `Sistema PlayMall Park\n\nMensaje recibido. Sistema temporalmente no disponible.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nError de sistema: ${error.message}`,
                mensaje_privado: null
            });
        });

        setTimeout(() => {
            console.log('Timeout alcanzado, terminando proceso Python...');
            proceso.kill('SIGTERM');
            
            resolve({
                respuesta_grupo: `Sistema PlayMall Park\n\nMensaje procesado. Sistema de respuestas temporalmente lento.\n\nPara asistencia inmediata, contacta al personal en el parque.\n\nTimeout del sistema reportado.`,
                mensaje_privado: null
            });
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
        '/ping', '/test', '/estado', '/help', '/ayuda', '/personal'
    ];
    
    const contieneRelevante = palabrasRelevantes.some(palabra => 
        textoLower.includes(palabra)
    );
    
    if (texto.trim().length > 15 && !mensajesCasuales.some(casual => textoLower.includes(casual))) {
        return true;
    }
    
    return contieneRelevante;
}

class BotWhatsAppPlayMall {
    constructor() {
        this.client = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = false;
        this.lastHeartbeat = Date.now();
        this.estadisticas = {
            mensajes_procesados: 0,
            reconexiones: 0,
            errores: 0,
            inicio_bot: new Date().toISOString()
        };
    }

    async mostrarGrupos() {
        try {
            const chats = await this.client.getChats();
            console.log('\n=== GRUPOS DISPONIBLES ===');
            
            const grupos = chats.filter(chat => chat.isGroup);
            
            if (grupos.length === 0) {
                console.log('[ERROR] No se encontraron grupos');
                return;
            }
            
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
            console.log(`Informacion de grupos guardada en: ${gruposPath}`);
            
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
                    console.log(`[OK] Personal cargado: ${datos.nombre || 'Sin nombre'} (${numeroLimpio})`);
                }
            }
            
            console.log(`Total personal autorizado: ${numerosPersonal.length} personas`);
            return numerosPersonal;
            
        } catch (error) {
            console.error('[ERROR] Error cargando personal del contexto:', error.message);
            return ['584246865492'];
        }
    }

    async procesarImagenWhatsApp(message) {
        try {
            console.log('Procesando imagen de WhatsApp...');

            if (!message.hasMedia) {
                console.log('Mensaje no tiene media');
                return null;
            }

            const media = await message.downloadMedia();
            if (!media) {
                console.log('No se pudo descargar la imagen');
                return null;
            }

            if (!media.mimetype.startsWith('image/')) {
                console.log(`Tipo de archivo no es imagen: ${media.mimetype}`);
                return null;
            }

            const imagenData = {
                data: media.data,
                mimetype: media.mimetype,
                filename: media.filename || 'imagen_whatsapp.jpg',
                timestamp: new Date().toISOString()
            };

            console.log('Imagen preparada para analisis');
            return imagenData;

        } catch (error) {
            console.error('Error procesando imagen WhatsApp:', error);
            return null;
        }
    }

    async procesarMensaje(message) {
        const numero = message.from;
        const texto = message.body;
        const contacto = await message.getContact();
        const nombreContacto = contacto.pushname || contacto.name || 'Desconocido';
        const esGrupo = message.from.includes('@g.us');
        
        if (numero.includes('status@broadcast')) {
            console.log('Estado de WhatsApp ignorado automaticamente');
            return;
        }

        let imagenData = null;
        
        if (message.hasMedia) {
            console.log('Detectada imagen en mensaje');
            try {
                imagenData = await this.procesarImagenWhatsApp(message);
                console.log(`Resultado procesamiento imagen: ${imagenData ? 'EXITO' : 'FALLO'}`);
            } catch (error) {
                console.error('Error procesando imagen:', error);
            }
        }
        
        const personalAutorizado = this.cargarPersonalAutorizado();
        const numeroLimpio = numero.replace('@c.us', '').replace('@g.us', '').replace('+', '');
        const esPersonalAutorizado = personalAutorizado.some(num => 
            numeroLimpio.includes(num) || num.includes(numeroLimpio.substring(-8))
        );
        
        if (!esGrupo) {
            console.log(`MENSAJE PRIVADO IGNORADO: ${nombreContacto} - Solo responder en grupos`);
            return;
        }

        if (!esGrupo && esPersonalAutorizado) {
            const esMensajeRelevante = detectarMensajeRelevante(texto);
            
            if (!esMensajeRelevante) {
                console.log(`MENSAJE PRIVADO DE PERSONAL IGNORADO: "${texto}" - No relevante para el bot`);
                console.log(`De: ${nombreContacto} (autorizado, pero mensaje casual)`);
                return;
            } else {
                console.log(`MENSAJE PRIVADO RELEVANTE DE PERSONAL: "${texto}"`);
            }
        }
        
        console.log('MENSAJE VALIDO PARA PROCESAR');
        console.log(`De: ${nombreContacto} (${numero})`);
        console.log(`Tipo: ${esGrupo ? 'GRUPO' : 'PERSONAL AUTORIZADO - RELEVANTE'}`);
        console.log(`Texto: "${texto}"`);
        
        const tieneTexto = texto && texto.trim() !== '';
        const tieneMedia = message.hasMedia;
        const esAudio = message.type === 'ptt' || message.type === 'audio';
        const esImagen = message.type === 'image';
        const esVideo = message.type === 'video';
        const esSticker = message.type === 'sticker';
        const esDocumento = message.type === 'document';
        
        console.log(`Longitud: ${texto ? texto.length : 0} caracteres`);
        console.log(`Tipo mensaje: ${message.type}`);
        console.log(`Tiene media: ${tieneMedia ? 'SI' : 'NO'}`);
        
        this.guardarLog('MENSAJE_RECIBIDO', `${nombreContacto} (${numero}): ${texto} [${message.type}] [${esGrupo ? 'GRUPO' : 'PERSONAL'}]`);
        
        if (!tieneTexto && !tieneMedia) {
            console.log('Mensaje vacio y sin media, ignorando...');
            return;
        }
        
        if (esSticker) {
            console.log('Sticker recibido, ignorando...');
            return;
        }
        
        if (tieneTexto) {
            if (texto.toLowerCase().includes('/ping') || texto.toLowerCase().includes('/test')) {
                console.log('Comando ping/test detectado');
                const respuesta = `Bot PlayMall Park ACTIVO\n\n${new Date().toLocaleString()}\nMensajes procesados: ${this.estadisticas.mensajes_procesados}\nEstado: ${this.isConnected ? 'Conectado' : 'Desconectado'}\nReconexiones: ${this.estadisticas.reconexiones}\n\nSistema operativo funcionando correctamente`;
                
                await message.reply(respuesta);
                console.log('Respuesta ping enviada');
                return;
            }
            
            if (texto.toLowerCase().includes('/estado')) {
                console.log('Comando estado detectado');
                const uptime = this.calcularUptime();
                const respuesta = `Estado del Sistema PlayMall Park\n\nBot: ${this.isConnected ? 'OPERATIVO' : 'DESCONECTADO'}\nFuncionando desde: ${uptime}\nMensajes procesados: ${this.estadisticas.mensajes_procesados}\nReconexiones: ${this.estadisticas.reconexiones}\nErrores: ${this.estadisticas.errores}\nUltimo heartbeat: ${new Date(this.lastHeartbeat).toLocaleTimeString()}\n\nPlayMall Park - Supervision Inteligente`;
                
                await message.reply(respuesta);
                console.log('Respuesta estado enviada');
                return;
            }
            
            if (texto.toLowerCase().includes('/help') || texto.toLowerCase().includes('/ayuda')) {
                console.log('Comando help detectado');
                const respuesta = `Comandos del Bot PlayMall Park\n\nComandos disponibles:\n• /ping - Verificar estado del bot\n• /estado - Estado detallado del sistema\n• /help - Mostrar esta ayuda\n\nFunciones automaticas:\n• Supervision 24/7\n• Reportes automaticos\n• Analisis inteligente con GPT\n• Control de operaciones\n\nPara consultas especificas, simplemente escribe tu mensaje y el sistema te respondera automaticamente.`;
                
                await message.reply(respuesta);
                console.log('Respuesta help enviada');
                return;
            }
            
            if (texto.toLowerCase().includes('/grupos') && esPersonalAutorizado) {
                console.log('Comando grupos detectado');
                await this.mostrarGrupos();
                
                const respuesta = `Lista de Grupos Obtenida\n\n[OK] Se ha generado la lista de grupos disponibles\nRevisa la consola y el archivo grupos_whatsapp.json\nUsa esta informacion para actualizar los IDs en el sistema Python\n\nPara ver los grupos, revisa:\n1. La consola del bot (donde se ejecuta)\n2. El archivo grupos_whatsapp.json generado`;
                
                await message.reply(respuesta);
                console.log('[OK] Respuesta grupos enviada');
                return;
            }

            if (texto.toLowerCase().includes('/id') && esGrupo && esPersonalAutorizado) {
                const grupoId = message.from;
                const chat = await message.getChat();
                
                const respuesta = `Informacion del Grupo Actual\n\nNombre: ${chat.name || 'Sin nombre'}\nID: ${grupoId}\nParticipantes: ${chat.participants ? chat.participants.length : 'No disponible'}\nDescripcion: ${chat.description || 'Sin descripcion'}\n\nUsa este ID para configurar el sistema Python`;
                
                await message.reply(respuesta);
                console.log(`[OK] ID del grupo enviado: ${grupoId}`);
                return;
            }
            
            if (texto.toLowerCase() === '/personal' && esPersonalAutorizado) {
                const respuesta = `Personal Autorizado (${personalAutorizado.length})\n\n` +
                                personalAutorizado.map((num, i) => `${i+1}. ${num}`).join('\n');
                await message.reply(respuesta);
                console.log('Lista de personal enviada');
                return;
            }
        }
        
        const esElegibleParaGPT = (
            (tieneTexto && !texto.startsWith('/') && texto.length > 5) ||
            tieneMedia ||
            esAudio
        );
        
        if (esElegibleParaGPT) {
            console.log('Mensaje elegible para GPT');
            console.log(`   - Tiene texto valido: ${tieneTexto && !texto.startsWith('/') && texto.length > 5}`);
            console.log(`   - Tiene media: ${tieneMedia}`);
            console.log(`   - Es audio: ${esAudio}`);

            if (esGrupo || esPersonalAutorizado) {
                let textoParaGPT = texto || '';
                
                try {
                    console.log(`INICIANDO PROCESAMIENTO GPT`);
                    console.log(`Tipo: ${esGrupo ? 'GRUPO' : 'PERSONAL AUTORIZADO'} - ${nombreContacto}`);

                    if (message.hasMedia) {
                        console.log('Detectada imagen en mensaje');
                        imagenData = await this.procesarImagenWhatsApp(message);
                    }

                    if (typeof ejecutar_funcion_operativa !== 'function') {
                        console.error('FUNCION ejecutar_funcion_operativa NO ENCONTRADA');
                        await message.reply('Error: Sistema GPT no esta disponible.');
                        return;
                    }

                    console.log('Ejecutando funcion GPT...');
                    
                    if (tieneMedia && !tieneTexto) {
                        if (esImagen) {
                            textoParaGPT = '[IMAGEN ENVIADA] - Analizar imagen del parque';
                        } else if (esAudio) {
                            textoParaGPT = '[AUDIO ENVIADO] - Analizar mensaje de audio';
                        } else if (esVideo) {
                            textoParaGPT = '[VIDEO ENVIADO] - Analizar video del parque';
                        } else if (esDocumento) {
                            textoParaGPT = '[DOCUMENTO ENVIADO] - Analizar documento adjunto';
                        } else {
                            textoParaGPT = '[MEDIA ENVIADA] - Analizar contenido multimedia';
                        }
                    } else if (tieneMedia && tieneTexto) {
                        textoParaGPT = `${texto} [INCLUYE MEDIA: ${message.type.toUpperCase()}]`;
                    }
                    
                    console.log(`Enviando a GPT: "${textoParaGPT.substring(0, 100)}..."`);
                    console.log(`Numero: ${numero}`);
                    
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout GPT')), 30000)
                    );
                    
                    const gptPromise = ejecutar_funcion_operativa(textoParaGPT, numero, imagenData);
                    const respuestaGPT = await Promise.race([gptPromise, timeoutPromise]);
                    
                    console.log('GPT respondio:', respuestaGPT);
                    
                    if (respuestaGPT && respuestaGPT.respuesta_grupo) {
                        console.log('Enviando respuesta...');
                        await message.reply(respuestaGPT.respuesta_grupo);
                        console.log(`Respuesta GPT enviada a ${nombreContacto}`);
                    } else {
                        console.log('GPT no retorno respuesta valida');
                        console.log('Respuesta completa:', JSON.stringify(respuestaGPT, null, 2));
                        
                        if (esPersonalAutorizado) {
                            await message.reply('Mensaje procesado. No se genero respuesta automatica.');
                        }
                    }
                    
                    if (respuestaGPT && 
                        respuestaGPT.mensaje_privado && 
                        respuestaGPT.mensaje_privado.numero && 
                        respuestaGPT.mensaje_privado.mensaje) {
                        
                        try {
                            console.log(`Enviando mensaje privado a: ${respuestaGPT.mensaje_privado.numero}`);
                            const chatPrivado = await this.client.getChatById(respuestaGPT.mensaje_privado.numero + '@c.us');
                            await chatPrivado.sendMessage(respuestaGPT.mensaje_privado.mensaje);
                            console.log(`Mensaje privado enviado correctamente`);
                        } catch (privateError) {
                            console.error('Error enviando mensaje privado:', privateError.message);
                        }
                    }
                    
                } catch (error) {
                    console.error('ERROR COMPLETO CON GPT:');
                    console.error('   Mensaje:', error.message);
                    console.error('   Stack:', error.stack);
                    console.error('   Texto original:', textoParaGPT.substring(0, 100));
                    console.error('   Numero remitente:', numero);
                    console.error('   Personal autorizado:', esPersonalAutorizado);
                    
                    if (esPersonalAutorizado) {
                        await message.reply(`Error procesando solicitud con GPT.\n\nDetalles tecnicos:\n${error.message.substring(0, 100)}\n\nEl equipo tecnico ha sido notificado.`);
                    } else if (esGrupo) {
                        await message.reply('Sistema temporalmente no disponible.');
                    }
                    
                    this.guardarLog('ERROR_GPT', `${error.message} | Mensaje: ${textoParaGPT.substring(0, 50)} | De: ${numero} | Personal: ${esPersonalAutorizado}`);
                }
            } else {
                console.log(`ERROR: Mensaje llego a GPT sin ser autorizado: ${nombreContacto}`);
            }
        } else {
            if (tieneTexto && texto.startsWith('/')) {
                console.log(`Comando no reconocido: ${texto}`);
                if (esPersonalAutorizado) {
                    console.log(`Comando no reconocido del personal ${nombreContacto}: ${texto}`);
                }
            } else if (tieneTexto && texto.length <= 5) {
                console.log(`Mensaje muy corto de ${nombreContacto}: ${texto}`);
            } else {
                console.log(`Mensaje no procesable de ${nombreContacto}`);
            }
        }
    }

    async iniciarBot() {
        try {
            console.log('Iniciando Bot WhatsApp PlayMall Park...');
            console.log(new Date().toLocaleString());
            
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "playmall-park-bot-" + Date.now(),
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
                        '--user-data-dir=./chrome_temp_' + Date.now(),
                        '--disable-features=VizDisplayCompositor',
                        '--disable-web-security',
                        '--remote-debugging-port=0'
                    ],
                    defaultViewport: null,
                    ignoreDefaultArgs: ['--enable-automation'],
                    handleSIGINT: false,
                    handleSIGTERM: false,
                    ignoreHTTPSErrors: true,
                    dumpio: false
                }
            });
            
            this.configurarEventos();
            
            console.log('Conectando con WhatsApp Web...');
            await this.client.initialize();
            
        } catch (error) {
            console.error('[ERROR] Error iniciando bot:', error.message);
            await this.manejarError(error);
        }
    }
    
    configurarEventos() {
        this.client.on('qr', (qr) => {
            console.log('\nCODIGO QR GENERADO');
            console.log('==================================================');
            console.log('Abre WhatsApp en tu telefono y escanea este codigo:');
            console.log('\n' + qr + '\n');
            console.log('==================================================');
            this.guardarLog('QR_CODE', 'Codigo QR generado para autenticacion');
        });
        
        this.client.on('ready', () => {
            console.log('[OK] Bot WhatsApp conectado exitosamente!');
            console.log('PlayMall Park - Sistema Operativo');
            console.log('Conexion establecida:', new Date().toLocaleString());
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.lastHeartbeat = Date.now();
            
            this.guardarLog('BOT_READY', 'Bot conectado y operativo');
            this.iniciarSistemaMonitoreo();
            this.enviarMensajeInicio();
        });
        
        this.client.on('message', async (message) => {
            try {
                this.lastHeartbeat = Date.now();
                this.estadisticas.mensajes_procesados++;
                
                const numero = message.from;
                const texto = message.body;
                const esGrupo = message.from.includes('@g.us');
                
                console.log(`Mensaje ${esGrupo ? 'de grupo' : 'privado'} (${numero}): ${texto.substring(0, 80)}${texto.length > 80 ? '...' : ''}`);
                
                await this.procesarMensaje(message);
                
            } catch (error) {
                console.error('[ERROR] Error procesando mensaje:', error.message);
                this.estadisticas.errores++;
                this.guardarLog('ERROR_MENSAJE', `${error.message} - Mensaje: ${message.body?.substring(0, 50)}`);
            }
        });
        
        this.client.on('disconnected', (reason) => {
            console.log('[WARNING] Bot desconectado. Razon:', reason);
            this.isConnected = false;
            this.guardarLog('DISCONNECTED', `Desconectado: ${reason}`);
            
            setTimeout(() => {
                this.intentarReconexion();
            }, 5000);
        });
        
        this.client.on('auth_failure', (msg) => {
            console.error('[ERROR] Error de autenticacion:', msg);
            this.guardarLog('AUTH_FAILURE', msg);
            console.log('Sera necesario escanear QR nuevamente');
        });
        
        this.client.on('change_state', (state) => {
            console.log('Estado del bot:', state);
            this.guardarLog('STATE_CHANGE', state);
        });
        
        this.client.on('loading_screen', (percent, message) => {
            console.log(`Cargando WhatsApp: ${percent}% - ${message}`);
        });
    }
    
    iniciarSistemaMonitoreo() {
        console.log('Iniciando sistema de monitoreo y heartbeat...');
        
        setInterval(() => {
            this.verificarEstado();
        }, 30000);
        
        setInterval(() => {
            this.mostrarEstadisticas();
        }, 300000);
        
        setInterval(() => {
            this.verificacionSalud();
        }, 60000);
        
        setInterval(() => {
            this.mantenerActividad();
        }, 120000);
    }
    
    async verificarEstado() {
        try {
            if (this.client && this.isConnected) {
                const state = await this.client.getState();
                if (state === 'CONNECTED') {
                    this.lastHeartbeat = Date.now();
                    console.log(`Heartbeat OK - ${new Date().toLocaleTimeString()}`);
                } else {
                    console.log(`[WARNING] Estado del cliente: ${state}`);
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
        
        if (tiempoSinHeartbeat > 180000) {
            console.log('Sistema posiblemente desconectado - Iniciando verificacion...');
            this.intentarReconexion();
        }
    }
    
    mantenerActividad() {
        if (this.client && this.client.pupPage) {
            try {
                this.client.pupPage.evaluate(() => {
                    const event = new MouseEvent('mousemove', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: 1,
                        clientY: 1
                    });
                    document.dispatchEvent(event);
                }).catch(() => {
                    // Ignorar errores de actividad
                });
                
                console.log('Actividad anti-sleep ejecutada');
            } catch (error) {
                // Ignorar errores
            }
        }
    }
    
    async intentarReconexion() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('[ERROR] Maximo de reconexiones alcanzado. Reiniciando completamente...');
            await this.reiniciarBot();
            return;
        }
        
        this.reconnectAttempts++;
        this.estadisticas.reconexiones++;
        
        console.log(`Intento de reconexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
        
        try {
            if (this.client) {
                await this.client.destroy().catch(() => {});
                this.client = null;
            }
            
            console.log('Esperando 10 segundos antes de reconectar...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            await this.iniciarBot();
            
        } catch (error) {
            console.error('[ERROR] Error en reconexion:', error.message);
            this.guardarLog('ERROR_RECONEXION', error.message);
            
            setTimeout(() => {
                this.intentarReconexion();
            }, 30000);
        }
    }
    
    async reiniciarBot() {
        console.log('Reiniciando bot completamente...');
        
        try {
            if (this.client) {
                await this.client.destroy().catch(() => {});
                this.client = null;
            }
            
            this.reconnectAttempts = 0;
            this.isConnected = false;
            
            console.log('Esperando 15 segundos para reinicio completo...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            await this.iniciarBot();
            
        } catch (error) {
            console.error('[ERROR] Error en reinicio completo:', error.message);
            console.log('Saliendo para que el sistema lo reinicie automaticamente...');
            process.exit(1);
        }
    }
    
    async enviarMensajeInicio() {
        try {
            const mensaje = `[OK] Bot PlayMall Park Operativo\n\nSistema: CONECTADO\n${new Date().toLocaleString()}\nProteccion anti-sleep: ACTIVA\nHeartbeat: CONFIGURADO\nAuto-reconexion: HABILITADA\n\nSupervision inteligente 24/7 activada`;

            console.log('Bot completamente operativo');
            this.guardarLog('BOT_OPERATIVO', 'Sistema completamente funcional');
            
        } catch (error) {
            console.error('Error en mensaje de inicio:', error.message);
        }
    }
    
    mostrarEstadisticas() {
        const uptime = this.calcularUptime();
        
        console.log('\nESTADISTICAS DEL BOT PLAYMALL PARK:');
        console.log('==================================================');
        console.log(`Estado: ${this.isConnected ? '[OK] CONECTADO' : '[ERROR] DESCONECTADO'}`);
        console.log(`Funcionando desde: ${uptime}`);
        console.log(`Mensajes procesados: ${this.estadisticas.mensajes_procesados}`);
        console.log(`Reconexiones: ${this.estadisticas.reconexiones}`);
        console.log(`Errores: ${this.estadisticas.errores}`);
        console.log(`Ultimo heartbeat: ${new Date(this.lastHeartbeat).toLocaleTimeString()}`);
        console.log(`Fecha actual: ${new Date().toLocaleDateString()}`);
        console.log('==================================================');
        console.log('');
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
        console.error('[ERROR] Error critico:', error.message);
        this.estadisticas.errores++;
        this.guardarLog('ERROR_CRITICO', error.message);
        
        console.log('Intentando recuperacion automatica en 10 segundos...');
        setTimeout(async () => {
            try {
                await this.iniciarBot();
            } catch (retryError) {
                console.error('[ERROR] Fallo la recuperacion automatica');
                process.exit(1);
            }
        }, 10000);
    }
}

process.on('SIGINT', async () => {
    console.log('\nCerrando bot gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
});

console.log('PLAYMALL PARK - BOT WHATSAPP INICIANDO...');
console.log(new Date().toLocaleString());
console.log('Version: Estable con proteccion anti-sleep');
console.log('');

const bot = new BotWhatsAppPlayMall();
bot.iniciarBot().catch((error) => {
    console.error('[ERROR] Error fatal iniciando bot:', error);
    process.exit(1);
});