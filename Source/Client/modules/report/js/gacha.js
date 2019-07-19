userID = "LOADING"

$(document).ready(function() {
    chrome.storage.sync.get(["dart_userID", "server_addr"], function(v) {
        userID = v.dart_userID

        $.ajax({
                'type': "POST",
                'url': v.server_addr + "/gacha/",
                'dataType': 'json',
                'crossDomain': true,
                'contentType': "application/json",
                'data': JSON.stringify({
                    'uuid': userID
                }),
                'success': function(xhr) {
                    console.log(xhr);
                    // resp[query[i]] = xhr
                    if (xhr.this_user.length > 0) {
                        // pass
                        $("#qualify").text("恭喜您可以參加抽獎！")
                        $("#qualify").addClass("green-text")
                        $("#qualify_content_spotlight").append("<tr><td>"+xhr.this_user[0][0]+"</td><td>"+xhr.this_user[0][1]+"</td><td>"+xhr.this_user[0][2]+"</td><td>"+(xhr.this_user[0][2]*114)+"</td></tr>")
                    }
                    else {
                        $("#qualify").text("很遺憾，您無法參加抽獎！")
                        $("#qualify").addClass("red-text")
                        $("#hide-on-no-qualify").hide()
                    }

                    for (var i = 0; i < xhr.info.length; i++) {
                        $("#all_content_spotlight").append("<tr><td>"+(i+1)+"</td><td>"+xhr.info[i][0]+"</td><td>"+xhr.info[i][1]+"</td><td>"+xhr.info[i][2]+"</td></tr>")
                    }

                    i18n = {
                        "count": "總人數",
                        "mean": "平均值",
                        "std": "標準差",
                        "min": "最小值",
                        "25%": "第一四分位數Q1(25%)",
                        "50%": "中位數(50%)",
                        "75%": "第三四分位數Q3(75%)",
                        "max": "最大值"
                    }

                    for (var i = 0; i < xhr.stat.length; i++) {
                        $("#stat_content_spotlight").append("<tr><td>"+i18n[xhr.stat[i][0]]+"</td><td>"+xhr.stat[i][1]+"</td><td>"+xhr.stat[i][2]+"</td></tr>")
                    }

                    $("#loading_mask").fadeOut()
                    $(".container").fadeIn()
                },
                'error': function(xhr) {
                    console.log(xhr);
                    location.reload()
                },
            })


    })

});
