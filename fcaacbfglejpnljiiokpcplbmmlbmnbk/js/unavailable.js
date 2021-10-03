const $restartButton = document.getElementById('restartButton')

$restartButton.addEventListener('click', () => {
	chrome.storage.local.set({needOpenTab: true}, () => {
		chrome.runtime.reload()
	})
})

function goOffline() {
    document.location.href = chrome.runtime.getURL('offline.html')
}

window.addEventListener('offline', goOffline, false)