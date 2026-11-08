// Game Constants
        const WINDS = ['Đông', 'Nam', 'Tây', 'Bắc'];

        // Game State
        let players = [];
        let round = { wind: 0, hand: 1 }; // wind 0=East, hand 1-4
        let honba = 0;
        let riichiPool = 0;

        // Modal States
        let currentRonWinners = [];
        let currentRonLoser = null;
        let currentTsumoWinner = null;
        let currentTenpaiPlayers = [];
        let currentNagashiWinner = null;
        let currentChomboOffender = null;

        // --- Core Functions ---

        function showToast(msg) {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.style.opacity = '1';
            setTimeout(() => { toast.style.opacity = '0'; }, 3000);
        }

        function readNonNegativePoints(inputId) {
            const input = document.getElementById(inputId);
            if (input.value.trim() === '') {
                showToast("Vui lòng nhập số điểm hợp lệ");
                return null;
            }
            const value = Number(input.value);
            if (!Number.isFinite(value) || value < 0) {
                showToast("Vui lòng nhập số điểm hợp lệ");
                return null;
            }
            return value;
        }

        function startGame() {
            players = [
                { id: 0, name: document.getElementById('p0-name').value || 'P1', score: 25000, startWind: 0, riichi: false },
                { id: 1, name: document.getElementById('p1-name').value || 'P2', score: 25000, startWind: 1, riichi: false },
                { id: 2, name: document.getElementById('p2-name').value || 'P3', score: 25000, startWind: 2, riichi: false },
                { id: 3, name: document.getElementById('p3-name').value || 'P4', score: 25000, startWind: 3, riichi: false },
            ];
            
            // Set initial current winds identical to start wind
            players.forEach(p => p.currentWind = p.startWind);
            
            round = { wind: 0, hand: 1 };
            honba = 0;
            riichiPool = 0;

            document.getElementById('screen-setup').classList.remove('active');
            document.getElementById('screen-main').classList.add('active');
            
            updateTableUI();
        }

        function nextHand(dealerKeeps) {
            if (dealerKeeps) {
                // Honba increases, dealer stays same. Hand doesn't change.
                honba++;
            } else {
                // Dealer rotates
                round.hand++;
                if (round.hand > 4) {
                    round.hand = 1;
                    round.wind++;
                }
                
                // End game condition (South 4 ends)
                // Assuming standard Hanchan: if round.wind > 1 (East=0, South=1, West=2), game ends.
                if (round.wind > 1) {
                    endGame();
                    return;
                }

                // Rotate winds
                players.forEach(p => {
                    p.currentWind = (p.currentWind + 3) % 4; // Decrements wind value safely (East 0 -> North 3, etc.)
                });
                
                // Honba resets to 0 when dealer passes naturally, wait, usually honba transfers?
                // Actually, Honba resets to 0 if non-dealer wins. Handled in specific resolution functions.
            }
            players.forEach(p => p.riichi = false);
            updateTableUI();
        }

        function declareRiichi(playerId) {
            let p = players.find(x => x.id === playerId);
            if (p.riichi) {
                showToast("Người chơi đã Riichi trong ván này!");
                return;
            }
            if (p.score < 1000) {
                showToast("Không đủ điểm Riichi!");
                return;
            }
            p.score -= 1000;
            riichiPool++;
            p.riichi = true;
            updateTableUI();
        }

        function updateTableUI() {
            document.getElementById('ui-round-info').innerText = `${WINDS[round.wind]} ${round.hand}`;
            document.getElementById('ui-honba').innerText = honba;
            document.getElementById('ui-riichi').innerText = riichiPool;

            players.forEach((p, index) => {
                let isDealer = p.currentWind === 0;
                
                document.getElementById(`name-p${index}`).innerText = p.name;
                document.getElementById(`score-p${index}`).innerText = p.score.toLocaleString();
                
                let windEl = document.getElementById(`wind-p${index}`);
                windEl.innerText = WINDS[p.currentWind];
                
                let cardEl = document.getElementById(`card-p${index}`);
                if (isDealer) {
                    windEl.classList.add('bg-cyan-900/50', 'text-cyan-300', 'border-cyan-500');
                    windEl.classList.remove('bg-slate-700', 'text-slate-300', 'border-slate-600');
                    cardEl.classList.add('border-cyan-500/80', 'shadow-[0_0_15px_rgba(6,182,212,0.2)]');
                    cardEl.classList.remove('border-slate-700/50', 'shadow-lg');
                } else {
                    windEl.classList.add('bg-slate-700', 'text-slate-300', 'border-slate-600');
                    windEl.classList.remove('bg-cyan-900/50', 'text-cyan-300', 'border-cyan-500');
                    cardEl.classList.add('border-slate-700/50', 'shadow-lg');
                    cardEl.classList.remove('border-cyan-500/80', 'shadow-[0_0_15px_rgba(6,182,212,0.2)]');
                }
                
                let scoreEl = document.getElementById(`score-p${index}`);
                if (p.score < 0) scoreEl.classList.add('text-red-500');
                else scoreEl.classList.remove('text-red-500');
            });
        }

        // --- Modals Logic ---
        
        function openModal(modalId) {
            // Close existing first
            document.querySelectorAll('.modal-content').forEach(el => el.classList.remove('active'));
            
            const overlay = document.getElementById('modal-container');
            overlay.classList.add('active');
            document.getElementById(modalId).classList.add('active');

            // Populate dynamics
            if (modalId === 'modal-ron') populateRonModal();
            if (modalId === 'modal-tsumo') populateTsumoModal();
            if (modalId === 'modal-ryuukyoku') populateRyuuModal();
            if (modalId === 'modal-nagashi') populateNagashiModal();
            if (modalId === 'modal-chombo') populateChomboModal();
        }

        function closeModal() {
            document.getElementById('modal-container').classList.remove('active');
            document.querySelectorAll('.modal-content').forEach(el => el.classList.remove('active'));
            
            // Reset states
            currentRonWinners = [];
            currentRonLoser = null;
            currentTsumoWinner = null;
            currentTenpaiPlayers = [];
            currentNagashiWinner = null;
            currentChomboOffender = null;
        }

        // --- RON ---
        function populateRonModal() {
            const wContainer = document.getElementById('ron-winners-container');
            const lContainer = document.getElementById('ron-loser-container');
            wContainer.innerHTML = '';
            lContainer.innerHTML = '';
            document.getElementById('ron-points-section').classList.add('hidden');
            
            players.forEach(p => {
                // Winners Checkboxes
                wContainer.innerHTML += `
                    <label class="cursor-pointer relative">
                        <input type="checkbox" class="hidden" onchange="toggleRonWinner(${p.id}, this.checked)">
                        <div class="p-3 rounded-lg border border-slate-600 bg-slate-800/50 transition-colors text-center font-semibold text-slate-300">
                            ${p.name} (${WINDS[p.currentWind]})
                        </div>
                    </label>
                `;
            });
            renderRonLosers();
        }

        function toggleRonWinner(id, isChecked) {
            if (isChecked) {
                if(!currentRonWinners.includes(id)) currentRonWinners.push(id);
                if (currentRonLoser === id) currentRonLoser = null;
            } else {
                currentRonWinners = currentRonWinners.filter(x => x !== id);
            }
            
            // Show/Hide points inputs
            const ptsSection = document.getElementById('ron-points-section');
            const ptsInputs = document.getElementById('ron-points-inputs');
            
            if (currentRonWinners.length > 0) {
                ptsSection.classList.remove('hidden');
                ptsInputs.innerHTML = '';
                currentRonWinners.forEach(wid => {
                    let w = players.find(x => x.id === wid);
                    ptsInputs.innerHTML += `
                        <div class="flex items-center space-x-2">
                            <span class="w-1/3 truncate text-sm">${w.name}:</span>
                            <input type="number" id="ron-pt-${wid}" placeholder="VD: 1000" class="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 outline-none text-white focus:border-cyan-500">
                        </div>
                    `;
                });
            } else {
                ptsSection.classList.add('hidden');
            }
            renderRonLosers();
        }

        function renderRonLosers() {
            const lContainer = document.getElementById('ron-loser-container');
            lContainer.innerHTML = '';
            players.forEach(p => {
                if (currentRonWinners.includes(p.id)) return; // Winner can't lose
                lContainer.innerHTML += `
                    <label class="cursor-pointer relative">
                        <input type="radio" name="ron-loser" class="hidden radio-loser" onchange="currentRonLoser = ${p.id}">
                        <div class="p-3 rounded-lg border border-slate-600 bg-slate-800/50 transition-colors text-center font-semibold text-slate-300">
                            ${p.name}
                        </div>
                    </label>
                `;
            });
        }

        function submitRon() {
            if (currentRonWinners.length === 0 || currentRonLoser === null) {
                showToast("Vui lòng chọn người thắng và người thua"); return;
            }

            let dealerWon = false;
            const pointsByWinner = new Map();

            for (const wid of currentRonWinners) {
                const pts = readNonNegativePoints(`ron-pt-${wid}`);
                if (pts === null) return;
                pointsByWinner.set(wid, pts);
            }

            currentRonWinners.forEach((wid, index) => {
                const w = players.find(x => x.id === wid);
                const l = players.find(x => x.id === currentRonLoser);
                if (w.currentWind === 0) dealerWon = true;

                const pts = pointsByWinner.get(wid);

                // Head bump riichi: First selected winner gets riichi
                let riichiBonus = (index === 0) ? riichiPool * 1000 : 0;
                let honbaBonus = honba * 300;

                w.score += (pts + riichiBonus + honbaBonus);
                l.score -= (pts + honbaBonus);
            });

            riichiPool = 0;
            closeModal();
            
            if (dealerWon) {
                nextHand(true); // Dealer stays, honba++
            } else {
                honba = 0;      // Honba resets
                nextHand(false); // Dealer passes
            }
        }

        // --- TSUMO ---
        function populateTsumoModal() {
            const wContainer = document.getElementById('tsumo-winner-container');
            wContainer.innerHTML = '';
            document.getElementById('tsumo-points-section').classList.add('hidden');

            players.forEach(p => {
                wContainer.innerHTML += `
                    <label class="cursor-pointer relative">
                        <input type="radio" name="tsumo-winner" class="hidden" onchange="selectTsumoWinner(${p.id})">
                        <div class="p-3 rounded-lg border border-slate-600 bg-slate-800/50 transition-colors text-center font-semibold text-slate-300">
                            ${p.name} (${WINDS[p.currentWind]})
                        </div>
                    </label>
                `;
            });
        }

        function selectTsumoWinner(id) {
            currentTsumoWinner = id;
            const w = players.find(x => x.id === id);
            
            document.getElementById('tsumo-points-section').classList.remove('hidden');
            
            if (w.currentWind === 0) {
                document.getElementById('tsumo-dealer-inputs').classList.remove('hidden');
                document.getElementById('tsumo-nondealer-inputs').classList.add('hidden');
            } else {
                document.getElementById('tsumo-dealer-inputs').classList.add('hidden');
                document.getElementById('tsumo-nondealer-inputs').classList.remove('hidden');
            }
        }

        function submitTsumo() {
            if (currentTsumoWinner === null) return;
            
            const w = players.find(x => x.id === currentTsumoWinner);
            let totalGained = riichiPool * 1000;
            
            if (w.currentWind === 0) {
                // Dealer won
                let valAll = readNonNegativePoints('tsumo-val-all');
                if (valAll === null) return;
                let payAmt = valAll + (honba * 100);

                players.forEach(p => {
                    if (p.id !== w.id) {
                        p.score -= payAmt;
                        totalGained += payAmt;
                    }
                });
                w.score += totalGained;
                
                riichiPool = 0;
                closeModal();
                nextHand(true); // Dealer stays, honba++

            } else {
                // Non-dealer won
                let valDealer = readNonNegativePoints('tsumo-val-dealer');
                let valNon = readNonNegativePoints('tsumo-val-nondealer');
                if (valDealer === null || valNon === null) return;
                
                players.forEach(p => {
                    if (p.id !== w.id) {
                        let payAmt = (p.currentWind === 0 ? valDealer : valNon) + (honba * 100);
                        p.score -= payAmt;
                        totalGained += payAmt;
                    }
                });
                w.score += totalGained;
                
                riichiPool = 0;
                closeModal();
                honba = 0;
                nextHand(false);
            }
        }

        // --- RYUUKYOKU ---
        function populateRyuuModal() {
            const container = document.getElementById('ryuu-tenpai-container');
            container.innerHTML = '';
            
            players.forEach(p => {
                container.innerHTML += `
                    <label class="flex items-center justify-between p-3 rounded-lg border border-slate-600 bg-slate-800/50 cursor-pointer">
                        <span class="font-semibold">${p.name} (${WINDS[p.currentWind]})</span>
                        <input type="checkbox" class="w-5 h-5 accent-yellow-500" onchange="toggleTenpai(${p.id}, this.checked)">
                    </label>
                `;
            });
        }

        function toggleTenpai(id, isChecked) {
            if (isChecked) currentTenpaiPlayers.push(id);
            else currentTenpaiPlayers = currentTenpaiPlayers.filter(x => x !== id);
        }

        function submitRyuukyoku() {
            const count = currentTenpaiPlayers.length;
            let dealerTenpai = false;

            if (count > 0 && count < 4) {
                let gain = 3000 / count;
                let loss = 3000 / (4 - count);
                
                players.forEach(p => {
                    if (currentTenpaiPlayers.includes(p.id)) {
                        p.score += gain;
                        if (p.currentWind === 0) dealerTenpai = true;
                    } else {
                        p.score -= loss;
                    }
                });
            } else if (count === 4) {
                dealerTenpai = true; // everyone tenpai, dealer stays
            }

            // Honba increases after every exhaustive draw, even when the
            // dealer is no-ten and the dealer rotates.
            if (!dealerTenpai) {
                honba++;
            }

            closeModal();
            nextHand(dealerTenpai);
        }

        // --- TOCHUU RYUUKYOKU ---
        function submitTochuu() {
            closeModal();
            // Abortive draw: usually dealer stays, honba increases, riichi stays on table.
            nextHand(true); 
        }

        // --- CHOMBO ---
        function populateChomboModal() {
            const container = document.getElementById('chombo-offender-container');
            container.innerHTML = '';
            currentChomboOffender = null;

            players.forEach(p => {
                container.innerHTML += `
                    <label class="cursor-pointer relative">
                        <input type="radio" name="chombo-offender" class="hidden radio-loser" onchange="currentChomboOffender = ${p.id}">
                        <div class="p-3 rounded-lg border border-slate-600 bg-slate-800/50 transition-colors text-center font-semibold text-slate-300">
                            ${p.name} (${WINDS[p.currentWind]})
                        </div>
                    </label>
                `;
            });
        }

        function submitChombo() {
            if (currentChomboOffender === null) {
                showToast("Vui lòng chọn người phạm Chombo");
                return;
            }

            const offender = players.find(p => p.id === currentChomboOffender);
            players.forEach(p => {
                if (p.id === offender.id) return;

                const payment = offender.currentWind === 0
                    ? 4000
                    : p.currentWind === 0 ? 4000 : 2000;
                p.score -= payment;
                offender.score += payment;
            });

            closeModal();
            nextHand(true);
        }

        // --- NAGASHI MANGAN ---
        function populateNagashiModal() {
            const container = document.getElementById('nagashi-winner-container');
            container.innerHTML = '';
            players.forEach(p => {
                container.innerHTML += `
                    <label class="cursor-pointer relative">
                        <input type="radio" name="nagashi-winner" class="hidden radio-tenpai" onchange="currentNagashiWinner = ${p.id}">
                        <div class="p-3 rounded-lg border border-slate-600 bg-slate-800/50 transition-colors text-center font-semibold text-slate-300">
                            ${p.name} (${WINDS[p.currentWind]})
                        </div>
                    </label>
                `;
            });
        }

        function submitNagashi() {
            if (currentNagashiWinner === null) return;
            const w = players.find(x => x.id === currentNagashiWinner);
            
            // Mangan Tsumo base values
            // Dealer wins: 4000 all. Non-dealer: 4000 dealer, 2000 others
            // Nagashi Mangan does not use Honba. Riichi stays in pool usually or returns depending on specific rules, we leave riichiPool untouched.

            if (w.currentWind === 0) {
                players.forEach(p => {
                    if (p.id !== w.id) {
                        p.score -= 4000;
                        w.score += 4000;
                    }
                });
                closeModal();
                nextHand(true); // Dealer won/stayed
            } else {
                players.forEach(p => {
                    if (p.id !== w.id) {
                        let amt = (p.currentWind === 0) ? 4000 : 2000;
                        p.score -= amt;
                        w.score += amt;
                    }
                });
                closeModal();
                nextHand(false); // Dealer passed
            }
        }

        // --- END GAME ---
        function endGame() {
            closeModal();
            document.getElementById('screen-main').classList.remove('active');
            document.getElementById('screen-end').classList.add('active');

            // Sort players by score
            let sorted = [...players].sort((a, b) => b.score - a.score);
            const container = document.getElementById('end-rankings');
            container.innerHTML = '';

            sorted.forEach((p, i) => {
                let rankColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-200' : i === 2 ? 'text-amber-600' : 'text-slate-500';
                let bgStyle = i === 0 ? 'bg-yellow-900/20 border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'bg-slate-800/50 border-slate-700';
                
                let crown = i === 0 ? `<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>` : '';

                container.innerHTML += `
                    <div class="flex items-center justify-between p-4 rounded-xl border ${bgStyle}">
                        <div class="flex items-center space-x-4">
                            <div class="w-8 text-center font-bold text-xl ${rankColor}">#${i + 1}</div>
                            <div class="font-bold text-lg flex items-center space-x-2 text-white">
                                <span>${p.name}</span>
                                ${crown}
                            </div>
                        </div>
                        <div class="font-mono text-2xl font-bold ${rankColor}">${p.score.toLocaleString()}</div>
                    </div>
                `;
            });
        }

        function resetApp() {
            document.getElementById('screen-end').classList.remove('active');
            document.getElementById('screen-setup').classList.add('active');
            // reset inputs
            document.getElementById('p0-name').value = 'Người chơi 1';
            document.getElementById('p1-name').value = 'Người chơi 2';
            document.getElementById('p2-name').value = 'Người chơi 3';
            document.getElementById('p3-name').value = 'Người chơi 4';
        }
