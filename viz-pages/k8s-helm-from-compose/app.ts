/* ============================ data: the anchor compose file ============================ */
// render compose with simple line grouping
(function(){
  const lines = [
    [['com','# docker-compose.yml']],
    [['key','services:']],
    [['plain','  '],['key','web:']],
    [['plain','    '],['key','image: '],['str','myco/web:1.0.0']],
    [['plain','    '],['key','ports: '],['hl','["80:8080"]'],['com','   # exposed to users']],
    [['plain','    '],['key','depends_on: '],['plain','[api]']],
    [['plain','  '],['key','api:']],
    [['plain','    '],['key','image: '],['str','myco/api:1.0.0']],
    [['plain','    '],['key','deploy:']],
    [['plain','      '],['key','replicas: '],['num','3'],['com','        # how many copies']],
    [['plain','    '],['key','restart: '],['plain','always'],['com','     # keep it alive']],
    [['plain','    '],['key','environment:']],
    [['plain','      '],['plain','LOG_LEVEL: '],['str','info']],
    [['plain','      '],['plain','DB_PASSWORD: '],['str','${DB_PASSWORD}'],['com','  # a secret']],
    [['plain','  '],['key','db:']],
    [['plain','    '],['key','image: '],['str','postgres:16']],
    [['plain','    '],['key','volumes: '],['str','[pgdata:/var/lib/postgresql/data]'],['com'," # state"]],
  ] satisfies [string, string][][];
  document.getElementById('composeCode')!.innerHTML = lines.map(l =>
    l.map(([c,t])=>`<span class="${c==='plain'?'':c}">${esc(t)}</span>`).join('')
  ).join('\n');
})();
function esc(s: string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ============================ mapping rows ============================ */
const mapData = [
  { l:'image: myco/api:1.0.0', lt:'which container to run',
    r:'Deployment → spec.template.spec.containers[].image', rt:'Deployment', cls:'obj-dep' },
  { l:'deploy.replicas: 3', lt:'how many copies',
    r:'Deployment → spec.replicas (ReplicaSet keeps the count)', rt:'Deployment / ReplicaSet', cls:'obj-dep' },
  { l:'restart: always', lt:'keep it alive',
    r:'(built in) controller reconciles dead Pods automatically', rt:'Controller loop', cls:'obj-dep' },
  { l:'(running container)', lt:'the unit that executes',
    r:'Pod — 1+ containers sharing network/volumes', rt:'Pod', cls:'obj-pod' },
  { l:'ports: ["80:8080"]', lt:'reach it by a stable name',
    r:'Service — stable virtual IP, load-balances across Pods', rt:'Service', cls:'obj-svc' },
  { l:'(facing the internet)', lt:'expose to users + host/TLS',
    r:'Ingress — L7 host/path routing into a Service', rt:'Ingress', cls:'obj-ing' },
  { l:'environment: LOG_LEVEL', lt:'non-secret config',
    r:'ConfigMap — injected as env vars or files', rt:'ConfigMap', cls:'obj-cfg' },
  { l:'DB_PASSWORD: ${…}', lt:'credentials',
    r:'Secret — same idea, separate object, base64 at rest', rt:'Secret', cls:'obj-sec' },
  { l:'volumes: pgdata:/…', lt:'durable state',
    r:'PersistentVolumeClaim — storage that outlives the Pod', rt:'PVC', cls:'obj-pod' },
];
const ml=document.getElementById('mapLeft')!, mr=document.getElementById('mapRight')!, ma=document.getElementById('mapArrows')!;
mapData.forEach((d,i)=>{
  ml.insertAdjacentHTML('beforeend',
    `<div class="row" data-i="${i}"><div class="t">${d.lt}</div>${esc(d.l)}</div>`);
  mr.insertAdjacentHTML('beforeend',
    `<div class="row ${d.cls}" data-i="${i}"><div class="t">${d.rt}</div>${esc(d.r)}</div>`);
  ma.insertAdjacentHTML('beforeend',`<span data-i="${i}">→</span>`);
});
document.querySelectorAll<HTMLElement>('#mapGrid .row').forEach(el=>{
  el.addEventListener('mouseenter',()=>{
    const i=el.dataset['i'];
    document.querySelectorAll<HTMLElement>(`#mapGrid .row`).forEach(r=>r.classList.toggle('h',r.dataset['i']===i));
    document.querySelectorAll<HTMLElement>('#mapArrows span').forEach(s=>s.style.color = s.dataset['i']===i?'#fff':'');
  });
});

/* ============================ topology SVG ============================ */
const NS='http://www.w3.org/2000/svg';
const svg=document.getElementById('topoSvg')! as unknown as SVGSVGElement;
type KindG = SVGElement & { _kind?: string };
const COL={pod:'#7aa2ff',svc:'#46c79a',ing:'#e0a23b',cfg:'#b07ce8',sec:'#e0617a',k8s:'#5b8def'};
function el(tag: string,attrs: Record<string, string | number>={},txt?: string | null): KindG{const e: KindG=document.createElementNS(NS,tag);
  for(const k in attrs)e.setAttribute(k,String(attrs[k])); if(txt!=null)e.textContent=txt; return e;}
function box(x: number,y: number,w: number,h: number,color: string,label: string,sub: string,kind: string,fill?: string){
  const g=el('g',{class:'node-hit',transform:`translate(${x},${y})`});
  g.appendChild(el('rect',{width:w,height:h,rx:9,fill:fill||'#141d38',
     stroke:color,'stroke-width':1.6}));
  g.appendChild(el('rect',{width:5,height:h,rx:2,fill:color}));
  const t=el('text',{x:14,y:h/2-3,fill:'#e8edff','font-size':13,'font-weight':600});t.textContent=label;g.appendChild(t);
  if(sub){const s=el('text',{x:14,y:h/2+14,fill:'#93a0c6','font-size':10.5});s.textContent=sub;g.appendChild(s);}
  g._kind=kind; return g;
}
function dashedRegion(x: number,y: number,w: number,h: number,label: string){
  const g=el('g',{});
  g.appendChild(el('rect',{x,y,width:w,height:h,rx:12,fill:'none',
     stroke:'#34406b','stroke-dasharray':'5 5','stroke-width':1.4}));
  const t=el('text',{x:x+12,y:y+18,fill:'#5e6c98','font-size':11,'font-weight':700,'letter-spacing':'1.5'});
  t.textContent=label;g.appendChild(t);return g;
}
function line(x1: number,y1: number,x2: number,y2: number,color?: string){
  return el('line',{x1,y1,x2,y2,stroke:color||'#3b4774','stroke-width':1.6,'marker-end':'url(#arr)'});
}
// defs
const defs=el('defs');
defs.innerHTML=`<marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
  <path d="M0,0 L7,3 L0,6 Z" fill="#4a5a8f"/></marker>`;
svg.appendChild(defs);

let state: {replicas: number, killedIdx: number | null}={replicas:3, killedIdx:null};
function drawTopo(){
  [...svg.querySelectorAll('g,line,.region,text.world')].forEach(n=>n.remove());
  svg.appendChild(defs);

  // outer cluster region
  svg.appendChild(dashedRegion(150,70,594,452,'KUBERNETES CLUSTER'));
  svg.appendChild(dashedRegion(168,250,560,256,'NODE  (a worker machine)'));

  // internet / user
  const user=box(20,30,108,46,'#9fb0d8','🌐 Internet','browser request','internet','#0e1430');
  user.querySelector('rect:nth-child(1)')!.setAttribute('stroke','#5e6c98');
  svg.appendChild(user);

  // ingress
  const ing=box(250,96,210,52,COL.ing,'Ingress','host/path → Service · TLS','ingress');
  svg.appendChild(ing);
  // service
  const svc=box(250,178,210,52,COL.svc,'Service: api','stable VIP · load-balances','service');
  svg.appendChild(svc);
  // deployment wrapper
  svg.appendChild(box(196,272,300,30,COL.k8s,'Deployment: api  →  ReplicaSet','desired replicas = '+state.replicas,'deployment'));

  // pods
  const podY=320, n=state.replicas, totalW=520, startX=210;
  const pods: {g: KindG, px: number, dead: boolean}[]=[];
  for(let i=0;i<n;i++){
    const gap=Math.min(120,(totalW)/Math.max(n,1));
    const px=startX + i*(gap+6);
    const dead = state.killedIdx===i;
    const g=box(px,podY,108,70, dead?'#e0617a':COL.pod,
        dead?'Pod ✕':'Pod','api container',dead?'pod-dead':'pod', dead?'#2a1622':'#141d38');
    if(dead) g.style.opacity=String(.45);
    g.dataset['idx']=String(i);
    // container chip inside
    g.appendChild(el('rect',{x:14,y:44,width:80,height:18,rx:4,
       fill:'none',stroke:dead?'#e0617a':'#3b4774','stroke-dasharray':dead?'3 3':'0'}));
    const ct=el('text',{x:18,y:57,fill:'#93a0c6','font-size':9});ct.textContent=dead?'restarting…':'myco/api:1.0.0';g.appendChild(ct);
    svg.appendChild(g); pods.push({g,px,dead});
  }

  // configmap + secret
  const cfg=box(520,178,200,40,COL.cfg,'ConfigMap','LOG_LEVEL=info','configmap');
  const sec=box(520,228,200,40,COL.sec,'Secret','DB_PASSWORD ••••','secret');
  svg.appendChild(cfg); svg.appendChild(sec);

  // arrows
  svg.appendChild(line(128,53,250,118));            // internet -> ingress
  svg.appendChild(line(355,148,355,178));            // ingress -> service
  svg.appendChild(line(355,230,355,272));            // service -> deployment
  pods.forEach(p=>{ if(!p.dead) svg.appendChild(line(346,302,p.px+54,podY,'#3b4774')); });
  // config/secret feed pods
  svg.appendChild(el('path',{d:`M520,205 C470,235 ${pods[0]?pods[0].px+54:300},300 ${pods[0]?pods[0].px+54:300},320`,
     fill:'none',stroke:COL.cfg,'stroke-dasharray':'3 4','stroke-width':1.3,opacity:.6}));
  svg.appendChild(el('path',{d:`M520,250 C470,275 ${pods[0]?pods[0].px+54:300},305 ${pods[0]?pods[0].px+54:300},322`,
     fill:'none',stroke:COL.sec,'stroke-dasharray':'3 4','stroke-width':1.3,opacity:.6}));

  bindInspect();
}

const INFO={
  internet:{k:'External traffic',h:'The user / browser',
    b:'Outside the cluster entirely. Kubernetes has no object for "the internet" — traffic just arrives at the cluster edge and the Ingress controller is the first thing that handles it.',
    a:'Compose analog: <b>whoever curls <code>localhost:80</code></b>.'},
  ingress:{k:'Ingress',h:'L7 HTTP router',
    b:'Routes by hostname and path (e.g. <code>api.myco.com/*</code> → the api Service) and terminates TLS. One Ingress can fan many hostnames into many Services. Needs an ingress controller (nginx, Traefik) running in the cluster to actually do the work.',
    a:'Compose analog: the <b><code>ports:</code> "80:…"</b> publish line + whatever reverse proxy you bolted on. Compose has no real equivalent for host/path routing — this is new.'},
  service:{k:'Service',h:'Stable address + load balancer',
    b:'Pods are cattle: they get new IPs when they restart. A Service is a <b>fixed virtual IP and DNS name</b> (<code>api.default.svc</code>) that always points at the <i>currently healthy</i> Pods, spreading traffic across them. It finds its Pods by <b>label selector</b>, not by hardcoded IPs.',
    a:'Compose analog: <b>the service name on the Compose network</b> — <code>http://api:8080</code> just worked. A K8s Service is that, made explicit and load-balanced.'},
  deployment:{k:'Deployment → ReplicaSet',h:'Desired-state controller',
    b:'You declare "I want N replicas of image X". The Deployment creates a ReplicaSet, which creates Pods and <b>continuously reconciles</b>: a Pod dies → a new one is created; you change the image → it rolls out new Pods and retires old ones with zero downtime.',
    a:'Compose analog: <b><code>deploy.replicas</code> + <code>restart: always</code></b> — but with rolling updates, rollbacks, and self-healing built in.'},
  pod:{k:'Pod',h:'The atomic run unit',
    b:'One (or a few tightly-coupled) containers that share a network namespace and storage. <b>Pods are disposable</b> — you almost never create them directly; a Deployment makes and replaces them. This is the closest thing to "a running container" from Compose.',
    a:'Compose analog: <b>one running container of a service</b>. The difference: a Pod is meant to be thrown away and remade, not nursed.'},
  'pod-dead':{k:'Pod (terminating)',h:'A Pod that just died',
    b:'It crashed or was killed. Notice the Deployment hasn\'t given up — the ReplicaSet immediately schedules a replacement to restore the declared count. You did nothing; the control loop did. Hit Reset to see it healed.',
    a:'Compose analog: the moment <code>restart: always</code> kicks in — except Kubernetes also reschedules onto a different machine if this node is gone.'},
  configmap:{k:'ConfigMap',h:'Non-secret configuration',
    b:'Key/value config lifted out of the image so the <b>same image</b> runs in dev/staging/prod with different settings. Injected into Pods as environment variables or mounted files.',
    a:'Compose analog: the non-secret half of <b><code>environment:</code></b> / an <code>env_file</code>.'},
  secret:{k:'Secret',h:'Credentials, separated',
    b:'Mechanically almost identical to a ConfigMap, but a distinct object so access can be restricted (RBAC) and it\'s base64-encoded at rest (encrypt it for real with KMS/sealed-secrets). Keeps passwords out of your image and out of Git.',
    a:'Compose analog: <b><code>${DB_PASSWORD}</code></b> from your <code>.env</code> — now a first-class, access-controlled object.'},
};
function bindInspect(){
  svg.querySelectorAll<KindG>('.node-hit').forEach(g=>{
    g.addEventListener('click',()=>{
      const i=INFO[g._kind as keyof typeof INFO]; if(!i)return;
      document.querySelectorAll('.node-hit rect:first-child').forEach(r=>r.setAttribute('stroke-width','1.6'));
      g.querySelector('rect:first-child')!.setAttribute('stroke-width','3');
      document.getElementById('inspect')!.innerHTML=
        `<div class="kind">${i.k}</div><h4>${i.h}</h4>
         <div class="body">${i.b}</div><div class="analog">${i.a}</div>`;
    });
  });
}
drawTopo();

/* traffic animation */
function sendRequest(){
  const path: [number, number][]=[[74,53],[355,118],[355,204]];
  const alive=[...svg.querySelectorAll<SVGElement>('.node-hit')].filter(g=>g.dataset['idx']!=null && !g.querySelector('text')!.textContent!.includes('✕'));
  const target=alive[Math.floor(Math.random()*alive.length)];
  if(target){const m=target.getAttribute('transform')!.match(/translate\(([\d.]+),([\d.]+)\)/)!;
    path.push([+m[1]!+54,+m[2]!]);}
  const dot=el('circle',{r:7,fill:'#ffd479',filter:'url(#g)'});
  if(!svg.querySelector('#g')){const f=el('filter',{id:'g'});
    f.innerHTML='<feGaussianBlur stdDeviation="2.5"/><feComponentTransfer><feFuncA type="linear" slope="2"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>';
    defs.appendChild(f);}
  svg.appendChild(dot);
  let seg=0,t=0;
  const tick=()=>{
    if(seg>=path.length-1){dot.remove();return;}
    const[a,b]=[path[seg]!,path[seg+1]!];
    const x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t;
    dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));
    t+=0.045; if(t>=1){t=0;seg++;}
    requestAnimationFrame(tick);
  };
  tick();
}
document.getElementById('btnTraffic')!.onclick=()=>{sendRequest();setTimeout(sendRequest,260);setTimeout(sendRequest,520);};
document.getElementById('btnKill')!.onclick=()=>{
  state.killedIdx=Math.floor(Math.random()*state.replicas); drawTopo();
  setTimeout(()=>{state.killedIdx=null;drawTopo();},2600); // self-heal
};
document.getElementById('btnScale')!.onclick=()=>{state.replicas=state.replicas===4?3:4;drawTopo();
  document.getElementById('btnScale')!.textContent = state.replicas===4?'－ Scale to 3 replicas':'＋ Scale to 4 replicas';};
