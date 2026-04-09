(function () {
    function generateNebulae(width, height) {
        const palettes = [
            ["255, 150, 110", "255, 210, 160"],
            ["120, 175, 255", "185, 215, 255"]
        ];
        const nebulae = [];
        const count = 3;
        const centerX = width / 2;
        const centerY = height / 2;
        const safeRadius = Math.min(width, height) * 0.24;

        for (let index = 0; index < count; index++) {
            const palette = palettes[index % palettes.length];
            const radiusX = width * (0.22 + Math.random() * 0.14);
            const radiusY = height * (0.15 + Math.random() * 0.12);
            let nebulaX = width * (0.15 + Math.random() * 0.7);
            let nebulaY = height * (0.12 + Math.random() * 0.76);
            let guard = 0;

            while (guard < 16) {
                const dx = nebulaX - centerX;
                const dy = nebulaY - centerY;
                if (Math.sqrt(dx * dx + dy * dy) > safeRadius + Math.max(radiusX, radiusY) * 0.25) {
                    break;
                }

                nebulaX = width * (0.12 + Math.random() * 0.76);
                nebulaY = height * (0.1 + Math.random() * 0.8);
                guard++;
            }

            const lobes = [];
            const lobeCount = 5 + Math.floor(Math.random() * 4);

            for (let lobeIndex = 0; lobeIndex < lobeCount; lobeIndex++) {
                const centerPullX = nebulaX - centerX;
                const centerPullY = nebulaY - centerY;
                const centerDistance = Math.max(1, Math.sqrt(centerPullX * centerPullX + centerPullY * centerPullY));
                const pushX = centerPullX / centerDistance;
                const pushY = centerPullY / centerDistance;
                lobes.push({
                    offsetX: (Math.random() * 2 - 1) * radiusX * 0.42 + pushX * radiusX * 0.12,
                    offsetY: (Math.random() * 2 - 1) * radiusY * 0.46 + pushY * radiusY * 0.12,
                    scaleX: 0.45 + Math.random() * 0.6,
                    scaleY: 0.35 + Math.random() * 0.55,
                    alpha: 0.022 + Math.random() * 0.03,
                    color: lobeIndex % 3 === 0 ? palette[1] : palette[0]
                });
            }

            nebulae.push({
                x: nebulaX,
                y: nebulaY,
                radiusX,
                radiusY,
                rotation: Math.random() * Math.PI,
                colorA: palette[0],
                colorB: palette[1],
                alpha: 0.04 + Math.random() * 0.02,
                lobes
            });
        }

        return nebulae;
    }

    function buildNebulaCanvas(width, height, nebulae) {
        const diagonal = Math.ceil(Math.sqrt(width * width + height * height));
        const canvas = document.createElement("canvas");
        canvas.width = diagonal;
        canvas.height = diagonal;
        const ctx = canvas.getContext("2d");
        const offsetX = (diagonal - width) / 2;
        const offsetY = (diagonal - height) / 2;

        const baseGrad = ctx.createLinearGradient(0, 0, 0, diagonal);
        baseGrad.addColorStop(0, "rgba(4, 6, 20, 1)");
        baseGrad.addColorStop(0.55, "rgba(9, 12, 32, 1)");
        baseGrad.addColorStop(1, "rgba(2, 3, 10, 1)");
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, diagonal, diagonal);

        nebulae.forEach((nebula) => {
            ctx.save();
            ctx.translate(offsetX + nebula.x, offsetY + nebula.y);
            ctx.rotate(nebula.rotation);

            nebula.lobes.forEach((lobe) => {
                ctx.save();
                ctx.translate(lobe.offsetX, lobe.offsetY);
                ctx.scale(nebula.radiusX * lobe.scaleX, nebula.radiusY * lobe.scaleY);

                const grad = ctx.createRadialGradient(0, 0, 0.08, 0, 0, 1);
                grad.addColorStop(0, `rgba(${lobe.color}, ${lobe.alpha + nebula.alpha})`);
                grad.addColorStop(0.5, `rgba(${nebula.colorB}, ${lobe.alpha * 0.7})`);
                grad.addColorStop(1, "rgba(0, 0, 0, 0)");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.globalCompositeOperation = "destination-out";
            for (let index = 0; index < 2; index++) {
                ctx.save();
                ctx.translate(
                    (Math.random() * 2 - 1) * nebula.radiusX * 0.25,
                    (Math.random() * 2 - 1) * nebula.radiusY * 0.25
                );
                ctx.scale(nebula.radiusX * (0.18 + Math.random() * 0.15), nebula.radiusY * (0.18 + Math.random() * 0.15));
                const cutGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
                cutGrad.addColorStop(0, "rgba(0, 0, 0, 0.2)");
                cutGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
                ctx.fillStyle = cutGrad;
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        });

        for (let index = 0; index < 120; index++) {
            const x = Math.random() * diagonal;
            const y = Math.random() * diagonal;
            const size = Math.random() * 1.8 + 0.3;
            const alpha = 0.03 + Math.random() * 0.04;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        return {
            canvas,
            offsetX: diagonal / 2,
            offsetY: diagonal / 2
        };
    }

    function pickStarAroundNebula(nebulae, width, height) {
        const nebula = nebulae[Math.floor(Math.random() * nebulae.length)];
        const lobe = nebula.lobes[Math.floor(Math.random() * nebula.lobes.length)];
        const localAngle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random());
        const spreadX = nebula.radiusX * lobe.scaleX * (0.35 + Math.random() * 0.85);
        const spreadY = nebula.radiusY * lobe.scaleY * (0.35 + Math.random() * 0.85);
        const rotatedX = Math.cos(localAngle) * spreadX * distance;
        const rotatedY = Math.sin(localAngle) * spreadY * distance;
        const cos = Math.cos(nebula.rotation);
        const sin = Math.sin(nebula.rotation);

        const x = nebula.x + lobe.offsetX + (rotatedX * cos - rotatedY * sin);
        const y = nebula.y + lobe.offsetY + (rotatedX * sin + rotatedY * cos);

        return {
            x: Math.max(0, Math.min(width, x)),
            y: Math.max(0, Math.min(height, y))
        };
    }

    function pickStarInRotationField(centerX, centerY, rotationRadius) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * rotationRadius;

        return {
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance
        };
    }

    function drawPlanet(ctx, x, y, radius, color, time, bodyId) {
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 0;

        const pulse = Math.sin(time * 0.003 + bodyId) * 0.05 + 0.95;
        const currentRadius = radius * pulse;

        for (let index = 0; index < 3; index++) {
            const shift = Math.sin(time * 0.002 + (index * 2) + bodyId) * (radius * 0.15);
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius + shift + (index * 2) + 2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.25 - (index * 0.08);
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    function generateStars({ width, height, starCount, starSizeMin, starSizeMax }) {
        const stars = [];
        const diagonal = Math.sqrt(width * width + height * height);
        const maxDimension = diagonal * 0.55;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotationRadius = diagonal * 0.56;
        const nebulae = generateNebulae(width, height);
        const starScale = 0.75;
        const starPalettes = [
            "255, 255, 255",
            "255, 245, 210",
            "190, 225, 255",
            "255, 205, 170",
            "210, 185, 255",
            "170, 255, 235"
        ];

        for (let index = 0; index < starCount; index++) {
            const rand = Math.random();
            let baseColor = starPalettes[0];
            if (rand < 0.35) baseColor = starPalettes[0];
            else if (rand < 0.55) baseColor = starPalettes[1];
            else if (rand < 0.73) baseColor = starPalettes[2];
            else if (rand < 0.86) baseColor = starPalettes[3];
            else if (rand < 0.95) baseColor = starPalettes[4];
            else baseColor = starPalettes[5];

            const useNebulaBias = Math.random() < 0.26;
            const position = useNebulaBias
                ? pickStarAroundNebula(nebulae, width, height)
                : pickStarInRotationField(centerX, centerY, rotationRadius);
            const dx = position.x - centerX;
            const dy = position.y - centerY;

            stars.push({
                r: Math.min(maxDimension, Math.sqrt(dx * dx + dy * dy)),
                angle: Math.atan2(dy, dx),
                size: (starSizeMin + Math.random() * (starSizeMax - starSizeMin) + (useNebulaBias ? Math.random() * 0.18 : 0)) * starScale,
                colorBase: baseColor,
                baseAlpha: (useNebulaBias ? 0.28 : 0.24) + Math.random() * (useNebulaBias ? 0.42 : 0.42),
                blinkSpeed: 0.002 + Math.random() * 0.005,
                blinkPhase: Math.random() * Math.PI * 2
            });
        }

        const nebulaLayer = buildNebulaCanvas(width, height, nebulae);

        return {
            height,
            nebulaCanvas: nebulaLayer.canvas,
            nebulaOffsetX: nebulaLayer.offsetX,
            nebulaOffsetY: nebulaLayer.offsetY,
            stars,
            width
        };
    }

    function triggerSupernovaAt(options) {
        const {
            height,
            particles,
            playBlackHoleSound,
            playExplosionSound,
            setImplosionAlpha,
            setImplosionScale,
            setIsImploding,
            width,
            x,
            y
        } = options;

        setIsImploding(true);
        setImplosionScale(1.0);
        setImplosionAlpha(1.0);
        const startTime = performance.now();

        const animateImplosion = (now) => {
            const elapsed = now - startTime;
            if (elapsed < 300) {
                setImplosionScale(1.0 + (elapsed / 300) * 0.5);
            } else if (elapsed < 900) {
                const progress = (elapsed - 300) / 600;
                setImplosionScale(1.5 * (1 - progress));
                setImplosionAlpha(1 - progress);
            } else {
                setIsImploding(false);
                setImplosionScale(0);
                return;
            }
            requestAnimationFrame(animateImplosion);
        };
        requestAnimationFrame(animateImplosion);

        particles.push({ type: "flash", life: 0.8, color: "rgba(0, 247, 255, 0.5)" });
        setTimeout(() => { particles.push({ type: "flash", life: 0.5, color: "rgba(138, 43, 226, 0.4)" }); }, 120);
        setTimeout(() => { particles.push({ type: "flash", life: 0.4, color: "rgba(0, 0, 50, 0.6)" }); }, 300);

        const waves = [
            { r: 10, sp: 10, life: 1.2 },
            { r: 40, sp: 8, life: 1.1 },
            { r: 90, sp: 6, life: 1.0 },
            { r: 160, sp: 4, life: 0.9 },
            { r: 240, sp: 2.5, life: 0.8 }
        ];
        waves.forEach((wave, index) => {
            setTimeout(() => {
                particles.push({ type: "shockwave", x, y, radius: wave.r, speed: wave.sp, life: wave.life });
            }, index * 80);
        });

        for (let index = 0; index < 160; index++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 14 + 4;
            let particleColor = "#ffffff";
            const rand = Math.random();
            if (rand < 0.4) particleColor = "#00f7ff";
            else if (rand < 0.7) particleColor = "#bd00ff";

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.2,
                color: particleColor,
                size: Math.random() * 3.2 + 1.2
            });
        }

        setTimeout(() => {
            particles.push({ type: "flash", life: 0.9, color: "rgba(0,0,0,0.9)" });
            particles.push({ type: "shockwave", x, y, radius: Math.max(width, height), speed: -12, life: 1.4 });

            for (let index = 0; index < 120; index++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 260 + 60;
                const speed = Math.random() * 8 + 4;
                particles.push({
                    x: x + Math.cos(angle) * radius,
                    y: y + Math.sin(angle) * radius,
                    vx: -Math.cos(angle + Math.PI / 6) * speed,
                    vy: -Math.sin(angle + Math.PI / 6) * speed,
                    life: 1.1,
                    color: "#00f7ff",
                    size: Math.random() * 2.2 + 0.8
                });
            }

            playBlackHoleSound();
        }, 520);

        playExplosionSound();
        setTimeout(playExplosionSound, 180);
        setTimeout(playExplosionSound, 420);
    }

    function drawBackground(ctx, options) {
        const { bgStars, center, getStaticStarAngle, isBoosting, isPaused, setStaticStarAngle, starBoostMult } = options;
        if (!bgStars) return;

        const stars = Array.isArray(bgStars) ? bgStars : bgStars.stars;
        const multiplier = isBoosting ? starBoostMult : 1.0;
        if (!isPaused) {
            setStaticStarAngle(getStaticStarAngle() - 0.0025 * multiplier);
        }

        const now = Date.now();
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(getStaticStarAngle());

        if (!Array.isArray(bgStars) && bgStars.nebulaCanvas) {
            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.drawImage(bgStars.nebulaCanvas, -bgStars.nebulaOffsetX, -bgStars.nebulaOffsetY);
            ctx.restore();
        }

        for (let index = 0; index < stars.length; index++) {
            const star = stars[index];
            const blink = Math.sin(now * star.blinkSpeed + star.blinkPhase);
            const currentAlpha = Math.max(0.1, Math.min(1, star.baseAlpha + blink * 0.3));

            ctx.fillStyle = `rgba(${star.colorBase}, ${currentAlpha})`;
            if (star.size > 1.8) {
                ctx.shadowBlur = 4;
                ctx.shadowColor = `rgba(${star.colorBase}, ${currentAlpha})`;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(Math.cos(star.angle) * star.r, Math.sin(star.angle) * star.r, star.size, 0, Math.PI * 2);
            ctx.fill();

            if (star.size > 1.3) {
                ctx.strokeStyle = `rgba(${star.colorBase}, ${currentAlpha * 0.28})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(Math.cos(star.angle) * (star.r - star.size * 3), Math.sin(star.angle) * star.r);
                ctx.lineTo(Math.cos(star.angle) * (star.r + star.size * 3), Math.sin(star.angle) * star.r);
                ctx.moveTo(Math.cos(star.angle) * star.r, Math.sin(star.angle) * (star.r - star.size * 3));
                ctx.lineTo(Math.cos(star.angle) * star.r, Math.sin(star.angle) * (star.r + star.size * 3));
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function drawRedZone(ctx, options) {
        const { center, deadlineRadius, isWarning, time } = options;
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.beginPath();
        ctx.arc(0, 0, deadlineRadius, 0, Math.PI * 2);
        ctx.setLineDash([10, 14]);
        ctx.lineDashOffset = -(time * 0.02) % 1000;

        const blinkBase = isWarning ? 0.7 : 0.3;
        const blinkFreq = isWarning ? 0.015 : 0.006;
        const blink = blinkBase + (1 - blinkBase) * (0.5 + 0.5 * Math.sin(time * blinkFreq));

        ctx.strokeStyle = isWarning ? `rgba(255, 0, 0, ${blink})` : `rgba(255, 60, 60, ${blink})`;
        ctx.lineWidth = isWarning ? 4 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.arc(0, 0, deadlineRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = isWarning ? `rgba(255, 0, 0, ${blink * 0.5})` : "rgba(255, 80, 80, 0.25)";
        ctx.lineWidth = isWarning ? 10 : 6;
        ctx.stroke();
        ctx.restore();
    }

    function spawnSparks(options) {
        const { center, deadlineRadius, isBoosting, isIOS, isPaused, isWarning, particles } = options;
        if (isPaused) return;

        const sparkRate = isWarning ? 0.8 : (isIOS ? 0.25 : 0.45);
        const sparkMax = 220;
        if (particles.length > sparkMax) {
            particles.splice(0, particles.length - sparkMax);
        }

        if (Math.random() >= sparkRate) return;

        const burst = 2 + (isBoosting ? 4 : 2);
        for (let index = 0; index < burst; index++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = deadlineRadius + (Math.random() * 10 - 5);
            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;
            const speed = (isBoosting ? 5.0 : 3.2) * (0.6 + Math.random() * 0.8);
            const vx = Math.cos(angle) * speed + (Math.random() - 0.5);
            const vy = Math.sin(angle) * speed + (Math.random() - 0.5);
            particles.push({
                type: "spark",
                x,
                y,
                px: x,
                py: y,
                vx,
                vy,
                life: 1.0,
                size: 1.5 + Math.random() * 2.5,
                color: isWarning ? "rgba(255, 255, 255, 1)" : "rgba(255,60,60,1)"
            });
        }
    }

    function drawCore(ctx, now, options) {
        const { center, coreRadius, implosionAlpha, implosionScale, isBlackHoleCore, isImploding } = options;
        ctx.save();
        ctx.translate(center.x, center.y);
        const currentRadius = coreRadius * implosionScale;

        if (isImploding) {
            ctx.globalAlpha = implosionAlpha;
            const glowRadius = currentRadius * 3;
            const grad = ctx.createRadialGradient(0, 0, currentRadius, 0, 0, glowRadius);
            grad.addColorStop(0, "rgba(255, 120, 50, 0.9)");
            grad.addColorStop(1, "rgba(255, 0, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#fff700";
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (isBlackHoleCore) {
            const time = performance.now() * 0.002;
            for (let index = 0; index < 6; index++) {
                const radius = coreRadius * (1.8 + index * 0.25);
                const alpha = 0.15 + Math.sin(time + index) * 0.1;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,80,40,${alpha})`;
                ctx.lineWidth = 6;
                ctx.stroke();
            }
            const holeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
            holeGrad.addColorStop(0, "rgba(0,0,0,1)");
            holeGrad.addColorStop(0.6, "rgba(30,0,0,0.9)");
            holeGrad.addColorStop(1, "rgba(0,0,0,1)");
            ctx.fillStyle = holeGrad;
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const glowRadius = coreRadius * 3 + Math.sin(now * 0.008) * 5;
            const grad = ctx.createRadialGradient(0, 0, coreRadius, 0, 0, glowRadius);
            grad.addColorStop(0, "rgba(255, 120, 50, 0.9)");
            grad.addColorStop(1, "rgba(255, 0, 0, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#fff700";
            ctx.fill();
        }

        ctx.restore();
    }

    function initNextCanvas(container) {
        if (!container) return null;

        container.innerHTML = "";
        const canvas = document.createElement("canvas");
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 46 * dpr;
        canvas.height = 46 * dpr;
        canvas.style.width = "46px";
        canvas.style.height = "46px";

        const nextCtx = canvas.getContext("2d");
        nextCtx.scale(dpr, dpr);
        container.appendChild(canvas);
        return nextCtx;
    }

    function drawLauncher(ctx, now, options) {
        const { center, isClickable, isGameRunning, launcherAngle, nextCtx, nextQueue, planets, spawnRadius } = options;

        if (isGameRunning && isClickable) {
            const spawnX = center.x + Math.cos(launcherAngle) * spawnRadius;
            const spawnY = center.y + Math.sin(launcherAngle) * spawnRadius;
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([4, 6]);
            ctx.strokeStyle = "rgba(180, 180, 180, 0.5)";
            ctx.lineWidth = 1.5;
            ctx.moveTo(spawnX, spawnY);
            ctx.lineTo(center.x, center.y);
            ctx.stroke();
            ctx.restore();

            drawPlanet(ctx, spawnX, spawnY, planets[nextQueue[0]].radius, planets[nextQueue[0]].color, now, 0);
        }

        if (nextCtx && nextQueue.length >= 2) {
            nextCtx.clearRect(0, 0, 46, 46);
            const nextPlanet = planets[nextQueue[1]];
            drawPlanet(nextCtx, 23, 23, nextPlanet.radius * 0.65, nextPlanet.color, now, 1);
        }
    }

    function manageParticles(ctx, options) {
        const { height, isIOS, isPaused, maxParticlesDesktop, maxParticlesMobile, particles, width } = options;
        const maxParticles = isIOS ? maxParticlesMobile : maxParticlesDesktop;
        if (particles.length > maxParticles) {
            particles.splice(0, particles.length - maxParticles);
        }

        for (let index = particles.length - 1; index >= 0; index--) {
            const particle = particles[index];
            if (!isPaused) {
                if (particle.type === "flash") particle.life -= 0.07;
                else if (particle.type === "spark") particle.life -= 0.04;
                else particle.life -= 0.02;
            }

            if (particle.life <= 0) {
                particles.splice(index, 1);
                continue;
            }

            if (!isPaused) {
                particle.px = particle.x;
                particle.py = particle.y;
                particle.x += (particle.vx || 0);
                particle.y += (particle.vy || 0);
                if (particle.type === "shockwave") particle.radius += (particle.speed || 0) * 0.5;
            }

            if (particle.type === "shockwave") {
                ctx.save();
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${particle.life})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            } else if (particle.type === "flash") {
                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color || "rgba(255,255,255,1)";
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            } else if (particle.type === "spark") {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = particle.life;
                ctx.strokeStyle = particle.color || "rgba(255,60,60,1)";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(particle.px, particle.py);
                ctx.lineTo(particle.x, particle.y);
                ctx.stroke();
                ctx.fillStyle = "rgba(255,120,120,1)";
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (particle.type === "combo-dust") {
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ffffff";
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.globalAlpha = particle.life * 0.8;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                ctx.save();
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = particle.life;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    function checkGameOverCondition(options) {
        const { bodies, center, deadlineRadius, gameOverDelayMs, gameOverTime, isGameRunning, isPaused, now, setGameOverTime, triggerGameOver } = options;
        if (!isGameRunning || isPaused) {
            return;
        }

        let isOut = false;
        bodies.forEach((body) => {
            if (!body.isStatic && body.index !== undefined) {
                const distance = Math.sqrt((body.position.x - center.x) ** 2 + (body.position.y - center.y) ** 2);
                if (distance > deadlineRadius) {
                    isOut = true;
                }
            }
        });

        if (isOut) {
            if (!gameOverTime) {
                setGameOverTime(now);
                return;
            }
            if (now - gameOverTime > gameOverDelayMs) {
                triggerGameOver();
            }
            return;
        }

        setGameOverTime(null);
    }

    window.StellarRender = {
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
    };
})();