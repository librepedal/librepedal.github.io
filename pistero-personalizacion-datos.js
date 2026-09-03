const helmetDesigns = [
  {id:'giro', name:'Aether', color:'#ff6600', brand:'Giro', svg:'<path d="M30 90 Q100 30 170 90 L170 100 Q100 110 30 100 Z" fill="#ff6600"/><path d="M40 85 Q100 40 160 85" fill="none" stroke="#cc5200" stroke-width="3"/><ellipse cx="70" cy="75" rx="12" ry="8" fill="#cc5200"/><ellipse cx="100" cy="70" rx="12" ry="8" fill="#cc5200"/><ellipse cx="130" cy="75" rx="12" ry="8" fill="#cc5200"/>'},
  {id:'bell', name:'Stratus', color:'#0066ff', brand:'Bell', svg:'<path d="M35 95 Q100 35 165 95 L165 105 Q100 115 35 105 Z" fill="#0066ff"/><path d="M45 85 Q100 45 155 85" fill="none" stroke="#004499" stroke-width="3"/><rect x="60" y="70" width="15" height="10" rx="5" fill="#004499"/><rect x="85" y="65" width="15" height="10" rx="5" fill="#004499"/><rect x="110" y="65" width="15" height="10" rx="5" fill="#004499"/><rect x="135" y="70" width="15" height="10" rx="5" fill="#004499"/>'},
  {id:'specialized', name:'Evade', color:'#ff0000', brand:'S-Works', svg:'<path d="M30 90 Q100 30 170 90 L175 100 Q100 110 25 100 Z" fill="#ff0000"/><path d="M170 90 L180 95 L175 100" fill="#cc0000"/><path d="M40 85 Q100 40 160 85" fill="none" stroke="#cc0000" stroke-width="3"/><ellipse cx="80" cy="75" rx="15" ry="10" fill="#cc0000"/><ellipse cx="120" cy="75" rx="15" ry="10" fill="#cc0000"/>'},
  {id:'poc', name:'Octal', color:'#00cc66', brand:'POC', svg:'<ellipse cx="100" cy="85" rx="70" ry="55" fill="#00cc66"/><ellipse cx="70" cy="70" rx="20" ry="15" fill="#009944"/><ellipse cx="130" cy="70" rx="20" ry="15" fill="#009944"/><ellipse cx="100" cy="65" rx="18" ry="12" fill="#009944"/>'},
  {id:'kask', name:'Protone', color:'#ffffff', brand:'Kask', svg:'<path d="M35 90 Q100 35 165 90 L165 100 Q100 110 35 100 Z" fill="#ffffff" stroke="#cccccc" stroke-width="2"/><path d="M45 80 Q100 45 155 80" fill="none" stroke="#cccccc" stroke-width="2"/><rect x="65" y="70" width="12" height="8" rx="4" fill="#cccccc"/><rect x="90" y="65" width="12" height="8" rx="4" fill="#cccccc"/><rect x="115" y="65" width="12" height="8" rx="4" fill="#cccccc"/><rect x="140" y="70" width="12" height="8" rx="4" fill="#cccccc"/>'},
  {id:'lazer', name:'Genesis', color:'#ffcc00', brand:'Lazer', svg:'<path d="M35 95 Q100 35 165 95 L165 105 Q100 115 35 105 Z" fill="#ffcc00"/><circle cx="100" cy="50" r="8" fill="#cc9900"/><path d="M45 85 Q100 45 155 85" fill="none" stroke="#cc9900" stroke-width="3"/><ellipse cx="75" cy="75" rx="10" ry="7" fill="#cc9900"/><ellipse cx="125" cy="75" rx="10" ry="7" fill="#cc9900"/>'},
  {id:'rudy', name:'Wing57', color:'#333333', brand:'Rudy', svg:'<path d="M30 95 Q100 30 170 95 L175 105 Q100 115 25 105 Z" fill="#333333"/><path d="M170 95 L185 100 L175 105" fill="#222222"/><path d="M40 85 Q100 40 160 85" fill="none" stroke="#222222" stroke-width="3"/><ellipse cx="85" cy="75" rx="12" ry="8" fill="#222222"/><ellipse cx="115" cy="75" rx="12" ry="8" fill="#222222"/>'},
  {id:'abus', name:'GameChanger', color:'#0099ff', brand:'Abus', svg:'<path d="M35 90 Q100 35 165 90 L165 100 Q100 110 35 100 Z" fill="#0099ff"/><path d="M35 90 L25 95 L30 100" fill="#006699"/><path d="M45 80 Q100 45 155 80" fill="none" stroke="#006699" stroke-width="3"/><rect x="70" y="70" width="20" height="10" rx="5" fill="#006699"/><rect x="110" y="70" width="20" height="10" rx="5" fill="#006699"/>'},
  {id:'limar', name:'Air Speed', color:'#9900ff', brand:'Limar', svg:'<path d="M40 95 Q100 40 160 95 L160 105 Q100 115 40 105 Z" fill="#9900ff"/><path d="M50 85 Q100 50 150 85" fill="none" stroke="#660099" stroke-width="3"/><ellipse cx="75" cy="75" rx="15" ry="10" fill="#660099"/><ellipse cx="100" cy="70" rx="15" ry="10" fill="#660099"/><ellipse cx="125" cy="75" rx="15" ry="10" fill="#660099"/>'},
  {id:'met', name:'Manta', color:'#ff3366', brand:'MET', svg:'<path d="M30 95 Q100 30 170 95 L180 100 Q100 110 20 100 Z" fill="#ff3366"/><path d="M170 95 L185 100 L175 105" fill="#cc0033"/><path d="M40 85 Q100 40 160 85" fill="none" stroke="#cc0033" stroke-width="3"/><ellipse cx="80" cy="75" rx="12" ry="8" fill="#cc0033"/><ellipse cx="120" cy="75" rx="12" ry="8" fill="#cc0033"/>'},
  {id:'retro', name:'Clásico', color:'#8b4513', brand:'Retro', svg:'<path d="M40 92 Q100 45 160 92 L160 102 Q100 112 40 102 Z" fill="#8b4513"/><path d="M40 96 L160 96" stroke="#5e2f0d" stroke-width="4"/><circle cx="70" cy="80" r="5" fill="#5e2f0d"/><circle cx="100" cy="74" r="5" fill="#5e2f0d"/><circle cx="130" cy="80" r="5" fill="#5e2f0d"/>'},
  {id:'aero', name:'TT', color:'#1abc9c', brand:'Aero', svg:'<path d="M35 90 Q100 35 150 80 Q175 90 175 100 Q100 112 35 100 Z" fill="#1abc9c"/><path d="M150 80 Q180 88 175 100" fill="#0e8a73"/><path d="M45 84 Q100 45 150 80" fill="none" stroke="#0e8a73" stroke-width="3"/>'},
  {id:'fullface', name:'Full Face', color:'#e63946', brand:'Downhill', svg:'<path d="M34 88 Q100 28 166 88 L166 104 Q100 112 34 104 Z" fill="#e63946"/><path d="M30 104 Q34 132 70 138 L130 138 Q150 130 150 110 L150 104 Z" fill="#c1121f"/><rect x="48" y="100" width="92" height="14" rx="6" fill="#1d1d1d"/><path d="M44 84 Q100 44 156 84" fill="none" stroke="#a00d1c" stroke-width="3"/>'},
  {id:'urban', name:'Urbano', color:'#2a9d8f', brand:'Commuter', svg:'<path d="M40 96 Q100 42 160 96 L160 106 Q100 116 40 106 Z" fill="#2a9d8f"/><rect x="42" y="98" width="116" height="6" fill="#1f7a6f"/><circle cx="100" cy="66" r="6" fill="#264653"/>'},
  {id:'kids', name:'Kids', color:'#ff8fab', brand:'Junior', svg:'<path d="M42 98 Q100 46 158 98 L158 108 Q100 118 42 108 Z" fill="#ff8fab"/><circle cx="72" cy="78" r="9" fill="#fff" opacity="0.85"/><circle cx="100" cy="72" r="9" fill="#ffd166"/><circle cx="128" cy="78" r="9" fill="#fff" opacity="0.85"/>'},
  {id:'smart', name:'Smart LED', color:'#3a0ca3', brand:'Smart', svg:'<path d="M36 92 Q100 36 164 92 L164 104 Q100 114 36 104 Z" fill="#3a0ca3"/><path d="M44 102 L156 102" stroke="#4cc9f0" stroke-width="3"/><circle cx="60" cy="102" r="3" fill="#4cc9f0"/><circle cx="100" cy="102" r="3" fill="#4cc9f0"/><circle cx="140" cy="102" r="3" fill="#4cc9f0"/><path d="M46 84 Q100 46 154 84" fill="none" stroke="#7209b7" stroke-width="3"/>'},
  {id:'gold', name:'Premium', color:'#d4af37', brand:'Elite', svg:'<defs><linearGradient id="goldg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe9a3"/><stop offset="60%" stop-color="#d4af37"/><stop offset="100%" stop-color="#a67c00"/></linearGradient></defs><path d="M34 92 Q100 32 166 92 L166 104 Q100 114 34 104 Z" fill="url(#goldg)"/><path d="M44 84 Q100 42 156 84" fill="none" stroke="#a67c00" stroke-width="3"/><ellipse cx="100" cy="70" rx="16" ry="10" fill="#fff3c4" opacity="0.6"/>'},
  {id:'camo', name:'Camuflado', color:'#6b705c', brand:'Trail', svg:'<path d="M36 92 Q100 36 164 92 L164 104 Q100 114 36 104 Z" fill="#6b705c"/><ellipse cx="70" cy="78" rx="14" ry="9" fill="#3f4238"/><ellipse cx="112" cy="72" rx="16" ry="10" fill="#a5a58d"/><ellipse cx="134" cy="86" rx="11" ry="7" fill="#3f4238"/>'}
];

