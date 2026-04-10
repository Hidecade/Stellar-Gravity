(function () {
    const bgmToggleBtn = document.getElementById("bgm-toggle");
    const soundtrackBtn = document.getElementById("soundtrack-btn");
    const soundtrackOverlay = document.getElementById("soundtrack-overlay");
    const trackListContainer = document.getElementById("track-list-container");
    const soundtrackBackBtn = document.getElementById("soundtrack-back-btn");
    const soundtrackSeekBar = document.getElementById("soundtrack-seek-bar");
    const soundtrackCurrentTime = document.getElementById("soundtrack-current-time");
    const soundtrackTotalTime = document.getElementById("soundtrack-total-time");

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = audioCtx.createGain();
    const bgmMasterGain = audioCtx.createGain();
    const sfxMasterGain = audioCtx.createGain();
    masterGain.gain.value = 1.0;
    bgmMasterGain.gain.value = 0.8;
    sfxMasterGain.gain.value = 1.8;
    bgmMasterGain.connect(masterGain);
    sfxMasterGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    const trackData = [
        { name: "TITLE THEME", file: "audio/StellarGravity_Title.mp3", key: "title", gain: 0.8, loop: true },
        { name: "NEBULA (Stage 1-2)", file: "audio/StellarGravity_00.mp3", key: "stage-00", gain: 0.8, loop: true },
        { name: "PROTOSTAR (Stage 3-4)", file: "audio/StellarGravity_01.mp3", key: "stage-01", gain: 0.8, loop: true },
        { name: "RED GIANT (Stage 5-6)", file: "audio/StellarGravity_02.mp3", key: "stage-02", gain: 0.8, loop: true },
        { name: "SUPERNOVA (Stage 7+)", file: "audio/StellarGravity_03.mp3", key: "stage-03", gain: 0.8, loop: true },
        { name: "RANKING THEME", file: "audio/Stellar_Gravity_Name.mp3", key: "name", gain: 0.6, loop: true },
        { name: "EVENT HORIZON (Clear)", file: "audio/StellarGravity_Clear.mp3", key: "clear", gain: 0.3, loop: false }
    ];

    const STATIC_BGM = {
        clear: { file: "audio/StellarGravity_Clear.mp3", gain: 0.3, key: "clear", loop: false },
        name: { file: "audio/Stellar_Gravity_Name.mp3", gain: 0.6, key: "name", loop: true },
        title: { file: "audio/StellarGravity_Title.mp3", gain: 0.8, key: "title", loop: true }
    };

    let noiseBuffer = null;
    let isBgmEnabled = localStorage.getItem("stellarGravity_bgm") !== "off";

    let bgmFadeTimer = null;
    let currentBgmGain = 0.8;
    let activeTrackItem = null;
    let bgmBuffers = {};
    let audioReadyPromise = null;
    let pendingPlayback = null;
    let playbackRequestId = 0;
    let pauseFadeTimer = null;
    let currentBgmSource = null;
    let currentBgmState = null;
    let currentBgmOffset = 0;
    let currentBgmStartTime = 0;
    let isBgmPaused = false;
    let soundtrackProgressAnimationId = null;
    let isSoundtrackSeeking = false;
    let activeTrackData = null;
    const BGM_FADE_OUT_SEC = 0.22;
    const PAUSE_FADE_OUT_SEC = 0.08;
    const SOUNDTRACK_PLAYBACK_LOOP = false;
    let isInitialized = false;
    let state = {
        getIsPaused: () => false,
        getIsGameRunning: () => false,
        getStage: () => 1
    };

    function syncToggleButton() {
        if (bgmToggleBtn) {
            bgmToggleBtn.textContent = isBgmEnabled ? "BGM ON" : "BGM OFF";
        }
    }

    function formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const remainSeconds = safeSeconds % 60;
        return `${minutes}:${remainSeconds.toString().padStart(2, "0")}`;
    }

    function setSeekBarProgress(position, duration) {
        if (!soundtrackSeekBar) return;

        const safeDuration = Math.max(duration || 0, 0.01);
        const safePosition = Math.min(Math.max(position || 0, 0), safeDuration);
        const progress = Math.min(100, Math.max(0, (safePosition / safeDuration) * 100));

        soundtrackSeekBar.max = String(safeDuration);
        soundtrackSeekBar.value = String(safePosition);
        soundtrackSeekBar.style.background = `linear-gradient(90deg, rgba(0, 247, 255, 0.95) 0%, rgba(0, 247, 255, 0.55) ${progress}%, rgba(255, 255, 255, 0.12) ${progress}%, rgba(255, 255, 255, 0.12) 100%)`;
    }

    function getCurrentPlaybackPosition() {
        if (!currentBgmState || !currentBgmState.duration) {
            return 0;
        }

        if (isBgmPaused) {
            return currentBgmOffset;
        }

        const elapsed = Math.max(0, audioCtx.currentTime - currentBgmStartTime);
        if (currentBgmState.loop === false) {
            return Math.min(currentBgmState.duration, elapsed);
        }

        return currentBgmState.duration > 0 ? elapsed % currentBgmState.duration : 0;
    }

    function stopSoundtrackProgressLoop() {
        if (!soundtrackProgressAnimationId) return;

        cancelAnimationFrame(soundtrackProgressAnimationId);
        soundtrackProgressAnimationId = null;
    }

    function resetSoundtrackProgress(duration = 0) {
        if (soundtrackCurrentTime) {
            soundtrackCurrentTime.textContent = "0:00";
        }
        if (soundtrackTotalTime) {
            soundtrackTotalTime.textContent = formatTime(duration);
        }
        if (soundtrackSeekBar) {
            soundtrackSeekBar.disabled = duration <= 0;
            setSeekBarProgress(0, Math.max(duration, 1));
        }
    }

    function updateSoundtrackProgress() {
        const duration = activeTrackData?.duration || currentBgmState?.duration || 0;
        const isTrackActive = Boolean(activeTrackItem && currentBgmState && activeTrackData && currentBgmState.key === activeTrackData.key);

        if (!isTrackActive) {
            resetSoundtrackProgress(duration);
            stopSoundtrackProgressLoop();
            return;
        }

        const position = isSoundtrackSeeking && soundtrackSeekBar
            ? Number(soundtrackSeekBar.value || 0)
            : getCurrentPlaybackPosition();

        if (soundtrackCurrentTime) {
            soundtrackCurrentTime.textContent = formatTime(position);
        }
        if (soundtrackTotalTime) {
            soundtrackTotalTime.textContent = formatTime(duration);
        }
        if (soundtrackSeekBar && !isSoundtrackSeeking) {
            soundtrackSeekBar.disabled = false;
            setSeekBarProgress(position, duration || 1);
        }

        soundtrackProgressAnimationId = requestAnimationFrame(updateSoundtrackProgress);
    }

    function startSoundtrackProgressLoop() {
        stopSoundtrackProgressLoop();
        soundtrackProgressAnimationId = requestAnimationFrame(updateSoundtrackProgress);
    }

    function createNoiseBuffer() {
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function resolveBgmGain(request) {
        if (!request) return 0.8;
        if (typeof request.gain === "number") return request.gain;
        if (request.key === "clear") return 0.3;
        if (request.key === "name") return 0.6;
        return 0.8;
    }

    function applyBgmGain(level) {
        currentBgmGain = level;
        const time = audioCtx.currentTime;
        bgmMasterGain.gain.cancelScheduledValues(time);
        bgmMasterGain.gain.setValueAtTime(level, time);
    }

    function getStageBgmRequest() {
        const bgmIndex = Math.min(Math.floor((state.getStage() - 1) / 2), 3);
        const bgmNum = bgmIndex.toString().padStart(2, "0");
        return {
            file: `audio/StellarGravity_${bgmNum}.mp3`,
            gain: 0.8,
            key: `stage-${bgmNum}`,
            loop: true
        };
    }

    async function loadBgmBuffer(file) {
        const url = new URL(file, window.location.href).href;
        if (bgmBuffers[url]) {
            return bgmBuffers[url];
        }

        const response = await fetch(url, { cache: "default" });
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        bgmBuffers[url] = audioBuffer;
        return audioBuffer;
    }

    async function prepareAudioPlayback() {
        if (audioReadyPromise) {
            return audioReadyPromise;
        }

        audioReadyPromise = (async () => {
            if (audioCtx.state === "suspended") {
                await audioCtx.resume();
            }

            await Promise.all([
                loadBgmBuffer(STATIC_BGM.title.file),
                loadBgmBuffer(STATIC_BGM.clear.file),
                loadBgmBuffer(STATIC_BGM.name.file),
                loadBgmBuffer(getStageBgmRequest().file)
            ]);
        })();

        try {
            await audioReadyPromise;
        } finally {
            audioReadyPromise = null;
        }
    }

    function resumeAudioContext() {
        if (audioCtx.state === "suspended") {
            return audioCtx.resume().catch(() => {});
        }

        return Promise.resolve();
    }

    function fadeOutBlackHoleSound(durationSec = 0.8) {
        void durationSec;
    }

    function clearPendingPlaybackRetry() {
        if (!pendingPlayback) {
            return;
        }

        window.removeEventListener("touchstart", pendingPlayback.retryHandler);
        window.removeEventListener("mousedown", pendingPlayback.retryHandler);
        window.removeEventListener("pointerdown", pendingPlayback.retryHandler);
        window.removeEventListener("keydown", pendingPlayback.retryHandler);
        pendingPlayback = null;
    }

    function schedulePlaybackRetry(runPlayback) {
        clearPendingPlaybackRetry();

        const retryHandler = () => {
            clearPendingPlaybackRetry();
            runPlayback().catch(() => {});
        };

        pendingPlayback = { retryHandler };
        window.addEventListener("touchstart", retryHandler, { once: true });
        window.addEventListener("mousedown", retryHandler, { once: true });
        window.addEventListener("pointerdown", retryHandler, { once: true });
        window.addEventListener("keydown", retryHandler, { once: true });
    }

    function clearPauseFadeTimer() {
        if (!pauseFadeTimer) {
            return;
        }

        clearTimeout(pauseFadeTimer);
        pauseFadeTimer = null;
    }

    function stopCurrentBgmSource(clearState = true, preservePauseState = false) {
        clearPauseFadeTimer();

        if (currentBgmSource) {
            currentBgmSource.onended = null;
            try {
                currentBgmSource.stop();
            } catch (_) {
                // already stopped
            }
            try {
                currentBgmSource.disconnect();
            } catch (_) {
                // already disconnected
            }
        }

        currentBgmSource = null;
        if (!preservePauseState) {
            isBgmPaused = false;
            currentBgmOffset = 0;
        }

        if (clearState) {
            currentBgmState = null;
        }

        if (!preservePauseState && !currentBgmSource) {
            stopSoundtrackProgressLoop();
        }
    }

    function startBgmSource(buffer, request, offset = 0) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = request.loop !== false;
        source.connect(bgmMasterGain);

        const safeOffset = buffer.duration > 0 ? offset % buffer.duration : 0;
        applyBgmGain(resolveBgmGain(request));
        source.start(0, safeOffset);

        currentBgmSource = source;
        currentBgmStartTime = audioCtx.currentTime - safeOffset;
        currentBgmOffset = safeOffset;
        currentBgmState = {
            ...request,
            duration: buffer.duration,
            url: new URL(request.file, window.location.href).href
        };
        isBgmPaused = false;

        source.onended = () => {
            if (currentBgmSource !== source || isBgmPaused) {
                return;
            }

            const endedState = currentBgmState;
            currentBgmSource = null;
            currentBgmOffset = 0;
            if (currentBgmState && currentBgmState.loop === false) {
                currentBgmState = null;
            }

            if (endedState && endedState.loop === false && typeof endedState.onEnded === "function") {
                endedState.onEnded();
            }
        };
    }

    async function startManagedPlayback(request = {}) {
        if (!request.file) {
            return false;
        }

        const {
            onBlocked = null,
            onStarted = null,
            offset = 0
        } = request;

        const requestId = ++playbackRequestId;

        const runPlayback = async () => {
            clearPauseFadeTimer();
            await resumeAudioContext();

            if (audioCtx.state !== "running") {
                if (onBlocked) {
                    onBlocked();
                }
                schedulePlaybackRetry(runPlayback);
                return false;
            }

            const buffer = await loadBgmBuffer(request.file).catch(() => null);
            if (!buffer) {
                return false;
            }

            if (requestId !== playbackRequestId) {
                return false;
            }

            try {
                if (requestId !== playbackRequestId) {
                    return false;
                }

                stopCurrentBgmSource(false);
                startBgmSource(buffer, request, offset);
                clearPendingPlaybackRetry();
                if (onStarted) {
                    onStarted();
                }
                return true;
            } catch (_) {
                if (requestId !== playbackRequestId) {
                    return false;
                }

                if (onBlocked) {
                    onBlocked();
                }
                schedulePlaybackRetry(runPlayback);
                return false;
            }
        };

        return runPlayback();
    }

    function fadeOut(audio, callback) {
        if (!currentBgmSource) {
            if (callback) callback();
            return;
        }

        if (bgmFadeTimer) {
            clearTimeout(bgmFadeTimer);
            bgmFadeTimer = null;
        }

        const time = audioCtx.currentTime;
        const startGain = Math.max(bgmMasterGain.gain.value, 0.0001);
        bgmMasterGain.gain.cancelScheduledValues(time);
        bgmMasterGain.gain.setValueAtTime(startGain, time);
        bgmMasterGain.gain.exponentialRampToValueAtTime(0.0001, time + BGM_FADE_OUT_SEC);

        bgmFadeTimer = setTimeout(() => {
            bgmFadeTimer = null;
            stopCurrentBgmSource();
            applyBgmGain(currentBgmGain);

            if (callback) callback();
        }, Math.ceil(BGM_FADE_OUT_SEC * 1000) + 20);
    }

    function stopBGM(callback = null) {
        if (!currentBgmSource) {
            stopCurrentBgmSource();
            if (callback) callback();
            return;
        }

        fadeOut(currentBgmSource, () => {
            if (callback) callback();
        });
    }

    function forceStopBGM() {
        if (bgmFadeTimer) {
            clearTimeout(bgmFadeTimer);
            bgmFadeTimer = null;
        }

        clearPauseFadeTimer();
        clearPendingPlaybackRetry();
        playbackRequestId++;
        stopCurrentBgmSource();
        applyBgmGain(currentBgmGain);
        activeTrackData = null;
        activeTrackItem = null;
        resetSoundtrackProgress();
    }

    function queueBgmPlayback(request = {}) {
        if (currentBgmSource) {
            stopBGM(() => {
                startManagedPlayback(request).catch(() => {});
            });
            return;
        }

        startManagedPlayback(request).catch(() => {});
    }

    function playSuctionSound() {
        if (state.getIsPaused()) return;

        const time = audioCtx.currentTime;
        const drum = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        drum.type = "sine";
        drum.frequency.setValueAtTime(140, time);
        drum.frequency.exponentialRampToValueAtTime(45, time + 1.5);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);
        drum.connect(gain);
        gain.connect(sfxMasterGain);
        drum.start(time);
        drum.stop(time + 1.8);

        if (!noiseBuffer) {
            noiseBuffer = createNoiseBuffer();
        }

        const burst = audioCtx.createBufferSource();
        burst.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(220, time);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.12, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
        burst.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(sfxMasterGain);
        burst.start(time);
        burst.stop(time + 1.2);
    }

    function playExplosionSound() {
        if (audioCtx.state === "suspended") audioCtx.resume();

        const time = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(60, time + 0.45);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.9, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);

        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer || (noiseBuffer = createNoiseBuffer());
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.setValueAtTime(400, time);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.15, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);

        const delay = audioCtx.createDelay(0.6);
        delay.delayTime.setValueAtTime(0.12, time);
        const feedback = audioCtx.createGain();
        feedback.gain.setValueAtTime(0.25, time);
        delay.connect(feedback);
        feedback.connect(delay);

        osc.connect(gain);
        gain.connect(sfxMasterGain);
        gain.connect(delay);
        delay.connect(sfxMasterGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(sfxMasterGain);

        osc.start(time);
        osc.stop(time + 0.8);
        noise.start(time);
        noise.stop(time + 0.5);
    }


    function playBGM() {
        if (!isBgmEnabled || state.getIsPaused()) return;

        queueBgmPlayback(getStageBgmRequest());
    }

    function playClearBgm() {
        if (!isBgmEnabled) {
            stopBGM();
            return;
        }

        queueBgmPlayback(STATIC_BGM.clear);
    }

    function playTitleBGM() {
        if (!isBgmEnabled || state.getIsPaused() || state.getIsGameRunning()) {
            stopBGM();
            return;
        }

        queueBgmPlayback(STATIC_BGM.title);
    }

    function playNameBGM() {
        if (!isBgmEnabled || state.getIsPaused()) return;

        queueBgmPlayback(STATIC_BGM.name);
    }

    function pauseCurrentAudio() {
        if (!currentBgmSource || !currentBgmState) {
            return;
        }

        clearPauseFadeTimer();
        currentBgmOffset = Math.max(0, audioCtx.currentTime - currentBgmStartTime);
        isBgmPaused = true;

        const time = audioCtx.currentTime;
        const startGain = Math.max(bgmMasterGain.gain.value, 0.0001);
        bgmMasterGain.gain.cancelScheduledValues(time);
        bgmMasterGain.gain.setValueAtTime(startGain, time);
        bgmMasterGain.gain.exponentialRampToValueAtTime(0.0001, time + PAUSE_FADE_OUT_SEC);

        pauseFadeTimer = setTimeout(() => {
            pauseFadeTimer = null;
            stopCurrentBgmSource(false, true);
            applyBgmGain(currentBgmGain);
        }, Math.ceil(PAUSE_FADE_OUT_SEC * 1000) + 20);
    }

    function resumeCurrentAudio() {
        if (!isBgmEnabled || !isBgmPaused || !currentBgmState) return;

        startManagedPlayback({
            ...currentBgmState,
            offset: currentBgmOffset,
            onBlocked: () => {
                console.log("Audio resume blocked. Waiting for interaction.");
            }
        }).catch(() => {});
    }

    function getTrackIndexByKey(trackKey) {
        return trackData.findIndex((track) => track.key === trackKey);
    }

    function playTrackByIndex(index) {
        if (!trackListContainer || !trackData.length) {
            return;
        }

        const wrappedIndex = (index + trackData.length) % trackData.length;
        const track = trackData[wrappedIndex];
        const listItem = trackListContainer.children[wrappedIndex];
        if (!track || !listItem) {
            return;
        }

        playTrack(track, listItem);
    }

    function playNextSoundtrackTrack() {
        if (!activeTrackData || soundtrackOverlay?.style.display !== "flex") {
            return;
        }

        const currentIndex = getTrackIndexByKey(activeTrackData.key);
        if (currentIndex < 0) {
            return;
        }

        playTrackByIndex(currentIndex + 1);
    }

    function playTrack(track, listItem) {
        if (activeTrackItem) {
            activeTrackItem.classList.remove("active");
            activeTrackItem.querySelector(".track-icon").textContent = "▶";
        }

        if (activeTrackItem === listItem) {
            activeTrackData = null;
            activeTrackItem = null;
            stopBGM();
            resetSoundtrackProgress();
            return;
        }

        activeTrackData = { ...track, loop: SOUNDTRACK_PLAYBACK_LOOP };
        activeTrackItem = listItem;
        activeTrackItem.classList.add("active");
        activeTrackItem.querySelector(".track-icon").textContent = "■";

        loadBgmBuffer(track.file).then((buffer) => {
            if (activeTrackData?.key !== track.key) return;
            activeTrackData = { ...track, duration: buffer.duration, loop: SOUNDTRACK_PLAYBACK_LOOP };
            if (!currentBgmState || currentBgmState.key !== track.key) {
                resetSoundtrackProgress(buffer.duration);
            }
        }).catch(() => {});

        queueBgmPlayback({
            file: track.file,
            gain: track.gain,
            key: track.key,
            loop: SOUNDTRACK_PLAYBACK_LOOP,
            onStarted: () => {
                activeTrackData = {
                    ...track,
                    duration: currentBgmState?.duration || activeTrackData?.duration || 0,
                    loop: SOUNDTRACK_PLAYBACK_LOOP
                };
                startSoundtrackProgressLoop();
            },
            onEnded: () => {
                if (activeTrackData?.key !== track.key) {
                    return;
                }
                playNextSoundtrackTrack();
            },
            onBlocked: () => {
                if (activeTrackItem === listItem) {
                    activeTrackItem.classList.remove("active");
                    activeTrackItem.querySelector(".track-icon").textContent = "▶";
                    activeTrackData = null;
                    activeTrackItem = null;
                    resetSoundtrackProgress();
                }
            }
        });
    }

    function seekActiveTrack(position) {
        if (!activeTrackData?.file) {
            return;
        }

        const duration = activeTrackData.duration || currentBgmState?.duration || 0;
        const safePosition = Math.min(Math.max(position, 0), duration || 0);

        startManagedPlayback({
            file: activeTrackData.file,
            gain: activeTrackData.gain,
            key: activeTrackData.key,
            loop: SOUNDTRACK_PLAYBACK_LOOP,
            offset: safePosition,
            onStarted: () => {
                startSoundtrackProgressLoop();
            },
            onEnded: () => {
                playNextSoundtrackTrack();
            },
            onBlocked: () => {
                resetSoundtrackProgress(duration);
            }
        }).catch(() => {});
    }

    function setupSoundtrackSeekBar() {
        if (!soundtrackSeekBar) {
            return;
        }

        resetSoundtrackProgress();

        soundtrackSeekBar.addEventListener("input", () => {
            const duration = activeTrackData?.duration || currentBgmState?.duration || 0;
            isSoundtrackSeeking = true;
            const position = Number(soundtrackSeekBar.value || 0);
            if (soundtrackCurrentTime) {
                soundtrackCurrentTime.textContent = formatTime(position);
            }
            if (soundtrackTotalTime) {
                soundtrackTotalTime.textContent = formatTime(duration);
            }
            setSeekBarProgress(position, duration || 1);
        });

        const commitSeek = () => {
            if (!isSoundtrackSeeking) return;

            isSoundtrackSeeking = false;
            const position = Number(soundtrackSeekBar.value || 0);
            seekActiveTrack(position);
        };

        soundtrackSeekBar.addEventListener("change", commitSeek);
        soundtrackSeekBar.addEventListener("mouseup", commitSeek);
        soundtrackSeekBar.addEventListener("touchend", commitSeek, { passive: true });
        soundtrackSeekBar.addEventListener("keyup", (event) => {
            if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Home" || event.code === "End") {
                commitSeek();
            }
        });
    }

    function setupSoundtrack() {
        if (!trackListContainer || !soundtrackBtn || !soundtrackBackBtn || !soundtrackOverlay) {
            return;
        }

        setupSoundtrackSeekBar();

        trackData.forEach((track) => {
            const li = document.createElement("li");
            li.className = "track-item";
            li.innerHTML = `<span>${track.name}</span> <span class="track-icon">▶</span>`;
            li.addEventListener("click", () => {
                playTrack(track, li);
            });
            trackListContainer.appendChild(li);
        });

        soundtrackBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            stopBGM();
            resetSoundtrackProgress(activeTrackData?.duration || 0);
            soundtrackOverlay.style.display = "flex";
        });

        soundtrackBackBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            stopBGM();

            if (activeTrackItem) {
                activeTrackItem.classList.remove("active");
                activeTrackItem.querySelector(".track-icon").textContent = "▶";
                activeTrackData = null;
                activeTrackItem = null;
            }

            resetSoundtrackProgress();
            soundtrackOverlay.style.display = "none";
            if (isBgmEnabled) {
                playTitleBGM();
            }
        });
    }

    function setupBgmToggle() {
        if (!bgmToggleBtn) return;

        bgmToggleBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            if (state.getIsGameRunning()) return;

            isBgmEnabled = !isBgmEnabled;
            syncToggleButton();
            localStorage.setItem("stellarGravity_bgm", isBgmEnabled ? "on" : "off");

            if (isBgmEnabled) {
                playTitleBGM();
            } else {
                stopBGM();
            }
        });
    }

    function init(options) {
        state = { ...state, ...options };
        syncToggleButton();

        if (isInitialized) return;
        isInitialized = true;

        setupBgmToggle();
        setupSoundtrack();
    }

    window.StellarAudio = {
        fadeOutBlackHoleSound,
        forceStopBGM,
        init,
        isBgmEnabled: () => isBgmEnabled,
        pauseCurrentAudio,
        prepareAudioPlayback,
        playBGM,
        playClearBgm,
        playExplosionSound,
        playNameBGM,
        playSuctionSound,
        playTitleBGM,
        resumeCurrentAudio,
        stopBGM
    };
})();