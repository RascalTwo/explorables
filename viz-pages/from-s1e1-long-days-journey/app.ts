import { saveHash, loadHash } from "/_kit/viz.js";

/* ---------------- DATA ---------------- */
// tod = in-story time of day, 0=midnight .. 0.5=noon .. 1=next midnight
// lane: creature / town / colony / matthews / crash
const FAC: Record<string, string> = { matthews:'--matthews', town:'--town', colony:'--colony', crash:'--crash', creature:'--creature', victim:'--victim' };
const col = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(FAC[k]||'--town').trim();

type Scene = {
  id: number; clock: string; tod: number; lane: string; loc: string;
  title: string; sum: string; quote: string; by: string; chars: string[];
  danger?: boolean; song?: string; badge?: string; mention?: string;
};
const scenes: Scene[] = [
  {id:1, clock:'00:00', tod:.80, lane:'town', loc:'center',
   title:'Curfew bell at dusk',
   sum:"Sheriff Boyd walks the town swinging a bell — everyone home before dark. Sara closes the Diner and touches a talisman by the door; the tabletop jukebox flickers on by itself.",
   quote:"We are closed for the night. It's time to get home.", by:'Sara',
   song:'“We Gotta Get Out of This Place”', chars:['Boyd','Sara']},
  {id:2, clock:'02:30', tod:.83, lane:'town', loc:'clinic',
   title:'The basement, every night',
   sum:"At the Clinic, Deputy Kenny finishes a chess game with his father Bing-Qian before Kristi and nurse Gina take the old man down to the basement for the night. Kenny lingers, sweet on Kristi.",
   quote:"Denial is a major branch of our family tree.", by:'Kristi',
   chars:['Kenny','Bing-Qian','Kristi','Gina']},
  {id:3, clock:'05:00', tod:.86, lane:'town', loc:'bar',
   title:'Frank left behind',
   sum:"Bartender Tom can't rouse a blackout-drunk Frank Pratt and gives up, leaving him on the floor as the light dies — Frank never makes it home to nail his windows shut.",
   quote:"Come on, Frank! Gotta get home. It's getting dark out.", by:'Tom',
   chars:['Tom','Frank']},
  {id:4, clock:'05:30', tod:.97, lane:'creature', loc:'pratt', danger:true,
   title:'“Grandma” at the window',
   sum:"Lauren waits for Frank while daughter Meagan says her prayers. A smiling old woman calls through the glass, claiming to be Grandma. Meagan opens the window — the thing changes, and kills them both.",
   quote:"It's Grandma. Come to the window… it'll be our little secret.", by:'the creature',
   chars:['Meagan','Lauren','Old-Lady']},
  {id:5, clock:'07:40', tod:.30, lane:'matthews', loc:'roadin',
   title:'The Matthews on the road',
   sum:"Hard cut to morning (“Que Sera, Sera”). The Matthews family RV rolls along a highway. Julie play-acts a toy's death for Ethan; Tabitha soothes him with a small, telling lie.",
   quote:"There's no such thing as monsters, honey.", by:'Tabitha',
   song:'“Que Sera, Sera”', chars:['Jim','Tabitha','Julie','Ethan']},
  {id:6, clock:'12:20', tod:.34, lane:'town', loc:'pratt', danger:true,
   title:'Boyd makes Frank look',
   sum:"Morning in town. Boyd beats a hungover Frank and drags him to the bodies of his wife and child — the price of one un-nailed window — then has Kenny lock him up. Father Khatri comes for last rites.",
   quote:"A man protects his family, Frank!", by:'Boyd',
   chars:['Boyd','Frank','Kenny','Khatri']},
  {id:7, clock:'14:30', tod:.42, lane:'matthews', loc:'tree',
   title:'One fallen tree',
   sum:"Jim and Tabitha reminisce about an old Volvo and meeting her parents. A single tree blocks the road — “a pretty selective storm” — and a swarm of crows wheels overhead. They turn back to circle around.",
   quote:"Well, that's a pretty selective storm.", by:'Tabitha',
   chars:['Jim','Tabitha','Ethan']},
  {id:8, clock:'17:20', tod:.48, lane:'colony', loc:'colony',
   title:'Colony House',
   sum:"Donna reminds Boyd he isn't welcome at the mansion. Inside, Boyd's estranged son Ellis is sketching his girlfriend Fatima. Boyd tells him about the Pratts and asks him to come to the service.",
   quote:"We have an arrangement, Sheriff. You don't come here.", by:'Donna',
   chars:['Boyd','Donna','Ellis','Fatima']},
  {id:9, clock:'20:00', tod:.52, lane:'matthews', loc:'road',
   title:'No signal, no highway',
   sum:"The RV can't find the highway and has no cell service. Julie spins a horror story — a “murder” of crows hunting Ethan. Tabitha counters that they were ravens: an “unkindness.”",
   quote:"An unkindness of ravens.", by:'Tabitha',
   chars:['Jim','Tabitha','Julie','Ethan']},
  {id:10, clock:'21:20', tod:.55, lane:'town', loc:'center',
   title:'The Pratts are buried',
   sum:"As Khatri commits Lauren and Meagan to the earth, the townsfolk notice the newcomers' RV and stare. Boyd tells everyone to leave the family be — he and Kenny will handle it.",
   quote:"You all remember what it was like. Just leave these people be.", by:'Boyd',
   chars:['Khatri','Boyd','Kenny','townsfolk']},
  {id:11, clock:'22:40', tod:.58, lane:'matthews', loc:'center',
   title:'“You’ll see”',
   sum:"Jim asks Boyd for directions to the highway. Boyd, oddly careful, tells him to just follow the road up the hill — “you'll see” — knowing exactly where it leads.",
   quote:"You just keep on following the road right up that hill… you'll see.", by:'Boyd',
   chars:['Jim','Boyd']},
  {id:12, clock:'26:00', tod:.62, lane:'town', loc:'barn',
   title:'The cruel part',
   sum:"Sara catches her brother Nathan heading to the barn and names the worst of it — the newcomers still believe a road home exists. She seems to be carrying something heavier than she says.",
   quote:"It's the part that's cruel — when you still expect to find the road that takes you home.", by:'Sara',
   chars:['Sara','Nathan']},
  {id:13, clock:'27:40', tod:.66, lane:'matthews', loc:'road',
   title:'Driving in circles',
   sum:"Every road bends the RV back into town. Tabitha unravels; Jim insists he's driving straight. Out of sight, Kenny lays a spike strip — and the RV's tires blow flat.",
   quote:"We're on the same fucking road!", by:'Tabitha',
   chars:['Jim','Tabitha','Kenny']},
  {id:14, clock:'29:30', tod:.70, lane:'crash', loc:'crash', danger:true,
   title:'The crash',
   sum:"A speeding car (Jade and Tobey) forces the RV off the road; it rolls onto its side. Tabitha is knocked out and Ethan's leg is impaled on a table leg.",
   quote:"Oh, my God, Jim — we should ask them. Maybe they know.", by:'Tabitha',
   chars:['Jim','Tabitha','Julie','Ethan','Jade','Tobey']},
  {id:15, clock:'31:30', tod:.74, lane:'town', loc:'crash',
   title:'Rescue before dark',
   sum:"Tobey runs for help; Boyd sends Kenny for Kristi, Khatri and Ellis. Two hours of daylight left. Tobey is taken to the Clinic; the drunk, dazed Jade is cuffed to his wrecked car.",
   quote:"We only have, like, two hours of daylight left.", by:'Kenny', badge:'2 HRS OF LIGHT',
   chars:['Boyd','Kenny','Kristi','Khatri','Ellis','Tobey','Jade']},
  {id:16, clock:'40:00', tod:.82, lane:'creature', loc:'clinic', danger:true,
   title:'Sara and Tobey',
   sum:"Back at the Clinic, Sara calms a frightened Tobey — then tells him it isn't his fault and cuts his throat. She's obeying a voice only she can hear.",
   quote:"This isn't your fault.", by:'Sara',
   chars:['Sara','Tobey']},
  {id:17, clock:'41:00', tod:.84, lane:'town', loc:'crash',
   title:'Operate in the RV',
   sum:"A table leg is clean through Ethan's thigh; removing it safely takes an hour, and only 40 minutes of light remain. Boyd's plan: stitch the boy inside the RV overnight, warded by a talisman.",
   quote:"I don't want to bury any more kids.", by:'Boyd', badge:'40 MIN OF LIGHT',
   chars:['Kristi','Boyd','Kenny','Jim']},
  {id:18, clock:'44:00', tod:.88, lane:'matthews', loc:'crash',
   title:'Whose baby',
   sum:"Concussed, Tabitha begs to carry “Thomas” to safety; Jim has to remind her it's Ethan who's trapped. She doesn't trust these people, or their warning that the woods aren't safe after dark.",
   quote:"Jim… it's Ethan. Ethan's the one stuck in the RV.", by:'Jim',
   chars:['Tabitha','Jim'], mention:'Thomas'},
  {id:19, clock:'48:00', tod:.93, lane:'town', loc:'crash',
   title:'Warding the RV',
   sum:"Boyd blocks every window and hangs the talisman while Kristi preps surgery. The others' truck is flattened by Kenny's own spike strip, forcing a run through the rain to Colony House.",
   quote:"No matter what you see, no matter what you hear — you do not stop.", by:'Ellis',
   chars:['Boyd','Kristi','Jim','Ethan','Kenny','Khatri','Ellis']},
  {id:20, clock:'50:00', tod:.99, lane:'creature', loc:'crash', danger:true,
   title:'They’re coming',
   sum:"Night falls fully. Ethan seizes as Kristi works. Boyd peers through a gap — dozens of pale figures are massing out of the trees around the RV. The 96 nights are over.",
   quote:"They're comin'.", by:'Boyd',
   chars:['Boyd','Kristi','Jim','Ethan','creatures']},
];

