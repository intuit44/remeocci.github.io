// comandos/proveedores.js

const axios = require('axios');

const baseURL = 'https://playpark-simbolico.ngrok.app';

async function procesarComandoProveedores(message) {
    const texto = message.body.toLowerCase();

    try {
        // === /proveedores ===
        if (texto === "/proveedores") {
            const res = await axios.get(`${baseURL}/api/proveedores`);
            const proveedores = res.data.compras_por_proveedor || {};

            const lista = Object.entries(proveedores).sort((a, b) => b[1] - a[1]);

            if (!lista.length) {
                await message.reply("📦 No hay compras por proveedor disponibles.");
                return;
            }

            const resumen = lista.slice(0, 15).map(([nombre, monto]) =>
                `• ${nombre}: $${parseFloat(monto).toFixed(2)}`
            ).join("\n");

            await message.reply(`🏪 *Compras por proveedor:*

${resumen}`);
            return;
        }

        // === /proveedores info ===
        if (texto.includes("info")) {
            const res = await axios.get(`${baseURL}/api/proveedores/info`);
            const lista = res.data.proveedores || [];

            if (!lista.length) {
                await message.reply("📇 No se encontraron datos de proveedores.");
                return;
            }

            const resumen = lista.slice(0, 15).map(p => `• ${p.nombre} (${p.rif})`).join("\n");
            await message.reply(`📇 *Proveedores registrados:*

${resumen}`);
            return;
        }

    } catch (e) {
        console.error("[ERROR] al procesar /proveedores:", e.message);
        await message.reply("❌ Error al consultar proveedores.");
    }
}

module.exports = {
    procesarComandoProveedores
};
