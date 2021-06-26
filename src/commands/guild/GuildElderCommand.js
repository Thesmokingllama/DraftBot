module.exports.help = {
	name: "guildelder",
	aliases: ["gelder"],
	disallowEffects: [EFFECT.BABY, EFFECT.DEAD, EFFECT.LOCKED],
	guildRequired: true,
	guildPermissions: {
		elder: false,
		chief: true
	}
};

/**
 * add or change guild elder
 * @param {("fr"|"en")} language - Language to use in the response
 * @param {module:"discord.js".Message} message - Message from the discord server
 * @param {String[]} args=[] - Additional arguments sent with the command
 */

const GuildElderCommand = async (message, language, args) => {
	const [entity] = await Entities.getOrRegister(message.author.id);
	let elderEntity;
	let guild;
	let elderGuild;
	const elderAddEmbed = new discord.MessageEmbed();

	guild = await Guilds.getById(entity.Player.guildId);
	try {
		[elderEntity] = await Entities.getByArgs(args, message);
	}
	catch (error) {
		elderEntity = null;
	}

	if (elderEntity === null) {
		// no user provided
		return sendErrorMessage(
			message.author,
			message.channel,
			language,
			JsonReader.commands.guildElder.getTranslation(language).cannotGetElderUser
		);
	}

	if (
		await sendBlockedError(
			message.mentions.users.last(),
			message.channel,
			language
		)
	) {
		return;
	}

	try {
		[elderEntity] = await Entities.getByArgs(args, message);
		elderGuild = await Guilds.getById(elderEntity.Player.guildId);
	}
	catch (error) {
		elderEntity = null;
		elderGuild = null;
	}

	if (elderGuild === null || elderEntity === null || elderGuild.id !== guild.id) {
		// elder is not in guild
		return sendErrorMessage(
			message.author,
			message.channel,
			language,
			JsonReader.commands.guildElder.getTranslation(language).notInTheGuild
		);
	}
	if (guild.chiefId !== entity.id) {
		return sendErrorMessage(
			message.author,
			message.channel,
			language,
			JsonReader.commands.guildElder.getTranslation(language).notChiefError
		);
	}

	if (guild.chiefId === elderEntity.id) {
		// chief cannot be the elder
		return sendErrorMessage(
			message.author,
			message.channel,
			language,
			JsonReader.commands.guildElder.getTranslation(language).chiefError
		);
	}

	elderAddEmbed.setAuthor(
		format(
			JsonReader.commands.guildElder.getTranslation(language).elderAddTitle,
			{
				pseudo: message.author.username
			}
		),
		message.author.displayAvatarURL()
	);
	elderAddEmbed.setDescription(
		format(JsonReader.commands.guildElder.getTranslation(language).elderAdd, {
			elder: message.mentions.users.last(),
			guildName: guild.name
		})
	);

	const msg = await message.channel.send(elderAddEmbed);

	const confirmEmbed = new discord.MessageEmbed();
	const filterConfirm = (reaction, user) =>
		(reaction.emoji.name === MENU_REACTION.ACCEPT ||
				reaction.emoji.name === MENU_REACTION.DENY) &&
			user.id === message.author.id
		;

	const collector = msg.createReactionCollector(filterConfirm, {
		time: COLLECTOR_TIME,
		max: 1
	});

	addBlockedPlayer(entity.discordUserId, "guildElder", collector);

	collector.on("end", async (reaction) => {
		removeBlockedPlayer(entity.discordUserId);
		if (reaction.first()) {
			// a reaction exist
			if (reaction.first().emoji.name === MENU_REACTION.ACCEPT) {
				try {
					[elderEntity] = await Entities.getByArgs(args, message);
					elderGuild = await Guilds.getById(elderEntity.Player.guildId);
				}
				catch (error) {
					elderEntity = null;
					elderGuild = null;
				}

				if (elderGuild === null || elderEntity === null || elderGuild.id !== guild.id) {
					// elder is not in guild
					return sendErrorMessage(
						message.author,
						message.channel,
						language,
						JsonReader.commands.guildElder.getTranslation(language)
							.notInTheGuild
					);
				}
				try {
					guild = await Guilds.getById(entity.Player.guildId);
				}
				catch (error) {
					guild = null;
				}
				if (guild === null) {
					// guild is destroy
					return sendErrorMessage(
						message.author,
						message.channel,
						language,
						format(
							JsonReader.commands.guildElder.getTranslation(language)
								.guildDestroy,
							{
								guildName: guild.name
							}
						)
					);
				}
				guild.elderId = elderEntity.id;
				await Promise.all([guild.save()]);
				confirmEmbed.setAuthor(
					format(
						JsonReader.commands.guildElder.getTranslation(language)
							.successElderAddTitle,
						{
							pseudo: message.mentions.users.last().username,
							guildName: guild.name
						}
					),
					message.mentions.users.last().displayAvatarURL()
				);
				confirmEmbed.setDescription(
					JsonReader.commands.guildElder.getTranslation(language)
						.successElderAdd
				);
				return message.channel.send(confirmEmbed);
			}
		}

		// Cancel the creation
		return sendErrorMessage(message.mentions.users.last(), message.channel, language,
			format(JsonReader.commands.guildElder.getTranslation(language).elderAddCancelled, {guildName: guild.name}), true);
	});

	await Promise.all([
		msg.react(MENU_REACTION.ACCEPT),
		msg.react(MENU_REACTION.DENY)
	]);
};

module.exports.execute = GuildElderCommand;