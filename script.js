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
        const normalizeLanguage = (lang) => {
            const map = {
                de: 'de-DE',
                en: 'en-US'
            };
            return map[lang] || lang;
        };

        const rawSavedLanguage = localStorage.getItem('archiveLanguage') || document.documentElement.lang || 'ja';
        const savedLanguage = normalizeLanguage(rawSavedLanguage);
        const availableOption = languageSelector.querySelector(`option[value="${savedLanguage}"]`);
        if (availableOption) {
            languageSelector.value = savedLanguage;
        }

        languageSelector.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions && event.target.selectedOptions[0];
            const selectedLanguage = normalizeLanguage(event.target.value);
            localStorage.setItem('archiveLanguage', selectedLanguage);

            const targetHref = selectedOption && selectedOption.dataset && selectedOption.dataset.url;
            if (targetHref) {
                window.location.href = targetHref;
                return;
            }
            loadTranslations(selectedLanguage);
        });

        // ---------------- i18n logic ----------------
        const hasI18nTargets = Boolean(document.querySelector('[data-i18n], [data-i18n-title]'));
        let currentTranslations = {};

        async function loadTranslations(lang) {
            if (!hasI18nTargets) return;
            try {
                if (window.__LOCALES__ && window.__LOCALES__[lang]) {
                    currentTranslations = window.__LOCALES__[lang];
                    applyTranslations();
                    document.documentElement.lang = lang;
                    return;
                }

                const candidates = [
                    `locales/${lang}.json`,
                    `../locales/${lang}.json`,
                    `../../locales/${lang}.json`
                ];

                let loaded = false;
                for (const path of candidates) {
                    const response = await fetch(path);
                    if (response.ok) {
                        currentTranslations = await response.json();
                        loaded = true;
                        break;
                    }
                }

                if (!loaded) throw new Error("Locale not found");
                applyTranslations();
                document.documentElement.lang = lang;
            } catch (err) {
                console.error("Failed to load translations for", lang, err);
            }
        }

        function getNestedTranslation(obj, path) {
            return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        }

        function applyTranslations() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = getNestedTranslation(currentTranslations, key);
                if (translation) {
                    if (el.tagName === 'TITLE') {
                        document.title = translation;
                    } else {
                        el.innerHTML = translation; // using innerHTML in case of embedded br tags
                    }
                }
            });
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                const translation = getNestedTranslation(currentTranslations, key);
                if (translation) {
                    el.setAttribute('title', translation);
                }
            });
        }
        
        // Initial load (only when the page actually uses i18n keys)
        if (hasI18nTargets) {
            loadTranslations(savedLanguage);
        }
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

    // ===== Reading Progress Bar =====
    const progressBar = document.querySelector('.reading-progress-bar');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (scrollHeight > 0) {
                const scrollPercent = (scrollTop / scrollHeight) * 100;
                progressBar.style.width = scrollPercent + '%';
            }
        });
    }
});
