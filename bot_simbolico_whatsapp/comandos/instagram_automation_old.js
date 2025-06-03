// REEMPLAZAR EL INICIO DE instagram_automation.js CON ESTO:

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

console.log("[DEBUG] .env cargado:", process.env.INSTAGRAM_ACCESS_TOKEN?.slice(0, 25) + '...');

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const express = require('express');

// ✅ AGREGAR IMPORTACIONES PARA REDIMENSIONAMIENTO
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// ✅ IMPORTAR EL PROCESADOR DE MEDIOS

class InstagramStoriesAutomation {
    constructor() {
        this.instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        this.instagramBusinessAccountId = process.env.INSTAGRAM_IG_USER_ID;
        this.baseURL = 'https://graph.facebook.com/v18.0';
        
        // ✅ INICIALIZAR PROCESADOR DE MEDIOS
        this.mediaProcessor = new InstagramMediaProcessor();
        
        // Horarios óptimos para Stories
        this.horariosOptimos = [
            { inicio: 11, fin: 13 },
            { inicio: 15, fin: 17 },
            { inicio: 19, fin: 21 }
        ];
        
        console.log('[INSTAGRAM] ✅ Sistema de redimensionamiento activado');
    }

    // ========== FUNCIONES MODIFICADAS CON REDIMENSIONAMIENTO ==========

