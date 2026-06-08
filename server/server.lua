-- ============================================================
-- server/server.lua — Chat NUI · FiveM
-- ============================================================

local groupLevels = {
    founder   = 3,
    admin     = 2,
    moderator = 1,
    user      = 0,
}

local playerGroups = {}

-- ── Helpers ────────────────────────────────────────────────────────────────
local function getPlayerName(src)
    return GetPlayerName(src) or ('Joueur#%d'):format(src)
end

local function getGroupLevel(src)
    return groupLevels[playerGroups[src] or 'user'] or 0
end

local function isStaff(src)
    return getGroupLevel(src) >= 1
end

local function getIdentifier(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if string.sub(id, 1, 7) == 'license' then
            return id
        end
    end
    return nil
end

local function sanitize(msg)
    return msg:gsub('<', '&lt;'):gsub('>', '&gt;'):gsub('\n', ' ')
end

local function validateMsg(msg)
    return type(msg) == 'string' and #msg > 0 and #msg <= 150
end

-- ── Compteurs ──────────────────────────────────────────────────────────────
local function buildCounts()
    local players  = #GetPlayers()
    local maxSlots = GetConvarInt('sv_maxclients', 64)
    local staff    = 0
    for _, id in ipairs(GetPlayers()) do
        if isStaff(tonumber(id)) then staff = staff + 1 end
    end
    return players, maxSlots, staff
end

local function broadcastCounts()
    local players, maxSlots, staff = buildCounts()
    TriggerClientEvent('k_chat:updateCounts', -1, players, maxSlots, staff)
end

-- ── Chargement du groupe depuis la DB ─────────────────────────────────────
AddEventHandler('playerConnecting', function(_, __, deferrals)
    local src        = source  -- capturer immédiatement avant tout saut async
    local identifier = getIdentifier(src)

    if not identifier then
        playerGroups[src] = 'user'
        return
    end

    deferrals.defer()  -- bloquer la connexion le temps de la requête SQL

    exports.oxmysql:scalar(
        'SELECT `group` FROM `users` WHERE `identifier` = ? LIMIT 1',
        { identifier },
        function(group)
            playerGroups[src] = group or 'user'
            print(('^6[k_chat]^7 %s (#%d) → group: %s'):format(
                getPlayerName(src), src, playerGroups[src]))
            deferrals.done()
        end
    )
end)

-- ── Nettoyage + broadcast à la déconnexion ────────────────────────────────
AddEventHandler('playerDropped', function()
    local src = source
    playerGroups[src] = nil
    SetTimeout(500, broadcastCounts)
end)

AddEventHandler('playerConnecting', function()
    SetTimeout(1500, broadcastCounts)
end)

-- ── Event : demande compteurs + contacts PM ────────────────────────────────
RegisterNetEvent('k_chat:requestCounts', function()
    local src = source

    local players, maxSlots, staff = buildCounts()
    TriggerClientEvent('k_chat:updateCounts', src, players, maxSlots, staff)

    local contacts = {}
    for _, id in ipairs(GetPlayers()) do
        local pid = tonumber(id)
        if pid ~= src then
            contacts[#contacts + 1] = {
                id   = pid,
                name = getPlayerName(pid),
            }
        end
    end
    TriggerClientEvent('k_chat:updatePmContacts', src, contacts)
end)

-- ── Event : message global ─────────────────────────────────────────────────
-- L'expéditeur est exclu du broadcast pour éviter le double affichage
-- (son client ajoute le message via optimistic ou attend le retour serveur,
--  selon le choix de l'UI — ici l'UI n'a pas de dispatch local, donc on
--  renvoie aussi à l'expéditeur pour qu'il voie son propre message)
RegisterNetEvent('k_chat:sendGlobal', function(message)
    local src = source

    if not validateMsg(message) then return end
    message = sanitize(message)

    local author = getPlayerName(src)

    -- Broadcast à TOUS y compris l'expéditeur (l'UI React ne fait plus de dispatch local)
    TriggerClientEvent('k_chat:receiveGlobal', -1, author, message)

    print(('^5[CHAT]^7 [GLOBAL] %s (#%d): %s'):format(author, src, message))
end)

-- ── Event : message staff ──────────────────────────────────────────────────
RegisterNetEvent('k_chat:sendStaff', function(message)
    local src = source

    if not isStaff(src) then
        print(('^1[CHAT]^7 [STAFF] Accès refusé — %s (#%d) group=%s'):format(
            getPlayerName(src), src, playerGroups[src] or 'user'))
        return
    end

    if not validateMsg(message) then return end
    message = sanitize(message)

    local author = getPlayerName(src)

    for _, id in ipairs(GetPlayers()) do
        local pid = tonumber(id)
        if isStaff(pid) then
            TriggerClientEvent('k_chat:receiveStaff', pid, author, message)
        end
    end

    print(('^3[CHAT]^7 [STAFF] %s (#%d): %s'):format(author, src, message))
end)

-- ── Event : /me action RP ──────────────────────────────────────────────────
-- Reçu depuis le client NUI (pas depuis le chat FiveM natif)
RegisterNetEvent('k_chat:sendMe', function(action)
    local src = source

    if not validateMsg(action) then return end
    action = sanitize(action)

    local author = getPlayerName(src)
    local text   = '* ' .. author .. ' ' .. action

    -- Afficher dans le chat FiveM natif en jeu (visible aux joueurs proches ou à tous)
    TriggerClientEvent('chat:addMessage', -1, {
        color     = { 255, 255, 100 },
        multiline = true,
        args      = { '', text },
    })

    -- Également dans le chat NUI global pour les joueurs qui l'ont ouvert
    TriggerClientEvent('k_chat:receiveGlobal', -1, author, '* ' .. action)

    print(('^4[CHAT]^7 [ME] %s (#%d): %s'):format(author, src, action))
end)

-- ── Event : message privé ──────────────────────────────────────────────────
RegisterNetEvent('k_chat:sendPm', function(targetId, message)
    local src = source

    targetId = tonumber(targetId)
    if not targetId or targetId == src then return end
    if not validateMsg(message) then return end
    if not GetPlayerName(targetId) then return end

    message = sanitize(message)

    local fromName   = getPlayerName(src)
    local targetName = getPlayerName(targetId)

    TriggerClientEvent('k_chat:receivePm', targetId, src, fromName, message)
    TriggerClientEvent('k_chat:receivePm', src, targetId, ('→ ' .. targetName), message)

    print(('^6[CHAT]^7 [PM] %s (#%d) → %s (#%d): %s'):format(
        fromName, src, targetName, targetId, message))
end)

-- ── Exports ────────────────────────────────────────────────────────────────
exports('getPlayerGroup', function(src)
    return playerGroups[tonumber(src)] or 'user'
end)

exports('getGroupLevel', function(src)
    return getGroupLevel(tonumber(src))
end)

exports('isStaff', function(src)
    return isStaff(tonumber(src))
end)

RegisterCommand('me', function(source, args)
    local text = table.concat(args, ' ')

    if text == '' then return end

    TriggerClientEvent('rp:me3d', -1, source, text)
end, false)

print('^2[k_chat] Server chargé^0')