from flask import Flask, url_for, request, abort, jsonify
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
import subprocess
from threading import Thread
import sys

import smtplib
from email.mime.text import MIMEText

_ver_ = "<Dispatch_Server_version: 1.211.1906.1304> "
debugging = False

if not os.path.isdir("./logs"):
    os.mkdir("./logs")
if not os.path.isdir("./queue"):
    os.mkdir("./queue")

def get_file_list(root, ftype = ".csv"):
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

def creation_date(path_to_file): # get the file creation_date
    stat = os.stat(path_to_file)
    try:
        return stat.st_birthtime
    except AttributeError:
        return stat.st_mtime


class DataBase:
    def __init__(self, host, user, pwd, port, database):
        print("Initial DB object")
        self.host = host
        self.user = user
        self.pwd = pwd
        self.port = port
        self.database = database
        self.connection = pymysql.connect(host=self.host, user=self.user, passwd=self.pwd, port=self.port, database=self.database, charset='utf8mb4', use_unicode=True)
        self.connection.autocommit(True)
        self.pointer = self.connection.cursor()

    def check_connect(self):
        self.connection.ping(reconnect=True)
        self.pointer = self.connection.cursor()
        return

    def close_db(self):
        self.connection.close()
        self.pointer.close()
        return

    def record_user(self, data):
        sql = "INSERT INTO `user`(`UUID`, `GooID`, `status`) VALUES (%s,%s,%s)"
        data2db = (data['uuid_true'], data['uuid'], data['userStatus'])

        try:
            self.check_connect()
            self.pointer.execute(sql, data2db)
            self.connection.commit()
            return 0
        except pymysql.err.IntegrityError:
            # stored
            # print(x)
            self.connection.rollback()
            self.connection.commit()
            return 0

        except Exception as e:
            self.connection.rollback()
            self.connection.commit()

            with open("./logs/record_user_error.log", 'a+') as f:
                f.write(_ver_+'SQL: {}\nERROR: {}\n\n\n'.format(sql, str(e)))

            return 1

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
                with open("./logs/query_error.log", 'a+') as f:
                    f.write(_ver_+"SQL: {}\nError: {}\n\n".format(sql, str(e)))

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
                    f.write(_ver_+"SQL: {}\nError: {}\n\n".format(sql, str(e)))



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
                    f.write(_ver_+"SQL: {}\nError: {}\n\n".format(sql, str(e)))

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
                    f.write(_ver_+"SQL: {}\nError: {}\n\n".format(sql, str(e)))

        return rows

