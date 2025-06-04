// instagram_automation.js - VERSIÓN OPTIMIZADA
// Sistema de automatización para Instagram Stories con análisis de videos
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class InstagramStoriesAutomation {
    constructor() {
        // Variables de entorno corregidas para Instagram Business API
        this.instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        this.instagramBusinessAccountId = process.env.INSTAGRAM_IG_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
        this.facebookPageId = process.env.FACEBOOK_PAGE_ID; // Requerido para algunas operaciones
        this.baseURL = 'https://graph.facebook.com/v18.0';
        
        // Verificar configuración
        this.isConfigured = !!(this.instagramToken && this.instagramBusinessAccountId);
        
        console.log('[INSTAGRAM] Instagram Stories Automation inicializado');
        console.log(`[INSTAGRAM] Configurado: ${this.isConfigured ? 'SÍ' : 'NO'}`);
        
        if (!this.isConfigured) {
            console.log('[INSTAGRAM] ⚠️ Variables de entorno faltantes:');
            if (!this.instagramToken) console.log('[INSTAGRAM] - INSTAGRAM_ACCESS_TOKEN');
            if (!this.instagramBusinessAccountId) console.log('[INSTAGRAM] - INSTAGRAM_ACCOUNT_ID');
        } else {
            console.log('[INSTAGRAM] ✅ API Instagram configurada correctamente');
            console.log(`[INSTAGRAM] Business Account ID: ${this.instagramBusinessAccountId.slice(0, 10)}...`);
        }
        
        // Criterios de calidad para publicación automática
        this.criteriosCalidad = {
            satisfaccion_minima: 0.75,
            personas_minimas: 3,
            personas_maximas: 25,
            elementos_positivos_requeridos: 2,
            duracion_minima: 5, // segundos
            duracion_maxima: 60 // segundos
        };
        
        // Frases típicas de Maracaibo/Zulia para respuestas
        this.frasesZulianas = [
            "¡Epa chévere!",
            "¡Qué brutal!",
            "¡Está arrechísimo!",
            "¡Vale la pena!",
            "¡Te esperamos!",
            "¡Vengan a disfrutar!",
            "¡Los niños la pasan genial!",
            "¡Diversión garantizada!",
            "¡No se van a arrepentir!",
            "¡Aquí la pasamos chévere!"
        ];
        
        // Horarios óptimos para publicar en Instagram (Venezuela)
        this.horariosOptimos = [
            { inicio: 11, fin: 13, descripcion: 'Horario almuerzo' },
            { inicio: 15, fin: 17, descripcion: 'Tarde activa' },
            { inicio: 19, fin: 21, descripcion: 'Horario nocturno' }
        ];
        
        // Crear directorio de logs si no existe
        this.crearDirectorioLogs();
    }
    
    // CREAR DIRECTORIO DE LOGS
    crearDirectorioLogs() {
        try {
            const logsDir = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
                console.log('[INSTAGRAM] Directorio de logs creado');
            }
        } catch (error) {
            console.error('[INSTAGRAM] Error creando directorio logs:', error);
        }
    }
    
    // FUNCIÓN PRINCIPAL: PUBLICAR STORY (Compatibilidad con instagram_processor.js)
    async publicarStory(mediaData) {
        try {
            if (!this.isConfigured) {
                console.log('[INSTAGRAM] API no configurada - Modo simulación');
                return {
                    success: false,
                    message: 'Instagram API no configurada. Verificar variables de entorno.',
                    simulation: true,
                    story_id: `sim_${Date.now()}`
                };
            }
            
            console.log('[INSTAGRAM] 📱 Iniciando publicación de Story...');
            
            // Verificar si tenemos datos del video
            let videoPath = null;
            if (mediaData.videoPath) {
                videoPath = mediaData.videoPath;
            } else if (mediaData.frames && mediaData.frames.length > 0) {
                // Si no hay video pero sí frames, usar el primer frame como imagen
                videoPath = mediaData.frames[0].path;
                console.log('[INSTAGRAM] Usando frame como imagen para Story');
            } else {
                throw new Error('No se encontró video o imagen para publicar');
            }
            
            // Verificar que el archivo existe
            if (!fs.existsSync(videoPath)) {
                throw new Error(`Archivo no encontrado: ${videoPath}`);
            }
            
            // Generar caption automático
            const caption = this.generarCaptionAutomatico(mediaData);
            
            // Publicar en Instagram Stories
            const resultado = await this.publicarEnInstagramStories(videoPath, caption);
            
            if (resultado.success) {
                console.log('[INSTAGRAM] ✅ Story publicado exitosamente');
                
                // Registrar métricas
                await this.registrarMetricasPublicacion({
                    story_id: resultado.story_id,
                    timestamp: new Date().toISOString(),
                    video_path: videoPath,
                    caption: caption,
                    tipo: 'automatico'
                });
                
                return {
                    success: true,
                    message: resultado.mensaje,
                    story_id: resultado.story_id,
                    simulation: false
                };
            } else {
                throw new Error(resultado.error || 'Error desconocido en publicación');
            }
            
        } catch (error) {
            console.error('[INSTAGRAM] ❌ Error publicando Story:', error);
            
            // En caso de error, simular publicación exitosa para no bloquear el flujo
            return {
                success: false,
                message: `Error publicando Story: ${error.message}`,
                error: error.message,
                simulation: true,
                story_id: `err_${Date.now()}`
            };
        }
    }
    
    // GENERAR CAPTION AUTOMÁTICO
    generarCaptionAutomatico(mediaData) {
        const frases = [
            "¡Diversión sin límites en PlayMall Park! 🎢",
            "¡Momentos únicos en familia! ✨",
            "¡La alegría de los niños es nuestra motivación! 😊",
            "¡Ven y vive la experiencia PlayMall! 🎠",
            "¡Donde cada momento es especial! 💫"
        ];
        
        // Seleccionar frase aleatoria
        const fraseBase = frases[Math.floor(Math.random() * frases.length)];
        
        // Agregar hashtags relevantes
        const hashtags = "#PlayMallPark #Maracaibo #Zulia #DiversionFamiliar #ParqueInfantil #Venezuela";
        
        return `${fraseBase}\n\n${hashtags}`;
    }
    
    // ANÁLISIS DE VIDEO PARA INSTAGRAM (Mejorado)
    async analizarVideoParaInstagram(videoData, analisisIA) {
        try {
            console.log('[INSTAGRAM] Analizando video para posible publicación...');
            
            const criterios = {
                calidad_tecnica: 0,
                atractivo_visual: 0,
                engagement_potencial: 0,
                satisfaccion_detectada: 0,
                personas_optimas: false,
                elementos_marketing: 0,
                puntuacion_total: 0,
                recomendacion: 'no_publicar',
                razones: []
            };
            
            // 1. ANÁLISIS TÉCNICO DEL VIDEO
            const duracion = videoData.videoInfo?.duration || 0;
            if (duracion >= this.criteriosCalidad.duracion_minima && 
                duracion <= this.criteriosCalidad.duracion_maxima) {
                criterios.calidad_tecnica += 25;
                criterios.razones.push('✅ Duración óptima para Stories');
            } else if (duracion > 0) {
                criterios.calidad_tecnica += 10;
                criterios.razones.push('🔸 Duración aceptable');
            } else {
                criterios.razones.push('❌ Duración no óptima para Stories');
            }
            
            // 2. ANÁLISIS DE FRAMES EXTRAÍDOS
            if (videoData.frames && videoData.frames.length > 0) {
                criterios.calidad_tecnica += 15;
                criterios.razones.push(`✅ ${videoData.frames.length} frames extraídos para análisis`);
            }
            
            // 3. ANÁLISIS DE CONTENIDO IA (Adaptado para tu sistema)
            if (analisisIA) {
                // Buscar indicadores de personas en el análisis
                const textoAnalisis = typeof analisisIA === 'string' ? analisisIA : JSON.stringify(analisisIA);
                
                // Detectar personas
                const personasMatch = textoAnalisis.match(/(\d+)\s*persona/gi);
                if (personasMatch) {
                    const personas = parseInt(personasMatch[0]);
                    if (personas >= this.criteriosCalidad.personas_minimas && 
                        personas <= this.criteriosCalidad.personas_maximas) {
                        criterios.personas_optimas = true;
                        criterios.atractivo_visual += 20;
                        criterios.razones.push(`✅ ${personas} personas - perfecto para Stories`);
                    } else if (personas > this.criteriosCalidad.personas_maximas) {
                        criterios.atractivo_visual += 10;
                        criterios.razones.push('🔸 Muchas personas - revisar privacidad');
                    } else {
                        criterios.atractivo_visual += 5;
                        criterios.razones.push('🔸 Pocas personas en el video');
                    }
                }
                
                // Detectar elementos positivos
                const elementosPositivos = [
                    'sonris', 'feliz', 'alegr', 'divert', 'satisf', 'genial', 'excelente', 'bueno'
                ];
                
                const elementosEncontrados = elementosPositivos.filter(elemento => 
                    textoAnalisis.toLowerCase().includes(elemento)
                );
                
                if (elementosEncontrados.length >= this.criteriosCalidad.elementos_positivos_requeridos) {
                    criterios.engagement_potencial += 30;
                    criterios.razones.push(`✅ ${elementosEncontrados.length} elementos positivos detectados`);
                } else if (elementosEncontrados.length > 0) {
                    criterios.engagement_potencial += 15;
                    criterios.razones.push(`🔸 ${elementosEncontrados.length} elementos positivos detectados`);
                }
                
                // Detectar elementos del parque
                const elementosParque = ['atraccion', 'juego', 'parque', 'diversión', 'entretenimiento'];
                const parqueEncontrado = elementosParque.some(elemento => 
                    textoAnalisis.toLowerCase().includes(elemento)
                );
                
                if (parqueEncontrado) {
                    criterios.atractivo_visual += 15;
                    criterios.razones.push('✅ Atracciones del parque visibles');
                }
            } else {
                criterios.razones.push('⚠️ Análisis de IA no disponible');
            }
            
            // 4. BONUS POR HORARIO ÓPTIMO
            if (this.esHorarioOptimo()) {
                criterios.engagement_potencial += 10;
                criterios.razones.push('✅ Horario óptimo para publicación');
            }
            
            // 5. CALCULAR PUNTUACIÓN TOTAL
            criterios.puntuacion_total = 
                criterios.calidad_tecnica + 
                criterios.atractivo_visual + 
                criterios.engagement_potencial;
            
            // 6. DETERMINAR RECOMENDACIÓN
            if (criterios.puntuacion_total >= 70) {
                criterios.recomendacion = 'publicar_automatico';
                criterios.razones.unshift('🌟 EXCELENTE - Publicación automática recomendada');
            } else if (criterios.puntuacion_total >= 50) {
                criterios.recomendacion = 'preguntar_usuario';
                criterios.razones.unshift('🤔 BUENO - Consultar al equipo antes de publicar');
            } else {
                criterios.recomendacion = 'no_publicar';
                criterios.razones.unshift('❌ BAJO - No recomendado para publicación');
            }
            
            console.log(`[INSTAGRAM] Análisis completado - Puntuación: ${criterios.puntuacion_total}/100`);
            console.log(`[INSTAGRAM] Recomendación: ${criterios.recomendacion}`);
            
            return criterios;
            
        } catch (error) {
            console.error('[ERROR] Error analizando video para Instagram:', error);
            return {
                puntuacion_total: 0,
                recomendacion: 'error',
                razones: ['❌ Error en análisis - revisar manualmente'],
                calidad_tecnica: 0,
                atractivo_visual: 0,
                engagement_potencial: 0
            };
        }
    }

        async analizarVideoParaInstagram(videoData, analisisIA = null) {
        try {
            console.log('[INSTAGRAM] Analizando video para Instagram Stories...');
            
            const analisis = {
                puntuacion_total: 0,
                recomendacion: 'analizar',
                razones: [],
                metadata: videoData.videoInfo || {}
            };
            
            const duracion = videoData.videoInfo?.duration || 0;
            const videoPath = videoData.videoPath;
            
            // 1. Evaluar duración
            if (duracion >= 10 && duracion <= 30) {
                analisis.puntuacion_total += 30;
                analisis.razones.push('⏱️ Duración perfecta para Stories (10-30s)');
            } else if (duracion <= 60) {
                analisis.puntuacion_total += 20;
                analisis.razones.push('⏱️ Duración aceptable - Será optimizado');
            } else {
                analisis.razones.push('✂️ Video será recortado a 60 segundos máximo');
            }
            
            // 2. Evaluar si tiene frames extraídos
            if (videoData.frames && videoData.frames.length > 0) {
                analisis.puntuacion_total += 20;
                analisis.razones.push('🎬 Frames extraídos exitosamente');
            } else {
                analisis.razones.push('📹 Video procesado sin extracción de frames');
            }
            
            // 3. Evaluar procesamiento
            if (videoData.procesamiento === 'completo_con_frames') {
                analisis.puntuacion_total += 25;
                analisis.razones.push('✅ Procesamiento completo realizado');
            } else {
                analisis.razones.push('🔄 Procesamiento básico completado');
            }
            
            // 4. Analizar contenido usando IA
            if (analisisIA) {
                if (analisisIA.includes('VISITANTES') || analisisIA.includes('PERSONAS')) {
                    analisis.puntuacion_total += 20;
                    analisis.razones.push('👥 Actividad de visitantes detectada - Ideal para promoción');
                }
                
                if (analisisIA.includes('DIVERSIÓN') || analisisIA.includes('ENTRETENIMIENTO')) {
                    analisis.puntuacion_total += 15;
                    analisis.razones.push('🎉 Ambiente de diversión captado - Perfecto para Stories');
                }
            }
            
            // 5. Determinar recomendación
            if (analisis.puntuacion_total >= 80) {
                analisis.recomendacion = 'publicar_automatico';
                analisis.razones.unshift('🎬 VIDEO EXCELENTE - Publicación automática recomendada');
            } else if (analisis.puntuacion_total >= 60) {
                analisis.recomendacion = 'preguntar_usuario';
                analisis.razones.unshift('👍 BUEN VIDEO - Solicitar confirmación para publicar');
            } else {
                analisis.recomendacion = 'mejorar_contenido';
                analisis.razones.unshift('📹 VIDEO BÁSICO - Se procesará con mejoras automáticas');
            }
            
            console.log(`[INSTAGRAM] Análisis de video completado - Puntuación: ${analisis.puntuacion_total}/100`);
            return analisis;
            
        } catch (error) {
            console.error('[INSTAGRAM] Error analizando video:', error.message);
            return {
                puntuacion_total: 0,
                recomendacion: 'error',
                razones: [`❌ Error en análisis: ${error.message}`],
                metadata: null
            };
        }
    }
    
    generarMensajeConsulta(analisis, mediaInfo) {
        const mediaEmoji = mediaInfo.tipo === 'video' ? '🎬' : '📸';
        
        let mensaje = `${mediaEmoji} **ANÁLISIS PARA INSTAGRAM STORIES** ${mediaEmoji}\n\n`;
        
        // Información del contenido
        mensaje += `📊 **Evaluación:** ${analisis.puntuacion_total}/100 puntos\n`;
        mensaje += `🎯 **Recomendación:** ${this.traducirRecomendacion(analisis.recomendacion)}\n\n`;
        
        // Detalles del análisis
        mensaje += `🔍 **Análisis detallado:**\n`;
        analisis.razones.forEach(razon => {
            mensaje += `   ${razon}\n`;
        });
        
        // Metadatos técnicos
        if (analisis.metadata) {
            mensaje += `\n📋 **Información técnica:**\n`;
            if (analisis.metadata.ancho && analisis.metadata.alto) {
                mensaje += `   • Dimensiones: ${analisis.metadata.ancho}x${analisis.metadata.alto}\n`;
                mensaje += `   • Aspecto: ${analisis.metadata.aspecto}\n`;
            }
            if (analisis.metadata.duration) {
                mensaje += `   • Duración: ${analisis.metadata.duration}s\n`;
            }
            if (analisis.metadata.tamaño_kb) {
                mensaje += `   • Tamaño: ${analisis.metadata.tamaño_kb}KB\n`;
            }
        }
        
        // Recomendación de acción
        mensaje += `\n📱 **¿Publicar en @playmallmcbo?**\n`;
        
        if (analisis.recomendacion === 'publicar_automatico') {
            if (this.esHorarioOptimo()) {
                mensaje += `✨ **PERFECTO** - Se publicará automáticamente en el próximo horario óptimo\n`;
                mensaje += `⏰ **Próxima publicación:** Dentro de ${this.tiempoHastaProximoHorario()} minutos\n\n`;
            } else {
                mensaje += `⏰ **PROGRAMADO** - Se publicará automáticamente en horario óptimo\n\n`;
            }
            mensaje += `💡 **Para publicar ahora:** Responde "PUBLICAR AHORA"\n`;
            mensaje += `❌ **Para cancelar:** Responde "NO PUBLICAR"`;
        } else {
            mensaje += `🤔 **Solicita tu decisión:**\n`;
            mensaje += `✅ **Para confirmar:** Responde "SÍ PUBLICAR"\n`;
            mensaje += `❌ **Para cancelar:** Responde "NO PUBLICAR"\n`;
            mensaje += `📝 **Para consejos:** Responde "MEJORAR"`;
        }
        
        mensaje += `\n\n⏰ Esta consulta expira en 10 minutos`;
        mensaje += `\n📈 **Alcance estimado:** ${this.calcularAlcanceEstimado()} personas en Maracaibo`;
        
        return mensaje;
    }
    
    // PUBLICAR VIDEO EN INSTAGRAM STORIES (Corregido)
    async publicarEnInstagramStories(videoPath, caption = null) {
        try {
            console.log('[INSTAGRAM] Iniciando publicación en Stories...');
            
            if (!this.isConfigured) {
                throw new Error('Instagram API no configurada');
            }
            
            // Determinar si es video o imagen
            const esVideo = videoPath.toLowerCase().includes('.mp4') || 
                           videoPath.toLowerCase().includes('.mov') || 
                           videoPath.toLowerCase().includes('.avi');
            
            // 1. Subir media a Instagram
            const mediaResponse = await this.subirMediaInstagram(videoPath, esVideo ? 'VIDEO' : 'IMAGE');
            if (!mediaResponse.success) {
                throw new Error(`Error subiendo media: ${mediaResponse.error}`);
            }
            
            // 2. Publicar como Story
            const storyResponse = await this.publicarStoryFinal(mediaResponse.media_id, caption);
            
            if (storyResponse.success) {
                console.log(`[INSTAGRAM] ✅ Story publicado exitosamente: ${storyResponse.story_id}`);
                
                return {
                    success: true,
                    story_id: storyResponse.story_id,
                    mensaje: `🎉 **¡VIDEO PUBLICADO EXITOSAMENTE!** 🎉\n\n📱 Story disponible en Instagram @playmallmcbo\n🆔 ID: ${storyResponse.story_id}\n🕐 Publicado: ${new Date().toLocaleString('es-VE')}\n\n✨ ¡Gracias por compartir momentos especiales de PlayMall Park!`
                };
            } else {
                throw new Error(`Error publicando Story: ${storyResponse.error}`);
            }
            
        } catch (error) {
            console.error('[ERROR] Error publicando en Instagram:', error);
            return {
                success: false,
                error: error.message,
                mensaje: `❌ **Error publicando en Instagram Stories**\n\n🔧 **Problema:** ${error.message}\n\n💡 **Solución:** Verificar configuración de Instagram Business API o intentar más tarde.`
            };
        }
    }
    
    // SUBIR MEDIA A INSTAGRAM (Corregido para manejar video e imagen)
    async subirMediaInstagram(filePath, mediaType = 'VIDEO') {
        try {
            console.log(`[INSTAGRAM] Subiendo ${mediaType} a Instagram...`);
            
            // Leer archivo
            if (!fs.existsSync(filePath)) {
                throw new Error(`Archivo no encontrado: ${filePath}`);
            }
            
            const fileBuffer = fs.readFileSync(filePath);
            const fileSize = fileBuffer.length;
            
            console.log(`[INSTAGRAM] Archivo leído: ${Math.round(fileSize / 1024)}KB`);
            
            // Para videos grandes, usar upload resumible
            if (mediaType === 'VIDEO' && fileSize > 10 * 1024 * 1024) { // 10MB
                return await this.subirVideoResumible(filePath, fileBuffer);
            }
            
            // Upload directo para archivos pequeños
            const FormData = require('form-data');
            const formData = new FormData();
            
            formData.append('source', fileBuffer, {
                filename: path.basename(filePath),
                contentType: mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
            });
            formData.append('purpose', 'story');
            
            const response = await axios.post(
                `${this.baseURL}/${this.instagramBusinessAccountId}/media`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.instagramToken}`,
                        ...formData.getHeaders()
                    },
                    timeout: 60000, // 60 segundos
                    maxContentLength: 100 * 1024 * 1024, // 100MB
                    maxBodyLength: 100 * 1024 * 1024
                }
            );
            
            console.log(`[INSTAGRAM] ✅ Media subido exitosamente: ${response.data.id}`);
            
            return {
                success: true,
                media_id: response.data.id
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error subiendo media:', error);
            
            // Información detallada del error
            if (error.response) {
                console.error('[INSTAGRAM] Error response:', error.response.data);
                console.error('[INSTAGRAM] Status:', error.response.status);
            }
            
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }
    
    // PUBLICAR STORY FINAL
    async publicarStoryFinal(mediaId, caption) {
        try {
            console.log('[INSTAGRAM] Publicando Story...');
            
            const params = {
                creation_id: mediaId,
                access_token: this.instagramToken
            };
            
            // Instagram Stories no soportan caption directamente en el API
            // El caption se maneja como texto overlay en el cliente
            
            const response = await axios.post(
                `${this.baseURL}/${this.instagramBusinessAccountId}/media_publish`,
                params,
                {
                    timeout: 30000
                }
            );
            
            return {
                success: true,
                story_id: response.data.id
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error publicando Story:', error);
            
            if (error.response) {
                console.error('[INSTAGRAM] Error response:', error.response.data);
            }
            
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }
    
    // OBTENER HORARIOS ÓPTIMOS (Para compatibilidad)
    obtenerHorariosOptimos() {
        return this.horariosOptimos;
    }
    
    // VERIFICAR HORARIO ÓPTIMO PARA PUBLICAR
    esHorarioOptimo() {
        const horaActual = new Date().getHours();
        
        return this.horariosOptimos.some(horario => 
            horaActual >= horario.inicio && horaActual <= horario.fin
        );
    }
    
    // REGISTRAR MÉTRICAS DE PUBLICACIÓN
    async registrarMetricasPublicacion(datosPublicacion) {
        try {
            const registroPath = path.join(__dirname, '../logs/instagram_publications.jsonl');
            const registro = {
                ...datosPublicacion,
                horario_publicacion: new Date().toLocaleString('es-VE'),
                horario_optimo: this.esHorarioOptimo()
            };
            
            const lineaRegistro = JSON.stringify(registro) + '\n';
            fs.appendFileSync(registroPath, lineaRegistro, 'utf8');
            
            console.log('[INSTAGRAM] ✅ Métricas registradas en logs');
            
        } catch (error) {
            console.error('[ERROR] Error registrando métricas:', error);
        }
    }
    
    // FUNCIÓN DE ESTADO PARA DEBUGGING
    async verificarEstado() {
        try {
            if (!this.isConfigured) {
                return {
                    status: 'not_configured',
                    message: 'Instagram API no configurada',
                    details: {
                        token: !!this.instagramToken,
                        account_id: !!this.instagramBusinessAccountId
                    }
                };
            }
            
            // Test simple de la API
            const response = await axios.get(
                `${this.baseURL}/${this.instagramBusinessAccountId}`,
                {
                    params: {
                        fields: 'name,username',
                        access_token: this.instagramToken
                    },
                    timeout: 10000
                }
            );
            
            return {
                status: 'ready',
                message: 'Instagram API funcionando correctamente',
                account: response.data,
                horario_optimo: this.esHorarioOptimo()
            };
            
        } catch (error) {
            return {
                status: 'error',
                message: error.response?.data?.error?.message || error.message,
                details: error.response?.data
            };
        }
    }
}

module.exports = InstagramStoriesAutomation;