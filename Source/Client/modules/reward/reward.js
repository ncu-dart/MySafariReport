function getRewardInfo(uid, callback, query = "all") {
    done = []
    query = query.split(',')
    if (query[0] == 'all') {
        query = ['points', 'info', 'items', 'profile', 'purchased']
    }
    chrome.storage.sync.get(["server_addr"], function(res) {
        var getIT = function (resp, uid, callback, i = 0) {
            $.ajax({
                'type': "POST",
                'url': res.server_addr + "/reward/" + query[i],
                'dataType': 'json',
                'crossDomain': true,
                'contentType': "application/json",
                'data': JSON.stringify({
                    'uuid': uid
                }),
                'success': function(xhr) {
                    resp[query[i]] = xhr
                },
                'error': function(xhr) {
                    console.log(xhr);
                    location.reload()
                },
                'complete': function(xhr) {
                    i++
                    if (i == query.length) {
                        callback(resp)
                    }
                    else {
                        getIT(resp, uid, callback, i)
                    }
                }
            })
        }
        getIT({}, uid, callback)
    })
}

function _p_(uid, item, callback) {
    getRewardInfo(uid, function(x){
        if (x.points.length !== 0) {
            chrome.storage.sync.get(["server_addr"], function(res) {
                $.ajax({
                    'type': "POST",
                    'url': res.server_addr + "/purchase/" + item.points,
                    'dataType': 'json',
                    'crossDomain': true,
                    'contentType': "application/json",
                    'data': JSON.stringify({
                        'uuid': uid,
                        'item': item
                    }),
                    'success': function(xhr) {
                        console.log(xhr);
                    },
                    'error': function(xhr) {
                        console.log(xhr);
                    },
                    'complete': function(xhr) {
                        callback(xhr.responseJSON)
                    }
                })
            })
        }
        else {
            callback({"msg": "領獎資訊不完整，請檢查後再試一次"})
        }
    }, "points")
}
