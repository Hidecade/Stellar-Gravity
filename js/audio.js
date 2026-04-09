(function () {
    const gameBgmEl = document.getElementById("game-bgm");
    const clearBgm = document.getElementById("clear-bgm");
    const titleBgm = document.getElementById("title-bgm");
    const nameBgm = document.getElementById("name-bgm");
    const bgmToggleBtn = document.getElementById("bgm-toggle");
    const soundtrackBtn = document.getElementById("soundtrack-btn");
    const soundtrackOverlay = document.getElementById("soundtrack-overlay");
    const trackListContainer = document.getElementById("track-list-container");
    const soundtrackBackBtn = document.getElementById("soundtrack-back-btn");

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
        { name: "TITLE THEME", file: "audio/StellarGravity_Title.mp3", id: "title-bgm" },
        { name: "NEBULA (Stage 1-2)", file: "audio/StellarGravity_00.mp3" },
        { name: "PROTOSTAR (Stage 3-4)", file: "audio/StellarGravity_01.mp3" },
        { name: "RED GIANT (Stage 5-6)", file: "audio/StellarGravity_02.mp3" },
        { name: "SUPERNOVA (Stage 7+)", file: "audio/StellarGravity_03.mp3" },
        { name: "RANKING THEME", file: "audio/Stellar_Gravity_Name.mp3", id: "name-bgm" },
        { name: "EVENT HORIZON (Clear)", file: "audio/StellarGravity_Clear.mp3", id: "clear-bgm" }
    ];

    let noiseBuffer = null;
    let isBgmEnabled = localStorage.getItem("stellarGravity_bgm") !== "off";
    const mediaSources = new WeakMap();

    let bgmFadeTimer = null;
    let currentAudio = null;
    let currentBgmGain = 0.8;
    let activeTrackItem = null;
    let audioReadyPromise = null;
    let pendingPlayback = null;
    let playbackRequestId = 0;
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

    function createNoiseBuffer() {
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function ensureMediaSource(audioEl) {
        if (!audioEl || mediaSources.has(audioEl)) {
            return;
        }

        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(bgmMasterGain);
        mediaSources.set(audioEl, source);
    }

    function resolveBgmGain(audioEl) {
        if (!audioEl) return 0.8;
        if (audioEl.id === "clear-bgm") return 0.3;
        if (audioEl.id === "name-bgm") return 0.6;
        return 0.8;
    }

    function applyBgmGain(level) {
        currentBgmGain = level;
        const time = audioCtx.currentTime;
        bgmMasterGain.gain.cancelScheduledValues(time);
        bgmMasterGain.gain.setValueAtTime(level, time);
    }

    async function primeAudioElement(audio) {
        if (!audio) return;

        ensureMediaSource(audio);
        const previousMuted = audio.muted;
        const previousVolume = audio.volume;

        audio.muted = true;
        audio.volume = 0;

        try {
            await audio.play();
            audio.pause();
            audio.currentTime = 0;
        } catch (_) {
            // iOS blocks can still happen here; caller will retry from a user gesture.
        } finally {
            audio.muted = previousMuted;
            audio.volume = previousVolume || 1;
        }
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
                primeAudioElement(gameBgmEl),
                primeAudioElement(clearBgm),
                primeAudioElement(titleBgm),
                primeAudioElement(nameBgm)
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

    async function startManagedPlayback(audioEl, options = {}) {
        if (!audioEl) {
            return false;
        }

        const {
            gain = resolveBgmGain(audioEl),
            onBlocked = null,
            onStarted = null,
            resetTime = true,
            src = null
        } = options;

        const requestId = ++playbackRequestId;

        const runPlayback = async () => {
            await resumeAudioContext();
            await prepareAudioPlayback().catch(() => {});

            if (requestId !== playbackRequestId) {
                return false;
            }

            ensureMediaSource(audioEl);

            if (src && audioEl.src !== new URL(src, window.location.href).href) {
                audioEl.src = src;
                audioEl.load();
            }

            if (resetTime) {
                audioEl.currentTime = 0;
            }

            audioEl.volume = 1;
            applyBgmGain(gain);

            try {
                await audioEl.play();
                if (requestId !== playbackRequestId) {
                    audioEl.pause();
                    return false;
                }

                clearPendingPlaybackRetry();
                currentAudio = audioEl;
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
        if (!audio) {
            if (callback) callback();
            return;
        }

        if (bgmFadeTimer) {
            clearTimeout(bgmFadeTimer);
            bgmFadeTimer = null;
        }

        const time = audioCtx.currentTime;
        const startGain = bgmMasterGain.gain.value;
        bgmMasterGain.gain.cancelScheduledValues(time);
        bgmMasterGain.gain.setValueAtTime(startGain, time);
        bgmMasterGain.gain.linearRampToValueAtTime(0.0001, time + 0.3);

        bgmFadeTimer = setTimeout(() => {
            bgmFadeTimer = null;
            audio.pause();
            audio.currentTime = 0;
            applyBgmGain(currentBgmGain);

            if (callback) callback();
        }, 320);
    }

    function stopBGM(callback = null) {
        if (!currentAudio) {
            if (callback) callback();
            return;
        }

        fadeOut(currentAudio, () => {
            currentAudio = null;
            if (callback) callback();
        });
    }

    function forceStopBGM() {
        if (bgmFadeTimer) {
            clearTimeout(bgmFadeTimer);
            bgmFadeTimer = null;
        }

        clearPendingPlaybackRetry();
        playbackRequestId++;

        [gameBgmEl, clearBgm, titleBgm, nameBgm].forEach((audio) => {
            if (!audio) return;
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;
        });

        applyBgmGain(currentBgmGain);
        currentAudio = null;
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

    function playBlackHoleSound() {
        if (audioCtx.state === "suspended") audioCtx.resume();

        const time = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(42, time + 0.3);
        osc1.frequency.exponentialRampToValueAtTime(18, time + 2.2);

        const gain1 = audioCtx.createGain();
        gain1.gain.setValueAtTime(0.0001, time);
        gain1.gain.exponentialRampToValueAtTime(0.45, time + 0.6);
        gain1.gain.exponentialRampToValueAtTime(0.0001, time + 2.4);

        const lfo = audioCtx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(6, time);
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(14, time);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);

        const boom = audioCtx.createOscillator();
        boom.type = "sine";
        boom.frequency.setValueAtTime(60, time + 2.3);
        boom.frequency.exponentialRampToValueAtTime(28, time + 2.55);

        const boomGain = audioCtx.createGain();
        boomGain.gain.setValueAtTime(0.0001, time + 2.25);
        boomGain.gain.exponentialRampToValueAtTime(1.0, time + 2.35);
        boomGain.gain.exponentialRampToValueAtTime(0.0001, time + 2.9);

        osc1.connect(gain1);
        gain1.connect(sfxMasterGain);
        boom.connect(boomGain);
        boomGain.connect(sfxMasterGain);

        osc1.start(time + 0.3);
        osc1.stop(time + 2.5);
        lfo.start(time);
        lfo.stop(time + 2.5);
        boom.start(time + 2.25);
        boom.stop(time + 3.0);
    }

    function playBGM() {
        if (!isBgmEnabled || state.getIsPaused()) return;

        ensureMediaSource(gameBgmEl);
        forceStopBGM();
        const bgmIndex = Math.min(Math.floor((state.getStage() - 1) / 2), 3);
        const bgmNum = bgmIndex.toString().padStart(2, "0");
        startManagedPlayback(gameBgmEl, {
            gain: resolveBgmGain(gameBgmEl),
            src: `audio/StellarGravity_${bgmNum}.mp3`
        }).catch(() => {});
    }

    function playClearBgm() {
        if (!isBgmEnabled) {
            forceStopBGM();
            return;
        }

        ensureMediaSource(clearBgm);
        forceStopBGM();

        startManagedPlayback(clearBgm, {
            gain: resolveBgmGain(clearBgm)
        }).catch(() => {});
    }

    function playTitleBGM() {
        if (!isBgmEnabled || state.getIsPaused() || state.getIsGameRunning()) {
            forceStopBGM();
            return;
        }

        ensureMediaSource(titleBgm);
        forceStopBGM();
        startManagedPlayback(titleBgm, {
            gain: resolveBgmGain(titleBgm)
        }).catch(() => {});
    }

    function playNameBGM() {
        if (!isBgmEnabled || state.getIsPaused()) return;

        ensureMediaSource(nameBgm);
        forceStopBGM();
        startManagedPlayback(nameBgm, {
            gain: resolveBgmGain(nameBgm)
        }).catch(() => {});
    }

    function pauseCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
        }
    }

    function resumeCurrentAudio() {
        if (!isBgmEnabled || !currentAudio || !currentAudio.paused) return;

        startManagedPlayback(currentAudio, {
            gain: resolveBgmGain(currentAudio),
            onBlocked: () => {
                console.log("Audio resume blocked. Waiting for interaction.");
            },
            resetTime: false
        }).catch(() => {});
    }

    function unlockAudio() {
        prepareAudioPlayback().catch(() => {});

        window.removeEventListener("touchstart", unlockAudio);
        window.removeEventListener("mousedown", unlockAudio);
    }

    function playTrack(track, listItem) {
        forceStopBGM();

        if (activeTrackItem) {
            activeTrackItem.classList.remove("active");
            activeTrackItem.querySelector(".track-icon").textContent = "▶";
        }

        if (activeTrackItem === listItem) {
            activeTrackItem = null;
            return;
        }

        activeTrackItem = listItem;
        activeTrackItem.classList.add("active");
        activeTrackItem.querySelector(".track-icon").textContent = "■";

        let audioEl = gameBgmEl;
        if (track.id && document.getElementById(track.id)) {
            audioEl = document.getElementById(track.id);
        }

        startManagedPlayback(audioEl, {
            gain: resolveBgmGain(audioEl),
            onBlocked: () => {
                if (activeTrackItem === listItem) {
                    activeTrackItem.classList.remove("active");
                    activeTrackItem.querySelector(".track-icon").textContent = "▶";
                    activeTrackItem = null;
                }
            },
            src: track.id ? null : track.file
        }).catch((error) => console.log(error));
    }

    function setupSoundtrack() {
        if (!trackListContainer || !soundtrackBtn || !soundtrackBackBtn || !soundtrackOverlay) {
            return;
        }

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
            soundtrackOverlay.style.display = "flex";
        });

        soundtrackBackBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            forceStopBGM();

            if (activeTrackItem) {
                activeTrackItem.classList.remove("active");
                activeTrackItem.querySelector(".track-icon").textContent = "▶";
                activeTrackItem = null;
            }

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
                forceStopBGM();
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
        window.addEventListener("touchstart", unlockAudio, { once: false });
        window.addEventListener("mousedown", unlockAudio, { once: false });
    }

    window.StellarAudio = {
        forceStopBGM,
        init,
        isBgmEnabled: () => isBgmEnabled,
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
    };
})();