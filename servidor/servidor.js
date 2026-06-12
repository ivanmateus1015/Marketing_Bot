const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const multer     = require('multer');
const XLSX       = require('xlsx');
const ExcelJS    = require('exceljs');
const chokidar   = require('chokidar');
const fs         = require('fs');
const path       = require('path');
const http       = require('http');
const https      = require('https');

const app  = express();
const PORT = 3737;
const BASE = path.resolve(__dirname, '..');

// ── Rutas base ────────────────────────────────────────────────────────────────
const CLIENTES_DIR  = path.join(BASE, 'clientes');
const SKILLS_DIR    = path.join(BASE, '.claude', 'skills');
const SCHEMA_FILE   = path.join(BASE, 'data', 'identity-schema.json');
const DATA_JSON     = path.join(BASE, 'data', 'data.json');
const DATA_JS       = path.join(BASE, 'data', 'data.js');
const EXCEL_FILE    = path.join(BASE, 'plantillas', 'Identity_Empresa_v2.xlsx');
const UPLOAD_DIR    = path.join(BASE, 'data', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(BASE));   // sirve dashboard.html desde /

const upload = multer({ dest: UPLOAD_DIR });

// ── Logger ────────────────────────────────────────────────────────────────────
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ── Cache en memoria ──────────────────────────────────────────────────────────
let schemaCache   = null;
let clientesCache = {};

function getSchema() {
  if (!schemaCache) {
    schemaCache = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  }
  return schemaCache;
}

function getClienteDir(slug) {
  return path.join(CLIENTES_DIR, slug);
}

function clienteExiste(slug) {
  const dir = getClienteDir(slug);
  return fs.existsSync(dir) && fs.statSync(dir).isDirectory() && !slug.startsWith('_');
}

function listarClientes() {
  return fs.readdirSync(CLIENTES_DIR)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(CLIENTES_DIR, d)).isDirectory());
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// ── Score ─────────────────────────────────────────────────────────────────────
function calcularScore(identityJson) {
  if (!identityJson) return 0;
  const schema = getSchema();
  const camposObligatorios = schema.campos.filter(
    c => c.obligatorio && c.tipo_dato !== 'auto'
  );
  if (!camposObligatorios.length) return 0;
  let llenos = 0;
  for (const campo of camposObligatorios) {
    const val = identityJson[campo.codigo];
    if (val && val !== '' && !String(val).startsWith('[POR DEFINIR')) llenos++;
  }
  return parseFloat(((llenos / camposObligatorios.length) * 10).toFixed(1));
}

function resumenScore(identityJson) {
  const schema = getSchema();
  const todosCampos = schema.campos.filter(c => c.tipo_dato !== 'auto');
  const obligatorios = todosCampos.filter(c => c.obligatorio);
  let llenos = 0, pendientes = 0;
  for (const campo of todosCampos) {
    const val = identityJson ? identityJson[campo.codigo] : null;
    if (val && val !== '' && !String(val).startsWith('[POR DEFINIR')) llenos++;
    else pendientes++;
  }
  return { total: todosCampos.length, llenos, pendientes, obligatorios: obligatorios.length, score: calcularScore(identityJson) };
}

// ── Generar identity.md desde JSON ───────────────────────────────────────────
function generarIdentityMd(identityJson, slug) {
  const schema = getSchema();
  const score  = calcularScore(identityJson);
  const res    = resumenScore(identityJson);
  const barLen = 20;
  const filled = Math.round((score / 10) * barLen);
  const bar    = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  let md = `# ${identityJson['A'] || slug} — Marketing Identity v2.0\n\n`;
  md += `> Generado por TimeKeepers AI · Score de completitud: **${score}/10** [${bar}]\n`;
  md += `> Campos llenos: ${res.llenos}/${res.total} · Pendientes: ${res.pendientes}\n\n`;
  md += `---\n\n`;

  const bloqueKeys = Object.keys(schema.bloques).sort((a, b) => schema.bloques[a].orden - schema.bloques[b].orden);

  for (const bloqueKey of bloqueKeys) {
    const bloque = schema.bloques[bloqueKey];
    const campos = schema.campos.filter(c => c.bloque === bloqueKey);
    if (!campos.length) continue;

    md += `## ${bloque.icono} Bloque ${bloque.orden}: ${bloque.titulo}\n\n`;

    for (const campo of campos) {
      const val = identityJson[campo.codigo];
      const isEmpty = !val || val === '' || String(val).startsWith('[POR DEFINIR');
      const badge   = campo.obligatorio ? '*(Req)*' : '*(Opc)*';
      const label   = `**${campo.nombre_humano}** \`${campo.codigo}\` ${badge}`;

      if (campo.tipo_dato === 'auto') {
        md += `- ${label}: *Auto-gestionado por n8n*\n`;
      } else if (isEmpty) {
        md += `- ${label}: ⚠️ *[POR DEFINIR]*\n`;
      } else {
        const display = String(val).replace(/\n/g, ' ').substring(0, 200);
        md += `- ${label}: ${display}\n`;
      }
    }
    md += `\n`;
  }

  md += `---\n*TimeKeepers AI · Uso interno · No compartir con el cliente*\n`;
  return md;
}

// ── Procesar Excel ────────────────────────────────────────────────────────────
async function procesarExcelIdentity(filePath, clienteSlug, hoja) {
  const wb   = XLSX.readFile(filePath);
  const hojaTarget = hoja || clienteSlug.toUpperCase().replace(/-/g, '_');
  const hojas = wb.SheetNames;

  // Buscar la hoja (flexible: DRAKEN, draken-vip → DRAKEN)
  let sheetName = hojas.find(h => h === hojaTarget)
    || hojas.find(h => h.toUpperCase() === hojaTarget.toUpperCase())
    || hojas.find(h => h.toUpperCase().includes(clienteSlug.split('-')[0].toUpperCase()));

  if (!sheetName) {
    throw new Error(`Hoja "${hojaTarget}" no encontrada. Hojas disponibles: ${hojas.join(', ')}`);
  }

  const ws   = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const identityJson = {};
  let camposLlenos   = 0;
  let camposPend     = 0;
  const errores      = [];

  for (const row of rows) {
    const codigo = String(row[1] || '').trim();
    const valor  = String(row[4] || '').trim();

    // Saltar filas de cabecera y vacías
    if (!codigo || codigo === 'Código' || codigo.length > 5) continue;

    if (valor && !valor.startsWith('[POR DEFINIR')) {
      identityJson[codigo] = valor;
      camposLlenos++;
    } else {
      identityJson[codigo] = '';
      camposPend++;
    }
  }

  const score = calcularScore(identityJson);

  // Backup del identity anterior
  const identityJsonPath = path.join(getClienteDir(clienteSlug), '00-identity', 'identity.json');
  const identityMdPath   = path.join(getClienteDir(clienteSlug), '00-identity', 'identity.md');

  if (fs.existsSync(identityJsonPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(identityJsonPath, identityJsonPath.replace('.json', `.backup-${ts}.json`));
  }
  if (fs.existsSync(identityMdPath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(identityMdPath, identityMdPath.replace('.md', `.v1.bak.md`));
  }

  // Guardar identity.json
  fs.mkdirSync(path.dirname(identityJsonPath), { recursive: true });
  fs.writeFileSync(identityJsonPath, JSON.stringify(identityJson, null, 2), 'utf8');

  // Generar y guardar identity.md
  const mdContent = generarIdentityMd(identityJson, clienteSlug);
  fs.writeFileSync(identityMdPath, mdContent, 'utf8');

  log(`[${clienteSlug}] Identity generado. Score: ${score}/10, llenos: ${camposLlenos}, pendientes: ${camposPend}`);

  return {
    slug:            clienteSlug,
    hoja:            sheetName,
    campos_totales:  camposLlenos + camposPend,
    campos_llenos:   camposLlenos,
    campos_pendientes: camposPend,
    score,
    identity_json_bytes: Buffer.byteLength(JSON.stringify(identityJson), 'utf8'),
    identity_md_bytes:   Buffer.byteLength(mdContent, 'utf8'),
    errores,
  };
}

// ── Leer historial de un cliente ──────────────────────────────────────────────
function leerHistorial(slug) {
  const histPath = path.join(getClienteDir(slug), '_historial.md');
  const content  = readFileSafe(histPath);
  if (!content) return { total: 0, ultimaActividad: '—', angulos: {}, bitacora: [] };

  const totalMatch = content.match(/- Total de piezas creadas:\s*(\d+)/);
  const actMatch   = content.match(/- Última actividad:\s*(.+)/);
  const angulos    = {};
  const angulosRx  = /\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/g;
  let m;
  while ((m = angulosRx.exec(content)) !== null) {
    const k = m[1].trim();
    if (k && k !== 'Ángulo' && !k.startsWith('-')) angulos[k] = parseInt(m[2], 10);
  }
  const bitacora = [];
  let inBit = false, skipH = true;
  for (const line of content.split('\n')) {
    if (line.includes('## Bitácora')) { inBit = true; skipH = true; continue; }
    if (inBit && line.trim().startsWith('|') && !line.includes('---')) {
      if (skipH) { skipH = false; continue; }
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 5 && cols[0] !== 'Fecha') {
        bitacora.push({ fecha: cols[0], tipo: cols[1], archivo: cols[2], skills: cols[3], angulos: cols[4], score: cols[5] || '—' });
      }
    }
  }
  return { total: parseInt(totalMatch?.[1] || '0', 10), ultimaActividad: actMatch?.[1]?.trim() || '—', angulos, bitacora };
}

// ── Generar data.json + data.js ───────────────────────────────────────────────
function generarDashboardData() {
  const schema  = getSchema();
  const slugs   = listarClientes();
  const clientes = [];

  for (const slug of slugs) {
    const identityJson = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
    const historial    = leerHistorial(slug);
    const sr           = resumenScore(identityJson);

    // Escanear archivos de output
    const archivos = [];
    const subdirs  = ['01-contenido', '02-paid-ads', '03-email', '04-landing-pages'];
    for (const sub of subdirs) {
      const subPath = path.join(getClienteDir(slug), sub);
      if (!fs.existsSync(subPath)) continue;
      (function scan(dir, rel) {
        for (const item of fs.readdirSync(dir)) {
          if (item === '.gitkeep') continue;
          const full = path.join(dir, item);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) scan(full, path.join(rel, item));
          else archivos.push({ nombre: item, ruta: path.join(rel, item).replace(/\\/g, '/'), modificado: stat.mtime.toISOString().split('T')[0] });
        }
      })(subPath, sub);
    }

    clientes.push({
      slug,
      nombre:            identityJson?.['A'] || slug,
      plan:              identityJson?.['AA'] || '—',
      tiene_identity:    !!identityJson,
      score_identity:    sr.score,
      campos_llenos:     sr.llenos,
      campos_pendientes: sr.pendientes,
      ciudad:            identityJson?.['J'] || '—',
      tono:              identityJson?.['C'] || '—',
      ultima_actividad:  historial.ultimaActividad,
      total_piezas:      historial.total,
      angulos_usados:    historial.angulos,
      website_url:       identityJson?.['website_url'] || '',
      archivos,
      historial,
    });
  }

  // Skills
  const skills = [];
  for (const d of fs.readdirSync(SKILLS_DIR)) {
    const skillPath = path.join(SKILLS_DIR, d);
    if (!fs.statSync(skillPath).isDirectory()) continue;
    const content = readFileSafe(path.join(skillPath, 'SKILL.md')) || readFileSafe(path.join(skillPath, 'skill.md'));
    if (!content) continue;
    const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
    let displayName = d, description = '';
    if (fm) {
      const name = fm[1].match(/^name:\s*(.+)/m);
      const desc = fm[1].match(/^description:\s*(.+)/m);
      if (name) displayName = name[1].trim().replace(/['"]/g, '');
      if (desc) description = desc[1].trim().replace(/['"]/g, '').substring(0, 160);
    }
    skills.push({ slug: d, displayName, description });
  }

  const data = {
    metadata: { actualizado: new Date().toISOString(), version_workspace: '2.0', version_schema: schema.version || '2.0.0' },
    clientes,
    skills,
    schema_resumen: {
      bloques: Object.keys(schema.bloques).length,
      campos_totales: schema.campos.length,
      campos_obligatorios: schema.campos.filter(c => c.obligatorio).length,
    }
  };

  fs.mkdirSync(path.dirname(DATA_JSON), { recursive: true });
  fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2), 'utf8');
  fs.writeFileSync(DATA_JS, `window.DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};`, 'utf8');

  log(`Dashboard data generado — ${clientes.length} clientes, ${skills.length} skills`);
  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString(), puerto: PORT });
});

