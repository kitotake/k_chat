fx_version 'cerulean'
game 'gta5'

name "k_chat"
description "chat system for FiveM with customizable UI and features"
author "kitotake"
version "1.1"

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/assets/*.js',
    'web/dist/assets/*.css',
}

client_scripts {
    'client/client.lua',   -- ton script Lua qui fait SetNuiFocus, SendNUIMessage, etc.
}

server_scripts {
    'server/server.lua',   -- uniquement si tu as des events serveur (relay messages, logs...)
}

-- Désactive le chat natif FiveM
replace_chat 'true'
