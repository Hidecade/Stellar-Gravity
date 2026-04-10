(function () {
    const PLANETS = [
        { name: "W.Dwarf", radius: 10, color: "#aab7b8", score: 1 },
        { name: "Sirius.B", radius: 16, color: "#dfe6e9", score: 2 },
        { name: "B.Star", radius: 22, color: "#ff7675", score: 4 },
        { name: "Vega", radius: 30, color: "#74b9ff", score: 8 },
        { name: "Capella", radius: 38, color: "#a29bfe", score: 16 },
        { name: "Procyon", radius: 48, color: "#ffeaa7", score: 32 },
        { name: "Arcturus", radius: 58, color: "#fab1a0", score: 64 },
        { name: "Antares", radius: 70, color: "#ff9f43", score: 128 },
        { name: "BlackHole", radius: 85, color: "#ffffff", score: 256 }
    ];

    window.StellarConfig = {
        app: {
            version: "2026.04.10.4"
        },
        combo: {
            bonusStep: 0.2,         // 1コンボごとに加算されるスコア倍率
            comboWindowMs: 800,     // コンボ継続とみなす時間幅(ms)
            dustCount: 25           // コンボ表示時に出す粒子数
        },
        core: {
            defaultRadius: 50,      // ステージ1開始時のコア半径
            growPerStage: 6,        // 1ステージ進むごとに増えるコア半径
            maxRadius: 95           // コア半径の最大値
        },
        effects: {
            supernovaBonus: 3000,       // ブラックホール生成時のボーナス点
            supernovaClearDelayMs: 450, // 超新星演出後に通常天体を消すまでの待ち時間(ms)
            supernovaEndDelayMs: 950    // 超新星演出からクリア表示までの待ち時間(ms)
        },
        gameplay: {
            clickableResetDelayMs: 200, // 発射後に次の入力を受け付けるまでの待ち時間(ms)
            deadlineRadius: 180,        // ゲームオーバー判定ラインの半径
            gameOverDelayMs: 3000,      // デッドライン超過後にゲームオーバーになるまでの猶予(ms)
            gravityForceScale: 0.0028,  // 中心へ引っ張る重力の強さ
            mergePushForceScale: 0.003, // 合体時に周囲を弾く力の強さ
            mergePushRadius: 150,       // 合体時の押し出しが届く半径
            shootBaseSpeed: 6,          // 発射体の基本速度
            shootBoostDrift: 0.35,      // BOOST時に加わる横流れ量
            spawnRadius: 220,           // 発射位置の半径
            startStage: 1               // ゲーム開始ステージ
        },
        planets: PLANETS,
        progression: {
            difficultyMax: 3.0,         // 難易度倍率の上限
            difficultyStep: 0.12        // ステージクリアごとに増える難易度倍率
        },
        render: {
            boostGlowIntervalMs: 50,    // BOOSTボタン発光更新の間隔(ms)
            maxParticlesDesktop: 300,   // PC時の最大パーティクル数
            maxParticlesMobile: 150,    // モバイル時の最大パーティクル数
            rotateBaseSpeed: 0.015,     // 発射軌道の基本回転速度
            rotateBoostMultiplier: 3.5, // BOOST中の回転速度倍率
            starBoostMultiplier: 3.0,   // BOOST中の背景星回転倍率
            starCount: Math.floor(120 * 4), // 背景に生成する星の総数
            starSizeMax: 2.0,           // 背景星サイズの最大値
            starSizeMin: 0.2            // 背景星サイズの最小値
        },
        system: {
            resizeDebounceMs: 100 // リサイズ再計算を遅延させる時間(ms)
        },
        timer: {
            earlyStageStepSeconds: 4.0, // 序盤ステージで1段階ごとに減る制限時間(秒)
            lateStageStepSeconds: 1.0, // 中盤以降ステージで1段階ごとに減る制限時間(秒)
            midStageStart: 6, // 制限時間の減衰ルールが切り替わる基準ステージ
            maxSeconds: 30.0, // 最長の制限時間(秒)
            midSeconds: 10.0, // 中盤開始時の基準制限時間(秒)
            minSeconds: 2.0 // 制限時間の下限(秒)
        }
    };
})();