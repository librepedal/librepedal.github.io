#!/usr/bin/env python3
# Genera en voz chilena (neutra) las frases fijas GENERALES de Pistero (confirmaciones,
# saludos, sistema) y las AGREGA al voces/manifest.json existente, continuando los ids.
import os, re, json, time, urllib.request, urllib.error

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = ""; REGION = "eastus"
for line in open(os.path.join(BASE, "MI-AZURE.txt"), encoding="utf-8"):
    if line.startswith("AZURE_TTS_KEY="): KEY = line.split("=",1)[1].strip()
    if line.startswith("AZURE_TTS_REGION="): REGION = line.split("=",1)[1].strip()
URL = "https://%s.tts.speech.microsoft.com/cognitiveservices/v1" % REGION
OUT = os.path.join(BASE, "voces")

frases = json.load(open(os.path.join(BASE, "scripts", "frases-generales.json"), encoding="utf-8"))
mani = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))
mmap = mani["map"]
# id de arranque = max actual + 1
maxid = max([int(v) for v in mmap.values()]) if mmap else 0

VOCES = [('l','es-CL-LorenzoNeural'), ('c','es-CL-CatalinaNeural')]
RATE, PITCH, VOL = '+2%', '+1%', '+0%'   # Pistero neutro/calido para frases de sistema

def limpia(t): return re.sub(r'[\U0001F000-\U0001FAFF☀-➿️]', '', t).replace('  ',' ').strip()
def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def synth(voz, texto, dest):
    ssml = ("<speak version='1.0' xml:lang='es-CL'><voice name='%s'>"
            "<prosody rate='%s' pitch='%s' volume='%s'>%s</prosody></voice></speak>"
            % (voz, RATE, PITCH, VOL, esc(texto)))
    req = urllib.request.Request(URL, data=ssml.encode('utf-8'), method='POST', headers={
        'Ocp-Apim-Subscription-Key': KEY, 'Content-Type':'application/ssml+xml',
        'X-Microsoft-OutputFormat':'audio-24khz-96kbitrate-mono-mp3','User-Agent':'LibrePedal'})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r: open(dest,'wb').write(r.read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(8*(i+1)); continue
            print("  ERR",e.code,dest); return False
        except Exception: time.sleep(3); continue
    return False

nid = maxid; total = 0
for fr in frases:
    if fr in mmap: continue
    nid += 1; fid = "%03d" % nid; mmap[fr] = fid
    texto = limpia(fr)
    if not texto:
        del mmap[fr]; nid -= 1; continue
    for pref, voz in VOCES:
        ok = synth(voz, texto, os.path.join(OUT, pref+fid+".mp3"))
        total += 1
        print(("OK " if ok else "FALLO ")+pref+fid, texto[:50])
        time.sleep(3.3)

json.dump({"voces":["l","c"], "map":mmap}, open(os.path.join(OUT,"manifest.json"),'w',encoding='utf-8'), ensure_ascii=False)
print("LISTO. total frases en manifest:", len(mmap), "| archivos nuevos:", total)
