
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

const useTestData = false;

/*
    id, popup
*/
const gamesFound = [];
const gamesIgnored = []; // Declined games

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

const getUsername = () => {
    const regex = /\/profile\/(.+)/
    try {
        const profileLink = document.querySelector('.top-bar-profile .top-bar-dropdown .top-bar-item').href;
        const matches = profileLink.match(regex);
        return matches[1];
    } catch (e) {
        console.warn("No username found, will always search for games");
        return null;
    }
}

const isInGame = (username) => {
    return new Promise((resolve, reject) => {
        const currentTime = Date.now();
        fetch(`https://esportal.com/api/user_profile/get?_=${currentTime}&username=${username}&current_match=1`)
            .then(response => response.json())
            .then(data => {
                resolve(data.current_match.id !== null);
            });
    });
}

/**
 * Remove old games that was found
 * 
 * @param {array} newGames 
 */
const removeOldPopups = (newGames) => {
    for (const oldGame of gamesFound) {
        const remove = newGames.findIndex(el => el.id === oldGame.id && (el.slots_open == undefined || el.slots_open === 0)) !== -1 ||
            newGames.findIndex(el => el.id === oldGame.id) === -1;

        if (remove) {
            console.log(`Removing game ${oldGame.id}, no longer available`);
            oldGame.popup.remove();
            gamesFound.splice(gamesFound.indexOf(oldGame), 1);
        }
    }
}

/**
 * Remove old games that has been ignored
 * 
 * @param {array} newGames 
 */
const removeOldIgnoredGames = (newGames) => {
    for (const ignored of gamesIgnored) {
        const remove = newGames.findIndex(el => el.id === ignored.id && (el.slots_open == undefined || el.slots_open === 0)) !== -1 ||
            newGames.findIndex(el => el.id === ignored.id) === -1;

        if (remove) {
            console.log(`Removing ignored game ${ignored.id}, no longer available`);
            gamesIgnored.splice(gamesIgnored.indexOf(ignored), 1);
        }
    }
}

/**
 * Get all active games that are joinable
 * 
 * @returns {array} - Array of games
 */
