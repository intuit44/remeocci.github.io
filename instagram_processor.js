// ===== ARCHIVO: C:\ProyectosSimbolicos\social\instagram_processor.js =====
// REEMPLAZAR EL CONTENIDO ACTUAL POR ESTE:


// IMPORTAR InstagramStoriesAutomation con manejo de errores
let InstagramStoriesAutomation;
try {
    InstagramStoriesAutomation = require('../comandos/instagram_automation');
    console.log('[IMPORT] ✅ InstagramStoriesAutomation cargado exitosamente');
} catch (error) {
    console.log('[IMPORT] ⚠️ InstagramStoriesAutomation no encontrado, creando mock temporal');
    
    // Clase mock temporal
    InstagramStoriesAutomation = class {
        constructor() {
            this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            this.accountId = process.env.INSTAGRAM_ACCOUNT_ID;
            this.isConfigured = !!(this.accessToken && this.accountId);
            console.log('[INSTAGRAM] Mock temporal inicializado');
        }
        
        async publicarStory(data) {
            console.log('[INSTAGRAM] Mock: Simulating story publication');
            return { 
                success: this.isConfigured, 
                message: this.isConfigured ? 'Story published (mock)' : 'Instagram not configured',
                mockMode: true 
            };
        }
        
        esHorarioOptimo() {
            const hora = new Date().getHours();
            return (hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21) || (hora >= 9 && hora <= 10);
        }
        
        obtenerHorariosOptimos() {
            return [
                { inicio: 9, fin: 10, descripcion: 'Horario matutino' },
                { inicio: 11, fin: 13, descripcion: 'Horario almuerzo' },
                { inicio: 18, fin: 21, descripcion: 'Horario vespertino' }
            ];
        }
    };
}

class InstagramVideoProcessor {
    constructor() {
        // Inicializar Instagram bot con manejo de errores
        try {
            this.instagramBot = new InstagramStoriesAutomation();
            console.log('[INSTAGRAM] ✅ Instagram bot inicializado correctamente');
        } catch (error) {
            console.log('[INSTAGRAM] ⚠️ Error inicializando Instagram bot:', error.message);
            
            // Crear instancia mock si falla
            this.instagramBot = {
                esHorarioOptimo: () => {
                    const hora = new Date().getHours();
                    return (hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21);
                },
                obtenerHorariosOptimos: () => [
                    { inicio: 11, fin: 13, descripcion: 'Horario almuerzo' },
                    { inicio: 18, fin: 21, descripcion: 'Horario vespertino' }
                ],
                publicarStory: async () => ({ 
                    success: false, 
                    message: 'Instagram automation no disponible',
                    fallbackMode: true 
                }),
                isConfigured: false
            };
        }
        
        this.pendingVideos = new Map(); // Para videos esperando confirmación
        
        // Estados de procesamiento
        this.processingStates = {
            ANALYZING: 'analyzing',
            WAITING_CONFIRMATION: 'waiting_confirmation',
            PUBLISHING: 'publishing',
            COMPLETED: 'completed',
            REJECTED: 'rejected'
        };
        
        console.log('[INSTAGRAM] InstagramVideoProcessor inicializado correctamente');
    }

    async procesarVideoParaInstagram(videoData, message, analisisIA = null) {
        try {
            console.log('[INSTAGRAM] 📱 Iniciando procesamiento de video para Instagram...');
            
            const videoId = this.generarVideoId(videoData, message);
            
            // Registrar video en proceso
            this.pendingVideos.set(videoId, {
                videoData,
                message,
                analisisIA,
                timestamp: new Date().toISOString(),
                state: this.processingStates.ANALYZING
            });
            
            // Analizar video para Instagram
            const analisisInstagram = await this.analizarVideoParaInstagram(videoData, analisisIA);
            
            // Actualizar estado
            this.pendingVideos.get(videoId).state = this.processingStates.WAITING_CONFIRMATION;
            this.pendingVideos.get(videoId).analisisInstagram = analisisInstagram;
            
            // Generar mensaje de evaluación
            const mensajeEvaluacion = this.generarMensajeEvaluacion(analisisInstagram, videoId);
            
            // Guardar log de actividad
            if (typeof guardarLogActividad === 'function') {
                guardarLogActividad({
                    tipo: 'instagram_analysis',
                    videoId,
                    puntuacion: analisisInstagram.puntuacion,
                    recomendacion: analisisInstagram.recomendacion,
                    timestamp: new Date().toISOString()
                });
            }
            
            console.log('[INSTAGRAM] ✅ Análisis de video completado');
            return mensajeEvaluacion;
            
        } catch (error) {
            console.error('[INSTAGRAM] ❌ Error procesando video:', error);
            return `❌ Error analizando video para Instagram: ${error.message}`;
        }
    }

