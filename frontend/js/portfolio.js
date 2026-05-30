// ════════ PORTFOLIO PAGE SPECIFIC INTERACTIONS ════════

// 3D CARD TILT
document.querySelectorAll('.portfolio-item').forEach(card=>{
    card.addEventListener('mousemove',e=>{
        const r=card.getBoundingClientRect();
        const x=e.clientX-r.left,y=e.clientY-r.top;
        const cx2=r.width/2,cy2=r.height/2;
        card.style.transform=`perspective(1000px) rotateX(${(y-cy2)/25}deg) rotateY(${(cx2-x)/25}deg) translateY(-10px)`;
    });
    card.style.transform='';
    card.addEventListener('mouseleave',()=>card.style.transform='');
});

// PORTFOLIO FILTER SYSTEM
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Toggle active state on buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');

        portfolioItems.forEach(item => {
            const category = item.getAttribute('data-category');

            if (filterValue === 'all' || category === filterValue) {
                // Fade in
                item.classList.remove('hidden');
                item.classList.add('fade-in');
                setTimeout(() => item.classList.remove('fade-in'), 500);
            } else {
                // Hide
                item.classList.add('hidden');
            }
        });
    });
});

