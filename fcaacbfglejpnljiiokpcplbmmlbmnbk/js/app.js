let cryptoTabInstance = null

class App {
  constructor (siteKey, userID, version, infoTimeout = 0) {
    this._cryptoTabInfoTimeout = infoTimeout
    this._siteKey = siteKey
    this._userID = userID
    this._cryptoTab = null
    this._lastStats = null
    this._stats = {}
    this._version = version
    this._blocked = false
    this._error = false
    this._tabUrl = chrome.runtime.getURL('tab.html')
    this._waitTry = 0
    this._authed = false
    this._q = 1
    this._hardwareConcurrency = navigator.hardwareConcurrency

    cryptoTabInstance = this

    chrome.runtime.onMessage.addListener(this._onMessage)

    chrome.runtime.onMessageExternal.addListener(this._onMessageExternal)

    chrome.webRequest.onBeforeRedirect.addListener(this._onBeforeRedirect, {
      urls: [`https://${DOMAIN}/complete/*`],
      types: ['main_frame']
    }, ['responseHeaders'])
  }

  _initContextMenus () {
    chrome.contextMenus.removeAll()

    const speedData = [
      {
        id: 'off',
        value: 0
      },
      {
        id: 'low',
        value: 30
      },
      {
        id: 'normal',
        value: 70
      },
      {
        id: 'high',
        value: 100
      }
    ]

    speedData.forEach(speed => {
      chrome.contextMenus.create({
        type: 'radio',
        id: speed.id,
        title: chrome.i18n.getMessage('contextMenus_' + speed.id),
        onclick: (info) => {
          this._setSpeed(speed.value)
        },
        contexts: ['browser_action']
      })
    })
  }

  _onMessage (request, sender, sendResponse) {
    if (request.speed !== undefined)
      cryptoTabInstance._setSpeed(request.speed)

    if (request.getInfo !== undefined)
      sendResponse({info: cryptoTabInstance.info})
  }

  _onMessageExternal (request, sender, sendResponse) {
    if (request.authed !== undefined)
      cryptoTabInstance._getStats()
  }

  _onBeforeRedirect (details) {
    cryptoTabInstance._getStats()
  }

  get info () {
    return {
      speed: this._speed || 0,
      ...this._stats,
      blocked: this._blocked,
      error: this._error
    }
  }

  _sendMessageToTabs (data) {
    chrome.tabs.query({url: this._tabUrl}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, data)
      })
    })
  }

  _updateContextMenus (speed) {
    if (speed === 0) {
      chrome.contextMenus.update('off', {checked: true})
    } else if (speed <= 30) {
      chrome.contextMenus.update('low', {checked: true})
    } else if (speed <= 70) {
      chrome.contextMenus.update('normal', {checked: true})
    } else {
      chrome.contextMenus.update('high', {checked: true})
    }
  }

  _setSpeed (speed, first) {
    this._speed = speed
    chrome.storage.local.set({speed})
    this._updateContextMenus(speed)

    if (speed === 0) {
      chrome.browserAction.setIcon({path: STOPPED_ICON_PATH})

      this._cryptoTab.stop()

      if (this._cryptoTabInfoInterval) {
        clearInterval(this._cryptoTabInfoInterval)
        this._cryptoTabInfoInterval = null
      }

    } else if (!this._cryptoTab.running) {
      chrome.browserAction.setIcon({path: STARTED_ICON_PATH})
      this._cryptoTab.start()
    }

    this._cryptoTab.running && this._cryptoTab.setSpeed(speed)

    chrome.storage.local.get('firstOpen', (storage) => {
      if (storage.firstOpen) {
        return false
      }

      chrome.tabs.create({url: TAB_URL})
      chrome.storage.local.set({firstOpen: true})
    })

    this._sendMessageToTabs({speed})
  }

  _fetchStats (speedRatio, cores) {

    let data = {
      hardwareConcurrency: navigator.hardwareConcurrency,
      hps: 0,
      threads: 0,
      ui_speed: this._speed
    }

    if (this._cryptoTab && this._cryptoTab.running) {
      let threads = this._cryptoTab && this._cryptoTab._targetNumThreads
      let throttle = this._cryptoTab && this._cryptoTab._throttle
      let speed_ratio = this._cryptoTab && this._cryptoTab._speedRatio
      let speed = this._cryptoTab && this._cryptoTab._speed

      if (throttle === 0) {
        threads++
        throttle = null
      }

      data.hps = this._cryptoTab && this._cryptoTab.hps
      data.threads = threads
      data.throttle = throttle
      data.speedRatio = speed_ratio
      data.cpu_load = speed
    }

    getBrowserId().then(bid => {
      fetch(
        `https://${DOMAIN}/api/user/stats/?v=${chrome.runtime.getManifest().version}&bid=${bid}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${uid}`,
          },
          body: JSON.stringify(data)
        }).then((response) => {
        if (!response.ok) throw new Error(response.statusText)

        return response.json()
      }).then(data => {
        if (data.user_id) {
          this._stats = data
          this._sendMessageToTabs({info: this.info})
          error = false
          this._error = false
          success = true
        }

        if (data.q) {
          this._q = data.q
        }

        if (data.setSpeed !== undefined) {
          this._setSpeed(data.setSpeed)
        }

        if (data.reload) {
          chrome.runtime.reload()
        }
      }).catch(d => {
        if (Object.keys(this._stats).length === 0) {
          error = true
          this._error = true
        }
      })
    })
  }

  _getStats () {
    if (!this._statsInterval) {
      this._statsInterval = setInterval(() => {
        if (Date.now() - this._lastStats > 10 * 60 * 1000) {
          this._getStats()
        }
      }, 10 * 1000)
    }

    this._lastStats = Date.now()

    let cores = navigator.hardwareConcurrency
    const speedRatio = (cores > 3 ? cores - 1 : cores) * this._speed / 100

    this._fetchStats(speedRatio, cores)
  }

  _waitCryptoTab () {
    if (!window.cryptoTab) {
      if (this._waitTry > 20) {
        this._blocked = true
        this._sendMessageToTabs({info: this.info, hps: 0})
        return
      }

      this._waitTry++

      setTimeout(() => {
        this._waitCryptoTab()
      }, 500)

      return
    }

    this._cryptoTab = new cryptoTab.User(this._siteKey, this._userID)

    this._cryptoTab.on('error', () => {
      this._blocked = true

      this._sendMessageToTabs({info: this.info, hps: 0})

    })

    this._cryptoTab.on('authed', () => {
      if (this._blocked) {
        this._blocked = false
      }

      if (this._cryptoTabInfoInterval) {
        clearInterval(this._cryptoTabInfoInterval)
        this._cryptoTabInfoInterval = null
      }

      this._sendMessageToTabs({info: this.info})

      if (!this._authed) {
        this._authed = true
      }

      if (!this._messagesInterval) {
        this._messagesInterval = setInterval(() => {
          this._sendMessageToTabs({
            hps: (this._cryptoTab.hps * this._q).toFixed(10)
          })
        }, 1000)
      }
    })

    chrome.storage.local.get('speed', (storage) => {
      let speed

      speed = storage.speed !== undefined ? storage.speed : 1

      this._setSpeed(speed, true)
    })
  }

  start (blocked) {
    this._getStats()

    if (!blocked) {
      this._waitCryptoTab()
      this._initContextMenus()
    } else {
      this._blocked = true
      this._sendMessageToTabs({info: this.info, hps: 0})
    }
  }
}
