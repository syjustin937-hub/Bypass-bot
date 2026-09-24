const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, AttachmentBuilder } = require('discord.js')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))
const path = require('path')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const commands = [
  new SlashCommandBuilder()
    .setName('bypass')
    .setDescription('Bypass a link')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('Link to bypass')
        .setRequired(true)
    )
].map(c => c.toJSON())

client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  console.log(`Ready: ${client.user.tag}`)
})

const FILE_EXT = /\.(zip|rar|7z|exe|apk|pdf|tar\.gz|gz|tar)(\?.*)?$/i

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'bypass') return

  await interaction.deferReply()

  const url = interaction.options.getString('url')

  try {
    const res = await fetch(`https://doitenroi.win/api/freebypass?url=${encodeURIComponent(url)}`)
    const data = await res.json()

    const bypassed = data.bypassed ?? data.result ?? data.url ?? data.link ?? data.key

    if (!bypassed) {
      return interaction.editReply({ content: `❌ No bypassed URL in response.\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` })
    }

    if (FILE_EXT.test(bypassed)) {
      const fileRes = await fetch(bypassed)
      const contentLength = parseInt(fileRes.headers.get('content-length') || '0')

      if (contentLength > 25 * 1024 * 1024) {
        return interaction.editReply({
          content: `✅ Bypassed (file too large to send):\n${bypassed}`
        })
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer())
      const filename = path.basename(new URL(bypassed).pathname) || 'file.zip'
      const attachment = new AttachmentBuilder(buffer, { name: filename })

      return interaction.editReply({
        content: `✅ Downloaded from bypassed link.`,
        files: [attachment]
      })
    }

    const embed = new EmbedBuilder()
      .setTitle('Bypass Result')
      .setColor(0x5865F2)
      .addFields(
        { name: 'Original', value: `\`${url.slice(0, 1000)}\`` },
        { name: 'Bypassed', value: `[Open Link](${bypassed})\n\`${bypassed.slice(0, 900)}\`` }
      )
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })

  } catch (err) {
    return interaction.editReply({ content: `❌ Error: \`${err.message}\`` })
  }
})

client.login(TOKEN)
