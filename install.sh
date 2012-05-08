#!/usr/bin/env bash

#Minecraft Server Setup script
#
#this is a quick and dirty environment installation script, only tested on debian yet, feel free to enhance it
# 
# 10.7.2011 escii -
#
# default ports: 25565 minecraft, 25564 nodeJS HTTP, 25563 nodeJS Telnet
#

function main() {
    echo -e "detecting your operationsystem\n"
    if(cat /proc/version | grep ubuntu); then
        #Ubuntu Linux
        echo -e "u r on Ubuntu? well apt is anyway already running. =p"
            apt-get remove nodejs
            apt-get install sun-java6-bin apache2 libapache2-mod-php5 git libssl0.9.8 isomd5sum
            runInstallTasks
    elif(cat /proc/version | grep debian); then
        #Debian Linux
        echo -e "u r on Debian? well apt is anyway already running. =p"
            apt-get remove nodejs
            apt-get install sun-java6-bin apache2 libapache2-mod-php5 git libssl0.9.8 isomd5sum
            runInstallTasks
    else
        echo -e "Can't detect your Operatingsystem, please make me smarter, thanks =p"
    fi
}   
 

function runInstallTasks() {
    installMinecraftServer
    installNodeJS
    installmineJS
    startAll

}

function installMinecraftServer() {
    echo -e "\n\ninstalling Minecraft Server\n"
    mkdir /opt/mcserver/
    cd /opt/mcserver/
    wget http://www.minecraft.net/download/minecraft_server.jar
    touch version.txt
    #write md5hash to doublecked if there is an update for the server available
    md5sum minecraft_server.jar > minecraft_server.jar.md5sum
    echo -e "\n\nMinecraft Server installed\n"
}

function installNodeJS () {
    echo -e "installing NodeJS"
    #Install Nodejs
    mkdir -p /opt/nodejs/src
    cd /opt/nodejs/src
    git clone --depth 1 git://github.com/joyent/node.git
    cd node
    git checkout v0.6.17
    export JOBS=2 # optional, sets number of parallel commands.
    mkdir ~/local
    ./configure --prefix=/opt/nodejs
    make
    make install
    #echo 'export PATH=$HOME/local/node/bin:$PATH' >> ~/.profile
    ln -s /opt/nodejs/bin/node /usr/bin/node
    ln -s /opt/nodejs/bin/node-waf /usr/bin/node-waf
    #source ~/.profile
    export PATH=$PATH:/opt/node/bin
    
    #install npm
    wget http://npmjs.org/install.sh
    chmod +x install.sh
    ./install.sh
    
    #create logs, user logic has to be implemented cuz of security
    touch /opt/mcserver/server.log
    touch /opt/mcserver/server.properties 
    touch /opt/mcserver/banned-players.txt 
    touch /opt/mcserver/banned-ips.txt 
    touch /opt/mcserver/ops.txt 
    touch /opt/mcserver/white-list.txt
    
    echo -e "\n Minecraft Server installed\n\n"
}

function installmineJS () {

    echo -e "installing mineJS"
    #Install Nodejs
   
    cd /opt
    git clone --depth 1 git://github.com/escii/minejs.git
    #ln -s /opt/minejs/htdocs /var/www/minejs
    cp /opt/minejs/config.js.example /opt/minejs/config.js
    #cp /opt/minejs/htdocs/include/settings.inc.php.example /opt/minejs/htdocs/include/settings.inc.php
    echo -e "\n mineJS installed \n\n"
}

function startAll() {
    cd /opt/minejs/
    /usr/bin/node /opt/minejs/server.sh
    #ask if should restart apache
}

#program start
main

echo -e "If everything worked well the web interface should ne available under http://localhost/minejs"

