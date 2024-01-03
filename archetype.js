const { Client, GatewayIntentBits } = require('discord.js');

require('dotenv').config();

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions] 
  });
  
  const archetypes = {
    'archery:1128370029742800946': 'rd:Archery',
    'protection:1128370032947232789': 'rd:Protection',
    'shadow:1128370034520096799': 'rd:Shadow',
    'warfare:1128370038852833361': 'rd:Warfare',
    'spiritual:1128370037451919452': 'rd:Spiritual',
    'witchcraft:1128370043856625674': 'rd:Witchcraft',
    'holy:1128370041537187961': 'rd:Holy',
    'wizardry:1128370046851362846': 'rd:Wizardry',
    // Adicione outros emojis e cargos conforme necessário
};

const CHANNEL_ID = process.env.CHANNEL_ID; // Substitua pelo ID do seu canal
const MESSAGE_ID = process.env.MESSAGE_ID; // Substitua pelo ID da sua mensagem fixada

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
});

const handleReaction = async (reaction, user, add) => {
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    if (user.bot) return;

    const { message, emoji } = reaction;

    if (message.id === MESSAGE_ID && message.channel.id === CHANNEL_ID) {
        const roleName = archetypes[emoji.name + ':' + emoji.id];
        if (!roleName) return;

        const role = message.guild.roles.cache.find(role => role.name === roleName);
        const member = await message.guild.members.fetch(user.id).catch(console.error); 

        if (member) {
            if (add) {
                console.log(`${user.tag} adicionou o arquétipo: ${roleName}`);
                member.roles.add(role).catch(console.error);
            } else {
                console.log(`${user.tag} removeu o arquétipo: ${roleName}`);
                member.roles.remove(role).catch(console.error);
            }
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