document.getElementById('btnReset')!.onclick=()=>{state={replicas:3,killedIdx:null};drawTopo();
  document.getElementById('btnScale')!.textContent='＋ Scale to 4 replicas';};

/* ============================ Helm live renderer ============================ */
import yaml from 'https://esm.sh/js-yaml@4.1.0';

const baseValues = `replicaCount: 1
image:
  repository: myco/api
  tag: 1.0.0
service:
  port: 80
ingress:
  enabled: true
  host: api.local
resources:
  memory: 256Mi`;

const envOverrides = {
  dev:     `# values-dev.yaml  (override)\nreplicaCount: 1\ningress:\n  host: api.dev.myco.com`,
  staging: `# values-staging.yaml\nreplicaCount: 2\nimage:\n  tag: 1.4.2\ningress:\n  host: api.staging.myco.com\nresources:\n  memory: 512Mi`,
  prod:    `# values-prod.yaml\nreplicaCount: 4\nimage:\n  tag: 1.4.2\ningress:\n  host: api.myco.com\nresources:\n  memory: 1Gi`,
};

const templates = {
deployment:
`apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-api
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: { app: {{ .Release.Name }}-api }
  template:
    metadata:
      labels: { app: {{ .Release.Name }}-api }
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 8080
          resources:
            limits:
              memory: {{ .Values.resources.memory }}`,
service:
`apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-api
spec:
  selector: { app: {{ .Release.Name }}-api }
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 8080`,
ingress:
`{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-api
spec:
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ .Release.Name }}-api
                port: { number: {{ .Values.service.port }} }
{{- else }}
# ingress.enabled=false → Helm renders nothing.
# The Ingress object simply never exists in the cluster.
{{- end }}`
};

