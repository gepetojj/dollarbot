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
                    const userData = data.usersList[message.author.id];
                    if (userData === undefined) {
                        let embed = new Discord.MessageEmbed()
                            .setColor(packs.standardEmbedErrorColor)
                            .setTitle(packs.standardErrorTitle)
                            .setDescription(packs.standardErrorDesc)
                            .addField(
                                packs.standardErrorField,
                                "Você ainda não está registrado como membro deste servidor.\n\nEstou fazendo isso automaticamente para você agora."
                            );
                        message.channel.send(embed).then((sendedMessage) => {
                            data.usersList[message.author.id] = {
                                dollars: 0,
                                username: message.author.username,
                            };
                            serversList
                                .doc(message.guild.id)
                                .update({ usersList: data.usersList })
                                .catch((err) => {
                                    console.error(err);
                                    const embed = new Discord.MessageEmbed()
                                        .setColor(packs.standardEmbedErrorColor)
                                        .setTitle(packs.standardErrorTitle)
                                        .setDescription(packs.standardErrorDesc)
                                        .addField(
                                            packs.standardErrorField,
                                            "Houve um erro ao tentar sincronizar os usuários deste servidor."
                                        );
                                    message.channel.stopTyping();
                                    return message.channel.send(embed);
                                });
                            embed = new Discord.MessageEmbed()
                                .setColor(packs.standardEmbedColor)
                                .setTitle(packs.changePrefixCommand.embedTitle)
                                .setDescription(
                                    "Utilize o comando novamente, e você poderá ver seu saldo."
                                )
                                .setFooter(
                                    `${packs.convertCommand.embedFooter} ${message.author.username}`,
                                    message.author.avatarURL()
                                );
                            sendedMessage.edit(embed);
                            return message.channel.stopTyping();
                        });
                    }
                    let embed = new Discord.MessageEmbed()
                        .setColor(packs.standardEmbedColor)
                        .setTitle(packs.myDollarsCommand.embedTitle)
                        .setDescription(packs.myDollarsCommand.embedDesc)
                        .addField(
                            packs.myDollarsCommand.embedField,
                            `$${userData.dollars} dólares`
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
