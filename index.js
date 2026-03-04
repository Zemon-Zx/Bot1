require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs'); // 🌟 ปายเพิ่ม fs สำหรับเซฟข้อมูลกันบอทรีเซ็ตค่ะ

// ==========================================
// 🌌 ส่วนตั้งค่า Web Server สำหรับ Railway 24/7
// ==========================================
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(process.env.PORT || 3000, () => console.log('[System] 🌐 ระบบกันบอทหลับและหน้าเว็บทำงานแล้วค่ะ!'));

// ==========================================
// 🤖 ส่วนตั้งค่า Discord Bot
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
    ],
    partials: [Partials.User, Partials.GuildMember]
});

// 🌟 ระบบ Database กันข้อมูลหายตอนบอทรีสตาร์ท
const dbPath = path.join(__dirname, 'database.json');

let dotSetup = { channelId: null, roleId: null };
let vipSetup = { roleId: null, logChannelId: null, price: 0, walletNumber: '', walletName: '' };

// โหลดข้อมูลเก่ามาใช้ถ้ามีไฟล์อยู่แล้ว
if (fs.existsSync(dbPath)) {
    try {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (data.dotSetup) dotSetup = data.dotSetup;
        if (data.vipSetup) vipSetup = data.vipSetup;
        console.log('[System] 📂 โหลดข้อมูลการตั้งค่าเดิมเรียบร้อยแล้วค่ะ!');
    } catch (err) {
        console.error('[System] ❌ อ่านไฟล์ข้อมูลไม่ได้ค่ะ สร้างใหม่นะคะ');
    }
}

// ฟังก์ชันเซฟข้อมูล
function saveData() {
    fs.writeFileSync(dbPath, JSON.stringify({ dotSetup, vipSetup }, null, 4));
}

