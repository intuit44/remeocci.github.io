// CREAR ARCHIVO: comandos/InstagramMediaProcessor.js

const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');

// Configurar ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

class InstagramMediaProcessor {
    constructor() {
        // Dimensiones exactas para Instagram Stories
        this.STORIES_WIDTH = 1080;
        this.STORIES_HEIGHT = 1920;
        this.STORIES_ASPECT_RATIO = 9/16; // 0.5625
        
        // Rangos aceptables por Instagram
        this.MIN_ASPECT_RATIO = 0.5;
        this.MAX_ASPECT_RATIO = 0.9;
        
        console.log('[PROCESSOR] Sistema de redimensionamiento inicializado');
        this.verificarDependencias();
    }
    
    // ============ PROCESAMIENTO DE IMÁGENES ============
    
    async procesarImagenParaStories(imagenData) {
        try {
            console.log('[PROCESSOR] === PROCESANDO IMAGEN PARA STORIES ===');
            
            // 1. Convertir datos de imagen a buffer
            let imageBuffer;
            if (typeof imagenData === 'string') {
                imageBuffer = Buffer.from(imagenData, 'base64');
            } else if (imagenData.data) {
                imageBuffer = Buffer.from(imagenData.data, 'base64');
            } else {
                imageBuffer = imagenData;
            }
            
            // 2. Obtener metadatos de la imagen original
            const metadata = await sharp(imageBuffer).metadata();
            console.log(`[PROCESSOR] Imagen original: ${metadata.width}x${metadata.height}`);
            console.log(`[PROCESSOR] Aspecto original: ${(metadata.width/metadata.height).toFixed(3)}`);
            
            // 3. Verificar si necesita redimensionamiento
            const aspectoOriginal = metadata.width / metadata.height;
            
            if (this.esAspectoValido(aspectoOriginal)) {
                console.log('[PROCESSOR] ✅ Aspecto válido - Solo optimizando calidad...');
                return await this.optimizarCalidadImagen(imageBuffer);
            }
            
            // 4. Redimensionar para Stories
            console.log('[PROCESSOR] 🔧 Redimensionando para Instagram Stories...');
            const imagenRedimensionada = await this.redimensionarParaStories(imageBuffer);
            
            console.log('[PROCESSOR] ✅ Imagen procesada exitosamente');
            return imagenRedimensionada;
            
        } catch (error) {
            console.error('[PROCESSOR] ❌ Error procesando imagen:', error.message);
            throw new Error(`Error redimensionando imagen: ${error.message}`);
        }
    }
    
