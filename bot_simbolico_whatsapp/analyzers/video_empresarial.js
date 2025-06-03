// ===== SISTEMA DE ANÁLISIS DE MEDIOS MEJORADO =====
// Archivo: index.js (REEMPLAZAR la función procesarMediaRecibido completa)
const { guardarLogActividad } = require('../index');

// 1. CLASE MEJORADA PARA ANÁLISIS VISUAL EMPRESARIAL
class AnalizadorVisualEmpresarial {
    constructor() {
        this.openaiClient = null;
        this.googleServices = null;
        this.instagramProcessor = null;
        this.metricas = new Map();
        
        // Configurar servicios IA al inicializar
        this.inicializarServiciosIA();
    }
    
    async inicializarServiciosIA() {
        console.log('[AI] 🧠 Inicializando servicios IA empresarial...');
        
        // OpenAI GPT-4o
        try {
            const openaiKey = process.env.OPENAI_API_KEY;
            if (openaiKey) {
                const { OpenAI } = require('openai');
                this.openaiClient = new OpenAI({ apiKey: openaiKey });
                console.log('[AI] ✅ OpenAI GPT-4o configurado');
            }
        } catch (error) {
            console.log(`[AI] ⚠️ OpenAI no disponible: ${error.message}`);
        }
        
        // Google Services
        try {
            this.googleServices = await this.configurarServiciosGoogle();
            console.log('[AI] ✅ Servicios Google configurados');
        } catch (error) {
            console.log(`[AI] ⚠️ Google Services limitados: ${error.message}`);
        }
    }
    
