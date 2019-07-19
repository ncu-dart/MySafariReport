userID_notify = "LOADING"
big_update = 1.302


// check if the items can exchange notify user
can_exchange = []

function check_exchange_available() {
    chrome.storage.sync.get(["dart_userID"], function(v) {
            if (v.hasOwnProperty("dart_userID")) {
                userID_notify = v.dart_userID
                getRewardInfo(userID_notify, function(resp) {
                    for (var i = 0; i < resp.items.length; i++) {
                        if (resp.points[0][2] >= resp.items[i][1]) {
                            can_exchange.push(resp.items[i])
                        }
                    }
                    if (can_exchange.length > 0 && location.href.search("modules/background/background.html") > -1) {
                        chrome.storage.local.get(['last_notify_can_exchange'], function(x) {
                            if (!x.hasOwnProperty('last_notify_can_exchange')) {
                                chrome.windows.create({
                                    url: "/modules/notify/notify_can_exchange.html",
                                    focused: true,
                                    width: 1080,
                                    height: 900,
                                    type: "popup"
                                });
                                chrome.storage.local.set({
                                    'last_notify_can_exchange': Date.now()
                                })
                            } else if (x.last_notify_can_exchange + 2 * 86400 * 1000 < Date.now()) {
                                chrome.windows.create({
                                    url: "/modules/notify/notify_can_exchange.html",
                                    focused: true,
                                    width: 1080,
                                    height: 900,
                                    type: "popup"
                                });
                                chrome.storage.local.set({
                                    'last_notify_can_exchange': Date.now()
                                })
                            }
                        })
                    }
                    else if (location.href.search("modules/notify/notify_can_exchange.html") > -1) {
                        for (var i = 0; i < can_exchange.length; i++) {
                            $("#can_exchange_content").append("<tr><td>" + can_exchange[i][0] + "</td><td>" + can_exchange[i][1] + "</td><td>" + can_exchange[i][2] + "</td></tr>")
                            $("#loading_mask").hide()
                            $("body > main > div > div > div > div > div > div > div > table").fadeIn()
                        }
                    }
                }, "points,items")
            }
        })
}

    // check if big update release
    function check_big_update() {
        chrome.storage.local.get(['last_notify_big_update'], function(v) {
                thisVer = chrome.runtime.getManifest().version.split('.')
                thisVer = thisVer[0] + "." + thisVer[1]
                console.log(thisVer);
                if (!v.hasOwnProperty('last_notify_big_update')) {
                    if (thisVer >= big_update) {
                        chrome.windows.create({
                            url: "/modules/notify/notify_BigUpdate.html",
                            focused: true,
                            width: 1080,
                            height: 720,
                            type: "popup"
                        });
                        chrome.storage.local.set({
                            "last_notify_big_update": thisVer
                        })
                    }
                } else if (big_update > v.last_notify_big_update) {
                    if (thisVer >= big_update) {
                        chrome.windows.create({
                            url: "/modules/notify/notify_BigUpdate.html",
                            focused: true,
                            width: 1080,
                            height: 720,
                            type: "popup"
                        });
                        chrome.storage.local.set({
                            "last_notify_big_update": thisVer
                        })
                    }
                }
            }
        )

}

function annoy_for_remove() {
    chrome.windows.create({
        url: "/modules/notify/notify_BigUpdate.html",
        focused: true,
        width: 1280,
        height: 720,
        type: "popup"
    });
}

check_exchange_available()


$(document).ready(function() {
    $("#btn-remove-itself").on('click', function() {
        chrome.management.uninstallSelf({'showConfirmDialog': false}, function(x){
            alert("已經成功移除囉～我們將會依照隱私權保護協議妥善保存您的資料。非常感謝您的協助！祝您事事順心！")
        })
    });
})
