import pymysql
from datetime import datetime
import json
import pandas as pd
import numpy as np
import hashlib as hs
from time import time as timeStamp
from time import sleep as wait
from random import random as rand
from random import shuffle as shuffle
import os
from shutil import rmtree as rmt
import pickle
import requests
import sys
import multiprocessing as mp

debugging = False
_ver_ = "<Processor_version: 1.202.1903.2320> "


class DataBase:
    def __init__(self, host, user, pwd, port, database):
        self.host = host
        self.user = user
        self.pwd = pwd
        self.port = port
        self.database = database
        self.connection = pymysql.connect(host=self.host, user=self.user, passwd=self.pwd, port=self.port, database=self.database, charset='utf8mb4', use_unicode=True)
        self.pointer = self.connection.cursor()

    def check_connect(self):
        self.connection.ping(reconnect=True)
        self.pointer = self.connection.cursor()
        return

    def close_db(self):
        self.connection.close()
        self.pointer.close()
        return

    def record_history(self, data):
        # data['history'] data['uuid_true']
        # dict_keys(['title', 'url', 'domain', 'visitId', 'visitTime', 'transition'])

        # prepare executemany data
        tmp = []
        for x in data['history']:
            tmp.append(tuple([data['uuid_true'], x['visitId'], x['visitTime'], x['title'], x['url'], x['transition'], x['domain']]))
        data2db = tuple(tmp)

        sql = "INSERT INTO `history`(`UUID`, `visit_id`, `visit_time`, `title`, `url`, `transition`, `domain`) VALUES (%s, %s, %s, %s, %s, %s, %s)"

        try:
            self.check_connect()
            self.pointer.executemany(sql, data2db)
            self.connection.commit()
            return 0

        except:
            self.check_connect()
            self.connection.rollback()
            redo_list = []
            for x in data2db:
                try:
                    self.check_connect()
                    self.pointer.execute(sql, x)
                    self.connection.commit()
                except pymysql.err.IntegrityError:
                    # stored
                    # print(x)
                    pass
                except Exception as e:
                    redo_list.append(x)
                    with open("./logs/record_histroy_error.log", 'a+') as f:
                        f.write("Error: {}:\t{}\n\n".format(str(e), x))
            if len(redo_list) > 0:
                return 1
            else:
                return 0
        finally:
            self.close_db()

    def clear_bookmark(self, uuid):
        sql = "DELETE FROM `bookmark` WHERE `UUID` = %s"
        try:
            self.check_connect()
            self.pointer.execute(sql, (uuid))
            self.connection.commit()
            return 0
        except Exception as e:
            self.connection.rollback()
            self.connection.commit()

            with open("./logs/clear_bookmark_error.log", 'a+') as f:
                f.write("error: {}\n".format(str(e)))
            return 1
        finally:
            self.close_db()

    def record_bookmark(self, data):
        # data['bookmarks'] data['uuid_true']
        # dict_keys([catename, id, idx, layer, logtime, parentId, title, url])

        # prepare executemany data
        tmp = []
        for x in data['bookmarks']:
            tmp.append(tuple([data['uuid_true'], x['id'], x['catename'], x['title'], x['url'], x['parentId'], x['idx'], x['layer'], x['logtime']]))
        data2db = tuple(tmp)

        sql = "INSERT INTO `bookmark`(`UUID`, `bkid`, `catename`, `title`, `url`, `parentId`, `idx`, `layer`, `logtime`) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)"

        try:
            self.check_connect()
            self.pointer.executemany(sql, data2db)
            self.connection.commit()
            return 0
        except:
            self.check_connect()
            self.connection.rollback()
            redo_list = []
            for x in data2db:
                try:
                    self.check_connect()
                    self.pointer.execute(sql, x)
                    self.connection.commit()
                except pymysql.err.IntegrityError:
                    # stored
                    # print(x)
                    pass
                except Exception as e:
                    self.connection.rollback()
                    self.connection.commit()
                    redo_list.append(x)
                    with open("./logs/record_bookmark_error.log", 'a+') as f:
                        f.write("Error: {}:\t{}\t{}\n".format(str(e), x[0], [1]))
            if len(redo_list) > 0:
                return 1
            else:
                return 0
        finally:
            self.close_db()

    def update_InstallExt(self, data):
        sql = "SELECT '{0}'>(NOW()+ INTERVAL 1 HOUR) OR '{0}' < (NOW() - INTERVAL 1 HOUR)".format(data['installDate'])
        flag = self.query(sql)
        if flag[0][0] == 1 and str(data['userStatus']) == "0":
            sql = "UPDATE `user` SET `ext_version` = '{}', `ext_InstallDate` = '{}', status=3 WHERE `UUID`='{}'".format(data['version'], data['installDate'], data['uuid_true'])
        else:
            sql = "UPDATE `user` SET `ext_version` = '{}', `ext_InstallDate` = '{}' WHERE `UUID`='{}'".format(data['version'], data['installDate'], data['uuid_true'])

        try:
            self.check_connect()
            self.pointer.execute(sql)
            self.connection.commit()
            return 0

        except Exception as e:
            self.connection.rollback()
            self.connection.commit()

            with open("./logs/update_InstallExt_error.log", 'a+') as f:
                f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))
            return 1
        finally:
            self.close_db()

    def record_focus_change(self, data):
        # prepare executemany data
        tmp = []
        for x in data['focus_stream']:
            tmp.append(tuple([data['uuid_true'], x['title'], x['url'], x['domain'], x['type'], x['incognito'], x['dt']]))
        data2db = tuple(tmp)

        sql = "INSERT INTO `focus`(`UUID`, `title`, `url`, `domain`, `type`, `incognito`, `dt`) VALUES (%s,%s,%s,%s,%s,%s,%s)"

        try:
            self.check_connect()
            # self.pointer.execute(sql, tuple([data['uuid_true'], data['title'], data['url'], data['domain'], data['type'], data['dt']]))
            self.pointer.executemany(sql, data2db)
            self.connection.commit()
            return 0
        except Exception as e:
            self.check_connect()
            self.connection.rollback()

            status = []
            for i_dt, x in enumerate(data2db):
                try:
                    self.check_connect()
                    self.pointer.execute(sql, x)
                    self.connection.commit()
                    # status.append(0)
                except pymysql.err.IntegrityError:
                    # stored
                    # print(x)
                    pass
                except Exception as e:
                    self.connection.rollback()
                    self.connection.commit()
                    status.append(data['focus_stream'][i_dt])
                    with open("./logs/record_focus_change_error.log", 'a+') as f:
                        f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))
            if len(status) == 0:
                status = 0
            return status

        finally:
            self.close_db()

    def query(self, sql, din = None):
        if din is not None:
            try:
                self.check_connect()
                rows = self.pointer.execute(sql, din)
                if rows > 0:
                    results = self.pointer.fetchall()
                else:
                    results = []
                return results
            except Exception as e:
                self.connection.rollback()
                self.connection.commit()
                with open("./logs/query_error.log", 'a+') as f:
                    f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))

        else:
            try:
                self.check_connect()
                rows = self.pointer.execute(sql)
                if rows > 0:
                    results = self.pointer.fetchall()
                else:
                    results = []
                return results
            except Exception as e:
                with open("./logs/query_error.log", 'a+') as f:
                    f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))



    def update(self, sql, din = None):
        rows = 0
        if din is not None:
            try:
                self.check_connect()
                rows = self.pointer.execute(sql, din)
                if rows > 0:
                    self.connection.commit()
            except pymysql.err.IntegrityError:
                pass
            except Exception as e:
                self.check_connect()
                self.connection.rollback()
                self.connection.commit()
                with open("./logs/query_error.log", 'a+') as f:
                    f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))

        else:
            try:
                self.check_connect()
                rows = self.pointer.execute(sql)
                if rows > 0:
                    self.connection.commit()
            except pymysql.err.IntegrityError:
                pass
            except Exception as e:
                self.check_connect()
                self.connection.rollback()
                self.connection.commit()
                with open("./logs/query_error.log", 'a+') as f:
                    f.write("SQL: {}\nError: {}\n\n".format(sql, str(e)))

        return rows

