
const testData = {
    completed: false,
    country_id: 210,
    elo: 1459,
    flags: 1,
    gather_flags: null,
    gather_id: null,
    gather_name: null,
    id: 4040744,
    inserted: 1645272363,
    players: (10)[2534824, 13537829, 21018516, 41082076, 99562042, 119683233, 225821137, 1003633880, 1087759358, 1093262257],
    region_id: 0,
    slots_open: 1,
    subregion_id: 0,
    team1_jump_in_elo: 100,
    team1_score: 5,
    team2_jump_in_elo: null,
    team2_score: 13,
    tournament_id: null,
    tournament_slug: null,
    twitch_viewers: null,
    match: {
        active: true,
        ban_maps_team: 1,
        banned_maps: "10000000000000001000000000000011110",
        country_id: 162,
        demo_available: false,
        duration: null,
        flags: 2,
        gather: {},
        gather_id: null,
        gotv_host: null,
        gotv_port: 37335,
        id: 4040768,
        info: { game_state: 8, warmup_end_timestamp: 1645281280, warmup_remaining: 6796 },
        inserted: 1645272829,
        is_eligible_for_finnkampen: false,
        item_drop: null,
        last_ban_time: 1645272875,
        levels_achieved: null,
        map_id: 5,
        map_pool: null,
        medals_earned: null,
        missions_completed: null,
        mvp_user_id: 0,
        player_ladder_id: null,
        players: [],
        ratings: null,
        region_id: 0,
        rematch_no_votes: null,
        rematch_time: null,
        rematch_voted: null,
        rematch_yes_votes: null,
        rematching: false,
        server: null,
        sponsor_id: null,
        team1_avg_elo: null,
        team1_score: 4,
        team1_win_chance: 0.5067154693427619,
        team2_avg_elo: null,
        team2_score: 10,
        team2_win_chance: 0.4932845306572381,
        tournament_id: null,
        tournament_slug: null,
        type: 0,
    }
}

const games = [];

const getMatchDetails = (id) => {
    return new Promise(resolve => {
        const currentTime = Date.now();
        fetch(`https://esportal.com/api/match/get?_=${currentTime}&id=${id}`)
            .then(response => response.json())
            .then(data => {
                resolve(data);
            });
    });
}

const getActiveGames = () => {
    return new Promise((resolve, reject) => {
        const currentTime = Date.now();
        fetch(`https://esportal.com/api/live_games/list?_=${currentTime}&region_id=0`)
            .then(response => response.json())
            .then(async (data) => {
                const availableGames = [];

                for (const game of data) {
                    if (game.slots_open !== undefined && game.slots_open !== 0 && !isMatchCurrentPage(game.id) && !games.includes(game.id)) {
                        game.match = await getMatchDetails(game.id);
                        availableGames.push(game);
                        games.push(game.id);
                    }
                }
                if (availableGames.length > 0) {
                    console.log(availableGames);
                }
                console.log(`Found ${availableGames.length} available games out of ${data.length}`);
                resolve(availableGames);
            });
    });
}

const getScoreString = (game) => {
    if (game.team1_jump_in_elo !== null) {
        return `${game.team1_score} - ${game.team2_score}`;
    } else {
        return `${game.team2_score} - ${game.team1_score}`;
    }
}

const getTeamElo = (game) => {
    if (game.team1_jump_in_elo !== null) {
        return game.team1_jump_in_elo;
    } else {
        return game.team2_jump_in_elo;
    }
}

const isMatchCurrentPage = (id) => {
    return document.location.href.includes(`/match/${id}`);
}

const createPopup = (game) => {
    const score = getScoreString(game);
    const teamElo = getTeamElo(game);
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
        <div class="snackbar" id="game-${game.id}">
            <div class="snack">
                <div class="snack-close" id="close">
                    <i class="fas fa-times"></i>
                </div>
                <div class="snack-friend-request-actions join-button">
                    <span class="snack-friend-request-action accept">Gå med här</span>
                </div>
                <div class="snack-logo map${game.match.map_id}"></div>
                <div class="snack-title">Jump-in available</div>
                <div class="snack-content">
                    <span class="small-text">
                        Score: ${score}<br/>
                        Game elo: ${game.elo}<br/>
                        Team elo: ${teamElo}
                    </span>
                </div>
            </div>
        </div>
    `;
    return popup;
}

const createEventListeners = (game, popup) => {
    document.querySelector(`#game-${game.id} #close`).addEventListener('click', () => {
        document.body.removeChild(popup);
    });

    document.querySelector(`#game-${game.id} .accept`).addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "redirect", id: game.id });
    });
}

setInterval(() => {
    getActiveGames().then(games => {
        for (const game of games) {
            const popup = createPopup(game);
            document.body.appendChild(popup);
            createEventListeners(game, popup);
        }
        if (games.length > 0) {
            chrome.runtime.sendMessage({ type: "alert" });
        }
    });
}, 1000);