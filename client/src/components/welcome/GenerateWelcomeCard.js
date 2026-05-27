const { createCanvas, loadImage } = require('canvas');
const path = require('path');
async function generateWelcomeCard({
    username,
    avatar,
    serverName,
    memberCount,
    background,
}) {
    const canvas = createCanvas(1000, 350);

    const ctx = canvas.getContext('2d');

    // background
    const bgPath = path.join(__dirname, '../../../public', background);

    const bg = await loadImage(bgPath);
    console.log(bgPath);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // mørk overlay
    ctx.fillStyle = 'rgba(0,0,0,0.45)';

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // avatar
    const avatarImg = await loadImage(avatar);

    ctx.save();

    ctx.beginPath();

    ctx.arc(140, 175, 70, 0, Math.PI * 2);

    ctx.closePath();

    ctx.clip();

    ctx.drawImage(avatarImg, 70, 105, 140, 140);

    ctx.restore();

    // title
    ctx.fillStyle = '#ffffff';

    ctx.font = 'bold 54px Sans';

    ctx.fillText('VELKOMMEN!', 260, 150);

    // username
    ctx.font = '38px Sans';

    ctx.fillStyle = '#5865F2';

    ctx.fillText(`@${username}`, 260, 215);

    // server
    ctx.fillStyle = '#ffffff';

    ctx.font = '28px Sans';

    ctx.fillText(`Velkommen til ${serverName}`, 260, 260);

    return canvas.toBuffer();
}

module.exports = {
    generateWelcomeCard,
};