class DomainCate:
    def __init__(self, DB):
        self.db = DB
        self.filterVer = self.getFilterVer()
        self.unknownList = []

    def getFilterVer(self):
        try:
            wait(1 + rand() * 8 + rand() * 1)
            r = requests.get('https://fortiguard.com/webfilter?version=8', timeout=10)
            html = r.text
            start_str = 'Latest Web Filter Databases <a href="/updates/webfiltering">'
            return float(html[html.find(start_str)+len(start_str):html.find('</a></h4>\n', html.find(start_str))])
        except:
            wait(1 + rand() * 9 + rand() * 9 + rand() * 1)
            return self.getFilterVer()

    def getUserNullCate(self, uid):
        history_distinct_domain = self.db.query("SELECT DISTINCT(h.domain) FROM history h LEFT JOIN domain_cate dc ON dc.domain =  h.domain WHERE (dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY))) AND h.UUID = '{}' ORDER BY dc.cate;".format(self.filterVer, uid))
        focus_distinct_domain = self.db.query("SELECT DISTINCT(f.domain) FROM focus f LEFT JOIN domain_cate dc ON dc.domain = f.domain WHERE (dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY))) AND f.UUID = '{}'".format(self.filterVer, uid))
        # print(history_distinct_domain, focus_distinct_domain)
        return list(set([x[0] for x in history_distinct_domain] + [x[0] for x in focus_distinct_domain]))

    def updateUnknown(self):
        history_distinct_domain = self.db.query("SELECT DISTINCT(h.domain) FROM history h LEFT JOIN domain_cate dc ON dc.domain =  h.domain WHERE dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY)) ORDER BY dc.cate;".format(self.filterVer))
        if type(history_distinct_domain) == "NoneType":
            history_distinct_domain = self.db.query("SELECT DISTINCT(h.domain) FROM history h LEFT JOIN domain_cate dc ON dc.domain =  h.domain WHERE dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY)) ORDER BY dc.cate;".format(self.filterVer))

        focus_distinct_domain = self.db.query("SELECT DISTINCT(f.domain) FROM focus f LEFT JOIN domain_cate dc ON dc.domain =  f.domain WHERE dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY)) ORDER BY dc.cate;".format(self.filterVer))
        if type(history_distinct_domain) == "NoneType":
            focus_distinct_domain = self.db.query("SELECT DISTINCT(f.domain) FROM focus f LEFT JOIN domain_cate dc ON dc.domain =  f.domain WHERE dc.cate IS NULL OR ((dc.cate LIKE 'Not%' OR dc.cate LIKE 'Unclass%') AND dc.DB_Ver < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY)) ORDER BY dc.cate;".format(self.filterVer))

        outdated_domain = self.db.query("SELECT `domain` FROM `domain_cate` WHERE `DB_Ver` < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY) ORDER BY `DB_Ver`;".format(self.filterVer))
        if type(history_distinct_domain) == "NoneType":
            outdated_domain = self.db.query("SELECT `domain` FROM `domain_cate` WHERE `DB_Ver` < {} AND NOW() > (`DB_update_time` + INTERVAL 7 DAY) ORDER BY `DB_Ver`;".format(self.filterVer))

        try:
            self.unknownList = list(set([x[0] for x in history_distinct_domain] + [x[0] for x in focus_distinct_domain])) + list(set([x[0] for x in outdated_domain]))
            shuffle(self.unknownList)
        except Exception as e:
            with open("./logs/updateUnknown_error.log", 'a+') as f:
                f.write(_ver_+'filterVer: {}\nhistory_distinct_domain: {}\nfocus_distinct_domain: {}\noutdated_domain:{}\nERROR: {}\n\n\n'.format(self.filterVer, history_distinct_domain, focus_distinct_domain, outdated_domain,str(e)))

        return

    def getUNKlist(self):
        shuffle(self.unknownList)
        if len(self.unknownList) > 500:
            return self.unknownList[:500]
        else:
            return self.unknownList

    def storeClassified(self, html):
        if html.find('<meta name="title" property="title" content="Web Filter Lookup" />') > -1:
            start_str = '<input type="text" placeholder="Search URL" name="q" value="'
            domain = html[html.find(start_str)+len(start_str):html.find('">', html.find(start_str))]

            if domain != "" and domain in self.unknownList:
                start_str = '<h4 class="info_title">Category: '
                cate = html[html.find(start_str)+len(start_str):html.find('</h4>', html.find(start_str))]

                start_str = 'Latest Web Filter Databases <a href="/updates/webfiltering">'
                dbver = float(html[html.find(start_str)+len(start_str):html.find('</a></h4>\n', html.find(start_str))])
                self.filterVer = dbver

                # print(domain, cate, dbver)

                row = self.db.update("UPDATE `domain_cate` SET `cate`='{}',`DB_Ver`={} WHERE `domain`= '{}'".format(cate, dbver, domain))
                if row == 0:
                    row = self.db.update("INSERT INTO `domain_cate`(`domain`, `cate`, `DB_Ver`) VALUES ('{}', '{}', '{}')".format(domain, cate, dbver))

                # self.updateUnknown()
        else:
            with open('./logs/error_htmls.log', mode='a+', buffering=-1, encoding=None, errors=None, newline=None, closefd=True) as f:
                f.write(html+'\n\n\n')
        return


