const { Pool } = require('pg');
const { Meilisearch: MeiliSearch } = require('meilisearch');
const fs   = require('fs');
const path = require('path');

const BASE         = path.resolve(__dirname, '..');
const CLIENTES_DIR = path.join(BASE, 'clientes');
const SKILLS_DIR   = path.join(BASE, '.claude', 'skills');

const pool = new Pool({ database: 'timekeepers', host: 'localhost' });
const meili = new MeiliSearch({ host: 'http://localhost:7700' });

function readJson(p)  { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function readFile(p)  { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function parseDate(s) { if (!s) return null; const m = String(s).match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; }

function parsePlan(raw) {
  if (!raw) return 'Estándar';
  const s = String(raw).toLowerCase();
  if (s.includes('deluxe') || s === '1299' || s === '1500') return 'Deluxe';
  if (s.includes('est') || s === '900') return 'Estándar';
  return raw;
}

async function migrarClientes() {
  const slugs = fs.readdirSync(CLIENTES_DIR)
    .filter(d => !d.startsWith('_') && fs.statSync(path.join(CLIENTES_DIR, d)).isDirectory());

  for (const slug of slugs) {
    const dir      = path.join(CLIENTES_DIR, slug);
    const identity = readJson(path.join(dir, '00-identity', 'identity.json'));
    const identityMd = readFile(path.join(dir, '00-identity', 'identity.md')) || '';

    // Extraer nombre del identity.json o usar el slug
    let nombre = slug;
    if (identity?.nombre) nombre = identity.nombre;
    else if (identity?.razon_social) nombre = identity.razon_social;
    else {
      const match = identityMd.match(/^#\s+(.+?)\s+—/m);
      if (match) nombre = match[1].trim();
    }

    const plan    = parsePlan(identity?.plan || identity?.plan_contratado);
    const score   = parseFloat(identity?.score || 0) || 0;
    const website = identity?.website_url || null;

    const res = await pool.query(
      `INSERT INTO clientes (slug, nombre, plan, score, website_url)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (slug) DO UPDATE SET nombre=$2,plan=$3,score=$4,website_url=$5,updated_at=NOW()
       RETURNING id`,
      [slug, nombre, plan, score, website]
    );
    const clienteId = res.rows[0].id;
    console.log(`  ✓ Cliente: ${slug} (id=${clienteId})`);

    // Migrar campos de identity como clave-valor
    if (identity) {
      await pool.query('DELETE FROM identities WHERE cliente_id=$1', [clienteId]);
      for (const [bloque, campos] of Object.entries(identity)) {
        if (typeof campos === 'object' && campos !== null && !Array.isArray(campos)) {
          for (const [campo, valor] of Object.entries(campos)) {
            await pool.query(
              `INSERT INTO identities (cliente_id, bloque, campo, valor) VALUES ($1,$2,$3,$4)`,
              [clienteId, bloque, campo, String(valor ?? '')]
            );
          }
        } else if (bloque !== 'score') {
          await pool.query(
            `INSERT INTO identities (cliente_id, bloque, campo, valor) VALUES ($1,$2,$3,$4)`,
            [clienteId, 'root', bloque, String(campos ?? '')]
          );
        }
      }
    }

    // Migrar parrillas JSON
    const parrillasDir = path.join(dir, '01-contenido', 'parrillas');
    if (fs.existsSync(parrillasDir)) {
      const archivos = fs.readdirSync(parrillasDir).filter(f => f.endsWith('.json'));
      for (const archivo of archivos) {
        const data = readJson(path.join(parrillasDir, archivo));
        if (!data?.piezas) continue;

        const pRes = await pool.query(
          `INSERT INTO parrillas (cliente_id, archivo, evento, semanas, total_piezas, score, generado)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT DO NOTHING RETURNING id`,
          [clienteId, archivo, data.meta?.evento||null, data.meta?.semanas||2,
           data.piezas.length, null, parseDate(data.meta?.generado)]
        );

        if (pRes.rows.length === 0) continue;
        const parrillaId = pRes.rows[0].id;

        for (const p of data.piezas) {
          await pool.query(
            `INSERT INTO piezas
             (parrilla_id,cliente_id,numero,semana,fecha,dia,formato,titulo,
              caption_post,copy_slides,material,hook_primer_frame,cta,keyword_dm,
              hashtags,objetivo,angulo,hora,plataforma,estado,auto_qa)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
            [parrillaId, clienteId, p.numero, p.semana, p.fecha, p.dia,
             p.formato, p.titulo, p.caption_post||p.caption||'',
             p.copy_slides ? JSON.stringify(p.copy_slides) : null,
             p.material, p.hook_primer_frame, p.cta, p.keyword_dm,
             p.hashtags, p.objetivo, p.angulo,
             p.hora||p.hora_sugerida||null, p.plataforma||null,
             p.estado||'1️⃣ Guion', p.auto_qa||null]
          );
        }
        console.log(`    ↳ Parrilla: ${archivo} (${data.piezas.length} piezas)`);
      }
    }

    // Migrar objetivos
    const objFile = path.join(dir, 'objetivos.json');
    const objData = readJson(objFile);
    if (objData?.meses) {
      for (const [mes, obj] of Object.entries(objData.meses)) {
        await pool.query(
          `INSERT INTO objetivos (cliente_id, mes, objetivo_macro, mix_contenido, kpis, semanas, resultados, notas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (cliente_id, mes) DO UPDATE
           SET objetivo_macro=$3, mix_contenido=$4, kpis=$5, semanas=$6, resultados=$7, notas=$8, updated_at=NOW()`,
          [clienteId, mes, obj.objetivo_macro||'', JSON.stringify(obj.mix_contenido||{}),
           JSON.stringify(obj.objetivos||{}), JSON.stringify(obj.semanas||[]),
           JSON.stringify(obj.resultados_reales||{}), obj.notas||'']
        ).catch(() => {});
      }
      console.log(`    ↳ Objetivos migrados`);
    }
  }
}

async function migrarSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return;
  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => d !== '.gitkeep' && fs.statSync(path.join(SKILLS_DIR, d)).isDirectory());

  const CORE = ['copywriting','social-content','email-sequence','copy-editing',
                'marketing-psychology','customer-research','content-strategy','image',
                'marketing-ideas','popup-cro'];

  for (const slug of skillDirs) {
    const skillMd = readFile(path.join(SKILLS_DIR, slug, 'SKILL.md')) || '';
    const nombre  = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const plan    = CORE.includes(slug) ? 'Estándar' : 'Deluxe';
    const desc    = skillMd.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';

    await pool.query(
      `INSERT INTO skills (slug, nombre, plan, descripcion)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET nombre=$2,plan=$3,descripcion=$4`,
      [slug, nombre, plan, desc.trim()]
    );
  }
  console.log(`  ✓ ${skillDirs.length} skills migradas`);
}

async function indexarMeiliSearch(piezas) {
  await meili.createIndex('piezas', { primaryKey: 'id' });
  await meili.createIndex('clientes', { primaryKey: 'id' });

  const idx = meili.index('piezas');
  await idx.updateSettings({
    searchableAttributes: ['titulo','caption_post','hashtags','angulo','objetivo','formato'],
    filterableAttributes: ['cliente_id','formato','objetivo','angulo','estado'],
    sortableAttributes: ['created_at']
  });

  if (piezas.length > 0) {
    await idx.addDocuments(piezas);
    console.log(`  ✓ ${piezas.length} piezas indexadas en MeiliSearch`);
  }

  // Indexar clientes
  const cRes = await pool.query('SELECT * FROM clientes');
  const cidx = meili.index('clientes');
  await cidx.updateSettings({ searchableAttributes: ['nombre','slug','plan','mercado'] });
  if (cRes.rows.length > 0) {
    await cidx.addDocuments(cRes.rows);
    console.log(`  ✓ ${cRes.rows.length} clientes indexados en MeiliSearch`);
  }
}

async function main() {
  console.log('\n⏱  TimeKeepers AI — Migración a PostgreSQL + MeiliSearch\n');

  try {
    console.log('📦 Migrando clientes, parrillas y objetivos...');
    await migrarClientes();

    console.log('\n🎯 Migrando skills...');
    await migrarSkills();

    console.log('\n🔍 Indexando en MeiliSearch...');
    const piezasRes = await pool.query('SELECT * FROM piezas LIMIT 1000');
    await indexarMeiliSearch(piezasRes.rows);

    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes)  AS clientes,
        (SELECT COUNT(*) FROM parrillas) AS parrillas,
        (SELECT COUNT(*) FROM piezas)    AS piezas,
        (SELECT COUNT(*) FROM skills)    AS skills,
        (SELECT COUNT(*) FROM objetivos) AS objetivos
    `);
    const s = stats.rows[0];

    console.log('\n✅ Migración completada:');
    console.log(`   Clientes : ${s.clientes}`);
    console.log(`   Parrillas: ${s.parrillas}`);
    console.log(`   Piezas   : ${s.piezas}`);
    console.log(`   Skills   : ${s.skills}`);
    console.log(`   Objetivos: ${s.objetivos}`);
    console.log('\n🚀 PostgreSQL en localhost:5432 | MeiliSearch en localhost:7700\n');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
