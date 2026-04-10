(function () {
    
    function generateNebulae(width, height, deadZoneRadius = 0) {
        const palettes = [
            ["255, 150, 110", "255, 210, 160"],
            ["120, 175, 255", "185, 215, 255"]
        ];
        const nebulae = [];
        const count = 3;
        const centerX = width / 2;
        const centerY = height / 2;
        const safeRadius = Math.max(Math.min(width, height) * 0.24, deadZoneRadius + 36);

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

    function pickStarNearCenter(centerX, centerY, rotationRadius) {
        const angle = Math.random() * Math.PI * 2;
        const minDistance = rotationRadius * 0.08;
        const maxDistance = rotationRadius * 0.24;
        const distance = minDistance + Math.sqrt(Math.random()) * (maxDistance - minDistance);

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

    function generateStars({ width, height, starCount, starSizeMin, starSizeMax, deadZoneRadius = 0 }) {
        const stars = [];
        const diagonal = Math.sqrt(width * width + height * height);
        const maxDimension = diagonal * 0.55;
        const centerX = width / 2;
        const centerY = height / 2;
        const rotationRadius = diagonal * 0.56;
        const nebulae = generateNebulae(width, height, deadZoneRadius);
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

            const distributionRoll = Math.random();
            const useNebulaBias = distributionRoll < 0.26;
            const useCenterBias = !useNebulaBias && distributionRoll < 0.34;
            const position = useNebulaBias
                ? pickStarAroundNebula(nebulae, width, height)
                : useCenterBias
                    ? pickStarNearCenter(centerX, centerY, rotationRadius)
                    : pickStarInRotationField(centerX, centerY, rotationRadius);
            const dx = position.x - centerX;
            const dy = position.y - centerY;

            stars.push({
                r: Math.min(maxDimension, Math.sqrt(dx * dx + dy * dy)),
                angle: Math.atan2(dy, dx),
                size: (starSizeMin + Math.random() * (starSizeMax - starSizeMin) + ((useNebulaBias || useCenterBias) ? Math.random() * 0.18 : 0)) * starScale,
                colorBase: baseColor,
                baseAlpha: (useNebulaBias || useCenterBias ? 0.28 : 0.24) + Math.random() * 0.42,
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
        const timingScale = 2;

        const spawnImplosionSparks = ({
            centerX,
            centerY,
            count,
            inwardPull = 1,
            life = 1,
            radiusMax,
            radiusMin = 40,
            speedMax,
            speedMin
        }) => {
            for (let index = 0; index < count; index++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                const speed = speedMin + Math.random() * (speedMax - speedMin);
                const swirl = (Math.random() * 2 - 1) * 1.6;
                const inwardX = -Math.cos(angle) * speed * inwardPull;
                const inwardY = -Math.sin(angle) * speed * inwardPull;
                const tangentX = -Math.sin(angle) * swirl;
                const tangentY = Math.cos(angle) * swirl;

                let color = "rgba(255,255,255,1)";
                const colorRoll = Math.random();
                if (colorRoll < 0.34) color = "rgba(255,210,120,1)";
                else if (colorRoll < 0.68) color = "rgba(255,120,80,1)";
                else if (colorRoll < 0.86) color = "rgba(0,247,255,1)";

                particles.push({
                    type: "spark",
                    x: px,
                    y: py,
                    px,
                    py,
                    vx: inwardX + tangentX,
                    vy: inwardY + tangentY,
                    life: life * (0.8 + Math.random() * 0.45),
                    color,
                    size: Math.random() * 1.8 + 1.2
                });
            }
        };

        const spawnRingBurst = ({ centerX, centerY, count, radius, speedMax, speedMin }) => {
            for (let index = 0; index < count; index++) {
                const angle = Math.random() * Math.PI * 2;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                const speed = speedMin + Math.random() * (speedMax - speedMin);
                particles.push({
                    type: "spark",
                    x: px,
                    y: py,
                    px,
                    py,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.95 + Math.random() * 0.35,
                    color: Math.random() < 0.55 ? "rgba(255,255,255,1)" : "rgba(0,247,255,1)",
                    size: Math.random() * 2.1 + 1.1
                });
            }
        };

        setIsImploding(true);
        setImplosionScale(1.35);
        setImplosionAlpha(1.0);
        const startTime = performance.now();

        const animateImplosion = (now) => {
            const elapsed = now - startTime;
            if (elapsed < 420 * timingScale) {
                const progress = elapsed / (420 * timingScale);
                setImplosionScale(1.35 - progress * 1.12);
                setImplosionAlpha(1.0 - progress * 0.12);
            } else if (elapsed < 760 * timingScale) {
                const progress = (elapsed - 420 * timingScale) / (340 * timingScale);
                setImplosionScale(0.23 + progress * 0.35);
                setImplosionAlpha(0.88 - progress * 0.18);
            } else if (elapsed < 1160 * timingScale) {
                const progress = (elapsed - 760 * timingScale) / (400 * timingScale);
                setImplosionScale(0.58 * (1 - progress));
                setImplosionAlpha(0.7 * (1 - progress));
            } else {
                setIsImploding(false);
                setImplosionScale(0);
                return;
            }
            requestAnimationFrame(animateImplosion);
        };
        requestAnimationFrame(animateImplosion);
        playBlackHoleSound();

        particles.push({ type: "flash", life: 0.55, color: "rgba(255, 210, 160, 0.22)" });
        particles.push({ type: "flash", life: 0.7, color: "rgba(255, 120, 80, 0.14)" });

        spawnImplosionSparks({ centerX: x, centerY: y, count: 120, life: 1.15, radiusMax: Math.min(width, height) * 0.48, radiusMin: 70, speedMax: 15, speedMin: 6 });
        setTimeout(() => {
            spawnImplosionSparks({ centerX: x, centerY: y, count: 100, life: 1.0, radiusMax: Math.min(width, height) * 0.42, radiusMin: 55, speedMax: 16, speedMin: 7 });
        }, 80 * timingScale);
        setTimeout(() => {
            spawnImplosionSparks({ centerX: x, centerY: y, count: 80, life: 0.92, radiusMax: Math.min(width, height) * 0.36, radiusMin: 45, speedMax: 17, speedMin: 8 });
        }, 170 * timingScale);
        setTimeout(() => {
            spawnImplosionSparks({ centerX: x, centerY: y, count: 60, life: 0.8, radiusMax: Math.min(width, height) * 0.28, radiusMin: 32, speedMax: 19, speedMin: 10 });
        }, 260 * timingScale);

        playExplosionSound();
        setTimeout(playExplosionSound, 90 * timingScale);
        setTimeout(playExplosionSound, 180 * timingScale);
        setTimeout(playExplosionSound, 260 * timingScale);

        setTimeout(() => {
            particles.push({ type: "flash", life: 0.38, color: "rgba(255,255,255,0.25)" });

            const ringWaves = [
                { r: 16, sp: 12.5, life: 1.25, color: "rgba(255,255,255,0.95)", width: 3.4 },
                { r: 30, sp: 10.4, life: 1.15, color: "rgba(255,180,120,0.88)", width: 3.0 },
                { r: 58, sp: 8.2, life: 1.08, color: "rgba(0,247,255,0.88)", width: 2.6 },
                { r: 110, sp: 5.6, life: 0.98, color: "rgba(189,0,255,0.75)", width: 2.2 },
                { r: 170, sp: 3.9, life: 0.88, color: "rgba(255,255,255,0.55)", width: 1.8 }
            ];

            ringWaves.forEach((wave, index) => {
                setTimeout(() => {
                    particles.push({ type: "shockwave", x, y, radius: wave.r, speed: wave.sp, life: wave.life, color: wave.color, width: wave.width });
                }, index * 55 * timingScale);
            });

            spawnRingBurst({ centerX: x, centerY: y, count: 90, radius: 34, speedMax: 14, speedMin: 6 });
            setTimeout(() => spawnRingBurst({ centerX: x, centerY: y, count: 70, radius: 74, speedMax: 12, speedMin: 5 }), 70 * timingScale);
            setTimeout(() => spawnRingBurst({ centerX: x, centerY: y, count: 52, radius: 120, speedMax: 11, speedMin: 4 }), 130 * timingScale);
        }, 430 * timingScale);

        setTimeout(() => {
            particles.push({ type: "flash", life: 0.95, color: "rgba(0,0,0,0.94)" });
            particles.push({ type: "shockwave", x, y, radius: Math.max(width, height) * 0.62, speed: -18, life: 1.2, color: "rgba(255,255,255,0.8)", width: 3.8 });
            particles.push({ type: "shockwave", x, y, radius: 20, speed: 5.8, life: 1.05, color: "rgba(0,247,255,0.55)", width: 1.6 });

            spawnImplosionSparks({ centerX: x, centerY: y, count: 85, inwardPull: 1.3, life: 0.82, radiusMax: Math.min(width, height) * 0.22, radiusMin: 24, speedMax: 14, speedMin: 6 });
        }, 830 * timingScale);
    }

    function drawBackground(ctx, options) {
        const { bgStars, center, getStaticStarAngle, isBoosting, isGameRunning, isPaused, setStaticStarAngle, starBoostMult } = options;
        if (!bgStars) return;

        const stars = Array.isArray(bgStars) ? bgStars : bgStars.stars;
        const baseSpeed = isGameRunning ? 0.0025 : 0.0007;
        const multiplier = isGameRunning && isBoosting ? starBoostMult : 1.0;
        const shouldRotate = isGameRunning ? !isPaused : true;
        if (shouldRotate) {
            setStaticStarAngle(getStaticStarAngle() - baseSpeed * multiplier);
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
        const { alphaMultiplier = 1, center, deadlineRadius, isWarning, time } = options;
        if (alphaMultiplier <= 0) return;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.beginPath();
        ctx.arc(0, 0, deadlineRadius, 0, Math.PI * 2);
        ctx.setLineDash([10, 14]);
        ctx.lineDashOffset = -(time * 0.02) % 1000;

        const blinkBase = isWarning ? 0.7 : 0.3;
        const blinkFreq = isWarning ? 0.015 : 0.006;
        const blink = blinkBase + (1 - blinkBase) * (0.5 + 0.5 * Math.sin(time * blinkFreq));

        ctx.strokeStyle = isWarning
            ? `rgba(255, 0, 0, ${blink * alphaMultiplier})`
            : `rgba(255, 60, 60, ${blink * alphaMultiplier})`;
        ctx.lineWidth = isWarning ? 4 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.arc(0, 0, deadlineRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = isWarning
            ? `rgba(255, 0, 0, ${blink * 0.5 * alphaMultiplier})`
            : `rgba(255, 80, 80, ${0.25 * alphaMultiplier})`;
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
        const { blackHoleRevealProgress = 1, center, coreRadius, implosionAlpha, implosionScale, isBlackHoleCore, isImploding } = options;
        ctx.save();
        ctx.translate(center.x, center.y);
        const currentRadius = coreRadius * implosionScale;

        if (isImploding) {
            ctx.globalAlpha = implosionAlpha;
            const glowRadius = currentRadius * 1.5;
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
            const animationTime = performance.now();
            const time = animationTime * 0.0012;
            const wrapSpin = animationTime * 0.0009;
            const lensSpin = -animationTime * 0.00045;
            const reveal = Math.min(1, Math.max(0, blackHoleRevealProgress));
            const easedReveal = 1 - Math.pow(1 - reveal, 3);
            const baseScale = 0.72 + easedReveal * 0.28;
            const shadowRadius = coreRadius * 0.94 * baseScale;
            const ringRadius = coreRadius * 1.08 * (0.78 + easedReveal * 0.22);
            const drawOrbitRibbon = ({ rotation, radiusX, radiusY, lineWidth, frontColor, backColor, frontShadow, backShadow }) => {
                ctx.save();
                ctx.rotate(rotation);
                ctx.globalCompositeOperation = "screen";

                ctx.beginPath();
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = backColor;
                ctx.shadowBlur = 12;
                ctx.shadowColor = backShadow;
                ctx.ellipse(0, 0, radiusX, radiusY, 0, Math.PI, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.lineWidth = lineWidth * 1.08;
                ctx.strokeStyle = frontColor;
                ctx.shadowBlur = 20;
                ctx.shadowColor = frontShadow;
                ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI);
                ctx.stroke();
                ctx.restore();
            };

            ctx.save();
            ctx.scale(baseScale, baseScale);
            ctx.globalAlpha = 0.18 + easedReveal * 0.82;

            const outerGlow = ctx.createRadialGradient(0, 0, shadowRadius * 0.4, 0, 0, coreRadius * 3.9);
            outerGlow.addColorStop(0, "rgba(255, 180, 120, 0)");
            outerGlow.addColorStop(0.36, `rgba(255, 140, 80, ${0.08 + easedReveal * 0.08})`);
            outerGlow.addColorStop(0.7, `rgba(255, 96, 40, ${0.06 + easedReveal * 0.06})`);
            outerGlow.addColorStop(0.9, `rgba(90, 145, 255, ${0.04 + easedReveal * 0.04})`);
            outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius * 3.9, 0, Math.PI * 2);
            ctx.fill();

            drawOrbitRibbon({
                rotation: wrapSpin,
                radiusX: coreRadius * 2.22,
                radiusY: coreRadius * 0.58,
                lineWidth: coreRadius * 0.07,
                frontColor: `rgba(255, 204, 126, ${0.42 + easedReveal * 0.18})`,
                backColor: `rgba(140, 78, 32, ${0.14 + easedReveal * 0.06})`,
                frontShadow: "rgba(255, 158, 72, 0.62)",
                backShadow: "rgba(120, 70, 28, 0.18)"
            });
            drawOrbitRibbon({
                rotation: lensSpin + Math.PI / 2.8,
                radiusX: coreRadius * 1.82,
                radiusY: coreRadius * 0.82,
                lineWidth: coreRadius * 0.05,
                frontColor: `rgba(255, 168, 86, ${0.28 + easedReveal * 0.14})`,
                backColor: `rgba(84, 122, 210, ${0.1 + easedReveal * 0.05})`,
                frontShadow: "rgba(255, 128, 54, 0.42)",
                backShadow: "rgba(84, 122, 210, 0.2)"
            });
            ctx.restore();

            const photonRing = ctx.createRadialGradient(0, 0, ringRadius * 0.68, 0, 0, ringRadius * 1.34);
            photonRing.addColorStop(0, "rgba(255,210,150,0)");
            photonRing.addColorStop(0.28, `rgba(255,186,108, ${0.55 + easedReveal * 0.16})`);
            photonRing.addColorStop(0.42, `rgba(255,132,58, ${0.82 + easedReveal * 0.12})`);
            photonRing.addColorStop(0.62, `rgba(210,72,16, ${0.42 + easedReveal * 0.12})`);
            photonRing.addColorStop(0.86, `rgba(94,148,255, ${0.08 + easedReveal * 0.06})`);
            photonRing.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = photonRing;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius * 1.34, 0, Math.PI * 2);
            ctx.fill();

            drawOrbitRibbon({
                rotation: wrapSpin * 1.35 + Math.sin(time * 0.9) * 0.18,
                radiusX: ringRadius * 1.02,
                radiusY: coreRadius * 0.34,
                lineWidth: coreRadius * 0.034,
                frontColor: `rgba(255, 226, 170, ${0.28 + easedReveal * 0.16})`,
                backColor: `rgba(150, 88, 30, ${0.1 + easedReveal * 0.04})`,
                frontShadow: "rgba(255, 210, 150, 0.38)",
                backShadow: "rgba(120, 70, 28, 0.14)"
            });

            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.arc(0, 0, shadowRadius * 1.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const lensGlow = ctx.createRadialGradient(0, 0, shadowRadius * 0.82, 0, 0, coreRadius * 2.2);
            lensGlow.addColorStop(0, "rgba(255,190,120,0)");
            lensGlow.addColorStop(0.46, `rgba(255,148,84, ${0.12 + easedReveal * 0.08})`);
            lensGlow.addColorStop(0.7, `rgba(96,150,255, ${0.08 + easedReveal * 0.05})`);
            lensGlow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = lensGlow;
            ctx.beginPath();
            ctx.arc(0, 0, coreRadius * 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.rotate(lensSpin * 0.6);
            ctx.globalCompositeOperation = "screen";
            const warpAlpha = 0.12 + easedReveal * 0.1;
            ctx.strokeStyle = `rgba(255, 168, 94, ${warpAlpha})`;
            ctx.lineWidth = coreRadius * 0.06;
            ctx.shadowBlur = 24;
            ctx.shadowColor = `rgba(255, 136, 64, ${warpAlpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, coreRadius * 2.55, coreRadius * 0.72, 0, Math.PI * 1.08, Math.PI * 1.92);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, coreRadius * 2.55, coreRadius * 0.72, 0, Math.PI * 0.08, Math.PI * 0.92);
            ctx.stroke();
            ctx.strokeStyle = `rgba(90, 150, 255, ${0.05 + easedReveal * 0.04})`;
            ctx.lineWidth = coreRadius * 0.032;
            ctx.beginPath();
            ctx.ellipse(0, 0, coreRadius * 3.05, coreRadius * 1.02, 0, Math.PI * 1.12, Math.PI * 1.88);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, coreRadius * 3.05, coreRadius * 1.02, 0, Math.PI * 0.12, Math.PI * 0.88);
            ctx.stroke();
            ctx.restore();

            const holeGrad = ctx.createRadialGradient(-coreRadius * 0.14, -coreRadius * 0.18, 0, 0, 0, shadowRadius);
            holeGrad.addColorStop(0, "rgba(0,0,0,1)");
            holeGrad.addColorStop(0.72, "rgba(4,4,8,1)");
            holeGrad.addColorStop(1, "rgba(0,0,0,1)");
            ctx.fillStyle = holeGrad;
            ctx.beginPath();
            ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 176, 96, ${0.36 + easedReveal * 0.18})`;
            ctx.lineWidth = coreRadius * 0.042;
            ctx.shadowBlur = 14;
            ctx.shadowColor = "rgba(255, 146, 64, 0.42)";
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius * 0.95, -0.15, Math.PI * 2 - 0.15);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            const glowRadius = coreRadius * 1.5 + Math.sin(now * 0.008) * 2.5;
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

            if (particle.type === "shockwave" && particle.radius <= 0) {
                particles.splice(index, 1);
                continue;
            }

            if (particle.type === "shockwave") {
                ctx.save();
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.strokeStyle = particle.color || `rgba(255,255,255,${particle.life})`;
                ctx.globalAlpha = particle.life;
                ctx.lineWidth = particle.width || 2;
                ctx.shadowBlur = 12;
                ctx.shadowColor = particle.color || "rgba(255,255,255,0.8)";
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