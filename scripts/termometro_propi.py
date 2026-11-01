#!/usr/bin/env python3
"""Termómetro Propi — actualiza los datos de tools/benchmark-propi.html.

Lo usa la tarea programada de los lunes y viernes. Lee cuatro CSV (separados por ';')
con lo que se leyó de Propi, separa las unidades listas de las tarjetas de proyectos
en planos, valida que la lectura esté completa, guarda la foto anterior para medir
cambios y escribe los datos y la fecha de actualización en la página y en el hub.

Uso:
  python3 scripts/termometro_propi.py --entrada DIR [--fecha 2026-11-03T06:44:00-06:00]
                                      [--html tools/benchmark-propi.html]
                                      [--indice tools/index.html] [--solo-validar]

DIR contiene:
  apartamentos.csv, casas.csv, terrenos.csv   n;nombre;zona;precio_usd;m2;habitaciones;banos;desde
  planos.csv                                  n;proyecto;tipo;zona;municipio;precio_desde_usd;m2_min;m2_max;etiquetas

Sale con código 2 (y no escribe nada) si la lectura parece incompleta.
"""
import argparse
import csv
import datetime as dt
import json
import pathlib
import re
import statistics
import sys
import unicodedata

TZ = dt.timezone(dt.timedelta(hours=-6))  # El Salvador, sin horario de verano
MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
HIST_MAX = 120

# Zona canónica: (patrón, nombre). Se prueba con la zona y, si es genérica, con el nombre.
ZONAS = [
    (r'escal[oó]n norte', 'Escalón Norte'),
    (r'escal[oó]n|masferrer|altavista|alta 510|torre maya|campestre 105', 'Escalón'),
    (r'san benito|zona rosa|reforma|la capilla|las palmas|terranova|casa 159|torre nest', 'San Benito'),
    (r'mascota|trelum|sentosa', 'La Mascota'),
    (r'nu lomas|lomas 500|lomas de san francisco', 'Nu Lomas'),
    (r'san francisco|abetos|capitello|constella|allegro|torre aria|sole blu', 'Col. San Francisco'),
    (r'flor blanca|the flats', 'Flor Blanca'),
    (r'san antonio abad|los cojos|torre indigo', 'San Antonio Abad'),
    (r'maquilishuat', 'Maquilishuat'),
    (r'antiguo cuscatl|santa elena|merliot|madreselva|puerta del alma|portales del bosque|alturas del bosque|arbor|casas del bosque', 'Antiguo Cuscatlán'),
    (r'nuevo cuscatl|artea|portacelli|la florida|park tower|opera tower|lateral|ambar|[aá]mbar|one nuevo', 'Nuevo Cuscatlán'),
    (r'santa tecla|utila|la monta[nñ]a|ramblas|fauve|via del mar|las palmeras|santa teresa|suiza|trib|condado santa rosa', 'Santa Tecla'),
    (r'costa del sol|herradura|amatecampo|talpa|comalapa|jaltepeque|salinitas|preamar|azule|palm solaris', 'Costa del Sol y Comalapa'),
    (r'mizata|zonte|san blas|surf|sunzal|tamanique|la libertad|canarias|teotepeque|chiltiup|puerto de', 'Costa de La Libertad'),
    (r'barra de santiago|barra salada|jujutla|acajutla|metalio|izcacuyo|cuco|ventana beach|jiquilisco|las tunas', 'Otras playas'),
    (r'san jos[eé] villanueva|las luces|el encanto|la hacienda|miramar|floreli|foresta', 'San José Villanueva'),
    (r'zaragoza|tuscania|bonavista|peñaflor|manantiales|pergolas|costa verde|las mercedes', 'Zaragoza'),
    (r'apopa|valterra|metr[oó]poli|paseo del prado|ermita|alturas del valle', 'Apopa'),
    (r'opico|marsella|gratamira|tecpan', 'San Juan Opico'),
    (r'col[oó]n|arboledas|lourdes|21 de abril', 'Colón'),
    (r'soyapango|ilopango|renacer', 'Soyapango e Ilopango'),
    (r'planes de renderos|capilano|panchimalco|huizucar', 'Planes de Renderos'),
    (r'santa ana|coatepeque|ecoterra|sonzacate|salitrillo|chalchuapa|el mora|arizona', 'Santa Ana'),
    (r'san miguel', 'San Miguel'),
]
COSTA = re.compile(r'costa del sol|herradura|amatecampo|talpa|comalapa|jaltepeque|salinitas|preamar|azule|palm solaris|'
                   r'mizata|zonte|san blas|surf|sunzal|tamanique|canarias|teotepeque|chiltiup|puerto de la libertad|'
                   r'barra de santiago|barra salada|jujutla|acajutla|metalio|izcacuyo|cuco|ventana beach|jiquilisco|'
                   r'las tunas|playa|wave|ocean|loft sunset|cayena|cerromar|atami|beach', re.I)
