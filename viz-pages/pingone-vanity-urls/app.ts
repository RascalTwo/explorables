import { arrowMarkers, connect, saveHash, loadHash } from "/_kit/viz.js";

/* --- URL swap toggle --- */
const urlText = document.getElementById('urlText')!, swapBtn = document.getElementById('swapBtn')!;
let vanity = true;
swapBtn.onclick = () => {
  vanity = !vanity;
  urlText.innerHTML = vanity
    ? '<span class="van">auth.example.com</span><span class="path">/&lt;envID&gt;/as/authorize</span>'
    : '<span style="color:var(--muted)">auth.pingone.com</span><span class="path">/&lt;envID&gt;/as/authorize</span>';
  swapBtn.textContent = vanity ? '▸ show default' : '▸ show vanity';
};

/* --- handshake diagram --- */
interface Node { x: number; y: number; w: number; h: number; label: string; sub: string; color: string }
type NodeId = 'ping' | 'dns' | 'ca';
interface Step { n: number; who: string; st: string; from: NodeId; to: NodeId; sd: string; color: string }
const nodes: Record<NodeId, Node> = {
  ping: { x: 200, y: 30,  w: 220, h: 76, label: 'PingOne',  sub: 'Settings › Domains / TF', color: 'var(--accent)' },
  dns:  { x: 30,  y: 300, w: 220, h: 76, label: 'Your DNS', sub: 'Route53 / Cloudflare',    color: 'var(--c5)' },
  ca:   { x: 370, y: 300, w: 220, h: 76, label: 'Cert Authority', sub: 'DigiCert / LE / internal', color: 'var(--c4)' },
};
// each step: from → to, an svg color, and the label anchor
const steps: Step[] = [
  { n:1, who:'PingOne', st:'Create the custom domain', from:'ping', to:'ping',
    sd:'In Settings › Domains (or Terraform). PingOne returns a canonicalName like 1234-abcd.edge1.pingone.com.', color:'var(--accent)' },
  { n:2, who:'You → DNS', st:'Add the CNAME', from:'ping', to:'dns',
    sd:'Point auth.example.com → that canonicalName in your DNS. Add a TXT record too if the domain isn’t publicly reachable yet.', color:'var(--c5)' },
  { n:3, who:'PingOne ↔ DNS', st:'Verify domain control', from:'dns', to:'ping',
    sd:'PingOne checks the CNAME/TXT. DNS propagation up to 24h; Cloudflare activation ~10 min.', color:'var(--good)' },
  { n:4, who:'CA → PingOne', st:'Issue + import the TLS cert', from:'ca', to:'ping',
    sd:'Get a cert for auth.example.com from your CA; import key + cert + intermediate chain (PEM). No self-signed.', color:'var(--c4)' },
  { n:5, who:'Ongoing', st:'Renew before expiry', from:'ca', to:'ca',
    sd:'Certs expire — an expired cert breaks login. Own the renewal; automate it if you can.', color:'var(--warn)' },
];

const svg = document.getElementById('handshake')!;
const colorId: Record<string, string> = { 'var(--accent)':'ah-accent','var(--good)':'ah-good','var(--warn)':'ah-warn','var(--c4)':'ah-accent','var(--c5)':'ah-accent' };

function node(id: NodeId) {
  const n = nodes[id];
  return `<g>
    <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" fill="var(--panel-2)" stroke="${n.color}" stroke-width="1.5"/>
    <text x="${n.x+n.w/2}" y="${n.y+32}" text-anchor="middle" fill="var(--text)" font-size="16" font-weight="700" font-family="var(--sans)">${n.label}</text>
    <text x="${n.x+n.w/2}" y="${n.y+54}" text-anchor="middle" fill="var(--muted)" font-size="11.5" font-family="var(--mono)">${n.sub}</text>
  </g>`;
}

function edgePath(s: Step) {
  const a = nodes[s.from], b = nodes[s.to];
  if (s.from === s.to) { // self loop
    const cx = a.x + a.w/2;
    if (a.label === 'PingOne') return `M ${cx-30} ${a.y} C ${cx-70} ${a.y-46}, ${cx+70} ${a.y-46}, ${cx+30} ${a.y}`;
    return `M ${a.x+a.w} ${a.y+a.h/2} C ${a.x+a.w+56} ${a.y+8}, ${a.x+a.w+56} ${a.y+a.h-8}, ${a.x+a.w} ${a.y+a.h/2-1}`;
  }
  return connect(a, b);
}

function render(active: number | null) {
  let e = `<defs>${arrowMarkers()}</defs>`;
  // edges first
  steps.forEach(s => {
    const on = active === s.n;
    e += `<path d="${edgePath(s)}" fill="none" stroke="${s.color}"
            stroke-width="${on?3.5:1.8}" opacity="${active&&!on?0.18:0.9}"
            marker-end="url(#${colorId[s.color]})" ${on?'class="flow"':''}/>`;
  });
  // number badges at path midpoints
  steps.forEach(s => {
    const a = nodes[s.from], b = nodes[s.to];
    let mx: number, my: number;
    if (s.from === s.to) { mx = a.x + a.w/2 + (a.label==='PingOne'?0:a.w/2+40); my = a.label==='PingOne'? a.y-40 : a.y+a.h/2; }
    else { mx = (a.x+a.w/2 + b.x+b.w/2)/2; my = (a.y+a.h/2 + b.y+b.h/2)/2; }
    const on = active === s.n;
    e += `<g style="cursor:pointer" data-badge="${s.n}">
      <circle cx="${mx}" cy="${my}" r="${on?15:12}" fill="${s.color}" stroke="var(--bg)" stroke-width="2"/>
      <text x="${mx}" y="${my+4}" text-anchor="middle" fill="var(--bg)" font-size="13" font-weight="700" font-family="var(--sans)">${s.n}</text>
    </g>`;
  });
  e += node('ping') + node('dns') + node('ca');
  svg.innerHTML = e;
  svg.querySelectorAll('[data-badge]').forEach(g =>
    (g as SVGElement).onclick = () => select(+(g as SVGElement).dataset['badge']!));
}

const list = document.getElementById('steps')!;
list.innerHTML = steps.map(s => `<li data-step="${s.n}">
  <div class="st"><span class="num">${s.n}</span>${s.st}</div>
  <div class="who">${s.who}</div>
  <div class="sd">${s.sd}</div></li>`).join('');

function select(n: number) {
  render(n);
  list.querySelectorAll('li').forEach(li => li.classList.toggle('active', +li.dataset['step']! === n));
  saveHash({ step: n });
}
list.querySelectorAll('li').forEach(li => li.onclick = () => select(+li.dataset['step']!));

const initial = loadHash<{ step: number }>().step || null;
render(initial);
if (initial) list.querySelector(`li[data-step="${initial}"]`)?.classList.add('active');