const lanes = [
  {key:'creature', label:'The Woods', y:52},
  {key:'town',     label:'Townsfolk', y:118},
  {key:'colony',   label:'Colony House', y:184},
  {key:'matthews', label:'The Matthews', y:236},
  {key:'crash',    label:'Crash site', y:288},
];

type Place = { x: number; y: number; label: string };
const places: Record<string, Place> = {
  center:{x:258,y:270,label:'Town Square'},
  diner: {x:206,y:236,label:'Diner'},
  clinic:{x:314,y:232,label:'Clinic'},
  station:{x:250,y:322,label:"Sheriff's Stn"},
  bar:   {x:196,y:300,label:'Bar'},
  pratt: {x:326,y:314,label:'Pratt Home'},
  barn:  {x:346,y:186,label:'Barn'},
  colony:{x:424,y:110,label:'Colony House'},
  tree:  {x:132,y:120,label:'Fallen Tree'},
  roadin:{x:78,y:392,label:'The highway'},
  crash: {x:150,y:430,label:'RV crash'},
};

const roster: [string, string, [string, string][]][] = [
  ['The Matthews','matthews',[
    ['Jim','father, driving'],['Tabitha','mother, concussed'],
    ['Julie','teen daughter'],['Ethan','young son, injured'],['Thomas','a name Tabitha calls — unseen']]],
  ['Townsfolk','town',[
    ['Boyd','the sheriff'],['Kenny','deputy'],['Kristi','doctor'],
    ['Khatri','priest / "Father"'],['Sara','runs the Diner'],['Nathan','Sara\'s brother'],
    ['Bing-Qian','Kenny\'s father'],['Gina','nurse'],['Tom','bartender'],['Frank','the grieving drunk']]],
  ['Colony House','colony',[
    ['Donna','their leader'],['Ellis','Boyd\'s son'],['Fatima','Ellis\'s girlfriend']]],
  ['Crash newcomers','crash',[
    ['Jade','drunk driver, cuffed'],['Tobey','passenger, killed by Sara']]],
  ['The dead / the dark','creature',[
    ['Lauren','Meagan\'s mother †'],['Meagan','the Pratt child †'],
    ['“Grandma”','the thing at the window'],['The creatures','they come at night']]],
];

