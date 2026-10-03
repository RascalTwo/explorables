const $=(s:string,r:ParentNode=document)=>r.querySelector(s), $$=(s:string,r:ParentNode=document)=>[...r.querySelectorAll(s)];
const SVGNS="http://www.w3.org/2000/svg" as const;
const el=(t:string,a:Record<string,string|number>={})=>{const e=document.createElementNS(SVGNS,t);for(const k in a)e.setAttribute(k,String(a[k]));return e;};

/* ---------- scroll-spy nav ---------- */
const links=$$('nav a[href^="#"]');
const obs=new IntersectionObserver(es=>{
  es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id));}});
},{rootMargin:'-30% 0px -60% 0px'});
$$('section[id], header[id]').forEach(s=>obs.observe(s));

/* ---------- town map ---------- */
(function(){
  const svg=$('#townmap')!;
  svg.append(el('rect',{x:0,y:0,width:820,height:380,fill:'#0c1109',rx:12}));
  // scattered trees ring
  for(let i=0;i<46;i++){
    const a=i/46*Math.PI*2, cx=410+Math.cos(a)*(330+ (i%3)*8), cy=190+Math.sin(a)*(150+(i%4)*6);
    if(cx<14||cx>806||cy<14||cy>366) continue;
    svg.append(el('path',{d:`M${cx} ${cy} l-7 16 h14 z`,fill:'#16291a',opacity:.9}));
    svg.append(el('path',{d:`M${cx} ${cy-7} l-6 14 h12 z`,fill:'#1d3823'}));
  }
  // looping road — signifies no exit
  const loop='M60 330 C 200 360, 220 110, 410 120 S 760 70, 770 250 S 520 360, 420 300 S 120 250, 60 330';
  svg.append(el('path',{d:loop,fill:'none',stroke:'#2a2a1c','stroke-width':10,'stroke-linecap':'round',opacity:.7}));
  svg.append(el('path',{d:loop,fill:'none',stroke:'#3a3a26','stroke-width':2,'stroke-dasharray':'2 10',opacity:.9}));
  const places=[
    {x:360,y:150,w:120,h:60,label:'Main Street',sub:'the diner · square',c:'#1b2417',bd:'#3c7a4a'},
    {x:250,y:80,w:96,h:46,label:'The Church',sub:'Father Khatri',c:'#1a1d14',bd:'#5a4a25'},
    {x:500,y:78,w:96,h:46,label:'The Clinic',sub:'Kristi',c:'#1a1d14',bd:'#5a4a25'},
    {x:600,y:210,w:130,h:58,label:'Colony House',sub:'Donna',c:'#1d160c',bd:'#8a6a30'},
    {x:110,y:200,w:120,h:54,label:'Matthews House',sub:'the newcomers',c:'#141a13',bd:'#3c7a4a'},
    {x:300,y:280,w:118,h:50,label:'The Forest',sub:'do not enter at night',c:'#0e160d',bd:'#8c2b22'},
    {x:560,y:312,w:120,h:48,label:'The Tower',sub:'in the deep woods',c:'#11100f',bd:'#6e5a8a'},
  ];
  places.forEach(p=>{
    const g=el('g',{});
    g.append(el('rect',{x:p.x,y:p.y,width:p.w,height:p.h,rx:7,fill:p.c,stroke:p.bd,'stroke-width':1.5}));
    const t1=el('text',{x:p.x+p.w/2,y:p.y+p.h/2-3,'text-anchor':'middle',fill:'#e7e3d6','font-size':13,'font-family':'Georgia,serif'});t1.textContent=p.label;
    const t2=el('text',{x:p.x+p.w/2,y:p.y+p.h/2+13,'text-anchor':'middle',fill:'#9a9686','font-size':9.5});t2.textContent=p.sub;
    g.append(t1,t2);svg.append(g);
  });
  const cap=el('text',{x:410,y:30,'text-anchor':'middle',fill:'#8c2b22','font-size':12,'font-style':'italic','letter-spacing':'1px'});
  cap.textContent='every road bends back — there is no way out';svg.append(cap);
})();

