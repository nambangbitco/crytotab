const $errorMessage = document.getElementById('errorMessage')

const $totalBTC = document.querySelectorAll('.totalBTC')
const $totalUSD = document.querySelectorAll('.totalUSD')

const $BTC2USD = document.getElementById('BTC2USD')

const $minedBTC = document.querySelectorAll('.minedBTC')
const $minedUSD = document.querySelectorAll('.minedUSD')

const $affiliateBTC = document.querySelectorAll('.affiliateBTC')
const $affiliateUSD = document.querySelectorAll('.affiliateUSD')

const $referred = document.querySelectorAll('.referred')
const $refurl = document.querySelectorAll('.refurl input[type="text"]')

const $mailBtn = document.querySelectorAll('.social-btn_mail')

const $speedbox = document.querySelector('.speedbox')

const $balanceMessage = document.querySelector('.balance__message')
const $balanceIcon = document.querySelector('.balance__icon')
const $balanceSatoshi = document.querySelector('.balance__satoshi')
const $balanceAnimated = document.querySelector('.balance__animated')
var odometer = new Odometer({
    el: $balanceAnimated,
    value: 0,
    format: 'd'
}), odometerInterval, odometerNum;

const $newReferrals = document.getElementById('newReferrals')

const $slider = document.querySelector('.slider')

const $email = document.getElementById('email')

const $login = document.getElementById('login')
const $loginDesc = document.getElementById('login_desc')
const $settings = document.getElementById('settings')

const $hps = document.querySelectorAll('.hps')

const $setSpeed = document.querySelectorAll('.setSpeed')

const $minedOFF = document.getElementById('minedOFF')

const $speedSection = document.getElementById('speedSection')
const $speedSectionFooter = document.querySelector('.footer__section_speed')
const $blockedPopup = document.getElementById('blockedPopup')

const $rangeInputs = document.querySelectorAll('input[type="range"]');

const $loginPopup = document.getElementById('loginPopup')

var referredCount = localStorage.getItem('referredCount');
if (!referredCount) {
    referredCount = 0;
} else {
    referredCount = parseInt(referredCount);
}

var installDate = localStorage.getItem('installDate'),
    loginPopupWatched = localStorage.getItem('loginPopupWatched');
if (installDate == null) {
    installDate = Date.now();
    localStorage.setItem('installDate', installDate );
} else {
    installDate = parseInt(installDate);
}

const updateInfo = (data) => {
    const info = data.info

    if (!info.user_id) return false

    initApp()

    if (info.error) {
        document.location.href = chrome.runtime.getURL('unavailable.html')
    }

    if (info.blocked) {
        $errorMessage.style.display = 'block'
        $blockedPopup.classList.add('active')
        $speedSectionFooter.classList.add('blocked')
        $speedSection.style.display = 'none'
    } else {
        $errorMessage.style.display = 'none'
        $blockedPopup.classList.remove('active')
        $speedSectionFooter.classList.remove('blocked')
    }

    const totalBTC = info.affiliate_btc + info.mined_btc

    $balanceSatoshi.innerText = totalBTC.toFixed(12).slice(0,-4)
    odometerNum = 10000 + parseInt(totalBTC.toFixed(12).substr(-4,4));
    odometer.update(odometerNum);

    $totalBTC.forEach(item => {
        item.innerText = totalBTC.toFixed(12)
    })

    $totalUSD.forEach(item => {
        item.innerText = (totalBTC*info.btc2usd).toFixed(3)
    })

    $BTC2USD.innerText = info.btc2usd

    $minedBTC.forEach(item => {
        item.innerText = info.mined_btc.toFixed(12)
    })

    $minedUSD.forEach(item => {
        item.innerText = (info.mined_btc*info.btc2usd).toFixed(3)
    })

    $affiliateBTC.forEach(item => {
        item.innerText = info.affiliate_btc.toFixed(12)
    })

    $affiliateUSD.forEach(item => {
        item.innerText = (info.affiliate_btc*info.btc2usd).toFixed(3)
    })

    $referred.forEach(item => {
        item.innerText = referredCount
    })

    $refurl.forEach(item => {
        item.value = info.referrer_link
    })

    info.speed && updateSpeed(info.speed)

    $speedbox.dataset.referred = info.referred

    if (referredCount < 5 && info.speed != 'off') {
        $balanceMessage.classList.remove('hidden')
    }

    if (info.referred < 20) {
        $slider.classList.add('show');
    }

    if (info.referred != referredCount && info.referred != 0) {

        $newReferrals.innerHTML = `+${info.referred - referredCount}`;
        $newReferrals.classList.add('show');

        localStorage.setItem('referredCount', info.referred);
        referredCount = info.referred;

        setTimeout(function() {
            $referred.forEach(item => {
                item.innerText = info.referred;
            });
            $newReferrals.classList.remove('show');
        }, 5000)
    }

    $mailBtn.forEach(item => {
        item.setAttribute('href', `mailto:?subject=${chrome.i18n.getMessage('mail_sharing_title')}&body=${chrome.i18n.getMessage('mail_sharing_text')} ${info.referrer_link}`);
    })

    $email.innerText = info.email

    if (info.social.length > 0) {
        $login.style.display = 'none'
        $loginDesc.style.display = 'none'
        $settings.style.display = 'block'
    }
}

chrome.runtime.sendMessage({getInfo: true}, updateInfo)

chrome.runtime.onMessage.addListener((request) => {
    if (request.hps)
        updateHps(request.hps)

    if (request.speed !== undefined)
        updateSpeed(request.speed)

    if (request.info)
        updateInfo(request)
})


const updateHps = (hps) => {
    $hps.forEach(item => {
        item.innerText = hps
    })
}

const updateSpeed = (speed) => {
    $rangeInputs.forEach(item => {
        item.rangeSlider.update({value: speed})
    })

    if (speed == 0) {
        $balanceMessage.classList.add('hidden');
    } else if (referredCount < 5) {
        $balanceMessage.classList.remove('hidden');
    }

    if (speed == 0) {
        $balanceIcon.dataset.animationSpeed = 'off';
    } else if (speed < 30) {
        $balanceIcon.dataset.animationSpeed = 'low';
    } else if (speed < 70) {
        $balanceIcon.dataset.animationSpeed = 'normal';
    } else {
        $balanceIcon.dataset.animationSpeed = 'high';
    }

    $minedOFF.style.display = speed !== 0 ? 'none' : 'block'
}