    async redimensionarParaStories(imageBuffer) {
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const aspectoOriginal = metadata.width / metadata.height;
            
            let strategy;
            
            if (aspectoOriginal > this.STORIES_ASPECT_RATIO) {
                // Imagen más ancha - crop horizontal, blur background
                strategy = 'crop_with_blur_background';
            } else {
                // Imagen más alta - fit vertical
                strategy = 'fit_vertical';
            }
            
            console.log(`[PROCESSOR] Estrategia: ${strategy}`);
            
            switch (strategy) {
                case 'crop_with_blur_background':
                    return await this.crearStoriesConFondoBorroso(imageBuffer);
                    
                case 'fit_vertical':
                    return await this.ajustarVertical(imageBuffer);
                    
                default:
                    return await this.redimensionarSimple(imageBuffer);
            }
            
        } catch (error) {
            console.error('[PROCESSOR] Error en redimensionamiento:', error);
            throw error;
        }
    }
    
    async crearStoriesConFondoBorroso(imageBuffer) {
        try {
            console.log('[PROCESSOR] Creando Stories con fondo borroso...');
            
            // 1. Crear fondo borroso escalado
            const fondoBorroso = await sharp(imageBuffer)
                .resize(this.STORIES_WIDTH, this.STORIES_HEIGHT, {
                    fit: 'cover',
                    position: 'center'
                })
                .blur(20)
                .jpeg({ quality: 85 })
                .toBuffer();
            
            // 2. Crear imagen principal centrada
            const imagenPrincipal = await sharp(imageBuffer)
                .resize(this.STORIES_WIDTH - 100, this.STORIES_HEIGHT - 200, {
                    fit: 'inside',
                    withoutEnlargement: false
                })
                .jpeg({ quality: 90 })
                .toBuffer();
            
            // 3. Combinar fondo borroso + imagen principal
            const resultado = await sharp(fondoBorroso)
                .composite([{
                    input: imagenPrincipal,
                    gravity: 'center'
                }])
                .jpeg({ quality: 90 })
                .toBuffer();
            
            console.log('[PROCESSOR] ✅ Stories con fondo borroso creado');
            return resultado;
            
        } catch (error) {
            console.error('[PROCESSOR] Error creando fondo borroso:', error);
            throw error;
        }
    }
    
    async ajustarVertical(imageBuffer) {
        try {
            console.log('[PROCESSOR] Ajustando imagen vertical...');
            
            const resultado = await sharp(imageBuffer)
                .resize(this.STORIES_WIDTH, this.STORIES_HEIGHT, {
                    fit: 'inside',
                    position: 'center',
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                })
                .jpeg({ quality: 90 })
                .toBuffer();
            
            console.log('[PROCESSOR] ✅ Imagen vertical ajustada');
            return resultado;
            
        } catch (error) {
            console.error('[PROCESSOR] Error ajustando vertical:', error);
            throw error;
        }
    }
    
    async redimensionarSimple(imageBuffer) {
        try {
            console.log('[PROCESSOR] Redimensionamiento simple...');
            
            const resultado = await sharp(imageBuffer)
                .resize(this.STORIES_WIDTH, this.STORIES_HEIGHT, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 85 })
                .toBuffer();
            
            console.log('[PROCESSOR] ✅ Redimensionamiento simple completado');
            return resultado;
            
        } catch (error) {
            console.error('[PROCESSOR] Error en redimensionamiento simple:', error);
            throw error;
        }
    }
    
    async optimizarCalidadImagen(imageBuffer) {
        try {
            const resultado = await sharp(imageBuffer)
                .resize(this.STORIES_WIDTH, this.STORIES_HEIGHT, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ 
                    quality: 90,
                    progressive: true,
                    mozjpeg: true
                })
                .toBuffer();
            
            return resultado;
            
        } catch (error) {
            console.error('[PROCESSOR] Error optimizando imagen:', error);
            throw error;
        }
    }
    
    // ============ PROCESAMIENTO DE VIDEOS ============
    
    async procesarVideoParaStories(videoPath) {
        try {
            console.log('[PROCESSOR] === PROCESANDO VIDEO PARA STORIES ===');
            console.log(`[PROCESSOR] Video original: ${videoPath}`);
            
            // 1. Obtener metadatos del video
            const metadata = await this.obtenerMetadataVideo(videoPath);
            console.log(`[PROCESSOR] Video: ${metadata.width}x${metadata.height}, ${metadata.duration}s`);
            
            // 2. Verificar si necesita procesamiento
            const aspectoOriginal = metadata.width / metadata.height;
            
            if (this.esAspectoValido(aspectoOriginal) && metadata.duration <= 60) {
                console.log('[PROCESSOR] ✅ Video válido - Solo optimizando...');
                return await this.optimizarCalidadVideo(videoPath);
            }
            
            // 3. Procesar video para Stories
            console.log('[PROCESSOR] 🔧 Redimensionando video para Stories...');
            const videoProcesado = await this.redimensionarVideoParaStories(videoPath, metadata);
            
            console.log('[PROCESSOR] ✅ Video procesado exitosamente');
            return videoProcesado;
            
        } catch (error) {
            console.error('[PROCESSOR] ❌ Error procesando video:', error.message);
            throw new Error(`Error redimensionando video: ${error.message}`);
        }
    }
    
    async obtenerMetadataVideo(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                if (!videoStream) {
                    reject(new Error('No se encontró stream de video'));
                    return;
                }
                
                resolve({
                    width: videoStream.width,
                    height: videoStream.height,
                    duration: parseFloat(metadata.format.duration),
                    fps: eval(videoStream.r_frame_rate), // eval para calcular la fracción
                    bitrate: parseInt(metadata.format.bit_rate) || 0
                });
            });
        });
    }
    
    async redimensionarVideoParaStories(videoPath, metadata) {
        try {
            const timestamp = Date.now();
            const outputPath = path.join(__dirname, `../temp_videos/stories_${timestamp}.mp4`);
            
            // Crear directorio si no existe
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const aspectoOriginal = metadata.width / metadata.height;
            
            return new Promise((resolve, reject) => {
                let command = ffmpeg(videoPath);
                
                if (aspectoOriginal > this.STORIES_ASPECT_RATIO) {
                    // Video horizontal - aplicar crop y blur background
                    console.log('[PROCESSOR] Aplicando crop con fondo borroso para video...');
                    
                    command = command
                        .complexFilter([
                            // Crear fondo borroso
                            `[0:v]scale=${this.STORIES_WIDTH}:${this.STORIES_HEIGHT}:force_original_aspect_ratio=increase,crop=${this.STORIES_WIDTH}:${this.STORIES_HEIGHT},gblur=sigma=20[bg]`,
                            // Crear video principal centrado
                            `[0:v]scale=${this.STORIES_WIDTH-100}:${this.STORIES_HEIGHT-200}:force_original_aspect_ratio=decrease[main]`,
                            // Combinar
                            `[bg][main]overlay=(W-w)/2:(H-h)/2[out]`
                        ])
                        .map('[out]');
                } else {
                    // Video vertical - ajustar dimensiones
                    console.log('[PROCESSOR] Ajustando video vertical...');
                    
                    command = command
                        .videoFilters([
                            `scale=${this.STORIES_WIDTH}:${this.STORIES_HEIGHT}:force_original_aspect_ratio=decrease`,
                            `pad=${this.STORIES_WIDTH}:${this.STORIES_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`
                        ]);
                }
                
                // Configuraciones generales
                command = command
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .videoBitrate('2000k')
                    .fps(30)
                    .duration(Math.min(metadata.duration, 60)) // Máximo 60 segundos
                    .format('mp4')
                    .outputOptions([
                        '-preset fast',
                        '-crf 23',
                        '-movflags +faststart'
                    ]);
                
                command
                    .on('start', (commandLine) => {
                        console.log(`[PROCESSOR] Comando FFmpeg: ${commandLine}`);
                    })
                    .on('progress', (progress) => {
                        if (progress.percent) {
                            console.log(`[PROCESSOR] Progreso: ${Math.round(progress.percent)}%`);
                        }
                    })
                    .on('end', () => {
                        console.log('[PROCESSOR] ✅ Video redimensionado exitosamente');
                        
                        // Programar eliminación del archivo temporal
                        setTimeout(() => {
                            try {
                                if (fs.existsSync(outputPath)) {
                                    fs.unlinkSync(outputPath);
                                    console.log(`[CLEANUP] Video temporal eliminado: ${outputPath}`);
                                }
                            } catch (e) {
                                console.log(`[WARNING] Error eliminando video temporal: ${e.message}`);
                            }
                        }, 30 * 60 * 1000); // 30 minutos
                        
                        resolve(outputPath);
                    })
                    .on('error', (err) => {
                        console.error('[PROCESSOR] ❌ Error en FFmpeg:', err.message);
                        reject(err);
                    })
                    .save(outputPath);
            });
            
        } catch (error) {
            console.error('[PROCESSOR] Error configurando video:', error);
            throw error;
        }
    }
    
    async optimizarCalidadVideo(videoPath) {
        try {
            const timestamp = Date.now();
            const outputPath = path.join(__dirname, `../temp_videos/optimized_${timestamp}.mp4`);
            
            return new Promise((resolve, reject) => {
                ffmpeg(videoPath)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .videoBitrate('2000k')
                    .fps(30)
                    .format('mp4')
                    .outputOptions([
                        '-preset fast',
                        '-crf 23',
                        '-movflags +faststart'
                    ])
                    .on('end', () => {
                        console.log('[PROCESSOR] ✅ Video optimizado');
                        resolve(outputPath);
                    })
                    .on('error', reject)
                    .save(outputPath);
            });
            
        } catch (error) {
            console.error('[PROCESSOR] Error optimizando video:', error);
            throw error;
        }
    }
    
    // ============ FUNCIONES AUXILIARES ============
    
    esAspectoValido(aspecto) {
        return aspecto >= this.MIN_ASPECT_RATIO && aspecto <= this.MAX_ASPECT_RATIO;
    }
    
    async verificarDependencias() {
        try {
            // Verificar Sharp
            const sharpVersion = sharp.versions;
            console.log(`[PROCESSOR] Sharp v${sharpVersion.vips} disponible`);
            
            // Verificar FFmpeg
            return new Promise((resolve) => {
                ffmpeg.getAvailableFormats((err, formats) => {
                    if (err) {
                        console.log('[PROCESSOR] ❌ FFmpeg no disponible');
                        resolve(false);
                    } else {
                        console.log('[PROCESSOR] ✅ FFmpeg disponible');
                        resolve(true);
                    }
                });
            });
            
        } catch (error) {
            console.log(`[PROCESSOR] ❌ Error verificando dependencias: ${error.message}`);
            return false;
        }
    }
}

module.exports = InstagramMediaProcessor;