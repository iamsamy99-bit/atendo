#!/usr/bin/env python3
"""
Genera las 12 ilustraciones de las páginas de servicios.

Sistema compartido: cada escena se dibuja una sola vez y se estampa tres veces
—teal desplazada, magenta desplazada y tinta en registro— imitando el error de
registro de la impresión offset, igual que los titulares del sitio.
"""
import os

W, H = 1200, 900
CREMA, TINTA, TEAL, MAGENTA = "#f7fbff", "#0a1628", "#0560fc", "#37a3fe"
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "illus")

BASE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{alt}">
  <!-- Generado con scratchpad/ilustraciones.py — estilo de placas offset del sitio -->
  <defs>{defs}</defs>
  <rect width="{w}" height="{h}" fill="{crema}"/>
  <g style="mix-blend-mode:multiply" opacity="0.9" transform="translate(4,3)"
     stroke="{teal}" fill="{teal}">{escena}</g>
  <g style="mix-blend-mode:multiply" opacity="0.5" transform="translate(-3.5,-2.5)"
     stroke="{magenta}" fill="{magenta}">{escena}</g>
  <g stroke="{tinta}" fill="{tinta}">{escena}</g>
</svg>
'''

# ── Piezas reutilizables ────────────────────────────────────────────
# `f` marca relleno, `o` solo contorno. Se usa currentColor para que cada
# estampa herede el color de su grupo.
def telefono(x, y, s=1, o=False):
    """Auricular clásico de teléfono."""
    m = 'fill="none" stroke-width="11"' if o else 'stroke="none"'
    return (f'<g transform="translate({x},{y}) scale({s})"><path {m} d="M18 6c0-9 7-16 16-16h22'
            f'c8 0 15 6 16 15l2 22c1 8-6 15-14 16l-12 1c-5 25-5 50 0 75l12 1c8 1 15 8 14 16'
            f'l-2 22c-1 9-8 15-16 15H34c-9 0-16-7-16-16 0-50 0-99 0-151z"/></g>')

def ondas(x, y, s=1, n=3):
    """Arcos concéntricos abiertos hacia la derecha."""
    p = []
    for i in range(n):
        r = 52 + i * 34
        # Arco de ~120°, centrado en el eje horizontal.
        p.append(f'<path d="M0 {-r*0.86:.0f} A {r} {r} 0 0 1 0 {r*0.86:.0f}" fill="none" '
                 f'stroke-width="10" stroke-linecap="round"/>')
    return f'<g transform="translate({x},{y}) scale({s})">{"".join(p)}</g>'

def calendario(x, y, s=1, check=True):
    c = ('<path d="M62 132 l32 32 62 -66" fill="none" stroke-width="15" '
         'stroke-linecap="round" stroke-linejoin="round"/>') if check else ''
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="10">'
            f'<rect x="0" y="22" width="210" height="178" rx="10"/><path d="M0 72 h210"/>'
            f'<path d="M52 22 V0 M158 22 V0" stroke-linecap="round"/>{c}</g>')

def burbuja(x, y, w_, h_, s=1, cola="izq", relleno=False):
    f = '' if relleno else 'fill="none" '
    t = (f'<path d="M0 {h_} l0 26 26 -26z"/>' if cola == "izq"
         else f'<path d="M{w_} {h_} l0 26 -26 -26z"/>')
    return (f'<g transform="translate({x},{y}) scale({s})" {f}stroke-width="10">'
            f'<rect x="0" y="0" width="{w_}" height="{h_}" rx="14"/>{t}</g>')

def reloj(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="10">'
            f'<circle cx="60" cy="60" r="58"/>'
            f'<path d="M60 26 V62 l26 16" stroke-linecap="round" stroke-linejoin="round"/></g>')

def navegador(x, y, w_, h_, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="10">'
            f'<rect x="0" y="0" width="{w_}" height="{h_}" rx="12"/>'
            f'<path d="M0 44 h{w_}"/>'
            f'<circle cx="26" cy="22" r="7" fill="currentColor" stroke="none"/>'
            f'<circle cx="50" cy="22" r="7" fill="currentColor" stroke="none"/>'
            f'<circle cx="74" cy="22" r="7" fill="currentColor" stroke="none"/></g>')

def nube(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="10">'
            f'<path d="M52 128 a48 48 0 0 1 4 -95 a62 62 0 0 1 116 -14 a44 44 0 0 1 10 87 z" '
            f'stroke-linejoin="round"/></g>')

def flecha(x1, y1, x2, y2, punteada=True):
    """Flecha real entre dos puntos: la punta se rota según el ángulo.

    La versión anterior dibujaba la línea en horizontal y colocaba la punta a
    la altura de destino, así que en cualquier diagonal la punta aparecía
    despegada de la línea.
    """
    import math
    ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    largo = math.hypot(x2 - x1, y2 - y1)
    d = ' stroke-dasharray="3 20"' if punteada else ''
    return (f'<g transform="translate({x1},{y1}) rotate({ang:.1f})" fill="none" '
            f'stroke-width="8" stroke-linecap="round">'
            f'<path d="M0 0 H{largo-22:.0f}"{d}/>'
            f'<path d="M{largo-26:.0f} -17 l19 17 -19 17" stroke-linejoin="round"/></g>')

def lineas(x, y, anchos, gap=26, sw=9):
    return ''.join(f'<path d="M{x} {y+i*gap} h{a}" stroke-width="{sw}" stroke-linecap="round" '
                   f'fill="none"/>' for i, a in enumerate(anchos))

def persona(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="10">'
            f'<circle cx="46" cy="34" r="30"/>'
            f'<path d="M0 128 a46 46 0 0 1 92 0" stroke-linecap="round"/></g>')

def equis(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})" fill="none" stroke-width="12" '
            f'stroke-linecap="round"><path d="M0 0 L44 44 M44 0 L0 44"/></g>')

def punto(x, y, r=9):
    return f'<circle cx="{x}" cy="{y}" r="{r}" stroke="none"/>'

# ── Las 12 escenas ──────────────────────────────────────────────────
ESCENAS = {
 # ---------------- VOZ ----------------
 "voz-hero": ("Una llamada entrante que el agente contesta y convierte en una cita agendada",
    telefono(170, 300, 2.0) + ondas(430, 480, 1.5) +
    flecha(620, 480, 780, 480) + calendario(810, 350, 1.5)),

 "voz-problema": ("Un teléfono que suena sin que nadie conteste",
    telefono(240, 290, 2.2) + ondas(560, 500, 1.6) + equis(800, 460, 3.0)),

 "voz-apoyo": ("Un agente atendiendo varias llamadas a la vez sin perder ninguna",
    telefono(120, 130, 1.25) + telefono(120, 400, 1.25) + telefono(120, 670, 1.25) +
    flecha(330, 230, 560, 400) + flecha(330, 500, 560, 460) + flecha(330, 770, 560, 520) +
    persona(640, 380, 2.0) + flecha(880, 470, 990, 470) + calendario(1000, 390, 0.9)),

 "salud-problema": ("Un consultorio donde el teléfono suena mientras se atiende a un paciente",
    telefono(200, 300, 2.0) + ondas(500, 500, 1.5) + persona(760, 330, 2.0) +
    equis(1000, 620, 2.2)),

 "salud-apoyo": ("Cada llamada del consultorio convertida en una cita confirmada en la agenda",
    telefono(140, 340, 1.6) + flecha(400, 470, 540, 470) + persona(580, 360, 1.9) +
    flecha(800, 470, 930, 470) + calendario(940, 390, 1.1)),

 # ---------------- CHAT ----------------
 "chat-hero": ("Un mensaje de cliente respondido al instante por el agente",
    burbuja(140, 200, 430, 155, 1, "izq") + lineas(195, 258, [310, 230]) +
    flecha(600, 330, 700, 430) +
    burbuja(600, 460, 450, 175, 1, "der", True) + reloj(220, 560, 1.3)),

 "chat-problema": ("Mensajes de clientes que se acumulan sin respuesta",
    burbuja(140, 140, 420, 130, 1, "izq") + burbuja(190, 340, 420, 130, 1, "izq") +
    burbuja(240, 540, 420, 130, 1, "izq") + equis(830, 380, 3.2)),

 "chat-apoyo": ("La conversación avanza de la pregunta a la cotización y a la cita",
    burbuja(110, 350, 300, 130, 1, "izq") + flecha(440, 415, 560, 415) +
    burbuja(560, 350, 280, 130, 1, "der", True) + flecha(870, 415, 960, 415) +
    calendario(960, 330, 0.9)),

 # ---------------- WHATSAPP ----------------
 "whatsapp-hero": ("El número del negocio conectado a la API oficial de WhatsApp",
    telefono(150, 320, 1.7) + flecha(400, 480, 520, 480) + nube(560, 380, 1.6) +
    flecha(910, 480, 1010, 480) + burbuja(1010, 420, 150, 120, 1, "der", True)),

 "whatsapp-problema": ("El número sigue siendo del negocio al pasar a la API oficial",
    telefono(200, 300, 2.0) + flecha(480, 400, 700, 300) + flecha(480, 560, 700, 660) +
    burbuja(720, 210, 340, 150, 1, "der", True) + navegador(720, 560, 340, 230, 1)),

 "whatsapp-apoyo": ("El panel donde se ven las conversaciones que atendió el agente",
    navegador(130, 220, 640, 470, 1) + lineas(190, 340, [460, 380, 430, 340, 400, 300], 42) +
    burbuja(850, 280, 260, 120, 1, "der", True) + burbuja(850, 470, 260, 120, 1, "der")),

 # ---------------- WEB ----------------
 "web-hero": ("Un sitio web que convierte visitas en clientes",
    navegador(130, 230, 620, 450, 1) + lineas(190, 370, [420, 340, 380, 300], 44) +
    flecha(800, 470, 920, 470) + persona(940, 390, 1.9)),

 "web-problema": ("Una página lenta hace que el visitante se vaya",
    navegador(150, 250, 540, 400, 1) + reloj(360, 380, 1.6) +
    persona(860, 330, 1.9) + flecha(880, 640, 1090, 640)),

 "web-apoyo": ("El sitio conectado al agente de voz y al chatbot",
    navegador(380, 120, 450, 330, 1) + flecha(520, 490, 320, 640) +
    flecha(700, 490, 880, 640) + telefono(180, 650, 1.5) +
    burbuja(830, 660, 290, 140, 1, "der", True)),
}

def generar():
    os.makedirs(SALIDA, exist_ok=True)
    total = 0
    for nombre, (alt, escena) in ESCENAS.items():
        svg = BASE.format(w=W, h=H, alt=alt, defs="", escena=escena,
                          crema=CREMA, tinta=TINTA, teal=TEAL, magenta=MAGENTA)
        ruta = os.path.join(SALIDA, f"{nombre}.svg")
        open(ruta, "w", encoding="utf-8").write(svg)
        kb = os.path.getsize(ruta) / 1024
        total += kb
        print(f"  {nombre:<20} {kb:5.1f} KB   {alt[:52]}")
    print(f"\n  {len(ESCENAS)} ilustraciones · {total:.1f} KB en total")


if __name__ == "__main__":
    generar()
