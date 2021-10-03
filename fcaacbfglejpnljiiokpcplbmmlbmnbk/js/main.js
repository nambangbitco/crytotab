function initApp() {
    if (navigator.onLine) document.getElementById('loader').style.display = 'none'
}

function goOffline() {
    document.location.href = chrome.runtime.getURL('offline.html')
}

function goUnavailable() {
    document.location.href = chrome.runtime.getURL('unavailable.html')
}

if (!navigator.onLine) {
    goOffline()
}

window.addEventListener('offline', goOffline, false)


chrome.runtime.sendMessage({checkStatus: true}, (r) => {
    if (r.error) {
        goUnavailable()
    }
})


document.getElementById('body').classList.add( 'page_'+ i18n('lang_code') );

var bgAnimation = localStorage.getItem('bgAnimation');
if (bgAnimation === 'true'){
    bgAnimation = true;
    document.getElementById('bgAnimation').setAttribute('checked', true);
} else {
    bgAnimation = false;
}

updateBgAnimation();

document.getElementById('bgAnimation').addEventListener('change', function() {
    bgAnimation = !bgAnimation;
    localStorage.setItem('bgAnimation', bgAnimation);
    updateBgAnimation();
});

function updateBgAnimation() {
    if (bgAnimation) {
        document.getElementById('body').classList.add('page_withcoins');
    } else {
        document.getElementById('body').classList.remove('page_withcoins');
    }
}

var boostPageVisited = localStorage.getItem('boostPageVisited');
if (!boostPageVisited) {
    document.querySelector('.btn_boost .count').classList.remove('hidden');
}


document.addEventListener('keydown', function(event) {
    if (event.keyCode == 27) {
        hideDropdowns();
        hidePopup();
    }
});

chrome.runtime.sendMessage({getBanners: true}, onGetBanners)

var page = document.querySelector('.page');

function onGetBanners(banners) {
    if (banners) {
        for (var i=0; i < banners.length; i++) {
            showBanner(banners[i]);
        }
    }
}

function showBanner(banner) {
    //page.classList.add(`page_banner_${banner.position}`);
    document.querySelector(`.banner_${banner.position}`).classList.add('show');
    document.querySelector(`.banner_${banner.position}`).dataset.banner_id = banner.id;
    document.querySelector(`.banner_${banner.position} iframe`).setAttribute('src', banner.url);
}

chrome.storage.local.get('tutorial', function(response) {
    if (!response.tutorial) {
        showTutorial();
    }
});

function showTutorial() {
    page.classList.add('page_tipped');
    page.classList.add('page_tipped_1');
    document.querySelector('.tip_1').classList.add('active');
}

function nextTip() {
    var activeTip = document.querySelector('.tip.active'),
        nextTip = parseInt(activeTip.dataset.tip) + 1;
    page.classList.remove('page_tipped_' + activeTip.dataset.tip);
    page.classList.add('page_tipped_' + nextTip);
    activeTip.classList.remove('active');
    if (nextTip <= 6) {
        document.querySelector('.tip_'+nextTip).classList.add('active');
    } else {

        chrome.storage.local.set({'tutorial': true});
    }

    if (nextTip == 2) {
      setSpeed(50)
    }
}

function skipTip() {
    var activeTip = document.querySelector('.tip.active');
    page.classList.remove('page_tipped');
    page.classList.remove('page_tipped_' + activeTip.dataset.tip);
    activeTip.classList.remove('active');
    chrome.storage.local.set({'tutorialWatched': true});
    chrome.storage.local.set({'tutorial': true});
}

document.querySelectorAll('.skipTip').forEach(function(item) {
    item.addEventListener('click', function(event) {
        skipTip();
    });
});

document.querySelectorAll('.nextTip').forEach(function(item) {
    item.addEventListener('click', function(event) {
        nextTip();
    });
});

document.querySelectorAll('.banner__cancel').forEach(function(item) {
    item.addEventListener('click', function(event) {
        cancelBanner(event.target);
    });
});

function cancelBanner(el) {
    var bannerId = el.parentElement.dataset.banner_id;
    el.parentElement.classList.remove('show');
    //page.classList.remove('page_banner_top');
    //page.classList.remove('page_banner_bottom');
    chrome.runtime.sendMessage({closeBanner: bannerId});
}

