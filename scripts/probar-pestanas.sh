#!/bin/bash
# Prueba end-to-end del dashboard: golpea todos los endpoints que consume cada
# una de las 12 pestañas y reporta cuáles responden.
#
#   Uso:  bash scripts/probar-pestanas.sh [slug-cliente]
#   Requiere el servidor corriendo:  cd servidor && node servidor.js
#
# El cliente por defecto es aurora-bakehouse, la empresa ficticia de prueba.
B=http://localhost:3737
S="${1:-aurora-bakehouse}"
PASS=0; FAIL=0

chk() { # chk "<tab>" "<descripción>" "<url>" [método] [body]
  local tab="$1" desc="$2" url="$3" met="${4:-GET}" body="$5"
  local code out
  if [ "$met" = "GET" ]; then
    out=$(curl -s -w '\n%{http_code}' -m 20 "$B$url")
  else
    out=$(curl -s -w '\n%{http_code}' -m 20 -X "$met" -H 'Content-Type: application/json' -d "$body" "$B$url")
  fi
  code=$(echo "$out" | tail -1)
  local payload=$(echo "$out" | sed '$d')
  local okflag=$(echo "$payload" | head -c 40 | grep -cE '"(ok":true|status":"ok")')
  local isbin=$(echo "$payload" | head -c 2 | grep -c 'PK')
  if [ "$code" = "200" ] && { [ "$okflag" = "1" ] || [ "$isbin" = "1" ]; }; then
    printf '  \033[32m✓\033[0m %-13s %s\n' "[$tab]" "$desc"; PASS=$((PASS+1))
  else
    printf '  \033[31m✗\033[0m %-13s %s  (HTTP %s) %s\n' "[$tab]" "$desc" "$code" "$(echo "$payload" | head -c 120)"; FAIL=$((FAIL+1))
  fi
}

# Autodescubrimiento: el mes activo y los nombres de archivo dependen del cliente.
MES=$(curl -s -m 10 "$B/api/cliente/$S/objetivos" | sed -n 's/.*"mes_activo":"\([0-9-]*\)".*/\1/p')
ARCHIVOS=$(curl -s -m 10 "$B/api/cliente/$S/archivos")
PARRILLA=$(echo "$ARCHIVOS" | tr ',' '\n' | sed -n 's/.*"nombre":"\(parrilla[^"]*\.json\)".*/\1/p' | head -1)
STORIES=$(echo  "$ARCHIVOS" | tr ',' '\n' | sed -n 's/.*"nombre":"\(stories[^"]*\.json\)".*/\1/p'  | head -1)

echo "══ PRUEBA DE LAS 12 PESTAÑAS — cliente: $S ══"
echo "   mes activo: ${MES:-—} · parrilla: ${PARRILLA:-ninguna} · stories: ${STORIES:-ninguna}"; echo
chk "GLOBAL"      "health"                      "/api/health"
chk "GLOBAL"      "lista de clientes"           "/api/clientes"
chk "GLOBAL"      "dashboard-data (data.js)"    "/api/dashboard-data"
chk "1 Cliente"   "identity completo"           "/api/cliente/$S/identity"
chk "1 Cliente"   "score de identity"           "/api/cliente/$S/identity/score"
chk "1 Cliente"   "schema de campos"            "/api/schema"
chk "2 Estrategia" "objetivos (todos los meses)" "/api/cliente/$S/objetivos"
if [ -n "$MES" ]; then
  chk "2 Estrategia" "objetivos del mes"         "/api/cliente/$S/objetivos/$MES"
  chk "2 Estrategia" "semáforo de KPIs"          "/api/cliente/$S/objetivos/$MES/semaforo"
  chk "2 Estrategia" "excel de objetivos"        "/api/cliente/$S/objetivos-excel"
else
  printf '  \033[33m–\033[0m %-13s %s\n' "[2 Estrategia]" "cliente sin objetivos.json — configúralo en el Tab Estrategia"
fi
chk "3 Contenido"  "catálogo de 41 skills"       "/api/skills"
chk "3 Contenido"  "generar prompt de parrilla"  "/api/cliente/$S/generar-prompt-parrilla" POST '{"semanas":4,"descripcion":"Julio B2B","skills_seleccionadas":["social-content","copywriting"]}'
chk "4 Producción" "archivos del cliente"        "/api/cliente/$S/archivos"
chk "4 Producción" "estados de producción"       "/api/cliente/$S/estados"
if [ -n "$PARRILLA" ]; then
  chk "4 Producción" "validador de parrilla"     "/api/cliente/$S/validar-parrilla" POST "{\"archivo\":\"$PARRILLA\"}"
  chk "4 Producción" "excel de parrilla"         "/api/cliente/$S/parrilla-excel?archivo=$PARRILLA"
  chk "4 Producción" "leer parrilla (modal)"     "/api/cliente/$S/leer-parrilla?archivo=$PARRILLA"
else
  printf '  \033[33m–\033[0m %-13s %s\n' "[4 Producción]" "sin parrillas JSON — pruebas de parrilla omitidas"
fi
if [ -n "$STORIES" ]; then
  chk "4 Producción" "excel de stories"          "/api/cliente/$S/stories-excel?archivo=$STORIES"
  chk "4 Producción" "leer stories (modal)"      "/api/cliente/$S/leer-stories?archivo=$STORIES"
else
  printf '  \033[33m–\033[0m %-13s %s\n' "[4 Producción]" "sin cadenas de stories — pruebas de stories omitidas"
fi
chk "5 Calendario" "objetivos+estados del mes"   "/api/cliente/$S/estados${MES:+?mes=$MES}"
chk "6 Leads"      "listar leads"                "/api/cliente/$S/leads"
chk "7 Resumen"    "resumen consolidado"         "/api/cliente/$S/resumen"
chk "8 Historial"  "bitácora y ángulos"          "/api/cliente/$S/historial"
chk "9 SEO"        "auditoría de la web"         "/api/seo-audit" POST '{"url":"https://example.com","slug":"'$S'"}'
chk "10 Redes"     "config + snapshots"          "/api/cliente/$S/redes"
chk "10 Redes"     "guardar config IG"           "/api/cliente/$S/redes/ig" PUT '{"handle":"@aurorabakehouse","igUserId":"17841400999000111"}'
chk "11 Seguim."   "stats por red"               "/api/cliente/$S/redes"
chk "12 Herram."   "excel master"                "/api/cliente/$S/excel-master"
chk "12 Herram."   "buscador global (Meili)"     "/api/search?q=fermentacion"
chk "12 Herram."   "stats de Postgres"           "/api/db/stats"

echo
echo "══ RESULTADO: $PASS OK · $FAIL fallidos ══"
[ "$FAIL" = "0" ] || exit 1
