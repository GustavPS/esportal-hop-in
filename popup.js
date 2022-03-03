const soundCheckbox = document.getElementById('soundCheckbox');

chrome.storage.sync.get("sound", ({ sound }) => {
    console.log(`sound: ${sound}`)
    soundCheckbox.checked = sound;
})

soundCheckbox.addEventListener('change', () => {
    const sound = soundCheckbox.checked;
    chrome.storage.sync.set({ sound });
});