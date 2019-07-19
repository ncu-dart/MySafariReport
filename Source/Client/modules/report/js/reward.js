userID = "LOADING"

$(document).ready(function() {
    chrome.storage.sync.get(["dart_userID"], function(v) {
        userID = v.dart_userID
        getRewardInfo(userID, function(resp) {
            try {
                $("#points_total").html("剩餘 <span class='green-text'>" + Math.round(resp.points[0][2] * 10 ** 6) / 10 ** 6 + "</span>點")
                $("#modal1 > div.modal-content > p:nth-child(2)").text("總獲得: " + Math.round(resp.points[0][0] * 10 ** 6) / 10 ** 6 + "點")
                $("#modal1 > div.modal-content > p:nth-child(3)").text("已使用: " + resp.points[0][1] + "點")
                $("body > main > div > div:nth-child(1) > div > div > div > div:nth-child(2)").fadeIn()
                for (var i = 0; i < resp.info.length; i++) {
                    if (i < 3) {
                        $("#mission_content_spotlight").append("<tr><td>" + resp.info[i][0] + "</td><td>" + resp.info[i][1] + "</td><td>" + resp.info[i][2] + "</td></tr>")
                    } else {
                        $("#mission_content_modal").append("<tr><td>" + resp.info[i][0] + "</td><td>" + resp.info[i][1] + "</td><td>" + resp.info[i][2] + "</td></tr>")
                    }
                }
                if (resp.info.length > 3) {
                    $("body > main > div > div:nth-child(1) > div > div > div > div.card-content > div").fadeIn()
                }

                if (resp.items.length > 0) {
                    $("#items-card").show()

                    for (var i = 0; i < resp.items.length; i++) {
                        if ($("#points_total > span").text() < resp.items[i][1]) {
                            d = Math.ceil((resp.items[i][1] - $("#points_total > span").text()) / 2)
                            $("#item_content").append("<tr><td>" + resp.items[i][0] + "</td><td>" + resp.items[i][1] + "</td><td>" + resp.items[i][2] + "</td><td><div href=\"#\" class=\"btn red disabled\"> 再 "+d+"天可兌換</div></td></tr>")
                        }
                        else {
                            $("#item_content").append("<tr><td>" + resp.items[i][0] + "</td><td>" + resp.items[i][1] + "</td><td>" + resp.items[i][2] + "</td><td><a href=\"#modal3\" class=\"btn-floating btn waves-effect waves-light red modal-trigger\">兌換</a></td></tr>")
                        }
                    }

                    itemTR = $("#item_content > tr")
                    for (var i = 0; i < itemTR.length; i++) {
                        if ($(itemTR[i]).find('a').length > 0) {
                            itemBTN = $(itemTR[i]).find('a')[0]
                            $(itemBTN).data("item", resp.items[i][0])
                            $(itemBTN).data("points", resp.items[i][1])
                            $(itemBTN).on("click", function () {
                                $("#confirm_item").html($(this).data("item"))
                                $("#confirm_points").html($(this).data("points"))
                                $("#confirm_btn").data("item", $(this).data("item"))
                                $("#confirm_btn").data("points", $(this).data("points"))
                                if ($("#points_total > span").text() < $("#confirm_btn").data("points")) {
                                    $("#confirm_btn").addClass('disabled');
                                }
                                else {
                                    $("#confirm_btn").removeClass('disabled');
                                }
                            })
                        }
                    }

                    $("#confirm_btn").on("click", function () {
                        $("#modal3 > div.modal-footer > a.modal-close.waves-effect.waves-green.btn-flat").addClass("disabled")
                        $(this).html($("#loading_mask").html())
                        rq = $(this).data()
                        _p_(userID, rq, function (resp) {
                            console.log(resp.msg);
                            $("#notify").html(resp.msg)
                            $("#modal3 > div.modal-footer > a.modal-close.waves-effect.waves-green.btn-flat").removeClass("disabled")
                            $("#modal3").modal('close')
                            $("#modal4").modal('open')
                            $("#confirm_btn").html("確定兌換")
                        })
                    })
                }



                $('#modal4').modal({'onCloseEnd': function () { location.reload()} });

                flag = 0

                if (resp.purchased.length > 0) {
                    $("#email").val(resp.profile[0][0])
                    $("#phone").val(resp.profile[0][1])
                    $("#email").attr("disabled", "disabled")
                    $("#phone").attr("disabled", "disabled")
                    M.updateTextFields();

                    for (var i = 0; i < resp.purchased.length; i++) {
                        status = (resp.purchased[i][1] == 0) ? "審核中" : (resp.purchased[i][1] == -1) ? "待發送" : "完成"
                        $("#purchased_content").append("<tr><td>" + resp.purchased[i][0] + "</td><td>" + status + "</td><td><a href=\"#modal5\" class=\"btn-floating btn waves-effect waves-light red modal-trigger\">查看</a></td></tr>")
                    }
                    itemBTN = $("#purchased_content").find('a')
                    for (var i = 0; i < itemBTN.length; i++) {
                        $(itemBTN[i]).data("item", resp.purchased[i][0])
                        $(itemBTN[i]).data("status", (resp.purchased[i][1] == 0) ? "審核中" : (resp.purchased[i][1] == -1) ? "待發送" : "完成")
                        $(itemBTN[i]).data("itemContent", resp.purchased[i][2])

                        $(itemBTN[i]).on("click", function () {
                            x = $(this).data()
                            html = "<h4>"+x.item+"</h4>"
                            html += "<p>狀態：<span class='yellow'>"+x.status+"</span></p>"
                            html += "<p>詳細內容："+x.itemContent+"</p>"
                            $("#purchased_info").html(html)
                        })
                    }
                    $("#purchased-card").show()
                }
                else {
                    if (resp.profile[0][0] === null) {
                        ++flag
                    } else {
                        $("#email").val(resp.profile[0][0])
                        $("#email").data('last', resp.profile[0][0])
                    }
                    $("#email").on('blur', function() {
                        val = $("#email").val()
                        if (!$("#email").hasClass("invalid") && val.length > 0 && val != $("#email").data('last')) {
                            chrome.storage.sync.get(["server_addr"], function(res) {
                                $.ajax({
                                    'type': "POST",
                                    'url': res.server_addr + "/profile/EMAIL",
                                    'dataType': 'json',
                                    'crossDomain': true,
                                    'contentType': "application/json",
                                    'data': JSON.stringify({
                                        'uuid': userID,
                                        'new': val
                                    }),
                                    'success': function(xhr) {
                                        console.log(xhr);
                                        console.log('done');
                                        if (flag > 0) {
                                            flag -= xhr.code
                                            if (flag === 0) {
                                                location.reload()
                                            }
                                        }
                                    },
                                    'error': function(xhr) {
                                        console.log(xhr);
                                    },
                                });
                            })

                            $("#email").data('last', val)
                        } else {
                            if ($("#email").data("last") !== undefined) {
                                $("#email").val($("#email").data("last"))
                            } else {
                                $("#email").val("")
                            }
                        }
                        M.updateTextFields();
                    });

                    if (resp.profile[0][1] === null) {
                        ++flag
                    } else {
                        $("#phone").val(resp.profile[0][1])
                        $("#phone").data('last', resp.profile[0][1])
                    }
                    $("#phone").on('blur', function() {
                        val = $("#phone").val()
                        var re = new RegExp(/^09\d{8}$/);
                        if (re.test(val) && $("#phone").data("last") != val) {
                            chrome.storage.sync.get(["server_addr"], function(res) {
                                $.ajax({
                                    'type': "POST",
                                    'url': res.server_addr + "/profile/PHONE",
                                    'dataType': 'json',
                                    'crossDomain': true,
                                    'contentType': "application/json",
                                    'data': JSON.stringify({
                                        'uuid': userID,
                                        'new': val
                                    }),
                                    'success': function(xhr) {
                                        if (flag > 0) {
                                            flag -= xhr.code
                                            if (flag === 0) {
                                                location.reload()
                                            }
                                        }
                                        console.log(xhr);
                                        console.log('done');
                                    },
                                    'error': function(xhr) {
                                        console.log(xhr);
                                    },
                                });
                            })

                            $("#phone").data('last', val)
                        } else {
                            if ($("#phone").data("last") !== undefined) {
                                $("#phone").val($("#phone").data("last"))
                            } else {
                                $("#phone").val("")
                            }
                        }
                        M.updateTextFields();
                    });
                }


                $("#email").attr("disabled", "disabled")
                $("#phone").attr("disabled", "disabled")
                M.updateTextFields();

                if (flag > 0) {
                    $("#purchased-card").hide()
                    $("#items-card").hide()

                    $("#modal2").modal('open');

                }
                else if (resp.purchased.length > 0) {
                    $("body > main > div.container > div:nth-child(2) > div > ul > li:nth-child(1) > div.collapsible-header > h5").html("<i class=\"material-icons\">settings</i>領獎資訊設定<i class=\"material-icons amber-text\">lock</i>")
                    $('.collapsible').collapsible('open', 1);
                }
                else {
                    $("body > main > div.container > div:nth-child(2) > div > ul > li:nth-child(1) > div.collapsible-header > h5").html("<i class=\"material-icons\">settings</i>領獎資訊設定<i class=\"material-icons green-text\">done_outline</i>")
                    $('.collapsible').collapsible('open', 1);
                }

                $("#loading_mask").fadeOut()
                $(".progress").fadeOut()
                $(".container").fadeIn()
            } catch (e) {
                location.reload()
            }

        })
    })

});