def task_store_history(Qfilename):
    with open("./queue/{}.pkl".format(Qfilename), mode='rb') as f:
        data = pickle.load(f)
    db = DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME')
    if len(data['history']) > 0:
        if 'url' in data['history'][0].keys():
            return db.record_history(data)
        else:
            return 1
    else:
        return 0

def task_update_bookmark(Qfilename):
    with open("./queue/{}.pkl".format(Qfilename), mode='rb') as f:
        data = pickle.load(f)
    db = DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME')
    if db.clear_bookmark(data['uuid_true']) == 0:
        return db.record_bookmark(data)
    else:
        return 1

def task_focus_stream(Qfilename):
    with open("./queue/{}.pkl".format(Qfilename), mode='rb') as f:
        data = pickle.load(f)
    if(len(data['focus_stream']) > 0):
        db = DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME')

        df = pd.DataFrame.from_records(data['focus_stream']).drop_duplicates().reset_index(drop=True) # clean the data as unique data

        data.update({'focus_stream':df.to_dict('records')})
        return db.record_focus_change(data)
    else:
        return 0

task = {
    2: task_store_history,
    3: task_update_bookmark,
    5: task_focus_stream,
}

def main(Qfilename):
    with open("./queue/{}.pkl".format(Qfilename), mode='rb') as f:
        data = pickle.load(f)



    stat = {}
    db = DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME')
    if 4 in data['updateCodes']:
        stat.update({4: db.update_InstallExt(data)})
        while 4 in data['updateCodes']:
            try:
                data['updateCodes'].remove(4)
            except:
                break

    pool = mp.Pool()
    results = []
    for x in set(data['updateCodes']):
        res = pool.apply_async(task[x], (Qfilename,))
        results.append(res)
    pool.close()
    pool.join()

    dc = DomainCate(db)
    dc.updateUnknown()

    for x, result in zip(data['updateCodes'], results):
        stat.update({x:result.get()})

    go_back = {"stat": stat}
    if 'finished' not in data or data['finished'] == 1:
        to_do = dc.getUserNullCate(data['uuid_true'])
        if len(to_do) == 0 and len(dc.unknownList) > 0:
            go_back.update({"ToDo": dc.getUNKlist()})
        else:
            go_back.update({"ToDo": to_do})

    db.close_db()

    cache_server = "https://ncu-dart-chrome-ext-cache-beta.herokuapp.com" if debugging else "https://ncu-dart-chrome-ext-cache.herokuapp.com"
    try:
        r = requests.post(url=cache_server+'/update_rpt-7463810f0986b9cac41176259db5013d1ae1ba69913fe10093006f6658b32d743da8c1ea735500e85ffc202614549f628e96913e196390430b3bcbac86fbf374', data=json.dumps({'uuid': data['uuid']}), headers={'Content-Type': 'application/json; charset=utf8'})
        if r.json()['code'] != '200 ok':
            with open("./logs/rpt_update_error.log", 'a+') as f:
                f.write("Respose: {}\n\n".format(r.json()))
    except Exception as e:
        with open("./logs/rpt_update_error.log", 'a+') as f:
            f.write("Respose: {}\n\n".format(str(e)))


    r = requests.post(url=cache_server+'/storeFinished-c76b068b0366808e0cff42386e9677817d5f1e4d6ea44156007d0deb49e8eae936f1c0c527315ff20f3b9562e1eff182a3e6c7257142fe2e84a6752ecd5acf64', data=json.dumps({Qfilename: go_back}), headers={'Content-Type': 'application/json; charset=utf8'})
    if r.json()['code'] == '200 ok':
        # clear Q
        os.remove("./queue/{}.pkl".format(Qfilename))
        return 0
    else:
        return 1


if __name__ == '__main__':
    Qfilename = sys.argv[-1]
    if len(sys.argv) != 2:
        Qfilename = input("Please give Qcode")



    main(Qfilename)
