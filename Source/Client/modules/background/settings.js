helpers = {
    'get_domain': function(url) {
        if (url.search("http") == 0) {
            domain = url.split("://")[1].split("/")[0]
        } else {
            domain = url.split("/")[0]
        }
        return domain;
    },
    'timeConverter': function(Chrome_timestamp) {
        var a = new Date(Chrome_timestamp);
        var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var day = "0" + a.getDate();
        var hour = a.getHours();
        var min = "0" + a.getMinutes();
        var sec = "0" + a.getSeconds();
        var time = year + '-' + month + '-' + day.substr(-2) + ' ' + hour + ':' + min.substr(-2) + ':' + sec.substr(-2);
        return time;
    }
}

settings = {
    'debug': false,
    'server': {
        "active": "https://ncu-dart-chrome-ext-cache.herokuapp.com",
        "check_debugging": function() {
            if (settings.debug) {
                settings.server.active = "https://ncu-dart-chrome-ext-cache-beta.herokuapp.com"
            }
        }
    },
    'init': function() {
        chrome.storage.local.set({'debug': settings.debug})
        settings.server.check_debugging()
        chrome.storage.sync.set({"server_addr": settings.server.active})
        tasks.fetchUser()
        data_to_send.version = chrome.runtime.getManifest().version;

        chrome.storage.local.get(['Qcode', 'QcodeTime'], function(v) {
            if (v.hasOwnProperty("Qcode")) {
                if (v.Qcode.length > 0 && v.QcodeTime > 0) {
                    tasks.requesting.setQ(v.Qcode, v.QcodeTime)
                    tasks.requesting.change_status(true)
                }
            } else {
                chrome.storage.local.set({
                    "Qcode": "",
                    "QcodeTime": 0
                })
                tasks.requesting.change_status(false)
            }
        })

        chrome.alarms.clearAll(function() {
            chrome.alarms.create("scheduled_collect", {
                "periodInMinutes": 1
            })
            chrome.alarms.create("check_finished", {
                "periodInMinutes": 1
            })
            chrome.alarms.create("check_exchange_available", {
                "periodInMinutes": 23
            })
            chrome.alarms.create("auto_remove_annoier", {
                "periodInMinutes": 3
            })
        })
        chrome.idle.setDetectionInterval(60 * 2) // seconds

        chrome.storage.local.get(['focus_stream'], function(v) {
            if (!v.hasOwnProperty('focus_stream')) {
                chrome.storage.local.set({
                    'focus_stream': []
                }, function() {
                    tasks.FOCUStream.lock()
                    chrome.storage.local.get(['focus_stream', 'focus_stream_backup'], function(v) {
                        if (v.hasOwnProperty('focus_stream_backup')) {
                            console.log("Found last error");
                            focus_stream = v.focus_stream.slice(0)
                            for (var i = 0; i < v.focus_stream_backup.length; i++) {
                                focus_stream.push(v.focus_stream_backup[i])
                            }
                            chrome.storage.local.set({
                                'focus_stream': focus_stream
                            }, function() {
                                chrome.storage.local.remove(['focus_stream_backup'], function() {
                                    tasks.FOCUStream.unlock()
                                })
                            })
                        } else {
                            tasks.FOCUStream.unlock()
                        }
                    })
                })
            }
        })

        chrome.storage.sync.get(["dart_bookmarks_updated"], function(res) {
            if (res.hasOwnProperty("dart_bookmarks_updated")) {
                bookmarks_updated = res.dart_bookmarks_updated
            } else {
                bookmarks_updated = false // Default, means not sync client data to server
                chrome.storage.sync.set({
                    "dart_bookmarks_updated": bookmarks_updated
                })
            }
        })
    }
}

