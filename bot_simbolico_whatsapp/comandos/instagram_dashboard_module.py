# OPCIONAL: Agregar funcionalidad de Instagram al Dashboard
# Archivo: instagram_dashboard_module.py

import streamlit as st
import requests
import json
import os
from datetime import datetime, timedelta
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

class InstagramDashboardModule:
    def __init__(self):
        self.instagram_token = os.getenv('INSTAGRAM_ACCESS_TOKEN')
        self.business_account_id = os.getenv('INSTAGRAM_BUSINESS_ACCOUNT_ID')
        self.base_url = 'https://graph.facebook.com/v18.0'
        
    def render_instagram_section(self):
        """Renderiza la sección de Instagram en el dashboard"""
        
        st.markdown("## 📱 Instagram Stories Automation")
        
        if not self.instagram_token:
            st.error("❌ Instagram no configurado. Agrega INSTAGRAM_ACCESS_TOKEN en .env")
            return
        
        # Tabs para diferentes funciones
        tab1, tab2, tab3, tab4 = st.tabs(["📊 Analytics", "🎬 Videos", "💬 Respuestas", "⚙️ Config"])
        
        with tab1:
            self.render_analytics_tab()
        
        with tab2:
            self.render_videos_tab()
        
        with tab3:
            self.render_responses_tab()
        
        with tab4:
            self.render_config_tab()
    
    def render_analytics_tab(self):
        """Tab de analytics de Instagram"""
        
        st.subheader("📊 Métricas de Instagram Stories")
        
        # Métricas básicas
        col1, col2, col3, col4 = st.columns(4)
        
        try:
            # Obtener métricas de la cuenta
            metrics = self.get_account_metrics()
            
            with col1:
                st.metric(
                    "Seguidores", 
                    metrics.get('followers_count', 'N/A'),
                    delta=metrics.get('followers_delta', 0)
                )
            
            with col2:
                st.metric(
                    "Stories hoy", 
                    metrics.get('stories_today', 0),
                    delta=metrics.get('stories_delta', 0)
                )
            
            with col3:
                st.metric(
                    "Alcance promedio", 
                    metrics.get('avg_reach', 'N/A'),
                    delta=metrics.get('reach_delta', 0)
                )
            
            with col4:
                st.metric(
                    "Engagement", 
                    f"{metrics.get('engagement_rate', 0):.1%}",
                    delta=f"{metrics.get('engagement_delta', 0):.1%}"
                )
            
            # Gráfico de stories publicados
            st.subheader("📈 Stories Publicados (Últimos 7 días)")
            stories_data = self.get_stories_data()
            
            if stories_data:
                df = pd.DataFrame(stories_data)
                fig = px.line(
                    df, 
                    x='fecha', 
                    y='cantidad',
                    title='Stories Publicados por Día',
                    markers=True
                )
                fig.update_layout(
                    xaxis_title="Fecha",
                    yaxis_title="Cantidad de Stories"
                )
                st.plotly_chart(fig, use_container_width=True)
            
            # Métricas de engagement
            st.subheader("💫 Engagement por Story")
            engagement_data = self.get_engagement_data()
            
            if engagement_data:
                df_engagement = pd.DataFrame(engagement_data)
                fig = go.Figure()
                
                fig.add_trace(go.Scatter(
                    x=df_engagement['timestamp'],
                    y=df_engagement['reach'],
                    mode='lines+markers',
                    name='Alcance',
                    line=dict(color='#1f77b4')
                ))
                
                fig.add_trace(go.Scatter(
                    x=df_engagement['timestamp'],
                    y=df_engagement['impressions'],
                    mode='lines+markers',
                    name='Impresiones',
                    line=dict(color='#ff7f0e'),
                    yaxis='y2'
                ))
                
                fig.update_layout(
                    title='Alcance e Impresiones de Stories',
                    xaxis_title='Fecha',
                    yaxis_title='Alcance',
                    yaxis2=dict(
                        title='Impresiones',
                        overlaying='y',
                        side='right'
                    )
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
        except Exception as e:
            st.error(f"Error cargando métricas: {e}")
    
    def render_videos_tab(self):
        """Tab para gestión de videos"""
        
        st.subheader("🎬 Gestión de Videos para Instagram")
        
        # Subir video manualmente
        st.markdown("### 📤 Subir Video Manualmente")
        
        uploaded_file = st.file_uploader(
            "Selecciona un video",
            type=['mp4', 'mov', 'avi'],
            help="Videos de hasta 100MB, duración máxima 60 segundos"
        )
        
        if uploaded_file:
            # Guardar archivo temporalmente
            temp_path = f"temp_{uploaded_file.name}"
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.video(temp_path)
            
            with col2:
                st.markdown("**Información del video:**")
                st.write(f"📁 Nombre: {uploaded_file.name}")
                st.write(f"📏 Tamaño: {uploaded_file.size / 1024 / 1024:.1f} MB")
                
                # Análisis del video
                if st.button("🧠 Analizar con IA"):
                    with st.spinner("Analizando video..."):
                        analysis = self.analyze_video_for_instagram(temp_path)
                        self.display_video_analysis(analysis)
                
                # Opciones de publicación
                st.markdown("**Opciones de publicación:**")
                
                caption = st.text_area(
                    "Caption (opcional)",
                    placeholder="¡Diversión garantizada en PlayMall Park! 🎢",
                    max_chars=125
                )
                
                publish_now = st.checkbox("Publicar inmediatamente")
                
                if not publish_now:
                    scheduled_time = st.time_input(
                        "Programar para:",
                        value=datetime.now().time()
                    )
                
                if st.button("📱 Publicar en Stories"):
                    self.publish_video_from_dashboard(temp_path, caption, publish_now)
            
            # Limpiar archivo temporal
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        # Historial de videos
        st.markdown("### 📋 Historial de Videos")
        videos_history = self.get_videos_history()
        
        if videos_history:
            df_videos = pd.DataFrame(videos_history)
            
            # Filtros
            col1, col2, col3 = st.columns(3)
            
            with col1:
                status_filter = st.selectbox(
                    "Estado",
                    ["Todos", "Publicados", "Pendientes", "Rechazados"]
                )
            
            with col2:
                date_from = st.date_input("Desde", value=datetime.now() - timedelta(days=7))
            
            with col3:
                date_to = st.date_input("Hasta", value=datetime.now())
            
            # Aplicar filtros
            filtered_df = self.filter_videos_dataframe(df_videos, status_filter, date_from, date_to)
            
            # Mostrar tabla
            st.dataframe(
                filtered_df,
                use_container_width=True,
                column_config={
                    "thumbnail": st.column_config.ImageColumn("Preview"),
                    "score": st.column_config.ProgressColumn("Puntuación", min_value=0, max_value=100),
                    "status": st.column_config.TextColumn("Estado")
                }
            )
    
    def render_responses_tab(self):
        """Tab para respuestas automáticas"""
        
        st.subheader("💬 Sistema de Respuestas Automáticas")
        
        # Estado del sistema
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### ⚙️ Estado del Sistema")
            
            auto_reply_enabled = st.checkbox(
                "Respuestas automáticas activadas",
                value=True,
                help="Activa/desactiva las respuestas automáticas a comentarios y DMs"
            )
            
            response_delay = st.slider(
                "Delay de respuesta (segundos)",
                min_value=1,
                max_value=60,
                value=5,
                help="Tiempo de espera antes de responder automáticamente"
            )
            
            max_responses = st.number_input(
                "Máximo respuestas por hora",
                min_value=1,
                max_value=100,
                value=20,
                help="Límite para evitar spam"
            )
        
        with col2:
            st.markdown("#### 📊 Estadísticas de Respuestas")
            
            responses_stats = self.get_responses_stats()
            
            st.metric(
                "Respuestas hoy",
                responses_stats.get('today', 0)
            )
            
            st.metric(
                "Tiempo promedio de respuesta",
                f"{responses_stats.get('avg_time', 0)} seg"
            )
            
            st.metric(
                "Tasa de satisfacción",
                f"{responses_stats.get('satisfaction', 0):.1%}"
            )
        
        # Configuración de respuestas
        st.markdown("#### 🇻🇪 Frases Zulianas")
        
        with st.expander("Personalizar respuestas automáticas"):
            
            # Categorías de respuestas
            response_categories = {
                "Saludos": ["¡Epa!", "¡Qué tal!", "¡Buenas!"],
                "Emoción": ["¡Chévere!", "¡Brutal!", "¡Arrechísimo!"],
                "Invitación": ["¡Vengan!", "¡Los esperamos!", "¡No se lo pierdan!"],
                "Horarios": ["Estamos abiertos...", "Los horarios son...", "Vengan cuando gusten..."]
            }
            
            for category, phrases in response_categories.items():
                st.markdown(f"**{category}:**")
                
                for i, phrase in enumerate(phrases):
                    new_phrase = st.text_input(
                        f"{category} {i+1}",
                        value=phrase,
                        key=f"{category}_{i}"
                    )
                    phrases[i] = new_phrase
            
            if st.button("💾 Guardar configuración"):
                self.save_responses_config(response_categories)
                st.success("✅ Configuración guardada")
        
        # Log de respuestas recientes
        st.markdown("#### 📝 Respuestas Recientes")
        
        recent_responses = self.get_recent_responses()
        
        if recent_responses:
            for response in recent_responses[:10]:
                with st.container():
                    col1, col2, col3 = st.columns([2, 3, 1])
                    
                    with col1:
                        st.write(f"**@{response['username']}**")
                        st.caption(response['timestamp'])
                    
                    with col2:
                        st.write(f"💬 {response['original_comment']}")
                        st.write(f"🤖 {response['bot_response']}")
                    
                    with col3:
                        satisfaction = response.get('satisfaction', 'N/A')
                        if satisfaction != 'N/A':
                            st.metric("Satisfacción", f"{satisfaction:.1%}")
                
                st.divider()
    
    def render_config_tab(self):
        """Tab de configuración"""
        
        st.subheader("⚙️ Configuración del Sistema")
        
        # Configuración de API
        st.markdown("#### 🔑 Configuración de API")
        
        api_status = self.check_api_status()
        
        if api_status['connected']:
            st.success(f"✅ Conectado a @{api_status['username']}")
            st.write(f"👥 Seguidores: {api_status['followers']:,}")
        else:
            st.error("❌ No se pudo conectar a Instagram API")
            st.code("""
# Agregar al archivo .env:
INSTAGRAM_ACCESS_TOKEN=tu_token_aqui
INSTAGRAM_BUSINESS_ACCOUNT_ID=tu_id_aqui
            """)
        
        # Configuración de horarios
        st.markdown("#### ⏰ Horarios Óptimos de Publicación")
        
        optimal_hours = [
            {"start": 11, "end": 13, "name": "Pre-almuerzo"},
            {"start": 15, "end": 17, "name": "Tarde activa"},
            {"start": 19, "end": 21, "name": "Noche familiar"}
        ]
        
        for i, schedule in enumerate(optimal_hours):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                start_time = st.time_input(
                    f"Inicio {schedule['name']}",
                    value=datetime.strptime(f"{schedule['start']}:00", "%H:%M").time(),
                    key=f"start_{i}"
                )
            
            with col2:
                end_time = st.time_input(
                    f"Fin {schedule['name']}",
                    value=datetime.strptime(f"{schedule['end']}:00", "%H:%M").time(),
                    key=f"end_{i}"
                )
            
            with col3:
                enabled = st.checkbox(
                    "Activo",
                    value=True,
                    key=f"enabled_{i}"
                )
        
        # Criterios de calidad
        st.markdown("#### 🎯 Criterios de Calidad para Auto-publicación")
        
        col1, col2 = st.columns(2)
        
        with col1:
            min_score = st.slider(
                "Puntuación mínima",
                min_value=0,
                max_value=100,
                value=70,
                help="Videos con esta puntuación o mayor se publican automáticamente"
            )
            
            min_people = st.number_input(
                "Personas mínimas",
                min_value=0,
                max_value=20,
                value=3,
                help="Número mínimo de personas que deben aparecer"
            )
        
        with col2:
            max_people = st.number_input(
                "Personas máximas",
                min_value=1,
                max_value=50,
                value=25,
                help="Número máximo para evitar problemas de privacidad"
            )
            
            min_satisfaction = st.slider(
                "Satisfacción mínima",
                min_value=0.0,
                max_value=1.0,
                value=0.75,
                step=0.05,
                format="%.2f",
                help="Nivel mínimo de satisfacción detectado por IA"
            )
        
        # Guardar configuración
        if st.button("💾 Guardar Configuración"):
            config = {
                "optimal_hours": optimal_hours,
                "quality_criteria": {
                    "min_score": min_score,
                    "min_people": min_people,
                    "max_people": max_people,
                    "min_satisfaction": min_satisfaction
                }
            }
            
            self.save_config(config)
            st.success("✅ Configuración guardada exitosamente")
        
        # Botones de acción
        st.markdown("#### 🔧 Acciones del Sistema")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🔄 Reiniciar Sistema"):
                self.restart_instagram_system()
                st.success("✅ Sistema reiniciado")
        
        with col2:
            if st.button("🧪 Probar Conexión"):
                test_result = self.test_connection()
                if test_result['success']:
                    st.success(f"✅ {test_result['message']}")
                else:
                    st.error(f"❌ {test_result['message']}")
        
        with col3:
            if st.button("📊 Generar Reporte"):
                report = self.generate_system_report()
                st.download_button(
                    "📄 Descargar Reporte",
                    data=report,
                    file_name=f"instagram_report_{datetime.now().strftime('%Y%m%d')}.json",
                    mime="application/json"
                )
    
    # Métodos auxiliares (implementar según necesidades)
    def get_account_metrics(self):
        """Obtiene métricas básicas de la cuenta"""
        # Implementar llamada a Instagram API
        return {
            'followers_count': 1250,
            'followers_delta': 15,
            'stories_today': 3,
            'stories_delta': 1,
            'avg_reach': 850,
            'reach_delta': 50,
            'engagement_rate': 0.045,
            'engagement_delta': 0.002
        }
    
    def get_stories_data(self):
        """Obtiene datos de stories de los últimos días"""
        return [
            {'fecha': '2024-01-01', 'cantidad': 2},
            {'fecha': '2024-01-02', 'cantidad': 3},
            {'fecha': '2024-01-03', 'cantidad': 1},
            {'fecha': '2024-01-04', 'cantidad': 4},
            {'fecha': '2024-01-05', 'cantidad': 2},
            {'fecha': '2024-01-06', 'cantidad': 3},
            {'fecha': '2024-01-07', 'cantidad': 2}
        ]
    
    def check_api_status(self):
        """Verifica el estado de la API de Instagram"""
        try:
            if not self.instagram_token:
                return {'connected': False}
            
            response = requests.get(
                f"{self.base_url}/{self.business_account_id}",
                params={
                    'fields': 'username,followers_count',
                    'access_token': self.instagram_token
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'connected': True,
                    'username': data.get('username', 'playmallmcbo'),
                    'followers': data.get('followers_count', 0)
                }
            else:
                return {'connected': False}
                
        except Exception as e:
            return {'connected': False, 'error': str(e)}
    
    def save_config(self, config):
        """Guarda la configuración del sistema"""
        config_path = "instagram_config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
    
    def test_connection(self):
        """Prueba la conexión con Instagram API"""
        try:
            response = requests.get(
                f"{self.base_url}/me",
                params={'access_token': self.instagram_token}
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'Conexión exitosa con Instagram API'}
            else:
                return {'success': False, 'message': f'Error HTTP {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Error: {str(e)}'}

# Para integrar en d_simb_gpt4.py, agregar:
"""
# En d_simb_gpt4.py, después de las otras importaciones:
from instagram_dashboard_module import InstagramDashboardModule

# En la función main(), agregar:
def main():
    # ... código existente ...
    
    # Agregar sección de Instagram
    instagram_module = InstagramDashboardModule()
    instagram_module.render_instagram_section()
    
    # ... resto del código ...
"""