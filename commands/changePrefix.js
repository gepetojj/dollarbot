const Discord = require("discord.js");
const firebase = require("../utils/firebase");
const packs = require("../utils/packs.json");

module.exports = {
    name: "changeprefix",
    aliases: ["mudarprefix", "prefix", "mp", "cp"],
    args: true,
    usage: "{novo prefix}",
    guildOnly: true,
    description: "Altera o prefix o dollarbot no servidor.",
    execute(message, args) {
        message.channel.startTyping();

        const firestore = firebase.firestore();
        const serversList = firestore.collection("serversList");

        try {
            if (!message.member.hasPermission("ADMINISTRATOR")) {
                const embed = new Discord.MessageEmbed()
                    .setColor(packs.standardEmbedErrorColor)
                    .setTitle(packs.standardErrorTitle)
                    .setDescription(packs.standardErrorDesc)
                    .addField(
                        packs.standardErrorField,
                        `Você não tem permissões o suficiente, ${message.author}.`
                    );
                message.channel.stopTyping();
                return message.channel.send(embed);
            }
            serversList
                .doc(message.guild.id)
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        serversList
                            .doc(message.guild.id)
                            .update({
                                prefix: args[0],
                            })
                            .then(() => {
                                const embed = new Discord.MessageEmbed()
                                    .setColor(packs.standardEmbedColor)
                                    .setTitle(
                                        packs.changePrefixCommand.embedTitle
                                    )
                                    .setDescription(
                                        `${packs.changePrefixCommand.embedDesc} ${args[0]}`
                                    )
                                    .setFooter(
                                        `${packs.changePrefixCommand.embedFooter} ${message.author.username}`,
                                        message.author.avatarURL()
                                    );
                                message.channel.stopTyping();
                                return message.channel.send(embed);
                            })
                            .catch((err) => {
                                console.error(err);
                                const embed = new Discord.MessageEmbed()
                                    .setColor(packs.standardEmbedErrorColor)
                                    .setTitle(packs.standardErrorTitle)
                                    .setDescription(packs.standardErrorDesc)
                                    .addField(
                                        packs.standardErrorField,
                                        "Houve um erro ao tentar alterar o prefix deste servidor."
                                    );
                                message.channel.stopTyping();
                                return message.channel.send(embed);
                            });
                    }
                });
        } catch (err) {
            console.error(err);
            const embed = new Discord.MessageEmbed()
                .setColor(packs.standardEmbedErrorColor)
                .setTitle(packs.standardErrorTitle)
                .setDescription(packs.standardErrorDesc)
                .addField(
                    packs.standardErrorField,
                    "Houve um erro ao tentar alterar o prefix deste servidor."
                );
            message.channel.stopTyping();
            return message.channel.send(embed);
        }
    },
};