class Report:
    def __init__(self, DB):
        print("Initial RP object")

        self.data = {}
        ''' self.data = {
            data['true_uuid'] : {
                    'updateTime': # timeStamp(),
                    '<page_name>': True / False (快取成功)
                },
                {}, ...
            }
        '''
        self.db = DB
        self.scan_cache()

    def addUser(self, uid):
        self.data.update({uid: {'updateTime': 0.0,} })
        if not os.path.isdir("./cache"):
            os.mkdir("./cache")
        if not os.path.isdir("./cache/{}".format(uid)):
            os.mkdir("./cache/{}".format(uid))

    def delUser(self, uid):
        try:
            del self.data[uid]
        except:
            pass
        finally:
            rmt("./cache/{}".format(uid), ignore_errors=True)

    def pg_overall(self, uid, nodata):
        if not os.path.isdir("./cache/{}/overall".format(uid)):
            os.mkdir("./cache/{}/overall".format(uid))

        # DomainTimes-areaChart Start
        if not nodata:
            sql = "SELECT `domain`, DATE_FORMAT(`visit_time`, '%Y-%m-%d') dt, COUNT(`domain`) cnt FROM `history` WHERE `UUID`='{}' GROUP BY `domain`, DATE_FORMAT(`visit_time`, '%Y-%m-%d') ORDER BY DATE_FORMAT(`visit_time`, '%Y-%m-%d'), COUNT(`domain`) DESC;".format(uid)
            data = self.db.query(sql)

            to_client = {'dates':[], 'datasets': [], }
            total_visit = 0
            for x in data:
                if x[0] not in to_client['datasets']:
                    to_client.update({x[0]: {'total':0, 'data': []}})
                    to_client['datasets'].append(x[0])

            for x in data:
                if x[1] not in to_client['dates']:
                    now_dt_cnt = len(to_client['dates'])
                    if now_dt_cnt > 0:
                        for y in to_client['datasets']:
                            if len(to_client[y]['data']) != now_dt_cnt:
                                to_client[y]['data'].append(0)
                    to_client['dates'].append(x[1])
                total_visit += x[2]
                to_client[x[0]]['total'] += x[2]
                to_client[x[0]]['data'].append(x[2])

            now_dt_cnt = len(to_client['dates'])
            for y in to_client['datasets']:
                if len(to_client[y]['data']) != now_dt_cnt:
                    to_client[y]['data'].append(0)

            with open("./cache/{}/overall/DomainTimes-areaChart.pkl".format(uid), mode='wb') as f:
                pickle.dump(to_client, f)
        else:
            with open("./cache/{}/overall/DomainTimes-areaChart.pkl".format(uid), mode='wb') as f:
                pickle.dump({'noEnoughData': 1}, f)

        # DomainTimes-areaChart End

        # CateTimes-areaChart Start
        if not nodata:
            sql = "SELECT cate, DATE_FORMAT(`visit_time`, '%Y-%m-%d') dt, COUNT(dc.cate) cnt FROM history h, domain_cate dc WHERE h.domain = dc.domain AND h.UUID='{}' GROUP BY DATE_FORMAT(h.visit_time, '%Y-%m-%d'), dc.cate ORDER BY DATE_FORMAT(h.visit_time, '%Y-%m-%d'), COUNT(dc.cate) DESC;".format(uid)
            data = self.db.query(sql)

            to_client = {'dates':[], 'datasets': [], }
            total_visit = 0
            for x in data:
                if x[0] not in to_client['datasets']:
                    to_client.update({x[0]: {'total':0, 'data': []}})
                    to_client['datasets'].append(x[0])

            for x in data:
                if x[1] not in to_client['dates']:
                    now_dt_cnt = len(to_client['dates'])
                    if now_dt_cnt > 0:
                        for y in to_client['datasets']:
                            if len(to_client[y]['data']) != now_dt_cnt:
                                to_client[y]['data'].append(0)
                    to_client['dates'].append(x[1])
                total_visit += x[2]
                to_client[x[0]]['total'] += x[2]
                to_client[x[0]]['data'].append(x[2])

            now_dt_cnt = len(to_client['dates'])
            for y in to_client['datasets']:
                if len(to_client[y]['data']) != now_dt_cnt:
                    to_client[y]['data'].append(0)

            with open("./cache/{}/overall/CateTimes-areaChart.pkl".format(uid), mode='wb') as f:
                pickle.dump(to_client, f)
        else:
            with open("./cache/{}/overall/CateTimes-areaChart.pkl".format(uid), mode='wb') as f:
                pickle.dump({'noEnoughData': 1}, f)

        # CateTimes-areaChart End

        # Weekday-Cate-stackedBarChart Start
        if not nodata:
            sql = "SELECT  dcj.cate, DATE_FORMAT(dcj.dt, '%W') wd, AVG(dcj.cnt) cnt_avg FROM (SELECT DATE_FORMAT(`visit_time`, '%Y-%m-%d') dt, cate,COUNT(dc.cate) cnt FROM history h, domain_cate dc WHERE h.domain = dc.domain AND h.UUID='{}' GROUP BY DATE_FORMAT(h.visit_time, '%Y-%m-%d'), dc.cate)  dcj GROUP BY DATE_FORMAT(dcj.dt, '%W'), dcj.cate ORDER BY DATE_FORMAT(dcj.dt, '%w'), cnt_avg DESC".format(uid)
            data = self.db.query(sql)
            if type(data) == 'NoneType':
                data = self.db.query(sql)

            sql = "SELECT MIN(DATE_FORMAT(`visit_time`, '%Y-%m')) dt_min, MAX(DATE_FORMAT(`visit_time`, '%Y-%m')) dt_max FROM history WHERE `UUID`='{}';".format(uid)
            dateInterval = self.db.query(sql)[0]

            to_client = {'dates':[], 'datasets': [], }
            total_visit = 0
            for x in data:
                if x[0] not in to_client['datasets']:
                    to_client.update({x[0]: {'total':0, 'data': []}})
                    to_client['datasets'].append(x[0])

            for x in data:
                if x[1] not in to_client['dates']:
                    now_dt_cnt = len(to_client['dates'])
                    if now_dt_cnt > 0:
                        for y in to_client['datasets']:
                            if len(to_client[y]['data']) != now_dt_cnt:
                                to_client[y]['data'].append(0)
                    to_client['dates'].append(x[1])
                total_visit += float(x[2])
                to_client[x[0]]['total'] += float(x[2])
                to_client[x[0]]['data'].append(float(x[2]))

            now_dt_cnt = len(to_client['dates'])
            for y in to_client['datasets']:
                if len(to_client[y]['data']) != now_dt_cnt:
                    to_client[y]['data'].append(0.0)

            to_client_true = {'avg_per_day': int(total_visit / len(to_client['dates']) / len(to_client['datasets'])), 'dates' : to_client['dates'].copy(), 'datasets': ['Others'], 'Others': {'total': 0, 'cnt': 0,'data': np.array([0 for i in range(len(to_client['dates']))], dtype='float')}, 'startDate': dateInterval[0], 'endDate': dateInterval[1] }
            limit = 10 if len(to_client["datasets"]) > 10 else len(to_client["datasets"])
            for domain in sorted(to_client["datasets"], key=lambda x:to_client[x]['total'], reverse=True)[:limit]:
                to_client_true[domain] = to_client[domain].copy()
                to_client_true['datasets'].append(domain)

            for domain in [x for x in to_client['datasets'] if x not in to_client_true['datasets']]:
                try:
                    to_client_true['Others']['cnt'] += 1
                    to_client_true['Others']['total'] += to_client[domain]['total']
                    to_client_true['Others']['data'] += np.array(to_client[domain]['data'])
                except Exception as e:
                    print(domain, to_client[domain]['data'], str(e))
            to_client_true['Others']['data'] = list(to_client_true['Others']['data'])
            for i_x, x in enumerate(to_client_true['Others']['data']):
                to_client_true['Others']['data'][i_x] = float(x)

            to_client_true["datasets"] = sorted(to_client_true["datasets"], key=lambda x:to_client_true[x]['total'], reverse=True)
            with open("./cache/{}/overall/Weekday-Cate-stackedBarChart.pkl".format(uid), mode='wb') as f:
                pickle.dump(to_client_true, f)
        else:
            with open("./cache/{}/overall/Weekday-Cate-stackedBarChart.pkl".format(uid), mode='wb') as f:
                pickle.dump({'noEnoughData': 1}, f)
        # Weekday-Cate-stackedBarChart End

        self.data[uid].update({'overall': True})
        return

    def makePages(self, uid, nodata = False):

        for i, pg in enumerate([self.pg_overall]):
            # print("Page-{} is making".format(i+1))
            pg(uid, nodata)
            # print("Page-{} is done".format(i+1))

    def check_cache_exist(self, uid):
        if os.path.isdir("./cache"):
            if os.path.isdir("./cache/{}".format(uid)):
                paths, tags = get_file_list("./cache/{}".format(uid), ".pkl")
                exist = True
                nowTime = timeStamp()
                for i_p, p in enumerate(paths):
                    if nowTime - creation_date(p) > 3600:
                        exist = False
                        break
                if len(paths) == 0:
                    exist = False

                if exist:
                    self.data.update({uid: {'updateTime': creation_date(paths[0]),} })
                    pgs = set([x.split('/')[3] for x in paths])
                    for p in pgs:
                        self.data[uid].update({p: True})

                return exist
            else:
                return False
        else:
            return False

    def check_nodata(self, uid):
        sql = "SELECT COUNT(DISTINCT(DATE_FORMAT(`visit_time`, '%Y-%m-%d'))) cnt FROM `history` WHERE `UUID`='{}';".format(uid)
        data_ = self.db.query(sql)
        if type(data_) == 'NoneType':
            data_ = self.db.query(sql)
        try:
            if data_[0][0] < 7:
                return True
            else:
                return False
        except Exception as e:
            with open("./logs/check_nodata_error.log", 'a+') as f:
                f.write(_ver_+"SQL: {}\nError: {}\n\n".format(sql, str(e)))

            return False

    def scan_cache(self):
        if os.path.isdir("./cache"):
            paths, tags = get_file_list("./cache", ".pkl")
            u = []
            for p in paths:
                u.append(p.split('/')[2])
            u = list(set(u))

            for uid in u:
                if not self.check_cache_exist(uid):
                    self.delUser(uid)
        else:
            os.mkdir("./cache")


    def update(self, uid):
        needUpdate = False
        nowTime = timeStamp()

        if not self.check_cache_exist(uid) or uid not in self.data:
            self.addUser(uid)
            needUpdate = True

        if not needUpdate and nowTime - self.data[uid]['updateTime'] >= 3600:
            needUpdate = True

        if needUpdate:
            self.data[uid]['updateTime'] = nowTime
            self.makePages(uid, self.check_nodata(uid))

        for u in self.data.keys():
            if nowTime - self.data[u]['updateTime'] >= 3600 * 24 * 7:
                self.delUser(u)

