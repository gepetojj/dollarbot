require("dotenv").config();
const axios = require("axios");
const Discord = require("discord.js");
const moment = require("moment");
const fs = require("fs");
const Heroku = require("heroku-client");
const {
    globalPrefix,
    richPresence,
    dollarApi,
} = require("./utils/settings.json");
const firebase = require("./utils/firebase");
const packs = require("./utils/packs.json");
const client = new Discord.Client();
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

client.commands = new Discord.Collection();
moment.locale("pt-BR");

let prefixCache = {};

// Configurações do banco de dados

const firestore = firebase.firestore();
const serversList = firestore.collection("serversList");

// Troca dinamicamente a rich presence

client.on("ready", () => {
    console.log("Estou online no discord com o ID:", client.user.id);
    setInterval(() => {
        let choice = Math.floor(Math.random() * richPresence.length);
        client.user.setActivity(richPresence[choice], { type: "PLAYING" });
    }, 7000);

    client.guilds.cache.forEach((server) => {
        const serverId = server.id;
        if (!prefixCache[serverId]) {
            serversList
                .doc(serverId)
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        prefixCache[serverId] = doc.data().prefix;
                    } else {
                        prefixCache[serverId] = globalPrefix;
                    }
                })
                .catch((err) => {
                    console.error(err);
                    prefixCache[serverId] = globalPrefix;
                });
        }

        serversList.doc(serverId).onSnapshot((doc) => {
            if (doc.exists) {
                prefixCache[serverId] = doc.data().prefix;
            }
        });
    });
});

// Importa os comandos da pasta 'commands'

const commandsList = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const command of commandsList) {
    const cmd = require(`./commands/${command}`);
    client.commands.set(cmd.name, cmd);
}

// Executa os comandos

client.on("message", async (message) => {
    const channels = await getAllDbChannels();
    channels.forEach((channel) => {
        if (
            message.channel.id === channel.dbChannel &&
            message.author.id !== client.user.id
        ) {
            message.delete().then(async () => {
                const embed = new Discord.MessageEmbed()
                    .setColor(packs.standardEmbedErrorColor)
                    .setTitle(packs.standardErrorTitle)
                    .setDescription(packs.standardErrorDesc)
                    .addField(
                        packs.standardErrorField,
                        `Você não pode conversar aqui, ${message.author}.`
                    );
            });
        }
    });

    if (
        !message.content.startsWith(prefixCache[message.guild.id]) ||
        message.author.bot
    )
        return;

    const args = message.content
        .slice(prefixCache[message.guild.id].length)
        .split(" ");
    const commandName = args.shift().toLowerCase();

    const command =
        client.commands.get(commandName) ||
        client.commands.find(
            (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
        );

    if (!command) return;

    if (command.guildOnly === true && message.channel.type !== "text") {
        const embed = new Discord.MessageEmbed()
            .setColor(packs.standardEmbedErrorColor)
            .setTitle(packs.standardErrorTitle)
            .setDescription(packs.standardErrorDesc)
            .addField(
                packs.standardErrorField,
                "Este comando só pode ser executado em servidores."
            );
        return message.reply(embed);
    }

    if (command.args && !args.length) {
        let description = "Este comando precisa de argumentos.";

        if (command.usage) {
            description += `\nO modo de usar este comando é: **${globalPrefix}${command.name} ${command.usage}**`;
        }

        const embed = new Discord.MessageEmbed()
            .setColor(packs.standardEmbedErrorColor)
            .setTitle(packs.standardErrorTitle)
            .setDescription(packs.standardErrorDesc)
            .addField(packs.standardErrorField, description);

        return message.channel.send(embed);
    }

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        const embed = new Discord.MessageEmbed()
            .setColor(packs.standardEmbedErrorColor)
            .setTitle(packs.standardErrorTitle)
            .setDescription(packs.standardErrorDesc)
            .addField(
                packs.standardErrorField,
                "Houve um erro ao tentar executar esse comando."
            );
        message.reply(embed);
    }
});

// Escuta entradas e saidas em servidores

client.on("guildCreate", (guild) => {
    let embed = new Discord.MessageEmbed()
        .setColor(packs.standardEmbedColor)
        .setTitle(packs.newGuild.embedTitle)
        .setDescription(packs.newGuild.embedDesc)
        .addField(
            packs.newGuild.embedField.first[0],
            packs.newGuild.embedField.first[1]
        )
        .addField(
            packs.newGuild.embedField.second[0],
            packs.newGuild.embedField.second[1]
        )
        .setFooter(
            `Obrigado ${guild.owner.user.username}.`,
            guild.owner.user.avatarURL()
        );
    guild.owner.send(embed);
    guild.channels
        .create("dollar-status", {
            type: "text",
            topic:
                "Status atualizado a cada 5 segundos do dólar comercial americano.",
            reason:
                "O bot 'dollarbot' precisa deste canal para funcionar corretamente. NÃO O EXCLUA.",
        })
        .then((channel) => {
            guild.members
                .fetch()
                .then((users) => {
                    const finalUsersList = {};
                    users.forEach((user) => {
                        if (user.user.bot === false) {
                            const userId = user.user.id;
                            finalUsersList[userId] = {
                                username: user.user.username,
                                dollars: 0,
                            };
                        }
                    });
                    serversList
                        .doc(guild.id)
                        .set({
                            serverId: guild.id,
                            dbChannel: channel.id,
                            prefix: ">",
                            usersList: finalUsersList,
                        })
                        .catch((err) => {
                            console.error(err);
                        });
                })
                .catch((err) => {
                    console.error(err);
                });
        })
        .catch((err) => {
            console.error(err);
        });
});

