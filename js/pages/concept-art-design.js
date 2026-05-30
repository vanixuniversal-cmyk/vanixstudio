window.addEventListener('load',()=>setTimeout(()=>document.getElementById('loader').classList.add('hidden'),2000));
    const cg=document.getElementById('cursorGlow');let mx=0,my=0,gx=0,gy=0;
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
    (function ac(){gx+=(mx-gx)*.06;gy+=(my-gy)*.06;cg.style.left=gx+'px';cg.style.top=gy+'px';requestAnimationFrame(ac)})();
    const cv=document.getElementById('pCanvas'),cx=cv.getContext('2d');
    function rs(){cv.width=innerWidth;cv.height=innerHeight}rs();addEventListener('resize',rs);
    class P{constructor(){this.r()}r(){this.x=Math.random()*cv.width;this.y=cv.height+5;this.s=Math.random()*1.8+.4;this.v=Math.random()*.6+.2;this.o=Math.random()*.4+.1;this.d=(Math.random()-.5)*.3}u(){this.y-=this.v;this.x+=this.d;if(this.y<-5)this.r()}w(){cx.save();cx.globalAlpha=this.o;cx.fillStyle='var(--primary)';cx.shadowColor='var(--primary)';cx.shadowBlur=6;cx.beginPath();cx.arc(this.x,this.y,this.s,0,Math.PI*2);cx.fill();cx.restore()}}
    const ps=Array.from({length:25},()=>{const p=new P;p.y=Math.random()*cv.height;return p});
    (function ap(){cx.clearRect(0,0,cv.width,cv.height);ps.forEach(p=>{p.u();p.w()});requestAnimationFrame(ap)})();
    const nb=document.getElementById('navbar'),sb=document.getElementById('scrollBar'),bt=document.getElementById('backTop');
    addEventListener('scroll',()=>{const s=scrollY,d=document.documentElement.scrollHeight-innerHeight;nb.classList.toggle('scrolled',s>50);sb.style.width=(s/d*100)+'%';bt.classList.toggle('show',s>400)});
    bt.onclick=()=>scrollTo({top:0,behavior:'smooth'});
    document.getElementById('hamburger').onclick=()=>document.getElementById('navLinks').classList.toggle('active');
    document.querySelectorAll('.rv,.rl,.rr,.rs').forEach(el=>new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('a')}),{rootMargin:'0px 0px -50px 0px',threshold:.08}).observe(el));
    const si=document.getElementById('stripImg');
    addEventListener('scroll',()=>{if(!si)return;const r=si.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0){const p=(innerHeight-r.top)/(innerHeight+r.height);si.style.transform=`translateY(${(p-.5)*40}px) scale(1.04)`}});