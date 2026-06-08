fx_version 'cerulean'
game 'gta5'

name "k_chat"
description "chat system for FiveM with customizable UI and features"
author "kitotake"
version "1.0"

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/assets/style.css',
    'web/assets/app.js'
}

client_scripts {
    'client/client.lua',   -- ton script Lua qui fait SetNuiFocus, SendNUIMessage, etc.
}

server_scripts {
    'server/server.lua',   -- uniquement si tu as des events serveur (relay messages, logs...)
}

-- Désactive le chat natif FiveM
replace_chat 'true'
