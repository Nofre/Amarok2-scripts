# coding: UTF-8
import telnetlib
import time

import pynotify

try:
    import dbus
except:
    pynotify.init("LCDprocFE failed")
    n = pynotify.Notification("AmarokLCD", "can't load python-dbus", "dialog-warning")
    n.show()
    exit()

#Amarok conection
try:
    bus = dbus.SessionBus()
    player = bus.get_object('org.kde.amarok', '/Player')
except:
    pynotify.init("AmarokLCD failed")
    n = pynotify.Notification("AmarokLCD", "can't connect to Amarok", "dialog-warning")
    n.show()
    exit()

#LCDproc Server conection
try:
    client = telnetlib.Telnet("localhost", "13666")
    client.write("hello\n")
except:    
    pynotify.init("AmarokLCD failed")
    n = pynotify.Notification("AmarokLCD", "can't connect to LCDproc", "dialog-warning")
    n.show()
    exit()
    
#Create widgets
client.write("screen_add S1 \n")
client.write("screen_set S1 -heartbeat off\n")
client.write("widget_add S1 W1 scroller\n")
client.write("widget_add S1 W2 scroller\n")
client.write("widget_add S1 W3 scroller\n")
client.write("widget_add S1 W4 string\n")
client.write("widget_add S1 W5 string\n")
client.write("widget_add S1 W6 hbar\n")

cn = ["A", "A", "A", "A", "A", "E", "E", "E", "E", "I", "I", "I", "I", "D", "N", "O", "O", "O",
    "O", "x", "O", "U", "U", "U", "Y", "a", "a", "a", "a", "a", "c", "e", "e", "e", "e",
    "i", "i", "i", "i", "n", "o", "o", "o", "o", "o", "u", "u", "u", "AE", "ae", "a",
    "o", "u", "ss", "A", "O", "U"]


cu = ["À", "Á", "Â", "Ã", "Å", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï", "Ð", "Ñ", "Ò", "Ó", "Ô",
    "Õ", "×", "Ø", "Ù", "Ú", "Û", "Ý", "à", "á", "â", "ã", "å", "ç", "è", "é", "ê", "ë",
    "ì", "í", "î", "ï", "ñ", "ò", "ó", "ô", "õ", "ø", "ù", "ú", "û", "Æ", "æ", "ä",
    "ö", "ü", "ß", "Ä", "Ö", "Ü"]


while True:

    status = player.GetStatus()
    if status[0] == 2: #Stopped
        client.write("widget_set S1 W6 1 4 0\n")
        client.write("widget_set S1 W5 1 4 Stopped\n")

    elif status[0] == 1: #Paused
        client.write("widget_set S1 W5 2 4 Paused\n")
        client.write("widget_set S1 W6 1 4 0 ")

    elif status[0] == 0: #Playing
        try:
            info = player.GetMetadata()
            Title = str(info[dbus.String(u'title')])
            Artist = str(info[dbus.String(u'artist')])
            Album = str(info[dbus.String(u'album')])
            mtime = info[dbus.String(u'mtime')] / 1000

            title2 = Title
            artist2 = Artist
            album2 = Album
            mtime2 = mtime

        except:
            
            Title = title2
            Artist = artist2
            Album = album2
            mtime = mtime2


        pos = player.PositionGet() / 1000
        posm = str(pos / 60) #Position minutes
        poss = str(pos % 60) #Position seconds
        totm = str(mtime / 60) #Total minutes
        tots = str(mtime % 60) #Total seconds
        if int(totm) < 10: totm = totm.replace(totm, "0" + totm)
        if int(tots) < 10: tots = tots.replace(tots, "0" + tots)
        if int(posm) < 10: posm = posm.replace(posm, "0" + posm)
        if int(poss) < 10: poss = poss.replace(poss, "0" + poss)

        bar = pos * 40 / mtime

        for entry in cu:
            Title = Title.replace(entry,cn[cu.index(entry)])
            Artist = Artist.replace(entry, cn[cu.index(entry)])
            Album = Album.replace(entry,cn[cu.index(entry)])


        #Set widgets
        client.write("widget_set S1 W1 1 1 20 1 h 2 \"%s\"\n" % Title)
        client.write("widget_set S1 W2 1 2 20 1 h 2 \"%s\"\n" % Artist)
        client.write("widget_set S1 W3 1 3 20 1 h 2 \"%s\"\n" % Album)
        client.write("widget_set S1 W4 9 4 ]%s:%s/%s:%s\n" % (posm, poss, totm, tots))
        client.write("widget_set S1 W5 1 4 \"\"\n")    
        client.write("widget_set S1 W6 1 4 %i " % bar)

    time.sleep(1)