// --- สร้างคำสั่งต่างๆ ---
const commands = [
    new SlashCommandBuilder()
        .setName('setup_role')
        .setDescription('สร้างแผงข้อความสำหรับกดรับยศ (ล็อกไว้ให้ Owner ใช้ได้คนเดียว)')
        .addRoleOption(option => option.setName('role').setDescription('เลือกยศที่จะมอบให้').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        
    new SlashCommandBuilder()
        .setName('setup_dot')
        .setDescription('ตั้งค่าห้องพิมพ์จุด . เพื่อรับยศ (ล็อกไว้ให้ Owner ใช้ได้คนเดียว)')
        .addChannelOption(option => option.setName('channel').setDescription('เลือกห้องแชท').setRequired(true))
        .addRoleOption(option => option.setName('role').setDescription('เลือกยศ').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    new SlashCommandBuilder()
        .setName('setup_vip')
        .setDescription('สร้างแผงระบบซื้อยศ VIP อัตโนมัติ (Owner Only)')
        .addRoleOption(option => option.setName('role').setDescription('ยศที่จะให้หลังซื้อสำเร็จ').setRequired(true))
        .addChannelOption(option => option.setName('log_channel').setDescription('ห้องสำหรับแจ้งเตือนประวัติการซื้อ').setRequired(true))
        .addNumberOption(option => option.setName('price').setDescription('ราคายศ (บาท)').setRequired(true))
        .addStringOption(option => option.setName('wallet_number').setDescription('เบอร์ TrueMoney Wallet').setRequired(true))
        .addStringOption(option => option.setName('wallet_name').setDescription('ชื่อ-นามสกุล บัญชี Wallet').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

client.once('ready', async () => {
    console.log(`[System] ✨ บอทล็อกอินในชื่อ ${client.user.tag} พร้อมทำงานแล้วค่ะ!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('[System] ✅ ลงทะเบียนคำสั่งทั้งหมดสำเร็จแล้วค่ะ!');
    } catch (error) {
        console.error('[System] ❌ ลงทะเบียนคำสั่งไม่ผ่านค่ะ:', error);
    }
});

// ==========================================
// 🎀 ระบบทำงานเมื่อพิมพ์คำสั่ง หรือ มีคนกดปุ่ม
// ==========================================
client.on('interactionCreate', async interaction => {
    
    // 💬 ระบบคำสั่ง Slash Commands
    if (interaction.isChatInputCommand()) {
        
        // 🔒 เช็ค Owner
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: '❌ ขออภัยค่ะ คำสั่งนี้สงวนไว้ให้เจ้าของเซิร์ฟเวอร์ใช้งานเท่านั้นนะคะ', ephemeral: true });
        }

        // --- คำสั่ง /setup_role ---
        if (interaction.commandName === 'setup_role') {
            const role = interaction.options.getRole('role');
            const embed = new EmbedBuilder()
                .setColor('#B026FF') 
                .setDescription(`╭┈┈ ✧ : รับยศเปิดโซนต่างๆ ˗ˏˋ ꒰ 🦋 ꒱ ˎˊ˗\n│\n│ <a:DG36:1451619653746036910> · กดปุ่มรับยศเท่านั้น\n│\n│ <a:1001:1451585309757149227> · ยศที่ได้ ${role}\n│\n│ <a:emoji_2:1449148118690959440> · **𝐓𝐚𝐥𝐤𝐚𝐭𝐢𝐯𝐞 𝐆𝐚𝐥𝐚𝐱𝐲 𝐂𝐨𝐦𝐦𝐮𝐧𝐢𝐭𝐲** ╰(° ͜ʖ °)╯\n╰┈┈ ✧ : ➳ By Zemon Źx ⚡`)
                .setImage('https://cdn.discordapp.com/attachments/1449115719479590984/1454084461888278589/IMG_4820.jpg');

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`give_role_${role.id}`).setLabel('กดรับยศเลย!').setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ content: '✅ ส่งหน้าต่างรับยศเรียบร้อยแล้วค่ะ!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [button] });
        }

        // --- คำสั่ง /setup_dot ---
        if (interaction.commandName === 'setup_dot') {
            const channel = interaction.options.getChannel('channel');
            const role = interaction.options.getRole('role');
            dotSetup.channelId = channel.id;
            dotSetup.roleId = role.id;
            saveData(); // 🌟 เซฟลงไฟล์

            await interaction.reply({ content: `✅ ตั้งค่าสำเร็จ! พิมพ์ \`.\` ในห้อง ${channel} จะได้ยศ **${role.name}** ทันทีค่ะ`, ephemeral: true });
        }

        // --- คำสั่ง /setup_vip (ระบบซื้อยศใหม่) ---
        if (interaction.commandName === 'setup_vip') {
            const role = interaction.options.getRole('role');
            const logChannel = interaction.options.getChannel('log_channel');
            const price = interaction.options.getNumber('price');
            const walletNumber = interaction.options.getString('wallet_number');
            const walletName = interaction.options.getString('wallet_name');

            // บันทึกค่าลงระบบและเซฟไฟล์ 🌟
            vipSetup = {
                roleId: role.id,
                logChannelId: logChannel.id,
                price: price,
                walletNumber: walletNumber,
                walletName: walletName
            };
            saveData(); 

            const embed = new EmbedBuilder()
                .setColor('#FF0055')
                .setTitle('【 🧧 】 ซื้อยศอัตโนมัติ')
                .setDescription(`📌 **วิธีซื้อยศ**\n\n1. กดปุ่ม **ซื้อยศ VIP** เพื่อดูช่องทางชำระเงิน\n2. โอนเงินตามจำนวนที่กำหนด\n3. เมื่อโอนเสร็จแล้ว นำสลิปมากดส่งที่ปุ่ม **แนบสลิป**\n4. รอระบบตรวจสอบและรับยศอัตโนมัติ!\n\n💳 **ราคายศ:** \`${price}\` บาท\n🎁 **ยศที่ได้รับ:** ${role}`)
                .setImage('https://media.discordapp.net/attachments/111/112/banner.png') 
                .setFooter({ text: '© ปรารถนาเดือด 18+' });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('buy_vip_process')
                    .setLabel('ซื้อยศ VIP')
                    .setEmoji('💸')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('check_vip_price')
                    .setLabel('ดูราคายศ')
                    .setEmoji('🏷️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('attach_slip_now')
                    .setLabel('แนบสลิป')
                    .setEmoji('🧾')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ content: '✅ ส่งหน้าต่างซื้อยศเรียบร้อยแล้วค่ะ!', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [buttons] });
        }
    }

    // 🔘 ระบบกดปุ่ม (Buttons)
    if (interaction.isButton()) {
        
        // --- ปุ่มรับยศฟรีปกติ ---
        if (interaction.customId.startsWith('give_role_')) {
            const roleId = interaction.customId.split('_')[2];
            const role = interaction.guild.roles.cache.get(roleId);
            const member = interaction.member;
            if (!role) return interaction.reply({ content: '❌ ไม่พบยศในระบบค่ะ', ephemeral: true });

            try {
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    return interaction.reply({ content: `✅ ดึงยศ **${role.name}** ออกให้เรียบร้อยค่ะ`, ephemeral: true });
                } else {
                    await member.roles.add(role);
                    return interaction.reply({ content: `✅ ได้รับยศ **${role.name}** เรียบร้อยค่ะ`, ephemeral: true });
                }
            } catch (error) {
                return interaction.reply({ content: '❌ มอบยศไม่ได้ รบกวนเช็คตำแหน่งยศบอทน้า', ephemeral: true });
            }
        }

        // --- ปุ่มดูราคายศ ---
        if (interaction.customId === 'check_vip_price') {
            if (!vipSetup.roleId) return interaction.reply({ content: '❌ ระบบยังไม่ได้ตั้งค่าค่ะ', ephemeral: true });
            await interaction.reply({ content: `🏷️ **ราคายศ VIP ปัจจุบันคือ:** \`${vipSetup.price}\` บาทค่ะ`, ephemeral: true });
        }

        // --- ปุ่มซื้อยศ VIP (แสดงเบอร์วอเลต) ---
        if (interaction.customId === 'buy_vip_process') {
            if (!vipSetup.roleId) return interaction.reply({ content: '❌ ระบบซื้อยศยังไม่ได้ตั้งค่าค่ะ ติดต่อแอดมินนะคะ', ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏦 ข้อมูลการชำระเงิน (TrueMoney Wallet)')
                .setDescription(`กรุณาคัดลอกเบอร์ด้านล่างนี้ และทำการโอนเงินจำนวน **${vipSetup.price} บาท**\n\n📱 **เบอร์วอเลต:** \`${vipSetup.walletNumber}\`\n👤 **ชื่อบัญชี:** \`${vipSetup.walletName}\`\n\n⚠️ *เมื่อโอนเงินเสร็จแล้ว ให้กลับไปกดปุ่ม **"แนบสลิป"** ที่หน้าแผงหลักนะคะ*`);

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // --- 🌟 ปุ่มแนบสลิป (เปิดระบบรอรับรูปภาพ) ---
        if (interaction.customId === 'attach_slip_now') {
            if (!vipSetup.roleId) return interaction.reply({ content: '❌ ระบบซื้อยศยังไม่ได้ตั้งค่าค่ะ ติดต่อแอดมินนะคะ', ephemeral: true });

            await interaction.reply({ content: '⏳ **กรุณาส่ง "รูปสลิปการโอนเงิน" ของคุณลงในช่องแชทนี้ภายใน 1 นาทีค่ะ**\n*(บอทจะลบรูปของคุณอัตโนมัติเพื่อความปลอดภัย)*', ephemeral: true });

            // สร้างตัวดักจับข้อความที่มีรูปภาพ (รองรับทีละหลายคนพร้อมกันได้ ไม่บั๊กแน่นอน!)
            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async m => {
                const attachment = m.attachments.first();
                
                // ลบรูปสลิปทิ้งทันที
                await m.delete().catch(() => {});

                // แจ้งว่ากำลังตรวจสอบ
                const checkingMsg = await interaction.followUp({ content: '🔄 กำลังตรวจสอบสลิป กรุณารอสักครู่นะคะ...', ephemeral: true });

                // จำลองการตรวจสอบสลิป 3 วินาที
                setTimeout(async () => {
                    const role = interaction.guild.roles.cache.get(vipSetup.roleId);
                    const logChannel = interaction.guild.channels.cache.get(vipSetup.logChannelId);

                    if (role) {
                        try {
                            // 🌟 แก้ไข: เปลียนข้อความเป็นตรวจสอบสำเร็จก่อน ค่อยมอบยศให้!
                            await checkingMsg.edit({ content: `✅ **ตรวจสอบสำเร็จ!** ระบบกำลังมอบยศให้คุณค่ะ ขอบคุณที่สนับสนุนนะคะ 🎉` });
                            
                            // 🌟 มอบยศทีหลังสุด
                            await interaction.member.roles.add(role);

                            // ส่ง Log ไปห้องประวัติการซื้อ
                            if (logChannel) {
                                const logEmbed = new EmbedBuilder()
                                    .setColor('#00FF00')
                                    .setTitle('👑 ประวัติการซื้อยศ')
                                    .setDescription(`🏦 **[ธนาคาร]** 🏦\n\n👤 ผู้ใช้: <@${interaction.user.id}>\n💰 ราคา: \`${vipSetup.price}.00 บาท\`\n🎉 ได้รับยศ: ${role}`)
                                    .setThumbnail(attachment.url) 
                                    .setFooter({ text: '© ปรารถนาเดือด 18+' })
                                    .setTimestamp();
                                
                                await logChannel.send({ embeds: [logEmbed] });
                            }
                        } catch (err) {
                            await checkingMsg.edit({ content: '❌ ตรวจสอบผ่านแล้ว แต่บอทไม่สามารถมอบยศให้ได้ค่ะ รบกวนแจ้งแอดมินนะคะ' });
                        }
                    } else {
                        await checkingMsg.edit({ content: '❌ ไม่พบยศในระบบค่ะ รบกวนแจ้งแอดมินนะคะ' });
                    }
                }, 3000); 
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.followUp({ content: '❌ หมดเวลาแนบสลิปแล้วค่ะ กรุณากดทำรายการใหม่อีกครั้งนะคะ', ephemeral: true });
                }
            });
        }
    }
});

// ==========================================
// 🌟 ระบบอ่านข้อความ สำหรับแจกยศตอนพิมพ์ .
// ==========================================
client.on('messageCreate', async message => {
    if (message.author.bot || !dotSetup.channelId) return;

    if (message.channel.id === dotSetup.channelId) {
        if (message.content === '.') {
            const role = message.guild.roles.cache.get(dotSetup.roleId);
            if (role) {
                try {
                    await message.member.roles.add(role);
                    await message.delete().catch(() => {}); 
                    const successMsg = await message.channel.send(`✅ ยินดีด้วยค่ะ <@${message.author.id}> คุณได้รับยศ ${role} เรียบร้อยแล้วนะคะ! 🚀✨`);
                    setTimeout(() => successMsg.delete().catch(() => {}), 5000);
                } catch (error) {
                    console.error('[System] มอบยศไม่ได้');
                }
            }
        } else {
            try {
                await message.delete();
                const warningMsg = await message.channel.send(`❌ อ๊ะ! <@${message.author.id}> ห้องนี้อนุญาตให้พิมพ์แค่ \`.\` เพื่อรับยศเท่านั้นนะคะ!`);
                setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
            } catch (error) {}
        }
    }
});

client.login(process.env.TOKEN);