const ui: {env: keyof typeof envOverrides, replicas: number, tag: string, ingress: boolean, file: keyof typeof templates}={env:'dev',replicas:1,tag:'1.0.0',ingress:true,file:'deployment'};

/* tiny Go-template-ish renderer: handles {{ .X }}, {{- if X }}…{{- else }}…{{- end }} */
type Obj = { [k: string]: unknown };
interface Values { replicaCount: number; image: { repository: string; tag: string }; service: { port: number }; ingress: { enabled: boolean; host: string }; resources: { memory: string } }
type Ctx = { Release: { Name: string }; Values: unknown };
function deepMerge(a: Obj,b: Obj): Obj{const o=structuredClone(a);
  for(const k in b){o[k]=(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k]))?deepMerge((o[k]||{}) as Obj,b[k] as Obj):b[k];}
  return o;}
function resolve(path: string,ctx: Ctx): unknown{
  path=path.trim();
  if(path.startsWith('.Release.Name')) return ctx.Release.Name;
  if(path.startsWith('.Values.')){
    return path.slice(8).split('.').reduce((o: unknown,k)=>o==null?o:(o as Obj)[k],ctx.Values);
  }
  return '';
}
function renderTpl(tpl: string,ctx: Ctx){
  // normalize whitespace-control markers: treat {{- as {{ and trim the preceding newline/indent
  let s=tpl;
  // process blocks via regex-driven recursive scan
  function block(str: string){
    const re=/\{\{-?\s*(if|else|end)?\s*([^}]*?)\s*-?\}\}/g;
    let m;
    // simple linear pass with if/else/end
    type Tok = {type:'text',v:string,raw?:string,pre?:number,trimL?:undefined,trimR?:undefined} | {type:'tag',kw:string,expr:string,trimL:boolean,trimR:boolean};
    let tokens: Tok[]=[]; let idx=0;
    while((m=re.exec(str))){
      tokens.push({type:'text',v:str.slice(idx,m.index),raw:m[0],pre:m.index});
      const trimL=m[0].startsWith('{{-'), trimR=m[0].endsWith('-}}');
      tokens.push({type:'tag',kw:m[1]||'expr',expr:m[2]!,trimL,trimR});
      idx=re.lastIndex;
    }
    tokens.push({type:'text',v:str.slice(idx)});
    // build with conditional skipping
    let res=''; let skip=[false];
    for(let t=0;t<tokens.length;t++){
      const tk=tokens[t]!;
      if(tk.type==='text'){
        let v=tk.v;
        if(tokens[t+1]?.trimL) v=v.replace(/[ \t]*\n?$/,'');
        if(tokens[t-1]?.trimR) v=v.replace(/^\n?[ \t]*/,'');
        if(!skip.includes(true)) res+=v;
      } else if(tk.kw==='if'){
        const val=resolve(tk.expr.replace(/^if\s*/,''),ctx);
        skip.push(skip.includes(true)?true:!truthy(val));
      } else if(tk.kw==='else'){
        const top=skip.pop(); const parentSkip=skip.includes(true);
        skip.push(parentSkip?true:!top===false?true:false);
        // recompute: else inverts current branch, respecting parent
        skip[skip.length-1]=parentSkip?true:!(top);
      } else if(tk.kw==='end'){
        skip.pop();
      } else { // expr
        if(!skip.includes(true)) res+=String(resolve(tk.expr,ctx));
      }
    }
    return res;
  }
  return block(s).replace(/\n{3,}/g,'\n\n').replace(/^\n+/,'');
}
function truthy(v: unknown){return !(v===false||v==null||v===''||v===0);}

