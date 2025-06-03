// comandos/compras.js

const axios = require('axios');

const baseURL = 'https://playpark-simbolico.ngrok.app';

function formatearLinea(nombre, cantidad, total) {
    return `• ${nombre}: ${cantidad} u. – $${total.toFixed(2)}`;
}

async function procesarComandoCompras(message) {
    const texto = message.body.toLowerCase();

    try {
        // === /compras ===
        if (texto === "/compras") {
            const res = await axios.get(`${baseURL}/api/compras`);
            const total = res.data.total_compras ?? 0;

            await message.reply(`🛒 *Compras del día:*

Total: $${total.toFixed(2)}`);
            return;
        }

        // === /compras detalle ===
        if (texto.includes("detalle")) {
            const res = await axios.get(`${baseURL}/api/compras/detalle`);
            const productos = res.data.productos_comprados || [];

            if (!productos.length) {
                await message.reply("📦 No hay detalle de compras disponibles.");
                return;
            }

            const resumen = productos.slice(0, 15).map(p =>
                formatearLinea(p.producto, p.cantidad, p.total)
            ).join("\n");

            await message.reply(`🧾 *Productos comprados:*

${resumen}`);
            return;
        }

        // === /compras proveedor ===
        if (texto.includes("proveedor")) {
            const res = await axios.get(`${baseURL}/api/proveedores`);
            const proveedores = res.data.compras_por_proveedor || {};

            const lista = Object.entries(proveedores).sort((a, b) => b[1] - a[1]).slice(0, 15);

            if (!lista.length) {
                await message.reply("📦 No hay compras por proveedor disponibles.");
                return;
            }

            const resumen = lista.map(([nombre, monto]) =>
                `• ${nombre}: $${parseFloat(monto).toFixed(2)}`
            ).join("\n");

            await message.reply(`🏪 *Compras por proveedor:*

${resumen}`);
            return;
        }

    } catch (e) {
        console.error("[ERROR] al procesar /compras:", e.message);
        await message.reply("❌ Error al consultar compras.");
    }
}

module.exports = {
    procesarComandoCompras
};