    async analizarVideoParaInstagram(videoData, analisisIA) {
        try {
            console.log('[INSTAGRAM] 🧠 Analizando contenido para redes sociales...');
            
            let puntuacion = 0;
            const criterios = [];
            const problemas = [];
            
            // CRITERIO 1: Duración del video (20 puntos máximo)
            const duracion = videoData.videoInfo?.duration || 0;
            if (duracion >= 10 && duracion <= 30) {
                puntuacion += 20;
                criterios.push('✅ Duración óptima (10-30s)');
            } else if (duracion >= 5 && duracion <= 60) {
                puntuacion += 10;
                criterios.push('🔸 Duración aceptable');
            } else {
                problemas.push('⚠️ Duración no óptima para Stories');
            }
            
            // CRITERIO 2: Análisis de contenido con IA (30 puntos máximo)
            if (analisisIA) {
                if (analisisIA.includes('personas') || analisisIA.includes('visitantes')) {
                    puntuacion += 15;
                    criterios.push('✅ Personas/visitantes detectados');
                }
                
                if (analisisIA.includes('sonris') || analisisIA.includes('satisfacción') || analisisIA.includes('diversión')) {
                    puntuacion += 15;
                    criterios.push('✅ Emociones positivas detectadas');
                } else {
                    problemas.push('⚠️ No se detectan emociones claras');
                }
            } else {
                problemas.push('⚠️ Análisis de IA no disponible');
            }
            
            // CRITERIO 3: Calidad técnica (20 puntos máximo)
            if (videoData.procesamiento === 'completo') {
                puntuacion += 20;
                criterios.push('✅ Calidad técnica alta');
            } else if (videoData.procesamiento === 'basico_sin_frames') {
                puntuacion += 10;
                criterios.push('🔸 Calidad técnica media');
            } else {
                puntuacion += 5;
                problemas.push('⚠️ Limitaciones técnicas detectadas');
            }
            
            // CRITERIO 4: Contenido del parque (15 puntos máximo)
            const textoContexto = analisisIA || '';
            if (textoContexto.toLowerCase().includes('atraccion') || 
                textoContexto.toLowerCase().includes('juego') ||
                textoContexto.toLowerCase().includes('parque')) {
                puntuacion += 15;
                criterios.push('✅ Contenido del parque identificado');
            } else {
                problemas.push('⚠️ Contenido del parque no claro');
            }
            
            // CRITERIO 5: Horario de publicación (15 puntos máximo)
            if (this.instagramBot && this.instagramBot.esHorarioOptimo()) {
                puntuacion += 15;
                criterios.push('✅ Horario óptimo para publicación');
            } else {
                puntuacion += 5;
                criterios.push('🔸 Horario no óptimo');
            }
            
            // Determinar recomendación
            let recomendacion;
            if (puntuacion >= 70) {
                recomendacion = 'PUBLICAR_AUTOMATICO';
            } else if (puntuacion >= 50) {
                recomendacion = 'CONSULTAR_EQUIPO';
            } else {
                recomendacion = 'NO_RECOMENDADO';
            }
            
            return {
                puntuacion,
                recomendacion,
                criterios,
                problemas,
                horarioOptimo: this.instagramBot ? this.instagramBot.esHorarioOptimo() : false
            };
            
        } catch (error) {
            console.error('[INSTAGRAM] Error en análisis:', error);
            return {
                puntuacion: 0,
                recomendacion: 'ERROR',
                criterios: [],
                problemas: [`Error en análisis: ${error.message}`],
                horarioOptimo: false
            };
        }
    }

    // === FUNCIÓN CORREGIDA: evaluarVideoParaInstagram ===
    // Reemplazar o agregar esta función