/* ---------- monster silhouette ---------- */
(function(){
  const s=$('#silhouette')!;
  const defs=el('defs');const rg=el('radialGradient',{id:'mg'});
  rg.append(el('stop',{offset:'0%','stop-color':'#3a4a63'}));rg.append(el('stop',{offset:'100%','stop-color':'#0a1019'}));
  defs.append(rg);s.append(defs);
  s.append(el('rect',{x:0,y:0,width:300,height:300,rx:12,fill:'#0a1019'}));
  s.append(el('circle',{cx:235,cy:60,r:30,fill:'url(#mg)'}));
  for(let i=0;i<14;i++){const x=i*23; s.append(el('path',{d:`M${x} 300 L${x+11} ${250-(i%3)*10} L${x+22} 300 Z`,fill:'#0c160e'}));}
  const g=el('g',{});
  g.append(el('ellipse',{cx:150,cy:150,rx:34,ry:80,fill:'#05080c'}));
  g.append(el('circle',{cx:150,cy:96,r:26,fill:'#070b10'}));
  g.append(el('rect',{x:128,y:150,width:10,height:90,fill:'#05080c'}));
  g.append(el('rect',{x:162,y:150,width:10,height:90,fill:'#05080c'}));
  g.append(el('path',{d:'M138 100 q12 16 24 0',fill:'none',stroke:'#b5392d','stroke-width':3,'stroke-linecap':'round'}));
  g.append(el('circle',{cx:142,cy:90,r:2.4,fill:'#cf9b3f'}));
  g.append(el('circle',{cx:158,cy:90,r:2.4,fill:'#cf9b3f'}));
  s.append(g);
  const cap=el('text',{x:150,y:285,'text-anchor':'middle',fill:'#5a6470','font-size':10,'font-style':'italic'});
  cap.textContent='it is always smiling';s.append(cap);
})();

/* ---------- roster ---------- */
const CDN='https://static.wikia.nocookie.net/from/images/';
const people=[
  {n:'Boyd Stevens',r:'Sheriff · town leader',c:'#3c7a4a',i:'BS',fy:'12%',img:CDN+'0/02/S2E3-27.jpeg',a:'Harold Perrineau',d:"A grieving former soldier who keeps the town alive by sheer force of will — and quietly drives himself to find a way out."},
  {n:'Jim Matthews',r:'The newcomer dad',c:'#5b8fb0',i:'JM',fy:'16%',img:CDN+'b/bb/Jim_Matthews_Season_3.png',a:'Eion Bailey',d:"Half of the family whose road trip ends in the town. A practical father scrambling to protect his kids — and, by the finale, raising a radio tower to call for help."},
  {n:'Tabitha Matthews',r:'The newcomer mom',c:'#7a9cc4',i:'TM',fy:'20%',img:CDN+'5/51/Tabitha.jpg',a:'Catalina Sandino Moreno',d:"Jim's wife, pulled toward the town's buried secrets. Her digging beneath the house cracks something open in the Season 1 finale."},
  {n:'Ethan Matthews',r:'Their young son',c:'#c98f3a',i:'EM',fy:'16%',img:CDN+'a/ac/Ethan_Matthews_Season_three.png',a:'Simon Webster',d:"A boy who frames the nightmare through the lens of his fantasy stories — and seems to notice things the adults miss."},
  {n:'Julie Matthews',r:'Their teen daughter',c:'#a86ab0',i:'JU',fy:'14%',img:CDN+'9/92/Julie_Matthews_Season_3.png',a:'Hannah Cheramy',d:"Pulled toward Colony House and its looser, defiant way of coping with being trapped."},
  {n:'Victor',r:'The longest survivor',c:'#9a8c5a',i:'V',fy:'18%',img:CDN+'8/8e/Victor.Kavanaugh.Fromville.jpg',a:'Scott McCord',d:"A gentle, childlike man who's been in town since he was a boy. He knows more than he can say — and gives out music boxes."},
  {n:'Kenny',r:"Boyd's deputy",c:'#4a8c86',i:'K',fy:'12%',img:CDN+'1/1a/Kenny_Liu_pro.jpeg',a:'Ricky He',d:"Loyal and steady, caring for his ailing father. The closest thing Boyd has to a partner he can trust."},
  {n:'Donna',r:'Leader of Colony House',c:'#8a6a30',i:'D',fy:'18%',img:CDN+'5/55/Donna_Raines_Season_3.png',a:'Elizabeth Saunders',d:"Tough and protective, she runs the rival household and clashes with Boyd over how the trapped should live."},
  {n:'Sara',r:'A diner worker',c:'#8c2b22',i:'S',fy:'16%',img:CDN+'e/e4/Sarah_Myers_Season_3.png',a:'Avery Konrad',d:"A quiet young woman who begins hearing voices promising the town can be freed — if she's willing to do what they ask."},
  {n:'Jade',r:'A sharp-tongued arrival',c:'#6e5a8a',i:'J',fy:'28%',img:CDN+'c/c7/Jade_Herrera_Season_3.png',a:'David Alpay',d:"A clever, sardonic newcomer who starts seeing strange symbols and visions he can't explain away."},
];
const rs=$('#roster')!;
people.forEach(p=>{
  const c=document.createElement('div');c.className='card person';
  c.innerHTML=`<div class="ava" style="background:${p.c};border-color:${p.c}">
     <img src="${p.img}" alt="${p.n} (${p.a})" title="${p.a}" loading="lazy"
          style="object-position:center ${p.fy}"
          onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${p.i}'}))">
   </div>
   <div><h3>${p.n}</h3><div class="role">${p.r}</div><p>${p.d}</p></div>`;
  rs.append(c);
});