const lensOptions = [
  {id:'none', name:'Sin lentes', svg:''},
  {id:'sport', name:'Deportivos', svg:'<path d="M58 108 Q100 103 142 108 L142 122 Q100 127 58 122 Z" fill="#2c3e50" opacity="0.85"/><path d="M58 108 Q100 103 142 108" fill="none" stroke="#1a252f" stroke-width="3"/>'},
  {id:'aviator', name:'Aviador', svg:'<path d="M64 108 Q78 104 92 108 L92 122 Q78 127 64 122 Z" fill="#3498db" opacity="0.7"/><path d="M108 108 Q122 104 136 108 L136 122 Q122 127 108 122 Z" fill="#3498db" opacity="0.7"/><line x1="92" y1="113" x2="108" y2="113" stroke="#2980b9" stroke-width="3"/>'},
  {id:'mirrored', name:'Espejados', svg:'<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b59b6"/><stop offset="50%" stop-color="#3498db"/><stop offset="100%" stop-color="#1abc9c"/></linearGradient></defs><path d="M58 108 Q100 103 142 108 L142 122 Q100 127 58 122 Z" fill="url(#mg)" opacity="0.85"/>'},
  {id:'amber', name:'Ámbar', svg:'<path d="M58 108 Q100 103 142 108 L142 122 Q100 127 58 122 Z" fill="#ffb300" opacity="0.7"/><path d="M58 108 Q100 103 142 108" fill="none" stroke="#cc8f00" stroke-width="3"/>'},
  {id:'pink', name:'Rosado', svg:'<path d="M58 108 Q100 103 142 108 L142 122 Q100 127 58 122 Z" fill="#ff5fa2" opacity="0.7"/><path d="M58 108 Q100 103 142 108" fill="none" stroke="#d63384" stroke-width="3"/>'},
  {id:'redondos', name:'Redondos', svg:'<circle cx="78" cy="115" r="15" fill="#2c3e50" opacity="0.8"/><circle cx="122" cy="115" r="15" fill="#2c3e50" opacity="0.8"/><line x1="93" y1="115" x2="107" y2="115" stroke="#1a252f" stroke-width="3"/>'},
  {id:'catEye', name:'Cat-eye', svg:'<path d="M60 118 Q64 104 92 108 Q98 112 92 118 Q76 122 60 118 Z" fill="#8e44ad" opacity="0.75"/><path d="M140 118 Q136 104 108 108 Q102 112 108 118 Q124 122 140 118 Z" fill="#8e44ad" opacity="0.75"/>'},
  {id:'transparente', name:'Transparentes', svg:'<path d="M58 108 Q100 103 142 108 L142 122 Q100 127 58 122 Z" fill="#dff6ff" opacity="0.28"/><path d="M58 108 Q100 103 142 108" fill="none" stroke="#9fd8ea" stroke-width="2.5"/>'},
  {id:'grandes', name:'Sol grandes', svg:'<path d="M54 106 Q100 98 146 106 L146 126 Q100 134 54 126 Z" fill="#1a1a1a" opacity="0.88"/><path d="M54 106 Q100 98 146 106" fill="none" stroke="#000" stroke-width="2.5"/>'}
];

