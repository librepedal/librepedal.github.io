#!/usr/bin/env python3
# Extrae frases fijas que Pistero dice por voz: h('...'), hCorta('...'), hAmbiente('...')
# con UNA sola cadena literal (descarta las que concatenan variables).
import re, json, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(BASE, "index.html"), encoding="utf-8", errors="ignore").read()

frases = set()
# h( 'texto' )  o  h( "texto" )  con comilla de apertura capturada
pat = re.compile(r"\b(?:h|hCorta|hAmbiente)\(\s*(['\"])(.*?)(?<!\\)\1\s*\)", re.S)
for m in pat.finditer(s):
    txt = m.group(2)
    if "+" in txt or "${" in txt:   # concatenacion / template => dinamica
        continue
    txt = txt.replace("\\'", "'").replace('\\"', '"').replace("\\n", " ").strip()
    if 5 <= len(txt) <= 220 and "\\" not in txt:
        frases.add(txt)

man = json.load(open(os.path.join(BASE, "voces", "manifest.json"), encoding="utf-8"))["map"]
nuevas = sorted([f for f in frases if f not in man])
print("frases estaticas unicas:", len(frases), "| ya en manifest:", len(frases)-len(nuevas), "| NUEVAS:", len(nuevas))
json.dump(nuevas, open(os.path.join(BASE, "scripts", "frases-generales.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
for f in nuevas[:15]:
    print("  -", f[:72])
