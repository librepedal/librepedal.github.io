import json,base64
d=json.load(open('ruta-datos.json')); m=json.load(open('mapas.json'))
def b64(f,t): return 'data:'+t+';base64,'+base64.b64encode(open(f,'rb').read()).decode()
coords=d['coords']; step=max(1,len(coords)//260)
idx=list(range(0,len(coords),step))+[len(coords)-1]
DATOS={'ruta':[coords[i] for i in idx],'elev':d['elev'],'nombre':'Futrono → Llifén','fecha':'domingo 12 de octubre',
 'datos':[{'v':'19,5','u':'km','l':'Distancia'},{'v':'1:18','u':'h','l':'En movimiento'},{'v':'430','u':'m','l':'Desnivel +'}],
 'mapa':{'pts':[m['noche_sq']['pts'][i] for i in idx]},'franja':{'pts':[m['noche_strip']['pts'][i] for i in idx]},
 'img':{'fondo':b64('fondo3d_q.jpg','image/jpeg'),'mapa':b64('noche_sq_q.jpg','image/jpeg'),'franja':b64('noche_strip_q.jpg','image/jpeg'),'logo':b64('logo260.png','image/png')}}
def ic(p): return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'
I={'VER':ic('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
 'COMP':ic('<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'),
 'FOTO':ic('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'),
 'VUELO':ic('<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>'),
 'TXT':ic('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
 'GPX':ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
 'GUARDAR':ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>')}
hoy=['<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>','<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/>','<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>','<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>','<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/>','<path d="M12 15V3"/><path d="m7 10 5 5 5-5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>','<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>']
ICH=''.join('<i'+(' class="mal"' if k==5 else '')+'>'+ic(p)+'</i>' for k,p in enumerate(hoy))
s=open('plantilla.html',encoding='utf-8').read()
s=s.replace('{{DATOS}}',json.dumps(DATOS,ensure_ascii=False)).replace('{{ICONOS_HOY}}',ICH)
for k,v in I.items(): s=s.replace('{{IC_'+k+'}}',v)
assert '{{' not in s
open('foto-del-viaje.html','w',encoding='utf-8',newline='\n').write(s); print(round(len(s)/1024),'KB')