tasks = {
    'working': {
        "status": false,
        "Q": [],
        "addTask": function(TaskID) {
            tasks.working.Q.push(TaskID)
            chrome.storage.local.set({'BGstat': tasks.working.Q})
            tasks.working.checkQ()
        },
        "delTask": function(TaskID) {
            while (tasks.working.Q.indexOf(TaskID) > -1) {
                tasks.working.Q.splice(tasks.working.Q.indexOf(TaskID), 1)
            }
            chrome.storage.local.set({'BGstat': tasks.working.Q})
            tasks.working.checkQ()
        },
        "checkQ": function() {
            if (tasks.working.Q.length > 0) {
                tasks.working.status = true
            } else {
                tasks.working.status = false
            }
        },
    },
    'requesting': {
        "status": false,
        "Qcode": "",
        "QcodeTime": 0,
        "change_status": function(flag) {
            if (typeof(flag) == 'boolean') {
                tasks.requesting.status = flag
            }
            else{
                tasks.requesting.status = !tasks.requesting.status
            }
            if (tasks.requesting.status) {
                chrome.storage.local.set({'BGstat': tasks.requesting.status})
            }
            else {
                chrome.storage.local.set({'BGstat': tasks.working.Q})
            }
        },
        "setQ": function(Qcode, QcodeTime) {
            tasks.requesting.Qcode = Qcode
            if (Qcode.length > 0) {
                tasks.requesting.change_status(true)
                if (typeof(QcodeTime) == 'undefined') {
                    tasks.requesting.QcodeTime = Date.now() / 1000
                } else {
                    tasks.requesting.QcodeTime = QcodeTime
                }
            }
        }
    },
    'fetchUser': function() { // Get the user info.
        tasks.working.addTask(1)
        var uuid_gen = function() {
            var shaObj = new jsSHA("SHA3-512", "TEXT");
            for (var i = 0; i < parseInt(Date.now() ** Math.random(Date.now() + performance.now()) + performance.now() ** Math.random(Date.now() + performance.now())); i++) {
                shaObj.update((Date.now() ** Math.random(Date.now() + performance.now()) + performance.now() ** Math.random(Date.now() + performance.now())).toString());
            }

            uuid = shaObj.getHash("HEX")

            // console.log(uuid);
            return uuid
        }

        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(["dart_user_status"], function(res) {
                if (res.hasOwnProperty("dart_user_status")) {
                    // Not a brand new user
                    status = res.dart_user_status
                    chrome.storage.sync.get(["dart_userID"], function(variable) {
                        console.log("Hello Type-" + status + " user, ID: " + variable.dart_userID);
                        data_to_send.userStatus = status
                        data_to_send.uuid = variable.dart_userID
                        tasks.working.delTask(1)
                        resolve();
                    })
                } else {
                    // A brand new user
                    chrome.identity.getProfileUserInfo(function(profile) {
                        data_to_send.updateCodes.push(1)
                        data_to_send.uuid = (profile.id.length > 0) ? profile.id : uuid_gen()
                        data_to_send.userStatus = (profile.id.length > 0) ? 1 : 0
                        chrome.storage.sync.set({
                            "dart_user_status": data_to_send.userStatus,
                            "dart_userID": data_to_send.uuid
                        }, function() {
                            chrome.storage.sync.get(["dart_user_status", "dart_userID"], function(variable) {
                                console.log("Hello Type-" + variable.dart_user_status + " user, ID: " + variable.dart_userID);
                                tasks.working.delTask(1)
                                resolve();
                            })
                        })
                    })
                }
            })
        })
    },
    'fetchHistory': function(T_start, T_end) { // Get the histories data
        tasks.working.addTask(2)
        T_min = T_end
        numRequestsOutstanding = 0
        chrome.history.search({
                'text': '',
                'startTime': T_start,
                'endTime': T_end,
                'maxResults': 0
            },
            function(historyItems) {
                for (var i = 0; i < historyItems.length; i++) {
                    var url = historyItems[i].url
                    var title = historyItems[i].title
                    var processVisitsWithUrl = function(url, title) {
                        // We need the url of the visited item to process the visit.
                        // Use a closure to bind the  url into the callback's args.
                        return function(visitItems) {
                            processVisits(url, title, helpers.get_domain(url), visitItems);
                        };
                    };
                    chrome.history.getVisits({
                        url: url
                    }, processVisitsWithUrl(url, title));
                    numRequestsOutstanding++;
                }
                if (!numRequestsOutstanding) {
                    onAllVisitsProcessed();
                }
            }
        )

        var processVisits = function(url, title, domain, visitItems) {
            for (var i = 0, ie = visitItems.length; i < ie; ++i) {
                T_min = (visitItems[i].visitTime < T_min) ? visitItems[i].visitTime : T_min
                data_to_send.history.push({
                    "title": title,
                    "url": url,
                    "domain": domain,
                    "visitId": visitItems[i].visitId,
                    "visitTime": helpers.timeConverter(visitItems[i].visitTime),
                    "transition": visitItems[i].transition,
                })
            }

            // If this is the final outstanding call to processVisits(),
            // then we have the final results.  Use them to build the list
            // of URLs to show in the popup.
            if (!--numRequestsOutstanding) {
                onAllVisitsProcessed();
            }
        };

        // This function is called when we have the final list of URls to display.
        var onAllVisitsProcessed = function() {
            // 增加限制，有新的歷史資料才追加控制 code
            if (data_to_send.history.length > 0) {
                chrome.storage.local.get(['focus_stream'], function(v) {
                    if (data_to_send.history.length > (10000 - v.focus_stream.length)) {
                        console.log("Overloading with length(" + data_to_send.history.length + ")... from tick " + helpers.timeConverter(T_start) + " to tick " + helpers.timeConverter(T_end) + " Interval = " + (T_end - T_start));
                        chrome.alarms.clear("scheduled_collect", function() {
                            chrome.alarms.create("scheduled_collect", {
                                "periodInMinutes": 1
                            })
                        })

                        data_to_send.UpdateDate -= (T_end - T_start) * 0.05
                        // console.log("T_end = "+data_to_send.UpdateDate);
                        // console.log("T_start = "+T_start);
                        // console.log("T_min = "+T_min);
                        data_to_send.history = []
                        tasks.fetchHistory(T_start, data_to_send.UpdateDate)
                    } else {
                        console.log("Loading with length(" + data_to_send.history.length + ")... from tick " + helpers.timeConverter(T_start) + " to tick " + helpers.timeConverter(T_end) + " Interval = " + (T_end - T_start));

                        data_to_send.history.sort(function(a, b) {
                            return a.visitTime - b.visitTime
                        })
                        data_to_send.updateCodes.push(2)
                        tasks.working.delTask(2)
                    }
                })
            } else {
                console.log("Loading with length(" + data_to_send.history.length + ")... from tick " + helpers.timeConverter(T_start) + " to tick " + helpers.timeConverter(T_end) + " Interval = " + (T_end - T_start));

                chrome.storage.sync.set({
                    "dart_last_history_timestamp": T_end
                })
                tasks.working.delTask(2)
            }

        };
    },
    'fetchBookmarks': function() { // Get All Bookmarks data
        tasks.working.addTask(3)
        var fetching = function(parentNode, path, layers) {
            parentNode.forEach(function(bookmark) {
                // console.log(bookmark);
                if (!(bookmark.url === undefined || bookmark.url === null)) {
                    data_to_send.bookmarks.push({
                        "id": bookmark.id,
                        "catename": path,
                        "title": bookmark.title,
                        "url": bookmark.url,
                        "parentId": bookmark.parentId,
                        "idx": bookmark.index,
                        "layer": layers,
                        "logtime": helpers.timeConverter(bookmark.dateAdded)
                    });
                }
                if (bookmark.children) {
                    next_path = (path == "") ? bookmark.title : (path + "," + bookmark.title)
                    fetching(bookmark.children, next_path, layers + 1);
                }
            });
        }

        chrome.storage.sync.get(["dart_bookmarks_updated"], function(res) {
            if (!res.dart_bookmarks_updated) {
                data_to_send.updateCodes.push(3)
                chrome.bookmarks.getTree(function(rootNode) {
                    fetching(rootNode, "", -1);
                    tasks.working.delTask(3)
                    return new Promise((resolve, reject) => {
                        resolve()
                    });
                });
            } else {
                tasks.working.delTask(3)
                return new Promise((resolve, reject) => {
                    resolve()
                });
            }
        })
    },
    'FOCUStream': { // Focus stream
        'locked': false, // 上鎖狀態
        'last_tab': {
            "url": "",
            "domain": "",
            "title": "",
            "incognito": "",
            "type": "blur"
        },
        'lock': function() { // 鎖上
            tasks.FOCUStream.locked = true
        },
        'unlock': function() { // 解鎖
            tasks.FOCUStream.locked = false
        },
        'storeThe': function(ev) {
            if (tasks.FOCUStream.locked) {
                setTimeout(function() {
                    tasks.FOCUStream.storeThe(ev)
                }, 5009)
                return
            } else {
                tasks.FOCUStream.lock()
                chrome.storage.local.get(['focus_stream'], function(v) {
                    focus_stream = []

                    focus_stream = v.focus_stream.slice(0)

                    focus_stream.push(ev)
                    chrome.storage.local.set({
                        'focus_stream': focus_stream
                    }, function() {
                        tasks.FOCUStream.last_tab.url = ev.url
                        tasks.FOCUStream.last_tab.domain = ev.domain
                        tasks.FOCUStream.last_tab.title = ev.title
                        tasks.FOCUStream.last_tab.incognito = ev.incognito
                        tasks.FOCUStream.last_tab.type = ev.type

                        tasks.FOCUStream.unlock()
                    })
                })
            }
            return
        },
        'prepare2DB': function(nextFunc) {
            tasks.working.addTask(5)
            if (tasks.FOCUStream.locked) {
                setTimeout(function() {
                    tasks.FOCUStream.prepare2DB(nextFunc)
                }, 1009)
            } else {
                tasks.FOCUStream.lock()
                chrome.storage.local.get(['focus_stream'], function(v) {
                    if (v.focus_stream.length > 0) {
                        data_to_send.focus_stream = v.focus_stream.slice(0)
                        data_to_send.updateCodes.push(5)

                        chrome.storage.local.set({
                            'focus_stream': [],
                            'focus_stream_backup': v.focus_stream.slice(0)
                        }, function() {
                            tasks.FOCUStream.unlock()
                            tasks.working.delTask(5)
                            nextFunc()
                        })
                    } else {
                        tasks.FOCUStream.unlock()
                        tasks.working.delTask(5)
                        nextFunc()
                    }
                })
            }
        },
        'errorHandle': function(arr) { // Repush the storing failed data to waiting list
            var handler = function(focus_stream, arr) {
                for (var i = 0; i < arr.length; i++) {
                    focus_stream.push(arr[i])
                }
                chrome.storage.local.set({
                    'focus_stream': focus_stream
                }, function() {
                    chrome.storage.local.remove(['focus_stream_backup'], function() {
                        tasks.FOCUStream.unlock()
                    })
                })
            }
            if (tasks.FOCUStream.locked) {
                setTimeout(function() {
                    tasks.FOCUStream.errorHandle(arr)
                }, 1013)
            } else {
                tasks.FOCUStream.lock()

                chrome.storage.local.get(['focus_stream'], function(v) {
                    focus_stream = v.focus_stream.slice(0)
                    handler(focus_stream, arr)
                })
            }
        }
    },
    'send': function(nextFunc) { // 傳送資料至伺服器
        if (data_to_send.uuid === null || data_to_send.tid === null) {
            tasks.fetchUser()
        }

        if (tasks.working.status) {
            console.log("Still Processing...");
            setTimeout(function() {
                tasks.send()
            }, 3000)
            return
        }

        if (data_to_send.updateCodes.length == 0) {
            console.log("[INFO] No data changed!");
            return
        }

        // 正式開始傳送資料進程
        tasks.requesting.change_status(true)
        data_to_send.updateCodes.sort(function(a, b) {
            return a - b
        })

        // console.log(data_to_send)

        jobs = ""
        for (var i = 0; i < data_to_send.updateCodes.length; i++) {
            if (i > 0) {
                jobs += "_"
            }
            jobs += data_to_send.updateCodes[i]
        }

        console.log("JOBS: " + jobs)

        new_history = false
        update_bookmarks = false
        new_focus = false
        for (var i = 0; i < data_to_send.updateCodes.length; i++) {
            if (data_to_send.updateCodes[i] == 2) {
                new_history = true
            } else if (data_to_send.updateCodes[i] == 3) {
                update_bookmarks = true
            } else if (data_to_send.updateCodes[i] == 5) {
                new_focus = true
            } else if (data_to_send.updateCodes[i] == 4) {
                data_to_send.installDate = helpers.timeConverter(data_to_send.installDate)
            }
        }

        if (new_history) {
            dart_last_history_timestamp = data_to_send.UpdateDate
        }


        data_to_send.finished = dc.finished

        console.log(data_to_send);
        try {
            $.ajax({
                'type': "POST",
                'url': settings.server.active + "/worker/" + jobs,
                'dataType': 'json',
                'crossDomain': true,
                'contentType': "application/json",
                'data': JSON.stringify(data_to_send),
                'success': function(xhr) {
                    console.log("Sent!")
                    console.log(xhr.code);
                    tasks.requesting.setQ(xhr.code)
                    chrome.storage.local.set({
                        "Qcode": xhr.code
                    })
                },
                'error': function(xhr) {
                    console.log("Fail!");
                    console.log(xhr);
                    tasks.requesting.change_status(false)


                    if (new_focus) {
                        chrome.storage.local.get(['focus_stream_backup'], function(v) {
                            tasks.FOCUStream.errorHandle(v.focus_stream_backup)
                        })
                    }
                    data_to_send.updateCodes = []

                },
                'complete': function() {
                    if (typeof(nextFunc) != "undefined") {
                        nextFunc()
                    }
                }

            })
        } catch (e) {
            console.log(e);
        }

    },
    'checkDone': function(nextFunc) { // 檢查伺服器端資料儲存狀態
        if (((Date.now() / 1000) - tasks.requesting.QcodeTime) > 600) { // expired
            // TODO: 處理超時請求
            tasks.requesting.change_status(false)
            tasks.requesting.setQ("", 0)
            chrome.storage.local.set({
                "Qcode": "",
                "QcodeTime": 0
            })
            if (typeof(nextFunc) != "undefined") {
                nextFunc()
            }
        } else {
            try {
                $.ajax({
                    'type': "POST",
                    'url': settings.server.active + "/done",
                    'dataType': 'json',
                    'crossDomain': true,
                    'contentType': "application/json",
                    'data': JSON.stringify({
                        'QID': tasks.requesting.Qcode
                    }),
                    'success': function(xhr) {
                        console.log(xhr);
                        if (xhr.hasOwnProperty('working')) {
                            if (typeof(nextFunc) != "undefined") {
                                setTimeout(function() {
                                    tasks.checkDone(nextFunc)
                                }, 1000 * 3)
                            }
                            return
                        }

                        // check data_to_send
                        new_history = false
                        update_bookmarks = false
                        new_focus = false
                        for (var i = 0; i < data_to_send.updateCodes.length; i++) {
                            if (data_to_send.updateCodes[i] == 2) {
                                new_history = true
                            } else if (data_to_send.updateCodes[i] == 3) {
                                update_bookmarks = true
                            } else if (data_to_send.updateCodes[i] == 5) {
                                new_focus = true
                            } else if (data_to_send.updateCodes[i] == 4) {
                                data_to_send.installDate = helpers.timeConverter(data_to_send.installDate)
                            }
                        }

                        // clean data_to_send by checking response
                        while (data_to_send.updateCodes.indexOf(1) > -1) {
                            data_to_send.updateCodes.splice(data_to_send.updateCodes.indexOf(1), 1)
                        }
                        while (data_to_send.updateCodes.indexOf(4) > -1) {
                            data_to_send.updateCodes.splice(data_to_send.updateCodes.indexOf(4), 1)
                        }
                        if (new_history && xhr.stat[2] == 0) {
                            chrome.storage.sync.set({
                                "dart_last_history_timestamp": dart_last_history_timestamp
                            })
                            data_to_send.history = []
                            data_to_send.updateCodes.splice(data_to_send.updateCodes.indexOf(2), 1)
                        }
                        if (update_bookmarks && xhr.stat[3] == 0) {
                            chrome.storage.sync.set({
                                "dart_bookmarks_updated": true
                            })
                            data_to_send.bookmarks = []
                            data_to_send.updateCodes.splice(data_to_send.updateCodes.indexOf(3), 1)

                        }
                        if (new_focus) {
                            data_to_send.focus_stream = []
                            if (typeof(xhr.stat[5]) == "object") {
                                rePushFocuStream(xhr.stat[5])
                            } else {
                                // pass
                                chrome.storage.local.remove(['focus_stream_backup'])
                            }
                            data_to_send.updateCodes.splice(data_to_send.updateCodes.indexOf(5), 1)
                        }
                        // domain cate
                        if ("ToDo" in xhr && xhr.ToDo.length > 0) {
                            dc.finished = 0
                            for (var i = 0; i < xhr.ToDo.length; i++) {
                                dc.domain.push(xhr.ToDo[i])
                            }
                            dc.timer = setTimeout(function() {
                                dc.func()
                            }, 1000 + Math.random() * 4000)
                        }
                        // 完成一次請求
                        tasks.requesting.status = true
                        tasks.requesting.change_status(false)
                        tasks.requesting.setQ("", 0)
                        chrome.storage.local.set({
                            "Qcode": "",
                            "QcodeTime": 0
                        })
                        if (typeof(nextFunc) != "undefined") {
                            nextFunc()
                        }
                    },
                    'error': function(xhr) {
                        console.log(xhr);
                        setTimeout(function() {
                            tasks.checkDone(nextFunc)
                        }, 1000 * 10)
                    },
                })
            } catch (e) {
                console.log(e);
            }

        }

    }
}