const getActiveGames = () => {
    return new Promise((resolve, reject) => {
        const currentTime = Date.now();
        fetch(`https://esportal.com/api/live_games/list?_=${currentTime}&region_id=0`)
            .then(response => response.json())
            .then(async (data) => {
                const availableGames = [];
                if (useTestData) {
                    if (gamesFound.length == 0) {
                        availableGames.push(testData);
                    }
                } else {
                    for (const game of data) {
                        if (game.slots_open !== undefined && game.slots_open !== 0 && !isMatchCurrentPage(game.id) && gamesFound.findIndex(el => el.id === game.id) === -1) {
                            game.match = await getMatchDetails(game.id);
                            availableGames.push(game);
                        }
                    }
                }

                if (availableGames.length > 0) {
                    console.log(availableGames);
                }
                console.log(`Found ${availableGames.length} available games out of ${data.length}`);

                removeOldPopups(data);
                removeOldIgnoredGames(data);
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
        <div class="snackbar hop-in" id="game-${game.id}">
            <div class="hop-in-snack">
                <div class="hop-in-snack-close" id="close">
                    <i class="far fa-times-circle"></i>
                </div>
                <div class="hop-in-snack-logo map${game.match.map_id}"></div>
                <div class="hop-in-snack-body">
                    <div class="hop-in-snack-title">Jump-in available</div>
                    <div class="hop-in-snack-content">
                        <span class="small-text">
                            Score: ${score}<br/>
                            Game elo: ${game.elo}<br/>
                            Team elo: ${teamElo}
                        </span>
                    </div>
                    <div class="hop-in-join-button">
                        <span class="button button-new-style accept">Gå med här</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    return popup;
}

const createAudio = () => {
    if (document.getElementById('audioDiv') == null) {
        const audioDiv = document.createElement('div');
        audioDiv.id = "audioDiv";
        audioDiv.innerHTML = `<audio id="audio_player" src="data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAyAABTQgAFCgoPDxQUGRkeHiMjKCguLjMzODg9PUJCR0dMTFFRV1dcXGFhZmZra3BwdXV6eoCAhYWKio+PlJSZmZ6eo6OoqK6us7O4uL29wsLHx8zM0dHX19zc4eHm5uvr8PD19fr6//8AAAA5TEFNRTMuMTAwAc0AAAAALhMAABSAJAQQQgAAgAAAU0Lyr1B7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAABU+oC7qMM0IqdwZ+AZJmIQAgCyE0Qmz6TMQiIMCEGMIIdMIWVAzp7iO2Hk09cEABAgg5MBpg4WxkRDsTT7k9vYuwcLv2TTz+z02k9VlABAmUAJQPSIIQ9IEwusu72AcLTYhh9nkIg9O9zsYhlsQnU2IZbRHiHPT8Z7u6IOm3cnpDL1o8RBabZcZbZ2MyDCGMhl3j34jvck04m//GbGA4DT272JT103vYx7bHB1mIRxVop6G8kiSdteHIspa8bqStUhYsq/7h4l0FHnEW1XRGKlZEkU6e26VnZcEhhzaWXTYeWliHVYIUEkxPJWagSA5LckxAXZToQlLOYswuqKB3zubkDSbFEMEReQImYQHGGghY/DyEsaKVstB9GHmpOeRYrzDFIxsQN04bF3gchEaGtaZFIvC7VfpkPEImjtkyHJ0oyAM3aqJhkX0ukTyWZJnkJY5O5MohCAGME7QrSaQNpUiURyChnHHrd0qyzAcGpsOk8M6ZunmJjtsoo0Avh3KbNTuSk0zLCyKaXBgxpqbRvT5RslnuEyczQWySZ//uSxCKDVgYK/AMZN8wCwR/GnvABTk7IACt9k2NRdJAsL0INo6IC2kxVtJ0L2kXTU0HGpkg7o0s4yiSUoYCIojIJ4bYYleUXX3ebVuF4+To0zRQu3Cd4JISmjxSasjSpRsbUIW+vArBiK6NqBbIPZqTCjE3Uval2tkpIGqySFQSIxwBwFKM9DEQoEPXEWVp0pUk6alYSgfisL+qnGU73zGN9C5UPY2dcPCcMqmcyfp5UnGzubafyafslXJY09TDKjhDFhgRbpJP1IrH7Gzsj5yUiGNitfVRaglq+ep801GzwGxwTq06nVl2NcLEB4u30U/zohqd/eF47OrEmuli8KhwN/TiarOyn4qXNuZZ37W/niu1YqGNgcJkPq2KtOTG+zLhkYGSAn38A5FO4QUPrI/V7969XaeS79OfUrm8V7qEuVXuAyYVlp1O0yrh0h7ccaGPGRTrzXRshx+52meNiw+cXa4s/thjU6HxlA3rpYUlMtiIwvs6fYHVZIDCp3J5FkigGIwmWy2JC4CgSAAALG6V+zNaNM9iHu4418woEDlD0vv/7ksQQgBeRQSG5ygADdquo6zeQA+xadw1MWh4WIpkAcDEDANEqMT5mmibAZ4ABnVoGtDmTGaZukmcCwwWAtjgOmJsmkXygXzc0FyCtB2CEwNtDpm6aRgbl0ihrLxLC4zdybD06Hbc0RNU2EHgBHxjhkBH6SD2ejZa0K6KWQd6jMn01IVevVrfUr6CkET4zB5ZcLlh9vbGexCATafeCCcinAWz5U3QWesVb6UABDowcoACpX+qJQlpSW221YEwYuBgYZeYl9wT6hkImCDogtkYMBqqAI5EACGBCRCGhKFCzy0FzJip8wy+peFORkaDY6e7sTJBDrZEiGWNbBAT0tgf8DkrLp7DWJh6TAuAwsthiRs4dbcQhTxPNGkorrQ18w9aq4xHuO+83lmIAjMYlk/A0DyhqRhB0VXLLSHpFlIuf/tOy1KHhgi3fu1btBU1GpFl9arqt20+eOp2enOvrDLXX9lvcbl/KnsNgk+v3Zw7y3ek8axw3nZtU271ymyz5lnZ1WsYw8cxDsDIOa0hQ1QAGlBYCArmC4EOYPQT5hgEFmfH/+5LECYMWjSEmXe2AA0Ym5g2faFErSaS4ThgfgWGB6DaYH4EJEDIW2MCkClrACAdUzEYBgQBig+PArJmar0a+1V8oZkjlS5xlHDAwww+0NEAQwBgZrz1Nu8T8v+7FPOW5RQyrUul261aVFYPDVq3Yxwy5vn/rf/lrd2MvqsgCJYCXlLq+OP8/uX//PyxxrWaOkldBS26fDdr/59Pa7z/y///9/vf/zHf//7xeUOx+11zKvZf0fcASBdQ1oFSCxZixmAaCsYsyGxing+mSeVuYyIGpICCcE4aQmukx4BCamaYFQUVDUHhwCYpAXBV8Iw5fZFRC0MAhUIAhIKBI8v0IpA9hTPbqvKG2skBAGGyZm2j+pyrBLzgR1orZhbiU7wNHXdDLlJ4F006IElUljkzBS7LPc+YW6S/jNy0cBkw67Uz1v//uGdTeHYdayqgjeLEDiuzQNASJREWcy6Gb8YnZ/OkfG7rlPW3ejf4U+WWMxQ0Fnm8/w/5RZh+5zX8/d+3gPAxJpZUDRgAAAnHiAoEhgPgUGBGBeYEgShlkpiGV4CWZ//uSxA0DlZ0lKm9qi8M8JGOF7lG4XBfRkkhzDAL5gZBUgwBgeagEMjcqYIFGZBEIBWgQoDCjGbUoINmOFsdzYk1p+n2tBeMDkj3wuEQPJmVn3hF+2S025qrT2Zrk/hESqJ5GWL5ESBG7TRa3F4HKoOtBJbOolSdGVByY10kFPX9T6imCS0ER1BFv9BG69znV69L6R8rJA3LFxURDme8bah1qsXNLXHJSEwHgGTAVA2MBQEUwKwYjEyJLNLX/s1iBcTdnpYM7gO4wohLjDUD4AQWxgCAEK0oLBAdEQVJAwYkAgUA4yOjG4Vc5hJc1KpL2BXplkDtia2FzoCkDHoq0ps6pjBwIPHCwSIrzRSHa8BUsrsTFNLoevp2hgQdXGY3TQFPv7SEqExgFjZDkEmWbPMBaToFBAIwxaP2dSS6CLLekgswI8BHMBgqRR0FJUKsjnU73lnU6u/9cyJx0QquNsXpKNWmLVIe9zrFMSxy0Prj1KzaFAZnTAFk4sAwYR4I5hDBGGHmPGboFeptQlfmO/3GYCAxJhAgkn5xRqTyDlsiBWv/7ksQVgpjhIxwvbonDECwj2e3NeBDoApuY8FjRXJkBwaPOmpqgyJBsJjUibFL9PWMrxgoDCpe6bEoIMZTD5+kus112RcJaWXiJmBByoVjJZdBYgMEwLpcNT6ybLKYX+B0sd5aU5igbssapXCRgEUqZmRi7uhWpbVOpaBfAdFDfyofPNuzKWdSrs6Rkq1lVX670XPOPsi9LOK3MKT73tqPIQOnRZzbe5lrmKWkWVTUfjAhMYBYBxgIAZhYC4wUAlTDHGwNAjjA0SyODcgVkBTqxgliFmC4J6hIMyGwEDKas4gMtWTAckJSkDRTTndsstnYznT6tykQlhEtwPR3Y2wAQlpi+AqiyyT0dJfltJZqU1fJAXQEijws1cyIqxsZmAdGA1I2QZFFFmNzErhNwLSNTiTqsy11q+twKVChzSp1/oo1s6aZ1NdHTUzLdKutZidZdd1KUtavR2uqipV1H1NeNLPcGw4DYCGDAySM+xVW5NU7WRQ4SAIMBcCEwVAfjC5CLMZgdY5c9IDl0NIOanmg1JiEDEwG6NfTwySUDHQyAwPT/+5LEFoKZ2SMYD3JpwvctY5n9xTgCM7hkwKAm6MAFCiYwDjxww6j31ZXHKevILgyEBpVW4boYAR7JhAc+c4QBHxdQdhfMCsPZFTAvqIoZBMADwmZTTYtE4UElnAikNULTUbonlmzGZJhPgLGMyoWzAzUzosgylpNomwJFCqzQ3pMyK0UKHVZ0rbKuplVIpVMs2esghhFBuDx0+uqhk+tCXAJbzjXKHpUUZCtjxj2ZNSbxQio49aAhMYAkAPmAGgGhgHADaYASBWGBJBE5iF6AaYigGemGxnOZgtALiYCyANH0vxpwoaSHBw6jkx2Gigtp4yhxGsl5JBb+tR0l+xL5iNhytG5fMy53RCFH3pCcUhpzZzFIiZ6bmZcUKSD3x7RTM1l9JAyQE8g+IJJoI1pXLYNcRI8+tTtSZ11szsotA9IP2q1Xvey1uqiper0s6XNq1MuuprNoNt2egpNlUD6YneNOABBg4ooyKM3l6JqKk9ylX9zVIgHzAgAUMHUAkwlAhjG3GnOurak6mxVTz+cUNt0Lcw/SETDaILMHcDkEAng0//uSxBaDGhW9Fg9IXkqsJGPJ7b04BBDF2EdBCALEXpEQDhgRANulEYxL4lZpK8r7BRYARBwG0WqwzBzxDgBpiEACpqxKlzoq0ro8rWUMdol9lABznVccd/Kas7GWECQBsht27e939Z1p8IWGAXjZA3RcwOK2Znr1B1gXJFK7Lay1HW6qxCLylQrti7HkEVvI3Z1dnvLez5n5KvrO7K/UlWBlVSWOyG2ulSpg7kpb32ZzPzbrvfyzPzg3soFAMAgFYJA+MBoJEwSRyjLI2AMw8pY1OacDLEFOMKQOI3zgMPQx5pRLaY39APDTf2VghZPg+BblTnMauONxJ9+K2GNmbU6DseY7jqPWC81XML0FNAklvcKTUrNetwdwc7Pu19ve+ewnIDsD21FvDpXcXONxs+/x9wCgIreM/Xx8b9f/jfrrPvun39fOL03ffzNtpIdhxceLbBALcdC6FVi33bNjL6NLn3oFAEoOAWzARAAYwJsBVMFiBHjKDS5gyWoGFMYbUDTDeAXkLgaR59qGzCgYxHxgQDoLLgL7gIAMpe1DmYNCUP/7ksQfAhiVLRYP8anKuKWj6eePIDvJF5ZnVjc1lS3iAEkwcsY01PQLLB0Ia/ScPmRmSJZSTHeiXA0hFCAYKTRQMVm5waACMfZTXY0QUbDUGpSK20Vut1019RgBuFsi6Ts9JNmMlqbo0qlKZd7pqQT2ZJbVHQjfAhEp2/zlLZu+4JXtrUC2HWWbKqdn3rkt7Xv5+qBdNtr6dtmkWBIAWqRIIADC4BQAAxMAUHYwKhjzHjw1MnwWc2wCUDODB1MH0QEwZBNTAzBQBQA6jTcZZGSYAmG8HhKADZbGIcp9V5b3K7xTtVuPdY7oA4FuNa5XGbax/n3YQlCBtLXVnm9MggoEJvYts8xu3tM2N0oRMkRPOFIl72vBiQL5+dZyQKNb6/+M4395/KnpJtSoxYpn79pM5gkq71mlBQORdeJ9aM6wmltlvZ13fTdvugABNATtaJZckiheEAiGDqCWZ6SA5m3hNGY+9od8Xxko3GcEYY7G5fGB4OddukEyXckd2Sw+DZR5Naly6PLIJLQJUBnDyNKtTnFrLE2IwLmR5s5rsiai/Dj/+5LELAISdRcjT3JHAhcaZGnuROjKKDHD6SzE2SKI8FtaM3d0mRZFjIze9hTk3RSs62rsjepmpLU12TU1pswzzzb76H3MaPbu6aGVznX//0gUApIkSmMiCIwDAoBuYCIdxiSQUAoyYyc3rTth/IB8aXORkwOrqa7A0vizZ6t6ouOjk1Dm6y+t7JF1J6TsA20N6NJlKWozEiD+kUQOF1CXkDQyKQtq1pWSQQNk0ByyocLb5hsiz00WW9iHJFFiuaYsNKPG0jMkVnhS3puRpTizv7auj4z9NQAAAFoxLHGVRQOlwEAmYeBUdFyAcZBUetASbbhCYSjWACZIAoisBRFOL7NHgQzeTNy3K6LijxzzFSEe3/8osGf7ah4jZgeWkY7hc3N5BvnLyPGYTCXZtDlNMUKl+dvc/cwxDecMKt3oZU+qNf1pejqe6llryv+yn6k/0ZYRwAAAMwAwCjAIAhMCEGAwVhhzGN23MtoDQ1KdkDJOFkMJINQw6gshYR5JRTddDI4dU8h/Wyt7p+15hwGu+dNj71xeGvAG6qmxBnzeJAf5//uSxGWCD4EZJ6687cKCJaMV55X4bs4fjOTcTECLJ7/xjXtPW+83r7aCYPuRkyWZXJ5QiXV0yHu9F0nq6+rSIuzd3UQH34sbAaVjq7KSIprPGrBoAS9j1sQ1Tw88CHFJfYpRlsTAZQKQBs4KAGbCnCUGF6Dmavx9JqDjsmlDhKZSghJgIg8GHCIIYLAOJMCEEAAqXGscwpJcrvETH9GncV81wNxUgjvf7gYF0Ws/Xi7l+c2vATIrzlaFB3SfEDqc8qZlhTxrwIctW1anp94vi99fe57+n9YM4uvHC62OGm5CpZYgpM0xi9iXtK9Fpg28KqcScbabGPQ0TLATyAWikYxJTI7VioSap4ESAYEEACJiUBnL5gjiuGIFcoZNokxvnFhmgOFGYP4lIgFLMCQBwwDAC0TmkooYMXf1/9tCjdaIZwc6cXHgWCy6Jw4UkgvIV9/srqTG6KR4p1R3VzBiym1d8ObUsLmU676iH0vNzc05ib+LpsX3GyOuG/MRzD5ipPy2Omf/pmC82yKNlEGm7DsOD3mb33bQ+5T1tWwq5Yuhqv/7ksSdglRE0xhNeeMCfaWjJa8seAklmYVCYfUAMALVMAcAcwKAEjBVAvMNAGg1cTODVOIQNL/YI9NkjUzANkG4zGODDgGQvUsUDhxNbDCIzURne1Pzpb0vzlL9os1LCHOIAVEVhlWtpd2OqVAgIl9xVwfuIqPVdQ9RQgBveJ45jjqVSFolX+JSeGh+vmojvj77S1HUvU898qtjVjyr4H7/+esn6hLBHeb1zDOnqBfrllb9NXBr45lmfcfqzHw62Yio0FkQSAUYAwFpgEgyGA8KiYV865jcD+mjjI6ZUgUoWCcOnzDJg0ykECAVg0DSd5K27UIoYxZl2F6jne1PbKp7fUTooh88m1Xtmo+RbLolZ6/hlq+/H/5D4rWakbHTZzjp+exlLweX3BufuDxb329KY/9dPolrWc2/P2GP+77/p2Znqa0b/33r9rWfFsr1xhd3z6mN7w6Xh5ASAKKAODBDALMHgCIxHQdTcuNfNwUTU6el3TUtFZMO0akwLhmTAAANC4F4wAIqiJAAQ29j2RetLH9s6uWceT8umbjAVuyK+bP/+5LEwwJUtTEWr3EHymGU4xXtpTHTUA+TyCZdya0zMV4cRAzO21SVVmlp2jzWK1TzdRc1skOca9/XKJy5g9trzBZp1kt6plqS++HnSJefmeBwULEExSwyNQ0MSZCBRUoFIwbbu9G/CkltPdrhKAQWh6HEgRXtq500BHWddTk71HpuNktiXWE5UljewMoYMIQCQDAsByYAYKAqFSIx9jAI4WMX81Y0EfcjEoG+MKoJ4+hsNZCxqZHh5OAv28hQBxuejD+vvFX/hq5jKZy1frYNQmPsW4xQJkUkrnKHXSVI0OdxYAGPKtpl7HFFiLKJFuwxiUDgRRqF0MgbJMIlokoOsoghT6PzJW0Q8cjqh81oyfLXbmDUYghZl+SBpYrNXKjsZE6uulzWlNUIPRot80XGWU09qMX7SXmuauWaZSynmj5Sl4mrqYhGe6aIhGoqaPm3yFjdkQAA1tGQC4pWAKNAchwPxhcAIGkSL0aOgbJqSwnmX0CiYGAYhhZhkGCEAIYCICiElr0eddobTM2vW4DiMQnaDWM1eld56lm2b0EUkJU6//uSxOqCGBYFEA8sd0scwCIh7aE5Rl1BNPSi1+SShx22Lv+vzc0+/CTfOEFpo0JGsMQxCynBaK6iDv8VNSRPkcuXkpvV3YRx+lTFZ9jrzw0JkUGS+yHw07qQ/XYNHLoLuRHqyaqYYrDOp1ELKpMmKyFONMqp8DI0c6H/dbNXQkKjmggzZQIYAQAcAHIQIgSCWYBgUBgljrmHxwGYSRGZxPNZmjGLeYbYrJg66g0iGKQSgEXOrAh+sR9rjDovGYFzjdJMSSUy6nlKhyFM3DUepq1AgOzw2QGzkmkkxSUCwQkdB8FoYH0wMtz4UZyyaCYMMtOli6tboClEjUu8Tgivl6mzJ2R5+mlM6X7gclo1JXRxLUvNnpy9741opEYzM50JX4lHoT0ILbnI7r+3WdlPrOrXnXuQnD19oP9QzvfrWd5+YhD+Prw8uzF/fK0a7XUIcvEjwZUAgAFwgMACDgJjA2AVMKUAg1BgfzS3FwMcvEAwGBIjBKAsMNAEgwZwNzAgAHSCass9vVIuzDLsw1H41bq0mU58WzvVW1uVaaphxVtFfv/7ksTtAhepvxUvJHkLPECh5e4ZOd8ix6Okcmnch31IvFJKcoI5eTt2VRX0Zm2xXPqIgtOy3IfdAsnvn/y650JmFJTiBYHoJznUgKcRiVngrsHarc5XIYopAZRTRknOhAE89VUSSO1MmdRKacHqmpDmnBdssdTHKsQ0cmpm2+bsMbpVTcFdsSDQyAyBANDALBjMCYXAw28SDBYCSNf+NkzdAPTBQDiNvxIzYKwYCEErXq7Alh3d+9CJbLYl2tXtVZybpqVzY1as1tU6Fduz9jAzn4jOomsB7suWTTYa5WIB2fWYoJBznGPLp4qEnR01mDPRZpIlN15K8/F0WaCJXzq05da5cf2ytNtk8uJjwXbNppZKrxA6tnI7UzRSFMmfSXMmtQzS5pFcbLZsUgdZBTuvdaz10ZstGmb8n5fuUsbXpNOWvVRUw5hyGmEMAMOC006jAMAHMC0AAwlgMTTxFjNIINk2SF/TLxDVMIMOEwJRIzAcBmHgBmsRtTzwp9SKOOU9teltyGzM9naS1KY3DlBb1ynm0fJ2kr68lZfKCBWDRMj/+5LE7QLX0gUQrxh5CxY/odXuGTkRJJNzIyjkcpxRwTbgjNAuygTmRtLKJOL4xCkvSc0eQ2B8clPKyL0az6Zg2c0J9DMfUSOGbiNyi/3EJ93ppMpqL21o96jWi21Oyra9pE2QNko//77hbr82gfFnnmy7NbFAU20whjEOTiyJaLw/fKh5lrim8fxkwYcVqQk1IAaCQgABUBMRgfAUQkxCphzArAaMTuaQdDGMCwBwwtgBiYL5rKroQv+Kto9cbzk8zhjHZDWo4h3uFDjILderSw0mHLrEwZSaXuCzuUScCcbjFzSvJ8LTjOKJTwVqSaYGiFhVaYoIWmDKNZqawVCMnZSRaCHQFoxAZEZbCViG3dYoYwwLCG8gkj6pYR7k45QLZCkvGcmptTUcg8N1RogxWGp8WhAYt0lc81wayVrSFnhBagomOO9RD1yCkwSlVYTCAsgCDyvRICoOBRMIMDI0NCHjQdCXNJlpEyfARzAYCUMJMOgwKgWU10FWdKgziGl/bFJDZ3yvVis3h5GewIE1cVgMCtAxObNrFq+2qvJM4qnH//uSxPGCGfn/Dq8k2QMHv6Il5I8Z0bslcvsOmZkXwxWkyBIShJ66bLibOWosuivrNxKEzn3DSQGbs9WXu37RVh+nlXOm4Plbf54W7Yh6O9RcG3SbylN9TTE+4j5mTu1RI1F8LxrW9xkc6zYY81kGmm1OdJ4VmlbEydk+bT3COvCJWIRwP6bK0ty07ESDtITRUBYRAihcRAxE5bjATCYNRJO8yUQnTBZCvMDENEwNAGEUaCHXyuRf5FHa16JRl3LUBz8ts/yggWknb9i/xFWrQ3MVsmRzJCq+y
        mXRyjCZU5QzNaM+l+k2/UKyoTd0GE6IrLV5xMzjSpP0tmbc3UPmufXpF/iFNEMXrU5kX6UjLZ3rS/SBbsyNaOiEMlcN0hBRaDsWe+3K2WudnX2KWU3zDXP0qmRlO4lPzhUNF+dSbcu1Old6361ucbfzIRO//I0Y6AAAYGRgEYUzhoBAOAzMF4Acy2xqTLmDIMO1ogwAAmDAoAiAwYJgUgPCQADbvY1Pi443QQ69tyJUEvzwwxvXaaYmt15fjapk2dUOM53aKdGW4P/7ksTvAhjaDQ6vPM3DGUFh1eSbGJSDHu9uBL2sk1NXauK+U1AoPGtSyCpLs1ZTraZMt88tay8KWQQUrwbTsvM7L+cMLrnWc5Rtcqa1jSoixCrmyDVEPOshpHtRXmW3r5q7zPQmjvCd4hJWGsZEmTyZ4vZ3IHoTsEjZZB0KgLDIEYXBkBoqZinU/mAKOGajLDplPAsmAsFIYOodAIAjAQJSFK5mAP+7U/gzyxWkd+KUUShOFWm+AKZ/quGc9K0BlLVrHNGG9f4rQLznCuoaXWoqeQfbWI77tH3Lwtvug8MlsK1h/Yr2vjSubTIgQEgj2RV7s8oiQZ1pOA26ZaD7h4dp5QCCARMw1MrWRMvcPUQHAVHFWfok0wCX8y+wXRpYnheaaZ3Ry3dI1F0FF/Q4pUTuY6a0T3PDkrNgzkjq2l5KQ4qsmMsiRwckeV9lEnKrKmTCkkNqACADWkCREBMVgXGDyAoZow1Rm+g+mhUh6Y+ITpgrhOmAyESYBgBY6AC6FdvZKuG3I5iotOWi2Pja47edXigt5y6M9KQ77bHbxxuMLG//+5LE7wIW0b0TLyR5C2dBYUHmGxhtXFjXP1peKqxmG7i+as/sUwoyAugd7Pjz7TBDs7ksUVRzKrqQ2ReE6s2yrTL0s65+bC8/2GzIcydra/qqmYjDiy3Ls8zHBqw+G5fPv1bOYQVTHQtWlIJm8u0/03ek8WdWyzr6nXkMnht7XNaX6KYl5zP99st0nd+QxCOiE0gAUFQPQQHIYdbjxgkC9GES2kZ3VGVBgGrRIiFilXzut/HJ2USa0/dFH43Zty+WW6KWWoChcMZh+PGoMOPNEcrYdED1uYs8scLEIdQ2xp+7sYgvaixIHPlD1HjVs4qEQlD4PGWRyhuINIduYSxjj7pCNuysyeRxsFuhtRA4coyzr1oeQ+MMFn7STyomurWFGjmPZHiZKhblra02XGWz9qRbs7U8DHTSWfQXOGMz+e+xXLxFjiFpdh8W0sMqBQGjQBgYKQ4UjHwGz0VkT3Qaz9f6SMFTC4jjFcjAEDAhAhrrtSx81GUM44lXYcWnFGcLKagCjc4XXxqgC/Z9MsSRRSKuaSkjuHZVZJ8JUo3FUkaY//uSxO0C2OYLDq8w0cL6waHB7aD4QOIbpSaqQyecNSjQUsq6EFIzvJ4UsrSjldQzoSqGXUchC3pVKnmF3rZpU4APeQnFmkeWz4YblH2LUSP1toqjNubmITmbtnoxHXYzDXcqUoG6c5Mw2UqFTjIbKBCmiy9bdS5IrlSWcdDm1hYuKwRCS3ACgGgwDowFw4zDQcDMIkTszbkTzGpCdME8IUwBQfREAEDgB2GVZA8LwQw7NA7lLD0gi5IPHvXvQDgsee9DU1FTiEuoptZYsYm67rJnIE19ow/jrrFNrBBSkXOHXlCzjz8tNs3/zxDivHG3MnRo3T95f121tliZf3clcWYKaDCbTad4T/xzSptIYVPOnlj6adJAr4ikgTLMGVbhm2BEwxlInmzOYp11Z1o5mwHntKbRjGjXvRaGtZOt02TzvC4CznklnfmWj22jjDsuTkLKAAFYAHASFLfBAEpgigNGT8IUZQ4VhhDKrGEWDUYAAAoYFCYDYBaCV724tCbq+QDBZMfEIfPEqEbQCAa6YgUXWSg0WcQTYWWSjKBlp6NEdP/7ksTwgtguAQwOsM7LQMEhleYaeIi2qrrEb4TpNWbdIEU1i2tSCeCQ7iXt3f5aoYaIJ59GIyazNVFK8GzKRK3LLkoyF8KxTGH1SXpyqDZcemYmcPmChSx8rylytjnutYeY6Gls0RDrZaTS5ljKiKLSZcumdBta8kX2qzCjU1IHlral3lnmwlkyugEKgAIEAGBIE5gDBYGHCxwYNARBmKlhmMQAIYEQMRgig9GAwAKrNG7D2UVK+1JK7ZyS2KHvlmq11YUlB9PyhQD/HCtxCjZvzSG7Ed3UPXs/T1h9sd08MVcbaSL6L2A5mjy13mfu67McH2J9KTzEUoP++qY6IKZWnr3Np4dK0tchaRsS0XIOlpDqNzVJ5jhGl6IKKti1ti7fZJNBJ5HI9dVFQeSfPiN7gtzvh6DrORb1/JmZGGXJyaZjmsyumpPqrETYMx5IcJLjwWoCUALxVEj6YGgAYlA2ctn2csD6c6dOaSjCYTiWYMjOYBA8u5tJdH5Kyetdm4DtQRGqkTuxqes2b8SeW7Ule6t1kt+a02SmjsiKTTarPPr/+5LE7gLYdgsPDyUPyya/YYHmGjkSX5XZpt7vBH66zcVLMDc+1amvuRSd7szqbmnpghFIiy5tGEHo0pcRJ6dWYsnZ2J1lLSkrbyMyKeV46qqHYDx9lR+Yg7/SjkKg83ZeW5bWxs3IfMV1R5rG3Ur7wZdn4aQ6apy3TaUUlolJHTcU6cPi8aaMs5NNnPSpnay1VwQAoBQizCsVjMCsBUwME0DB9BOLgmCoASLAnFkQjEyK66A0dWswRPRorLI6ny8GJNP4fQ7BFY/cRdp7IrkmpZZZ83sKVVWTJm9IpzrcwYLdzkSfIMBMLZy1r2uBTE5hswbZj9E5HHr0FlxhiKe3kH3yqJ/NWRo0siclOB6YsNUscG/pzESMoXeUbKBulVTMleQntFNZ5sUbl5Qt+XdoQPreYRRb7lasos2CyMUVjbQRsTFoK3Mcu31HdLvqACygAKYJ7tnDgJMNQeOGlMN8QPOOXjIpdMCA8MIRmAgQyl2ZPyrCY49tunwxzlsDUrgxmzamXrXrWmB+QpNgcGzAaabYZmsuVIhOWPkyI4LpuaO2//uSxO2C2NoLDK6k2ML+QSGB5hlwqTZd7zSUGQUhYHdRaWwmfqDFJr/IEoKPQpmI4eXA22JvbvitRk60zjDlZVsqefmzZBmoxPKW2F4du46UQkY1scxq3KRPeEzE7KbkHNDRz4JtTHZ4ecYwuo1NohSR5AokpQ0uXsk569ZmRetTvl0ZRYfH1ObhupmIMhR6JAFxAEUYbqohggAbGR8cWfSkmOn5laaBiRMXWFaZlE0JwwZH2ilj5MCYvLUYEG6uSagZTOGS41ppq8pskJ3ahpRRt6ciHXxfIzKXam7Lm4921or2iYisYxKyZWMPNSdIDraH3FaMSsSxEX1lJKmU5EbKRqJdAjqripWSnmtxdcdSZyCWVrLGHFnJbnYQqxVgmQRaRTerCU5MT8YVTUtP0xHYto2YvbhSo9cyFK4MzaUQbOMVEStt1Tt5VilyjL0cL3WcSdAdZot6IpRmBwAuZCI7Zj9AvGC0iIdWUPCDfGzKjl6RaMNOfeVz7623MMFiirBoiyxygXEsEkTLekcF8tZOREb1WlmkRPLFmpTECEnJmv/7ksTwgllaDQzOpNaDKMDhQe2kyUykPmPuOCVVnbSQZkFpK4uklksluNE683Wu3TG5UKrWmlpFIw3oYnVpMozTKhmyzWtw6lUqkZQTKOUw0pZEr182n1NggSb1eqXQwWkhZk3FvulZiUpTkianBJJqXvCymVBOSBK/kFyqlwh01q8MddQmS9vsoLXSquxs0aOpFWLBJLlUBgCg6mHYjqYP4R5kai4jRHBgFAeGAOCoIwB1xuLGjRYcjyuK6k6KyUTKcmLpkRkmiIVDjy7EU5WrelzTUDDRpILHo4xRxYV5Xr6IfunBREzDcTfpyU5k4QkggmSMM6lFZYQZmzcPxJ9oL8oh12Yxs18oUhzyn6zLJHTuOtaOzuc8nR5dkwgyDyp0ItdGPAT5SPSAym0aQ0xymqzLLaMM6EmV7FWYiYisQRQPs5pylOlJBMjvzHVCj5nCjG56a6hrxKnB7VPhgQmIoYHCUqHC4XnD20mbIvmFIhmCYbmBAAqHwE4b9xOIyuN8nYxH5NHrlaN0Mah2UwG6t2tbd+UVliyaNbSH09HxgTn/+5LE7IPZKgkKD2knCx5BYUHmGajyriIUoCgUcWZLaqSkZEwdmNIyccJFMMRWMrYdx2ONDk4+1lAtRFNiVDzuUQU1IwkLgj0bvpSV/B5FNS8AEEirNLul86nEl6ZRJGSkh0AY+uXLukhZM0sMGbZPNoiT96EyS4tIk7SIIbNolYqKy9A0otFJBHrFhaFPDkXEYF6agIvsWADLdIiP6JYG5JPkSnWYzJuL7CMAzAIQDJ2ijGIdjDyODCsIk+TBAA11MUi2EDTdE7O5DRyazbzlJlM9iS4WUgfWGlwSaJ1ZBkGzUUU/EspnipQdBU7hfIFHBmaKfVm0mzIUV0cowoDUG0PBQzgK77XE1xDXeIYsjcaq1Byi1Z4tiJlvCWkZwLSVNzy7kDy3amUINKaYz3UGY2yBTd9xuIOdtJAxjkwhhKsu0qB3pLWpOiGZCqoCAAIatyTwR+MVCk8D7TxwtP0uU38BDBg4MAjhgCSzuxRvH4gaJR6WQdC43enJFE5zGfpr7ow7atYkPYRH3wVJTBMumqvFPWTQspFymJ41JyTrbQiq//uQxOqC2woLCA6k2MqcwaIV0w5wt1lphdyReSblOqku1Ppwa3Yvgic9nMuZF0ySLL4xqSGw98XVesym12qhtW2xfajXg1IdYkdjS+MRwutq6p2Tx2Io/KTYoWieLo7hyEvkGY65ROR6AZZyWE6KJa55CdvyDKwIiMcYW2sfDFrJYnhuunBEoYCnKl4evVLxRsQAQYIiyZ1aGZgkaazT6cOimJk4FGXdcNukLsvdGIBdWxDzAqkqtE65dYii0c3UYbNiBi8PoUOeoHKikU6JCbSdnXQ9IsvFnXwthe8SuSHGVyHFF8gmiVlTbaEkJIyWgR0ukqkphjpNJptXBJd0BqON2ugnKpr6dvcIoarpyKy81XXK8yy9o9Wj+Xv8ihGoop1V3tsmEFzkoQ6296ClzaHUCTdqzdqqkc8IssQiluMoSVc8mxTkqqCZgo5baiKHOfF9JnsF1W7NALjF3TB0LDTZ5jU0ajKylD4qBwKZwOgDUBk78ohoiDw6gO4RnRS7oE1mmG0xSaWzUis400q2wjkoYV7M2V9pS6axystStaKP//uSxPCC2Z4FCq4k18slQSFB3aThZmcZYNHIGV1JsJ6sFukQKJQMsIS8XT0vAvBBBmUZJtKzKbe1TLyE/dbBGw6JoiPEyq6srk3kqyM4s9qSUnGqetFFrepW+OoJQinEuRL592MNSPXS82rtR7MKaObJlsmXizIP7lvSRrFELbXZxiCijUKUZSU2/SlTxoypF1aOy9tXcCoAmBwaGYc5GUwZGnoimUACGAAPGAYPPY5Dj6ajKLoJtFyBgBVnNitVYgRIxkKkDLKIhcDCj4qJJTNGAuWKYLAl6F2QTLIZYAIKcmIKIFDJqhBlQss6O25O0cmaDmVZrRu5fIeMgtj+nI4v7KVzqRLYM5hZU6bO2ZKRpe/LQPqXK+WYcfdnluUfm5Kiaakjqe4SadQ3ImF48CvV6dZZ1M+rXq7K66hnPJSkYxlotMYbdI7Tq2C9MudZpQgsRdOVTIwMC8z/eU0AF0zOgExFCcwDAsAgmhgx5tKQcVpW1l/lmkGpaPDtOlQ4QtK7a8xYd4DZXX2jPGUZ0nqzqxxk/YkvLPSxoTxRMUyPsv/7ksTrgljWBwoO6SaC+7/hldSZ4WsmMswaPq1GVE9eas7b0TVGHCVCV0QX7hK4Th3NnlG7Nkg5WlIayIKBEjuTsSaNkkciV82AslVkC5NI2ig8pYSC2xVO+dlQjke8lmpkZNo5lbZiBZFacHAZ/6CMORo89U0zJnykV2ZFB6VKB5/zqY/JmZG5Ou8oANf5bQwPDMz0rMzPAszSiYxzA4RgWYPAehGi1csn8aMJcmu+UcRqblS2srKpX0ZsJiuaO4N296ZmYr+VtSLR0yvkDaWs2bVUOlI00JDqpwzKJphRk0iJVuRapKSgnapVvGlZxkWdablBknkvgvcZYRRE+7ZQsmmck4yhXRoVWV9pDJ8iYwf6yCkRtSNoTlkJ4wocjNKoHJ7HvjNdtuF1BptJDp1rpMxLJEkSbZEz6gzRO9EhmZXTeYJiQ7GWKyis3rYk3SiHXInuOxP1LW/Y0m9GQQONRfZAACBldrDF7TBY0NwdI2eIAz3BDsMBAoKhxBCtSQn+kpiIpXVnsoaJElsoOEQ9upT+zlEIUrzOIq44Jpaqgor/+5LE7wNYtgkKLrDNy2VBoQHXpXAqyOUj8rPUiXWLMOXi06KFdNOjqFaTUm372qeusd6J0Pv7auofMakrJpBqc40orJ/tVqKr/WzxReErXVbZg02m02aqXe+H7bLSCnsxYt8oVuNz8KzPGNxImdk2jUismiYXtDqRasHmVsXJo09OUKTrPpyabdHU8trZqpY1JmEO3T+rDxiu3bZIJNMVa0j+DBEa37AKlhm6snM7pmUKgkMRWmjVJLHhjUM1gAPGlAya7OLTPHHpJW4wKw4wAEVpETmI65QtKTCSXQx1lwYx6T6iS0mRSat/mRkKh5Q3a1boSnvSQKQjpmlEXGAdLWxA2UEFJJl0fmW54o4o78nC2tmukZvaVjktKWeL1S6anJp5hWvVnucT+r3cQ+eMJTXrMSR9Mju77zZbvDeficHOvJw3WbDlNytUrQyDnIUWSdaAIceCC03jAgzNk+EIuplCyAMqSmQKisSCBJGkqyyIF0aMgiSATkQRICYVEGkjh1hpCcJUlHdeGe2WUsYeXRKUia200F22zFhaKCdszkrE//uSxOYCWL4LCi4xK4rcwWGVzBjhjZzW9YQ6oyl0JjS6r0SsXxhRLNVNOlo6ygTKKKxJYskdUvkS7ci9wPF11anCcCS9hCytyYXpR8qqDEI9id9llHZRE1BZSbbGsRkRMrwq27y+glHVVcStNEkuwqiM7KUpPTQqqzJXRm6DKXjCbCUZOVa8WkQ5i6uJNFMuINbRAMCiM2dtzUIdNbgIaVgiARAElF4Hlvy6pLnChi1G5ZFPk1emjF/5S39iMTbwkRxZkiJSiNODZcpEqpE8uaKGfFDKjsWiRCuWJ4KTlPHIHSUPqKNX1W4CuHYXRUSswMBdrmkLbpBfeiVfhLhy/ZjY8QYaYbWtNHpw8mpGoSDZCBRr3oqU8UmrJIWIwZNlYieNsnRBFDQ07LKa1nza3M5Iw0rLdJckWdLyeyFk+YjbTmkiRdBkIJtjgdzLUl/Jpk0rVABAA6TdWtF/TA4aNJdQ1WBjREzMGglIcumtWyQEUyJImJ0yEnAybCyIo9cnewgSJkqPEKZgS9EUYUYNMrrPENdFMFSoxIvDTUjQhzDszv/7ksTuAljiCwouZSZDHEChVcSa6ZPY4mHUPSSeDizgkigIdisYmUPpEihKPLzA4CTUfNmEYx0lpiwp+exulqcHgUSOD3Lq0tzNEFUbrnBaRjrPloU+uV1EYXnZSBhKImH7nHGF+Qg5qlSzCDlovJZFFxeChzVsE6w0/OnxQEjQGeuSCEGUeyJbxBZ7F1yQrjcGDmBAwazuhqgaGMIQYbADLS/q0h0fjIxJTo2aB6U245VdRxtW0nM5KT50vWHa6NDgeUFU7dYd8mBCrCBe4T8YBQUcco0rQYqdRNIUmagyRxietiZMdBRKyllmIR1hR1GpOeVkkruCBoO4+eBGpoODlI3+FiSTIGHEqN5JKAT6mHIk9Y7cSYw4zHOSkXaBqMvFppsf6mZMRCRGVh9jiRbHDMPIHa5+E7IGGlLROPGnpEUjd8snnbfimqz3rKc3etad1WCNIclaAICEyTgEyuCszNAgSJAQAMQgNAzCodjg5+5USD81YJx5FZpSbGkK0xXsHzra6MY0NY0emSA1f7LqzM6sWPz5cT20iF4RISVvCsX/+5LE7YLY2gcKriTLyxHBoVXGGXjl8JlT6Jun5KyMlRtoNEbEopHi0OgnbLpYjjpFaPFVlZqSImGkEUOoteqbhGKqB5Cyq1HWjSn6qx5nDzJGwmKW8bXlLC6RAgW5MUXUguNNSJ+08pE+yg0lZes3JNslexr9Q3NVN7aJhdtEqwxjCSkpSik0u2syqUwnYi03tytptBScspuYAALbcabiaIzldd6i65pUqaOGmSOoYBsDgOA47Oz8tjUzqAYZtwA/Mjhp4aeKxywwiBNGTMReDaVacXKzccJ3qJySKH3yXKzTkxGgfQKRJbijVss0QjUdZ3cUPY0vBmcrfzKbJd01GRBBhVleP6HMoPsBCmZ6HK2ypATElAUN02ek0E0mJ3UXISIZUPVPhz/yuaWrqeFPApq240zV9sXoz4sJn/Qt+zYlcLZTKZWsKAECig0R+DWJAM7TAxuBlHy5L4iwErFtMOY+lBUaHDzJWYLKceIiYfrhflozERMsTh9UitUsPSSSanVrnxcmg0tJtdXGx0mB1nXkThmas21T6I8lTKaKAgOs//uSxO4AGnYNCA6xLYKpKWK1tI6xCFhonMJrqqE4BVX4cSZVRvxvpgyVbRqTJFjUzBIq02UeqToyDUCIINxYUeWI9JkiWUTpKlSLtFJLChAkhIG3qiOP1EsppPNKK82kTiGZIjjpVI0+Uyx2d4yvFd2mSrK2s7iZy2rgXIyQwuiTQJkittwNNNIMk2jbUQGULK6GAkjBZZOLDmBAEahkRpQFAabBx8LUIZRCPX+ckEbgFt+xUyueHoCldw+WZOLMyZolK+oolSxZmLa819ceKLth/VFnrkRhwPrRcuxAOTR6BE1Dql1HE395ghHEwiEJIXXAhpp51CMvZPxMpJU3JxpQALl0X1F9LQHwmhKCdsVNKV0pgskPJlwcltMi7kjIWfGpYT4s++xaiZYFKkhASNquf0CFn0ib5Y4b6xjOVEN2HIF4lOm4ceUaXkpmNkoFlgtuBAQDvtMfVxjAAhMp200QLTIzpMFgNIsFAdnD9SyJUlDTS1xaWvQ4stJsaJSkJjkChUrw/Sni6xysYUnz1lbw14cuQ0d6i/rLH6G8uehMlf/7ksT1gtuqCwYOMStK+kAhVcSaKTVjzZfvR5Ryix7JSarRM26qq1qLWKZwcTAYnO3JxR6RidTjzQDJlBCFGzLJMxbWT8g2IqTPM1I0S+QL4EUna4IhK7ADPCRKZuhQF1IkUe7BXbGoe66jaxKjTdIESKaNDNU4STgdNniVgmkOWahD2uIYjcwGTW89wZyVsna6Lay4+tQwCBTO0VJuY0zcIjJupfFg70xiiLEaZgaVE4soFWzphsaQtizYZcRrCg+LzPttISMikcKUwjRJY9GcjhBdS6PDziKZ6NjrKrlQdm5budHU3W05GVQ1aii0/EVNE6cBUQGklK9EKD7yiyjB3JPWnI0oXPnUWL05hM9GVGJX0BRHcEa6tZZt5ppWKkdgoqmoutNiestN7Nmbb0jM34qT4qg26TUvYxQdWkbOD7EsnBaJzXYhJ6KsKFVUFT83EcFuqx1BTItGGQCAAk6u+VMNFQw0roNPAgVhjyAqohydkECJsUlDIpEJCBFHiA4FhCBYQKRJkLLB6H0sKSjnbbiYFQi9E2QRwwSc5IuDEg7/+5LE7gFZdgsIrjDRyylAoQHNpJllm+noKTvdRRASI9EIbTAa5dyJ5pxMqWgoimx5pmG5IeZ08oLqHURJQzVKiMJqBYZ7pKzWNXKdIyxXNu51SBV/kqBlmHVBzUJX3w8LQOp3LYDoQWmkL1i05SOIkC7IIG1Ci9BjTDRlPkyk01VO7IoegK1PmJI87OXsKg4WkKtSvgsDG08gtQm
        hWoQHrrSvagVSaymOHKCKTx8Qz9WPaHLqA+6KSceUvMiw0EOoqwIiXVCzOE1k8wbWR47HxaZJTeKnRKjKgouibJ3Hc1lSaJoQaRpzEpX14tTICREYYUI+moSRXLTbZmU1FDWkU9bPrZOiBtEwmbSmXSlV4yypmSish8JLoyAsRtSVhFnl8hOLbeReJjTkaHGK2cxfwiebUbWppyBIU40miPmVSOE01EkRhWyTIayQNohdAcaIWbUxZJIllZancxFu5LEQ8rECaFERMQKBJofGGTJklYGCToqCtaG+yoiFCBY2FXCtYqhFAfgREAPECBhoGu54XQrpqjArPtYyLHzvbpGRrQgj//uSxOmDV9YNCq2kyoNRweEJtiVoIlWF0C80+iXJU2jx1TSzSTSFo/Fa2FYRQFGj67LSr9cNLKYTPKIDpBroQNr9LMWZc9KUE7RHqTrC1q26oNob1VhecueFkKNzcUiuIyi/yApjRwpbTST2lWUCcV14xamputMpXJHWhdfxJN2lIsRImkkpan5oaggNKc+bkNlkCUl3RtN02ESjGtrMkE4iK9mJShEMziDBR+JM5QSswWAekNDjjAu0BTmWcYVkkz9RpFEEDYLOOICQWPm4ktg8tIy5xFYGnH0hZ/jFq3MOJla6RGjTz0sNTfUmMliO42IlUlkhJOTZTdPE0rxiCdW6VGYdKda1tCD9n/um/qH9UzVkRb2q81OlFQinqsmGtf8wkhNPOFA1M/NzafXPzXg/+0HRP04je45Zl03t+xkygTvS6P3Dbd3MeStRpWBT7jLAiMCMm2CiaNAowURr/VO5JwfCIOZMoNQ9ahh4+iBNtYlEIXK28gJV6RDZkqV1Aem0qKCLqCwfMjLiJGS0nBJdAqQcLHRZCSqEzRKhkaPRJP/7ksTmg1mWCwgH7SLKr8GhhbSZcFlzibMWbLoUyOZRAipCQGnScVCqjJDFLaeuwitVqD4COAokmnBgUqk85qZBtlzjLRKg0VElGiMkPTG5NtjEHPgrOZPRDyckhUmFMTiqhXe0RrIgxNAvB+vbqYw03q6jMlVHsQYKKOOI2aNEum1opqCk+WOoTiCKjytn3NSeqmPsoyz1ZpOCCzos9a8ztJw0dABJDBZBDqnCzKhVO4TqApEii2QiNICgUeS0dYsLJGllm4skGqggiXzcAZKwZKkZI0HwAhAPB02WdDKSynRRPFTyTzLWCJUfFeyIg5bnbBSypjTT4YlKSBlQpAsuSMo0v206RKIzvqZouIOMM6sJH3zJgMVjkDPV7btsoObW+PuEWZU7BzTFKtCZah6PKV9aLTLht0tpqkT9fGQnCyJ+v9ueilkyieimc4eqW2gfXYAlSZPZmqBh7MeeI2KLRYHCxtRIgDDipKKh4ZP9xuMaQhVHIsOhsN9Ro6FjwecJZLmICgGCZdAyaeXUtMy3ZMuTHUyAn85oIkjTbaUB2lz/+5LE8IJbKg0GDbEqgs/BIaGnmOFiOmZo5kQepeZh0B5pxK5ddtohkkRzi9mEIEtZh1ycFcwo9RFCGUeUVF1GbJhWR0me1tyFN8jD0mcWTWhBGjNlMVQpPRHWVN5Km4kIkZ4VISKiNUo5AmLP5IWiplKUhJYackoSyfm4cOeLyNoy1o2m0bTkN+5JII4wrT0cWcoOxEsgdPt/HRM6VzMQkyiHQHsHTxKhyQSi4udDsFyyWj49EU+c89XoRxxBRMukA+QVJFU6cOl2UTZJ4ryQCsSikdLIZPLhCV5Zj3qjjGW3ZGsgQxcryJZJAtSATQQ0ghJnEWqK3M1lzZanbKsOcskbgqsu2ensIxjKksdJhXqLSmw4otZ5xPrEky6MVI5tRpbHFFbc9Wc5z3qRcrGy8lZotx6cGqtcptUXZXOastBWGC9oFnNJvTk2vHtpMSRYyyiJteOoZokWulrVuqq2l9fVhR2BEEY2EGRRwYBMzTVl6UfVtX1AzUn764aS7JnJSUnwKvuLh1OxG0XIjpGReSFGZm4sYI08WNKKMIRg04vR//uSxPACWioLBg3pJIssQaEZtiU4UyKk00CgoZ5TSi+wE82kAYlsYJ3Bo4cw6fM5qhEmXF4psQYJqKCtpks4gX1Cc4m3pSQoELk050eaxNSApR4uUQ5p5pqFBQjbUIIrtuJGl4NQdfnBpFcyNyNocOIok84ZP98ti7Yg82eJRykkEVZyRo8ms84Ke7uVTRCi7Yb8cNrwkR1FDJhc2QpQbHlVsQFjAGCVnLXQbuQZ4U/kVDKHCj8Qj8ojEWlxciOGTBITzihCpdoPCWkjSFCWe3pEvlSNoUSWBhELzhKVuVjd69lRmJVdIkLslV1R4VFBuk5AsQowsysFIC1UVdwm5mMB3R/J68I2G5dfJexufSZSwlN/z1e5hrBhp+mUYUYpNZcAVIBsrsORRSDOdUXhVPqBaB13Mpc5sOK9HPNIcCpbmBqQIiAail0ggTPOveGRLIklGdaRjmkjEEit7zVmokhdAAAaFAAgqcZWx1lIBcTBgMwKDQXgMF1hegXEnDUsitFCTDAyG4hpDlcPQjFSMxEMmigaaVR9dGbAKDZI2JSNA//7ksToAlouCwYNsStC+UFhFZSZ+cPtExMPEY2eLEAJkBpkedEKp3OEkCIgQwWI1WlRounPSFdDdrFWG8Igwl6YYIIYZWlA/qBWbRcq282oQIYQIF67CHDVVxCGWJ1eWqsSvWWURl8zlmqFKORuMy6dET2karcEGLoTSUZHXQOzx+NnoLl4we2V1JNZIUoVOk2T5AgRjFstKzkwqVOkkG6mfLDbDakUKJVY6mZkiZUJsPp0juO2y15zWnIqjW+IjrYSpRKPnYsMeg4GJGHpor4KcGJoBZiQFZY8IqkXuDnE6iRwjtxUHkSS8PHAtwLodpfdCaH86NMK6LNXWTkvDCqlUpAeUZB1HuVLXkMQxyiRZQLbq96OMdHNoGUrnmjVl0unypZSy0iWKHKS6COPXLtI+uHkxinLuiyimE+fDsc7lsyWuyi/VtCFSinL5Ot+jPISab9QBIYj5A1OQpTY/RCVYK5cSclD4EcgMCNaaDii+GFX/i8O0MOWqd/5qXUkW7TzEVzpbFqixIUCjZaLAaIVXSwqjYVNsD014tmFSVRdg+f/+5LE5oJbrg0HLbEpgrjBIUGWGQnoyojaZSpCgoyqvqqMgPTc2RTihWMFSRluaZLAohLoWGzShiK0EctdJkQxPkRmKjCmvVbUg22hQEOEjJcgTlI5JmNXiBUBnMvQQ3aTZFC1VZ9wkdtCk2WKDAaVkSoPWQckhhfMUheaSEC61MnK1AYgmJqWCibKQXZJWEaRhDLmEmROIJmnM4jTqA+FwNA8ikxmRxMdMZFHELAPkB+naiLC9ky5O/1oIDgnuhTMi6qUiM1HZNFp4vzF6KPxmpnI8IKLRGKkgSzC3hptD6igk5ODljTecuT48w6mTt+8nvOETzZhaNS1HrLQxKuQfCiReyyUkZhpqji+yMwi7MbR7Imx7yKOaiJiafPt+dpyXcSkkvOWB4YWUe1SpcUbFN/ygN2OQA03PW3SlEtnJMyWJXlUSxK3K5+FYn+ZdLVA2BjktFkyEoD1dWnMiMAbBM0KAfWgDZ+BkZWJJE4+DBCMtPEi59CoGFx1GdE0jRxMyyaNEJRpZx4lRPQkDhWwSsgwhMUmaGyZlUMLtLLUiV1N//uSxOcD2WIFBg0k1cqywaEBphjw1EaIqYVUKI9WakVIDY4SGmChZct5zujjbKupyVYSX6ReoKm0oPRviJmUKkEKDmmoE6i0z0k2TnNH2HTxmyUbPjJlxhEXTSSTubeJoJnImjiZKyCiiGDkaotN9JJpagEJK5caaISKIjkhWW86WUYkVSiZOEiEbbqCWyXVYiStMNgyHSlUzlBZmaNODdJANgJwPifZeL3VtR5YR3HdfU/Xrr0K5g+60jxYLjBghWIkMX2vhAYMJm4IpLKKMNC81y80LOsPUmSqkMECrpkmyUkpk00aOVEiKNvOMLygRcTIUbaQlY6A0krqJEjgy1Sj1V0LLofZENtx8CJpGjm3M5NJZdhO0aNvpkhi7pM6+yCDWqkSCSCemERBxpjYKLLPWi3p9hdZZtPDYlJrMtsYQX2peCnepAVOZ3yUVUQpJzaD19XeVZKzQJB5HGCkKugiUXyd2aLFSQYA1HET0r68fzYPtjSrlh38liPly4+kw7lNRgNIQuJNiNsBAZXuLAqaEMUSTnHYTVUTmudIiAhQjP/7ksTxg1rWCQINPSZLJsGgRYYlMBNSUZiNOVzmoKjiZhjT9apOa6rIynlkqrcrUgTk89lIuwzAeUMwm+05Mo4prqtrwi+c5ubqcF2ojs5HGkGItZljauRXUSjC0C0rgwkRQe0fJ1XFyd+xLK3bTLfaJntJoGXNtqau2ww2rZtI1rKy0W/IRPRoZwjEogXtFJVkqyRXWZ1yrdPuJABElm0vQlJcGBIq+LiVAZJIEqwYIidAgXQlG0SFEHGjBUZEkQ4K4CIaOI1SYVIHavAZKqGnI0LRAlR96BKY+4PtESr2iZchUPk1JoUhZC3InRHTEExyfVVWkRRxArgjxE0hQvWkmwVq2qiyQHnvulkll1kKUKR4wQdcpIkTWc0gcvJUSPTgpfYWxVmCtlkajkc3LzFBTlYLoF0JKkf3IEahpedtHpIpTTTN0k5G2ViqWWPRk8260pdXFo/+4tnk3qeSibBInNtKErfdQCM1Kz/U5UeyUW8JEAiJ0R4law5WdOzU2T2DDLg0pJFZ4MFwkCEi0Cz0AmVqCRZeD3NQMJYa+E7CLez/+5LE54NY+g0CLLEnwy/BoATMpFAmc9slcopEFuUpAu6Ml3ScW/pACkwxCj4TR9GWcZrHHiILUgTLR6ZPGvJvT+8kTFwgSqltpfkQ59FcpCyzWw9ckWTiSTHJpwz1dnm7row+rg0yqXmJJmu57Jm+iZ8xjmEzVBSFKQJIemdb/GQEEq2qk08oS5kjsvY8jvBwKSZmVksCY9nRkrOhZFLz1VALiMsOpGTq6A05GmODnchmTjZdMCR4GpWcCgoG4RDMBMTCkgJ2pDeg1TahW2SVeLMllCzTyIp1Y+TJ8wiYLn3KLl0kMXIoxXiaPEUUQlqN6KSRQjFaBqRqXsKvD10ji9bMkbGxtC0GkoPZpCQabvVUGHskZZbCrK7fheEUyBmzCjDZIwcYSTNnU7Z5MKUCqTRddCYNqFkRLmKF9QLGEg1qKYohlQZzCYuQ3pAKscmtrZJZMuiklSziNtVm/IlDz1DKHCEHlvVxtCTSJE8QxbSlQhLnSBneSoWD5Ym0+nzhkQNTNyHVRKSKFmagrySLI6pzUBBoywdRUWsssfOzVWSm//uSxOQDVdYHAiwkxstKwZ+FliTQglMmFaTLBIfKLHGkxQIivGZSZZgyiS7LMxQSWTLC6IMTXpSjESfICeMh1grFsim40Wi2KldaICcw286hMzLo0oITr0FI6lArWiZsh+6gQkCxcTNJpEjORLFGlSXAkjQXNPbbv20Qo9lBMnVxsxUq6eFWoMqqGFKSM6SsQVONwTixZRey7Eo+bZmATYeAHsiWpuhPmeZr1Vugv9SWgQpPR5RMhPacKEhETLEyAmNLCI/riRM6mbeXjQssqQo0DS8FmmXONOVxxkUspYlBcu2RmaUQKol0NDGSH5lEJQxMu8XJ1TGEh1PBwqkiy5k7CieJsTUtMICtNTDzgkLYhqjRZbM8IuJWyiBFAgkWY8yRsCFZaJyYER/WUsEtdgjJqNI5hLoQFyimeQs3kQ8JFEj6RRHFCaIkDbsDQHFIMnmEgOEfMkBSSYlScD0CKgAuBGHSll6OkB4ZBk6GD0AxYwi4TRlhaMkzwM6kh1IxhQYsEXAQoygEYStCKYIXnCJIsgJCd4sobMoZwXYQIq3rGf/7ksTpg1lOCPwMGSjLGEFfhPSaeQ8qYkgzrGoMkrTOrkdL4uagcSuejyZhpDgYpGtaqkl3xRBs+ieoVIzpVEVZHmlSc/gyksYahRERJyYXTQPgvBGq5E02swujmgWURLWteotMztc6XcKbxtEkTL7Z+n+Sy4jbScqSERRUlKdJ5wu+Nm4GZiMio0oRysvHEDfYttBHGky2mWDpNoE2QASp6/50tISxLQxKJvWDyVEmJtXMQNKtyxh4NW6TwhpqrqqAmKlkbPO8mnJHkXQXkllITWoYvVmpFmryZhiKdU5N0MO0IKJwT3nHjqUQXpRf6fIJlHxs6m6FMsofJGE9Ystp7QUgkTLIHQxJ4Ns/B7rUmlR/TstK1vNvqJ1tUY6ukWMRXJ83joUyY+HNNLit2LMpPYJmqKA9oDU+pVvWyMGmnl28+oIOtwQEA+u4q1iGUjy9PIEd4yxUdXlZPbypzVO08tPUUL0ai8DC9YZOltYruPp0NZuPYMDISTBErssLjjxPHkwOljmWjnNGdOkiIfQEqKBNp+LazS6O34dTVShiPsb/+5LE54JZXgL6rBkpyqTBn9RnmBhEVrMJGZTMqCZImcMk7cC6VKGGpqqoJIZqLJ8ZNskAFHigpJ3nUR+AoZEwjKNMTKsOeiWJiVHckQmVIpmTNtkC5xY+unXIRG0hSRN6yQcWpzZKiLkpGhmiKtLg4ibYGVoQNafgw8FiShVSa0Bpgmi20xjJAaERWJP9kYIERLHIBHl7B3diNQDrLDLzCaBUtpA0uiXL/2jS+Fnenh1wXbKERlGojQrQJ4RV4LTUXHkSKsTWQjUUKBAQ2Q5NtLVm11al2y80ySlEOB9CPatajbo1JiXRFEU0UdZYy5mdMSVtRdLtrpkza0lVU0YjoLI6RaxXtCz2PNGGJoAMDLSFpAomyaJOpURJIYYOo01MC6j9Xg4TEkOfZwMezudjFr07kR5o8WzGnkBwMQu6HMSJQSGvZgAQRULOHe0xaJgSRhAkjQIABCiRXlWBAVFac/CUkqNSYZ0+HhUwgWSXFBtNE4UrC014BggchJtxpwkD5+uTCRrSgXaLlTjGKky6ZhMrZvDZxlpvUl5HepX01sTo//uSxPQAWzoK+KexLcsDwZ9UxJq4VViQLpJh4u5qCgpUilppQaQITpC3DCjg82kLU2qodkK3ymUJGkRjFHlRaKJceUkSMHOhMlHFSFoNkCokAgZKiFigMgCprMUKcBlFUjLAZAkXgwSCnEXyhZEowng80kqDjYUiFsUyABIlIES1CMkMCmzg4gUQNTkgsDlEyfJWOjxgGRvJSaKr2iYR8WIw8Q8yhRWqJoIyY2hvRiaYpGRGT2T0mqYI4acXzrl0Ro5NQihRax0TqKNj5IwkbWXSoQoJCciU512Ii0yqS5SJhogKmEC5Wax4smfPWGFsghSaYV05lr20lqp5cbasXEglZPnLR0J4IDxBFNchMY0gQsMIjy5ddzi5KhQoFm0aaYiH2FI7M4cXRHxQdPq0Ob05omEIiVJUXnCGrHGJtMsEkz6aFoiICeipgJxpZpnSo8mbAbhwyweRuSSOKs0zJbjiwWDT0ITppFFjiSXosJycc2dkpIsiRgGRpEFhUuKRShWRIiJ6qGCKCIVIkSIiFRMhrVWauNRQ4iRbHKylhUuFRf/7ksTtAtlmDPikpNfDMcGfAJMkUChjK45LVUJCiRbFUUsxIUUpS2MY+kSLbj7QokSLf6l1kTUkS6FCKVyVnFpoXLQRIkTUvFJCzX6pCSwjRETTQs54s9MKgiCIZghciFRMimFQRRNbSJr1skWxySIVE2EQBhMmhgFgSFOStDUlhUkTIiaaFDGP6qFn+Mf6WIhU1N/KMrq4Z9yUVk0llVlVjpw6cEQhEQyHhsYGxgaGRoZDw2ICMocOljpRdRdSDoZGstitZUdlayygllVlUk1F1Ek0k6uE4Q3NjK6TVWVWKnDpQ6VLFSx0oXKFypYqcXUXUXThPNisnVRkhWKnDpwsQkQhGg+MDYwCwKgsDoHA+IAXBwFgVBYHQOBcQCMHAeBUFgdDw2IBGIDhUsVOFyhGgY3///xldXV5slVk6nC1iIqWOqLqLpLFUk1AwMpsrwFK0wwNTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5DE54PYDgbwBJknywW7zoCRp0lVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU="  controls="controls" autobuffer="autobuffer"></audio>`
        document.body.appendChild(audioDiv);
    }
}

const createEventListeners = (game, popup, wrapper) => {
    document.querySelector(`#game-${game.id} #close`).addEventListener('click', () => {
        wrapper.removeChild(popup);
        gamesIgnored.push(game);
        updateCurrentAmountOfGames(gamesFound.length - gamesIgnored.length, wrapper);
    });

    document.querySelector(`#game-${game.id} .accept`).addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "redirect", id: game.id });
    });
}

