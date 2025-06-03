class InstagramController {
    constructor(instagramAutomation) {
        this.instagramAutomation = instagramAutomation;
    }

    async procesarRespuestaInstagram(texto, message) {
        /**
         * Procesa respuestas a consultas de Instagram CON MANEJO MEJORADO DE ERRORES
         */
        const textoLower = texto.toLowerCase();
        const nombreContacto = (await message.getContact()).pushname || 'Personal';

        console.log('[INSTAGRAM] Procesando respuesta:', textoLower);

        // Respuestas afirmativas - PUBLICAR USANDO TU SISTEMA
        if (textoLower.includes('si publicar') || textoLower.includes('sí publicar')) {
            console.log('[INSTAGRAM] ✅ Confirmación recibida - Iniciando publicación...');

            try {
                const mediaData = await this.obtenerContenidoReciente(message);

                if (!mediaData) {
                    return {
                        respuesta_grupo: '❌ **ERROR:** No se encontró contenido visual reciente.\n\nPor favor envía nuevamente la imagen o video que deseas publicar en Instagram Stories.',
                        mensaje_privado: null
                    };
                }

                console.log(`[INSTAGRAM] Contenido encontrado: ${mediaData.tipo}`);

                const configValida = await this.instagramAutomation.verificarConfiguracionCompleta();
                if (!configValida) {
                    return {
                        respuesta_grupo: '❌ **ERROR DE CONFIGURACIÓN**\n\n🔧 **Problema:** Instagram API no está configurado correctamente...',
                        mensaje_privado: null
                    };
                }

                let resultadoPublicacion;
                if (mediaData.tipo === 'video' && mediaData.path) {
                    resultadoPublicacion = await this.instagramAutomation.publicarEnInstagramStories(
                        mediaData.path,
                        '¡Diversión garantizada en PlayMall Park! 🎢 #PlayMallPark #Maracaibo'
                    );
                } else if (mediaData.tipo === 'imagen' && mediaData.data) {
                    resultadoPublicacion = await this.instagramAutomation.publicarImagenEnStories(
                        {
                            data: mediaData.data,
                            mimetype: mediaData.mimetype,
                            filename: mediaData.filename
                        },
                        '¡Ven a vivir momentos increíbles! 📸 #PlayMallPark #Diversión'
                    );
                } else {
                    throw new Error('Tipo de contenido no soportado o datos incompletos');
                }

                if (resultadoPublicacion && resultadoPublicacion.success) {
                    return {
                        respuesta_grupo: `🎉 **¡PUBLICADO EXITOSAMENTE EN INSTAGRAM STORIES!** 🎉\n\n📱 **Instagram:** @playmallmcbo...`,
                        mensaje_privado: null
                    };
                } else {
                    const errorMsg = resultadoPublicacion?.mensaje || resultadoPublicacion?.error || 'Error desconocido en la publicación';
                    let mensajeError = `❌ **ERROR EN PUBLICACIÓN DE INSTAGRAM STORIES**\n\n`;
                    if (errorMsg.includes('400')) {
                        mensajeError += `🔧 **Problema:** Formato no aceptado por Instagram\n\n...`;
                    } else if (errorMsg.includes('403')) {
                        mensajeError += `🔐 **Problema:** Permisos insuficientes de Instagram\n\n...`;
                    } else {
                        mensajeError += `🔧 **Error técnico:** ${errorMsg}\n\n...`;
                    }
                    return {
                        respuesta_grupo: mensajeError,
                        mensaje_privado: null
                    };
                }
            } catch (error) {
                return {
                    respuesta_grupo: `❌ **ERROR CRÍTICO EN INSTAGRAM**\n\n🚨 **Error:** ${error.message}...`,
                    mensaje_privado: null
                };
            }
        }

        if (textoLower.includes('no publicar') || textoLower.includes('solo supervisión')) {
            return {
                respuesta_grupo: `📋 **PUBLICACIÓN CANCELADA**\n\n🔒 **Decisión:** Contenido mantenido solo como supervisión interna...`,
                mensaje_privado: null
            };
        }

        return {
            respuesta_grupo: `❓ **RESPUESTA NO RECONOCIDA**\n\n🤖 Para procesar tu solicitud de Instagram Stories correctamente...`,
            mensaje_privado: null
        };
    }

    async obtenerAlcanceInstagram() {
        try {
            const response = await axios.get(
                `${this.instagramAutomation.baseURL}/${this.instagramAutomation.instagramBusinessAccountId}`,
                {
                    params: {
                        fields: 'followers_count',
                        access_token: this.instagramAutomation.instagramToken
                    },
                    timeout: 5000
                }
            );
            return response.data.followers_count || 'N/A';
        } catch (error) {
            return 'N/A';
        }
    }

    async obtenerContenidoReciente(message) {
        try {
            const chat = await message.getChat();
            const mensajes = await chat.fetchMessages({ limit: 20 });
            for (const msg of mensajes) {
                if (msg.hasMedia && (msg.type === 'image' || msg.type === 'video')) {
                    const media = await Promise.race([
                        msg.downloadMedia(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout descargando media')), 15000)
                        )
                    ]);
                    if (media && media.data) {
                        if (msg.type === 'video') {
                            const videoPath = await this.guardarVideoTemporal(media);
                            return { tipo: 'video', path: videoPath, data: media.data, mimetype: media.mimetype || 'video/mp4' };
                        } else {
                            return { tipo: 'imagen', data: media.data, mimetype: media.mimetype || 'image/jpeg', filename: media.filename || 'imagen_instagram.jpg' };
                        }
                    }
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async guardarVideoTemporal(media) {
        try {
            const timestamp = Date.now();
            const tempDir = path.join(__dirname, 'temp_videos');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const videoPath = path.join(tempDir, `instagram_${timestamp}.mp4`);
            const videoBuffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(videoPath, videoBuffer);
            setTimeout(() => {
                if (fs.existsSync(videoPath)) {
                    fs.unlinkSync(videoPath);
                }
            }, 30 * 60 * 1000);
            return videoPath;
        } catch (error) {
            throw error;
        }
    }
}
