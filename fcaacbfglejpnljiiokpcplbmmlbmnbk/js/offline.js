function online() {
  document.location.href = chrome.runtime.getURL('tab.html')
}


window.addEventListener('online', online, false)