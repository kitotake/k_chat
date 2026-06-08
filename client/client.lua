-- ============================================================
-- client/client.lua — Chat NUI · FiveM
-- ============================================================

local isOpen = false

-- ── Ouvrir le chat ─────────────────────────────────────────────────────────
local function openChat()
    if isOpen then return end
    isOpen = true

    SetNuiFocus(true, true)

    local name = GetPlayerName(PlayerId())

    SendNUIMessage({ action = 'openChat' })

    SendNUIMessage({
        action = 'setPlayerInfo',
        data   = {
            name     = name,
            role     = 'Joueur',
            initials = string.upper(string.sub(name, 1, 2)),
            color    = '#4ade80',
        },
    })

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

-- ── Suppression du chat natif FiveM ───────────────────────────────────────
CreateThread(function()
    while true do
        Wait(0)
        DisableControlAction(0, 245, true) -- INPUT_MP_TEXT_CHAT_ALL
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

-- ── Exécution de commandes RP depuis la NUI ────────────────────────────────
-- Seul /me est autorisé pour l'instant (sécurité : jamais laisser passer
-- des commandes arbitraires depuis la NUI)
RegisterNUICallback('executeCommand', function(data, cb)
    local cmd = data.command

    if type(cmd) ~= 'string' or #cmd == 0 then
        return cb({ ok = false, reason = 'invalid_command' })
    end

    if cmd:sub(1, 1) == '/' then
        ExecuteCommand(cmd:sub(2))
        closeChat()
        return cb({ ok = true })
    end

    cb({ ok = false, reason = 'unknown_command' })
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
AddEventHandler('chat:addMessage',    function() end)
AddEventHandler('chat:addSuggestion', function() end)

local displays = {}

RegisterNetEvent('rp:me3d', function(serverId, text)
    local player = GetPlayerFromServerId(serverId)

    if player == -1 then return end

    local ped = GetPlayerPed(player)

    displays[#displays + 1] = {
        ped = ped,
        text = text,
        expire = GetGameTimer() + 7000
    }
end)

CreateThread(function()
    while true do
        Wait(0)

        local myCoords = GetEntityCoords(PlayerPedId())

        for i = #displays, 1, -1 do
            local data = displays[i]

            if GetGameTimer() > data.expire then
                table.remove(displays, i)
            else
                local coords = GetEntityCoords(data.ped)

                if #(myCoords - coords) < 20.0 then
                    DrawText3D(
                        coords.x,
                        coords.y,
                        coords.z + 1.0,
                        'personne ' .. data.text
                    )
                end
            end
        end
    end
end)

function DrawText3D(x, y, z, text)
    local onScreen, _x, _y = World3dToScreen2d(x, y, z)

    if not onScreen then return end

    SetTextScale(0.35, 0.35)
    SetTextFont(4)
    SetTextProportional(1)
    SetTextCentre(true)
    SetTextColour(230, 230, 230, 255)
    SetTextOutline()

    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(_x, _y)
end
-- ── Nettoyage à l'arrêt de la resource ────────────────────────────────────
AddEventHandler('onResourceStop', function(resource)
    if resource ~= GetCurrentResourceName() then return end
    if isOpen then
        SetNuiFocus(false, false)
    end
end)