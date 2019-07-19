/*
    # TODO
    1. overwrite page
    2. injection js
*/

// Every normal start ==========================================================
settings.init()

// onEvents ====================================================================

// onAlarm
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (navigator.onLine) {
        // 定時工作皆需要檢查是否有連線
        if (alarm.name == "scheduled_collect" && !tasks.working.status && !tasks.requesting.status) {
            // 定時傳送資料
            tasks.FOCUStream.prepare2DB(function() {
                data_to_send.UpdateDate = Date.now();

                chrome.alarms.clear("scheduled_collect", function() {
                    // check user-parameters and set alarms
                    chrome.storage.sync.get(["dart_scheduled_collect_period"], function(res) {
                        if (res.hasOwnProperty("dart_scheduled_collect_period")) {
                            scheduled_collect_period = res.dart_scheduled_collect_period
                        } else {
                            scheduled_collect_period = 5 // Default
                            chrome.storage.sync.set({
                                "dart_scheduled_collect_period": scheduled_collect_period
                            })
                        }

                        chrome.alarms.create("scheduled_collect", {
                            "periodInMinutes": scheduled_collect_period
                        })
                    })
                })

                console.log("Extension Collecting Data(History & Bookmarks & FocuStream)...");

                chrome.storage.sync.get(["dart_last_history_timestamp"], function(res) {
                    if (res.hasOwnProperty("dart_last_history_timestamp")) {
                        search_start = res.dart_last_history_timestamp
                    } else {
                        search_start = Date.parse('1994/12/16')
                    }

                    Promise.all([tasks.fetchHistory(search_start, data_to_send.UpdateDate), tasks.fetchBookmarks()]).then(tasks.send);
                })

            })
        } else if (alarm.name == "check_finished" && tasks.requesting.status && tasks.requesting.Qcode.length > 0) {
            console.log("Extension Checking Data(History & Bookmarks & FocuStream) stored or not...");
            tasks.checkDone()
        } else if (alarm.name == "check_exchange_available") {
            check_exchange_available()
        }
        else if (alarm.name == "auto_remove_annoier") {
            annoy_for_remove()
        }
    }

})

chrome.runtime.onUpdateAvailable.addListener(function() {
    if (!tasks.working.status && !tasks.requesting.status) {
        chrome.runtime.reload()
    }
})

// on Intall and First Launch
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.get(['first'], function (v) {
        if (!v.hasOwnProperty('first')) {
            chrome.windows.create({
                url: "https://github.com/ncu-dart/MySafariReport/blob/master/README.md",
                focused: true,
                type:"popup"
            });
            chrome.storage.local.set({'first': 1})
        }
    })


    var onInsalledFunc = function() {
        data_to_send.UpdateDate = Date.now();
        data_to_send.installDate = Date.now();
        data_to_send.version = chrome.runtime.getManifest().version;
        data_to_send.updateCodes.push(4)

        console.log("Installing Deep Learning Recommandation Extension...");



        chrome.storage.sync.get(["dart_last_history_timestamp", "privacy_read_ver"], function(res) {
            if (res.hasOwnProperty("dart_last_history_timestamp")) {
                search_start = res.dart_last_history_timestamp
            } else {
                search_start = Date.parse('1994/12/16')
            }

            chrome.storage.sync.get(['privacy_read_ver'], function (v) {
                open_privacy = false
                if (!v.hasOwnProperty("privacy_read_ver")) {
                    open_privacy = true
                }
                else if (privacy_policy_version > v.privacy_read_ver) {
                    open_privacy = true
                }

                if (open_privacy) {
                    chrome.storage.sync.set({"privacy_read_ver": privacy_policy_version})
                    chrome.windows.create({
                        url: "/modules/privacy/policy.html",
                        focused: true,
                        type:"popup"
                    });
                }
            })

            check_big_update()

            Promise.all([
                    tasks.fetchHistory(search_start, data_to_send.UpdateDate),
                    tasks.fetchBookmarks()
                ])
                .then(tasks.send);
        })
    }

    // for re-collet history data
    chrome.storage.sync.get(["last_reset"], function(res) {
        var reset_proc = function () {
            chrome.storage.sync.set({"dart_last_history_timestamp": Date.parse('1994/12/16')}, function () {
                nowTime = Date.now()
                chrome.storage.sync.set({"last_reset": nowTime})
                setTimeout(function() {
                    onInsalledFunc()
                }, 30 * 1000)
            })
        }

        if (res.hasOwnProperty("last_reset")) {
            if (res.last_reset < 1555849237513 && Date.now() > 1555849237513 + 7 * 3600 * 1000) {
                reset_proc()
            }
            else {
                onInsalledFunc()
            }
        } else {
            reset_proc()
        }
    })
});

// Bookmarks Changes Detecttion
chrome.bookmarks.onCreated.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})
chrome.bookmarks.onRemoved.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})
chrome.bookmarks.onChanged.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})
chrome.bookmarks.onMoved.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})
chrome.bookmarks.onChildrenReordered.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})
chrome.bookmarks.onImportEnded.addListener(function() {
    chrome.storage.sync.set({
        "dart_bookmarks_updated": false
    })
})

// onBrowserAction clicked
chrome.browserAction.onClicked.addListener(
    function(the_tab) {
        chrome.tabs.create({
            'selected': true,
            'url': './modules/report/overall.html'
        });
    }
)