document.addEventListener('click', function(event) {
    if ( (event.target.className.indexOf('icon-') == -1) && (event.target.className.indexOf('balance') == -1) && (event.target.className.indexOf('balance') == -1) && !closest(event.target, '.dropdown') && !closest(event.target, '.balance') ) {
        hideDropdowns();
    }

    if ( event.target.classList.contains('popup') ) {
        hidePopup();
    }

    if (closest(event.target, '.showPopup')) {
        showPopup(closest(event.target, '.showPopup').getAttribute('data-popup'))
    }

    if (event.target.classList.contains('hidePopup')) {
        hidePopup(event.target.getAttribute('data-popup'))
    }

    if (closest(event.target, '.toggleDropdown')) {
        toggleDropdown(closest(event.target, '.toggleDropdown').getAttribute('data-dropdown'))
    }

    if (event.target.classList.contains('setSpeed')) {
      setSpeed(parseInt(event.target.getAttribute('data-speed')))
    }

    if (event.target.classList.contains('btn_boost') || closest(event.target, '.btn_boost')) {
        localStorage.setItem('boostPageVisited', true);
        document.querySelector('.btn_boost .count').classList.add('hidden');
        window.open('https://cryptotab.net/boost/')
    }

    if (event.target.classList.contains('btn_withdraw')) {
        window.open('https://cryptotab.net/withdraw/')
    }

    if (event.target.classList.contains('alert__hide')) {
        document.getElementById('errorMessage').style.display = 'none'
    }

    if (event.target.classList.contains('social-btn') && event.target.tagName === 'A' && !event.target.classList.contains('social-btn_mail')) {
        openSharingPopup(event);
    }

    if (event.target.classList.contains('btn_restart') || closest(event.target, '.btn_restart') ) {
        onRestart();
    }

    if (event.target.classList.contains('dot') ) {
        goToSlide(event.target.dataset.slide);

        clearInterval(slideRotation);
        slideRotation = setInterval(function() {
            nextSlide();
        }, 5000);
    }

    if ( (event.target.parentNode.id === 'errorMessage' || event.target.parentNode.parentNode.id === 'errorMessage') && !closest(event.target, '.alert__hide') ) {
        showPopup('blockedPopup')
    }

    if (event.target.classList.contains('copyRefUrl')) {
      const refUrl = document.getElementById('refurl')
      refUrl.select()

      document.execCommand('copy')

      event.target.innerText = i18n('copied');

      setTimeout(function() {
          event.target.innerText = i18n('copy');
      }, 2500);

    }

});

function onRestart() {
    chrome.runtime.reload()
}

function setSpeed(speed) {
    updateSpeed(speed)
    chrome.runtime.sendMessage({speed})
}

function toggleDropdown(dropdown) {

    if (dropdown == 'balance') {
        setTimeout(function() {
            speedboxAnimation();
            setTimeout(function() {
                speedboxSetScore();
            }, 2250)
        }, 500);
    }

    var el = document.getElementById(dropdown);
    if ( el.classList.contains('active') ) {
        el.classList.remove('active');
    } else {
        hideDropdowns();
        el.classList.add('active');
    }
}

function hideDropdowns() {
    var dropdowns = document.querySelectorAll('.dropdown');
    for (var i=0; i < dropdowns.length; i++) {
        dropdowns[i].classList.remove('active');
    }
}

function showPopup(popup) {
    hidePopup()
    if (popup == 'ratePopup') {
        localStorage.setItem('isRated', true);
        document.querySelector('.item-notifications').classList.remove('show');
    }
    document.getElementById(popup).classList.add('active');
}

function hidePopup(popup) {
    if (popup) {
        document.getElementById(popup).classList.remove('active');
    } else {
        var activePopup = document.querySelector('.popup.active');
        if (activePopup) {
            activePopup.classList.remove('active');
        }

        if (activePopup && activePopup.id == 'loginPopup') {
            localStorage.setItem('loginPopupWatched', true);
        }
    }
}

function closest(el, selector) {
	var matches = el.webkitMatchesSelector ? 'webkitMatchesSelector' : (el.msMatchesSelector ? 'msMatchesSelector' : 'matches');
	while (el.parentElement) {
		if (el[matches](selector)) return el;
		el = el.parentElement;
	}
	return null;
}