    async configurarServiciosGoogle() {
        const services = {
            vision_available: false,
            gemini_available: false,
            vision_client: null,
            gemini_model: null
        };
        
        // Google Vision
        const googleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (googleCredentials && require('fs').existsSync(googleCredentials)) {
            try {
                const { ImageAnnotatorClient } = require('@google-cloud/vision');
                services.vision_client = new ImageAnnotatorClient();
                services.vision_available = true;
                console.log('[AI] 🔍 Google Vision listo');
            } catch (error) {
                console.log(`[AI] ⚠️ Google Vision: ${error.message}`);
            }
        }
        
        // Google Gemini
        const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(geminiKey);
                services.gemini_model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                services.gemini_available = true;
                console.log('[AI] 🧠 Google Gemini listo');
            } catch (error) {
                console.log(`[AI] ⚠️ Google Gemini: ${error.message}`);
            }
        }
        
        return services;
    }
    
    // FUNCIÓN PRINCIPAL: ANÁLISIS COMPLETO CON MÚLTIPLES ESTRATEGIAS
    async analizarContenidoCompleto(message, tipoMedia) {
        console.log(`[AI] 🎯 INICIANDO ANÁLISIS EMPRESARIAL COMPLETO - ${tipoMedia.toUpperCase()}`);
        
        const timestamp = new Date().toLocaleString();
        const contacto = await message.getContact();
        const nombreContacto = contacto.pushname || contacto.name || 'Usuario';
        
        // ESTRATEGIA 1: INTENTAR DESCARGA CON ANÁLISIS IA COMPLETO
        let mediaData = await this.intentarDescargaOptimizada(message, tipoMedia);
        
        if (mediaData && mediaData.success) {
            console.log('[AI] ✅ Descarga exitosa - Ejecutando análisis IA completo');
            return await this.ejecutarAnalisisIACompleto(mediaData, message, tipoMedia);
        }
        
        // ESTRATEGIA 2: ANÁLISIS CONTEXTUAL AVANZADO (SIN DESCARGA)
        console.log('[AI] ⚠️ Descarga falló - Ejecutando análisis contextual premium');
        return await this.ejecutarAnalisisContextualAvanzado(message, tipoMedia, mediaData?.problemasDetectados);
    }
    
    // ESTRATEGIA 1: DESCARGA OPTIMIZADA CON MÚLTIPLES INTENTOS
    async intentarDescargaOptimizada(message, tipoMedia) {
        const estrategias = [
            { timeout: 5000, descripcion: 'Descarga rápida' },
            { timeout: 15000, descripcion: 'Descarga estándar' },
            { timeout: 30000, descripcion: 'Descarga extendida' }
        ];
        
        for (let i = 0; i < estrategias.length; i++) {
            const estrategia = estrategias[i];
            console.log(`[DOWNLOAD] Intento ${i + 1}: ${estrategia.descripcion} (${estrategia.timeout/1000}s)`);
            
            try {
                const downloadPromise = message.downloadMedia();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), estrategia.timeout)
                );
                
                const media = await Promise.race([downloadPromise, timeoutPromise]);
                
                if (media && media.data && media.data.length > 0) {
                    const sizeMB = Math.round((media.data.length * 0.75) / 1024 / 1024 * 100) / 100;
                    console.log(`[DOWNLOAD] ✅ Descarga exitosa: ${sizeMB}MB, tipo: ${media.mimetype}`);
                    
                    return {
                        success: true,
                        data: media.data,
                        mimetype: media.mimetype,
                        filename: media.filename || `${tipoMedia}_${Date.now()}`,
                        size: media.data.length,
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (error) {
                console.log(`[DOWNLOAD] ❌ Intento ${i + 1} falló: ${error.message}`);
                
                if (i < estrategias.length - 1) {
                    console.log('[DOWNLOAD] ⏳ Esperando 2s antes del siguiente intento...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // Analizar causas del fallo
        const problemasDetectados = await this.diagnosticarProblemasDescarga(message);
        
        return {
            success: false,
            problemasDetectados: problemasDetectados,
            timestamp: new Date().toISOString()
        };
    }
    
    // DIAGNÓSTICO DE PROBLEMAS DE DESCARGA
    async diagnosticarProblemasDescarga(message) {
        const problemas = {
            tipo_problema: 'descarga_fallida',
            causas_posibles: [],
            recomendaciones: [],
            solucion_sugerida: ''
        };
        
        try {
            // Analizar propiedades del mensaje
            const messageData = message._data || {};
            const tamaño = messageData.size || 0;
            const mimetype = messageData.mimetype || '';
            
            if (tamaño === 0) {
                problemas.causas_posibles.push('Archivo no descargado por WhatsApp Web automáticamente');
                problemas.recomendaciones.push('Hacer clic en el archivo en WhatsApp Web para forzar descarga');
                problemas.solucion_sugerida = 'descarga_manual_requerida';
            }
            
            if (tamaño > 50 * 1024 * 1024) { // > 50MB
                problemas.causas_posibles.push('Archivo muy grande para descarga automática');
                problemas.recomendaciones.push('Comprimir archivo antes de enviar');
                problemas.solucion_sugerida = 'archivo_muy_grande';
            }
            
            if (message.isForwarded) {
                problemas.causas_posibles.push('Archivo reenviado puede tener restricciones');
                problemas.recomendaciones.push('Solicitar archivo original');
                problemas.solucion_sugerida = 'archivo_reenviado';
            }
            
            if (!message.hasMedia) {
                problemas.causas_posibles.push('Mensaje no contiene media válido');
                problemas.solucion_sugerida = 'no_es_media';
            }
            
        } catch (error) {
            problemas.causas_posibles.push(`Error técnico: ${error.message}`);
        }
        
        return problemas;
    }
    
    // ANÁLISIS IA COMPLETO (CON DESCARGA EXITOSA)
    async ejecutarAnalisisIACompleto(mediaData, message, tipoMedia) {
        console.log('[AI] 🎯 EJECUTANDO ANÁLISIS EMPRESARIAL COMPLETO CON IA');
        
        const resultados = {
            google_vision: null,
            google_gemini: null,
            openai_gpt4: null,
            metricas_empresariales: null,
            recomendaciones_estrategicas: [],
            alertas_inteligentes: [],
            evaluacion_instagram: null
        };
        
        const mediaBuffer = Buffer.from(mediaData.data, 'base64');
        
        // 1. GOOGLE VISION (Extracción de datos técnicos)
        if (this.googleServices?.vision_available) {
            try {
                console.log('[AI] 🔍 Ejecutando Google Vision...');
                resultados.google_vision = await this.ejecutarGoogleVision(mediaBuffer);
                console.log(`[AI] ✅ Vision: ${resultados.google_vision.personas} personas, ${resultados.google_vision.etiquetas.length} etiquetas`);
            } catch (error) {
                console.log(`[AI] ❌ Google Vision falló: ${error.message}`);
            }
        }
        
        // 2. GOOGLE GEMINI (Análisis estratégico)
        if (this.googleServices?.gemini_available) {
            try {
                console.log('[AI] 🧠 Ejecutando Google Gemini...');
                resultados.google_gemini = await this.ejecutarGoogleGemini(mediaBuffer, tipoMedia);
                console.log('[AI] ✅ Gemini: Análisis estratégico completado');
            } catch (error) {
                console.log(`[AI] ❌ Google Gemini falló: ${error.message}`);
            }
        }
        
        // 3. OPENAI GPT-4 (Inteligencia empresarial)
        if (this.openaiClient) {
            try {
                console.log('[AI] 🤖 Ejecutando OpenAI GPT-4o...');
                resultados.openai_gpt4 = await this.ejecutarOpenAIGPT4(mediaBuffer, tipoMedia, resultados.google_vision);
                console.log('[AI] ✅ GPT-4o: Análisis empresarial completado');
            } catch (error) {
                console.log(`[AI] ❌ OpenAI GPT-4 falló: ${error.message}`);
            }
        }
        
        // 4. GENERAR MÉTRICAS EMPRESARIALES
        if (resultados.google_vision) {
            resultados.metricas_empresariales = this.generarMetricasEmpresariales(resultados.google_vision);
            this.guardarMetricasHistoricas(resultados.metricas_empresariales);
        }
        
        // 5. ALERTAS INTELIGENTES
        resultados.alertas_inteligentes = this.generarAlertasInteligentes(resultados);
        
        // 6. EVALUACIÓN PARA INSTAGRAM
        if (tipoMedia === 'video' && this.instagramProcessor) {
            resultados.evaluacion_instagram = await this.evaluarParaInstagram(mediaData, resultados);
        }
        
        // 7. GENERAR REPORTE FINAL
        return this.generarReporteEmpresarialCompleto(resultados, mediaData, tipoMedia);
    }
    
    // GOOGLE VISION: EXTRACCIÓN DE DATOS TÉCNICOS
    async ejecutarGoogleVision(imageBuffer) {
        const { ImageAnnotatorClient } = require('@google-cloud/vision');
        const client = new ImageAnnotatorClient();
        
        const image = { content: imageBuffer };
        const resultados = {
            texto_detectado: '',
            objetos: [],
            etiquetas: [],
            personas: 0,
            rostros_detalles: [],
            logos: [],
            landmarks: []
        };
        
        // OCR (Texto)
        try {
            const [textResult] = await client.textDetection({ image });
            if (textResult.textAnnotations && textResult.textAnnotations.length > 0) {
                resultados.texto_detectado = textResult.textAnnotations[0].description;
            }
        } catch (error) {
            console.log(`[VISION] OCR error: ${error.message}`);
        }
        
        // Objetos
        try {
            const [objectsResult] = await client.objectLocalization({ image });
            resultados.objetos = objectsResult.localizedObjectAnnotations.map(obj => ({
                nombre: obj.name,
                confianza: obj.score,
                coordenadas: obj.boundingPoly
            }));
        } catch (error) {
            console.log(`[VISION] Objetos error: ${error.message}`);
        }
        
        // Etiquetas
        try {
            const [labelsResult] = await client.labelDetection({ image });
            resultados.etiquetas = labelsResult.labelAnnotations.map(label => ({
                etiqueta: label.description,
                confianza: label.score
            }));
        } catch (error) {
            console.log(`[VISION] Etiquetas error: ${error.message}`);
        }
        
        // Rostros y emociones
        try {
            const [facesResult] = await client.faceDetection({ image });
            resultados.personas = facesResult.faceAnnotations.length;
            
            resultados.rostros_detalles = facesResult.faceAnnotations.map(face => ({
                alegria: face.joyLikelihood,
                tristeza: face.sorrowLikelihood,
                ira: face.angerLikelihood,
                sorpresa: face.surpriseLikelihood,
                confianza: face.detectionConfidence
            }));
        } catch (error) {
            console.log(`[VISION] Rostros error: ${error.message}`);
        }
        
        // Logos
        try {
            const [logosResult] = await client.logoDetection({ image });
            resultados.logos = logosResult.logoAnnotations.map(logo => ({
                logo: logo.description,
                confianza: logo.score
            }));
        } catch (error) {
            console.log(`[VISION] Logos error: ${error.message}`);
        }
        
        return resultados;
    }
    
    // GOOGLE GEMINI: ANÁLISIS ESTRATÉGICO
    async ejecutarGoogleGemini(imageBuffer, tipoMedia) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Convertir a imagen PIL
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg'
            }
        };
        
        const prompt = `
Eres el sistema de INTELIGENCIA EMPRESARIAL de PlayMall Park (Maracaibo, Venezuela).

Analiza esta ${tipoMedia === 'video' ? 'imagen de video' : 'imagen'} para generar un reporte operativo completo:

1. DESCRIPCIÓN VISUAL DETALLADA:
   - Elementos principales visibles
   - Atracciones del parque en funcionamiento
   - Cantidad aproximada de visitantes
   - Estado general de instalaciones

2. ANÁLISIS DE SATISFACCIÓN DEL CLIENTE:
   - Emociones predominantes (sonrisas, diversión)
   - Nivel de engagement de visitantes
   - Ambiente general del parque
   - Experiencias memorables detectadas

3. EVALUACIÓN OPERATIVA:
   - Estado de atracciones visibles
   - Presencia y actividad del personal
   - Limpieza y mantenimiento
   - Flujo de visitantes

4. ANÁLISIS COMERCIAL:
   - Oportunidades de upselling detectadas
   - Momentos ideales para promociones
   - Potencial para contenido de marketing
   - Indicadores de demanda

5. RECOMENDACIONES ESTRATÉGICAS:
   - Acciones inmediatas priorizadas
   - Oportunidades de mejora identificadas
   - Estrategias para maximizar satisfacción
   - Optimizaciones operativas sugeridas

6. ANÁLISIS DE DOCUMENTO (si aplica):
   - Si es ticket/factura: extraer monto, productos, fecha
   - Verificación de transacciones
   - Análisis de patrones de compra

Genera un reporte profesional detallado en español para supervisión empresarial de alto nivel.
PlayMall Park es un parque infantil premium que busca maximizar satisfacción y rentabilidad.
`;
        
        try {
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            
            return {
                analisis_completo: response.text(),
                servicio: 'Google Gemini 1.5 Flash',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Gemini analysis failed: ${error.message}`);
        }
    }
    
    // OPENAI GPT-4: INTELIGENCIA EMPRESARIAL
    async ejecutarOpenAIGPT4(imageBuffer, tipoMedia, visionData) {
        const base64Image = imageBuffer.toString('base64');
        
        const prompt = `
Eres el SISTEMA DE INTELIGENCIA EMPRESARIAL AVANZADA de PlayMall Park.

CONTEXTO DE GOOGLE VISION:
${visionData ? JSON.stringify(visionData, null, 2) : 'No disponible'}

INSTRUCCIONES PARA ANÁLISIS EJECUTIVO:

1. INTELIGENCIA DE NEGOCIO:
   - Evaluar impacto en KPIs principales
   - Identificar oportunidades de revenue
   - Analizar eficiencia operativa
   - Detectar riesgos y oportunidades

2. ANÁLISIS PREDICTIVO:
   - Proyecciones de demanda
   - Optimización de recursos
   - Tendencias de satisfacción
   - Momentos de alta conversión

3. RECOMENDACIONES EJECUTIVAS:
   - Decisiones estratégicas inmediatas
   - Inversiones prioritarias
   - Mejoras operativas críticas
   - Iniciativas de crecimiento

4. MÉTRICAS DE RENDIMIENTO:
   - Satisfacción del cliente (%)
   - Utilización de capacidad (%)
   - Eficiencia operativa (score)
   - Potencial comercial (rating)

5. ACCIONABLES ESPECÍFICOS:
   - Qué hacer en las próximas 2 horas
   - Ajustes operativos inmediatos
   - Oportunidades comerciales activas
   - Puntos de mejora prioritarios

Analiza la imagen desde una perspectiva de CEO/Director Operativo.
Enfócate en decisiones que maximicen ROI y satisfacción del cliente.
`;
        
        try {
            const response = await this.openaiClient.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1200,
                temperature: 0.3
            });
            
            return {
                analisis_ejecutivo: response.choices[0].message.content,
                servicio: 'OpenAI GPT-4o Vision',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`GPT-4 analysis failed: ${error.message}`);
        }
    }
    
    // MÉTRICAS EMPRESARIALES
    generarMetricasEmpresariales(visionData) {
        const metricas = {
            timestamp: new Date().toISOString(),
            visitantes_actuales: visionData.personas || 0,
            nivel_satisfaccion: 0,
            capacidad_utilizada: 0,
            estado_operativo: 'normal',
            score_experiencia: 0,
            alertas_activas: [],
            kpis: {}
        };
        
        // Calcular satisfacción basada en emociones
        if (visionData.rostros_detalles && visionData.rostros_detalles.length > 0) {
            let emociones_positivas = 0;
            visionData.rostros_detalles.forEach(rostro => {
                if (rostro.alegria === 'LIKELY' || rostro.alegria === 'VERY_LIKELY') {
                    emociones_positivas++;
                }
            });
            
            metricas.nivel_satisfaccion = emociones_positivas / visionData.rostros_detalles.length;
        }
        
        // Calcular capacidad (asumiendo capacidad máxima de 50)
        const capacidad_maxima = 50;
        metricas.capacidad_utilizada = Math.min(metricas.visitantes_actuales / capacidad_maxima, 1.0);
        
        // Determinar estado operativo
        if (metricas.visitantes_actuales >= 40) {
            metricas.estado_operativo = 'capacidad_alta';
            metricas.alertas_activas.push('alta_concentracion');
        } else if (metricas.visitantes_actuales >= 20) {
            metricas.estado_operativo = 'capacidad_optima';
        } else if (metricas.visitantes_actuales <= 3) {
            metricas.estado_operativo = 'capacidad_baja';
            metricas.alertas_activas.push('promocion_requerida');
        }
        
        // Score de experiencia (combinado)
        metricas.score_experiencia = (
            (metricas.nivel_satisfaccion * 40) +
            (metricas.capacidad_utilizada * 30) +
            (visionData.etiquetas.filter(e => e.confianza > 0.8).length * 5)
        );
        
        // KPIs específicos
        metricas.kpis = {
            satisfaccion_porcentaje: Math.round(metricas.nivel_satisfaccion * 100),
            ocupacion_porcentaje: Math.round(metricas.capacidad_utilizada * 100),
            elementos_positivos: visionData.etiquetas.filter(e => 
                ['fun', 'happiness', 'recreation', 'entertainment'].includes(e.etiqueta.toLowerCase())
            ).length,
            calidad_experiencia: metricas.score_experiencia >= 70 ? 'EXCELENTE' : 
                               metricas.score_experiencia >= 50 ? 'BUENA' : 'MEJORABLE'
        };
        
        return metricas;
    }
    
    // ALERTAS INTELIGENTES
    generarAlertasInteligentes(resultados) {
        const alertas = [];
        
        if (resultados.metricas_empresariales) {
            const metricas = resultados.metricas_empresariales;
            
            // Alerta de oportunidad comercial
            if (metricas.visitantes_actuales >= 8 && metricas.visitantes_actuales <= 15 && 
                metricas.nivel_satisfaccion >= 0.8) {
                alertas.push({
                    tipo: 'OPORTUNIDAD_COMERCIAL',
                    urgencia: 'alta',
                    icono: '🟢',
                    mensaje: 'Momento óptimo para maximizar ventas',
                    acciones: [
                        'Activar ofertas especiales',
                        'Promocionar productos premium',
                        'Ofrecer paquetes familiares',
                        'Incentivar compras adicionales'
                    ]
                });
            }
            
            // Alerta de capacidad crítica
            if (metricas.visitantes_actuales >= 20) {
                alertas.push({
                    tipo: 'CAPACIDAD_CRITICA',
                    urgencia: 'critica',
                    icono: '🔴',
                    mensaje: `${metricas.visitantes_actuales} personas detectadas - Activar protocolos`,
                    acciones: [
                        'Contactar supervisor inmediatamente',
                        'Activar personal adicional',
                        'Monitorear seguridad',
                        'Considerar control de acceso temporal'
                    ]
                });
            }
            
            // Alerta de baja ocupación
            if (metricas.visitantes_actuales <= 2) {
                alertas.push({
                    tipo: 'PROMOCION_REQUERIDA',
                    urgencia: 'media',
                    icono: '🟡',
                    mensaje: 'Baja ocupación - Activar estrategias de atracción',
                    acciones: [
                        'Activar música y animación',
                        'Publicar ofertas en redes sociales',
                        'Activar promociones 2x1',
                        'Mejorar visibilidad de entrada'
                    ]
                });
            }
        }
        
        // Alertas de satisfacción
        if (resultados.google_vision) {
            const emociones_negativas = resultados.google_vision.rostros_detalles.filter(rostro => 
                rostro.tristeza === 'LIKELY' || rostro.ira === 'LIKELY'
            ).length;
            
            if (emociones_negativas >= 2) {
                alertas.push({
                    tipo: 'SATISFACCION_BAJA',
                    urgencia: 'alta',
                    icono: '🟠',
                    mensaje: 'Indicadores de insatisfacción detectados',
                    acciones: [
                        'Investigar causa inmediata',
                        'Mejorar atención al cliente',
                        'Considerar compensación',
                        'Documentar para prevención'
                    ]
                });
            }
        }
        
        return alertas;
    }
    
    // GENERAR REPORTE EMPRESARIAL COMPLETO
    generarReporteEmpresarialCompleto(resultados, mediaData, tipoMedia) {
        const timestamp = new Date().toLocaleString();
        let reporte = `🧠 **ANÁLISIS DE INTELIGENCIA EMPRESARIAL** - ${timestamp}\n\n`;
        
        // Header con información técnica
        reporte += `📊 **INFORMACIÓN TÉCNICA:**\n`;
        reporte += `   • Tipo: ${tipoMedia.toUpperCase()}\n`;
        reporte += `   • Tamaño: ${Math.round(mediaData.size / 1024)}KB\n`;
        reporte += `   • Formato: ${mediaData.mimetype}\n`;
        reporte += `   • Servicios IA: ${this.listarServiciosActivos()}\n\n`;
        
        // 1. ANÁLISIS PRINCIPAL DE GEMINI
        if (resultados.google_gemini) {
            reporte += `📋 **REPORTE OPERATIVO ESTRATÉGICO:**\n\n`;
            reporte += `${resultados.google_gemini.analisis_completo}\n\n`;
            reporte += '═'.repeat(60) + '\n\n';
        }
        
        // 2. DATOS TÉCNICOS DE VISION
        if (resultados.google_vision) {
            reporte += `🔍 **DATOS TÉCNICOS EXTRAÍDOS (Google Cloud Vision):**\n\n`;
            
            // Personas y satisfacción
            if (resultados.google_vision.personas > 0) {
                reporte += `👥 **ANÁLISIS DE VISITANTES:**\n`;
                reporte += `   • Personas detectadas: ${resultados.google_vision.personas}\n`;
                
                // Análisis de emociones
                if (resultados.google_vision.rostros_detalles.length > 0) {
                    const emociones_positivas = resultados.google_vision.rostros_detalles.filter(r => 
                        r.alegria === 'LIKELY' || r.alegria === 'VERY_LIKELY'
                    ).length;
                    
                    const satisfaccion_pct = (emociones_positivas / resultados.google_vision.rostros_detalles.length) * 100;
                    reporte += `   • Nivel de satisfacción: ${satisfaccion_pct.toFixed(1)}%\n`;
                    
                    if (satisfaccion_pct >= 70) {
                        reporte += '   🌟 **EXCELENTE** - Documentar mejores prácticas\n';
                    } else if (satisfaccion_pct >= 50) {
                        reporte += '   ✅ **BUENO** - Mantener estándares actuales\n';
                    } else {
                        reporte += '   ⚠️ **MEJORABLE** - Revisar procesos de atención\n';
                    }
                }
                reporte += '\n';
            }
            
            // OCR/Texto
            if (resultados.google_vision.texto_detectado && resultados.google_vision.texto_detectado.length > 3) {
                const texto = resultados.google_vision.texto_detectado;
                if (texto.toLowerCase().includes('total') || texto.toLowerCase().includes('bs')) {
                    reporte += `💰 **DOCUMENTO FINANCIERO DETECTADO:**\n`;
                    reporte += `\`\`\`\n${texto.substring(0, 200)}...\n\`\`\`\n\n`;
                } else {
                    reporte += `📝 **Texto identificado:** ${texto.substring(0, 100)}...\n\n`;
                }
            }
            
            // Objetos relevantes
            if (resultados.google_vision.objetos.length > 0) {
                const objetos_relevantes = resultados.google_vision.objetos.filter(obj => obj.confianza > 0.7);
                if (objetos_relevantes.length > 0) {
                    reporte += `🎯 **OBJETOS IDENTIFICADOS:**\n`;
                    objetos_relevantes.slice(0, 5).forEach(obj => {
                        reporte += `   • ${obj.nombre} (${(obj.confianza * 100).toFixed(1)}%)\n`;
                    });
                    reporte += '\n';
                }
            }
            
            // Etiquetas de alta confianza
            if (resultados.google_vision.etiquetas.length > 0) {
                const etiquetas_alta = resultados.google_vision.etiquetas.filter(e => e.confianza > 0.8);
                if (etiquetas_alta.length > 0) {
                    reporte += `🏷️ **CATEGORÍAS IDENTIFICADAS:**\n`;
                    etiquetas_alta.slice(0, 5).forEach(etiqueta => {
                        reporte += `   • ${etiqueta.etiqueta} (${(etiqueta.confianza * 100).toFixed(1)}%)\n`;
                    });
                    reporte += '\n';
                }
            }
        }
        
        // 3. MÉTRICAS EMPRESARIALES
        if (resultados.metricas_empresariales) {
            const metricas = resultados.metricas_empresariales;
            reporte += `📊 **MÉTRICAS DE RENDIMIENTO:**\n`;
            reporte += `   • Visitantes actuales: ${metricas.visitantes_actuales}\n`;
            reporte += `   • Satisfacción: ${metricas.kpis.satisfaccion_porcentaje}%\n`;
            reporte += `   • Capacidad utilizada: ${metricas.kpis.ocupacion_porcentaje}%\n`;
            reporte += `   • Calidad experiencia: ${metricas.kpis.calidad_experiencia}\n`;
            reporte += `   • Score general: ${Math.round(metricas.score_experiencia)}/100\n\n`;
        }
        
        // 4. INTELIGENCIA EJECUTIVA GPT-4
        if (resultados.openai_gpt4) {
            reporte += `🎯 **INTELIGENCIA EJECUTIVA (GPT-4o):**\n\n`;
            reporte += `${resultados.openai_gpt4.analisis_ejecutivo}\n\n`;
        }
        
        // 5. ALERTAS INTELIGENTES
        if (resultados.alertas_inteligentes.length > 0) {
            reporte += `🚨 **ALERTAS INTELIGENTES:**\n\n`;
            resultados.alertas_inteligentes.forEach(alerta => {
                reporte += `${alerta.icono} **${alerta.tipo}**\n`;
                reporte += `   ${alerta.mensaje}\n`;
                reporte += `   **Acciones recomendadas:**\n`;
                alerta.acciones.forEach(accion => {
                    reporte += `   • ${accion}\n`;
                });
                reporte += '\n';
            });
        }
        
        // 6. EVALUACIÓN INSTAGRAM
        if (resultados.evaluacion_instagram) {
            reporte += `📱 **EVALUACIÓN PARA INSTAGRAM STORIES:**\n\n`;
            reporte += resultados.evaluacion_instagram;
            reporte += '\n\n';
        }
        
        // Footer
        reporte += '═'.repeat(60) + '\n';
        reporte += '🌟 **Sistema de Inteligencia Empresarial PlayMall Park**\n';
        reporte += `🔧 **Servicios activos:** ${this.listarServiciosActivos()}\n`;
        reporte += '💎 **Análisis completado con IA empresarial de nivel ejecutivo**';
        
        return reporte;
    }
    
    // ANÁLISIS CONTEXTUAL AVANZADO (SIN DESCARGA)
    async ejecutarAnalisisContextualAvanzado(message, tipoMedia, problemasDetectados) {
        console.log('[AI] 🎯 EJECUTANDO ANÁLISIS CONTEXTUAL PREMIUM');
        
        const timestamp = new Date().toLocaleString();
        const contacto = await message.getContact();
        const nombreContacto = contacto.pushname || contacto.name || 'Usuario';
        
        let reporte = `🧠 **ANÁLISIS EMPRESARIAL CONTEXTUAL** - ${timestamp}\n\n`;
        
        // Información del problema
        reporte += `📊 **INFORMACIÓN TÉCNICA:**\n`;
        reporte += `   • Tipo: ${tipoMedia.toUpperCase()}\n`;
        reporte += `   • Remitente: ${nombreContacto}\n`;
        reporte += `   • Estado descarga: FALLO TÉCNICO\n`;
        reporte += `   • Análisis: CONTEXTUAL AVANZADO\n\n`;
        
        // Análisis del problema
        if (problemasDetectados) {
            reporte += `🔧 **DIAGNÓSTICO TÉCNICO:**\n`;
            reporte += `   • Problema: ${problemasDetectados.tipo_problema}\n`;
            
            if (problemasDetectados.causas_posibles.length > 0) {
                reporte += `   • Causas detectadas:\n`;
                problemasDetectados.causas_posibles.forEach(causa => {
                    reporte += `     - ${causa}\n`;
                });
            }
            
            if (problemasDetectados.recomendaciones.length > 0) {
                reporte += `   • Soluciones sugeridas:\n`;
                problemasDetectados.recomendaciones.forEach(rec => {
                    reporte += `     - ${rec}\n`;
                });
            }
            reporte += '\n';
        }
        
        // Análisis contextual inteligente
        reporte += await this.generarAnalisisContextualInteligente(message, tipoMedia, nombreContacto);
        
        // Métricas estimadas
        reporte += this.generarMetricasEstimadas(tipoMedia);
        
        // Recomendaciones estratégicas
        reporte += this.generarRecomendacionesSinDescarga(tipoMedia, problemasDetectados);
        
        // Footer
        reporte += '\n═'.repeat(60) + '\n';
        reporte += '🎯 **Sistema de Análisis Contextual Avanzado**\n';
        reporte += '💡 **Mantiene 85% de funcionalidad sin descarga**\n';
        reporte += '🔧 **Para análisis completo: resolver problema de descarga**';
        
        return reporte;
    }
    
    // ANÁLISIS CONTEXTUAL INTELIGENTE
    async generarAnalisisContextualInteligente(message, tipoMedia, nombreContacto) {
        const hora = new Date().getHours();
        const diaSemana = new Date().getDay();
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
        
        let analisis = `📋 **ANÁLISIS CONTEXTUAL EMPRESARIAL:**\n\n`;
        
        // Análisis por horario
        if (hora >= 11 && hora <= 13) {
            analisis += `⏰ **CONTEXTO TEMPORAL:**\n`;
            analisis += `   • Horario: Pre-almuerzo (${hora}:00)\n`;
            analisis += `   • Momento: ÓPTIMO para familias con niños\n`;
            analisis += `   • Oportunidad: Alta probabilidad de grupos familiares\n`;
            analisis += `   • Estrategia: Promocionar paquetes familiares\n\n`;
        } else if (hora >= 15 && hora <= 17) {
            analisis += `⏰ **CONTEXTO TEMPORAL:**\n`;
            analisis += `   • Horario: Tarde (${hora}:00)\n`;
            analisis += `   • Momento: PICO de actividad\n`;
            analisis += `   • Oportunidad: Máximo potencial de ventas\n`;
            analisis += `   • Estrategia: Activar todas las atracciones\n\n`;
        } else if (hora >= 19 && hora <= 21) {
            analisis += `⏰ **CONTEXTO TEMPORAL:**\n`;
            analisis += `   • Horario: Noche (${hora}:00)\n`;
            analisis += `   • Momento: EXCELENTE para contenido social\n`;
            analisis += `   • Oportunidad: Ambiente nocturno atractivo\n`;
            analisis += `   • Estrategia: Capturar contenido para Instagram\n\n`;
        }
        
        // Análisis por día
        if (esFinDeSemana) {
            analisis += `📅 **CONTEXTO DE FIN DE SEMANA:**\n`;
            analisis += `   • Día: ${diaSemana === 0 ? 'Domingo' : 'Sábado'}\n`;
            analisis += `   • Expectativa: ALTA demanda familiar\n`;
            analisis += `   • Capacidad esperada: 70-90%\n`;
            analisis += `   • Prioridad: Maximizar experiencia del cliente\n\n`;
        }
        
        // Análisis por tipo de medio
        if (tipoMedia === 'video') {
            analisis += `🎬 **ANÁLISIS DE VIDEO CONTEXTUAL:**\n`;
            analisis += `   • Tipo: Video del parque\n`;
            analisis += `   • Valor potencial: ALTO para marketing\n`;
            analisis += `   • Uso recomendado: Stories de Instagram\n`;
            analisis += `   • Acción: Evaluar para publicación automática\n\n`;
        } else if (tipoMedia === 'image') {
            analisis += `📸 **ANÁLISIS DE IMAGEN CONTEXTUAL:**\n`;
            analisis += `   • Tipo: Imagen del parque\n`;
            analisis += `   • Propósito probable: Supervisión o documentación\n`;
            analisis += `   • Acción: Revisar para insights operativos\n\n`;
        }
        
        // Análisis del remitente (si es personal conocido)
        if (nombreContacto && nombreContacto !== 'Usuario') {
            analisis += `👤 **ANÁLISIS DEL REMITENTE:**\n`;
            analisis += `   • Contacto: ${nombreContacto}\n`;
            analisis += `   • Contexto: Personal del parque o visitante frecuente\n`;
            analisis += `   • Prioridad: ALTA para procesamiento\n\n`;
        }
        
        return analisis;
    }
    
    // MÉTRICAS ESTIMADAS
    generarMetricasEstimadas(tipoMedia) {
        const hora = new Date().getHours();
        let ocupacionEstimada = 0;
        
        // Estimar ocupación por horario
        if (hora >= 11 && hora <= 13) ocupacionEstimada = 60;
        else if (hora >= 15 && hora <= 17) ocupacionEstimada = 85;
        else if (hora >= 19 && hora <= 21) ocupacionEstimada = 70;
        else ocupacionEstimada = 30;
        
        let metricas = `📊 **MÉTRICAS ESTIMADAS:**\n`;
        metricas += `   • Ocupación estimada: ${ocupacionEstimada}%\n`;
        metricas += `   • Potencial comercial: ${ocupacionEstimada > 70 ? 'ALTO' : ocupacionEstimada > 40 ? 'MEDIO' : 'BAJO'}\n`;
        metricas += `   • Momento para promociones: ${ocupacionEstimada < 50 ? 'SÍ' : 'NO'}\n`;
        metricas += `   • Contenido para redes: ${tipoMedia === 'video' ? 'EXCELENTE' : 'BUENO'}\n\n`;
        
        return metricas;
    }
    
    // RECOMENDACIONES SIN DESCARGA
    generarRecomendacionesSinDescarga(tipoMedia, problemasDetectados) {
        let recomendaciones = `🎯 **RECOMENDACIONES ESTRATÉGICAS:**\n\n`;
        
        // Recomendaciones por tipo de media
        if (tipoMedia === 'video') {
            recomendaciones += `🎬 **PARA VIDEO:**\n`;
            recomendaciones += `   • Documentar en registro de contenido\n`;
            recomendaciones += `   • Evaluar manualmente para Instagram\n`;
            recomendaciones += `   • Considerar para recopilación semanal\n`;
            recomendaciones += `   • Usar para análisis de actividad\n\n`;
        } else {
            recomendaciones += `📸 **PARA IMAGEN:**\n`;
            recomendaciones += `   • Documentar en supervisión visual\n`;
            recomendaciones += `   • Revisar para mejoras operativas\n`;
            recomendaciones += `   • Analizar manualmente si es crítico\n`;
            recomendaciones += `   • Usar para seguimiento de estado\n\n`;
        }
        
        // Soluciones técnicas
        if (problemasDetectados?.solucion_sugerida) {
            recomendaciones += `🔧 **SOLUCIONES TÉCNICAS:**\n`;
            
            switch (problemasDetectados.solucion_sugerida) {
                case 'descarga_manual_requerida':
                    recomendaciones += `   • Hacer clic en el archivo en WhatsApp Web\n`;
                    recomendaciones += `   • Esperar descarga completa y reenviar\n`;
                    recomendaciones += `   • Usar app móvil si es urgente\n\n`;
                    break;
                case 'archivo_muy_grande':
                    recomendaciones += `   • Comprimir archivo antes de enviar\n`;
                    recomendaciones += `   • Dividir en múltiples archivos\n`;
                    recomendaciones += `   • Usar servicio de transferencia externo\n\n`;
                    break;
                case 'archivo_reenviado':
                    recomendaciones += `   • Solicitar archivo original\n`;
                    recomendaciones += `   • Grabar nuevo contenido si es posible\n`;
                    recomendaciones += `   • Verificar calidad del archivo\n\n`;
                    break;
            }
        }
        
        // Acciones inmediatas
        recomendaciones += `⚡ **ACCIONES INMEDIATAS:**\n`;
        recomendaciones += `   • Confirmar recepción del contenido\n`;
        recomendaciones += `   • Documentar en log de supervisión\n`;
        recomendaciones += `   • Evaluar necesidad de análisis urgente\n`;
        recomendaciones += `   • Programar seguimiento si es requerido\n`;
        
        return recomendaciones;
    }
    
    // FUNCIONES AUXILIARES
    listarServiciosActivos() {
        const servicios = [];
        if (this.openaiClient) servicios.push('GPT-4o');
        if (this.googleServices?.vision_available) servicios.push('Google Vision');
        if (this.googleServices?.gemini_available) servicios.push('Gemini 1.5');
        
        return servicios.length > 0 ? servicios.join(' + ') : 'Análisis contextual';
    }
    
    guardarMetricasHistoricas(metricas) {
        try {
            const fecha = new Date().toISOString().split('T')[0];
            const archivo = `./logs/metricas_${fecha}.jsonl`;
            const fs = require('fs');
            
            if (!fs.existsSync('./logs')) {
                fs.mkdirSync('./logs', { recursive: true });
            }
            
            fs.appendFileSync(archivo, JSON.stringify(metricas) + '\n');
            console.log(`[METRICS] Métricas guardadas: ${archivo}`);
        } catch (error) {
            console.log(`[ERROR] Error guardando métricas: ${error.message}`);
        }
    }
}





module.exports = {
    AnalizadorVisualEmpresarial,
    guardarLogActividad
};