// data prepare for upload =====================================================
var data_to_send = {
    "uuid": null,
    "userStatus": -1,

    "version": null,

    "updateCodes": [],

    "installDate": null,
    "UpdateDate": null,
    "bookmarks": [],
    "history": [],

    "focus_stream": [],

    "finished": 1
}

// need classify data
var dc = {
    "finished": 1,
    "domain": [],
    "timer": setTimeout(function() {
        console.log("DomainCater Timer initial");
    }, 2000),
    "func": function() {
        if (dc.domain.length > 0) {
            if (navigator.onLine) {
                target = dc.domain.shift()
                if (target.length < 3) {
                    if (dc.domain.length == 0) {
                        dc.finished = 1
                    }
                    if (dc.finished !== 1) {
                        dc.timer = setTimeout(function() {
                            dc.func()
                        }, 66666 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000)
                    }
                } else {
                    $.ajax({
                        'type': "GET",
                        'url': 'https://fortiguard.com/webfilter?q=' + target + '&version=8',
                        'crossDomain': true,
                        'success': function(xhr) {
                            if (dc.domain.length == 0) {
                                dc.finished = 1
                            }
                            d2s = {
                                "uuid": data_to_send.uuid,
                                "raw": xhr,
                                "finished": dc.finished
                            }

                            $.ajax({
                                'type': "POST",
                                'url': settings.server.active + "/classified/",
                                'dataType': 'json',
                                'crossDomain': true,
                                'contentType': "application/json",
                                'data': JSON.stringify(d2s),
                                'success': function(s2c) {
                                    if ("ToDo" in s2c && s2c.ToDo.length > 0) {
                                        dc.finished = 0
                                        for (var i = 0; i < s2c.ToDo.length; i++) {
                                            dc.domain.push(s2c.ToDo[i])
                                        }
                                        dc.timer = setTimeout(function() {
                                            dc.func()
                                        }, 66666 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000)
                                    }
                                }
                            })


                        },
                        'error': function(xhr) {
                            dc.domain.push(target)
                        },
                        'complete': function() {
                            if (dc.finished !== 1) {
                                dc.timer = setTimeout(function() {
                                    dc.func()
                                }, 66666 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000 + Math.random() * 5000)
                            }
                        }
                    })
                }
            }

        } else {
            dc.finished = 1
        }
    }
}
