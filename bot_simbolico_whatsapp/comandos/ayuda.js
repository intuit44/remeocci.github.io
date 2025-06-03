// comandos/ayuda.js

async function procesarComandoAyuda(message) {
    const ayuda = `📖 *Comandos disponibles* (WhatsApp Bot)

🟢 *Sistema general*
• /ping — Verifica si el bot está activo
• /estado — Estado del sistema operativo remoto

📦 *Inventario*
• /inventario — Productos con stock
• /inventario top — Top productos con más existencia
• /inventario faltantes — Existencia ≤ 3
• /inventario agotado — Existencia = 0
• /inventario negativo — Existencia < 0 (errores)
• /inventario todo — Todo el inventario (sin filtro)

💰 *Ventas*
• /ventas — Ventas del día
• /ventas top — Productos más vendidos
• /ventas detalle — Lista completa por producto
• /ventas 0 — Productos vendidos en 0
• /ventas ayer — Ventas del día anterior
• /ventas semana — Ventas de la semana
• /ventas mes — Ventas del mes

🛒 *Compras*
• /compras — Total de compras del día
• /compras detalle — Productos comprados
• /compras proveedor — Monto por proveedor

🏪 *Proveedores*
• /proveedores — Compras por proveedor
• /proveedores info — Lista de proveedores registrados (RIF + nombre)

🏷️ *Departamentos*
• /departamentos — Lista de departamentos registrados

ℹ️ Para obtener detalles más específicos, puedes escribir por ejemplo:
/inventario negativo
/ventas detalle
/compras proveedor

🧠 *Sistema símbolo activo* — Inspección total remota`;

    await message.reply(ayuda);
}

module.exports = {
    procesarComandoAyuda
};