    // ✅ MODIFICAR: subirImagenInstagram
    async subirImagenInstagram(imagenData) {
        try {
            console.log('[INSTAGRAM] === PROCESANDO IMAGEN CON REDIMENSIONAMIENTO ===');
            
            // 1. PROCESAR IMAGEN PARA STORIES (NUEVO)
            const imagenProcesada = await this.mediaProcessor.procesarImagenParaStories(imagenData);
            console.log(`[INSTAGRAM] ✅ Imagen redimensionada: ${imagenProcesada.length} bytes`);
            
            // 2. Subir imagen procesada
            const tempImageUrl = await this.subirImagenAServidor(imagenProcesada);
            if (!tempImageUrl) {
                throw new Error('No se pudo generar URL para la imagen');
            }
            
            // 3. Verificar accesibilidad
            const esAccesible = await this.verificarURLAccesible(tempImageUrl);
            if (!esAccesible) {
                throw new Error('La URL generada no es accesible por Instagram');
            }
            
            console.log(`[INSTAGRAM] URL verificada: ${tempImageUrl}`);
            
            // 4. Enviar a Instagram API
            const response = await axios.post(
                `${this.baseURL}/${this.instagramBusinessAccountId}/media`,
                {
                    image_url: tempImageUrl,
                    access_token: this.instagramToken
                },
                {
                    timeout: 30000
                }
            );
            
            console.log('[INSTAGRAM] ✅ Imagen enviada a Instagram correctamente');
            return {
                success: true,
                media_id: response.data.id
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error detallado subiendo imagen:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            return {
                success: false,
                error: `${error.message} (Status: ${error.response?.status || 'unknown'})`
            };
        }
    }

    // ✅ MODIFICAR: subirVideoInstagram
    async subirVideoInstagram(videoPath) {
        try {
            console.log('[INSTAGRAM] === PROCESANDO VIDEO CON REDIMENSIONAMIENTO ===');
            
            // 1. PROCESAR VIDEO PARA STORIES (NUEVO)
            const videoProcesado = await this.mediaProcessor.procesarVideoParaStories(videoPath);
            console.log(`[INSTAGRAM] ✅ Video redimensionado: ${videoProcesado}`);
            
            // 2. Subir video procesado
            const videoBuffer = fs.readFileSync(videoProcesado);
            const videoUrl = await this.subirVideoAServidor(videoBuffer);
            
            if (!videoUrl) {
                throw new Error('No se pudo generar URL para el video');
            }
            
            // 3. Verificar accesibilidad
            const esAccesible = await this.verificarURLAccesible(videoUrl);
            if (!esAccesible) {
                throw new Error('La URL del video no es accesible por Instagram');
            }
            
            console.log(`[INSTAGRAM] Video URL verificada: ${videoUrl}`);
            
            // 4. Enviar a Instagram API
            const response = await axios.post(
                `${this.baseURL}/${this.instagramBusinessAccountId}/media`,
                {
                    video_url: videoUrl,
                    media_type: 'VIDEO',
                    access_token: this.instagramToken
                },
                {
                    timeout: 60000
                }
            );
            
            return {
                success: true,
                media_id: response.data.id
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error subiendo video:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== NUEVAS FUNCIONES DE ANÁLISIS ==========

    async analizarImagenParaInstagram(imagenData, analisisIA = null) {
        try {
            console.log('[INSTAGRAM] Analizando imagen para Instagram Stories...');
            
            // 1. Obtener metadatos de la imagen
            let imageBuffer;
            if (typeof imagenData === 'string') {
                imageBuffer = Buffer.from(imagenData, 'base64');
            } else if (imagenData.data) {
                imageBuffer = Buffer.from(imagenData.data, 'base64');
            } else {
                imageBuffer = imagenData;
            }
            
            const metadata = await sharp(imageBuffer).metadata();
            console.log(`[INSTAGRAM] Imagen: ${metadata.width}x${metadata.height}`);
            
            // 2. Analizar calidad para Stories
            const analisis = {
                puntuacion_total: 0,
                recomendacion: 'analizar',
                razones: [],
                metadata: {
                    ancho: metadata.width,
                    alto: metadata.height,
                    aspecto: (metadata.width / metadata.height).toFixed(3),
                    tamaño_kb: Math.round(imageBuffer.length / 1024)
                }
            };
            
            // 3. Evaluar dimensiones
            const aspectoActual = metadata.width / metadata.height;
            if (aspectoActual >= 0.5 && aspectoActual <= 0.9) {
                analisis.puntuacion_total += 25;
                analisis.razones.push('✅ Dimensiones apropiadas para Stories');
            } else {
                analisis.razones.push('🔧 Dimensiones serán ajustadas automáticamente');
            }
            
            // 4. Evaluar calidad de imagen
            if (metadata.width >= 720 && metadata.height >= 1280) {
                analisis.puntuacion_total += 20;
                analisis.razones.push('✅ Resolución adecuada');
            } else {
                analisis.razones.push('📈 Resolución será optimizada');
            }
            
            // 5. Evaluar tamaño de archivo
            const tamañoMB = imageBuffer.length / (1024 * 1024);
            if (tamañoMB < 30) {
                analisis.puntuacion_total += 15;
                analisis.razones.push('✅ Tamaño de archivo óptimo');
            } else {
                analisis.razones.push('🗜️ Tamaño será comprimido');
            }
            
            // 6. Analizar contenido usando IA (si disponible)
            if (analisisIA && analisisIA.includes) {
                if (analisisIA.includes('PERSONAS') || analisisIA.includes('VISITANTES')) {
                    analisis.puntuacion_total += 20;
                    analisis.razones.push('👥 Contenido con personas detectado - Excelente para engagement');
                }
                
                if (analisisIA.includes('ATRACCIONES') || analisisIA.includes('DIVERSIÓN')) {
                    analisis.puntuacion_total += 15;
                    analisis.razones.push('🎢 Contenido de atracciones - Perfecto para promoción');
                }
                
                if (analisisIA.includes('MASCOTA') || analisisIA.includes('STITCH')) {
                    analisis.puntuacion_total += 20;
                    analisis.razones.push('🎭 Mascota del parque detectada - Contenido viral garantizado');
                }
            } else {
                analisis.puntuacion_total += 10;
                analisis.razones.push('📸 Imagen documentada para Stories');
            }
            
            // 7. Determinar recomendación final
            if (analisis.puntuacion_total >= 80) {
                analisis.recomendacion = 'publicar_automatico';
                analisis.razones.unshift('🌟 EXCELENTE CALIDAD - Publicación automática recomendada');
            } else if (analisis.puntuacion_total >= 60) {
                analisis.recomendacion = 'preguntar_usuario';
                analisis.razones.unshift('👍 BUENA CALIDAD - Solicitar confirmación para publicar');
            } else {
                analisis.recomendacion = 'mejorar_contenido';
                analisis.razones.unshift('📝 CALIDAD BÁSICA - Se procesará pero se sugiere mejora');
            }
            
            console.log(`[INSTAGRAM] Análisis completado - Puntuación: ${analisis.puntuacion_total}/100`);
            return analisis;
            
        } catch (error) {
            console.error('[INSTAGRAM] Error analizando imagen:', error.message);
            return {
                puntuacion_total: 0,
                recomendacion: 'error',
                razones: [`❌ Error en análisis: ${error.message}`],
                metadata: null
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

    // ========== FUNCIONES AUXILIARES NUEVAS ==========

    traducirRecomendacion(recomendacion) {
        const traducciones = {
            'publicar_automatico': '🌟 Publicación automática',
            'preguntar_usuario': '🤔 Solicitar confirmación',
            'mejorar_contenido': '📝 Necesita mejoras',
            'error': '❌ Error en análisis'
        };
        
        return traducciones[recomendacion] || recomendacion;
    }

    tiempoHastaProximoHorario() {
        const horaActual = new Date().getHours();
        
        for (const horario of this.horariosOptimos) {
            if (horaActual < horario.inicio) {
                return (horario.inicio - horaActual) * 60;
            }
        }
        
        // Si ya pasaron todos los horarios de hoy, calcular para mañana
        return (24 - horaActual + this.horariosOptimos[0].inicio) * 60;
    }

    calcularAlcanceEstimado() {
        // Estimación basada en horario y día de la semana
        const hora = new Date().getHours();
        const dia = new Date().getDay();
        const esFinDeSemana = dia === 0 || dia === 6;
        
        let base = 500; // Base de seguidores activos
        
        if (esFinDeSemana) base *= 1.5;
        if (hora >= 19 && hora <= 21) base *= 1.3;
        if (hora >= 11 && hora <= 13) base *= 1.2;
        
        return Math.round(base);
    }

    // ========== FUNCIÓN DE PUBLICACIÓN FINAL PRINCIPAL ==========
    
    async publicarStory(mediaId, caption = null) {
        try {
            console.log(`[INSTAGRAM] Publicando Story con media ID: ${mediaId}`);
            
            const payload = {
                creation_id: mediaId,
                access_token: this.instagramToken
            };
            
            if (caption) {
                payload.caption = caption;
            }
            
            const response = await axios.post(
                `${this.baseURL}/${this.instagramBusinessAccountId}/media_publish`,
                payload,
                {
                    timeout: 30000
                }
            );
            
            console.log('[INSTAGRAM] ✅ Story publicado exitosamente');
            console.log(`[INSTAGRAM] Story ID: ${response.data.id}`);
            
            return {
                success: true,
                story_id: response.data.id
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error publicando Story:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // ========== MANTENER TODAS LAS FUNCIONES ORIGINALES ==========
    // (subirImagenAServidor, guardarImagenLocal, verificarURLAccesible, etc.)
    // ... resto del código original sin cambios ...
}

// Exportar la clase



    class InstagramMediaProcessor {
        constructor() {
            this.instagramToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            this.instagramBusinessAccountId = process.env.INSTAGRAM_IG_USER_ID;
            this.baseURL = 'https://graph.facebook.com/v21.0';
            
            // Horarios óptimos para publicación
            this.horariosOptimos = [
                { inicio: 9, fin: 11 },   // Mañana
                { inicio: 14, fin: 16 },  // Tarde
                { inicio: 19, fin: 21 }   // Noche
            ];
            
            // Validar configuración inicial
            this.validarConfiguracion();
        }

        validarConfiguracion() {
            if (!this.instagramToken) {
                console.warn('[INSTAGRAM] ⚠️ INSTAGRAM_ACCESS_TOKEN no configurado');
            }
            if (!this.instagramBusinessAccountId) {
                console.warn('[INSTAGRAM] ⚠️ INSTAGRAM_IG_USER_ID no configurado');
            }
        }

        async publicarStory(mediaId, caption = null) {
            try {
                console.log(`[INSTAGRAM] Publicando Story con media ID: ${mediaId}`);
                
                const payload = {
                    media_id: mediaId,
                    access_token: this.instagramToken
                };

                if (caption) {
                    payload.caption = caption;
                }

                const response = await axios.post(
                    `${this.baseURL}/${this.instagramBusinessAccountId}/media_publish`,
                    payload,
                    {
                        timeout: 30000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('[INSTAGRAM] ✅ Story publicado exitosamente');
                return {
                    success: true,
                    story_id: response.data.id
                };

            } catch (error) {
                console.error('[INSTAGRAM] Error publicando Story:', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
                
                return {
                    success: false,
                    error: error.response?.data?.error?.message || error.message
                };
            }
        }

        async subirImagenAServidor(imageBuffer) {
            try {
                const timestamp = Date.now();
                
                // Método 1: ImgBB (si está configurado)
                const imgbbApiKey = process.env.IMGBB_API_KEY;
                if (imgbbApiKey) {
                    try {
                        const formData = new FormData();
                        formData.append('image', imageBuffer.toString('base64'));
                        
                        const response = await axios.post(
                            `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, 
                            formData,
                            {
                                timeout: 30000,
                                headers: formData.getHeaders()
                            }
                        );
                        
                        if (response.data.success) {
                            console.log('[INSTAGRAM] ✅ Imagen subida a ImgBB exitosamente');
                            
                            // Programar limpieza automática
                            setTimeout(() => {
                                console.log('[CLEANUP] Imagen en ImgBB expirará automáticamente');
                            }, 60 * 60 * 1000); // 1 hora
                            
                            return response.data.data.url;
                        }
                    } catch (imgbbError) {
                        console.log(`[WARNING] ImgBB falló: ${imgbbError.message}`);
                    }
                }

                // Método 2: NGROK (si está configurado)
                const ngrokUrl = process.env.PUBLIC_URL || 'https://whatsapp-simbolico.ngrok.app';
                if (ngrokUrl && ngrokUrl.includes('ngrok')) {
                    try {
                        const imagePath = await this.guardarImagenLocal(imageBuffer, timestamp);
                        const imageUrl = `${ngrokUrl}/temp_images/instagram_${timestamp}.jpg`;
                        console.log(`[INSTAGRAM] Imagen disponible vía NGROK: ${imageUrl}`);
                        return imageUrl;
                    } catch (ngrokError) {
                        console.log(`[WARNING] NGROK falló: ${ngrokError.message}`);
                    }
                }

                // Método 3: Servidor temporal local
                console.log('[INSTAGRAM] Usando método de servidor temporal...');
                return await this.subirImagenBase64Directo(imageBuffer);

            } catch (error) {
                console.error('[ERROR] Error en todas las opciones de subida:', error.message);
                throw new Error('No se pudo subir la imagen a ningún servicio');
            }
        }

        async guardarImagenLocal(imageBuffer, timestamp) {
            try {
                const imagePath = path.join(__dirname, `../temp_images/instagram_${timestamp}.jpg`);
                const tempDir = path.dirname(imagePath);
                
                // Crear directorio si no existe
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                // Guardar imagen
                fs.writeFileSync(imagePath, imageBuffer);
                
                // Programar limpieza automática
                setTimeout(() => {
                    try {
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                            console.log(`[CLEANUP] Imagen local eliminada: ${imagePath}`);
                        }
                    } catch (e) {
                        console.log(`[WARNING] Error eliminando imagen: ${e.message}`);
                    }
                }, 30 * 60 * 1000); // 30 minutos
                
                return imagePath;
                
            } catch (error) {
                console.error('[ERROR] Error guardando imagen local:', error);
                throw error;
            }
        }

        async subirImagenBase64Directo(imageBuffer) {
            try {
                const app = express();
                const timestamp = Date.now();
                const endpoint = `/temp_instagram_${timestamp}.jpg`;

                app.get(endpoint, (req, res) => {
                    res.set({
                        'Content-Type': 'image/jpeg',
                        'Content-Length': imageBuffer.length,
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.send(imageBuffer);
                });

                const server = app.listen(0, () => {
                    const port = server.address().port;
                    console.log(`[INSTAGRAM] Servidor temporal iniciado en puerto ${port}`);
                });

                const port = server.address().port;
                const imageUrl = `http://localhost:${port}${endpoint}`;

                // Programar cierre del servidor
                setTimeout(() => {
                    server.close(() => {
                        console.log('[CLEANUP] Servidor temporal cerrado');
                    });
                }, 10 * 60 * 1000); // 10 minutos

                return imageUrl;

            } catch (error) {
                console.error('[ERROR] Error en método base64 directo:', error);
                throw error;
            }
        }

        async subirVideoAServidor(videoBuffer) {
            try {
                const timestamp = Date.now();
                
                // Método 1: NGROK (preferido para videos)
                const ngrokUrl = process.env.PUBLIC_URL || 'https://whatsapp-simbolico.ngrok.app';
                if (ngrokUrl && ngrokUrl.includes('ngrok')) {
                    try {
                        const videoPath = await this.guardarVideoLocal(videoBuffer, timestamp);
                        const videoUrl = `${ngrokUrl}/temp_videos/instagram_${timestamp}.mp4`;
                        console.log(`[VIDEO] Video disponible vía NGROK: ${videoUrl}`);
                        return videoUrl;
                    } catch (ngrokError) {
                        console.log(`[WARNING] NGROK para video falló: ${ngrokError.message}`);
                    }
                }
                
                // Método 2: Servidor temporal
                return await this.crearServidorTemporalVideo(videoBuffer, timestamp);
                
            } catch (error) {
                console.error('[ERROR] Error subiendo video:', error.message);
                throw new Error('No se pudo subir el video a ningún servicio');
            }
        }

        async guardarVideoLocal(videoBuffer, timestamp) {
            try {
                const videoPath = path.join(__dirname, `../temp_videos/instagram_${timestamp}.mp4`);
                const tempDir = path.dirname(videoPath);
                
                // Crear directorio si no existe
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                
                // Guardar video
                fs.writeFileSync(videoPath, videoBuffer);
                
                // Programar limpieza automática
                setTimeout(() => {
                    try {
                        if (fs.existsSync(videoPath)) {
                            fs.unlinkSync(videoPath);
                            console.log(`[CLEANUP] Video local eliminado: ${videoPath}`);
                        }
                    } catch (e) {
                        console.log(`[WARNING] Error eliminando video: ${e.message}`);
                    }
                }, 30 * 60 * 1000); // 30 minutos
                
                return videoPath;
                
            } catch (error) {
                console.error('[ERROR] Error guardando video local:', error);
                throw error;
            }
        }

        async crearServidorTemporalVideo(videoBuffer, timestamp) {
            try {
                const app = express();
                const endpoint = `/temp_video_${timestamp}.mp4`;

                app.get(endpoint, (req, res) => {
                    res.set({
                        'Content-Type': 'video/mp4',
                        'Content-Length': videoBuffer.length,
                        'Cache-Control': 'no-cache',
                        'Accept-Ranges': 'bytes',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.send(videoBuffer);
                });

                const server = app.listen(0, () => {
                    const port = server.address().port;
                    console.log(`[VIDEO] Servidor temporal para video en puerto ${port}`);
                });

                const port = server.address().port;
                const videoUrl = `http://localhost:${port}${endpoint}`;

                // Programar cierre del servidor
                setTimeout(() => {
                    server.close(() => {
                        console.log('[CLEANUP] Servidor temporal de video cerrado');
                    });
                }, 15 * 60 * 1000); // 15 minutos

                return videoUrl;

            } catch (error) {
                console.error('[ERROR] Error creando servidor temporal para video:', error);
                throw error;
            }
        }

        async verificarURLAccesible(url) {
            try {
                console.log(`[INSTAGRAM] Verificando acceso a URL: ${url}`);
                const response = await axios.head(url, {
                    timeout: 10000,
                    validateStatus: (status) => status < 400,
                    headers: {
                        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
                    }
                });
                console.log(`[INSTAGRAM] ✅ URL accesible - Status: ${response.status}`);
                return true;
            } catch (error) {
                console.log(`[INSTAGRAM] ❌ URL no accesible: ${error.message}`);
                return false;
            }
        }

        async subirImagenInstagram(imagenData) {
            try {
                // Procesar buffer de imagen
                let imageBuffer;
                if (typeof imagenData === 'string') {
                    imageBuffer = Buffer.from(imagenData, 'base64');
                } else if (imagenData.data) {
                    imageBuffer = Buffer.from(imagenData.data, 'base64');
                } else {
                    imageBuffer = imagenData;
                }

                console.log('[INSTAGRAM] Preparando imagen para Instagram API...');
                
                // Subir imagen a servidor temporal
                const tempImageUrl = await this.subirImagenAServidor(imageBuffer);
                if (!tempImageUrl) {
                    throw new Error('No se pudo generar URL para la imagen');
                }

                // Verificar que la URL sea accesible
                const esAccesible = await this.verificarURLAccesible(tempImageUrl);
                if (!esAccesible) {
                    throw new Error('La URL generada no es accesible por Instagram');
                }

                console.log(`[INSTAGRAM] URL verificada: ${tempImageUrl}`);

                // Crear media container en Instagram
                const response = await axios.post(
                    `${this.baseURL}/${this.instagramBusinessAccountId}/media`,
                    {
                        image_url: tempImageUrl,
                        access_token: this.instagramToken
                    },
                    {
                        timeout: 30000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log('[INSTAGRAM] ✅ Imagen enviada a Instagram correctamente');
                return {
                    success: true,
                    media_id: response.data.id
                };

            } catch (error) {
                console.error('[INSTAGRAM] Error detallado subiendo imagen:', {
                    message: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data
                });
                
                return {
                    success: false,
                    error: `${error.message} (Status: ${error.response?.status || 'unknown'})`
                };
            }
        }

        async subirVideoInstagram(videoPath) {
            try {
                console.log('[INSTAGRAM] Subiendo video a Instagram...');
                
                // Leer archivo de video
                const videoBuffer = fs.readFileSync(videoPath);
                
                // Subir video a servidor temporal
                const videoUrl = await this.subirVideoAServidor(videoBuffer);
                if (!videoUrl) {
                    throw new Error('No se pudo generar URL para el video');
                }

                // Verificar que la URL sea accesible
                const esAccesible = await this.verificarURLAccesible(videoUrl);
                if (!esAccesible) {
                    throw new Error('La URL del video no es accesible por Instagram');
                }

                console.log(`[INSTAGRAM] Video URL verificada: ${videoUrl}`);

                // Crear media container en Instagram
                const response = await axios.post(
                    `${this.baseURL}/${this.instagramBusinessAccountId}/media`,
                    {
                        video_url: videoUrl,
                        media_type: 'VIDEO',
                        access_token: this.instagramToken
                    },
                    {
                        timeout: 60000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                return {
                    success: true,
                    media_id: response.data.id
                };

            } catch (error) {
                console.error('[INSTAGRAM] Error subiendo video:', error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        async verificarConfiguracionCompleta() {
            try {
                console.log('[INSTAGRAM] Verificando configuración completa...');
                
                // Verificar variables de entorno
                const requiredVars = [
                    'INSTAGRAM_ACCESS_TOKEN',
                    'INSTAGRAM_IG_USER_ID'
                ];
                
                const missingVars = [];
                for (const varName of requiredVars) {
                    if (!process.env[varName]) {
                        missingVars.push(varName);
                    }
                }
                
                if (missingVars.length > 0) {
                    console.log(`[INSTAGRAM] ❌ Variables faltantes: ${missingVars.join(', ')}`);
                    return false;
                }
                
                // Verificar acceso a la API
                const response = await axios.get(
                    `${this.baseURL}/${this.instagramBusinessAccountId}`,
                    {
                        params: {
                            fields: 'username',
                            access_token: this.instagramToken
                        },
                        timeout: 10000
                    }
                );
                
                if (response.data && response.data.username) {
                    console.log(`[INSTAGRAM] ✅ Configuración válida para @${response.data.username}`);
                    return true;
                } else {
                    console.log('[INSTAGRAM] ❌ Respuesta API inválida');
                    return false;
                }
                
            } catch (error) {
                console.log(`[INSTAGRAM] ❌ Error verificando configuración: ${error.message}`);
                return false;
            }
        }

        async publicarImagenEnStories(imagenData, caption = null) {
            try {
                console.log('[INSTAGRAM] === INICIANDO PUBLICACIÓN DE IMAGEN EN STORIES ===');
                
                // 1. Verificar configuración antes de proceder
                const configOK = await this.verificarConfiguracionCompleta();
                if (!configOK) {
                    throw new Error('Configuración de Instagram no válida');
                }
                
                // 2. Subir imagen a Instagram
                console.log('[INSTAGRAM] Subiendo imagen...');
                const mediaResponse = await this.subirImagenInstagram(imagenData);
                if (!mediaResponse.success) {
                    throw new Error(`Error subiendo imagen: ${mediaResponse.error}`);
                }
                
                console.log(`[INSTAGRAM] ✅ Imagen subida con media ID: ${mediaResponse.media_id}`);
                
                // 3. Publicar como Story
                console.log('[INSTAGRAM] Publicando como Story...');
                const storyResponse = await this.publicarStory(mediaResponse.media_id, caption);
                
                if (storyResponse.success) {
                    console.log(`[INSTAGRAM] ✅ Story de imagen publicado: ${storyResponse.story_id}`);
                    
                    // Guardar registro
                    await this.registrarPublicacion({
                        story_id: storyResponse.story_id,
                        media_id: mediaResponse.media_id,
                        timestamp: new Date().toISOString(),
                        caption: caption,
                        tipo: 'imagen'
                    });
                    
                    return {
                        success: true,
                        story_id: storyResponse.story_id,
                        mensaje: `🎉 ¡Imagen publicada exitosamente en Instagram Stories!\n\n📱 @playmallmcbo\n🆔 Story ID: ${storyResponse.story_id}\n⏰ ${new Date().toLocaleString()}\n\n✨ La imagen ya está visible para nuestros seguidores`
                    };
                } else {
                    throw new Error(`Error publicando Story de imagen: ${storyResponse.error}`);
                }
                
            } catch (error) {
                console.error('[INSTAGRAM] ❌ Error publicando imagen en Stories:', error.message);
                return {
                    success: false,
                    error: error.message,
                    mensaje: `❌ Error publicando imagen en Instagram Stories:\n\n🔧 ${error.message}\n\n📋 Verificar:\n• Configuración de Instagram Business API\n• Tokens de acceso válidos\n• Conectividad de red\n• Formato de imagen soportado`
                };
            }
        }

        async publicarEnInstagramStories(videoPath, caption = null) {
            try {
                console.log('[INSTAGRAM] === INICIANDO PUBLICACIÓN DE VIDEO EN STORIES ===');
                console.log(`[INSTAGRAM] Video path: ${videoPath}`);
                
                // 1. Verificar que el archivo existe
                if (!fs.existsSync(videoPath)) {
                    throw new Error(`Video no encontrado: ${videoPath}`);
                }
                
                // 2. Verificar configuración
                const configOK = await this.verificarConfiguracionCompleta();
                if (!configOK) {
                    throw new Error('Configuración de Instagram no válida');
                }
                
                // 3. Subir video a Instagram
                console.log('[INSTAGRAM] Subiendo video...');
                const mediaResponse = await this.subirVideoInstagram(videoPath);
                if (!mediaResponse.success) {
                    throw new Error(`Error subiendo video: ${mediaResponse.error}`);
                }
                
                console.log(`[INSTAGRAM] ✅ Video subido con media ID: ${mediaResponse.media_id}`);
                
                // 4. Publicar como Story
                console.log('[INSTAGRAM] Publicando video como Story...');
                const storyResponse = await this.publicarStory(mediaResponse.media_id, caption);
                
                if (storyResponse.success) {
                    console.log(`[INSTAGRAM] ✅ Story de video publicado: ${storyResponse.story_id}`);
                    
                    // Guardar registro de publicación
                    await this.registrarPublicacion({
                        story_id: storyResponse.story_id,
                        media_id: mediaResponse.media_id,
                        timestamp: new Date().toISOString(),
                        caption: caption,
                        video_path: videoPath,
                        tipo: 'video'
                    });
                    
                    return {
                        success: true,
                        story_id: storyResponse.story_id,
                        mensaje: `🎉 ¡Video publicado exitosamente en Instagram Stories!\n\n📱 @playmallmcbo\n🆔 Story ID: ${storyResponse.story_id}\n⏰ ${new Date().toLocaleString()}\n\n🎬 El video ya está visible para nuestros seguidores`
                    };
                } else {
                    throw new Error(`Error publicando Story de video: ${storyResponse.error}`);
                }
                
            } catch (error) {
                console.error('[INSTAGRAM] ❌ Error publicando video en Stories:', error.message);
                return {
                    success: false,
                    error: error.message,
                    mensaje: `❌ Error publicando video en Instagram Stories:\n\n🔧 ${error.message}\n\n📋 Verificar:\n• Archivo de video existe y es accesible\n• Configuración de Instagram Business API\n• Tokens de acceso válidos\n• Formato de video soportado (MP4 recomendado)`
                };
            }
        }

        async registrarPublicacion(datosPublicacion) {
            try {
                const logsDir = path.join(__dirname, '../logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }
                
                const registroPath = path.join(logsDir, 'instagram_publications.jsonl');
                const registro = JSON.stringify(datosPublicacion) + '\n';
                
                fs.appendFileSync(registroPath, registro, 'utf8');
                console.log('[INSTAGRAM] ✅ Publicación registrada en logs');
                
            } catch (error) {
                console.error('[INSTAGRAM] ❌ Error registrando publicación:', error.message);
            }
        }

        esHorarioOptimo() {
            const horaActual = new Date().getHours();
            
            return this.horariosOptimos.some(horario => 
                horaActual >= horario.inicio && horaActual <= horario.fin
            );
        }

        async debugConfiguracionInstagram() {
            console.log('[INSTAGRAM DEBUG] === VERIFICANDO CONFIGURACIÓN ===');
            
            // 1. Verificar variables de entorno
            console.log('[DEBUG] TOKEN:', this.instagramToken ? 'CONFIGURADO' : '❌ FALTANTE');
            console.log('[DEBUG] BUSINESS ID:', this.instagramBusinessAccountId ? 'CONFIGURADO' : '❌ FALTANTE');
            console.log('[DEBUG] BASE URL:', this.baseURL);
            
            // 2. Probar acceso básico a la API
            try {
                const response = await axios.get(
                    `${this.baseURL}/${this.instagramBusinessAccountId}`,
                    {
                        params: {
                            fields: 'username,name,profile_picture_url,followers_count',
                            access_token: this.instagramToken
                        },
                        timeout: 10000
                    }
                );
                
                console.log('[DEBUG] ✅ API ACCESO OK');
                console.log('[DEBUG] Username:', response.data.username);
                console.log('[DEBUG] Tipo cuenta:', response.data.account_type);
                console.log('[DEBUG] Nombre:', response.data.name);
                
            } catch (error) {
                console.log('[DEBUG] ❌ ERROR API:', error.response?.data || error.message);
                
                if (error.response?.status === 400) {
                    console.log('[DEBUG] Error 400 - Verificar:');
                    console.log('   • TOKEN válido y no expirado');
                    console.log('   • BUSINESS_ACCOUNT_ID correcto');
                    console.log('   • Permisos de Instagram Basic Display');
                }
            }

            // 3. Verificar permisos
            try {
                const permisosResponse = await axios.get(
                    `${this.baseURL}/me/permissions`,
                    {
                        params: {
                            access_token: this.instagramToken
                        },
                        timeout: 10000
                    }
                );
                
                console.log('[DEBUG] Permisos:', permisosResponse.data.data.map(p => p.permission));
                
            } catch (error) {
                console.log('[DEBUG] No se pudieron verificar permisos:', error.message);
            }

            console.log('[INSTAGRAM DEBUG] === FIN VERIFICACIÓN ===');
        }
    }



    module.exports = {
        InstagramMediaProcessor,
        InstagramStoriesAutomation
    };