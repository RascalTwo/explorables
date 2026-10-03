  const rail=document.getElementById('rail')!;
  const onScroll=()=>{const h=document.documentElement;const sc=h.scrollTop/(h.scrollHeight-h.clientHeight);rail.style.width=(sc*100)+'%';};
  addEventListener('scroll',onScroll,{passive:true});onScroll();

  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.16});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  const links=[...document.querySelectorAll('.navsteps a')];
  const secs=links.map(l=>document.querySelector(l.getAttribute('href')!));
  const spy=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){const id='#'+e.target.id;links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')===id));}});},{rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(s=>s&&spy.observe(s));