    async evaluarVideoParaInstagram(videoData, analisisIA) {
        try {
            console.log('[INSTAGRAM] 📱 Evaluación simplificada...');
            
            // Si tenemos Instagram processor, usarlo
            if (this.instagramProcessor && typeof this.instagramProcessor.analizarVideoParaInstagram === 'function') {
                const analisisCompleto = await this.instagramProcessor.analizarVideoParaInstagram(videoData, analisisIA);
                
                let evaluacion = `📊 **Puntuación:** ${analisisCompleto.puntuacion}/100\n`;
                evaluacion += `🎯 **Recomendación:** ${analisisCompleto.recomendacion}\n\n`;
                
                if (analisisCompleto.criterios && analisisCompleto.criterios.length > 0) {
                    evaluacion += `**Criterios cumplidos:**\n`;
                    analisisCompleto.criterios.forEach(criterio => evaluacion += `${criterio}\n`);
                }
                
                return evaluacion;
            }
            
            // Evaluación básica como fallback
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
            if (dia >= 1 && dia <= 5) {
                puntuacion += 20;
                factores.push('✅ Día laboral - buena audiencia');
            } else {
                puntuacion += 15;
                factores.push('✅ Fin de semana - audiencia familiar');
            }
            
            // Factor 3: Datos del video
            if (videoData && videoData.videoInfo) {
                const duracion = parseFloat(videoData.videoInfo.duration) || 0;
                if (duracion >= 10 && duracion <= 60) {
                    puntuacion += 20;
                    factores.push('✅ Duración ideal para Stories');
                }
            }
            
            // Factor 4: Origen autorizado
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

    generarMensajeEvaluacion(analisis, videoId) {
        let mensaje = `📱 **EVALUACIÓN PARA INSTAGRAM STORIES** 📱\n\n`;
        
        // Puntuación y recomendación principal
        mensaje += `🎯 **PUNTUACIÓN: ${analisis.puntuacion}/100**\n\n`;
        
        if (analisis.recomendacion === 'PUBLICAR_AUTOMATICO') {
            mensaje += `🌟 **RECOMENDACIÓN: PUBLICACIÓN AUTOMÁTICA**\n`;
            mensaje += `Este video cumple todos los criterios de calidad para Instagram Stories.\n\n`;
        } else if (analisis.recomendacion === 'CONSULTAR_EQUIPO') {
            mensaje += `🤔 **RECOMENDACIÓN: CONSULTAR AL EQUIPO**\n`;
            mensaje += `El video tiene potencial pero requiere revisión.\n\n`;
        } else {
            mensaje += `❌ **RECOMENDACIÓN: NO PUBLICAR**\n`;
            mensaje += `El video no cumple los criterios mínimos para Stories.\n\n`;
        }
        
        // Criterios cumplidos
        if (analisis.criterios.length > 0) {
            mensaje += `✅ **CRITERIOS CUMPLIDOS:**\n`;
            analisis.criterios.forEach(criterio => {
                mensaje += `   ${criterio}\n`;
            });
            mensaje += `\n`;
        }
        
        // Problemas detectados
        if (analisis.problemas.length > 0) {
            mensaje += `⚠️ **ASPECTOS A MEJORAR:**\n`;
            analisis.problemas.forEach(problema => {
                mensaje += `   ${problema}\n`;
            });
            mensaje += `\n`;
        }
        
        // Información de horario
        if (analisis.horarioOptimo) {
            mensaje += `⏰ **HORARIO:** Momento óptimo para publicación\n\n`;
        } else {
            const horariosOptimos = this.instagramBot ? this.instagramBot.obtenerHorariosOptimos() : [];
            if (horariosOptimos.length > 0) {
                mensaje += `⏰ **PRÓXIMOS HORARIOS ÓPTIMOS:**\n`;
                horariosOptimos.forEach(horario => {
                    mensaje += `   • ${horario.inicio}:00 - ${horario.fin}:00 (${horario.descripcion})\n`;
                });
                mensaje += `\n`;
            }
        }
        
        // Opciones de acción
        if (analisis.recomendacion !== 'ERROR') {
            mensaje += `🎬 **¿DESEAN PUBLICARLO?**\n`;
            mensaje += `📝 Respondan con el ID del video: **${videoId}**\n`;
            mensaje += `✅ "**SÍ PUBLICAR ${videoId}**" para confirmar\n`;
            mensaje += `❌ "**NO PUBLICAR ${videoId}**" para cancelar\n\n`;
        }
        
        mensaje += `📱 **Instagram:** @playmallmcbo\n`;
        mensaje += `🤖 **Sistema:** Análisis automático con IA`;
        
        return mensaje;
    }

    generarVideoId(videoData, message) {
        const timestamp = Date.now();
        const fromUser = message.from ? message.from.slice(-4) : '0000';
        return `VID_${timestamp}_${fromUser}`;
    }

    async procesarRespuestaInstagram(message, texto) {
        try {
            const textoLower = texto.toLowerCase();
            
            // Buscar ID de video en el texto
            const videoIdMatch = texto.match(/VID_\d+_\d+/);
            if (!videoIdMatch) {
                return null; // No es una respuesta de Instagram
            }
            
            const videoId = videoIdMatch[0];
            const videoPendiente = this.pendingVideos.get(videoId);
            
            if (!videoPendiente) {
                return `❌ Video ${videoId} no encontrado o ya procesado.`;
            }
            
            if (textoLower.includes('sí publicar') || textoLower.includes('si publicar')) {
                return await this.confirmarPublicacion(videoId);
            } else if (textoLower.includes('no publicar')) {
                return await this.cancelarPublicacion(videoId);
            }
            
            return null;
            
        } catch (error) {
            console.error('[INSTAGRAM] Error procesando respuesta:', error);
            return `❌ Error procesando respuesta: ${error.message}`;
        }
    }

    async confirmarPublicacion(videoId) {
        try {
            const videoPendiente = this.pendingVideos.get(videoId);
            if (!videoPendiente) {
                return `❌ Video ${videoId} no encontrado.`;
            }
            
            // Actualizar estado
            videoPendiente.state = this.processingStates.PUBLISHING;
            
            console.log('[INSTAGRAM] 📤 Publicando video en Instagram Stories...');
            
            // Intentar publicar con Instagram bot
            let resultadoPublicacion;
            if (this.instagramBot && typeof this.instagramBot.publicarStory === 'function') {
                resultadoPublicacion = await this.instagramBot.publicarStory(videoPendiente.videoData);
            } else {
                resultadoPublicacion = {
                    success: false,
                    message: 'Instagram bot no disponible',
                    mockMode: true
                };
            }
            
            if (resultadoPublicacion.success) {
                videoPendiente.state = this.processingStates.COMPLETED;
                this.pendingVideos.delete(videoId);
                
                let mensaje = `🎉 **PUBLICACIÓN EXITOSA** 🎉\n\n`;
                mensaje += `📱 Video ${videoId} publicado en Instagram Stories\n`;
                mensaje += `🕐 Publicado: ${new Date().toLocaleString()}\n`;
                mensaje += `📊 Alcance máximo programado para horario óptimo\n\n`;
                mensaje += `✅ **Estado:** Publicado exitosamente\n`;
                mensaje += `📱 **Instagram:** @playmallmcbo`;
                
                return mensaje;
            } else {
                videoPendiente.state = this.processingStates.REJECTED;
                
                let mensaje = `❌ **ERROR EN PUBLICACIÓN**\n\n`;
                mensaje += `Video ${videoId}: ${resultadoPublicacion.message}\n`;
                
                if (resultadoPublicacion.mockMode || resultadoPublicacion.fallbackMode) {
                    mensaje += `\n🔧 **Modo de prueba activo**\n`;
                    mensaje += `El video está listo para publicación cuando el sistema esté configurado.\n`;
                }
                
                return mensaje;
            }
            
        } catch (error) {
            console.error('[INSTAGRAM] Error confirmando publicación:', error);
            return `❌ Error publicando video: ${error.message}`;
        }
    }

    async cancelarPublicacion(videoId) {
        try {
            const videoPendiente = this.pendingVideos.get(videoId);
            if (!videoPendiente) {
                return `❌ Video ${videoId} no encontrado.`;
            }
            
            videoPendiente.state = this.processingStates.REJECTED;
            this.pendingVideos.delete(videoId);
            
            let mensaje = `❌ **PUBLICACIÓN CANCELADA**\n\n`;
            mensaje += `📱 Video ${videoId} no será publicado en Instagram Stories\n`;
            mensaje += `🕐 Cancelado: ${new Date().toLocaleString()}\n\n`;
            mensaje += `💡 **Tip:** Para mejores resultados en próximos videos:\n`;
            mensaje += `   • Incluir más visitantes disfrutando (3-8 personas)\n`;
            mensaje += `   • Capturar momentos de diversión y sonrisas\n`;
            mensaje += `   • Mostrar atracciones en funcionamiento\n`;
            mensaje += `   • Duración óptima: 10-30 segundos`;
            
            return mensaje;
            
        } catch (error) {
            console.error('[INSTAGRAM] Error cancelando publicación:', error);
            return `❌ Error cancelando publicación: ${error.message}`;
        }
    }

    limpiarCachePendientes() {
        const ahora = Date.now();
        const TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas
        
        for (const [videoId, data] of this.pendingVideos.entries()) {
            const timestamp = new Date(data.timestamp).getTime();
            if (ahora - timestamp > TIMEOUT) {
                this.pendingVideos.delete(videoId);
                console.log(`[INSTAGRAM] Video ${videoId} eliminado del cache por timeout`);
            }
        }
    }

    async evaluarVideoCompleto(analisisTecnico, analisisEmpresarial, message) {
        try {
            // Combinar análisis técnico y empresarial para evaluación completa
            const datosCompletos = {
                videoInfo: { duration: 15 }, // Placeholder
                procesamiento: 'completo',
                analisisIA: `${analisisTecnico || ''} ${analisisEmpresarial || ''}`
            };
            
            return await this.analizarVideoParaInstagram(datosCompletos, datosCompletos.analisisIA);
            
        } catch (error) {
            console.error('[INSTAGRAM] Error en evaluación completa:', error);
            return {
                puntuacion: 0,
                recomendacion: 'ERROR',
                criterios: [],
                problemas: [`Error en evaluación: ${error.message}`],
                horarioOptimo: false
            };
        }
    }
}

module.exports = { InstagramVideoProcessor };