// Regenerar data.json + data.js manualmente
app.post('/api/regenerar', (req, res) => {
  try {
    const data = generarDashboardData();
    res.json({ ok: true, clientes: data.clientes.length, skills: data.skills.length, actualizado: data.metadata.actualizado });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Clientes ──────────────────────────────────────────────────────────────────
app.get('/api/clientes', (req, res) => {
  try {
    const slugs = listarClientes();
    const lista = slugs.map(slug => {
      const identityJson = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
      const sr = resumenScore(identityJson);
      return { slug, nombre: identityJson?.['A'] || slug, tiene_identity: !!identityJson, score: sr.score, plan: identityJson?.['AA'] || '—' };
    });
    res.json({ ok: true, clientes: lista });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/cliente/:slug', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  try {
    const identityJson = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
    const historial    = leerHistorial(slug);
    const sr           = resumenScore(identityJson);
    res.json({ ok: true, slug, tiene_identity: !!identityJson, score: sr.score, campos: sr, historial });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/cliente/:slug/identity', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  const identityPath = path.join(getClienteDir(slug), '00-identity', 'identity.json');
  const data = readJsonSafe(identityPath);
  if (!data) return res.status(404).json({ ok: false, error: 'identity.json no encontrado — usa /upload-excel para cargarlo' });
  res.json({ ok: true, slug, identity: data });
});

app.put('/api/cliente/:slug/identity', async (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  try {
    const identityPath = path.join(getClienteDir(slug), '00-identity', 'identity.json');
    const identityMdPath = path.join(getClienteDir(slug), '00-identity', 'identity.md');

    // Backup antes de sobreescribir
    if (fs.existsSync(identityPath)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(identityPath, identityPath.replace('.json', `.backup-${ts}.json`));
    }

    const newData = req.body;
    fs.writeFileSync(identityPath, JSON.stringify(newData, null, 2), 'utf8');
    fs.writeFileSync(identityMdPath, generarIdentityMd(newData, slug), 'utf8');

    const sr = resumenScore(newData);
    log(`[${slug}] Identity actualizado vía PUT. Score: ${sr.score}`);
    res.json({ ok: true, score: sr.score, campos: sr });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/api/cliente/:slug/identity/campo/:codigo', async (req, res) => {
  const { slug, codigo } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  try {
    const identityPath = path.join(getClienteDir(slug), '00-identity', 'identity.json');
    const current = readJsonSafe(identityPath) || {};
    current[codigo] = req.body.valor;
    fs.writeFileSync(identityPath, JSON.stringify(current, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(getClienteDir(slug), '00-identity', 'identity.md'),
      generarIdentityMd(current, slug), 'utf8'
    );
    const sr = resumenScore(current);
    res.json({ ok: true, codigo, valor: req.body.valor, score: sr.score });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/cliente/:slug/identity/upload-excel', upload.single('excel'), async (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibió archivo Excel' });
  try {
    const hoja   = req.body.hoja || null;
    const result = await procesarExcelIdentity(req.file.path, slug, hoja);
    fs.unlinkSync(req.file.path);
    generarDashboardData();
    res.json({ ok: true, ...result });
  } catch (e) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    log(`[${slug}] Error procesando Excel: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/cliente/:slug/identity/score', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  const data = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
  res.json({ ok: true, slug, ...resumenScore(data) });
});

app.post('/api/cliente/:slug/identity/backup', (req, res) => {
  const { slug } = req.params;
  const identityPath = path.join(getClienteDir(slug), '00-identity', 'identity.json');
  if (!fs.existsSync(identityPath)) return res.status(404).json({ ok: false, error: 'identity.json no existe' });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = identityPath.replace('.json', `.backup-${ts}.json`);
  fs.copyFileSync(identityPath, dest);
  res.json({ ok: true, backup: dest });
});

app.get('/api/cliente/:slug/historial', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  res.json({ ok: true, slug, ...leerHistorial(slug) });
});

// Registrar revisión/vista de un archivo en el historial
app.post('/api/cliente/:slug/historial/vista', (req, res) => {
  const { slug } = req.params;
  const { archivo } = req.body || {};
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  if (!archivo) return res.status(400).json({ ok: false, error: 'Falta campo "archivo"' });

  const histPath = path.join(getClienteDir(slug), '_historial.md');
  let content = readFileSafe(histPath);
  if (!content) return res.status(400).json({ ok: false, error: 'Historial no encontrado' });

  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora  = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
  const nuevaFila = `| ${fecha} ${hora} | vista | ${archivo} | — | — | — |`;

  // Encontrar última fila de la tabla en sección Bitácora e insertar después
  const lines = content.split('\n');
  let lastTableIdx = -1;
  let inBit = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('## Bitácora')) { inBit = true; continue; }
    if (inBit) {
      if (lines[i].startsWith('##')) break;
      if (lines[i].trim().startsWith('|')) lastTableIdx = i;
    }
  }

  if (lastTableIdx < 0) return res.status(400).json({ ok: false, error: 'Sección Bitácora no encontrada' });

  lines.splice(lastTableIdx + 1, 0, nuevaFila);
  fs.writeFileSync(histPath, lines.join('\n'), 'utf8');
  regenDebounced(histPath);
  log(`[${slug}] Vista registrada: ${archivo}`);
  res.json({ ok: true, fila: nuevaFila });
});

// ── Schema y Skills ───────────────────────────────────────────────────────────
app.get('/api/schema', (req, res) => {
  try { res.json({ ok: true, schema: getSchema() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/skills', (req, res) => {
  try {
    const skills = [];
    for (const d of fs.readdirSync(SKILLS_DIR)) {
      const skillPath = path.join(SKILLS_DIR, d);
      if (!fs.statSync(skillPath).isDirectory()) continue;
      const content = readFileSafe(path.join(skillPath, 'SKILL.md')) || '';
      const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
      let name = d, description = '';
      if (fm) {
        const n = fm[1].match(/^name:\s*(.+)/m);
        const dc = fm[1].match(/^description:\s*(.+)/m);
        if (n) name = n[1].trim().replace(/['"]/g, '');
        if (dc) description = dc[1].trim().replace(/['"]/g, '').substring(0, 200);
      }
      skills.push({ slug: d, name, description });
    }
    res.json({ ok: true, total: skills.length, skills });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/api/skills/:nombre', (req, res) => {
  const skillPath = path.join(SKILLS_DIR, req.params.nombre);
  if (!fs.existsSync(skillPath)) return res.status(404).json({ ok: false, error: 'Skill no encontrada' });
  const content = readFileSafe(path.join(skillPath, 'SKILL.md')) || '';
  res.json({ ok: true, slug: req.params.nombre, content: content.substring(0, 3000) });
});

// ── Utilidades ────────────────────────────────────────────────────────────────
app.post('/api/cliente/nuevo', async (req, res) => {
  const { slug, nombre } = req.body;
  if (!slug) return res.status(400).json({ ok: false, error: 'slug requerido' });
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const clienteDir = getClienteDir(cleanSlug);
  if (fs.existsSync(clienteDir)) return res.status(409).json({ ok: false, error: 'Cliente ya existe' });

  const subdirs = [
    '00-identity',
    '01-contenido/parrillas', '01-contenido/stories', '01-contenido/reels',
    '02-paid-ads/meta-ads', '02-paid-ads/google-ads',
    '03-email', '04-landing-pages'
  ];
  for (const sub of subdirs) {
    fs.mkdirSync(path.join(clienteDir, sub), { recursive: true });
    fs.writeFileSync(path.join(clienteDir, sub, '.gitkeep'), '');
  }

  // Copiar plantilla de identity
  const plantillaSrc = path.join(CLIENTES_DIR, '_plantilla', '00-identity', 'identity.md');
  if (fs.existsSync(plantillaSrc)) {
    fs.copyFileSync(plantillaSrc, path.join(clienteDir, '00-identity', 'identity.md'));
  }

  // Crear historial
  const histContent = `# Historial de Producción — ${nombre || cleanSlug}\n\n## Resumen\n- Total de piezas creadas: 0\n- Última actividad: —\n- Plan activo: [POR DEFINIR]\n\n## Ángulos usados (anti-redundancia)\n| Ángulo | Conteo |\n|--------|--------|\n| Ejecutivo | 0 |\n| Aspiracional | 0 |\n| Educativo | 0 |\n| Lifestyle | 0 |\n\n## Bitácora cronológica\n\n| Fecha | Tipo | Archivo | Skills aplicadas | Ángulos | Score |\n|-------|------|---------|------------------|---------|-------|\n`;
  fs.writeFileSync(path.join(clienteDir, '_historial.md'), histContent, 'utf8');

  log(`Nuevo cliente creado: ${cleanSlug}`);
  generarDashboardData();
  res.json({ ok: true, slug: cleanSlug, dir: clienteDir });
});

app.get('/api/dashboard-data', (req, res) => {
  try {
    const data = generarDashboardData();
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Archivos de output del cliente ───────────────────────────────────────────
app.get('/api/cliente/:slug/archivos', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });

  const archivos = [];
  const subdirs = ['01-contenido', '02-paid-ads', '03-email', '04-landing-pages'];
  for (const sub of subdirs) {
    const subPath = path.join(getClienteDir(slug), sub);
    if (!fs.existsSync(subPath)) continue;
    (function scan(dir, rel) {
      for (const item of fs.readdirSync(dir)) {
        if (item === '.gitkeep') continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { scan(full, path.join(rel, item)); return; }
        archivos.push({
          nombre: item,
          carpeta: rel.split(path.sep)[0] || rel,
          ruta: path.join('clientes', slug, rel, item).replace(/\\/g, '/'),
          modificado: stat.mtime.toISOString().split('T')[0],
          tamano: stat.size,
          extension: path.extname(item).slice(1).toLowerCase(),
        });
      }
    })(subPath, sub);
  }
  archivos.sort((a, b) => b.modificado.localeCompare(a.modificado));
  res.json({ ok: true, slug, total: archivos.length, archivos });
});

// ── Descarga de archivo ───────────────────────────────────────────────────────
app.get('/api/archivo', (req, res) => {
  const ruta = req.query.ruta;
  if (!ruta) return res.status(400).json({ ok: false, error: 'Parámetro ruta requerido' });
  const fullPath = path.resolve(BASE, ruta.replace(/\//g, path.sep));
  if (!fullPath.startsWith(path.join(BASE, 'clientes'))) {
    return res.status(403).json({ ok: false, error: 'Acceso denegado' });
  }
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
  }
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
  res.sendFile(fullPath);
});

// ── Leer parrilla JSON (para modal de detalle en dashboard) ──────────────────
app.get('/api/cliente/:slug/leer-parrilla', (req, res) => {
  const { slug } = req.params;
  const archivo = (req.query.archivo || '').trim();
  if (!archivo || !archivo.endsWith('.json'))
    return res.status(400).json({ ok: false, error: 'Archivo JSON requerido' });
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\'))
    return res.status(400).json({ ok: false, error: 'Nombre de archivo inválido' });
  if (!clienteExiste(slug))
    return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  const filePath = path.join(getClienteDir(slug), '01-contenido', 'parrillas', archivo);
  const data = readJsonSafe(filePath);
  if (!data)
    return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
  res.json({ ok: true, data });
});

// ── Leer cadena de stories JSON ───────────────────────────────────────────────
app.get('/api/cliente/:slug/leer-stories', (req, res) => {
  const { slug } = req.params;
  const archivo = (req.query.archivo || '').trim();
  if (!archivo || !archivo.endsWith('.json'))
    return res.status(400).json({ ok: false, error: 'Archivo JSON requerido' });
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\'))
    return res.status(400).json({ ok: false, error: 'Nombre de archivo inválido' });
  if (!clienteExiste(slug))
    return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  const filePath = path.join(getClienteDir(slug), '01-contenido', 'stories', archivo);
  const data = readJsonSafe(filePath);
  if (!data)
    return res.status(404).json({ ok: false, error: 'Archivo no encontrado' });
  res.json({ ok: true, data });
});

// ── Generador de prompt de parrilla ──────────────────────────────────────────
app.post('/api/cliente/:slug/generar-prompt-parrilla', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });

  const { semanas = 1, descripcion = '', material = '', skills_seleccionadas = [] } = req.body;
  const identityJson = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
  const nombre = identityJson?.['A'] || slug;
  const plan   = identityJson?.['AA'] || '—';
  const pubSemana = 3;
  const totalPosts = parseInt(semanas, 10) * pubSemana;
  const now = new Date();
  const ts  = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const tsDate = now.toISOString().split('T')[0];
  const mes = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const contextBloque = descripcion
    ? `Tema / Contexto adicional: ${descripcion}`
    : 'Tema / Contexto: usar los pilares de contenido definidos en identity.md';

  const materialBloque = material
    ? `\nMaterial disponible:\n${material}` : '';

  const prompt =
`## PARRILLA DE CONTENIDO — ${nombre.toUpperCase()} — ${mes}

---

## PASO 1 — LEER AL CLIENTE ANTES DE GENERAR (no saltear)

Cliente: **${slug}**

1. Lee clientes/${slug}/00-identity/identity.md y extrae SIN RESUMIR:
   - Buyer persona: nombre real, edad, dolor específico, qué lo frena a contratar
   - Proyectos reales: nombre exacto, qué problema resolvió, materiales, tiempo de entrega, resultado medible
   - Diferenciadores: qué hace esta firma que la competencia NO hace — ser específico
   - Restricciones de comunicación: qué NO se puede decir ni prometer
   - Hashtag de marca, paleta, tono

2. Lee clientes/${slug}/_historial.md:
   - Keywords DM ya usadas → prohibido repetir
   - Hooks y conceptos ya trabajados → prohibido repetir
   - Patrones de carrusel usados → rotar

3. Lee las últimas 2 parrillas en clientes/${slug}/01-contenido/parrillas/:
   - Identificar qué copy ya se usó → no repetir ninguna frase ni concepto

---

## PASO 2 — PARÁMETROS

- Cliente: ${slug} | Plan: ${plan}
- Duración: ${semanas} semana(s) — ${totalPosts} piezas — ${mes}
- Distribución: Lunes=Reel · Miércoles=Carrusel · Viernes=Foto
- ${contextBloque}${materialBloque}

---

## PASO 3 — SCHEMA JSON

Estructura exacta. Sin campos extra. Sin guia_produccion. Sin banco_material.

{
  "meta": {
    "cliente": "${slug}",
    "slug": "${slug}",
    "periodo": "${mes}",
    "semanas": ${semanas},
    "total_piezas": ${totalPosts},
    "generado": "${ts}"
  },
  "piezas": [
    {
      "numero": 1,
      "fecha": "Lun 9 Jun",
      "dia": "Lunes",
      "formato": "Reel",
      "titulo": "<Concepto editorial — no el tema, la TESIS de la pieza>",
      "pilar": "<Pilar del identity — copiado textual>",
      "objetivo": "<Objetivo primario / Objetivo secundario — ej: Conversión / Lead Gen>",
      "material": "<Nombre del proyecto real + qué momento específico captura + por qué ese momento sirve al copy>",
      "hook_primer_frame": "<0–1.5s: descripción exacta de lo que aparece en pantalla. Para Reels: si hay texto overlay, fuente y posición. Para Carruseles: composición exacta del slide 1. Para Fotos: ángulo, luz, elemento en primer plano>",
      "narracion_off": "<Solo Reels: guión completo con timestamps — 0s:[acción visual] | 3s:'frase hablada [pausa]' | 8s:'frase [énfasis]' | cierre:'CTA hablado con urgencia'. Para Carrusel y Foto: N/A>",
      "copy_slides": "<Solo Carruseles: S1[Gancho] título≤6pal·apoyo≤12pal | S2[Desarrollo]... | S(n-1)[Clímax] dato concreto | S_final[CTA] keyword+urgencia. Para Reel y Foto: N/A>",
      "caption_post": "<Ver reglas PASO 4 — este campo determina el 80% del resultado>",
      "cta_keyword": "<Ver reglas PASO 4 — CTA con urgencia real, no genérico>",
      "hashtags": "#MarcaCliente #nicho1 #nicho2 #nicho3 #mid1 #mid2 #mid3 #mid4 #mid5 #broad1 #broad2 #broad3",
      "estado": "⬜ Pendiente"
    }
  ]
}

Prohibido incluir: hora, prioridad, specs, caption_reel, caption_version_b,
hook_reel_a, hook_reel_b, hashtag_stack, meta_ad_carrusel, story_teaser,
email_nurturing_hook, kpi_tracking, trigger_psicologico, objecion_respuesta,
brief_imagen, nivel_produccion, angulo, guia_produccion, banco_material.

---

## PASO 4 — CÓMO APLICAR CADA SKILL (esto es lo que hace la diferencia)

### SKILL: copywriting → caption_post y narracion_off
El caption no describe — PROVOCA. Cada línea gana el derecho a la siguiente.
Estructura obligatoria:
- Línea 1 (HOOK): afirmación que duele, dato que sorprende o contradicción que engancha. Máx 8 palabras. NUNCA una descripción.
  ✅ "Tres arquitectos rechazaron este lote. Urbex lo entregó en 6 semanas."
  ❌ "Diseñar en la montaña tiene sus particularidades."
- Líneas 2–3 (PRUEBA): nombre real del proyecto + dato concreto (semanas, materiales, resultado medible). El lector debe entender QUÉ pasó exactamente.
- Línea 4 (DIFERENCIADOR): lo que este cliente hace que la competencia no. Debe ser verificable, no una opinión.
- Línea 5 (CTA): ver sección cta_keyword abajo.
PROHIBIDO EN CUALQUIER LÍNEA: "El lujo está en los detalles" · "La calidad habla por sí sola" · "Somos apasionados" · "Transformamos espacios" · "Hacemos realidad tus sueños" · cualquier frase que aplique a otra marca.

### SKILL: marketing-psychology → hook_primer_frame, copy_slides (slide 1), cta_keyword
Aplicar UN trigger por pieza — visible en el copy, no etiquetado:
- Escasez real: "Solo 3 proyectos nuevos en julio. Quedan 2." (si aplica al cliente)
- Pérdida de valor: cuantificar lo que cuesta NO actuar — "$15M perdidos en mantenimiento en 10 años"
- Prueba social específica: "Andrés, 45 años, dudó 3 meses. Firmó en la segunda reunión."
- Autoridad por proceso: detalles técnicos que demuestran expertise, no credenciales genéricas
- Curiosidad con cierre: el hook crea una pregunta que SOLO se responde leyendo o swipeando

### SKILL: social-content → formato, hook_primer_frame, hashtags
- Reel: el hook visual en 0–0.5s detiene el scroll antes de que haya texto. Si los primeros 0.5s no son poderosos visualmente, el Reel falla aunque el copy sea perfecto.
- Carrusel: el slide 1 NUNCA revela la respuesta — planta la pregunta. Si el gancho del slide 1 ya responde lo que promete, nadie swipea.
- Foto: la composición hace UNA sola afirmación visual. No "foto bonita del proyecto" sino el momento que prueba el claim del caption.
- Hashtags: #MarcaCliente siempre primero. Luego ultra-nicho (bajo volumen, alta intención). Geográficos siempre al final.

### SKILL: content-strategy → secuencia entre semanas y entre piezas
La parrilla es un funnel, no piezas sueltas. Cada semana tiene un rol:
- Semana 1 (INTERRUPCIÓN): romper creencias instaladas. "Lo que creés de [tema] está mal."
- Semana 2 (AUTORIDAD): demostrar que esta firma sabe algo que la competencia no sabe mostrar.
- Semana 3 (VALIDACIÓN): prueba externa. Proyectos reales, clientes reales, cifras reales.
- Semana 4 (URGENCIA): razón concreta para actuar esta semana, no el mes que viene.
Cada pieza funciona sola Y empuja al siguiente paso del funnel.

### SKILL: image → material (campo)
El material no es "foto del proyecto terminado". Es el momento visual que PRUEBA el claim del caption.
- Si el caption dice "así se ve una casa campestre bien diseñada" → el material es el exterior de Casa Calera con la montaña de fondo en luz de tarde.
- Si el caption dice "el proceso es lo que marca la diferencia" → el material son los planos en mesa, no el resultado.
- Describir: proyecto exacto + momento específico + por qué ese momento sirve a la narrativa.

### SKILL: marketing-ideas → titulo y concepto de cada pieza
El título no es el tema. Es la TESIS. Una afirmación específica que no puede venir de ninguna otra firma.
✅ "Casa Calera: el lote que 3 firmas rechazaron y Urbex entregó en 6 semanas"
❌ "Casa Calera — proyecto terminado en La Calera"
La tesis contraintuitiva o la historia específica separa una parrilla memorable de una genérica.

### SKILL: copy-editing → revisar caption_post antes de escribirlo en el JSON
Aplicar estos filtros en orden:
1. ¿La línea 1 detiene el scroll o describe? Si describe → reescribir.
2. ¿Hay alguna frase que podría aparecer en la cuenta de un competidor? Si sí → eliminar.
3. ¿El CTA tiene una razón concreta para actuar ahora? Si no → agregar urgencia.
4. ¿El caption tiene palabras de relleno ("muy", "realmente", "de hecho")? Eliminarlas.
5. ¿Cada línea gana el derecho a la siguiente? Si una línea no aporta → eliminar.

---

## PASO 5 — REGLAS DE cta_keyword (campo crítico)

El CTA tiene tres componentes obligatorios:
1. ACCIÓN exacta: qué debe hacer el usuario (DM, comentar, guardar)
2. BENEFICIO inmediato: qué recibe al hacer esa acción
3. URGENCIA o ESCASEZ: razón para actuar HOY y no la semana que viene

Ejemplos de CTA débil vs fuerte:
❌ "DM 'CALERA' para cotizar" — no hay urgencia ni beneficio claro
✅ "Si tu proyecto campestre empieza este año, escribinos CALERA hoy. En julio nos quedan 2 cupos de diseño."

❌ "Guarda + Comparte" — genérico
✅ "Guardá esto antes de aceptar cualquier presupuesto de remodelación."

Piezas Conversión/Lead Gen: siempre incluir keyword DM en mayúsculas + urgencia.
Piezas Awareness/Engagement: CTA que genere acción real (guardar, comentar, tagear) + razón específica para hacerlo.

---

## PASO 6 — objetivo (campo — leer con atención)

Formato obligatorio: "Objetivo primario / Objetivo secundario"
Combinaciones válidas:
- "Conversión / Lead Gen" — pieza que busca contacto directo
- "Awareness / Trust" — pieza que genera reach y construye credibilidad
- "Engagement / Awareness" — pieza que busca interacción y alcance
- "Lead Gen / Conversión" — pieza que captura leads y empuja a cotizar
- "Trust / Engagement" — prueba social que genera conversación
No usar objetivo único. Siempre dos.

---

## PASO 7 — HONESTIDAD EN EL OUTPUT

NO reportar score a menos que la calidad lo justifique objetivamente.
Si hay piezas con copy genérico, hooks débiles o CTAs sin urgencia → declararlo y proponer reescritura.
Un score inventado no ayuda a mejorar — una crítica honesta sí.
Al finalizar: reportar qué piezas son las más fuertes, cuáles necesitan revisión y por qué.

---

## PASO 8 — ACCIONES AL TERMINAR

1. Guardar JSON en: clientes/${slug}/01-contenido/parrillas/parrilla-${ts}.json
2. Actualizar clientes/${slug}/_historial.md:
   - Keywords DM usadas en esta parrilla
   - Hooks y tesis principales (para no repetir)
   - Patrones de carrusel usados
   - Proyectos referenciados
3. Reportar honestamente: piezas fuertes, piezas a mejorar, por qué.`.trim();

  log(`[${slug}] Prompt parrilla generado — ${semanas} semanas, ${totalPosts} posts`);
  res.json({ ok: true, slug, prompt, semanas, total_posts: totalPosts });
});

// ── Excel generator ───────────────────────────────────────────────────────────
async function generarParrillaExcel(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TimeKeepers AI';
  wb.created = new Date();

  // Paleta
  const NEGRO   = 'FF0D0D0D';
  const COBRE   = 'FFB87333';
  const OSCURO  = 'FF1A1A1A';
  const SEP_BG  = 'FF2C2C2C';
  const BLANCO  = 'FFF5F5F5';
  const TEXTO   = 'FF0D0D0D';
  const BORDE   = 'FFD9D9D9';
  const REEL_BG = 'FFF8F0F0';
  const CAR_BG  = 'FFF0F4F8';
  const FOTO_BG = 'FFF0F8F0';
  const REEL_FG = 'FFC62828';
  const CAR_FG  = 'FF1565C0';
  const FOTO_FG = 'FF2E7D32';
  const ALTA_C  = 'FFB87333';
  const MEDIA_C = 'FF888888';
  const BAJA_C  = 'FFAAAAAA';

  // Columnas: # · FECHA · DÍA · HORA · PLATAFORMA · FORMATO · TÍTULO · PILAR · OBJETIVO · MATERIAL · HOOK · NARRACIÓN · COPY SLIDES · CAPTION · CTA · HASHTAGS · ESTADO
  const TOTAL_COLS = 17;

  // ── Hoja única: Parrilla ───────────────────────────────────────────────────
  const ws = wb.addWorksheet('Parrilla');

  const anchos = [4, 11, 8, 10, 20, 8, 30, 22, 14, 30, 35, 40, 45, 50, 35, 30, 16];
  anchos.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const clienteNombre = (data.meta?.cliente || data.meta?.slug || 'Cliente').toUpperCase();
  const periodo = data.meta?.periodo || data.meta?.generado || '';
  const mercado = data.meta?.mercado || '';
  const pubSemana = data.meta?.publicaciones_por_semana || 3;

  // ── Fila 1: Banner ─────────────────────────────────────────────────────────
  const bannerRow = ws.addRow([
    `${clienteNombre} · CONTENT CALENDAR · ${periodo}${mercado ? ' · ' + mercado : ''}`
  ]);
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const bannerCell = ws.getCell('A1');
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NEGRO } };
  bannerCell.font = { bold: true, color: { argb: BLANCO }, size: 12, name: 'Arial' };
  bannerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  bannerRow.height = 22;

  // ── Fila 2: Headers ─────────────────────────────────────────────────────────
  const HEADERS = [
    '#', 'FECHA', 'DÍA', 'HORA', 'PLATAFORMA', 'FORMATO',
    'TÍTULO / CONCEPTO', 'PILAR', 'OBJETIVO',
    'MATERIAL A USAR', 'HOOK / PRIMER FRAME',
    'NARRACIÓN OFF', 'COPY SLIDES',
    'CAPTION POST', 'CTA + KEYWORD DM',
    'HASHTAGS', 'ESTADO'
  ];
  const headerRow = ws.addRow(HEADERS);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OSCURO } };
    cell.font = { bold: true, color: { argb: COBRE }, size: 9, name: 'Arial' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // Freeze A–F siempre visibles (#, fecha, día, hora, plataforma, formato)
  ws.views = [{ state: 'frozen', xSplit: 6, ySplit: 2 }];

  let lastSemana = 0;

  for (const p of (data.piezas || [])) {
    const semana = p.semana || Math.ceil((p.numero || 1) / pubSemana);

    // Separador de semana
    if (semana !== lastSemana) {
      lastSemana = semana;
      const sepRow = ws.addRow([`── SEMANA ${semana} ──`]);
      ws.mergeCells(sepRow.number, 1, sepRow.number, TOTAL_COLS);
      const sepCell = ws.getCell(sepRow.number, 1);
      sepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEP_BG } };
      sepCell.font = { bold: true, color: { argb: BLANCO }, size: 9, name: 'Arial' };
      sepCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sepRow.height = 16;
    }

    // Resolver copy_slides (string nuevo | array viejo)
    let copySlides = '';
    if (Array.isArray(p.copy_slides)) {
      copySlides = p.copy_slides.map(s =>
        `S${s.slide}[${s.rol || ''}] ${s.texto_principal || ''}${s.texto_apoyo ? ' · ' + s.texto_apoyo : ''}`
      ).join('\n');
    } else if (typeof p.copy_slides === 'string') {
      copySlides = p.copy_slides;
    }

    const caption   = p.caption_post || p.caption || '';
    const ctaKw     = p.cta_keyword  || (p.cta && p.keyword_dm ? `${p.cta} · DM '${p.keyword_dm}'` : (p.cta || (p.keyword_dm ? `DM '${p.keyword_dm}'` : '')));
    const narracion = p.narracion_off || '';
    const formato   = p.formato || '';
    const objetivo  = p.objetivo || '';

    // Color de fondo por formato
    let rowBg;
    switch (formato.toLowerCase()) {
      case 'reel':     rowBg = REEL_BG; break;
      case 'carrusel': rowBg = CAR_BG;  break;
      case 'foto':     rowBg = FOTO_BG; break;
      default:         rowBg = 'FFFFFFFF';
    }

    const dataRow = ws.addRow([
      p.numero  || '',
      p.fecha   || '',
      p.dia     || '',
      p.hora    || '',
      p.plataforma || '',
      formato,
      p.titulo  || '',
      p.pilar   || '',
      objetivo,
      p.material || '',
      p.hook_primer_frame || '',
      narracion,
      copySlides,
      caption,
      ctaKw,
      p.hashtags || '',
      p.estado   || '1️⃣ Guion'
    ]);

    dataRow.height = 90;

    dataRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { size: 8.5, name: 'Arial', color: { argb: TEXTO } };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      cell.border = { bottom: { style: 'hair', color: { argb: BORDE } } };
    });

    // Col A (#): negro / blanco / centrado
    const cA = dataRow.getCell(1);
    cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NEGRO } };
    cA.font = { bold: true, color: { argb: BLANCO }, size: 9, name: 'Arial' };
    cA.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };

    // Col F (FORMATO): color por tipo
    const cF = dataRow.getCell(6);
    let fmtBg;
    switch (formato.toLowerCase()) {
      case 'reel':     fmtBg = REEL_FG; break;
      case 'carrusel': fmtBg = CAR_FG;  break;
      case 'foto':     fmtBg = FOTO_FG; break;
      default:         fmtBg = 'FF666666';
    }
    cF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fmtBg } };
    cF.font = { bold: true, color: { argb: BLANCO }, size: 8.5, name: 'Arial' };
    cF.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };

    // Col D (HORA): centrada, bold
    const cHora = dataRow.getCell(4);
    cHora.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cHora.font = { bold: true, size: 8.5, name: 'Arial', color: { argb: TEXTO } };

    // Col I (OBJETIVO): cobre si es Conversión o Lead Gen
    const cI = dataRow.getCell(9);
    if (/conversión|lead gen/i.test(objetivo)) {
      cI.font = { bold: true, color: { argb: COBRE }, size: 8.5, name: 'Arial' };
    }
  }

  return wb.xlsx.writeBuffer();
}

