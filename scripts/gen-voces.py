#!/usr/bin/env python3
# Genera el catalogo de voces chilenas (Azure es-CL) para los arquetipos de Pistero/Pistera.
# Lorenzo (hombre) => archivos l###.mp3 ; Catalina (mujer) => c###.mp3 ; manifest.json mapea frase->id.
# Respeta el limite del tier F0 (20 req/60s) con pausa entre llamadas + reintento en 429.
import os, re, json, time, hashlib, urllib.request, urllib.error

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = ""
REGION = "eastus"
for line in open(os.path.join(BASE, "MI-AZURE.txt"), encoding="utf-8"):
    if line.startswith("AZURE_TTS_KEY="): KEY = line.split("=",1)[1].strip()
    if line.startswith("AZURE_TTS_REGION="): REGION = line.split("=",1)[1].strip()

OUT = os.path.join(BASE, "voces")
os.makedirs(OUT, exist_ok=True)
URL = "https://%s.tts.speech.microsoft.com/cognitiveservices/v1" % REGION

PROSODY = {
 'entrenador':('+13%','+3%','+0%'), 'picaro':('+7%','+7%','+0%'), 'sabio':('-13%','-4%','+0%'),
 'relajado':('-6%','+0%','+0%'), 'sensible':('-5%','+1%','-12%'), 'maternal':('-8%','+1%','+0%'),
 'directo':('+0%','-2%','+0%'), 'relator':('+10%','+4%','+0%'), 'aventurero':('+8%','+3%','+0%'),
 'compadre':('+4%','+2%','+0%'),
}
VOCES = [('l','es-CL-LorenzoNeural'), ('c','es-CL-CatalinaNeural')]

# Catalogo: mismas frases que FRASES_ARQ en index.html + arquetipo 'compadre' nuevo.
CAT = {
 'subida':{
  'entrenador':["Cuesta a la vista: sube un cambio, cadencia constante, no revientes.","Esta subida es tu gimnasio. Aprieta parejo, respira por la nariz.","Aquí se construye el fondo: ritmo, no fuerza bruta.","La subida no se gana con las piernas, se gana con la cabeza. Vamos.","Si puedes hablar en la cuesta, puedes acelerar un poco. Dale."],
  'picaro':["A que no subís esta sin bajarte, campeón 😏.","Uy, la cuestita… ¿o te la vas a caminar como el resto?","Esta subida separa a los que pedalean de los que posan. ¿Cuál eres?","Dale, que allá arriba te estoy esperando hace rato.","Apuesto a que aflojas antes de la mitad. Demuéstrame que no."],
  'sabio':["La subida enseña lo que la bajada esconde: quién eres cuando duele.","Cada pedaleo cuesta arriba es una tranca mental que sueltas.","No pelees la cuesta; fluye con ella. La montaña siempre gana si la enfrentas con rabia.","El esfuerzo de ahora es la paz de la cima. Sube presente.","La cuesta no es un obstáculo, es el camino. Habítala."],
  'relajado':["Subidita no más, sin apuro. Baja un cambio y disfruta el paisaje.","Tranquilo, la cima no se va a ningún lado. A tu ritmo.","Si hay que bajarse un rato, se baja. Esto es un paseo, no una carrera.","Suave con la cuesta, que lo lindo es el camino, no la prisa."],
  'sensible':["Sé que esta cuesta cuesta. Estoy contigo, vamos de a poco.","Si necesitas parar, para. No hay vergüenza en cuidarte.","Un pedaleo a la vez, tú puedes. No estás solo en esto.","Esta subida es dura, pero tú lo eres más. Con calma."],
  'maternal':["Ojo con el corazón en la cuesta, mijo: baja un cambio y no te exijas de más.","Sube con calma, toma agua arriba. Prefiero que llegues tarde a que llegues mal.","No te la juegues toda en la subida, guárdate un poco.","Despacito la cuesta, que nadie te espera con reloj."],
  'directo':["Subida. Baja un cambio, cadencia estable.","Cuesta arriba: reparte el esfuerzo, no arranques fuerte.","Mantén ritmo constante hasta la cima."],
  'relator':["¡Y encara la subida! El público contiene la respiración… ¿podrá con ella?","¡Ataca la cuesta! Esto separa a los grandes. ¡Vamos, vamos!","La montaña lo desafía… ¡y él responde pedaleando con todo!"],
  'aventurero':["¡Esta cuesta es tuya! Arriba te espera una vista que vale cada gota de sudor.","¡Épica subida! Conquístala y cuéntalo después.","Lo desconocido está arriba. ¡Dale que la aventura no espera!"],
  'compadre':["Ya po, apretá que esta cuesta es puro cuento. ¡Dale que podí!","No aflojís, compadre, que arriba está la raja de vista. Métele pata.","Esta subidita es na, pura finta. Le ganái con los ojos cerrados, cachái."],
 },
 'rapido':{
  'entrenador':["Buen ritmo. Sostén esa cadencia sin trabar los hombros.","Vas fuerte. Controla la respiración, mantén la línea.","Velocidad sólida. Ojo con las curvas, no pierdas la técnica."],
  'picaro':["¡Uy, se soltó el fierita! ¿Y esa velocidad de dónde salió? 😏","Ah, ahora sí te pusiste las pilas. A ver si aguantas.","Vas volando… no vaya a ser que te quedes sin pila a la mitad."],
  'sabio':["La velocidad embriaga, pero el camino se disfruta mirando, no corriendo.","Vas rápido; recuerda que llegar no es la meta, es el pretexto.","Rápido está bien, pero no tanto que te pierdas el paisaje."],
  'maternal':["Despacio con esa velocidad, mijo, ojo con los baches y las curvas.","Vas muy rápido, frena un poquito, prefiero verte llegar entero.","Cuidado a esa velocidad, las dos manos firmes."],
  'relator':["¡Y acelera! ¡Vuela por el camino! ¡El viento no lo alcanza!","¡Velocidad de campeonato! ¡El cronómetro tiembla!"],
  'compadre':["¡Uuuh, andái enchufao hoy, volando bajito! ¡Así se hace po, la raja!","Cómo le picái, compadre, vai como bala. ¡No pares, crack!"],
 },
 'lento':{
  'picaro':["¿Vas pedaleando o buscando monedas en el suelo? 😏","Mi abuelita ya llegó y te está esperando.","Dale color, que a este ritmo te pilla la noche."],
  'sensible':["Tranquilo, tu ritmo es válido. Lo importante es que estás rodando.","No te compares con nadie. A tu paso está perfecto.","Cada pedalada cuenta, aunque sea suave. Vas bien."],
  'relajado':["Rico ese ritmo tranqui, sin apuros. Disfruta.","Así, suavecito, que la vida no es una carrera.","Buen paso de paseo. Respira y mira alrededor."],
  'maternal':["Despacito está bien, mijo, no te agites de más.","A ese ritmo cuidas el cuerpo. Bien ahí, con calma."],
  'entrenador':["Ritmo bajo: aprovecha para soltar piernas y recuperar. Luego aprietas."],
  'compadre':["Tranqui no má, sin apuro. La ruta no se arranca, tómate tu tiempo cachái.","Suave que suave se llega igual. Esto es pa' pasarlo bien, no pa' reventarse."],
 },
}

