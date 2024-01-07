const { Client, GatewayIntentBits } = require('discord.js');

require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers // Adicionado para acessar membros do servidor
    ]
});
  
  const archetypes = {
    'archery:1128370029742800946': { name: 'rd:Archery', emoji: 'archery' },
    'protection:1128370032947232789': { name: 'rd:Protection', emoji: '<:protection:1128370032947232789>' },
    'shadow:1128370034520096799': { name: 'rd:Shadow', emoji: '<:shadow:1128370034520096799>' },
    'warfare:1128370038852833361': { name: 'rd:Warfare', emoji: '<:warfare:1128370038852833361>' },
    'spiritual:1128370037451919452': { name: 'rd:Spiritual', emoji: '<:spiritual:1128370037451919452>' },
    'witchcraft:1128370043856625674': { name: 'rd:Witchcraft', emoji: '<:witchcraft:1128370043856625674>' },
    'holy:1128370041537187961': { name: 'rd:Holy', emoji: '<:holy:1128370041537187961>' },
    'wizardry:1128370046851362846': { name: 'rd:Wizardry', emoji: '<:wizardry:1128370046851362846>' },
};

const CHANNEL_ID = process.env.CHANNEL_ID; // Substitua pelo ID do seu canal
const MESSAGE_ID = process.env.MESSAGE_ID; // Substitua pelo ID da sua mensagem fixada
const LINEUP_CHANNEL_ID = process.env.LINEUP_CHANNEL; // Substitua pelo ID do seu canal de lineup

client.on('ready', async () => {
    console.log(`Logado como ${client.user.tag}!`);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;
    try {
        const message = await channel.messages.fetch(MESSAGE_ID);
        for (const emoji in archetypes) {
            await message.react(emoji);
        }
    } catch (error) {
        console.error('Erro ao reagir à mensagem fixada:', error);
    }

    // listar membros com os cargos
    const guild = client.guilds.cache.get(channel.guild.id);
    if (!guild) return;
    try {
        const members = await guild.members.fetch();
        members.forEach(member => {
            const roles = member.roles.cache
                .filter(role => role.name.startsWith('rd:'))
                .map(role => role.name)
                .join(', ');
            if (roles) {
                console.log(`${member.user.tag}: ${roles}`);
            }
        });
    } catch (error) {
        console.error('Erro ao listar membros:', error);
    }

    await initializeOrUpdateReactions();
    await updateOrCreateLineupMessage();
});

const userReactions = {};

const updateOrCreateLineupMessage = async () => {
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

        const lineupEntries = await Promise.all(
            Object.entries(userReactions).map(async ([userId, archetypesSet]) => {
                const user = await client.users.fetch(userId).catch(() => null);
                const emojis = Array.from(archetypesSet);
                return `${user ? user.toString() : 'Usuário Desconhecido'}: ${emojis.join(' ')}`;
            })
        );
    
        const lineupMessageContent = "RAVENDAWN VALHALLA LINEUP:\n\n" + lineupEntries.join('\n');
        await lineupMessage.edit(lineupMessageContent);
    } catch (error) {
        console.error('Erro ao atualizar ou criar a mensagem de lineup:', error);
    }
};

const initializeOrUpdateReactions = async () => {
    try {
        const message = await client.channels.cache.get(CHANNEL_ID).messages.fetch(MESSAGE_ID);
        message.reactions.cache.forEach(async (reaction) => {
            const users = await reaction.users.fetch();
            users.forEach((user) => {
                if (!user.bot) {
                    const archetype = archetypes[reaction.emoji.name + ':' + reaction.emoji.id];
                    if (archetype) {
                        if (!userReactions[user.id]) userReactions[user.id] = new Set();
                        userReactions[user.id].add(archetype.emoji);
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erro ao inicializar as reações:', error);
    }
};

const handleReaction = async (reaction, user, add) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const { message, emoji } = reaction;

    if (message.id === MESSAGE_ID && message.channel.id === CHANNEL_ID) {
        const archetype = archetypes[emoji.name + ':' + emoji.id];
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
                if (!userReactions[user.id]) userReactions[user.id] = new Set();
                userReactions[user.id].add(archetype.emoji);
            } else {
                console.log(`${user.tag} removeu o arquétipo ${archetype.name}`);
                member.roles.remove(role).catch(console.error);
                if (userReactions[user.id]) {
                    userReactions[user.id].delete(archetype.emoji);
                    if (userReactions[user.id].size === 0) delete userReactions[user.id];
                }
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