// ── Validador automático de parrilla ──────────────────────────────────────────
function validarParrilla(data) {
  if (!data || !Array.isArray(data.piezas))
    return { ok: false, error: 'JSON inválido — campo "piezas" ausente o no es array' };

  const keywords_usadas = new Set();
  const resultados = [];
  let errores_totales = 0;
  let warnings_totales = 0;

  const GEO_RE = /bogot[aá]|colombia|miami|medell[ií]n|cali|calera|barranquilla|naples|florida|nyc|madrid|usa/i;
  const MARCA_RE = /^#(Urbex|Espacios|Draken|TimeKeepers|Maria|TK)/i;

  data.piezas.forEach(pieza => {
    const errores = [];
    const warnings = [];
    const { numero, formato, objetivo, caption_post, copy_slides,
            hook_primer_frame, cta, cta_keyword, hashtags, keyword_dm,
            hook_reel_a, hook_reel_b, caption_reel,
            nivel_produccion } = pieza;
    // Schema actual: objetivo dual "Primario / Secundario" — las reglas validan contra el primario.
    // Parrillas viejas (objetivo único) siguen funcionando: split sin "/" devuelve el string completo.
    const objetivoPrimario = (objetivo || '').split('/')[0].trim();

    // ── Límites de palabras en caption_post ───────────────────────────────────
    const palabras = (caption_post || '').trim().split(/\s+/).filter(Boolean).length;
    if (formato === 'Reel'     && palabras > 60) errores.push(`Caption ${palabras} pal — Reel máx 60`);
    if (formato === 'Foto'     && palabras > 80) errores.push(`Caption ${palabras} pal — Foto máx 80`);
    if (formato === 'Carrusel' && palabras > 50) errores.push(`Caption ${palabras} pal — Carrusel máx 50`);

    // ── R10: copy_slides en Carrusel ──────────────────────────────────────────
    if (formato === 'Carrusel') {
      // Nuevo formato: copy_slides es string. Viejo: array.
      const slidesEsString = typeof copy_slides === 'string' && copy_slides.trim().length > 0;
      const slidesEsArray  = Array.isArray(copy_slides) && copy_slides.length > 0;
      if (!slidesEsString && !slidesEsArray) {
        errores.push('R10: copy_slides ausente — Carrusel requiere slides');
      } else if (slidesEsArray) {
        if (copy_slides[0]?.rol !== 'Gancho')
          errores.push(`R10: Slide 1 rol="${copy_slides[0]?.rol}" — debe ser "Gancho"`);
        const ultimo = copy_slides[copy_slides.length - 1];
        if (ultimo?.rol !== 'CTA')
          errores.push(`R10: Último slide rol="${ultimo?.rol}" — debe ser "CTA"`);
        copy_slides.forEach(slide => {
          const pp = (slide.texto_principal || '').trim().split(/\s+/).filter(Boolean).length;
          const pa = (slide.texto_apoyo    || '').trim().split(/\s+/).filter(Boolean).length;
          if (pp > 7)  errores.push(`R10: Slide ${slide.slide} texto_principal ${pp} pal (máx 7)`);
          if (pa > 15) errores.push(`R10: Slide ${slide.slide} texto_apoyo ${pa} pal (máx 15)`);
        });
      }
      if (caption_reel && caption_reel !== 'null')
        warnings.push('caption_reel debe ser null en Carrusel');
    }

    // ── R1: hook_primer_frame en Reel ─────────────────────────────────────────
    if (formato === 'Reel') {
      if (!hook_primer_frame || hook_primer_frame.trim().length < 10)
        errores.push('R1: hook_primer_frame ausente o demasiado corto en Reel');
      // hook_reel_a, hook_reel_b, caption_reel son del schema viejo — solo advertir si presentes pero vacíos
      if (pieza.hook_reel_a !== undefined && !pieza.hook_reel_a)
        warnings.push('hook_reel_a presente pero vacío');
      if (typeof copy_slides === 'string' && copy_slides.trim() !== '' && copy_slides.trim() !== 'N/A')
        warnings.push('copy_slides en Reel debe ser "N/A"');
      if (Array.isArray(copy_slides) && copy_slides.length > 0)
        errores.push('copy_slides debe ser null o N/A en Reel');
    }

    // ── keyword_dm: null obligatorio en Awareness/Engagement ─────────────────
    if (['Awareness', 'Engagement'].includes(objetivoPrimario) && keyword_dm && keyword_dm !== null) {
      errores.push(`keyword_dm="${keyword_dm}" en pieza ${objetivo} — debe ser null`);
    }

    // ── keyword_dm: las piezas del mismo eje COMPARTEN keyword (máx 2 por parrilla,
    //    validado a nivel global tras el loop). Repetir keyword ya NO es error.
    if (keyword_dm && keyword_dm !== null) {
      keywords_usadas.add(keyword_dm);
    }

    // ── objetivo único (el doble "A / B" impide evaluar el cierre del mes) ────
    if ((objetivo || '').includes('/'))
      warnings.push(`objetivo doble "${objetivo}" — usar objetivo ÚNICO (Awareness · Engagement · Trust · Lead Gen · Conversión)`);

    // ── hora y plataforma: la parrilla debe ser agendable sin decisiones ──────
    if (!pieza.hora || !String(pieza.hora).trim())
      warnings.push('hora ausente — Reel entre semana 7:00 PM · Carrusel 12:00 PM · sábado 11:00 AM');
    if (!pieza.plataforma || !String(pieza.plataforma).trim())
      warnings.push('plataforma ausente — Reel: IG Reels + TikTok + FB Reels · Carrusel: IG Feed + FB');
    else if (formato === 'Carrusel' && /tiktok/i.test(String(pieza.plataforma)))
      errores.push('Carrusel con TikTok en plataforma — los carruseles nunca van a TikTok');

    // R2 (formatos de cierre A/B/C en Conversión) RETIRADA 2026-06-10: era del
    // prompt v4.0 — el prompt actual exige hook/prueba/diferenciador/CTA, no
    // esos cierres literales. Estaba dormida con el objetivo dual y despertó
    // con el objetivo único, marcando como error captions que sí cumplen.

    // ── R3: CTA correcto por formato × objetivo ───────────────────────────────
    // Schema actual usa cta_keyword; parrillas viejas usan cta.
    const ctaRaw = cta_keyword || cta || '';
    const ctaTxt = ctaRaw.toLowerCase();
    if (objetivoPrimario === 'Conversión' || objetivoPrimario === 'Lead Gen') {
      if (!ctaTxt.includes('dm') && !/escr[ií]b/.test(ctaTxt))
        errores.push(`R3: CTA Conversión/Lead Gen debe incluir DM o "Escríbenos" — actual: "${ctaRaw}"`);
    }
    if (objetivoPrimario === 'Awareness' && formato === 'Reel') {
      if (/\bdm\b/.test(ctaTxt) || /dm '|dm "/i.test(ctaTxt))
        errores.push(`R3: CTA Reel+Awareness no puede ser DM — usar pregunta abierta`);
    }
    if (objetivoPrimario === 'Awareness' && formato === 'Foto') {
      if (!/vot[ao]|coment|¿|dinos|guard/i.test(ctaTxt))
        warnings.push(`R3: CTA Foto+Awareness debería ser pregunta binaria o guardado — actual: "${ctaRaw}"`);
    }

    // ── Hashtags: exactamente 5 (1 marca + 4 ultra-nicho), sin masivos puros ──
    // Tags compuestos nicho+geo (#RemodelacionBogota) son válidos: alta intención.
    // Tags masivos puros (#Bogota, #Colombia) atraen tráfico no calificado.
    if (hashtags) {
      const tags = hashtags.split(/\s+/).filter(t => t.startsWith('#'));
      const PURE_GEO_RE = /^#(la)?(bogot[aá]|calera|colombia|miami|medell[ií]n|cali|barranquilla|naples|florida|nyc|madrid|usa)$/i;
      if (tags.length > 5)
        warnings.push(`${tags.length} hashtags — usar exactamente 5 (1 marca + 4 ultra-nicho): tags precisos = alcance correcto`);
      const masivos = tags.filter(t => PURE_GEO_RE.test(t));
      if (masivos.length)
        warnings.push(`Hashtags masivos puros (${masivos.join(' ')}) — tráfico no calificado; usar compuestos nicho+geo`);
      const marcas = tags.filter(t => MARCA_RE.test(t));
      if (marcas.length > 1)
        warnings.push(`Marca duplicada en hashtags (${marcas.join(' ')}) — solo 1 tag de marca`);
    }

    // ── Urgencia fabricada (escasez inventada) ────────────────────────────────
    const textosUrgencia = `${ctaRaw} ${caption_post || ''}`.toLowerCase();
    if (/orden de llegada/.test(textosUrgencia))
      warnings.push('Escasez fabricada ("orden de llegada") — usar solo urgencia verificable: fechas reales o costo de aplazar');

    // ── nivel_produccion: solo validar si viene (el prompt actual lo prohíbe) ──
    // El schema actual NO incluye nivel_produccion ni hora_sugerida — exigirlos
    // generaba 2 warnings falsos por pieza y hacía imposible llegar a score 9.0.
    if (nivel_produccion != null && !['FÁCIL', 'MEDIO', 'DIFÍCIL'].includes(nivel_produccion))
      warnings.push(`nivel_produccion inválido: "${nivel_produccion}"`);

    errores_totales  += errores.length;
    warnings_totales += warnings.length;
    resultados.push({ numero, titulo: pieza.titulo || '', formato: formato || '',
                      objetivo: objetivo || '', aprobada: errores.length === 0,
                      errores, warnings, palabras_caption: palabras });
  });

  // ── Global: máximo 2 keywords DM distintas por parrilla ─────────────────────
  // Cada keyword es un flujo de automatización que construir, probar y mantener.
  // Leads repartidos en más de 2 cubetas = atribución inservible.
  const errores_globales = [];
  if (keywords_usadas.size > 2) {
    errores_globales.push(`${keywords_usadas.size} keywords DM distintas (${[...keywords_usadas].join(', ')}) — MÁXIMO 2 por parrilla; las piezas del mismo eje comparten keyword`);
    errores_totales += errores_globales.length;
  }

  const score = Math.max(0, parseFloat((10 - errores_totales * 0.5 - warnings_totales * 0.1).toFixed(1)));
  return {
    ok: true,
    aprobada: errores_totales === 0,
    score,
    errores_totales,
    warnings_totales,
    errores_globales,
    piezas: resultados,
    resumen: errores_totales === 0
      ? `✅ Parrilla lista para entregar — Score ${score}/10`
      : `❌ ${errores_totales} error${errores_totales !== 1 ? 'es' : ''} bloqueante${errores_totales !== 1 ? 's' : ''} — corregir antes de exportar${errores_globales.length ? ' · ' + errores_globales[0] : ''}`
  };
}

app.post('/api/cliente/:slug/validar-parrilla', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });
  const archivo = (req.body.archivo || '').trim();
  if (!archivo || !archivo.endsWith('.json'))
    return res.status(400).json({ ok: false, error: 'Parámetro "archivo" requerido (.json)' });
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\'))
    return res.status(400).json({ ok: false, error: 'Nombre de archivo inválido' });
  const jsonPath = path.join(getClienteDir(slug), '01-contenido', 'parrillas', archivo);
  if (!fs.existsSync(jsonPath))
    return res.status(404).json({ ok: false, error: 'Archivo JSON no encontrado' });
  const data = readJsonSafe(jsonPath);
  if (!data) return res.status(500).json({ ok: false, error: 'JSON inválido o no legible' });
  const resultado = validarParrilla(data);
  log(`[${slug}] Validación "${archivo}": score ${resultado.score}/10 · errores ${resultado.errores_totales} · warnings ${resultado.warnings_totales}`);
  res.json(resultado);
});