def limpia(txt):
    # quita emojis/simbolos para que Azure no los lea raro
    return re.sub(r'[\U0001F000-\U0001FAFF☀-➿️]', '', txt).replace('  ',' ').strip()

def xml_escape(s):
    return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def synth(voz, rate, pitch, vol, texto, dest):
    ssml = ("<speak version='1.0' xml:lang='es-CL'><voice name='%s'>"
            "<prosody rate='%s' pitch='%s' volume='%s'>%s</prosody></voice></speak>"
            % (voz, rate, pitch, vol, xml_escape(texto)))
    req = urllib.request.Request(URL, data=ssml.encode('utf-8'), method='POST', headers={
        'Ocp-Apim-Subscription-Key': KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'LibrePedal'})
    for intento in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                open(dest,'wb').write(r.read())
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(8*(intento+1)); continue
            print("  ERR", e.code, dest); return False
        except Exception as e:
            time.sleep(3); continue
    return False

manifest = {}
nid = 0
total = 0
for cat, arqs in CAT.items():
    for arq, frases in arqs.items():
        rate, pitch, vol = PROSODY.get(arq, ('+0%','+0%','+0%'))
        for fr in frases:
            if fr in manifest:  # frase ya vista (no deberia)
                continue
            nid += 1
            fid = "%03d" % nid
            manifest[fr] = fid
            texto = limpia(fr)
            for pref, voz in VOCES:
                dest = os.path.join(OUT, pref+fid+".mp3")
                ok = synth(voz, rate, pitch, vol, texto, dest)
                total += 1
                print(("OK " if ok else "FALLO ")+pref+fid, "["+arq+"]", texto[:45])
                time.sleep(3.3)  # respeta 20 req/60s del tier F0

json.dump({"voces":["l","c"], "map":manifest}, open(os.path.join(OUT,"manifest.json"),'w',encoding='utf-8'), ensure_ascii=False)
print("LISTO. frases:", len(manifest), "archivos:", total, "-> voces/manifest.json")