GENERICAS = {'', 'san salvador', 'la libertad', 'el salvador', 'distrito 1 san salvador'}


def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'^(casa|apartamento|land|terreno|lote) (en|in) ', '', s.strip())
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def limpio(s):
    s = re.sub(r'^(Casa|Apartamento|Land|Terreno|Lote) (en|in) ', '', (s or '').strip())
    return re.sub(r'\s+', ' ', s).strip(' "')


def zona_canon(zona, nombre):
    for txt in ([zona, nombre] if norm(zona) not in GENERICAS else [nombre, zona]):
        t = (txt or '').lower()
        for pat, nom in ZONAS:
            if re.search(pat, t):
                return nom
    z = limpio(zona) or limpio(nombre)
    return z[:40] if z else 'Sin zona'


def entero(s):
    s = re.sub(r'[^\d]', '', s or '')
    return int(s) if s else None


def es_rango(s):
    return bool(re.search(r'\d\s*(-|a)\s*\d', s or ''))


def leer(path):
    with open(path, encoding='utf-8') as f:
        lineas = [l for l in f.read().splitlines() if l.strip() and not l.startswith('```')]
    return list(csv.DictReader(lineas, delimiter=';'))


def cargar(entrada):
    entrada = pathlib.Path(entrada)
    planos = []
    for r in leer(entrada / 'planos.csv'):
        tipo = norm(r.get('tipo'))
        t = 'a' if tipo.startswith('apart') else 'c' if tipo.startswith('casa') else 'l'
        n = limpio(r.get('proyecto'))
        if not n:
            continue
        z = limpio(r.get('zona'))
        mu = limpio(r.get('municipio'))
        tags = [x.strip() for x in (r.get('etiquetas') or '').split('|') if x.strip()]
        planos.append({'t': t, 'n': n, 'z': z, 'mu': mu, 'zc': zona_canon(z + ' ' + mu, n),
                       'p': entero(r.get('precio_desde_usd')), 'm1': entero(r.get('m2_min')),
                       'm2': entero(r.get('m2_max')), 'tags': tags,
                       'costa': bool(COSTA.search(' '.join([n, z, mu] + tags)))})
    claves_planos = {(norm(p['n']), p['p']) for p in planos}
    nombres_planos = {norm(p['n']) for p in planos}

    unidades, descartadas = [], 0
    for archivo, t in (('apartamentos.csv', 'a'), ('casas.csv', 'c'), ('terrenos.csv', 't')):
        for r in leer(entrada / archivo):
            n = limpio(r.get('nombre'))
            p = entero(r.get('precio_usd'))
            m_txt = r.get('m2') or ''
            h, b = entero(r.get('habitaciones')), entero(r.get('banos'))
            desde = (r.get('desde') or '').strip() == '1'
            proyecto = (desde or es_rango(m_txt) or p is None or (norm(n), p) in claves_planos or
                        (t != 't' and h is None and b is None and norm(n) in nombres_planos))
            if proyecto or not n:
                descartadas += 1
                continue
            z = limpio(r.get('zona'))
            m = entero(m_txt)
            unidades.append({'t': t, 'n': n, 'z': z, 'zc': zona_canon(z, n), 'p': p, 'm': m or None,
                             'h': h, 'b': b, 'costa': bool(COSTA.search(n + ' ' + z))})
    return unidades, planos, descartadas


def mediana(v):
    v = [x for x in v if x]
    return round(statistics.median(v)) if v else None


def resumen(fecha, u, pl):
    ap = [x for x in u if x['t'] == 'a']
    pa = [x for x in pl if x['t'] == 'a']
    return {
        'f': fecha[:10], 'u': len(u), 'ua': len(ap), 'uc': sum(x['t'] == 'c' for x in u),
        'ut': sum(x['t'] == 't' for x in u), 'np': len(pl), 'npa': len(pa),
        'pa': mediana([x['p'] for x in ap]),
        'ma': mediana([x['p'] / x['m'] for x in ap if x['m'] and 25 <= x['m'] <= 600]),
        'pp': mediana([x['p'] for x in pa]),
        'mp': mediana([x['p'] / x['m1'] for x in pa if x['p'] and x['m1']]),
    }