/* ---------------- SKY MATH ---------------- */
const skyKeys: [number, [number, number, number]][] = [
  [0.00,[6,8,16]],[0.20,[30,40,66]],[0.25,[110,84,126]],[0.29,[201,120,66]],
  [0.36,[110,150,190]],[0.50,[150,190,224]],[0.64,[120,160,200]],
  [0.72,[214,130,70]],[0.78,[96,66,112]],[0.86,[38,42,74]],[1.00,[6,8,16]],
];
function lerp(a: number,b: number,t: number){return a+(b-a)*t}
function skyRGB(tod: number): number[]{
  tod=((tod%1)+1)%1;
  for(let i=0;i<skyKeys.length-1;i++){
    const [t0,c0]=skyKeys[i]!,[t1,c1]=skyKeys[i+1]!;
    if(tod>=t0&&tod<=t1){const f=(tod-t0)/(t1-t0);
      return [0,1,2].map(j=>Math.round(lerp(c0[j]!,c1[j]!,f)));}
  }
  return skyKeys[0]![1];
}
const skyCss = (tod: number) => `rgb(${skyRGB(tod).join(',')})`;
const daylight = (tod: number) => Math.max(0, 1 - Math.abs(tod-0.5)/0.25);   // 1 at noon, 0 by dawn/dusk
const nightAmt = (tod: number) => Math.max(0, Math.min(1, 1 - daylight(tod)*1.35));
function todLabel(tod: number){
  if(tod<.22||tod>=.965) return 'Night';
  if(tod<.27) return 'Dawn'; if(tod<.33) return 'Sunrise';
  if(tod<.45) return 'Morning'; if(tod<.55) return 'Midday';
  if(tod<.68) return 'Afternoon'; if(tod<.75) return 'Sunset';
  if(tod<.86) return 'Dusk'; return 'Nightfall';
}