app.get('/api/cliente/:slug/parrilla-excel', async (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });

  const archivo = (req.query.archivo || '').trim();
  if (!archivo || !archivo.endsWith('.json')) {
    return res.status(400).json({ ok: false, error: 'Parámetro "archivo" requerido (.json)' });
  }
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
    return res.status(400).json({ ok: false, error: 'Nombre de archivo inválido' });
  }

  const jsonPath = path.join(getClienteDir(slug), '01-contenido', 'parrillas', archivo);
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ ok: false, error: 'Archivo JSON no encontrado' });
  }

  const data = readJsonSafe(jsonPath);
  if (!data) return res.status(500).json({ ok: false, error: 'JSON inválido o no legible' });

  try {
    const buf = await generarParrillaExcel(data);
    const xlsxName = archivo.replace(/\.json$/, '.xlsx');
    log(`[${slug}] Excel generado: ${xlsxName}`);
    res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    log(`[ERROR] generarParrillaExcel: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Error generando Excel: ' + err.message });
  }
});

// ── Excel generator para Stories ─────────────────────────────────────────────
function formatInteractivo(el) {
  if (!el) return 'Ninguno';
  if (typeof el === 'string') return el;
  if (el.tipo === 'encuesta') {
    return `Encuesta: "${el.pregunta || ''}" | A: ${el.opcion_a || ''} | B: ${el.opcion_b || ''}`;
  }
  if (el.tipo === 'respuesta_rapida' || el.tipo === 'cta_dm') {
    return `Resp. rápida: DM "${el.keyword_dm || el.keyword || ''}"${el.instruccion ? ' · ' + el.instruccion : ''}`;
  }
  return Object.entries(el).map(([k, v]) => `${k}: ${v}`).join(' | ');
}

function generarStoriesExcel(data) {
  const wb = XLSX.utils.book_new();
  const meta   = data.meta   || {};
  const slides = data.slides || [];
  const specs  = data.specs_produccion || {};
  const qa     = data.auto_qa || {};

  // ── Sheet 1: Cadena de Stories ──────────────────────────────────────────────
  const rows1 = [];

  // Fila 0: título principal (se fusiona sobre 8 columnas)
  rows1.push([`CADENA DE STORIES — ${meta.cliente || '—'} — ${meta.fecha || '—'}`, '', '', '', '', '', '', '']);
  rows1.push([]); // fila 1: separador

  // Filas 2-5: bloque de meta info (etiqueta · valor · | · etiqueta · valor)
  rows1.push(['CLIENTE:',       meta.cliente    || '—', '', 'TIPO DE CADENA:',   meta.tipo_cadena    || '—', '', '', '']);
  rows1.push(['TEMA:',          meta.tema       || '—', '', 'OBJETIVO:',         meta.objetivo       || '—', '', '', '']);
  rows1.push(['TOTAL SLIDES:',  meta.total_slides || slides.length, '', 'CTA KEYWORD DM:',  meta.cta_dm_keyword || meta.cta_final || '—', '', '', '']);
  rows1.push(['SCORE INTERNO:', `${meta.score_interno || '—'}/10`, '', 'IDIOMA:', meta.idioma || 'es-CO', '', '', '']);
  rows1.push([]); // fila 6: separador

  // Fila 7: cabecera de la tabla de slides
  rows1.push(['#', 'ROL', 'TEXTO OVERLAY', 'COPY DE APOYO', 'VISUAL / FONDO REQUERIDO', 'ELEMENTO INTERACTIVO', 'DUR. (seg)', 'NOTAS DE DISEÑO']);

  // Filas 8+: slides
  for (const s of slides) {
    rows1.push([
      s.numero || '',
      s.rol || '',
      s.texto_overlay || '',
      s.copy_apoyo || '',
      s.visual || '',
      formatInteractivo(s.elemento_interactivo),
      s.duracion_seg || s.duracion_sugerida || '',
      s.notas_diseno || s['notas_diseño'] || s.notas_diseño || '',
    ]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  // Fusiones: título ocupa toda la fila; valores meta se extienden por 2 columnas
  ws1['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:7} },
    { s:{r:2,c:1}, e:{r:2,c:2} }, { s:{r:2,c:4}, e:{r:2,c:7} },
    { s:{r:3,c:1}, e:{r:3,c:2} }, { s:{r:3,c:4}, e:{r:3,c:7} },
    { s:{r:4,c:1}, e:{r:4,c:2} }, { s:{r:4,c:4}, e:{r:4,c:7} },
    { s:{r:5,c:1}, e:{r:5,c:2} }, { s:{r:5,c:4}, e:{r:5,c:7} },
  ];
  ws1['!cols'] = [
    {wch:16},  // # / etiqueta
    {wch:30},  // ROL / valor
    {wch:30},  // TEXTO OVERLAY
    {wch:32},  // COPY DE APOYO
    {wch:36},  // VISUAL
    {wch:30},  // INTERACTIVO
    {wch:10},  // DUR.
    {wch:38},  // NOTAS
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Cadena de Stories');

  // ── Sheet 2: QA + Specs de Producción ──────────────────────────────────────
  const rows2 = [];

  rows2.push(['QA AUTOMÁTICO (RS1–RS6)', '', '']);
  rows2.push([]);
  rows2.push(['REGLA', 'RESULTADO', 'DETALLE']);
  rows2.push(['RS1 — Gancho ≤7 palabras',           qa.RS1_cumple                 ? '✅ Aprobado' : '❌ Falla', `${qa.RS1_gancho_palabras || '—'} palabras`]);
  rows2.push(['RS2 — Narrativa continua',            qa.RS2_narrativa_continua     ? '✅ Aprobado' : '❌ Falla', qa.RS2_nota || '']);
  rows2.push(['RS3 — 1 elemento interactivo',        qa.RS3_un_interactivo         ? '✅ Aprobado' : '❌ Falla', `Slide ${qa.RS3_slide || '—'} · ${qa.RS3_tipo || '—'}`]);
  rows2.push(['RS4 — CTA único',                     qa.RS4_un_solo_cta            ? '✅ Aprobado' : '❌ Falla', `Slide ${qa.RS4_slide || '—'}`]);
  rows2.push(['RS5 — Overlay ≤8 palabras',           qa.RS5_overlay_max_8_palabras ? '✅ Aprobado' : '❌ Falla', `Máx: ${qa.RS5_maximo_encontrado || '—'} palabras (slide ${qa.RS5_slide_maximo || '—'})`]);
  rows2.push(['RS6 — Keyword DM no repetida',        qa.RS6_keyword_dm_no_repetida ? '✅ Aprobado' : '❌ Falla', `Keyword nueva: "${qa.RS6_keyword_nueva || '—'}"`]);
  const rs7val = qa.RS7_visual_gancho_valido;
  rows2.push(['RS7 — Visual gancho no revela resultado', rs7val === true ? '✅ Aprobado' : rs7val === false ? '❌ Falla (−0.5)' : '⚠ No evaluado', qa.RS7_nota || '']);
  const rs8val = qa.RS8_interactivo_estrategico;
  rows2.push(['RS8 — Interactivo captura intención',    rs8val === true ? '✅ Aprobado' : rs8val === false ? '❌ Falla (−0.3)' : '⚠ No evaluado', qa.RS8_nota || '']);
  const rs9estado = qa.RS9_estado || (qa.RS9_dato_concreto_en_cta === true ? 'completo' : qa.RS9_dato_concreto_en_cta === false ? 'ausente' : null);
  const rs9label = rs9estado === 'completo' ? '✅ Aprobado (alcance + tiempo)' : rs9estado === 'parcial' ? '⚠ Parcial −0.2 (falta tiempo)' : rs9estado === 'ausente' ? '❌ Falla −0.3' : '⚠ No evaluado';
  const rs9detalle = [qa.RS9_dato_alcance, qa.RS9_dato_tiempo].filter(Boolean).join(' · ') || qa.RS9_dato || '';
  rows2.push(['RS9-B — Alcance + tiempo en slide CTA', rs9label, rs9detalle]);
  rows2.push([]);
  rows2.push(['SCORE INTERNO:', `${meta.score_interno || '—'}/10`, '']);
  rows2.push([]);

  rows2.push(['SPECS DE PRODUCCIÓN', '', '']);
  rows2.push([]);
  rows2.push(['ESPECIFICACIÓN', 'VALOR', '']);
  rows2.push(['Formato', specs.formato || '9:16 · 1080×1920px', '']);
  rows2.push(['Duración total', `${specs.duracion_total_seg || '—'} segundos`, '']);

  if (specs.paleta_aplicada && typeof specs.paleta_aplicada === 'object') {
    for (const [k, v] of Object.entries(specs.paleta_aplicada)) {
      rows2.push([`Color ${k}`, v, '']);
    }
  } else if (specs.paleta_aplicada) {
    rows2.push(['Paleta', specs.paleta_aplicada, '']);
  }

  if (Array.isArray(specs.tipografias)) {
    rows2.push(['Tipografías', specs.tipografias.join(' | '), '']);
  }
  if (Array.isArray(specs.hashtags_finales)) {
    rows2.push(['Hashtags', specs.hashtags_finales.join(' '), '']);
  }
  if (Array.isArray(specs.emojis_usados)) {
    rows2.push(['Emojis usados', specs.emojis_usados.join(' '), '']);
  }

  rows2.push([]);
  rows2.push(['MATERIAL REQUERIDO', '', '']);
  rows2.push([]);
  rows2.push(['#', 'DESCRIPCIÓN', '']);
  const mats = Array.isArray(specs.material_requerido) ? specs.material_requerido : [];
  mats.forEach((m, i) => rows2.push([i + 1, m, '']));

  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{wch:32}, {wch:56}, {wch:4}];
  XLSX.utils.book_append_sheet(wb, ws2, 'QA + Specs');

  return wb;
}

// Auto-genera el Excel de stories cuando se detecta un JSON nuevo en disco
function autoGenerarStoriesExcel(jsonPath) {
  try {
    const data = readJsonSafe(jsonPath);
    if (!data || !data.slides) return;
    const wb  = generarStoriesExcel(data);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const xlsxPath = jsonPath.replace(/\.json$/, '.xlsx');
    fs.writeFileSync(xlsxPath, buf);
    log(`[auto-excel] Stories Excel guardado: ${path.basename(xlsxPath)}`);
  } catch (e) {
    log(`[auto-excel] Error generando Stories Excel: ${e.message}`);
  }
}

// Guardar JSON + generar Excel automáticamente (endpoint directo)
app.post('/api/cliente/:slug/guardar-stories', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });

  const data = req.body;
  if (!data || !data.slides || !Array.isArray(data.slides)) {
    return res.status(400).json({ ok: false, error: 'JSON inválido — se requiere un array "slides"' });
  }

  const now   = new Date();
  const fecha = now.toISOString().split('T')[0];
  const hora  = `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
  const base  = `stories-${fecha}-${hora}`;

  const storiesDir = path.join(getClienteDir(slug), '01-contenido', 'stories');
  fs.mkdirSync(storiesDir, { recursive: true });

  // Evitar sobreescribir si ya existe
  let jsonPath = path.join(storiesDir, `${base}.json`);
  let counter  = 1;
  while (fs.existsSync(jsonPath)) {
    jsonPath = path.join(storiesDir, `${base}-${counter++}.json`);
  }
  const xlsxPath = jsonPath.replace(/\.json$/, '.xlsx');

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

  const wb  = generarStoriesExcel(data);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(xlsxPath, buf);

  log(`[${slug}] Stories guardado: ${path.basename(jsonPath)} + ${path.basename(xlsxPath)}`);
  generarDashboardData();
  res.json({
    ok:           true,
    json:         path.basename(jsonPath),
    xlsx:         path.basename(xlsxPath),
    slug,
    total_slides: data.slides.length,
  });
});

