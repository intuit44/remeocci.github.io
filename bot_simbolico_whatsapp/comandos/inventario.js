// comandos/inventario.js

const axios = require('axios');

const baseURL = 'https://playpark-simbolico.ngrok.app';

function formatearLinea(nombre, info) {
    return `• ${nombre}: ${info.existencia} ${info.unidad}`;
}

function limpiarNombre(nombreCrudo) {
    return nombreCrudo.replace(/^\d{1,6}\s*\t?/, '').trim();
}

async function procesarComandoInventario(message) {
    const texto = message.body.toLowerCase();
    try {
        const res = await axios.get(`${baseURL}/api/inventario`);
        const inventario = res.data.inventario || {};

        if (!Object.keys(inventario).length) {
            await message.reply("📦 Inventario vacío o no disponible.");
            return;
        }

        // Convertir a array y limpiar nombres
        const lista = Object.entries(inventario).map(([nombre, info]) => {
            return {
                nombre: limpiarNombre(nombre),
                existencia: info.existencia,
                unidad: info.unidad
            };
        });

        let filtrado = [];
        let titulo = "";

        if (texto.includes("todo")) {
            filtrado = lista;
            titulo = "📦 *Inventario completo:*";

        } else if (texto.includes("negativo")) {
            filtrado = lista.filter(p => p.existencia < 0);
            titulo = "🚨 *Productos con existencia negativa:*";

        } else if (texto.includes("agotado")) {
            filtrado = lista.filter(p => p.existencia === 0);
            titulo = "❌ *Productos agotados:*";

        } else if (texto.includes("faltantes")) {
            filtrado = lista.filter(p => p.existencia > 0 && p.existencia <= 3);
            titulo = "⚠️ *Productos casi agotados (≤ 3):*";

        } else if (texto.includes("top")) {
            filtrado = lista.filter(p => p.existencia > 0).sort((a, b) => b.existencia - a.existencia).slice(0, 10);
            titulo = "📊 *Top 10 productos con mayor existencia:*";

        } else {
            filtrado = lista.filter(p => p.existencia > 0).slice(0, 10);
            titulo = "📦 *Inventario actual:*";
        }

        if (!filtrado.length) {
            await message.reply("⚠️ No se encontraron productos para este filtro.");
            return;
        }

        const resumen = filtrado.map(p => formatearLinea(p.nombre, p)).join("\n");
        await message.reply(`${titulo}\n\n${resumen}`);

    } catch (e) {
        console.error("[ERROR] al procesar /inventario:", e.message);
        await message.reply("❌ Error al consultar inventario.");
    }
}

module.exports = {
    procesarComandoInventario
};