/* ---------------- STATE ---------------- */
const PX0=100, PX1=980;
const tmax = 52;
const xOf = (clock: string) => PX0 + (toMin(clock)/tmax)*(PX1-PX0);
function toMin(mmss: string){const [m,s]=mmss.split(':').map(Number);return m!+s!/60;}
type Hash = { s: number };
let sel: Scene = (loadHash<Hash>().s ? scenes.find(s=>s.id==loadHash<Hash>().s) : scenes[0]) ?? scenes[0]!;

/* ---------------- HERO DOME ---------------- */
const dome = document.getElementById('dome')!;
function renderDome(tod: number){
  const top=skyRGB(tod), bot=skyRGB(tod).map(c=>Math.min(255,c+22));
  const sunUp = tod>0.25 && tod<0.75;
  let bodyX,bodyY,R=140,cx=170,cy=196;
  if(sunUp){const p=(tod-0.25)/0.5;const a=Math.PI*(1-p);bodyX=cx+R*Math.cos(a);bodyY=cy-R*Math.sin(a);}
  else{const nt = tod>=0.75 ? (tod-0.75)/0.5 : (tod+0.25)/0.5;const a=Math.PI*(1-nt);bodyX=cx+R*Math.cos(a);bodyY=cy-R*Math.sin(a);}
  const stars = (!sunUp) ? Array.from({length:34},(_,i)=>{
    const sx=(i*97%320)+8, sy=(i*53%150)+8, op=(nightAmt(tod)*(0.3+ (i%5)/6)).toFixed(2);
    return `<circle cx="${sx}" cy="${sy}" r="${i%7===0?1.3:0.8}" fill="#fff" opacity="${op}"/>`;}).join('') : '';
  const body = sunUp
    ? `<circle cx="${bodyX}" cy="${bodyY}" r="20" fill="#ffd86b"/><circle cx="${bodyX}" cy="${bodyY}" r="30" fill="#ffd86b" opacity="0.25"/>`
    : `<circle cx="${bodyX}" cy="${bodyY}" r="15" fill="#dfe7f2"/><circle cx="${bodyX-5}" cy="${bodyY-4}" r="12" fill="${skyCss(tod)}" opacity="0.9"/>`;
  dome.innerHTML = `
    <defs><linearGradient id="skg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgb(${top.join(',')})"/>
      <stop offset="1" stop-color="rgb(${bot.join(',')})"/></linearGradient></defs>
    <rect width="340" height="210" fill="url(#skg)"/>
    ${stars}
    ${body}
    <path d="M0 178 Q 60 168 110 176 T 210 174 T 340 180 L340 210 L0 210 Z" fill="#05070f" opacity="0.9"/>
    <path d="M0 190 Q 90 182 170 188 T 340 190 L340 210 L0 210 Z" fill="#02040a"/>`;
}