app.get('/api/cliente/:slug/stories-excel', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug))
    return res.status(404).json({ ok: false, error: `Cliente "${slug}" no existe` });

  const archivo = (req.query.archivo || '').trim();
  if (!archivo || !archivo.endsWith('.json'))
    return res.status(400).json({ ok: false, error: 'Parámetro "archivo" requerido (.json)' });
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\'))
    return res.status(400).json({ ok: false, error: 'Nombre de archivo inválido' });

  const jsonPath = path.join(getClienteDir(slug), '01-contenido', 'stories', archivo);
  if (!fs.existsSync(jsonPath))
    return res.status(404).json({ ok: false, error: 'Archivo JSON no encontrado en stories/' });

  const data = readJsonSafe(jsonPath);
  if (!data) return res.status(500).json({ ok: false, error: 'JSON inválido o no legible' });

  const wb       = generarStoriesExcel(data);
  const buf      = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const xlsxName = archivo.replace(/\.json$/, '.xlsx');
  log(`[${slug}] Stories Excel generado: ${xlsxName}`);
  res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ── Objetivos ─────────────────────────────────────────────────────────────────

function getObjetivosPath(slug) {
  return path.join(getClienteDir(slug), 'objetivos.json');
}

function getEstadosPath(slug) {
  return path.join(getClienteDir(slug), 'estados.json');
}
function getLeadsPath(slug) {
  return path.join(getClienteDir(slug), 'leads.json');
}

