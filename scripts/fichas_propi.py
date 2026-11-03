#!/usr/bin/env python3
"""Fichas de desarrolladoras del Competitor Benchmark (olympus/benchmark-propi.html).

Los contactos de cada desarrolladora y la ficha de cada proyecto en planos viven en el
bloque <script type="application/json" id="propi-fichas">. termometro_propi.py no lo toca;
este script sí, y solo ese bloque.

Uso:
  # proyectos en planos de la última lectura que todavía no tienen ficha
  python3 scripts/fichas_propi.py --faltantes

  # agregar (o corregir) la ficha de un proyecto
  python3 scripts/fichas_propi.py --proyecto "Nombre exacto en Propi" --desarrolladora "Empresa" \
      [--desc "2 frases"] [--entrega "Q4 2027"] [--url URL_FICHA_PROPI] [--img URL_FOTO] [--nota-proyecto "..."] \
      [--web URL] [--tel "+503 ..."] [--wa "+503 ..."] [--email correo] [--ig usuario] \
      [--conf s|p|x] [--nota "..."] [--fuente URL]

Si la desarrolladora ya existe (mismo nombre, sin importar mayúsculas ni tildes), se reutiliza
y solo se llenan los contactos que estaban vacíos: nunca se borra un contacto existente.
conf: s = visto en canal oficial, p = sitio del proyecto, directorio o prensa, x = sin canal propio.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import sys
import unicodedata

HTML = 'olympus/benchmark-propi.html'
CAMPOS = ('web', 'tel', 'wa', 'email', 'ig', 'nota', 'src')


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', s)


def bloque(html, ident):
    m = re.search(r'(<script type="application/json" id="' + ident + r'">)(.*?)(</script>)', html, re.S)
    if not m:
        sys.exit('No encontré el bloque %s en la página.' % ident)
    return m, json.loads(m.group(2).replace('<\\/', '</'))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--html', default=HTML)
    ap.add_argument('--faltantes', action='store_true')
    ap.add_argument('--proyecto')
    ap.add_argument('--desarrolladora')
    ap.add_argument('--desc', default='')
    ap.add_argument('--entrega', default='')
    ap.add_argument('--url', default='')
    ap.add_argument('--img', default='')
    ap.add_argument('--nota-proyecto', default='')
    for c in ('web', 'tel', 'wa', 'email', 'ig', 'nota'):
        ap.add_argument('--' + c, default='')
    ap.add_argument('--fuente', default='')
    ap.add_argument('--conf', choices=['s', 'p', 'x'], default='p')
    a = ap.parse_args()

    path = pathlib.Path(a.html)
    html = path.read_text(encoding='utf-8')
    _, datos = bloque(html, 'propi-datos')
    mf, F = bloque(html, 'propi-fichas')
    F.setdefault('devs', {})
    F.setdefault('p', {})

    if a.faltantes:
        falt = [p for p in datos.get('planos', []) if norm(p['n']) not in F['p']]
        for p in falt:
            print('%s;%s;%s;%s' % (p['n'], {'a': 'apartamento', 'c': 'casa', 'l': 'lote'}.get(p.get('t'), ''),
                                   p.get('z') or p.get('mu') or '', p.get('p') or ''))
        print('FALTAN %d de %d proyectos en planos' % (len(falt), len(datos.get('planos', []))), file=sys.stderr)
        return

    if not a.proyecto or not a.desarrolladora:
        sys.exit('Faltan --proyecto y --desarrolladora (o usa --faltantes).')
    nombres = {norm(p['n']): p['n'] for p in datos.get('planos', [])}
    k = norm(a.proyecto)
    if k not in nombres:
        sys.exit('El proyecto "%s" no está en la última lectura de planos. Usa el nombre exacto de --faltantes.' % a.proyecto)

    nd = norm(a.desarrolladora)
    dev_id = next((i for i, d in F['devs'].items() if norm(d.get('n')) == nd), None)
    nuevos = {'web': a.web, 'tel': a.tel, 'wa': a.wa, 'email': a.email, 'ig': a.ig.lstrip('@'), 'nota': a.nota, 'src': a.fuente}
    if dev_id is None:
        n = 0
        while 'd%d' % n in F['devs']:
            n += 1
        dev_id = 'd%d' % n
        F['devs'][dev_id] = dict({'n': a.desarrolladora.strip(), 'c': a.conf}, **{c: nuevos[c].strip() for c in CAMPOS})
        print('Desarrolladora nueva: %s (%s)' % (a.desarrolladora, dev_id))
    else:
        d = F['devs'][dev_id]
        llenos = [c for c in CAMPOS if nuevos[c].strip() and not d.get(c)]
        for c in llenos:
            d[c] = nuevos[c].strip()
        if llenos and d.get('c') == 'x':
            d['c'] = a.conf
        print('Desarrolladora existente: %s (%s); contactos agregados: %s' % (d['n'], dev_id, ', '.join(llenos) or 'ninguno'))

    rec = {'d': dev_id, 'desc': a.desc.strip(), 'ent': a.entrega.strip(), 'u': a.url.strip(), 'img': a.img.strip()}
    if a.nota_proyecto.strip():
        rec['nota'] = a.nota_proyecto.strip()
    F['p'][k] = rec
    F['actualizado'] = dt.date.today().isoformat()

    js = json.dumps(F, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    html = html[:mf.start(2)] + js + html[mf.end(2):]
    path.write_text(html, encoding='utf-8')
    print('Ficha guardada: %s → %s' % (nombres[k], F['devs'][dev_id]['n']))


if __name__ == '__main__':
    main()