/* ---------------- READOUT ---------------- */
function renderReadout(s: Scene){
  document.getElementById('r-clock')!.textContent = s.clock;
  const todEl=document.getElementById('r-tod')!; todEl.textContent=todLabel(s.tod);
  todEl.style.background = skyCss(s.tod); todEl.style.color = daylight(s.tod)>.4?'#0a0e1a':'#e7ecf5';
  todEl.style.borderColor='transparent';
  document.getElementById('r-title')!.textContent = s.title;
  const p=places[s.loc];
  document.getElementById('r-loc')!.innerHTML = `<b>${p?p.label:s.loc}</b>`;
  const d=Math.round(daylight(s.tod)*100);
  document.getElementById('r-dfill')!.style.width = d+'%';
  const pctEl=document.getElementById('r-dpct')!;
  if(s.badge){pctEl.innerHTML=`<span class="urgent">${s.badge}</span>`;}
  else pctEl.textContent = d>2? d+'% sun' : (s.tod<.2||s.tod>.8?'after dark':'twilight');
}

/* ---------------- TIMELINE ---------------- */
const tl = document.getElementById('tl')!;
function renderTL(){
  const H=330;
  let g = `<defs><linearGradient id="skyband" x1="0" x2="1" y1="0" y2="0">`;
  g += `<stop offset="0" stop-color="${skyCss(scenes[0]!.tod)}"/>`;
  scenes.forEach(s=>{const off=((toMin(s.clock))/tmax*100).toFixed(2);g+=`<stop offset="${off}%" stop-color="${skyCss(s.tod)}"/>`;});
  g += `<stop offset="100%" stop-color="${skyCss(scenes.at(-1)!.tod)}"/></linearGradient></defs>`;

  // sky band
  let s = `<rect x="${PX0}" y="18" width="${PX1-PX0}" height="${H-52}" rx="10" fill="url(#skyband)"/>`;
  s += `<rect x="${PX0}" y="18" width="${PX1-PX0}" height="${H-52}" rx="10" fill="#000" opacity="0.28"/>`;

  // lane labels + baselines
  lanes.forEach(L=>{
    s += `<text class="lanelab" x="${PX0-12}" y="${L.y+4}" fill="${col(L.key)}">${L.label}</text>`;
    s += `<line x1="${PX0}" y1="${L.y}" x2="${PX1}" y2="${L.y}" stroke="${col(L.key)}" stroke-opacity="0.14"/>`;
  });

  // connective thread per lane (faint)
  lanes.forEach(L=>{
    const pts = scenes.filter(sc=>sc.lane===L.key).sort((a,b)=>toMin(a.clock)-toMin(b.clock));
    if(pts.length>1){
      const d = pts.map((p,i)=>`${i?'L':'M'}${xOf(p.clock).toFixed(1)} ${L.y}`).join(' ');
      s += `<path d="${d}" fill="none" stroke="${col(L.key)}" stroke-opacity="0.35" stroke-width="1.5"/>`;
    }
  });

  // time ticks
  for(let m=0;m<=50;m+=10){const x=PX0+(m/tmax)*(PX1-PX0);
    s += `<line x1="${x}" y1="${H-30}" x2="${x}" y2="${H-24}" stroke="#39466a"/>`;
    s += `<text class="tick" x="${x}" y="${H-12}">${String(Math.floor(m)).padStart(2,'0')}:00</text>`;}

  // nodes
  scenes.forEach(sc=>{
    const L=lanes.find(l=>l.key===sc.lane)!, x=xOf(sc.clock), c=col(sc.lane);
    const selc = sc.id===sel.id?'nsel':'';
    const dz = sc.danger?`<circle cx="${x}" cy="${L.y}" r="15" fill="${col('creature')}" opacity="0.18"/>`:'';
    s += `<g class="node ${selc}" data-id="${sc.id}" data-viz-id="scene-${sc.id}" data-label="${sc.clock} ${sc.title}">
      ${dz}
      <circle cx="${x}" cy="${L.y}" r="11" fill="${c}" stroke="${sc.danger?col('creature'):'#0a0e1a'}" stroke-width="${sc.danger?2:1.5}"/>
      <text class="nnum" x="${x}" y="${L.y}">${sc.id}</text>
    </g>`;
  });

  // playhead
  const px = xOf(sel.clock);
  s += `<g id="ph"><line class="phline" x1="${px}" y1="18" x2="${px}" y2="${H-34}"/>
        <path class="phgrip" d="M${px-6} 12 L${px+6} 12 L${px} 22 Z"/></g>`;

  tl.innerHTML = g+s;
  tl.querySelectorAll<SVGGElement>('.node').forEach(n=>n.addEventListener('click',()=>select(+n.dataset['id']!)));
}