// ── CRM de Leads ──────────────────────────────────────────────────────────────
app.get('/api/cliente/:slug/leads', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getLeadsPath(slug);
  const data = fs.existsSync(p) ? readJsonSafe(p) : { leads: [] };
  res.json({ ok: true, leads: (data && data.leads) || [] });
});

app.post('/api/cliente/:slug/leads', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getLeadsPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { leads: [] };
  if (!root) root = { leads: [] };
  const leads = root.leads || [];
  const newId = leads.length ? Math.max(...leads.map(l => l.id || 0)) + 1 : 1;
  const lead = {
    id: newId,
    nombre:          req.body.nombre          || '',
    empresa:         req.body.empresa         || '',
    telefono:        req.body.telefono        || '',
    canal:           req.body.canal           || 'Instagram DM',
    keyword:         req.body.keyword         || '',
    fecha:           req.body.fecha           || new Date().toISOString().substring(0,10),
    estado:          req.body.estado          || 'Nuevo',
    interes:         req.body.interes         || '',
    valor_estimado:  req.body.valor_estimado  || null,
    notas:           req.body.notas           || '',
    updated:         new Date().toISOString(),
  };
  leads.push(lead);
  root.leads = leads;
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Lead creado: ${lead.nombre} (#${lead.id})`);
  res.json({ ok: true, lead });
});

app.put('/api/cliente/:slug/leads/:id', (req, res) => {
  const { slug, id } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getLeadsPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { leads: [] };
  if (!root) root = { leads: [] };
  const idx = (root.leads || []).findIndex(l => String(l.id) === String(id));
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Lead no encontrado' });
  root.leads[idx] = { ...root.leads[idx], ...req.body, id: root.leads[idx].id, updated: new Date().toISOString() };
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Lead actualizado: #${id}`);
  res.json({ ok: true, lead: root.leads[idx] });
});

app.delete('/api/cliente/:slug/leads/:id', (req, res) => {
  const { slug, id } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getLeadsPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { leads: [] };
  if (!root) root = { leads: [] };
  root.leads = (root.leads || []).filter(l => String(l.id) !== String(id));
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  res.json({ ok: true });
});

// GET todos los objetivos del cliente
app.get('/api/cliente/:slug/objetivos', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getObjetivosPath(slug);
  const data = fs.existsSync(p) ? readJsonSafe(p) : { mes_activo: null, meses: {} };
  res.json({ ok: true, data });
});

// GET objetivos de un mes específico
app.get('/api/cliente/:slug/objetivos/:mes', (req, res) => {
  const { slug, mes } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getObjetivosPath(slug);
  const data = fs.existsSync(p) ? readJsonSafe(p) : null;
  const mesData = data && data.meses && data.meses[mes];
  if (!mesData) return res.status(404).json({ ok: false, error: `No hay objetivos para ${mes}` });
  res.json({ ok: true, mes, data: mesData });
});

// POST crear nuevo mes de objetivos
app.post('/api/cliente/:slug/objetivos', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const body = req.body;
  if (!body.mes) return res.status(400).json({ ok: false, error: 'Campo "mes" requerido (ej: "2026-06")' });

  const p = getObjetivosPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { mes_activo: null, meses: {} };
  if (!root) root = { mes_activo: null, meses: {} };

  root.meses[body.mes] = body;
  root.mes_activo = body.mes;
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Objetivos creados para ${body.mes}`);
  res.json({ ok: true, mes: body.mes });
});

// PUT actualizar objetivos de un mes (merge parcial)
app.put('/api/cliente/:slug/objetivos/:mes', (req, res) => {
  const { slug, mes } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getObjetivosPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { mes_activo: null, meses: {} };
  if (!root) root = { mes_activo: null, meses: {} };
  if (!root.meses[mes]) root.meses[mes] = {};

  Object.assign(root.meses[mes], req.body);
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Objetivos actualizados para ${mes}`);
  res.json({ ok: true, mes });
});

// PUT actualizar resultados reales de una semana
app.put('/api/cliente/:slug/objetivos/:mes/semana/:num', (req, res) => {
  const { slug, mes, num } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getObjetivosPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : null;
  if (!root || !root.meses || !root.meses[mes])
    return res.status(404).json({ ok: false, error: `No hay objetivos para ${mes}` });

  const semanas = root.meses[mes].semanas || [];
  const idx = semanas.findIndex(s => String(s.numero) === String(num));
  if (idx === -1) return res.status(404).json({ ok: false, error: `Semana ${num} no encontrada` });

  semanas[idx].resultados_reales = { ...semanas[idx].resultados_reales, ...req.body };
  root.meses[mes].semanas = semanas;
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Resultados reales actualizados: ${mes} semana ${num}`);
  res.json({ ok: true, mes, semana: num });
});

// GET exportar objetivos como Excel
function generarObjetivosExcel(slug, root) {
  const wb = XLSX.utils.book_new();
  const mesActivo = root.mes_activo;
  const mesData   = (root.meses && root.meses[mesActivo]) || {};
  const obj  = mesData.objetivos       || {};
  const real = mesData.resultados_reales || {};
  const mix  = mesData.mix_contenido   || {};
  const sems = mesData.semanas         || [];

  // ── Hoja 1: Resumen del mes ─────────────────────────────────────────────────
  const rows1 = [
    ['OBJETIVOS DEL MES', '', '', ''],
    ['Mes activo', mesActivo, '', ''],
    ['North Star Metric', mesData.north_star_metric || '', '', ''],
    ['', '', '', ''],
    ['MÉTRICAS', 'META', 'REAL ACTUAL', '% CUMPLIMIENTO'],
    ['Seguidores nuevos', obj.seguidores ?? '', real.seguidores ?? '', obj.seguidores && real.seguidores != null ? Math.round((real.seguidores/obj.seguidores)*100)+'%' : '—'],
    ['Leads captados',    obj.leads ?? '',      real.leads ?? '',      obj.leads && real.leads != null ? Math.round((real.leads/obj.leads)*100)+'%' : '—'],
    ['Asesorías cerradas',obj.asesorias ?? '',  real.asesorias ?? '',  obj.asesorias && real.asesorias != null ? Math.round((real.asesorias/obj.asesorias)*100)+'%' : '—'],
    ['', '', '', ''],
    ['MIX DE CONTENIDO', 'PORCENTAJE', '', ''],
    ...Object.entries(mix).map(([k, v]) => [k, v + '%', '', '']),
    ['', '', '', ''],
    ['NOTAS', mesData.notas || '', '', ''],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [{wch:22},{wch:16},{wch:16},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen del Mes');

  // ── Hoja 2: Planificación semanal ────────────────────────────────────────────
  const rows2 = [['SEMANA','FOCO','KPIs','CTA SEMANA']];
  sems.forEach(s => {
    rows2.push([`Semana ${s.numero}`, s.foco || '', s.kpis || '', s.cta_semana || '']);
    const realesSem = s.resultados_reales || {};
    const kpis = (s.kpis || '').split('·').map(k => k.trim()).filter(Boolean);
    kpis.forEach(kpi => {
      const key = kpi.toLowerCase().replace(/[^a-z0-9]/g, '_');
      rows2.push(['', `  → ${kpi}`, realesSem[key] != null ? realesSem[key] : '—', '']);
    });
    rows2.push(['', '', '', '']);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{wch:12},{wch:36},{wch:40},{wch:28}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Planificación Semanal');

  return wb;
}

app.get('/api/cliente/:slug/objetivos-excel', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p    = getObjetivosPath(slug);
  const root = fs.existsSync(p) ? readJsonSafe(p) : null;
  if (!root) return res.status(404).json({ ok: false, error: 'No hay objetivos configurados' });
  const wb  = generarObjetivosExcel(slug, root);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const mesActivo = (root.mes_activo || 'sin-mes').replace(/[^a-z0-9-]/gi, '-');
  log(`[${slug}] Excel objetivos generado: ${mesActivo}`);
  res.setHeader('Content-Disposition', `attachment; filename="objetivos-${slug}-${mesActivo}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// GET semáforo automático
app.get('/api/cliente/:slug/objetivos/:mes/semaforo', (req, res) => {
  const { slug, mes } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getObjetivosPath(slug);
  const root = fs.existsSync(p) ? readJsonSafe(p) : null;
  const mesData = root && root.meses && root.meses[mes];
  if (!mesData) return res.status(404).json({ ok: false, error: `No hay objetivos para ${mes}` });

  const objetivos = mesData.objetivos || {};
  const reales    = mesData.resultados_reales || {};
  const semaforo  = {};

  for (const [key, meta] of Object.entries(objetivos)) {
    const r = reales[key];
    if (r == null) { semaforo[key] = { estado: 'sin_datos', color: '⚪', pct: null }; continue; }
    const pct = meta > 0 ? Math.round((r / meta) * 100) : 0;
    let color, estado;
    if (pct >= 100) { color = '🟢'; estado = 'logrado'; }
    else if (pct >= 70) { color = '🟡'; estado = 'en_camino'; }
    else { color = '🔴'; estado = 'rezagado'; }
    semaforo[key] = { estado, color, meta, real: r, pct };
  }

  res.json({ ok: true, mes, semaforo });
});

// ── Estados de producción ─────────────────────────────────────────────────────

// GET estados del mes activo (o ?mes=2026-06)
app.get('/api/cliente/:slug/estados', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const p = getEstadosPath(slug);
  const data = fs.existsSync(p) ? readJsonSafe(p) : { meses: {} };
  const mes = req.query.mes || Object.keys((data && data.meses) || {}).pop() || null;
  res.json({ ok: true, mes, data: (data && data.meses && mes && data.meses[mes]) || null, all: data });
});

// PUT actualizar estado de una pieza/story
app.put('/api/cliente/:slug/estados/:mes', (req, res) => {
  const { slug, mes } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const { tipo, id, estado, link_aprobacion } = req.body;
  if (!tipo || !id || !estado) return res.status(400).json({ ok: false, error: 'Campos requeridos: tipo, id, estado' });

  // Pipeline 5 etapas (+ legacy 4 etapas aceptado para datos viejos)
  const ESTADOS_VALIDOS = ['Guion', 'Producción', 'Aprobación cliente', 'Programado', 'Publicado',
                           'Borrador', 'En revisión', 'Aprobado'];
  if (!ESTADOS_VALIDOS.includes(estado)) return res.status(400).json({ ok: false, error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}` });

  const p = getEstadosPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { meses: {} };
  if (!root) root = { meses: {} };
  if (!root.meses[mes]) root.meses[mes] = { piezas: [], stories: [] };
  const lista = root.meses[mes][tipo] || [];
  const idx = lista.findIndex(x => String(x.id) === String(id));
  const entry = { id, estado, updated: new Date().toISOString() };
  if (link_aprobacion) entry.link_aprobacion = link_aprobacion;
  if (idx === -1) lista.push(entry);
  else lista[idx] = { ...lista[idx], ...entry };
  root.meses[mes][tipo] = lista;
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Estado actualizado: ${tipo} #${id} → ${estado}`);
  res.json({ ok: true, mes, tipo, id, estado });
});

// POST inicializar estados de un mes con piezas base
app.post('/api/cliente/:slug/estados/:mes', (req, res) => {
  const { slug, mes } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const { piezas = [], stories = [] } = req.body;

  const p = getEstadosPath(slug);
  let root = fs.existsSync(p) ? readJsonSafe(p) : { meses: {} };
  if (!root) root = { meses: {} };
  root.meses[mes] = {
    piezas:  piezas.map(x => ({ ...x, estado: x.estado || 'Guion', updated: new Date().toISOString() })),
    stories: stories.map(x => ({ ...x, estado: x.estado || 'Guion', updated: new Date().toISOString() })),
  };
  fs.writeFileSync(p, JSON.stringify(root, null, 2), 'utf8');
  log(`[${slug}] Estados inicializados: ${mes} (${piezas.length} piezas, ${stories.length} stories)`);
  res.json({ ok: true, mes, piezas: piezas.length, stories: stories.length });
});

// ── SEO Audit ─────────────────────────────────────────────────────────────────

function fetchUrl(urlStr, redirects) {
  redirects = redirects === undefined ? 4 : redirects;
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Demasiadas redirecciones'));
    const mod = urlStr.startsWith('https') ? https : http;
    const req = mod.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        let next = res.headers.location;
        if (!next.startsWith('http')) {
          try { next = new URL(next, urlStr).toString(); } catch { return reject(new Error('Redirect inválido')); }
        }
        res.resume(); // drain to allow socket reuse
        return fetchUrl(next, redirects - 1).then(resolve).catch(reject);
      }

      let body = '';
      let settled = false;
      function done() {
        if (settled) return;
        settled = true;
        resolve({ body, status: res.statusCode, finalUrl: urlStr });
      }

      res.setEncoding('utf8');
      res.on('data', chunk => {
        body += chunk;
        // Resolve once we have enough HTML — Wix/SPAs put meta tags 100-150KB into the document
        if (body.length > 300000 || (body.includes('</head>') && body.length > 150000)) {
          done();
          res.resume(); // drain remaining data without crashing
        }
      });
      res.on('end',  done);
      res.on('error', () => { if (body.length > 500) done(); else if (!settled) { settled = true; reject(new Error('Error leyendo respuesta')); } });
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Timeout — el sitio no respondió en 15 segundos'));
    });
    req.on('error', err => reject(err));
  });
}

