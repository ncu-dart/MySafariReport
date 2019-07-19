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

class POINT:
    def __init__(self, DB):
        self.db = DB
        print("Init point object")
        self.update_points()

    def needUpdate(self):
        x = self.db.query('SELECT UNIX_TIMESTAMP(DATE_FORMAT(NOW() - INTERVAL (5.5 * 60) MINUTE, "%Y-%m-%d 5:30:00")) -  MIN(UNIX_TIMESTAMP(DATE_FORMAT(p.update_dt - INTERVAL (5.5 * 60) MINUTE, "%Y-%m-%d 5:30:00"))) >= (86400 - 3600) FROM `point` p;')
        if type(x[0][0]) == 'NoneType' or str(x[0][0]) == "1":
            return True
        else:
            return False

    def cleanQ(self):
        print("clean Queue!")
        paths, tags = get_file_list("./queue", ftype = ".pkl")
        t_list = []
        for p, t in zip(paths, tags):
            if timeStamp() - creation_date(p) > 600:
                print("Working on {}".format(t[:10]))
                def dispatching(data):
                    try:
                        subprocess.run(data['cmd'].split(' '))
                    except subprocess.CalledProcessError:
                        print(subprocess.CalledProcessError)
                    except Exception as e:
                        print(str(e))

                thread = Thread(target=dispatching, kwargs={'data': {'cmd':"python3 procQ.py {}".format(t)}})
                thread.start()
                t_list.append(thread)
                if len(t_list) == 8:
                    print('Waiting for previous task.')
                    for t in t_list:
                        t.join()
                    t_list = []
        for t in t_list:
            t.join()


    def update_points(self):
        self.cleanQ()
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

        return 0

try:
    with open('point_lock.lock', 'r') as fin:
        x = fin.readlines()
except:
    with open('point_lock.lock', 'w') as fout:
        fout.write('1\n')
    x = ['0', '']


if str(x[0]) == '0':
    try:
        pt = POINT(DataBase(host='DATABASE_IP', user='USER_NAME', pwd='PASSWORD', port=int('PORT_NUMBER'), database='DB_NAME'))
    except:
        pass
    finally:
        try:
            os.remove('./point_lock.lock')
        except:
            pass
else:
    print('working!')