/* ---------------- MAP ---------------- */
const map = document.getElementById('map')!;
function renderMap(){
  const tod=sel.tod, na=nightAmt(tod);
  const forestFill = `rgb(${skyRGB(tod).map(c=>Math.round(c*0.5)).join(',')})`;
  let s='';
  // forest ring
  s += `<rect x="0" y="0" width="520" height="520" fill="${forestFill}"/>`;
  s += `<rect x="46" y="46" width="428" height="428" rx="26" fill="#0a1020" stroke="#1b243c"/>`;
  // trees around the ring
  const trees=[];
  for(let i=0;i<46;i++){const a=i/46*Math.PI*2;const rx=228,ry=228;
    const x=260+Math.cos(a)*rx*(0.86+((i*7)%5)/22), y=260+Math.sin(a)*ry*(0.86+((i*5)%5)/22);
    if(x>60&&x<460&&y>60&&y<460) continue;
    trees.push(`<path d="M${x} ${y+7} l-5 0 l5 -13 l5 13 z" fill="#0c1522"/><path d="M${x} ${y+2} l-6 0 l6 -15 l6 15 z" fill="#0f1c2b"/>`);}
  s += trees.join('');

  // roads: the loop they can't escape
  s += `<ellipse cx="258" cy="268" rx="150" ry="132" fill="none" stroke="#2a334d" stroke-width="10"/>`;
  s += `<ellipse cx="258" cy="268" rx="150" ry="132" fill="none" stroke="#3c496d" stroke-width="2" stroke-dasharray="6 10"/>`;
  // spurs
  s += `<path d="M138 190 Q 110 150 132 122" fill="none" stroke="#2a334d" stroke-width="9"/>`;      // to tree
  s += `<path d="M392 168 Q 420 140 424 112" fill="none" stroke="#2a334d" stroke-width="9"/>`;      // to colony
  s += `<path d="M150 372 Q 120 400 150 428" fill="none" stroke="#2a334d" stroke-width="9"/>`;      // to crash
  s += `<path d="M120 356 Q 96 380 80 392" fill="none" stroke="#26304a" stroke-width="7" stroke-dasharray="4 8"/>`; // highway stub
  // "loops back" label
  s += `<text x="258" y="272" text-anchor="middle" font-size="9" letter-spacing="1" fill="#5a678a">↻ every road returns here</text>`;

  // creatures emerging from the woods (opacity by darkness)
  const cpos=[[70,120],[440,90],[470,300],[60,300],[250,58],[120,470],[400,468],[478,190]];
  cpos.forEach((p,i)=>{const op=(na*(0.5+ (i%3)/4)).toFixed(2);
    s += `<g opacity="${op}"><circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="${col('creature')}"/>
          <circle cx="${p[0]}" cy="${p[1]}" r="10" fill="${col('creature')}" opacity="0.3"/></g>`;});

  // pins
  for(const [k,p] of Object.entries(places)){
    const active = sel.loc===k;
    const c = k==='colony'?col('colony'): k==='crash'?col('crash'): k==='roadin'?col('matthews'): col('town');
    s += `<g class="pin ${active?'psel':''}" data-loc="${k}" data-viz-id="place-${k}" data-label="${p.label}">
      ${active?`<circle cx="${p.x}" cy="${p.y}" r="15" fill="${c}" opacity="0.25"><animate attributeName="r" values="12;20;12" dur="1.6s" repeatCount="indefinite"/></circle>`:''}
      <circle class="pdot" cx="${p.x}" cy="${p.y}" r="6" fill="${c}" stroke="#0a0e1a" stroke-width="1.5"/>
      <text x="${p.x}" y="${p.y-11}" text-anchor="middle">${p.label}</text>
    </g>`;
  }
  map.innerHTML = s;
  map.querySelectorAll<SVGGElement>('.pin').forEach(pin=>pin.addEventListener('click',()=>{
    const first = scenes.find(sc=>sc.loc===pin.dataset['loc']); if(first) select(first.id);
  }));
}

