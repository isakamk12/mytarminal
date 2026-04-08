document.addEventListener("DOMContentLoaded", () => {
    // 1. Scroll Animations (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Run once
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.page-flip-scroll');
    animatedElements.forEach(el => observer.observe(el));

    // 2. Navbar glass effect on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(10, 10, 15, 0.8)';
                navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
            } else {
                navbar.style.background = 'var(--glass-bg)';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // 3. Markdown rendering for article.html
    const articleContainer = document.getElementById('markdown-content');
    if (articleContainer) {
        // Extract filename from URL query params (e.g. ?file=xxx.md)
        const params = new URLSearchParams(window.location.search);
        const fileName = params.get('file');
        
        // If there's no file specified, assume it's statically generated and do nothing
        if (!fileName) {
            return;
        }

        // Set page title roughly based on filename without extension
        document.title = fileName.replace('.md', '') + ' | Akashi Isaka';

        fetch(fileName)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(text => {
                // Parse markdown to HTML using marked.js
                // Marked.js should be loaded in article.html
                if (typeof marked !== 'undefined') {
                    articleContainer.innerHTML = marked.parse(text);
                } else {
                    articleContainer.innerHTML = '<p class="error">Markdown parser is not loaded.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching markdown:', error);
                articleContainer.innerHTML = `<p class="error">ファイルの読み込みに失敗しました (${fileName})。サーバー環境で実行するか、ファイルが存在することを確認してください。</p>`;
            });
    }


    // --- Ink Stroke Canvas Effect ---
    const canvas = document.createElement('canvas');
    canvas.id = 'inkCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    });

    let points = [];
    const MAX_AGE = 30; // frames the ink stays alive

    window.addEventListener('mousemove', (e) => {
        points.push({ x: e.clientX, y: e.clientY, age: 0 });
    });

    function drawInk() {
        ctx.clearRect(0, 0, width, height);
        
        // Age all points
        for (let i = 0; i < points.length; i++) {
            points[i].age++;
        }
        
        if (points.length > 1) {
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = 1; i < points.length; i++) {
                const pt = points[i];
                const prevPt = points[i - 1];
                
                // Prevent drawing giant lines if mouse jumps off screen
                const dist = Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
                if (dist > 100) continue;
                
                const alpha = Math.max(0, 1 - (pt.age / MAX_AGE));
                ctx.beginPath();
                ctx.moveTo(prevPt.x, prevPt.y);
                ctx.lineTo(pt.x, pt.y);
                ctx.strokeStyle = `rgba(26, 26, 26, ${alpha})`;
                ctx.lineWidth = Math.max(0.1, 3 * alpha);
                ctx.stroke();
            }
        }
        
        // Remove old points
        points = points.filter(p => p.age <= MAX_AGE);
        
        requestAnimationFrame(drawInk);
    }
    
    drawInk();
});
