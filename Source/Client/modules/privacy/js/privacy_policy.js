var privacy_policy_version = 1.201
var privacy_policy_markdown = ""
$.ajax({
    url : "/modules/privacy/privacy_policy.md",
    dataType: "text",
    success : function (data) {
        privacy_policy_markdown = data
    }
});




function setPrivacyPolicy(theID) {
    if (privacy_policy_markdown.length == 0) {
        setTimeout(function () {
            setPrivacyPolicy(theID);
        }, 1000)
        return
    }
    var converter = new showdown.Converter();
    html = converter.makeHtml(privacy_policy_markdown);
    $(theID).append(html)
    $(theID).closest('.card-content').find('h3').find('span').append(" v"+privacy_policy_version)
    return
}
