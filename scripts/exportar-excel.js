/**
 * exportar-excel.js — Genera .xlsx desde cualquier parrilla JSON
 * Uso: node scripts/exportar-excel.js <ruta-relativa-json>
 * Ejemplo:
 *   node scripts/exportar-excel.js clientes/draken-vip/01-contenido/parrillas/parrilla-2026-05-19-1828.json
 *
 * Si no se pasa argumento, exporta TODOS los JSON de parrillas de todos los clientes.
 */

const XLSX = require('../servidor/node_modules/xlsx');
const fs   = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

// ── Lógica de generación Excel (espejo del servidor) ──────────────────────────
function generarParrillaExcel(data) {
  const wb = XLSX.utils.book_new();

  // Hoja 1 — Parrilla
  const hdr1 = ['#','FECHA','DÍA','FORMATO','TÍTULO / CONCEPTO','CAPTION','MATERIAL','HOOK / PRIMER FRAME','CTA','HASHTAGS CLAVE','OBJETIVO','ESTADO'];
  const rows1 = [hdr1];
  let lastSemana = 0;
  for (const p of (data.piezas || [])) {
    if (p.semana && p.semana !== lastSemana) {
      lastSemana = p.semana;
      rows1.push([`── SEMANA ${p.semana} ──`, '', '', '', '', '', '', '', '', '', '', '']);
    }
    rows1.push([
      p.numero,               p.fecha              || '',
      p.dia                || '', p.formato            || '',
      p.titulo             || '', p.caption            || '',
      p.material           || '', p.hook_primer_frame  || '',
      p.cta                || '', p.hashtags           || '',
      p.objetivo           || '', p.estado             || '⬜ Pendiente'
    ]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [
    {wch:4},{wch:13},{wch:9},{wch:10},{wch:28},{wch:55},{wch:28},
    {wch:32},{wch:22},{wch:26},{wch:18},{wch:14}
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Parrilla');

  // Hoja 2 — Guía de Producción
  const hdr2 = ['#','PIEZA','TIPO DE EDICIÓN','ESPECIFICACIONES TÉCNICAS','MÚSICA / MOOD','PRIORIDAD'];
  const rows2 = [hdr2];
  for (const g of (data.guia_produccion || [])) {
    rows2.push([
      g.numero,      g.pieza          || '',
      g.tipo_edicion || '', g.specs_tecnicas || '',
      g.musica_mood  || '', g.prioridad      || 'MEDIA'
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{wch:4},{wch:18},{wch:32},{wch:36},{wch:34},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Guía de Producción');

  // Hoja 3 — Banco de Material
  const hdr3 = ['#','DESCRIPCIÓN DEL MATERIAL','TIPO','USO SUGERIDO','CALIDAD ESTIMADA','PIEZA(S) ASIGNADA(S)','ESTADO'];
  const rows3 = [hdr3];
  for (const m of (data.banco_material || [])) {
    rows3.push([
      m.numero,         m.descripcion      || '',
      m.tipo         || '', m.uso_sugerido     || '',
      m.calidad      || '★★★☆☆',
      m.piezas_asignadas || '', m.estado          || '⬜ Sin editar'
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(rows3);
  ws3['!cols'] = [{wch:4},{wch:40},{wch:10},{wch:24},{wch:18},{wch:26},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Banco de Material');

  return wb;
}

// ── Exportar un único archivo JSON → .xlsx ────────────────────────────────────
function exportarUno(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    console.error(`  ❌ No encontrado: ${jsonPath}`);
    return false;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error(`  ❌ JSON inválido en ${path.basename(jsonPath)}: ${e.message}`);
    return false;
  }
  const wb      = generarParrillaExcel(data);
  const xlsxPath = jsonPath.replace(/\.json$/, '.xlsx');
  XLSX.writeFile(wb, xlsxPath);
  console.log(`  ✅ ${path.basename(xlsxPath)}  →  ${xlsxPath}`);
  return true;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const arg = process.argv[2];

if (arg) {
  // Modo: un archivo específico
  const jsonPath = path.resolve(BASE, arg.replace(/\\/g, '/'));
  console.log('\n📊 Exportando Excel...');
  exportarUno(jsonPath);
} else {
  // Modo: todos los JSON de parrillas de todos los clientes
  console.log('\n📊 Exportando Excel de TODAS las parrillas...');
  const clientesDir = path.join(BASE, 'clientes');
  let total = 0, ok = 0;
  for (const cliente of fs.readdirSync(clientesDir)) {
    if (cliente.startsWith('_')) continue;
    const parrillasDir = path.join(clientesDir, cliente, '01-contenido', 'parrillas');
    if (!fs.existsSync(parrillasDir)) continue;
    for (const f of fs.readdirSync(parrillasDir)) {
      if (!f.endsWith('.json')) continue;
      total++;
      process.stdout.write(`  [${cliente}] `);
      if (exportarUno(path.join(parrillasDir, f))) ok++;
    }
  }
  console.log(`\n✅ ${ok}/${total} archivos exportados.`);
}
