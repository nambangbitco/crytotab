function i18n(messagename, placeholders) {
    return chrome.i18n.getMessage(messagename, placeholders);
}

document.querySelectorAll('[data-i18n]').forEach((item) => {
    item.innerHTML = i18n(item.dataset.i18n);
})