class DomainCate:
    def __init__(self, DB):
        print("Initial DC object")

        self.db = DB
        self.filterVer = self.getFilterVer()
        self.unknownList = []
        self.updateUnknown()

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

                self.updateUnknown()
        else:
            with open('./logs/error_htmls.log', mode='a+', buffering=-1, encoding=None, errors=None, newline=None, closefd=True) as f:
                f.write(html+'\n\n\n')
        return

class POINT:
    def __init__(self, DB):
        self.db = DB
        # self.update_points()

    def needUpdate(self):
        x = self.db.query('SELECT UNIX_TIMESTAMP(DATE_FORMAT(NOW() - INTERVAL (5.5 * 60) MINUTE, "%Y-%m-%d 5:30:00")) -  MIN(UNIX_TIMESTAMP(DATE_FORMAT(p.update_dt - INTERVAL (5.5 * 60) MINUTE, "%Y-%m-%d 5:30:00"))) >= (86400 - 3600) FROM `point` p;')
        if type(x[0][0]) == 'NoneType' or str(x[0][0]) == "1":
            return True
        else:
            return False

    def cleanQ(self):
        paths, tags = get_file_list("./queue", ftype = ".pkl")
        for p, t in zip(paths, tags):
            if timeStamp() - creation_date(p) > 600:
                def dispatching(data):
                    try:
                        subprocess.run(data['cmd'].split(' '))
                    except subprocess.CalledProcessError:
                        print(subprocess.CalledProcessError)
                    except Exception as e:
                        print(str(e))

                thread = Thread(target=dispatching, kwargs={'data': {'cmd':"python3 procQ.py {}".format(t)}})
                thread.start()

    def update_points(self):
        if self.needUpdate():
            data_points = self.db.query(self.db.query('SELECT SQL_str FROM SQLs WHERE detail = "get_data_points";')[0][0])
            day_cnt = self.db.query(self.db.query('SELECT SQL_str FROM SQLs WHERE detail = "get_user_exist_days";')[0][0])

            data = list(data_points)
            for i, x in enumerate(data):
                data[i] = list(x)

            df_data_points = pd.DataFrame(data, columns=['uid', 'dt', 'h_cnt', 'f_cnt', 'h_pt', 'f_pt', 'total']).fillna(0)
            df_data_pointsEQ0 = df_data_points[df_data_points.total == 0].reset_index(drop=True) #  = df_data_points[df_data_points.total == 0]['h_pt'] + df_data_points[df_data_points.total == 0]['f_pt']
            df_data_pointsLT0 = df_data_points[df_data_points.total > 0].reset_index(drop=True)
            df_data_pointsEQ0['total'] = df_data_pointsEQ0.h_pt + df_data_pointsEQ0.f_pt
            df_data_points = pd.concat([df_data_pointsLT0, df_data_pointsEQ0], axis=0).reset_index(drop=True)

            data = list(day_cnt)
            for i, x in enumerate(data):
                data[i] = list(x)

            df_day_cnt = pd.DataFrame(data, columns=['uid', 'days'])

            sql = "INSERT INTO `point_hist`(`UUID`, `itemName`, `points`) VALUES ('{}','{}',{})"
            back2db = []
            for uid in df_day_cnt.uid.unique():
                for tmp in df_data_points[df_data_points.uid == uid].values:
                    back2db.append(sql.format(uid, '{} 貢獻積分'.format(tmp[1]), float(tmp[-1])))
                    pt = 0
                    pt += ((1 if tmp[2] > 0 else 0) + (1 if tmp[3] > 0 else 0))
                    back2db.append(sql.format(uid, '{} 簽到積分'.format(tmp[1]), pt))

                weeks = int(df_day_cnt[df_day_cnt.uid == uid]['days'].values[0]) // 7
                if weeks > 0:
                    for w in range(min(4, weeks)):
                        back2db.append(sql.format(uid, '簽到 {}日積分'.format(7 * (w + 1)), 11))
            for s in back2db:
                self.db.update(s)

            total_points = self.db.query(self.db.query('SELECT SQL_str FROM SQLs WHERE detail = "calc_total_used_points";')[0][0])
            data = list(total_points)
            for i, x in enumerate(data):
                data[i] = list(x)
            df_total_points = pd.DataFrame(data, columns=['uid', 'total', 'used']).fillna(0)

            sql = "INSERT INTO `point`(`UUID`, `Total`, `Used`) VALUES ('{}', {}, {})"
            self.db.update("DELETE FROM `point`")
            for s in df_total_points.values:
                self.db.update(sql.format(*list(s)))

            self.cleanQ()
        return 0




db = DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME')
rpt = Report(DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME'))
dc = DomainCate(DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME'))

print("{} Online Classifier DB version: {}".format(_ver_, dc.filterVer))

app = Flask(__name__)

@app.route('/reward=1f38b516050cf8de54716c730f44d38e9880ede106a119e0a5bd32257c6500990976f07001bb11ddc3d39fa2219611f1aed0023fc8cb10d41af6183d0b74732d', methods=['GET', 'POST'])
def reward_worker():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            sql= {
                "points": "SELECT total, -1 * used, (total + used ) remain FROM `point` WHERE UUID = '{}';",
                "info": "SELECT DATE_FORMAT(dt, '%Y/%m/%d'), itemName, points FROM `point_hist` WHERE UUID = '{}' ORDER BY dt DESC, points DESC;",
                "items": "SELECT pi.itemName, pi.points, IFNULL(pi.exchange_limit - r.purchased, pi.exchange_limit) FROM `point_items` pi LEFT JOIN (SELECT r.itemID, count(r.itemID) purchased FROM `reward` r WHERE  `UUID` = '{}' GROUP BY r.itemID) r ON pi.itemID = r.itemID LEFT JOIN (SELECT r.itemID, count(r.itemID) purchased FROM `reward` r GROUP BY r.itemID) r1 ON  pi.itemID = r1.itemID WHERE IFNULL(pi.exchange_limit - r.purchased, pi.exchange_limit) > 0 AND IFNULL(pi.total - r1.purchased,pi.total) > 0;",
                "profile": "SELECT email, phone FROM `user` u WHERE UUID = '{}';",
                "purchased": "SELECT pi.itemName, (r.done - r.Accepted + r.done) stat, r.itemContent FROM `reward` r, `point_items` pi WHERE r.itemID = pi.itemID AND r.UUID = '{}';"
            }
            # print(sql[data['type']])
            if sql[data['type']].find("{}") > -1:
                resp = db.query(sql[data['type']].format(data['uuid_true']))
            else:
                resp = db.query(sql[data['type']])

            return jsonify(resp)
        else:
            return abort(401)
    else:
        return abort(401)

@app.route('/update_points-eed7e276c6ba76f0f6b39c64600001e1bc19246a2ef877deb3591ff7f839d90e1d14b39ff5603b1cd184537ae7978f34bcc8eb6f3bc1330cdc26d85490f23332', methods=['GET', 'POST'])
def update_points():
    if request.method == 'POST' and 'cache-server' in request.headers:
        def go(data):
            try:
                subprocess.run(data['cmd'].split(' '))
            except subprocess.CalledProcessError:
                print(subprocess.CalledProcessError)
            except Exception as e:
                print(str(e))

        thread = Thread(target=go, kwargs={'data': {'cmd':"python3 point_calc.py"}})
        thread.start()
        # pt.update_points()
        return jsonify({'code': "200 ok"})
    else:
        return abort(401)

@app.route('/update_rpt-7463810f0986b9cac41176259db5013d1ae1ba69913fe10093006f6658b32d743da8c1ea735500e85ffc202614549f628e96913e196390430b3bcbac86fbf374', methods=['GET', 'POST'])
def update_rpt():
    if request.method == 'POST' and 'cache-server' in request.headers:
        data = request.get_json()
        m = hs.sha3_512()
        m.update(data['uuid'].encode('utf8'))
        data.update({"uuid_true":m.hexdigest()})
        rpt.update(data["uuid_true"])
        return jsonify({'code': "200 ok"})
    else:
        return abort(401)

@app.route('/UpdateUserContact=f27faa4aa222e23cd54f9e009bec57f1464a14d6cdb0f74036bbdaae7993f7e3a5cb6c49f9de6893853e4813b723177a9db1d671a643c8c0e809edd1fba1f921', methods=['GET', 'POST'])
def update_user_contact():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            sql = "UPDATE `user` SET `{}`='{}' WHERE `UUID`='{}'".format(data['type'].lower(), data['new'], data['uuid_true'])
            # print(sql)
            r = db.update(sql)
            return jsonify({"code":r})

        else:
            return abort(401)
    else:
        return abort(401)

@app.route('/purchase=72f86c2264214782aced4754738066c0a0598fa092296039be104852339310d34fa2bc4cb93be43da7f63c76c9dbc7729d13b4e4bad8941e4138700f50e0b581', methods=['GET', 'POST'])
def purchase():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            m = hs.sha3_512()
            m.update(data['item']['item'].encode('utf8'))
            m.update(str(data['item']['points']).encode('utf8'))
            data.update({"itemID":m.hexdigest()})


            # sql = "SELECT count(r.itemID) < pi.exchange_limit AND (p.total + p.used) > pi.points  FROM `point_items` pi, `reward` r, `point` p WHERE p.UUID = r.UUID AND r.UUID='{}' AND r.itemID = '{}' AND pi.itemID = r.itemID;".format(data['uuid_true'], data['itemID'])
            sql = "SELECT  (p.Total + p.Used) > pi.points AND usr.amo < pi.exchange_limit AND al.amo < pi.total FROM `point_items` pi, `point` p LEFT JOIN `reward` r ON p.UUID = r.UUID, (SELECT count(*) amo FROM `point` p INNER JOIN `reward` r ON p.UUID = r.UUID WHERE r.itemID = '{1}' AND p.UUID='{0}') usr, (SELECT count(*) amo FROM `point` p INNER JOIN `reward` r ON p.UUID = r.UUID WHERE r.itemID = '{1}') al WHERE p.UUID='{0}' AND pi.itemID = '{1}';".format(data['uuid_true'], data['itemID'])
            print(sql)
            r = db.query(sql)

            go_back = {'msg': ''}

            try:
                if r[0][0] > 0:
                    # 可以買
                    code = []
                    sql = "SELECT `itemName`, `points`, `needAccept`, DATE_FORMAT(NOW(), '%H點%i分%s秒'), DATE_FORMAT(NOW(), '%Y%m%d%H%i%s') FROM `point_items` WHERE `itemID` = '{}';".format(data['itemID'])
                    r = db.query(sql)

                    sql2hist = "INSERT INTO `point_hist`(`UUID`, `itemName`, `points`) VALUES ('{}','{}',{});".format(data['uuid_true'], "{} 兌換「{}」".format(r[0][3], r[0][0]), r[0][1] * -1)
                    x = db.update(sql2hist)
                    code.append(x)

                    sql2reward = "INSERT INTO `reward`(`UUID`, `itemID`, `itemContent`, `itemType`) VALUES ('{}','{}','{}',{})".format(data['uuid_true'], data['itemID'], "{}[{}]".format(r[0][0], r[0][4]), r[0][2])
                    x = db.update(sql2reward)
                    code.append(x)

                    sql = "SELECT `used` FROM `point` WHERE `UUID` = '{}'; ".format(data['uuid_true'])
                    r2 = db.query(sql)
                    sql2point = "UPDATE `point` SET `Used`={} WHERE `UUID` = '{}';".format((r2[0][0] - r[0][1]), data['uuid_true'])
                    x = db.update(sql2point)
                    code.append(x)

                    sql = "SELECT `email`, `phone` FROM `user` WHERE `UUID` = '{}';".format(data['uuid_true'])
                    u = db.query(sql)

                    def purchasedDone2user(to_list, data):
                        mail_user = 'ncuwtp01@gmail.com'
                        mail_password = 'ncucsiewtp01'
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

                    def purchasedDone2mgr(to_list, data):
                        mail_user = 'ncuwtp01@gmail.com'
                        mail_password = 'ncucsiewtp01'
                        me="資料分析科學實驗室"+"<"+mail_user+">"

                        mail_html = ""
                        with open("./MailTemplate/purchasedDone2mgr.html") as fin:
                            for l in fin.readlines():
                                mail_html += l

                        msg=MIMEText(mail_html.format(*data), "html", "utf-8")
                        msg['Subject']="[擴充功能-網路使用報告] 審查通知"
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
                    if r[0][2] == 1:
                        thread = Thread(target=purchasedDone2user, kwargs={'to_list': [u[0][0]], 'data': [r[0][0], r[0][1]]})
                        thread.start()
                        thread = Thread(target=purchasedDone2mgr, kwargs={'to_list': ['ncuwtp01@gmail.com'], 'data': [data['uuid_true'], r[0][4], r[0][0]]})
                        thread.start()

                    go_back['msg'] = "兌換成功！"
                    go_back.update({'code': code})

                else:
                    go_back['msg'] = "兌換失敗！"
            except:
                go_back['msg'] = "兌換失敗！"

            return jsonify(go_back)

        else:
            return abort(401)
    else:
        return abort(401)

@app.route('/last_stage=10131ca2b271789c999eeb2e3b2badd02cc31bb44db4386b2b2275d02251abed635a803424d449d9507600d5660183c9dd051af561223087855942e247eba1b2', methods=['GET', 'POST'])
def last_stage():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            r = db.query("SELECT u.GooID, u.email, u.phone, IFNULL(u.birth, -1), IFNULL(u.gender, -1) FROM `user` u WHERE u.UUID = '{}';".format(data['uuid_true']))
            r2 = db.query("SELECT itemContent FROM `reward` r WHERE r.UUID = '{}' AND r.itemContent LIKE '%{}%';".format(data['uuid_true'], data['dtstamp']))
            dty = db.query("SELECT DATE_FORMAT(NOW() - INTERVAL 16 YEAR, '%Y/%m/%d'), DATE_FORMAT(NOW() - INTERVAL 66 YEAR, '%Y'), DATE_FORMAT(NOW() - INTERVAL 16 YEAR, '%Y');")

            if len(r) > 0 and len(r2) > 0:
                if str(r[0][-2]) == '-1' or str(r[0][-1]) == '-1':
                    dt_form = lambda x : x[:4]+"年"+x[4:6]+"月"+x[6:8]+"日"+x[8:10]+"時"+x[10:12]+"分"+x[12:14]+"秒"
                    pack = {
                        'dt': dt_form(data['dtstamp']),
                        'item':r2[0][0].split('[')[0],
                        'email' : r[0][1],
                        'phone' : r[0][2],
                        'uuid' : data['uuid'],
                        'dtstamp': data['dtstamp'],
                        'init': "{'format': 'yyyy-mm-dd', 'i18n':{'weekdaysShort': ['星期日<br>', '星期一<br>', '星期二<br>','星期三<br>','星期四<br>','星期五<br>','星期六<br>'], 'months':['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'], 'monthsShort':['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']}, 'showMonthAfterYear': true, 'yearRange': ["+str(dty[0][1])+", "+str(dty[0][2])+"], 'maxDate': new Date('_!DATE!_') }".replace("_!DATE!_", dty[0][0]),
                        'reg': "/^09\d{8}$/"
                    }

                    page_html = ""
                    with open("./last_stage.html") as fin:
                        for l in fin.readlines():
                            page_html += l.format(**pack)

                    # page_html = page_html.format(**pack)
                    return jsonify({"html": page_html})
                else:
                    return jsonify({"html": "You have finished!!"})
            else:
                return jsonify({"html": "No USER DATA FOUND"})
        else:
            return abort(401)
    else:
        return abort(401)

@app.route('/last_stage_done=ca9f43a975246b98c6a41e175241b40f2c8fa021180ee37a1900f97ec8e190b1019f865387d2b769b76d6c858daf9c7c4347ebff52d9be06547f65a46258377e', methods=['GET', 'POST'])
def last_stage_done():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            sql = "UPDATE `reward` set `Accepted` = 1 WHERE `itemContent` LIKE '{item}%' and `itemContent` LIKE '%{dtstamp}%' and `UUID` = '{uuid_true}';".format(**data)
            r = db.update(sql)

            dt_form = lambda x : x[:4]+"年"+x[4:6]+"月"+x[6:8]+"日"+x[8:10]+"時"+x[10:12]+"分"+x[12:14]+"秒"
            pack = {
                'dt': dt_form(data['dtstamp']),
                'item': data['item'],
            }
            pack2 = {
                'uuid_true': data['uuid_true'],
                'dt': data['dtstamp'],
                'item': data['item'],
                'SQL': "SELECT u.email Email, u.phone Mobile FROM `reward` r, `user` u WHERE u.UUID = r.UUID AND r.itemContent LIKE '{item}%' AND r.itemContent LIKE '%{dtstamp}%' AND u.UUID = '{uuid_true}';".format(**data)
            }

            v = db.query(pack2['SQL'])

            def waitCoupon2user(to_list, data):
                mail_user = 'ncuwtp01@gmail.com'
                mail_password = 'ncucsiewtp01'
                me="資料分析科學實驗室"+"<"+mail_user+">"

                mail_html = ""
                with open("./MailTemplate/waitCoupon2user.html") as fin:
                    for l in fin.readlines():
                        mail_html += l

                msg=MIMEText(mail_html.format(**data), "html", "utf-8")
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

            def waitCoupon2mgr(to_list, data):
                mail_user = 'ncuwtp01@gmail.com'
                mail_password = 'ncucsiewtp01'
                me="資料分析科學實驗室"+"<"+mail_user+">"

                mail_html = ""
                with open("./MailTemplate/waitCoupon2mgr.html") as fin:
                    for l in fin.readlines():
                        mail_html += l

                msg=MIMEText(mail_html.format(**data), "html", "utf-8")
                msg['Subject']="[擴充功能-網路使用報告] 序號需要發送！"
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


            if r == 1 and len(v) == 1:
                thread = Thread(target=waitCoupon2user, kwargs={'to_list': [v[0][0]], 'data': pack})
                thread.start()
                thread = Thread(target=waitCoupon2mgr, kwargs={'to_list': ['ncuwtp01@gmail.com'], 'data': pack2})
                thread.start()

            return jsonify({'code': r})
        else:
            return abort(401)
    else:
        return abort(401)
@app.route('/report=961b5d2dd2a5b2618d9f3ba10ae142d1cf1a342faedf3e748ce0967dab120be12be2d29410e591fadf06f24d4801f201f0250c174b6c77d3ed3397833fc93843/<page_name>', methods=['GET', 'POST'])
def report_dispatcher(page_name):
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            def rptUpdate(data):
                cache_server = "https://ncu-dart-chrome-ext-cache-beta.herokuapp.com" if data['debugging'] else "https://ncu-dart-chrome-ext-cache.herokuapp.com"
                try:
                    r = requests.post(url=cache_server+'/update_rpt-7463810f0986b9cac41176259db5013d1ae1ba69913fe10093006f6658b32d743da8c1ea735500e85ffc202614549f628e96913e196390430b3bcbac86fbf374', data=json.dumps({'uuid': data['uuid']}), headers={'Content-Type': 'application/json; charset=utf8'})
                    if r.json()['code'] != '200 ok':
                        with open("./logs/rpt_update_error.log", 'a+') as f:
                            f.write("Respose: {}\n\n".format(r.json()))
                except Exception as e:
                    with open("./logs/rpt_update_error.log", 'a+') as f:
                        f.write("Respose: {}\n\n".format(str(e)))
                finally:
                    return 0

            thread = Thread(target=rptUpdate, kwargs={'data': {'debugging':debugging, 'uuid': data['uuid']}})

            rpt.check_cache_exist(data["uuid_true"])

            if data["uuid_true"] in rpt.data:
                paths, tags = get_file_list("./cache/{}/{}/".format(data["uuid_true"], page_name), ftype = ".pkl")
                output = {}
                for p, t in zip(paths, tags):
                    with open(p, 'rb') as f:
                        output.update({"{}-{}".format(page_name, t): pickle.load(f)})

                try:
                    thread.start()
                except:
                    pass
                finally:
                    return jsonify(output)

            else:
                try:
                    thread.start()
                except:
                    pass
                finally:
                    return jsonify({'err': True, 'desc': 'Data not avaliable.'})

        else:
            return abort(401)
    else:
        return abort(401)

@app.route("/classify=6fde1668684d393896f65be801752a995285affbade14ffa39ae054527e7fc1b603870e2b4ad8515541e8f60e143ac8ed33d8fe550d3737e7e8cd30d050ba365/", methods=['GET', 'POST'])
def classify():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            # data['uuid_true'], data['raw'], data['finished']
            # print(_ver_+" Get Classified Data from UUID: " + data['uuid_true'])
            dc.storeClassified(data['raw'])

            go_back = {"stat": "200 ok"}
            if data['finished'] == 1:
                to_do = dc.getUserNullCate(data['uuid_true'])
                if len(to_do) == 0 and len(dc.unknownList) > 0:
                    go_back.update({"ToDo": dc.getUNKlist()})
                else:
                    go_back.update({"ToDo": to_do})

            return jsonify(go_back)
        else:
            return abort(401)
    else:
        return abort(401)

@app.route("/gacha=031cbdd62d400897d789fa895374d57fc72df6df42e32763c78bde3f6f4d90c37a70dca2b196c6a77e338c8dcbbab5eb81c6bb637b8abeec544a8c47f06d41b2/", methods=['GET', 'POST'])
def gacha():
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()
            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})

            # data['uuid_true'], data['raw'], data['finished']
            # print(_ver_+" Get Classified Data from UUID: " + data['uuid_true'])

            this_user = db.query("SELECT fake_email, seeds, prob FROM `gacha_user` WHERE UUID = '{}'".format(data['uuid_true']))


            x = db.query("SELECT fake_email, seeds, prob FROM `gacha_user` ORDER BY seeds DESC")
            df = pd.DataFrame([list(i) for i in x])
            statis = [list(i) for i in df.describe().reset_index().values]
            go_back = {
                'this_user': this_user,
                'info': x,
                'stat': statis
            }
            return jsonify(go_back)
        else:
            return abort(401)
    else:
        return abort(401)

