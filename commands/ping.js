const Discord = require("discord.js");
const packs = require("../utils/packs.json");

module.exports = {
    name: "ping",
    description: "Testa a latência entre o bot e o servidor.",
    execute(message) {
        let calcEmbed = new Discord.MessageEmbed()
            .setColor(packs.standardEmbedColor)
            .setTitle(packs.pingCommand.embedTitle)
            .setDescription(packs.pingCommand.embedDesc)
            .addField(
                packs.pingCommand.embedField,
                packs.pingCommand.embedExtra
            )
            .setFooter(
                `${packs.pingCommand.embedFooter} ${message.author.username}`,
                message.author.avatarURL()
            );

        message.channel.send(calcEmbed).then((sendedMessage) => {
            const ping =
                sendedMessage.createdTimestamp - message.createdTimestamp;
            let pingEmbed = new Discord.MessageEmbed()
                .setColor(packs.standardEmbedColor)
                .setTitle(packs.pingCommand.embedTitle)
                .setDescription(packs.pingCommand.embedDesc)
                .addField(packs.pingCommand.embedField, `${ping} ms`)
                .setFooter(
                    `${packs.pingCommand.embedFooter} ${message.author.username}`,
                    message.author.avatarURL()
                );
            sendedMessage.edit(pingEmbed);
        });
    },
};
