        /* =========================================================
         * Stellar Gravity
         * ========================================================= */
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

        const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;
        // Pause Elements
        const hudPauseBtn = document.getElementById("hud-pause-btn");
        const pauseResumeBtn = document.getElementById("pause-resume-btn");
        const pauseQuitBtn = document.getElementById("pause-quit-btn");
        const pauseOverlay = document.getElementById("pause-overlay");
        const bgmToggleBtn = document.getElementById("bgm-toggle");
        const {
            forceStopBGM,
            init: initAudio,
            isBgmEnabled,
            pauseCurrentAudio,
            prepareAudioPlayback,
            playBGM,
            playBlackHoleSound,
            playClearBgm,
            playExplosionSound,
            playNameBGM,
            playSuctionSound,
            playTitleBGM,
            resumeCurrentAudio,
            stopBGM
        } = window.StellarAudio;
        const {
            checkGameOverCondition,
            drawBackground,
            drawCore,
            drawLauncher,
            drawPlanet,
            drawRedZone,
            generateStars,
            initNextCanvas,
            manageParticles,
            spawnSparks,
            triggerSupernovaAt
        } = window.StellarRender;
        const {
            combo: COMBO_CONFIG,
            core: CORE_CONFIG,
            effects: EFFECTS_CONFIG,
            gameplay: GAMEPLAY_CONFIG,
            planets: PLANETS,
            progression: PROGRESSION_CONFIG,
            render: RENDER_CONFIG,
            system: SYSTEM_CONFIG,
            timer: TIMER_CONFIG
        } = window.StellarConfig;

        /* Game State */
        let isClearing = false;
        let isPaused = false;
        const START_STAGE = GAMEPLAY_CONFIG.startStage;

        let WIDTH = window.innerWidth;
        let HEIGHT = window.innerHeight;
        let CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

        const DEADLINE_RADIUS = GAMEPLAY_CONFIG.deadlineRadius;
        const SPAWN_RADIUS = GAMEPLAY_CONFIG.spawnRadius;

        const CORE_DEFAULT = CORE_CONFIG.defaultRadius;
        const CORE_MAX = CORE_CONFIG.maxRadius;
        const CORE_GROW = CORE_CONFIG.growPerStage;
        let CORE_RADIUS = Math.min(CORE_MAX, CORE_DEFAULT + CORE_GROW * (START_STAGE - 1));

        let pendingCoreBoost = false;
        let isContinue = false;

        let isBoosting = false;
        const ROTATE_BASE_SPEED = RENDER_CONFIG.rotateBaseSpeed;
        const ROTATE_BOOST_MULT = RENDER_CONFIG.rotateBoostMultiplier;
        const STAR_BOOST_MULT = RENDER_CONFIG.starBoostMultiplier;

        let clearCount = 0;
        let difficulty = 1.0;
        const DIFF_STEP = PROGRESSION_CONFIG.difficultyStep;
        const DIFF_MAX = PROGRESSION_CONFIG.difficultyMax;

        let shotTimer = null;
        let shotTimeLimit = 0;

        const TIMER_MAX_SEC = TIMER_CONFIG.maxSeconds;
        const TIMER_MID_SEC = TIMER_CONFIG.midSeconds;
        const TIMER_MIN_SEC = TIMER_CONFIG.minSeconds;

        let barAnimId = null;
        let timerStartTime = 0;

        let stage = START_STAGE;
        document.getElementById("stage-val").innerText = stage;

        let hiStage = localStorage.getItem("stellarGravity_hiStage") || 1;
        document.getElementById("hi-stage-val").innerText = hiStage;

        let engine, render, runner;

        let score = 0;
        let hiScore = localStorage.getItem("stellarGravity_hiScore") || 0;

        let isGameRunning = false;
        let isClickable = true;
        let nextQueue = [];
        let launcherAngle = -Math.PI / 2;

        let gameOverTime = null;
        let particles = [];
        let bgStars = [];
        let starCanvas = null;
        let staticStarAngle = 0;

        let implosionScale = 1.0;
        let implosionAlpha = 1.0;
        let isImploding = false;

        const CLEAR_INDEX = PLANETS.length - 1;
        let isBlackHoleCore = false;

        let lastMergeTime = 0;
        let comboCount = 0;

        function onClear() {
            clearCount++;
            difficulty = Math.min(DIFF_MAX, 1.0 + clearCount * DIFF_STEP);
        }

        /* Shot Timer */
        function startShotTimer() {
            const container = document.getElementById("timer-bar-container");
            const fill = document.getElementById("timer-bar-fill");

            if (!container || !fill) return;

            if (shotTimer) {
                clearTimeout(shotTimer);
                shotTimer = null;
            }
            if (barAnimId) {
                cancelAnimationFrame(barAnimId);
                barAnimId = null;
            }

            if (!isGameRunning || isPaused) {
                container.style.display = "none";
                return;
            }

            if (stage <= TIMER_CONFIG.midStageStart) {
                shotTimeLimit = TIMER_MAX_SEC - (stage - 1) * TIMER_CONFIG.earlyStageStepSeconds;
            } else {
                shotTimeLimit = Math.max(TIMER_MIN_SEC, TIMER_MID_SEC - (stage - TIMER_CONFIG.midStageStart) * TIMER_CONFIG.lateStageStepSeconds);
            }

            const nextPlanetIndex = nextQueue.length > 1 ? nextQueue[1] : nextQueue[0];
            const nextPlanetColor = PLANETS[nextPlanetIndex].color;

            container.style.display = "block";
            fill.style.width = "100%";
            fill.style.opacity = "1";
            fill.style.background = nextPlanetColor;
            fill.style.boxShadow = `0 0 10px ${nextPlanetColor}`;

            timerStartTime = Date.now();

            shotTimer = setTimeout(() => {
                if (isGameRunning && isClickable && !isPaused) {
                    shoot();
                }
            }, shotTimeLimit * 1000);

            function updateBar() {
                if (!isGameRunning || isPaused) return;

                const elapsed = (Date.now() - timerStartTime) / 1000;
                const remainingRatio = Math.max(0, 1 - (elapsed / shotTimeLimit));
                const remainingSec = shotTimeLimit * remainingRatio;

                fill.style.width = (remainingRatio * 100) + "%";

                if (remainingRatio < 0.25 || remainingSec < 3.0) {
                    const blink = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
                    fill.style.background = "#ff0000";
                    fill.style.boxShadow = `0 0 15px #ff0000`;
                    fill.style.opacity = blink;
                } else {
                    fill.style.background = nextPlanetColor;
                    fill.style.boxShadow = `0 0 10px ${nextPlanetColor}`;
                    fill.style.opacity = "1";
                }

                if (remainingRatio > 0) {
                    barAnimId = requestAnimationFrame(updateBar);
                }
            }
            barAnimId = requestAnimationFrame(updateBar);
        }

        function requestFullScreen() {
            const el = document.documentElement;
            if (el.requestFullscreen) {
                el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            } else if (isIOS) {
                window.scrollTo(0, 0);
            }
        }

        function returnToTitle() {
            Runner.stop(runner);

            isGameRunning = false;
            isPaused = false;
            isClickable = false;
            isContinue = false;
            isClearing = false;
            isBlackHoleCore = false;
            pendingCoreBoost = false;
            gameOverTime = null;
            comboCount = 0;
            lastMergeTime = 0;
            particles.length = 0;
            implosionScale = 1.0;
            implosionAlpha = 1.0;
            isImploding = false;

            forceStopBGM();

            Composite.clear(engine.world, false);
            Runner.run(runner, engine);

            const overlay = document.getElementById("overlay");
            overlay.classList.remove("hide");

            document.querySelector("#overlay h1").innerHTML = "STELLAR<br>GRAVITY";
            document.getElementById("start-btn").textContent = "START";
            document.getElementById("clear-message").style.display = "none";
            document.getElementById("name-input-area").style.display = "none";

            const clearHiBtn = document.getElementById("clear-hi-btn");
            if (clearHiBtn) clearHiBtn.style.display = "";

            bgmToggleBtn.style.pointerEvents = "auto";
            bgmToggleBtn.style.opacity = "0.75";

            updateResetButtonVisibility();
        }

        function showTitleScreen() {
            returnToTitle();
            if (isBgmEnabled()) {
                playTitleBGM();
            }
        }

        document.getElementById("hi-score-val").innerText = hiScore;

        const STAR_COUNT = RENDER_CONFIG.starCount;
        const STAR_SIZE_MIN = RENDER_CONFIG.starSizeMin;
        const STAR_SIZE_MAX = RENDER_CONFIG.starSizeMax;


        /* =========================================================
         * Refactored Initialization & Loops
         * ========================================================= */

        // ---------------------------------------------------------
        // 1. Helper Functions (Moved out from preInit)
        // ---------------------------------------------------------

        function removeAllDynamicBodies() {
            const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic);
            if (bodies.length) Composite.remove(engine.world, bodies);
        }

        /* --- 修正版: スペーシーな演出に変更した triggerSupernovaAt --- */
        // ---------------------------------------------------------
        // 2. Physics & Engine Setup
        // ---------------------------------------------------------
        function initPhysics() {
            bgStars = generateStars({
                deadZoneRadius: DEADLINE_RADIUS,
                height: HEIGHT,
                starCount: STAR_COUNT,
                starSizeMax: STAR_SIZE_MAX,
                starSizeMin: STAR_SIZE_MIN,
                width: WIDTH
            });

            engine = Engine.create({
                gravity: { x: 0, y: 0, scale: 0 },
                enableSleeping: false
            });

            render = Render.create({
                element: document.getElementById("canvas-container"),
                engine: engine,
                options: {
                    width: WIDTH,
                    height: HEIGHT,
                    wireframes: false,
                    background: "transparent"
                }
            });

            Render.run(render);
            runner = Runner.create({
                isFixed: true,
                delta: 1000 / 60
            });
            Runner.run(runner, engine);
        }

        // ---------------------------------------------------------
        // 3. Game Logic Events (Gravity & Collision)
        // ---------------------------------------------------------
        function setupGameLogic() {
            // [Gravity] - Pull objects to center
            Events.on(engine, "beforeUpdate", () => {
                Composite.allBodies(engine.world).forEach(b => {
                    if (b.isStatic) return;
                    // Remove if out of bounds
                    if (Math.abs(b.position.x - CENTER.x) > WIDTH || Math.abs(b.position.y - CENTER.y) > HEIGHT) {
                        Composite.remove(engine.world, b);
                        return;
                    }
                    const dx = CENTER.x - b.position.x;
                    const dy = CENTER.y - b.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const force = GAMEPLAY_CONFIG.gravityForceScale * b.mass;
                    Body.applyForce(b, b.position, { x: (dx / dist) * force, y: (dy / dist) * force });
                });
            });

            // [Collision] - Merge planets
            Events.on(engine, "collisionStart", (e) => {
                if (!isGameRunning || isClearing) return;
                e.pairs.forEach(p => {
                    const a = p.bodyA;
                    const b = p.bodyB;
                    if (a.index === undefined || b.index === undefined || a.isMerging || b.isMerging) return;
                    if (a.index !== b.index || a.index >= PLANETS.length - 1) return;

                    // Execute Merge
                    a.isMerging = true;
                    b.isMerging = true;
                    const mid = { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 };

                    // ★修正箇所: 変数の定義(nI, nP)を先に持ってくる
                    const nI = a.index + 1;
                    const nP = PLANETS[nI];

                    Composite.remove(engine.world, [a, b]);
                    playExplosionSound();

                    // Push neighbors
                    const allBodies = Composite.allBodies(engine.world);
                    allBodies.forEach(body => {
                        if (body.isStatic || body.isMerging) return;
                        const dx = body.position.x - mid.x;
                        const dy = body.position.y - mid.y;
                        const distSq = dx * dx + dy * dy;
                        const forceRadius = GAMEPLAY_CONFIG.mergePushRadius;
                        if (distSq < forceRadius * forceRadius) {
                            const dist = Math.sqrt(distSq);
                            const forceMagnitude = GAMEPLAY_CONFIG.mergePushForceScale * body.mass;
                            Body.applyForce(body, body.position, { x: (dx / dist) * forceMagnitude, y: (dy / dist) * forceMagnitude });
                        }
                    });

                    // Effects
                    particles.push({ type: "shockwave", x: mid.x, y: mid.y, radius: 10, speed: 5, life: 1 });
                    for (let i = 0; i < 12; i++) {
                        const ang = Math.random() * Math.PI * 2;
                        const s = Math.random() * 4 + 2;
                        particles.push({ x: mid.x, y: mid.y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, life: 1, color: nP.color, size: 3 });
                    }

                    // Score & Combo
                    const now = Date.now();
                    if (now - lastMergeTime < COMBO_CONFIG.comboWindowMs) comboCount++;
                    else comboCount = 0;
                    lastMergeTime = now;

                    const comboBonus = 1 + (comboCount * COMBO_CONFIG.bonusStep);
                    const points = nI === CLEAR_INDEX ? EFFECTS_CONFIG.supernovaBonus : nP.score;
                    updateScore(Math.floor(points * comboBonus));
                    showComboText(mid.x, mid.y, comboCount);

                    // Create Next Body or Clear
                    setTimeout(() => {
                        if (nI === CLEAR_INDEX) {
                            if (isClearing) return;
                            isClearing = true;
                            isBlackHoleCore = true;
                            isGameRunning = false;
                            isClickable = false;
                            triggerSupernovaAt(mid.x, mid.y, "#ffffff");
                            setTimeout(removeAllDynamicBodies, EFFECTS_CONFIG.supernovaClearDelayMs);
                            setTimeout(triggerGameClear, EFFECTS_CONFIG.supernovaEndDelayMs);
                        } else {
                            const nb = Bodies.circle(mid.x, mid.y, nP.radius, {
                                index: nI,
                                restitution: 0.4,
                                friction: 0.8,
                                frictionAir: 0.02,
                                render: { visible: false }
                            });
                            Composite.add(engine.world, nb);
                        }
                    }, 40);
                });
            });
        }

        // ---------------------------------------------------------
        // 4. Drawing / Render Loop functions
        // ---------------------------------------------------------
        // NEXT表示用のコンテキスト
        let nextCtx = null;

        function setupRenderLoop() {
            Events.on(render, "afterRender", () => {
                const ctx = render.context;
                const now = Date.now();
                const t = performance.now();

                // Update Game Logic (Rotation)
                if (isGameRunning && !isPaused) {
                    const base = ROTATE_BASE_SPEED * difficulty;
                    const speed = isBoosting ? base * ROTATE_BOOST_MULT : base;
                    launcherAngle += speed;
                }

                // Update UI Text
                if (nextQueue.length >= 2) {
                    const nextPlanet = PLANETS[nextQueue[1]];
                    const nextNameEl = document.getElementById("next-name");
                    if (nextNameEl) {
                        nextNameEl.textContent = nextPlanet.name;
                        nextNameEl.style.color = nextPlanet.color;
                    }
                }

                // --- Draw Sequence ---
                drawBackground(ctx, {
                    bgStars,
                    center: CENTER,
                    getStaticStarAngle: () => staticStarAngle,
                    isBoosting,
                    isPaused,
                    setStaticStarAngle: (value) => { staticStarAngle = value; },
                    starBoostMult: STAR_BOOST_MULT
                });

                ctx.globalAlpha = 1;

                const isOverlayVisible = !document.getElementById("overlay").classList.contains("hide");

                if (!isOverlayVisible) {
                    const isWarning = gameOverTime !== null;
                    drawRedZone(ctx, { center: CENTER, deadlineRadius: DEADLINE_RADIUS, isWarning, time: t });
                    drawCore(ctx, now, {
                        center: CENTER,
                        coreRadius: CORE_RADIUS,
                        implosionAlpha,
                        implosionScale,
                        isBlackHoleCore,
                        isImploding
                    });
                }

                if (!isOverlayVisible) {
                    spawnSparks({
                        center: CENTER,
                        deadlineRadius: DEADLINE_RADIUS,
                        isBoosting,
                        isIOS,
                        isPaused,
                        isWarning: gameOverTime !== null,
                        particles
                    });
                }

                // Draw Existing Planets
                Composite.allBodies(engine.world).forEach(b => {
                    if (!b.isStatic && b.index !== undefined) {
                        drawPlanet(ctx, b.position.x, b.position.y, b.circleRadius, PLANETS[b.index].color, now, b.id);
                    }
                });

                drawLauncher(ctx, now, {
                    center: CENTER,
                    isClickable,
                    isGameRunning,
                    launcherAngle,
                    nextCtx,
                    nextQueue,
                    planets: PLANETS,
                    spawnRadius: SPAWN_RADIUS
                });
                manageParticles(ctx, {
                    height: HEIGHT,
                    isIOS,
                    isPaused,
                    maxParticlesDesktop: RENDER_CONFIG.maxParticlesDesktop,
                    maxParticlesMobile: RENDER_CONFIG.maxParticlesMobile,
                    particles,
                    width: WIDTH
                });
                checkGameOverCondition({
                    bodies: Composite.allBodies(engine.world),
                    center: CENTER,
                    deadlineRadius: DEADLINE_RADIUS,
                    gameOverDelayMs: GAMEPLAY_CONFIG.gameOverDelayMs,
                    gameOverTime,
                    isGameRunning,
                    isPaused,
                    now,
                    setGameOverTime: (value) => { gameOverTime = value; },
                    triggerGameOver
                });
            });
        }

        // ---------------------------------------------------------
        // 5. Main Init Function (Simplified)
        // ---------------------------------------------------------
        function preInit() {
            initPhysics();
            nextCtx = initNextCanvas(document.getElementById("next-ui"));
            setupGameLogic();
            setupRenderLoop();
        }

        /* Controls */
        const boostBtn = document.getElementById("boost-btn");
        const clearHiBtn = document.getElementById("clear-hi-btn");

        // ▼▼▼ 追加: システムの右クリック/長押しメニューを完全にブロック ▼▼▼
        boostBtn.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);

        boostBtn.addEventListener("mousedown", (e) => { e.stopPropagation(); isBoosting = true; });
        boostBtn.addEventListener("mouseup", (e) => { e.stopPropagation(); isBoosting = false; });
        boostBtn.addEventListener("mouseleave", () => { isBoosting = false; });
        boostBtn.addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); isBoosting = true; }, { passive: false });
        boostBtn.addEventListener("touchend", (e) => { e.preventDefault(); e.stopPropagation(); isBoosting = false; }, { passive: false });
        boostBtn.addEventListener("touchcancel", () => { isBoosting = false; });

        window.addEventListener("keydown", (e) => {
            if (isPaused) return;
            if (e.code === "Space") { e.preventDefault(); isBoosting = true; }
            if (e.code === "Enter" || e.code === "ArrowUp") {
                e.preventDefault();
                if (isGameRunning && document.getElementById("overlay").classList.contains("hide")) {
                    shoot(e);
                }
            }
        });

        window.addEventListener("keyup", (e) => {
            if (e.code === "Space") isBoosting = false;
        });

        setInterval(() => {
            boostBtn.style.boxShadow = isBoosting ? "0 0 20px rgba(79,172,254,0.9)" : "none";
        }, RENDER_CONFIG.boostGlowIntervalMs);

        function updateScore(points) {
            score += points;
            const scoreEl = document.getElementById("score-val"); // 要素を取得
            scoreEl.innerText = score;

            // ▼▼▼ 追加: アニメーションクラスの付け外し ▼▼▼
            scoreEl.classList.remove("score-bounce"); // 一旦外す（連打対応）
            void scoreEl.offsetWidth; // リフローを強制してアニメーションをリセット
            scoreEl.classList.add("score-bounce"); // 再度付与

            if (score > hiScore) {
                hiScore = score;
                document.getElementById("hi-score-val").innerText = hiScore;
                localStorage.setItem("stellarGravity_hiScore", hiScore);
            }
        }

        function showComboText(x, y, count) {
            if (count < 1) return;
            const comboEl = document.createElement("div");
            comboEl.innerHTML = `<div style="font-size: 18px; letter-spacing: 5px; font-weight: 200;">COMBO +${count + 1}</div>`;
            comboEl.style.position = "fixed";
            comboEl.style.left = `${x}px`;
            comboEl.style.top = `${y - 40}px`;
            comboEl.style.textAlign = "center";
            comboEl.style.color = "#ffffff";
            comboEl.style.fontFamily = "'Orbitron', sans-serif";
            comboEl.style.fontWeight = "bold";
            comboEl.style.textShadow = "0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.3)";
            comboEl.style.pointerEvents = "none";
            comboEl.style.zIndex = "2000";
            comboEl.style.transform = "translateX(-50%)";
            comboEl.style.transition = "transform 2.0s cubic-bezier(0.16, 1, 0.3, 1), opacity 2.0s ease-out";
            document.body.appendChild(comboEl);
            if (Array.isArray(particles)) {
                for (let i = 0; i < COMBO_CONFIG.dustCount; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const sp = Math.random() * 4 + 2;
                    particles.push({ x, y: y - 40, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.0, color: "#ffffff", size: Math.random() * 2 + 1, type: "combo-dust" });
                }
            }
            setTimeout(() => {
                comboEl.style.transform = "translate(-50%, -100px)";
                comboEl.style.opacity = "0";
            }, 20);
            setTimeout(() => comboEl.remove(), 2100);
        }

        function triggerGameOver() {

            stopBGM();


            document.getElementById("clear-message").style.display = "none";
            isGameRunning = false;
            isContinue = false;
            document.getElementById("stage-val").innerText = stage;
            document.getElementById("overlay").classList.remove("hide");
            bgmToggleBtn.style.pointerEvents = "auto";
            bgmToggleBtn.style.opacity = "0.75";
            document.querySelector("#overlay h1").innerHTML = "GAME OVER";
            document.getElementById("start-btn").textContent = "START";

            // ▼▼▼ 追加: ランキング用処理 ▼▼▼
            window.finalScore = score;
            window.finalStage = stage;

            // 1. 先に名前入力欄を表示状態にする (重要)
            document.getElementById("name-input-area").style.display = "flex";

        

            // ★追加: ここで順位を計算して表示！
            if (typeof window.displayMyRank === "function") {
                window.displayMyRank(score);
            }

            const submitBtn = document.getElementById("submit-score-btn");
            submitBtn.disabled = false;
            submitBtn.textContent = "SUBMIT SCORE";
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            // 2. 最後に表示切替関数を呼ぶ
            updateResetButtonVisibility();

            if (isBgmEnabled()) {
                playNameBGM();
            } else {
                forceStopBGM(); // 設定がOFFなら確実に殺す
            }
        }

        function triggerGameClear() {
            onClear();
            isClearing = true;
            isGameRunning = false;
            isContinue = true;
            pendingCoreBoost = true;
            setTimeout(() => {
                const overlay = document.getElementById("overlay");
                const titleH1 = document.querySelector("#overlay h1");
                const startBtn = document.getElementById("start-btn");
                const clearMsg = document.getElementById("clear-message");
                if (overlay) {
                    overlay.classList.remove("hide");
                    titleH1.innerHTML = "STAGE " + stage + "<br>CLEAR";
                    startBtn.textContent = "NEXT";
                    if (clearMsg) {
                        clearMsg.innerHTML = "The core has collapsed<br>into a Black Hole.<br><br>A new star system awaits.";
                        clearMsg.style.display = "block";
                    }
                    updateResetButtonVisibility();
                    playClearBgm();
                }
            }, EFFECTS_CONFIG.supernovaEndDelayMs);
        }

        function shoot(e) {
            if (isPaused) return;
            if (!isGameRunning || !isClickable || !document.getElementById("overlay").classList.contains("hide")) return;
            isClickable = false;
            const nI = nextQueue.shift();
            nextQueue.push(Math.floor(Math.random() * 4));
            playSuctionSound();
            const sX = CENTER.x + Math.cos(launcherAngle) * SPAWN_RADIUS;
            const sY = CENTER.y + Math.sin(launcherAngle) * SPAWN_RADIUS;
            const b = Bodies.circle(sX, sY, PLANETS[nI].radius, {
                index: nI,
                restitution: 0.2,
                friction: 0.8,
                frictionAir: isBoosting ? 0.008 : 0.02,
                render: { visible: false }
            });
            const BASE_SPEED = GAMEPLAY_CONFIG.shootBaseSpeed * difficulty;
            const BOOST_DRIFT = isBoosting ? GAMEPLAY_CONFIG.shootBoostDrift : 0;
            const vxC = -Math.cos(launcherAngle);
            const vyC = -Math.sin(launcherAngle);
            const vxT = -Math.sin(launcherAngle);
            const vyT = Math.cos(launcherAngle);
            const vx = (vxC + vxT * BOOST_DRIFT) * BASE_SPEED;
            const vy = (vyC + vyT * BOOST_DRIFT) * BASE_SPEED;
            Body.setVelocity(b, { x: vx, y: vy });
            Composite.add(engine.world, b);
            setTimeout(() => { isClickable = true; }, GAMEPLAY_CONFIG.clickableResetDelayMs);
            startShotTimer();
        }

        preInit();
        updateResetButtonVisibility();

        document.getElementById("start-btn").addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();

            // ▼▼▼ 追加: ゲーム開始時に入力欄を隠す処理 ▼▼▼
            const nameInputArea = document.getElementById("name-input-area");
            if (nameInputArea) nameInputArea.style.display = "none";
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            requestFullScreen();

            prepareAudioPlayback().catch(() => {});

            forceStopBGM();
            if (runner) { Runner.stop(runner); Runner.run(runner, engine); }
            if (isPaused) isPaused = false;
            document.getElementById("clear-message").style.display = "none";
            isClearing = false;
            isBlackHoleCore = false;
            gameOverTime = null;
            const startBtn = document.getElementById("start-btn");
            const isNext = startBtn.textContent === "NEXT";
            if (isNext) {
                stage++;
                if (stage > hiStage) {
                    hiStage = stage;
                    document.getElementById("hi-stage-val").innerText = hiStage;
                    localStorage.setItem("stellarGravity_hiStage", hiStage);
                }
            } else {
                stage = START_STAGE;
                score = 0;
                clearCount = 0;
                difficulty = 1.0;
                CORE_RADIUS = CORE_DEFAULT;
                document.getElementById("score-val").innerText = "0";
            }

            CORE_RADIUS = Math.min(CORE_MAX, CORE_DEFAULT + CORE_GROW * (stage - 1));

            document.getElementById("stage-val").innerText = stage;
            document.getElementById("overlay").classList.add("hide");

            // 安全なリセット処理
            Composite.clear(engine.world, false);
            Composite.add(engine.world, Bodies.circle(CENTER.x, CENTER.y, CORE_RADIUS, { isStatic: true, render: { visible: false } }));

            nextQueue = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
            const currentPlanet = PLANETS[nextQueue[1]];
            const nameEl = document.getElementById("next-name");
            if (nameEl) {
                nameEl.textContent = currentPlanet.name;
                nameEl.style.color = currentPlanet.color;
            }
            isClickable = true;
            isGameRunning = true;
            updateResetButtonVisibility();
            playBGM();
            startShotTimer();
        });

        function updateResetButtonVisibility() {
            // 変数取得
            const uiLayer = document.getElementById("ui-layer");
            const boostButton = document.getElementById("boost-btn");
            const bottomRightUi = document.getElementById("bottom-right-ui");
            const pBtn = document.getElementById("hud-pause-btn");
            const bPos = document.getElementById("bgm-control-pos");
            const stageUi = document.getElementById("stage-ui");

            // サブボタン群
            const clearHiBtn = document.getElementById("clear-hi-btn");
            const soundtrackBtn = document.getElementById("soundtrack-btn");
            const showRankingBtn = document.getElementById("show-ranking-btn");
            const hint = document.getElementById("controls-hint");
            const startBtn = document.getElementById("start-btn");
            const nameArea = document.getElementById("name-input-area");

            if (isGameRunning) {
                // --- ゲームプレイ中 ---
                if (uiLayer) uiLayer.style.display = "flex";
                if (boostButton) boostButton.style.display = "flex";
                if (bottomRightUi) bottomRightUi.style.display = "flex";
                if (pBtn) pBtn.style.display = "flex"; // PAUSEボタン表示
                if (bPos) bPos.style.display = "none"; // BGMボタン非表示
                if (stageUi) stageUi.classList.remove("ui-faded");
            } else {
                // --- ゲーム停止中 ---
                if (uiLayer) uiLayer.style.display = "none";
                if (boostButton) boostButton.style.display = "none";
                if (bottomRightUi) bottomRightUi.style.display = "none";
                if (pBtn) pBtn.style.display = "none"; // PAUSEボタン非表示
                if (bPos) bPos.style.display = "block"; // BGMボタン表示
                if (stageUi) stageUi.classList.add("ui-faded");

                // タイトル画面UIの制御
                const isStageClear = isContinue;
                const isGameOverInput = (nameArea && nameArea.style.display === "flex");
                const titleElementsStyle = (isStageClear || isGameOverInput) ? "none" : "block";

                if (clearHiBtn) clearHiBtn.style.display = titleElementsStyle;
                if (soundtrackBtn) soundtrackBtn.style.display = titleElementsStyle;
                if (showRankingBtn) showRankingBtn.style.display = titleElementsStyle;
                if (hint) hint.style.display = titleElementsStyle;

                if (startBtn) {
                    startBtn.style.display = isGameOverInput ? "none" : "block";
                }
            }
        }


        /* =========================================================
         * PAUSE LOGIC (Modified)
         * ========================================================= */

        function togglePause(shouldPause) {
            // 状態が変わらない場合は何もしない
            if (isPaused === shouldPause) return;

            isPaused = shouldPause;

            if (isPaused) {
                // --- PAUSE ---
                if (runner) Runner.stop(runner);
                pauseCurrentAudio();

                // ゲーム実行中のみポーズ画面を出す
                if (isGameRunning) {
                    pauseOverlay.style.display = "flex";
                }
            } else {
                // --- RESUME ---
                if (isGameRunning) {
                    if (runner) Runner.run(runner, engine);
                    pauseOverlay.style.display = "none";
                }

                // BGMの再開
                if (isBgmEnabled()) {
                    resumeCurrentAudio();
                }
            }
        }

        // 画面が隠れた時だけポーズし、戻ってきた時はポーズのまま維持する
        document.addEventListener("visibilitychange", () => {
            // 隠れた(hidden)時のみポーズを実行。
            // 戻ってきた(visible)時は何もしない（ポーズ画面のままにする）。
            if (document.hidden) {
                togglePause(true);
            }
        });

        window.addEventListener("blur", () => {
            togglePause(true);
        });

        // focus時の自動再開（togglePause(false)）を削除
        window.addEventListener("focus", () => {
            // 何もしない
        });

        /* =========================================================
         * EVENT LISTENERS FOR PAUSE & HUD
         * ========================================================= */

        // 1. 右下のPAUSEボタン (HUD)
        if (hudPauseBtn) {
            const handlePause = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isGameRunning && !isPaused) {
                    togglePause(true); // ポーズする
                }
            };
            hudPauseBtn.addEventListener("click", handlePause);
            hudPauseBtn.addEventListener("touchstart", handlePause, { passive: false });
            hudPauseBtn.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
        }

        // 2. ポーズ画面内の「RESUME」ボタン
        if (pauseResumeBtn) {
            const handleResume = (e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePause(false); // ゲーム再開
            };
            pauseResumeBtn.addEventListener("click", handleResume);
            pauseResumeBtn.addEventListener("touchstart", handleResume, { passive: false });
        }

        // 3. ポーズ画面内の「TITLE」ボタン (旧RESET機能)
        if (pauseQuitBtn) {
            const handleQuit = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 確認ダイアログ
                const ok = confirm("タイトルに戻りますか？\n(現在のスコアは破棄されます)");
                if (ok) {
                    // ポーズ解除フラグ処理
                    isPaused = false;
                    isGameRunning = false;

                    // ポーズ画面を隠す
                    document.getElementById("pause-overlay").style.display = "none";

                    // タイトルに戻る処理
                    stopBGM(() => {
                        showTitleScreen();
                    });
                }
            };
            pauseQuitBtn.addEventListener("click", handleQuit);
            pauseQuitBtn.addEventListener("touchstart", handleQuit, { passive: false });
        }

        function isInsideShootArea(clientX, clientY) {
            const boostRect = document.getElementById("boost-btn").getBoundingClientRect();
            const resetAreaRect = document.getElementById("management-btn-area").getBoundingClientRect();
            const deadLineTop = Math.min(boostRect.top, resetAreaRect.top) - 30;
            return clientY > 0 && clientY < deadLineTop;
        }

        window.addEventListener("pointerdown", (e) => {
            if (e.target.tagName === "BUTTON" || isPaused) return;
            if (isGameRunning && !isPaused) {
                if (e.button !== 0) return;
                if (isInsideShootArea(e.clientX, e.clientY)) {
                    shoot(e);
                }
            }
        }, { passive: false });

        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const dpr = window.devicePixelRatio || 1;
                const newWidth = window.innerWidth;
                const newHeight = window.innerHeight;
                if (Math.abs(newWidth - WIDTH) < 5 && Math.abs(newHeight - HEIGHT) < 5) return;
                const oldCenter = { ...CENTER };
                WIDTH = newWidth;
                HEIGHT = newHeight;
                CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
                const dx = CENTER.x - oldCenter.x;
                const dy = CENTER.y - oldCenter.y;
                render.canvas.width = WIDTH * dpr;
                render.canvas.height = HEIGHT * dpr;
                render.canvas.style.width = WIDTH + "px";
                render.canvas.style.height = HEIGHT + "px";
                render.options.width = WIDTH;
                render.options.height = HEIGHT;
                render.context.setTransform(dpr, 0, 0, dpr, 0, 0);
                const allBodies = Matter.Composite.allBodies(engine.world);
                allBodies.forEach(b => {
                    Matter.Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy });
                });
                particles.forEach(p => {
                    p.x += dx; p.y += dy;
                    if (p.px !== undefined) { p.px += dx; p.py += dy; }
                });

            }, SYSTEM_CONFIG.resizeDebounceMs);
        });

        document.getElementById("clear-hi-btn").addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            const overlay = document.getElementById("overlay");
            if (overlay.classList.contains("hide")) return;
            if (!confirm("HIGH SCORE と STAGE をリセットしますか？")) return;
            hiScore = 0;
            hiStage = 1;
            localStorage.setItem("stellarGravity_hiScore", 0);
            localStorage.setItem("stellarGravity_hiStage", 1);
            document.getElementById("hi-score-val").innerText = "0";
            document.getElementById("hi-stage-val").innerText = "1";
            alert("HIGH SCORE をリセットしました");
        });


        // すべてのボタンに対して右クリックメニュー（iOSの長押しメニュー）を無効化
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            }, false);
        });

        // 画面全体のダブルタップズームを禁止（連打対策）
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        initAudio({
            getIsGameRunning: () => isGameRunning,
            getIsPaused: () => isPaused,
            getStage: () => stage
        });

        window.showTitleScreen = showTitleScreen;

