const Discord = require("discord.js");
const axios = require("axios");
const packs = require("../utils/packs.json");

module.exports = {
    name: "convert",
    aliases: ["converter"],
    args: true,
    usage: "{valor em dólares}",
    guildOnly: false,
    description: "Converte valores em dólares para reais.",
    execute(message, args) {
        message.channel.startTyping();
        try {
            axios
                .get("https://economia.awesomeapi.com.br/json/all/USD-BRL")
                .then((response) => {
                    const convertedValue = response.data.USD.high * args[0];
                    let embed = new Discord.MessageEmbed()
                        .setColor(packs.standardEmbedColor)
                        .setTitle(packs.convertCommand.embedTitle)
                        .addField(
                            `${args[0]} ${packs.convertCommand.embedField}`,
                            `R$ ${convertedValue}`
                        )
                        .setFooter(
                            `${packs.convertCommand.embedFooter} ${message.author.username}`,
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
                            "Houve um erro ao tentar converter seus valores."
                        );
                    message.channel.stopTyping();
                    return message.channel.send(embed);
                });
        } catch (err) {
            console.error(err);
            const embed = new Discord.MessageEmbed()
                .setColor(packs.standardEmbedErrorColor)
                .setTitle(packs.standardErrorTitle)
                .setDescription(packs.standardErrorDesc)
                .addField(
                    packs.standardErrorField,
                    "Houve um erro ao tentar converter seus valores."
                );
            message.channel.stopTyping();
            return message.channel.send(embed);
        }
    },
};