/* ---------- timeline ---------- */
const events=[
  {k:'amberd',w:'Episode 1',h:'The road closes',p:"The Matthews family's road trip ends when a fallen tree forces a detour into town — and they discover every way out leads right back in."},
  {k:'',w:'First night',h:'The rules, the hard way',p:"The town explains survival: be inside by dark, hang a talisman, never open the door. The newcomers learn the creatures are real."},
  {k:'calm',w:'Early season',h:'Two camps, one fear',p:"The family is pulled between Boyd's orderly Township and Donna's defiant Colony House, mapping the town's social fault lines."},
  {k:'',w:'Throughout',h:'Ethan meets Victor',p:"Ethan bonds with Victor, the eerie longtime survivor, and starts noticing symbols, a strange boy, and patterns the adults overlook."},
  {k:'amberd',w:'Mid season',h:"Sara's voices",p:"Sara begins hearing something that insists the whole town can be set free — at a terrible price — setting a slow tragedy in motion."},
  {k:'',w:'Mid season',h:'Boyd goes looking',p:"Refusing to just survive, Boyd ventures into the forest after clues — bottles, a symbol, a possible cure — and pays for his curiosity."},
  {k:'amberd',w:'Late season',h:'Colony House is attacked',p:"A talisman is sabotaged and the creatures get inside Colony House for a night of slaughter — brutal proof that the one rule keeping everyone alive can be broken."},
  {k:'',w:'Finale',h:'The tower, the hole & the light',p:"Jim raises a radio tower and finally gets a signal — but a voice answers, warning that Tabitha shouldn't be digging. Beneath the house, her basement floor collapses into the tunnels, where Victor and the Boy in White are waiting among the creatures' cave paintings. And out in the woods, Boyd and Sara crest a hill toward the horn — and find a lighthouse."},
];
const tl=$('#tl')!;
events.forEach(e=>{
  const d=document.createElement('div');d.className='ev '+e.k;
  d.innerHTML=`<div class="when">${e.w}</div><h3>${e.h}</h3><p>${e.p}</p>`;
  tl.append(d);
});

/* ---------- mysteries ---------- */
const mysteries=[
  {h:'What is this place?',p:"Is the town a place, a prison, a purgatory, an experiment? The show withholds even the basic category.",q:"Where, exactly, are they?"},
  {h:'What are the creatures?',p:"They look human, hunt at night, and obey the talismans — but their nature and origin are never explained.",q:"Why do they want in?"},
  {h:'Why do talismans work?',p:"The one reliable defense, and nobody knows the mechanism. Folk knowledge passed between survivors.",q:"Who discovered them, and how?"},
  {h:'Who is Victor, really?',p:"He's been here longest, knows things he can't articulate, and carries memories of the town's earlier days.",q:"What did he see as a child?"},
  {h:'The tower & the symbol',p:"A structure deep in the woods and a recurring symbol tie the town's pieces together in ways still unclear.",q:"What do they mean?"},
  {h:'Is there a way out?',p:"Boyd's whole arc is the search for an exit or a cure. Season 1 closes that question without truly answering it.",q:"Can anyone leave?"},
];
const ms=$('#mysts')!;
mysteries.forEach(m=>{
  const c=document.createElement('div');c.className='card';
  c.innerHTML=`<h3>${m.h}</h3><p>${m.p}</p><div class="q">→ ${m.q}</div>`;
  ms.append(c);
});