def bloque(html):
    m = re.search(r'(<script type="application/json" id="propi-datos">)(.*?)(</script>)', html, re.S)
    if not m:
        sys.exit('No encontré el bloque de datos <script id="propi-datos"> en la página.')
    return m


def fecha_corta(iso):
    d = dt.datetime.fromisoformat(iso)
    return '%d %s %d' % (d.day, MESES[d.month - 1], d.year)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--entrada', required=True)
    ap.add_argument('--html', default='tools/benchmark-propi.html')
    ap.add_argument('--indice', default='tools/index.html')
    ap.add_argument('--fecha', default=None, help='ISO 8601; por defecto, ahora en El Salvador')
    ap.add_argument('--solo-validar', action='store_true')
    a = ap.parse_args()

    fecha = a.fecha or dt.datetime.now(TZ).replace(microsecond=0).isoformat()
    unidades, planos, descartadas = cargar(a.entrada)
    nuevo = resumen(fecha, unidades, planos)

    html_path = pathlib.Path(a.html)
    html = html_path.read_text(encoding='utf-8')
    m = bloque(html)
    actual = json.loads(m.group(2).replace('<\\/', '</')) if m.group(2).strip() else {}
    previo = (actual.get('historial') or [{}])[-1] if actual.get('inmediata') else {}

    # Validación: una lectura incompleta no se publica
    problemas = []
    if nuevo['u'] < 100:
        problemas.append('solo %d unidades listas (mínimo 100)' % nuevo['u'])
    if nuevo['np'] < 30:
        problemas.append('solo %d proyectos en planos (mínimo 30)' % nuevo['np'])
    for k, nom in (('ua', 'apartamentos'), ('uc', 'casas'), ('ut', 'terrenos'), ('np', 'proyectos')):
        if previo.get(k) and not previo.get('manual') and nuevo[k] < 0.6 * previo[k]:
            problemas.append('%s bajó de %d a %d (más de 40%%): probable lectura incompleta' % (nom, previo[k], nuevo[k]))

    print('Lectura %s: %d unidades listas (%d apartamentos, %d casas, %d terrenos), %d proyectos en planos, '
          '%d tarjetas de proyecto descartadas de la lista de compra inmediata.'
          % (fecha, nuevo['u'], nuevo['ua'], nuevo['uc'], nuevo['ut'], nuevo['np'], descartadas))
    print('Mediana apartamento listo: $%s · $%s/m² · en planos desde $%s · $%s/m²'
          % (nuevo['pa'], nuevo['ma'], nuevo['pp'], nuevo['mp']))
    if problemas:
        print('NO SE PUBLICA: ' + '; '.join(problemas))
        sys.exit(2)
    if a.solo_validar:
        return

    datos = {
        'actualizado': fecha,
        'fuente': 'Propi El Salvador (propilatam.com): compra inmediata (apartamentos, casas y terrenos) y proyectos en planos.',
        'inmediata': unidades,
        'planos': planos,
        'anterior': ({'actualizado': actual.get('actualizado'), 'inmediata': actual.get('inmediata', []),
                      'planos': actual.get('planos', [])} if actual.get('inmediata') else None),
        'historial': ([h for h in actual.get('historial', []) if h.get('f') != nuevo['f']] + [nuevo])[-HIST_MAX:],
    }
    js = json.dumps(datos, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = html[:m.start(2)] + js + html[m.end(2):]
    html_path.write_text(html, encoding='utf-8')

    idx = pathlib.Path(a.indice)
    if idx.exists():
        t = idx.read_text(encoding='utf-8')
        t2, n = re.subn(r"(url: '/tools/benchmark-propi',[\s\S]*?meta: ')[^']*(')",
                        lambda mm: mm.group(1) + 'Actualizado: ' + fecha_corta(fecha) + mm.group(2), t, count=1)
        if n:
            idx.write_text(t2, encoding='utf-8')
    print('Listo: datos escritos en %s y fecha en %s.' % (html_path, idx))


if __name__ == '__main__':
    main()