client.on("guildDelete", (guild) => {
    serversList
        .doc(guild.id)
        .get()
        .then((doc) => {
            if (doc.exists) {
                serversList.doc(guild.id).delete();
            }
        })
        .catch((err) => {
            console.error(err);
        });
});

// Escuta e verifica se o canal específico foi deletado

client.on("channelDelete", (channel) => {
    serversList
        .doc(channel.guild.id)
        .get()
        .then((doc) => {
            if (doc.exists) {
                channel.guild.channels
                    .create("dollar-status", {
                        type: "text",
                        topic:
                            "Status atualizado a cada 5 segundos do dólar comercial americano.",
                        reason:
                            "O bot 'dollarbot' precisa deste canal para funcionar corretamente. NÃO O EXCLUA.",
                    })
                    .then((channel) => {
                        serversList
                            .doc(channel.guild.id)
                            .update({
                                serverId: channel.guild.id,
                                dbChannel: channel.id,
                            })
                            .catch((err) => {
                                console.error(err);
                            });
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            }
        });
});

// Loops

async function getDollarValue() {
    try {
        const response = await axios.get(dollarApi);
        const dollarValue = response.data.USD.high * 1;
        return dollarValue.toFixed(2);
    } catch (err) {
        console.error(err);
        return "Houve um erro";
    }
}

async function getAllDbChannels() {
    const snapshot = await serversList.get();
    return snapshot.docs.map((doc) => doc.data());
}

async function sendDollarStatus() {
    const channels = await getAllDbChannels();
    channels.forEach(async (channelId) => {
        try {
            const channel = client.channels.cache.get(channelId.dbChannel);
            let value = await getDollarValue();
            channel.bulkDelete(20);
            let embed = new Discord.MessageEmbed()
                .setColor(packs.standardEmbedColor)
                .setTitle(packs.dollarCommand.embedTitle)
                .setDescription(packs.dollarCommand.embedDesc)
                .addField(packs.dollarCommand.embedField, `R$ ${value}`)
                .setFooter(`${moment().format("LTS")} ${moment().format("L")}`);
            setTimeout(() => {
                channel.send(embed).then((message) => {
                    setInterval(async () => {
                        value = await getDollarValue();
                        let embed = new Discord.MessageEmbed()
                            .setColor(packs.standardEmbedColor)
                            .setTitle(packs.dollarCommand.embedTitle)
                            .setDescription(packs.dollarCommand.embedDesc)
                            .addField(
                                packs.dollarCommand.embedField,
                                `R$ ${value}`
                            )
                            .setFooter(
                                `${moment().format("LTS")} ${moment().format(
                                    "L"
                                )}`
                            );
                        message.edit(embed).catch((err) => {
                            console.error(err);
                        });
                    }, 5000);
                });
            }, 2000);
        } catch (err) {
            console.error(err);
        }
    });
}

async function getDollarPlot() {
    try {
        const response = await axios.get(
            "https://gepetojj.pythonanywhere.com/api/dollarbot/create"
        );
        return response.data.message;
    } catch (err) {
        console.error(err);
        return "alert.jpg";
    }
}

async function sendDollarPlot() {
    const channels = await getAllDbChannels();
    channels.forEach(async (channelId) => {
        const channel = client.channels.cache.get(channelId.dbChannel);
        let image = await getDollarPlot();
        let embed = new Discord.MessageEmbed()
            .setColor(packs.standardEmbedColor)
            .setTitle(packs.dollarCommand.embedExtra)
            .setImage(
                `https://gepetojj.pythonanywhere.com/cdn/dollarbot/${image}`
            )
            .setFooter(`${moment().format("LTS")} ${moment().format("L")}`);
        channel.send(embed).then((message) => {
            setInterval(async () => {
                image = await getDollarPlot();
                embed = new Discord.MessageEmbed()
                    .setColor(packs.standardEmbedColor)
                    .setTitle(packs.dollarCommand.embedExtra)
                    .setImage(
                        `https://gepetojj.pythonanywhere.com/cdn/dollarbot/${image}`
                    )
                    .setFooter(
                        `${moment().format("LTS")} ${moment().format("L")}`
                    );
                message.edit(embed);
            }, 43200000);
        });
    });
}

// Inicia o bot

client.login(process.env.TOKEN);

// Executa os loops

try {
    setTimeout(() => {
        sendDollarPlot();
        sendDollarStatus();
    }, 3000);
} catch (err) {
    console.error(err);
    if (process.env.NODE_ENV !== "development") {
        heroku.get("/apps").then((apps) => {
            apps.forEach((app) => {
                if (app.name === "dollarbot-ds") {
                    heroku.get(`/apps/${app.name}/dynos`).then((dynos) => {
                        dynos.forEach((dyno) => {
                            heroku.delete(`/apps/${app.name}/dynos/${dyno.id}`);
                        });
                    });
                }
            });
        });
    }
}
