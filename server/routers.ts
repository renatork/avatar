import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateProfileImage, generateProfileImageRJ } from "./profileImageGenerator";
import path from "path";
import fs from "fs";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profiles: router({
    generate: publicProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          team: z.string().min(1, "Equipe é obrigatória"),
          photoBase64: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          // 1. Procurar o logo com prioridade máxima no caminho exato que você informou
          const possibleLogoPaths = [
            path.join(process.cwd(), "client", "public", "logo.png"), // Caminho exato indicado
            path.join(process.cwd(), "dist", "client", "logo.png"),   // Caso o Vite mova no build
            path.join(process.cwd(), "public", "logo.png"),           // Fallback raiz
            path.join(process.cwd(), "dist", "logo.png")              // Fallback alternativo
          ];

          let logoPath = "";
          for (const p of possibleLogoPaths) {
            if (fs.existsSync(p)) {
              logoPath = p;
              break; // Para a busca assim que encontrar o arquivo
            }
          }

          if (!logoPath) {
            console.warn("AVISO: Arquivo logo.png não encontrado no servidor.");
          }

          // 2. Gerar imagem na memória
          let imageBuffer: Buffer;
          if (input.team === "RJ") {
            if (!input.photoBase64) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "A foto é obrigatória para a equipe RJ",
              });
            }
            imageBuffer = await generateProfileImageRJ(input.name, input.photoBase64, logoPath);
          } else {
            imageBuffer = await generateProfileImage(
              input.name,
              input.team,
              logoPath
            );
          }

          // 3. Converter a imagem para texto (Base64) e mandar direto para o navegador
          const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;

          return {
            success: true,
            url: base64Image,
            name: input.name,
            team: input.team,
          };
        } catch (error) {
          console.error("Error generating profile:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao gerar imagem de perfil",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
