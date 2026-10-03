export {}; // makes this a module so the coverage tool can map it to source
// ===== Animated cliff rescue: the litter descends, the count climbs toward 75 =====
(function(){
  const litter = document.getElementById("cliff-litter")!;
  const rope   = document.getElementById("cliff-rope")!;
  const rescued= document.getElementById("cliff-rescued")!;
  const numEl  = document.getElementById("cliff-num")!;
  const pray   = document.getElementById("cliff-pray")!;
  const NS = "http://www.w3.org/2000/svg";
  // cubic Bézier down the cliff face, stump → base
  type Pt = [number, number];
  const P: [Pt, Pt, Pt, Pt] = [[416,144],[398,212],[360,320],[332,392]];
  const bez = (t: number): [number, number] => { const u=1-t;
    return [ u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],
             u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1] ]; };
  const place = (x: number, y: number, t: number) => {
    litter.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(6+t*16).toFixed(1)})`);
    rope.setAttribute("d", `M416,142 Q${((416+x)/2-6).toFixed(1)},${((142+y)/2).toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`);
  };
  const CAP = 12;
  let count = 0, shown = 0;
  function deliver(){
    count = Math.min(75, count+1); numEl.textContent = String(count);
    if(shown < CAP){ const i = shown++, x = 196 + i*10.5, y = 394;
      const g = document.createElementNS(NS, "g");
      g.innerHTML = `<circle cx="${x}" cy="${y-13}" r="4.3"/><path d="M${x-4.5},${y} L${x-4.5},${y-10} Q${x},${y-15} ${x+4.5},${y-10} L${x+4.5},${y} Z"/>`;
      rescued.appendChild(g);
    }
    pray.classList.add("on"); setTimeout(()=>pray.classList.remove("on"), 950);
  }

  if(matchMedia("(prefers-reduced-motion: reduce)").matches){
    const [x,y] = bez(.55); place(x,y,.55);
    for(let k=0;k<8;k++) deliver(); numEl.textContent = "75"; return;
  }

  const DUR = 2300, PAUSE = 300;
  let start: number | null = null, phase = "descend";
  function frame(ts: number){
    if(start == null) start = ts;
    const e = ts - start;
    if(phase === "descend"){
      let t = e / DUR;
      if(t >= 1){ t = 1; const [x,y] = bez(1); place(x,y,1); deliver();
        litter.style.opacity = "0"; rope.style.opacity = "0"; phase = "pause"; start = ts;
      } else { const [x,y] = bez(t); place(x,y,t); }
    } else if(e >= PAUSE){
      const [x,y] = bez(0); place(x,y,0); litter.style.opacity = "1"; rope.style.opacity = "1";
      phase = "descend"; start = ts;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
