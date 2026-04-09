        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
        import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

        // ▼▼▼ あなたのFirebase設定 (変更なし) ▼▼▼
        const firebaseConfig = {
            apiKey: "AIzaSyCRjHe893FZopPErdjtgX8KJ8KPT_rmgnI",
            authDomain: "stellar-gravity.firebaseapp.com",
            projectId: "stellar-gravity",
            storageBucket: "stellar-gravity.firebasestorage.app",
            messagingSenderId: "936422140891",
            appId: "1:936422140891:web:d4e55c30507570602515fe",
            measurementId: "G-0FWP5X8T2T"
        };
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const SCORES_COLLECTION = "stellar_gravity_scores";

        // DOM Elements
        const rankingOverlay = document.getElementById("ranking-overlay");
        const showRankingBtn = document.getElementById("show-ranking-btn");
        const closeRankingBtn = document.getElementById("close-ranking-btn");
        const rankingBody = document.getElementById("ranking-list-body");
        const loadingEl = document.getElementById("loading-ranking");
        const tableEl = document.getElementById("ranking-table");

        const nameInputArea = document.getElementById("name-input-area");
        const nameInput = document.getElementById("player-name-input");
        const submitBtn = document.getElementById("submit-score-btn");
        const skipBtn = document.getElementById("skip-score-btn");

        // --- ランキング取得・表示関数 ---
        async function fetchAndShowRanking() {
            rankingOverlay.style.display = "flex";
            loadingEl.style.display = "block";
            tableEl.style.display = "none";
            rankingBody.innerHTML = "";

            try {
                const q = query(
                    collection(db, SCORES_COLLECTION),
                    orderBy("score", "desc"),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);

                let rank = 1;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const tr = document.createElement("tr");

                    // Rank Styling
                    let rankClass = "";
                    if (rank === 1) rankClass = "rank-1";
                    else if (rank === 2) rankClass = "rank-2";
                    else if (rank === 3) rankClass = "rank-3";

                    // 過去のデータにstageがない場合の対応 (|| "-")
                    const stageVal = data.stage ? data.stage : "-";

                    tr.innerHTML = `
                                                                    <td class="${rankClass}">${rank}</td>
                                                                    <td style="text-align:left; padding-left:10px;">${escapeHtml(data.name)}</td>
                                                                    <td style="font-family:'Orbitron'; color:#aaa;">${stageVal}</td>
                                                                    <td style="text-align:right; font-family:'Orbitron';">${data.score.toLocaleString()}</td>
                                                                `;
                    rankingBody.appendChild(tr);
                    rank++;
                });

                loadingEl.style.display = "none";
                tableEl.style.display = "table";

            } catch (e) {
                console.error("Error fetching ranking: ", e);
                loadingEl.textContent = "FAILED TO LOAD";
            }
        }

        // --- 自分の順位を計算して表示する関数 ---
        window.displayMyRank = async function (score) {
            const rankEl = document.getElementById("my-estimated-rank");
            if (!rankEl) return;

            rankEl.textContent = "CHECKING RANK...";
            rankEl.style.color = "#aaa";

            try {
                // 自分より高いスコアの数を数えるクエリ
                const coll = collection(db, SCORES_COLLECTION);
                const q = query(coll, where("score", ">", Number(score)));

                // サーバー側でカウント（高速・低コスト）
                const snapshot = await getCountFromServer(q);
                const count = snapshot.data().count;

                const myRank = count + 1; // 自分より上が5人いたら、自分は6位

                // 表示更新
                rankEl.innerHTML = `WORLD RANKING <span style="font-size:22px; font-weight:bold;">${myRank}</span>`;
                rankEl.style.color = "#ffd700"; // 金色にする

            } catch (e) {
                console.error("Rank check failed:", e);
                rankEl.textContent = ""; // エラー時は非表示
            }
        };

        // --- スコア送信関数 (修正版) ---
        window.submitMyScore = async function (score, stage) {
            const rawName = nameInput.value.trim();

            // バリデーション: 空文字またはスペースのみを防止
            if (!rawName) {
                alert("名前を入力してください。");
                return;
            }

            const name = rawName;
            submitBtn.disabled = true;
            submitBtn.textContent = "SENDING...";

            try {
                await addDoc(collection(db, SCORES_COLLECTION), {
                    name: name,
                    score: Number(score), // 数値型を保証
                    stage: Number(stage),
                    timestamp: serverTimestamp()
                });

                // 送信成功後の処理
                nameInputArea.style.display = "none";
                localStorage.setItem("stellarGravity_last_name", name);

                // ★重要: ここでボタン類を再表示させる
                if (typeof updateResetButtonVisibility === "function") {
                    updateResetButtonVisibility();
                }

                if (typeof window.showTitleScreen === "function") {
                    window.showTitleScreen();
                }

                // タイトル画面の表記に戻す
                document.querySelector("#overlay h1").innerHTML = "STELLAR<br>GRAVITY";
                document.getElementById("start-btn").textContent = "START";

                // ランキングを再取得して表示
                await fetchAndShowRanking();

            } catch (e) {
                console.error("Error adding document: ", e);
                alert("通信エラーが発生しました。");
                submitBtn.disabled = false;
                submitBtn.textContent = "SUBMIT SCORE";
            }
        };

        // --- Event Listeners ---
        showRankingBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            fetchAndShowRanking();
        });

        closeRankingBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            rankingOverlay.style.display = "none";

            document.querySelector("#overlay h1").innerHTML = "STELLAR<br>GRAVITY";
            document.getElementById("start-btn").textContent = "START";
        });

        // SKIPボタン
        skipBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (typeof window.showTitleScreen === "function") {
                window.showTitleScreen();
                return;
            }

            document.getElementById("name-input-area").style.display = "none";
            document.querySelector("#overlay h1").innerHTML = "STELLAR<br>GRAVITY";
            document.getElementById("start-btn").textContent = "START";
            updateResetButtonVisibility();
        });

        // 送信ボタン (引数にstageを追加)
        submitBtn.addEventListener("click", () => {
            const finalScore = window.finalScore || 0;
            const finalStage = window.finalStage || 1; // ステージ情報を取得
            window.submitMyScore(finalScore, finalStage);
        });

        function escapeHtml(str) {
            if (!str) return "";
            return str.replace(/[&<>"']/g, function (match) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
            });
        }

        const lastName = localStorage.getItem("stellarGravity_last_name");
        if (lastName) nameInput.value = lastName;

