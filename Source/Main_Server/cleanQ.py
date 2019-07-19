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

from apscheduler.schedulers.background import BlockingScheduler
import pytz

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

working_threads = 8

def cleanQ():
    global working_threads

    paths, tags = get_file_list("./queue", ftype = ".pkl")
    t_list = []
    for p, t in zip(paths, tags):
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
        if len(t_list) == working_threads:
            print('Waiting for previous task.')
            for t in t_list:
                t.join()
            t_list = []
    for t in t_list:
        t.join()



timez = pytz.timezone('Asia/Taipei')
# scheduler = BackgroundScheduler()
# scheduler.add_job(func=cleanQ, trigger="interval", seconds=60, timezone=timez)
# scheduler.start()

if __name__ == '__main__':
    scheduler = BlockingScheduler()
    scheduler.add_job(func=cleanQ, trigger="interval", seconds=3, timezone=timez)

    print('Press Ctrl+{0} to exit'.format('Break' if os.name == 'nt' else 'C'))

    try:
        scheduler.start()  #采用的是阻塞的方式，只有一個線程專職做調度的任務
    except (KeyboardInterrupt, SystemExit):
        # Not strictly necessary if daemonic mode is enabled but should be done if possible
        scheduler.shutdown()
        print('Exit The Job!')
