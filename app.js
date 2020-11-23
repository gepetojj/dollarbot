require("dotenv").config();
const axios = require("axios");
const Discord = require("discord.js");
const moment = require("moment");
const fs = require("fs");
const { globalPrefix, richPresence } = require("./utils/settings.json");
const firebase = require("./utils/firebase");
const packs = require("./utils/packs.json");
const client = new Discord.Client();

client.commands = new Discord.Collection();
moment.locale("pt-BR");

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

client.on("message", (message) => {
    if (
        !message.content.startsWith(globalPrefix) ||
        message.author.bot ||
        message.channel.type !== "text"
    )
        return;

    const args = message.content.slice(globalPrefix.length).split(" ");
    const command = client.commands.get(args.shift().toLowerCase());

    if (command) {
        command.execute(message, args, client);
    }
});

// Escuta entradas e saidas em servidores

client.on("guildCreate", (guild) => {
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
        const response = await axios.get(
            "https://economia.awesomeapi.com.br/json/all/USD-BRL"
        );
        return response.data.USD.high;
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
            channel.send(embed).then((message) => {
                setInterval(async () => {
                    value = await getDollarValue();
                    let embed = new Discord.MessageEmbed()
                        .setColor(packs.standardEmbedColor)
                        .setTitle(packs.dollarCommand.embedTitle)
                        .setDescription(packs.dollarCommand.embedDesc)
                        .addField(packs.dollarCommand.embedField, `R$ ${value}`)
                        .setFooter(
                            `${moment().format("LTS")} ${moment().format("L")}`
                        );
                    message.edit(embed).catch((err) => {
                        console.error(err);
                    });
                }, 5000);
            });
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

setTimeout(() => {
    sendDollarPlot();
    sendDollarStatus();
}, 3000);