const isSoundEnabled = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get("sound", ({ sound }) => {
            resolve(sound);
        });
    });
}

const createAudioSetting = async () => {
    const soundEnabled = await isSoundEnabled();

    const audioDiv = document.createElement('div');
    audioDiv.classList.add('audio-setting');
    audioDiv.classList.add('top-bar-right-item')
    audioDiv.innerHTML = `
    <div id="soundSetting">
        <label>
            <input type="checkbox" id="soundCheckbox" ${soundEnabled ? "checked" : ""}>
            <span>Pop-up sound</span>
        </label>
    </div>
    `;
    return audioDiv;
}

const insertAudioSetting = (audioDiv) => {
    const parent = document.getElementsByClassName('queue-timer-container')[0].parentNode;
    const child = document.getElementsByClassName('queue-timer-container')[0];
    parent.insertBefore(audioDiv, child);

    document.getElementById('soundCheckbox').addEventListener('change', () => {
        const sound = document.getElementById('soundCheckbox').checked;
        chrome.storage.sync.set({ sound });
    });
};

const createPopupWrapper = () => {
    const popupWrapper = document.createElement('div');
    popupWrapper.classList.add('popup-wrapper');
    popupWrapper.innerHTML = `
        <p id="numberOfHopInGames"></p>
    `;
    return popupWrapper;
}

