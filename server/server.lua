-- ============================================================
-- server/server.lua — Chat NUI · FiveM
-- Système de groupes basé sur la table SQL `users`
-- ============================================================

-- ── Group levels (autonome, pas besoin d'importer PermissionGroups) ────────
local groupLevels = {
    founder   = 3,
    admin     = 2,
    moderator = 1,
    user      = 0,
}

-- ── Cache groupe par source ────────────────────────────────────────────────
-- Evite une requête SQL à chaque message
local playerGroups = {}  -- [src] = 'admin' | 'moderator' | 'user' | ...

-- ── Helpers ────────────────────────────────────────────────────────────────
local function getPlayerName(src)
    return GetPlayerName(src) or ('Joueur#%d'):format(src)
end

local function getGroupLevel(src)
    return groupLevels[playerGroups[src] or 'user'] or 0
end

local function isStaff(src)
    return getGroupLevel(src) >= 1  -- moderator, admin, founder
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

-- ── Chargement du groupe depuis la DB à la connexion ──────────────────────
AddEventHandler('playerConnecting', function(_, __, deferrals)
    local src        = source
    local identifier = getIdentifier(src)

    if not identifier then
        playerGroups[src] = 'user'
        return
    end

    exports.oxmysql:scalar(
        'SELECT `group` FROM `users` WHERE `identifier` = ? LIMIT 1',
        { identifier },
        function(group)
            playerGroups[src] = group or 'user'
            lib.print.info(('[k_chat] %s (#%d) → group: %s'):format(
                getPlayerName(src), src, playerGroups[src]))
        end
    )
end)

-- ── Nettoyage cache + broadcast à la déconnexion ──────────────────────────
AddEventHandler('playerDropped', function()
    local src = source
    playerGroups[src] = nil
    SetTimeout(500, broadcastCounts)
end)

-- Broadcast aussi à chaque nouvelle connexion
AddEventHandler('playerConnecting', function()
    SetTimeout(1500, broadcastCounts)
end)

-- ── Event : demande compteurs + contacts PM (ouverture du chat) ────────────
RegisterNetEvent('k_chat:requestCounts', function()
    local src = source

    local players, maxSlots, staff = buildCounts()
    TriggerClientEvent('k_chat:updateCounts', src, players, maxSlots, staff)

    -- Liste des joueurs connectés comme contacts PM
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
RegisterNetEvent('k_chat:sendGlobal', function(message)
    local src = source

    if not validateMsg(message) then return end
    message = sanitize(message)

    local author = getPlayerName(src)

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

    -- Envoyer uniquement aux staff connectés
    for _, id in ipairs(GetPlayers()) do
        local pid = tonumber(id)
        if isStaff(pid) then
            TriggerClientEvent('k_chat:receiveStaff', pid, author, message)
        end
    end

    print(('^3[CHAT]^7 [STAFF] %s (#%d): %s'):format(author, src, message))
end)

-- ── Event : message privé ──────────────────────────────────────────────────
RegisterNetEvent('k_chat:sendPm', function(targetId, message)
    local src = source

    targetId = tonumber(targetId)
    if not targetId or targetId == src then return end
    if not validateMsg(message) then return end
    if not GetPlayerName(targetId) then return end  -- joueur déconnecté

    message = sanitize(message)

    local fromName   = getPlayerName(src)
    local targetName = getPlayerName(targetId)

    -- Au destinataire
    TriggerClientEvent('k_chat:receivePm', targetId, src, fromName, message)

    -- Echo à l'expéditeur
    TriggerClientEvent('k_chat:receivePm', src, targetId, ('→ ' .. targetName), message)

    print(('^6[CHAT]^7 [PM] %s (#%d) → %s (#%d): %s'):format(
        fromName, src, targetName, targetId, message))
end)

-- ── Export : récupérer le groupe d'un joueur (utile pour d'autres resources) ──
exports('getPlayerGroup', function(src)
    return playerGroups[tonumber(src)] or 'user'
end)

exports('getGroupLevel', function(src)
    return getGroupLevel(tonumber(src))
end)

exports('isStaff', function(src)
    return isStaff(tonumber(src))
end)

print('^2[k_chat] Server chargé^0')