@app.route("/worker=97e0d53e0fbd08b636bd18f1296b46bbeaf0955f7a212d3da6c22aba8e41a5b842778bfd804200b5d38990a5afaaa7c99add23c26f9b9ec9d7afb0458e7a4a4d/", methods=['GET', 'POST'])
def dispatch():
    t1 = str(timeStamp())
    if request.method == 'POST' and 'cache-server' in request.headers:
        if request.headers['cache-server'] == '34d752c00942a961f94610225aa10a94c0545daee0e28eedb16d7b31256dc09a191a1030440d1e82e7222053e6701c6c7b55e1ef68e22af346179dfde31376c6':
            data = request.get_json()

            m = hs.sha3_512()
            m.update(data['uuid'].encode('utf8'))
            data.update({"uuid_true":m.hexdigest()})
            data['updateCodes'] = sorted(data['updateCodes'])
            print(_ver_+"[INFO] UUID: {}, Tasks: {}, <Client_version: {}>".format(data['uuid_true'], data['updateCodes'], data['version']))

            # Store USER
            stat = db.record_user(data)
            t2 = str(timeStamp())
            if stat == 1:
                print("Store user ERROR!")
            else:
                while 1 in data['updateCodes']:
                    try:
                        data['updateCodes'].remove(1)
                    except:
                        break


            # zip the raw to files
            m = hs.sha3_512()
            m.update(data['uuid_true'].encode('utf8'))
            m.update(t1.encode('utf8'))
            m.update(t2.encode('utf8'))
            m.update(json.dumps(data).encode('utf_8'))
            Qfilename = m.hexdigest()
            if not os.path.isdir("./queue"):
                os.mkdir("./queue")

            with open("./queue/{}.pkl".format(Qfilename), mode='wb') as f:
                pickle.dump(data, f)

            # make the cmd
            # cmd = "python3 procQ.py {}".format(Qfilename)

            # if 2 in data['updateCodes'] or 5 in data['updateCodes']:
            #     dc.updateUnknown()
            # backend_url = "http://140.115.59.250:33333" if debugging else "http://140.115.59.250:9999"
            # r = requests.post(url=backend_url+'/3cacbe4952094024a39ec2d55fab74c0f582bf73e88a606b5312724166abe1b6866dd2f30b6923d2db69d6f22c5f5f134a67ddf181fef20a812bad2f74d9cff0', data=json.dumps({'cmd': cmd, 'uuid_true':data['uuid_true']}), headers={'Content-Type': 'application/json; charset=utf8'})

            # def dispatching(data):
            #     # dispatch the work
            #     try:
            #         subprocess.run(data['cmd'].split(' '))
            #     except subprocess.CalledProcessError:
            #         print(subprocess.CalledProcessError)
            #     except Exception as e:
            #         print(str(e))
            #
            # thread = Thread(target=dispatching, kwargs={'data': {'cmd':cmd}})
            # thread.start()

            go_back = {"code": Qfilename}
            return jsonify(go_back)

        else:
            return abort(401)
    else:
        return abort(401)

if __name__ == '__main__':
    app.debug = debugging
    # def go_scheduled():
    #     # dispatch the work
    #     try:
    #         subprocess.run("python3 cleanQ.py".split(' '))
    #     except subprocess.CalledProcessError:
    #         print(subprocess.CalledProcessError)
    #     except Exception as e:
    #         print(str(e))
    #
    # thread = Thread(target=go_scheduled)
    # thread.start()
    app.run(host='0.0.0.0')
    print("Initial Success!")