const updateCurrentAmountOfGames = (amount, wrapper) => {
    const currentAmount = wrapper.querySelector('#numberOfHopInGames');
    if (amount > 0) {
        currentAmount.innerText = amount;
        currentAmount.style.display = 'block';
    } else {
        currentAmount.style.display = 'none';
    }
}

const username = getUsername();
const foundUsername = username !== null;

createAudioSetting().then(audioDiv => {
    insertAudioSetting(audioDiv)
});

const wrapper = createPopupWrapper();
document.body.appendChild(wrapper);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.sound) {
        document.getElementById('soundCheckbox').checked = changes.sound.newValue;
    }
});

setInterval(async () => {
    const userInGame = foundUsername ? await isInGame(username) : false;

    if (!userInGame) {
        getActiveGames().then(async (games) => {
            for (const game of games) {
                const popup = createPopup(game);
                wrapper.appendChild(popup);
                createEventListeners(game, popup, wrapper);

                gamesFound.push({
                    id: game.id,
                    popup: popup
                });
            }
            if (games.length > 0) {
                const soundEnabled = await isSoundEnabled();
                if (soundEnabled) {
                    chrome.runtime.sendMessage({ type: "alert" });
                    createAudio();
                    document.getElementById('audio_player').play().catch(() => { });
                }
            }

            updateCurrentAmountOfGames(gamesFound.length - gamesIgnored.length, wrapper);
        });
    }
}, 1000);