function extractSeoSignals(html, baseUrl) {
  function get(pattern, src, flags) {
    const m = new RegExp(pattern, flags || 'i').exec(src || html);
    return m ? (m[1] || '').trim() : null;
  }
  function getAll(pattern, src, flags) {
    const re = new RegExp(pattern, flags || 'gi');
    const out = [];
    let m;
    while ((m = re.exec(src || html)) !== null) out.push((m[1] || '').trim());
    return out;
  }
  function getMeta(name) {
    return get(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,500})["']`) ||
           get(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+name=["']${name}["']`);
  }
  function getOg(prop) {
    return get(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']{1,500})["']`) ||
           get(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:${prop}["']`);
  }

  const title     = get('<title[^>]*>([^<]{1,200})</title>');
  const desc      = getMeta('description');
  const keywords  = getMeta('keywords');
  const robots    = getMeta('robots');
  const canonical = get('<link[^>]+rel=["\'\\s]*canonical["\'][^>]+href=["\'\\s]*([^"\'\\s>]+)') ||
                    get('<link[^>]+href=["\'\\s]*([^"\'\\s>]+)["\'][^>]+rel=["\'\\s]*canonical');
  const viewport  = !!getMeta('viewport');
  const charset   = get('<meta[^>]+charset=["\'\\s]*([^"\'\\s>]+)');
  const lang      = get('<html[^>]+lang=["\'\\s]*([^"\'\\s>]+)');

  const ogTitle  = getOg('title');
  const ogDesc   = getOg('description');
  const ogImage  = getOg('image');
  const ogType   = getOg('type');
  const ogUrl    = getOg('url');
  const twCard   = getMeta('twitter:card');
  const twTitle  = getMeta('twitter:title');
  const twImage  = getMeta('twitter:image');

  const h1s = getAll('<h1[^>]*>([\\s\\S]{1,300}?)</h1>').map(t => t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean);
  const h2s = getAll('<h2[^>]*>([\\s\\S]{1,300}?)</h2>').map(t => t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean);
  const h3s = getAll('<h3[^>]*>([\\s\\S]{1,300}?)</h3>').map(t => t.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean);

  const imgTags   = getAll('<img([^>]+)>');
  const imgCount  = imgTags.length;
  const noAlt     = imgTags.filter(attr => { const a = get('alt=["\'](.*?)["\']', attr); return a === null || a.trim() === ''; }).length;
  const noWidth   = imgTags.filter(attr => !/width=/i.test(attr)).length;

  const allLinks   = getAll('<a[^>]+href=["\'\\s]([^"\'\\s>]+)');
  let origin = '';
  try { origin = new URL(baseUrl).origin; } catch {}
  const internal = allLinks.filter(l => l.startsWith('/') || l.startsWith(origin)).length;
  const external = allLinks.filter(l => l.startsWith('http') && !l.startsWith(origin)).length;
  const noFollow  = getAll('<a[^>]+rel=["\'\\s][^"\'\\s>]*nofollow[^"\'\\s>]*["\'\\s]').length;

  const schemaRaw  = getAll('<script[^>]+type=["\'\\s]*application/ld\\+json[^>]*>([\\s\\S]{1,5000}?)</script>');
  const schemaTypes = schemaRaw.map(s => { try { const j = JSON.parse(s.trim()); return j['@type'] || '?'; } catch { return null; } }).filter(Boolean);

  const hreflangs   = getAll('<link[^>]+hreflang=["\'\\s]([^"\'\\s>]+)');
  const hasAmp      = /<html[^>]+amp/i.test(html) || /<link[^>]+rel=["']amphtml["']/i.test(html);
  const hasSSL      = baseUrl.startsWith('https://');
  const wordCount   = (html.replace(/<[^>]+>/g,' ').match(/\b\w{3,}\b/g) || []).length;

  // Checks
  const checks = {
    ssl:         { ok: hasSSL,                       label: 'HTTPS / SSL' },
    title:       { ok: !!(title && title.length>=30 && title.length<=60), label: 'Título (30-60 chars)', val: title ? `${title.length} chars` : 'Ausente' },
    desc:        { ok: !!(desc && desc.length>=120 && desc.length<=160),  label: 'Meta descripción (120-160 chars)', val: desc ? `${desc.length} chars` : 'Ausente' },
    h1_existe:   { ok: h1s.length >= 1,              label: 'H1 presente' },
    h1_unico:    { ok: h1s.length === 1,             label: 'Un solo H1' },
    canonical:   { ok: !!canonical,                  label: 'Tag canonical' },
    viewport:    { ok: viewport,                     label: 'Meta viewport (móvil)' },
    og_tags:     { ok: !!(ogTitle && ogDesc && ogImage), label: 'Open Graph completo' },
    twitter:     { ok: !!twCard,                     label: 'Twitter/X card' },
    schema:      { ok: schemaTypes.length > 0,       label: 'Schema markup / JSON-LD' },
    lang:        { ok: !!lang,                       label: 'Atributo lang en <html>' },
    imgs_alt:    { ok: noAlt === 0,                  label: `Alt en imágenes (${noAlt}/${imgCount} sin alt)` },
    keywords:    { ok: !!keywords,                   label: 'Meta keywords' },
    hreflang:    { ok: hreflangs.length > 0,         label: 'hreflang (multiidioma)', info: 'solo aplica si tienes versión internacional' },
  };

  return {
    url: baseUrl, hasSSL, lang, charset, viewport, wordCount,
    title, title_len: title ? title.length : 0,
    desc, desc_len: desc ? desc.length : 0,
    keywords, robots, canonical,
    og: { title: ogTitle, desc: ogDesc, image: ogImage, type: ogType, url: ogUrl },
    twitter: { card: twCard, title: twTitle, image: twImage },
    headings: { h1: h1s, h2: h2s.slice(0,12), h3: h3s.slice(0,10) },
    images: { total: imgCount, sin_alt: noAlt, sin_width: noWidth },
    links: { internal, external, nofollow: noFollow },
    schema: { tipos: schemaTypes, count: schemaTypes.length },
    hreflangs, hasAmp, checks,
  };
}

app.post('/api/seo-audit', async (req, res) => {
  let { url, slug } = req.body;
  if (!url) return res.status(400).json({ ok: false, error: 'URL requerida' });
  if (!url.startsWith('http')) url = 'https://' + url;
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { return res.status(400).json({ ok: false, error: 'URL inválida' }); }

  log(`[SEO] Analizando: ${parsedUrl.href}`);

  // Load identity for context
  let identity = null;
  if (slug && clienteExiste(slug)) {
    identity = readJsonSafe(path.join(getClienteDir(slug), '00-identity', 'identity.json'));
  }

  try {
    const { body, status, finalUrl } = await fetchUrl(parsedUrl.href);
    const seo = extractSeoSignals(body, finalUrl || parsedUrl.href);
    seo.http_status = status;
    log(`[SEO] OK: ${finalUrl} · status ${status}`);
    res.json({ ok: true, seo, identity });
  } catch (err) {
    log(`[SEO] Error: ${err.message}`);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── File watcher ──────────────────────────────────────────────────────────────
let regenTimer = null;
function regenDebounced(filePath) {
  log(`Cambio detectado: ${filePath}`);
  if (regenTimer) clearTimeout(regenTimer);
  regenTimer = setTimeout(() => { generarDashboardData(); regenTimer = null; }, 800);
}

chokidar.watch(CLIENTES_DIR, { ignoreInitial: true, depth: 4 })
  .on('change', (filePath) => {
    if (filePath.endsWith('_historial.md') || filePath.endsWith('identity.json') || filePath.endsWith('identity.md')) {
      regenDebounced(filePath);
    } else {
      log(`Archivo modificado: ${filePath}`);
    }
  })
  .on('add', (filePath) => {
    log(`Archivo nuevo: ${filePath}`);
    if (filePath.endsWith('.gitkeep')) return;
    // Auto-generar Excel cuando se guarda un stories JSON
    if (filePath.endsWith('.json') && filePath.includes(`${path.sep}stories${path.sep}`)) {
      autoGenerarStoriesExcel(filePath);
    }
    regenDebounced(filePath);
  });

// ── Importar Plan Mensual desde Excel (PASO 10) ──────────────────────────────
function parsearPlanExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const result = { sheets: wb.SheetNames, piezas: [], stories: [], objetivos: {}, mes: null, errores: [] };

  // ─ Detectar mes desde nombre de hoja (ej: "Objetivos Junio")
  const mesMatch = wb.SheetNames.join(' ').match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i);
  if (mesMatch) {
    const MESES = { enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06', julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12' };
    const año = new Date().getFullYear();
    result.mes = `${año}-${MESES[mesMatch[1].toLowerCase()]}`;
  }

  // ─ Parsear hoja de Parrilla (hoja con "Parrilla" en nombre)
  const parrillaNombre = wb.SheetNames.find(n => /parrilla/i.test(n));
  if (parrillaNombre) {
    const ws = wb.Sheets[parrillaNombre];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Encontrar fila header (contiene "Formato" y "Título")
    let headerIdx = rows.findIndex(r => r.some(c => /formato/i.test(String(c))) && r.some(c => /t[íi]tulo/i.test(String(c))));
    if (headerIdx < 0) headerIdx = 2;
    const header = rows[headerIdx].map(h => String(h).trim().toLowerCase());

    const iNum    = header.findIndex(h => h === '#' || h === 'num' || h === '');
    const iFecha  = header.findIndex(h => /fecha/i.test(h));
    const iForm   = header.findIndex(h => /formato/i.test(h));
    const iTit    = header.findIndex(h => /t[íi]tulo/i.test(h) || /concepto/i.test(h));
    const iObj    = header.findIndex(h => h === 'objetivo');
    const iAng    = header.findIndex(h => /[áa]ngulo/i.test(h));

    let semActual = 1;
    let piezaCount = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => c === '')) continue;
      const col0 = String(r[0] || '').trim();
      if (/semana\s+\d/i.test(col0) || /──\s*semana/i.test(col0)) {
        const mSem = col0.match(/semana\s+(\d)/i);
        if (mSem) semActual = parseInt(mSem[1]);
        continue;
      }
      const numVal = parseInt(col0);
      if (!isNaN(numVal) && numVal > 0) {
        piezaCount++;
        const fecha   = iFecha  >= 0 ? String(r[iFecha]  || '').trim() : '';
        const formato = iForm   >= 0 ? String(r[iForm]   || '').trim() : '';
        const titulo  = iTit    >= 0 ? String(r[iTit]    || '').trim() : '';
        const obj     = iObj    >= 0 ? String(r[iObj]    || '').trim() : '';
        const angulo  = iAng    >= 0 ? String(r[iAng]    || '').trim() : '';
        // Normalizar fecha a YYYY-MM-DD si es posible
        let fechaNorm = fecha;
        const mFecha = fecha.match(/(\d+)\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i);
        if (mFecha && result.mes) {
          const [_, d] = mFecha;
          const [y, m] = result.mes.split('-');
          fechaNorm = `${y}-${m}-${d.padStart(2, '0')}`;
        }
        result.piezas.push({
          id: numVal, fecha: fechaNorm, dia: fecha, formato, titulo, objetivo: obj, angulo, semana: semActual,
          estado: 'Guion', updated: new Date().toISOString()
        });
      }
    }
  } else {
    result.errores.push('No se encontró hoja de Parrilla (debe contener "Parrilla" en el nombre)');
  }

  // ─ Parsear hoja de Stories
  const storiesNombre = wb.SheetNames.find(n => /stories/i.test(n));
  if (storiesNombre) {
    const ws = wb.Sheets[storiesNombre];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let headerIdx = rows.findIndex(r => r.some(c => /semana/i.test(String(c))) && r.some(c => /tipo/i.test(String(c))));
    if (headerIdx < 0) headerIdx = 2;
    const header = rows[headerIdx].map(h => String(h).trim().toLowerCase());

    const iSem     = header.findIndex(h => /semana/i.test(h));
    const iDia     = header.findIndex(h => /d[íi]a/i.test(h) || /momento/i.test(h));
    const iTipo    = header.findIndex(h => h === 'tipo de story' || h === 'tipo');
    const iConc    = header.findIndex(h => /concepto/i.test(h) || /contenido/i.test(h));
    const iObj     = header.findIndex(h => h === 'objetivo');
    const iAccion  = header.findIndex(h => /acci[oó]n/i.test(h));

    let storyCount = 0;
    let semActual = 1;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => c === '')) continue;
      const semVal = r[iSem >= 0 ? iSem : 0];
      if (/semana\s+(\d)/i.test(String(semVal))) {
        const m = String(semVal).match(/semana\s+(\d)/i);
        if (m) semActual = parseInt(m[1]);
      }
      const tipo = iTipo >= 0 ? String(r[iTipo] || '').trim() : '';
      if (!tipo) continue;
      storyCount++;
      const dia     = iDia    >= 0 ? String(r[iDia]    || '').trim() : '';
      const concepto = iConc  >= 0 ? String(r[iConc]   || '').trim() : '';
      const obj     = iObj    >= 0 ? String(r[iObj]    || '').trim() : '';
      const accion  = iAccion >= 0 ? String(r[iAccion] || '').trim() : '';
      result.stories.push({
        id: `S${storyCount}`, semana: semActual, dia, tipo, concepto, objetivo: obj, accion,
        estado: 'Guion', updated: new Date().toISOString()
      });
    }
  }

  // ─ Parsear Objetivo Macro desde hoja de Objetivos
  const objNombre = wb.SheetNames.find(n => /objetivo/i.test(n));
  if (objNombre) {
    const ws = wb.Sheets[objNombre];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    let macroIdx = rows.findIndex(r => r.some(c => /objetivo macro/i.test(String(c))));
    if (macroIdx >= 0 && rows[macroIdx + 1]) {
      const macroRow = rows[macroIdx + 1];
      const macroText = macroRow.find(c => typeof c === 'string' && c.trim().length > 20);
      if (macroText) result.objetivos.objetivo_macro = macroText.trim();
    }
  }

  return result;
}

