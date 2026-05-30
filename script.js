// CURSOR
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
function animRing(){rx+=(mx-rx)*0.12;ry+=(my-ry)*0.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(animRing)}
animRing();
document.querySelectorAll('a,button,.btn,.tech-pill,.contact-card,.hl-card,.detail-row').forEach(el=>{
  el.addEventListener('mouseenter',()=>{cur.style.width='20px';cur.style.height='20px';ring.style.width='56px';ring.style.height='56px'});
  el.addEventListener('mouseleave',()=>{cur.style.width='12px';cur.style.height='12px';ring.style.width='36px';ring.style.height='36px'});
});

// SKILL BARS
const bars = document.querySelectorAll('.bar-fill');
const barObs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('go')});
},{threshold:0.4});
bars.forEach(b=>barObs.observe(b));
