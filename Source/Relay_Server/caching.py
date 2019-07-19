from flask import Flask,  request, abort, jsonify, redirect
import json
import os
import requests
from time import time as timeStamp
import pickle

from apscheduler.schedulers.background import BackgroundScheduler
import pytz

_ver_ = "<Cache_Server_version: 1.211.1906.1303> "
debugging = False

def get_file_list(root, ftype = ".csv"):
    import os
    import sys
    FileList = []
    filename = []
    for dirPath, dirNames, fileNames in os.walk(root):
        for f in fileNames:
            if f.find(ftype) > -1:
                FileList.append(os.path.join(dirPath, f))
                filename.append(f.replace(ftype, ""))
    if len(filename) > 0:
        a = zip(FileList, filename)
        a = sorted(a, key = lambda t : t[1])
        FileList, filename = zip(*a)
    return FileList, filename

app = Flask(__name__)

def route2(target, theData): # common routing method
    print("[AUTH] Routing to lab: {}".format(target.split('-')[0].split('=')[0]))
    try:
        backend_url = "Main_Server_IP" if debugging else "Main_Server_IP_Redundancy"
        r = requests.post(url="{}/{}".format(backend_url, target), data=json.dumps(theData), headers={'Content-Type': 'application/json; charset=utf8', 'cache-server': '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6'})
    except:
        backend_url = "Main_Server_IP" if debugging else "Main_Server_IP_Redundancy" # backup
        r = requests.post(url="{}/{}".format(backend_url, target), data=json.dumps(theData), headers={'Content-Type': 'application/json; charset=utf8', 'cache-server': '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6'})

    return r.json()

def update_points():
    resp = route2("update_points-eed7e276c6ba76f0f6b39c64600001e1bc19246a2ef877deb3591ff7f839d90e1d14b39ff5603b1cd184537ae7978f34bcc8eb6f3bc1330cdc26d85490f23332", {'work': 'update_points'})
    if resp['code'] == '200 ok':
        return 0
    else:
        pass

timez = pytz.timezone('Asia/Taipei')
# scheduler = BackgroundScheduler()
# scheduler.add_job(func=update_points, trigger="cron", day_of_week='*', hour=5, minute=40, second=10, timezone=timez)
# scheduler.start()

@app.route('/wakeup', methods=['GET'])
def wakeup(): # for checking the server health
    return 'Hello, I am working hard!'

@app.route('/')
def hello():
    return redirect("https://chrome.google.com/webstore/detail/anepijmkiffdjchfonbcnngnkogjllhg/", code=302)

@app.route('/last_stage/<uid>/<dt>', methods=['GET'])
def last_stage(uid, dt):
    data = {'uuid': uid, 'dtstamp': dt}
    rendered_html = route2('last_stage=10131ca2b271789c999eeb2e3b2badd02cc31bb44db4386b2b2275d02251abed635a803424d449d9507600d5660183c9dd051af561223087855942e247eba1b2', data)
    return rendered_html['html']

@app.route('/last_stage_done', methods=['POST'])
def last_stage_done():
    go_back = route2('last_stage_done=ca9f43a975246b98c6a41e175241b40f2c8fa021180ee37a1900f97ec8e190b1019f865387d2b769b76d6c858daf9c7c4347ebff52d9be06547f65a46258377e', request.get_json())
    return jsonify(go_back)

def creation_date(path_to_file): # get the file creation_date
    stat = os.stat(path_to_file)
    try:
        return stat.st_birthtime
    except AttributeError:
        return stat.st_mtime

@app.route('/update_rpt-7463810f0986b9cac41176259db5013d1ae1ba69913fe10093006f6658b32d743da8c1ea735500e85ffc202614549f628e96913e196390430b3bcbac86fbf374', methods=['GET', 'POST'])
def update_rpt():
    if request.method == 'POST':
        go_back = route2("update_rpt-7463810f0986b9cac41176259db5013d1ae1ba69913fe10093006f6658b32d743da8c1ea735500e85ffc202614549f628e96913e196390430b3bcbac86fbf374", request.get_json())
        return jsonify(go_back)
    else:
        return abort(401)

@app.route('/storeFinished-c76b068b0366808e0cff42386e9677817d5f1e4d6ea44156007d0deb49e8eae936f1c0c527315ff20f3b9562e1eff182a3e6c7257142fe2e84a6752ecd5acf64', methods=['GET', 'POST'])
def storeFinished(): # store the respose from worker server
    if not os.path.isdir("./finished"):
        os.mkdir("./finished")
    if not os.path.isdir("./finished/done"):
        os.mkdir("./finished/done")
    if not os.path.isdir("./finished/data"):
        os.mkdir("./finished/data")

    if request.method == 'POST':
        go_back = request.get_json()
        Qfilename = list(go_back.keys())[0]
        with open("./finished/data/{}.pkl".format(Qfilename), mode='wb') as f:
            pickle.dump(go_back[Qfilename], f)
        try:
            return jsonify({'code': '200 ok'})
        except:
            return jsonify({'code': '200 ok'})
        finally:
            with open("./finished/done/{}.done".format(Qfilename), 'w') as f:
                f.write(Qfilename)
            paths, tags = get_file_list("./finished/done", ".done")
            expired = []
            nowTime = timeStamp()
            for i_p, p in enumerate(paths):
                if nowTime - creation_date(p) > 600:
                    expired.append(tags[i_p])
            for exp in expired:
                os.remove("./finished/data/{}.pkl".format(exp))
                os.remove("./finished/done/{}.done".format(exp))
    else:
        return abort(401)