const skinOptions = [
  /* 'cyan' se quedó con el naranja de la marca por historia: le cambiaron el color
     pero no el id ni el nombre. El color NO se toca — es el casco por defecto y
     corregirlo se lo cambiaría solo a todo el que ya lo tiene guardado. Se le pone
     el nombre honesto y el cian de verdad (la identidad de Pistero) entra aparte. */
  {id:'cyan', name:'Naranja fuego', c:'#fc4c02'},
  {id:'cianReal', name:'Cian', c:'#22d3ee'},
  {id:'rojo', name:'Rojo', c:'#ff3b30'},
  {id:'verde', name:'Verde', c:'#10b981'},
  {id:'amarillo', name:'Amarillo', c:'#ffd700'},
  {id:'morado', name:'Morado', c:'#9b59b6'},
  {id:'naranja', name:'Naranja', c:'#ff6600'},
  {id:'azul', name:'Azul', c:'#2563eb'},
  {id:'negro', name:'Negro', c:'#2b2b2b'}
];

const extrasOptions = [
  {id:'faro', name:'Faro', svg:'<circle cx="100" cy="104" r="6" fill="#fff700"/><circle cx="100" cy="104" r="13" fill="#fff700" opacity="0.35"/>'},
  {id:'antena', name:'Antena', svg:'<line x1="100" y1="58" x2="100" y2="36" stroke="#cfd6e6" stroke-width="2.5"/><circle cx="100" cy="33" r="4.5" fill="#ff3b30"><animate attributeName="r" values="4.5;5.5;4.5" dur="1.2s" repeatCount="indefinite"/></circle>'},
  {id:'calco', name:'Calcomanía', svg:'<circle cx="132" cy="82" r="9" fill="#ffd700" stroke="#cc8f00" stroke-width="1.5"/><circle cx="132" cy="82" r="3.5" fill="#cc8f00"/>'},
  {id:'bandana', name:'Pañoleta bajo el casco', svg:'<path d="M64 150 Q100 166 136 150 L132 160 Q100 174 68 160 Z" fill="#e74c3c"/>'},
  {id:'ledLateral', name:'Luces LED', svg:'<circle cx="46" cy="108" r="3.5" fill="#4cc9f0"><animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="154" cy="108" r="3.5" fill="#4cc9f0"><animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite" begin="0.45s"/></circle>'},
  {id:'banderin', name:'Banderín', svg:'<line x1="150" y1="90" x2="150" y2="62" stroke="#8a8f99" stroke-width="2"/><path d="M150 62 L172 70 L150 78 Z" fill="#fc4c02"/>'},
  {id:'cintaReflectante', name:'Cinta reflectante', svg:'<path d="M42 100 Q100 78 158 100" fill="none" stroke="#e8ff00" stroke-width="3" stroke-dasharray="4 4" opacity="0.9"/>'},
  {id:'corona', name:'Corona', svg:'<path d="M72 60 L80 40 L92 56 L100 36 L108 56 L120 40 L128 60 Z" fill="#ffd700" stroke="#cc8f00" stroke-width="1.5"/><circle cx="100" cy="36" r="3" fill="#ff3b30"/>'},
  {id:'orejas', name:'Orejas de gato', svg:'<path d="M56 66 L68 34 L84 62 Z" fill="'+'#2b2b2b'+'"/><path d="M144 66 L132 34 L116 62 Z" fill="#2b2b2b"/><path d="M62 60 L69 42 L79 58 Z" fill="#ff8fab"/><path d="M138 60 L131 42 L121 58 Z" fill="#ff8fab"/>'}
];