app.post('/api/cliente/:slug/importar-plan', upload.single('excel'), (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  if (!req.file) return res.status(400).json({ ok: false, error: 'No se recibió archivo Excel' });
  try {
    const parsed = parsearPlanExcel(req.file.path);
    fs.unlinkSync(req.file.path);
    res.json({ ok: true, preview: parsed });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch {}
    log(`[${slug}] Error importando plan: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/cliente/:slug/importar-plan/confirmar', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  const { mes, piezas, stories, objetivos } = req.body;
  if (!mes) return res.status(400).json({ ok: false, error: 'Campo requerido: mes (ej: 2026-06)' });

  // Actualizar estados.json
  const estPath = getEstadosPath(slug);
  let estRoot = fs.existsSync(estPath) ? readJsonSafe(estPath) : { meses: {} };
  if (!estRoot) estRoot = { meses: {} };
  estRoot.meses[mes] = { piezas: piezas || [], stories: stories || [] };
  fs.writeFileSync(estPath, JSON.stringify(estRoot, null, 2), 'utf8');

  // Actualizar/crear objetivos.json
  const objPath = getObjetivosPath(slug);
  let objRoot = fs.existsSync(objPath) ? readJsonSafe(objPath) : { mes_activo: mes, meses: {} };
  if (!objRoot) objRoot = { mes_activo: mes, meses: {} };
  if (!objRoot.meses[mes]) {
    objRoot.meses[mes] = {
      mes, north_star_metric: 'leads',
      objetivo_macro: objetivos?.objetivo_macro || '',
      objetivos: { seguidores: 0, leads: 0, asesorias: 0 },
      mix_contenido: { Awareness: 50, Conversion: 35, Educacion: 15 },
      semanas: [],
      resultados_reales: {},
      notas: `Importado desde Excel — ${new Date().toLocaleDateString('es-CO')}`
    };
  } else if (objetivos?.objetivo_macro) {
    objRoot.meses[mes].objetivo_macro = objetivos.objetivo_macro;
  }
  objRoot.mes_activo = mes;
  fs.writeFileSync(objPath, JSON.stringify(objRoot, null, 2), 'utf8');

  log(`[${slug}] Plan importado: ${(piezas||[]).length} piezas, ${(stories||[]).length} stories para ${mes}`);
  generarDashboardData();
  res.json({ ok: true, mes, piezas: (piezas||[]).length, stories: (stories||[]).length });
});

// ── Excel Master de Inteligencia del Cliente (PASO 17) ───────────────────────
function generarExcelMaster(slug) {
  const identityPath = path.join(getClienteDir(slug), '00-identity', 'identity.json');
  const objPath      = getObjetivosPath(slug);
  const estPath      = getEstadosPath(slug);
  const histPath     = path.join(getClienteDir(slug), '_historial.md');

  const identity = fs.existsSync(identityPath) ? readJsonSafe(identityPath) : {};
  const objRoot  = fs.existsSync(objPath)      ? readJsonSafe(objPath)      : null;
  const estRoot  = fs.existsSync(estPath)      ? readJsonSafe(estPath)      : null;

  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleDateString('es-CO');

  // ── Hoja 1: Identity ────────────────────────────────────────────────────────
  const idRows = [['Campo', 'Valor']];
  const ID_FIELDS = [
    ['nombre','Nombre'], ['tagline','Tagline'], ['industria','Industria'],
    ['ciudad','Ciudad'], ['website_url','Website'], ['tono','Tono de marca'],
    ['propuesta_valor','Propuesta de valor'], ['buyer_persona','Buyer persona'],
    ['colores','Colores'], ['hashtags','Hashtags'], ['cta_principal','CTA principal'],
    ['pain_points','Pain points'], ['objeciones','Objeciones'],
  ];
  for (const [key, label] of ID_FIELDS) {
    const val = identity[key];
    if (val !== undefined && val !== null && val !== '') {
      idRows.push([label, Array.isArray(val) ? val.join(', ') : String(val)]);
    }
  }
  const wsId = XLSX.utils.aoa_to_sheet(idRows);
  wsId['!cols'] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsId, '🆔 Identity');

  // ── Hoja 2: Objetivos & KPIs ─────────────────────────────────────────────
  const objRows = [['Mes', 'North Star', 'Métrica', 'Objetivo', 'Real', '% Cumplimiento', 'Estado']];
  if (objRoot && objRoot.meses) {
    for (const [mes, mData] of Object.entries(objRoot.meses)) {
      const objetivos = mData.objetivos || {};
      const reales    = mData.resultados_reales || {};
      for (const [key, meta] of Object.entries(objetivos)) {
        const real = reales[key];
        const pct  = real != null && meta ? Math.round((real / meta) * 100) : null;
        const status = pct == null ? 'Sin dato' : pct >= 100 ? '✅ Cumplido' : pct >= 70 ? '⚠️ En camino' : '❌ Bajo';
        objRows.push([mes, mData.north_star_metric || '—', key, meta, real ?? '—', pct != null ? pct + '%' : '—', status]);
      }
    }
  }
  const wsObj = XLSX.utils.aoa_to_sheet(objRows);
  wsObj['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsObj, '🎯 Objetivos & KPIs');

  // ── Hoja 3: Planificación Semanal ─────────────────────────────────────────
  const semRows = [['Mes', 'Semana', 'Fechas', 'Foco', 'KPIs', 'CTA', 'Éxito si…']];
  if (objRoot && objRoot.meses) {
    for (const [mes, mData] of Object.entries(objRoot.meses)) {
      for (const sem of mData.semanas || []) {
        semRows.push([mes, `Semana ${sem.numero}`, sem.fechas||'—', sem.foco||'—', sem.kpis||'—', sem.cta_semana||'—', sem.exito_si||'—']);
      }
    }
  }
  const wsSem = XLSX.utils.aoa_to_sheet(semRows);
  wsSem['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 28 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSem, '📅 Plan Semanal');

  // ── Hoja 4: Estados de Producción ────────────────────────────────────────
  const estRows = [['Mes', 'Tipo', 'ID', 'Fecha', 'Formato/Tipo', 'Título/Concepto', 'Objetivo', 'Semana', 'Estado', 'Actualizado']];
  if (estRoot && estRoot.meses) {
    for (const [mes, mData] of Object.entries(estRoot.meses)) {
      for (const p of mData.piezas || []) {
        estRows.push([mes, 'Pieza', p.id, p.fecha||'—', p.formato||'—', p.titulo||'—', p.objetivo||'—', p.semana||'—', p.estado||'Guion', (p.updated||'').substring(0, 10)]);
      }
      for (const s of mData.stories || []) {
        estRows.push([mes, 'Story', s.id, s.dia||'—', s.tipo||'—', s.concepto||'—', s.objetivo||'—', s.semana||'—', s.estado||'Guion', (s.updated||'').substring(0, 10)]);
      }
    }
  }
  const wsEst = XLSX.utils.aoa_to_sheet(estRows);
  wsEst['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 45 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsEst, '📁 Estados Producción');

  // ── Hoja 5: Historial ────────────────────────────────────────────────────
  const histRows = [['Fecha', 'Tipo', 'Archivo', 'Skills', 'Score', 'Ángulos']];
  if (fs.existsSync(histPath)) {
    const md = fs.readFileSync(histPath, 'utf8');
    for (const line of md.split('\n')) {
      const m = line.match(/^- \*\*(\d{4}-\d{2}-\d{2})\*\* \| (\S+) \| ([^\|]+) \| ([^\|]+) \| score:([^\|]+) \| ángulos:(.+)/i);
      if (m) histRows.push([m[1].trim(), m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim(), m[6].trim()]);
    }
  }
  const wsHist = XLSX.utils.aoa_to_sheet(histRows);
  wsHist['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 45 }, { wch: 30 }, { wch: 8 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsHist, '📈 Historial');

  // ── Hoja 6: Resumen Ejecutivo ────────────────────────────────────────────
  const resumen = [
    ['EXCEL MASTER — TimeKeepers AI', ''],
    ['Cliente', identity.nombre || slug],
    ['Generado', now],
    ['Industria', identity.industria || '—'],
    ['Website', identity.website_url || '—'],
    ['', ''],
    ['RESUMEN DE PRODUCCIÓN', ''],
    ['Total entradas historial', histRows.length - 1],
    ['Piezas del mes', (estRoot ? Object.values(estRoot.meses || {}).reduce((t, m) => t + (m.piezas||[]).length, 0) : 0)],
    ['Stories del mes', (estRoot ? Object.values(estRoot.meses || {}).reduce((t, m) => t + (m.stories||[]).length, 0) : 0)],
    ['Publicadas', (estRoot ? Object.values(estRoot.meses || {}).reduce((t, m) => t + [...(m.piezas||[]), ...(m.stories||[])].filter(p => p.estado === 'Publicado').length, 0) : 0)],
  ];
  const wsRes = XLSX.utils.aoa_to_sheet(resumen);
  wsRes['!cols'] = [{ wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsRes, '📊 Resumen Ejecutivo');

  return wb;
}

app.get('/api/cliente/:slug/excel-master', (req, res) => {
  const { slug } = req.params;
  if (!clienteExiste(slug)) return res.status(404).json({ ok: false, error: 'Cliente no existe' });
  try {
    const wb  = generarExcelMaster(slug);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fecha = new Date().toISOString().substring(0, 10);
    log(`[${slug}] Excel Master generado`);
    res.setHeader('Content-Disposition', `attachment; filename="excel-master-${slug}-${fecha}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e) {
    log(`[${slug}] Error generando Excel Master: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Arranque ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  log(`TimeKeepers AI Servidor v2.0 corriendo en http://localhost:${PORT}`);
  log(`Dashboard: http://localhost:${PORT}/dashboard.html`);
  log(`API Health: http://localhost:${PORT}/api/health`);
});