function openSharingPopup(event) {
    event.preventDefault();

    var y = window.outerHeight / 2 + window.screenY - ( 500 / 2),
        x = window.outerWidth / 2 + window.screenX - ( 400 / 2),
        url = event.target.href || event.target.parentNode.href,
        popup = window.open(url, '', 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=400, height=500, top='+y+', left='+x);

    return false;

}

// Slider
var slideRotation = setInterval(function() {
    nextSlide();
}, 8000);

function nextSlide() {
    var activeSlide = document.querySelector('.dot.active'),
        next = 1;

    if (activeSlide.nextElementSibling) {
        next = activeSlide.nextElementSibling.dataset.slide;
    }

    goToSlide(next);
}

function goToSlide(slideIndex) {

    document.querySelector('.slide.active').classList.remove('active');
    document.querySelector('.dot.active').classList.remove('active');

    document.querySelector(`.slide:nth-child(${slideIndex})`).classList.add('active');
    document.querySelector(`.dot:nth-child(${slideIndex})`).classList.add('active');

}

// Rate
var isRated = JSON.parse(localStorage.getItem('isRated'));
if (!isRated) {
    document.querySelector('.item-notifications').classList.add('show');
}

document.querySelector('.stars-holder').addEventListener('mouseover', function(event) {
    if (event.target.tagName == 'I') {
        event.target.classList.add('active');
        document.getElementById('rateBtn').dataset.rate = event.target.dataset.rate;
        rate(event.target);
    }
});

document.querySelector('.stars-holder').addEventListener('mouseout', function(event) {
    if (event.target.tagName == 'I') {
        rate(event.target);
    }
});

var stars = document.querySelectorAll('.stars-holder i');
for (var i=0; i < stars.length; i++) {
    stars[i].addEventListener('click', function(event) {
        if (event.target.dataset.rate > 3) {
            window.open('https://chrome.google.com/webstore/detail/'+ chrome.runtime.id +'/reviews');
        }
    });
}

function rate(target) {
    var prev = prevSiblings(target);
    for (var i=0; i<prev.length; i++) {
        prev[i].classList.add('active');
    }
    var next = nextSiblings(target);
    for (var i=0; i<next.length; i++) {
        next[i].classList.remove('active');
    }
}

function prevSiblings(target) {
    var siblings = [], n = target;
    while(n = n.previousElementSibling) siblings.push(n);
    return siblings;
}

function nextSiblings(target) {
    var siblings = [], n = target;
    while(n = n.nextElementSibling) siblings.push(n);
    return siblings;
}

function siblings(target) {
    var prev = prevSiblings(target) || [],
        next = nexSiblings(target) || [];
    return prev.concat(next);
}

document.querySelector('.stars-holder').addEventListener('click', function(e) {
    if (e.target.tagName == 'I') {
        document.getElementById('rateBtn').dataset.rate = e.target.dataset.rate;
    }
});

document.getElementById('rateBtn').addEventListener('click', function(e) {
    hidePopup();
    if (this.dataset.rate > 3) {
        window.open('https://chrome.google.com/webstore/detail/'+ chrome.runtime.id +'/reviews');
    } else {
        showPopup('thanksPopup')
    }
});

function speedboxAnimation() {
    document.querySelector('.speedbox').classList.add('animated');
}

function speedboxSetScore() {
    var score, pointer,
        referred = parseInt(document.querySelector('.speedbox').dataset.referred);

    var max = setRank(referred);

    if (referred > max) {
        score = 135;
        pointer = 180;
    } else {
        score = Math.round(referred*180/max)-45,
        pointer = Math.round(referred*180/max);
    }
    document.querySelector('.speedbox__score').style.transform = 'rotate('+ score +'deg)';
    document.querySelector('.speedbox__pointer').style.transform = 'rotate('+ pointer +'deg)';
}

const RANKS = [
    {max: 20, title: 'newbie'},
    {max: 100, title: 'rookie'},
    {max: 500, title: 'pro'},
    {max: 1200, title: 'veteran'},
    {max: 5000, title: 'expert'},
    {max: 30000, title: 'master'},
    {max: 200000, title: 'legend'},
    {max: 1000000, title: 'bigboss'}
];

var rank = document.querySelector('.rank');

function setRank(referred) {
    for (var i=0; i < RANKS.length; i++) {
        if (referred < RANKS[i].max) {
            rank.classList.add(`rank_${RANKS[i].title}`);
            document.querySelector('.speedbox__score').classList.add(`speedbox__score_${RANKS[i].title}`);
            rank.innerText = i18n(`rank_${RANKS[i].title}`);
            return RANKS[i].max;
        }

        if (referred >= 1000000) {
            rank.classList.add('rank_bigboss');
            document.querySelector('.speedbox__score').classList.add('speedbox__score_bigboss');
            rank.innerText = i18n('rank_bigboss');
            return 1000000;
        }
    }
}

var rangeInputs = document.querySelectorAll('input[type="range"]');
rangeSlider.create(rangeInputs, {
    polyfill: true,
    onSlideEnd: function (position, value) {
        setSpeed(position);
    }
});
