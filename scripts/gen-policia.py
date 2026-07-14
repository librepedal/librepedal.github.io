#!/usr/bin/env python3
# Agrega las 2 lineas del aviso de Carabineros (chistoso/torpe) al voces/manifest.json,
# en ambas voces, cada una con su prosodia torpe.
import os, re, json, time, urllib.request, urllib.error
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY=""; REGION="eastus"
for line in open(os.path.join(BASE,"MI-AZURE.txt"),encoding="utf-8"):
    if line.startswith("AZURE_TTS_KEY="): KEY=line.split("=",1)[1].strip()
    if line.startswith("AZURE_TTS_REGION="): REGION=line.split("=",1)[1].strip()
URL="https://%s.tts.speech.microsoft.com/cognitiveservices/v1"%REGION
OUT=os.path.join(BASE,"voces")
mani=json.load(open(os.path.join(OUT,"manifest.json"),encoding="utf-8")); mmap=mani["map"]
maxid=max([int(v) for v in mmap.values()]) if mmap else 0

# (texto, rate, pitch)  — el texto es la CLAVE exacta que la app pasa a h()
LINEAS=[
  ("Buenos días, buenas tardes… control a tres kilómetros.", "-20%","-6%"),
  ("Eeeh… buenos días, buenas tardes… hay control a tres kilómetros, no má.", "-16%","-7%"),
]
VOCES=[('l','es-CL-LorenzoNeural'),('c','es-CL-CatalinaNeural')]
def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def synth(voz,rate,pitch,texto,dest):
    ssml=("<speak version='1.0' xml:lang='es-CL'><voice name='%s'><prosody rate='%s' pitch='%s'>%s</prosody></voice></speak>"%(voz,rate,pitch,esc(texto)))
    req=urllib.request.Request(URL,data=ssml.encode('utf-8'),method='POST',headers={'Ocp-Apim-Subscription-Key':KEY,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-96kbitrate-mono-mp3','User-Agent':'LibrePedal'})
    for i in range(4):
        try:
            with urllib.request.urlopen(req,timeout=30) as r: open(dest,'wb').write(r.read()); return True
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(8*(i+1)); continue
            print("ERR",e.code); return False
        except Exception: time.sleep(3); continue
    return False
nid=maxid
for texto,rate,pitch in LINEAS:
    if texto in mmap:
        print("ya existe:",texto[:30]); continue
    nid+=1; fid="%03d"%nid; mmap[texto]=fid
    for pref,voz in VOCES:
        ok=synth(voz,rate,pitch,texto,os.path.join(OUT,pref+fid+".mp3"))
        print(("OK " if ok else "FALLO ")+pref+fid, texto[:40]); time.sleep(3.3)
json.dump({"voces":["l","c"],"map":mmap},open(os.path.join(OUT,"manifest.json"),'w',encoding='utf-8'),ensure_ascii=False)
print("LISTO. total frases:",len(mmap))