/* ===== NUEVO: rostro, ojos, labios, vello facial, peinado y pañuelo/cuello —
   variedad real de personalización (distintos tonos de piel, formas/colores de
   ojos, color de labios, bigote/barba, peinados y pañoletas de cuello), pensada
   para representar personajes de cualquier género, no un molde único. Cada
   categoría trae UNA opción gratis por defecto que reproduce exactamente el look
   anterior (cero cambio visual para quien no toque nada nuevo). ===== */
const pielOptions = [
  {id:'pielClara', name:'Clara', c:'#f4c9a0'},
  {id:'pielMedia', name:'Media', c:'#e0ac7c'},
  {id:'pielTrigo', name:'Trigueña', c:'#c98b5e'},
  {id:'pielMorena', name:'Morena', c:'#a9673f'},
  {id:'pielOscura', name:'Oscura', c:'#7a4a2a'},
  {id:'pielProfunda', name:'Profunda', c:'#5c3520'}
];
const ojosOptions = [
  /* 'ojoCafe' conserva el iris azul oscuro del personaje original: es el ojo por
     defecto (y el respaldo de ojosOptions[0]), así que cambiarle el color le movería
     los ojos a todo el que nunca los eligió. Lleva el nombre que le corresponde y el
     café de verdad entra aparte, gratis como el resto de los colores base. */
  {id:'ojoCafe', name:'Oscuros', iris:'#16203a', shape:'redondo', pestanas:false},
  {id:'ojoCafeReal', name:'Café', iris:'#6b4423', shape:'redondo', pestanas:false},
  {id:'ojoAzul', name:'Azules', iris:'#2f6fb0', shape:'redondo', pestanas:false},
  {id:'ojoVerde', name:'Verdes', iris:'#2e7d4f', shape:'redondo', pestanas:false},
  {id:'ojoMiel', name:'Miel', iris:'#a9702c', shape:'redondo', pestanas:false},
  {id:'ojoGris', name:'Grises', iris:'#6b7685', shape:'redondo', pestanas:false},
  {id:'ojoAlmendrado', name:'Almendrados', iris:'#16203a', shape:'almendrado', pestanas:false},
  {id:'ojoPestanas', name:'Con pestañas', iris:'#16203a', shape:'redondo', pestanas:true},
  {id:'ojoPestanasAzul', name:'Pestañas y azules', iris:'#2f6fb0', shape:'redondo', pestanas:true}
];
const labiosOptions = [
  {id:'labioNatural', name:'Natural', c:'#7a4a2a'},
  {id:'labioRojo', name:'Rojo clásico', c:'#c81d3f'},
  {id:'labioRosado', name:'Rosado', c:'#e0668f'},
  {id:'labioCoral', name:'Coral', c:'#e0704a'},
  {id:'labioVino', name:'Vino', c:'#5c1a2e'},
  {id:'labioNude', name:'Nude', c:'#a56b52'}
];
const velloFacialOptions = [
  {id:'velloNinguno', name:'Ninguno', svg:''},
  {id:'bigoteFino', name:'Bigote fino', svg:'<path d="M80 156 Q100 152 120 156" stroke="#2b2018" stroke-width="3" fill="none" stroke-linecap="round"/>'},
  {id:'bigoteGrueso', name:'Bigote grueso', svg:'<path d="M76 158 Q100 149 124 158 Q100 162 100 156 Q100 162 76 158 Z" fill="#2b2018"/>'},
  {id:'barbaCandado', name:'Barba candado', svg:'<path d="M80 156 Q100 152 120 156" stroke="#2b2018" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M92 168 Q100 179 108 168 L106 175 Q100 181 94 175 Z" fill="#2b2018"/>'},
  {id:'perilla', name:'Perilla', svg:'<path d="M90 168 Q100 180 110 168 L108 173 Q100 179 92 173 Z" fill="#2b2018"/>'},
  {id:'barbaCorta', name:'Barba corta', svg:'<path d="M66 138 Q63 168 100 174 Q137 168 134 138 Q138 160 119 170 Q100 178 81 170 Q62 160 66 138 Z" fill="#2b2018" opacity="0.82"/>'},
  {id:'barbaCompleta', name:'Barba completa', svg:'<path d="M64 130 Q59 170 100 176 Q141 170 136 130 Q141 164 117 173 Q100 181 83 173 Q59 164 64 130 Z" fill="#241a12"/>'}
];
const peinadoOptions = [
  {id:'pelado', name:'Rapado', svgSide:'', svgBack:''},
  {id:'cortoNegro', name:'Corto negro', svgSide:'<path d="M48 118 Q39 129 46 140 L55 137 Q49 127 57 118 Z" fill="#241a12"/><path d="M144 118 Q153 129 146 140 L137 137 Q143 127 135 118 Z" fill="#241a12"/>'},
  {id:'cortoCastano', name:'Corto castaño', svgSide:'<path d="M48 118 Q39 129 46 140 L55 137 Q49 127 57 118 Z" fill="#5c3a21"/><path d="M144 118 Q153 129 146 140 L137 137 Q143 127 135 118 Z" fill="#5c3a21"/>'},
  {id:'cortoRubio', name:'Corto rubio', svgSide:'<path d="M48 118 Q39 129 46 140 L55 137 Q49 127 57 118 Z" fill="#d9b45c"/><path d="M144 118 Q153 129 146 140 L137 137 Q143 127 135 118 Z" fill="#d9b45c"/>'},
  {id:'rulos', name:'Rulos', svgSide:'<circle cx="45" cy="121" r="7.5" fill="#241a12"/><circle cx="38" cy="132" r="6.5" fill="#241a12"/><circle cx="155" cy="121" r="7.5" fill="#241a12"/><circle cx="162" cy="132" r="6.5" fill="#241a12"/>'},
  {id:'rulosPelirrojos', name:'Rulos pelirrojos', svgSide:'<circle cx="45" cy="121" r="7.5" fill="#c1440e"/><circle cx="38" cy="132" r="6.5" fill="#c1440e"/><circle cx="155" cy="121" r="7.5" fill="#c1440e"/><circle cx="162" cy="132" r="6.5" fill="#c1440e"/>'},
  {id:'colaCastana', name:'Cola de caballo', svgBack:'<path d="M150 106 Q180 118 173 162 Q168 182 154 178 Q166 150 146 118 Z" fill="#6b4226"/>', svgSide:''},
  {id:'trenzas', name:'Trenzas', svgBack:'<path d="M48 120 Q37 152 46 180" stroke="#3a2515" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M152 120 Q163 152 154 180" stroke="#3a2515" stroke-width="8" fill="none" stroke-linecap="round"/>'},
  {id:'largoSuelto', name:'Largo suelto', svgBack:'<path d="M46 110 Q28 152 42 184 L59 179 Q46 148 59 114 Z" fill="#241a12"/><path d="M154 110 Q172 152 158 184 L141 179 Q154 148 141 114 Z" fill="#241a12"/>'}
];
const panueloOptions = [
  {id:'panueloNinguno', name:'Ninguno', svg:''},
  {id:'panueloRoja', name:'Roja', svg:'<path d="M64 172 Q100 189 136 172 L132 183 Q100 197 68 183 Z" fill="#e74c3c"/>'},
  {id:'panueloAzul', name:'Azul', svg:'<path d="M64 172 Q100 189 136 172 L132 183 Q100 197 68 183 Z" fill="#2563eb"/>'},
  {id:'panueloNegra', name:'Negra', svg:'<path d="M64 172 Q100 189 136 172 L132 183 Q100 197 68 183 Z" fill="#222222"/>'},
  {id:'panueloLunares', name:'A lunares', svg:'<path d="M64 172 Q100 189 136 172 L132 183 Q100 197 68 183 Z" fill="#c81d3f"/><circle cx="84" cy="181" r="2.4" fill="#fff"/><circle cx="100" cy="187" r="2.4" fill="#fff"/><circle cx="116" cy="181" r="2.4" fill="#fff"/>'},
  {id:'panueloBuff', name:'Buff / cuello alto', svg:'<path d="M62 168 Q100 186 138 168 L136 194 Q100 208 64 194 Z" fill="#10b981"/>'}
];
// Normalización para la miniatura de selección (gridHTML): ojos usa el iris como
// color de muestra, y peinado combina sus dos fragmentos (atrás/lado) en uno solo.
ojosOptions.forEach(function(o){ o.c=o.iris; });
peinadoOptions.forEach(function(p){ p.svg=(p.svgBack||'')+(p.svgSide||''); });
