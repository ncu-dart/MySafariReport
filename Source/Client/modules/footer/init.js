$.ajax({
    url : "/modules/footer/footer.html",
    dataType: "text",
    success : function (data) {
        $("body").append(data)
        setPrivacyPolicy("#privacy_policy_modal_content")
        $.ajax({
            'url': 'https://raw.githubusercontent.com/ncu-dart/MySafariReport/master/Change_Log.md',
            'crossDomain': true,
            'dataType': "text",
            'type': 'GET',
            'success': function (changelog) {
                var converter = new showdown.Converter();
                converter.setOption('tables', 'true');
                html = converter.makeHtml(changelog);
                $("#change_log_modal_content").append(html)
                M.AutoInit()
            }
        })
    }
});