/* ---------------- DETAIL + ROSTER ---------------- */
function renderDetail(s: Scene){
  const p=places[s.loc];
  const badge = s.danger
    ? `<span class="badge" style="background:${col('creature')}22;color:${col('creature')};border:1px solid ${col('creature')}66">⚠ turning point</span>`
    : `<span class="badge" style="background:${col(s.lane)}22;color:${col(s.lane)};border:1px solid ${col(s.lane)}55">${lanes.find(l=>l.key===s.lane)!.label}</span>`;
  const chips = (s.chars||[]).map(c=>`<span class="chip">${c}</span>`).join('');
  const song = s.song?`<div class="chip" style="border-color:${col('colony')}55">♪ ${s.song}</div>`:'';
  document.getElementById('detail')!.innerHTML = `
    ${badge}
    <h3>${s.clock} · ${s.title}</h3>
    <div class="dloc">${p?p.label:s.loc} · in-story: ${todLabel(s.tod)}</div>
    <div class="dsum">${s.sum}</div>
    <div class="quote">“${s.quote}”<span class="by">— ${s.by}</span></div>
    <div class="chips">${chips}${song}</div>`;
}
function renderRoster(){
  const active=new Set(sel.chars||[]);
  let h='';
  roster.forEach(([title,fac,people])=>{
    h+=`<h3 style="color:${col(fac)}">${title}</h3>`;
    people.forEach(([name,role])=>{
      const on = active.has(name);
      h+=`<div class="fac" style="opacity:${on?1:.5}">
        <span class="dot" style="background:${col(fac)};box-shadow:${on?`0 0 8px ${col(fac)}`:'none'}"></span>
        <b>${name}</b><span class="role">— ${role}</span></div>`;
    });
  });
  document.getElementById('roster')!.innerHTML=h;
}

/* ---------------- SELECT / DRIVE ---------------- */
function paint(s: Scene){renderDome(s.tod);renderReadout(s);renderDetail(s);renderMap();renderRoster();
  document.querySelectorAll<SVGGElement>('.node').forEach(n=>n.classList.toggle('nsel',(+n.dataset['id']!)===s.id));
  // move playhead
  const px=xOf(s.clock);const ph=document.getElementById('ph');
  if(ph){ph.querySelector('line')!.setAttribute('x1',String(px));ph.querySelector('line')!.setAttribute('x2',String(px));
    ph.querySelector('path')!.setAttribute('d',`M${px-6} 12 L${px+6} 12 L${px} 22 Z`);}
}
function select(id: number){sel=scenes.find(s=>s.id===id)!;saveHash({s:id});paint(sel);}
function step(dir: number){const i=scenes.findIndex(s=>s.id===sel.id);
  const ni=Math.max(0,Math.min(scenes.length-1,i+dir));select(scenes[ni]!.id);}

document.getElementById('prev')!.addEventListener('click',()=>step(-1));
document.getElementById('next')!.addEventListener('click',()=>step(1));
window.addEventListener('keydown',e=>{
  if((e.target as Element).matches('input,textarea'))return;
  if(e.key==='ArrowLeft'){stopPlay();step(-1);e.preventDefault();}
  else if(e.key==='ArrowRight'){stopPlay();step(1);e.preventDefault();}
});

// drag playhead → nearest scene by x
let dragging=false;
tl.addEventListener('mousedown',e=>{if((e.target as Element).classList.contains('phgrip')){dragging=true;e.preventDefault();}});
window.addEventListener('mouseup',()=>dragging=false);
window.addEventListener('mousemove',e=>{if(!dragging)return;
  const r=tl.getBoundingClientRect();const sx=(e.clientX-r.left)/r.width*1000;
  let best=scenes[0]!,bd=1e9;scenes.forEach(s=>{const d=Math.abs(xOf(s.clock)-sx);if(d<bd){bd=d;best=s;}});
  if(best.id!==sel.id) select(best.id);
});

// play
let playing: ReturnType<typeof setInterval> | null=null;
const playBtn=document.getElementById('play')!;
function stopPlay(){if(playing){clearInterval(playing);playing=null;playBtn.textContent='▶ Play the day';}}
playBtn.addEventListener('click',()=>{
  if(playing){stopPlay();return;}
  playBtn.textContent='⏸ Pause';let i=scenes.findIndex(s=>s.id===sel.id);
  playing=setInterval(()=>{i=i+1;if(i>=scenes.length){stopPlay();return;}select(scenes[i]!.id);},1400);
});

renderTL();
paint(sel);
