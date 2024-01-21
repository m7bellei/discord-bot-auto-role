const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const MESSAGE_ID = process.env.MESSAGE_ID;
const LINEUP_CHANNEL_ID = process.env.LINEUP_CHANNEL;

const archetypes = {
    'archery:1128370029742800946': { name: 'rd:Archery', emoji: '<:archery:1193735957401305180>' },
    'protection:1128370032947232789': { name: 'rd:Protection', emoji: '<:protection:1193735963063615600>' },
    'shadow:1128370034520096799': { name: 'rd:Shadow', emoji: '<:shadow:1193735965492117567>' },
    'warfare:1128370038852833361': { name: 'rd:Warfare', emoji: '<:warfare:1193735968210047028>' },
    'spiritual:1128370037451919452': { name: 'rd:Spiritual', emoji: '<:spiritual:1193735966880436224>' },
    'witchcraft:1128370043856625674': { name: 'rd:Witchcraft', emoji: '<:witchcraft:1193736761424216134>' },
    'holy:1128370041537187961': { name: 'rd:Holy', emoji: '<:holy:1193735961515933838>' },
    'wizardry:1128370046851362846': { name: 'rd:Wizardry', emoji: '<:wizardry:1193735973863968798>' }
};

const userReactions = {};

client.on('ready', async () => {
    console.log(`Logado como ${client.user.tag}!`);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    try {
        const archetypeMessage = await channel.messages.fetch(MESSAGE_ID);
        await processExistingReactions(archetypeMessage);
        await updateOrCreateLineupMessage();

        console.log('Lineup message iniciada com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar as reações ou atualizar a mensagem de lineup:', error);
    }
});

async function updateOrCreateLineupMessage() {
    try {
        const lineupChannel = client.channels.cache.get(LINEUP_CHANNEL_ID);
        if (!lineupChannel) throw new Error("Canal de lineup não encontrado");

        let lineupMessage;
        const messages = await lineupChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(msg => msg.author.bot && msg.author.id === client.user.id);

        if (botMessages.size > 0) {
            lineupMessage = botMessages.first();
        } else {
            lineupMessage = await lineupChannel.send("RAVENDAWN VALHALLA LINEUP:\n\nInicializando...");
        }

        const lineupEntries = Object.entries(userReactions).map(([userId, archetypesSet]) => {
            const user = client.users.cache.get(userId) || 'Usuário Desconhecido';
            const emojis = Array.from(archetypesSet);
            return `${user}: ${emojis.join(' ')}`;
        });

        let lineupMessageContent = "RAVENDAWN VALHALLA LINEUP:\n\n" + lineupEntries.join('\n');

        if (lineupMessageContent.length > 2000) {
            const parts = splitMessageIntoParts(lineupMessageContent);
            await lineupMessage.edit(parts[0]);
            for (let i = 1; i < parts.length; i++) {
                await lineupChannel.send(parts[i]);
            }
        } else {
            await lineupMessage.edit(lineupMessageContent);
        }
    } catch (error) {
        console.error('Erro ao atualizar ou criar a mensagem de lineup:', error);
    }
}

function splitMessageIntoParts(message) {
    const parts = [];
    let currentPart = '';

    for (const line of message.split('\n')) {
        if (currentPart.length + line.length > 2000) {
            parts.push(currentPart);
            currentPart = line;
        } else {
            currentPart += line + '\n';
        }
    }

    if (currentPart.length > 0) {
        parts.push(currentPart);
    }

    return parts;
}

async function processExistingReactions(message) {
    for (const reaction of message.reactions.cache.values()) {
        const users = await reaction.users.fetch();
        for (const user of users.values()) {
            if (!user.bot) {
                const archetype = archetypes[reaction.emoji.name + ':' + reaction.emoji.id];
                if (archetype) {
                    const member = await message.guild.members.fetch(user.id).catch(() => null);
                    if (!member) {
                        // Se o membro não está mais no servidor, pule para o próximo usuário
                        continue;
                    }

                    if (!userReactions[user.id]) {
                        userReactions[user.id] = new Set();
                    }
                    userReactions[user.id].add(archetype.emoji);
                    
                    const role = message.guild.roles.cache.find(r => r.name === archetype.name);
                    if (role) {
                        member.roles.add(role).catch(console.error);
                    }
                }
            }
        }
    }
}

const handleReaction = async (reaction, user, add) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const { message, emoji } = reaction;

    if (message.id === MESSAGE_ID && message.channel.id === CHANNEL_ID) {
        const emojiKey = `${emoji.name}:${emoji.id}`;
        const archetype = Object.values(archetypes).find(a => emojiKey in archetypes && a.name === archetypes[emojiKey].name);
        if (!archetype) return;

        const role = message.guild.roles.cache.find(r => r.name === archetype.name);
        if (!role) {
            console.error(`Cargo não encontrado: ${archetype.name}`);
            return;
        }

        const member = await message.guild.members.fetch(user.id).catch(console.error);
        if (member) {
            if (add) {
                console.log(`${user.tag} adicionou o arquétipo ${archetype.name}`);
                member.roles.add(role).catch(console.error);
                userReactions[user.id].add(archetype.emoji);
            } else {
                console.log(`${user.tag} removeu o arquétipo ${archetype.name}`);
                member.roles.remove(role).catch(console.error);
                userReactions[user.id].delete(archetype.emoji);
            }

            await updateOrCreateLineupMessage();
        }
    }
};

client.on('messageReactionAdd', (reaction, user) => {
    handleReaction(reaction, user, true);
});

client.on('messageReactionRemove', (reaction, user) => {
    handleReaction(reaction, user, false);
});

client.login(process.env.DISCORD_BOT_TOKEN);