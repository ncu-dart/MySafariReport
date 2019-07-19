#"-*- coding: utf-8 -*-"
import smtplib
from email.mime.text import MIMEText
import sys


mail_user = 'YOUR_SERVICE@gmail.com'
mail_password = 'ACCOUNT_PASSWORD'
mailto_list=[]
mail_postfix="gmail.com"

def purchasedDone2user(to_list, data):
    mail_user = 'YOUR_SERVICE@gmail.com'
    mail_password = 'ACCOUNT_PASSWORD'
    me="資料分析科學實驗室"+"<"+mail_user+">"

    mail_html = ""
    with open("./MailTemplate/purchasedDone2user.html") as fin:
        for l in fin.readlines():
            mail_html += l

    msg=MIMEText(mail_html.format(*data), "html", "utf-8")
    msg['Subject']="[擴充功能-網路使用報告] 活動通知"
    msg['From']=me
    msg['To']=",".join(to_list)
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.ehlo()
        server.login(mail_user,mail_password)
        server.sendmail(me, to_list, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(str(e))
        return False


if __name__ == '__main__':
    mailto_list.append(sys.argv[1])
    if sendmail(mailto_list, sys.argv[2:]):
        print("done!")
    else:
        print("falsed!")