function mergedValues(){
  const base=yaml.load(baseValues);
  const ov=yaml.load(envOverrides[ui.env].split('\n').filter(l=>!l.trim().startsWith('#')).join('\n'))||{};
  let v=deepMerge(base as Obj,ov as Obj) as unknown as Values;
  // live UI controls win last
  v.replicaCount=ui.replicas; v.image.tag=ui.tag; v.ingress.enabled=ui.ingress;
  return v;
}
function highlightTpl(t: string){
  return esc(t)
   .replace(/(\{\{-?\s*(?:if|else|end)[^}]*?-?\}\})/g,'<span class="ctl">$1</span>')
   .replace(/(\{\{-?\s*\.[^}]*?-?\}\})/g,'<span class="v">$1</span>');
}
function highlightOut(t: string){
  return esc(t)
   .replace(/^(\s*[\w.\/-]+:)/gm,'<span style="color:#7fb2ff">$1</span>')
   .replace(/(kind: \w+)/g,'<span style="color:#ffd479">$1</span>');
}

const outView=document.getElementById('outView')!;
function refresh(){
  const V=mergedValues();
  const ctx={Release:{Name:'web'},Chart:{Name:'myapp'},Values:V};
  document.getElementById('tplView')!.innerHTML=highlightTpl(templates[ui.file]);
  let rendered=renderTpl(templates[ui.file],ctx).trim();
  outView.innerHTML=highlightOut(rendered);
  document.getElementById('valsView')!.innerHTML=esc(yaml.dump(V,{indent:2}).trim());
  document.getElementById('repVal')!.textContent=String(ui.replicas);
  // flash render panel
  outView.classList.add('flash'); setTimeout(()=>outView.classList.remove('flash'),300);
  document.getElementById('renderNote')!.textContent =
    (ui.file==='ingress'&&!ui.ingress)?'rendered: (nothing — guarded out)':'helm template';
}

