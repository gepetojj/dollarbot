module.exports = {
    name: "users",
    description: "Lista todos os usuários do servidor.",
    execute(message) {
        message.channel.guild.members
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
                console.log(finalUsersList);
            })
            .catch((err) => {
                console.error(err);
            });
    },
};
