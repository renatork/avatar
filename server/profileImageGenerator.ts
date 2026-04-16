import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";

// Configurações de Cores (RGB)
const BLUE_MAIN = "#115FB4";
const GRAY_LIGHT = "#F6F7F7";
const WHITE = "#FFFFFF";

// Dimensões
const IMG_W = 800;
const IMG_H = 800;

// Registrar fontes
try {
  // Tentar usar Montserrat ExtraBold do projeto (caminho relativo)
  const fontPath = path.join(process.cwd(), "dist", "client", "fonts", "Montserrat-ExtraBold.ttf");
  registerFont(fontPath, {
    family: "Montserrat",
    weight: "900",
  });
} catch (error) {
  console.warn("Warning: Montserrat-ExtraBold not found, using fallbacks", error);
}

// Tentar registrar fonte de fallback/nome
try {
  registerFont("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", {
    family: "Myriad",
    weight: "bold",
  });
} catch (error) {
  console.warn("Warning: Some fallback fonts could not be registered", error);
}

export async function generateProfileImage(
  nome: string,
  equipe: string,
  logoPath: string
): Promise<Buffer> {
  const canvas = createCanvas(IMG_W, IMG_H);
  const ctx = canvas.getContext("2d");

  // 1. Fundo azul
  ctx.fillStyle = BLUE_MAIN;
  ctx.fillRect(0, 0, IMG_W, IMG_H);

  // 2. Logo β (aumentado em 30% - ~72% da altura)
  try {
    const logo = await loadImage(logoPath);
    const logoH = IMG_H * 0.72;
    const ratio = logoH / logo.height;
    const logoW = logo.width * ratio;

    const logoX = (IMG_W - logoW) / 2;
    const logoY = IMG_H * -0.05;

    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  } catch (error) {
    console.warn("Warning: Could not load logo image", error);
  }

  // 3. Faixa Cinza Clara (Equipe)
  const stripH = IMG_H * 0.12;
  const stripY = IMG_H * 0.62;

  ctx.fillStyle = GRAY_LIGHT;
  ctx.fillRect(0, stripY, IMG_W, stripH);

  // Texto Equipe (Azul #115FB4) - Montserrat ExtraBold
  ctx.fillStyle = BLUE_MAIN;
  ctx.font = "900 55px 'Montserrat', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Ajustar tamanho da fonte se necessário
  let fontSize = 55;
  let metrics = ctx.measureText(equipe);
  while (metrics.width > IMG_W - 60 && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px 'Montserrat', sans-serif`;
    metrics = ctx.measureText(equipe);
  }

  ctx.fillText(equipe, IMG_W / 2, stripY + stripH / 2);

  // 4. Nome (Branco) - Liberation Sans Bold
  ctx.fillStyle = WHITE;
  ctx.font = "bold 90px 'Myriad', 'LiberationSans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Ajustar tamanho da fonte se necessário
  let fontSizeN = 90;
  let metricsN = ctx.measureText(nome);
  while (metricsN.width > IMG_W - 60 && fontSizeN > 30) {
    fontSizeN -= 5;
    ctx.font = `bold ${fontSizeN}px 'Myriad', 'LiberationSans', sans-serif`;
    metricsN = ctx.measureText(nome);
  }

  const botAreaY = stripY + stripH;
  const botAreaH = IMG_H - botAreaY;
  ctx.fillText(nome, IMG_W / 2, botAreaY + botAreaH / 2);

  return canvas.toBuffer("image/jpeg", { quality: 0.95 });
}
