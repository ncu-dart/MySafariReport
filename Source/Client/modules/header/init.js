$.ajax({
    url : "/modules/header/header.html",
    dataType: "text",
    success : function (data) {
        $("#header_auto").append(data)

        // Activate the right page
        now_page = location.pathname.split('/')[location.pathname.split('/').length -1].replace(".html", "")
        now_page_path = now_page.split('-')
        now_page_path.forEach(function (x) {
            $("#"+x).addClass("active")
        })

        // Set Page Title
        page_title = $("#" + now_page_path[now_page_path.length - 1]).find('a').text()

        $("#nav-title").text(page_title)

        M.AutoInit();
    }
});
