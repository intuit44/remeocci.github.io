// comandos/departamentos.js

const axios = require('axios');

const baseURL = 'https://playpark-simbolico.ngrok.app';

async function procesarComandoDepartamentos(message) {
    try {
        const res = await axios.get(`${baseURL}/api/departamentos`);
        const departamentos = res.data.departamentos || [];

        if (!departamentos.length) {
            await message.reply("⚠️ No se encontraron departamentos registrados.");
            return;
        }

        const resumen = departamentos.slice(0, 30).map((d, i) => `• ${i + 1}. ${d}`).join("\n");

        await message.reply(`🏷️ *Departamentos registrados:*

${resumen}`);

    } catch (e) {
        console.error("[ERROR] al consultar /departamentos:", e.message);
        await message.reply("❌ Error al consultar departamentos.");
    }
}

module.exports = {
    procesarComandoDepartamentos
};
