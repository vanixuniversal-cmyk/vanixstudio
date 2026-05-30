window.addEventListener('load',()=>{setTimeout(()=>document.getElementById('loader').classList.add('hidden'),2000)});
        const dot=document.getElementById('cursorDot'),ring=document.getElementById('cursorRing'),glow=document.getElementById('cursorGlow');
        let mx=0,my=0,rx=0,ry=0,gx=0,gy=0;
        document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
        document.querySelectorAll('a,button,.feature-card,.pricing-card,.vfx-showcase-item').forEach(el=>{el.addEventListener('mouseenter',()=>ring.classList.add('big'));el.addEventListener('mouseleave',()=>ring.classList.remove('big'))});
        (function anim(){dot.style.cssText=`left:${mx}px;top:${my}px`;rx+=(mx-rx)*0.12;ry+=(my-ry)*0.12;ring.style.cssText=`left:${rx}px;top:${ry}px`;gx+=(mx-gx)*0.06;gy+=(my-gy)*0.06;glow.style.cssText=`left:${gx}px;top:${gy}px`;requestAnimationFrame(anim)})();
        const canvas=document.getElementById('particlesCanvas'),ctx=canvas.getContext('2d');
        function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}resize();window.addEventListener('resize',resize);
        class P{constructor(){this.reset()}reset(){this.x=Math.random()*canvas.width;this.y=canvas.height+10;this.s=Math.random()*2+0.5;this.v=Math.random()*0.7+0.2;this.o=Math.random()*0.5+0.1;this.d=(Math.random()-0.5)*0.3}update(){this.y-=this.v;this.x+=this.d;if(this.y<-10)this.reset()}draw(){ctx.save();ctx.globalAlpha=this.o;ctx.fillStyle='var(--primary)';ctx.shadowColor='var(--primary)';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(this.x,this.y,this.s,0,Math.PI*2);ctx.fill();ctx.restore()}}
        const ptcls=Array.from({length:28},()=>{const p=new P();p.y=Math.random()*canvas.height;return p});
        (function animP(){ctx.clearRect(0,0,canvas.width,canvas.height);ptcls.forEach(p=>{p.update();p.draw()});requestAnimationFrame(animP)})();
        const navbar=document.getElementById('navbar'),scrollBarEl=document.getElementById('scrollBar'),backTop=document.getElementById('backTop');
        window.addEventListener('scroll',()=>{const s=window.scrollY,dh=document.documentElement.scrollHeight-window.innerHeight;navbar.classList.toggle('scrolled',s>50);scrollBarEl.style.width=(s/dh*100)+'%';backTop.classList.toggle('show',s>500)});
        backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
        document.getElementById('hamburger').addEventListener('click',()=>document.getElementById('navLinks').classList.toggle('active'));
        const allR=document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.reveal-scale');
        allR.forEach(el=>new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('active')}),{rootMargin:'0px 0px -60px 0px',threshold:0.08}).observe(el));
        const stripImg=document.getElementById('stripImg');
        window.addEventListener('scroll',()=>{if(!stripImg)return;const r=stripImg.getBoundingClientRect();if(r.top<window.innerHeight&&r.bottom>0){const p=(window.innerHeight-r.top)/(window.innerHeight+r.height);stripImg.style.transform=`translateY(${(p-0.5)*45}px) scale(1.05)`}});