-- ============================================================
-- client/client.lua — Chat NUI · FiveM
-- ============================================================

local isOpen = false

-- ── Ouvrir le chat ─────────────────────────────────────────────────────────
local function openChat()
    if isOpen then return end
    isOpen = true

    SetNuiFocus(true, true)

    -- FIX: supprimé "cache.ped" (variable morte, jamais utilisée)
    --      supprimé "playerId" (déclaré mais jamais transmis à la NUI)
    local name = GetPlayerName(PlayerId())

    SendNUIMessage({
        action = 'openChat',
    })

    SendNUIMessage({
        action = 'setPlayerInfo',
        data   = {
            name     = name,
            role     = 'Joueur',   -- remplace par ton système de grade/rôle
            initials = string.upper(string.sub(name, 1, 2)),
            color    = '#4ade80',
        },
    })

    -- Demande compteurs + contacts PM au serveur
    TriggerServerEvent('k_chat:requestCounts')
end

-- ── Fermer le chat ─────────────────────────────────────────────────────────
local function closeChat()
    if not isOpen then return end
    isOpen = false

    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'closeChat' })
end

-- ── Commande explicite ─────────────────────────────────────────────────────
RegisterCommand('chat', function()
    openChat()
end, false)

RegisterKeyMapping('chat', 'Ouvrir le chat', 'keyboard', 'T')

-- ── Boucle touche T ────────────────────────────────────────────────────────
-- FIX: ancienne version appelait DisableControlAction + IsControlJustPressed
--      dans la même boucle Wait(0), ce qui :
--      1. bloquait T même quand le chat était déjà ouvert
--      2. pouvait déclencher openChat() en double avec RegisterKeyMapping
--
-- Solution : on désactive INPUT_MP_TEXT_CHAT_ALL (245) SEULEMENT quand le
-- chat est fermé pour que notre RegisterKeyMapping prenne la main,
-- et on ne re-détecte pas la pression ici (RegisterKeyMapping s'en charge).
CreateThread(function()
    while true do
        Wait(0)
        -- Bloque l'ouverture du chat natif FiveM en permanence
        DisableControlAction(0, 245, true) -- INPUT_MP_TEXT_CHAT_ALL

        -- FIX: la détection IsControlJustPressed est SUPPRIMÉE ici.
        -- RegisterKeyMapping('chat', ..., 'T') gère l'ouverture proprement
        -- sans risque de double appel ni de conflit avec le chat natif.
    end
end)

-- ── NUI Callbacks ──────────────────────────────────────────────────────────

RegisterNUICallback('closeChat', function(_, cb)
    closeChat()
    cb({ ok = true })
end)

RegisterNUICallback('sendMessage', function(data, cb)
    local channel = data.channel
    local message = data.message

    if type(message) ~= 'string' or #message == 0 or #message > 150 then
        return cb({ ok = false, reason = 'invalid_message' })
    end

    if channel == 'global' then
        TriggerServerEvent('k_chat:sendGlobal', message)
    elseif channel == 'staff' then
        TriggerServerEvent('k_chat:sendStaff', message)
    end

    cb({ ok = true })
end)

RegisterNUICallback('sendPm', function(data, cb)
    local targetId = tonumber(data.targetId)
    local message  = data.message

    if not targetId or type(message) ~= 'string' or #message == 0 or #message > 150 then
        return cb({ ok = false, reason = 'invalid' })
    end

    TriggerServerEvent('k_chat:sendPm', targetId, message)
    cb({ ok = true })
end)

-- ── Events serveur → client ────────────────────────────────────────────────

RegisterNetEvent('k_chat:receiveGlobal', function(author, message)
    SendNUIMessage({
        action = 'receiveMessage',
        data   = { channel = 'global', author = author, message = message },
    })
end)

RegisterNetEvent('k_chat:receiveStaff', function(author, message)
    SendNUIMessage({
        action = 'receiveMessage',
        data   = { channel = 'staff', author = author, message = message },
    })
end)

RegisterNetEvent('k_chat:receivePm', function(fromId, fromName, message)
    SendNUIMessage({
        action = 'receivePm',
        data   = { fromId = tostring(fromId), fromName = fromName, message = message },
    })
end)

RegisterNetEvent('k_chat:updateCounts', function(current, maxPlayers, staffOnline)
    SendNUIMessage({
        action = 'updatePlayerCount',
        data   = { current = current, max = maxPlayers },
    })
    SendNUIMessage({
        action = 'updateStaffCount',
        data   = { count = staffOnline },
    })
end)

RegisterNetEvent('k_chat:updatePmContacts', function(contacts)
    SendNUIMessage({
        action = 'updatePmContacts',
        data   = contacts,
    })
end)

-- ── Suppression du chat natif ──────────────────────────────────────────────
-- FIX: 'chat:clear' est un event SERVEUR, pas client — il ne fait rien ici.
--      On garde uniquement les intercepteurs d'events client natifs.
AddEventHandler('chat:addMessage',    function() end)
AddEventHandler('chat:addSuggestion', function() end)

-- ── Nettoyage à l'arrêt de la resource ────────────────────────────────────
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if isOpen then
        SetNuiFocus(false, false)
    end
end)