/* wire controls */
document.querySelectorAll<HTMLElement>('#envSeg button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#envSeg button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on'); ui.env=b.dataset['env'] as typeof ui.env;
  // env override also moves replicas + tag so the demo feels real
  const ov=(yaml.load(envOverrides[ui.env].split('\n').filter(l=>!l.trim().startsWith('#')).join('\n'))||{}) as Partial<Values>;
  if(ov.replicaCount){ui.replicas=ov.replicaCount;(document.getElementById('repRange') as HTMLInputElement).value=String(ui.replicas);}
  if(ov.image&&ov.image.tag){ui.tag=ov.image.tag;
    document.querySelectorAll<HTMLElement>('#tagSeg button').forEach(x=>x.classList.toggle('on',x.dataset['tag']===ui.tag));}
  refresh();
});
document.getElementById('repRange')!.oninput=e=>{ui.replicas=+(e.target as HTMLInputElement).value;refresh();};
document.querySelectorAll<HTMLElement>('#tagSeg button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tagSeg button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');ui.tag=b.dataset['tag']!;refresh();});
document.getElementById('ingToggle')!.onclick=function(){
  ui.ingress=!ui.ingress; (this as HTMLElement).classList.toggle('on',ui.ingress); refresh();};
document.querySelectorAll<HTMLElement>('#tplTabs button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#tplTabs button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');ui.file=b.dataset['f'] as typeof ui.file;refresh();});
refresh();

/* nav scroll-spy */
const links=[...document.querySelectorAll('.navlink')];
const obs=new IntersectionObserver(es=>{
  es.forEach(e=>{if(e.isIntersecting){
    links.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+e.target.id));}});
},{rootMargin:'-30% 0px -60% 0px'});
document.querySelectorAll('section').forEach(s=>obs.observe(s));