@app.route('/done', methods=['GET', 'POST'])
def sendFinished2Client(): # serve the client request of response
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        rq = request.get_json()
        Qfilename = rq['QID']
        _, tag = get_file_list("./finished/done", ".done")
        if Qfilename in tag:
            with open("./finished/data/{}.pkl".format(Qfilename), mode='rb') as f:
                go_back = pickle.load(f)
        else:
            go_back = {"working": 1}

        try:
            return jsonify(go_back)
        except:
            return jsonify(go_back)
        finally:
            if 'stat' in go_back:
                os.remove("./finished/data/{}.pkl".format(Qfilename))
                os.remove("./finished/done/{}.done".format(Qfilename))
    else:
        return abort(401)

@app.route('/reward/<info_name>', methods=['GET', 'POST'])
def reward_dispatcher(info_name):
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        data = request.get_json()
        data.update({'type': info_name})
        go_back = route2("reward=1f38b516050cf8de54716c730f44d38e9880ede106a119e0a5bd32257c6500990976f07001bb11ddc3d39fa2219611f1aed0023fc8cb10d41af6183d0b74732d", data)
        return jsonify(go_back)
    else:
        print("[ERROR] Discard")
        return abort(401)

@app.route('/report/<page_name>', methods=['GET', 'POST'])
def report_dispatcher(page_name):
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        go_back = route2("report=961b5d2dd2a5b2618d9f3ba10ae142d1cf1a342faedf3e748ce0967dab120be12be2d29410e591fadf06f24d4801f201f0250c174b6c77d3ed3397833fc93843/{}".format(page_name), request.get_json())
        return jsonify(go_back)
    else:
        print("[ERROR] Discard")
        return abort(401)

@app.route("/classified/", methods=['GET', 'POST'])
def classify():
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        go_back = route2("classify=6fde1668684d393896f65be801752a995285affbade14ffa39ae054527e7fc1b603870e2b4ad8515541e8f60e143ac8ed33d8fe550d3737e7e8cd30d050ba365/", request.get_json())
        return jsonify(go_back) # {"stat": "200 ok"}
    else:
        print("[ERROR] Discard")
        return abort(401)

@app.route("/gacha/", methods=['GET', 'POST'])
def gacha():
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        go_back = route2("gacha=031cbdd62d400897d789fa895374d57fc72df6df42e32763c78bde3f6f4d90c37a70dca2b196c6a77e338c8dcbbab5eb81c6bb637b8abeec544a8c47f06d41b2/", request.get_json())
        return jsonify(go_back) # {"stat": "200 ok"}
    else:
        print("[ERROR] Discard")
        return abort(401)

@app.route("/worker/<jobs>", methods=['GET', 'POST'])
def work_for(jobs):
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        go_back = route2("worker=97e0d53e0fbd08b636bd18f1296b46bbeaf0955f7a212d3da6c22aba8e41a5b842778bfd804200b5d38990a5afaaa7c99add23c26f9b9ec9d7afb0458e7a4a4d/", request.get_json())
        return jsonify(go_back) # {"code": Qfilename}
    else:
        print("[ERROR] Discard")
        return abort(401)


@app.route("/profile/<ptype>", methods=['GET', 'POST'])
def update_user_contact(ptype):
    if request.method == 'POST' and (request.headers['Origin'].find("ncu-dart-chrome-ext-cache") > -1 or request.headers['Origin'].find("chrome-extension://") > -1) and len(request.headers['Origin']) > len("chrome-extension://") and (ptype in ['email'.upper(), 'phone'.upper(), 'birth'.upper(), 'gender'.upper()]):
        data = request.get_json()
        data.update({'type': ptype})
        go_back = route2("UpdateUserContact=f27faa4aa222e23cd54f9e009bec57f1464a14d6cdb0f74036bbdaae7993f7e3a5cb6c49f9de6893853e4813b723177a9db1d671a643c8c0e809edd1fba1f921", data)
        return jsonify(go_back)
    else:
        print("[ERROR] Discard")
        return abort(401)

@app.route("/purchase/<points>", methods=['GET', 'POST'])
def purchase(points):
    if request.method == 'POST' and request.headers['Origin'].find("chrome-extension://") > -1 and len(request.headers['Origin']) > len("chrome-extension://"):
        data = request.get_json()
        if str(data['item']['points']) != str(points):
            return jsonify({'msg': '資料錯誤！'})
        else:
            go_back = route2("purchase=72f86c2264214782aced4754738066c0a0598fa092296039be104852339310d34fa2bc4cb93be43da7f63c76c9dbc7729d13b4e4bad8941e4138700f50e0b581", data)
            return jsonify(go_back)
    else:
        print("[ERROR] Discard")
        return abort(401)

if __name__ == '__main__':
    app.debug = debugging
    app.run(host='0.0.0.0')
