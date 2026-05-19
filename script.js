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

    // Base language selector for future translations.
    const languageSelector = document.querySelector('[data-language-selector]');
    if (languageSelector) {
        const savedLanguage = localStorage.getItem('archiveLanguage') || document.documentElement.lang || 'ja';
        const availableOption = languageSelector.querySelector(`option[value="${savedLanguage}"]`);
        if (availableOption) {
            languageSelector.value = savedLanguage;
        }

        languageSelector.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const selectedLanguage = event.target.value;
            localStorage.setItem('archiveLanguage', selectedLanguage);

            if (selectedOption && selectedOption.dataset.url) {
                window.location.href = selectedOption.dataset.url;
            }
        });
    }

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

    // ===== Book Transition Animation (Chapter 4) =====
    document.querySelectorAll('.shelf-grid .shelf-book-container').forEach(container => {
        if(!container.dataset.href) return;
        
        container.addEventListener('click', function(e) {
            e.preventDefault();
            const targetHref = this.dataset.href;
            
            // 既にアニメーション中なら無視
            if (document.getElementById('transition-book')) return;
            
            // クリックされたコンテナの位置とサイズを取得
            const rect = this.getBoundingClientRect();
            
            // クローンを作成
            const clone = this.cloneNode(true);
            clone.id = 'transition-book';
            
            // クローンの初期位置を元要素と完全に一致させる
            clone.style.top = rect.top + 'px';
            clone.style.left = rect.left + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.margin = '0';
            clone.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
            
            // 元の要素を非表示にしてクローンをbodyに追加
            this.style.opacity = '0';
            document.body.appendChild(clone);
            
            // フラッシュ用要素
            const flash = document.createElement('div');
            flash.id = 'transition-flash';
            document.body.appendChild(flash);
            
            // アニメーションシーケンス
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // 1: 手前に大きく引き出す
                    clone.classList.add('stage1');
                    
                    // 2: クルッと回って表紙を見せる
                    setTimeout(() => {
                        clone.classList.add('stage2');
                    }, 600);
                    
                    // 3: 表紙がパカッと開く
                    setTimeout(() => {
                        clone.classList.add('stage3');
                    }, 1400);

                    // 3.5: 開き始めてすぐ(0.15秒後)にフラッシュを発動し、裏側の鏡文字を隠す
                    setTimeout(() => {
                        flash.classList.add('active');
                    }, 1550);
                    
                    // 4: 遷移
                    setTimeout(() => {
                        window.location.href = targetHref;
                    }, 2100);
                });
            });
        });
    });

    // ===== Evidence Board (Chapter 2) =====
    const evidenceItems = document.querySelectorAll('.evidence-item');
    if (evidenceItems.length > 0) {
        const overlay = document.createElement('div');
        overlay.id = 'evidence-overlay';
        document.body.appendChild(overlay);

        let activeClone = null;
        let activeOriginal = null;

        evidenceItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (activeClone) {
                    activeClone.remove();
                    if (activeOriginal) activeOriginal.style.opacity = '1';
                    activeClone = null;
                    activeOriginal = null;
                    overlay.classList.remove('active');
                    return;
                }

                activeOriginal = this;
                const rect = this.getBoundingClientRect();

                // クローンを作成して初期位置を元の要素の画面上の位置と完全に一致させる
                activeClone = this.cloneNode(true);
                activeClone.style.position = 'fixed';
                activeClone.style.margin = '0';
                activeClone.style.top = rect.top + 'px';
                activeClone.style.left = rect.left + 'px';
                // 固有のインラインtransform（rotateなど）はそのまま引き継ぐ
                
                document.body.appendChild(activeClone);
                
                // 元の要素を一時的に非表示にする
                this.style.opacity = '0';
                overlay.classList.add('active');

                // レンダリングを待ってからactiveクラスを付与し、画面中央へのアニメーションを発動
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        activeClone.classList.add('active');
                    });
                });

                activeClone.addEventListener('click', () => {
                    if(activeClone) {
                        activeClone.classList.remove('active');
                        // 閉じる際もアニメーションさせるため、少し待ってから削除
                        setTimeout(() => {
                            if(activeClone) activeClone.remove();
                            if(activeOriginal) activeOriginal.style.opacity = '1';
                            activeClone = null;
                            activeOriginal = null;
                        }, 400);
                    }
                    overlay.classList.remove('active');
                });
            });
        });

        overlay.addEventListener('click', () => {
            if(activeClone) {
                activeClone.classList.remove('active');
                setTimeout(() => {
                    if(activeClone) activeClone.remove();
                    if(activeOriginal) activeOriginal.style.opacity = '1';
                    activeClone = null;
                    activeOriginal = null;
                }, 400);
            }
            overlay.classList.remove('active');
        });
    }

    // ===== Tap-to-zoom images (same overlay mechanism as Chapter 2) =====
    const zoomLinks = document.querySelectorAll('.humanity-gallery a[data-zoom]');
    const overlayForZoom = document.getElementById('evidence-overlay');
    if (zoomLinks.length > 0 && overlayForZoom) {
        let activeZoomClone = null;
        let activeZoomOriginal = null;

        const closeZoom = () => {
            if (activeZoomClone) {
                activeZoomClone.classList.remove('active');
                setTimeout(() => {
                    if (activeZoomClone) activeZoomClone.remove();
                    if (activeZoomOriginal) activeZoomOriginal.style.opacity = '1';
                    activeZoomClone = null;
                    activeZoomOriginal = null;
                }, 400);
            }
            overlayForZoom.classList.remove('active');
        };

        zoomLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const img = this.querySelector('img');
                if (!img) return;

                e.preventDefault();
                e.stopPropagation();

                if (activeZoomClone) {
                    closeZoom();
                    return;
                }

                activeZoomOriginal = img;
                const rect = img.getBoundingClientRect();

                activeZoomClone = img.cloneNode(true);
                activeZoomClone.classList.add('zoom-image-clone');
                activeZoomClone.style.position = 'fixed';
                activeZoomClone.style.margin = '0';
                activeZoomClone.style.top = rect.top + 'px';
                activeZoomClone.style.left = rect.left + 'px';
                activeZoomClone.style.width = rect.width + 'px';
                activeZoomClone.style.height = rect.height + 'px';

                document.body.appendChild(activeZoomClone);

                img.style.opacity = '0';
                overlayForZoom.classList.add('active');

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        activeZoomClone.classList.add('active');
                    });
                });

                activeZoomClone.addEventListener('click', closeZoom);
            });
        });

        overlayForZoom.addEventListener('click', () => {
            if (activeZoomClone) closeZoom();
        });
    }
});
