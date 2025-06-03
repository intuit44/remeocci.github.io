// C:/ProyectosSimbolicos/bot_simbolico_whatsapp/enviar_alerta.js
const mensaje = process.argv[2];

const GRUPOS_AUTORIZADOS = [
  '120363179370816930@g.us',  
  '120363029580331492@g.us'   
];

// Función para enviar alerta (usar tu cliente existente)
async function enviarAlerta() {
  // Aquí conectarías con tu cliente WPPConnect existente
  // y enviarías el mensaje a los grupos
  console.log("📱 Enviando alerta:", mensaje);
}

enviarAlerta();