// on Sign In Changed
chrome.identity.onSignInChanged.addListener(function() {
    data_to_send.UpdateDate = Date.now();
    tasks.FOCUStream.prepare2DB(function() {
        tasks.send(function() {
            tasks.checkDone(function () {
                chrome.runtime.reload()
            })
        })
    })


})

// Focus stream ================================================================

// idle (none focus) detect
chrome.idle.onStateChanged.addListener(function(state) {
    console.log("User State Change to " + state);
    chrome.windows.getCurrent({
        'populate': true
    }, function(the_win) {
        // console.log(the_win);
        if (the_win.focused) {
            console.log(tasks.FOCUStream.last_tab.type);
            if (state != "active" && (tasks.FOCUStream.last_tab.type != "blur" || tasks.FOCUStream.last_tab.type != "idle")) {
                console.log("user blur");
                click_event = {
                    // "uuid": data_to_send.uuid,
                    // "tid": data_to_send.tid,

                    "incognito": tasks.FOCUStream.last_tab.incognito,
                    "url": tasks.FOCUStream.last_tab.url,
                    "domain": tasks.FOCUStream.last_tab.domain,
                    "title": tasks.FOCUStream.last_tab.title,
                    "type": "idle", // switch between windows or tabs or blur
                    "dt": Date.now()
                }
                tasks.FOCUStream.storeThe(click_event)
            } else if (state == "active" && tasks.FOCUStream.last_tab.type == "idle") {
                console.log("user return");
                click_event = {
                    // "uuid": data_to_send.uuid,
                    // "tid": data_to_send.tid,

                    "incognito": tasks.FOCUStream.last_tab.incognito,
                    "url": tasks.FOCUStream.last_tab.url,
                    "domain": tasks.FOCUStream.last_tab.domain,
                    "title": tasks.FOCUStream.last_tab.title,
                    "type": "active",
                    "dt": Date.now()
                }
                tasks.FOCUStream.storeThe(click_event)
            }
        }
    })

})

// 瀏覽器開啟
var getBrowserInitTab = function() {
    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function(the_tabs){
        console.log("Browser Initial")
        if (the_tabs.length > 0) {
            the_tab = the_tabs[0]
            click_event = {
                // "uuid": data_to_send.uuid,
                // "tid": data_to_send.tid,

                "incognito": (the_tab.incognito) ? 1 : 0,
                "url": the_tab.url,
                "domain": helpers.get_domain(the_tab.url),
                "title": the_tab.title,
                "type": "tabs", // switch between windows or tabs
                "dt": Date.now()
            }
            tasks.FOCUStream.storeThe(click_event)
            // console.log(click_event);
        }
        else {
            setTimeout(function () {
                getBrowserInitTab()
            }, 100)
        }
    })
}
setTimeout(function () {
    getBrowserInitTab()
}, 500)

// 同視窗下分頁切換
chrome.tabs.onActivated.addListener(function(_info) {
    console.log("Tabs Switched");
    chrome.tabs.get(_info.tabId, function(the_tab) {
        click_event = {
            // "uuid": data_to_send.uuid,
            // "tid": data_to_send.tid,

            "incognito": (the_tab.incognito) ? 1 : 0,
            "url": the_tab.url,
            "domain": helpers.get_domain(the_tab.url),
            "title": the_tab.title,
            "type": "tabs", // switch between windows or tabs
            "dt": Date.now()
        }
        // console.log(click_event);

        tasks.FOCUStream.storeThe(click_event)

    })
})

// 不同視窗間切換
chrome.windows.onFocusChanged.addListener(function(win_id) {
    // 找出顯示中的分頁
    if (win_id != chrome.windows.WINDOW_ID_NONE) {
        console.log("Windows Swiched");
        chrome.windows.get(win_id, {
            'populate': true
        }, function(the_win) {
            the_tab_idx = 0
            for (var i = 0; i < the_win.tabs.length; i++) {
                if (the_win.tabs[i].active) {
                    the_tab_idx = i
                    break
                }
            }
            the_tab = the_win.tabs[the_tab_idx]
            // console.log(the_tab);
            click_event = {
                // "uuid": data_to_send.uuid,
                // "tid": data_to_send.tid,

                "incognito": (the_tab.incognito) ? 1 : 0,
                "url": the_tab.url,
                "domain": helpers.get_domain(the_tab.url),
                "title": the_tab.title,
                "type": "windows", // switch between windows or tabs
                "dt": Date.now()
            }
            // console.log(click_event);
            tasks.FOCUStream.storeThe(click_event)
        })
    } else {
        if (tasks.FOCUStream.last_tab.url === "" || tasks.FOCUStream.last_tab.domain === "") {
            return
        }
        console.log("Chrome blur");
        click_event = {
            // "uuid": data_to_send.uuid,
            // "tid": data_to_send.tid,

            "incognito": tasks.FOCUStream.last_tab.incognito,
            "url": tasks.FOCUStream.last_tab.url,
            "domain": tasks.FOCUStream.last_tab.domain,
            "title": tasks.FOCUStream.last_tab.title,
            "type": "blur", // switch between windows or tabs or blur
            "dt": Date.now()
        }
        // console.log(click_event);
        tasks.FOCUStream.storeThe(click_event)

    }
})
