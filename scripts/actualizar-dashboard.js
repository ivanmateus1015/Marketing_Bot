const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const CLIENTES_DIR = path.join(BASE, 'clientes');
const SKILLS_DIR = path.join(BASE, '.claude', 'skills');
const DATA_FILE    = path.join(BASE, 'data', 'data.json');
const DATA_JS_FILE = path.join(BASE, 'data', 'data.js');

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function parseIdentity(content) {
  if (!content) return {};
  const get = (regex) => {
    const m = content.match(regex);
    return m ? m[1].trim() : '';
  };
  const titleMatch = content.match(/^#\s+(.+)/m);
  return {
    titulo:      titleMatch ? titleMatch[1].replace(/\s*—.*$/, '').trim() : '',
    ciudad:      get(/- País \/ Ciudad:\s*(.+)/),
    industria:   get(/- Industria:\s*(.+)/),
    plan:        get(/- Plan:\s*(.+)/),
    tono:        get(/- Tono de voz:\s*(.+)/),
    idioma:      get(/- Idioma principal:\s*(.+)/),
    diferencial: get(/- Diferencial principal \(1 frase\):\s*(.+)/),
    tagline:     get(/- Tagline:\s*(.+)/),
  };
}

function parseHistorial(content) {
  if (!content) return { total: 0, ultimaActividad: '—', plan: '—', angulos: {}, bitacora: [] };

  const get = (regex, def = '—') => {
    const m = content.match(regex);
    return m ? m[1].trim() : def;
  };

  const angulos = {};
  const angulosRegex = /\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|/g;
  let m;
  while ((m = angulosRegex.exec(content)) !== null) {
    const key = m[1].trim();
    if (key && key !== 'Ángulo' && !key.startsWith('-')) {
      angulos[key] = parseInt(m[2], 10);
    }
  }

  const bitacora = [];
  const lines = content.split('\n');
  let inBit = false, skipHeader = true;
  for (const line of lines) {
    if (line.includes('## Bitácora')) { inBit = true; skipHeader = true; continue; }
    if (inBit && line.trim().startsWith('|') && !line.includes('---')) {
      if (skipHeader) { skipHeader = false; continue; }
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 5 && cols[0] !== 'Fecha') {
        bitacora.push({ fecha: cols[0], tipo: cols[1], archivo: cols[2], skills: cols[3], angulos: cols[4], score: cols[5] || '—' });
      }
    }
  }

  return {
    total:           parseInt(get(/- Total de piezas creadas:\s*(\d+)/, '0'), 10),
    ultimaActividad: get(/- Última actividad:\s*(.+)/),
    plan:            get(/- Plan activo:\s*(.+)/),
    angulos,
    bitacora,
  };
}

function parseSkillFrontmatter(content) {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const yaml = fm[1];
  const name = (yaml.match(/^name:\s*(.+)/m) || [])[1];
  const desc = (yaml.match(/^description:\s*(.+)/m) || [])[1];
  return {
    name:        name ? name.trim().replace(/['"]/g, '') : null,
    description: desc ? desc.trim().replace(/['"]/g, '').substring(0, 160) : null,
  };
}

function parseSkill(skillPath) {
  const slug = path.basename(skillPath);
  const content = readFileSafe(path.join(skillPath, 'SKILL.md'))
                || readFileSafe(path.join(skillPath, 'skill.md'));
  if (!content) return { slug, displayName: slug, description: '' };

  const fm = parseSkillFrontmatter(content);
  let displayName = fm && fm.name ? fm.name : slug;
  let description = fm && fm.description ? fm.description : '';

  if (!description) {
    const h1 = content.replace(/^---[\s\S]*?---\n/, '').match(/^#\s+(.+)/m);
    displayName = h1 ? h1[1].trim() : displayName;
    const lines = content.replace(/^---[\s\S]*?---\n/, '').split('\n');
    for (const line of lines) {
      const clean = line.replace(/^#+\s*/, '').trim();
      if (clean && clean.length > 20) { description = clean.substring(0, 160); break; }
    }
  }

  return { slug, displayName, description };
}

function scanOutputFiles(clientDir) {
  const files = [];
  const subdirs = ['01-contenido', '02-paid-ads', '03-email', '04-landing-pages'];
  for (const sub of subdirs) {
    const subPath = path.join(clientDir, sub);
    if (!fs.existsSync(subPath)) continue;
    (function scan(dir, rel) {
      for (const item of fs.readdirSync(dir)) {
        if (item === '.gitkeep') continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) { scan(full, path.join(rel, item)); }
        else { files.push({ nombre: item, ruta: path.join(rel, item).replace(/\\/g, '/'), modificado: stat.mtime.toISOString().split('T')[0] }); }
      }
    })(subPath, sub);
  }
  return files.sort((a, b) => b.modificado.localeCompare(a.modificado));
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n⏱  TimeKeepers AI — Actualizando dashboard...\n');

const data = { generado: new Date().toISOString(), clientes: [], skills: [] };

// Clientes
const clientSlugs = fs.readdirSync(CLIENTES_DIR)
  .filter(d => !d.startsWith('_') && fs.statSync(path.join(CLIENTES_DIR, d)).isDirectory());

for (const slug of clientSlugs) {
  const dir = path.join(CLIENTES_DIR, slug);
  const identity = parseIdentity(readFileSafe(path.join(dir, '00-identity', 'identity.md')));
  const historial = parseHistorial(readFileSafe(path.join(dir, '_historial.md')));
  const archivos  = scanOutputFiles(dir);

  data.clientes.push({ slug, ...identity, historial, archivos });
  console.log(`  ✓ ${slug.padEnd(25)} ${archivos.length} archivos de output`);
}

// Skills
const skillDirs = fs.readdirSync(SKILLS_DIR)
  .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory());

for (const d of skillDirs) {
  data.skills.push(parseSkill(path.join(SKILLS_DIR, d)));
}
console.log(`\n  ✓ ${data.skills.length} skills cargadas`);

// Escribir data.json y data.js
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE,    JSON.stringify(data, null, 2), 'utf8');
fs.writeFileSync(DATA_JS_FILE, `window.DASHBOARD_DATA = ${JSON.stringify(data, null, 2)};`, 'utf8');

console.log(`\n✅ Archivos generados`);
console.log(`   data.json + data.js`);
console.log(`   Clientes : ${data.clientes.length}`);
console.log(`   Skills   : ${data.skills.length}`);
console.log(`   Timestamp: ${data.generado}\n`);
