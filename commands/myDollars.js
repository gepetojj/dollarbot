const Discord = require("discord.js");
const firebase = require("../utils/firebase");
const packs = require("../utils/packs.json");

module.exports = {
    name: "mydollars",
    aliases: ["dollars", "meusdolares", "dolares", "md"],
    args: false,
    guildOnly: true,
    description:
        "Retorna a quantidade de dólares que o usuário tem no servidor.",
    execute(message) {
        message.channel.startTyping();

        const firestore = firebase.firestore();
        const serversList = firestore.collection("serversList");

        serversList
            .doc(message.guild.id)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    let embed = new Discord.MessageEmbed()
                        .setColor(packs.standardEmbedColor)
                        .setTitle(packs.myDollarsCommand.embedTitle)
                        .setDescription(packs.myDollarsCommand.embedDesc)
                        .addField(
                            packs.myDollarsCommand.embedField,
                            `$${data.usersList[message.author.id].dollars} dólares`
                        )
                        .setFooter(
                            `${packs.pingCommand.embedFooter} ${message.author.username}`,
                            message.author.avatarURL()
                        );
                    message.channel.stopTyping();
                    return message.channel.send(embed);
                }
            })
            .catch((err) => {
                console.error(err);
                const embed = new Discord.MessageEmbed()
                    .setColor(packs.standardEmbedErrorColor)
                    .setTitle(packs.standardErrorTitle)
                    .setDescription(packs.standardErrorDesc)
                    .addField(
                        packs.standardErrorField,
                        "Houve um erro ao tentar acessar seu banco."
                    );
                message.channel.stopTyping();
                return message.channel.send(embed);
            });
    },
};
