  // Act-03 mini heat-map: 10 stages × 5 rungs, cell colour = the rung where that step is handed off
  const COL = ["var(--op)","var(--co)","var(--cons)","var(--appr)","var(--obs)"];
  const STAGES = 10, FUSE: [number, number] = [3,4], GATE = 9;
  const era = (rIdx: number,i: number)=>{
    const loop = i>=FUSE[0]&&i<=FUSE[1], gate = i===GATE;
    if(rIdx===0) return 0; if(rIdx===1) return 1;
    if(rIdx===2) return loop?2:1;
    if(rIdx===3) return loop?2:(gate?1:3);
    return loop?2:(gate?4:3);
  };
  document.getElementById("mh")!.innerHTML = COL.map(c=>`<span style="--c:${c}"></span>`).join("");
  let cells = "";
  for(let i=0;i<STAGES;i++) for(let r=0;r<5;r++) cells += `<div class="mc" style="--c:${COL[era(r,i)]}"></div>`;
  document.getElementById("m")!.innerHTML = cells;
