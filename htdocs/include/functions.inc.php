<?php

#functions

function init() {
    if ($GLOBALS['itemsAge'] < ( time() - $GLOBALS['cacheLifetime'])) {
        $GLOBALS['items'] = json_decode(file_get_contents("include/items.json"), true);
        $GLOBALS['itemsAge'] = time();
    }
    if ($GLOBALS['scriptsAge'] < ( time() - $GLOBALS['cacheLifetime'])) {
        $GLOBALS['scripts'] = json_decode(file_get_contents("include/scripts.json"), true);
        $GLOBALS['scriptsAge'] = time();
    }
}

function getSmarty() {
    $smarty = new Smarty();
    $smarty->setTemplateDir('include/smarty/templates');
    $smarty->setCompileDir('include/smarty/templates_c');
    $smarty->setCacheDir('include/smarty/cache');
    //$smarty->caching = 0;
    $smarty->setConfigDir('include/smarty/configs');
    return $smarty;
}

function sendCommand($cmd, $opts = array()) {
    $optStr = "";
    if (count($opts)) {
        $first = true;
        foreach ($opts as $name => $value) {
            if ($first) {
                $optStr .= "?origin=" . urlencode($_SESSION['user']) . "&";
                $first = false;
            } else {
                $optStr .= "&";
            }
            $optStr .= $name . "=" . urlencode($value);
        }
    }
    return file_get_contents($GLOBALS['nodejsServer'] . "/" . $cmd . $optStr);
}

function getUsers() {
    return json_decode(sendCommand("users"));
}

function runScript($script) {
    //FIXME: I am not working right now
    tellUser($_SESSION['user'], "Running script " . $script);
    sendCommand("script", array("script" => $script));
    return "Running script " . $script;
}

function teleportUser($dst) {
    //FIXME: I am not working right now
    tellUser($_SESSION['user'], "Teleporting you to " . $dst . ".");
    tellUser($dst, "Teleporting " . $_SESSION['user'] . " to you.");
    sendCommand("tp", array("target" => $dst));
    return "User " . $_SESSION['user'] . " to " . $dst . " teleported";
}

function tellUser($user, $text) {
    sendCommand("tell", array("user" => $user, "text" => $text));
}

function giveItem($id, $amount = 64, $stackable = 0) {
    tellUser($_SESSION['user'], "Giving you " . $amount . " of " . $id);
    sendCommand("give", array("id" => $id, "num" => $amount));
    return "Giving you " . $amount . " of " . $id;
}

?>