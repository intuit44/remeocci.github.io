// comandos/ventas.js

const axios = require('axios');

const baseURL = 'https://playpark-simbolico.ngrok.app';

function formatearLinea(nombre, valor) {
    return `• ${nombre}: ${valor}`;
}

async function procesarComandoVentas(message) {
    const texto = message.body.toLowerCase();
    let endpoint = "/api/ventas/hoy";
    let titulo = "💰 *Ventas del día*";

    if (texto.includes("ayer")) {
        endpoint = "/api/ventas/ayer";
        titulo = "📆 *Ventas de ayer*";
    } else if (texto.includes("semana")) {
        endpoint = "/api/ventas/semana";
        titulo = "📈 *Ventas de esta semana*";
    } else if (texto.includes("mes")) {
        endpoint = "/api/ventas/mes";
        titulo = "📅 *Ventas de este mes*";
    } else if (texto.includes("detalle")) {
        endpoint = "/api/ventas/detalle";
        titulo = "🔍 *Detalle de ventas por producto*";
    }

    try {
        const res = await axios.get(`${baseURL}${endpoint}`);

        const total = res.data.total_ventas ?? 0;
        const productos = res.data.productos_vendidos || {};

        let lista = Object.entries(productos);

        // Comando especial: /ventas top
        if (texto.includes("top")) {
            lista = lista.sort((a, b) => b[1] - a[1]).slice(0, 10);
            titulo = "🏆 *Top productos más vendidos*";
        }

        // Comando especial: /ventas 0
        else if (texto.includes(" 0") || texto.includes("cero")) {
            lista = lista.filter(([_, valor]) => Number(valor) === 0);
            titulo = "⚠️ *Productos con ventas en 0 (revisar)*";
        }

        if (!lista.length) {
            await message.reply("⚠️ No hay datos disponibles para este filtro de ventas.");
            return;
        }

        const resumen = lista.slice(0, 15).map(([nombre, valor]) => formatearLinea(nombre, valor)).join("\n");

        await message.reply(`${titulo}\nTotal: $${total.toFixed(2)}\n\n${resumen}`);

    } catch (e) {
        console.error("[ERROR] al consultar ventas:", e.message);
        await message.reply("❌ Error al consultar ventas.");
    }
}

module.exports = {
    procesarComandoVentas
};
    